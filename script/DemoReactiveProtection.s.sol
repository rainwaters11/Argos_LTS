// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";

import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";

import {Argos} from "../src/Argos.sol";
import {ArgosRiskAdapter} from "../src/ArgosRiskAdapter.sol";

/// @notice End-to-end demo of the Reactive-triggered protection pipeline.
///
/// Simulates what the Reactive Network does when it detects a whale LST dump on L1:
///   1. ArgosRiskAdapter.applyReactiveRiskSignal is called (Reactive delivers the callback).
///   2. Argos.applyRiskUpdate sets the pool to Blocked.
///   3. Any swap on the pool would now revert with SwapBlocked.
///   4. Owner resets the pool to Safe (repeatable demo).
///
/// IMPORTANT: ArgosRiskAdapter.applyReactiveRiskSignal has no msg.sender
/// restriction — only the first-arg rvmId is verified against the stored rvm_id
/// (set at adapter deployment time to the deployer). This is the same check the
/// Reactive Network satisfies when relaying real callbacks.
///
/// Required env vars:
///   PRIVATE_KEY     — Argos owner / adapter deployer key
///   MOCK_WETH       — mWETH token address
///   MOCK_LST        — mLST token address
///   ARGOS_ADDRESS   — Deployed Argos hook address
///   ADAPTER_ADDRESS — Deployed ArgosRiskAdapter address
///
/// Optional env vars:
///   POOL_FEE          — LP fee tier (default: 3000)
///   POOL_TICK_SPACING — Tick spacing   (default: 60)
///
/// Demo dry run (no broadcast — shows calldata and state reads):
///   forge script script/DemoReactiveProtection.s.sol:DemoReactiveProtectionScript \
///       --rpc-url "$RPC_URL" -vvvv
///
/// Broadcast (executes on-chain, resets to Safe at the end):
///   forge script script/DemoReactiveProtection.s.sol:DemoReactiveProtectionScript \
///       --rpc-url "$RPC_URL" \
///       --broadcast -vvvv
contract DemoReactiveProtectionScript is Script {
    using PoolIdLibrary for PoolKey;

    address internal constant DEFAULT_ARGOS = 0xCd6606e077b271316d09De8521ADBE72f8eB4088;
    address internal constant DEFAULT_ADAPTER = 0x82EC3A310dF509A3bDe959DefBfeaa444Bb06a1B;
    uint24 internal constant DEFAULT_POOL_FEE = 3000;
    int24 internal constant DEFAULT_TICK_SPACING = 60;

    struct Cfg {
        uint256 deployerPk;
        address deployer;
        Argos argos;
        ArgosRiskAdapter adapter;
        PoolKey poolKey;
    }

    function run() external {
        Cfg memory c = _readCfg();
        _logState("PRE-SIGNAL", c);
        _deliverSignal(c);
        _logState("POST-SIGNAL (Blocked)", c);
        _assertBlocked(c);
        _resetToSafe(c);
        _logState("POST-RESET (Safe)", c);
        _assertSafe(c);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    function _readCfg() internal view returns (Cfg memory c) {
        c.deployerPk = vm.envUint("PRIVATE_KEY");
        c.deployer = vm.addr(c.deployerPk);
        c.argos = Argos(vm.envOr("ARGOS_ADDRESS", DEFAULT_ARGOS));
        c.adapter = ArgosRiskAdapter(payable(vm.envOr("ADAPTER_ADDRESS", DEFAULT_ADAPTER)));

        address weth = vm.envAddress("MOCK_WETH");
        address lst = vm.envAddress("MOCK_LST");
        uint24 fee = uint24(vm.envOr("POOL_FEE", uint256(DEFAULT_POOL_FEE)));
        int24 ts = int24(int256(vm.envOr("POOL_TICK_SPACING", uint256(uint24(DEFAULT_TICK_SPACING)))));
        (address c0, address c1) = lst < weth ? (lst, weth) : (weth, lst);
        c.poolKey = PoolKey({
            currency0: Currency.wrap(c0),
            currency1: Currency.wrap(c1),
            fee: fee,
            tickSpacing: ts,
            hooks: IHooks(address(c.argos))
        });
    }

    /// @dev Simulates what Reactive Network delivers: calls applyReactiveRiskSignal.
    /// applyReactiveRiskSignal only checks rvmIdOnly(firstArg); no msg.sender gate.
    function _deliverSignal(Cfg memory c) internal {
        console2.log("");
        console2.log(">>> STEP 1: Deliver Reactive protection signal (Blocked)");
        console2.log("    Simulates: Reactive Network relays callback from sentry to adapter");
        vm.startBroadcast(c.deployerPk);
        c.adapter.applyReactiveRiskSignal(c.deployer, c.poolKey, Argos.RiskState.Blocked, 0);
        vm.stopBroadcast();
    }

    function _assertBlocked(Cfg memory c) internal view {
        Argos.MarketConfig memory cfg = c.argos.getMarketConfig(c.poolKey);
        require(cfg.enabled, "DemoReactiveProtection: market must remain enabled");
        require(
            uint256(cfg.riskState) == uint256(Argos.RiskState.Blocked), "DemoReactiveProtection: expected Blocked state"
        );
        console2.log("VERIFIED: pool is Blocked - any swap would revert with SwapBlocked.");
    }

    function _resetToSafe(Cfg memory c) internal {
        console2.log("");
        console2.log(">>> STEP 2: Owner resets pool to Safe (repeatable demo)");
        vm.startBroadcast(c.deployerPk);
        c.argos.applyRiskUpdate(c.poolKey, Argos.RiskState.Safe, 0);
        vm.stopBroadcast();
    }

    function _assertSafe(Cfg memory c) internal view {
        Argos.MarketConfig memory cfg = c.argos.getMarketConfig(c.poolKey);
        require(
            uint256(cfg.riskState) == uint256(Argos.RiskState.Safe),
            "DemoReactiveProtection: expected Safe state after reset"
        );
        console2.log("VERIFIED: pool is Safe. Demo complete and repeatable.");
    }

    function _logState(string memory label, Cfg memory c) internal view {
        Argos.MarketConfig memory cfg = c.argos.getMarketConfig(c.poolKey);
        console2.log("");
        console2.log("=== STATE: %s ===", label);
        console2.log("  Argos:           ", address(c.argos));
        console2.log("  Adapter:         ", address(c.adapter));
        console2.log("  riskController:  ", c.argos.riskController());
        console2.log("  deployer/rvm_id: ", c.deployer);
        console2.log("  Pool ID:");
        console2.logBytes32(PoolId.unwrap(c.poolKey.toId()));
        console2.log("  enabled:         ", cfg.enabled);
        console2.log(
            "  riskState:       ",
            cfg.riskState == Argos.RiskState.Safe
                ? "Safe"
                : cfg.riskState == Argos.RiskState.Restricted ? "Restricted" : "Blocked"
        );
        console2.log("  maxAbsAmount:    ", cfg.maxAbsAmount);
    }
}
