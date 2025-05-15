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

describe('AFiManager', (accounts) => {
    let platformWallet; let recipient; let investor1; let investor2; let investor3;
    let rebalanceController;
    let deadline;
    let deployedAFiBase;
    let aTokenConInstance;

    // eslint-disable-next-line no-unused-vars
    let daiConInstance;
    let usdcConInstance;
    let usdtConInstance;
    let snapshotId;
    let oneInchParam;

    before(async () => {


        oneInchParam = {
            firstIterationUnderlyingSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            secondIterationUnderlyingSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            firstIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            secondIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"]
        }

        // Take EVM snapshot
        // snapshotId = await ethers.provider.send('evm_snapshot');

        const userAccounts = await ethers.getSigners();
        [platformWallet, recipient, investor1, investor2, investor3, rebalanceController] = userAccounts;

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
            ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"], //USDT, USDC - payment tokens
            ["0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a", "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b"], // USDT, USDC - chainlink oracles
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
            aFiPassiveRebalanceInstance.address, aFiManagerInstance.address, ["0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"], "0x0000000000000000000000000000000000000000");

        deployedAFiBase = await aFiFactoryInstance.aFiProducts(0)


        //let txObject = await result.wait()

        //console.log("result++++++++++++++++++++++++", txObject.events[11].args[0]);

        aTokenConInstance = await ethers.getContractAt(AFIBASE_ABI, deployedAFiBase);
        //console.log("result++++++++++++++++++++++++", await aTokenConInstance.getPriceOracle("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"));

        await aFiAFiOracleInstance.setAFiStorage(aFiStorageInstance.address);
        await aFiManagerInstance.setRebalanceController(rebalanceController.address);
        await aFiPassiveRebalanceInstance.setPauseDepositController(aTokenConInstance.address, investor1.address);
        await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address);

        // // Transfer all AFinance Tokens to PLATFORM_WALLET
        // await aFinanceConInstance.transfer(platformWallet.address, AFINANCE_SUPPLY);

        // MAINNET CONTRACT INSTANCES
        // daiConInstance = await ethers.getContractAt(DAI_ABI, DAI_ADDRESS);
        usdcConInstance = await ethers.getContractAt(USDC_ABI, USDC_ADDRESS);
        usdtConInstance = await ethers.getContractAt(USDT_ABI, USDT_ADDRESS);

        const accountToImpersonate = "0xFf73Ba9e0669D7ead82421Ad105bC6D715606Ec4"
        const accountToFund = "0x7Bc58bD67b258b445E4528039BE14824f04d2422"

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [accountToImpersonate],
        });
        const signer = await ethers.getSigner(accountToImpersonate)

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


        await aFiPassiveRebalanceInstance.setManager(aFiManagerInstance.address);
        await aTokenConInstance.setplatformWallet(platformWallet.address);

        var usdtBalance = await usdtConInstance.balanceOf(accountToImpersonate);
        let usdcBalance = await usdcConInstance.balanceOf(accountToImpersonate);

        await usdcConInstance.connect(signer).transfer(investor1.address, usdcBalance);
        console.log("usdcBalance", usdcBalance);

        console.log("usdtBalance", usdtBalance)
        usdtBalance = usdtBalance / 3;
        console.log("usdtBalance", usdtBalance)
        await usdtConInstance.connect(signer).transfer(investor1.address, "50000957569");
        await usdtConInstance.connect(signer).transfer(investor2.address, "50000957569");

        const investorusdtBalance = await usdtConInstance.balanceOf(investor1.address)
       
        await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);
        await aTokenConInstance.setMinDepLimit(100);
        console.log("transfer complete")
        console.log("funded account balance usdttttttttt", investorusdtBalance)
        await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);
        await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address);
        await aFiPassiveRebalanceInstance.updatePreSwapDepositLimit(100000000000000000000n);
        
        await aFiPassiveRebalanceInstance.updateOracleData(usdtConInstance.address, "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b");
        await aFiPassiveRebalanceInstance.updateOracleData(usdcConInstance.address, "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a");


    });

    describe('Basic checks for deposit and withdraw', () => {


        it('scenario 2 testing inmanager when stable token is USDC', async () => {

            snapshotId = await ethers.provider.send('evm_snapshot');
            await aFiPassiveRebalanceInstance.updateMidToken(
                [
                    "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea"
                ],
                [
                    "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37" 
                ]
            );

            const poolPayload = [
                [
                    "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea"
                ],
                [
                    "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37"
                ],
                [
                    "0x4ad98652A2eD77ADb1B359be5688F0E56ee7579c",  // pool WBTC - WETH

                ],
                [
                    "0x4ad98652A2eD77ADb1B359be5688F0E56ee7579c"
                ],
                [
                    [[
                        "0x4ad98652A2eD77ADb1B359be5688F0E56ee7579c"
                    ]]
                ],
                [
                    "0x4ad98652A2eD77ADb1B359be5688F0E56ee7579c"
                ]
            ]
            const unipooldata = await aFiPassiveRebalanceInstance.encodePoolData(poolPayload)
            await aFiPassiveRebalanceInstance.initUniStructure(["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"], unipooldata)

    
            const ether = (amount) => {
                const weiString = ethers.utils.parseEther(amount.toString());
                return BigNumber.from(weiString);
            };




            await aTokenConInstance.connect(investor1).deposit(
                3000000000, usdcConInstance.address
            );

            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdcConInstance.address
            );







            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

            let nav2 = await aTokenConInstance.depositUserNav(investor1.address);
            console.log("User NAVVVVV", `${nav2}`)
            let usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("after deposit usdtBalance", usdtBalance)
            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);



            const numbers = [
                "1250230",
                "211379301119179471",
                "80080613841879501949",
                "34816381824594232923",
                "5355788253"
            ];

            const bigNumbers = numbers.map(num => BigNumber.from(num));

            const stringRepresentations = bigNumbers.map(bn => bn.toString());

            const swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: usdcConInstance.address,
                cSwapFee: 1000000,
                cSwapCounter: 0,
                depositTokens: [usdcConInstance.address, "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
                minimumReturnAmount: [0],
                iMinimumReturnAmount: [0], // Adjust according to your contract's expectations
                underlyingTokens: [usdcConInstance.address],  // SOL], // Fill this array if your function expects specific tokens
                newProviders: [0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []


            };
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);

            // const Afterbal1 = await aTokenConInstance.balanceOf(investor1.address);
            // console.log("Afterbal++++++3", `${Afterbal1}`)




            // checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            // console.log("check nav ", `${checkNav}`);

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

            // console.log("check", Amount);

            // usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            // console.log("before withdraw usdtBalance", usdtBalance);

            const uniPayload = [[
                "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"
            ],
            [
                "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37"
            ],
            [
                "0x49d84652081F2b2F6778DE72b14f053EF801Dd31"
            ],
            [
                "0x49d84652081F2b2F6778DE72b14f053EF801Dd31"
            ],
            [
                [[
                    "0x4ad98652A2eD77ADb1B359be5688F0E56ee7579c"
                ]]

            ],
            [
                "0x4ad98652A2eD77ADb1B359be5688F0E56ee7579c"
            ]
            ]
            const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
            await aFiPassiveRebalanceInstance.initUniStructure([usdcConInstance.address, usdtConInstance.address], encodedUniPayload)

            const newUToken = "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D";
            const payload = [
                [
                    "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"
                ],
                [
                    "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37"
                ]
            ]
            await aFiPassiveRebalanceInstance.updateMidToken(
                [
                    "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"
                ],
                [
                    "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37"
                ]
            );
            const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

            const bytesPayload = [
                ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"], //USDT, USDC - payment tokens
                ["0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a", "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b"], // USDT, USDC - chainlink oracles
                uDataPayload,
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                [
                    "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b"
                ],
                ["0"],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                2
            ]

            const bytesData = await aFiFactoryInstance.encodePoolData(bytesPayload);



            var res = await aTokenConInstance.getProportions();
            console.log("uTokProp", res);

            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);


            await aFiManagerInstance.connect(rebalanceController).rebalance(
                bytesData,
                [
                    aTokenConInstance.address,
                    aFiStorageInstance.address,
                    usdtConInstance.address,
                    newUToken,
                    usdcConInstance.address,
                    2,
                    [],
                    res[0],
                    res[1],
                    0,
                    1
                ],
                deadline,
                [0],
                0,
                0,
                "0x",
                [
                    "0x",
                    "0x",
                    "0x",
                    "0x",
                    "0x"
                ]
            );

            res = await aTokenConInstance.getUTokens();
            console.log("uTokProp", res);
            res = await aTokenConInstance.getProportions();
            console.log("after rebalance theproprtion", res);

            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        // it('emergency withdraw', async () => {

        //     var staleBal = await usdtConInstance.balanceOf(investor1.address);
        //     console.log("usdt balance of user before deposit ", `${staleBal}`);




        //     await aTokenConInstance.connect(investor2).deposit(
        //         1000000000, usdtConInstance.address
        //     );

        //     poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);


        //     await aTokenConInstance.connect(investor2).deposit(
        //         1000000000, usdtConInstance.address
        //     );

        //     await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

        //     await aFiPassiveRebalanceInstance.updateMidToken(
        //         [
        //             "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // underlying - WBTC
        //             "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
        //             "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",  // UNI
        //             "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK
        //             "0xD31a59c85aE9D8edEFeC411D448f90841571b89c"  // SOL
        //         ],
        //         [
        //             "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of DAI
        //             "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of USDC
        //             "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of USDT
        //             "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        //             "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
        //         ]
        //     );

        //     const poolPayload = [
        //         [
        //             "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // underlying - WBTC
        //             "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
        //             "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",  // UNI
        //             "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK
        //             "0xD31a59c85aE9D8edEFeC411D448f90841571b89c",  // SOL
        //             "0xc00e94Cb662C3520282E6f5717214004A7f26888"   // COMP
        //         ],
        //         [
        //             "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of DAI
        //             "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of USDC
        //             "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of USDT
        //             "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        //             "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        //             "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
        //         ],
        //         [
        //             "0xCBCdF9626bC03E24f779434178A73a0B4bad62eD",  // pool WBTC - WETH
        //             "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // pool WETH - WETH
        //             "0x1d42064Fc4Beb5F8aAF85F4617AE8b3b5B8Bd801",   // pool UNI - WETH
        //             "0xa6Cc3C2531FdaA6Ae1A3CA84c2855806728693e8",
        //             "0x127452F3f9cDc0389b0Bf59ce6131aA3Bd763598",
        //             "0xea4Ba4CE14fdd287f380b55419B1C5b6c3f22ab6"

        //         ],
        //         [
        //             "0xCBCdF9626bC03E24f779434178A73a0B4bad62eD",  // pool WBTC - WETH
        //             "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // pool WETH - WETH
        //             "0x1d42064Fc4Beb5F8aAF85F4617AE8b3b5B8Bd801",   // pool UNI - WETH
        //             "0xa6Cc3C2531FdaA6Ae1A3CA84c2855806728693e8",
        //             "0x127452F3f9cDc0389b0Bf59ce6131aA3Bd763598",
        //             "0xea4Ba4CE14fdd287f380b55419B1C5b6c3f22ab6"
        //         ],
        //         [
        //             [[
        //                 "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36", // Pool USDT-WETH (Stables- I/O tokens)
        //                 "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36", // Pool USDT-WETH (Stables- I/O tokens)
        //                 "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",  // Pool USDT-WETH (Stables- I/O tokens)
        //                 "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",  // Pool USDT-WETH (Stables- I/O tokens)
        //                 "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",  // Pool USDT-WETH (Stables- I/O tokens)
        //                 "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",  // Pool USDT-WETH (Stables- I/O tokens)
        //             ]],
        //             [[
        //                 "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8", // pool USDC-WETH (Stables- I/O tokens)
        //                 "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8", // pool USDC-WETH (Stables- I/O tokens)
        //                 "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",  // pool USDC-WETH (Stables- I/O tokens)
        //                 "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",  // pool USDC-WETH (Stables- I/O tokens)
        //                 "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",  // pool USDC-WETH (Stables- I/O tokens)
        //                 "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",  // pool USDC-WETH (Stables- I/O tokens)
        //             ]],
        //             [[
        //                 "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8",
        //                 "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8",
        //                 "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8",
        //                 "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8",
        //                 "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8",
        //                 "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8"
        //             ]]
        //         ],
        //         [
        //             "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
        //             "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
        //             "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8"
        //         ]
        //     ]
        //     const unipooldata = await aFiPassiveRebalanceInstance.encodePoolData(poolPayload)
        //     await aFiPassiveRebalanceInstance.initUniStructure(["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0x6B175474E89094C44Da98b954EedeAC495271d0F"], unipooldata)

        //     const swapParams = {
        //         afiContract: aTokenConInstance.address,
        //         oToken: usdtConInstance.address,
        //         cSwapFee: 1000000,
        //         cSwapCounter: 0,
        //         depositTokens: ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0x6B175474E89094C44Da98b954EedeAC495271d0F"],
        //         minimumReturnAmount: [0, 0, 0, 0, 0],
        //         iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
        //         underlyingTokens: ["0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // underlying - WBTC
        //             "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
        //             "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",  // UNI
        //             "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK
        //             "0xD31a59c85aE9D8edEFeC411D448f90841571b89c"],  // SOL], // Fill this array if your function expects specific tokens
        //         newProviders: [2, 2, 2, 0, 0], // Fill this with the new providers' information
        //         _deadline: deadline,
        //         cometToClaim: [],
        //         cometRewardTokens: [],
        //         rewardTokenMinReturnAmounts: []
        //     };

        //     poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);


        //     await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
        //     await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);

        //     var NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
        //     console.log("After 2nd deposit nav from storage value", `${NavfromStorage}`);

        //     await aFiManagerInstance.pause();

        //     await expect(aFiManagerInstance.emergencyRebalance(
        //         aTokenConInstance.address,
        //         aFiStorageInstance.address,
        //         "0x514910771AF9Ca656af840dff83E8264EcF986CA",
        //         [2500000, 2500000, 2500000, 2500000]
        //     )).to.be.revertedWith("AFM03");

        //     await aFiManagerInstance.unPause();

        //     await expect(aFiManagerInstance.connect(investor1).emergencyRebalance(
        //         aTokenConInstance.address,
        //         aFiStorageInstance.address,
        //         "0x514910771AF9Ca656af840dff83E8264EcF986CA",
        //         [2500000, 2500000, 2500000, 2500000]
        //     )).to.be.reverted;

        //     await aFiManagerInstance.emergencyRebalance(
        //         aTokenConInstance.address,
        //         aFiStorageInstance.address,
        //         "0x514910771AF9Ca656af840dff83E8264EcF986CA",
        //         [2500000, 2500000, 2500000, 2500000]
        //     );

        //     NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
        //     console.log("After emeregency rebalance nav from storage value", `${NavfromStorage}`);

        //     var uTokenProp2 = await aTokenConInstance.getProportions();
        //     console.log("uTokenProp", `${uTokenProp2[0]}`);

        //     var utokensafter = await aTokenConInstance.getUTokens();
        //     console.log(utokensafter);

        //     const linkTokenInstance = await ethers.getContractAt(DAI_ABI, "0x514910771AF9Ca656af840dff83E8264EcF986CA");

        //     var staleBal = await linkTokenInstance.balanceOf(aTokenConInstance.address);
        //     console.log("staleBal = ", `${staleBal}`);

        //     await aTokenConInstance.emergencyWithdraw(linkTokenInstance.address, platformWallet.address);

        //     staleBal = await daiConInstance.balanceOf(platformWallet.address);
        //     console.log("staleBal after emergency withdraw = ", `${staleBal}`);
        // });

    });
});