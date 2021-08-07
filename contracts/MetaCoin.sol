// SPDX-License-Identifier: MIT
pragma solidity ^0.5.16;

import "../contracts/openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "../contracts/openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "../contracts/openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract MetaCoin is ERC20, ERC20Detailed, Ownable {
  constructor(string memory name, string memory symbol, uint8 decimals, uint256 totalSupply) ERC20Detailed(name, symbol, decimals) public {
        _mint(owner(), totalSupply * 10 ** uint(decimals));
    }
}