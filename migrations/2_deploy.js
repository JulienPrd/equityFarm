const MetaCoin = artifacts.require("MetaCoin.sol");
const FarmBasic = artifacts.require("FarmBasic.sol");

var prefix = "equity";

module.exports = function(deployer, network, accounts) {
  deployer.deploy(MetaCoin, "MetaCoin", "META").then(function() {
    return deployer.deploy(FarmBasic, MetaCoin.address, accounts[3], 1, prefix + "MetaCoin", prefix + "META");
  });
};