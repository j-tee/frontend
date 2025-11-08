/**
 * AI Features Redux Slice
 * Manages state for AI-powered features including credits, queries, and transactions
 */

import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { isAxiosError } from 'axios'
import { toUserFacingError } from '../../utils/errorMessage'
import * as aiService from '../../services/ai/aiService'
import type {
  AICreditsBalance,
  CreditPurchaseRequest,
  CreditPurchaseResponse,
  AIUsageStats,
  AITransaction,
  NaturalLanguageQueryRequest,
  NaturalLanguageQueryResponse,
  ProductDescriptionRequest,
  ProductDescriptionResponse,
  CollectionMessageRequest,
  CollectionMessageResponse,
  CreditRiskAssessmentRequest,
  CreditRiskAssessmentResponse,
  AIPurchaseModalState,
  AICheckoutModalState,
} from '../../types/ai'
import type { RootState } from '../index'

// ============================================
// State Interface
// ============================================

interface AIState {
  // Credits
  credits: AICreditsBalance | null
  creditsLoading: boolean
  creditsError: string | null

  // Usage Stats
  usageStats: AIUsageStats | null
  usageStatsLoading: boolean
  usageStatsError: string | null

  // Transactions
  transactions: AITransaction[]
  transactionsLoading: boolean
  transactionsError: string | null

  // Natural Language Query
  queryResult: NaturalLanguageQueryResponse | null
  queryLoading: boolean
  queryError: string | null

  // Product Description
  productDescription: ProductDescriptionResponse | null
  productDescriptionLoading: boolean
  productDescriptionError: string | null

  // Collection Message
  collectionMessage: CollectionMessageResponse | null
  collectionMessageLoading: boolean
  collectionMessageError: string | null

  // Credit Risk Assessment
  creditAssessment: CreditRiskAssessmentResponse | null
  creditAssessmentLoading: boolean
  creditAssessmentError: string | null

  // Purchase Modal
  purchaseModal: AIPurchaseModalState

  // Checkout Modal
  checkoutModal: AICheckoutModalState

  // General
  lastError: string | null
}

// ============================================
// Initial State
// ============================================

const initialState: AIState = {
  credits: null,
  creditsLoading: false,
  creditsError: null,

  usageStats: null,
  usageStatsLoading: false,
  usageStatsError: null,

  transactions: [],
  transactionsLoading: false,
  transactionsError: null,

  queryResult: null,
  queryLoading: false,
  queryError: null,

  productDescription: null,
  productDescriptionLoading: false,
  productDescriptionError: null,

  collectionMessage: null,
  collectionMessageLoading: false,
  collectionMessageError: null,

  creditAssessment: null,
  creditAssessmentLoading: false,
  creditAssessmentError: null,

  purchaseModal: {
    isOpen: false,
  },

  checkoutModal: {
    isOpen: false,
    payment: null,
  },

  lastError: null,
}

// ============================================
// Async Thunks
// ============================================

/**
 * Fetch AI credits balance
 */
export const fetchCreditsBalance = createAsyncThunk<
  AICreditsBalance,
  void,
  { rejectValue: string }
>('ai/fetchCreditsBalance', async (_, { rejectWithValue }) => {
  try {
    return await aiService.getCreditsBalance()
  } catch (error) {
    if (isAxiosError(error)) {
      return rejectWithValue(toUserFacingError(error))
    }
    return rejectWithValue('Failed to fetch credits balance')
  }
})

/**
 * Purchase AI credits
 */
export const purchaseCredits = createAsyncThunk<
  CreditPurchaseResponse,
  CreditPurchaseRequest,
  { rejectValue: string }
>('ai/purchaseCredits', async (data, { rejectWithValue }) => {
  try {
    return await aiService.purchaseCredits(data)
  } catch (error) {
    if (isAxiosError(error)) {
      return rejectWithValue(toUserFacingError(error))
    }
    return rejectWithValue('Failed to purchase credits')
  }
})

/**
 * Fetch usage statistics
 */
export const fetchUsageStats = createAsyncThunk<
  AIUsageStats,
  number | undefined,
  { rejectValue: string }
>('ai/fetchUsageStats', async (days = 30, { rejectWithValue }) => {
  try {
    return await aiService.getUsageStats(days)
  } catch (error) {
    if (isAxiosError(error)) {
      return rejectWithValue(toUserFacingError(error))
    }
    return rejectWithValue('Failed to fetch usage stats')
  }
})

/**
 * Fetch transaction history
 */
export const fetchTransactionHistory = createAsyncThunk<
  AITransaction[],
  { limit?: number; feature?: string },
  { rejectValue: string }
>('ai/fetchTransactionHistory', async ({ limit = 50, feature }, { rejectWithValue }) => {
  try {
    const response = await aiService.getTransactionHistory(limit, feature)
    return response.results
  } catch (error) {
    if (isAxiosError(error)) {
      return rejectWithValue(toUserFacingError(error))
    }
    return rejectWithValue('Failed to fetch transaction history')
  }
})

/**
 * Process natural language query
 */
export const processQuery = createAsyncThunk<
  NaturalLanguageQueryResponse,
  NaturalLanguageQueryRequest,
  { rejectValue: string }
>('ai/processQuery', async (data, { rejectWithValue, dispatch }) => {
  try {
    const result = await aiService.processNaturalLanguageQuery(data)
    // Refresh credits balance after query
    dispatch(fetchCreditsBalance())
    return result
  } catch (error) {
    if (isAxiosError(error)) {
      // Handle insufficient credits (402)
      if (error.response?.status === 402) {
        const errorData = error.response.data as {
          current_balance?: number
          required_credits?: number
        }
        dispatch(
          showPurchaseModal({
            requiredCredits: errorData.required_credits,
            currentBalance: errorData.current_balance,
          }),
        )
      }
      return rejectWithValue(toUserFacingError(error))
    }
    return rejectWithValue('Failed to process query')
  }
})

/**
 * Generate product description
 */
export const generateDescription = createAsyncThunk<
  ProductDescriptionResponse,
  ProductDescriptionRequest,
  { rejectValue: string }
>('ai/generateDescription', async (data, { rejectWithValue, dispatch }) => {
  try {
    const result = await aiService.generateProductDescription(data)
    dispatch(fetchCreditsBalance())
    return result
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response?.status === 402) {
        const errorData = error.response.data as {
          current_balance?: number
          required_credits?: number
        }
        dispatch(
          showPurchaseModal({
            requiredCredits: errorData.required_credits,
            currentBalance: errorData.current_balance,
          }),
        )
      }
      return rejectWithValue(toUserFacingError(error))
    }
    return rejectWithValue('Failed to generate description')
  }
})

/**
 * Generate collection message
 */
export const generateMessage = createAsyncThunk<
  CollectionMessageResponse,
  CollectionMessageRequest,
  { rejectValue: string }
>('ai/generateMessage', async (data, { rejectWithValue, dispatch }) => {
  try {
    const result = await aiService.generateCollectionMessage(data)
    dispatch(fetchCreditsBalance())
    return result
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response?.status === 402) {
        const errorData = error.response.data as {
          current_balance?: number
          required_credits?: number
        }
        dispatch(
          showPurchaseModal({
            requiredCredits: errorData.required_credits,
            currentBalance: errorData.current_balance,
          }),
        )
      }
      return rejectWithValue(toUserFacingError(error))
    }
    return rejectWithValue('Failed to generate message')
  }
})

/**
 * Assess credit risk
 */
export const assessRisk = createAsyncThunk<
  CreditRiskAssessmentResponse,
  CreditRiskAssessmentRequest,
  { rejectValue: string }
>('ai/assessRisk', async (data, { rejectWithValue, dispatch }) => {
  try {
    const result = await aiService.assessCreditRisk(data)
    dispatch(fetchCreditsBalance())
    return result
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response?.status === 402) {
        const errorData = error.response.data as {
          current_balance?: number
          required_credits?: number
        }
        dispatch(
          showPurchaseModal({
            requiredCredits: errorData.required_credits,
            currentBalance: errorData.current_balance,
          }),
        )
      }
      return rejectWithValue(toUserFacingError(error))
    }
    return rejectWithValue('Failed to assess risk')
  }
})

// ============================================
// Slice
// ============================================

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    // Purchase Modal Actions
    showPurchaseModal: (
      state,
      action: PayloadAction<Omit<AIPurchaseModalState, 'isOpen'>>,
    ) => {
      state.purchaseModal = {
        isOpen: true,
        ...action.payload,
      }
    },
    hidePurchaseModal: (state) => {
      state.purchaseModal = {
        isOpen: false,
      }
    },
    showCheckoutModal: (
      state,
      action: PayloadAction<Omit<AICheckoutModalState, 'isOpen'>>,
    ) => {
      state.checkoutModal = {
        isOpen: true,
        ...action.payload,
      }
    },
    hideCheckoutModal: (state) => {
      state.checkoutModal = {
        isOpen: false,
        payment: null,
      }
    },

    // Clear Results
    clearQueryResult: (state) => {
      state.queryResult = null
      state.queryError = null
    },
    clearProductDescription: (state) => {
      state.productDescription = null
      state.productDescriptionError = null
    },
    clearCollectionMessage: (state) => {
      state.collectionMessage = null
      state.collectionMessageError = null
    },
    clearCreditAssessment: (state) => {
      state.creditAssessment = null
      state.creditAssessmentError = null
    },

    // Clear All Errors
    clearAllErrors: (state) => {
      state.creditsError = null
      state.usageStatsError = null
      state.transactionsError = null
      state.queryError = null
      state.productDescriptionError = null
      state.collectionMessageError = null
      state.creditAssessmentError = null
      state.lastError = null
    },
  },
  extraReducers: (builder) => {
    // Fetch Credits Balance
    builder
      .addCase(fetchCreditsBalance.pending, (state) => {
        state.creditsLoading = true
        state.creditsError = null
      })
      .addCase(fetchCreditsBalance.fulfilled, (state, action) => {
        state.creditsLoading = false
        state.credits = action.payload
      })
      .addCase(fetchCreditsBalance.rejected, (state, action) => {
        state.creditsLoading = false
        state.creditsError = action.payload ?? 'Failed to fetch credits'
        state.lastError = action.payload ?? null
      })

    // Purchase Credits
    builder
      .addCase(purchaseCredits.pending, (state) => {
        state.creditsLoading = true
        state.creditsError = null
        state.checkoutModal = {
          isOpen: false,
          payment: null,
        }
      })
      .addCase(purchaseCredits.fulfilled, (state, action) => {
        state.creditsLoading = false
        // Close purchase modal and present invoice checkout modal
        state.purchaseModal = {
          isOpen: false,
        }
        state.checkoutModal = {
          isOpen: true,
          payment: action.payload,
        }
      })
      .addCase(purchaseCredits.rejected, (state, action) => {
        state.creditsLoading = false
        state.creditsError = action.payload ?? 'Failed to purchase credits'
        state.lastError = action.payload ?? null
      })

    // Fetch Usage Stats
    builder
      .addCase(fetchUsageStats.pending, (state) => {
        state.usageStatsLoading = true
        state.usageStatsError = null
      })
      .addCase(fetchUsageStats.fulfilled, (state, action) => {
        state.usageStatsLoading = false
        state.usageStats = action.payload
      })
      .addCase(fetchUsageStats.rejected, (state, action) => {
        state.usageStatsLoading = false
        state.usageStatsError = action.payload ?? 'Failed to fetch usage stats'
        state.lastError = action.payload ?? null
      })

    // Fetch Transaction History
    builder
      .addCase(fetchTransactionHistory.pending, (state) => {
        state.transactionsLoading = true
        state.transactionsError = null
      })
      .addCase(fetchTransactionHistory.fulfilled, (state, action) => {
        state.transactionsLoading = false
        state.transactions = action.payload
      })
      .addCase(fetchTransactionHistory.rejected, (state, action) => {
        state.transactionsLoading = false
        state.transactionsError = action.payload ?? 'Failed to fetch transactions'
        state.lastError = action.payload ?? null
      })

    // Process Query
    builder
      .addCase(processQuery.pending, (state) => {
        state.queryLoading = true
        state.queryError = null
      })
      .addCase(processQuery.fulfilled, (state, action) => {
        state.queryLoading = false
        state.queryResult = action.payload
      })
      .addCase(processQuery.rejected, (state, action) => {
        state.queryLoading = false
        state.queryError = action.payload ?? 'Failed to process query'
        state.lastError = action.payload ?? null
      })

    // Generate Description
    builder
      .addCase(generateDescription.pending, (state) => {
        state.productDescriptionLoading = true
        state.productDescriptionError = null
      })
      .addCase(generateDescription.fulfilled, (state, action) => {
        state.productDescriptionLoading = false
        state.productDescription = action.payload
      })
      .addCase(generateDescription.rejected, (state, action) => {
        state.productDescriptionLoading = false
        state.productDescriptionError = action.payload ?? 'Failed to generate description'
        state.lastError = action.payload ?? null
      })

    // Generate Message
    builder
      .addCase(generateMessage.pending, (state) => {
        state.collectionMessageLoading = true
        state.collectionMessageError = null
      })
      .addCase(generateMessage.fulfilled, (state, action) => {
        state.collectionMessageLoading = false
        state.collectionMessage = action.payload
      })
      .addCase(generateMessage.rejected, (state, action) => {
        state.collectionMessageLoading = false
        state.collectionMessageError = action.payload ?? 'Failed to generate message'
        state.lastError = action.payload ?? null
      })

    // Assess Risk
    builder
      .addCase(assessRisk.pending, (state) => {
        state.creditAssessmentLoading = true
        state.creditAssessmentError = null
      })
      .addCase(assessRisk.fulfilled, (state, action) => {
        state.creditAssessmentLoading = false
        state.creditAssessment = action.payload
      })
      .addCase(assessRisk.rejected, (state, action) => {
        state.creditAssessmentLoading = false
        state.creditAssessmentError = action.payload ?? 'Failed to assess risk'
        state.lastError = action.payload ?? null
      })
  },
})

// ============================================
// Actions & Selectors
// ============================================

export const {
  showPurchaseModal,
  hidePurchaseModal,
  showCheckoutModal,
  hideCheckoutModal,
  clearQueryResult,
  clearProductDescription,
  clearCollectionMessage,
  clearCreditAssessment,
  clearAllErrors,
} = aiSlice.actions

// Selectors
export const selectAICredits = (state: RootState) => state.ai.credits
export const selectAICreditsLoading = (state: RootState) => state.ai.creditsLoading
export const selectAIUsageStats = (state: RootState) => state.ai.usageStats
export const selectAITransactions = (state: RootState) => state.ai.transactions
export const selectQueryResult = (state: RootState) => state.ai.queryResult
export const selectQueryLoading = (state: RootState) => state.ai.queryLoading
export const selectQueryError = (state: RootState) => state.ai.queryError
export const selectPurchaseModal = (state: RootState) => state.ai.purchaseModal
export const selectCheckoutModal = (state: RootState) => state.ai.checkoutModal
export const selectCollectionMessage = (state: RootState) => state.ai.collectionMessage
export const selectCreditAssessment = (state: RootState) => state.ai.creditAssessment

export default aiSlice.reducer
