const FarmBasic = artifacts.require("FarmBasic");
const MetaCoin = artifacts.require("MetaCoin");
const RewardToken = artifacts.require("RewardToken");
const Web3 = require('web3');

contract('FarmBasic', (accounts) => {

  const depositWithdraw = 1000;

  const account3Deposit = 3000;
  const account2Deposit = 2000;
  const account1Deposit = 1000;

  async function wantBalance() {
    const farmInstance = await FarmBasic.deployed();
    return parseInt(web3.utils.fromWei(String(await farmInstance.totalWantBalance()), 'ether'));
  }

  async function inputTokenBalance(address) {
    const inputTokenInstance = await MetaCoin.deployed();
    return parseInt(web3.utils.fromWei(String(await inputTokenInstance.balanceOf.call(address)), 'ether'));
  }

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
      await inputTokenInstance.transfer(account2, web3.utils.toWei(String(account2Deposit * 4)), { from: accountOne });
      await inputTokenInstance.transfer(account3, web3.utils.toWei(String(account3Deposit)), { from: accountOne });

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
    const amountWei1 = web3.utils.toWei(String(account1Deposit));
    const amountWei2 = web3.utils.toWei(String(account2Deposit));
    const amountWei3 = web3.utils.toWei(String(account3Deposit));

    await inputTokenInstance.increaseAllowance(FarmBasic.address, amountWei1, { from: account1 });
    await farmInstance.deposit(amountWei1, { from: account1 });

    await inputTokenInstance.increaseAllowance(FarmBasic.address, amountWei2, { from: account2 });
    await farmInstance.deposit(amountWei2, { from: account2 });

    await inputTokenInstance.increaseAllowance(FarmBasic.address, amountWei3, { from: account3 });
    await farmInstance.deposit(amountWei3, { from: account3 });

    const farmBeforeWithdrawBalance = parseInt(web3.utils.fromWei(String(await inputTokenInstance.balanceOf.call(farmInstance.address)), 'ether'));
    assert.equal(farmBeforeWithdrawBalance, account1Deposit + account2Deposit + account3Deposit, "FarmBasic should now have 6000 MetaCoin");

    // withdraw account 2
    const beforeWithdrawBalance = parseInt(web3.utils.fromWei(String(await inputTokenInstance.balanceOf.call(account2)), 'ether'));
    await farmInstance.withdraw({from: account2});
    const farmAfterWithdrawBalance = parseInt(web3.utils.fromWei(String(await inputTokenInstance.balanceOf.call(farmInstance.address)), 'ether'));
    const afterWithdrawBalance = parseInt(web3.utils.fromWei(String(await inputTokenInstance.balanceOf.call(account2)), 'ether'));

    // check MetaCoin balance
    assert.equal(farmAfterWithdrawBalance, account1Deposit + account3Deposit, "FarmBasic should now have less MetaCoin");
    assert.equal(afterWithdrawBalance - beforeWithdrawBalance, account2Deposit, "Account2 should have its MetaCoin back");
  });

  it('simulate an earn in FarmBasic', async () => {
    const farmInstance = await FarmBasic.deployed();
    const inputTokenInstance = await MetaCoin.deployed();

    const account0 = accounts[0];
    const account1 = accounts[1]; // has 1000
    const account2 = accounts[2]; // has 0
    const account3 = accounts[3]; // has 3000

    // earn simulated
    const amount = 1000;
    const beforeWithdrawBalance = parseInt(web3.utils.fromWei(String(await inputTokenInstance.balanceOf.call(farmInstance.address)), 'ether'));
    await inputTokenInstance.transfer(farmInstance.address, web3.utils.toWei(String(amount)), { from: account0 });

    assert.equal(await wantBalance(), account1Deposit + account3Deposit + amount, "Wrong amount of MetaCoin from earn");
  });

  it('simulate a withdraw after an earn', async () => {
    const farmInstance = await FarmBasic.deployed();
    const inputTokenInstance = await MetaCoin.deployed();

    const account1 = accounts[1];
    const account3 = accounts[3];
    const amount = 1000;

    const account3BalanceBefore = await inputTokenBalance(account3);
    const account1BalanceBefore = await inputTokenBalance(account1);

    // withdraw account3
    const rate1 = (account3Deposit + account1Deposit + amount) / (account3Deposit + account1Deposit);
    await farmInstance.withdraw({from: account3});
    assert.equal(await inputTokenBalance(account3) - account3BalanceBefore, account3Deposit * rate1, "Account3 should have its MetaCoin back + interests");

    // withdraw account1
    const rate2 = (account1Deposit + amount*(account1Deposit/(account1Deposit+account3Deposit))) / account1Deposit;
    await farmInstance.withdraw({from: account1});
    assert.equal(await inputTokenBalance(account1) - account1BalanceBefore, account1Deposit * rate2, "Account1 should have its MetaCoin back + interests");

    assert.equal(await wantBalance(), 0, "Wrong amount of MetaCoin in FarmBasic");
  });

  it('simulate a complex deposit / withdraw / earn', async () => {
    const farmInstance = await FarmBasic.deployed();
    const inputTokenInstance = await MetaCoin.deployed();

    const account0 = accounts[0];
    const account1 = accounts[1];
    const account2 = accounts[2];
    const account3 = accounts[3];

    const amountWei1 = web3.utils.toWei(String(account1Deposit));
    const amountWei2 = web3.utils.toWei(String(account2Deposit));
    const amountWei3 = web3.utils.toWei(String(account3Deposit));

    var account1BalanceAfter = 0;
    var account2BalanceAfter = 0;
    var account3BalanceAfter = 0;
    var beforeWithdrawBalance = 0;
    var contractBalance = 0;

    // account1 deposit 1000
    contractBalance = account1Deposit;
    await inputTokenInstance.increaseAllowance(FarmBasic.address, amountWei1, { from: account1 });
    await farmInstance.deposit(amountWei1, { from: account1 });
    const account1BalanceBefore = await inputTokenBalance(account1);
    assert.equal(await wantBalance(), contractBalance, "Wrong amount of MetaCoin in FarmBasic");

    // earn 1000
    contractBalance = account1Deposit + 1000;
    await inputTokenInstance.transfer(farmInstance.address, web3.utils.toWei(String(1000)), { from: account0 });
    assert.equal(await wantBalance(), contractBalance, "Wrong amount of MetaCoin in FarmBasic");

    // account2 deposit 2000
    contractBalance = account1Deposit + 1000 + account2Deposit;
    await inputTokenInstance.increaseAllowance(FarmBasic.address, amountWei2, { from: account2 });
    await farmInstance.deposit(amountWei2, { from: account2 });
    assert.equal(await wantBalance(), contractBalance, "Wrong amount of MetaCoin in FarmBasic");

    // earn 1000
    contractBalance = account1Deposit + 1000 + account2Deposit + 1000;
    beforeWithdrawBalance = await inputTokenBalance(farmInstance.address);
    await inputTokenInstance.transfer(farmInstance.address, web3.utils.toWei(String(1000)), { from: account0 });
    assert.equal(await wantBalance(), contractBalance, "Wrong amount of MetaCoin in FarmBasic");

    // withdraw account1 -> -1000
    var wantBeforBalance = await wantBalance();
    assert.equal(await inputTokenBalance(account1), account1BalanceBefore, "Account1 wrong MetaCoin");
    await farmInstance.withdraw({from: account1});
    var ratio = ((1000 + 1000 + account1Deposit + account2Deposit)/(account1Deposit + account2Deposit)) - 1;
    var interestAcc1 = account1Deposit * ratio;
    contractBalance = wantBeforBalance - (account1Deposit + interestAcc1);
    assert.equal(await inputTokenBalance(account1) - account1BalanceBefore, parseInt(account1Deposit + interestAcc1), "Account1 should have its MetaCoin back + interests");
    assert.equal(await wantBalance(), parseInt(contractBalance), "Wrong amount of MetaCoin in FarmBasic");

    // account3 deposit
    contractBalance = 1000 + account2Deposit + 1000 + account3Deposit - interestAcc1;
    await inputTokenInstance.increaseAllowance(FarmBasic.address, amountWei3, { from: account3 });
    await farmInstance.deposit(amountWei3, { from: account3 });
    assert.equal(await wantBalance(), parseInt(contractBalance), "Wrong amount of MetaCoin in FarmBasic");

    // account2 deposit more
    contractBalance = 1000 + account2Deposit + 1000 + account3Deposit - interestAcc1 + account2Deposit;
    await inputTokenInstance.increaseAllowance(FarmBasic.address, amountWei2, { from: account2 });
    await farmInstance.deposit(amountWei2, { from: account2 });
    assert.equal(await wantBalance(), parseInt(contractBalance), "Wrong amount of MetaCoin in FarmBasic");

    // earn 1000
    contractBalance = 1000 + account2Deposit + 1000 + account3Deposit - interestAcc1 + account2Deposit + 1000;
    beforeWithdrawBalance = await inputTokenBalance(farmInstance.address);
    await inputTokenInstance.transfer(farmInstance.address, web3.utils.toWei(String(1000)), { from: account0 });
    assert.equal(await wantBalance(), parseInt(contractBalance), "Wrong amount of MetaCoin in FarmBasic");

    // withdraw account2
    const account2BalanceBefore = await inputTokenBalance(account2);
    var ratio = (contractBalance / (account2Deposit + account2Deposit + account3Deposit)) - 1;
    var interestAcc2 = (account2Deposit + account2Deposit) * ratio;
    contractBalance = 1000 + 1000 + account3Deposit - interestAcc1 + 1000 - interestAcc2;
    await farmInstance.withdraw({from: account2});
    assert.equal(await inputTokenBalance(account2) - account2BalanceBefore, parseInt(account2Deposit*2 + interestAcc2), "Account2 should have its MetaCoin back + interests");
    assert.equal(await wantBalance(), parseInt(contractBalance), "Wrong amount of MetaCoin in FarmBasic");

    // withdraw account3
    const account3BalanceBefore = await inputTokenBalance(account3);
    var ratio = (contractBalance / (account3Deposit)) - 1;
    var interestAcc3 = account3Deposit * ratio;
    contractBalance = 1000 + 1000 - interestAcc1 + 1000 - interestAcc2 - interestAcc3;
    await farmInstance.withdraw({from: account3});
    assert.equal(await inputTokenBalance(account3) - account3BalanceBefore, parseInt(account3Deposit + interestAcc3), "Account2 should have its MetaCoin back + interests");

    assert.equal(await wantBalance(), 0, "Wrong amount of MetaCoin in FarmBasic");
  });

});