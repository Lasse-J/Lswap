import { useState, useEffect } from 'react';
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
import { swap, loadBalances } from '../store/interactions';

const Swap = () => {
	const [inputToken, setInputToken] = useState('LSE')
	const [outputToken, setOutputToken] = useState('USD')
	const [tradingPair, setTradingPair] = useState('LSE')
	const [inputAmount, setInputAmount] = useState(0)
	const [outputAmount, setOutputAmount] = useState(0)
	const [price, setPrice] = useState(0)
	const [showAlert, setShowAlert] = useState(false)

	const dispatch = useDispatch()
	const provider = useSelector(state => state.provider.connection)
	const account = useSelector(state => state.provider.account)
	const tokens = useSelector(state => state.tokens.contracts)
//	const symbols = useSelector(state => state.tokens.symbols)
	const balances = useSelector(state => state.tokens.balances)
	const isSwapping = useSelector(state => state.amm.swapping.isSwapping)
	const isSuccess = useSelector(state => state.amm.swapping.isSuccess)
	const transactionHash = useSelector(state => state.amm.swapping.transactionHash)
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

	const pairHandler = async () => {
		console.log({ tradingPair })
		amm = AMMContracts[tradingPair];
	}

	const inputHandler = async (e) => {
		if (!inputToken || !outputToken) {
			window.alert('Please select token')
			return
		}

		if (inputToken === outputToken) {
			window.alert('Invalid token pair')
			return
		}

		if (inputToken !== 'USD' && outputToken !== 'USD') {
			window.alert('Invalid token pair (USD required)')
			return
		}

		if (inputToken !== 'USD') {
			setInputAmount(e.target.value)
			const _token1Amount = ethers.utils.parseUnits(e.target.value, 'ether')
			const result = await amm.calculateToken1Swap(_token1Amount)
			const _token2Amount = ethers.utils.formatUnits(result.toString(), 'ether')
			setOutputAmount(_token2Amount.toString())
		} else {
			setInputAmount(e.target.value)
			const _token2Amount = ethers.utils.parseUnits(e.target.value, 'ether')
			const result = await amm.calculateToken2Swap(_token2Amount)
			const _token1Amount = ethers.utils.formatUnits(result.toString(), 'ether')
			setOutputAmount(_token1Amount.toString())
		}

	}

	const switchHandler = async () => {
		console.log('Switching...');
		setInputToken(outputToken);
		setOutputToken(inputToken);
    pairHandler();                // Update AMM contract
    getPrice();                   // Recalculate price after switching
	}

	const swapHandler = async (e) => {
		e.preventDefault()

		setShowAlert(false)

		if (inputToken === outputToken) {
			window.alert('Invalid token pair')
			return
		}

		const _inputAmount = ethers.utils.parseUnits(inputAmount, 'ether')

		if (inputToken === 'USD') {
			await swap(provider, inputToken, outputToken, amm, tokensHelper['USD'], inputToken, _inputAmount, dispatch)
		} else {
			await swap(provider, inputToken, outputToken, amm, tokensHelper[tradingPair], inputToken, _inputAmount, dispatch)
		}
		console.log('Swapping...')

		await loadBalances(lseusd, methusd, mbtcusd, tokens, account, dispatch)
		await getPrice()

		setShowAlert(true)
	}

	const getPrice = async () => {
		if (inputToken === outputToken) {
			setPrice(0)
			return
		}

		if (inputToken !== 'USD') {
			setPrice(await amm.token2Balance() / await amm.token1Balance())
		} else {
			setPrice(await amm.token1Balance() / await amm.token2Balance())
		}
		console.log({ inputToken, outputToken })
	}

	useEffect(() => {
		if(inputToken && outputToken) {
			pairHandler()
			getPrice()
		}
	}, [inputToken, outputToken]);

	return (
		<div>
			<Card style={{ maxWidth: '450px' }} className='mx-auto px-4'>
				{account ? (
						<Form onSubmit={swapHandler} style={{ maxWidth: '450px', margin: '50px auto' }}>
							<Row className='my-3'>
								<div className='d-flex justify-content-between'>
									<Form.Label><strong>Input:</strong></Form.Label>
									<Form.Text muted>
										Balance: {
											inputToken === 'USD' ? (
												balances[1]
											) : inputToken !== 'USD' ? (
												balanceHelper[tradingPair]
											) : 0
										}
									</Form.Text>
								</div>
								<InputGroup>
									<Form.Control
										type="number"
										placeholder="0.0"
										min="0.0"
										step="any"
										onChange={(e) => inputHandler(e)}
										disabled={!inputToken}
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

							<Row className='my-1'>
								<div className='d-flex justify-content-center'>
									<Button type='button' onClick={(e) => switchHandler()}>Switch</Button>
								</div>
							</Row>

							<Row className='my-4'>
								<div className='d-flex justify-content-between'>
									<Form.Label><strong>Output:</strong></Form.Label>
									<Form.Text muted>
										Balance: {
											outputToken === 'USD' ? (
												balances[1]
											) : outputToken !== 'USD' ? (
												balanceHelper[tradingPair]
											) : 0
										}
									</Form.Text>
								</div>
								<InputGroup>
									<Form.Control
										type="number"
										placeholder="0.0"
										value={outputAmount === 0 ? "" : outputAmount}
										disabled
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
								{isSwapping ? (
									<Spinner animation="border" style={{ display: 'block', margin: '0 auto' }} />
								) : (
									<Button type='submit'>Swap</Button>
								)}

								<Form.Text muted>
									Exchange Rate: {price}
								</Form.Text>
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

			{isSwapping ? (
				<Alert 
					message={'Swap Pending...'}
					transactionHash={null}
					variant={'info'}
					setShowAlert={setShowAlert}
				/>
			) : isSuccess && showAlert ? (
				<Alert 
					message={'Swap Successful'}
					transactionHash={transactionHash}
					variant={'success'}
					setShowAlert={setShowAlert}
				/>
			) : !isSuccess && showAlert ? (
				<Alert 
					message={'Swap Failed'}
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

export default Swap;
