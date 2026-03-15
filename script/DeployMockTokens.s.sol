// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";

import {DemoERC20} from "../src/mocks/DemoERC20.sol";

/// @notice Deploy MockWETH and MockLST demo tokens for Argos on Unichain Sepolia.
///
/// Required env vars:
///   PRIVATE_KEY        — deployer private key (hex, with or without 0x prefix)
///
/// Optional env vars:
///   INITIAL_SUPPLY     — initial token supply per token, in wei (default: 1_000_000e18)
///
/// Dry run (no broadcast):
///   forge script script/DeployMockTokens.s.sol:DeployMockTokensScript \
///       --rpc-url "$RPC_URL"
///
/// Broadcast:
///   forge script script/DeployMockTokens.s.sol:DeployMockTokensScript \
///       --rpc-url "$RPC_URL" \
///       --broadcast \
///       --verify
///
/// After running, set the following env vars for downstream scripts:
///   export MOCK_WETH=<mockWETH address>
///   export MOCK_LST=<mockLST address>
contract DeployMockTokensScript is Script {
    uint256 internal constant DEFAULT_INITIAL_SUPPLY = 1_000_000e18;

    function run() external returns (address mockWETH, address mockLST) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        uint256 initialSupply = vm.envOr("INITIAL_SUPPLY", DEFAULT_INITIAL_SUPPLY);

        console2.log("Deployer:              ", deployer);
        console2.log("Initial supply/token:  ", initialSupply);

        vm.startBroadcast(deployerPrivateKey);

        DemoERC20 weth = new DemoERC20("Mock Wrapped Ether", "mWETH", 18, initialSupply);
        DemoERC20 lst = new DemoERC20("Mock Liquid Staking Token", "mLST", 18, initialSupply);

        mockWETH = address(weth);
        mockLST = address(lst);

        vm.stopBroadcast();

        console2.log("MockWETH deployed at:  ", mockWETH);
        console2.log("MockLST deployed at:   ", mockLST);
        console2.log("---");
        console2.log("Next step env vars:");
        console2.log("  export MOCK_WETH=%s", mockWETH);
        console2.log("  export MOCK_LST=%s", mockLST);
    }
}
