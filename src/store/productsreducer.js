import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axios from 'axios'

export const PRODUCTS_API_URL = import.meta.env.VITE_PRODUCTS_API_URL
  || 'https://uatproductqr.sysdevpghc.net/api/products'

export const PRODUCT_ASSET_ORIGIN = new URL(PRODUCTS_API_URL).origin
export const PRODUCT_ASSET_BASE_URL = import.meta.env.VITE_PRODUCT_ASSET_BASE_URL
  || '/product-assets'

export const fetchproducts = createAsyncThunk(
  'products/fetchproducts',
  async (request = {}, { rejectWithValue }) => {
    const categoryId = typeof request === 'object' ? request.categoryId : request
    const page = typeof request === 'object' ? request.page || 1 : 1

    try {
      const response = await axios.get(PRODUCTS_API_URL, {
        params: {
          category_id: categoryId,
          page,
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
    condition: (request = {}, { getState }) => {
      const categoryId = typeof request === 'object' ? request.categoryId : request
      const page = typeof request === 'object' ? request.page || 1 : 1
      const { loading, status, pagination, categoryId: cachedCategoryId } = getState().products

      if (loading) return false
      if (cachedCategoryId != null && cachedCategoryId !== categoryId) return true
      if (status === 'succeeded' && page <= (pagination?.currentPage || 0)) return false
      if (pagination?.lastPage && page > pagination.lastPage) return false
      return true
    },
  },
)

const initialState = {
  products: [],
  pagination: null,
  status: 'idle',
  loading: false,
  loadingMore: false,
  error: '',
  loadMoreError: '',
  categoryId: null,
}

export const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchproducts.pending, (state, action) => {
        const requestedPage = typeof action.meta.arg === 'object'
          ? action.meta.arg.page || 1
          : 1

        if (requestedPage === 1) state.status = 'loading'
        state.loading = true
        state.loadingMore = requestedPage > 1
        state.error = ''
        state.loadMoreError = ''
      })
      .addCase(fetchproducts.fulfilled, (state, action) => {
        const page = action.payload?.data
        const request = action.meta.arg
        const requestedCategoryId = typeof request === 'object' ? request.categoryId : request
        const requestedPage = Number(page?.current_page) || (typeof request === 'object' ? request.page || 1 : 1)
        const incomingProducts = Array.isArray(page?.data) ? page.data : []

        if (requestedPage === 1 || state.categoryId !== requestedCategoryId) {
          state.products = incomingProducts
        } else {
          const productIds = new Set(state.products.map((product) => product.id))
          state.products.push(...incomingProducts.filter((product) => !productIds.has(product.id)))
        }
        state.pagination = page
          ? {
              currentPage: Number(page.current_page) || requestedPage,
              lastPage: Number(page.last_page) || requestedPage,
              perPage: Number(page.per_page) || incomingProducts.length,
              total: Number(page.total) || state.products.length,
            }
          : null
        state.categoryId = requestedCategoryId
        state.status = 'succeeded'
        state.loading = false
        state.loadingMore = false
        state.error = ''
        state.loadMoreError = ''
      })
      .addCase(fetchproducts.rejected, (state, action) => {
        if (action.meta.condition) return

        const requestedPage = typeof action.meta.arg === 'object' ? action.meta.arg.page || 1 : 1
        const message = action.payload || action.error.message || 'Products could not be loaded.'

        if (requestedPage === 1 && state.products.length === 0) {
          state.status = 'failed'
          state.error = message
        } else {
          state.status = 'succeeded'
          state.loadMoreError = message
        }
        state.loading = false
        state.loadingMore = false
      })
  },
})

export default productsSlice.reducer
