// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";

import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";

import {Argos} from "../src/Argos.sol";
import {ArgosRiskAdapter} from "../src/ArgosRiskAdapter.sol";

/// @notice Wire ArgosRiskAdapter as the Argos risk controller and approve the demo pool.
///
/// IMPORTANT: Run ConfigureArgosDemoMarket BEFORE this script. Argos.applyRiskUpdate
/// will revert with PoolNotEnabled until configureMarket has been called for the pool.
///
/// Recommended execution order:
///   1. DeployMockTokens
///   2. CreateArgosDemoPool
///   3. ConfigureArgosDemoMarket   ← market must be enabled first
///   4. DeployArgosRiskAdapter (or let this script deploy it via ADAPTER_ADDRESS=unset)
///   5. WireReactiveAdapter        ← this script
///
/// Required env vars:
///   PRIVATE_KEY          — Argos owner private key
///   MOCK_WETH            — MockWETH token address
///   MOCK_LST             — MockLST token address
///
/// Optional env vars:
///   ARGOS_ADDRESS        — Deployed Argos address (default: DEFAULT_ARGOS constant)
///   ADAPTER_ADDRESS      — Existing ArgosRiskAdapter address; skips deployment if set
///   CALLBACK_PROXY       — Reactive callback proxy (default: Unichain Sepolia canonical)
///   POOL_FEE             — LP fee tier in bips*100 (default: 3000)
///   POOL_TICK_SPACING    — Tick spacing (default: 60)
///   POOL_HOOK            — Hook address override (default: ARGOS_ADDRESS)
///
/// Dry run:
///   forge script script/WireReactiveAdapter.s.sol:WireReactiveAdapterScript \
///       --rpc-url "$RPC_URL"
///
/// Broadcast:
///   forge script script/WireReactiveAdapter.s.sol:WireReactiveAdapterScript \
///       --rpc-url "$RPC_URL" \
///       --broadcast
contract WireReactiveAdapterScript is Script {
    address internal constant UNICHAIN_SEPOLIA_CALLBACK_PROXY = 0x9299472A6399Fd1027ebF067571Eb3e3D7837FC4;
    address internal constant DEFAULT_ARGOS = 0xCd6606e077b271316d09De8521ADBE72f8eB4088;
    uint24 internal constant DEFAULT_POOL_FEE = 3000;
    int24 internal constant DEFAULT_TICK_SPACING = 60;

    error InvalidCurrencyPair();

    function run() external returns (address adapterAddress, PoolKey memory poolKey) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address argosAddr = vm.envOr("ARGOS_ADDRESS", DEFAULT_ARGOS);
        address callbackProxy = vm.envOr("CALLBACK_PROXY", UNICHAIN_SEPOLIA_CALLBACK_PROXY);
        address maybeAdapter = vm.envOr("ADAPTER_ADDRESS", address(0));

        address mockWETH = vm.envAddress("MOCK_WETH");
        address mockLST = vm.envAddress("MOCK_LST");
        uint24 poolFee = uint24(vm.envOr("POOL_FEE", uint256(DEFAULT_POOL_FEE)));
        int24 tickSpacing = int24(int256(vm.envOr("POOL_TICK_SPACING", uint256(uint24(DEFAULT_TICK_SPACING)))));
        address poolHook = vm.envOr("POOL_HOOK", argosAddr);

        poolKey = _poolKey(mockWETH, mockLST, poolFee, tickSpacing, poolHook);

        console2.log("Argos:                 ", argosAddr);
        console2.log("Callback Proxy:        ", callbackProxy);
        console2.log("Pool hook:             ", poolHook);

        vm.startBroadcast(deployerPrivateKey);

        if (maybeAdapter == address(0)) {
            ArgosRiskAdapter adapter = new ArgosRiskAdapter(argosAddr, callbackProxy);
            adapterAddress = address(adapter);
            console2.log("ArgosRiskAdapter deployed at:", adapterAddress);
        } else {
            adapterAddress = maybeAdapter;
            console2.log("Using existing ArgosRiskAdapter:", adapterAddress);
        }

        Argos(argosAddr).setRiskController(adapterAddress);
        ArgosRiskAdapter(payable(adapterAddress)).setApprovedPool(poolKey, true);

        vm.stopBroadcast();

        console2.log("Argos risk controller set to:", adapterAddress);
        console2.log("Approved monitored pool on adapter.");
        if (maybeAdapter == address(0)) {
            console2.log("---");
            console2.log("Adapter was freshly deployed. Pin it for future runs:");
            console2.log("  export ADAPTER_ADDRESS=%s", adapterAddress);
        }
    }

    function _poolKey(address tokenA, address tokenB, uint24 fee, int24 tickSpacing, address hook)
        internal
        pure
        returns (PoolKey memory)
    {
        if (tokenA == tokenB) revert InvalidCurrencyPair();

        (address currency0, address currency1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);

        return PoolKey({
            currency0: Currency.wrap(currency0),
            currency1: Currency.wrap(currency1),
            fee: fee,
            tickSpacing: tickSpacing,
            hooks: IHooks(hook)
        });
    }
}
