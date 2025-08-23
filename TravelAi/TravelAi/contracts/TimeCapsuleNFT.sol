// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title TimeCapsuleNFT
 * @notice ERC721 NFTs representing a prediction made via TRAVELAI AI signals.
 * Each Capsule stores immutable prediction metadata and lock parameters.
 * - No staking logic — just a record of prediction participation.
 * - Rewards are managed externally (PredictionPool or backend).
 * - Capsules are frozen until resolved (win/loss).
 */

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract TimeCapsuleNFT is ERC721, Ownable {
    using Counters for Counters.Counter;

    struct CapsuleData {
        uint256 predictionId;       // Linked PredictionPool ID or AI signal ID
        string aiModelVersion;      // Version of AI model used
        uint256 expiryTimestamp;    // When prediction outcome is known
        uint256 multiplier;         // Potential reward multiplier (e.g., 300 for 3x)
        string volatilityTier;      // "green", "yellow", "red"
        uint256 lockedAmount;       // Amount of TRAVELAI committed
        bool resolved;              // Whether outcome is known
        bool win;                   // Outcome result
    }

    Counters.Counter private _tokenIdCounter;
    mapping(uint256 => CapsuleData) public capsuleInfo;

    // Optional: lock NFT transfers until expiry
    bool public transferLockEnabled = true;

    event CapsuleMinted(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 predictionId,
        string aiModelVersion,
        uint256 expiryTimestamp,
        uint256 multiplier,
        string volatilityTier,
        uint256 lockedAmount
    );

    event CapsuleResolved(
        uint256 indexed tokenId,
        bool win,
        uint256 timestamp
    );

    constructor() ERC721("TimeCapsule", "TT-CAPSULE") {}

    /**
     * @notice Mint a new prediction capsule NFT.
     * @param to Owner of the capsule.
     * @param predictionId ID of the AI prediction.
     * @param aiModelVersion AI model version string.
     * @param expiryTimestamp When the prediction matures.
     * @param multiplier Potential reward multiplier (e.g., 300 = 3x).
     * @param volatilityTier Risk tier ("green", "yellow", "red").
     * @param lockedAmount Amount of TRAVELAI tokens linked.
     */
    function mintCapsule(
        address to,
        uint256 predictionId,
        string memory aiModelVersion,
        uint256 expiryTimestamp,
        uint256 multiplier,
        string memory volatilityTier,
        uint256 lockedAmount
    ) external onlyOwner returns (uint256) {
        require(expiryTimestamp > block.timestamp, "Expiry must be in future");

        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        capsuleInfo[tokenId] = CapsuleData({
            predictionId: predictionId,
            aiModelVersion: aiModelVersion,
            expiryTimestamp: expiryTimestamp,
            multiplier: multiplier,
            volatilityTier: volatilityTier,
            lockedAmount: lockedAmount,
            resolved: false,
            win: false
        });

        _safeMint(to, tokenId);

        emit CapsuleMinted(
            tokenId,
            to,
            predictionId,
            aiModelVersion,
            expiryTimestamp,
            multiplier,
            volatilityTier,
            lockedAmount
        );

        return tokenId;
    }

    /**
     * @notice Resolve capsule outcome (by AI oracle or admin).
     * @param tokenId ID of the capsule NFT.
     * @param win Whether prediction succeeded.
     */
    function resolveCapsule(uint256 tokenId, bool win) external onlyOwner {
        CapsuleData storage capsule = capsuleInfo[tokenId];
        require(!capsule.resolved, "Already resolved");
        require(block.timestamp >= capsule.expiryTimestamp, "Not expired yet");

        capsule.resolved = true;
        capsule.win = win;

        emit CapsuleResolved(tokenId, win, block.timestamp);
    }

    /**
     * @notice Prevent transfers while locked if enabled.
     */
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override
    {
        if (transferLockEnabled && from != address(0) && to != address(0)) {
            CapsuleData memory capsule = capsuleInfo[tokenId];
            require(block.timestamp >= capsule.expiryTimestamp, "Capsule still locked");
        }
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    /**
     * @notice Enable or disable transfer lock globally.
     */
    function setTransferLock(bool locked) external onlyOwner {
        transferLockEnabled = locked;
    }

    /**
     * @notice Returns all capsule data for a tokenId.
     */
    function getCapsule(uint256 tokenId) external view returns (CapsuleData memory) {
        return capsuleInfo[tokenId];
    }
}
