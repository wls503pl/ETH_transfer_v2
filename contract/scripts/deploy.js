const main = async () => {
    // function factory to generate instance of a specific contract
    const Transactions = await hre.ethers.getContractFactory("Transactions");

    // deploy the contract to the blockchain and get the deployed contract instance
    const transactions = await Transactions.deploy();

    // wait for the deployment transaction to be confirmed on the blockchain
    await transactions.waitForDeployment();

    // use 'target' instead of 'address' to adapt to the latest ethers.js v6
    console.log("Transactions deployed to:", transactions.target);
};

const runMain = async () => {
    try {
        await main();
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

runMain();
