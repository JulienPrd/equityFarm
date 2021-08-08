// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./libs/IPancakeswapFarm.sol";

contract FarmBasic is ERC20, Ownable {

    ERC20 private farmToken; // can be CAKE or liquidity such as BUSD-USDT

    uint256  private _farmPid;
    bool private isActive;
    address private _farmContractAddress;

    mapping (address => uint256) public tokenInputBalances;

    modifier onlyActive() {
        assert(isActive == true);
        _;
    }

    constructor(
        address farmTokenAddress, 
        address farmContractAddress, // address of farm, eg, PCS, Thugs etc.
        uint256 farmPid, // pid of pool in farmContractAddress
        string memory name, 
        string memory symbol
    ) ERC20(name, symbol) Ownable() {
        isActive = false;
        _farmPid = farmPid;
        _farmContractAddress = farmContractAddress;
        farmToken = ERC20(farmTokenAddress);
    }

    function depositFarmTokens(uint amount) public onlyActive {
        bool sent = farmToken.transferFrom(msg.sender, address(this), amount);
        require(sent, "farmToken deposit failed");

        _mint(msg.sender, amount);
    }

    function withdrawFarmTokens() public onlyActive {
        uint256 amount = balanceOf(msg.sender);
        require(amount > 0, "nothing to withdraw");

        bool sent = farmToken.transfer(msg.sender, amount);
        require(sent, "farmToken withdraw failed");

        _burn(msg.sender, amount);
    }

    function farm() public {
        uint256 wantAmt = farmToken.balanceOf(address(this));
        farmToken.increaseAllowance(_farmContractAddress, wantAmt);

        IPancakeswapFarm(_farmContractAddress).deposit(_farmPid, wantAmt);
    }

    function unfarm(uint256 wantAmt) public {
        IPancakeswapFarm(_farmContractAddress).withdraw(_farmPid, wantAmt);
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