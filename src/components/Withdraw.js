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

import { removeLiquidity, loadBalances } from '../store/interactions'

const Withdraw = () => {
	const [inputToken, setInputToken] = useState('LSE')
	const [outputToken, setOutputToken] = useState('USD')
	const [tradingPair, setTradingPair] = useState('LSE')
	const [amount, setAmount] = useState(0)
	const [showAlert, setShowAlert] = useState(false)

	const dispatch = useDispatch()
	const provider = useSelector(state => state.provider.connection)
	const account = useSelector(state => state.provider.account)
	const tokens = useSelector(state => state.tokens.contracts)
	const balances = useSelector(state => state.tokens.balances)
	const isWithdrawing = useSelector(state => state.amm.withdrawing.isWithdrawing)
	const isSuccess = useSelector(state => state.amm.withdrawing.isSuccess)
	const transactionHash = useSelector(state => state.amm.withdrawing.transactionHash)
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

	const sharesHelper = {
		'LSE': useSelector(state => state.amm.shares[0]),
		'mETH': useSelector(state => state.amm.shares[1]),
		'mBTC': useSelector(state => state.amm.shares[2])
	};

	const balanceHelper = {
		'LSE': useSelector(state => state.tokens.balances[0]),
		'mETH': useSelector(state => state.tokens.balances[2]),
		'mBTC': useSelector(state => state.tokens.balances[3])
	};

	const withdrawHandler = async (e) => {
		e.preventDefault()
		setShowAlert(false)
		console.log('Withdrawing', tradingPair + ' and USD:', amount)

		const _amount = ethers.utils.parseUnits(amount.toString(), 'ether')

		await removeLiquidity(provider, amm, _amount, dispatch)

		await loadBalances(lseusd, methusd, mbtcusd, tokens, account, dispatch)
		setShowAlert(true)
		setAmount(0)
	}

	return (
		<div>
			<Card style={{ maxWidth: '450px' }} className='mx-auto px-4'>
				{account ? (
						<Form onSubmit={withdrawHandler} style={{ maxWidth: '450px', margin: '50px auto' }}>
							<Row>
								<Form.Text className='text-end my-2' muted>
									Shares: {sharesHelper[tradingPair]}
								</Form.Text>
								<InputGroup>
									<Form.Control
										type="number"
										placeholder="0"
										min="0.0"
										step="any"
										id="shares"
										value={amount === 0 ? "" : amount}
										onChange={(e) => setAmount(e.target.value)}
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
								{isWithdrawing ? (
									<Spinner animation="border" style={{ display: 'block', margin: '0 auto' }} />
								) : (
									<Button type='submit'>Withdraw</Button>
								)}
							</Row>

							<hr />

							<Row>
								<p><strong>{tradingPair} Balance:</strong> {balanceHelper[tradingPair]}</p>
								<p><strong>USD Balance:</strong> {balances[1]}</p>
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

			{isWithdrawing ? (
				<Alert 
					message={'Withdrawing...'}
					transactionHash={null}
					variant={'info'}
					setShowAlert={setShowAlert}
				/>
			) : isSuccess && showAlert ? (
				<Alert 
					message={'Withdraw Successful'}
					transactionHash={transactionHash}
					variant={'success'}
					setShowAlert={setShowAlert}
				/>
			) : !isSuccess && showAlert ? (
				<Alert 
					message={'Withdraw Failed'}
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

export default Withdraw;
