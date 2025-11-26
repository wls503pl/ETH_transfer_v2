require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const ALCHEMY_API = process.env.ALCHEMY_API || "";
const ACCOUNT = process.env.ACCOUNT || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.28",
    networks: {
        sepolia: {
            url: ALCHEMY_API,
            accounts: [ACCOUNT],
        },
    },
};
