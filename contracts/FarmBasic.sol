// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./libs/IPancakeswapFarm.sol";

contract FarmBasic is ERC20, Ownable {

    IERC20 private farmToken; // can be a single asset or a liquidity such as BUSD-USDT

    uint256  private _farmPid;
    bool private isActive;
    address private farmContractAddress;
    address public earnedAddress; // CAKE or whatever

    address public token0Address;
    address public token1Address;
    address public uniRouterAddress; // uniswap, pancakeswap etc

    uint256 public controllerFee = 0; // 70;
    uint256 public constant controllerFeeMax = 10000; // 100 = 1%
    uint256 public constant controllerFeeUL = 300;

    uint256 public entranceFeeFactor = 9990; // < 0.1% entrance fee - goes to pool + prevents front-running
    uint256 public constant entranceFeeFactorMax = 10000;
    uint256 public constant entranceFeeFactorLL = 9950; // 0.5% is the max entrance fee settable. LL = lowerlimit

    uint256 public withdrawFeeFactor = 10000; // 0.1% withdraw fee - goes to pool
    uint256 public constant withdrawFeeFactorMax = 10000;
    uint256 public constant withdrawFeeFactorLL = 9950; // 0.5% is the max entrance fee settable. LL = lowerlimit

    uint256 public slippageFactor = 950; // 5% default slippage tolerance
    uint256 public constant slippageFactorUL = 995;

    address[] public earnedToToken0Path;
    address[] public earnedToToken1Path;

    event SetSettings(
        uint256 _entranceFeeFactor,
        uint256 _withdrawFeeFactor,
        uint256 _controllerFee,
        uint256 _buyBackRate,
        uint256 _slippageFactor
    );
    event SetFarmContractAddress(address _farmContractAddress);


    modifier onlyActive() {
        assert(isActive == true);
        _;
    }

    constructor(
        address _farmTokenAddress, 
        address _farmContractAddress, // address of farm, eg, PCS, Thugs etc.
        uint256 _farmPid, // pid of pool in farmContractAddress
        string memory name, 
        string memory symbol
    ) ERC20(name, symbol) Ownable() {
        isActive = false;
        farmPid = _farmPid;
        farmContractAddress = _farmContractAddress;
        farmToken = ERC20(_farmTokenAddress);
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
        uint256 wantAmt = IERC20(farmToken).balanceOf(address(this));
        IERC20(farmToken).approve(farmContractAddress, wantAmt);

        IPancakeswapFarm(farmContractAddress).deposit(farmPid, wantAmt);
    }

    function earn() public onlyActive {
        // Harvest farm tokens
        farm();

        // Converts farm tokens into want tokens
        uint256 earnedAmt = IERC20(earnedAddress).balanceOf(address(this));

        IERC20(earnedAddress).approve(uniRouterAddress, 0);
        IERC20(earnedAddress).increaseAllowance(uniRouterAddress, earnedAmt);
    }

    function unfarm(uint256 wantAmt) public {
        IPancakeswapFarm(farmContractAddress).withdraw(farmPid, wantAmt);
    }

    function redeemRewards() public onlyActive {

    }

    function activate(bool value) public onlyOwner {
        isActive = value;
    }

    function isActivated() public view returns(bool) {
        return isActive;
    }

    function setUniRouterAddress(address _farmContractAddress) public virtual onlyOwner{
        farmContractAddress = _farmContractAddress;
        emit SetFarmContractAddress(_farmContractAddress);
    }

    function setSettings(
        uint256 _entranceFeeFactor,
        uint256 _withdrawFeeFactor,
        uint256 _controllerFee,
        uint256 _buyBackRate,
        uint256 _slippageFactor
    ) public virtual onlyOwner {
        require(
            _entranceFeeFactor >= entranceFeeFactorLL,
            "_entranceFeeFactor too low"
        );
        require(
            _entranceFeeFactor <= entranceFeeFactorMax,
            "_entranceFeeFactor too high"
        );
        entranceFeeFactor = _entranceFeeFactor;

        require(
            _withdrawFeeFactor >= withdrawFeeFactorLL,
            "_withdrawFeeFactor too low"
        );
        require(
            _withdrawFeeFactor <= withdrawFeeFactorMax,
            "_withdrawFeeFactor too high"
        );
        withdrawFeeFactor = _withdrawFeeFactor;

        require(_controllerFee <= controllerFeeUL, "_controllerFee too high");
        controllerFee = _controllerFee;

        require(_buyBackRate <= buyBackRateUL, "_buyBackRate too high");
        buyBackRate = _buyBackRate;

        require(
            _slippageFactor <= slippageFactorUL,
            "_slippageFactor too high"
        );
        slippageFactor = _slippageFactor;

        emit SetSettings(
            _entranceFeeFactor,
            _withdrawFeeFactor,
            _controllerFee,
            _buyBackRate,
            _slippageFactor
        );
    }
}