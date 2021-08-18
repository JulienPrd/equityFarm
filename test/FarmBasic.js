const FarmBasic = artifacts.require("FarmBasic");
const MetaCoin = artifacts.require("MetaCoin");
const RewardToken = artifacts.require("RewardToken");
const Web3 = require('web3');

contract('FarmBasic', (accounts) => {

  const depositWithdraw = 1000;

  it('check owner', async () => {
      const farmInstance = await FarmBasic.deployed();
      const ownerAddress = await farmInstance.owner();

      assert.equal(accounts[0], ownerAddress, "wrong owner");
      assert.notEqual(accounts[1], ownerAddress, "wrong owner");
  });

   it('should transfert MetaCoin to AccountTwo', async () => {
      const inputTokenInstance = await MetaCoin.deployed();
      const rewardTokenInstance = await RewardToken.deployed();

      const accountOne = accounts[0];
      const accountTwo = accounts[1];
      const account2 = accounts[2];
      const account3 = accounts[3];

      const amount = 10000;
      await inputTokenInstance.transfer(accountTwo, web3.utils.toWei(String(amount)), { from: accountOne });

      // and 2 and 3 ...
      await inputTokenInstance.transfer(account2, web3.utils.toWei(String(amount)), { from: accountOne });
      await inputTokenInstance.transfer(account3, web3.utils.toWei(String(amount)), { from: accountOne });

      // transfer RewardToken to accountTwo
      await rewardTokenInstance.transfer(accountTwo, web3.utils.toWei(String(amount)), { from: accountOne });

      const accountTwoEndingBalance = parseInt(web3.utils.fromWei(String(await inputTokenInstance.balanceOf.call(accountTwo)), 'ether'));
      assert.equal(accountTwoEndingBalance, amount, "InputToken: Amount wasn't correctly sent to account 2");

       const rewardEndingBalance = parseInt(web3.utils.fromWei(String(await rewardTokenInstance.balanceOf.call(accountTwo)), 'ether'));
      assert.equal(rewardEndingBalance, amount, "RewardToken: Amount wasn't correctly sent to account 2");
  });

  it('should active FarmBasic', async () => {
      const farmInstance = await FarmBasic.deployed();
      const owner = accounts[0];
      const accountTwo = accounts[2];

      await farmInstance.activate(true, {from: owner});
      const active = (await farmInstance.isActivated({from: accountTwo})).valueOf();
      assert.equal(active, true, "FarmBasic should be active");
  });

  it('should put 1000 MetaCoin in the FarmBasic', async () => {
    const farmInstance = await FarmBasic.deployed();
    const inputTokenInstance = await MetaCoin.deployed();

    const account = accounts[1];
    const amountWei = web3.utils.toWei(String(depositWithdraw));

    const accountStartingFarmBasicBalance = parseInt(web3.utils.fromWei(String(await farmInstance.balanceOf.call(account)), 'ether'));
    const accountOneStartingBalance = parseInt(web3.utils.fromWei(String(await inputTokenInstance.balanceOf.call(account)), 'ether'));

    const balanceStart = parseInt(web3.utils.fromWei(String(await inputTokenInstance.balanceOf.call(farmInstance.address)), 'ether'));
    assert.equal(balanceStart.valueOf(), 0, "FarmBasic should have 0 MetaCoin");

    // approve tokens
    await inputTokenInstance.increaseAllowance(FarmBasic.address, amountWei, { from: account });

    // deposit tokens (TODO: not to be mandatory)
    await farmInstance.deposit(amountWei, { from: account });

    // check MetaCoin balance
    const balanceEnd = await inputTokenInstance.balanceOf.call(farmInstance.address);
    assert.equal(balanceEnd.valueOf(), amountWei, "FarmBasic should have " + depositWithdraw.valueOf() + " MetaCoin");
    const accountOneEndingBalance = parseInt(web3.utils.fromWei(String(await inputTokenInstance.balanceOf.call(account)), 'ether'));
    assert.equal(accountOneEndingBalance, accountOneStartingBalance - depositWithdraw, "Account should now have 0 MetaCoin");

    // check FarmBasic token balance
    const accountEndingFarmBasicBalance = parseInt(web3.utils.fromWei(String(await farmInstance.balanceOf.call(account)), 'ether'));
    assert.equal(accountEndingFarmBasicBalance, accountStartingFarmBasicBalance + depositWithdraw, "Account should now have " + depositWithdraw.valueOf() + " equityMetaCoin");
  });

 it('should withdraw 1000 MetaCoin from the FarmBasic', async () => {
    const farmInstance = await FarmBasic.deployed();
    const inputTokenInstance = await MetaCoin.deployed();
    const account = accounts[1];
    const amountWei = web3.utils.toWei(String(depositWithdraw));

    // withdraw
    const accountOneStartingBalance = parseInt(web3.utils.fromWei(String(await inputTokenInstance.balanceOf.call(account)), 'ether'));
    await farmInstance.withdraw({from: account});

    // check MetaCoin balance
    const balance = parseInt(web3.utils.fromWei(String(await inputTokenInstance.balanceOf.call(farmInstance.address)), 'ether'));
    assert.equal(balance, 0, "FarmBasic should now have 0 MetaCoin");
    const accountBalanceAfterWithdraw = parseInt(web3.utils.fromWei(String(await inputTokenInstance.balanceOf.call(account)), 'ether'));
    assert.equal(accountBalanceAfterWithdraw, accountOneStartingBalance + depositWithdraw, "Account should have its MetaCoin back");

    // check equityMetaCoin balance
    const endEquityMetaCoinBalance = parseInt(web3.utils.fromWei(String(await farmInstance.balanceOf.call(account)), 'ether'));
    assert.equal(endEquityMetaCoinBalance, 0, "Account should now have 0 equityMetaCoin");
  });

  it('should put many MetaCoin from 3 accounts in the FarmBasic', async () => {
    const farmInstance = await FarmBasic.deployed();
    const inputTokenInstance = await MetaCoin.deployed();

    const account1 = accounts[1];
    const account2 = accounts[2];
    const account3 = accounts[3];
    const amountWei1 = web3.utils.toWei(String(depositWithdraw * 1));
    const amountWei2 = web3.utils.toWei(String(depositWithdraw * 2));
    const amountWei3 = web3.utils.toWei(String(depositWithdraw * 3));

    await inputTokenInstance.increaseAllowance(FarmBasic.address, amountWei1, { from: account1 });
    await farmInstance.deposit(amountWei1, { from: account1 });

    await inputTokenInstance.increaseAllowance(FarmBasic.address, amountWei2, { from: account2 });
    await farmInstance.deposit(amountWei2, { from: account2 });

    await inputTokenInstance.increaseAllowance(FarmBasic.address, amountWei3, { from: account3 });
    await farmInstance.deposit(amountWei3, { from: account3 });

    const farmBeforeWithdrawBalance = parseInt(web3.utils.fromWei(String(await inputTokenInstance.balanceOf.call(farmInstance.address)), 'ether'));
    assert.equal(farmBeforeWithdrawBalance, depositWithdraw + depositWithdraw * 2 + depositWithdraw * 3, "FarmBasic should now have 6000 MetaCoin");

    // withdraw account 2
    const beforeWithdrawBalance = parseInt(web3.utils.fromWei(String(await inputTokenInstance.balanceOf.call(account2)), 'ether'));
    await farmInstance.withdraw({from: account2});
    const farmAfterWithdrawBalance = parseInt(web3.utils.fromWei(String(await inputTokenInstance.balanceOf.call(farmInstance.address)), 'ether'));
    const afterWithdrawBalance = parseInt(web3.utils.fromWei(String(await inputTokenInstance.balanceOf.call(account2)), 'ether'));

    // check MetaCoin balance
    assert.equal(farmAfterWithdrawBalance, depositWithdraw + depositWithdraw * 3, "FarmBasic should now have less MetaCoin");
    assert.equal(afterWithdrawBalance - beforeWithdrawBalance, depositWithdraw * 2, "Account2 should have its MetaCoin back");
  });

  it('depositFarm from FarmBasic', async () => {
    const farmInstance = await FarmBasic.deployed();
    const inputTokenInstance = await MetaCoin.deployed();

    const account1 = accounts[1];
    await farmInstance.depositFarm({from: account1});
  });

});