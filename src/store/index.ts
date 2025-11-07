import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice.js'
import subscriptionReducer from './slices/subscriptionSlice.js'
import locationReducer from './slices/locationSlice.js'
import inventoryReducer from './slices/inventorySlice.js'
import staffReducer from './slices/staffSlice.js'
import transferReducer from './slices/transferSlice.js'
import warehouseTransferReducer from './slices/warehouseTransferSlice.js'
import transferRequestReducer from './slices/transferRequestSlice.js'
import salesReducer from './slices/salesSlice.js'
import stockAdjustmentReducer from './slices/stockAdjustmentSlice.js'
import settingsReducer from './slices/settingsSlice.js'
import exportAutomationReducer from './slices/exportAutomationSlice.js'
import aiReducer from './slices/aiSlice.js'
import { setupHttpInterceptors } from '../services/httpClient.js'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    subscription: subscriptionReducer,
    locations: locationReducer,
    inventory: inventoryReducer,
    staff: staffReducer,
    transfers: transferReducer,
    warehouseTransfers: warehouseTransferReducer,
    transferRequests: transferRequestReducer,
    sales: salesReducer,
    stockAdjustment: stockAdjustmentReducer,
    settings: settingsReducer,
    exportAutomation: exportAutomationReducer,
    ai: aiReducer,
  },
})

setupHttpInterceptors(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
