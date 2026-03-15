// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {CustomRevert} from "@uniswap/v4-core/src/libraries/CustomRevert.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {IPoolManager, SwapParams} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {CurrencyLibrary, Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {LiquidityAmounts} from "@uniswap/v4-core/test/utils/LiquidityAmounts.sol";
import {IPositionManager} from "@uniswap/v4-periphery/src/interfaces/IPositionManager.sol";
import {Constants} from "@uniswap/v4-core/test/utils/Constants.sol";

import {EasyPosm} from "./utils/libraries/EasyPosm.sol";

import {Argos} from "../src/Argos.sol";
import {BaseTest} from "./utils/BaseTest.sol";

contract RevertingSwapCaller is IUnlockCallback {
    IPoolManager internal immutable manager;

    constructor(IPoolManager _manager) {
        manager = _manager;
    }

    function callSwap(PoolKey memory key, SwapParams memory params, bytes memory hookData) external {
        manager.unlock(abi.encode(key, params, hookData));
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(manager), "only manager");
        (PoolKey memory key, SwapParams memory params, bytes memory hookData) =
            abi.decode(data, (PoolKey, SwapParams, bytes));
        manager.swap(key, params, hookData);
        return bytes("");
    }
}

contract ArgosTest is BaseTest {
    using EasyPosm for IPositionManager;
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;
    using StateLibrary for IPoolManager;

    uint160 internal constant ALL_HOOK_MASK = (1 << 14) - 1;

    Currency currency0;
    Currency currency1;

    PoolKey poolKey;

    Argos hook;
    PoolId poolId;

    address riskController;
    address stranger;

    RevertingSwapCaller revertingSwapCaller;

    uint256 tokenId;
    int24 tickLower;
    int24 tickUpper;

    function setUp() public {
        deployArtifactsAndLabel();

        riskController = makeAddr("riskController");
        stranger = makeAddr("stranger");

        (currency0, currency1) = deployCurrencyPair();

        address flags =
            address(uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG) ^ (0x4444 << 144));
        bytes memory constructorArgs = abi.encode(poolManager, address(this), riskController);
        deployCodeTo("Argos.sol:Argos", constructorArgs, flags);
        hook = Argos(flags);

        poolKey = PoolKey(currency0, currency1, 3000, 60, IHooks(hook));
        poolId = poolKey.toId();
        poolManager.initialize(poolKey, Constants.SQRT_PRICE_1_1);

        tickLower = TickMath.minUsableTick(poolKey.tickSpacing);
        tickUpper = TickMath.maxUsableTick(poolKey.tickSpacing);

        uint128 liquidityAmount = 100e18;

        (uint256 amount0Expected, uint256 amount1Expected) = LiquidityAmounts.getAmountsForLiquidity(
            Constants.SQRT_PRICE_1_1,
            TickMath.getSqrtPriceAtTick(tickLower),
            TickMath.getSqrtPriceAtTick(tickUpper),
            liquidityAmount
        );

        (tokenId,) = positionManager.mint(
            poolKey,
            tickLower,
            tickUpper,
            liquidityAmount,
            amount0Expected + 1,
            amount1Expected + 1,
            address(this),
            block.timestamp,
            Constants.ZERO_BYTES
        );

        hook.configureMarket(poolKey, true, Argos.RiskState.Safe, 0);
        revertingSwapCaller = new RevertingSwapCaller(poolManager);
    }

    function testHookPermissionsAndFlags() public view {
        Hooks.Permissions memory permissions = hook.getHookPermissions();

        assertFalse(permissions.beforeInitialize);
        assertFalse(permissions.afterInitialize);
        assertFalse(permissions.beforeAddLiquidity);
        assertFalse(permissions.afterAddLiquidity);
        assertFalse(permissions.beforeRemoveLiquidity);
        assertFalse(permissions.afterRemoveLiquidity);
        assertTrue(permissions.beforeSwap);
        assertFalse(permissions.afterSwap);
        assertFalse(permissions.beforeDonate);
        assertFalse(permissions.afterDonate);
        assertTrue(permissions.beforeSwapReturnDelta);
        assertFalse(permissions.afterSwapReturnDelta);
        assertFalse(permissions.afterAddLiquidityReturnDelta);
        assertFalse(permissions.afterRemoveLiquidityReturnDelta);

        uint160 expectedFlags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG);
        assertEq(uint160(address(hook)) & ALL_HOOK_MASK, expectedFlags);
    }

    function testSafeStateAllowsSwap() public {
        uint256 amountIn = 1e18;
        BalanceDelta swapDelta = _swapExactInput(amountIn);

        assertEq(int256(swapDelta.amount0()), -int256(amountIn));
        assertEq(hook.beforeSwapCount(poolId), 1);

        Argos.MarketConfig memory config = hook.getMarketConfig(poolKey);
        assertTrue(config.enabled);
        assertEq(uint256(config.riskState), uint256(Argos.RiskState.Safe));
        assertEq(config.maxAbsAmount, 0);
    }

    function testUnauthorizedMarketConfigurationReverts() public {
        vm.prank(stranger);
        vm.expectRevert(Argos.Unauthorized.selector);
        hook.configureMarket(poolKey, true, Argos.RiskState.Safe, 0);
    }

    function testUnauthorizedRiskUpdateReverts() public {
        vm.prank(stranger);
        vm.expectRevert(Argos.Unauthorized.selector);
        hook.applyRiskUpdate(poolKey, Argos.RiskState.Blocked, 0);
    }

    function testAuthorizedRiskControllerCanUpdateState() public {
        vm.prank(riskController);
        hook.applyRiskUpdate(poolKey, Argos.RiskState.Restricted, 5e17);

        Argos.MarketConfig memory config = hook.getMarketConfig(poolKey);
        assertTrue(config.enabled);
        assertEq(uint256(config.riskState), uint256(Argos.RiskState.Restricted));
        assertEq(config.maxAbsAmount, 5e17);
    }

    function testBlockedStateRevertsSwap() public {
        vm.prank(riskController);
        hook.applyRiskUpdate(poolKey, Argos.RiskState.Blocked, 0);

        _expectWrappedBeforeSwapRevert(abi.encodeWithSelector(Argos.SwapBlocked.selector, poolId));
        _swapExactInput(1e18);
    }

    function testRestrictedStateAllowsBoundarySwap() public {
        uint256 amountIn = 5e17;

        vm.prank(riskController);
        hook.applyRiskUpdate(poolKey, Argos.RiskState.Restricted, uint128(amountIn));

        BalanceDelta swapDelta = _swapExactInput(amountIn);
        assertEq(int256(swapDelta.amount0()), -int256(amountIn));
        assertEq(hook.beforeSwapCount(poolId), 1);
    }

    function testRestrictedStateRejectsSwapAboveLimit() public {
        uint256 maxAbsAmount = 5e17;
        uint256 attemptedAmount = maxAbsAmount + 1;

        vm.prank(riskController);
        hook.applyRiskUpdate(poolKey, Argos.RiskState.Restricted, uint128(maxAbsAmount));

        _expectWrappedBeforeSwapRevert(
            abi.encodeWithSelector(Argos.SwapRestricted.selector, poolId, attemptedAmount, maxAbsAmount)
        );
        _swapExactInput(attemptedAmount);
    }

    function testDisabledMarketRevertsSwap() public {
        hook.configureMarket(poolKey, false, Argos.RiskState.Safe, 0);

        _expectWrappedBeforeSwapRevert(abi.encodeWithSelector(Argos.PoolNotEnabled.selector, poolId));
        _swapExactInput(1e18);
    }

    function testRestrictedStateRequiresPositiveLimit() public {
        vm.expectRevert(Argos.InvalidRestriction.selector);
        hook.configureMarket(poolKey, true, Argos.RiskState.Restricted, 0);
    }

    function testOwnerCanRotateRiskController() public {
        address newRiskController = makeAddr("newRiskController");
        hook.setRiskController(newRiskController);

        vm.prank(newRiskController);
        hook.applyRiskUpdate(poolKey, Argos.RiskState.Blocked, 0);

        Argos.MarketConfig memory config = hook.getMarketConfig(poolKey);
        assertEq(uint256(config.riskState), uint256(Argos.RiskState.Blocked));
    }

    function test_beforeSwap_wrapsHookRevertWhenParkingModeUnsupported() public {
        bytes memory hookData = abi.encode(true);

        // PoolManager wraps downstream hook reverts via ERC-7751 WrappedError.
        vm.expectRevert(
            abi.encodeWithSelector(
                CustomRevert.WrappedError.selector,
                address(hook),
                IHooks.beforeSwap.selector,
                abi.encodeWithSelector(Argos.UnsupportedParkMode.selector),
                abi.encodeWithSelector(Hooks.HookCallFailed.selector)
            )
        );

        revertingSwapCaller.callSwap({
            key: poolKey,
            params: SwapParams({
                zeroForOne: true, amountSpecified: 1e18, sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
            }),
            hookData: hookData
        });
    }

    function test_beforeSwap_succeedsWhenGasIsNormal() public {
        uint256 amountIn = 1e18;
        bytes memory hookData = abi.encode(false);

        BalanceDelta swapDelta = _swapExactInputWithHookData(amountIn, hookData);

        assertEq(int256(swapDelta.amount0()), -int256(amountIn));
        assertEq(hook.beforeSwapCount(poolId), 1);
    }

    function test_beforeSwap_parksExactInputAndMintsClaim() public {
        uint256 amountIn = 1e18;
        bytes memory hookData = abi.encode(true);

        uint256 inputCurrencyId = currency0.toId();
        uint256 outputCurrencyId = currency1.toId();
        uint256 preClaimBalance = poolManager.balanceOf(address(swapRouter), inputCurrencyId);

        BalanceDelta swapDelta = _swapExactInputWithHookData(amountIn, hookData);

        assertEq(int256(swapDelta.amount0()), -int256(amountIn));
        assertEq(int256(swapDelta.amount1()), 0);
        assertEq(hook.beforeSwapCount(poolId), 1);

        uint256 postClaimBalance = poolManager.balanceOf(address(swapRouter), inputCurrencyId);
        assertEq(postClaimBalance - preClaimBalance, amountIn);

        Argos.ParkedIntent memory parkedIntent = hook.getParkedIntent(poolKey, address(swapRouter));
        assertEq(parkedIntent.sender, address(swapRouter));
        assertEq(parkedIntent.inputCurrencyId, inputCurrencyId);
        assertEq(parkedIntent.outputCurrencyId, outputCurrencyId);
        assertEq(parkedIntent.amountIn, amountIn);
        assertTrue(parkedIntent.zeroForOne);
        assertEq(parkedIntent.parkedAt, uint64(block.timestamp));
    }

    function test_beforeSwap_revertsOnDuplicatePark() public {
        uint256 amountIn = 1e18;
        bytes memory hookData = abi.encode(true);

        _swapExactInputWithHookData(amountIn, hookData);

        _expectWrappedBeforeSwapRevert(abi.encodeWithSelector(Argos.ExistingParkedIntent.selector));
        _swapExactInputWithHookData(amountIn, hookData);
    }

    function _swapExactInput(uint256 amountIn) internal returns (BalanceDelta) {
        return _swapExactInputWithHookData(amountIn, Constants.ZERO_BYTES);
    }

    function _swapExactInputWithHookData(uint256 amountIn, bytes memory hookData) internal returns (BalanceDelta) {
        return swapRouter.swapExactTokensForTokens({
            amountIn: amountIn,
            amountOutMin: 0,
            zeroForOne: true,
            poolKey: poolKey,
            hookData: hookData,
            receiver: address(this),
            deadline: block.timestamp + 1
        });
    }

    function _expectWrappedBeforeSwapRevert(bytes memory reason) internal {
        vm.expectRevert(
            abi.encodeWithSelector(
                CustomRevert.WrappedError.selector,
                address(hook),
                IHooks.beforeSwap.selector,
                reason,
                abi.encodeWithSelector(Hooks.HookCallFailed.selector)
            )
        );
    }
}
