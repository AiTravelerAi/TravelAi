// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title PredictionPool
 * @dev Smart contract for $TRAVELAI prediction markets
 * Users contribute tokens to prediction pools for specific forecasts.
 * If the prediction succeeds, winners share the pool proportionally.
 * No staking lock — instant participation.
 */
interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract PredictionPool {
    address public owner;
    IERC20 public travelAiToken;

    uint256 public predictionCounter;

    enum PredictionStatus { Active, Success, Failed, Closed }

    struct Prediction {
        string description;       // e.g., "DOGE > +20% in 48h"
        uint256 deadline;         // Timestamp for prediction resolution
        uint256 totalPool;        // Total tokens in pool
        uint256 winningPool;      // Tokens contributed by winners
        PredictionStatus status;  // Current status
        address[] participants;   // All participants
        mapping(address => uint256) contributions; // User -> token amount
        mapping(address => bool) isWinner;         // Mark winners
    }

    mapping(uint256 => Prediction) public predictions;

    event PredictionCreated(uint256 indexed predictionId, string description, uint256 deadline);
    event Contributed(uint256 indexed predictionId, address indexed user, uint256 amount);
    event PredictionResolved(uint256 indexed predictionId, PredictionStatus result);
    event WinningsClaimed(uint256 indexed predictionId, address indexed user, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    constructor(address _tokenAddress) {
        owner = msg.sender;
        travelAiToken = IERC20(_tokenAddress);
    }

    function createPrediction(string memory _description, uint256 _deadline) external onlyOwner {
        require(_deadline > block.timestamp, "Deadline must be in the future");

        predictionCounter++;
        Prediction storage p = predictions[predictionCounter];
        p.description = _description;
        p.deadline = _deadline;
        p.status = PredictionStatus.Active;

        emit PredictionCreated(predictionCounter, _description, _deadline);
    }

    function contribute(uint256 _predictionId, uint256 _amount) external {
        Prediction storage p = predictions[_predictionId];
        require(p.status == PredictionStatus.Active, "Prediction is not active");
        require(block.timestamp < p.deadline, "Prediction deadline passed");
        require(_amount > 0, "Amount must be > 0");

        // Transfer tokens from user to contract
        require(travelAiToken.transferFrom(msg.sender, address(this), _amount), "Token transfer failed");

        if (p.contributions[msg.sender] == 0) {
            p.participants.push(msg.sender);
        }

        p.contributions[msg.sender] += _amount;
        p.totalPool += _amount;

        emit Contributed(_predictionId, msg.sender, _amount);
    }

    function resolvePrediction(uint256 _predictionId, bool _success) external onlyOwner {
        Prediction storage p = predictions[_predictionId];
        require(p.status == PredictionStatus.Active, "Already resolved or closed");
        require(block.timestamp >= p.deadline, "Prediction still ongoing");

        if (_success) {
            p.status = PredictionStatus.Success;
            // Mark all participants as winners for now — AI integration will refine this
            for (uint256 i = 0; i < p.participants.length; i++) {
                p.isWinner[p.participants[i]] = true;
                p.winningPool += p.contributions[p.participants[i]];
            }
        } else {
            p.status = PredictionStatus.Failed;
        }

        emit PredictionResolved(_predictionId, p.status);
    }

    function claimWinnings(uint256 _predictionId) external {
        Prediction storage p = predictions[_predictionId];
        require(p.status == PredictionStatus.Success, "Prediction not won");
        require(p.isWinner[msg.sender], "You are not a winner");
        require(p.contributions[msg.sender] > 0, "No winnings to claim");

        uint256 share = (p.contributions[msg.sender] * p.totalPool) / p.winningPool;
        p.contributions[msg.sender] = 0; // Prevent double claims

        require(travelAiToken.transfer(msg.sender, share), "Transfer failed");

        emit WinningsClaimed(_predictionId, msg.sender, share);
    }

    function getPrediction(uint256 _predictionId) external view returns (
        string memory description,
        uint256 deadline,
        uint256 totalPool,
        PredictionStatus status,
        address[] memory participants
    ) {
        Prediction storage p = predictions[_predictionId];
        return (p.description, p.deadline, p.totalPool, p.status, p.participants);
    }

    function withdrawTokens(address _to, uint256 _amount) external onlyOwner {
        require(travelAiToken.transfer(_to, _amount), "Withdraw failed");
    }
}
