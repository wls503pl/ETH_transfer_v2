import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { contractABI, contractAddress } from "../utils/constants";

// ============================================
// Create React Context
// Used to share transaction-related state and methods throughout the component tree
// ============================================
export const TransactionContext = React.createContext();

// Extract ethereum object from window (injected by MetaMask)
const { ethereum } = window;

// ============================================
// Get Ethereum Smart Contract Instance
// Connect to the blockchain smart contract using ethers.js library
// ============================================
const getEthereumContract = async () => {
    // Use BrowserProvider for ethers v6 to connect with MetaMask
    const provider = new ethers.BrowserProvider(ethereum);
    // Get the signer (current connected wallet account)
    const signer = await provider.getSigner();

    // Create contract instance with three required parameters:
    // 1. Contract address - where the smart contract is deployed on blockchain
    // 2. Contract ABI - Application Binary Interface, defines contract methods
    // 3. Signer - wallet account used to sign transactions
    const transactionContract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
    );

    return transactionContract;
};

// ============================================
// TransactionProvider Component
// Context Provider that supplies transaction-related state and methods to all child components
// ============================================
export const TransactionProvider = ({ children }) => {
    // ========== State Management ==========

    // Current connected wallet account address
    const [currentAccount, setCurrentAccount] = useState("");

    // Form data: stores user input for transaction information
    const [formData, setFormData] = useState({
        addressTo: "", // Recipient address
        amount: "", // Transfer amount (ETH)
        keyword: "", // Keyword (for GIF generation)
        message: "", // Message attached to transaction
    });

    // Loading state: shows loading animation during transaction submission
    const [isLoading, setIsLoading] = useState(false);

    // Transaction count: reads historical transaction count from localStorage
    const [transactionCount, setTransactionCount] = useState(
        localStorage.getItem("transactionCount")
    );

    // Transaction list: stores all historical transaction records
    const [transactions, setTransactions] = useState([]);

    // ========== Form Handling Methods ==========

    /**
     * Handle form input changes
     * @param {Event} e - Input event object
     * @param {string} name - Form field name
     */
    const handleChange = (e, name) => {
        setFormData((prevState) => ({ ...prevState, [name]: e.target.value }));
    };

    // ========== Transaction Related Methods ==========

    /**
     * Fetch all transaction records from smart contract
     * Converts blockchain data into frontend-friendly format
     */
    const getAllTransactions = async () => {
        try {
            // Check if MetaMask is installed
            if (!ethereum) return alert("Please install MetaMask first.");

            // Get contract instance
            const transactionContract = await getEthereumContract();

            // Call contract method to fetch all transactions
            const availableTransactions =
                await transactionContract.getAllTransactions();

            // Structure blockchain data into a more user-friendly format
            const structuredTransactions = availableTransactions.map(
                (transaction) => ({
                    addressTo: transaction.receiver, // Recipient address
                    addressFrom: transaction.sender, // Sender address
                    // Convert timestamp (seconds) to local time string
                    timestamp: new Date(
                        Number(transaction.timestamp) * 1000
                    ).toLocaleString(),
                    message: transaction.message, // Message
                    keyword: transaction.keyword, // Keyword
                    // Convert Wei to ETH (1 ETH = 10^18 Wei)
                    amount: ethers.formatEther(transaction.amount),
                })
            );

            console.log(structuredTransactions);
            setTransactions(structuredTransactions);
        } catch (error) {
            console.log(error);
        }
    };

    /**
     * Check if wallet is already connected
     * Automatically executes on page load, fetches account info if already connected
     */
    const checkIfWalletIsConnected = async () => {
        try {
            // Check if MetaMask is installed
            if (!ethereum) return alert("Please install MetaMask first.");

            // Request list of connected accounts
            const accounts = await ethereum.request({ method: "eth_accounts" });

            if (accounts.length) {
                // If there's a connected account, set it as current account
                setCurrentAccount(accounts[0]);

                // Fetch all transaction records for this account
                getAllTransactions();
            } else {
                console.log("No accounts found");
            }
        } catch (error) {
            console.log(error);
        }
    };

    /**
     * Check if transaction records exist
     * Fetch transaction count from smart contract and store locally
     */
    const checkIfTransactionsExists = async () => {
        try {
            // Check if MetaMask is available
            if (!ethereum) {
                console.log("Ethereum not available");
                return;
            }

            // Check if there are any connected accounts
            const accounts = await ethereum.request({ method: "eth_accounts" });
            if (!accounts.length) {
                console.log("No connected accounts");
                return;
            }

            // Get contract instance
            const transactionContract = await getEthereumContract();

            // Fetch total transaction count from contract
            const transactionCount =
                await transactionContract.getTransactionCount();

            // Save transaction count to localStorage
            window.localStorage.setItem("transactionCount", transactionCount);
        } catch (error) {
            console.log(error);
        }
    };

    /**
     * Connect wallet
     * Called when user clicks "Connect Wallet" button
     */
    const connectWallet = async () => {
        try {
            // Check if MetaMask is installed
            if (!ethereum) return alert("Please install MetaMask first.");

            // Request user authorization to connect wallet
            // This will open MetaMask popup for user to select account
            const accounts = await ethereum.request({
                method: "eth_requestAccounts",
            });

            // Set first account as current account
            setCurrentAccount(accounts[0]);
        } catch (error) {
            console.log(error);
        }
    };

    /**
     * Send transaction
     * Executes Ethereum transfer and records it to smart contract
     */
    const sendTransaction = async () => {
        try {
            // Check if MetaMask is installed
            if (!ethereum) return alert("Please install MetaMask first.");

            // Destructure transaction info from form data
            const { addressTo, amount, keyword, message } = formData;

            // Create provider and signer
            const provider = new ethers.BrowserProvider(ethereum);
            const signer = await provider.getSigner();

            // Get contract instance
            const transactionContract = new ethers.Contract(
                contractAddress,
                contractABI,
                signer
            );

            // Convert ETH amount to Wei (smallest unit)
            const parsedAmount = ethers.parseEther(amount);

            // Step 1: Send Ethereum transaction (actual ETH transfer)
            await ethereum.request({
                method: "eth_sendTransaction",
                params: [
                    {
                        from: currentAccount, // Sender (current account)
                        to: addressTo, // Recipient
                        gas: "0x5208", // Gas limit (21000)
                        value: parsedAmount.toString(16), // Transfer amount (hexadecimal)
                    },
                ],
            });

            // Step 2: Record transaction info to smart contract
            // This permanently stores additional transaction info (message, keyword) on blockchain
            const transactionHash = await transactionContract.addToBlockchain(
                addressTo,
                parsedAmount,
                message,
                keyword
            );

            // Set loading state
            setIsLoading(true);
            console.log(`Loading - ${transactionHash.hash}`);

            // Wait for transaction to be confirmed by miners (on-chain)
            await transactionHash.wait();

            // Transaction complete, turn off loading state
            setIsLoading(false);
            console.log(`Success - ${transactionHash.hash}`);

            // Update transaction count
            const transactionCount =
                await transactionContract.getTransactionCount();
            setTransactionCount(transactionCount);

            // Clear form data
            setFormData({
                addressTo: "",
                amount: "",
                keyword: "",
                message: "",
            });
        } catch (error) {
            console.log(error);
        }
    };

    // ========== Lifecycle ==========

    /**
     * Execute on component mount
     * Check wallet connection status and transaction records
     */
    useEffect(() => {
        checkIfWalletIsConnected();
        checkIfTransactionsExists();
    }, []);

    // ========== Context Provider Return ==========

    /**
     * Provide state and methods to all child components via Context.Provider
     * Any component wrapped by TransactionProvider can access these values
     * using useContext(TransactionContext)
     */
    return (
        <TransactionContext.Provider
            value={{
                connectWallet, // Wallet connection method
                currentAccount, // Current account address
                formData, // Form data
                setFormData, // Method to set form data
                handleChange, // Method to handle form changes
                sendTransaction, // Method to send transaction
                transactions, // Transaction list
                isLoading, // Loading state
            }}
        >
            {children}
        </TransactionContext.Provider>
    );
};
