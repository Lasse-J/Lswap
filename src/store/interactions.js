import { ethers } from 'ethers'
import { setProvider, setNetwork, setAccount } from './reducers/provider'
import { setContracts, setSymbols, balancesLoaded } from './reducers/tokens'
import { setContract, sharesLoaded, swapRequest, swapSuccess, swapFail } from './reducers/amm'
import TOKEN_ABI from '../abis/Token.json';
import AMM_ABI from '../abis/AMM.json';
import config from '../config.json';

export const loadProvider = (dispatch) => {
	 const provider = new ethers.providers.Web3Provider(window.ethereum)
	 dispatch(setProvider(provider))

	 return provider
}

export const loadNetwork = async (provider, dispatch) => {
	const { chainId } = await provider.getNetwork()
	dispatch(setNetwork(chainId))

	return chainId
}

export const loadAccount = async (dispatch) => {
	const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
	const account = ethers.utils.getAddress(accounts[0])
	dispatch(setAccount(account))

	return account
}

// -----------------------------------------------------------------------------
// LOAD CONTRACTS

export const loadTokens = async (provider, chainId, dispatch) => {
	const lse = new ethers.Contract(config[chainId].lse.address, TOKEN_ABI, provider)
	const usd = new ethers.Contract(config[chainId].usd.address, TOKEN_ABI, provider)
	const meth = new ethers.Contract(config[chainId].meth.address, TOKEN_ABI, provider)
	const mbtc = new ethers.Contract(config[chainId].mbtc.address, TOKEN_ABI, provider)

	dispatch(setContracts([lse, usd, meth, mbtc]))
	dispatch(setSymbols([await lse.symbol(), await usd.symbol(), await meth.symbol(), await mbtc.symbol()]))
}

export const loadAMMs = async (provider, chainId, dispatch) => {
	const lseusd = new ethers.Contract(config[chainId].lseusd.address, AMM_ABI, provider)
	const methusd = new ethers.Contract(config[chainId].methusd.address, AMM_ABI, provider)
	const mbtcusd = new ethers.Contract(config[chainId].mbtcusd.address, AMM_ABI, provider)
//	const amm = ([lseusd, methusd, mbtcusd])

	dispatch(setContract([lseusd, methusd, mbtcusd]))
//	return amm
//	return lseusd
//	return methusd
//	return mbtcusd
}

// -----------------------------------------------------------------------------
// LOAD BALANCES & SHARES

export const loadBalances = async (lseusd, methusd, mbtcusd, tokens, account, dispatch) => {
	const balance1 = await tokens[0].balanceOf(account)
	const balance2 = await tokens[1].balanceOf(account)
	const balance3 = await tokens[2].balanceOf(account)
	const balance4 = await tokens[3].balanceOf(account)

	dispatch(balancesLoaded([
		ethers.utils.formatUnits(balance1.toString(), 'ether'),
		ethers.utils.formatUnits(balance2.toString(), 'ether'),
		ethers.utils.formatUnits(balance3.toString(), 'ether'),
		ethers.utils.formatUnits(balance4.toString(), 'ether')
	]))

//	const shares = await amm.shares(account)
	const shares1 = await lseusd.shares(account)
	const shares2 = await methusd.shares(account)
	const shares3 = await mbtcusd.shares(account)
	dispatch(sharesLoaded([
		ethers.utils.formatUnits(shares1.toString(), 'ether'),
		ethers.utils.formatUnits(shares2.toString(), 'ether'),
		ethers.utils.formatUnits(shares3.toString(), 'ether')
	]))

}

// -----------------------------------------------------------------------------
// SWAP

export const swap = async (provider, inputToken, outputToken, amm, token, symbol, amount, dispatch) => {
	try {

		dispatch(swapRequest())

		let transaction
		const signer = await provider.getSigner()

		// Select AMM
	//	if (inputToken === 'LSE' || outputToken === 'LSE') {
	//		amm = amm[0]}
	//	if (inputToken === 'mETH' || outputToken === 'mETH') {
	//		amm = amm[1]}
	//	if (inputToken === 'mBTC' || outputToken === 'mBTC') {
	//		amm = amm[2]}

		console.log('amm address', amm.address)
		transaction = await token.connect(signer).approve(amm.address, amount)
		await transaction.wait()	

		if (symbol === 'USD') {
			transaction = await amm.connect(signer).swapToken2(amount)
		} else {
			transaction = await amm.connect(signer).swapToken1(amount)
		}
		await transaction.wait()

		dispatch(swapSuccess(transaction.hash))

	} catch (error) {
		dispatch(swapFail())
	}
}
