require("@nomiclabs/hardhat-waffle")
require("hardhat-gas-reporter")
require("solidity-coverage")
require("hardhat-contract-sizer")

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners()
  for (const account of accounts) {
    console.log(account.address)
  }
})

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      metadata: {
        bytecodeHash: "none",
        useLiteralContent: true,
      },
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 10143, // Ensure your Hardhat network runs with Monad's chain ID.
      forking: {
        url: "https://testnet-rpc.monad.xyz",
        // blockNumber: 11389636, // Adjust to a block number that makes sense for your use case.
      },
      // Custom chain parameters for Monad Testnet:
      chains: {
        10143: {
          // Define hardfork activation history.
          // In this example, we assume:
          // - London rules from genesis (block 0),
          // - Cancun rules activated at block 11389636.
          hardforkHistory: {
            london: 0,
            cancun: 11389636,
          },
        },
      },
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  sourcify: {
    enabled: true,
    apiUrl: "https://sourcify-api-monad.blockvision.org",
    browserUrl: "https://testnet.monadexplorer.com",
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
  },
  etherscan: {
    enabled: false,
  },
  mocha: {
    timeout: 100000000,
  },
}
