// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseHook} from "@openzeppelin/uniswap-hooks/src/base/BaseHook.sol";

import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager, SwapParams} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {
    BeforeSwapDelta,
    BeforeSwapDeltaLibrary,
    toBeforeSwapDelta
} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";

contract Argos is BaseHook {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    enum RiskState {
        Safe,
        Restricted,
        Blocked
    }

    struct MarketConfig {
        bool enabled;
        RiskState riskState;
        uint128 maxAbsAmount;
    }

    struct ParkedIntent {
        address sender;
        uint256 inputCurrencyId;
        uint256 outputCurrencyId;
        uint256 amountIn;
        bool zeroForOne;
        uint64 parkedAt;
    }

    address public owner;
    address public riskController;

    mapping(PoolId => MarketConfig) private marketConfigs;
    mapping(PoolId => mapping(address => ParkedIntent)) private parkedIntents;
    mapping(PoolId => uint256) public beforeSwapCount;

    error Unauthorized();
    error InvalidOwner();
    error InvalidRiskController();
    error InvalidRestriction();
    error InvalidSwapAmount();
    error ExistingParkedIntent();
    error UnsupportedParkMode();
    error PoolNotEnabled(PoolId poolId);
    error SwapBlocked(PoolId poolId);
    error SwapRestricted(PoolId poolId, uint256 attemptedAmount, uint256 maxAllowedAmount);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event RiskControllerSet(address indexed previousRiskController, address indexed newRiskController);
    event MarketConfigured(PoolId indexed poolId, bool enabled, RiskState riskState, uint128 maxAbsAmount);
    event RiskStateApplied(PoolId indexed poolId, RiskState riskState, uint128 maxAbsAmount, address indexed caller);
    event TradeParked(
        PoolId indexed poolId,
        address indexed sender,
        uint256 indexed inputCurrencyId,
        uint256 outputCurrencyId,
        uint256 amountIn,
        bool zeroForOne
    );

    constructor(IPoolManager _poolManager, address initialOwner, address initialRiskController) BaseHook(_poolManager) {
        if (initialOwner == address(0)) revert InvalidOwner();
        if (initialRiskController == address(0)) revert InvalidRiskController();

        owner = initialOwner;
        riskController = initialRiskController;

        emit OwnershipTransferred(address(0), initialOwner);
        emit RiskControllerSet(address(0), initialRiskController);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyAuthorizedRiskUpdater() {
        if (msg.sender != owner && msg.sender != riskController) revert Unauthorized();
        _;
    }

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true, // Required for risk-state check
            afterSwap: false,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: true, // Required for future parked exact-input flow
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidOwner();

        address previousOwner = owner;
        owner = newOwner;

        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function setRiskController(address newRiskController) external onlyOwner {
        if (newRiskController == address(0)) revert InvalidRiskController();

        address previousRiskController = riskController;
        riskController = newRiskController;

        emit RiskControllerSet(previousRiskController, newRiskController);
    }

    function configureMarket(PoolKey calldata key, bool enabled, RiskState riskState, uint128 maxAbsAmount)
        external
        onlyOwner
    {
        _validateRestriction(riskState, maxAbsAmount);

        PoolId poolId = key.toId();
        marketConfigs[poolId] = MarketConfig({enabled: enabled, riskState: riskState, maxAbsAmount: maxAbsAmount});

        emit MarketConfigured(poolId, enabled, riskState, maxAbsAmount);
    }

    function applyRiskUpdate(PoolKey calldata key, RiskState riskState, uint128 maxAbsAmount)
        external
        onlyAuthorizedRiskUpdater
    {
        _validateRestriction(riskState, maxAbsAmount);

        PoolId poolId = key.toId();
        MarketConfig storage marketConfig = marketConfigs[poolId];
        if (!marketConfig.enabled) revert PoolNotEnabled(poolId);

        marketConfig.riskState = riskState;
        marketConfig.maxAbsAmount = maxAbsAmount;

        emit RiskStateApplied(poolId, riskState, maxAbsAmount, msg.sender);
    }

    function getMarketConfig(PoolKey calldata key) external view returns (MarketConfig memory) {
        return marketConfigs[key.toId()];
    }

    function getParkedIntent(PoolKey calldata key, address sender) external view returns (ParkedIntent memory) {
        return parkedIntents[key.toId()][sender];
    }

    function _beforeSwap(address sender, PoolKey calldata key, SwapParams calldata params, bytes calldata hookData)
        internal
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        PoolId poolId = key.toId();
        beforeSwapCount[poolId]++;

        MarketConfig memory marketConfig = marketConfigs[poolId];
        if (!marketConfig.enabled) revert PoolNotEnabled(poolId);

        if (marketConfig.riskState == RiskState.Blocked) revert SwapBlocked(poolId);

        if (marketConfig.riskState == RiskState.Restricted) {
            uint256 attemptedAmount = _absoluteAmount(params.amountSpecified);
            if (attemptedAmount > marketConfig.maxAbsAmount) {
                revert SwapRestricted(poolId, attemptedAmount, marketConfig.maxAbsAmount);
            }
        }

        bool isHighGas = hookData.length > 0 ? abi.decode(hookData, (bool)) : false;
        if (!isHighGas) {
            return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
        }

        return _parkExactInput(sender, key, poolId, params);
    }

    function _parkExactInput(address sender, PoolKey calldata key, PoolId poolId, SwapParams calldata params)
        internal
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        if (params.amountSpecified >= 0) revert UnsupportedParkMode();
        if (parkedIntents[poolId][sender].amountIn > 0) revert ExistingParkedIntent();

        uint256 amountIn = _absoluteAmount(params.amountSpecified);
        if (amountIn > uint256(uint128(type(int128).max))) revert InvalidSwapAmount();

        Currency inputCurrency = params.zeroForOne ? key.currency0 : key.currency1;
        Currency outputCurrency = params.zeroForOne ? key.currency1 : key.currency0;
        uint256 inputCurrencyId = inputCurrency.toId();

        poolManager.mint(sender, inputCurrencyId, amountIn);

        parkedIntents[poolId][sender] = ParkedIntent({
            sender: sender,
            inputCurrencyId: inputCurrencyId,
            outputCurrencyId: outputCurrency.toId(),
            amountIn: amountIn,
            zeroForOne: params.zeroForOne,
            parkedAt: uint64(block.timestamp)
        });

        emit TradeParked(poolId, sender, inputCurrencyId, outputCurrency.toId(), amountIn, params.zeroForOne);

        return (BaseHook.beforeSwap.selector, toBeforeSwapDelta(int128(uint128(amountIn)), 0), 0);
    }

    function _validateRestriction(RiskState riskState, uint128 maxAbsAmount) internal pure {
        if (riskState == RiskState.Restricted && maxAbsAmount == 0) revert InvalidRestriction();
    }

    function _absoluteAmount(int256 amountSpecified) internal pure returns (uint256) {
        if (amountSpecified == type(int256).min) revert InvalidSwapAmount();
        if (amountSpecified < 0) return uint256(-amountSpecified);
        return uint256(amountSpecified);
    }
}
