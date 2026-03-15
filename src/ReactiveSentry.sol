// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {AbstractReactive} from "reactive-lib/src/abstract-base/AbstractReactive.sol";
import {IReactive} from "reactive-lib/src/interfaces/IReactive.sol";

import {Argos} from "./Argos.sol";
import {ArgosRiskAdapter} from "./ArgosRiskAdapter.sol";

/// @notice L1 sentry that emits destination callback payloads for ArgosRiskAdapter.
contract ReactiveSentry is AbstractReactive {
    uint256 public constant ETHEREUM_SEPOLIA_CHAIN_ID = 11155111;
    uint256 internal constant ERC20_TRANSFER_TOPIC = uint256(keccak256("Transfer(address,address,uint256)"));

    address public immutable mockLST;
    uint256 public immutable destinationChainId;
    address public immutable destinationAdapter;
    PoolKey public monitoredPoolKey;

    uint256 public whaleDumpThreshold;
    uint64 public callbackGasLimit;

    error InvalidToken();
    error InvalidReactiveSender();
    error InvalidDestinationAdapter();
    error InvalidThreshold();
    error InvalidGasLimit();
    error AmountDecodeFailed();

    event RiskSignalPrepared(
        uint256 indexed sourceChainId,
        address indexed token,
        address indexed destinationAdapter,
        address from,
        address to,
        uint256 amount
    );

    constructor(
        address _reactiveSender,
        address _mockLST,
        uint256 _destinationChainId,
        address _destinationAdapter,
        PoolKey memory _monitoredPoolKey,
        uint256 _whaleDumpThreshold,
        uint64 _callbackGasLimit
    ) {
        if (_reactiveSender == address(0)) revert InvalidReactiveSender();
        if (_mockLST == address(0)) revert InvalidToken();
        if (_destinationAdapter == address(0)) revert InvalidDestinationAdapter();
        if (_whaleDumpThreshold == 0) revert InvalidThreshold();
        if (_callbackGasLimit == 0) revert InvalidGasLimit();

        addAuthorizedSender(_reactiveSender);
        mockLST = _mockLST;
        destinationChainId = _destinationChainId;
        destinationAdapter = _destinationAdapter;
        monitoredPoolKey = _monitoredPoolKey;
        whaleDumpThreshold = _whaleDumpThreshold;
        callbackGasLimit = _callbackGasLimit;
    }

    /// @notice Called by the Reactive Network runtime when a watched event is observed.
    /// @dev For MVP we treat this as an Ethereum Sepolia ERC20 Transfer event callback.
    function react(IReactive.LogRecord calldata log) external override vmOnly {
        if (log.chain_id != ETHEREUM_SEPOLIA_CHAIN_ID) return;
        if (log._contract != mockLST) return;
        if (log.topic_0 != ERC20_TRANSFER_TOPIC) return;

        uint256 amount = _decodeAmount(log.data);
        if (amount <= whaleDumpThreshold) return;

        address from = address(uint160(log.topic_1));
        address to = address(uint160(log.topic_2));

        bytes memory payload = abi.encodeWithSelector(
            ArgosRiskAdapter.applyReactiveRiskSignal.selector,
            address(0), // Placeholder: Reactive runtime injects the RVM id into arg0.
            monitoredPoolKey,
            Argos.RiskState.Blocked,
            uint128(0)
        );

        emit RiskSignalPrepared(log.chain_id, log._contract, destinationAdapter, from, to, amount);
        emit Callback(destinationChainId, destinationAdapter, callbackGasLimit, payload);
    }

    function _decodeAmount(bytes calldata data) internal pure returns (uint256 amount) {
        if (data.length != 32) revert AmountDecodeFailed();
        amount = abi.decode(data, (uint256));
    }
}
