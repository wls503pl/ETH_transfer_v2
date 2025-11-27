# Contract-Frontend Integration Design Document

## Project Overview

**ETH_TRANSFER_V2** is a decentralized Ethereum transaction application that allows users to send ETH with messages and keywords (for GIF display) across the blockchain. The application consists of a Solidity smart contract deployed on Sepolia testnet and a React frontend built with Vite and TailwindCSS.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        React Frontend                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              TransactionContext (Provider)              │ │
│  │  - Manages wallet connection                            │ │
│  │  - Handles transaction submission                       │ │
│  │  - Fetches transaction history                          │ │
│  └────────────────────────────────────────────────────────┘ │
│           ▲                    ▲                    ▲        │
│           │                    │                    │        │
│  ┌────────┴────────┐  ┌───────┴────────┐  ┌───────┴──────┐ │
│  │  Welcome.jsx    │  │ Transactions   │  │   App.jsx    │ │
│  │  (Form Input)   │  │  .jsx (List)   │  │   (Root)     │ │
│  └─────────────────┘  └────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   ethers.js v6     │
                    │  (Web3 Provider)   │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │      MetaMask      │
                    │   (Browser Wallet) │
                    └─────────┬──────────┘
                              │
        ┌─────────────────────▼─────────────────────┐
        │         Ethereum Sepolia Testnet          │
        │  ┌─────────────────────────────────────┐  │
        │  │   Transactions.sol Smart Contract   │  │
        │  │  Address: 0x75839e45b8835A2f61a...  │  │
        │  └─────────────────────────────────────┘  │
        └───────────────────────────────────────────┘
```

---

## Smart Contract Design

### Contract: `Transactions.sol`

**Location:** `contract/contracts/Transactions.sol`  
**Solidity Version:** ^0.8.28  
**Network:** Sepolia Testnet  
**Contract Address:** `0x75839e45b8835A2f61a17F3EF4982FF38934CD6C`

#### State Variables

```solidity
uint256 transactionCount;              // Total number of transactions
TransferStruct[] transactions;         // Array storing all transaction records
```

#### Data Structure

```solidity
struct TransferStruct {
    address sender;        // Transaction sender address
    address receiver;      // Transaction receiver address
    uint256 amount;        // Amount in Wei
    string message;        // Custom message
    uint256 timestamp;     // Block timestamp
    string keyword;        // Keyword for GIF lookup
}
```

#### Events

```solidity
event Transfer(
    address from,
    address receiver,
    uint256 amount,
    string message,
    uint256 timestamp,
    string keyword
);
```

**Purpose:** Emitted when a transaction is recorded. Allows frontend to listen for new transactions via event logs.

#### Public Functions

##### 1. `addToBlockchain()`

```solidity
function addToBlockchain(
    address payable receiver,
    uint256 amount,
    string memory message,
    string memory keyword
) public
```

**Purpose:** Records transaction details to the blockchain.

**Parameters:**

-   `receiver`: Recipient's Ethereum address
-   `amount`: Transaction amount in Wei
-   `message`: User-provided message
-   `keyword`: Keyword for GIF retrieval

**Logic Flow:**

1. Increments `transactionCount`
2. Creates new `TransferStruct` with:
    - `msg.sender` as sender
    - Current `block.timestamp`
    - Provided parameters
3. Pushes struct to `transactions` array
4. Emits `Transfer` event

**Gas Cost:** ~100,000 - 150,000 gas (varies with message/keyword length)

##### 2. `getAllTransactions()`

```solidity
function getAllTransactions() public view returns (TransferStruct[] memory)
```

**Purpose:** Retrieves all transaction records.

**Returns:** Array of all `TransferStruct` objects

**Gas Cost:** View function (no gas cost for calls)

##### 3. `getTransactionCount()`

```solidity
function getTransactionCount() public view returns (uint256)
```

**Purpose:** Returns total number of transactions.

**Returns:** `uint256` transaction count

**Gas Cost:** View function (no gas cost)

---

## Frontend Architecture

### Technology Stack

-   **Framework:** React 18 with Vite
-   **Styling:** TailwindCSS
-   **Web3 Library:** ethers.js v6
-   **Wallet:** MetaMask browser extension

### Core Components

#### 1. TransactionContext Provider

**Location:** `client/src/context/TransactionContext.jsx`

**Purpose:** Central state management for wallet connection, transaction submission, and data fetching.

##### State Management

```javascript
const [currentAccount, setCurrentAccount] = useState("");
const [formData, setFormData] = useState({
    addressTo: "",
    amount: "",
    keyword: "",
    message: "",
});
const [isLoading, setIsLoading] = useState(false);
const [transactionCount, setTransactionCount] = useState(
    localStorage.getItem("transactionCount")
);
const [transactions, setTransactions] = useState([]);
```

##### Key Methods

###### `getEthereumContract()`

```javascript
const getEthereumContract = async () => {
    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    const transactionContract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
    );
    return transactionContract;
};
```

**Purpose:** Creates contract instance with proper provider and signer.

**Dependencies:**

-   `contractAddress` from constants.js
-   `contractABI` from Transactions.json
-   MetaMask's injected `ethereum` object

###### `connectWallet()`

```javascript
const connectWallet = async () => {
    const accounts = await ethereum.request({
        method: "eth_requestAccounts",
    });
    setCurrentAccount(accounts[0]);
};
```

**Purpose:** Prompts user to connect MetaMask wallet.

**Flow:**

1. Triggers MetaMask popup
2. User selects account
3. Sets first account as `currentAccount`

###### `checkIfWalletIsConnected()`

```javascript
const checkIfWalletIsConnected = async () => {
    const accounts = await ethereum.request({ method: "eth_accounts" });
    if (accounts.length) {
        setCurrentAccount(accounts[0]);
        getAllTransactions();
    }
};
```

**Purpose:** Auto-connects if user previously authorized the dApp.

**Execution:** Called in `useEffect` on component mount.

###### `getAllTransactions()`

```javascript
const getAllTransactions = async () => {
    const transactionContract = await getEthereumContract();
    const availableTransactions =
        await transactionContract.getAllTransactions();

    const structuredTransactions = availableTransactions.map((transaction) => ({
        addressTo: transaction.receiver,
        addressFrom: transaction.sender,
        timestamp: new Date(
            Number(transaction.timestamp) * 1000
        ).toLocaleString(),
        message: transaction.message,
        keyword: transaction.keyword,
        amount: ethers.formatEther(transaction.amount),
    }));

    setTransactions(structuredTransactions);
};
```

**Purpose:** Fetches all transactions from smart contract and formats for UI.

**Data Transformation:**

-   `receiver` → `addressTo`
-   `sender` → `addressFrom`
-   `timestamp` (Unix seconds) → Localized date string
-   `amount` (Wei) → ETH using `ethers.formatEther()`

###### `sendTransaction()`

```javascript
const sendTransaction = async () => {
    const { addressTo, amount, keyword, message } = formData;

    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    const transactionContract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
    );

    const parsedAmount = ethers.parseEther(amount);

    // Step 1: Send ETH via MetaMask
    await ethereum.request({
        method: "eth_sendTransaction",
        params: [
            {
                from: currentAccount,
                to: addressTo,
                gas: "0x5208",
                value: parsedAmount.toString(16),
            },
        ],
    });

    // Step 2: Record transaction details to contract
    const transactionHash = await transactionContract.addToBlockchain(
        addressTo,
        parsedAmount,
        message,
        keyword
    );

    setIsLoading(true);
    await transactionHash.wait(); // Wait for confirmation
    setIsLoading(false);

    // Update transaction count
    const transactionCount = await transactionContract.getTransactionCount();
    setTransactionCount(transactionCount);

    // Clear form
    setFormData({ addressTo: "", amount: "", keyword: "", message: "" });
};
```

**Purpose:** Executes two-step transaction process.

**Step 1 - ETH Transfer:**

-   Uses `eth_sendTransaction` RPC method
-   Sends actual ETH from user's wallet
-   Gas limit: 21,000 (0x5208)

**Step 2 - Contract Recording:**

-   Calls `addToBlockchain()` on smart contract
-   Stores transaction metadata on-chain
-   Waits for transaction confirmation

**Error Handling:** Wrapped in try-catch, logs errors to console.

#### 2. Welcome Component

**Location:** `client/src/components/Welcome.jsx`

**Purpose:** Transaction form and wallet connection UI.

##### Features

-   **Wallet Connection Button:** Displayed when no wallet connected
-   **Ethereum Card Display:** Shows connected account address
-   **Transaction Form:** 4 input fields:
    -   Address To
    -   Amount (ETH)
    -   Keyword (for GIF)
    -   Message
-   **Submit Handler:** Validates all fields before calling `sendTransaction()`
-   **Loading State:** Shows Loader component during transaction

##### Key Code

```javascript
const {
    connectWallet,
    currentAccount,
    formData,
    sendTransaction,
    handleChange,
    isLoading,
} = useContext(TransactionContext);

const handleSubmit = (e) => {
    e.preventDefault();
    const { addressTo, amount, keyword, message } = formData;
    if (!addressTo || !amount || !keyword || !message) return;
    sendTransaction();
};
```

#### 3. Transactions Component

**Location:** `client/src/components/Transactions.jsx`

**Purpose:** Displays transaction history in card format.

##### Features

-   **Transaction Cards:** Each card shows:
    -   Sender address (with Etherscan link)
    -   Receiver address (with Etherscan link)
    -   Amount in ETH
    -   Message (if provided)
    -   GIF image (fetched via keyword)
    -   Timestamp
-   **Conditional Rendering:** Shows different message if wallet not connected
-   **Reverse Order:** Displays newest transactions first

##### TransactionCard Component

```javascript
const TransactionCard = ({
    addressTo,
    addressFrom,
    timestamp,
    message,
    keyword,
    amount,
    url,
}) => {
    const gifUrl = useFetch({ keyword });

    return (
        <div className="bg-[#181918] m-4 flex flex-1...">
            <a href={`https://sepolia.etherscan.io/address/${addressFrom}`}>
                <p>From: {shortenAddress(addressFrom)}</p>
            </a>
            <a href={`https://sepolia.etherscan.io/address/${addressTo}`}>
                <p>To: {shortenAddress(addressTo)}</p>
            </a>
            <p>Amount: {amount} ETH</p>
            {message && <p>Message: {message}</p>}

            <img src={gifUrl || url} alt="gif" />
            <p>{timestamp}</p>
        </div>
    );
};
```

---

## Integration Flow Diagrams

### 1. Wallet Connection Flow

```
┌──────────┐
│   User   │
└────┬─────┘
     │ Clicks "Connect Wallet"
     ▼
┌─────────────────────┐
│  connectWallet()    │
└──────────┬──────────┘
           │ ethereum.request({method: "eth_requestAccounts"})
           ▼
┌─────────────────────┐
│     MetaMask        │
│  (Popup appears)    │
└──────────┬──────────┘
           │ User approves
           ▼
┌─────────────────────┐
│ setCurrentAccount() │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ getAllTransactions()│
│  (Auto-fetch data)  │
└─────────────────────┘
```

### 2. Transaction Submission Flow

```
┌──────────┐
│   User   │
└────┬─────┘
     │ Fills form & clicks "Send Transaction"
     ▼
┌──────────────────────┐
│   handleSubmit()     │
│  (Validates inputs)  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│           sendTransaction()                   │
└──────────┬───────────────────────────────────┘
           │
           ├─► Step 1: eth_sendTransaction
           │   (Send actual ETH via MetaMask)
           │            │
           │            ▼
           │   ┌──────────────┐
           │   │   MetaMask   │
           │   │   Confirms   │
           │   └──────┬───────┘
           │          │
           ├─► Step 2: contract.addToBlockchain()
           │   (Record metadata on-chain)
           │            │
           │            ▼
           │   ┌──────────────────┐
           │   │ Transactions.sol │
           │   │ - Increment count│
           │   │ - Push to array  │
           │   │ - Emit event     │
           │   └──────┬───────────┘
           │          │
           ├─► setIsLoading(true)
           │
           ├─► transactionHash.wait()
           │   (Wait for confirmation)
           │
           ├─► setIsLoading(false)
           │
           ├─► Update transactionCount
           │
           └─► Clear formData
                    │
                    ▼
              ┌──────────┐
              │ Success! │
              └──────────┘
```

### 3. Data Fetching Flow

```
┌────────────────────┐
│   Component Mount  │
└─────────┬──────────┘
          │ useEffect(() => {}, [])
          ▼
┌────────────────────────┐
│ checkIfWalletIsConnected│
└─────────┬──────────────┘
          │ ethereum.request({method: "eth_accounts"})
          ▼
    ┌─────────┐
    │Accounts?│
    └────┬────┘
         │ Yes
         ▼
┌──────────────────────┐
│ getAllTransactions() │
└─────────┬────────────┘
          │
          ▼
┌───────────────────────────┐
│ getEthereumContract()     │
│  - Create provider        │
│  - Get signer             │
│  - Return contract instance│
└─────────┬─────────────────┘
          │
          ▼
┌────────────────────────────────┐
│ contract.getAllTransactions()  │
│  (Read from blockchain)        │
└─────────┬──────────────────────┘
          │
          ▼
┌────────────────────────────┐
│ Transform data:            │
│  - Format timestamp        │
│  - Convert Wei to ETH      │
│  - Rename fields           │
└─────────┬──────────────────┘
          │
          ▼
┌────────────────────────────┐
│   setTransactions(data)    │
└─────────┬──────────────────┘
          │
          ▼
┌────────────────────────────┐
│  Render in UI              │
│  (Transactions.jsx)        │
└────────────────────────────┘
```

---

## Data Flow & State Management

### Contract → Frontend Data Mapping

| **Contract Field** | **Frontend Field** | **Transformation**                    |
| ------------------ | ------------------ | ------------------------------------- |
| `sender`           | `addressFrom`      | Direct mapping                        |
| `receiver`         | `addressTo`        | Direct mapping                        |
| `amount`           | `amount`           | `ethers.formatEther()` (Wei → ETH)    |
| `message`          | `message`          | Direct mapping                        |
| `timestamp`        | `timestamp`        | `new Date(n * 1000).toLocaleString()` |
| `keyword`          | `keyword`          | Direct mapping                        |

### localStorage Usage

```javascript
// Store transaction count locally
localStorage.setItem("transactionCount", transactionCount);

// Read on app initialization
const [transactionCount, setTransactionCount] = useState(
    localStorage.getItem("transactionCount")
);
```

**Purpose:** Cache transaction count to avoid unnecessary blockchain reads on page reload.

---

## Security Considerations

### Smart Contract Security

1. **No Access Control:**

    - Any address can call `addToBlockchain()`
    - **Risk:** Spam transactions
    - **Mitigation:** Consider adding rate limiting or minimum amount requirements

2. **No Reentrancy Protection:**

    - Contract doesn't handle ETH transfers directly
    - **Status:** Low risk (no payable functions that transfer ETH)

3. **Unbounded Array Growth:**

    - `transactions` array grows indefinitely
    - **Risk:** Gas costs for `getAllTransactions()` increase over time
    - **Mitigation:** Consider pagination or indexed queries in future

4. **Event Logging:**
    - `Transfer` event provides transaction trail
    - **Benefit:** Off-chain indexing possible

### Frontend Security

1. **Input Validation:**

    - Form checks for empty fields
    - **Missing:** Address format validation, amount range checks
    - **Recommendation:** Add ethers.isAddress() validation

2. **MetaMask Dependency:**

    - App requires MetaMask installation
    - **Improvement:** Add checks and user-friendly error messages

3. **Error Handling:**

    - Currently logs to console
    - **Improvement:** Display user-facing error messages

4. **Transaction Confirmation:**
    - Waits for `transactionHash.wait()`
    - **Status:** Good practice ✓

---

## Gas Optimization Analysis

### Contract Functions

| **Function**            | **Type**       | **Gas Cost**  | **Notes**                      |
| ----------------------- | -------------- | ------------- | ------------------------------ |
| `addToBlockchain()`     | State-changing | ~100k-150k    | Varies with string length      |
| `getAllTransactions()`  | View           | 0 (read-only) | Cost increases with array size |
| `getTransactionCount()` | View           | 0 (read-only) | Constant cost                  |

### Frontend Transaction Flow

**Total User Cost:**

1. ETH Transfer: 21,000 gas (fixed)
2. Contract Recording: ~100,000-150,000 gas
3. **Total:** ~121,000-171,000 gas

**At 50 Gwei gas price:**

-   Minimum: 0.00605 ETH (~$15-20 USD)
-   Maximum: 0.00855 ETH (~$20-30 USD)

---

## Deployment Configuration

### Hardhat Setup

**File:** `contract/hardhat.config.js`

```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
    solidity: "0.8.28",
    networks: {
        sepolia: {
            url: process.env.ALCHEMY_API,
            accounts: [process.env.ACCOUNT],
        },
    },
};
```

**Environment Variables (.env):**

```
ALCHEMY_API=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
ACCOUNT=YOUR_PRIVATE_KEY
```

### Deployment Script

**File:** `contract/scripts/deploy.js`

```javascript
const main = async () => {
    const Transactions = await hre.ethers.getContractFactory("Transactions");
    const transactions = await Transactions.deploy();
    await transactions.waitForDeployment();

    console.log("Transactions deployed to:", transactions.target);
};
```

**Command:**

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

**Output:**

```
Transactions deployed to: 0x75839e45b8835A2f61a17F3EF4982FF38934CD6C
```

---

## Frontend Configuration

### Constants Setup

**File:** `client/src/utils/constants.js`

```javascript
import abi from "./Transactions.json";

export const contractABI = abi.abi;
export const contractAddress = "0x75839e45b8835A2f61a17F3EF4982FF38934CD6C";
```

**Transactions.json:**

-   Generated by Hardhat compilation
-   Located at: `contract/artifacts/contracts/Transactions.sol/Transactions.json`
-   Contains: ABI, bytecode, metadata

**Update Process After Redeployment:**

1. Run deployment script
2. Copy new contract address
3. Update `contractAddress` in constants.js
4. Copy new `Transactions.json` to client utils folder

---

## Testing Strategy

### Smart Contract Testing

**Recommended Test Cases:**

```javascript
describe("Transactions", function () {
    it("Should record transaction correctly", async function () {
        // Test addToBlockchain()
    });

    it("Should increment transaction count", async function () {
        // Test getTransactionCount()
    });

    it("Should return all transactions", async function () {
        // Test getAllTransactions()
    });

    it("Should emit Transfer event", async function () {
        // Test event emission
    });
});
```

**Run Tests:**

```bash
cd contract
npx hardhat test
```

### Frontend Testing (Recommended)

**Manual Testing Checklist:**

-   [ ] MetaMask connection
-   [ ] Wallet disconnection handling
-   [ ] Form validation
-   [ ] Transaction submission
-   [ ] Loading states
-   [ ] Transaction history display
-   [ ] Error handling
-   [ ] Network switching (Sepolia only)

**Automated Testing Tools:**

-   Jest + React Testing Library
-   Cypress for E2E testing
-   Mock MetaMask with `@metamask/providers`

---

## Future Improvements

### Contract Enhancements

1. **Pagination System**

    ```solidity
    function getTransactions(uint256 offset, uint256 limit)
        public view returns (TransferStruct[] memory)
    ```

2. **User-Specific Queries**

    ```solidity
    function getUserTransactions(address user)
        public view returns (TransferStruct[] memory)
    ```

3. **Transaction Indexing**

    - Implement mapping for O(1) lookups
    - Add transaction ID system

4. **Access Control**
    - Minimum transaction amount
    - Rate limiting per address
    - Admin functions

### Frontend Enhancements

1. **Enhanced Validation**

    - Address format checking
    - Amount range validation
    - Network verification (Sepolia only)

2. **Better Error Handling**

    - User-friendly error messages
    - Transaction failure recovery
    - Retry mechanisms

3. **Performance Optimization**

    - Transaction caching
    - Lazy loading for history
    - Optimistic UI updates

4. **Additional Features**
    - Transaction filtering/search
    - Export transaction history
    - Notification system
    - Multi-wallet support (WalletConnect)

---

## Troubleshooting Guide

### Common Issues

#### 1. "Please install MetaMask first"

**Cause:** MetaMask not detected  
**Solution:**

-   Install MetaMask extension
-   Check if `window.ethereum` exists
-   Refresh page after installation

#### 2. Transaction Fails Silently

**Causes:**

-   Insufficient gas
-   Incorrect network (not Sepolia)
-   Wallet locked

**Debug Steps:**

1. Check console for errors
2. Verify network in MetaMask
3. Ensure sufficient Sepolia ETH
4. Check transaction on Etherscan

#### 3. Transactions Not Displaying

**Causes:**

-   Contract address mismatch
-   ABI outdated
-   Network issues

**Debug Steps:**

1. Verify `contractAddress` matches deployment
2. Ensure `Transactions.json` is current
3. Check browser console for errors
4. Verify wallet is connected

#### 4. Gas Estimation Failed

**Causes:**

-   Empty form fields
-   Invalid address format
-   Contract function revert

**Solution:**

-   Validate all inputs before submission
-   Add try-catch with specific error messages

---

## API Reference

### TransactionContext Exports

```typescript
interface TransactionContextValue {
    connectWallet: () => Promise<void>;
    currentAccount: string;
    formData: {
        addressTo: string;
        amount: string;
        keyword: string;
        message: string;
    };
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    handleChange: (e: Event, name: string) => void;
    sendTransaction: () => Promise<void>;
    transactions: Transaction[];
    isLoading: boolean;
}
```

### Transaction Object Structure

```typescript
interface Transaction {
    addressTo: string; // Recipient address
    addressFrom: string; // Sender address
    timestamp: string; // Formatted date string
    message: string; // User message
    keyword: string; // GIF keyword
    amount: string; // Amount in ETH (string)
}
```

---

## Conclusion

The **ETH_TRANSFER_V2** project demonstrates a complete integration between Ethereum smart contracts and a modern React frontend. The architecture separates concerns effectively:

-   **Smart Contract:** Handles immutable transaction recording
-   **Frontend:** Provides user-friendly interface and state management
-   **ethers.js:** Bridges the gap with type-safe interactions

**Key Strengths:**
✓ Clean separation of concerns  
✓ Proper use of React Context for state management  
✓ Two-step transaction process ensures data integrity  
✓ Comprehensive transaction history

**Areas for Enhancement:**

-   Input validation and error handling
-   Contract pagination for scalability
-   Enhanced security measures
-   Comprehensive testing suite

This design document serves as a complete reference for understanding, maintaining, and extending the application.
