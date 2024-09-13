import { ethers } from 'ethers'
import { setProvider, setNetwork, setAccount } from './reducers/provider'
import { setContracts, setSymbols, balancesLoaded } from './reducers/tokens'
import { setContract } from './reducers/amm'
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

	dispatch(setContract([lseusd, methusd, mbtcusd]))
	return lseusd
	return methusd
	return mbtcusd
}

// -----------------------------------------------------------------------------
// LOAD BALANCES & SHARES

export const loadBalances = async (tokens, account, dispatch) => {
	const balance1 = await tokens[0].balanceOf(account)
	const balance2 = await tokens[1].balanceOf(account)
	const balance3 = await tokens[2].balanceOf(account)
	const balance4 = await tokens[3].balanceOf(account)

	dispatch(balancesLoaded(
		balance1,
		balance2,
		balance3,
		balance4
	))
}
