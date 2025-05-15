/* eslint-disable no-underscore-dangle */
const { assert, expect } = require('chai');
const { ethers, waffle } = require('hardhat');
const { BigNumber } = require('ethers');
const { time, constants } = require("@openzeppelin/test-helpers");
const { provider } = waffle;


const { abi: AFIBASE_ABI } = require('../artifacts/contracts/AtvBase.sol/AtvBase.json');

const {
    // eslint-disable-next-line max-len
    ONEINCHEXCHANGE_ABI, ONEINCHEXCHANGE_ADDRESS, DAI_ABI, DAI_ADDRESS, SAI_ABI, SAI_ADDRESS, USDT_ABI, USDT_ADDRESS, USDC_ABI, USDC_ADDRESS,
} = require('../utils/constants');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');

const getBigNumber = (number) => ethers.BigNumber.from(number);

describe('AFiOracle', (accounts) => {
    let platformWallet; let recipient; let investor1; let investor2;
    let deadline;
    let deployedAFiBase;
    let aTokenConInstance;

    // eslint-disable-next-line no-unused-vars
    let daiConInstance;
    let usdcConInstance;
    let usdtConInstance;
    let oneInchParam;

    before(async () => {

        oneInchParam = {
            firstIterationUnderlyingSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            secondIterationUnderlyingSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            firstIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            secondIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"]
        }
        const userAccounts = await ethers.getSigners();
        [platformWallet, recipient, investor1, investor2] = userAccounts;

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
        aFiFactoryInstance = await AFiFacotry.deploy(aFiBaseInstace.address);

        aFiStorageInstance = await AFiStorage.deploy(
            aFiManagerInstance.address,
            aFiAFiOracleInstance.address,
            aFiPassiveRebalanceInstance.address,
            aFiFactoryInstance.address
        );
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

        result = await aFiFactoryInstance.createAToken("AFiBase", "ATOK", bytesPayload2, [investor1.address, investor2.address], true, aFiStorageInstance.address,
            aFiPassiveRebalanceInstance.address, aFiManagerInstance.address, [], "0x0000000000000000000000000000000000000000");

        deployedAFiBase = await aFiFactoryInstance.aFiProducts(0);

        console.log("print the address of the aFiFactoryInstance", aFiFactoryInstance.address);

        // await aFiPassiveRebalanceInstance.setPriceOracle(
        //     [
        //         "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        //         "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        //         "0x6B175474E89094C44Da98b954EedeAC495271d0F"
        //     ],
        //     [
        //         "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // underlying - WBTC
        //         "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
        //         "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",  // UNI
        //         "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK
        //         "0xD31a59c85aE9D8edEFeC411D448f90841571b89c"  // SOL
        //     ],
        //     [
        //         "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
        //         "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
        //         "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9"
        //     ], // USDT, USDC - chainlink oracles
        //     [
        //         "0xf4030086522a5beea4988f8ca5b36dbc97bee88c",
        //         "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419",
        //         "0x553303d460EE0afB37EdFf9bE42922D8FF63220e",
        //         "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c",
        //         "0x4ffc43a60e009b551865a93d232e33fce9f01507"
        //     ],
        // );

        aTokenConInstance = await ethers.getContractAt(AFIBASE_ABI, deployedAFiBase);

        await aTokenConInstance.setplatformWallet(platformWallet.address);
        await aFiManagerInstance.setRebalanceController(platformWallet.address);
        await expect(aFiAFiOracleInstance.connect(investor1).setAFiStorage(aFiStorageInstance.address)).to.be.reverted;

        await aFiAFiOracleInstance.setAFiStorage(aFiStorageInstance.address);
        await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address);
        await aFiAFiOracleInstance.updateRebalContract(aFiPassiveRebalanceInstance.address);

        await expect(aFiAFiOracleInstance.connect(investor2).updateRebalContract(aFiPassiveRebalanceInstance.address)).to.be.reverted;


        // // Transfer all AFinance Tokens to PLATFORM_WALLET
        // await aFinanceConInstance.transfer(platformWallet.address, AFINANCE_SUPPLY);

        // MAINNET CONTRACT INSTANCES
        daiConInstance = await ethers.getContractAt(DAI_ABI, DAI_ADDRESS);
        usdcConInstance = await ethers.getContractAt(USDC_ABI, USDC_ADDRESS);
        usdtConInstance = await ethers.getContractAt(USDT_ABI, USDT_ADDRESS);

        const accountToInpersonate = "0xFf73Ba9e0669D7ead82421Ad105bC6D715606Ec4"
        const accountToFund = "0x7Bc58bD67b258b445E4528039BE14824f04d2422"

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [accountToInpersonate],
        });
        const signer = await ethers.getSigner(accountToInpersonate)

        const ether = (amount) => {
            const weiString = ethers.utils.parseEther(amount.toString());
            return BigNumber.from(weiString);
        };

        /**
        * GIVE APPROVAL TO AFi of DEPOSIT TOKEN
        * THIS IS REQUIRED WHEN 1% fee IS TRANSFEREED FROM INVESTOR TO PLATFORM WALLET
        */

        console.log("print the productttttttttttt", usdtConInstance.address);
        console.log("print the productttttttttttt", aTokenConInstance.address);

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


        var usdtBalance = await usdtConInstance.balanceOf(accountToInpersonate);
        let usdcBalance = await usdcConInstance.balanceOf(accountToInpersonate);

        await usdcConInstance.connect(signer).transfer(investor1.address, "10000000000");
        await usdcConInstance.connect(signer).transfer(investor2.address, "10000000000");
        console.log("usdcBalance", usdcBalance);

        console.log("usdtBalance", usdtBalance)
        usdtBalance = usdtBalance / 3;
        console.log("usdtBalance", usdtBalance)
        await usdtConInstance.connect(signer).transfer(investor1.address, "10000000000");
        await usdtConInstance.connect(signer).transfer(investor2.address, "10000000000");

        const investorusdtBalance = await usdtConInstance.balanceOf(investor1.address)
        await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

        // await aFiPassiveRebalanceInstance.setAFiOracle(aFiAFiOracleInstance.address);
        await aFiPassiveRebalanceInstance.setStorage(aFiStorageInstance.address);
        await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address);
        await aFiPassiveRebalanceInstance.setPauseDepositController(aTokenConInstance.address, investor1.address);
        await aTokenConInstance.setMinDepLimit(100);

        await aFiPassiveRebalanceInstance.updateOracleData(usdtConInstance.address, "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b");
        await aFiPassiveRebalanceInstance.updateOracleData(usdcConInstance.address, "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a");


        console.log("funded account balance usdt", investorusdtBalance)
        await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);
        await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address);
    });

    context('queue flow testing', () => {

        it('transfer profit share to the team after redeem', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            const ether = (amount) => {
                const weiString = ethers.utils.parseEther(amount.toString());
                return BigNumber.from(weiString);
            };


            // getPriceInUSD

            await aTokenConInstance.connect(investor1).deposit(
                3000000000, usdcConInstance.address
            );


            // getPriceInUSD

            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdcConInstance.address
            );


            // getPriceInUSD

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

            let nav2 = await aTokenConInstance.depositUserNav(investor1.address);
            console.log("User NAVVVVV", `${nav2}`)
            let usdtBalance = await usdcConInstance.balanceOf(investor1.address)
            console.log("after deposit usdtBalance", usdtBalance)

            await expect(aFiAFiOracleInstance.connect(investor1).updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address)).to.be.reverted;

            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

            // getPriceInUSD

            const numbers = [
                "1250230",
                "211379301119179471",
                "80080613841879501949",
                "34816381824594232923",
                "5355788253"
            ];

            const bigNumbers = numbers.map(num => BigNumber.from(num));
            const stringRepresentations = bigNumbers.map(bn => bn.toString());

            var swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: usdcConInstance.address,
                cSwapFee: 1,
                cSwapCounter: 0,
                depositTokens: [usdcConInstance.address],
                minimumReturnAmount: [0, 0, 0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: [usdcConInstance.address],  // SOL], // Fill this array if your function expects specific tokens
                newProviders: [0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);

            await usdtConInstance.connect(investor1).transfer(aTokenConInstance.address, 100000000);
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);
            const Afterbal1 = await aTokenConInstance.balanceOf(investor1.address);
            console.log("Afterbal++++++3", `${Afterbal1}`)


            // getPriceInUSD

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

            const minimumReturnAmount =
                [
                    0,
                    0,
                    0,
                    0,
                    0
                ]

            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            console.log("check", Amount);
            usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("before withdraw usdtBalance", usdtBalance);

            res = await aTokenConInstance.getUTokens();
            console.log("uTokProp", res);
            res = await aTokenConInstance.getProportions();
            console.log("after rebalance theproprtion", res);


            // getPriceInUSD

            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdcConInstance.address
            );


            // getPrice*InUSD

            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdcConInstance.address
            );

            var swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: usdcConInstance.address,
                cSwapFee: 1,
                cSwapCounter: 1,
                depositTokens: [usdcConInstance.address],
                minimumReturnAmount: [0],
                iMinimumReturnAmount: [0], // Adjust according to your contract's expectations
                underlyingTokens: [usdcConInstance.address],  // SOL], // Fill this array if your function expects specific tokens
                newProviders: [0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };

            var balInjection = await usdcConInstance.balanceOf(investor1.address);
            console.log("balInjection", balInjection);

            await usdtConInstance.connect(investor1).transfer(aTokenConInstance.address, balInjection);
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);


            // getPriceInUSD

            await aTokenConInstance.connect(investor2).deposit(
                1000000000, usdcConInstance.address
            );


            // getPriceInUSD

            //To check the profit distribution
            await aTokenConInstance.connect(investor1).withdraw(
                ether(2), usdcConInstance.address, deadline, returnString, 3, 0
            );

            await aFiAFiOracleInstance.connect(investor1).queueWithdraw(
                aTokenConInstance.address, ether(2), usdcConInstance.address
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
                aTokenConInstance.address, ether(2), usdcConInstance.address
            );

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav - after queue", `${checkNav}`);

            await aFiAFiOracleInstance.connect(investor1).queueWithdraw(
                aTokenConInstance.address, ether(2), usdcConInstance.address
            );


            // getPriceInUSD

            balInjection = await usdtConInstance.balanceOf(investor1.address);
            console.log("balInjection", balInjection);

            await usdtConInstance.connect(investor1).transfer(aTokenConInstance.address, balInjection);

            poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // getPriceInUSD

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav - before unstake", `${checkNav}`);

            await aFiAFiOracleInstance.connect(investor1).pauseUnpauseQueue(aTokenConInstance.address, true);

            poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // getPriceInUSD

            var _unstakeData = {
                iTokens: [usdcConInstance.address],
                oToken: usdcConInstance.address,
                deadline: deadline,
                minimumReturnAmount: [0],
                minOutForiToken: [0],
                unstakingFees: 0
            }

            await aFiAFiOracleInstance.connect(investor1).unstakeForQueuedWithdrawals(aTokenConInstance.address, _unstakeData, [
                "0x",
                "0x",
                "0x",
                "0x",
                "0x"
            ],
                [
                    "0x",
                    "0x",
                    "0x",
                    "0x",
                    "0x"
                ], 0);

            poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // getPriceInUSD

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav - after unstake", `${checkNav}`);


            // getPriceInUSD

            var beforeinvestorusdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("before redeem funded account investor1 balance usdt", beforeinvestorusdtBalance)

            await aFiAFiOracleInstance.connect(investor1).pauseUnpauseQueue(aTokenConInstance.address, false);


            await aFiAFiOracleInstance.connect(investor1).queueWithdraw(
                aTokenConInstance.address, ether(2), usdcConInstance.address
            );

            await aFiAFiOracleInstance.connect(investor1).pauseUnpauseQueue(aTokenConInstance.address, true);

            await aFiAFiOracleInstance.connect(investor1).unstakeForQueuedWithdrawals(aTokenConInstance.address, _unstakeData, [
                "0x",
                "0x",
                "0x",
                "0x",
                "0x"
            ],
                [
                    "0x",
                    "0x",
                    "0x",
                    "0x",
                    "0x"
                ], 0);

            usdtBalance = await usdcConInstance.balanceOf(investor1.address)
            console.log("before redeem usdtBalance", usdtBalance);

            usdtBalance = await usdcConInstance.balanceOf(investor1.address)
            console.log("before redeem usdtBalance ----------------------1", usdtBalance);

            await aFiAFiOracleInstance.connect(investor1).redeem(aTokenConInstance.address, [usdcConInstance.address], 0);

            usdtBalance = await usdcConInstance.balanceOf(investor1.address)
            console.log("after redeem first usdtBalance ----------------------2", usdtBalance);

            await aFiAFiOracleInstance.connect(investor1).redeem(aTokenConInstance.address, [usdcConInstance.address], 1);

            usdtBalance = await usdcConInstance.balanceOf(investor1.address)

            console.log("after redeem second usdtBalance ----------------------2", usdtBalance);


            userQueuedShare = await aFiAFiOracleInstance.getUserQueuedShares(investor1.address, aTokenConInstance.address, usdcConInstance.address, 0);
            console.log("user's shares to unqueue", userQueuedShare);

            expect(Number(userQueuedShare)).to.equal(0);

            usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("after redeem usdtBalance", usdtBalance);


            await aFiAFiOracleInstance.unstakingProfitDistribution(aTokenConInstance.address, aFiStorageInstance.address, [usdcConInstance.address]);

            console.log("done");
            await ethers.provider.send('evm_revert', [snapshotId]);

        });

    });
});