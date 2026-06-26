# RoomEase TrustChain

Blockchain-based tenancy agreement registry on Ethereum. Issues, revokes, and verifies tenancy records on-chain via a Solidity smart contract, with a zero-backend web frontend.

## Project Structure

```
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

## Why this structure

The original deliverable was a single self-contained `.html` file with inline
`<style>` and `<script>` blocks plus a separate `.sol` contract. That works
for quick demos, but doesn't reflect how a real dApp project is organized.
This structure separates concerns the standard way:

- **`contracts/`** — on-chain code only. This is where Remix/Hardhat/Truffle
  expect contract sources to live.
- **`frontend/`** — off-chain client code, itself split into markup (`index.html`),
  styling (`css/style.css`), and behavior (`js/app.js`) — the standard
  HTML/CSS/JS separation.
- **`docs/`** — reserved for any architecture diagrams, ABI dumps, or report
  material, kept out of the runnable code folders.

No functionality was changed. `index.html` now links to `css/style.css` and
`js/app.js` instead of embedding them inline; every function, event handler,
and the embedded contract-source string (used by the in-app "Contract" tab)
are byte-for-byte the same as the original file.

## Running locally

The frontend has no build step. Open `frontend/index.html` directly in a
browser, or serve the `frontend/` folder with any static file server:

```bash
cd frontend
python3 -m http.server 8080
# then visit http://localhost:8080
```

MetaMask must be installed and pointed at your target network (Ganache,
Chain ID 1337, or Sepolia).

## Deploying the contract

1. Open [Remix IDE](https://remix.ethereum.org)
2. Create `TrustChain.sol` and paste the contents of `contracts/TrustChain.sol`
3. Compile with Solidity `^0.8.20`
4. Deploy via **Injected Provider — MetaMask** (Ganache or Sepolia)
5. Copy the deployed contract address into the **Contract** tab of the running frontend

See the full deployment guide in the project report for detailed steps.

## Proof of Work

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
