// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";

/// @title IArgosLTS
/// @notice External interface for the ArgosLTSHook v2 contract.
/// @dev    Consumers (frontends, scripts, integrations) should target this interface.
///         Lit Protocol integration reads `toxicExpiry` and `parkedClaims` to gate
///         redemptions via a Lit Action before the user calls `redeemParkedClaim`.
interface IArgosLTS {
    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Emitted when the Reactive sensor flags an address as toxic.
    event ToxicAddressFlagged(address indexed sender, uint256 expiresAt);

    /// @notice Emitted when a toxic swap is intercepted and the input is parked.
    /// @dev No tokens leave the PoolManager — user holds an ERC-6909 claim via the hook.
    event SwapParked(address indexed user, uint256 currencyId, uint256 amount);

    /// @notice Emitted when a user successfully redeems their parked ERC-6909 claim.
    event ParkedClaimRedeemed(address indexed user, uint256 currencyId, uint256 amount);

    /// @notice Emitted when a toxic swap is allowed but assessed a penalty fee.
    event ToxicSwapPenalized(address indexed swapper, uint24 fee);

    /// @notice Emitted when the parking mode is configured for a pool.
    event ParkingModeSet(PoolId indexed poolId, bool enabled);

    // ─────────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────────

    error Unauthorized();
    error InsufficientParked();
    error UnsupportedParkMode();
    error InvalidSwapAmount();

    // ─────────────────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Configures whether a pool uses PARK mode (true) or PENALIZE mode (false).
    /// @dev    PARK mode: toxic swap input is minted as ERC-6909 claim, no hard revert.
    ///         PENALIZE mode: swap executes but fee is overridden to TOXIC_FEE.
    ///         Only works on dynamic-fee pools in PENALIZE mode.
    /// @param key     The Uniswap V4 pool key.
    /// @param enabled True → PARK mode; False → PENALIZE mode.
    function setParkingMode(PoolKey calldata key, bool enabled) external;

    // ─────────────────────────────────────────────────────────────────────────
    // Reactive Sensor Callback
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Called by the trusted ReactiveArbitrageSensor when L1 toxic arb is detected.
    /// @dev    Only callable by the immutable `reactiveSensor` address.
    ///         Sets toxicExpiry[swapper] = block.timestamp + TOXIC_WINDOW (5 min).
    ///         This function is the cross-chain callback target dispatched by the
    ///         Reactive Network RSC when it detects a sandwich pattern on Ethereum mainnet.
    /// @param swapper  The L1 arbitrageur address to flag on Unichain.
    function flagToxicAddress(address swapper) external;

    // ─────────────────────────────────────────────────────────────────────────
    // ERC-6909 Parking Redemption
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Redeems parked ERC-6909 claims back to the caller's wallet.
    /// @dev    Burns the hook's ERC-6909 balance in PoolManager equal to `amount`,
    ///         then calls poolManager.take() to send underlying tokens to the caller.
    ///         No approval is required — the hook is the custodian.
    ///
    ///         UX ADVANTAGE VS HARD REVERT:
    ///         Traditional hooks revert blocked swaps, wasting the user's gas and
    ///         permanently failing the transaction. Argos LTS parks the input as an
    ///         ERC-6909 claim instead. The user's gas is still spent on the swap tx,
    ///         but their tokens are safely held on-chain and fully redeemable here.
    ///
    ///         Lit Protocol Integration:
    ///         The recommended path is to call this via the Lit Action in
    ///         integrations/lit-protocol/redeem-with-lit.ts, which verifies the
    ///         TOXIC_WINDOW has elapsed (address cleared) before signing the tx.
    ///
    /// @param currency  The input currency whose claim to redeem.
    /// @param amount    Amount of claim tokens to burn and withdraw.
    function redeemParkedClaim(Currency currency, uint256 amount) external;

    // ─────────────────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice The trusted Reactive Network sensor address authorised to call flagToxicAddress.
    function reactiveSensor() external view returns (address);

    /// @notice The hook owner (can call setParkingMode).
    function owner() external view returns (address);

    /// @notice Timestamp after which the toxic flag for `swapper` expires. 0 = not flagged.
    function toxicExpiry(address swapper) external view returns (uint256);

    /// @notice Parked ERC-6909 claim balance for `user` in currency `currencyId`.
    function parkedClaims(address user, uint256 currencyId) external view returns (uint256);

    /// @notice Whether PARK mode is enabled for the pool identified by `poolId`.
    function parkingEnabled(PoolId poolId) external view returns (bool);

    /// @notice Normal swap fee in bips (3000 = 0.30%).
    function BASE_FEE() external pure returns (uint24);

    /// @notice Penalty fee override for toxic swappers in PENALIZE mode (100_000 = 10.00%).
    function TOXIC_FEE() external pure returns (uint24);

    /// @notice Duration of the toxic flag in seconds (5 minutes = 300s).
    function TOXIC_WINDOW() external pure returns (uint256);
}
