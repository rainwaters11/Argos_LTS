// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";

import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IReactive} from "reactive-lib/src/interfaces/IReactive.sol";

import {Argos} from "../src/Argos.sol";
import {ArgosRiskAdapter} from "../src/ArgosRiskAdapter.sol";
import {ReactiveSentry} from "../src/ReactiveSentry.sol";

// ─────────────────────────────────────────────────────────────────────────────
// Shared live-deployment constants
// ─────────────────────────────────────────────────────────────────────────────

library LiveAddrs {
    // Unichain Sepolia (chain 1301)
    address internal constant ARGOS = 0xCd6606e077b271316d09De8521ADBE72f8eB4088;
    address internal constant ADAPTER = 0x82EC3A310dF509A3bDe959DefBfeaa444Bb06a1B;
    address internal constant MOCK_LST = 0x1b46779584a8BFaE6F77418F6c3024FBA9e7B92a; // currency0
    address internal constant MOCK_WETH = 0xA740013D461B6EEE7E774CAd7f5d049919AC801B; // currency1
    // The deployer is stored as rvm_id inside ArgosRiskAdapter (set in constructor).
    address internal constant DEPLOYER = 0xfB9f232a7b84039480F3C7178900eE89920238f4;

    uint24 internal constant POOL_FEE = 3000;
    int24 internal constant TICK_SPACING = 60;

    bytes32 internal constant POOL_ID = 0xc729b4764ab9a33ec1992c9e506f4f3e3ab9ec29e89833a57eba92e41eebf21e;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build the canonical live pool key
// ─────────────────────────────────────────────────────────────────────────────
function _livePoolKey() pure returns (PoolKey memory) {
    return PoolKey({
        currency0: Currency.wrap(LiveAddrs.MOCK_LST),
        currency1: Currency.wrap(LiveAddrs.MOCK_WETH),
        fee: LiveAddrs.POOL_FEE,
        tickSpacing: LiveAddrs.TICK_SPACING,
        hooks: IHooks(LiveAddrs.ARGOS)
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Part 1: Local (no fork) — sentry source-side validation
//
// Deploys a ReactiveSentry locally with the live pool key. Proves that a whale
// LST Transfer event on Ethereum Sepolia emits the correct Callback payload
// pointing at the live ArgosRiskAdapter on Unichain Sepolia.
// ─────────────────────────────────────────────────────────────────────────────
contract ReactiveSentryE2ETest is Test {
    using PoolIdLibrary for PoolKey;

    uint256 internal constant ETHEREUM_SEPOLIA_CHAIN_ID = 11155111;
    uint256 internal constant ERC20_TRANSFER_TOPIC = uint256(keccak256("Transfer(address,address,uint256)"));

    // Mimic the Callback event signature from IReactive.sol
    event Callback(uint256 indexed chain_id, address indexed _contract, uint64 indexed gas_limit, bytes payload);

    // A plausible L1 LST token the sentry would monitor
    address internal constant L1_LST_TOKEN = address(0x1111);

    uint256 internal constant WHALE_THRESHOLD = 1_000_000 ether;
    uint64 internal constant CALLBACK_GAS = 600_000;

    PoolKey internal poolKey;
    ReactiveSentry internal sentry;

    function setUp() public {
        poolKey = _livePoolKey();

        // Deploy sentry locally. react() uses vmOnly which passes when
        // extcodesize(0xfffFfF) == 0 — always true in forge/anvil environments.
        sentry = new ReactiveSentry(
            makeAddr("reactiveSender"),
            L1_LST_TOKEN,
            block.chainid, // destination chain (just needs to be non-zero for local tests)
            LiveAddrs.ADAPTER,
            poolKey,
            WHALE_THRESHOLD,
            CALLBACK_GAS
        );
    }

    // ── Threshold filtering ────────────────────────────────────────────────

    function test_sentry_ignoresTransferAtOrBelowThreshold() public {
        vm.recordLogs();

        sentry.react(_transferLog(makeAddr("whale"), makeAddr("dex"), WHALE_THRESHOLD));

        bytes32 callbackTopic = IReactive.Callback.selector;
        Vm.Log[] memory logs = vm.getRecordedLogs();
        for (uint256 i = 0; i < logs.length; i++) {
            assertNotEq(logs[i].topics[0], callbackTopic, "no Callback for at-threshold transfer");
        }
    }

    function test_sentry_emitsCallbackForWhaleDump() public {
        bytes memory expectedPayload = abi.encodeWithSelector(
            ArgosRiskAdapter.applyReactiveRiskSignal.selector,
            address(0), // Reactive runtime replaces with real RVM id
            poolKey,
            Argos.RiskState.Blocked,
            uint128(0)
        );

        vm.expectEmit(true, true, true, true, address(sentry));
        emit Callback(block.chainid, LiveAddrs.ADAPTER, CALLBACK_GAS, expectedPayload);

        sentry.react(_transferLog(makeAddr("whale"), makeAddr("dex"), WHALE_THRESHOLD + 1));
    }

    function test_sentry_nonTransferTopicSkipped() public {
        vm.recordLogs();

        IReactive.LogRecord memory log = _transferLog(makeAddr("whale"), makeAddr("dex"), WHALE_THRESHOLD + 1);
        log.topic_0 = uint256(keccak256("Approval(address,address,uint256)"));

        sentry.react(log);

        bytes32 callbackTopic = IReactive.Callback.selector;
        Vm.Log[] memory logs = vm.getRecordedLogs();
        for (uint256 i = 0; i < logs.length; i++) {
            assertNotEq(logs[i].topics[0], callbackTopic, "non-Transfer topic must not emit Callback");
        }
    }

    function test_sentry_wrongContractSkipped() public {
        vm.recordLogs();

        IReactive.LogRecord memory log = _transferLog(makeAddr("whale"), makeAddr("dex"), WHALE_THRESHOLD + 1);
        log._contract = address(0xdead); // not the watched LST

        sentry.react(log);

        bytes32 callbackTopic = IReactive.Callback.selector;
        Vm.Log[] memory logs = vm.getRecordedLogs();
        for (uint256 i = 0; i < logs.length; i++) {
            assertNotEq(logs[i].topics[0], callbackTopic, "wrong contract must not emit Callback");
        }
    }

    // ── Payload integrity ──────────────────────────────────────────────────

    /// @dev Decodes the Callback payload and verifies the applyReactiveRiskSignal
    ///      selector + args match the live pool key exactly.
    function test_sentry_payloadDecodesCorrectlyForLivePool() public {
        vm.recordLogs();

        sentry.react(_transferLog(makeAddr("whale"), makeAddr("dex"), WHALE_THRESHOLD + 1 ether));

        // Find the Callback log
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes memory payload;
        bytes32 callbackTopic = IReactive.Callback.selector;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == callbackTopic) {
                payload = abi.decode(logs[i].data, (bytes));
                break;
            }
        }
        assertTrue(payload.length > 0, "Callback payload must be non-empty");

        // Verify selector
        bytes4 selector;
        assembly {
            selector := mload(add(payload, 32))
        }
        assertEq(
            selector, ArgosRiskAdapter.applyReactiveRiskSignal.selector, "selector must be applyReactiveRiskSignal"
        );

        // Decode args (skip selector)
        bytes memory args = new bytes(payload.length - 4);
        for (uint256 i = 0; i < args.length; i++) {
            args[i] = payload[i + 4];
        }
        (address rvmIdArg, PoolKey memory decodedKey, Argos.RiskState rs, uint128 max) =
            abi.decode(args, (address, PoolKey, Argos.RiskState, uint128));

        assertEq(rvmIdArg, address(0), "placeholder rvm_id must be zero");
        assertEq(Currency.unwrap(decodedKey.currency0), LiveAddrs.MOCK_LST, "currency0 must be mLST");
        assertEq(Currency.unwrap(decodedKey.currency1), LiveAddrs.MOCK_WETH, "currency1 must be mWETH");
        assertEq(decodedKey.fee, LiveAddrs.POOL_FEE);
        assertEq(decodedKey.tickSpacing, LiveAddrs.TICK_SPACING);
        assertEq(address(decodedKey.hooks), LiveAddrs.ARGOS, "hooks must be live Argos");
        assertEq(uint256(rs), uint256(Argos.RiskState.Blocked));
        assertEq(max, 0);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    function _transferLog(address from, address to, uint256 amount) internal view returns (IReactive.LogRecord memory) {
        return IReactive.LogRecord({
            chain_id: ETHEREUM_SEPOLIA_CHAIN_ID,
            _contract: L1_LST_TOKEN,
            topic_0: ERC20_TRANSFER_TOPIC,
            topic_1: uint256(uint160(from)),
            topic_2: uint256(uint160(to)),
            topic_3: 0,
            data: abi.encode(amount),
            block_number: 0,
            op_code: 0,
            block_hash: 0,
            tx_hash: 0,
            log_index: 0
        });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Part 2: Fork (Unichain Sepolia) — destination-side protection pipeline
//
// These tests fork the live chain and drive the full protection pipeline:
//   applyReactiveRiskSignal → Argos.applyRiskUpdate → MarketConfig.Blocked
//
// Skipped automatically if RPC_URL is not set in the environment.
// ─────────────────────────────────────────────────────────────────────────────
contract ReactiveProtectionForkTest is Test {
    using PoolIdLibrary for PoolKey;

    Argos internal argos;
    ArgosRiskAdapter internal adapter;
    PoolKey internal poolKey;

    function setUp() public {
        string memory rpc = vm.envOr("RPC_URL", string(""));
        if (bytes(rpc).length == 0) return; // fork tests need RPC_URL

        vm.createSelectFork(rpc);

        argos = Argos(LiveAddrs.ARGOS);
        adapter = ArgosRiskAdapter(payable(LiveAddrs.ADAPTER));
        poolKey = _livePoolKey();
    }

    modifier requiresFork() {
        if (block.chainid != 1301) {
            vm.skip(true);
            return;
        }
        _;
    }

    // ── Step 0: Confirm pool is reachable and in expected initial state ────

    function test_fork_poolIdMatchesExpected() public requiresFork {
        assertEq(PoolId.unwrap(poolKey.toId()), LiveAddrs.POOL_ID, "pool ID must match known deployment");
    }

    function test_fork_initialStateIsSafe() public requiresFork {
        Argos.MarketConfig memory cfg = argos.getMarketConfig(poolKey);
        assertTrue(cfg.enabled, "market must be enabled");
        assertEq(uint256(cfg.riskState), uint256(Argos.RiskState.Safe), "initial state must be Safe");
        assertEq(cfg.maxAbsAmount, 0);
    }

    function test_fork_adapterApprovedPoolIsTrue() public requiresFork {
        assertTrue(adapter.approvedPools(poolKey.toId()), "adapter must have demo pool approved");
    }

    function test_fork_argosRiskControllerIsAdapter() public requiresFork {
        assertEq(argos.riskController(), LiveAddrs.ADAPTER, "riskController must be adapter");
    }

    // ── Step 1: Reactive delivers protection signal ─────────────────────────
    //
    // ArgosRiskAdapter.applyReactiveRiskSignal has no msg.sender restriction —
    // only the first-argument rvmId check against the stored rvm_id (= deployer).
    // This mirrors what the Reactive Network does: it injects the RVM identity
    // as arg0 when delivering the callback.

    function test_fork_reactiveSignalBlocksDemoPool() public requiresFork {
        // Verify pre-condition
        Argos.MarketConfig memory before = argos.getMarketConfig(poolKey);
        assertEq(uint256(before.riskState), uint256(Argos.RiskState.Safe));

        // Simulate Reactive callback delivery: pass deployer as rvmId (= stored rvm_id)
        adapter.applyReactiveRiskSignal(LiveAddrs.DEPLOYER, poolKey, Argos.RiskState.Blocked, 0);

        // Verify post-condition
        Argos.MarketConfig memory after_ = argos.getMarketConfig(poolKey);
        assertTrue(after_.enabled, "market must remain enabled");
        assertEq(uint256(after_.riskState), uint256(Argos.RiskState.Blocked), "risk state must be Blocked after signal");

        // Clean up: reset to Safe so subsequent tests see a clean slate.
        vm.prank(LiveAddrs.DEPLOYER);
        argos.applyRiskUpdate(poolKey, Argos.RiskState.Safe, 0);

        Argos.MarketConfig memory reset = argos.getMarketConfig(poolKey);
        assertEq(uint256(reset.riskState), uint256(Argos.RiskState.Safe), "must be Safe after reset");
    }

    // ── Step 2: Restricted state with swap cap ─────────────────────────────

    function test_fork_reactiveSignalRestrictsDemoPool() public requiresFork {
        uint128 cap = 500e18;

        adapter.applyReactiveRiskSignal(LiveAddrs.DEPLOYER, poolKey, Argos.RiskState.Restricted, cap);

        Argos.MarketConfig memory cfg = argos.getMarketConfig(poolKey);
        assertEq(uint256(cfg.riskState), uint256(Argos.RiskState.Restricted));
        assertEq(cfg.maxAbsAmount, cap);

        // Reset
        vm.prank(LiveAddrs.DEPLOYER);
        argos.applyRiskUpdate(poolKey, Argos.RiskState.Safe, 0);
    }

    // ── Step 3: Unauthorized signal is rejected ────────────────────────────

    function test_fork_wrongRvmIdIsRejected() public requiresFork {
        address wrongRvm = makeAddr("impostor");
        vm.expectRevert("Authorized RVM ID only");
        adapter.applyReactiveRiskSignal(wrongRvm, poolKey, Argos.RiskState.Blocked, 0);
    }

    // ── Step 4: Unapproved pool is rejected ───────────────────────────────

    function test_fork_unapprovedPoolIsRejected() public requiresFork {
        PoolKey memory unknownPool = PoolKey({
            currency0: Currency.wrap(makeAddr("c0")),
            currency1: Currency.wrap(makeAddr("c1")),
            fee: 500,
            tickSpacing: 10,
            hooks: IHooks(address(0))
        });

        vm.expectRevert(abi.encodeWithSelector(ArgosRiskAdapter.UnapprovedPool.selector, unknownPool.toId()));
        adapter.applyReactiveRiskSignal(LiveAddrs.DEPLOYER, unknownPool, Argos.RiskState.Blocked, 0);
    }
}
