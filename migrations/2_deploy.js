const MetaCoin = artifacts.require("MetaCoin.sol");
const FarmBasic = artifacts.require("FarmBasic.sol");

var prefix = "equity";

module.exports = function(deployer, network, accounts) {
  var owner = accounts[0];
  deployer.deploy(MetaCoin, "MetaCoin", "META", 18, 100000).then(function() {
    return deployer.deploy(FarmBasic, MetaCoin.address, prefix + "MetaCoin", prefix + "META", 18);
  })
};