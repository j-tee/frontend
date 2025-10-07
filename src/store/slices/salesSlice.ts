import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../index.js'
import type { Sale } from '../../types/sales.js'
import type { UUID } from '../../types/common.js'
import * as salesService from '../../services/salesService'

// Types
interface SalesFilters {
  storefront?: UUID
  status?: string
  type?: 'RETAIL' | 'WHOLESALE'
  customer?: UUID
  user?: UUID
  date_from?: string
  date_to?: string
  payment_type?: string
  search?: string
}

interface PaginationInfo {
  count: number
  page: number
  pageSize: number
  totalPages: number
}

interface SalesState {
  // Current cart
  currentCart: Sale | null
  cartLoading: boolean
  cartError: string | null
  
  // Sales list
  sales: Sale[]
  salesStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  salesError: string | null
  salesPagination: PaginationInfo
  salesFilters: SalesFilters
  
  // Sale detail
  saleDetail: Sale | null
  saleDetailStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  
  // Mutations
  mutations: {
    createSale: 'idle' | 'loading' | 'succeeded' | 'failed'
    addItem: 'idle' | 'loading' | 'succeeded' | 'failed'
    updateItem: 'idle' | 'loading' | 'succeeded' | 'failed'
    removeItem: 'idle' | 'loading' | 'succeeded' | 'failed'
    checkout: 'idle' | 'loading' | 'succeeded' | 'failed'
    cancel: 'idle' | 'loading' | 'succeeded' | 'failed'
  }
  
  // Errors
  errors: {
    createSale: string | null
    addItem: string | null
    updateItem: string | null
    removeItem: string | null
    checkout: string | null
    cancel: string | null
  }
}

// Initial state
const initialState: SalesState = {
  currentCart: null,
  cartLoading: false,
  cartError: null,
  
  sales: [],
  salesStatus: 'idle',
  salesError: null,
  salesPagination: {
    count: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  },
  salesFilters: {
    status: 'COMPLETED' // Default to COMPLETED sales only (hide DRAFT empty carts)
  },
  
  saleDetail: null,
  saleDetailStatus: 'idle',
  
  mutations: {
    createSale: 'idle',
    addItem: 'idle',
    updateItem: 'idle',
    removeItem: 'idle',
    checkout: 'idle',
    cancel: 'idle',
  },
  
  errors: {
    createSale: null,
    addItem: null,
    updateItem: null,
    removeItem: null,
    checkout: null,
    cancel: null,
  },
}

// Async thunks

// Create sale (start cart)
export const createSale = createAsyncThunk(
  'sales/createSale',
  async (payload: { storefront: UUID; type: 'RETAIL' | 'WHOLESALE'; customer?: UUID; notes?: string }) => {
    const response = await salesService.createSale(payload)
    return response
  }
)

// Add item to cart
export const addItemToCart = createAsyncThunk(
  'sales/addItem',
  async (payload: { 
    saleId: UUID
    product: UUID
    stockProduct: UUID
    quantity: number
    unitPrice?: number
    discountPercentage?: number
    notes?: string
  }) => {
    const { saleId, stockProduct, unitPrice, discountPercentage, ...rest } = payload
    // Convert camelCase to snake_case for backend
    const itemData = {
      ...rest,
      stock_product: stockProduct,
      unit_price: unitPrice,
      discount_percentage: discountPercentage,
    }
    const response = await salesService.addItem(saleId, itemData)
    return response
  }
)

// Update cart item
export const updateCartItem = createAsyncThunk(
  'sales/updateItem',
  async (payload: {
    saleId: UUID
    itemId: UUID
    quantity?: number
    discountPercentage?: number
    notes?: string
  }) => {
    const { saleId, itemId, ...updates } = payload
    const response = await salesService.updateItem(saleId, itemId, updates)
    return response
  }
)

// Remove cart item
export const removeCartItem = createAsyncThunk(
  'sales/removeItem',
  async (payload: { saleId: UUID; itemId: UUID }) => {
    const { saleId, itemId } = payload
    await salesService.removeItem(saleId, itemId)
    return itemId
  }
)

// Complete sale (checkout)
export const completeSale = createAsyncThunk(
  'sales/checkout',
  async (payload: {
    saleId: UUID
    paymentType: string
    payments: Array<{
      paymentMethod: string
      amountPaid: number
      transactionReference?: string
    }>
    discountAmount?: number
    notes?: string
  }) => {
    const { saleId, paymentType, payments, discountAmount, notes } = payload
    // Convert camelCase to snake_case for backend
    const checkoutData = {
      payment_type: paymentType,
      payments: payments.map(p => ({
        payment_method: p.paymentMethod,
        amount_paid: p.amountPaid,
        transaction_reference: p.transactionReference,
      })),
      discount_amount: discountAmount,
      notes,
    }
    const response = await salesService.completeSale(saleId, checkoutData)
    return response
  }
)

// Cancel sale
export const cancelSale = createAsyncThunk(
  'sales/cancel',
  async (payload: { saleId: UUID; reason: string }) => {
    const { saleId, reason } = payload
    const response = await salesService.cancelSale(saleId, reason)
    return response
  }
)

// Get sale detail
export const loadSaleDetail = createAsyncThunk(
  'sales/loadDetail',
  async (saleId: UUID) => {
    const response = await salesService.getSale(saleId)
    return response
  }
)

// List sales
export const loadSales = createAsyncThunk(
  'sales/loadList',
  async (params: Record<string, unknown> | undefined, { getState }) => {
    const state = getState() as RootState
    const { salesPagination, salesFilters } = state.sales
    
    const queryParams = {
      page: salesPagination.page,
      page_size: salesPagination.pageSize,
      ...salesFilters,
      ...params,
    }
    
    const response = await salesService.listSales(queryParams)
    return response
  }
)

// Slice
const salesSlice = createSlice({
  name: 'sales',
  initialState,
  reducers: {
    // Clear current cart
    clearCart: (state) => {
      state.currentCart = null
      state.cartError = null
    },
    
    // Clear sale detail
    clearSaleDetail: (state) => {
      state.saleDetail = null
      state.saleDetailStatus = 'idle'
    },
    
    // Set filters
    setSalesFilters: (state, action: PayloadAction<Partial<SalesFilters>>) => {
      const mergedFilters = { ...state.salesFilters, ...action.payload }

      if (mergedFilters.payment_type === 'MOMO') {
        mergedFilters.payment_type = 'MOBILE'
      }

      const cleanedFilters = {} as SalesFilters
      const cleanedFiltersRecord = cleanedFilters as Record<keyof SalesFilters, unknown>

      ;(Object.keys(mergedFilters) as Array<keyof SalesFilters>).forEach((key) => {
        const value = mergedFilters[key]

        if (value === undefined || value === null) {
          return
        }

        if (typeof value === 'string') {
          const normalized = value.trim()
          if (normalized === '') {
            return
          }
          cleanedFiltersRecord[key] = normalized
          return
        }

        cleanedFiltersRecord[key] = value
      })

      state.salesFilters = cleanedFilters
    },
    
    // Reset filters
    resetSalesFilters: (state) => {
      state.salesFilters = {}
    },
    
    // Set page
    setSalesPage: (state, action: PayloadAction<number>) => {
      state.salesPagination.page = action.payload
    },
    
    // Set page size
    setSalesPageSize: (state, action: PayloadAction<number>) => {
      state.salesPagination.pageSize = action.payload
      state.salesPagination.page = 1
    },
    
    // Clear mutation errors
    clearMutationError: (state, action: PayloadAction<keyof SalesState['errors']>) => {
      state.errors[action.payload] = null
      state.mutations[action.payload] = 'idle'
    },
  },
  extraReducers: (builder) => {
    // Create sale
    builder
      .addCase(createSale.pending, (state) => {
        state.mutations.createSale = 'loading'
        state.errors.createSale = null
      })
      .addCase(createSale.fulfilled, (state, action) => {
        state.mutations.createSale = 'succeeded'
        state.currentCart = action.payload
        state.cartError = null
      })
      .addCase(createSale.rejected, (state, action) => {
        state.mutations.createSale = 'failed'
        state.errors.createSale = action.error.message || 'Failed to create sale'
      })
    
    // Add item
    builder
      .addCase(addItemToCart.pending, (state) => {
        state.mutations.addItem = 'loading'
        state.errors.addItem = null
      })
      .addCase(addItemToCart.fulfilled, (state, action) => {
        state.mutations.addItem = 'succeeded'
        if (state.currentCart) {
          // Add or update line item
          const existingIndex = state.currentCart.line_items?.findIndex(
            item => item.id === action.payload.id
          )
          if (existingIndex !== undefined && existingIndex >= 0 && state.currentCart.line_items) {
            state.currentCart.line_items[existingIndex] = action.payload
          } else {
            state.currentCart.line_items = [...(state.currentCart.line_items || []), action.payload]
          }
          
          // Update totals (will come from backend)
          // These are just placeholders - actual values from API
          state.currentCart.updated_at = new Date().toISOString()
        }
      })
      .addCase(addItemToCart.rejected, (state, action) => {
        state.mutations.addItem = 'failed'
        state.errors.addItem = action.error.message || 'Failed to add item'
      })
    
    // Update item
    builder
      .addCase(updateCartItem.pending, (state) => {
        state.mutations.updateItem = 'loading'
        state.errors.updateItem = null
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.mutations.updateItem = 'succeeded'
        if (state.currentCart?.line_items) {
          const index = state.currentCart.line_items.findIndex(
            item => item.id === action.payload.id
          )
          if (index >= 0) {
            state.currentCart.line_items[index] = action.payload
            state.currentCart.updated_at = new Date().toISOString()
          }
        }
      })
      .addCase(updateCartItem.rejected, (state, action) => {
        state.mutations.updateItem = 'failed'
        state.errors.updateItem = action.error.message || 'Failed to update item'
      })
    
    // Remove item
    builder
      .addCase(removeCartItem.pending, (state) => {
        state.mutations.removeItem = 'loading'
        state.errors.removeItem = null
      })
      .addCase(removeCartItem.fulfilled, (state, action) => {
        state.mutations.removeItem = 'succeeded'
        if (state.currentCart?.line_items) {
          state.currentCart.line_items = state.currentCart.line_items.filter(
            item => item.id !== action.payload
          )
          state.currentCart.updated_at = new Date().toISOString()
        }
      })
      .addCase(removeCartItem.rejected, (state, action) => {
        state.mutations.removeItem = 'failed'
        state.errors.removeItem = action.error.message || 'Failed to remove item'
      })
    
    // Complete sale
    builder
      .addCase(completeSale.pending, (state) => {
        state.mutations.checkout = 'loading'
        state.errors.checkout = null
      })
      .addCase(completeSale.fulfilled, (state, action) => {
        state.mutations.checkout = 'succeeded'
        state.currentCart = action.payload
      })
      .addCase(completeSale.rejected, (state, action) => {
        state.mutations.checkout = 'failed'
        state.errors.checkout = action.error.message || 'Failed to complete sale'
      })
    
    // Cancel sale
    builder
      .addCase(cancelSale.pending, (state) => {
        state.mutations.cancel = 'loading'
        state.errors.cancel = null
      })
      .addCase(cancelSale.fulfilled, (state, action) => {
        state.mutations.cancel = 'succeeded'
        state.currentCart = action.payload
      })
      .addCase(cancelSale.rejected, (state, action) => {
        state.mutations.cancel = 'failed'
        state.errors.cancel = action.error.message || 'Failed to cancel sale'
      })
    
    // Load sale detail
    builder
      .addCase(loadSaleDetail.pending, (state) => {
        state.saleDetailStatus = 'loading'
      })
      .addCase(loadSaleDetail.fulfilled, (state, action) => {
        state.saleDetailStatus = 'succeeded'
        state.saleDetail = action.payload
      })
      .addCase(loadSaleDetail.rejected, (state, action) => {
        state.saleDetailStatus = 'failed'
        state.salesError = action.error.message || 'Failed to load sale'
      })
    
    // Load sales list
    builder
      .addCase(loadSales.pending, (state) => {
        state.salesStatus = 'loading'
      })
      .addCase(loadSales.fulfilled, (state, action) => {
        state.salesStatus = 'succeeded'
        state.sales = action.payload.results
        state.salesPagination = {
          count: action.payload.count,
          page: state.salesPagination.page,
          pageSize: state.salesPagination.pageSize,
          totalPages: Math.ceil(action.payload.count / state.salesPagination.pageSize),
        }
      })
      .addCase(loadSales.rejected, (state, action) => {
        state.salesStatus = 'failed'
        state.salesError = action.error.message || 'Failed to load sales'
      })
  },
})

// Actions
export const {
  clearCart,
  clearSaleDetail,
  setSalesFilters,
  resetSalesFilters,
  setSalesPage,
  setSalesPageSize,
  clearMutationError,
} = salesSlice.actions

// Selectors
export const selectCurrentCart = (state: RootState) => state.sales.currentCart
export const selectCartLoading = (state: RootState) => state.sales.cartLoading
export const selectCartError = (state: RootState) => state.sales.cartError

export const selectSales = (state: RootState) => state.sales.sales
export const selectSalesStatus = (state: RootState) => state.sales.salesStatus
export const selectSalesError = (state: RootState) => state.sales.salesError
export const selectSalesPagination = (state: RootState) => state.sales.salesPagination
export const selectSalesFilters = (state: RootState) => state.sales.salesFilters

export const selectSaleDetail = (state: RootState) => state.sales.saleDetail
export const selectSaleDetailStatus = (state: RootState) => state.sales.saleDetailStatus

export const selectMutations = (state: RootState) => state.sales.mutations
export const selectErrors = (state: RootState) => state.sales.errors

// Reducer
export default salesSlice.reducer
