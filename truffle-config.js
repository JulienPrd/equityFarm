const HDWalletProvider = require('truffle-hdwallet-provider');
const fs = require('fs');
const mnemonic = fs.readFileSync(".secret").toString().trim();

// address: 0x3EA10391D762960Cb2D79aa66875a3970440ea9E

module.exports = {
  // Uncommenting the defaults below 
  // provides for an easier quick-start with Ganache.
  // You can also follow this format for other networks;
  // see <http://truffleframework.com/docs/advanced/configuration>
  // for more details on how to specify configuration options!

  networks: {
    development: {
     host: "127.0.0.1",
     port: 7545,
     network_id: "*"
    },

    test: {
     host: "127.0.0.1",
     port: 7545,
     network_id: "*"
   },

    testnet: {
      provider: () => new HDWalletProvider(mnemonic, "https://data-seed-prebsc-1-s1.binance.org:8545"),
      network_id: 97,
      confirmations: 1,
      timeoutBlocks: 200,
      skipDryRun: true
    },

  },

  compilers: {
    solc: {
      version: "^0.8.0"
    }
  }

};