const MetaCoin = artifacts.require("MetaCoin.sol");
const FarmBasic = artifacts.require("FarmBasic.sol");
const RewardToken = artifacts.require("RewardToken.sol");

var prefix = "equity";

// Cronos :
// earned address = 0xadbd1231fb360047525BEdF962581F3eee7b49fe (CRONA)
// path = ["0xadbd1231fb360047525BEdF962581F3eee7b49fe","0xc21223249CA28397B4B6541dfFaEcC539BfF0c59"]
// router = 0xcd7d16fB918511BF7269eC4f48d61D79Fb26f918
// wantToken = 0x0625A68D25d304aed698c806267a4e369e8Eb12a (CRO-USDC)
// farmContract = 0x77ea4a4cF9F77A034E4291E8f457Af7772c2B254

// pid: 423
// contract: 0x73feaa1ee314f8c655e354234017be2193c9e24e
// liquidity: 0xec6557348085aa57c72514d67070dc863c0a5a8c
// token1 USDC: 0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d 
// token2 BUSD: 0x55d398326f99059ff775485246999027b3197955 
// PCS Router: 0x10ed43c718714eb63d5aa57b78b54704e256024e

// balance WEI : 968417212915858001

module.exports = function(deployer, network, accounts) {

  deployer.deploy(RewardToken, "RewardToken", "REWARD").then(function() {

    return deployer.deploy(MetaCoin, "MetaCoin", "META").then(function() {

      var earnedAddress = RewardToken.address;
      var wantToken = MetaCoin.address;
      var token0 = accounts[8];
      var token1 = accounts[9];
      var router = accounts[7];
      var farmContract = accounts[5];
      
      return deployer.deploy(
          FarmBasic,
          [earnedAddress, token0],
          router, 
          wantToken,
          earnedAddress, 
          farmContract, 
          prefix + "MetaCoin", 
          prefix + "META"
        );
      
    });

  });

};