// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const config = require('../src/config.json')

const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

const ether = tokens
const shares = ether

async function main() {
  // Fetch accounts
  console.log(`Fetching accounts & network \n`)
  const accounts = await ethers.getSigners()
  const deployer = accounts[0]
  const investor1 = accounts[1]
  const investor2 = accounts[2]
  const investor3 = accounts[3]
  const investor4 = accounts[4]

  // Fetch network
  const { chainId } = await ethers.provider.getNetwork()

  console.log(`Fetching token and transferring to accounts...\n`)

  // Fetch Lasse Token
  const lse = await ethers.getContractAt('Token', config[chainId].lse.address)
  console.log(`Lasse Token fetched: ${lse.address}`)

  // Fetch USD Token
  const usd = await ethers.getContractAt('Token', config[chainId].usd.address)
  console.log(`USD Token fetched: ${usd.address}`)

  // Fetch mockETH Token
  const meth = await ethers.getContractAt('Token', config[chainId].meth.address)
  console.log(`mockETH Token fetched: ${meth.address}`)

  // Fetch mockBTC Token
  const mbtc = await ethers.getContractAt('Token', config[chainId].mbtc.address)
  console.log(`mockBTC Token fetched: ${mbtc.address}\n`)

  //////////////////////////////////////////////////////////////
  // Distribute Tokens to Investors

  let transaction

  // Send Lasse Tokens to investors
  transaction = await lse.connect(deployer).transfer(investor1.address, tokens(1000))
  await transaction.wait()

//  transaction = await lse.connect(deployer).transfer(investor2.address, tokens(500))
//  await transaction.wait()
//
//  transaction = await lse.connect(deployer).transfer(investor3.address, tokens(500))
//  await transaction.wait()
//
//  transaction = await lse.connect(deployer).transfer(investor4.address, tokens(500))
//  await transaction.wait()

  // Send USD Tokens to investors
  transaction = await usd.connect(deployer).transfer(investor1.address, tokens(100000))
  await transaction.wait()

  transaction = await usd.connect(deployer).transfer(investor2.address, tokens(50000))
  await transaction.wait()

  transaction = await usd.connect(deployer).transfer(investor3.address, tokens(25000))
  await transaction.wait()

  transaction = await usd.connect(deployer).transfer(investor4.address, tokens(10000))
  await transaction.wait()

  // Send mockETH Tokens to investors
  transaction = await meth.connect(deployer).transfer(investor2.address, tokens(10))
  await transaction.wait()

  transaction = await meth.connect(deployer).transfer(investor3.address, tokens(5))
  await transaction.wait()

  // Send mockBTC Tokens to investors
  transaction = await mbtc.connect(deployer).transfer(investor4.address, tokens(1))
  await transaction.wait()


  //////////////////////////////////////////////////////////////
  // Adding liquidity

  let lse_amount = tokens(200000)
  let usd_amount = tokens(200000)
  let meth_amount = tokens(80)
  let mbtc_amount = tokens(3333/1000)

  console.log(`Fetching AMM contracts...\n`)

  // Fetch AMM
  const lseusd = await ethers.getContractAt('AMM', config[chainId].lseusd.address)
  console.log(`AMM (LSE/USD) fetched: ${lseusd.address}`)
  const methusd = await ethers.getContractAt('AMM', config[chainId].methusd.address)
  console.log(`AMM (mETH/USD) fetched: ${methusd.address}`)
  const mbtcusd = await ethers.getContractAt('AMM', config[chainId].mbtcusd.address)
  console.log(`AMM (mBTC/USD) fetched: ${mbtcusd.address}\n`)


  // Deployer approves tokens for liquidity
  transaction = await lse.connect(deployer).approve(lseusd.address, lse_amount)
  await transaction.wait()
  transaction = await usd.connect(deployer).approve(lseusd.address, usd_amount)
  await transaction.wait()

  transaction = await meth.connect(deployer).approve(methusd.address, meth_amount)
  await transaction.wait()
  transaction = await usd.connect(deployer).approve(methusd.address, usd_amount)
  await transaction.wait()

  transaction = await mbtc.connect(deployer).approve(mbtcusd.address, mbtc_amount)
  await transaction.wait()
  transaction = await usd.connect(deployer).approve(mbtcusd.address, usd_amount)
  await transaction.wait()

  // Deployer adds liquidity
  console.log(`Adding liquidity...\n`)
  transaction = await lseusd.connect(deployer).addLiquidity(lse_amount, usd_amount)
  await transaction.wait()
  console.log(`Added liquidity to LSE/USD pair`)
  transaction = await methusd.connect(deployer).addLiquidity(meth_amount, usd_amount)
  await transaction.wait()
  console.log(`Added liquidity to mETH/USD pair`)
  transaction = await mbtcusd.connect(deployer).addLiquidity(mbtc_amount, usd_amount)
  await transaction.wait()
  console.log(`Added liquidity to mBTC/USD pair\n`)


  //////////////////////////////////////////////////////////////
  // Swaps

  console.log(`Investor 1 swaps LSE to USD...`)
  transaction = await lse.connect(investor1).approve(lseusd.address, tokens(1000))
  await transaction.wait()
  transaction = await lseusd.connect(investor1).swapToken1(tokens(10))
  await transaction.wait()

  console.log(`Investor 2 swaps mETH to USD...`)
  transaction = await meth.connect(investor2).approve(methusd.address, tokens(10))
  await transaction.wait()
  transaction = await methusd.connect(investor2).swapToken1(tokens(2))
  await transaction.wait()

  console.log(`Investor 3 swaps USD to mETH...`)
  transaction = await usd.connect(investor3).approve(methusd.address, tokens(10000))
  await transaction.wait()
  transaction = await methusd.connect(investor3).swapToken2(tokens(5000))
  await transaction.wait()

  console.log(`Investor 4 swaps mBTC to USD...\n`)
  transaction = await mbtc.connect(investor4).approve(mbtcusd.address, tokens(1))
  await transaction.wait()
  transaction = await mbtcusd.connect(investor4).swapToken1(tokens(1))
  await transaction.wait()

  console.log(`Seeding script finished.\n`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
