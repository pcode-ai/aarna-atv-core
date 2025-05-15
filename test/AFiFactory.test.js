/* eslint-disable no-underscore-dangle */
const { expect } = require("chai")
const { ethers, waffle } = require("hardhat")
const { constants } = require("@openzeppelin/test-helpers")
const { abi: AFIBASE_ABI } = require("../artifacts/contracts/AtvBase.sol/AtvBase.json")

const { USDT_ABI, USDT_ADDRESS, USDC_ABI, USDC_ADDRESS } = require("../utils/constants")

describe("Factory Contract", () => {
  let platformWallet, recipient, investor1, investor2, investor3
  let aFiBaseInstace, aFiManagerInstance, aFiPassiveRebalanceInstance, aFiAFiOracleInstance
  let aFiFactoryInstance, aFiStorageInstance
  let deployedAFiBase, aTokenConInstance
  let usdcConInstance, usdtConInstance
  let bytesPayload2

  before(async () => {
    const userAccounts = await ethers.getSigners()
    ;[platformWallet, recipient, investor1, investor2, investor3] = userAccounts

    // Deploy contracts
    await deployContracts()

    // Initialize contract data
    await initializeContractData()

    // Setup accounts and token balances
    await setupAccountsAndTokens()
  })

  async function deployContracts() {
    const AFiBase = await ethers.getContractFactory("AtvBase")
    const AFiManager = await ethers.getContractFactory("AtvManager")
    const PassiveRebalanceStrategies = await ethers.getContractFactory("AtvPassiveRebalanceStrategies")
    const AFiStorage = await ethers.getContractFactory("AtvStorage")
    const AFiFacotry = await ethers.getContractFactory("AtvFactory")
    const AFiOracle = await ethers.getContractFactory("AtvOracle")

    // Deploy contracts in sequence
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

    console.log("Factory Instance Address:", aFiFactoryInstance.address)
  }

  async function initializeContractData() {
    // Setup underlying data payload
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

    // Setup pool data payload
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
    bytesPayload2 = await aFiFactoryInstance.encodePoolData(payloadnew)

    // Create initial AToken
    const result = await aFiFactoryInstance.createAToken(
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
    aTokenConInstance = await ethers.getContractAt(AFIBASE_ABI, deployedAFiBase)

    // Initialize contract connections and settings
    await initializeContractSettings()

    // Initialize Oracle and pool data
    await setupOracleAndPoolData()
  }

  async function initializeContractSettings() {
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

    // Connect contracts
    await aFiAFiOracleInstance.setAFiStorage(aFiStorageInstance.address)
    await aTokenConInstance.setplatformWallet(platformWallet.address)
    await aFiManagerInstance.setRebalanceController(platformWallet.address)
    await aTokenConInstance.setMinDepLimit(100)
    await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address)
    await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address)
  }

  async function setupOracleAndPoolData() {
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
        "0x9b8B6fBb0AD45e5bBE2d6E81f264992adB5D799b", // pool WBTC - USDC
        "0xFE9241e7b94bf0F5f0d8de0851C9421a38b54916", // pool WETH - USDC
      ],
      [
        "0x9b8B6fBb0AD45e5bBE2d6E81f264992adB5D799b", // pool WBTC - USDC
        "0xFE9241e7b94bf0F5f0d8de0851C9421a38b54916", // pool WETH - USDC
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

    // Update oracle data for tokens
    await updateOracleData()
  }

  async function updateOracleData() {
    // Update oracle data for input tokens
    await aFiPassiveRebalanceInstance.updateOracleData(
      "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
      "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a"
    )
    await aFiPassiveRebalanceInstance.updateOracleData(
      "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D",
      "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b"
    )

    // Update oracle data for underlying tokens
    await aFiPassiveRebalanceInstance.updateOracleData(
      "0xcf5a6076cfa32686c0df13abada2b40dec133f1d",
      "0xc9d8b075a5c69303365ae23633d4e085199bf5c520a3b90fed1322a0342ffc33"
    )
    await aFiPassiveRebalanceInstance.updateOracleData(
      "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37",
      "0x9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6"
    )

    await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address)
  }

  async function setupAccountsAndTokens() {
    // Get token instances
    usdcConInstance = await ethers.getContractAt(USDC_ABI, USDC_ADDRESS)
    usdtConInstance = await ethers.getContractAt(USDT_ABI, USDT_ADDRESS)

    // Impersonate whale account to fund test accounts
    const whaleAccount = "0xFf73Ba9e0669D7ead82421Ad105bC6D715606Ec4"
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [whaleAccount],
    })
    const whaleSigner = await ethers.getSigner(whaleAccount)

    // Fund test accounts
    await usdcConInstance.connect(whaleSigner).transfer(investor1.address, "2426360646")
    await usdcConInstance.connect(whaleSigner).transfer(investor2.address, "2426360646")
    await usdtConInstance.connect(whaleSigner).transfer(investor1.address, "2426360646")
    await usdtConInstance.connect(whaleSigner).transfer(investor2.address, "2426360646")

    // Approve tokens for AToken contract
    await usdtConInstance.connect(investor1).approve(aTokenConInstance.address, ethers.constants.MaxUint256)
    await usdtConInstance.connect(investor2).approve(aTokenConInstance.address, ethers.constants.MaxUint256)
    await usdcConInstance.connect(investor1).approve(aTokenConInstance.address, ethers.constants.MaxUint256)
    await usdcConInstance.connect(investor2).approve(aTokenConInstance.address, ethers.constants.MaxUint256)
  }

  context("Reverts", () => {
    it("should revert if Manager address is zero", async () => {
      await expect(
        aFiFactoryInstance.createAToken(
          "AFiBase",
          "ATOK",
          bytesPayload2,
          [investor1.address],
          false,
          aFiStorageInstance.address,
          aFiPassiveRebalanceInstance.address,
          constants.ZERO_ADDRESS,
          [constants.ZERO_ADDRESS],
          "0x0000000000000000000000000000000000000000"
        )
      ).to.be.reverted
    })

    it("should revert if team wallets address is zero", async () => {
      await expect(
        aFiFactoryInstance.createAToken(
          "AFiBase",
          "ATOK",
          bytesPayload2,
          [constants.ZERO_ADDRESS],
          false,
          aFiStorageInstance.address,
          aFiPassiveRebalanceInstance.address,
          aFiManagerInstance.address,
          [investor1.address],
          "0x0000000000000000000000000000000000000000"
        )
      ).to.be.reverted
    })

    it("should revert if storage address is zero", async () => {
      await expect(
        aFiFactoryInstance.createAToken(
          "AFiBase",
          "ATOK",
          bytesPayload2,
          [investor1.address],
          false,
          constants.ZERO_ADDRESS,
          aFiPassiveRebalanceInstance.address,
          aFiManagerInstance.address,
          [investor1.address],
          "0x0000000000000000000000000000000000000000"
        )
      ).to.be.reverted
    })

    it("should revert if array length mismatched", async () => {
      // Prepare mismatched payload
      const payload = [
        [
          "0xcf5a6076cfa32686c0df13abada2b40dec133f1d", // WBTC
          "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37", // WETH
        ],
        [
          "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // USDC - Middle Token of WETH
        ],
      ]
      const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

      const payloadnew = [
        ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
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

      const mismatchedPayload = await aFiFactoryInstance.encodePoolData(payloadnew)

      await expect(
        aFiFactoryInstance.createAToken(
          "AFiBase",
          "ATOK",
          mismatchedPayload,
          [investor1.address],
          false,
          aFiStorageInstance.address,
          aFiPassiveRebalanceInstance.address,
          aFiManagerInstance.address,
          [investor1.address],
          "0x0000000000000000000000000000000000000000",
          { gas: 2000000 }
        )
      ).to.be.reverted
    })

    it("should revert if underlying address is zero", async () => {
      const payload = [
        [
          "0x0000000000000000000000000000000000000000", // WBTC as zero address
          "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37", // WETH
        ],
        [
          "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // USDC - Middle Token of WBTC
          "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // USDC - Middle Token of WETH
        ],
      ]
      const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

      const payloadnew = [
        ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
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
      const zeroAddressPayload = await aFiFactoryInstance.encodePoolData(payloadnew)

      await expect(
        aFiFactoryInstance.createAToken(
          "AFiBase",
          "ATOK",
          zeroAddressPayload,
          [investor1.address],
          false,
          aFiStorageInstance.address,
          aFiPassiveRebalanceInstance.address,
          aFiManagerInstance.address,
          [investor1.address],
          "0x0000000000000000000000000000000000000000",
          { gas: 2000000 }
        ),
        "Zero address in underlying data"
      ).to.be.reverted
    })

    it("should revert if proportion sum is not 10000000", async () => {
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
        ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
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
        ["1000000", "5000000"], // Invalid proportions, doesn't sum to 10000000
        ["0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000"],
        2,
      ]

      const invalidProportionsPayload = await aFiFactoryInstance.encodePoolData(payloadnew)

      try {
        await aFiFactoryInstance.createAToken(
          "AFiBase",
          "ATOK",
          invalidProportionsPayload,
          [investor1.address, investor2.address],
          false,
          aFiStorageInstance.address,
          aFiPassiveRebalanceInstance.address,
          aFiAFiOracleInstance.address,
          ["0xdAC17F958D2ee523a2206206994597C13D831ec7"],
          "0x0000000000000000000000000000000000000000"
        )
        expect.fail("Expected transaction to be reverted")
      } catch (error) {
        expect(error.message).to.include("AF01")
      }
    })

    it("should revert if team wallets array is empty", async () => {
      try {
        await aFiFactoryInstance.createAToken(
          "AFiBase",
          "ATOK",
          bytesPayload2,
          [], // Empty team wallets array
          false,
          aFiStorageInstance.address,
          aFiPassiveRebalanceInstance.address,
          aFiManagerInstance.address,
          [investor1.address],
          "0x0000000000000000000000000000000000000000"
        )
        expect.fail("Expected transaction to be reverted")
      } catch (error) {
        expect(error.message).to.include("AF: Array Length")
      }
    })

    it("should revert if array lengths are not equal", async () => {
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
        ["0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D"],
        [
          "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
          "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
        ],
        uDataPayload,
        ["0x64a9b3e30f9e4a45ab6137d9c0b12ae2ba8dc251", "0xeb441902ac56ae1340e178fbccb3ce5890206fca"],
        ["0x0000000000000000000000000000000000000000"], // Array length mismatch
        [
          "0xc9d8b075a5c69303365ae23633d4e085199bf5c520a3b90fed1322a0342ffc33",
          "0x9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6",
        ],
        ["5000000", "5000000"],
        ["0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000"],
        2,
      ]
      const invalidLengthPayload = await aFiFactoryInstance.encodePoolData(payloadnew)

      await expect(
        aFiFactoryInstance.createAToken(
          "AFiBase",
          "ATOK",
          invalidLengthPayload,
          [investor1.address],
          false,
          aFiStorageInstance.address,
          aFiPassiveRebalanceInstance.address,
          aFiManagerInstance.address,
          [investor1.address],
          "0x0000000000000000000000000000000000000000"
        )
      ).to.be.reverted
    })
  })

  context("Basic check for states and deployment of product", () => {
    let deployedToken

    beforeEach(async () => {
      const result = await aFiFactoryInstance.createAToken(
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
      const txObject = await result.wait()
      deployedToken = await aFiFactoryInstance.aFiProducts(0)
      aTokenConInstance = await ethers.getContractAt(AFIBASE_ABI, deployedToken)
    })

    it("should deploy successfully and have correct price per share", async () => {
      // Create new token
      const result = await aFiFactoryInstance.createAToken(
        "AFiBase",
        "ATOK",
        bytesPayload2,
        [investor1.address, investor2.address],
        false,
        aFiStorageInstance.address,
        aFiPassiveRebalanceInstance.address,
        aFiAFiOracleInstance.address,
        [],
        "0x0000000000000000000000000000000000000000"
      )
      const txObject = await result.wait()

      const newToken = await aFiFactoryInstance.aFiProducts(0)
      const tokenInstance = await ethers.getContractAt(AFIBASE_ABI, newToken)

      // Call getPricePerFullShare and check if the return value is greater than 0
      let pricePerFullShare = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )

      expect(pricePerFullShare).to.equal(1000000)

      poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address)

      await aTokenConInstance.connect(investor1).deposit(1000000000, usdcConInstance.address)

      // Call getPricePerFullShare and check if the return value is greater than 0
      pricePerFullShare = await aFiFactoryInstance.getPricePerFullShare(
        aTokenConInstance.address,
        aFiStorageInstance.address
      )

      expect(pricePerFullShare).to.be.gt(0)
    })

    it("should return correct initilizeStatus and initializeTokenStatus for aFiContract", async function () {
      // Call getAFiInitStatus to get the statuses
      const [initStatus, initializeTokenStatus] = await aFiFactoryInstance.getAFiInitStatus(aTokenConInstance.address)
      // Check the returned values
      expect(initStatus).to.be.true
      expect(initializeTokenStatus).to.be.true // Assuming it was not updated for order 2
    })

    it("should return correct initilizeStatus and initializeTokenStatus for another aFiContract", async function () {
      // Call afiContractInitUpdate to update statuses with order 2
      let order = 2
      await expect(
        aFiFactoryInstance.connect(investor1.address).afiContractInitUpdate(aTokenConInstance.address, order)
      ).to.be.reverted

      order = 1
      await expect(
        aFiFactoryInstance.connect(investor1.address).afiContractInitUpdate(aTokenConInstance.address, order)
      ).to.be.reverted
    })

    it("should revert when create token invoked by other address", async function () {
      await expect(
        aFiFactoryInstance
          .connect(investor1)
          .createAToken(
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
      ).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("initialize afiVault with another wallet", async function () {
      await expect(
        aFiFactoryInstance.connect(investor1).afiContractInitUpdate(aTokenConInstance.address, 1)
      ).to.be.revertedWith("NA")
    })
  })
})