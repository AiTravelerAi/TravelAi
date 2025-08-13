import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./styles.css"; // include your neon theme CSS
import PredictionPoolABI from "../abis/PredictionPool.json";
import TimelineArchiveABI from "../abis/TimelineArchive.json";
import TRAVELAIABI from "../abis/TRAVELAI.json";

const ETH_CONTRACTS = {
  predictionPool: "0xYourPredictionPoolAddress",
  timelineArchive: "0xYourTimelineArchiveAddress",
  travelaiToken: "0xYourTRAVELAIAddress",
};

interface Prediction {
  predictionId: number;
  aiModelVersion: string;
  timestamp: number;
  signal: string;
  confidence: number;
  volatilityTier: string;
  totalPoolTokens: number;
  followers: number;
  outcome: string;
  payoutRatio: number;
  maturityTimestamp: number;
  ipfsHash: string;
}

export default function App() {
  const [account, setAccount] = useState<string>("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selectedPrediction, setSelectedPrediction] = useState<number | null>(null);
  const [contribution, setContribution] = useState<string>("");

  // Connect MetaMask
  async function connectWallet() {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAccount(accounts[0]);
      } catch (err) {
        console.error("Wallet connection failed:", err);
      }
    } else {
      alert("MetaMask not found. Please install it.");
    }
  }

  // Load all predictions from TimelineArchive
  async function loadPredictions() {
    if (!window.ethereum) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const timeline = new ethers.Contract(
      ETH_CONTRACTS.timelineArchive,
      TimelineArchiveABI,
      provider
    );

    try {
      const ids: ethers.BigNumber[] = await timeline.getAllPredictionIds();
      const results: Prediction[] = [];
      for (const idBN of ids) {
        const id = idBN.toNumber();
        const record = await timeline.getPrediction(id);
        results.push({
          predictionId: record.predictionId.toNumber(),
          aiModelVersion: record.aiModelVersion,
          timestamp: record.timestamp.toNumber(),
          signal: record.signal,
          confidence: record.confidence.toNumber(),
          volatilityTier: record.volatilityTier,
          totalPoolTokens: record.totalPoolTokens.toNumber(),
          followers: record.followers.toNumber(),
          outcome: record.outcome,
          payoutRatio: record.payoutRatio.toNumber(),
          maturityTimestamp: record.maturityTimestamp.toNumber(),
          ipfsHash: record.ipfsHash,
        });
      }
      setPredictions(results);
    } catch (err) {
      console.error("Error loading predictions:", err);
    }
  }

  // Join prediction pool
  async function joinPredictionPool() {
    if (!selectedPrediction || !contribution) {
      alert("Please select a prediction and enter an amount.");
      return;
    }
    if (!window.ethereum) return;

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const token = new ethers.Contract(
      ETH_CONTRACTS.travelaiToken,
      TRAVELAIABI,
      signer
    );
    const pool = new ethers.Contract(
      ETH_CONTRACTS.predictionPool,
      PredictionPoolABI,
      signer
    );

    try {
      const amount = ethers.utils.parseUnits(contribution, 18);

      // Approve token transfer
      const approveTx = await token.approve(ETH_CONTRACTS.predictionPool, amount);
      await approveTx.wait();

      // Join pool
      const tx = await pool.joinPrediction(selectedPrediction, amount);
      await tx.wait();

      alert("Joined prediction pool successfully!");
      loadPredictions();
    } catch (err) {
      console.error("Error joining pool:", err);
    }
  }

  useEffect(() => {
    if (account) {
      loadPredictions();
    }
  }, [account]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>$TRAVELAI Prediction Portal</h1>
        {account ? (
          <span className="wallet-address">
            Connected: {account.slice(0, 6)}...{account.slice(-4)}
          </span>
        ) : (
          <button onClick={connectWallet} className="connect-btn">
            Connect Wallet
          </button>
        )}
      </header>

      <main>
        <section className="predictions-list">
          <h2>Active Predictions</h2>
          {predictions.length === 0 ? (
            <p>No predictions found.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Signal</th>
                  <th>Confidence</th>
                  <th>Volatility</th>
                  <th>Followers</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((p) => (
                  <tr
                    key={p.predictionId}
                    className={selectedPrediction === p.predictionId ? "selected" : ""}
                    onClick={() => setSelectedPrediction(p.predictionId)}
                  >
                    <td>{p.predictionId}</td>
                    <td>{p.signal}</td>
                    <td>{p.confidence}%</td>
                    <td>{p.volatilityTier}</td>
                    <td>{p.followers}</td>
                    <td>{p.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="join-pool">
          <h2>Join Prediction Pool</h2>
          <input
            type="number"
            placeholder="Amount in $TRAVELAI"
            value={contribution}
            onChange={(e) => setContribution(e.target.value)}
          />
          <button onClick={joinPredictionPool}>Join Pool</button>
        </section>
      </main>
    </div>
  );
}
