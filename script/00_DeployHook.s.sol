// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";

import {BaseScript} from "./base/BaseScript.sol";

import {Argos} from "../src/Argos.sol";

/// @notice Mines the address and deploys the Argos hook contract
contract DeployHookScript is BaseScript {
    function run() public {
        // hook contracts must have specific flags encoded in the address
        uint160 flags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG);

        address initialOwner = deployerAddress;
        address initialRiskController = deployerAddress;

        // Mine a salt that will produce a hook address with the correct flags
        bytes memory constructorArgs = abi.encode(poolManager, initialOwner, initialRiskController);
        (address hookAddress, bytes32 salt) =
            HookMiner.find(CREATE2_FACTORY, flags, type(Argos).creationCode, constructorArgs);

        // Deploy the hook using CREATE2
        vm.startBroadcast();
        Argos argos = new Argos{salt: salt}(poolManager, initialOwner, initialRiskController);
        vm.stopBroadcast();

        require(address(argos) == hookAddress, "DeployHookScript: Hook Address Mismatch");
    }
}
