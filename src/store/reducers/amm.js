import { createSlice } from '@reduxjs/toolkit'

export const amm = createSlice({
	name: 'amm',
	initialState: {
		contract: [null, null, null],
		shares: [0, 0, 0],
//		lseusdshares: 0,
//		methusdshares: 0,
//		mbtcusdshares: 0,
		swaps: []
	},
	reducers: {
		setContract: (state, action) => {
			state.contract = action.payload
		},
		sharesLoaded: (state, action) => {
			state.shares = action.payload
//			state.lseusdshares = action.payload
//			state.methusdshares = action.payload
//			state.mbtcusdshares = action.payload
		}
	}
})

export const { setContract, sharesLoaded } = amm.actions;

export default amm.reducer;
