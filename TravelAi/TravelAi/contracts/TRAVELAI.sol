// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title TimeTravelerAI ($TRAVELAI)
 * @notice Fixed-supply ERC20 with EIP-2612 permit. No minting/burning after deploy.
 * Total supply: 420,000,000,000 * 10^18
 *
 * Notes:
 * - All tokens are minted to the deployer (owner) on construction.
 * - No staking logic in this token (kept minimal by design).
 * - Owner can recover *other* ERC20 tokens mistakenly sent to this contract.
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TRAVELAI is ERC20, ERC20Permit, Ownable {
    using SafeERC20 for IERC20;

    // 420,000,000,000 tokens with 18 decimals
    uint256 public constant MAX_SUPPLY = 420_000_000_000 ether;

    constructor(address _owner)
        ERC20("TimeTravelerAI", "TRAVELAI")
        ERC20Permit("TimeTravelerAI")
        Ownable(_owner)
    {
        // Mint full fixed supply to the owner at deploy
        _mint(_owner, MAX_SUPPLY);
    }

    /**
     * @notice Recover ERC20 tokens accidentally sent to this contract.
     * @dev Cannot pull TRAVELAI itself.
     * @param token The ERC20 token address to recover.
     * @param to Recipient of recovered tokens.
     * @param amount Amount to recover.
     */
    function recoverERC20(address token, address to, uint256 amount) external onlyOwner {
        require(token != address(this), "TRAVELAI: cannot recover TRAVELAI");
        IERC20(token).safeTransfer(to, amount);
    }
}
