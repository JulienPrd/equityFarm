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

    uint256  private farmPid;
    bool private isActive;
    address private farmContractAddress;

    address public earnedAddress; // CAKE or whatever

    address public token0Address;
    address public token1Address;
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
    event LiquidityStatus(uint256 totalSupply, uint256 wantTokens, uint256 wantAmtValue);

    modifier onlyActive() {
        assert(isActive == true);
        _;
    }

    constructor(
        address[] memory _earnedToToken0Path,
        address[] memory _earnedToToken1Path,
        address _token0Address,
        address _token1Address,
        address _uniRouterAddress,
        address _wantTokenAddress, 
        address _earnedAddress,
        address _farmContractAddress, // address of farm, eg, PCS, Thugs etc.
        uint256 _farmPid, // pid of pool in farmContractAddress
        string memory name, 
        string memory symbol
    ) ERC20(name, symbol) Ownable() {
        earnedAddress = _earnedAddress;
        earnedToToken0Path = _earnedToToken0Path;
        earnedToToken1Path = _earnedToToken1Path;
        token0Address = _token0Address;
        token1Address = _token1Address;
        uniRouterAddress = _uniRouterAddress;
        isActive = false;
        farmPid = _farmPid;
        farmContractAddress = _farmContractAddress;
        wantTokenAddress = _wantTokenAddress;
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
    function depositFarm() public {
        uint256 wantAmt = IERC20(wantTokenAddress).balanceOf(address(this));
        if (wantAmt > 0) {
            IERC20(wantTokenAddress).safeIncreaseAllowance(farmContractAddress, wantAmt);
            IPancakeswapFarm(farmContractAddress).deposit(farmPid, wantAmt);
        }
    }

    function withdrawFarm(uint256 wantAmt) public {
        IPancakeswapFarm(farmContractAddress).withdraw(farmPid, wantAmt);
    }

    function earn() public onlyActive {
        // Harvest farm tokens
        withdrawFarm(0);

        // Converts farm tokens into want tokens
        uint256 earnedAmt = IERC20(earnedAddress).balanceOf(address(this));

        IERC20(earnedAddress).approve(uniRouterAddress, 0);
        IERC20(earnedAddress).safeIncreaseAllowance(uniRouterAddress, earnedAmt);

        if (earnedAddress != token0Address) {
            // Swap half earned to token0
            swap(
                uniRouterAddress,
                earnedAmt.div(2),
                slippageFactor,
                earnedToToken0Path,
                address(this),
                block.timestamp.add(600)
            );
        }

        if (earnedAddress != token1Address) {
            // Swap half earned to token1
            swap(
                uniRouterAddress,
                earnedAmt.div(2),
                slippageFactor,
                earnedToToken1Path,
                address(this),
                block.timestamp.add(600)
            );
        }

        // Get want tokens, ie. add liquidity
        uint256 token0Amt = IERC20(token0Address).balanceOf(address(this));
        uint256 token1Amt = IERC20(token1Address).balanceOf(address(this));
        if (token0Amt > 0 && token1Amt > 0) {
            IERC20(token0Address).safeIncreaseAllowance(
                uniRouterAddress,
                token0Amt
            );
            IERC20(token1Address).safeIncreaseAllowance(
                uniRouterAddress,
                token1Amt
            );
            IPancakeRouter02(uniRouterAddress).addLiquidity(
                token0Address,
                token1Address,
                token0Amt,
                token1Amt,
                0,
                0,
                address(this),
                block.timestamp.add(600)
            );
        }

        depositFarm();
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