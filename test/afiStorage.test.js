/* eslint-disable no-underscore-dangle */
const { assert, expect } = require("chai")
const { ethers, waffle } = require("hardhat")
const { BigNumber } = require("ethers")
const { time, constants } = require("@openzeppelin/test-helpers")
const { provider } = waffle

const { abi: AFIBASE_ABI } = require("../artifacts/contracts/AtvBase.sol/AtvBase.json")

const {
  // eslint-disable-next-line max-len
  ONEINCHEXCHANGE_ABI,
  ONEINCHEXCHANGE_ADDRESS,
  DAI_ABI,
  DAI_ADDRESS,
  SAI_ABI,
  SAI_ADDRESS,
  USDT_ABI,
  USDT_ADDRESS,
  USDC_ABI,
  USDC_ADDRESS,
} = require("../utils/constants")
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants")

const getBigNumber = (number) => ethers.BigNumber.from(number)

describe("AFiStorage", (accounts) => {
  let platformWallet
  let recipient
  let investor1
  let investor2
  let investor3
  let deadline
  let deployedAFiBase
  let aTokenConInstance

  // eslint-disable-next-line no-unused-vars
  let daiConInstance
  let usdcConInstance
  let usdtConInstance
  let snapshotId
  let oneInchParam

  beforeEach(async () => {
    oneInchParam = {
      firstIterationUnderlyingSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
      secondIterationUnderlyingSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
      firstIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
      secondIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
    }

    const userAccounts = await ethers.getSigners()
    ;[platformWallet, recipient, investor1, investor2, investor3, investor4, owner] = userAccounts

    const currentTime = await time.latest()
    deadline = currentTime + 60 * 60

    const AFiBase = await ethers.getContractFactory("AtvBase")
    const AFiManager = await ethers.getContractFactory("AtvManager")
    const PassiveRebalanceStrategies = await ethers.getContractFactory("AtvPassiveRebalanceStrategies")

    const AFiStorage = await ethers.getContractFactory("AtvStorage")
    const AFiFacotry = await ethers.getContractFactory("AtvFactory")
    const AFiOracle = await ethers.getContractFactory("AtvOracle")

    // LOCAL CONTRACTS
    aFiBaseInstace = await AFiBase.deploy("AFi802", "AFi")
    aFiManagerInstance = await AFiManager.deploy()
    aFiPassiveRebalanceInstance = await PassiveRebalanceStrategies.deploy()
    aFiAFiOracleInstance = await AFiOracle.deploy(aFiPassiveRebalanceInstance.address)

    aFiFactoryInstance = await AFiFacotry.deploy(aFiBaseInstace.address)
    aFiStorageInstance = await AFiStorage.deploy(
      aFiManagerInstance.address,
      aFiAFiOracleInstance.address,
      aFiPassiveRebalanceInstance.address,
      aFiFactoryInstance.address
    )
    console.log("print the address of the aFiFactoryInstance", aFiFactoryInstance.address)

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

    const bytesPayload2 = await aFiFactoryInstance.encodePoolData(payloadnew)

    result = await aFiFactoryInstance.createAToken(
      "AFiBase",
      "ATOK",
      bytesPayload2,
      [investor1.address, investor2.address],
      true,
      aFiStorageInstance.address,
      aFiPassiveRebalanceInstance.address,
      aFiManagerInstance.address,
      ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
      "0x0000000000000000000000000000000000000000"
    )

    deployedAFiBase = await aFiFactoryInstance.aFiProducts(0)

    console.log("aTokenConInstance===================", deployedAFiBase)

    aTokenConInstance = await ethers.getContractAt(AFIBASE_ABI, deployedAFiBase)
    await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address)
    // await aFiPassiveRebalanceInstance.intializeStalePriceDelay(
    //   [
    //     "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    //     "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    //     "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    //     "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // underlying - WBTC
    //     "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37", // WETH
    //     "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // UNI
    //     "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK
    //     "0xD31a59c85aE9D8edEFeC411D448f90841571b89c", // SOL
    //     "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", //Aave
    //     "0xD533a949740bb3306d119CC777fa900bA034cd52",
    //   ],
    //   [86500, 86500, 86500, 86500, 86500, 86500, 86500, 86500, 86500, 86500]
    // )

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

    await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address)
    await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address)
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
        [
          [
            "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // pool USDC-USDC (Stables- I/O tokens)
            "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // pool USDC-USDC (Stables- I/O tokens)
          ],
        ],
        [
          [
            "0x2653c274082865f79996B4a8BB3f5C6cF89d6266", // Pool USDT-USDC (Stables- I/O tokens)
            "0x2653c274082865f79996B4a8BB3f5C6cF89d6266", // Pool USDT-USDC (Stables- I/O tokens)
          ],
        ],
      ],
      ["0x4ad98652A2eD77ADb1B359be5688F0E56ee7579c", "0x91aB3Ed680ec485746A5Ef84A3e9F0f1562A0bD9"],
    ]
    const unipooldata = await aFiPassiveRebalanceInstance.encodePoolData(poolPayload)
    await aFiPassiveRebalanceInstance.initUniStructure(
      ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
      unipooldata
    )

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

    await aTokenConInstance.setplatformWallet(platformWallet.address)
    await aFiManagerInstance.setRebalanceController(platformWallet.address)
    await aFiAFiOracleInstance.setAFiStorage(aFiStorageInstance.address)
    await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address)

    await aFiPassiveRebalanceInstance.setStorage(aFiStorageInstance.address)
    await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address)
    await aFiPassiveRebalanceInstance.setManager(aFiManagerInstance.address)

    // // Transfer all AFinance Tokens to PLATFORM_WALLET
    // await aFinanceConInstance.transfer(platformWallet.address, AFINANCE_SUPPLY);

    // MAINNET CONTRACT INSTANCES
    // daiConInstance = await ethers.getContractAt(DAI_ABI, DAI_ADDRESS)
    usdcConInstance = await ethers.getContractAt(USDC_ABI, USDC_ADDRESS)
    usdtConInstance = await ethers.getContractAt(USDT_ABI, USDT_ADDRESS)

    const accountToInpersonate = "0xFf73Ba9e0669D7ead82421Ad105bC6D715606Ec4"
    const accountToFund = "0x7Bc58bD67b258b445E4528039BE14824f04d2422"

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [accountToInpersonate],
    })
    const signer = await ethers.getSigner(accountToInpersonate)

    await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address)
    await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address)
    /**
     * GIVE APPROVAL TO AFi of DEPOSIT TOKEN
     * THIS IS REQUIRED WHEN 1% fee IS TRANSFEREED FROM INVESTOR TO PLATFORM WALLET
     */

    console.log("print the productttttttttttt", usdtConInstance.address)
    console.log("print the productttttttttttt", aTokenConInstance.address)

    await usdtConInstance.connect(investor1).approve(aTokenConInstance.address, ethers.constants.MaxUint256)

    await usdtConInstance.connect(investor2).approve(aTokenConInstance.address, ethers.constants.MaxUint256)

    await usdcConInstance.connect(investor1).approve(aTokenConInstance.address, ethers.constants.MaxUint256)

    await usdcConInstance.connect(investor2).approve(aTokenConInstance.address, ethers.constants.MaxUint256)

    // await aFiPassiveRebalanceInstance.setPriceOracle(
    //   [
    //     "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    //     "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    //     "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    //   ],
    //   [
    //     "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // underlying - WBTC
    //     "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37", // WETH
    //     "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // UNI
    //     "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK
    //     "0xD31a59c85aE9D8edEFeC411D448f90841571b89c", // SOL
    //   ],
    //   [
    //     "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
    //     "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
    //     "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9",
    //   ], // USDT, USDC - chainlink oracles
    //   [
    //     "0xf4030086522a5beea4988f8ca5b36dbc97bee88c",
    //     "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419",
    //     "0x553303d460ee0afb37edff9be42922d8ff63220e",
    //     "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c",
    //     "0x4ffc43a60e009b551865a93d232e33fce9f01507",
    //   ]
    // )

    console.log("transfering to", accountToFund)

    // const accountBalance = await daiConInstance.balanceOf(investor1.address)
    console.log("transfer complete")
    // console.log("funded account balance", accountBalance / 1e18)

    var usdtBalance = await usdtConInstance.balanceOf(accountToInpersonate)
    let usdcBalance = await usdcConInstance.balanceOf(accountToInpersonate)
    usdcBalance = usdcBalance / 100

    console.log("usdcBalance", usdcBalance)
    await usdcConInstance.connect(signer).transfer(investor1.address, "10654653354")
    await usdcConInstance.connect(signer).transfer(investor2.address, "10654653354")

    console.log("usdtBalance", usdtBalance)
    usdtBalance = usdtBalance / 100
    console.log("usdtBalance", usdtBalance)
    await usdtConInstance.connect(signer).transfer(investor1.address, "108790359575")
    await usdtConInstance.connect(signer).transfer(investor2.address, "108790359575")
    await aFiPassiveRebalanceInstance.setPauseDepositController(aTokenConInstance.address, investor1.address)
    // await aFiManagerInstance.setRebalanceController(rebalanceController.address);
    await aTokenConInstance.setMinDepLimit(100)

    // await aFiPassiveRebalanceInstance.setAFiOracle(aFiAFiOracleInstance.address);
    await aFiPassiveRebalanceInstance.setStorage(aFiStorageInstance.address)
    await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address)
  })

  context("AFiStorage tests", () => {
    it("check the active status of team wallet", async () => {
      // Take EVM snapshot
      snapshotId = await ethers.provider.send("evm_snapshot")
      await aFiStorageInstance.deactivateTeamWallet(aTokenConInstance.address, investor1.address)

      const deactivated = false
      const { isPresent, isActive } = await aFiStorageInstance.getTeamWalletDetails(
        aTokenConInstance.address,
        investor1.address
      )
      console.log(" isPresent isActive ", `${isPresent}`, `${isActive}`)
      expect(isActive).to.equal(deactivated)
      await ethers.provider.send("evm_revert", [snapshotId])
    })

    it("check the active status of team wallet after reactivate", async () => {
      await aFiStorageInstance.deactivateTeamWallet(aTokenConInstance.address, investor1.address)
      await aFiStorageInstance.reActivateTeamWallet(aTokenConInstance.address, investor1.address)

      const reactivated = true
      const { isPresent, isActive } = await aFiStorageInstance.getTeamWalletDetails(
        aTokenConInstance.address,
        investor1.address
      )
      console.log(" isPresent isActive ", `${isPresent}`, `${isActive}`)
      expect(isActive).to.equal(reactivated)

      const activeWallets = await aFiStorageInstance.getTotalActiveWallets(aTokenConInstance.address)
      console.log("activeWallets", `${activeWallets}`)
    })

    it("adds newTeamWallet successfully", async () => {
      const newTeamWallet = investor4.address
      const teamWalletBefore = await aFiStorageInstance.getTeamWalletsOfAFi(aTokenConInstance.address)
      await aFiManagerInstance.addTeamWalletInAFi(aFiStorageInstance.address, aTokenConInstance.address, newTeamWallet)

      const teamWalletAfter = await aFiStorageInstance.getTeamWalletsOfAFi(aTokenConInstance.address)
      console.log(`${teamWalletBefore}`)
      console.log(`${teamWalletAfter}`)
      expect(teamWalletAfter.length).to.greaterThan(teamWalletBefore.length)
      expect(teamWalletAfter[teamWalletAfter.length - 1]).to.equal(newTeamWallet)
    })

    it("should revert if active team wallets is 0", async () => {
      await aFiStorageInstance.connect(recipient).setAFiActive(recipient.address, true)

      await aFiStorageInstance.setAFiManager(investor1.address)

      await expect(aFiStorageInstance.connect(recipient).setAFiActive(recipient.address, true)).to.be.revertedWith(
        "AFS14"
      )

      const newTeamWallet = investor3.address

      await expect(
        aFiStorageInstance.connect(investor1).addTeamWallet(recipient.address, newTeamWallet, true, true)
      ).to.be.revertedWith("AFS19")
    })

    it("should not set isActive and isPresent to true if already true", async () => {
      await aFiStorageInstance.setAFiActive(recipient.address, true)
      await aFiStorageInstance
        .connect(recipient)
        .setTeamWallets(recipient.address, [investor1.address, investor3.address])

      await aFiStorageInstance.setAFiManager(investor1.address)

      await aFiStorageInstance.connect(investor1).addTeamWallet(recipient.address, investor2.address, false, true)

      await aFiStorageInstance.connect(investor1).addTeamWallet(recipient.address, investor4.address, true, false)

      await expect(
        aFiStorageInstance.connect(recipient).setTeamWallets(recipient.address, [investor1.address, investor3.address])
      ).to.be.revertedWith("AFS28")

      const newTeamWallet = investor3.address

      await aFiStorageInstance.setAFiActive(investor2.address, true)

      await expect(
        aFiStorageInstance.connect(investor1).addTeamWallet(investor2.address, newTeamWallet, false, false)
      ).to.be.revertedWith("AFS19")

      await expect(aFiStorageInstance.connect(recipient).setAFiActive(recipient.address, true)).to.be.revertedWith(
        "AFS14"
      )
    })

    it("should not set afimanager to 0 address", async () => {
      await expect(aFiStorageInstance.setAFiManager(ZERO_ADDRESS)).to.be.revertedWith("AFS01")
    })

    it("pause a swap method", async () => {
      await aFiPassiveRebalanceInstance.pauseSwapMethods(aTokenConInstance.address, [1], [true])
      var status = await aFiPassiveRebalanceInstance.isSwapMethodPaused(aTokenConInstance.address, 1)
      expect(status).to.equal(true)
    })

    it("setAfiManager should only be called by the owner", async () => {
      await expect(aFiStorageInstance.connect(investor2).setAFiManager(investor2.address)).to.be.reverted
    })

    it("addTeamWallet should only be called by the manager", async () => {
      await aFiStorageInstance.setAFiActive(investor2.address, true)
      await expect(aFiStorageInstance.connect(investor1).setAFiActive(investor2.address, true)).to.be.revertedWith(
        "AFS04"
      )
      await expect(
        aFiStorageInstance.addTeamWallet(investor2.address, investor3.address, true, true)
      ).to.be.revertedWith("AFS27")
    })

    it("should apply rebal for proportions", async () => {
      snapshotId = await ethers.provider.send("evm_snapshot")

      await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address)

      await aFiPassiveRebalanceInstance.updateRebalStrategyNumberByOwner(aTokenConInstance.address, 1)

      await aTokenConInstance.connect(investor1).deposit(3000000000, usdtConInstance.address)

      checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address)
      console.log("check nav ", `${checkNav}`)

      let nav2 = await aTokenConInstance.depositUserNav(investor1.address)
      console.log("User NAVVVVV", `${nav2}`)
      let usdtBalance = await usdtConInstance.balanceOf(investor1.address)
      console.log("after deposit usdtBalance", usdtBalance)
      await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address)

      const swapParams = {
        afiContract: aTokenConInstance.address,
        oToken: usdtConInstance.address,
        cSwapFee: 1000000,
        cSwapCounter: 0,
        depositTokens: ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
        minimumReturnAmount: [0, 0],
        iMinimumReturnAmount: [0, 0], // Adjust according to your contract's expectations
        underlyingTokens: [
          "0xcf5a6076cfa32686c0df13abada2b40dec133f1d", // WBTC
          "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37", // WETH
        ], // SOL], // Fill this array if your function expects specific tokens
        newProviders: [0, 0],
        _deadline: deadline,
        cometToClaim: [],
        cometRewardTokens: [],
        rewardTokenMinReturnAmounts: [],
      }
      await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true)
      const beforeNav = await aTokenConInstance.depositUserNav(investor1.address)
      await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)
      const afterNav = await aTokenConInstance.depositUserNav(investor1.address)
      console.log("before cswap nav ", `${beforeNav}`)
      console.log("after cswap nav ", `${afterNav}`)

      const minimumReturnAmount = [0, 0]
      const Amount = minimumReturnAmount.map((num) => BigNumber.from(num))
      const returnString = Amount.map((bn) => bn.toString())

      const ether = (num) => {
        return ethers.utils.parseEther(num.toString())
      }

      poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)
      const afterbal1 = await aTokenConInstance.balanceOf(investor1.address)
      console.log("Afterbal1", afterbal1)

      await aTokenConInstance
        .connect(investor1)
        .withdraw(ether(5), usdtConInstance.address, deadline, returnString, 3, 0)

      poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)

      await expect(
        aTokenConInstance.connect(investor1).withdraw(ether(40), usdtConInstance.address, deadline, returnString, 3, 0)
      ).to.be.reverted

      poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)

      const currentBalance = await aTokenConInstance.balanceOf(investor1.address)

      const currentTime = await time.latest()
      deadline = currentTime + 60 * 60

      await aTokenConInstance
        .connect(investor1)
        .withdraw(currentBalance, usdtConInstance.address, deadline, returnString, 3, 0)
    })

    it("should return the array of team wallet addresses", async function () {
      const expectedTeamWallets = [investor1.address, investor2.address]

      // Assert: Check if the returned value matches the expected value
      const result = await aFiStorageInstance.getTeamWalletsOfAFi(aTokenConInstance.address)

      // Compare the arrays
      for (let i = 0; i < expectedTeamWallets.length; i++) {
        expect(result[i]).to.equal(expectedTeamWallets[i])
      }
    })

    it("should return whether AFi is active and rebalanced", async function () {
      // Arrange: Set up the necessary data
      const aFiContract = aTokenConInstance.address

      // Act: Call the function
      const result = await aFiStorageInstance.isAFiActiveRebalanced(aFiContract)

      // Assert: Check if the returned value is as expected
      expect(result).to.be.true // Adjust the expectation based on your actual implementation
    })

    it("Should revert if anyone other than the AFi manager tries to update oracle data", async () => {
      // Act & Assert
      await expect(
        aFiPassiveRebalanceInstance
          .connect(investor1)
          .updateOracleData(
            usdtConInstance.address,
            "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b"
          )
      ).to.be.revertedWith("AFP01")
    })

    it("Should allow the owner to set stable withdrawal limit", async () => {
      // Act
      await aFiStorageInstance.setStablesWithdrawalLimit(aTokenConInstance.address, usdtConInstance.address, 500000000)

      // Assert
      const setLimit = await aFiStorageInstance.stablesWithdrawalLimit(
        aTokenConInstance.address,
        usdtConInstance.address
      )
      expect(setLimit).to.equal(500000000)
    })

    it("Should revert if anyone other than the owner tries to set stable withdrawal limit", async () => {
      // Act & Assert
      await expect(
        aFiStorageInstance
          .connect(investor2)
          .setStablesWithdrawalLimit(aTokenConInstance.address, usdtConInstance.address, 500000000)
      ).to.be.revertedWith("Ownable: caller is not the owner")
    })

    // it("Should revert if anyone other than the owner tries to set price oracles", async () => {
    //   // Act & Assert
    //   await expect(
    //     aFiPassiveRebalanceInstance
    //       .connect(investor2)
    //       .setPriceOracle(
    //         [usdtConInstance.address],
    //         [usdtConInstance.address],
    //         [usdtConInstance.address],
    //         [usdtConInstance.address]
    //       )
    //   ).to.be.revertedWith("Ownable: caller is not the owner")
    // })

    it("Should revert if anyone other than the AFi contract tries to distribute profit share", async () => {
      // Act & Assert
      await expect(
        aFiStorageInstance
          .connect(investor2)
          ._distributeProfitShare(aTokenConInstance.address, 1, usdtConInstance.address, 1, 1)
      ).to.be.revertedWith("AFS27")
    })
  })

  describe("should add a team wallet successfully", async () => {
    beforeEach(async () => {
      await aFiStorageInstance.setAFiManager(investor1.address)
    })

    it("should withdraw all funds from Aave if Aave token exists", async function () {
      // Deploy or get instances of necessary contracts
      // Set up the necessary environment

      // Call the _withdrawAll function targeting Aave
      await aFiStorageInstance.setAFiManager(investor1.address)
      const result = await aFiStorageInstance
        .connect(investor1)
        ._withdrawAll(aTokenConInstance.address, "0xcf5a6076cfa32686c0df13abada2b40dec133f1d")
      console.log("result", await result)
      // // Assert that the function call was successful
      // expect(result).to.be.true;

      // Add further assertions as needed, like checking the balance after withdrawal
    })

    it("deactivateTeamWallet should revert if caller is not the owner", async function () {
      // Deploy or get instances of necessary contracts
      const [owner, nonOwner] = await ethers.getSigners()

      await expect(
        aFiStorageInstance.connect(investor2).deactivateTeamWallet(aTokenConInstance.address, investor1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner")

      // // Call the deactivateTeamWallet function with a non-owner account
      // await expect(aFiStorageInstance.connect(investor2).deactivateTeamWallet(aTokenConInstance.addTeamWallet, investor1.address))
      //     .to.be.revertedWith("Ownable: caller is not the owner");
    })

    it("reActivateTeamWallet should revert if caller is not the owner", async function () {
      // Deploy or get instances of necessary contracts
      const [owner, nonOwner] = await ethers.getSigners()

      await expect(
        aFiStorageInstance.connect(investor2).reActivateTeamWallet(aTokenConInstance.address, investor1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner")

      // // Call the deactivateTeamWallet function with a non-owner account
      // await expect(aFiStorageInstance.connect(investor2).deactivateTeamWallet(aTokenConInstance.addTeamWallet, investor1.address))
      //     .to.be.revertedWith("Ownable: caller is not the owner");
    })

    it("call profit distribution from random address", async () => {
      snapshotId = await ethers.provider.send("evm_snapshot")
      await expect(
        aFiStorageInstance._distributeProfitShare(
          aTokenConInstance.address,
          aTokenConInstance.address,
          100,
          "0xdAC17F958D2ee523a2206206994597C13D831ec7",
          10,
          100,
          10
        )
      ).to.be.reverted

      await ethers.provider.send("evm_revert", [snapshotId])
    })
  })

  describe("Product 401 - stables", async () => {
    let snapshotId
    beforeEach(async () => {
      snapshotId = await ethers.provider.send("evm_snapshot")

      const payload = [
        ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
        [
          "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // USDC - Middle Token of USDC
          "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // USDC - Middle Token of USDT
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
        ["0x25b13e42763a97dd4041f595220642b593962356", "0x4a997f2b619e7c7f4f7c2621b9fa44cd616941e1"],
        ["0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000"],
        [
          "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
          "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
        ],
        ["5000000", "5000000"],
        ["0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000"],
        2,
      ]

      const bytesPayload2 = await aFiFactoryInstance.encodePoolData(payloadnew)

      result = await aFiFactoryInstance.createAToken(
        "AFiBase",
        "ATOK",
        bytesPayload2,
        [investor1.address, investor2.address],
        true,
        aFiStorageInstance.address,
        aFiPassiveRebalanceInstance.address,
        aFiManagerInstance.address,
        ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
        "0x0000000000000000000000000000000000000000"
      )

      aTokenConInstance1 = await aFiFactoryInstance.aFiProducts(1)
      console.log("aTokenConInstance1===================", aTokenConInstance1)

      //let txObject = await result.wait()

      //console.log("result++++++++++++++++++++++++", txObject.events[11].args[0]);

      aTokenConInstance1 = await ethers.getContractAt(AFIBASE_ABI, aTokenConInstance1)
      //console.log("result++++++++++++++++++++++++", await aTokenConInstance.getPriceOracle("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"));

      // aFiPassiveRebalanceInstance.intializeStalePriceDelay(
      //   [
      //     "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      //     "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      //     "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      //   ],
      //   [86500, 86500, 86500]
      // )

      await aTokenConInstance1.setplatformWallet(platformWallet.address)
      await aFiAFiOracleInstance.setAFiStorage(aFiStorageInstance.address)
      await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address)
      await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address)
      // // Transfer all AFinance Tokens to PLATFORM_WALLET
      // await aFinanceConInstance.transfer(platformWallet.address, AFINANCE_SUPPLY);

      // MAINNET CONTRACT INSTANCES
      usdcConInstance = await ethers.getContractAt(USDC_ABI, USDC_ADDRESS)
      usdtConInstance = await ethers.getContractAt(USDT_ABI, USDT_ADDRESS)

      const accountToInpersonate = "0xFf73Ba9e0669D7ead82421Ad105bC6D715606Ec4"
      const accountToFund = "0x7Bc58bD67b258b445E4528039BE14824f04d2422"

      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [accountToInpersonate],
      })
      const signer = await ethers.getSigner(accountToInpersonate)

      // const ether = (amount) => {
      //     const weiString = ethers.utils.parseEther(amount.toString());
      //     return BigNumber.from(weiString);
      // };

      /**
       * GIVE APPROVAL TO AFi of DEPOSIT TOKEN
       * THIS IS REQUIRED WHEN 1% fee IS TRANSFEREED FROM INVESTOR TO PLATFORM WALLET
       */

      console.log("print the productttttttttttt", usdtConInstance.address)

      console.log("print the productttttttttttt", aTokenConInstance1.address)

      await usdtConInstance.connect(investor1).approve(aTokenConInstance1.address, ethers.constants.MaxUint256)

      await usdtConInstance.connect(investor2).approve(aTokenConInstance1.address, ethers.constants.MaxUint256)

      await usdcConInstance.connect(investor1).approve(aTokenConInstance1.address, ethers.constants.MaxUint256)

      await usdcConInstance.connect(investor2).approve(aTokenConInstance1.address, ethers.constants.MaxUint256)

      // await daiConInstance.connect(investor1).approve(aTokenConInstance1.address, ethers.constants.MaxUint256)

      // await daiConInstance.connect(investor2).approve(aTokenConInstance1.address, ethers.constants.MaxUint256)

      console.log("transfering to", accountToFund)

      // await daiConInstance.connect(signer).transfer(investor1.address, daiBalance);

      // const accountBalance = await daiConInstance.balanceOf(investor1.address)
      console.log("transfer complete")
      // console.log("funded account balance", accountBalance / 1e18)

      var usdtBalance = await usdtConInstance.balanceOf(accountToInpersonate)
      let usdcBalance = await usdcConInstance.balanceOf(accountToInpersonate)
      usdcBalance = usdcBalance / 100

      console.log("usdcBalance", usdcBalance)
      await usdcConInstance.connect(signer).transfer(investor1.address, "1857818563")
      await usdcConInstance.connect(signer).transfer(investor2.address, "1857818563")

      console.log("usdtBalance", usdtBalance)
      usdtBalance = usdtBalance / 100
      console.lo
      await usdtConInstance.connect(signer).transfer(investor1.address, "3819053104")
      await usdtConInstance.connect(signer).transfer(investor2.address, "3819053104")

      await aFiPassiveRebalanceInstance.updateMidToken(
        [
          "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // USDC
          "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D", // USDT
        ],
        [
          "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // WETH - Middle Token of USDC
          "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // USDC - Middle Token of USDT
        ]
      )

      // Update the oracle data for i tokens
      await aFiPassiveRebalanceInstance.updateOracleData(
        "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
        "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a"
      )
      await aFiPassiveRebalanceInstance.updateOracleData(
        "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D",
        "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b"
      )

      await aFiPassiveRebalanceInstance.setStorage(aFiStorageInstance.address)
      await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address)
      await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address)

      // await aFiPassiveRebalanceInstance.setPriceOracle(
      //   [
      //     "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      //     "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      //     "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      //   ],
      //   [
      //     "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      //     "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      //     "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      //   ],
      //   [
      //     "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
      //     "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
      //     "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9",
      //   ], // USDT, USDC - chainlink oracles
      //   [
      //     "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
      //     "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
      //     "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9",
      //   ]
      // )
      // [
      //     "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8",  // pool DAI-WETH
      //     "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",  // pool USDC - WETH
      //     "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36"   // pool USDT - WETH
      // ],
      // [
      //     "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8",  // pool DAI-WETH
      //     "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",  // pool USDC - WETH
      //     "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36"   // pool USDT - WETH
      // ],
      // [
      //     [[
      //     "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36", // Pool USDT-WETH (Stables- I/O tokens)
      //     "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36", // Pool USDT-WETH (Stables- I/O tokens)
      //     "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36"  // Pool USDT-WETH (Stables- I/O tokens)
      //     ]],[[
      //     "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8", // pool USDC-WETH (Stables- I/O tokens)
      //     "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8", // pool USDC-WETH (Stables- I/O tokens)
      //     "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8"  // pool USDC-WETH (Stables- I/O tokens)
      //     ]]
      // ],
      // [
      //     "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
      //     "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8"
      // ]

      const poolPayload = [
        ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
        [
          "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // WETH - Middle Token of USDC
          "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // USDC - Middle Token of USDT
        ],
        [
          "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // pool USDC - WETH
          "0x2653c274082865f79996B4a8BB3f5C6cF89d6266", // pool USDT - USDC
        ],
        [
          "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // pool USDC - USDC
          "0x2653c274082865f79996B4a8BB3f5C6cF89d6266", // pool USDT - USDC
        ],
        [
          [
            [
              "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // pool USDC-USDC (Stables- I/O tokens)
              "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // pool USDC-USDC (Stables- I/O tokens)
            ],
          ],
          [
            [
              "0x2653c274082865f79996B4a8BB3f5C6cF89d6266", // Pool USDT-USDC (Stables- I/O tokens)
              "0x2653c274082865f79996B4a8BB3f5C6cF89d6266", // Pool USDT-USDC (Stables- I/O tokens)
            ],
          ],
        ],
        ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x2653c274082865f79996B4a8BB3f5C6cF89d6266"],
      ]
      const unipooldata = await aFiPassiveRebalanceInstance.encodePoolData(poolPayload)
      await aFiPassiveRebalanceInstance.initUniStructure(
        ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
        unipooldata
      )

      const investorusdtBalance = await usdtConInstance.balanceOf(investor1.address)
      await aFiAFiOracleInstance.updateVaultControllers(
        aTokenConInstance1.address,
        investor1.address,
        investor1.address
      )
      console.log("transfer completey")
      await aFiPassiveRebalanceInstance.setPauseDepositController(aTokenConInstance1.address, investor1.address)

      console.log("funded account balance usdttttttttt", investorusdtBalance)
    })

    it("401", async () => {
      await aFiAFiOracleInstance.updateVaultControllers(
        aTokenConInstance1.address,
        investor1.address,
        investor1.address
      )
      var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance1.address)

      await aTokenConInstance1.connect(investor1).deposit(1000000000, usdtConInstance.address)

      var navfromStorage = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance1.address,
        aFiStorageInstance.address
      )
      console.log("Nav after deposit", `${navfromStorage}`)

      const swapParams = {
        afiContract: aTokenConInstance1.address,
        oToken: usdtConInstance.address,
        cSwapFee: 1000000,
        cSwapCounter: 0,
        depositTokens: ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
        minimumReturnAmount: [0, 0],
        iMinimumReturnAmount: [0, 0], // Adjust according to your contract's expectations
        underlyingTokens: ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
        newProviders: [0, 0],
        _deadline: deadline,
        cometToClaim: [],
        cometRewardTokens: [],
        rewardTokenMinReturnAmounts: [],
      }

      poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance1.address)
      await aTokenConInstance1.connect(investor1).pauseUnpauseDeposit(true)
      await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

      navfromStorage = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance1.address,
        aFiStorageInstance.address
      )
      console.log("Nav after cswap", `${navfromStorage}`)

      poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance1.address)

      await aTokenConInstance1.connect(investor1).deposit(1000000000, usdcConInstance.address)

      navfromStorage = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance1.address,
        aFiStorageInstance.address
      )
      console.log("Nav after deposit2", `${navfromStorage}`)

      const minimumReturnAmount = [0, 0]

      const Amount = minimumReturnAmount.map((num) => BigNumber.from(num))
      const returnString = Amount.map((bn) => bn.toString())

      poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance1.address)

      var bal = await usdtConInstance.balanceOf(investor1.address)
      console.log("balance usdt before withdraw", `${bal}`)

      await aTokenConInstance1
        .connect(investor1)
        .withdraw(197801111576383300n, usdtConInstance.address, deadline, returnString, 3, 0)

      poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance1.address)

      await aTokenConInstance1
        .connect(investor1)
        .withdraw(1978011115763833000n, usdtConInstance.address, deadline, returnString, 3, 0)

      const balOfUnderlying = await aFiStorageInstance.calculateBalanceOfUnderlying(
        usdtConInstance.address,
        aTokenConInstance1.address
      )
      console.log("balance usdt in underlying", `${balOfUnderlying}`)
    })

    it("Withdraw if token is not staked", async () => {
      await aFiAFiOracleInstance.updateVaultControllers(
        aTokenConInstance1.address,
        investor1.address,
        investor1.address
      )
      var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance1.address)

      await aTokenConInstance1.connect(investor1).deposit(1000000000, usdtConInstance.address)

      var navfromStorage = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance1.address,
        aFiStorageInstance.address
      )
      console.log("Nav after deposit", `${navfromStorage}`)

      const swapParams = {
        afiContract: aTokenConInstance1.address,
        oToken: usdtConInstance.address,
        cSwapFee: 1000000,
        cSwapCounter: 1,
        depositTokens: ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
        minimumReturnAmount: [0, 0],
        iMinimumReturnAmount: [0, 0], // Adjust according to your contract's expectations
        underlyingTokens: ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
        newProviders: [0, 0], // Fill this with the new providers' information
        _deadline: deadline,
        cometToClaim: [],
        cometRewardTokens: [],
        rewardTokenMinReturnAmounts: [],
      }

      poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance1.address)

      console.log("----------------------------**----------")

      await aTokenConInstance1.connect(investor1).pauseUnpauseDeposit(true)
      console.log("--------------------------------------")

      await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

      navfromStorage = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance1.address,
        aFiStorageInstance.address
      )
      console.log("Nav after cswap", `${navfromStorage}`)

      poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance1.address)

      await aTokenConInstance1.connect(investor1).deposit(1000000000, usdcConInstance.address)

      navfromStorage = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance1.address,
        aFiStorageInstance.address
      )
      console.log("Nav after deposit2", `${navfromStorage}`)

      const minimumReturnAmount = [0, 0]

      const Amount = minimumReturnAmount.map((num) => BigNumber.from(num))
      const returnString = Amount.map((bn) => bn.toString())

      poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance1.address)

      var bal = await usdtConInstance.balanceOf(investor1.address)
      console.log("balance usdt before withdraw", `${bal}`)

      await aTokenConInstance1
        .connect(investor1)
        .withdraw(197801111576383300n, usdtConInstance.address, deadline, returnString, 3, 0)

      poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance1.address)

      await aTokenConInstance1
        .connect(investor1)
        .withdraw(1978011115763833000n, usdtConInstance.address, deadline, returnString, 3, 0)
    })
  })

  describe("Miscellaneous tests to increase coverage", async () => {
    let snapshotId
    beforeEach(async () => {
      snapshotId = await ethers.provider.send("evm_snapshot")

      const payload = [
        ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
        [
          "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // USDC - Middle Token of USDC
          "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // USDC - Middle Token of USDT
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
        ["0x25b13e42763a97dd4041f595220642b593962356", "0x4a997f2b619e7c7f4f7c2621b9fa44cd616941e1"],
        ["0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000"],
        [
          "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
          "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
        ],
        ["5000000", "5000000"],
        ["0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000"],
        2,
      ]
      const bytesPayload2 = await aFiFactoryInstance.encodePoolData(payloadnew)

      result = await aFiFactoryInstance.createAToken(
        "AFiBase",
        "ATOK",
        bytesPayload2,
        [investor1.address, investor2.address],
        true,
        aFiStorageInstance.address,
        aFiPassiveRebalanceInstance.address,
        aFiManagerInstance.address,
        ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
        "0x0000000000000000000000000000000000000000"
      )
      aTokenConInstance2 = await aFiFactoryInstance.aFiProducts(1)
      console.log("aTokenConInstance2===================", aTokenConInstance2)

      //let txObject = await result.wait()

      //console.log("result++++++++++++++++++++++++", txObject.events[11].args[0]);

      aTokenConInstance2 = await ethers.getContractAt(AFIBASE_ABI, aTokenConInstance2)
      //console.log("result++++++++++++++++++++++++", await aTokenConInstance.getPriceOracle("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"));

      // aFiPassiveRebalanceInstance.intializeStalePriceDelay(
      //   [
      //     "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      //     "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      //     "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      //     "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // underlying - WBTC
      //     "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37", // WETH
      //     "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // UNI
      //   ],
      //   [86500, 86500, 86500, 86500, 86500, 86500]
      // )
      await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address)
      await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address)
      await aTokenConInstance2.setplatformWallet(platformWallet.address)
      await aFiAFiOracleInstance.setAFiStorage(aFiStorageInstance.address)

      // // Transfer all AFinance Tokens to PLATFORM_WALLET
      // await aFinanceConInstance.transfer(platformWallet.address, AFINANCE_SUPPLY);

      // MAINNET CONTRACT INSTANCES
      usdcConInstance = await ethers.getContractAt(USDC_ABI, USDC_ADDRESS)
      usdtConInstance = await ethers.getContractAt(USDT_ABI, USDT_ADDRESS)

      const accountToInpersonate = "0xFf73Ba9e0669D7ead82421Ad105bC6D715606Ec4"
      const accountToFund = "0x7Bc58bD67b258b445E4528039BE14824f04d2422"

      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [accountToInpersonate],
      })
      const signer = await ethers.getSigner(accountToInpersonate)

      // const ether = (amount) => {
      //     const weiString = ethers.utils.parseEther(amount.toString());
      //     return BigNumber.from(weiString);
      // };

      /**
       * GIVE APPROVAL TO AFi of DEPOSIT TOKEN
       * THIS IS REQUIRED WHEN 1% fee IS TRANSFEREED FROM INVESTOR TO PLATFORM WALLET
       */

      console.log("print the productttttttttttt", usdtConInstance.address)

      console.log("print the productttttttttttt", aTokenConInstance2.address)

      await usdtConInstance.connect(investor1).approve(aTokenConInstance2.address, ethers.constants.MaxUint256)

      await usdtConInstance.connect(investor2).approve(aTokenConInstance2.address, ethers.constants.MaxUint256)

      await usdcConInstance.connect(investor1).approve(aTokenConInstance2.address, ethers.constants.MaxUint256)

      await usdcConInstance.connect(investor2).approve(aTokenConInstance2.address, ethers.constants.MaxUint256)

      // await daiConInstance.connect(investor1).approve(aTokenConInstance2.address, ethers.constants.MaxUint256)

      // await daiConInstance.connect(investor2).approve(aTokenConInstance2.address, ethers.constants.MaxUint256)

      // const daiBalance = await daiConInstance.balanceOf(accountToInpersonate)
      // console.log("whale dai balance", daiBalance / 1e18)
      console.log("transfering to", accountToFund)

      // await daiConInstance.connect(signer).transfer(investor1.address, daiBalance);

      // const accountBalance = await daiConInstance.balanceOf(investor1.address)
      console.log("transfer complete")
      // console.log("funded account balance", accountBalance / 1e18)

      var usdtBalance = await usdtConInstance.balanceOf(accountToInpersonate)
      let usdcBalance = await usdcConInstance.balanceOf(accountToInpersonate)
      usdcBalance = usdcBalance / 100

      console.log("usdcBalance", usdcBalance)
      await usdcConInstance.connect(signer).transfer(investor1.address, "1857818563")
      await usdcConInstance.connect(signer).transfer(investor2.address, "1857818563")

      console.log("usdtBalance", usdtBalance)
      usdtBalance = usdtBalance / 100
      console.lo
      await usdtConInstance.connect(signer).transfer(investor1.address, "3819053104")
      await usdtConInstance.connect(signer).transfer(investor2.address, "3819053104")

      await aFiPassiveRebalanceInstance.updateMidToken(
        [
          "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // USDC
          "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D", // USDT
        ],
        [
          "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // WETH - Middle Token of USDC
          "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // USDC - Middle Token of USDT
        ]
      )

      // Update the oracle data for i tokens
      await aFiPassiveRebalanceInstance.updateOracleData(
        "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
        "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a"
      )
      await aFiPassiveRebalanceInstance.updateOracleData(
        "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D",
        "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b"
      )

      await aFiPassiveRebalanceInstance.setStorage(aFiStorageInstance.address)
      await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address)
      await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address)

      // await aFiPassiveRebalanceInstance.setPriceOracle(
      //   [
      //     "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      //     "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      //     "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      //   ],
      //   [
      //     "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // underlying - WBTC
      //     "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37", // WETH
      //     "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // UNI
      //     "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK
      //     "0xD31a59c85aE9D8edEFeC411D448f90841571b89c", // SOL
      //   ],
      //   [
      //     "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
      //     "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
      //     "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9",
      //   ], // USDT, USDC - chainlink oracles
      //   [
      //     "0xf4030086522a5beea4988f8ca5b36dbc97bee88c",
      //     "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419",
      //     "0x553303d460ee0afb37edff9be42922d8ff63220e",
      //     "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c",
      //     "0x4ffc43a60e009b551865a93d232e33fce9f01507",
      //   ]
      // )

      const poolPayload = [
        ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
        [
          "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // WETH - Middle Token of USDC
          "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // USDC - Middle Token of USDT
        ],
        [
          "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // pool USDC - WETH
          "0x2653c274082865f79996B4a8BB3f5C6cF89d6266", // pool USDT - USDC
        ],
        [
          "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // pool USDC - USDC
          "0x2653c274082865f79996B4a8BB3f5C6cF89d6266", // pool USDT - USDC
        ],
        [
          [
            [
              "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // pool USDC-USDC (Stables- I/O tokens)
              "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // pool USDC-USDC (Stables- I/O tokens)
            ],
          ],
          [
            [
              "0x2653c274082865f79996B4a8BB3f5C6cF89d6266", // Pool USDT-USDC (Stables- I/O tokens)
              "0x2653c274082865f79996B4a8BB3f5C6cF89d6266", // Pool USDT-USDC (Stables- I/O tokens)
            ],
          ],
        ],
        ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x2653c274082865f79996B4a8BB3f5C6cF89d6266"],
      ]
      const unipooldata = await aFiPassiveRebalanceInstance.encodePoolData(poolPayload)
      await aFiPassiveRebalanceInstance.initUniStructure(
        ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
        unipooldata
      )

      const investorusdtBalance = await usdtConInstance.balanceOf(investor1.address)
      await aFiPassiveRebalanceInstance.setPauseDepositController(aTokenConInstance2.address, investor1.address)
      await aTokenConInstance2.setMinDepLimit(100)

      console.log("transfer completey")
      console.log("funded account balance usdttttttttt", investorusdtBalance)
    })

    // it("Deposits and withdrawals", async () => {
    //   await aFiAFiOracleInstance.updateVaultControllers(
    //     aTokenConInstance2.address,
    //     investor1.address,
    //     investor1.address
    //   )

    //   var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance2.address)

    //   await aTokenConInstance2.connect(investor1).deposit(1000000000, usdtConInstance.address)

    //   var navfromStorage = await aFiFactoryInstance.getPricePerFullShare(
    //     aTokenConInstance2.address,
    //     aFiStorageInstance.address
    //   )
    //   console.log("Nav after deposit", `${navfromStorage}`)

    //   const swapParams = {
    //     afiContract: aTokenConInstance2.address,
    //     oToken: usdtConInstance.address,
    //     cSwapFee: 1000000,
    //     cSwapCounter: 0,
    //     depositTokens: ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
    //     minimumReturnAmount: [0, 0],
    //     iMinimumReturnAmount: [0, 0], // Adjust according to your contract's expectations
    //     underlyingTokens: ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
    //     newProviders: [0, 0],
    //     _deadline: deadline,
    //     cometToClaim: [],
    //     cometRewardTokens: [],
    //     rewardTokenMinReturnAmounts: [],
    //   }

    //   poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance2.address)
    //   await aTokenConInstance2.connect(investor1).pauseUnpauseDeposit(true)
    //   await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

    //   navfromStorage = await aFiFactoryInstance.getPricePerFullShare(
    //     aTokenConInstance2.address,
    //     aFiStorageInstance.address
    //   )
    //   console.log("Nav after cswap", `${navfromStorage}`)

    //   poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance2.address)

    //   await aTokenConInstance2.connect(investor1).deposit(100000000, usdcConInstance.address)

    //   navfromStorage = await aFiFactoryInstance.getPricePerFullShare(
    //     aTokenConInstance2.address,
    //     aFiStorageInstance.address
    //   )
    //   console.log("Nav after deposit2", `${navfromStorage}`)

    //   const minimumReturnAmount = [0, 0, 0]

    //   const Amount = minimumReturnAmount.map((num) => BigNumber.from(num))
    //   const returnString = Amount.map((bn) => bn.toString())

    //   poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance2.address)

    //   var bal = await usdtConInstance.balanceOf(investor1.address)
    //   console.log("balance usdt before withdraw", `${bal}`)

    //   await aTokenConInstance2
    //     .connect(investor1)
    //     .withdraw(197801111576383300n, usdtConInstance.address, deadline, returnString, 3, 0)

    //   poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance2.address)

    //   await aTokenConInstance2
    //     .connect(investor1)
    //     .withdraw(1978011115763833000n, usdtConInstance.address, deadline, returnString, 3, 0)

    //   const balOfUnderlying = await aFiStorageInstance.calculateBalanceOfUnderlying(
    //     usdtConInstance.address,
    //     aTokenConInstance2.address
    //   )
    //   console.log("balance usdt in underlying", `${balOfUnderlying}`)
    // })

    it("Underlying tokens length and providers length should be equal when calling rearrange", async () => {
      await aFiAFiOracleInstance.updateVaultControllers(
        aTokenConInstance2.address,
        investor1.address,
        investor1.address
      )

      var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance2.address)

      await aTokenConInstance2.connect(investor1).deposit(1000000000, usdtConInstance.address)

      const nav1 = await aTokenConInstance2.depositUserNav(investor1.address)
      console.log("user nav1", `${nav1}`)

      const NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance2.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage", `${NavfromStorage}`)

      const swapParams = {
        afiContract: aTokenConInstance2.address,
        oToken: usdtConInstance.address,
        cSwapFee: 1000000,
        cSwapCounter: 1,
        depositTokens: ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
        minimumReturnAmount: [0, 0],
        iMinimumReturnAmount: [0, 0], // Adjust according to your contract's expectations
        underlyingTokens: ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
        newProviders: [0],
        _deadline: deadline,
        cometToClaim: [],
        cometRewardTokens: [],
        rewardTokenMinReturnAmounts: [],
      }

      poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance2.address)
      await aTokenConInstance2.connect(investor1).pauseUnpauseDeposit(true)
      await expect(
        aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)
      ).to.be.revertedWith("AFS03")
    })
  })
})