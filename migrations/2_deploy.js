const MetaCoin = artifacts.require("MetaCoin.sol");
const FarmBasic = artifacts.require("FarmBasic.sol");

var prefix = "equity";

// pid: 423
// contract: 0x73feaa1ee314f8c655e354234017be2193c9e24e
// liquidity: 0xec6557348085aa57c72514d67070dc863c0a5a8c

module.exports = function(deployer, network, accounts) {
  deployer.deploy(MetaCoin, "MetaCoin", "META").then(function() {
    return deployer.deploy(FarmBasic, accounts[8], accounts[9], accounts[7], MetaCoin.address, accounts[6], 1, prefix + "MetaCoin", prefix + "META");
  });
};