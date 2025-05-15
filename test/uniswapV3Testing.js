
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
                "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // underlying - WBTC
                "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
                "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",  // UNI
                "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK
                "0xD31a59c85aE9D8edEFeC411D448f90841571b89c"  // SOL
            ],
            [
                "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of DAI
                "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of USDC
                "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of USDT
                "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
            ]
        ]

        const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

        const payloadnew = [
            ["0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"], //USDT, USDC - payment tokens
            ["0x0000000000000000000000000000000000000000000000000000000000000000"], // USDT, USDC - chainlink oracles
            uDataPayload,
            [
                "0xC11b1268C1A384e55C48c2391d8d480264A3A7F4",
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
                "0xFAce851a4921ce59e912d19329929CE6da6EB0c7",
                "0x0000000000000000000000000000000000000000"
            ],
            [
                "0x5Ee5bf7ae06D1Be5997A1A72006FE6C607eC6DE8",
                "0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8",
                "0xF6D2224916DDFbbab6e6bd0D1B7034f4Ae0CaB18",
                "0x5E8C8A7243651DB1384C0dDfDbE39761E8e7E51a",
                "0x0000000000000000000000000000000000000000"
            ],
            [
                "0x0000000000000000000000000000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000000000000000000000000000"
            ],
            ["2000000", "2000000", "2000000", "2000000", "2000000"],
            [
                "0x0000000000000000000000000000000000000000",
                "0xA17581A9E3356d9A858b789D68B4d866e593aE94",
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000"
            ],
            2
        ]

        const bytesPayload2 = await aFiFactoryInstance.encodePoolData(payloadnew);

        console.log("Create vault");

        result = await aFiFactoryInstance.createAToken("AFiBase", "ATOK", bytesPayload2, [investor1.address, investor2.address], true, aFiStorageInstance.address,
            aFiPassiveRebalanceInstance.address, aFiManagerInstance.address, ["0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"], "0x0000000000000000000000000000000000000000");

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

        const code = await ethers.provider.getCode(usdtConInstance.address);
        console.log("Contract code:", code);

        const accountToInpersonate = "0x3d96edBeA3C8Ab7469bdbcd243bd5C5Ca9976Ed4"
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

        // await usdtConInstance.connect(investor1).approve(
        //     aTokenConInstance.address,
        //     ethers.constants.MaxUint256
        // );

        // await usdtConInstance.connect(investor2).approve(
        //     aTokenConInstance.address,
        //     ethers.constants.MaxUint256
        // );

        // await usdcConInstance.connect(investor1).approve(
        //     aTokenConInstance.address,
        //     ethers.constants.MaxUint256
        // );

        // await usdcConInstance.connect(investor2).approve(
        //     aTokenConInstance.address,
        //     ethers.constants.MaxUint256
        // );

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
        await WETHConInstance.connect(signer).transfer(aTokenConInstance.address, "1000000000000");


        // var usdtBalance = await usdtConInstance.balanceOf(accountToInpersonate);
        // let usdcBalance = await usdcConInstance.balanceOf(accountToInpersonate);
        // // usdcBalance = usdcBalance / 2;

        // console.log("usdcBalance", usdcBalance);
        // await usdcConInstance.connect(signer).transfer(investor1.address, usdcBalance);
        // // await usdcConInstance.connect(signer).transfer(investor2.address, usdcBalance);

        // console.log("usdtBalance", usdtBalance)
        // usdtBalance = usdtBalance / 100;
        // console.log("usdtBalance", usdtBalance)
        // await usdtConInstance.connect(signer).transfer(investor1.address, "1783822029");
        // await usdtConInstance.connect(signer).transfer(investor2.address, "1783822029");

    });

    context('Basic checks for deposit and withdraw', () => {
        it('deploys AFiContract successfully', async () => {
            console.log("Monad uniswapV3 testing");
            // await aTokenConInstance.approvePermit2("0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37");
            // await aTokenConInstance._uniswapV3Router(
            //     "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37",
            //     "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
            //     1000000000000,
            //     1744982154, 
            //     "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37", 
            //     0
            // );

            const usdtBalOfContract = await usdtConInstance.balanceOf(aTokenConInstance.address)
            console.log("base usdt balance", usdtBalOfContract);

            await aFiAFiOracleInstance.updateRebalContract(aFiAFiOracleInstance.address);

            // const balWETH = await aFiPassiveRebalanceInstance.estimateAmountOut(
            //     "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D", 
            //     1000000, 
            //     "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea"
            // );
            // console.log("weth conversion to tok = ", balWETH);

            const price = await aFiAFiOracleInstance.getPriceAndDecimals("0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D", "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b");
            console.log("price", price);
            const sumerBal  = await aFiStorageInstance.balanceSumerInToken("0x25b13e42763a97dd4041f595220642B593962356", "0xF3AfBF0D59f80d698ba3019C52D7e12618cb9a96");
            console.log("sumerBal", sumerBal);

        });
    });
});
