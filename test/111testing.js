
/* eslint-disable no-underscore-dangle */
const { assert, expect } = require('chai');
const { ethers, waffle } = require('hardhat');
const { BigNumber } = require('ethers');
const { time, constants } = require("@openzeppelin/test-helpers");
// const { provider } = waffle;


const { abi: AFIBASE_ABI } = require('../artifacts/contracts/AtvBase.sol/AtvBase.json');

const {
    // eslint-disable-next-line max-len
    ONEINCHEXCHANGE_ABI, ONEINCHEXCHANGE_ADDRESS, DAI_ABI, DAI_ADDRESS, SAI_ABI, SAI_ADDRESS, USDT_ABI, USDT_ADDRESS, USDC_ABI, USDC_ADDRESS,
} = require('../utils/constants');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');
const exp = require('constants');
const { zeroAddress } = require('ethereumjs-util');

const getBigNumber = (number) => ethers.BigNumber.from(number);

describe('AFiBase', () => {
    let platformWallet; let recipient; let investor1; let investor2;
    let deadline;
    let aTokenConInstance;
    let aTokenConInstance1;
    let oneInchParam;

    // eslint-disable-next-line no-unused-vars
    let daiConInstance;
    let usdcConInstance;
    let usdtConInstance;
    // let aFiDelayModule;

    beforeEach(async () => {

        const userAccounts = await ethers.getSigners();
        [platformWallet, recipient, investor1, investor2, other, gnosisWallet] = userAccounts;

        const currentTime = await time.latest();
        deadline = currentTime + (60 * 60);

        const AFiBase = await ethers.getContractFactory('AtvBase');
        const AFiManager = await ethers.getContractFactory('AtvManager');
        const PassiveRebalanceStrategies = await ethers.getContractFactory('AtvPassiveRebalanceStrategies');

        const AFiStorage = await ethers.getContractFactory('AtvStorage');
        const AFiFacotry = await ethers.getContractFactory('AtvFactory');
        const AFiOracle = await ethers.getContractFactory('AtvOracle');

        // LOCAL CONTRACTS
        aFiBaseInstace = await AFiBase.deploy("AFi802", "AFi");
        aFiManagerInstance = await AFiManager.deploy();
        aFiPassiveRebalanceInstance = await PassiveRebalanceStrategies.deploy();
        aFiAFiOracleInstance = await AFiOracle.deploy(aFiPassiveRebalanceInstance.address);
        // aFiDelayModule = await delayModule.deploy(86400, 172800);

        aFiFactoryInstance = await AFiFacotry.deploy(aFiBaseInstace.address);
        aFiStorageInstance = await AFiStorage.deploy(aFiManagerInstance.address, aFiAFiOracleInstance.address, aFiPassiveRebalanceInstance.address, aFiFactoryInstance.address);
        console.log("print the address of the aFiFactoryInstance", aFiFactoryInstance.address);

        const payload = [
            [
                "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // USDC
            ],
            [
                "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37"
            ]
        ]

        const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

        const payloadnew = [
            ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea"], //USDT, USDC - payment tokens
            ["0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a"], // USDT, USDC - chainlink oracles
            uDataPayload,
            [
                "0x25b13e42763a97dd4041f595220642B593962356"
            ],
            [
                "0x0000000000000000000000000000000000000000"
            ],
            [
                "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a"
            ],
            ["10000000"],
            [
                "0x0000000000000000000000000000000000000000"
            ],
            2
        ]

        const bytesPayload2 = await aFiFactoryInstance.encodePoolData(payloadnew);

        console.log("Create vault");

        result = await aFiFactoryInstance.createAToken("AFiBase", "ATOK", bytesPayload2, [investor1.address, investor2.address], true, aFiStorageInstance.address,
            aFiPassiveRebalanceInstance.address, aFiManagerInstance.address, [], "0x0000000000000000000000000000000000000000");

            console.log("Create vault");

        aTokenConInstance = await aFiFactoryInstance.aFiProducts(0);

        //let txObject = await result.wait()

        //console.log("result++++++++++++++++++++++++", txObject.events[11].args[0]);

        aTokenConInstance = await ethers.getContractAt(AFIBASE_ABI, aTokenConInstance);
        //console.log("result++++++++++++++++++++++++", await aTokenConInstance.getPriceOracle("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"));

        // MAINNET CONTRACT INSTANCES
        WETHConInstance = await ethers.getContractAt(DAI_ABI, "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37");
        usdcConInstance = await ethers.getContractAt(USDC_ABI, USDC_ADDRESS);
        usdtConInstance = await ethers.getContractAt(USDT_ABI, USDT_ADDRESS);

        const accountToInpersonate = "0xFf73Ba9e0669D7ead82421Ad105bC6D715606Ec4"
        const accountToFund = "0x7Bc58bD67b258b445E4528039BE14824f04d2422"

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [accountToInpersonate],
        });
        const signer = await ethers.getSigner(accountToInpersonate);



        const ether = (amount) => {
            const weiString = ethers.utils.parseEther(amount.toString());
            return BigNumber.from(weiString);
        };

        /**
        * GIVE APPROVAL TO AFi of DEPOSIT TOKEN
        * THIS IS REQUIRED WHEN 1% fee IS TRANSFEREED FROM INVESTOR TO PLATFORM WALLET
        */

        console.log("print the usdt address", usdtConInstance.address);

        await usdtConInstance.connect(investor1).approve(
            aTokenConInstance.address,
            ethers.constants.MaxUint256
        );

        await usdtConInstance.connect(investor2).approve(
            aTokenConInstance.address,
            ethers.constants.MaxUint256
        );

        await usdcConInstance.connect(investor1).approve(
            aTokenConInstance.address,
            ethers.constants.MaxUint256
        );

        await usdcConInstance.connect(investor2).approve(
            aTokenConInstance.address,
            ethers.constants.MaxUint256
        );

        // await daiConInstance.connect(investor1).approve(
        //     aTokenConInstance.address,
        //     ethers.constants.MaxUint256
        // );

        // await daiConInstance.connect(investor2).approve(
        //     aTokenConInstance.address,
        //     ethers.constants.MaxUint256
        // );

        const wethBalance = await WETHConInstance.balanceOf(accountToInpersonate)
        console.log("whale WETH balance", wethBalance);
        // await WETHConInstance.connect(signer).transfer(aTokenConInstance.address, "1000000000000");


        var usdtBalance = await usdtConInstance.balanceOf(accountToInpersonate);
        let usdcBalance = await usdcConInstance.balanceOf(accountToInpersonate);
        // usdcBalance = usdcBalance / 2;

        console.log("usdcBalance", usdcBalance);
        await usdcConInstance.connect(signer).transfer(investor1.address, usdcBalance);
        // // await usdcConInstance.connect(signer).transfer(investor2.address, usdcBalance);

        console.log("usdtBalance", usdtBalance)
        usdtBalance = usdtBalance / 100;
        console.log("usdtBalance", usdtBalance)
        await usdtConInstance.connect(signer).transfer(investor1.address, "1783822029");
        await usdtConInstance.connect(signer).transfer(investor2.address, "1783822029");
        await aFiPassiveRebalanceInstance.updateOracleData(usdtConInstance.address, "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b");
        await aFiPassiveRebalanceInstance.updateOracleData(usdcConInstance.address, "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a");

        await aTokenConInstance.setplatformWallet(platformWallet.address);
        await aFiPassiveRebalanceInstance.setPauseDepositController(aTokenConInstance.address, investor1.address);
        oneInchParam = {
            firstIterationUnderlyingSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            secondIterationUnderlyingSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            firstIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            secondIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"]
        }
        await aFiAFiOracleInstance.setAFiStorage(aFiStorageInstance.address);
        await aFiPassiveRebalanceInstance.setStorage(aFiStorageInstance.address);
        await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address);
        await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);
        await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address);
    });

    context('Basic checks for deposit and withdraw', () => {
        it('deploys AFiContract successfully', async () => {

            await aTokenConInstance.connect(investor1).deposit(1000000000, usdcConInstance.address);

            const nav1 = await aTokenConInstance.depositUserNav(investor1.address);
            console.log("user nav1", `${nav1}`);

            let NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage", `${NavfromStorage}`);
            console.log("deposit done");

            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

            const swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: usdcConInstance.address,
                cSwapFee: 1000000,
                cSwapCounter: 0,
                depositTokens: [usdtConInstance.address],
                minimumReturnAmount: [0],
                iMinimumReturnAmount: [0], // Adjust according to your contract's expectations
                underlyingTokens: [usdtConInstance.address],  // SOL], // Fill this array if your function expects specific tokens
                newProviders: [1], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);

            console.log("cs started");

            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);

            NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage", `${NavfromStorage}`);
            console.log("cs done");

            const Afterbal = await aTokenConInstance.balanceOf(
                investor1.address
            );
            console.log("Afterbal", `${Afterbal}`)

            const minimumReturnAmount = [0, 0, 0, 0, 0];

            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());
            
            const AfterwithusdcBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("Before withdraw user usdt balance", `${AfterwithusdcBalance}`)

            await aTokenConInstance.connect(investor1).withdraw(
                197801111576383300n, usdcConInstance.address, deadline, returnString, 3, 19541879
            );
            
            const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)

            NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage", `${NavfromStorage}`);
            console.log("withdraw done");
        });

        it('deploys AFiContract successfully', async () => {

            await aTokenConInstance.connect(investor1).deposit(1000000000, usdcConInstance.address);

            const nav1 = await aTokenConInstance.depositUserNav(investor1.address);
            console.log("user nav1", `${nav1}`);

            let NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage", `${NavfromStorage}`);
            console.log("deposit done");

            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

            const swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: usdcConInstance.address,
                cSwapFee: 1000000,
                cSwapCounter: 0,
                depositTokens: [usdtConInstance.address],
                minimumReturnAmount: [0],
                iMinimumReturnAmount: [0], // Adjust according to your contract's expectations
                underlyingTokens: [usdtConInstance.address],  // SOL], // Fill this array if your function expects specific tokens
                newProviders: [1], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);

            console.log("cs started");

            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);

            NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage", `${NavfromStorage}`);
            console.log("cs done");

            const Afterbal = await aTokenConInstance.balanceOf(
                investor1.address
            );
            console.log("Afterbal", `${Afterbal}`)

            const minimumReturnAmount = [0, 0, 0, 0, 0];

            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());
            
            const AfterwithusdcBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("Before withdraw user usdt balance", `${AfterwithusdcBalance}`)

            await aTokenConInstance.connect(investor1).withdraw(
                197801111576383300n, usdcConInstance.address, deadline, returnString, 3, 19541879
            );
            
            const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)

            NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage", `${NavfromStorage}`);
            console.log("withdraw done");

            await aFiAFiOracleInstance.connect(investor1).queueWithdraw(
                aTokenConInstance.address, 1000000000000000000n, usdcConInstance.address
            );
            
            var userQueuedShare = await aFiAFiOracleInstance.getUserQueuedShares(investor1.address, aTokenConInstance.address, usdcConInstance.address, 0);
            console.log("user's shares in queue", userQueuedShare);
            expect(Number(userQueuedShare)).to.greaterThan(0);
            
            await aFiAFiOracleInstance.connect(investor1).unqueueWithdraw(
                aTokenConInstance.address, usdcConInstance.address
            );
            
            userQueuedShare = await aFiAFiOracleInstance.getUserQueuedShares(investor1.address, aTokenConInstance.address, usdcConInstance.address, 0);
            console.log("user's shares to unqueue", userQueuedShare);
            expect(Number(userQueuedShare)).to.equal(0);
            
            await aFiAFiOracleInstance.connect(investor1).queueWithdraw(
                aTokenConInstance.address, 1000000000000000000n, usdcConInstance.address
            );

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav - after queue", `${checkNav}`);

            await aFiAFiOracleInstance.connect(investor1).queueWithdraw(
                aTokenConInstance.address, 1000000000000000000n, usdcConInstance.address
            );

            
            balInjection = await usdcConInstance.balanceOf(investor1.address);
            console.log("balInjection", balInjection);

            await aFiAFiOracleInstance.connect(investor1).pauseUnpauseQueue(aTokenConInstance.address, true);

            _unstakeData = {
                iTokens: [usdcConInstance.address],
                oToken: usdcConInstance.address,
                deadline: deadline,
                minimumReturnAmount: [0, 0, 0, 0, 0],
                minOutForiToken: [0, 0, 0],
                unstakingFees: 0
            }

            await aFiAFiOracleInstance.connect(investor1).unstakeForQueuedWithdrawals(aTokenConInstance.address, _unstakeData,
                [
                    "0x"
                ],
                [
                    "0x"
                ], 0
            );

            NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage", `${NavfromStorage}`);
            console.log("unstake done");

            let usdcBal = await usdcConInstance.balanceOf(investor1.address)
            console.log("before redeem usdcBal", usdcBal);

            await aFiAFiOracleInstance.connect(investor1).redeem(aTokenConInstance.address, [usdcConInstance.address], 0);

            usdcBal = await usdcConInstance.balanceOf(investor1.address)
            console.log("after redeem usdcBal ----------------------2", usdcBal);
        });
    });
});
