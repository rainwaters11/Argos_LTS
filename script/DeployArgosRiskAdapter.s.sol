// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";

import {ArgosRiskAdapter} from "../src/ArgosRiskAdapter.sol";

contract DeployArgosRiskAdapterScript is Script {
    address internal constant UNICHAIN_SEPOLIA_CALLBACK_PROXY = 0x9299472A6399Fd1027ebF067571Eb3e3D7837FC4;
    address internal constant DEFAULT_ARGOS = 0xCd6606e077b271316d09De8521ADBE72f8eB4088;

    function run() external returns (ArgosRiskAdapter adapter) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address callbackProxy = vm.envOr("CALLBACK_PROXY", UNICHAIN_SEPOLIA_CALLBACK_PROXY);
        address argosAddr = vm.envOr("ARGOS_ADDRESS", DEFAULT_ARGOS);

        console2.log("Callback Proxy:", callbackProxy);
        console2.log("Argos:", argosAddr);

        vm.startBroadcast(deployerPrivateKey);
        adapter = new ArgosRiskAdapter(argosAddr, callbackProxy);
        vm.stopBroadcast();

        console2.log("ArgosRiskAdapter deployed at:", address(adapter));
    }
}
