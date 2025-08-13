// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title TimelineArchive
 * @notice Immutable on-chain registry of all AI predictions, outcomes, and performance metrics.
 * Designed to provide full transparency for $TRAVELAI holders, CEXs, and DeFi integrations.
 *
 * All entries are timestamped, hashed, and stored permanently.
 * Optionally mirrored to IPFS via off-chain indexing.
 */

import "@openzeppelin/contracts/access/Ownable.sol";

contract TimelineArchive is Ownable {
    struct PredictionRecord {
        uint256 predictionId;       // Unique ID for the prediction
        string aiModelVersion;      // Version of AI model used
        uint256 timestamp;          // When the signal was published
        string signal;              // Short description ("DOGE likely to +15% in 3 days")
        uint256 confidence;         // Confidence score (0–100%)
        string volatilityTier;      // "green", "yellow", "red"
        uint256 totalPoolTokens;    // Amount of $TRAVELAI committed in pool
        uint256 followers;          // Number of users who joined this prediction
        string outcome;             // "win", "loss", "neutral", "pending"
        uint256 payoutRatio;        // % payout ratio if successful
        uint256 maturityTimestamp;  // When prediction resolved
        string ipfsHash;            // Optional: IPFS metadata/document hash
    }

    mapping(uint256 => PredictionRecord) public records;
    uint256 public totalPredictions;

    event PredictionLogged(
        uint256 indexed predictionId,
        string aiModelVersion,
        uint256 timestamp,
        string signal,
        uint256 confidence,
        string volatilityTier,
        uint256 totalPoolTokens,
        uint256 followers
    );

    event PredictionResolved(
        uint256 indexed predictionId,
        string outcome,
        uint256 payoutRatio,
        uint256 maturityTimestamp
    );

    /**
     * @notice Log a new prediction into the archive.
     * @dev Called by backend or PredictionPool contract when AI issues a signal.
     */
    function logPrediction(
        uint256 predictionId,
        string memory aiModelVersion,
        string memory signal,
        uint256 confidence,
        string memory volatilityTier,
        uint256 totalPoolTokens,
        uint256 followers,
        string memory ipfsHash
    ) external onlyOwner {
        require(records[predictionId].timestamp == 0, "Prediction already exists");

        totalPredictions++;

        records[predictionId] = PredictionRecord({
            predictionId: predictionId,
            aiModelVersion: aiModelVersion,
            timestamp: block.timestamp,
            signal: signal,
            confidence: confidence,
            volatilityTier: volatilityTier,
            totalPoolTokens: totalPoolTokens,
            followers: followers,
            outcome: "pending",
            payoutRatio: 0,
            maturityTimestamp: 0,
            ipfsHash: ipfsHash
        });

        emit PredictionLogged(
            predictionId,
            aiModelVersion,
            block.timestamp,
            signal,
            confidence,
            volatilityTier,
            totalPoolTokens,
            followers
        );
    }

    /**
     * @notice Mark a prediction as resolved with final outcome data.
     * @dev Called after the result is known (by backend oracle or contract).
     */
    function resolvePrediction(
        uint256 predictionId,
        string memory outcome,
        uint256 payoutRatio
    ) external onlyOwner {
        require(records[predictionId].timestamp != 0, "Prediction not found");
        require(
            keccak256(bytes(records[predictionId].outcome)) == keccak256(bytes("pending")),
            "Already resolved"
        );

        records[predictionId].outcome = outcome;
        records[predictionId].payoutRatio = payoutRatio;
        records[predictionId].maturityTimestamp = block.timestamp;

        emit PredictionResolved(predictionId, outcome, payoutRatio, block.timestamp);
    }

    /**
     * @notice Fetch a prediction record by ID.
     */
    function getPrediction(uint256 predictionId) external view returns (PredictionRecord memory) {
        return records[predictionId];
    }

    /**
     * @notice Get all prediction IDs up to total count.
     */
    function getAllPredictionIds() external view returns (uint256[] memory) {
        uint256[] memory ids = new uint256[](totalPredictions);
        uint256 counter = 0;

        for (uint256 i = 1; i <= totalPredictions; i++) {
            if (records[i].timestamp != 0) {
                ids[counter] = i;
                counter++;
            }
        }

        return ids;
    }

    /**
     * @notice Optional: Update followers or pool size mid-prediction.
     */
    function updatePredictionStats(
        uint256 predictionId,
        uint256 totalPoolTokens,
        uint256 followers
    ) external onlyOwner {
        require(records[predictionId].timestamp != 0, "Prediction not found");
        records[predictionId].totalPoolTokens = totalPoolTokens;
        records[predictionId].followers = followers;
    }
}
