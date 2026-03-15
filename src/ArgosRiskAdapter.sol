// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {AbstractCallback} from "reactive-lib/src/abstract-base/AbstractCallback.sol";

import {Argos} from "./Argos.sol";

interface IArgosRiskAdapter {
    function applyReactiveRiskSignal(
        address rvmId,
        PoolKey calldata key,
        Argos.RiskState riskState,
        uint128 maxAbsAmount
    ) external;

    function setApprovedPool(PoolKey calldata key, bool approved) external;

    function setArgos(address argos_) external;
}

/// @notice Destination-side bridge adapter for Reactive callbacks into Argos risk updates.
contract ArgosRiskAdapter is IArgosRiskAdapter, AbstractCallback {
    using PoolIdLibrary for PoolKey;

    Argos public argos;
    address public owner;

    mapping(PoolId => bool) public approvedPools;

    error Unauthorized();
    error UnapprovedPool(PoolId poolId);
    error InvalidArgos();

    event ReactiveSignalApplied(
        address indexed rvmId, PoolId indexed poolId, Argos.RiskState riskState, uint128 maxAbsAmount
    );
    event ApprovedPoolSet(PoolId indexed poolId, bool approved);
    event ArgosSet(address indexed previousArgos, address indexed newArgos);

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address argos_, address callbackProxy) AbstractCallback(callbackProxy) {
        if (argos_ == address(0)) revert InvalidArgos();

        owner = msg.sender;
        argos = Argos(argos_);
    }

    /// @notice First argument is reserved for Reactive-injected RVM identity.
    function applyReactiveRiskSignal(
        address rvmId,
        PoolKey calldata key,
        Argos.RiskState riskState,
        uint128 maxAbsAmount
    ) external rvmIdOnly(rvmId) {
        PoolId poolId = key.toId();
        if (!approvedPools[poolId]) revert UnapprovedPool(poolId);

        argos.applyRiskUpdate(key, riskState, maxAbsAmount);

        emit ReactiveSignalApplied(rvmId, poolId, riskState, maxAbsAmount);
    }

    function setApprovedPool(PoolKey calldata key, bool approved) external onlyOwner {
        PoolId poolId = key.toId();
        approvedPools[poolId] = approved;
        emit ApprovedPoolSet(poolId, approved);
    }

    function setArgos(address argos_) external onlyOwner {
        if (argos_ == address(0)) revert InvalidArgos();

        address previousArgos = address(argos);
        argos = Argos(argos_);

        emit ArgosSet(previousArgos, argos_);
    }
}
