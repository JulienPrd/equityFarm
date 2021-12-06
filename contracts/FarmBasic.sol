// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./libs/IPancakeswapFarm.sol";
import "./libs/IPancakeRouter02.sol";
import "./libs/IPancakeRouter01.sol";

contract FarmBasic is ERC20, Ownable {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address private wantTokenAddress; // can be a single asset or a liquidity such as BUSD-USDT

    bool private isActive;
    address private farmContractAddress;

    address public earnedAddress; // CAKE or whatever
    address public uniRouterAddress; // uniswap, pancakeswap etc

    uint256 public buyBackRate = 0; // 250;
    uint256 public constant buyBackRateMax = 10000; // 100 = 1%
    uint256 public constant buyBackRateUL = 800;

    uint256 public controllerFee = 0; // 70;
    uint256 public constant controllerFeeMax = 10000; // 100 = 1%
    uint256 public constant controllerFeeUL = 300;

    uint256 public entranceFeeFactor = 10000; // < 0.1% entrance fee - goes to pool + prevents front-running
    uint256 public constant entranceFeeFactorMax = 10000;
    uint256 public constant entranceFeeFactorLL = 9950; // 0.5% is the max entrance fee settable. LL = lowerlimit

    uint256 public withdrawFeeFactor = 10000; // 0.1% withdraw fee - goes to pool
    uint256 public constant withdrawFeeFactorMax = 10000;
    uint256 public constant withdrawFeeFactorLL = 9950; // 0.5% is the max entrance fee settable. LL = lowerlimit

    uint256 public slippageFactor = 950; // 5% default slippage tolerance
    uint256 public constant slippageFactorUL = 995;

    address[] public earnedToTokenPath;

    event SetSettings(
        uint256 _entranceFeeFactor,
        uint256 _withdrawFeeFactor,
        uint256 _controllerFee,
        uint256 _buyBackRate,
        uint256 _slippageFactor
    );
    event SetFarmContractAddress(address _farmContractAddress);
    event LiquidityStatus(uint256 totalSupply, uint256 wantTokens, uint256 wantAmtValue);

    modifier onlyActive() {
        assert(isActive == true);
        _;
    }

    constructor(
        address[] memory _earnedToTokenPath,
        address _uniRouterAddress,
        address _wantTokenAddress, 
        address _earnedAddress,
        address _farmContractAddress, // address of farm, eg, PCS, Thugs etc.
        string memory name, 
        string memory symbol
    ) ERC20(name, symbol) Ownable() {
        earnedAddress = _earnedAddress;
        earnedToTokenPath = _earnedToTokenPath;
        uniRouterAddress = _uniRouterAddress;
        isActive = false;
        farmContractAddress = _farmContractAddress;
        wantTokenAddress = _wantTokenAddress;
    }

    function approveWant(uint wantAmt) public onlyActive {
        ERC20(wantTokenAddress).approve(msg.sender, wantAmt);
    }

    function deposit(uint wantAmt) public onlyActive {
        IERC20(wantTokenAddress).transferFrom(msg.sender, address(this), wantAmt);
        _mint(msg.sender, wantAmt);
    }

    function withdraw() public onlyActive {
        uint256 wantDepositAmt = balanceOf(msg.sender);
        require(wantDepositAmt > 0, "nothing to withdraw");

        uint256 wantAmtValue = wantDepositAmt.mul(totalWantBalance()).div(totalSupply());
        emit LiquidityStatus(totalSupply(), totalWantBalance(), wantAmtValue);

        ERC20(wantTokenAddress).approve(msg.sender, wantAmtValue);
        IERC20(wantTokenAddress).transfer(msg.sender, wantAmtValue);

        _burn(msg.sender, wantDepositAmt);
    }

    function totalWantBalance() public view returns(uint256) {
        return IERC20(wantTokenAddress).balanceOf(address(this));
    }

    /// deposit available wantToken in this contract to the Farm
    function depositFarm(uint256 farmPid) public {
        uint256 wantAmt = IERC20(wantTokenAddress).balanceOf(address(this));
        if (wantAmt > 0) {
            IERC20(wantTokenAddress).safeIncreaseAllowance(farmContractAddress, wantAmt);
            IPancakeswapFarm(farmContractAddress).deposit(farmPid, wantAmt);
        }
    }

    function withdrawFarm(uint256 farmPid, uint256 wantAmt) public {
        IPancakeswapFarm(farmContractAddress).withdraw(farmPid, wantAmt);
    }

    function earnAndSwap(uint256 farmPid) public onlyActive {
        // harvest rewards
        uint256 earnedAmt = IERC20(earnedAddress).balanceOf(address(this));
        IPancakeswapFarm(farmContractAddress).deposit(farmPid, 0);

        // swap to desired coin
        IERC20(earnedAddress).approve(uniRouterAddress, 0);
        IERC20(earnedAddress).safeIncreaseAllowance(uniRouterAddress, earnedAmt);

       swap(
            uniRouterAddress,
            earnedAmt,
            slippageFactor,
            earnedToTokenPath,
            address(this),
            block.timestamp.add(600)
        );
    }

    function activate(bool value) public onlyOwner {
        isActive = value;
    }

    function isActivated() public view returns(bool) {
        return isActive;
    }

    function swap(
        address _uniRouterAddress,
        uint256 _amountIn,
        uint256 _slippageFactor,
        address[] memory _path,
        address _to,
        uint256 _deadline
    ) internal virtual {
        uint256[] memory amounts =
            IPancakeRouter02(_uniRouterAddress).getAmountsOut(_amountIn, _path);
        uint256 amountOut = amounts[amounts.length.sub(1)];

        IPancakeRouter02(_uniRouterAddress)
            .swapExactTokensForTokensSupportingFeeOnTransferTokens(
            _amountIn,
            amountOut.mul(_slippageFactor).div(1000),
            _path,
            _to,
            _deadline
        );
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