// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";

import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";

import {Argos} from "../src/Argos.sol";

/// @notice Enable the Argos demo market and set initial risk state to Safe.
///
/// IMPORTANT: Run this script BEFORE WireReactiveAdapter so that the market is
/// enabled before any reactive risk updates can be applied. Argos.applyRiskUpdate
/// reverts with PoolNotEnabled if the market has not been configured first.
///
/// Required env vars:
///   PRIVATE_KEY          — deployer / Argos owner private key
///   MOCK_WETH            — MockWETH token address
///   MOCK_LST             — MockLST token address
///   ARGOS_ADDRESS        — Deployed Argos hook address
///
/// Optional env vars:
///   POOL_FEE             — LP fee tier in bips*100 (default: 3000)
///   POOL_TICK_SPACING    — Tick spacing (default: 60)
///
/// Dry run:
///   forge script script/ConfigureArgosDemoMarket.s.sol:ConfigureArgosDemoMarketScript \
///       --rpc-url "$RPC_URL"
///
/// Broadcast:
///   forge script script/ConfigureArgosDemoMarket.s.sol:ConfigureArgosDemoMarketScript \
///       --rpc-url "$RPC_URL" \
///       --broadcast
contract ConfigureArgosDemoMarketScript is Script {
    using PoolIdLibrary for PoolKey;

    uint24 internal constant DEFAULT_POOL_FEE = 3000;
    int24 internal constant DEFAULT_TICK_SPACING = 60;

    function run() external returns (PoolKey memory poolKey) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        address mockWETH = vm.envAddress("MOCK_WETH");
        address mockLST = vm.envAddress("MOCK_LST");
        address argosAddr = vm.envAddress("ARGOS_ADDRESS");

        uint24 poolFee = uint24(vm.envOr("POOL_FEE", uint256(DEFAULT_POOL_FEE)));
        int24 tickSpacing = int24(int256(vm.envOr("POOL_TICK_SPACING", uint256(uint24(DEFAULT_TICK_SPACING)))));

        // Sort currencies to match the key used during pool initialization
        (address currency0Addr, address currency1Addr) = mockWETH < mockLST ? (mockWETH, mockLST) : (mockLST, mockWETH);

        poolKey = PoolKey({
            currency0: Currency.wrap(currency0Addr),
            currency1: Currency.wrap(currency1Addr),
            fee: poolFee,
            tickSpacing: tickSpacing,
            hooks: IHooks(argosAddr)
        });

        PoolId poolId = poolKey.toId();

        console2.log("Argos:                 ", argosAddr);
        console2.log("Currency0:             ", currency0Addr);
        console2.log("Currency1:             ", currency1Addr);
        console2.log("Pool fee:              ", poolFee);
        console2.log("Tick spacing:          ", tickSpacing);
        console2.logBytes32(PoolId.unwrap(poolId));

        vm.startBroadcast(deployerPrivateKey);

        // Enable the market, starting in Safe state with no swap restrictions (maxAbsAmount = 0).
        // maxAbsAmount is only enforced when riskState == Restricted; 0 is the correct sentinel
        // for an unrestricted Safe market.
        Argos(argosAddr).configureMarket(poolKey, true, Argos.RiskState.Safe, 0);

        vm.stopBroadcast();

        console2.log("Market configured: enabled=true, riskState=Safe, maxAbsAmount=0");
    }
}
