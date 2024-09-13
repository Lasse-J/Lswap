// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const Token = await hre.ethers.getContractFactory('Token')

  // Deploy Lasse Token (token1)
  let lse = await Token.deploy('Lasse Token', 'LSE', '1000000')
  await lse.deployed()
  console.log(`Lasse Token deployed to: ${lse.address}`)

  // Deploy USD Token (token2)
  let usd = await Token.deploy('USD Token', 'USD', '1000000')
  await usd.deployed()
  console.log(`USD Token deployed to: ${usd.address}`)

  // Deploy mockETH Token (token3)
  let meth = await Token.deploy('mockETH Token', 'mETH', '10000')
  await meth.deployed()
  console.log(`mockETH Token deployed to: ${meth.address}`)

  // Deploy mockBTC Token (token4)
  let mbtc = await Token.deploy('mockBTC Token', 'mBTC', '10000')
  await mbtc.deployed()
  console.log(`mockBTC Token deployed to: ${mbtc.address}\n`)

  // Deploy AMM
  const AMM = await hre.ethers.getContractFactory('AMM')
  const lseusd = await AMM.deploy(lse.address, usd.address)
  console.log(`AMM contract (LSE/USD) deployed to: ${lseusd.address}`)
  const methusd = await AMM.deploy(meth.address, usd.address)
  console.log(`AMM contract (mETH/USD) deployed to: ${methusd.address}`)
  const mbtcusd = await AMM.deploy(mbtc.address, usd.address)
  console.log(`AMM contract (mBTC/USD) deployed to: ${mbtcusd.address}\n`)

  console.log(`Deployment script finished.\n`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
