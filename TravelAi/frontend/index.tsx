import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

// Neon Google Fonts
const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

// Detect Ethereum provider (MetaMask / WalletConnect-ready)
declare global {
  interface Window {
    ethereum?: any;
    solana?: any;
  }
}

// Inject basic Web3 provider if available
function initWeb3Provider() {
  if (window.ethereum) {
    console.log("✅ Ethereum provider detected (MetaMask/Web3).");
  } else {
    console.warn("⚠️ No Ethereum provider found. Install MetaMask.");
  }

  if (window.solana && window.solana.isPhantom) {
    console.log("✅ Solana provider detected (Phantom).");
  }
}

initWeb3Provider();

// Boot the React App
const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
