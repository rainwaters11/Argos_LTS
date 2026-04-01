// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IReactive} from "reactive-lib/src/interfaces/IReactive.sol";

/// @title IReactiveSensor
/// @notice Interface for the ReactiveArbitrageSensor that subscribes to L1 DEX events
///         and dispatches cross-chain toxic-address flags to ArgosLTSHook on Unichain.
interface IReactiveSensor {
    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Emitted when a sandwich pattern is detected for a sender on L1.
    /// @param sender       The suspected arbitrageur address on L1.
    /// @param blockNumber  The L1 block number where the pattern was detected.
    /// @param swapCount    Number of swaps from this sender in the block.
    event SandwichDetected(address indexed sender, uint256 blockNumber, uint8 swapCount);

    /// @notice Emitted (via Reactive Network Callback mechanism) to trigger
    ///         ArgosLTSHook.flagToxicAddress() on Unichain.
    event Callback(uint256 indexed chain_id, address indexed _contract, uint64 indexed gas_limit, bytes payload);

    // ─────────────────────────────────────────────────────────────────────────
    // Core
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Entry point called by the Reactive Network VM when a subscribed L1 event fires.
    /// @dev    Implements IReactive from reactive-lib. The Reactive Network VM calls this
    ///         function on the RSC (Reactive Smart Contract) whenever a watched event emits.
    ///         This contract watches Uniswap V3 Swap events on Ethereum mainnet.
    function react(IReactive.LogRecord calldata log) external;

    // ─────────────────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice The ArgosLTSHook address on Unichain that receives the cross-chain flag.
    function argosHook() external view returns (address);

    /// @notice Destination chain ID (Unichain = 1301).
    function destinationChainId() external view returns (uint256);

    /// @notice Minimum number of swaps from the same sender per L1 block to trigger detection.
    function SANDWICH_THRESHOLD() external pure returns (uint8);

    /// @notice Gas limit for the Reactive Network cross-chain callback.
    function CALLBACK_GAS_LIMIT() external pure returns (uint64);

    /// @notice Number of swaps observed from `sender` in `blockNumber` on L1.
    function swapCountPerBlock(address sender, uint256 blockNumber) external view returns (uint8);
}
