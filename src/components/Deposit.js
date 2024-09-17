import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { ethers } from 'ethers';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import Alert from './Alert';

import { addLiquidity, loadBalances } from '../store/interactions'

const Deposit = () => {
	const [inputToken, setInputToken] = useState('LSE')
	const [outputToken, setOutputToken] = useState('USD')
	const [tradingPair, setTradingPair] = useState('LSE')
	const [token1Amount, setToken1Amount] = useState(0)
	const [token2Amount, setToken2Amount] = useState(0)
	const [showAlert, setShowAlert] = useState(false)

	const dispatch = useDispatch()
	const provider = useSelector(state => state.provider.connection)
	const account = useSelector(state => state.provider.account)
	const tokens = useSelector(state => state.tokens.contracts)
//	const symbols = useSelector(state => state.tokens.symbols)
	const balances = useSelector(state => state.tokens.balances)
	const isDepositing = useSelector(state => state.amm.depositing.isDepositing)
	const isSuccess = useSelector(state => state.amm.depositing.isSuccess)
	const transactionHash = useSelector(state => state.amm.depositing.transactionHash)
	const lseusd = useSelector(state => state.amm.contract[0])
	const methusd = useSelector(state => state.amm.contract[1])
	const mbtcusd = useSelector(state => state.amm.contract[2])

	const AMMContracts = {
		'LSE': useSelector(state => state.amm.contract[0]),
		'mETH': useSelector(state => state.amm.contract[1]),
		'mBTC': useSelector(state => state.amm.contract[2])
	};

	// Select correct AMM contract
	let amm = AMMContracts[tradingPair];

	const balanceHelper = {
		'LSE': useSelector(state => state.tokens.balances[0]),
		'mETH': useSelector(state => state.tokens.balances[2]),
		'mBTC': useSelector(state => state.tokens.balances[3])
	};

	const tokensHelper = {
		'LSE': useSelector(state => state.tokens.contracts[0]),
		'USD': useSelector(state => state.tokens.contracts[1]),
		'mETH': useSelector(state => state.tokens.contracts[2]),
		'mBTC': useSelector(state => state.tokens.contracts[3])
	};

	const amountHandler = async (e) => {
		if (e.target.id === 'token1') {
			setToken1Amount(e.target.value)
			const _token1Amount = ethers.utils.parseUnits(e.target.value, 'ether')
			const result = await amm.calculateToken2Deposit(_token1Amount)
			const _token2Amount = ethers.utils.formatUnits(result.toString(), 'ether')
			setToken2Amount(_token2Amount)
		} else {
			setToken2Amount(e.target.value)
			const _token2Amount = ethers.utils.parseUnits(e.target.value, 'ether')
			const result = await amm.calculateToken1Deposit(_token2Amount)
			const _token1Amount = ethers.utils.formatUnits(result.toString(), 'ether')
			setToken1Amount(_token1Amount)
		}
	}

	const depositHandler = async (e) => {
		e.preventDefault()

		setShowAlert(false)

		const _token1Amount = ethers.utils.parseUnits(token1Amount, 'ether')
		const _token2Amount = ethers.utils.parseUnits(token2Amount, 'ether')

		await addLiquidity(provider, amm, tokensHelper[tradingPair], tokensHelper['USD'], [_token1Amount, _token2Amount], dispatch)

		await loadBalances(lseusd, methusd, mbtcusd, tokens, account, dispatch)

		setShowAlert(true)
	}

	return (
		<div>
			<Card style={{ maxWidth: '450px' }} className='mx-auto px-4'>
				{account ? (
						<Form onSubmit={depositHandler} style={{ maxWidth: '450px', margin: '50px auto' }}>
							<Row>
								<Form.Text className='text-end my-2' muted>
									Balance: {
										inputToken === 'USD' ? (
											balances[1]
										) : inputToken !== 'USD' ? (
											balanceHelper[tradingPair]
										) : 0
									}
								</Form.Text>
								<InputGroup>
									<Form.Control
										type="number"
										placeholder="0.0"
										min="0.0"
										step="any"
										id="token1"
										onChange={(e) => amountHandler(e)}
										value={token1Amount === 0 ? "" : token1Amount}
									/>

									<DropdownButton
										variant="outline-secondary"
										title={inputToken ? inputToken : "Select Token"}
									>
										{outputToken !== 'USD' ? "" : <Dropdown.Item onClick={(e) => {setInputToken(e.target.innerHTML); setTradingPair(e.target.innerHTML)}}>LSE</Dropdown.Item>}
										{outputToken !== 'USD' ? <Dropdown.Item onClick={(e) => {setInputToken(e.target.innerHTML)}}>USD</Dropdown.Item> : ""}
										{outputToken !== 'USD' ? "" : <Dropdown.Item onClick={(e) => {setInputToken(e.target.innerHTML); setTradingPair(e.target.innerHTML)}}>mETH</Dropdown.Item>}
										{outputToken !== 'USD' ? "" : <Dropdown.Item onClick={(e) => {setInputToken(e.target.innerHTML); setTradingPair(e.target.innerHTML)}}>mBTC</Dropdown.Item>}
									</DropdownButton>
								</InputGroup>
							</Row>

							<Row className='my-3'>
									<Form.Text className='text-end my-2' muted>
										Balance: {balances[1]}
									</Form.Text>
								<InputGroup>
									<Form.Control
										type="number"
										placeholder="0.0"
										step="any"
										id="token2"
										onChange={(e) => amountHandler(e)}
										value={token2Amount === 0 ? "" : token2Amount}
									/>

									<DropdownButton
										variant="outline-secondary"
										title={outputToken ? outputToken : "Select Token"}
									>
										{inputToken === 'USD' ? <Dropdown.Item onClick={(e) => {setOutputToken(e.target.innerHTML); setTradingPair(e.target.innerHTML)}}>LSE</Dropdown.Item> : ""}
										{inputToken !=='USD' ? <Dropdown.Item onClick={(e) => {setOutputToken(e.target.innerHTML)}}>USD</Dropdown.Item> : ""}
										{inputToken ==='USD' ? <Dropdown.Item onClick={(e) => {setOutputToken(e.target.innerHTML); setTradingPair(e.target.innerHTML)}}>mETH</Dropdown.Item> : ""}
										{inputToken ==='USD' ? <Dropdown.Item onClick={(e) => {setOutputToken(e.target.innerHTML); setTradingPair(e.target.innerHTML)}}>mBTC</Dropdown.Item> : ""}
									</DropdownButton>

								</InputGroup>
							</Row>

							<Row className='my-3'>
								{isDepositing ? (
									<Spinner animation="border" style={{ display: 'block', margin: '0 auto' }} />
								) : (
									<Button type='submit'>Deposit</Button>
								)}
							</Row>

						</Form>
					) : (
						<p
							className='d-flex justify-content-center align-items-center'
							style={{ height: '300px' }}
						>
							Please connect your wallet.
						</p>
					)}
			</Card>

			{isDepositing ? (
				<Alert 
					message={'Depositing...'}
					transactionHash={null}
					variant={'info'}
					setShowAlert={setShowAlert}
				/>
			) : isSuccess && showAlert ? (
				<Alert 
					message={'Deposit Successful'}
					transactionHash={transactionHash}
					variant={'success'}
					setShowAlert={setShowAlert}
				/>
			) : !isSuccess && showAlert ? (
				<Alert 
					message={'Deposit Failed'}
					transactionHash={null}
					variant={'danger'}
					setShowAlert={setShowAlert}
				/>
			) : (
				<></>
			)}

		</div>
	);
}

export default Deposit;
