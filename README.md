<div align="center">
  <h1>🏠 RoomEase TrustChain</h1>
  <p>Decentralized Tenancy Agreement Registry (FYP Implementation)</p>
  <br />
  <a href="https://blockchain-project-rho.vercel.app/"><strong>🔗 View Live Demo</strong></a>
</div>

---

I am excited to share my blockchain project, **RoomEase TrustChain**, which I developed and implemented as part of my Final Year Project (FYP) with my team members. I implemented the core features and concepts of my FYP into a decentralized tenancy agreement registry built on the Ethereum blockchain.

## 📖 Project Overview

**RoomEase TrustChain** focuses on the secure and transparent management of rental agreements using blockchain technology. The system enables landlords to create and manage tenancy agreements on-chain while allowing users to verify records in a trusted and decentralized environment.

## ✨ Key Features Implemented

- ✅ **Smart Contract Development** using Solidity
- ✅ **Role-Based Access Control** (Owner, Landlord, Viewer)
- ✅ **Agreement Creation, Verification & Revocation**
- ✅ **MetaMask Integration**
- ✅ **Ethereum Blockchain Deployment** (Ganache / Sepolia)
- ✅ **Real-Time Agreement Registry**
- ✅ **Zero-Backend Architecture** using ethers.js

## 🛠️ Technology Stack

| Technology | Description |
|---|---|
| <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/solidity/solidity-original.svg" alt="Solidity" width="24" height="24"/> **Solidity** | Smart Contract programming language. |
| <img src="https://upload.wikimedia.org/wikipedia/commons/0/05/Ethereum_logo_2014.svg" alt="Ethereum" width="24" height="24"/> **Ethereum** | Decentralized blockchain network. |
| <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" width="24" height="24"/> **MetaMask** | Crypto wallet & gateway to blockchain apps. |
| <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.svg" alt="ethers.js" width="24" height="24"/> **ethers.js** | Library for interacting with the Ethereum Blockchain. |
| <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/html5/html5-original.svg" alt="HTML/CSS/JS" width="24" height="24"/> **HTML, CSS & JS** | Frontend technologies. |
| 🔷 **Remix IDE** | Ethereum IDE for smart contract development. |
| 🍫 **Ganache** | Personal blockchain for Ethereum development. |

## 👥 Team & Acknowledgments

Through this project, my team members **Muhamad Usama Khan** and **Tauseef Abbas** and I gained practical experience in smart contract development, blockchain architecture, Web3 integration, and decentralized application (DApp) development by transforming our FYP concepts into a practical blockchain solution. 

I would like to appreciate my team members for their dedication, collaboration, and efforts throughout this journey. 🤝

Special thanks to our instructor for their guidance and support!

<div align="center">
  <br />
  <em>#Blockchain #Ethereum #Solidity #Web3 #DApp #SmartContracts #MetaMask #SoftwareEngineering #FYP #BlockchainTechnology #Innovation</em>
</div>

---

## 📂 Project Structure

```text
RoomEaseTrustChain/
│
├── contracts/
│   └── TrustChain.sol          # Solidity smart contract (Ethereum, ^0.8.20)
│
├── frontend/
│   ├── index.html              # Main application shell (markup only)
│   ├── css/
│   │   └── style.css           # All application styling
│   └── js/
│       └── app.js              # Application logic, contract calls, UI state
│
├── docs/
│   └── (architecture notes, ABI reference, etc.)
│
└── README.md
```

## 🚀 Running Locally

The frontend has no build step. Open `frontend/index.html` directly in a browser, or serve the `frontend/` folder with any static file server:

```bash
cd frontend
python3 -m http.server 8080
# then visit http://localhost:8080
```

MetaMask must be installed and pointed at your target network (Ganache, Chain ID 1337, or Sepolia).

## 🔗 Deploying the Contract

1. Open [Remix IDE](https://remix.ethereum.org)
2. Create `TrustChain.sol` and paste the contents of `contracts/TrustChain.sol`
3. Compile with Solidity `^0.8.20`
4. Deploy via **Injected Provider — MetaMask** (Ganache or Sepolia)
5. Copy the deployed contract address into the **Contract** tab of the running frontend

---

## 📸 Proof of Work

Here are the screenshots showcasing the system in action:

### Architecture
![Architecture](Proof%20Of%20Work/archtechture.png)

### Home Page
![Home Page](Proof%20Of%20Work/home3.png)

### Dashboard
![Dashboard](Proof%20Of%20Work/Dashboard4.png)

### Contract Page
![Contract Page](Proof%20Of%20Work/Contract%20page6.png)

### Agreement Details
![Agreement](Proof%20Of%20Work/agreement.png)

### All Agreements
![All Agreements](Proof%20Of%20Work/All%20agreements.png)

### Verification
![Verification](Proof%20Of%20Work/Verify.png)

### Remix IDE (Smart Contract Deployment)
![Remix](Proof%20Of%20Work/Remix.png)

### Ganache (Local Blockchain)
![Ganache](Proof%20Of%20Work/Ganache2.png)
