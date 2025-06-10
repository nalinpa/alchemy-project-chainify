require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ignition");
require("@nomicfoundation/hardhat-ethers")
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      chainId: 1337,
    },
    baseSepolia: {
      url: process.env.ALCHEMY_API_URL,
      accounts: [process.env.PRIVATE_KEY], 
      chainId: 84532,
    },
  },
  ignition: {
    strategy: "basic",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
    ignition: "./ignition",
  },
};