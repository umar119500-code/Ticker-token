require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { DEPLOYER_PRIVATE_KEY, BSC_TESTNET_RPC_URL, ETHERSCAN_API_KEY } = process.env;

// Only attach a key when it is well-formed; never print it.
const validKey = typeof DEPLOYER_PRIVATE_KEY === "string" && /^0x[0-9a-fA-F]{64}$/.test(DEPLOYER_PRIVATE_KEY);

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "paris",
    },
  },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: "http://127.0.0.1:8545", chainId: 31337 },
    bscTestnet: {
      url: BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
      chainId: 97,
      accounts: validKey ? [DEPLOYER_PRIVATE_KEY] : [],
    },
    // Intentionally no BNB Smart Chain mainnet (chain 56) entry. Add one only after an independent review.
  },
  etherscan: {
    // Single Etherscan v2 key (multichain). See README → Verification.
    apiKey: ETHERSCAN_API_KEY || "",
  },
  sourcify: { enabled: true },
  gasReporter: { enabled: process.env.REPORT_GAS === "true", currency: "USD" },
};
