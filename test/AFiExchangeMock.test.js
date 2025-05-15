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
const exp = require('constants');
const { zeroAddress } = require('ethereumjs-util');

const getBigNumber = (number) => ethers.BigNumber.from(number);

describe('AFiBase - exchange test', () => {
    let platformWallet; let recipient; let investor1; let investor2;
    let deadline;
    let aTokenConInstance;
    let aTokenConInstance1;
    let oneInchParam;

    // eslint-disable-next-line no-unused-vars
    let daiConInstance;
    let usdcConInstance;
    let usdtConInstance;
    let deployedAFiBase;
    // let aFiDelayModule;

    before(async () => {

        oneInchParam = {
            firstIterationUnderlyingSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            secondIterationUnderlyingSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            firstIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            secondIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"]
        }
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
              "0xcf5a6076cfa32686c0df13abada2b40dec133f1d", // WBTC
              "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37", // WETH
            ],
            [
              "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // USDC - Middle Token of WBTC
              "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // USDC - Middle Token of WETH
            ],
        ]
        const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)
    
        const payloadnew = [
            ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"], //USDC, USDT - payment tokens
            [
            "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
            "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
            ],
            uDataPayload,
            ["0x64a9b3e30f9e4a45ab6137d9c0b12ae2ba8dc251", "0xeb441902ac56ae1340e178fbccb3ce5890206fca"],
            ["0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000"],
            [
            "0xc9d8b075a5c69303365ae23633d4e085199bf5c520a3b90fed1322a0342ffc33",
            "0x9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6",
            ],
            ["5000000", "5000000"],
            ["0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000"],
            2,
        ]  
    
        const bytesPayload2 = await aFiFactoryInstance.encodePoolData(payloadnew);

        result = await aFiFactoryInstance.createAToken("AFiBase", "ATOK", bytesPayload2, [investor1.address, investor2.address], true, aFiStorageInstance.address,
            aFiPassiveRebalanceInstance.address, aFiManagerInstance.address, 
            ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
            "0x0000000000000000000000000000000000000000");
    
        deployedAFiBase = await aFiFactoryInstance.aFiProducts(0);

        console.log("aTokenConInstance===================", deployedAFiBase);

        aTokenConInstance = await ethers.getContractAt(AFIBASE_ABI, deployedAFiBase);
        await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);
       
        await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);
        await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address);

        // Update the oracle data for i tokens
        await aFiPassiveRebalanceInstance.updateOracleData(
            "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
            "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a"
        )
        await aFiPassiveRebalanceInstance.updateOracleData(
            "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D",
            "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b"
        )
  
        // Update the oracle data for u tokens
        await aFiPassiveRebalanceInstance.updateOracleData(
            "0xcf5a6076cfa32686c0df13abada2b40dec133f1d",
            "0xc9d8b075a5c69303365ae23633d4e085199bf5c520a3b90fed1322a0342ffc33"
        )
        await aFiPassiveRebalanceInstance.updateOracleData(
            "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37",
            "0x9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6"
        )
        // Update the oracle data for i tokens
        await aFiPassiveRebalanceInstance.updateOracleData(
            "0x760afe86e5de5fa0ee542fc7b7b713e1c5425701",
            "0x9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6"
        )

        await aFiPassiveRebalanceInstance.updateMidToken(
            [
              "0xcf5a6076cfa32686c0df13abada2b40dec133f1d", // WBTC
              "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37", // WETH
            ],
            [
              "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // USDC - Middle Token of WBTC
              "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // USDC - Middle Token of WETH
            ]
        )

        const poolPayload = [
            [
              "0xcf5a6076cfa32686c0df13abada2b40dec133f1d", // WBTC
              "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37", // WETH
            ],
            [
              "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // USDC - Middle Token of WBTC
              "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // USDC - Middle Token of WETH
            ],
            [
              "0x5d5Adb39c2419403eaf4DD06c2368dD8FACd6eE3", // pool WBTC - USDC
              "0x4ad98652A2eD77ADb1B359be5688F0E56ee7579c", // pool WETH - USDC   
            ],
            [
              "0x85D8E3983a79Df2f37A298FeF04a57618B14647B", // pool WBTC - WETH
              "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37", // pool WETH - WETH
            ],
            [
                [[
                  "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // pool USDC-USDC (Stables- I/O tokens)
                  "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // pool USDC-USDC (Stables- I/O tokens)
                ]],
                [[
                  "0x2653c274082865f79996B4a8BB3f5C6cF89d6266", // Pool USDT-USDC (Stables- I/O tokens)
                  "0x2653c274082865f79996B4a8BB3f5C6cF89d6266", // Pool USDT-USDC (Stables- I/O tokens)
                ]]
            ],
            [
              "0x4ad98652A2eD77ADb1B359be5688F0E56ee7579c", 
              "0x91aB3Ed680ec485746A5Ef84A3e9F0f1562A0bD9"
            ]
        ]
        const unipooldata = await aFiPassiveRebalanceInstance.encodePoolData(poolPayload)
        await aFiPassiveRebalanceInstance.initUniStructure(
          ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
          unipooldata
        )
        const AFiTestToken = await ethers.getContractFactory('TestToken');
        aFiTestTokenInstace = await AFiTestToken.deploy();
        const AFiExchange = await ethers.getContractFactory('contracts/mockcontracts/AFiExchangeMock.sol:AFiExchangeMock');

        aFiExchangeInstace = await AFiExchange.deploy(aTokenConInstance.address, aFiTestTokenInstace.address);

        await aFiAFiOracleInstance.setAFiStorage(aFiStorageInstance.address);

        // // Transfer all AFinance Tokens to PLATFORM_WALLET
        // MAINNET CONTRACT INSTANCES
        daiConInstance = await ethers.getContractAt(DAI_ABI, DAI_ADDRESS);
        usdcConInstance = await ethers.getContractAt(USDC_ABI, USDC_ADDRESS);
        usdtConInstance = await ethers.getContractAt(USDT_ABI, USDT_ADDRESS);

        await aFiStorageInstance.setStablesWithdrawalLimit(aTokenConInstance.address, usdtConInstance.address, 500000000000000000000n);

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

        // const daiBalance = await daiConInstance.balanceOf(accountToInpersonate)
        // console.log("whale dai balance", daiBalance / 1e18)
        // console.log("transfering to", accountToFund)


        // await daiConInstance.connect(signer).transfer(investor1.address, daiBalance);

        // const accountBalance = await daiConInstance.balanceOf(investor1.address)
        // console.log("transfer complete")
        // console.log("funded account balance", accountBalance / 1e18)

        var usdtBalance = await usdtConInstance.balanceOf(accountToInpersonate);
        let usdcBalance = await usdcConInstance.balanceOf(accountToInpersonate);
        usdcBalance = usdcBalance / 100;

        // console.log("usdcBalance",usdcBalance);
        // await usdcConInstance.connect(signer).transfer(investor1.address, "10000000000");
        // await usdcConInstance.connect(signer).transfer(investor2.address, "10000000000");

        console.log("usdtBalance", usdtBalance)
        usdtBalance = usdtBalance / 100;
        console.log("usdtBalance", usdtBalance)
        await usdtConInstance.connect(signer).transfer(investor1.address, "10000000000");
        await usdtConInstance.connect(signer).transfer(investor2.address, "10000000000");

        await aFiPassiveRebalanceInstance.setStorage(aFiStorageInstance.address);
        await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address);
        const investorusdtBalance = await usdtConInstance.balanceOf(investor1.address)
        await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);
        await aTokenConInstance.setplatformWallet(platformWallet.address);
        await aFiManagerInstance.setRebalanceController(platformWallet.address);

        const pwallet = await aTokenConInstance.getplatformWallet();
        console.log("Platform wallet => ", pwallet);

        const delayModuleaddress = await aTokenConInstance.getDelayModule();
        console.log("delay module address", `${delayModuleaddress}`);

        const ownerOfBase = await aTokenConInstance.owner();
        console.log("owner of the vault", `${ownerOfBase}`);

        // await aTokenConInstance.setDelayModule(aFiDelayModule.address);

        // await aFiDelayModule.queueTransaction(
        //     aTokenConInstance.address,
        //     0,
        //     "0x",
        //     data,
        //     1718254858
        // )

        // await aFiPassiveRebalanceInstance.setAFiOracle(aFiAFiOracleInstance.address);
        await aFiPassiveRebalanceInstance.setStorage(aFiStorageInstance.address);
        await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address);

        console.log("transfer complete")
        console.log("funded account balance usdttttttttt", investorusdtBalance)
        await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);
        await aFiPassiveRebalanceInstance.setPauseDepositController(aTokenConInstance.address, investor1.address);
        await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address);
    });


    it('should transfer AFi when transferability is true', async () => {


        await aTokenConInstance.connect(investor1).deposit(
            1000000000, usdtConInstance.address
        );

        await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

        const swapParams = {
            afiContract: aTokenConInstance.address,
            oToken: usdtConInstance.address,
            cSwapFee: 1000000,
            cSwapCounter: 0,
            depositTokens: [usdcConInstance.address, usdtConInstance.address],
            minimumReturnAmount: [0, 0, 0, 0, 0],
            iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
            underlyingTokens: [
                "0xcf5a6076cfa32686c0df13abada2b40dec133f1d", // WBTC
                "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37"
            ],  // SOL], // Fill this array if your function expects specific tokens
            newProviders: [0, 0], // Fill this with the new providers' information
            _deadline: deadline,
            cometToClaim: [],
            cometRewardTokens: [],
            rewardTokenMinReturnAmounts: []
        };
        await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
        await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);

        await aTokenConInstance.setAfiTransferability(true);

        const Afterbal = await aTokenConInstance.balanceOf(
            investor1.address
        );
        console.log("Afterbal", `${Afterbal}`)
        //expect(await aTokenConInstance.isAfiTransferrable()).to.equal(true);

        let investorDepositNav = await aTokenConInstance.depositUserNav(investor1.address);
        console.log("investor1 DepositNav", investorDepositNav);
        await aTokenConInstance.connect(investor1).transfer(aFiExchangeInstace.address, Afterbal);

        expect(await aTokenConInstance.balanceOf(aFiExchangeInstace.address)).to.equal(Afterbal);
    });

    it('should mint usdt to investor2 addresses and swap with afi', async () => {
        await aFiTestTokenInstace.mint(investor2.address, 1000000000000000000000n);
        await aFiTestTokenInstace.connect(investor2).approve(aFiExchangeInstace.address, 1000000000000000000000n);
        await aFiExchangeInstace.connect(investor2).swapUSDTForAFi(100000000000000000000n);
        let investorDepositNav = await aTokenConInstance.depositUserNav(investor2.address);
        console.log("investor2 DepositNav", investorDepositNav);
    })



    it('should trasnfer AFi when transferability is true to AFiExhange contract address', async () => {
        await aTokenConInstance.connect(investor1).deposit(
            1000000000, usdtConInstance.address
        );

        await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

        
        const swapParams = {
            afiContract: aTokenConInstance.address,
            oToken: usdtConInstance.address,
            cSwapFee: 1000000,
            cSwapCounter: 0,
            depositTokens: [usdcConInstance.address, usdtConInstance.address],
            minimumReturnAmount: [0, 0, 0, 0, 0],
            iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
            underlyingTokens: [
                "0xcf5a6076cfa32686c0df13abada2b40dec133f1d", // WBTC
                "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37"
            ],  // SOL], // Fill this array if your function expects specific tokens
            newProviders: [0, 0], // Fill this with the new providers' information
            _deadline: deadline,
            cometToClaim: [],
            cometRewardTokens: [],
            rewardTokenMinReturnAmounts: []
        };
        await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
        await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);

        await aTokenConInstance.setAfiTransferability(true);

        const Afterbal = await aTokenConInstance.balanceOf(
            investor1.address
        );
        console.log("Afterbal", `${Afterbal}`)


        let exchangeContractDepositNav = await aTokenConInstance.depositUserNav(aFiExchangeInstace.address);
        console.log("afiexchange nav before deposit ", exchangeContractDepositNav);

        let investorDepositNav = await aTokenConInstance.depositUserNav(investor1.address);
        console.log("investor1 DepositNav", investorDepositNav);

        await aTokenConInstance.connect(investor1).approve(aFiExchangeInstace.address, Afterbal);
        await aFiExchangeInstace.connect(investor1).depositAFiToken(Afterbal);


        exchangeContractDepositNav = await aTokenConInstance.depositUserNav(aFiExchangeInstace.address);
        console.log("afiexchange nav after deposit", exchangeContractDepositNav);

    });


})