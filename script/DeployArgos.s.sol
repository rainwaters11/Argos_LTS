// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";

import {Argos} from "../src/Argos.sol";

/// @notice Unichain Sepolia deployment script for Argos.
/// @dev Deterministic deployment is routed through the CREATE2 deployer proxy at 0x4e59....
contract DeployArgosScript is Script {
    address internal constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    address internal constant DEFAULT_UNICHAIN_SEPOLIA_POOL_MANAGER = 0x00B036B58a818B1BC34d502D3fE730Db729e62AC;

    function run() external returns (address deployedAddress) {
        address poolManagerAddress = vm.envOr("POOL_MANAGER", DEFAULT_UNICHAIN_SEPOLIA_POOL_MANAGER);
        IPoolManager poolManager = IPoolManager(poolManagerAddress);
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        address initialOwner = vm.envOr("INITIAL_OWNER", deployer);
        address initialRiskController = vm.envOr("INITIAL_RISK_CONTROLLER", deployer);

        uint160 targetFlags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG);

        bytes memory constructorArgs = abi.encode(poolManager, initialOwner, initialRiskController);
        (address expectedAddress, bytes32 salt) =
            HookMiner.find(CREATE2_DEPLOYER, targetFlags, type(Argos).creationCode, constructorArgs);

        console.log("Target flags:", uint256(targetFlags));
        console.log("Mined salt:");
        console.logBytes32(salt);
        console.log("Expected deterministic address:", expectedAddress);

        vm.startBroadcast(deployerPrivateKey);
        Argos hook = new Argos{salt: salt}(poolManager, initialOwner, initialRiskController);
        deployedAddress = address(hook);
        vm.stopBroadcast();

        console.log("Final deployed address:", deployedAddress);

        require(deployedAddress == expectedAddress, "DeployArgosScript: address mismatch");
        require(
            (uint160(deployedAddress) & Hooks.ALL_HOOK_MASK) == targetFlags, "DeployArgosScript: invalid hook flags"
        );
    }
}
