import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice.js'
import subscriptionReducer from './slices/subscriptionSlice.js'
import locationReducer from './slices/locationSlice.js'
import inventoryReducer from './slices/inventorySlice.js'
import { setupHttpInterceptors } from '../services/httpClient.js'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    subscription: subscriptionReducer,
    locations: locationReducer,
    inventory: inventoryReducer,
  },
})

setupHttpInterceptors(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
