require("@nomicfoundation/hardhat-ethers");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    // Ganache GUI (default port 7545, chainId 1337)
    ganache: {
      url: "http://127.0.0.1:7545",
      chainId: 1337,
    },
    // ganache-cli / npx ganache (default port 8545)
    ganacheCLI: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },
    // Hardhat's built-in network (for unit tests)
    hardhat: {
      chainId: 1337,
    },
  },
  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },
};
