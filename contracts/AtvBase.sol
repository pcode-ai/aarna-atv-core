// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
pragma abicoder v2;

import {IAFiStorage} from "./IAFiStorage.sol";
import {OwnableDelayModule} from "./OwnableDelayModule.sol";
import {ReentrancyGuard} from "./ReentrancyGuard.sol";
import {SafeERC20} from "./SafeERC20.sol";
import {SafeCast} from "./SafeCast.sol";
import {ILendingPool} from "./ILendingPool.sol";
import {IPoolAddressesProvider} from "./ILendingPoolAddressesProvider.sol";
import {ISwapRouter} from "./ISwapRouter.sol";
import {IUniswapOracleV3} from "./IUniswapV3.sol";
import "./IAFi.sol";
import "./IPassiveRebal.sol";
import "./ArrayUtils.sol";
import "./IUniswapV3Factory.sol";
import {ERC20} from "./ERC20.sol";
import { IPermit2 } from "./IPermit2.sol";
import { IAllowanceTransfer } from "./IAllowanceTransfer.sol";

// Enum for supported DEXs
enum DexChoice {
  UNISWAP_V3,
  ONE_INCH,
  NONE
}

interface Compound {
  function mint(uint mintAmount) external returns (uint);

  function redeem(uint redeemTokens) external returns (uint);

  function redeemUnderlying(uint redeemAmount) external returns (uint);

  function exchangeRateStored() external view returns (uint);
}

interface ISUMER {
  function mint(uint256 mintAmount) external returns (uint256);
  function redeem(uint256 redeemTokens) external returns (uint256);
}

interface CompoundV3 {
  function supply(address asset, uint amount) external;

  function withdraw(address asset, uint amount) external;
}

interface IAFiFactory {
  function setIfUserInvesting(address user, address afiContract) external;

  function hasUserInvestedAlready(
    address afiContract,
    address user
  ) external view returns (bool);

  function withdrawAndResetInvestmentStatus(address user, address afiContract) external;

  function afiContractInitUpdate(address aFiContract, uint order) external;
}

interface LendingPoolAddressesProvider {
  function getLendingPool() external view returns (address);

  function getLendingPoolCore() external view returns (address);
}

interface IAggregationExecutor {
  function callBytes(bytes calldata data) external payable;
}

interface IAggregationRouterV6 {
  struct SwapDescription {
    IERC20 srcToken;
    IERC20 dstToken;
    address srcReceiver;
    address dstReceiver;
    uint256 amount;
    uint256 minReturnAmount;
    uint256 flags;
  }

  function swap(
    IAggregationExecutor caller,
    SwapDescription calldata desc,
    bytes calldata data
  ) external payable returns (uint256 returnAmount, uint256 spentAmount);
}


interface IUniversalRouter {
  function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) external payable;
}

contract AFiVariableStorage {
  uint internal pool;
  address payable internal platformWallet =
    payable(0xB60C61DBb7456f024f9338c739B02Be68e3F545C);

  address[] internal token; // deposit stable coin
  address[] internal uTokens;
  uint[] internal uTokenProportions;
  uint[] internal defaultProportion;

  mapping(address => address) internal sumer; // compound address for various u tokens
  mapping(address => uint) internal depositNAV;
  mapping(address => bool) internal whitelistedTokens;
}

contract AtvBase is
  ERC20,
  ReentrancyGuard,
  OwnableDelayModule,
  AFiVariableStorage,
  IAFi
{
  using SafeERC20 for IERC20;
  using ArrayUtils for uint[];
  using ArrayUtils for address[];
  using SafeCast for uint256;

  bool internal depositPaused;
  bool internal withdrawPaused;
  bool public migrated;
  bool public vaultReInitialized;
  bool internal isBase;
  bool public isAfiTransferrable; // true if AFi tokens are transferrable

  uint internal typeOfProduct;
  uint256 internal cSwapCounter;
  uint256 public minimumDepositLimit;

  address public factory;
  address public aFiOracle;
  address public tLContract;
  address public PARENT_VAULT;
  IPassiveRebal public rebalContract;
  IAFiStorage public aFiStorage;
  address public aFiManager;

  address[] internal nonOverlappingITokens; // Tokens that are not common between underlying and input tokens

  address private constant WETH = 0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37;
  address private constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
  address private constant POOL_ADDRESS_PROVIDER =
    0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e;
  ISwapRouter internal constant UNISWAP_EXCHANGE =
    ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);
  address internal constant ONEINCH_ROUTER = 0x111111125421cA6dc452d289314280a0f8842A65;

  address internal constant UNIVERSAL_ROUTER = 0x3aE6D8A282D67893e17AA70ebFFb33EE5aa65893; //Monad testnet Universal Router address 
  address internal constant permit2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3; //Monad testnet permit2 address 


  mapping(address => mapping(uint => uint)) internal nonWithdrawableShares;
  mapping(address => address) public compoundV3Comet;
  mapping(address => uint256) public userLockedAmount;
  mapping(address => bool) public isPausedForWithdrawals; // true if deposit token is paused(users can't withdraw in this token)

  event UpdateShares(address user, uint256 amount, bool lock);
  event Deposit(address indexed investor, uint256 amount, address depToken);
  event Withdraw(address indexed investor, uint256 amount, address withdrawnToken);
  event Initialized(address indexed afiContract);
  event InitializedToken(address indexed afiContract);

  constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {}

  function initialize(
    address newOwner,
    string memory tokenName,
    string memory tokenSymbol,
    bytes memory data,
    bool _isActiveRebalanced,
    IAFiStorage _aFiStorage,
    address[] memory _nonOverlappingITokens,
    address parentVault
  ) external override nonReentrant {
    checkFalse(isBase);
    PARENT_VAULT = parentVault;
    addressCheck(newOwner, address(0));
    _name = tokenName;
    _symbol = tokenSymbol;
    _transferOwnership(newOwner);
    delayModule = newOwner;
    aFiStorage = _aFiStorage;
    aFiOracle = aFiStorage.getAFiOracle();
    nonOverlappingITokens = _nonOverlappingITokens;
    IAFi.PoolsData memory pooldata = abi.decode(data, (IAFi.PoolsData));
    typeOfProduct = pooldata._typeOfProduct;
    factory = msg.sender;
    setInitialValues(data);
    defaultProportion = uTokenProportions;
    IAFiStorage(_aFiStorage).setAFiActive(address(this), true);
    IAFiStorage(_aFiStorage).setActiveRebalancedStatus(
      address(this),
      _isActiveRebalanced
    );

    IAFiFactory(factory).afiContractInitUpdate(address(this), 1);
  }

  function initializeToken(
    address[] memory iToken,
    address[] memory _teamWallets,
    IPassiveRebal _rebalContract,
    address _aFiManager
  ) external override nonReentrant {
    checkFalse(isBase);
    isBase = true;
    aFiManager = _aFiManager;
    rebalContract = _rebalContract;
    minimumDepositLimit = 500;
    aFiStorage.setTeamWallets(address(this), _teamWallets);
    uint iLen = iToken.length;
    unchecked {
      for (uint i = 0; i < iLen; i++) {
        updatetoken(iToken[i]);
        setWhitelistedTok(iToken[i]);
      }
    }
    IAFiFactory(factory).afiContractInitUpdate(address(this), 2);
  }

  function getNonWithdrawableShares(
    address user,
    uint256 csCounterValue
  ) public view override returns (uint256) {
    return nonWithdrawableShares[user][csCounterValue];
  }

  function updatetoken(address tok) internal {
    token.push(tok);
    approval(tok, aFiOracle, ~uint(0));
  }

  function getcSwapCounter() external view override returns (uint256) {
    return cSwapCounter;
  }

  function transferValidationAndSet(address from, address to, uint256 amount) internal {
    checkFalse(!isAfiTransferrable);
    address owner = from;

    validateShares(owner, amount);
    depositNAV[to] =
      ((depositNAV[to] * _balances[to]) + (depositNAV[owner] * amount)) /
      (_balances[to] + amount);
  }

  function checkNav(address target) internal {
    if (_balances[target] == 0) {
      delete depositNAV[target];
    }
  }

  function transfer(address to, uint256 amount) public virtual override returns (bool) {
    transferValidationAndSet(_msgSender(), to, amount);
    _transfer(_msgSender(), to, amount);
    checkNav(_msgSender());
    return true;
  }

  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) public virtual override returns (bool) {
    transferValidationAndSet(from, to, amount);
    address spender = _msgSender();
    _spendAllowance(from, spender, amount);
    _transfer(from, to, amount);
    checkNav(from);
    return true;
  }

  function setAfiTransferability(bool _afiTransferrable) external onlyOwner {
    isAfiTransferrable = _afiTransferrable;
  }

  function reinitializeHappened(bool status) external override {
    twoAddressCompare(aFiManager, aFiOracle);
    vaultReInitialized = status;
  }

  function getReinitializeStatus()
    external
    view
    override
    returns (bool _vaultReInitialized)
  {
    _vaultReInitialized = vaultReInitialized;
  }

  /**
   * @notice Pauses / unpause deposits in the contract.
   * @dev Requirements: Can only be invoked by the Owner wallet.
   */
  function pauseUnpauseDeposit(bool status) external {
    twoAddressCompare(
      rebalContract.getPauseDepositController(address(this)),
      aFiOracle
    );
    depositPaused = status;
  }

  /**
   * @notice Pauses / unpause withdrawals in the contract.
   * @dev Requirements: Can only be invoked by the Delay Module.
   */
  function pauseWithdraw(bool status) external {
    checkDelayModule();
    withdrawPaused = status;
  }

  /**
   * @notice Returns the paused status of the contract.
   */
  function isPaused() external view override returns (bool, bool) {
    return (depositPaused, withdrawPaused);
  }

  /**
   * @notice To update the platform wallet address and zero address should not pass.
   * @dev Requirements: It can be invoked only by the owner.
   * @param _platformWallet Address of the platform wallet.
   */
  function setplatformWallet(address payable _platformWallet) external onlyOwner {
    addressCheck(_platformWallet, address(0));
    platformWallet = _platformWallet;
  }

  function setMinDepLimit(uint256 limit) external onlyOwner {
    greaterEqualComparison(limit, 100);
    minimumDepositLimit = limit;
  }

  function getplatformWallet() external view returns (address) {
    return platformWallet;
  }

  function getTVLandRebalContractandType()
    external
    view
    override
    returns (uint256, address, uint256)
  {
    return (pool, address(rebalContract), typeOfProduct);
  }

  function checkFalse(bool flag) internal pure {
    require(!flag, "AB03");
  }

  function addressEqual(address add1, address add2) internal pure {
    require(add1 == add2, "AB30");
  }

  function twoAddressCompare(address add1, address add2) internal view {
    require(msg.sender == add1 || msg.sender == add2, "AB32");
  }

  function addressCheck(address add1, address add2) internal pure {
    require(add1 != add2, "AB05"); //solhint-disable-line reason-string
  }

  function greaterEqualComparison(uint256 valA, uint256 valB) internal pure {
    require(valA >= valB, "AB24");
  }

  function greaterComparision(uint256 valA, uint256 valB) internal pure {
    require(valA > valB, "AB25");
  }

  function togglePauseDepositTokenForWithdrawals(
    address tok,
    bool _pause
  ) external onlyOwner {
    if (_pause) {
      checkFalse(!whitelistedTokens[tok]);
    } else {
      checkFalse(!isPausedForWithdrawals[tok]);
    }
    isPausedForWithdrawals[tok] = _pause;
  }

  function checkTokInList(address tok) internal view returns (bool istok, bool isUTok) {
    (, istok) = token.indexOf(tok);
    (, isUTok) = uTokens.indexOf(tok);
  }

  function addToWhitelist(address tok) external onlyOwner {
    checkFalse(whitelistedTokens[tok]);
    (bool isPresent, bool isInputTokenPresent) = checkTokInList(tok);
    if (!isPresent) {
      updatetoken(tok);
    }
    // Prevent duplication in nonOverlappingITokens
    (, bool isAlreadyInNonOverlapping) = nonOverlappingITokens.indexOf(tok);
    if (!isInputTokenPresent && !isAlreadyInNonOverlapping) {
      nonOverlappingITokens.push(tok);
    }
    setWhitelistedTok(tok);
  }

  function setWhitelistedTok(address tok) internal {
    whitelistedTokens[tok] = true;
  }

  function getPreDepositTokensBalance(
    address tok,
    uint256 _cSwapCounter
  ) internal view returns (uint) {
    return aFiStorage.getPreSwapDepositsTokens(address(this), _cSwapCounter, tok);
  }

  function removeFromWhitelist(
    address tok,
    address swapTok,
    uint256 deadline,
    uint256 amountOut,
    bytes calldata swapData
  ) external onlyOwner {
    checkFalse(!whitelistedTokens[tok]);
    checkFalse(!whitelistedTokens[swapTok]);
    delete whitelistedTokens[tok];
    if (getPreDepositTokensBalance(tok, cSwapCounter) > 0) {
      addressCheck(tok, swapTok);
      aFiStorage.doSwapForThewhiteListRemoval(
        tok,
        cSwapCounter,
        swapTok,
        deadline,
        amountOut,
        swapData
      );
    }

    token = rebalContract.removeToken(token, tok);
    IERC20(tok).safeApprove(aFiOracle, 0);

    // Remove tok from nonOverlappingITokens if present
    nonOverlappingITokens = rebalContract.removeToken(nonOverlappingITokens, tok);
  }

  function contractTransfers(address tok, address to, uint256 amount) private {
    IERC20(tok).safeTransfer(to, amount);
  }

  /**
   * @dev This function is used to increase counter and to update the flag for vaultReInitialized
   */
  function underlyingTokensStaking(
  ) external override {
    checkOracle();
    if (vaultReInitialized) {
      vaultReInitialized = false;
    }
    increasecsCounter();
  }

  function updateCp(uint256[] memory newCp) external {
    addressEqual(msg.sender, address(rebalContract));
    uTokenProportions = newCp;
  }


  function increasecsCounter() internal {
    cSwapCounter++;
  }

  function swap(
    address inputToken,
    address uTok,
    uint256 amountAsPerProportion,
    uint _deadline,
    address middleToken,
    uint256 minimumReturnAmount,
    bytes calldata swapData
  ) external override returns (uint256 returnAmount) {
    checkOracle();
    if (inputToken != uTok && middleToken == address(0)) {
      (returnAmount) = _routeSwap(
        inputToken,
        uTok,
        amountAsPerProportion,
        _deadline,
        rebalContract.getMidToken(uTok),
        minimumReturnAmount,
        swapData
      );
    } else if (inputToken != uTok) {
      (returnAmount ) = _routeSwap(
        inputToken,
        uTok,
        amountAsPerProportion,
        _deadline,
        middleToken,
        minimumReturnAmount,
        swapData
      );
    }
  }

  function isOTokenWhitelisted(address oToken) external view override returns (bool) {
    return whitelistedTokens[oToken];
  }

  function updateTVL() public override {
    pool = aFiStorage.calculatePoolInUsd(address(this));
  }

  function tokenTransfer(address token, uint256 amount) internal {
    IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
  }

  function deposit(uint amount, address iToken) external nonReentrant {
    if (PARENT_VAULT != address(0)) {
      checkFalse(!migrated);
    }

    greaterEqualComparison(
      (amount / (10 ** (IERC20(iToken).decimals()))),
      minimumDepositLimit
    );
    updateTVL();
    uint256 prevPool = pool;

    checkFalse(!whitelistedTokens[iToken]); // Added validation to check if the token is whitelisted

    checkFalse(depositPaused);
    tokenTransfer(iToken, amount);
    uint256 fee = (amount * 1) / (100); // 1% platform fees is deducted
    contractTransfers(iToken, platformWallet, fee);
    amount = amount - fee;
    setPreDeposit(iToken, amount);

    (uint256 shares, uint256 newDepositNAV) = aFiStorage.calculateShares(
      address(this),
      amount, // assuming amount is defined somewhere
      prevPool,
      _totalSupply,
      iToken, // assuming iToken is defined somewhere
      depositNAV[msg.sender],
      _balances[msg.sender]
    );

    greaterComparision(shares, 0);

    _mint(msg.sender, shares);
    makeUpdates(newDepositNAV, shares);

    emit Deposit(msg.sender, amount, iToken);
  }

  function setPreDeposit(address tok, uint256 amount) internal {
    aFiStorage.setPreDepositedInputToken(cSwapCounter, amount, tok);
  }

  function validateWithdraw(
    address user,
    address oToken,
    uint256 _shares
  ) public view override {
    checkFalse(!whitelistedTokens[oToken]); // Added validation to check if the token is whitelisted
    checkFalse(isPausedForWithdrawals[oToken]);
    validateShares(user, _shares);
    greaterEqualComparison(_shares, 1e17);
  }

  function validateShares(address user, uint256 _shares) internal view {
    greaterEqualComparison(
      _balances[user] -
        (userLockedAmount[user] + getNonWithdrawableShares(user, cSwapCounter)),
      _shares
    );
  }

  function withdraw(
    uint _shares,
    address oToken,
    uint deadline,
    uint[] memory minimumReturnAmount,
    uint swapMethod,
    uint minAmountOut
  ) external nonReentrant {
    checkFalse((rebalContract.isSwapMethodPaused(address(this), swapMethod)));
    checkFalse(withdrawPaused);
    validateWithdraw(msg.sender, oToken, _shares);
    updateTVL();
    // Calculate the redemption amount before updating balances
    uint r = (pool * (_shares)) / (_totalSupply);
    greaterComparision(r, 0);

    IAFiStorage.RedemptionParams memory params = IAFiStorage.RedemptionParams({
      baseContract: address(this),
      r: r,
      oToken: oToken,
      cSwapCounter: cSwapCounter,
      uTokens: uTokens,
      iTokens: token,
      deadline: deadline,
      minimumReturnAmount: minimumReturnAmount,
      _pool: pool,
      tSupply: _totalSupply,
      depositNAV: depositNAV[msg.sender],
      minAmountOut: minAmountOut
    });

    uint256 redFromContract = aFiStorage.handleRedemption(
      params,
      _shares,
      swapMethod,
      new bytes[](uTokens.length + token.length)
    );
    burn(msg.sender, _shares);
    greaterEqualComparison(balance(oToken, address(this)), redFromContract);
    greaterEqualComparison(redFromContract, minAmountOut);
    checkNav(msg.sender);

    contractTransfers(oToken, msg.sender, redFromContract);
    emit Withdraw(msg.sender, _shares, oToken);
  }

  function burn(address account, uint256 amount) internal {
    _balances[account] -= amount;
    _totalSupply -= amount;
    emit Transfer(account, address(0), amount);
  }

  function compareManagerAndStorage() internal view {
    twoAddressCompare(aFiManager, address(aFiStorage));
  }

  function swapfromSelectiveDex(
    address from,
    address to,
    uint amount,
    uint deadline,
    address midTok,
    uint minimumReturnAmount,
    bytes calldata _oneInchSwapData
  ) external override returns (uint256 _amountOut) {
    compareManagerAndStorage();
    (_amountOut) = _routeSwap(
      from,
      to,
      amount,
      deadline,
      midTok,
      minimumReturnAmount,
      _oneInchSwapData
    );
  }

  function getDexType(address tokIn, address tokOut) internal view returns (DexChoice) {
    return DexChoice(uint(rebalContract.getDexType(tokIn, tokOut)));
  }

  function _routeSwap(
    address _tokenIn,
    address _tokenOut,
    uint256 _amountIn,
    uint256 _maxTime,
    address middleToken,
    uint256 minimumReturnAmount,
    bytes calldata oneInchSwapData
  ) internal returns (uint256 amountOut) {
    DexChoice preferredDex = getDexType(_tokenIn, _tokenOut);
    if (preferredDex == DexChoice.UNISWAP_V3 || oneInchSwapData.length == 0) {
      (amountOut) = _uniswapV3Router(
        _tokenIn,
        _tokenOut,
        _amountIn,
        _maxTime,
        middleToken,
        minimumReturnAmount
      );
    } else if (preferredDex == DexChoice.ONE_INCH) {
      (amountOut) = _oneInchRouter(
        oneInchSwapData,
        _tokenIn,
        _amountIn,
        _tokenOut, // Pass destination token
        minimumReturnAmount, // Pass minimum return amount
        address(this) // Pass recipient (the contract itself)
      );
    } 
    return (amountOut);
  }

  function getdatastruct(
    address _tokenIn,
    address _tokenOut,
    uint _amountIn,
    uint _maxTime,
    address middleToken,
    uint256 minimumReturnAmount
  ) internal returns (bytes memory) {
    return
      rebalContract.uniswapV3Oracle(
        address(this),
        _tokenIn,
        _tokenOut,
        _amountIn,
        _maxTime,
        middleToken,
        minimumReturnAmount
      );
  }

  function approvePermit2(address tok, address spender, uint256 amountIn) internal {
    //TODO: handle the expiration
    IAllowanceTransfer(permit2).approve(tok, spender, uint160(amountIn), type(uint48).max);
    IERC20(tok).approve(address(permit2), amountIn);
  }

  function _uniswapV3Router(
    address _tokenIn,
    address _tokenOut,
    uint _amountIn,
    uint _maxTime,
    address middleToken,
    uint256 minimumReturnAmount
  ) public returns (uint amountOut) {
    approvePermit2(_tokenIn, address(UNIVERSAL_ROUTER), _amountIn);
    amountOut = balance(_tokenOut, address(this));
    bytes memory path = getdatastruct(
      _tokenIn,
      _tokenOut,
      _amountIn,
      _maxTime,
      middleToken,
      minimumReturnAmount
    );
    bytes memory commands = abi.encodePacked(bytes1(0x00)); // 0x00 represents a swap command

    // Encode swap input parameters
    bytes[] memory inputs = new bytes[](1);
    inputs[0] = abi.encode(
      address(this),
      _amountIn,
      minimumReturnAmount,
      path,
      true // since tokens are already in the contract
    );

    // Execute swap on Universal Router
    //TODO: include approval using permin2
    IUniversalRouter(UNIVERSAL_ROUTER).execute(commands, inputs, _maxTime);
    amountOut = balance(_tokenOut, address(this)) - amountOut;
  }

  function _oneInchRouter(
    bytes calldata swapdata,
    address srcToken,
    uint256 srcAmount,
    address dstToken, // Add destination token parameter
    uint256 minReturnAmount, // Add minimum return amount parameter
    address recipient // Add recipient parameter
  ) internal returns (uint256 amountOut) {
    greaterEqualComparison(swapdata.length, 4);

    bytes calldata dataToValidate = swapdata[4:];
    (address executor1, SwapDescription memory desc, bytes memory data) = abi.decode(
      dataToValidate,
      (address, SwapDescription, bytes)
    );

    addressEqual(address(desc.srcToken), srcToken);
    addressEqual(address(desc.dstToken), dstToken);
    addressEqual(address(desc.dstReceiver), recipient);

    if (srcAmount != desc.amount) {
      desc.minReturnAmount = (desc.minReturnAmount * ((srcAmount * 1e18) / desc.amount)) / 1e18;
      desc.amount = srcAmount;
    } 

    approval(srcToken, ONEINCH_ROUTER, desc.amount);
    uint256 destBal = balance(dstToken, address(this));

    (bool success, ) = ONEINCH_ROUTER.call{value: msg.value}(
      abi.encodeWithSelector(IAggregationRouterV6.swap.selector, executor1, desc, data)
    );

    checkFalse(!success);

    destBal = balance(dstToken, address(this)) - destBal;
    greaterEqualComparison((destBal), minReturnAmount);
    IERC20(srcToken).safeApprove(ONEINCH_ROUTER, 0);
    return (destBal);
  }

  /**
   * @notice Function sends profit to wallets in the process of proffir share.
   * @param wallet address to send profit to.
   * @param profitShare i.e. amount to be transferred.
   * @param oToken address of the token to consider for amount deduction.
   */
  function sendProfitOrFeeToManager(
    address wallet,
    uint profitShare,
    address oToken
  ) external override {
    compareManagerAndStorage();
    contractTransfers(oToken, wallet, profitShare);
  }

  function checkStorage() internal view {
    addressEqual(msg.sender, address(aFiStorage));
  }

  /**
   * @notice _supplyCompV3 function supply the fund of token to Compound V3 protocol for yield generation.
   * @dev this function should be called by AFiStorage only
   * @param tok address of the token to consider for supply.
   * @param amount i.e calculated amount of token to invest.
   */
  function _supplyCompV3(address tok, uint amount) external override {
    checkStorage();
    //approval
    approval(tok, compoundV3Comet[tok], amount);
    CompoundV3(compoundV3Comet[tok]).supply(tok, amount);
  }

  /**
   * @notice _withdrawCompoundV3 function withdraws the fund of token from CompoundV3 protocol.
   * @param tok address of the token to consider to withdraw.
   * @param amount i.e calculated amount of token to withdraw.
   */
  function _withdrawCompoundV3(address tok, uint amount) external override {
    checkStorage();
    CompoundV3(compoundV3Comet[tok]).withdraw(tok, amount);
  }

  /**
   * @notice _supplyAave function supply the fund of token to AAVe protocol for yield generation.
   * @dev this function should be called by AFiStorage only
   * @param tok address of the token to consider for supply.
   * @param amount i.e calculated amount of token to invest.
   */
  function _supplyAave(address tok, uint amount) external override {
    checkStorage();
    //approval
    approval(tok, address(_lendingPool()), amount);
    _lendingPool().deposit(tok, amount, address(this), 0);
  }

  /**
   * @notice _supplySumer function supply the fund of token to SUMER protocol for yield generation.
   * @dev this function should be called by AFiStorage only
   * @param tok address of the token to consider for supply.
   * @param amount i.e calculated amount of token to invest.
   */
  function _supplySumer(address tok, uint amount) external override {
    checkStorage();
    //approval
    approval(tok, sumer[tok], amount);
    ISUMER(sumer[tok]).mint(amount);
  } 

  /**
   * @notice _withdrawSumer function withdraws the fund of token from SUMER protocol.
   * @param tok address of the token to consider to withdraw.
   * @param amount i.e calculated amount of token to withdraw.
   */
  function _withdrawSumer(address tok, uint amount) external override {
    checkStorage();
    ISUMER(sumer[tok]).redeem(amount);
  }

  function approval(address tok, address sender, uint256 amount) internal {
    uint256 allowance = IERC20(tok).allowance(address(this), sender);
    if (allowance < amount) {
      IERC20(tok).safeIncreaseAllowance(sender, (amount - allowance));
    }
  }

  /**
   * @notice _withdrawAave function withdraws the fund of token from AAve protocol.
   * @param tok address of the token to consider to withdraw.
   * @param amount i.e calculated amount of token to withdraw.
   */
  function _withdrawAave(address tok, uint amount) external override {
    checkStorage();
    _lendingPool().withdraw(tok, amount, address(this));
  }

  /**
   * @notice updatePoolData function updates the pool data in the process of rebalance.
   * @param data encoded data to update.
   */
  function updatePoolData(bytes memory data) external override nonReentrant {
    checkManager();
    setInitialValues(data);
  }

  /**
   * @notice Returns the array of underlying tokens.
   * @return uTokensArray Array of underlying tokens.
   */
  function getUTokens() external view override returns (address[] memory uTokensArray) {
    return uTokens;
  }

  function getProportions()
    external
    view
    override
    returns (uint[] memory, uint[] memory)
  {
    return (uTokenProportions, defaultProportion);
  }

  /**
   * @notice Sets unstaking data and returns necessary information.
   * @dev This function is used to set unstaking data and returns relevant information.
   * @param totalQueuedShares The total number of queued shares for unstaking.
   * @return token An array containing token addresses.
   * @return uTokens An array containing addresses of underlying tokens.
   * @return pool The address of the pool.
   * @return tSupply The total supply of tokens after considering queued shares.
   */
  function setUnstakeData(
    uint256 totalQueuedShares
  ) external override returns (address[] memory, address[] memory, uint256, uint256) {
    checkOracle();
    uint256 tSupply = _totalSupply;
    if (totalQueuedShares != 0) {
      _totalSupply -= totalQueuedShares;
    }
    return (token, uTokens, pool, tSupply);
  }

  /**
   * @notice Retrieves input tokens.
   * @dev This function is used to retrieve input token addresses and non-overlapping input token addresses.
   * @return token An array containing input token addresses.
   * @return nonOverlappingITokens An array containing non-overlapping input token addresses.
   */
  function getInputToken()
    external
    view
    override
    returns (address[] memory, address[] memory)
  {
    return (token, nonOverlappingITokens);
  }

  /**
   * @notice setInitialValues function initialises the pool and afi product data
   * @param data  i.e encoded data that contains pool, product data.
   */
  function setInitialValues(bytes memory data) internal {
    IAFi.PoolsData memory pooldata = abi.decode(data, (IAFi.PoolsData));
    IAFi.UnderlyingData memory uData = abi.decode(
      pooldata.underlyingData,
      (IAFi.UnderlyingData)
    );

    address tok;
    uint uLen = uData._underlyingTokens.length;
    for (uint i = 0; i < uLen; i++) {
      tok = uData._underlyingTokens[i];
      uTokens.push(uData._underlyingTokens[i]);
      uTokenProportions.push(pooldata._underlyingTokensProportion[i]);
      sumer[tok] = pooldata._sumer[i];
      compoundV3Comet[tok] = pooldata.compoundV3Comet[i];
      aFiStorage.afiSync(
        address(this),
        tok,
        pooldata._aaveToken[i],
        compoundV3Comet[tok],
        sumer[tok]
      );
    }
  }

  function updateuTokAndProp(address[] memory _uTokens) external override {
    checkManager();
    uTokens = _uTokens;
  }

  function checkManager() internal {
    addressEqual(msg.sender, aFiManager);
  }

  /**
   * @notice updateDp Function updates the default proportion after rebalance
   * @dev it should be called by the AFiManager contract only.
   * @param _defaultProportion i.e array of new default proportion
   */
  function updateDp(
    uint256[] memory _defaultProportion,
    uint256[] memory _uTokensProportion
  ) external override {
    checkManager();
    uTokenProportions = _uTokensProportion;
    defaultProportion = _defaultProportion;
  }

  /// @notice Retrieves Aave LendingPool address
  /// @return A reference to LendingPool interface
  function _lendingPool() internal view returns (ILendingPool) {
    return ILendingPool(IPoolAddressesProvider(POOL_ADDRESS_PROVIDER).getPool());
  }

  function checkOracle() internal {
    addressEqual(msg.sender, aFiOracle);
  }

  /**
   * @notice updateShares Function locks/unlocks afi token
   * @dev it should be called by the time lock contract only.
   * @param user address to lock the afi token from.
   * @param amount i.e. amount to be locked/unlocked.
   * @param lock i.e. status if amount should be locked or unlocked.
   */
  function stakeShares(address user, uint256 amount, bool lock) external {
    addressCheck(user, tLContract);
    if (lock) {
      validateShares(user, amount);
    } else {
      greaterEqualComparison(userLockedAmount[user], amount);
    }
    updateLockedTokens(user, amount, lock, false, false, 0);
    emit UpdateShares(user, amount, lock);
  }

  function updateLockedTokens(
    address user,
    uint256 amount,
    bool lock,
    bool queue,
    bool unqueue,
    uint256 newNAV
  ) public override {
    twoAddressCompare(tLContract, aFiOracle);
    if (msg.sender == tLContract) {
      if (lock) {
        userLockedAmount[user] = userLockedAmount[user] + (amount);
      } else {
        userLockedAmount[user] = userLockedAmount[user] - (amount);
      }
    }

    if (queue) {
      _balances[user] -= amount;
      if (_balances[user] == 0 && userLockedAmount[user] == 0) {
        delete depositNAV[user];
      }
      emit Transfer(user, address(0), amount);
    }
    if (unqueue) {
      depositNAV[user] = newNAV;
      _balances[user] += amount;
      emit Transfer(address(0), user, amount);
    }
  }

  /**
   * @notice updateTimeLockContract Function updates timelock contract address and zero address should not pass
   * @param newTL address of the timelock contract.
   */
  function updateTimeLockContract(address newTL) external onlyOwner {
    addressCheck(newTL, address(0));
    tLContract = newTL;
  }

  /**
   * @notice Allows the owner to emergency withdraw tokens from the contract.
   * @dev Only the platform wallet can call this function.
   * @param tok Address of the token to be withdrawn.
   * @param wallet Address to receive the withdrawn tokens.
   */
  function emergencyWithdraw(address tok, address wallet) external {
    checkDelayModule();
    (bool iPresent, bool present) = checkTokInList(tok);
    checkFalse(present);
    checkFalse(iPresent);
    contractTransfers(tok, wallet, balance(tok, address(this)));
  }

  function checkDelayModule() internal {
    addressEqual(msg.sender, delayModule);
  }

  /**
   * @notice Returns the balance of a specific token in the AFi contract.
   * @param tok The address of the token.
   * @param user The address of the AFi contract or any user.
   * @return The token balance.
   */
  function balance(address tok, address user) internal view returns (uint) {
    return IERC20(tok).balanceOf(user);
  }

  /**
   * @notice Updates the list of input tokens for the contract.
   * @dev Only the contract owner can call this function.
   * @param _nonOverlappingITokens Array of addresses representing input tokens.
   */
  function updateInputTokens(
    address[] memory _nonOverlappingITokens
  ) external override {
    twoAddressCompare(owner(), aFiManager);
    nonOverlappingITokens = _nonOverlappingITokens;
  }

  /**
   * @notice Returns the NAV (Net Asset Value) of a user's deposited funds.
   * @param user Address of the user.
   * @return The NAV of the user's deposited funds.
   */
  function depositUserNav(address user) external view override returns (uint256) {
    if (_balances[user] == 0) {
      return 0;
    } else {
      return depositNAV[user];
    }
  }

  function migration(address iToken) external onlyOwner {
    addressCheck(PARENT_VAULT, address(0));
    checkFalse(migrated);
    _totalSupply += IERC20(PARENT_VAULT).totalSupply();
    migrated = true;
    increasecsCounter();
    setPreDeposit(iToken, balance(iToken, address(this)));
  }

  function checkEqual(uint256 valA, uint256 valB) internal {
    require(valA == valB, "AB222");
  }

  function exchangeToken() external {
    checkFalse(!migrated);
    uint256 shares = balance(PARENT_VAULT, msg.sender);
    greaterComparision(shares, 0);

    uint256 userNAV = IAFi(PARENT_VAULT).depositUserNav(msg.sender);
    IERC20(PARENT_VAULT).safeTransferFrom(msg.sender, DEAD_ADDRESS, shares);

    uint256 nav = depositNAV[msg.sender];
    uint256 bal = _balances[msg.sender];

    if (nav != 0 && bal > 0) {
      userNAV = ((nav * bal) + (shares * userNAV)) / (bal + shares);
    }
    _balances[msg.sender] += shares;
    emit Transfer(address(0), msg.sender, shares);

    makeUpdates(userNAV, 0);
  }

  function makeUpdates(uint256 userNAV, uint256 nonwithdrawable) internal {
    depositNAV[msg.sender] = userNAV; //take weigted average
    nonWithdrawableShares[msg.sender][cSwapCounter] += nonwithdrawable;
  }
}