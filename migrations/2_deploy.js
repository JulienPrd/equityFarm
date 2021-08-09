const MetaCoin = artifacts.require("MetaCoin.sol");
const FarmBasic = artifacts.require("FarmBasic.sol");

var prefix = "equity";

// pid: 423
// contract: 0x73feaa1ee314f8c655e354234017be2193c9e24e
// liquidity: 0xec6557348085aa57c72514d67070dc863c0a5a8c
// token1 USDC: 0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d 
// token2 BUSD: 0x55d398326f99059ff775485246999027b3197955 
// PCS Router: 0x10ed43c718714eb63d5aa57b78b54704e256024e

// balance WEI : 968417212915858001

module.exports = function(deployer, network, accounts) {
  deployer.deploy(MetaCoin, "MetaCoin", "META").then(function() {
    return deployer.deploy(FarmBasic, accounts[8], accounts[9], accounts[7], MetaCoin.address, accounts[6], 1, prefix + "MetaCoin", prefix + "META");
  });
};