import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { toUserFacingError } from '../../utils/errorMessage'
import {
  fetchStockAdjustments,
  fetchStockAdjustmentDetail,
  createStockAdjustment,
  updateStockAdjustment,
  deleteStockAdjustment,
  approveStockAdjustment,
  rejectStockAdjustment,
  completeStockAdjustment,
  fetchPendingAdjustments,
  fetchAdjustmentSummary,
  fetchShrinkageReport,
  bulkApproveAdjustments,
  fetchStockCounts,
  fetchStockCountDetail,
  createStockCount,
  updateStockCount,
  deleteStockCount,
  completeStockCount,
  createAdjustmentsFromCount,
  fetchCountDiscrepancies,
  fetchStockCountItems,
  createStockCountItem,
  updateStockCountItem,
  deleteStockCountItem,
  createAdjustmentFromCountItem,
  uploadAdjustmentPhoto,
  uploadAdjustmentDocument,
  deleteAdjustmentPhoto,
  deleteAdjustmentDocument,
} from '../../services/stockAdjustmentService.js'
import type {
  StockAdjustment,
  StockAdjustmentCreatePayload,
  StockAdjustmentUpdatePayload,
  StockAdjustmentPhotoPayload,
  StockAdjustmentDocumentPayload,
  StockCount,
  StockCountCreatePayload,
  StockCountItem,
  StockCountItemCreatePayload,
  BulkApprovePayload,
  BulkApproveResponse,
  AdjustmentSummary,
  ShrinkageReport,
  CreateAdjustmentsResponse,
  StockAdjustmentPhoto,
  StockAdjustmentDocument,
} from '../../types/stockAdjustments.js'
import type { PaginatedResponse } from '../../types/common.js'
import type { RootState } from '../index.js'

const extractErrorMessage = (error: unknown, fallback = "We couldn't complete that request. Please try again."): string =>
  toUserFacingError(error, { fallback })

type AsyncStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

interface StockAdjustmentState {
  adjustments: StockAdjustment[]
  adjustmentsStatus: AsyncStatus
  adjustmentsError: string | null
  adjustmentsPagination: {
    count: number
    next: string | null
    previous: string | null
  }
  adjustmentsPage: number
  adjustmentsPageSize: number
  selectedAdjustment: StockAdjustment | null
  selectedAdjustmentStatus: AsyncStatus
  selectedAdjustmentError: string | null
  createAdjustmentStatus: AsyncStatus
  createAdjustmentError: string | null
  updateAdjustmentStatus: AsyncStatus
  updateAdjustmentError: string | null
  deleteAdjustmentStatus: AsyncStatus
  deleteAdjustmentError: string | null
  approveAdjustmentStatus: AsyncStatus
  approveAdjustmentError: string | null
  rejectAdjustmentStatus: AsyncStatus
  rejectAdjustmentError: string | null
  completeAdjustmentStatus: AsyncStatus
  completeAdjustmentError: string | null
  pendingAdjustments: StockAdjustment[]
  pendingAdjustmentsStatus: AsyncStatus
  pendingAdjustmentsError: string | null
  adjustmentSummary: AdjustmentSummary | null
  adjustmentSummaryStatus: AsyncStatus
  adjustmentSummaryError: string | null
  shrinkageReport: ShrinkageReport | null
  shrinkageReportStatus: AsyncStatus
  shrinkageReportError: string | null
  bulkApproveStatus: AsyncStatus
  bulkApproveError: string | null
  bulkApproveResult: BulkApproveResponse | null
  counts: StockCount[]
  countsStatus: AsyncStatus
  countsError: string | null
  countsPagination: {
    count: number
    next: string | null
    previous: string | null
  }
  countsPage: number
  countsPageSize: number
  selectedCount: StockCount | null
  selectedCountStatus: AsyncStatus
  selectedCountError: string | null
  createCountStatus: AsyncStatus
  createCountError: string | null
  updateCountStatus: AsyncStatus
  updateCountError: string | null
  deleteCountStatus: AsyncStatus
  deleteCountError: string | null
  completeCountStatus: AsyncStatus
  completeCountError: string | null
  createAdjustmentsStatus: AsyncStatus
  createAdjustmentsError: string | null
  createAdjustmentsResult: CreateAdjustmentsResponse | null
  countItems: StockCountItem[]
  countItemsStatus: AsyncStatus
  countItemsError: string | null
  createCountItemStatus: AsyncStatus
  createCountItemError: string | null
  updateCountItemStatus: AsyncStatus
  updateCountItemError: string | null
  deleteCountItemStatus: AsyncStatus
  deleteCountItemError: string | null
  uploadPhotoStatus: AsyncStatus
  uploadPhotoError: string | null
  uploadDocumentStatus: AsyncStatus
  uploadDocumentError: string | null
}

const initialState: StockAdjustmentState = {
  adjustments: [],
  adjustmentsStatus: 'idle',
  adjustmentsError: null,
  adjustmentsPagination: {
    count: 0,
    next: null,
    previous: null,
  },
  adjustmentsPage: 1,
  adjustmentsPageSize: 25,
  selectedAdjustment: null,
  selectedAdjustmentStatus: 'idle',
  selectedAdjustmentError: null,
  createAdjustmentStatus: 'idle',
  createAdjustmentError: null,
  updateAdjustmentStatus: 'idle',
  updateAdjustmentError: null,
  deleteAdjustmentStatus: 'idle',
  deleteAdjustmentError: null,
  approveAdjustmentStatus: 'idle',
  approveAdjustmentError: null,
  rejectAdjustmentStatus: 'idle',
  rejectAdjustmentError: null,
  completeAdjustmentStatus: 'idle',
  completeAdjustmentError: null,
  pendingAdjustments: [],
  pendingAdjustmentsStatus: 'idle',
  pendingAdjustmentsError: null,
  adjustmentSummary: null,
  adjustmentSummaryStatus: 'idle',
  adjustmentSummaryError: null,
  shrinkageReport: null,
  shrinkageReportStatus: 'idle',
  shrinkageReportError: null,
  bulkApproveStatus: 'idle',
  bulkApproveError: null,
  bulkApproveResult: null,
  counts: [],
  countsStatus: 'idle',
  countsError: null,
  countsPagination: {
    count: 0,
    next: null,
    previous: null,
  },
  countsPage: 1,
  countsPageSize: 25,
  selectedCount: null,
  selectedCountStatus: 'idle',
  selectedCountError: null,
  createCountStatus: 'idle',
  createCountError: null,
  updateCountStatus: 'idle',
  updateCountError: null,
  deleteCountStatus: 'idle',
  deleteCountError: null,
  completeCountStatus: 'idle',
  completeCountError: null,
  createAdjustmentsStatus: 'idle',
  createAdjustmentsError: null,
  createAdjustmentsResult: null,
  countItems: [],
  countItemsStatus: 'idle',
  countItemsError: null,
  createCountItemStatus: 'idle',
  createCountItemError: null,
  updateCountItemStatus: 'idle',
  updateCountItemError: null,
  deleteCountItemStatus: 'idle',
  deleteCountItemError: null,
  uploadPhotoStatus: 'idle',
  uploadPhotoError: null,
  uploadDocumentStatus: 'idle',
  uploadDocumentError: null,
}

// Async Thunks - Adjustments

export const loadStockAdjustments = createAsyncThunk<
  PaginatedResponse<StockAdjustment>,
  Record<string, unknown> | undefined
>('stockAdjustment/loadStockAdjustments', async (params, thunkAPI) => {
  try {
    return await fetchStockAdjustments(params)
  } catch (error) {
    return thunkAPI.rejectWithValue(extractErrorMessage(error))
  }
})

export const loadStockAdjustmentDetail = createAsyncThunk<StockAdjustment, string>(
  'stockAdjustment/loadStockAdjustmentDetail',
  async (id, thunkAPI) => {
    try {
      return await fetchStockAdjustmentDetail(id)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const addStockAdjustment = createAsyncThunk<
  StockAdjustment,
  StockAdjustmentCreatePayload
>('stockAdjustment/addStockAdjustment', async (payload, thunkAPI) => {
  try {
    return await createStockAdjustment(payload)
  } catch (error) {
    return thunkAPI.rejectWithValue(extractErrorMessage(error))
  }
})

export const editStockAdjustment = createAsyncThunk<
  StockAdjustment,
  { id: string; payload: StockAdjustmentUpdatePayload }
>('stockAdjustment/editStockAdjustment', async ({ id, payload }, thunkAPI) => {
  try {
    return await updateStockAdjustment(id, payload)
  } catch (error) {
    return thunkAPI.rejectWithValue(extractErrorMessage(error))
  }
})

export const removeStockAdjustment = createAsyncThunk<{ id: string }, { id: string }>(
  'stockAdjustment/removeStockAdjustment',
  async ({ id }, thunkAPI) => {
    try {
      await deleteStockAdjustment(id)
      return { id }
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const approveAdjustment = createAsyncThunk<StockAdjustment, string>(
  'stockAdjustment/approveAdjustment',
  async (id, thunkAPI) => {
    try {
      return await approveStockAdjustment(id)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const rejectAdjustment = createAsyncThunk<StockAdjustment, string>(
  'stockAdjustment/rejectAdjustment',
  async (id, thunkAPI) => {
    try {
      return await rejectStockAdjustment(id)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const completeAdjustment = createAsyncThunk<StockAdjustment, string>(
  'stockAdjustment/completeAdjustment',
  async (id, thunkAPI) => {
    try {
      return await completeStockAdjustment(id)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const loadPendingAdjustments = createAsyncThunk<StockAdjustment[]>(
  'stockAdjustment/loadPendingAdjustments',
  async (_, thunkAPI) => {
    try {
      return await fetchPendingAdjustments()
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const loadAdjustmentSummary = createAsyncThunk<
  AdjustmentSummary,
  Record<string, unknown> | undefined
>('stockAdjustment/loadAdjustmentSummary', async (params, thunkAPI) => {
  try {
    return await fetchAdjustmentSummary(params)
  } catch (error) {
    return thunkAPI.rejectWithValue(extractErrorMessage(error))
  }
})

export const loadShrinkageReport = createAsyncThunk<
  ShrinkageReport,
  Record<string, unknown> | undefined
>('stockAdjustment/loadShrinkageReport', async (params, thunkAPI) => {
  try {
    return await fetchShrinkageReport(params)
  } catch (error) {
    return thunkAPI.rejectWithValue(extractErrorMessage(error))
  }
})

export const performBulkApprove = createAsyncThunk<BulkApproveResponse, BulkApprovePayload>(
  'stockAdjustment/performBulkApprove',
  async (payload, thunkAPI) => {
    try {
      return await bulkApproveAdjustments(payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

// Async Thunks - Stock Counts

export const loadStockCounts = createAsyncThunk<
  PaginatedResponse<StockCount>,
  Record<string, unknown> | undefined
>('stockAdjustment/loadStockCounts', async (params, thunkAPI) => {
  try {
    return await fetchStockCounts(params)
  } catch (error) {
    return thunkAPI.rejectWithValue(extractErrorMessage(error))
  }
})

export const loadStockCountDetail = createAsyncThunk<StockCount, string>(
  'stockAdjustment/loadStockCountDetail',
  async (id, thunkAPI) => {
    try {
      return await fetchStockCountDetail(id)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const addStockCount = createAsyncThunk<StockCount, StockCountCreatePayload>(
  'stockAdjustment/addStockCount',
  async (payload, thunkAPI) => {
    try {
      return await createStockCount(payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const editStockCount = createAsyncThunk<
  StockCount,
  { id: string; payload: Partial<StockCountCreatePayload> }
>('stockAdjustment/editStockCount', async ({ id, payload }, thunkAPI) => {
  try {
    return await updateStockCount(id, payload)
  } catch (error) {
    return thunkAPI.rejectWithValue(extractErrorMessage(error))
  }
})

export const removeStockCount = createAsyncThunk<{ id: string }, { id: string }>(
  'stockAdjustment/removeStockCount',
  async ({ id }, thunkAPI) => {
    try {
      await deleteStockCount(id)
      return { id }
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const performCompleteCount = createAsyncThunk<StockCount, string>(
  'stockAdjustment/performCompleteCount',
  async (id, thunkAPI) => {
    try {
      return await completeStockCount(id)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const performCreateAdjustments = createAsyncThunk<CreateAdjustmentsResponse, string>(
  'stockAdjustment/performCreateAdjustments',
  async (id, thunkAPI) => {
    try {
      return await createAdjustmentsFromCount(id)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const loadCountDiscrepancies = createAsyncThunk<StockCountItem[], string>(
  'stockAdjustment/loadCountDiscrepancies',
  async (id, thunkAPI) => {
    try {
      return await fetchCountDiscrepancies(id)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

// Async Thunks - Count Items

export const loadStockCountItems = createAsyncThunk<
  PaginatedResponse<StockCountItem>,
  Record<string, unknown> | undefined
>('stockAdjustment/loadStockCountItems', async (params, thunkAPI) => {
  try {
    return await fetchStockCountItems(params)
  } catch (error) {
    return thunkAPI.rejectWithValue(extractErrorMessage(error))
  }
})

export const addStockCountItem = createAsyncThunk<StockCountItem, StockCountItemCreatePayload>(
  'stockAdjustment/addStockCountItem',
  async (payload, thunkAPI) => {
    try {
      return await createStockCountItem(payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const editStockCountItem = createAsyncThunk<
  StockCountItem,
  { id: string; payload: Partial<StockCountItemCreatePayload> }
>('stockAdjustment/editStockCountItem', async ({ id, payload }, thunkAPI) => {
  try {
    return await updateStockCountItem(id, payload)
  } catch (error) {
    return thunkAPI.rejectWithValue(extractErrorMessage(error))
  }
})

export const removeStockCountItem = createAsyncThunk<{ id: string }, { id: string }>(
  'stockAdjustment/removeStockCountItem',
  async ({ id }, thunkAPI) => {
    try {
      await deleteStockCountItem(id)
      return { id }
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const createAdjustmentFromItem = createAsyncThunk<StockAdjustment, string>(
  'stockAdjustment/createAdjustmentFromItem',
  async (id, thunkAPI) => {
    try {
      return await createAdjustmentFromCountItem(id)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

// Async Thunks - Photos & Documents

export const addAdjustmentPhoto = createAsyncThunk<
  StockAdjustmentPhoto,
  StockAdjustmentPhotoPayload
>('stockAdjustment/addAdjustmentPhoto', async (payload, thunkAPI) => {
  try {
    return await uploadAdjustmentPhoto(payload)
  } catch (error) {
    return thunkAPI.rejectWithValue(extractErrorMessage(error))
  }
})

export const addAdjustmentDocument = createAsyncThunk<
  StockAdjustmentDocument,
  StockAdjustmentDocumentPayload
>('stockAdjustment/addAdjustmentDocument', async (payload, thunkAPI) => {
  try {
    return await uploadAdjustmentDocument(payload)
  } catch (error) {
    return thunkAPI.rejectWithValue(extractErrorMessage(error))
  }
})

export const removeAdjustmentPhoto = createAsyncThunk<{ id: string }, { id: string }>(
  'stockAdjustment/removeAdjustmentPhoto',
  async ({ id }, thunkAPI) => {
    try {
      await deleteAdjustmentPhoto(id)
      return { id }
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const removeAdjustmentDocument = createAsyncThunk<{ id: string }, { id: string }>(
  'stockAdjustment/removeAdjustmentDocument',
  async ({ id }, thunkAPI) => {
    try {
      await deleteAdjustmentDocument(id)
      return { id }
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

const stockAdjustmentSlice = createSlice({
  name: 'stockAdjustment',
  initialState,
  reducers: {
    resetCreateAdjustmentState: (state) => {
      state.createAdjustmentStatus = 'idle'
      state.createAdjustmentError = null
    },
    resetUpdateAdjustmentState: (state) => {
      state.updateAdjustmentStatus = 'idle'
      state.updateAdjustmentError = null
    },
    resetDeleteAdjustmentState: (state) => {
      state.deleteAdjustmentStatus = 'idle'
      state.deleteAdjustmentError = null
    },
    resetApproveAdjustmentState: (state) => {
      state.approveAdjustmentStatus = 'idle'
      state.approveAdjustmentError = null
    },
    resetRejectAdjustmentState: (state) => {
      state.rejectAdjustmentStatus = 'idle'
      state.rejectAdjustmentError = null
    },
    resetCompleteAdjustmentState: (state) => {
      state.completeAdjustmentStatus = 'idle'
      state.completeAdjustmentError = null
    },
    resetBulkApproveState: (state) => {
      state.bulkApproveStatus = 'idle'
      state.bulkApproveError = null
      state.bulkApproveResult = null
    },
    resetCreateCountState: (state) => {
      state.createCountStatus = 'idle'
      state.createCountError = null
    },
    resetUpdateCountState: (state) => {
      state.updateCountStatus = 'idle'
      state.updateCountError = null
    },
    resetDeleteCountState: (state) => {
      state.deleteCountStatus = 'idle'
      state.deleteCountError = null
    },
    resetCompleteCountState: (state) => {
      state.completeCountStatus = 'idle'
      state.completeCountError = null
    },
    resetCreateAdjustmentsState: (state) => {
      state.createAdjustmentsStatus = 'idle'
      state.createAdjustmentsError = null
      state.createAdjustmentsResult = null
    },
    resetCreateCountItemState: (state) => {
      state.createCountItemStatus = 'idle'
      state.createCountItemError = null
    },
    resetUpdateCountItemState: (state) => {
      state.updateCountItemStatus = 'idle'
      state.updateCountItemError = null
    },
    resetDeleteCountItemState: (state) => {
      state.deleteCountItemStatus = 'idle'
      state.deleteCountItemError = null
    },
    resetUploadPhotoState: (state) => {
      state.uploadPhotoStatus = 'idle'
      state.uploadPhotoError = null
    },
    resetUploadDocumentState: (state) => {
      state.uploadDocumentStatus = 'idle'
      state.uploadDocumentError = null
    },
    setAdjustmentsPage: (state, action: PayloadAction<number>) => {
      state.adjustmentsPage = action.payload
    },
    setCountsPage: (state, action: PayloadAction<number>) => {
      state.countsPage = action.payload
    },
    clearSelectedAdjustment: (state) => {
      state.selectedAdjustment = null
      state.selectedAdjustmentStatus = 'idle'
      state.selectedAdjustmentError = null
    },
    clearSelectedCount: (state) => {
      state.selectedCount = null
      state.selectedCountStatus = 'idle'
      state.selectedCountError = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Load Adjustments
      .addCase(loadStockAdjustments.pending, (state) => {
        state.adjustmentsStatus = 'loading'
        state.adjustmentsError = null
      })
      .addCase(loadStockAdjustments.fulfilled, (state, action) => {
        state.adjustmentsStatus = 'succeeded'
        state.adjustments = action.payload.results
        state.adjustmentsPagination = {
          count: action.payload.count,
          next: action.payload.next,
          previous: action.payload.previous,
        }
        // Debug logging
        console.log('📊 Stock Adjustments API Response:', {
          total_count: action.payload.count,
          returned_count: action.payload.results.length,
          has_next: !!action.payload.next,
          has_previous: !!action.payload.previous,
          adjustments: action.payload.results.map(adj => ({
            id: adj.id.slice(0, 8),
            type: adj.adjustment_type,
            status: adj.status,
            created: new Date(adj.created_at).toLocaleString(),
          }))
        })
      })
      .addCase(loadStockAdjustments.rejected, (state, action) => {
        state.adjustmentsStatus = 'failed'
        state.adjustmentsError = (action.payload as string) ?? 'Failed to load adjustments.'
      })
      // Load Adjustment Detail
      .addCase(loadStockAdjustmentDetail.pending, (state) => {
        state.selectedAdjustmentStatus = 'loading'
        state.selectedAdjustmentError = null
      })
      .addCase(loadStockAdjustmentDetail.fulfilled, (state, action) => {
        state.selectedAdjustmentStatus = 'succeeded'
        state.selectedAdjustment = action.payload
      })
      .addCase(loadStockAdjustmentDetail.rejected, (state, action) => {
        state.selectedAdjustmentStatus = 'failed'
        state.selectedAdjustmentError =
          (action.payload as string) ?? 'Failed to load adjustment detail.'
      })
      // Create Adjustment
      .addCase(addStockAdjustment.pending, (state) => {
        state.createAdjustmentStatus = 'loading'
        state.createAdjustmentError = null
      })
      .addCase(addStockAdjustment.fulfilled, (state, action) => {
        state.createAdjustmentStatus = 'succeeded'
        state.adjustments = [action.payload, ...state.adjustments]
        state.adjustmentsPagination.count += 1
      })
      .addCase(addStockAdjustment.rejected, (state, action) => {
        state.createAdjustmentStatus = 'failed'
        state.createAdjustmentError =
          (action.payload as string) ?? 'Failed to create adjustment.'
      })
      // Update Adjustment
      .addCase(editStockAdjustment.pending, (state) => {
        state.updateAdjustmentStatus = 'loading'
        state.updateAdjustmentError = null
      })
      .addCase(editStockAdjustment.fulfilled, (state, action) => {
        state.updateAdjustmentStatus = 'succeeded'
        const index = state.adjustments.findIndex((adj) => adj.id === action.payload.id)
        if (index >= 0) {
          state.adjustments[index] = action.payload
        }
        if (state.selectedAdjustment?.id === action.payload.id) {
          state.selectedAdjustment = action.payload
        }
      })
      .addCase(editStockAdjustment.rejected, (state, action) => {
        state.updateAdjustmentStatus = 'failed'
        state.updateAdjustmentError =
          (action.payload as string) ?? 'Failed to update adjustment.'
      })
      // Delete Adjustment
      .addCase(removeStockAdjustment.pending, (state) => {
        state.deleteAdjustmentStatus = 'loading'
        state.deleteAdjustmentError = null
      })
      .addCase(removeStockAdjustment.fulfilled, (state, action) => {
        state.deleteAdjustmentStatus = 'succeeded'
        state.adjustments = state.adjustments.filter((adj) => adj.id !== action.payload.id)
        if (state.selectedAdjustment?.id === action.payload.id) {
          state.selectedAdjustment = null
        }
        if (state.adjustmentsPagination.count > 0) {
          state.adjustmentsPagination.count -= 1
        }
      })
      .addCase(removeStockAdjustment.rejected, (state, action) => {
        state.deleteAdjustmentStatus = 'failed'
        state.deleteAdjustmentError =
          (action.payload as string) ?? 'Failed to delete adjustment.'
      })
      // Approve Adjustment
      .addCase(approveAdjustment.pending, (state) => {
        state.approveAdjustmentStatus = 'loading'
        state.approveAdjustmentError = null
      })
      .addCase(approveAdjustment.fulfilled, (state, action) => {
        state.approveAdjustmentStatus = 'succeeded'
        const index = state.adjustments.findIndex((adj) => adj.id === action.payload.id)
        if (index >= 0) {
          state.adjustments[index] = action.payload
        }
        if (state.selectedAdjustment?.id === action.payload.id) {
          state.selectedAdjustment = action.payload
        }
        state.pendingAdjustments = state.pendingAdjustments.filter(
          (adj) => adj.id !== action.payload.id,
        )
      })
      .addCase(approveAdjustment.rejected, (state, action) => {
        state.approveAdjustmentStatus = 'failed'
        state.approveAdjustmentError =
          (action.payload as string) ?? 'Failed to approve adjustment.'
      })
      // Reject Adjustment
      .addCase(rejectAdjustment.pending, (state) => {
        state.rejectAdjustmentStatus = 'loading'
        state.rejectAdjustmentError = null
      })
      .addCase(rejectAdjustment.fulfilled, (state, action) => {
        state.rejectAdjustmentStatus = 'succeeded'
        const index = state.adjustments.findIndex((adj) => adj.id === action.payload.id)
        if (index >= 0) {
          state.adjustments[index] = action.payload
        }
        if (state.selectedAdjustment?.id === action.payload.id) {
          state.selectedAdjustment = action.payload
        }
        state.pendingAdjustments = state.pendingAdjustments.filter(
          (adj) => adj.id !== action.payload.id,
        )
      })
      .addCase(rejectAdjustment.rejected, (state, action) => {
        state.rejectAdjustmentStatus = 'failed'
        state.rejectAdjustmentError =
          (action.payload as string) ?? 'Failed to reject adjustment.'
      })
      // Complete Adjustment
      .addCase(completeAdjustment.pending, (state) => {
        state.completeAdjustmentStatus = 'loading'
        state.completeAdjustmentError = null
      })
      .addCase(completeAdjustment.fulfilled, (state, action) => {
        state.completeAdjustmentStatus = 'succeeded'
        const index = state.adjustments.findIndex((adj) => adj.id === action.payload.id)
        if (index >= 0) {
          state.adjustments[index] = action.payload
        }
        if (state.selectedAdjustment?.id === action.payload.id) {
          state.selectedAdjustment = action.payload
        }
      })
      .addCase(completeAdjustment.rejected, (state, action) => {
        state.completeAdjustmentStatus = 'failed'
        state.completeAdjustmentError =
          (action.payload as string) ?? 'Failed to complete adjustment.'
      })
      // Load Pending Adjustments
      .addCase(loadPendingAdjustments.pending, (state) => {
        state.pendingAdjustmentsStatus = 'loading'
        state.pendingAdjustmentsError = null
      })
      .addCase(loadPendingAdjustments.fulfilled, (state, action) => {
        state.pendingAdjustmentsStatus = 'succeeded'
        state.pendingAdjustments = action.payload
      })
      .addCase(loadPendingAdjustments.rejected, (state, action) => {
        state.pendingAdjustmentsStatus = 'failed'
        state.pendingAdjustmentsError =
          (action.payload as string) ?? 'Failed to load pending adjustments.'
      })
      // Load Adjustment Summary
      .addCase(loadAdjustmentSummary.pending, (state) => {
        state.adjustmentSummaryStatus = 'loading'
        state.adjustmentSummaryError = null
      })
      .addCase(loadAdjustmentSummary.fulfilled, (state, action) => {
        state.adjustmentSummaryStatus = 'succeeded'
        state.adjustmentSummary = action.payload
      })
      .addCase(loadAdjustmentSummary.rejected, (state, action) => {
        state.adjustmentSummaryStatus = 'failed'
        state.adjustmentSummaryError =
          (action.payload as string) ?? 'Failed to load adjustment summary.'
      })
      // Load Shrinkage Report
      .addCase(loadShrinkageReport.pending, (state) => {
        state.shrinkageReportStatus = 'loading'
        state.shrinkageReportError = null
      })
      .addCase(loadShrinkageReport.fulfilled, (state, action) => {
        state.shrinkageReportStatus = 'succeeded'
        state.shrinkageReport = action.payload
      })
      .addCase(loadShrinkageReport.rejected, (state, action) => {
        state.shrinkageReportStatus = 'failed'
        state.shrinkageReportError =
          (action.payload as string) ?? 'Failed to load shrinkage report.'
      })
      // Bulk Approve
      .addCase(performBulkApprove.pending, (state) => {
        state.bulkApproveStatus = 'loading'
        state.bulkApproveError = null
      })
      .addCase(performBulkApprove.fulfilled, (state, action) => {
        state.bulkApproveStatus = 'succeeded'
        state.bulkApproveResult = action.payload
        // Remove approved items from pending
        state.pendingAdjustments = state.pendingAdjustments.filter(
          (adj) => !action.payload.approved.includes(adj.id),
        )
      })
      .addCase(performBulkApprove.rejected, (state, action) => {
        state.bulkApproveStatus = 'failed'
        state.bulkApproveError = (action.payload as string) ?? 'Bulk approve failed.'
      })
      // Load Counts
      .addCase(loadStockCounts.pending, (state) => {
        state.countsStatus = 'loading'
        state.countsError = null
      })
      .addCase(loadStockCounts.fulfilled, (state, action) => {
        state.countsStatus = 'succeeded'
        state.counts = action.payload.results
        state.countsPagination = {
          count: action.payload.count,
          next: action.payload.next,
          previous: action.payload.previous,
        }
      })
      .addCase(loadStockCounts.rejected, (state, action) => {
        state.countsStatus = 'failed'
        state.countsError = (action.payload as string) ?? 'Failed to load stock counts.'
      })
      // Load Count Detail
      .addCase(loadStockCountDetail.pending, (state) => {
        state.selectedCountStatus = 'loading'
        state.selectedCountError = null
      })
      .addCase(loadStockCountDetail.fulfilled, (state, action) => {
        state.selectedCountStatus = 'succeeded'
        state.selectedCount = action.payload
      })
      .addCase(loadStockCountDetail.rejected, (state, action) => {
        state.selectedCountStatus = 'failed'
        state.selectedCountError =
          (action.payload as string) ?? 'Failed to load count detail.'
      })
      // Create Count
      .addCase(addStockCount.pending, (state) => {
        state.createCountStatus = 'loading'
        state.createCountError = null
      })
      .addCase(addStockCount.fulfilled, (state, action) => {
        state.createCountStatus = 'succeeded'
        state.counts = [action.payload, ...state.counts]
        state.countsPagination.count += 1
      })
      .addCase(addStockCount.rejected, (state, action) => {
        state.createCountStatus = 'failed'
        state.createCountError = (action.payload as string) ?? 'Failed to create stock count.'
      })
      // Update Count
      .addCase(editStockCount.pending, (state) => {
        state.updateCountStatus = 'loading'
        state.updateCountError = null
      })
      .addCase(editStockCount.fulfilled, (state, action) => {
        state.updateCountStatus = 'succeeded'
        const index = state.counts.findIndex((count) => count.id === action.payload.id)
        if (index >= 0) {
          state.counts[index] = action.payload
        }
        if (state.selectedCount?.id === action.payload.id) {
          state.selectedCount = action.payload
        }
      })
      .addCase(editStockCount.rejected, (state, action) => {
        state.updateCountStatus = 'failed'
        state.updateCountError = (action.payload as string) ?? 'Failed to update stock count.'
      })
      // Delete Count
      .addCase(removeStockCount.pending, (state) => {
        state.deleteCountStatus = 'loading'
        state.deleteCountError = null
      })
      .addCase(removeStockCount.fulfilled, (state, action) => {
        state.deleteCountStatus = 'succeeded'
        state.counts = state.counts.filter((count) => count.id !== action.payload.id)
        if (state.selectedCount?.id === action.payload.id) {
          state.selectedCount = null
        }
        if (state.countsPagination.count > 0) {
          state.countsPagination.count -= 1
        }
      })
      .addCase(removeStockCount.rejected, (state, action) => {
        state.deleteCountStatus = 'failed'
        state.deleteCountError = (action.payload as string) ?? 'Failed to delete stock count.'
      })
      // Complete Count
      .addCase(performCompleteCount.pending, (state) => {
        state.completeCountStatus = 'loading'
        state.completeCountError = null
      })
      .addCase(performCompleteCount.fulfilled, (state, action) => {
        state.completeCountStatus = 'succeeded'
        const index = state.counts.findIndex((count) => count.id === action.payload.id)
        if (index >= 0) {
          state.counts[index] = action.payload
        }
        if (state.selectedCount?.id === action.payload.id) {
          state.selectedCount = action.payload
        }
      })
      .addCase(performCompleteCount.rejected, (state, action) => {
        state.completeCountStatus = 'failed'
        state.completeCountError =
          (action.payload as string) ?? 'Failed to complete stock count.'
      })
      // Create Adjustments from Count
      .addCase(performCreateAdjustments.pending, (state) => {
        state.createAdjustmentsStatus = 'loading'
        state.createAdjustmentsError = null
      })
      .addCase(performCreateAdjustments.fulfilled, (state, action) => {
        state.createAdjustmentsStatus = 'succeeded'
        state.createAdjustmentsResult = action.payload
      })
      .addCase(performCreateAdjustments.rejected, (state, action) => {
        state.createAdjustmentsStatus = 'failed'
        state.createAdjustmentsError =
          (action.payload as string) ?? 'Failed to create adjustments.'
      })
      // Load Count Items
      .addCase(loadStockCountItems.pending, (state) => {
        state.countItemsStatus = 'loading'
        state.countItemsError = null
      })
      .addCase(loadStockCountItems.fulfilled, (state, action) => {
        state.countItemsStatus = 'succeeded'
        state.countItems = action.payload.results
      })
      .addCase(loadStockCountItems.rejected, (state, action) => {
        state.countItemsStatus = 'failed'
        state.countItemsError =
          (action.payload as string) ?? 'Failed to load count items.'
      })
      // Create Count Item
      .addCase(addStockCountItem.pending, (state) => {
        state.createCountItemStatus = 'loading'
        state.createCountItemError = null
      })
      .addCase(addStockCountItem.fulfilled, (state, action) => {
        state.createCountItemStatus = 'succeeded'
        state.countItems = [action.payload, ...state.countItems]
        // Update selected count if it matches
        if (state.selectedCount && state.selectedCount.id === action.payload.stock_count) {
          state.selectedCount.items = [
            action.payload,
            ...(state.selectedCount.items || []),
          ]
          state.selectedCount.total_items += 1
          if (action.payload.has_discrepancy) {
            state.selectedCount.items_with_discrepancy += 1
          }
        }
      })
      .addCase(addStockCountItem.rejected, (state, action) => {
        state.createCountItemStatus = 'failed'
        state.createCountItemError =
          (action.payload as string) ?? 'Failed to create count item.'
      })
      // Update Count Item
      .addCase(editStockCountItem.pending, (state) => {
        state.updateCountItemStatus = 'loading'
        state.updateCountItemError = null
      })
      .addCase(editStockCountItem.fulfilled, (state, action) => {
        state.updateCountItemStatus = 'succeeded'
        const index = state.countItems.findIndex((item) => item.id === action.payload.id)
        if (index >= 0) {
          state.countItems[index] = action.payload
        }
        if (state.selectedCount?.items) {
          const itemIndex = state.selectedCount.items.findIndex(
            (item) => item.id === action.payload.id,
          )
          if (itemIndex >= 0) {
            state.selectedCount.items[itemIndex] = action.payload
          }
        }
      })
      .addCase(editStockCountItem.rejected, (state, action) => {
        state.updateCountItemStatus = 'failed'
        state.updateCountItemError =
          (action.payload as string) ?? 'Failed to update count item.'
      })
      // Delete Count Item
      .addCase(removeStockCountItem.pending, (state) => {
        state.deleteCountItemStatus = 'loading'
        state.deleteCountItemError = null
      })
      .addCase(removeStockCountItem.fulfilled, (state, action) => {
        state.deleteCountItemStatus = 'succeeded'
        state.countItems = state.countItems.filter((item) => item.id !== action.payload.id)
        if (state.selectedCount?.items) {
          state.selectedCount.items = state.selectedCount.items.filter(
            (item) => item.id !== action.payload.id,
          )
          if (state.selectedCount.total_items > 0) {
            state.selectedCount.total_items -= 1
          }
        }
      })
      .addCase(removeStockCountItem.rejected, (state, action) => {
        state.deleteCountItemStatus = 'failed'
        state.deleteCountItemError =
          (action.payload as string) ?? 'Failed to delete count item.'
      })
      // Load Discrepancies
      .addCase(loadCountDiscrepancies.pending, (state) => {
        state.countItemsStatus = 'loading'
        state.countItemsError = null
      })
      .addCase(loadCountDiscrepancies.fulfilled, (state, action) => {
        state.countItemsStatus = 'succeeded'
        state.countItems = action.payload
      })
      .addCase(loadCountDiscrepancies.rejected, (state, action) => {
        state.countItemsStatus = 'failed'
        state.countItemsError =
          (action.payload as string) ?? 'Failed to load discrepancies.'
      })
      // Upload Photo
      .addCase(addAdjustmentPhoto.pending, (state) => {
        state.uploadPhotoStatus = 'loading'
        state.uploadPhotoError = null
      })
      .addCase(addAdjustmentPhoto.fulfilled, (state, action) => {
        state.uploadPhotoStatus = 'succeeded'
        if (state.selectedAdjustment?.id === action.payload.adjustment) {
          state.selectedAdjustment.photos = [
            ...(state.selectedAdjustment.photos || []),
            action.payload,
          ]
          state.selectedAdjustment.has_photos = true
        }
      })
      .addCase(addAdjustmentPhoto.rejected, (state, action) => {
        state.uploadPhotoStatus = 'failed'
        state.uploadPhotoError = (action.payload as string) ?? 'Failed to upload photo.'
      })
      // Upload Document
      .addCase(addAdjustmentDocument.pending, (state) => {
        state.uploadDocumentStatus = 'loading'
        state.uploadDocumentError = null
      })
      .addCase(addAdjustmentDocument.fulfilled, (state, action) => {
        state.uploadDocumentStatus = 'succeeded'
        if (state.selectedAdjustment?.id === action.payload.adjustment) {
          state.selectedAdjustment.documents = [
            ...(state.selectedAdjustment.documents || []),
            action.payload,
          ]
          state.selectedAdjustment.has_documents = true
        }
      })
      .addCase(addAdjustmentDocument.rejected, (state, action) => {
        state.uploadDocumentStatus = 'failed'
        state.uploadDocumentError = (action.payload as string) ?? 'Failed to upload document.'
      })
  },
})

export const {
  resetCreateAdjustmentState,
  resetUpdateAdjustmentState,
  resetDeleteAdjustmentState,
  resetApproveAdjustmentState,
  resetRejectAdjustmentState,
  resetCompleteAdjustmentState,
  resetBulkApproveState,
  resetCreateCountState,
  resetUpdateCountState,
  resetDeleteCountState,
  resetCompleteCountState,
  resetCreateAdjustmentsState,
  resetCreateCountItemState,
  resetUpdateCountItemState,
  resetDeleteCountItemState,
  resetUploadPhotoState,
  resetUploadDocumentState,
  setAdjustmentsPage,
  setCountsPage,
  clearSelectedAdjustment,
  clearSelectedCount,
} = stockAdjustmentSlice.actions

// Selectors
export const selectStockAdjustments = (state: RootState) => state.stockAdjustment.adjustments
export const selectAdjustmentsStatus = (state: RootState) => state.stockAdjustment.adjustmentsStatus
export const selectAdjustmentsError = (state: RootState) => state.stockAdjustment.adjustmentsError
export const selectAdjustmentsPagination = (state: RootState) =>
  state.stockAdjustment.adjustmentsPagination
export const selectAdjustmentsPage = (state: RootState) => state.stockAdjustment.adjustmentsPage
export const selectSelectedAdjustment = (state: RootState) =>
  state.stockAdjustment.selectedAdjustment
export const selectSelectedAdjustmentStatus = (state: RootState) =>
  state.stockAdjustment.selectedAdjustmentStatus
export const selectPendingAdjustments = (state: RootState) =>
  state.stockAdjustment.pendingAdjustments
export const selectPendingAdjustmentsStatus = (state: RootState) =>
  state.stockAdjustment.pendingAdjustmentsStatus
export const selectAdjustmentSummary = (state: RootState) =>
  state.stockAdjustment.adjustmentSummary
export const selectAdjustmentSummaryStatus = (state: RootState) =>
  state.stockAdjustment.adjustmentSummaryStatus
export const selectShrinkageReport = (state: RootState) => state.stockAdjustment.shrinkageReport
export const selectShrinkageReportStatus = (state: RootState) =>
  state.stockAdjustment.shrinkageReportStatus
export const selectStockCounts = (state: RootState) => state.stockAdjustment.counts
export const selectCountsStatus = (state: RootState) => state.stockAdjustment.countsStatus
export const selectCountsPagination = (state: RootState) => state.stockAdjustment.countsPagination
export const selectSelectedCount = (state: RootState) => state.stockAdjustment.selectedCount
export const selectSelectedCountStatus = (state: RootState) =>
  state.stockAdjustment.selectedCountStatus
export const selectCountItems = (state: RootState) => state.stockAdjustment.countItems
export const selectCountItemsStatus = (state: RootState) => state.stockAdjustment.countItemsStatus
export const selectCreateAdjustmentStatus = (state: RootState) =>
  state.stockAdjustment.createAdjustmentStatus
export const selectCreateAdjustmentError = (state: RootState) =>
  state.stockAdjustment.createAdjustmentError
export const selectUpdateAdjustmentStatus = (state: RootState) =>
  state.stockAdjustment.updateAdjustmentStatus
export const selectUpdateAdjustmentError = (state: RootState) =>
  state.stockAdjustment.updateAdjustmentError
export const selectDeleteAdjustmentStatus = (state: RootState) =>
  state.stockAdjustment.deleteAdjustmentStatus
export const selectDeleteAdjustmentError = (state: RootState) =>
  state.stockAdjustment.deleteAdjustmentError
export const selectApproveAdjustmentStatus = (state: RootState) =>
  state.stockAdjustment.approveAdjustmentStatus
export const selectRejectAdjustmentStatus = (state: RootState) =>
  state.stockAdjustment.rejectAdjustmentStatus
export const selectBulkApproveResult = (state: RootState) =>
  state.stockAdjustment.bulkApproveResult
export const selectCreateCountStatus = (state: RootState) =>
  state.stockAdjustment.createCountStatus
export const selectCreateCountError = (state: RootState) => state.stockAdjustment.createCountError
export const selectCreateAdjustmentsResult = (state: RootState) =>
  state.stockAdjustment.createAdjustmentsResult
export const selectCreateCountItemStatus = (state: RootState) =>
  state.stockAdjustment.createCountItemStatus

export default stockAdjustmentSlice.reducer
