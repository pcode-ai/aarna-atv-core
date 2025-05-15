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
const exp = require("constants")
const { zeroAddress } = require("ethereumjs-util")

const getBigNumber = (number) => ethers.BigNumber.from(number)

describe("AFiBase", () => {
  let platformWallet
  let recipient
  let investor1
  let investor2
  let deadline
  let aTokenConInstance
  let aTokenConInstance1
  let oneInchParam

  // eslint-disable-next-line no-unused-vars
  let usdcConInstance
  let usdtConInstance
  // let aFiDelayModule;

  beforeEach(async () => {
    oneInchParam = {
      firstIterationUnderlyingSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
      secondIterationUnderlyingSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
      firstIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
      secondIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
    }

    const userAccounts = await ethers.getSigners()
    ;[platformWallet, recipient, investor1, investor2, other, gnosisWallet] = userAccounts

    const currentTime = await time.latest()
    deadline = currentTime + 60 * 60

    const AFiBase = await ethers.getContractFactory("AtvBase")
    // const delayModule = await ethers.getContractFactory('TimeDelayModule');
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
    // aFiDelayModule = await delayModule.deploy(86400, 172800);

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
    // itoken not present in utokens
    aTokenConInstance = await aFiFactoryInstance.aFiProducts(0)

    //let txObject = await result.wait()

    //console.log("result++++++++++++++++++++++++", txObject.events[11].args[0]);

    aTokenConInstance = await ethers.getContractAt(AFIBASE_ABI, aTokenConInstance)
    //console.log("result++++++++++++++++++++++++", await aTokenConInstance.getPriceOracle("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"));

    // await aFiPassiveRebalanceInstance.intializeStalePriceDelay(
    //   [
    //     "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    //     "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    //     "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    //     // "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // underlying - WBTC
    //     "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37", // WETH
    //     "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // UNI
    //     "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK
    //     "0xD31a59c85aE9D8edEFeC411D448f90841571b89c", // SOL
    //     "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", //Aave
    //     "0xD533a949740bb3306d119CC777fa900bA034cd52",
    //   ],
    //   [
    //     86500, 86500, 86500,
    //     //86500,
    //     86500, 86500, 86500, 86500, 86500, 86500,
    //   ]
    // )

    await aFiAFiOracleInstance.setAFiStorage(aFiStorageInstance.address)

    // // Transfer all AFinance Tokens to PLATFORM_WALLET
    // await aFinanceConInstance.transfer(platformWallet.address, AFINANCE_SUPPLY);

    // MAINNET CONTRACT INSTANCES
    usdcConInstance = await ethers.getContractAt(USDC_ABI, USDC_ADDRESS)
    usdtConInstance = await ethers.getContractAt(USDT_ABI, USDT_ADDRESS)

    await aFiStorageInstance.setStablesWithdrawalLimit(
      aTokenConInstance.address,
      usdtConInstance.address,
      500000000000000000000n
    )
    await aFiStorageInstance.setStablesWithdrawalLimit(
      aTokenConInstance.address,
      usdcConInstance.address,
      50000000000000000000000n
    )

    const accountToInpersonate = "0xFf73Ba9e0669D7ead82421Ad105bC6D715606Ec4"
    const accountToFund = "0x7Bc58bD67b258b445E4528039BE14824f04d2422"

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [accountToInpersonate],
    })
    const signer = await ethers.getSigner(accountToInpersonate)

    const ether = (amount) => {
      const weiString = ethers.utils.parseEther(amount.toString())
      return BigNumber.from(weiString)
    }

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

    console.log("transfering to", accountToFund)

    var usdtBalance = await usdtConInstance.balanceOf(accountToInpersonate)
    let usdcBalance = await usdcConInstance.balanceOf(accountToInpersonate)
    // usdcBalance = usdcBalance / 2;

    console.log("usdcBalance", usdcBalance)
    await usdcConInstance.connect(signer).transfer(investor1.address, usdcBalance)
    // await usdcConInstance.connect(signer).transfer(investor2.address, usdcBalance);

    console.log("usdtBalance", usdtBalance)
    usdtBalance = usdtBalance / 100
    console.log("usdtBalance", usdtBalance)
    await usdtConInstance.connect(signer).transfer(investor1.address, "1783822029")
    await usdtConInstance.connect(signer).transfer(investor2.address, "1783822029")

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

    await aFiPassiveRebalanceInstance.setStorage(aFiStorageInstance.address)
    await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address)

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

    const investorusdtBalance = await usdtConInstance.balanceOf(investor1.address)
    await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address)
    await aFiPassiveRebalanceInstance.setPauseDepositController(aTokenConInstance.address, investor1.address)
    await aTokenConInstance.setplatformWallet(platformWallet.address)
    await aFiManagerInstance.setRebalanceController(platformWallet.address)
    await aTokenConInstance.setMinDepLimit(100)

    const pwallet = await aTokenConInstance.getplatformWallet()
    console.log("Platform wallet => ", pwallet)

    // const data = await aFiDelayModule.encodeupdateTVLTransaction(3000);
    // console.log("data generated", `${data}`);

    const delayModuleaddress = await aTokenConInstance.getDelayModule()
    console.log("delay module address", `${delayModuleaddress}`)

    const ownerOfBase = await aTokenConInstance.owner()
    console.log("owner of the vault", `${ownerOfBase}`)

    // await aTokenConInstance.setDelayModule(aFiDelayModule.address);

    // await aFiDelayModule.queueTransaction(
    //     aTokenConInstance.address,
    //     0,
    //     "0x",
    //     data,
    //     1718254858
    // )
    // await aFiPassiveRebalanceInstance.setPriceOracle(
    //   [
    //     "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    //     "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    //     "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    //   ],
    //   [
    //     //"0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // underlying - WBTC
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
    //     //"0xf4030086522a5beea4988f8ca5b36dbc97bee88c",
    //     "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419",
    //     "0x553303d460ee0afb37edff9be42922d8ff63220e",
    //     "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c",
    //     "0x4ffc43a60e009b551865a93d232e33fce9f01507",
    //   ]
    // )

    // await aFiPassiveRebalanceInstance.setAFiOracle(aFiAFiOracleInstance.address);
    await aFiPassiveRebalanceInstance.setStorage(aFiStorageInstance.address)
    await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address)
    console.log("transfer complete")
    console.log("funded account balance usdttttttttt", investorusdtBalance)
    await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address)
    await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address)
  })

  context("Basic checks for deposit and withdraw", () => {
    it("deploys AFiContract successfully", async () => {
      const afibaseAddress = aTokenConInstance.address
      assert.notEqual(afibaseAddress, ZERO_ADDRESS)
      assert.notEqual(afibaseAddress, "")
      assert.notEqual(afibaseAddress, null)
      assert.notEqual(afibaseAddress, undefined)
    })

    it("whitelist a deposit token should revert when not called by the owner", async function () {
      await expect(
        aTokenConInstance.connect(investor1).addToWhitelist("0xf817257fed379853cDe0fa4F97AB987181B1E5Ea")
      ).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("whitelist a deposit token should revert if the token is already whitelisted", async function () {
      await expect(aTokenConInstance.addToWhitelist(usdcConInstance.address)).to.be.revertedWith("AB03")
    })

    it("should whitelist a new deposit token", async function () {
      let depositTok = await aTokenConInstance.getInputToken()
      console.log("uTokens", depositTok[0])

      const tokToAdd = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701" // WMON

      await aTokenConInstance.addToWhitelist(tokToAdd)

      depositTok = await aTokenConInstance.getInputToken()
      console.log("uTokens", depositTok[0])

      depositTok = await aTokenConInstance.isOTokenWhitelisted(tokToAdd)
      expect(depositTok).to.equal(true)
    })

    it("pause and unpause deposit", async () => {
      await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true)
      const isDeposit = await aTokenConInstance.isPaused()

      console.log("isDeposit:", isDeposit[0])

      expect(isDeposit[0]).to.equal(true)
      expect(isDeposit[1]).to.equal(false)

      await expect(aTokenConInstance.connect(investor1).deposit(3000000000, usdtConInstance.address)).to.be.reverted

      await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false)
      console.log("isDeposit:", isDeposit[0])
      const isDepositPause1 = await aTokenConInstance.isPaused()
      expect(isDepositPause1[0]).to.equal(false)
      expect(isDepositPause1[1]).to.equal(false)

      await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true)
      await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false)

      const isDepositPause2 = await aTokenConInstance.isPaused()
      console.log("isDeposit:", isDeposit[0])
      console.log("Deposit Pause status is not updated and remained: ", isDepositPause2[0])

      expect(isDepositPause2[0]).to.equal(false)
      expect(isDepositPause2[1]).to.equal(false)
    })

    it("pause and unpause withdraw", async () => {
      await aTokenConInstance.pauseWithdraw(true)
      const isWithdraw = await aTokenConInstance.isPaused()

      console.log("isWithdraw:", isWithdraw[0])

      expect(isWithdraw[0]).to.equal(false)
      expect(isWithdraw[1]).to.equal(true)

      await aTokenConInstance.pauseWithdraw(false)
      const isWithdrawPause1 = await aTokenConInstance.isPaused()
      expect(isWithdrawPause1[0]).to.equal(false)
      expect(isWithdrawPause1[1]).to.equal(false)

      await aTokenConInstance.pauseWithdraw(true)
      await aTokenConInstance.pauseWithdraw(false)

      const isWithdrawPause2 = await aTokenConInstance.isPaused()
      console.log("Deposit Pause status is not updated and remained: ", isWithdrawPause2[0])

      expect(isWithdrawPause2[0]).to.equal(false)
      expect(isWithdrawPause2[1]).to.equal(false)
    })

    it("pause and unpause should be only be called by the owner", async () => {
      await expect(aTokenConInstance.connect(other).pauseUnpauseDeposit(true)).to.be.reverted

      await expect(aTokenConInstance.connect(other).pauseUnpauseDeposit(false)).to.be.reverted

      await expect(aTokenConInstance.connect(other).pauseWithdraw(true)).to.be.reverted

      await expect(aTokenConInstance.connect(other).pauseWithdraw(false)).to.be.reverted

      const isWithdraw = await aTokenConInstance.isPaused()

      console.log("isWithdraw:", isWithdraw[0])

      expect(isWithdraw[0]).to.equal(false)
      expect(isWithdraw[1]).to.equal(false)
    })

    it(" revert cs when deposit is not paused before cs", async () => {
      const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
      console.log("before Deposit user usdt balance", `${beforeUSDTDep}`)
      console.log("check --0")
      console.log("check --1")
      await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

      let AfterusdtBalance1 = await usdtConInstance.balanceOf(investor1.address)
      console.log("After Deposit user usdt balance", `${AfterusdtBalance1}`)

      const nav1 = await aTokenConInstance.depositUserNav(investor1.address)
      console.log("user nav1", `${nav1}`)

      const NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage", `${NavfromStorage}`)

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
        ], // SOL], // Fill this array if your function expects specific tokens
        newProviders: [0, 0],
        _deadline: deadline,
        cometToClaim: [],
        cometRewardTokens: [],
        rewardTokenMinReturnAmounts: [],
      }

      //await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
      await expect(aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x")).to.be
        .reverted
      const controller = await aFiPassiveRebalanceInstance.getPauseDepositController(aTokenConInstance.address)
      expect(controller).to.equal(investor1.address)
    })

    it("revert withdraw when all swap method are false", async () => {
      const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
      console.log("before Deposit user usdt balance", `${beforeUSDTDep}`)

      console.log("check --1")

      await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

      let AfterusdtBalance1 = await usdtConInstance.balanceOf(investor1.address)
      console.log("After Deposit user usdt balance", `${AfterusdtBalance1}`)

      const nav1 = await aTokenConInstance.depositUserNav(investor1.address)
      console.log("user nav1", `${nav1}`)

      const NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage", `${NavfromStorage}`)

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
      await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

      const NavfromStorageAfter = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage after cswap", `${NavfromStorageAfter}`)

      const AfterusdtBalance = await usdtConInstance.balanceOf(investor1.address)
      console.log("After Deposit user usdt balance", `${AfterusdtBalance}`)
      const AfterusdcBalance = await usdcConInstance.balanceOf(aTokenConInstance.address)
      console.log("After deposit user usdc balance", `${AfterusdcBalance}`)

      const afibalance = await usdtConInstance.balanceOf(aTokenConInstance.address)
      console.log("aficontract usdt balance", `${afibalance}`)

      const Afterbal = await aTokenConInstance.balanceOf(investor1.address)
      console.log("Afterbal", `${Afterbal}`)

      const minimumReturnAmount = [0, 0]

      const Amount = minimumReturnAmount.map((num) => BigNumber.from(num))
      const returnString = Amount.map((bn) => bn.toString())

      const AfterwithusdcBalance = await usdtConInstance.balanceOf(investor1.address)
      console.log("Before withdraw user usdt balance", `${AfterwithusdcBalance}`)

      let check = await aFiStorageInstance.getDelayModule()
      console.log("checkkkkkkkk", check)
      console.log("investor balance", await aFiStorageInstance.owner())

      await expect(
        aFiPassiveRebalanceInstance
          .connect(investor2)
          .pauseSwapMethods(aTokenConInstance.address, [1, 2, 3], [false, false, true])
      ).to.be.reverted

      await aFiPassiveRebalanceInstance.pauseSwapMethods(aTokenConInstance.address, [1, 2, 3], [false, false, true])
      let status = await aFiPassiveRebalanceInstance.isSwapMethodPaused(aTokenConInstance.address, 3)
      expect(status).to.equal(true)

      await expect(
        aTokenConInstance
          .connect(investor1)
          .withdraw(197801111576383300n, usdtConInstance.address, deadline, returnString, 3, 0)
      ).to.be.reverted

      await aFiPassiveRebalanceInstance.pauseSwapMethods(aTokenConInstance.address, [1, 2, 3], [false, false, false])

      const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
      console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)
    })

    it("should remove a whitelisted deposit token", async function () {
      snapshotId = await ethers.provider.send("evm_snapshot")

      let depositTok = await aTokenConInstance.isOTokenWhitelisted(usdcConInstance.address)
      expect(depositTok).to.equal(true)
      await aTokenConInstance.removeFromWhitelist(usdcConInstance.address, usdtConInstance.address, deadline, 0, "0x")

      depositTok = await aTokenConInstance.getInputToken()
      console.log("uTokens", depositTok[0])

      depositTok = await aTokenConInstance.isOTokenWhitelisted(usdcConInstance.address)
      expect(depositTok).to.equal(false)

      await ethers.provider.send("evm_revert", [snapshotId])
    })

    it("should remove a whitelisted deposit token when there is balance in predepositTokens", async () => {
      snapshotId = await ethers.provider.send("evm_snapshot")

      const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
      console.log("before Deposit user usdt balance", `${beforeUSDTDep}`)

      await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

      let AfterusdtBalance1 = await usdtConInstance.balanceOf(investor1.address)
      console.log("After Deposit user usdt balance", `${AfterusdtBalance1}`)

      const nav1 = await aTokenConInstance.depositUserNav(investor1.address)
      console.log("user nav1", `${nav1}`)

      const NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage", `${NavfromStorage}`)

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
        ], // Fill this array if your function expects specific tokens
        newProviders: [0, 0],
        _deadline: deadline,
        cometToClaim: [],
        cometRewardTokens: [],
        rewardTokenMinReturnAmounts: [],
      }
      await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true)
      await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

      const NavfromStorageAfter = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage after cswap", `${NavfromStorageAfter}`)

      const AfterusdtBalance = await usdtConInstance.balanceOf(investor1.address)
      console.log("After Deposit user usdt balance", `${AfterusdtBalance}`)
      const AfterusdcBalance = await usdcConInstance.balanceOf(aTokenConInstance.address)
      console.log("After deposit user usdc balance", `${AfterusdcBalance}`)

      const afibalance = await usdtConInstance.balanceOf(aTokenConInstance.address)
      console.log("aficontract usdt balance", `${afibalance}`)

      const Afterbal = await aTokenConInstance.balanceOf(investor1.address)

      console.log("Afterbal", `${Afterbal}`)

      poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)

      await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

      let depositTok = await aTokenConInstance.isOTokenWhitelisted(usdcConInstance.address)
      expect(depositTok).to.equal(true)

      await usdtConInstance.connect(investor1).transfer(aTokenConInstance.address, 10000000)
      await aTokenConInstance.removeFromWhitelist(usdtConInstance.address, usdcConInstance.address, deadline, 0, "0x")

      console.log("balanceof usdt token", await usdtConInstance.balanceOf(aTokenConInstance.address))

      depositTok = await aTokenConInstance.getInputToken()
      console.log("uTokens", depositTok[0])

      depositTok = await aTokenConInstance.isOTokenWhitelisted(usdtConInstance.address)
      expect(depositTok).to.equal(false)

      await ethers.provider.send("evm_revert", [snapshotId])
    })

    it("should revert token and swap token are same", async () => {
      snapshotId = await ethers.provider.send("evm_snapshot")

      const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
      console.log("before Deposit user usdt balance", `${beforeUSDTDep}`)

      console.log("check --0")

      console.log("check --1")

      await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

      let AfterusdtBalance1 = await usdtConInstance.balanceOf(investor1.address)
      console.log("After Deposit user usdt balance", `${AfterusdtBalance1}`)

      const nav1 = await aTokenConInstance.depositUserNav(investor1.address)
      console.log("user nav1", `${nav1}`)

      const NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage", `${NavfromStorage}`)

      await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address)

      const swapParams = {
        afiContract: aTokenConInstance.address,
        oToken: usdtConInstance.address,
        cSwapFee: 1000000,
        cSwapCounter: 1,
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
      await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

      const NavfromStorageAfter = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage after cswap", `${NavfromStorageAfter}`)

      const AfterusdtBalance = await usdtConInstance.balanceOf(investor1.address)
      console.log("After Deposit user usdt balance", `${AfterusdtBalance}`)
      const AfterusdcBalance = await usdcConInstance.balanceOf(aTokenConInstance.address)
      console.log("After deposit user usdc balance", `${AfterusdcBalance}`)

      const afibalance = await usdtConInstance.balanceOf(aTokenConInstance.address)
      console.log("aficontract usdt balance", `${afibalance}`)

      const Afterbal = await aTokenConInstance.balanceOf(investor1.address)

      console.log("Afterbal", `${Afterbal}`)

      await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

      let depositTok = await aTokenConInstance.isOTokenWhitelisted(usdcConInstance.address)
      expect(depositTok).to.equal(true)

      await expect(
        aTokenConInstance.removeFromWhitelist(usdtConInstance.address, usdtConInstance.address, deadline, 0, "0x")
      ).to.be.revertedWith("AB05")

      await ethers.provider.send("evm_revert", [snapshotId])
    })

    it("should remove a whitelisted deposit token when there is balance in predepositTokens and deposit should fail after removal", async () => {
      snapshotId = await ethers.provider.send("evm_snapshot")

      const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
      console.log("before Deposit user usdt balance", `${beforeUSDTDep}`)

      console.log("check --0")

      console.log("check --1")

      await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

      let AfterusdtBalance1 = await usdtConInstance.balanceOf(investor1.address)
      console.log("After Deposit user usdt balance", `${AfterusdtBalance1}`)

      const nav1 = await aTokenConInstance.depositUserNav(investor1.address)
      console.log("user nav1", `${nav1}`)

      const NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage", `${NavfromStorage}`)

      await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address)

      const swapParams = {
        afiContract: aTokenConInstance.address,
        oToken: usdtConInstance.address,
        cSwapFee: 1000000,
        cSwapCounter: 1,
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
      await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

      const NavfromStorageAfter = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage after cswap", `${NavfromStorageAfter}`)

      const AfterusdtBalance = await usdtConInstance.balanceOf(investor1.address)
      console.log("After Deposit user usdt balance", `${AfterusdtBalance}`)
      const AfterusdcBalance = await usdcConInstance.balanceOf(aTokenConInstance.address)
      console.log("After deposit user usdc balance", `${AfterusdcBalance}`)

      const afibalance = await usdtConInstance.balanceOf(aTokenConInstance.address)
      console.log("aficontract usdt balance", `${afibalance}`)

      const Afterbal = await aTokenConInstance.balanceOf(investor1.address)

      console.log("Afterbal", `${Afterbal}`)

      await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

      let depositTok = await aTokenConInstance.isOTokenWhitelisted(usdcConInstance.address)
      expect(depositTok).to.equal(true)

      await aTokenConInstance.removeFromWhitelist(usdtConInstance.address, usdcConInstance.address, deadline, 0, "0x")

      depositTok = await aTokenConInstance.getInputToken()
      console.log("uTokens", depositTok[0])

      depositTok = await aTokenConInstance.isOTokenWhitelisted(usdtConInstance.address)
      expect(depositTok).to.equal(false)

      await expect(
        aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)
      ).to.be.revertedWith("AB03")

      await ethers.provider.send("evm_revert", [snapshotId])
    })

    it("should remove a whitelisted deposit token and NAV should be same", async () => {
      snapshotId = await ethers.provider.send("evm_snapshot")

      const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
      console.log("before Deposit user usdt balance", `${beforeUSDTDep}`)

      console.log("check --0")

      console.log("check --1")

      await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

      let AfterusdtBalance1 = await usdtConInstance.balanceOf(investor1.address)
      console.log("After Deposit user usdt balance", `${AfterusdtBalance1}`)

      const nav1 = await aTokenConInstance.depositUserNav(investor1.address)
      console.log("user nav1", `${nav1}`)

      const NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage", `${NavfromStorage}`)

      await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address)

      const swapParams = {
        afiContract: aTokenConInstance.address,
        oToken: usdtConInstance.address,
        cSwapFee: 1000000,
        cSwapCounter: 1,
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
      await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

      const NavfromStorageAfter = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage after cswap", `${NavfromStorageAfter}`)

      const AfterusdtBalance = await usdtConInstance.balanceOf(investor1.address)
      console.log("After Deposit user usdt balance", `${AfterusdtBalance}`)
      const AfterusdcBalance = await usdcConInstance.balanceOf(aTokenConInstance.address)
      console.log("After deposit user usdc balance", `${AfterusdcBalance}`)

      const afibalance = await usdtConInstance.balanceOf(aTokenConInstance.address)
      console.log("aficontract usdt balance", `${afibalance}`)

      const Afterbal = await aTokenConInstance.balanceOf(investor1.address)

      console.log("Afterbal", `${Afterbal}`)

      await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

      var navfromStorage = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage before removal of token from whitelist", `${navfromStorage}`)

      let depositTok = await aTokenConInstance.isOTokenWhitelisted(usdcConInstance.address)
      expect(depositTok).to.equal(true)

      await aTokenConInstance.removeFromWhitelist(usdtConInstance.address, usdcConInstance.address, deadline, 0, "0x")

      var navfromStorage = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage after removal of token from whitelist", `${navfromStorage}`)

      depositTok = await aTokenConInstance.getInputToken()
      console.log("uTokens", depositTok[0])

      depositTok = await aTokenConInstance.isOTokenWhitelisted(usdtConInstance.address)
      expect(depositTok).to.equal(false)

      await ethers.provider.send("evm_revert", [snapshotId])
    })

    it("deposit check", async () => {
      let depositAmount = 0

      await expect(aTokenConInstance.connect(investor1).deposit(depositAmount, usdtConInstance.address)).to.be.reverted

      // when payment token is not the whitelisted one
      await expect(
        aTokenConInstance.connect(investor1).deposit(1000000000, "0x3a98250F98Dd388C211206983453837C8365BDc1") // shMON
      ).to.be.reverted

      console.log("Deposit call success")
      depositAmount = 1000000000

      await aTokenConInstance.connect(investor1).deposit(depositAmount, usdtConInstance.address)

      const totalSupply = await aTokenConInstance.totalSupply()
      const afiTokenBal = await aTokenConInstance.balanceOf(investor1.address)
      console.log(`balance of afi Token after deposit, ${afiTokenBal}`)
      console.log(`totalSupply Value, ${totalSupply}`)
      expect(`${totalSupply}`).to.not.equal(0)

      await aTokenConInstance.connect(investor1).deposit(depositAmount, usdtConInstance.address)

      // const investedProductList = await aFiFactoryInstance.getUserATokenList(investor1.address);
      // console.log(investedProductList);
    })

    it("deposit check if tvl not updated", async () => {
      let depositAmount = 1000000000
      await aTokenConInstance.connect(investor1).deposit(depositAmount, usdtConInstance.address)

      await aTokenConInstance.connect(investor1).deposit(depositAmount, usdtConInstance.address)

      const totalSupply = await aTokenConInstance.totalSupply()
      const afiTokenBal = await aTokenConInstance.balanceOf(investor1.address)
      console.log(`balance of afi Token after deposit, ${afiTokenBal}`)
      console.log(`totalSupply Value, ${totalSupply}`)
    })

    it("withdraw check", async () => {
      const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
      console.log("before Deposit user usdt balance", `${beforeUSDTDep}`)
      console.log("check --0")

      await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

      let AfterusdtBalance1 = await usdtConInstance.balanceOf(investor1.address)
      console.log("After Deposit user usdt balance", `${AfterusdtBalance1}`)

      const nav1 = await aTokenConInstance.depositUserNav(investor1.address)
      console.log("user nav1", `${nav1}`)

      const NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage", `${NavfromStorage}`)

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
      await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

      const NavfromStorageAfter = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage after cswap", `${NavfromStorageAfter}`)

      const AfterusdtBalance = await usdtConInstance.balanceOf(investor1.address)
      console.log("After Deposit user usdt balance", `${AfterusdtBalance}`)
      const AfterusdcBalance = await usdcConInstance.balanceOf(aTokenConInstance.address)
      console.log("After deposit user usdc balance", `${AfterusdcBalance}`)

      const afibalance = await usdtConInstance.balanceOf(aTokenConInstance.address)
      console.log("aficontract usdt balance", `${afibalance}`)

      const Afterbal = await aTokenConInstance.balanceOf(investor1.address)
      console.log("Afterbal", `${Afterbal}`)

      const minimumReturnAmount = [0, 0]

      const Amount = minimumReturnAmount.map((num) => BigNumber.from(num))
      const returnString = Amount.map((bn) => bn.toString())

      const AfterwithusdcBalance = await usdtConInstance.balanceOf(investor1.address)
      console.log("Before withdraw user usdt balance", `${AfterwithusdcBalance}`)

      await aTokenConInstance
        .connect(investor1)
        .withdraw(197801111576383300n, usdtConInstance.address, deadline, returnString, 3, 0)

      const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
      console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)
    })

    it("check for sandwich attack with same deposit token", async () => {
      const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
      console.log("before Deposit user usdt balance", `${beforeUSDTDep}`)

      console.log("check --0")

      console.log("check --1")

      await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

      let AfterusdtBalance1 = await usdtConInstance.balanceOf(investor1.address)
      console.log("After Deposit user usdt balance", `${AfterusdtBalance1}`)

      const nav1 = await aTokenConInstance.depositUserNav(investor1.address)
      console.log("user nav1", `${nav1}`)

      const NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage", `${NavfromStorage}`)

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
      await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

      const NavfromStorageAfter = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage after cswap", `${NavfromStorageAfter}`)

      const AfterusdtBalance = await usdtConInstance.balanceOf(investor1.address)
      console.log("After Deposit user usdt balance", `${AfterusdtBalance}`)
      const AfterusdcBalance = await usdcConInstance.balanceOf(aTokenConInstance.address)
      console.log("After deposit user usdc balance", `${AfterusdcBalance}`)

      const afibalance = await usdtConInstance.balanceOf(aTokenConInstance.address)
      console.log("aficontract usdt balance", `${afibalance}`)

      const Afterbal = await aTokenConInstance.balanceOf(investor1.address)
      console.log("Afterbal", `${Afterbal}`)

      await aTokenConInstance.connect(investor1).deposit(100000000, usdtConInstance.address)

      await aTokenConInstance.connect(investor1).deposit(1000000000, usdcConInstance.address)

      const minimumReturnAmount = [0, 0]

      const Amount = minimumReturnAmount.map((num) => BigNumber.from(num))
      const returnString = Amount.map((bn) => bn.toString())

      const usdtBalanceInContract = await usdtConInstance.balanceOf(aTokenConInstance.address)
      console.log("usdtBalanceInContract", usdtBalanceInContract)

      const AfterwithusdcBalance = await usdtConInstance.balanceOf(investor1.address)
      console.log("Before withdraw user usdt balance", `${AfterwithusdcBalance}`)

      await aTokenConInstance
        .connect(investor1)
        .withdraw(2000000000000000000n, usdtConInstance.address, deadline, returnString, 2, 0)

      const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
      console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)
    })

    it("check for sandwich attack with different deposit token", async () => {
      const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
      console.log("before Deposit user usdt balance", `${beforeUSDTDep}`)

      console.log("check --0")

      console.log("check --1")

      await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

      let AfterusdtBalance1 = await usdtConInstance.balanceOf(investor1.address)
      console.log("After Deposit user usdt balance", `${AfterusdtBalance1}`)

      const nav1 = await aTokenConInstance.depositUserNav(investor1.address)
      console.log("user nav1", `${nav1}`)

      const NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage", `${NavfromStorage}`)

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
      await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

      const NavfromStorageAfter = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage after cswap", `${NavfromStorageAfter}`)

      const AfterusdtBalance = await usdtConInstance.balanceOf(investor1.address)
      console.log("After Deposit user usdt balance", `${AfterusdtBalance}`)
      const AfterusdcBalance = await usdcConInstance.balanceOf(aTokenConInstance.address)
      console.log("After deposit user usdc balance", `${AfterusdcBalance}`)

      const afibalance = await usdtConInstance.balanceOf(aTokenConInstance.address)
      console.log("aficontract usdt balance", `${afibalance}`)

      const Afterbal = await aTokenConInstance.balanceOf(investor1.address)
      console.log("Afterbal", `${Afterbal}`)

      await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

      const minimumReturnAmount = [0, 0]

      const Amount = minimumReturnAmount.map((num) => BigNumber.from(num))
      const returnString = Amount.map((bn) => bn.toString())

      const AfterwithusdcBalance = await usdtConInstance.balanceOf(investor1.address)
      console.log("Before withdraw user usdt balance", `${AfterwithusdcBalance}`)

      await aTokenConInstance
        .connect(investor1)
        .withdraw(2000000000000000000n, usdtConInstance.address, deadline, returnString, 2, 0)

      const AfterwithusdtBalance = await usdtConInstance.balanceOf(aTokenConInstance.address)
      console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)
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

      let swapParams = {
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
      await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

      const Afterbal1 = await aTokenConInstance.balanceOf(investor1.address)
      const minimumReturnAmount = [0, 0]
      const Amount = minimumReturnAmount.map((num) => BigNumber.from(num))
      const returnString = Amount.map((bn) => bn.toString())

      await aTokenConInstance
        .connect(investor1)
        .withdraw(`${Afterbal1}`, usdtConInstance.address, deadline, returnString, 3, 0)
    })

    it("withdraw check if tvl is not updated", async () => {
      var nav1 = await aTokenConInstance.depositUserNav(investor1.address)
      console.log("user nav1 before deposit", `${nav1}`)

      const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
      console.log("before Deposit user usdt balance", `${beforeUSDTDep}`)

      const isOTokenWhitelisted = await aTokenConInstance.isOTokenWhitelisted(usdtConInstance.address)
      expect(isOTokenWhitelisted).to.equal(true)

      await aTokenConInstance.connect(investor1).deposit(10000000000, usdtConInstance.address)

      let AfterusdtBalance1 = await usdtConInstance.balanceOf(investor1.address)
      console.log("After Deposit user usdt balance", `${AfterusdtBalance1}`)

      nav1 = await aTokenConInstance.depositUserNav(investor1.address)
      console.log("user nav1 after deposit", `${nav1}`)

      const NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage", `${NavfromStorage}`)

      await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address)

      const swapParams = {
        afiContract: aTokenConInstance.address,
        oToken: usdtConInstance.address,
        cSwapFee: 1000000,
        cSwapCounter: 1,
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
      await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

      await aTokenConInstance.connect(investor2).deposit(10000000000, usdtConInstance.address)

      const NavfromStorageAfter = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage after cswap", `${NavfromStorageAfter}`)

      const AfterusdtBalance = await usdtConInstance.balanceOf(investor1.address)
      console.log("After Deposit user usdt balance", `${AfterusdtBalance}`)
      const AfterusdcBalance = await usdcConInstance.balanceOf(aTokenConInstance.address)
      console.log("After deposit user usdc balance", `${AfterusdcBalance}`)

      const afibalance = await usdtConInstance.balanceOf(aTokenConInstance.address)
      console.log("aficontract usdt balance", `${afibalance}`)

      const Afterbal = await aTokenConInstance.balanceOf(investor1.address)
      console.log("Afterbal", `${Afterbal}`)

      const minimumReturnAmount = [0, 0]

      const Amount = minimumReturnAmount.map((num) => BigNumber.from(num))
      const returnString = Amount.map((bn) => bn.toString())

      await expect(
        aTokenConInstance
          .connect(investor1)
          .withdraw(1978011115763833000n, usdtConInstance.address, deadline, returnString, 1, 0)
      ).to.be.reverted

      const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
      console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)
      const AfterwithusdcBalance = await usdcConInstance.balanceOf(investor1.address)
      console.log("After withdraw user usdc balance", `${AfterwithusdcBalance}`)
    })

    it("nav check - 1", async () => {
      await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

      await aTokenConInstance.connect(investor2).deposit(1000000000, usdtConInstance.address)

      const nav1 = await aTokenConInstance.depositUserNav(investor1.address)
      console.log("user nav1", `${nav1}`)

      var NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage", `${NavfromStorage}`)

      const nav3 = await aTokenConInstance.depositUserNav(investor2.address)
      console.log("user nav3", `${nav3}`)

      const pool2 = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)
      console.log("pool2", `${pool2}`)

      const AfterusdtBalance = await usdtConInstance.balanceOf(investor1.address)
      console.log("After Deposit user usdt balance", `${AfterusdtBalance}`)

      const Afterbal = await aTokenConInstance.balanceOf(investor1.address)

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
      await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

      const minimumReturnAmount = [0, 0]

      const Amount = minimumReturnAmount.map((num) => BigNumber.from(num))
      const returnString = Amount.map((bn) => bn.toString())

      NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage before withdraw", `${NavfromStorage}`)

      var totalSupply = await aTokenConInstance.totalSupply()
      console.log("Total supply", `${totalSupply}`)

      await aTokenConInstance
        .connect(investor1)
        .withdraw(`${Afterbal}`, usdtConInstance.address, deadline, returnString, 3, 0)

      const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
      console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)

      const totalsupply = await aTokenConInstance.totalSupply()
      console.log("totalSupply", `${totalsupply}`)

      const swapParams1 = {
        afiContract: aTokenConInstance.address,
        oToken: usdtConInstance.address,
        cSwapFee: 1000000,
        cSwapCounter: 1,
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

      await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

      const NavfromStorage2 = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage", `${NavfromStorage2}`)

      const nav4 = await aTokenConInstance.depositUserNav(investor1.address)
      console.log("user nav4", `${nav4}`)

      const pool4 = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)
      console.log("pool4", `${pool4}`)

      const Afterbal1 = await aTokenConInstance.balanceOf(investor1.address)
      await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true)
      await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams1, 0, oneInchParam, "0x", 0)

      await aTokenConInstance
        .connect(investor1)
        .withdraw(`${Afterbal1}`, usdtConInstance.address, deadline, returnString, 3, 0)

      const NavfromStorage3 = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage", `${NavfromStorage3}`)

      const pool5 = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)
      console.log("pool5", `${pool5}`)

      await aTokenConInstance.connect(investor2).deposit(1000000000, usdtConInstance.address)

      const NavfromStorage4 = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage", `${NavfromStorage4}`)

      const nav5 = await aTokenConInstance.depositUserNav(investor2.address)
      console.log("user nav5", `${nav5}`)

      await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

      const NavfromStorage5 = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage", `${NavfromStorage5}`)

      const nav6 = await aTokenConInstance.depositUserNav(investor1.address)
      console.log("user nav6", `${nav6}`)
    })

    it("emergency withdraw", async () => {
      var staleBal = await usdtConInstance.balanceOf(investor1.address)
      console.log("usdt balance of user before deposit ", `${staleBal}`)

      await aTokenConInstance.connect(investor2).deposit(1000000000, usdtConInstance.address)

      await aTokenConInstance.connect(investor2).deposit(1000000000, usdtConInstance.address)

      await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address)

      const swapParams = {
        afiContract: aTokenConInstance.address,
        oToken: usdtConInstance.address,
        cSwapFee: 1000000,
        cSwapCounter: 1,
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
      await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

      var NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("After 2nd deposit nav from storage value", `${NavfromStorage}`)

      await aFiManagerInstance.emergencyRebalance(
        aTokenConInstance.address,
        aFiStorageInstance.address,
        "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37",
        [10000000]
      )

      NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("After 2nd deposit nav from storage value", `${NavfromStorage}`)

      var uTokenProp2 = await aTokenConInstance.getProportions()
      console.log("uTokenProp", `${uTokenProp2[0]}`)

      var utokensafter = await aTokenConInstance.getUTokens()
      console.log(utokensafter)

      const wethTokenInstance = await ethers.getContractAt(DAI_ABI, "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37")

      var staleBal = await wethTokenInstance.balanceOf(aTokenConInstance.address)
      console.log("staleBal = ", `${staleBal}`)

      await aTokenConInstance
        .connect(platformWallet)
        .emergencyWithdraw(wethTokenInstance.address, platformWallet.address)

      staleBal = await usdtConInstance.balanceOf(platformWallet.address)
      console.log("staleBal after emergency withdraw = ", `${staleBal}`)
    })

    it("Deposits and withdraw and timelock staking", async () => {
      const pool = await aFiPassiveRebalanceInstance.getPool(
        "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D",
        "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea"
      )
      console.log("uni pool ", `${pool}`)
      expect(`${pool}`).to.equal("0x2653c274082865f79996B4a8BB3f5C6cF89d6266")

      await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

      const AfterusdtBalance = await usdtConInstance.balanceOf(investor1.address)
      console.log("After Deposit user usdt balance", `${AfterusdtBalance}`)
      const AfterusdcBalance = await usdcConInstance.balanceOf(investor1.address)
      console.log("After deposit user usdc balance", `${AfterusdcBalance}`)
      const Afterbal = await aTokenConInstance.balanceOf(investor1.address)
      console.log("afi token balance", `${Afterbal}`)

      await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address)

      const swapParams = {
        afiContract: aTokenConInstance.address,
        oToken: usdtConInstance.address,
        cSwapFee: 1000000,
        cSwapCounter: 1,
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
      await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

      await aTokenConInstance.updateTimeLockContract(other.address)

      const lockAmount = 1000085485669041487n
      await aTokenConInstance.connect(other).stakeShares(investor1.address, lockAmount, true)
      const AfterLockbal = await aTokenConInstance.balanceOf(investor1.address)
      console.log("afi token balance", `${AfterLockbal}`)

      const AfterLockbalOfStakingContract = await aTokenConInstance.balanceOf(other.address)
      console.log("afi token balance of staking contract", `${AfterLockbalOfStakingContract}`)

      var calc = BigNumber.from(AfterLockbal.toString()).sub(BigNumber.from(lockAmount.toString()))
      console.log("bal - locked", `${calc}`)

      const minimumReturnAmount = [0, 0]

      const Amount = minimumReturnAmount.map((num) => BigNumber.from(num))
      const returnString = Amount.map((bn) => bn.toString())

      await aTokenConInstance
        .connect(investor1)
        .withdraw(`${calc}`, usdtConInstance.address, deadline, returnString, 3, 0)

      const nav = await aTokenConInstance.depositUserNav(investor1.address)
      console.log("user nav", `${nav}`)

      await aTokenConInstance.connect(other).stakeShares(investor1.address, lockAmount, false)

      const AfterunLockbal = await aTokenConInstance.balanceOf(investor1.address)
      console.log("afi token balance after unlock", `${AfterunLockbal}`)

      const AfterunLockbalOfStakingContract = await aTokenConInstance.balanceOf(investor1.address)
      console.log("afi token balance of staking contract after unlock", `${AfterunLockbalOfStakingContract}`)
    })

    it("multiple transactions", async () => {
      const balWhale = await usdtConInstance.balanceOf(investor1.address)
      console.log("balWhale", `${balWhale}`)

      // NOTE: AS error msg comes when withdrawing very less amount

      await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

      await aTokenConInstance.connect(investor2).deposit(1000000000, usdtConInstance.address)

      const nav1 = await aTokenConInstance.depositUserNav(investor1.address)
      console.log("user nav1", `${nav1}`)

      const NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage", `${NavfromStorage}`)

      const AfterusdtBalance = await usdtConInstance.balanceOf(investor1.address)
      console.log("After Deposit user usdt balance", `${AfterusdtBalance}`)

      const Afterbal = await aTokenConInstance.balanceOf(investor2.address)

      console.log("balance", `${Afterbal}`)

      await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address)

      const swapParams = {
        afiContract: aTokenConInstance.address,
        oToken: usdtConInstance.address,
        cSwapFee: 1000000,
        cSwapCounter: 1,
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
      await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

      const minimumReturnAmount = [0, 0]

      const Amount = minimumReturnAmount.map((num) => BigNumber.from(num))
      const returnString = Amount.map((bn) => bn.toString())

      await aTokenConInstance
        .connect(investor2)
        .withdraw(`${Afterbal}`, usdtConInstance.address, deadline, returnString, 3, 0)

      const NavfromStorage7 = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage", `${NavfromStorage7}`)

      const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
      console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)

      const totalsupply = await aTokenConInstance.totalSupply()
      console.log("totalSupply", `${totalsupply}`)

      await aTokenConInstance.connect(investor2).deposit(1000000000, usdtConInstance.address)

      await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

      const NavfromStorage9 = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )
      console.log("Nav from storage", `${NavfromStorage9}`)

      await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true)
      await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

      const Afterbal3 = await aTokenConInstance.balanceOf(investor1.address)

      await aTokenConInstance
        .connect(investor1)
        .withdraw(`${Afterbal3}`, usdtConInstance.address, deadline, returnString, 3, 0)

      console.log("balance", `${Afterbal3}`)

      await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

      await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true)
      await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

      const Afterbal4 = await aTokenConInstance.balanceOf(investor1.address)

      await aTokenConInstance
        .connect(investor1)
        .withdraw(`${Afterbal4}`, usdtConInstance.address, deadline, returnString, 3, 0)
    })

    describe("Sets New Manager and  test of  Manager specific function", async () => {
      beforeEach(async () => {
        const NewAFiManager = other.address
        // await aTokenConInstance.setAFiManager(NewAFiManager);

        await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)
      })
    })

    describe("Deposit stable twice by investor", async () => {
      it("Deposit stable and balanceSumer after deposit", async () => {
        await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

        await aFiAFiOracleInstance.updateVaultControllers(
          aTokenConInstance.address,
          investor1.address,
          investor1.address
        )

        const swapParams = {
          afiContract: aTokenConInstance.address,
          oToken: usdtConInstance.address,
          cSwapFee: 1000000,
          cSwapCounter: 1,
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

        poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)

        await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true)
        await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

        // const aaveTokenCopy = await aFiStorageInstance.aaveTokenCopy(
        //   aTokenConInstance.address,
        //   "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599"
        // )
        // const aaveTokenInstance = await ethers.getContractAt(DAI_ABI, aaveTokenCopy)
        // const balanceAave = await aaveTokenInstance.balanceOf(aTokenConInstance.address)
        // console.log("balance Aave", `${balanceAave}`)

        // expect(`${balanceAave}`).to.not.equal("0")

        // const compoundTokenCopy = await aFiStorageInstance.compoundCopy(
        //   aTokenConInstance.address,
        //   "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599"
        // )
        // const compoundTokenInstance = await ethers.getContractAt(DAI_ABI, compoundTokenCopy)
        // const balanceCompound = await compoundTokenInstance.balanceOf(aTokenConInstance.address)
        // console.log("balance Compound", `${balanceCompound}`)

        // expect(`${balanceCompound}`).to.equal("0")

        const price = await aFiAFiOracleInstance.getPriceAndDecimals(
          "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D",
          "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b"
        )
        console.log("price", price)
        const sumerBal = await aFiStorageInstance.balanceSumerInToken(
          "0xcf5a6076cfa32686c0df13abada2b40dec133f1d",
          aTokenConInstance.address
        )
        console.log("sumerBal", sumerBal)
      })

      it("Set the passiveRebal strategy number", async () => {
        await aFiPassiveRebalanceInstance.updateRebalStrategyNumberByOwner(aTokenConInstance.address, 1)
        const strategyNumber = await aFiPassiveRebalanceInstance.getRebalStrategyNumber(aTokenConInstance.address)

        expect(`${strategyNumber}`).to.equal("1")

        await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)
      })
    })

    describe("Emergency withdraw and revert", async () => {
      it("revert when caller is not owner for updatePoolData", async () => {
        const PLATFORM_WALLET = "0xB60C61DBb7456f024f9338c739B02Be68e3F545C"
        const payload = [
          ["0xcf5a6076cfa32686c0df13abada2b40dec133f1d"],
          ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea"],
          ["0x5d5Adb39c2419403eaf4DD06c2368dD8FACd6eE3"],
          ["0x5d5Adb39c2419403eaf4DD06c2368dD8FACd6eE3"],
          [[["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea"]], [["0x2653c274082865f79996B4a8BB3f5C6cF89d6266"]]],
          ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x2653c274082865f79996B4a8BB3f5C6cF89d6266"],
        ]
        const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

        const payloadnew = [
          ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"], //USDC, USDT - payment tokens
          [
            "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
            "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
          ],
          uDataPayload,
          ["0x0000000000000000000000000000000000000000"],
          ["0x0000000000000000000000000000000000000000"],
          ["0xc9d8b075a5c69303365ae23633d4e085199bf5c520a3b90fed1322a0342ffc33"],
          ["0"],
          ["0x0000000000000000000000000000000000000000"],
          2,
        ]

        const bytesData = await aFiFactoryInstance.encodePoolData(payloadnew)

        await expect(aTokenConInstance.connect(investor1).updatePoolData(bytesData)).to.be.reverted
      })

      // it("revert when caller is not owner or manager to update oracle data", async() => {
      //     // await deployedAFiBase.setAFiManager(accounts[9]);
      //     console.log("checkkkkkk",(await aTokenConInstance.owner()));
      //     console.log("checkkkkkk",platformWallet.address);
      //     expect(await aTokenConInstance.owner()).to.equal(platformWallet.address);

      //     await expect(
      //         aTokenConInstance.connect(other).updateOracleData("0x6B175474E89094C44Da98b954EedeAC495271d0F", "0x018008bfb33d285247A21d44E50697654f754e63", "0x6B175474E89094C44Da98b954EedeAC495271d0F")
      //     ).to.be.reverted;
      // });
    })

    describe("Pause and unpause deposit tokens", async () => {
      it("Pause deposit token", async () => {
        await aTokenConInstance.togglePauseDepositTokenForWithdrawals(usdtConInstance.address, true)

        var isPausedForWithdrawals = await aTokenConInstance.isPausedForWithdrawals(usdtConInstance.address)
        expect(isPausedForWithdrawals).to.equal(true)
      })

      it("Unpause deposit token", async () => {
        await aTokenConInstance.togglePauseDepositTokenForWithdrawals(usdtConInstance.address, true)

        var isPausedForWithdrawals = await aTokenConInstance.isPausedForWithdrawals(usdtConInstance.address)
        expect(isPausedForWithdrawals).to.equal(true)

        await aTokenConInstance.togglePauseDepositTokenForWithdrawals(usdtConInstance.address, false)

        isPausedForWithdrawals = await aTokenConInstance.isPausedForWithdrawals(usdtConInstance.address)
        expect(isPausedForWithdrawals).to.equal(false)
      })

      it("Should not be able to withdraw in that token if it's paused", async () => {
        await aTokenConInstance.togglePauseDepositTokenForWithdrawals(usdtConInstance.address, true)

        await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

        await aFiAFiOracleInstance.updateVaultControllers(
          aTokenConInstance.address,
          investor1.address,
          investor1.address
        )

        const swapParams = {
          afiContract: aTokenConInstance.address,
          oToken: usdtConInstance.address,
          cSwapFee: 1000000,
          cSwapCounter: 1,
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

        poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)

        await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true)
        await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

        const minimumReturnAmount = [0, 0]

        const Amount = minimumReturnAmount.map((num) => BigNumber.from(num))
        const returnString = Amount.map((bn) => bn.toString())

        poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)

        await expect(
          aTokenConInstance
            .connect(investor1)
            .withdraw(197801111576383300n, usdtConInstance.address, deadline, returnString, 1, 0)
        ).to.be.reverted
      })

      it("Should not be able to pause deposit token if not whitelisted", async () => {
        await expect(
          aTokenConInstance.togglePauseDepositTokenForWithdrawals("0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", true)
        ).to.be.reverted
      })

      it("Should not be able to unpause deposit token if not paused", async () => {
        var isPausedForWithdrawals = await aTokenConInstance.isPausedForWithdrawals(usdtConInstance.address)
        expect(isPausedForWithdrawals).to.equal(false)

        await expect(aTokenConInstance.togglePauseDepositTokenForWithdrawals(usdcConInstance.address, false)).to.be
          .reverted
      })

      it("Should not be able to pause or unpause deposit token if not called by the owner", async () => {
        await expect(
          aTokenConInstance.connect(other).togglePauseDepositTokenForWithdrawals(usdcConInstance.address, true)
        ).to.be.reverted
      })
    })

    describe("Emergency withdraw", async () => {
      it("emergency withdraw when product type is 2", async () => {
        var staleBal = await usdtConInstance.balanceOf(investor1.address)
        console.log("usdt balance of user before deposit ", `${staleBal}`)

        await aTokenConInstance.connect(investor2).deposit(1000000000, usdtConInstance.address)

        poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)

        await aTokenConInstance.connect(investor2).deposit(1000000000, usdtConInstance.address)

        await aFiAFiOracleInstance.updateVaultControllers(
          aTokenConInstance.address,
          investor1.address,
          investor1.address
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

        const swapParams = {
          afiContract: aTokenConInstance.address,
          oToken: usdtConInstance.address,
          cSwapFee: 1000000,
          cSwapCounter: 1,
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
        await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

        var NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(
          aTokenConInstance.address,
          aFiStorageInstance.address
        )
        console.log("After 2nd deposit nav from storage value", `${NavfromStorage}`)

        await aFiManagerInstance.emergencyRebalance(
          aTokenConInstance.address,
          aFiStorageInstance.address,
          "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37",
          [10000000]
        )

        NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(
          aTokenConInstance.address,
          aFiStorageInstance.address
        )
        console.log("After 2nd deposit nav from storage value", `${NavfromStorage}`)

        var uTokenProp2 = await aTokenConInstance.getProportions()
        console.log("uTokenProp", `${uTokenProp2[0]}`)

        var utokensafter = await aTokenConInstance.getUTokens()
        console.log(utokensafter)

        const wethTokenInstance = await ethers.getContractAt(DAI_ABI, "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37")

        var staleBal = await wethTokenInstance.balanceOf(aTokenConInstance.address)
        console.log("staleBal = ", `${staleBal}`)

        await aTokenConInstance
          .connect(platformWallet)
          .emergencyWithdraw(wethTokenInstance.address, platformWallet.address)

        staleBal = await usdtConInstance.balanceOf(platformWallet.address)
        console.log("staleBal after emergency withdraw = ", `${staleBal}`)
      })
    })

    describe("Miscellaneous tests to increase coverage", async () => {
      it("deposit and withdraw when updated tvl has expired", async () => {
        console.log("check -- 1")

        await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)
        console.log("check -- 2")

        await aFiAFiOracleInstance.updateVaultControllers(
          aTokenConInstance.address,
          investor1.address,
          investor1.address
        )
        console.log("check -- 3")

        const swapParams = {
          afiContract: aTokenConInstance.address,
          oToken: usdtConInstance.address,
          cSwapFee: 1000000,
          cSwapCounter: 1,
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

        console.log("check -- 4")
        poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)

        console.log("check -- 5")
        await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true)
        await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

        const minimumReturnAmount = [0, 0]

        const Amount = minimumReturnAmount.map((num) => BigNumber.from(num))
        const returnString = Amount.map((bn) => bn.toString())
        console.log("check -- 6")

        poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)

        console.log("check -- 7")

        await aTokenConInstance
          .connect(investor1)
          .withdraw(197801111576383300n, usdtConInstance.address, deadline, returnString, 3, 0)
      })

      it("stake shares and update locked tokens edge cases", async () => {
        var staleBal = await usdtConInstance.balanceOf(investor1.address)
        console.log("usdt balance of user before deposit ", `${staleBal}`)

        await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

        await aTokenConInstance.updateTimeLockContract(other.address)

        await expect(aTokenConInstance.connect(other).stakeShares(other.address, 100, false)).to.be.reverted

        const one_unit = 1000000000000000000n

        const afibalanceBefore = await aTokenConInstance.balanceOf(investor1.address)

        await aTokenConInstance.connect(other).updateLockedTokens(investor1.address, one_unit, true, true, false, 0)

        const afibalanceAfter = await aTokenConInstance.balanceOf(investor1.address)

        expect(afibalanceBefore.sub(afibalanceAfter)).to.equal(one_unit)
      })

      it("updateTimeLockContract only by owner and emergencyWithdraw only by the platform wallet", async () => {
        await usdtConInstance.connect(investor1).transfer(aTokenConInstance.address, 1000)

        await aTokenConInstance.updateTimeLockContract(other.address)

        await expect(aTokenConInstance.connect(other).updateTimeLockContract(investor1.address)).to.be.reverted

        await expect(aTokenConInstance.emergencyWithdraw(usdtConInstance.address, investor1.address)).to.be.reverted
      })

      it("setplatformWallet only by owner and should not be 0 address", async () => {
        await expect(aTokenConInstance.connect(other).setplatformWallet(investor1.address)).to.be.revertedWith(
          "Ownable: caller is not the owner"
        )

        await expect(aTokenConInstance.setplatformWallet(ZERO_ADDRESS)).to.be.revertedWith("AB05")
      })

      it("updateInputTokens should update non-overlapping tokens", async () => {
        var inputTokens = await aTokenConInstance.getInputToken()
        console.log("Non-overlapping tokens", `${inputTokens[1]}`)

        await aTokenConInstance.updateInputTokens(["0xdAC17F958D2ee523a2206206994597C13D831ec7"])

        inputTokens = await aTokenConInstance.getInputToken()
        console.log("Non-overlapping tokens", `${inputTokens[1]}`)
      })

      it("updateInputTokens should only be called by the owner", async () => {
        var inputTokens = await aTokenConInstance.getInputToken()
        console.log("Non-overlapping tokens", `${inputTokens[1]}`)

        await expect(aTokenConInstance.connect(other).updateInputTokens(["0xdAC17F958D2ee523a2206206994597C13D831ec7"]))
          .to.be.reverted

        inputTokens = await aTokenConInstance.getInputToken()
        console.log("Non-overlapping tokens", `${inputTokens[1]}`)
      })

      it("should get deposit and underlying tokens", async () => {
        var tokens = await aTokenConInstance.getInputToken()
        console.log("deposit tokens", `${tokens[0]}`)

        var utokens = await aTokenConInstance.getUTokens()

        console.log("underlying tokens", `${utokens}`)

        expect(tokens[0].length).to.equal(2)
        expect(utokens.length).to.equal(2)
      })

      it("setUnstakeData should only be called by oracle", async () => {
        await expect(aTokenConInstance.connect(other).setUnstakeData(100)).to.be.reverted
      })

      it("should set transferability", async () => {
        await expect(aTokenConInstance.connect(other).setAfiTransferability(true)).to.be.revertedWith(
          "Ownable: caller is not the owner"
        )

        await aTokenConInstance.setAfiTransferability(true)

        expect(await aTokenConInstance.isAfiTransferrable()).to.equal(true)
      })

      it("should transfer AFi when transferability is true", async () => {
        await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

        await aFiAFiOracleInstance.updateVaultControllers(
          aTokenConInstance.address,
          investor1.address,
          investor1.address
        )

        const swapParams = {
          afiContract: aTokenConInstance.address,
          oToken: usdtConInstance.address,
          cSwapFee: 1000000,
          cSwapCounter: 1,
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

        poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)

        await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true)
        await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

        await aTokenConInstance.setAfiTransferability(true)

        expect(await aTokenConInstance.isAfiTransferrable()).to.equal(true)

        await aTokenConInstance.connect(investor1).transfer(investor2.address, 100)

        expect(await aTokenConInstance.balanceOf(investor2.address)).to.equal(100)
      })

      it("should not transfer AFi when transferability is false or liquid balance is low", async () => {
        await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

        await expect(aTokenConInstance.connect(investor1).transfer(investor2.address, 100)).to.be.revertedWith("AB03")

        await aTokenConInstance.setAfiTransferability(true)

        expect(await aTokenConInstance.isAfiTransferrable()).to.equal(true)

        await expect(aTokenConInstance.connect(investor1).transfer(investor2.address, 100)).to.be.revertedWith("AB24")
      })

      // it('sendProfitOrFeeToManager should transfer fee to manager', async () => {
      //     const profit = 1000n;
      //     await usdtConInstance.connect(investor1).transfer(aTokenConInstance.address, profit);
      //     await aTokenConInstance.setAFiManager(other.address);
      //     const balBefore = await usdtConInstance.balanceOf(investor2.address);
      //     await aTokenConInstance.connect(other).sendProfitOrFeeToManager(investor2.address, profit, usdtConInstance.address);

      //     const balAfter = await usdtConInstance.balanceOf(investor2.address);

      //     expect(balAfter.sub(balBefore)).to.equal(profit);
      // });

      it("should revert if there is insufficient oToken balance", async () => {
        await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

        await aFiAFiOracleInstance.updateVaultControllers(
          aTokenConInstance.address,
          investor1.address,
          investor1.address
        )

        const swapParams = {
          afiContract: aTokenConInstance.address,
          oToken: usdtConInstance.address,
          cSwapFee: 1000000,
          cSwapCounter: 1,
          depositTokens: ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
          minimumReturnAmount: [0, 0],
          iMinimumReturnAmount: [0, 0], // Adjust according to your contract's expectations
          underlyingTokens: [
            "0xcf5a6076cfa32686c0df13abada2b40dec133f1d", // WBTC
            "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37",
          ], // SOL], // Fill this array if your function expects specific tokens
          newProviders: [0, 0],
          _deadline: deadline,
          cometToClaim: [],
          cometRewardTokens: [],
          rewardTokenMinReturnAmounts: [],
        }

        poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)

        await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true)
        await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

        const minimumReturnAmount = [0, 0]

        const Amount = minimumReturnAmount.map((num) => BigNumber.from(num))
        const returnString = Amount.map((bn) => bn.toString())

        poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)

        await expect(
          aTokenConInstance
            .connect(investor1)
            .withdraw(19780111157638330000n, usdtConInstance.address, deadline, returnString, 2, 0)
        ).to.be.reverted
      })

      it("should revert if there is insufficient iTokens balance -1", async () => {
        console.log("check--1")

        await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

        console.log("check--2")

        await aFiAFiOracleInstance.updateVaultControllers(
          aTokenConInstance.address,
          investor1.address,
          investor1.address
        )

        console.log("check--3")

        const swapParams = {
          afiContract: aTokenConInstance.address,
          oToken: usdtConInstance.address,
          cSwapFee: 1000000,
          cSwapFee: 1,
          cSwapCounter: 0,
          depositTokens: ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
          minimumReturnAmount: [0, 0],
          iMinimumReturnAmount: [0, 0], // Adjust according to your contract's expectations
          underlyingTokens: [
            "0xcf5a6076cfa32686c0df13abada2b40dec133f1d", // WBTC
            "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37",
          ], // SOL], // Fill this array if your function expects specific tokens
          newProviders: [0, 0],
          _deadline: deadline,
          cometToClaim: [],
          cometRewardTokens: [],
          rewardTokenMinReturnAmounts: [],
        }

        poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)
        console.log("poolValue 0", poolValue)

        console.log("check--4")

        await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true)
        await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

        console.log("check--5")

        poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)
        console.log("poolValue 1", poolValue)

        console.log("check--6")

        await aTokenConInstance.connect(investor1).deposit(100000000, usdcConInstance.address)

        console.log("check--7")

        const minimumReturnAmount = [0, 0]

        const Amount = minimumReturnAmount.map((num) => BigNumber.from(num))
        const returnString = Amount.map((bn) => bn.toString())

        // poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
        // await aTokenConInstance.updatePool(poolValue);

        // await aTokenConInstance.connect(investor1).withdraw(
        //     197801111576383300n, usdtConInstance.address, deadline, returnString, 2, ["0x", "0x", "0x", "0x", "0x", "0x"]
        // );

        poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)
        console.log("poolValue 2", poolValue)

        // console.log("breakkkkkkkkk");

        await expect(
          aTokenConInstance
            .connect(investor1)
            .withdraw(10978011115763833000n, usdtConInstance.address, deadline, returnString, 2, 0)
        ).to.be.reverted
      })

      it("should revert if there is insufficient iTokens balance", async () => {
        await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

        var navfromStorage = await aFiFactoryInstance.getPricePerFullShare(
          aTokenConInstance.address,
          aFiStorageInstance.address
        )
        console.log("Nav after deposit", `${navfromStorage}`)

        await aFiAFiOracleInstance.updateVaultControllers(
          aTokenConInstance.address,
          investor1.address,
          investor1.address
        )

        const swapParams = {
          afiContract: aTokenConInstance.address,
          oToken: usdtConInstance.address,
          cSwapFee: 1000000,
          cSwapCounter: 1,
          depositTokens: ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
          minimumReturnAmount: [0, 0],
          iMinimumReturnAmount: [0, 0], // Adjust according to your contract's expectations
          underlyingTokens: [
            "0xcf5a6076cfa32686c0df13abada2b40dec133f1d", // WBTC
            "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37",
          ], // SOL], // Fill this array if your function expects specific tokens
          newProviders: [0, 0],
          _deadline: deadline,
          cometToClaim: [],
          cometRewardTokens: [],
          rewardTokenMinReturnAmounts: [],
        }

        poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)

        await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true)
        await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

        navfromStorage = await aFiFactoryInstance.getPricePerFullShare(
          aTokenConInstance.address,
          aFiStorageInstance.address
        )
        console.log("Nav after cswap", `${navfromStorage}`)

        poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)

        await aTokenConInstance.connect(investor1).deposit(100000000, usdcConInstance.address)

        navfromStorage = await aFiFactoryInstance.getPricePerFullShare(
          aTokenConInstance.address,
          aFiStorageInstance.address
        )
        console.log("Nav after deposit2", `${navfromStorage}`)

        const minimumReturnAmount = [0, 0]

        const Amount = minimumReturnAmount.map((num) => BigNumber.from(num))
        const returnString = Amount.map((bn) => bn.toString())

        poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)

        await aTokenConInstance
          .connect(investor1)
          .withdraw(1978011115763830300n, usdtConInstance.address, deadline, returnString, 3, 0)

        navfromStorage = await aFiFactoryInstance.getPricePerFullShare(
          aTokenConInstance.address,
          aFiStorageInstance.address
        )
        console.log("Nav after withdraw", `${navfromStorage}`)

        poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)

        console.log("balance of usdt", await usdtConInstance.balanceOf(aTokenConInstance.address))

        await expect(
          aTokenConInstance
            .connect(investor1)
            .withdraw(1978011115763833000n, usdtConInstance.address, deadline, returnString, 2, 100000000)
        ).to.be.reverted
      })
    })

    describe("Product 401 - stables", async () => {
      beforeEach(async () => {
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

        //let txObject = await result.wait()

        //console.log("result++++++++++++++++++++++++", txObject.events[11].args[0]);

        aTokenConInstance1 = await ethers.getContractAt(AFIBASE_ABI, aTokenConInstance1)
        //console.log("result++++++++++++++++++++++++", await aTokenConInstance.getPriceOracle("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"));

        // await aFiPassiveRebalanceInstance.intializeStalePriceDelay(
        //   ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
        //   [86500, 86500, 86500]
        // )

        await aTokenConInstance1.setplatformWallet(platformWallet.address)
        await aFiAFiOracleInstance.setAFiStorage(aFiStorageInstance.address)
        await aFiPassiveRebalanceInstance.setPauseDepositController(aTokenConInstance1.address, investor1.address)

        // // Transfer all AFinance Tokens to PLATFORM_WALLET
        // await aFinanceConInstance.transfer(platformWallet.address, AFINANCE_SUPPLY);

        // MAINNET CONTRACT INSTANCES
        usdcConInstance = await ethers.getContractAt(USDC_ABI, USDC_ADDRESS)
        usdtConInstance = await ethers.getContractAt(USDT_ABI, USDT_ADDRESS)

        await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address)
        await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address)
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

        // await daiConInstance.connect(signer).transfer(investor1.address, daiBalance);

        // const accountBalance = await daiConInstance.balanceOf(investor1.address)
        console.log("transfer complete")
        // console.log("funded account balance", accountBalance / 1e18)

        // console.log("usdtBalance", usdtBalance)
        // usdtBalance = usdtBalance / 100;
        // console.log("usdtBalance", usdtBalance)
        await usdtConInstance.connect(signer).transfer(investor1.address, "208790359575")
        await usdtConInstance.connect(signer).transfer(investor2.address, "208790359575")

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
        await aTokenConInstance1.setMinDepLimit(100)
        await aFiAFiOracleInstance.updateVaultControllers(
          aTokenConInstance1.address,
          investor1.address,
          investor1.address
        )

        console.log("transfer complete")
        console.log("funded account balance usdttttttttt", investorusdtBalance)
      })

      it("401", async () => {
        await aTokenConInstance1.connect(investor1).deposit(1000000000, usdtConInstance.address)

        var navfromStorage = await aFiFactoryInstance.getPricePerFullShare(
          aTokenConInstance1.address,
          aFiStorageInstance.address
        )
        console.log("Nav after deposit", `${navfromStorage}`)

        await aFiAFiOracleInstance.updateVaultControllers(
          aTokenConInstance1.address,
          investor1.address,
          investor1.address
        )

        const swapParams = {
          afiContract: aTokenConInstance1.address,
          oToken: usdtConInstance.address,
          cSwapFee: 1000000,
          cSwapCounter: 0,
          depositTokens: ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
          minimumReturnAmount: [0, 0],
          iMinimumReturnAmount: [0, 0], // Adjust according to your contract's expectations
          underlyingTokens: [
            "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
            "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D",
          ],
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

        await aTokenConInstance1.connect(investor1).deposit(100000000, usdtConInstance.address)

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

        bal = await usdtConInstance.balanceOf(investor1.address)
        console.log("balance usdt after withdraw", `${bal}`)

        navfromStorage = await aFiFactoryInstance.getPricePerFullShare(
          aTokenConInstance1.address,
          aFiStorageInstance.address
        )
        console.log("Nav after deposit2", `${navfromStorage}`)

        poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance1.address)
      })

      it("401 compound v2 withdraw", async () => {
        var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance1.address)

        await aTokenConInstance1.connect(investor1).deposit(1000000000, usdtConInstance.address)

        var navfromStorage = await aFiFactoryInstance.getPricePerFullShare(
          aTokenConInstance1.address,
          aFiStorageInstance.address
        )
        console.log("Nav after deposit", `${navfromStorage}`)

        await aFiAFiOracleInstance.updateVaultControllers(
          aTokenConInstance1.address,
          investor1.address,
          investor1.address
        )

        const swapParams = {
          afiContract: aTokenConInstance1.address,
          oToken: usdtConInstance.address,
          cSwapFee: 0,
          cSwapCounter: 0,
          depositTokens: ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
          minimumReturnAmount: [0, 0],
          iMinimumReturnAmount: [0, 0], // Adjust according to your contract's expectations
          underlyingTokens: [
            "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
            "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D",
          ],
          newProviders: [0, 0],
          _deadline: deadline,
          cometToClaim: [],
          cometRewardTokens: [],
          rewardTokenMinReturnAmounts: [],
        }
        const initialBalance = await aTokenConInstance1.balanceOf(investor1.address)
        poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance1.address)
        await aTokenConInstance1.connect(investor1).pauseUnpauseDeposit(true)
        await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

        navfromStorage = await aFiFactoryInstance.getPricePerFullShare(
          aTokenConInstance1.address,
          aFiStorageInstance.address
        )
        console.log("Nav after cswap", `${navfromStorage}`)

        poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance1.address)

        await aTokenConInstance1.connect(investor1).deposit(100000000, usdtConInstance.address)

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
          .withdraw(initialBalance, usdtConInstance.address, deadline, returnString, 3, 0)
      })

      it("withdraw check", async () => {
        const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
        console.log("before Deposit user usdt balance", `${beforeUSDTDep}`)

        console.log("check --0")

        console.log("check --1")

        await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

        let AfterusdtBalance1 = await usdtConInstance.balanceOf(investor1.address)
        console.log("After Deposit user usdt balance", `${AfterusdtBalance1}`)

        const nav1 = await aTokenConInstance.depositUserNav(investor1.address)
        console.log("user nav1", `${nav1}`)

        const NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(
          aTokenConInstance.address,
          aFiStorageInstance.address
        )
        console.log("Nav from storage", `${NavfromStorage}`)

        await aFiAFiOracleInstance.updateVaultControllers(
          aTokenConInstance.address,
          investor1.address,
          investor1.address
        )

        const swapParams = {
          afiContract: aTokenConInstance.address,
          oToken: usdtConInstance.address,
          cSwapFee: 1000000,
          cSwapCounter: 1,
          depositTokens: ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
          minimumReturnAmount: [0, 0],
          iMinimumReturnAmount: [0, 0], // Adjust according to your contract's expectations
          underlyingTokens: [
            "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
            "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D",
          ], // SOL], // Fill this array if your function expects specific tokens
          newProviders: [0, 0],
          _deadline: deadline,
          cometToClaim: [],
          cometRewardTokens: [],
          rewardTokenMinReturnAmounts: [],
        }
        await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true)
        await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

        const NavfromStorageAfter = await aFiFactoryInstance.getPricePerFullShare(
          aTokenConInstance.address,
          aFiStorageInstance.address
        )
        console.log("Nav from storage after cswap", `${NavfromStorageAfter}`)

        const AfterusdtBalance = await usdtConInstance.balanceOf(investor1.address)
        console.log("After Deposit user usdt balance", `${AfterusdtBalance}`)
        const AfterusdcBalance = await usdcConInstance.balanceOf(aTokenConInstance.address)
        console.log("After deposit user usdc balance", `${AfterusdcBalance}`)

        const afibalance = await usdtConInstance.balanceOf(aTokenConInstance.address)
        console.log("aficontract usdt balance", `${afibalance}`)

        const Afterbal = await aTokenConInstance.balanceOf(investor1.address)

        console.log("Afterbal", `${Afterbal}`)

        poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)

        await aTokenConInstance.connect(investor1).deposit(1000000000, usdtConInstance.address)

        poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)

        const minimumReturnAmount = [0, 0]

        const Amount = minimumReturnAmount.map((num) => BigNumber.from(num))
        const returnString = Amount.map((bn) => bn.toString())

        const AfterwithusdcBalance = await usdtConInstance.balanceOf(investor1.address)
        console.log("Before withdraw user usdt balance", `${AfterwithusdcBalance}`)

        await aTokenConInstance
          .connect(investor1)
          .withdraw(197801111576383300n, usdtConInstance.address, deadline, returnString, 2, 0)

        const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
        console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)
      })

      it("updatePreSwapDepositLimit check", async () => {
        await aFiPassiveRebalanceInstance.updatePreSwapDepositLimit(100000)
        var preswapdepLimit = await aFiPassiveRebalanceInstance.getPreSwapDepositLimit()
        expect(preswapdepLimit).to.be.gt(0)
      })
    })
  })
})