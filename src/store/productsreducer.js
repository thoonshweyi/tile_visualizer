import { createSlice,createAsyncThunk } from '@reduxjs/toolkit'
import axios from "axios";

export const fetchproducts = createAsyncThunk('products/fetchproducts',async(obj,{rejectWithValue,fulfillWithValue})=>{
	console.log(obj); // {id: 1}
	// console.group(thunkAPI.getState())

	try{
		const res = await axios.get(
      'https://uatproductqr.sysdevpghc.net/api/products',
      {
          headers: {
              'Accept': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
          }
      }
  );
		// return res.data;

		return fulfillWithValue(res.data);
	}catch(err){
		return rejectWithValue("Something went wrong, try again!");
	}
})


export const productsSlice = createSlice({
  name: 'products',
  initialState: {
		products: [],
        loading: false
  },
  reducers: {

    // getproducts: (state)=>{
    //   axios.get(`https://jsonplaceholder.typicode.com/products`)
    //   .then(response=>{
    //     console.log(response.data);
    //     state.products = response.data
    //   }).catch(err=>{
    //     console.log(err);
    //   })
    // }
  },
  extraReducers: (builder) => {
    builder.addCase(fetchproducts.pending, (state) => {
      
		  console.log('Pending')
      state.loading = true;
    })
	.addCase(fetchproducts.fulfilled, (state,action) => {
      
		console.log('Fulfilled');
    state.loading = false;

		console.log(action.payload)
		state.products = action.payload;
    })
	.addCase(fetchproducts.rejected, (state) => {
      
		console.log('Rejected');
    })
  },
})
// Action creators are generated for each case reducer function
// export const { setrole,getproducts } = productsSlice.actions // before thunk
export const { setrole } = productsSlice.actions // after thunk

export default productsSlice.reducer
