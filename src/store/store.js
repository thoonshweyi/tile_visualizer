import { configureStore } from '@reduxjs/toolkit'
import productsreducter from './productsreducer'


export default configureStore({
  reducer: {
    products: productsreducter,
  }
})