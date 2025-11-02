import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { isAxiosError, type AxiosError } from 'axios'
import type { RootState } from '../index.js'
import type { Sale } from '../../types/sales.js'
import type { UUID } from '../../types/common.js'
import * as salesService from '../../services/salesService'
import { ensureUserFacingError, toUserFacingError } from '../../utils/errorMessage'

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
    abandon: 'idle' | 'loading' | 'succeeded' | 'failed'
  }
  
  // Errors
  errors: {
    createSale: string | null
    addItem: string | null
    updateItem: string | null
    removeItem: string | null
    checkout: string | null
    abandon: string | null
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
  abandon: 'idle',
  },
  
  errors: {
    createSale: null,
    addItem: null,
    updateItem: null,
    removeItem: null,
  checkout: null,
  abandon: null,
  },
}

const DEFAULT_CHECKOUT_ERROR = 'Unable to complete sale. Please review the details and try again.'
const DEFAULT_ADD_ITEM_ERROR = 'We couldn’t add that product to the sale. Please try again.'
const DEFAULT_ABANDON_ERROR = 'Could not discard the sale right now. Please try again.'

const resolveErrorMessage = (source: unknown, fallback: string): string =>
  ensureUserFacingError(source, fallback)

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
export const addItemToCart = createAsyncThunk<
  Awaited<ReturnType<typeof salesService.addItem>>,
  {
    saleId: UUID
    product: UUID
    stockProduct: UUID
    quantity: number
    unitPrice?: number
    discountPercentage?: number
    notes?: string
  },
  { rejectValue: { userMessage: string } }
>(
  'sales/addItem',
  async (payload, { rejectWithValue }) => {
    const { saleId, stockProduct, unitPrice, discountPercentage, ...rest } = payload
    const itemData = {
      ...rest,
      stock_product: stockProduct,
      unit_price: unitPrice,
      discount_percentage: discountPercentage,
    }

    try {
      const response = await salesService.addItem(saleId, itemData)
      return response
    } catch (error) {
      const friendlyMessage = toUserFacingError(error, { fallback: DEFAULT_ADD_ITEM_ERROR })

      if (isAxiosError(error)) {
        const responseData = error.response?.data as
          | {
              developer_message?: string
              error?: string
              code?: string
              details?: unknown
            }
          | undefined

        // Error occurred - extract user-friendly message if available
        if (responseData?.developer_message) {
          // Developer message available for debugging if needed
        }
      }

      return rejectWithValue({ userMessage: friendlyMessage })
    }
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
  async (
    payload: {
      saleId: UUID
      paymentType: string
      payments: Array<{
        paymentMethod: string
        amountPaid: number
        transactionReference?: string
      }>
      discountAmount?: number
      notes?: string
      customerId?: UUID | null
    },
    { rejectWithValue }
  ) => {
    const { saleId, paymentType, payments, discountAmount, notes, customerId } = payload
    // Convert camelCase to snake_case for backend
    const checkoutData = {
      payment_type: paymentType,
      payments: payments.map(p => ({
        payment_method: p.paymentMethod,
        amount_paid: p.amountPaid,
        transaction_reference: p.transactionReference,
        customer: customerId ?? null,
      })),
      discount_amount: discountAmount,
      notes,
      customer: customerId ?? null,
    }

    try {
      const response = await salesService.completeSale(saleId, checkoutData)
      return response
    } catch (error) {
      const axiosError = error as AxiosError
      const friendlyMessage = toUserFacingError(axiosError, { fallback: DEFAULT_CHECKOUT_ERROR })
      return rejectWithValue(friendlyMessage)
    }
  }
)

// Cancel sale
export const abandonSale = createAsyncThunk<
  Awaited<ReturnType<typeof salesService.abandonSale>>,
  { saleId: UUID },
  { rejectValue: string }
>(
  'sales/abandon',
  async ({ saleId }, { rejectWithValue }) => {
    try {
      const response = await salesService.abandonSale(saleId)
      return response
    } catch (error) {
      const friendlyMessage = toUserFacingError(error, { fallback: DEFAULT_ABANDON_ERROR })

      if (isAxiosError(error)) {
        const responseData = error.response?.data as
          | {
              code?: string
              error?: string
              developer_message?: string
            }
          | undefined

        // Error occurred - extract user-friendly message if available
        if (responseData?.developer_message) {
          // Developer message available for debugging if needed
        }
      }

      return rejectWithValue(friendlyMessage)
    }
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

    setCurrentCartCustomer: (state, action: PayloadAction<{ customerId: UUID | null; customerName?: string | null }>) => {
      if (!state.currentCart) {
        return
      }

      state.currentCart.customer = action.payload.customerId ?? null
      if (action.payload.customerName !== undefined) {
        state.currentCart.customer_name = action.payload.customerName
      } else if (action.payload.customerId === null) {
        state.currentCart.customer_name = null
      }
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
  state.errors.createSale = resolveErrorMessage(action.error.message, 'Failed to create sale. Please try again.')
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
        const payloadMessage =
          typeof action.payload === 'string'
            ? action.payload
            : action.payload && typeof action.payload === 'object' && 'userMessage' in action.payload
            ? (action.payload as { userMessage?: string }).userMessage
            : undefined

        state.errors.addItem = resolveErrorMessage(
          payloadMessage ?? action.error.message,
          DEFAULT_ADD_ITEM_ERROR,
        )
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
  state.errors.updateItem = resolveErrorMessage(action.error.message, 'Failed to update item. Please try again.')
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
  state.errors.removeItem = resolveErrorMessage(action.error.message, 'Failed to remove item. Please try again.')
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
        if (typeof action.payload === 'string' && action.payload) {
          state.errors.checkout = resolveErrorMessage(action.payload, DEFAULT_CHECKOUT_ERROR)
        } else {
          state.errors.checkout = resolveErrorMessage(action.error.message, DEFAULT_CHECKOUT_ERROR)
        }
      })
    
    // Abandon sale
    builder
      .addCase(abandonSale.pending, (state) => {
        state.mutations.abandon = 'loading'
        state.errors.abandon = null
      })
      .addCase(abandonSale.fulfilled, (state) => {
        state.mutations.abandon = 'succeeded'
        state.errors.abandon = null
        state.cartError = null
        state.currentCart = null
      })
      .addCase(abandonSale.rejected, (state, action) => {
        state.mutations.abandon = 'failed'
        const message =
          typeof action.payload === 'string' && action.payload
            ? action.payload
            : action.error.message
        state.errors.abandon = resolveErrorMessage(message, DEFAULT_ABANDON_ERROR)
        state.cartError = state.errors.abandon
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
  state.salesError = resolveErrorMessage(action.error.message, 'Failed to load sale details. Please try again.')
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
  state.salesError = resolveErrorMessage(action.error.message, 'Failed to load sales. Please try again later.')
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
  setCurrentCartCustomer,
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
