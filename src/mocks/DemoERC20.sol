// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "solmate/src/tokens/ERC20.sol";

/// @notice Minimal mintable ERC20 for Argos demo deployments on Unichain Sepolia.
/// @dev Owner is set to the deployer at construction time. No ownership transfer
///      is provided intentionally — these are ephemeral demo tokens.
contract DemoERC20 is ERC20 {
    address public immutable owner;

    error Unauthorized();

    constructor(string memory name_, string memory symbol_, uint8 decimals_, uint256 initialSupply)
        ERC20(name_, symbol_, decimals_)
    {
        owner = msg.sender;
        _mint(msg.sender, initialSupply);
    }

    /// @notice Mint additional tokens. Callable only by the original deployer.
    function mint(address to, uint256 amount) external {
        if (msg.sender != owner) revert Unauthorized();
        _mint(to, amount);
    }
}
