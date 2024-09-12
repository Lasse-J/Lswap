const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

const ether = tokens
const shares = ether

describe('AMM', () => {
  let accounts, deployer, liquidityProvider, investor1, investor2
  let token1, token2, amm

  beforeEach(async () => {
    // Deploy accounts
    accounts = await ethers.getSigners()
    deployer = accounts[0]
    liquidityProvider = accounts[1]
    investor1 = accounts[2]
    investor2 = accounts[3]

    // Deploy tokens
    const Token = await ethers.getContractFactory('Token')
    token1 = await Token.deploy('Lasse Token', 'LSE', '1000000')
    token2 = await Token.deploy('USD Token', 'USD', '1000000')

    // Send tokens to liquidity provider
    let transaction = await token1.connect(deployer).transfer(liquidityProvider.address, tokens(100000))
    await transaction.wait()
    transaction = await token2.connect(deployer).transfer(liquidityProvider.address, tokens(100000))
    await transaction.wait()

    // Send token1 to investor1
    transaction = await token1.connect(deployer).transfer(investor1.address, tokens(50000))
    await transaction.wait()

    // Send token2 to investor2
    transaction = await token2.connect(deployer).transfer(investor2.address, tokens(50000))
    await transaction.wait()

    // Deploy AMM
    const AMM = await ethers.getContractFactory('AMM')
    amm = await AMM.deploy(token1.address, token2.address)
  })

  describe('Deployment', () => {

    it('has an address', async () => {
      expect(amm.address).to.not.equal(0x0)
    })

    it('tracks token1 address', async () => {
      expect(await amm.token1()).to.equal(token1.address)
    })

    it('tracks token2 address', async () => {
      expect(await amm.token2()).to.equal(token2.address)
    })
  })

  describe('Swapping tokens', () => {
    let amount, transaction, result, estimate, balance

    it('facilitates swaps', async () => {
      // Deployer approves 100k tokens
      amount = tokens(100000)
      transaction = await token1.connect(deployer).approve(amm.address, amount)
      await transaction.wait()
      transaction = await token2.connect(deployer).approve(amm.address, amount)
      await transaction.wait()

      // Deployer adds liquidity
      transaction = await amm.connect(deployer).addLiquidity(amount, amount)
      await transaction.wait()

      // Check AMM receives tokens
      expect(await token1.balanceOf(amm.address)).to.equal(amount)
      expect(await token2.balanceOf(amm.address)).to.equal(amount)

      expect(await amm.token1Balance()).to.equal(amount)
      expect(await amm.token2Balance()).to.equal(amount)

      // Check deployer has 100 shares
      expect(await amm.shares(deployer.address)).to.equal(tokens(100))

      // Check pool has 100 total shares
      expect(await amm.totalShares()).to.equal(tokens(100))

      /////////////////////////////////////////////////////////////////
      // LP Adds more liquidity
      
      // LP approves 50k tokens
      amount = tokens(50000)
      transaction = await token1.connect(liquidityProvider).approve(amm.address, amount)
      await transaction.wait()
      transaction = await token2.connect(liquidityProvider).approve(amm.address, amount)
      await transaction.wait()

      // Calculate token2 deposit amount
      let token2Deposit = await amm.calculateToken2Deposit(amount)

      // LP adds liquidity
      transaction = await amm.connect(liquidityProvider).addLiquidity(amount, token2Deposit)
      await transaction.wait()

      // Check LP has 50 shares
      expect(await amm.shares(liquidityProvider.address)).to.equal(tokens(50))

      // Check deployer has 100 shares
      expect(await amm.shares(deployer.address)).to.equal(tokens(100))

      // Check pool has 150 total shares
      expect(await amm.totalShares()).to.equal(tokens(150))

      /////////////////////////////////////////////////////////////////
      // Investor1 swaps

      // Check price before swapping
      let price = (await amm.token2Balance() / await amm.token1Balance())
      console.log(`Price before swapping: ${price}\n`)

      // Investor1 approves all his tokens
      transaction = await token1.connect(investor1).approve(amm.address, tokens(50000))
      await transaction.wait()

      // Check investor1 balance before swap
      balance = await token1.balanceOf(investor1.address)
      console.log(`Investor1 Token1 balance before swap: ${ethers.utils.formatEther(balance)}`)
      balance = await token2.balanceOf(investor1.address)
      console.log(`Investor1 Token2 balance before swap: ${ethers.utils.formatEther(balance)}`)

      // Estimate amount of tokens investor1 will receive after swapping token1: include slippage
      estimate = await amm.calculateToken1Swap(tokens(1))
      console.log(`Token2 amount investor1 will receive after swap: ${ethers.utils.formatEther(estimate)}`)

      // Investor1 swaps 1 token1
      transaction = await amm.connect(investor1).swapToken1(tokens(1))
      result = await transaction.wait()

      // Check for the swap event
      await expect(transaction).to.emit(amm, 'Swap')
        .withArgs(
          investor1.address,
          token1.address,
          tokens(1),
          token2.address,
          estimate,
          await amm.token1Balance(),
          await amm.token2Balance(),
          (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp
          // ^^ blockNumber = await ethers.provider.getBlockNumber()
          // ^^ block = await ethers.provider.getBlock(blockNumber)
          // ^^ block.timestamp
        )

      // Check investor1 balance after swap
      balance = await token1.balanceOf(investor1.address)
      console.log(`Investor1 Token1 balance after swap: ${ethers.utils.formatEther(balance)}`)
      balance = await token2.balanceOf(investor1.address)
      console.log(`Investor1 Token2 balance after swap: ${ethers.utils.formatEther(balance)}\n`)
      expect(estimate).to.equal(balance)

      // Check AMM token balance are in sync
      expect(await token1.balanceOf(amm.address)).to.equal(await amm.token1Balance())
      expect(await token2.balanceOf(amm.address)).to.equal(await amm.token2Balance())

      // Check price after swapping
      price = (await amm.token2Balance() / await amm.token1Balance())
      console.log(`Price after swapping: ${price}\n`)

      /////////////////////////////////////////////////////////////////
      // Investor1 swaps again

      // Swap some more tokens to see what happens
      balance = await token1.balanceOf(investor1.address)
      console.log(`Investor1 Token1 balance before swap: ${ethers.utils.formatEther(balance)}`)
      balance = await token2.balanceOf(investor1.address)
      console.log(`Investor1 Token2 balance before swap: ${ethers.utils.formatEther(balance)}`)

      // Estimate amount of tokens investor1 will receive after swapping token1: include slippage
      estimate = await amm.calculateToken1Swap(tokens(666))
      console.log(`Token2 amount investor1 will receive after swap: ${ethers.utils.formatEther(estimate)}`)

      // Investor1 swaps 100 token1
      transaction = await amm.connect(investor1).swapToken1(tokens(666))
      result = await transaction.wait()

      // Check investor1 balance after swap
      balance = await token1.balanceOf(investor1.address)
      console.log(`Investor1 Token1 balance after swap: ${ethers.utils.formatEther(balance)}`)
      balance = await token2.balanceOf(investor1.address)
      console.log(`Investor1 Token2 balance after swap: ${ethers.utils.formatEther(balance)}\n`)

      // Check AMM token balance are in sync
      expect(await token1.balanceOf(amm.address)).to.equal(await amm.token1Balance())
      expect(await token2.balanceOf(amm.address)).to.equal(await amm.token2Balance())

      // Check price after swapping
      price = (await amm.token2Balance() / await amm.token1Balance())
      console.log(`Price after swapping: ${price}\n`)

      /////////////////////////////////////////////////////////////////
      // Investor1 swaps once again

      // Swap some more tokens to see what happens
      balance = await token1.balanceOf(investor1.address)
      console.log(`Investor1 Token1 balance before swap: ${ethers.utils.formatEther(balance)}`)
      balance = await token2.balanceOf(investor1.address)
      console.log(`Investor1 Token2 balance before swap: ${ethers.utils.formatEther(balance)}`)

      // Estimate amount of tokens investor1 will receive after swapping token1: include slippage
      estimate = await amm.calculateToken1Swap(tokens(2500))
      console.log(`Token2 amount investor1 will receive after swap: ${ethers.utils.formatEther(estimate)}`)

      // Investor1 swaps 100 token1
      transaction = await amm.connect(investor1).swapToken1(tokens(2500))
      result = await transaction.wait()

      // Check investor1 balance after swap
      balance = await token1.balanceOf(investor1.address)
      console.log(`Investor1 Token1 balance after swap: ${ethers.utils.formatEther(balance)}`)
      balance = await token2.balanceOf(investor1.address)
      console.log(`Investor1 Token2 balance after swap: ${ethers.utils.formatEther(balance)}\n`)

      // Check AMM token balance are in sync
      expect(await token1.balanceOf(amm.address)).to.equal(await amm.token1Balance())
      expect(await token2.balanceOf(amm.address)).to.equal(await amm.token2Balance())

      // Check price after swapping
      price = (await amm.token2Balance() / await amm.token1Balance())
      console.log(`Price after swapping: ${price}\n`)

      /////////////////////////////////////////////////////////////////
      // Investor2 swaps

      // Swap some more tokens to see what happens
      balance = await token1.balanceOf(investor2.address)
      console.log(`Investor2 Token1 balance before swap: ${ethers.utils.formatEther(balance)}`)
      balance = await token2.balanceOf(investor2.address)
      console.log(`Investor2 Token2 balance before swap: ${ethers.utils.formatEther(balance)}`)

      // Investor2 approves all his tokens
      transaction = await token2.connect(investor2).approve(amm.address, tokens(50000))
      await transaction.wait()

      // Estimate amount of tokens investor2 will receive after swapping token2: include slippage
      estimate = await amm.calculateToken2Swap(tokens(1000))
      console.log(`Token1 amount investor2 will receive after swap: ${ethers.utils.formatEther(estimate)}`)

      // Investor2 swaps 1000 token2
      transaction = await amm.connect(investor2).swapToken2(tokens(1000))
      result = await transaction.wait()

      // Check for the swap event
      await expect(transaction).to.emit(amm, 'Swap')
        .withArgs(
          investor2.address,
          token2.address,
          tokens(1000),
          token1.address,
          estimate,
          await amm.token2Balance(),
          await amm.token1Balance(),
          (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp
          // ^^ blockNumber = await ethers.provider.getBlockNumber()
          // ^^ block = await ethers.provider.getBlock(blockNumber)
          // ^^ block.timestamp
        )

      // Check investor2 balance after swap
      balance = await token1.balanceOf(investor2.address)
      console.log(`Investor2 Token1 balance after swap: ${ethers.utils.formatEther(balance)}`)
      expect(estimate).to.equal(balance)
      balance = await token2.balanceOf(investor2.address)
      console.log(`Investor2 Token2 balance after swap: ${ethers.utils.formatEther(balance)}\n`)

      // Check AMM token balance are in sync
      expect(await token1.balanceOf(amm.address)).to.equal(await amm.token1Balance())
      expect(await token2.balanceOf(amm.address)).to.equal(await amm.token2Balance())

      // Check price after swapping
      price = (await amm.token2Balance() / await amm.token1Balance())
      console.log(`Price after swapping: ${price}\n`)

      /////////////////////////////////////////////////////////////////
      // Investor2 swaps again

      // Swap some more tokens to see what happens
      balance = await token1.balanceOf(investor2.address)
      console.log(`Investor2 Token1 balance before swap: ${ethers.utils.formatEther(balance)}`)
      balance = await token2.balanceOf(investor2.address)
      console.log(`Investor2 Token2 balance before swap: ${ethers.utils.formatEther(balance)}`)

      // Estimate amount of tokens investor2 will receive after swapping token2: include slippage
      estimate = await amm.calculateToken2Swap(tokens(5000))
      console.log(`Token1 amount investor2 will receive after swap: ${ethers.utils.formatEther(estimate)}`)

      // Investor2 swaps 1000 token2
      transaction = await amm.connect(investor2).swapToken2(tokens(5000))
      result = await transaction.wait()

      // Check investor2 balance after swap
      balance = await token1.balanceOf(investor2.address)
      console.log(`Investor2 Token1 balance after swap: ${ethers.utils.formatEther(balance)}`)
      balance = await token2.balanceOf(investor2.address)
      console.log(`Investor2 Token2 balance after swap: ${ethers.utils.formatEther(balance)}\n`)

      // Check AMM token balance are in sync
      expect(await token1.balanceOf(amm.address)).to.equal(await amm.token1Balance())
      expect(await token2.balanceOf(amm.address)).to.equal(await amm.token2Balance())

      // Check price after swapping
      price = (await amm.token2Balance() / await amm.token1Balance())
      console.log(`Price after swapping: ${price}\n`)


      /////////////////////////////////////////////////////////////////
      // Removing liquidity

      console.log(`AMM Token1 Balance: ${ethers.utils.formatEther(await amm.token1Balance())}`)
      console.log(`AMM Token2 Balance: ${ethers.utils.formatEther(await amm.token2Balance())}`)

      // Check LP balance before removing tokens
      balance = await token1.balanceOf(liquidityProvider.address)
      console.log(`Liquidity Provider Token1 balance before removing funds: ${ethers.utils.formatEther(balance)}`)
      balance = await token2.balanceOf(liquidityProvider.address)
      console.log(`Liquidity Provider Token2 balance before removing funds: ${ethers.utils.formatEther(balance)}`)

      // LP removes tokens from AMM pool
      transaction = await amm.connect(liquidityProvider).removeLiquidity(shares(30))
      await transaction.wait()

      // Check balance after removing funds
      balance = await token1.balanceOf(liquidityProvider.address)
      console.log(`Liquidity Provider Token1 balance after removing funds: ${ethers.utils.formatEther(balance)}`)
      balance = await token2.balanceOf(liquidityProvider.address)
      console.log(`Liquidity Provider Token2 balance after removing funds: ${ethers.utils.formatEther(balance)}`)

      // LP should have xx shares
      expect(await amm.shares(liquidityProvider.address)).to.equal(shares(20))

      // Deployer should have 100 shares
      expect(await amm.shares(deployer.address)).to.equal(shares(100))

      // AMM Pool has 120 total shares
      expect(await amm.totalShares()).to.equal(shares(120))            
    })
  })
})
