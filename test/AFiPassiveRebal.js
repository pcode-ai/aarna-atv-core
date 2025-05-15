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

describe('PassiveRebal', (accounts) => {
    let platformWallet; let recipient; let investor1; let investor2; let investor3;
    let deadline;
    let deployedAFiBase;
    let aTokenConInstance;

    // eslint-disable-next-line no-unused-vars
    let daiConInstance;
    let usdcConInstance;
    let usdtConInstance;
    let snapshotId;
    let oneInchParam;

    beforeEach(async () => {


        oneInchParam = {
            firstIterationUnderlyingSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            secondIterationUnderlyingSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            firstIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            secondIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"]
        }
        const userAccounts = await ethers.getSigners();
        [platformWallet, recipient, investor1, investor2, investor3, investor4, owner] = userAccounts;

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
        await aTokenConInstance.setplatformWallet(platformWallet.address);
        await aFiManagerInstance.setRebalanceController(platformWallet.address);
        await aFiAFiOracleInstance.setAFiStorage(aFiStorageInstance.address);
        await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);
        await aTokenConInstance.setMinDepLimit(100);
        await aFiPassiveRebalanceInstance.setStorage(aFiStorageInstance.address);
        await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address);
        await aFiPassiveRebalanceInstance.setManager(aFiManagerInstance.address);
        await aFiAFiOracleInstance.updateRebalContract(aFiPassiveRebalanceInstance.address);

        // // Transfer all AFinance Tokens to PLATFORM_WALLET
        // await aFinanceConInstance.transfer(platformWallet.address, AFINANCE_SUPPLY);

        // MAINNET CONTRACT INSTANCES
        daiConInstance = await ethers.getContractAt(DAI_ABI, DAI_ADDRESS);
        usdcConInstance = await ethers.getContractAt(USDC_ABI, USDC_ADDRESS);
        usdtConInstance = await ethers.getContractAt(USDT_ABI, USDT_ADDRESS);

        await aFiStorageInstance.setStablesWithdrawalLimit(aTokenConInstance.address, usdtConInstance.address, 500000000000000000000n);
        await aFiStorageInstance.setStablesWithdrawalLimit(aTokenConInstance.address, daiConInstance.address, 50000000000000000000000n);
        await aFiStorageInstance.setStablesWithdrawalLimit(aTokenConInstance.address, usdcConInstance.address, 50000000000000000000000n);

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
        await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);
        await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address);
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

    
        console.log("transfer complete")

        var usdtBalance = await usdtConInstance.balanceOf(accountToInpersonate);
        let usdcBalance = await usdcConInstance.balanceOf(accountToInpersonate);
        usdcBalance = usdcBalance / 100;

        console.log("usdcBalance", usdcBalance);
        await usdcConInstance.connect(signer).transfer(investor1.address, "10654653354");
        await usdcConInstance.connect(signer).transfer(investor2.address, "10654653354");

        console.log("usdtBalance", usdtBalance)
        usdtBalance = usdtBalance / 100;
        console.log("usdtBalance", usdtBalance)
        await usdtConInstance.connect(signer).transfer(investor1.address, "108790359575");
        await usdtConInstance.connect(signer).transfer(investor2.address, "108790359575");
        await aFiPassiveRebalanceInstance.setPauseDepositController(aTokenConInstance.address, investor1.address);
        // await aFiManagerInstance.setRebalanceController(rebalanceController.address);



        // await aFiPassiveRebalanceInstance.setAFiOracle(aFiAFiOracleInstance.address);
        await aFiPassiveRebalanceInstance.setStorage(aFiStorageInstance.address);
        await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address);
    })


    context('Basic checks for deposit and withdraw', () => {

        it('should pause the contract', async function () {
            // Call the pause function
            await aFiPassiveRebalanceInstance.pause();

            // Check if the contract is paused
            const isPaused = await aFiPassiveRebalanceInstance.getPauseStatus();
            expect(isPaused).to.be.true;
        });

        it('should unpause the contract', async function () {
            // // First, pause the contract (assuming it is not already paused)
            await aFiPassiveRebalanceInstance.pause();

            // Call the unPause function
            await aFiPassiveRebalanceInstance.unPause();

            // Check if the contract is not paused
            const isPaused = await aFiPassiveRebalanceInstance.getPauseStatus();
            expect(isPaused).to.be.false;
        });

        it('should revert pause the contract', async function () {
            await aFiPassiveRebalanceInstance.pause();
            // Attempt to pause the contract with a non-owner address
            await expect(aFiPassiveRebalanceInstance.connect(investor1).pause()).to.be.reverted;
        });

        it('should revert unpause the contract', async function () {
            await aFiPassiveRebalanceInstance.pause();
            await aFiPassiveRebalanceInstance.unPause();
            // Attempt to unpause the contract with a non-owner address
            await expect(aFiPassiveRebalanceInstance.connect(investor2).unPause()).to.be.reverted;
        });

        it('should revert when non-owner tries to pause the contract', async function () {
            await aFiPassiveRebalanceInstance.pause();
            await aFiPassiveRebalanceInstance.unPause();
            // Attempt to pause the contract with a non-owner address
            await expect(aFiPassiveRebalanceInstance.connect(investor1).pause()).to.be.reverted;
        });

        it('should revert when non-owner tries to unpause the contract', async function () {
            await aFiPassiveRebalanceInstance.pause();
            // Attempt to unpause the contract with a non-owner address
            await expect(aFiPassiveRebalanceInstance.connect(investor1).unPause()).to.be.reverted;
            await aFiPassiveRebalanceInstance.unPause();
        });

        it('should set the storage address by owner', async function () {
            const newAfiStorage = investor1.address; // Assuming accounts is an array of addresses
            // Call the setStorage function by the owner
            await aFiPassiveRebalanceInstance.setStorage(newAfiStorage);

            // Check if the storage address has been updated
            const updatedStorage = await aFiPassiveRebalanceInstance.afiStorage();
            //await aFiPassiveRebalanceInstance.connect(investor1).updateuniPool("0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599","0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2")
            expect(updatedStorage).to.equal(newAfiStorage);
        });


        it('should fail require when trying to set storage with zero address', async function () {
            const zeroAddress = '0x0000000000000000000000000000000000000000'; // Zero address

            // Attempt to set storage with zero address
            await expect(aFiPassiveRebalanceInstance.setStorage(zeroAddress)).to.be.reverted;

            await expect(aFiPassiveRebalanceInstance.setStorage(investor1.address), "Given address is not correct");
        });

        it('should set the manager address by owner', async function () {
            const newAfiManager = investor2.address; // Assuming accounts is an array of addresses
            // Call the setManager function by the owner
            await aFiPassiveRebalanceInstance.setManager(newAfiManager);
            // Check if the manager address has been updated
            const updatedManager = await aFiPassiveRebalanceInstance.afiManager();
            expect(updatedManager).to.equal(newAfiManager);
        });


        it('revert when set the manager  and setPassiveRebalancedStatus address by non - owner', async function () {

            await expect(aFiPassiveRebalanceInstance.connect(investor2).setManager(aTokenConInstance.address)).to.be.revertedWith('Ownable: caller is not the owner');

        })

        it('should revert when trying to unpause a contract that is not paused', async function () {

            // Attempt to unpause the contract, which should revert
            await expect(aFiPassiveRebalanceInstance.unPause()).to.be.reverted;
        });

        it('revert when set the manager  and setPassiveRebalancedStatus address by non - owner', async function () {

            await expect(aFiPassiveRebalanceInstance.connect(investor2).setManager(aTokenConInstance.address)).to.be.revertedWith('Ownable: caller is not the owner');

        })


        it('should fail require when trying to set manager with zero address', async function () {
            const zeroAddress = '0x0000000000000000000000000000000000000000'; // Zero address

            // Attempt to set manager with zero address
            await expect(aFiPassiveRebalanceInstance.setManager(zeroAddress)).to.be.reverted;

            await expect(aFiPassiveRebalanceInstance.setManager(investor1.address), "Given address is not correct");
        });


        it("Renounce Ownership", async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aFiPassiveRebalanceInstance.connect(platformWallet).renounceOwnership();
            const owner = await aFiPassiveRebalanceInstance.owner();
            expect(`${owner}`).to.equal(constants.ZERO_ADDRESS);
            if (`${owner}` == constants.ZERO_ADDRESS) {
                console.log("Owner : ", `${owner}`);
                await expect(
                    aFiPassiveRebalanceInstance.connect(investor1).transferOwnership(investor2.address)
                ).to.be.reverted;
            } else {
                console.log("Failed to renounce the ownership ");
            }

            await ethers.provider.send('evm_revert', [snapshotId]);
        });

    
        it('set Rebalanced status to false and check deposit', async () => {

            snapshotId = await ethers.provider.send('evm_snapshot');
            const data = await aTokenConInstance.getProportions();

            const uniPayload = [
                [
                    "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",
                ],
                [
                    "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37",
                ],
                [
                    "0x7C6A5d01E7110533f623bC3282A310789B71Db63",
                ],
                [
                    "0x7C6A5d01E7110533f623bC3282A310789B71Db63",
                ],
                [
                    [[
                        "0x4ad98652A2eD77ADb1B359be5688F0E56ee7579c",
                    ]], 
                    [[
                        "0x91aB3Ed680ec485746A5Ef84A3e9F0f1562A0bD9",
                    ]]
                ],
                [
                    "0x4ad98652A2eD77ADb1B359be5688F0E56ee7579c", 
                    "0x91aB3Ed680ec485746A5Ef84A3e9F0f1562A0bD9"
                ]            
            ]
            const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
            await aFiPassiveRebalanceInstance.initUniStructure(
                ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
                encodedUniPayload
            )

          

            // const accountBalance = await daiConInstance.balanceOf(investor1.address)
            // console.log("transfer complete")

            const ether = (amount) => {
                const weiString = ethers.utils.parseEther(amount.toString());
                return BigNumber.from(weiString);
            };




            await aTokenConInstance.connect(investor1).deposit(
                3000000000, usdtConInstance.address
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

            const data1 = await aTokenConInstance.getProportions();
            expect(`${data1[2]}`).to.equal(`${data[2]}`);
            console.log(`${data[0]}`);

            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('set Rebalanced status to true again but rebal period not reached', async () => {

            snapshotId = await ethers.provider.send('evm_snapshot');

            // set rebal strattegy to 1
            await aFiPassiveRebalanceInstance.pause();
            await expect(aFiPassiveRebalanceInstance.updateRebalStrategyNumberByOwner(aTokenConInstance.address, 1)).to.be.reverted;
            await aFiPassiveRebalanceInstance.unPause();

            await expect(aFiPassiveRebalanceInstance.connect(investor2).updateRebalStrategyNumberByOwner(aTokenConInstance.address, 1)).to.be.revertedWith('Ownable: caller is not the owner');

            await aFiPassiveRebalanceInstance.updateRebalStrategyNumberByOwner(aTokenConInstance.address, 1)

            const data = await aTokenConInstance.getProportions();
            const uniPayload = [
                [
                    "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",
                ],
                [
                    "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37",
                ],
                [
                    "0x7C6A5d01E7110533f623bC3282A310789B71Db63",
                ],
                [
                    "0x7C6A5d01E7110533f623bC3282A310789B71Db63",
                ],
                [
                    [[
                        "0x4ad98652A2eD77ADb1B359be5688F0E56ee7579c",
                    ]], 
                    [[
                        "0x91aB3Ed680ec485746A5Ef84A3e9F0f1562A0bD9",
                    ]]
                ],
                [
                    "0x4ad98652A2eD77ADb1B359be5688F0E56ee7579c", 
                    "0x91aB3Ed680ec485746A5Ef84A3e9F0f1562A0bD9"
                ]            
            ]
            const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
            await aFiPassiveRebalanceInstance.initUniStructure(
                ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
                encodedUniPayload
            )

          

            // const accountBalance = await daiConInstance.balanceOf(investor1.address)
            // console.log("transfer complete")

            const ether = (amount) => {
                const weiString = ethers.utils.parseEther(amount.toString());
                return BigNumber.from(weiString);
            };




            await aTokenConInstance.connect(investor1).deposit(
                3000000000, usdtConInstance.address
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

            const data1 = await aTokenConInstance.getProportions();
            expect(`${data1[2]}`).to.equal(`${data[2]}`);

            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('deposits when rebalPeriod reached, it should rebalance to zero strategy as default', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            const currentTime = await time.latest();
            console.log(`${currentTime}`)

            const two_Week = 14 * 24 * 60 * 60;

            await time.increase(two_Week);

            const depositAmount = 100000000;

            const currentTimeLater = await time.latest();
            console.log(`${currentTimeLater}`)

            const strat = await aFiPassiveRebalanceInstance.getRebalStrategyNumber(aTokenConInstance.address);
            console.log("current strategy:", `${strat}`);

            const data = await aTokenConInstance.getProportions();

            if (`${currentTimeLater}` > `${currentTime}`) {
                       const uniPayload = [
                [
                    "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",
                ],
                [
                    "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37",
                ],
                [
                    "0x7C6A5d01E7110533f623bC3282A310789B71Db63",
                ],
                [
                    "0x7C6A5d01E7110533f623bC3282A310789B71Db63",
                ],
                [
                    [[
                        "0x4ad98652A2eD77ADb1B359be5688F0E56ee7579c",
                    ]], 
                    [[
                        "0x91aB3Ed680ec485746A5Ef84A3e9F0f1562A0bD9",
                    ]]
                ],
                [
                    "0x4ad98652A2eD77ADb1B359be5688F0E56ee7579c", 
                    "0x91aB3Ed680ec485746A5Ef84A3e9F0f1562A0bD9"
                ]            
            ]
            const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
            await aFiPassiveRebalanceInstance.initUniStructure(
                ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
                encodedUniPayload
            )

          

            // const accountBalance = await daiConInstance.balanceOf(investor1.address)
            // console.log("transfer complete")

            const ether = (amount) => {
                const weiString = ethers.utils.parseEther(amount.toString());
                return BigNumber.from(weiString);
            };




            await aTokenConInstance.connect(investor1).deposit(
                3000000000, usdtConInstance.address
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

                await aTokenConInstance.connect(investor1).deposit(
                    3000000000, usdtConInstance.address
                );

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





                //To check the profit distribution
                await aTokenConInstance.connect(investor1).withdraw(
                    ether(2), usdtConInstance.address, deadline, returnString, 3, 0
                );

                const data1 = await aTokenConInstance.getProportions();

                console.log(`${data[2]}`, `${data1[2]}`)

                expect(`${data1[2]}`).to.equal(
                    `${data[2]}`,
                    'rebalTime not changed',
                );
            } else {
                console.log("Time has increased");
            }
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('set Rebalanced strategy to 0 and it should rebal to zero strategy', async () => {

            snapshotId = await ethers.provider.send('evm_snapshot');

            await aFiPassiveRebalanceInstance.updateRebalStrategyNumberByOwner(aTokenConInstance.address, 0);
            const two_Week = 14 * 24 * 60 * 60;

            await time.increase(two_Week);

            const data = await aTokenConInstance.getProportions();

               const uniPayload = [
                [
                    "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",
                ],
                [
                    "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37",
                ],
                [
                    "0x7C6A5d01E7110533f623bC3282A310789B71Db63",
                ],
                [
                    "0x7C6A5d01E7110533f623bC3282A310789B71Db63",
                ],
                [
                    [[
                        "0x4ad98652A2eD77ADb1B359be5688F0E56ee7579c",
                    ]], 
                    [[
                        "0x91aB3Ed680ec485746A5Ef84A3e9F0f1562A0bD9",
                    ]]
                ],
                [
                    "0x4ad98652A2eD77ADb1B359be5688F0E56ee7579c", 
                    "0x91aB3Ed680ec485746A5Ef84A3e9F0f1562A0bD9"
                ]            
            ]
            const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
            await aFiPassiveRebalanceInstance.initUniStructure(
                ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
                encodedUniPayload
            )

          

            // const accountBalance = await daiConInstance.balanceOf(investor1.address)
            // console.log("transfer complete")

            const ether = (amount) => {
                const weiString = ethers.utils.parseEther(amount.toString());
                return BigNumber.from(weiString);
            };




            await aTokenConInstance.connect(investor1).deposit(
                3000000000, usdtConInstance.address
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

            const data3 = await aTokenConInstance.getProportions();
            expect(`${data3[2]}`).to.equal(
                `${data[2]}`,
                'rebalTime changed',
            );

            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('set Rebalanced strategy to 1 and it should rebal to 1 strategy', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aFiPassiveRebalanceInstance.updateRebalStrategyNumberByOwner(aTokenConInstance.address, 1);
            const two_Week = 14 * 24 * 60 * 60;
            await time.increase(two_Week);
            const data = await aTokenConInstance.getProportions();

            const uniPayload = [
                [
                    "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",
                ],
                [
                    "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37",
                ],
                [
                    "0x7C6A5d01E7110533f623bC3282A310789B71Db63",
                ],
                [
                    "0x7C6A5d01E7110533f623bC3282A310789B71Db63",
                ],
                [
                    [[
                        "0x4ad98652A2eD77ADb1B359be5688F0E56ee7579c",
                    ]], 
                    [[
                        "0x91aB3Ed680ec485746A5Ef84A3e9F0f1562A0bD9",
                    ]]
                ],
                [
                    "0x4ad98652A2eD77ADb1B359be5688F0E56ee7579c", 
                    "0x91aB3Ed680ec485746A5Ef84A3e9F0f1562A0bD9"
                ]            
            ]
            const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
            await aFiPassiveRebalanceInstance.initUniStructure(
                ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
                encodedUniPayload
            )

          

            // const accountBalance = await daiConInstance.balanceOf(investor1.address)
            // console.log("transfer complete")

            const ether = (amount) => {
                const weiString = ethers.utils.parseEther(amount.toString());
                return BigNumber.from(weiString);
            };




            await aTokenConInstance.connect(investor1).deposit(
                3000000000, usdtConInstance.address
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

            const data1 = await aTokenConInstance.getProportions();

            expect(`${data1[2]}`).to.equal(
                `${data[2]}`,
                'rebalTime not changed',
            );

            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('should apply rebal for proportions - 1', async () => {

            snapshotId = await ethers.provider.send('evm_snapshot');

            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);

            await aFiPassiveRebalanceInstance.setStorage(aFiStorageInstance.address);
            await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address);
            await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address);
            await aFiPassiveRebalanceInstance.setManager(aFiManagerInstance.address);

            await aFiPassiveRebalanceInstance.updateRebalStrategyNumberByOwner(aTokenConInstance.address, 1);

            const uniPayload = [
                [
                    "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",
                ],
                [
                    "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37",
                ],
                [
                    "0x7C6A5d01E7110533f623bC3282A310789B71Db63",
                ],
                [
                    "0x7C6A5d01E7110533f623bC3282A310789B71Db63",
                ],
                [
                    [[
                        "0x4ad98652A2eD77ADb1B359be5688F0E56ee7579c",
                    ]], 
                    [[
                        "0x91aB3Ed680ec485746A5Ef84A3e9F0f1562A0bD9",
                    ]]
                ],
                [
                    "0x4ad98652A2eD77ADb1B359be5688F0E56ee7579c", 
                    "0x91aB3Ed680ec485746A5Ef84A3e9F0f1562A0bD9"
                ]            
            ]
            const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
            await aFiPassiveRebalanceInstance.initUniStructure(
                ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
                encodedUniPayload
            )

          

            // const accountBalance = await daiConInstance.balanceOf(investor1.address)
            // console.log("transfer complete")

            const ether = (amount) => {
                const weiString = ethers.utils.parseEther(amount.toString());
                return BigNumber.from(weiString);
            };




            await aTokenConInstance.connect(investor1).deposit(
                3000000000, usdtConInstance.address
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

            const Afterbal1 = await aTokenConInstance.balanceOf(
                investor1.address
            );
            const minimumReturnAmount = [0, 0, 0, 0, 0];
            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);


            await aTokenConInstance.connect(investor1).withdraw(
                Afterbal1, usdtConInstance.address, deadline, returnString, 3, 0
            );

        })

        it('should apply rebal for proportions - 2', async () => {

            snapshotId = await ethers.provider.send('evm_snapshot');

            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);

            await aFiPassiveRebalanceInstance.setStorage(aFiStorageInstance.address);
            await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address);
            await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address);
            await aFiPassiveRebalanceInstance.setManager(aFiManagerInstance.address);

            await aFiPassiveRebalanceInstance.updateRebalStrategyNumberByOwner(aTokenConInstance.address, 1);

            const uniPayload = [
                [
                    "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",
                ],
                [
                    "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37",
                ],
                [
                    "0x7C6A5d01E7110533f623bC3282A310789B71Db63",
                ],
                [
                    "0x7C6A5d01E7110533f623bC3282A310789B71Db63",
                ],
                [
                    [[
                        "0x4ad98652A2eD77ADb1B359be5688F0E56ee7579c",
                    ]], 
                    [[
                        "0x91aB3Ed680ec485746A5Ef84A3e9F0f1562A0bD9",
                    ]]
                ],
                [
                    "0x4ad98652A2eD77ADb1B359be5688F0E56ee7579c", 
                    "0x91aB3Ed680ec485746A5Ef84A3e9F0f1562A0bD9"
                ]            
            ]
            const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
            await aFiPassiveRebalanceInstance.initUniStructure(
                ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
                encodedUniPayload
            )

          

            // const accountBalance = await daiConInstance.balanceOf(investor1.address)
            // console.log("transfer complete")

            const ether = (amount) => {
                const weiString = ethers.utils.parseEther(amount.toString());
                return BigNumber.from(weiString);
            };




            await aTokenConInstance.connect(investor1).deposit(
                3000000000, usdtConInstance.address
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

            let swapParams = {
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

            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );

            swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: usdtConInstance.address,
                cSwapFee: 1000000,
                cSwapCounter: 1,
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
            const Afterbal1 = await aTokenConInstance.balanceOf(
                investor1.address
            );

            getProportions = await aTokenConInstance.getProportions();
            console.log("getProportions--------", getProportions[0]);

            const minimumReturnAmount = [0, 0, 0, 0, 0];
            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);


            await aTokenConInstance.connect(investor1).withdraw(
                Afterbal1, usdtConInstance.address, deadline, returnString, 3, 0
            );
        })

        it('should return the correct pool address', async function () {
            // Call the getPool function
            const returnedPool = await aFiPassiveRebalanceInstance.getPool("0xcf5a6076cfa32686c0df13abada2b40dec133f1d", "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea");

            // Check if the returned pool address matches the created pool
            expect(returnedPool).to.equal("0x5d5Adb39c2419403eaf4DD06c2368dD8FACd6eE3");
        });
    });
});