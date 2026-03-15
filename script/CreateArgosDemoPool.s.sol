// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";

import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {LiquidityAmounts} from "@uniswap/v4-core/test/utils/LiquidityAmounts.sol";

import {IPositionManager} from "@uniswap/v4-periphery/src/interfaces/IPositionManager.sol";
import {IPoolInitializer_v4} from "@uniswap/v4-periphery/src/interfaces/IPoolInitializer_v4.sol";
import {Actions} from "@uniswap/v4-periphery/src/libraries/Actions.sol";

import {IPermit2} from "permit2/src/interfaces/IPermit2.sol";

/// @notice Initialize an Argos-hooked demo pool on Unichain Sepolia and seed it with liquidity.
///
/// Required env vars:
///   PRIVATE_KEY          — deployer private key
///   MOCK_WETH            — MockWETH token address (from DeployMockTokens)
///   MOCK_LST             — MockLST token address  (from DeployMockTokens)
///   ARGOS_ADDRESS        — Deployed Argos hook address
///
/// Optional env vars:
///   POOL_FEE             — LP fee tier in bips*100 (default: 3000 = 0.30%)
///   POOL_TICK_SPACING    — Tick spacing (default: 60)
///   SQRT_PRICE_X96       — Initial sqrt price Q64.96 (default: 2**96 = price 1:1)
///   TOKEN0_AMOUNT        — Seed liquidity for currency0, in wei (default: 10_000e18)
///   TOKEN1_AMOUNT        — Seed liquidity for currency1, in wei (default: 10_000e18)
///   POSITION_MANAGER     — Uniswap v4 PositionManager override
///   PERMIT2_ADDRESS      — Permit2 override
///
/// Dry run:
///   forge script script/CreateArgosDemoPool.s.sol:CreateArgosDemoPoolScript \
///       --rpc-url "$RPC_URL"
///
/// Broadcast:
///   forge script script/CreateArgosDemoPool.s.sol:CreateArgosDemoPoolScript \
///       --rpc-url "$RPC_URL" \
///       --broadcast
contract CreateArgosDemoPoolScript is Script {
    // Unichain Sepolia canonical addresses
    address internal constant UNICHAIN_SEPOLIA_POSITION_MANAGER = 0xf969Aee60879C54bAAed9F3eD26147Db216Fd664;
    address internal constant PERMIT2_CANONICAL = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    uint24 internal constant DEFAULT_POOL_FEE = 3000;
    int24 internal constant DEFAULT_TICK_SPACING = 60;
    uint160 internal constant DEFAULT_SQRT_PRICE_X96 = 2 ** 96; // sqrt(1) * 2^96 → price 1:1
    uint256 internal constant DEFAULT_TOKEN_AMOUNT = 10_000e18;

    // ±750 ticks around current price gives a comfortable spread at tickSpacing 60
    int24 internal constant TICK_RANGE_HALF_TICKS = 750;

    struct Cfg {
        address deployer;
        address currency0Addr;
        address currency1Addr;
        address argosAddr;
        uint24 poolFee;
        int24 tickSpacing;
        uint160 sqrtPriceX96;
        uint256 token0Amount;
        uint256 token1Amount;
        address positionManagerAddr;
        address permit2Addr;
    }

    function run() external returns (PoolKey memory poolKey) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        Cfg memory cfg = _readCfg(pk);

        poolKey = _buildPoolKey(cfg);

        (int24 tickLower, int24 tickUpper, uint128 liquidity) = _calcPosition(poolKey, cfg);

        _logParams(cfg, poolKey, tickLower, tickUpper, liquidity);

        bytes[] memory multicallParams = _buildMulticall(poolKey, cfg, tickLower, tickUpper, liquidity);

        vm.startBroadcast(pk);
        _approveTokens(cfg);
        IPositionManager(cfg.positionManagerAddr).multicall(multicallParams);
        vm.stopBroadcast();

        console2.log("Pool initialized and liquidity seeded.");
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    function _readCfg(uint256 pk) internal view returns (Cfg memory cfg) {
        cfg.deployer = vm.addr(pk);
        address mockWETH = vm.envAddress("MOCK_WETH");
        address mockLST = vm.envAddress("MOCK_LST");
        cfg.argosAddr = vm.envAddress("ARGOS_ADDRESS");
        cfg.poolFee = uint24(vm.envOr("POOL_FEE", uint256(DEFAULT_POOL_FEE)));
        cfg.tickSpacing = int24(int256(vm.envOr("POOL_TICK_SPACING", uint256(uint24(DEFAULT_TICK_SPACING)))));
        cfg.sqrtPriceX96 = uint160(vm.envOr("SQRT_PRICE_X96", uint256(DEFAULT_SQRT_PRICE_X96)));
        cfg.token0Amount = vm.envOr("TOKEN0_AMOUNT", DEFAULT_TOKEN_AMOUNT);
        cfg.token1Amount = vm.envOr("TOKEN1_AMOUNT", DEFAULT_TOKEN_AMOUNT);
        cfg.positionManagerAddr = vm.envOr("POSITION_MANAGER", UNICHAIN_SEPOLIA_POSITION_MANAGER);
        cfg.permit2Addr = vm.envOr("PERMIT2_ADDRESS", PERMIT2_CANONICAL);
        // Sort currencies — v4 requires currency0 < currency1 by address
        (cfg.currency0Addr, cfg.currency1Addr) = mockWETH < mockLST ? (mockWETH, mockLST) : (mockLST, mockWETH);
    }

    function _buildPoolKey(Cfg memory cfg) internal pure returns (PoolKey memory) {
        return PoolKey({
            currency0: Currency.wrap(cfg.currency0Addr),
            currency1: Currency.wrap(cfg.currency1Addr),
            fee: cfg.poolFee,
            tickSpacing: cfg.tickSpacing,
            hooks: IHooks(cfg.argosAddr)
        });
    }

    function _calcPosition(PoolKey memory poolKey, Cfg memory cfg)
        internal
        pure
        returns (int24 tickLower, int24 tickUpper, uint128 liquidity)
    {
        int24 currentTick = TickMath.getTickAtSqrtPrice(cfg.sqrtPriceX96);
        tickLower = _snapTick(currentTick - TICK_RANGE_HALF_TICKS * poolKey.tickSpacing, poolKey.tickSpacing);
        tickUpper = _snapTick(currentTick + TICK_RANGE_HALF_TICKS * poolKey.tickSpacing, poolKey.tickSpacing);
        liquidity = LiquidityAmounts.getLiquidityForAmounts(
            cfg.sqrtPriceX96,
            TickMath.getSqrtPriceAtTick(tickLower),
            TickMath.getSqrtPriceAtTick(tickUpper),
            cfg.token0Amount,
            cfg.token1Amount
        );
    }

    function _buildMulticall(
        PoolKey memory poolKey,
        Cfg memory cfg,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity
    ) internal view returns (bytes[] memory multicallParams) {
        bytes memory actions = abi.encodePacked(
            uint8(Actions.MINT_POSITION), uint8(Actions.SETTLE_PAIR), uint8(Actions.SWEEP), uint8(Actions.SWEEP)
        );

        bytes[] memory mintParams = new bytes[](4);
        mintParams[0] = abi.encode(
            poolKey,
            tickLower,
            tickUpper,
            liquidity,
            cfg.token0Amount + 1,
            cfg.token1Amount + 1,
            cfg.deployer,
            bytes("")
        );
        mintParams[1] = abi.encode(poolKey.currency0, poolKey.currency1);
        mintParams[2] = abi.encode(poolKey.currency0, cfg.deployer);
        mintParams[3] = abi.encode(poolKey.currency1, cfg.deployer);

        multicallParams = new bytes[](2);
        multicallParams[0] = abi.encodeCall(IPoolInitializer_v4.initializePool, (poolKey, cfg.sqrtPriceX96));
        multicallParams[1] = abi.encodeCall(
            IPositionManager.modifyLiquidities, (abi.encode(actions, mintParams), block.timestamp + 1 hours)
        );
    }

    function _approveTokens(Cfg memory cfg) internal {
        IPermit2 permit2 = IPermit2(cfg.permit2Addr);
        IERC20(cfg.currency0Addr).approve(cfg.permit2Addr, type(uint256).max);
        permit2.approve(cfg.currency0Addr, cfg.positionManagerAddr, type(uint160).max, type(uint48).max);
        IERC20(cfg.currency1Addr).approve(cfg.permit2Addr, type(uint256).max);
        permit2.approve(cfg.currency1Addr, cfg.positionManagerAddr, type(uint160).max, type(uint48).max);
    }

    function _logParams(Cfg memory cfg, PoolKey memory poolKey, int24 tickLower, int24 tickUpper, uint128 liquidity)
        internal
        pure
    {
        console2.log("Deployer:              ", cfg.deployer);
        console2.log("Argos hook:            ", cfg.argosAddr);
        console2.log("Currency0:             ", cfg.currency0Addr);
        console2.log("Currency1:             ", cfg.currency1Addr);
        console2.log("Pool fee:              ", poolKey.fee);
        console2.log("Tick spacing:          ", poolKey.tickSpacing);
        console2.log("Tick lower:            ", tickLower);
        console2.log("Tick upper:            ", tickUpper);
        console2.log("Liquidity units:       ", liquidity);
    }

    /// @dev Snap a tick to the nearest multiple of tickSpacing (rounds toward zero).
    function _snapTick(int24 tick, int24 tickSpacing) internal pure returns (int24) {
        // forge-lint: disable-next-line(divide-before-multiply)
        return (tick / tickSpacing) * tickSpacing;
    }
}
