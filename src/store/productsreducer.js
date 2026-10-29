import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axios from 'axios'

export const PRODUCTS_API_URL = import.meta.env.VITE_PRODUCTS_API_URL
  || 'https://uatproductqr.sysdevpghc.net/api/products'

export const PRODUCT_ASSET_ORIGIN = new URL(PRODUCTS_API_URL).origin

export const fetchproducts = createAsyncThunk(
  'products/fetchproducts',
  async (categoryId, { rejectWithValue }) => {
    try {
      const response = await axios.get(PRODUCTS_API_URL, {
        params: {
          category_id: categoryId,
        },
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      return response.data
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message
          || error.message
          || 'Products could not be loaded. Please try again.',
      )
    }
  },
  {
    condition: (_, { getState }) => {
      const { status } = getState().products
      return status !== 'loading' && status !== 'succeeded'
    },
  },
)

const initialState = {
  products: [],
  pagination: null,
  status: 'idle',
  loading: false,
  error: '',
}

export const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchproducts.pending, (state) => {
        state.status = 'loading'
        state.loading = true
        state.error = ''
      })
      .addCase(fetchproducts.fulfilled, (state, action) => {
        const page = action.payload?.data

        state.products = Array.isArray(page?.data) ? page.data : []
        state.pagination = page
          ? {
              currentPage: page.current_page,
              lastPage: page.last_page,
              perPage: page.per_page,
              total: page.total,
            }
          : null
        state.status = 'succeeded'
        state.loading = false
        state.error = ''
      })
      .addCase(fetchproducts.rejected, (state, action) => {
        if (action.meta.condition) return

        state.status = 'failed'
        state.loading = false
        state.error = action.payload || action.error.message || 'Products could not be loaded.'
      })
  },
})

export default productsSlice.reducer
