// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";

import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {IReactive} from "reactive-lib/src/interfaces/IReactive.sol";

import {Argos} from "../src/Argos.sol";
import {ArgosRiskAdapter} from "../src/ArgosRiskAdapter.sol";
import {ReactiveSentry} from "../src/ReactiveSentry.sol";

contract MockArgos {
    using PoolIdLibrary for PoolKey;

    PoolId public lastPoolId;
    Argos.RiskState public lastRiskState;
    uint128 public lastMaxAbsAmount;
    uint256 public callCount;

    function applyRiskUpdate(PoolKey calldata key, Argos.RiskState riskState, uint128 maxAbsAmount) external {
        lastPoolId = key.toId();
        lastRiskState = riskState;
        lastMaxAbsAmount = maxAbsAmount;
        callCount++;
    }
}

contract ReactiveIntegrationTest is Test {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    uint256 internal constant UNICHAIN_SEPOLIA_CHAIN_ID = 1301;
    address internal constant UNICHAIN_SEPOLIA_CALLBACK_PROXY = 0x9299472A6399Fd1027ebF067571Eb3e3D7837FC4;

    event Callback(
        uint256 indexed chainId, address indexed destinationContract, uint64 indexed gasLimit, bytes payload
    );

    uint256 internal constant ETHEREUM_SEPOLIA_CHAIN_ID = 11155111;
    uint256 internal constant ERC20_TRANSFER_TOPIC = uint256(keccak256("Transfer(address,address,uint256)"));

    address internal owner = makeAddr("owner");
    address internal reactiveSender = makeAddr("reactiveSender");
    address internal trustedRvmId = makeAddr("trustedRvmId");
    address internal wrongRvmId = makeAddr("wrongRvmId");
    address internal mockLST = makeAddr("mockLST");
    address internal randomCaller = makeAddr("randomCaller");

    MockArgos internal mockArgos;
    ArgosRiskAdapter internal adapter;
    ReactiveSentry internal sentry;
    PoolKey internal poolKey;

    function setUp() public {
        vm.startPrank(trustedRvmId);

        mockArgos = new MockArgos();
        adapter = new ArgosRiskAdapter(address(mockArgos), UNICHAIN_SEPOLIA_CALLBACK_PROXY);

        poolKey = _mockPoolKey();
        adapter.setApprovedPool(poolKey, true);

        sentry = new ReactiveSentry(
            reactiveSender, mockLST, UNICHAIN_SEPOLIA_CHAIN_ID, address(adapter), poolKey, 1_000_000 ether, 600_000
        );

        vm.stopPrank();
    }

    function test_adapterRejectsUntrustedRvmId() public {
        vm.expectRevert(bytes("Authorized RVM ID only"));
        adapter.applyReactiveRiskSignal(wrongRvmId, poolKey, Argos.RiskState.Blocked, 0);
    }

    function test_adapterRejectsUnapprovedPool() public {
        PoolKey memory unknownPool = _mockPoolKeyWith(makeAddr("c0"), makeAddr("c1"));

        vm.expectRevert(abi.encodeWithSelector(ArgosRiskAdapter.UnapprovedPool.selector, unknownPool.toId()));
        adapter.applyReactiveRiskSignal(trustedRvmId, unknownPool, Argos.RiskState.Blocked, 0);
    }

    function test_adapterAppliesRiskUpdateWithTrustedSignal() public {
        adapter.applyReactiveRiskSignal(trustedRvmId, poolKey, Argos.RiskState.Restricted, 5e17);

        assertEq(PoolId.unwrap(mockArgos.lastPoolId()), PoolId.unwrap(poolKey.toId()));
        assertEq(uint256(mockArgos.lastRiskState()), uint256(Argos.RiskState.Restricted));
        assertEq(mockArgos.lastMaxAbsAmount(), 5e17);
        assertEq(mockArgos.callCount(), 1);
    }

    function test_adapterSettersAreOwnerGated() public {
        vm.prank(randomCaller);
        vm.expectRevert(ArgosRiskAdapter.Unauthorized.selector);
        adapter.setArgos(address(mockArgos));
    }

    function test_thresholdDetection_emitsNoCallbackAtOrBelowThreshold() public {
        vm.recordLogs();

        sentry.react(_transferLogRecord(mockLST, makeAddr("from"), makeAddr("to"), 1_000_000 ether));

        Vm.Log[] memory entries = vm.getRecordedLogs();
        bytes32 callbackSig = keccak256("Callback(uint256,address,uint64,bytes)");

        for (uint256 i = 0; i < entries.length; i++) {
            assertTrue(entries[i].topics[0] != callbackSig);
        }
    }

    function test_payloadFormatting_forAdapterFlow() public {
        bytes memory expectedPayload = abi.encodeWithSelector(
            ArgosRiskAdapter.applyReactiveRiskSignal.selector, address(0), poolKey, Argos.RiskState.Blocked, uint128(0)
        );

        vm.expectEmit(true, true, false, true, address(sentry));
        emit Callback(UNICHAIN_SEPOLIA_CHAIN_ID, address(adapter), 600_000, expectedPayload);

        sentry.react(_transferLogRecord(mockLST, makeAddr("from"), makeAddr("to"), 1_000_001 ether));
    }

    function test_nonTransferLogDoesNotEmitCallback() public {
        vm.recordLogs();

        IReactive.LogRecord memory log = _transferLogRecord(mockLST, makeAddr("from"), makeAddr("to"), 2_000_000 ether);
        log.topic_0 = uint256(keccak256("Approval(address,address,uint256)"));

        sentry.react(log);

        Vm.Log[] memory entries = vm.getRecordedLogs();
        bytes32 callbackSig = keccak256("Callback(uint256,address,uint64,bytes)");

        for (uint256 i = 0; i < entries.length; i++) {
            assertTrue(entries[i].topics[0] != callbackSig);
        }
    }

    function test_invalidTransferAmountEncodingReverts() public {
        IReactive.LogRecord memory log = _transferLogRecord(mockLST, makeAddr("from"), makeAddr("to"), 2_000_000 ether);
        log.data = hex"1234";

        vm.expectRevert(ReactiveSentry.AmountDecodeFailed.selector);
        sentry.react(log);
    }

    function _mockPoolKey() internal returns (PoolKey memory) {
        return _mockPoolKeyWith(makeAddr("currency0"), makeAddr("currency1"));
    }

    function _transferLogRecord(address token, address from, address to, uint256 amount)
        internal
        pure
        returns (IReactive.LogRecord memory)
    {
        return IReactive.LogRecord({
            chain_id: ETHEREUM_SEPOLIA_CHAIN_ID,
            _contract: token,
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

    function _mockPoolKeyWith(address c0, address c1) internal pure returns (PoolKey memory) {
        address currency0 = c0 < c1 ? c0 : c1;
        address currency1 = c0 < c1 ? c1 : c0;

        return PoolKey({
            currency0: Currency.wrap(currency0),
            currency1: Currency.wrap(currency1),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(0))
        });
    }
}
