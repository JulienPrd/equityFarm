// SPDX-License-Identifier: MIT
pragma solidity ^0.5.16;

import "../contracts/openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "../contracts/openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "../contracts/openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract FarmBasic is ERC20, ERC20Detailed, Ownable {

    //address public farmContractAddress; // address of farm, eg, PCS, Thugs etc.
    //uint256 public pid; // pid of pool in farmContractAddress
    ERC20 public farmToken; // can be CAKE or liquidity such as BUSD-USDT

    bool private isActive;

    mapping (address => uint256) public tokenInputBalances;

    modifier onlyActive() {
        assert(isActive == true);
        _;
    }

    constructor(address farmTokenAddress, string memory name, string memory symbol, uint8 decimals) ERC20Detailed(name, symbol, decimals) Ownable() public {
        isActive = false;
        farmToken = ERC20(farmTokenAddress);
    }

    function depositFarmTokens(uint amount) public onlyActive {
    	bool sent = farmToken.transferFrom(msg.sender, address(this), amount);
		require(sent, "farmToken deposit failed");

 		_mint(msg.sender, amount);
    }

    function withdrawFarmTokens() public onlyActive {
		uint256 amount = _balances[msg.sender];
		require(amount > 0, "nothing to withdraw");

		bool sent = farmToken.transfer(msg.sender, amount);
		require(sent, "farmToken withdraw failed");

		_burn(msg.sender, amount);
    }

    function redeemRewards() public onlyActive {

    }

    function activate(bool value) public onlyOwner {
        isActive = value;
    }

    function isActivated() public view returns(bool) {
        return isActive;
    }
}