import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { isAxiosError } from 'axios'
import type { RootState } from '../index.js'
import {
  createWarehouseTransferBatch,
  fetchWarehouseTransfers,
  getWarehouseTransferDetail,
  completeWarehouseTransfer,
  cancelWarehouseTransfer,
  deleteWarehouseTransfer,
} from '../../services/inventoryService.js'
import type {
  WarehouseTransfer,
  WarehouseTransferCreatePayload,
  WarehouseTransferCompletePayload,
  WarehouseTransferCancelPayload,
} from '../../types/inventory.js'
import type { PaginatedResponse, UUID } from '../../types/common.js'

type AsyncStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

type WarehouseTransferMutation = 'create' | 'complete' | 'cancel' | 'delete'

interface WarehouseTransferFilters {
  status: string | null
  source_warehouse: string | null
  destination_warehouse: string | null
  ordering: string | null
  search: string
}

interface WarehouseTransferState {
  transfers: WarehouseTransfer[]
  transfersStatus: AsyncStatus
  transfersError: string | null
  pagination: {
    count: number
    next: string | null
    previous: string | null
  }
  page: number
  pageSize: number
  filters: WarehouseTransferFilters
  detail: WarehouseTransfer | null
  detailStatus: AsyncStatus
  detailError: string | null
  mutationStatus: Record<WarehouseTransferMutation, AsyncStatus>
  mutationErrors: Record<WarehouseTransferMutation, string | null>
}

const DEFAULT_PAGE_SIZE = 25

const initialFilters: WarehouseTransferFilters = {
  status: null,
  source_warehouse: null,
  destination_warehouse: null,
  ordering: null,
  search: '',
}

const buildInitialMutationState = (): Record<WarehouseTransferMutation, AsyncStatus> => ({
  create: 'idle',
  complete: 'idle',
  cancel: 'idle',
  delete: 'idle',
})

const buildInitialMutationErrors = (): Record<WarehouseTransferMutation, string | null> => ({
  create: null,
  complete: null,
  cancel: null,
  delete: null,
})

const initialState: WarehouseTransferState = {
  transfers: [],
  transfersStatus: 'idle',
  transfersError: null,
  pagination: {
    count: 0,
    next: null,
    previous: null,
  },
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  filters: initialFilters,
  detail: null,
  detailStatus: 'idle',
  detailError: null,
  mutationStatus: buildInitialMutationState(),
  mutationErrors: buildInitialMutationErrors(),
}

const GENERIC_SERVER_ERROR = 'We ran into an unexpected problem while talking to the server. Please try again.'

const looksLikeHtml = (value: string): boolean => {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return false
  if (trimmed.startsWith('<!doctype html')) return true
  if (trimmed.startsWith('<html')) return true
  if (trimmed.includes('<body')) return true
  if (trimmed.includes('<div') && trimmed.includes('</html>')) return true
  if (trimmed.includes('traceback (most recent call last)')) return true
  return /<\/?[a-z][\s\S]*?>/.test(trimmed)
}

const sanitizeMessage = (value: string, fallback = GENERIC_SERVER_ERROR): string => {
  const trimmed = value.trim()
  if (!trimmed) return fallback
  if (looksLikeHtml(trimmed)) {
    return fallback
  }
  const singleLine = trimmed.replace(/\s+/g, ' ')
  if (/traceback/i.test(singleLine)) return fallback
  return singleLine.length > 260 ? `${singleLine.slice(0, 257)}…` : singleLine
}

const extractFirstMessage = (input: unknown, depth = 0): string | null => {
  if (depth > 4 || input == null) return null
  if (typeof input === 'string') return sanitizeMessage(input)
  if (Array.isArray(input)) {
    for (const item of input) {
      const message = extractFirstMessage(item, depth + 1)
      if (message) return message
    }
    return null
  }
  if (typeof input === 'object') {
    const record = input as Record<string, unknown>
    if (Object.prototype.hasOwnProperty.call(record, 'detail')) {
      const detailMessage = extractFirstMessage(record.detail, depth + 1)
      if (detailMessage) return detailMessage
    }
    for (const value of Object.values(record)) {
      const message = extractFirstMessage(value, depth + 1)
      if (message) return message
    }
  }
  return null
}

const extractErrorMessage = (error: unknown): string => {
  if (isAxiosError(error)) {
    const status = error.response?.status
    if (status === 401) {
      return 'Your session has expired. Please sign in again.'
    }
    if (status === 403) {
      return 'You do not have permission to perform this action.'
    }
    if (error.response?.data !== undefined) {
      const message = extractFirstMessage(error.response.data)
      if (message) return message
    }
    if (error.message) {
      return sanitizeMessage(error.message)
    }
    return GENERIC_SERVER_ERROR
  }
  if (error instanceof Error) return sanitizeMessage(error.message)
  if (typeof error === 'string') return sanitizeMessage(error)
  return GENERIC_SERVER_ERROR
}

const ensureUniqueById = <T extends { id: string }>(items: T[]): T[] => {
  const map = new Map<string, T>()
  for (const item of items) {
    map.set(item.id, item)
  }
  return Array.from(map.values())
}

const upsertWarehouseTransfer = (state: WarehouseTransferState, transfer: WarehouseTransfer) => {
  const index = state.transfers.findIndex((item) => item.id === transfer.id)
  if (index >= 0) {
    state.transfers[index] = transfer
  } else {
    state.transfers = ensureUniqueById([transfer, ...state.transfers])
  }
}

const buildListParams = (state: WarehouseTransferState) => {
  const params: Record<string, unknown> = {
    page: state.page,
    page_size: state.pageSize,
  }
  const { filters } = state
  if (filters.status) params.status = filters.status
  if (filters.source_warehouse) params.source_warehouse = filters.source_warehouse
  if (filters.destination_warehouse) params.destination_warehouse = filters.destination_warehouse
  if (filters.ordering) params.ordering = filters.ordering
  const trimmedSearch = filters.search.trim()
  if (trimmedSearch.length > 0) params.search = trimmedSearch
  return params
}

// ============================================================================
// Async Thunks
// ============================================================================

export const loadWarehouseTransfers = createAsyncThunk<
  PaginatedResponse<WarehouseTransfer>,
  void,
  { state: RootState }
>(
  'warehouseTransfers/loadWarehouseTransfers',
  async (_, thunkAPI) => {
    try {
      const state = thunkAPI.getState() as RootState
      const sliceState = state.warehouseTransfers
      const params = buildListParams(sliceState)
      return await fetchWarehouseTransfers(params)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const loadWarehouseTransferDetail = createAsyncThunk<
  WarehouseTransfer,
  UUID
>(
  'warehouseTransfers/loadWarehouseTransferDetail',
  async (transferId, thunkAPI) => {
    try {
      return await getWarehouseTransferDetail(transferId)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const createWarehouseTransfer = createAsyncThunk<
  WarehouseTransfer,
  WarehouseTransferCreatePayload
>(
  'warehouseTransfers/createWarehouseTransfer',
  async (payload, thunkAPI) => {
    try {
      return await createWarehouseTransferBatch(payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const completeWarehouseTransferThunk = createAsyncThunk<
  WarehouseTransfer,
  { transferId: UUID; payload?: WarehouseTransferCompletePayload }
>(
  'warehouseTransfers/completeWarehouseTransfer',
  async ({ transferId, payload }, thunkAPI) => {
    try {
      return await completeWarehouseTransfer(transferId, payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const cancelWarehouseTransferThunk = createAsyncThunk<
  WarehouseTransfer,
  { transferId: UUID; payload: WarehouseTransferCancelPayload }
>(
  'warehouseTransfers/cancelWarehouseTransfer',
  async ({ transferId, payload }, thunkAPI) => {
    try {
      return await cancelWarehouseTransfer(transferId, payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const deleteWarehouseTransferThunk = createAsyncThunk<
  UUID,
  { transferId: UUID; reason?: string }
>(
  'warehouseTransfers/deleteWarehouseTransfer',
  async ({ transferId }, thunkAPI) => {
    try {
      await deleteWarehouseTransfer(transferId)
      return transferId
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

// ============================================================================
// Slice
// ============================================================================

const warehouseTransferSlice = createSlice({
  name: 'warehouseTransfers',
  initialState,
  reducers: {
    setWarehouseTransferFilters: (state, action: PayloadAction<Partial<WarehouseTransferFilters>>) => {
      state.filters = {
        ...state.filters,
        ...action.payload,
      }
    },
    resetWarehouseTransferFilters: (state) => {
      state.filters = { ...initialFilters }
    },
    setWarehouseTransferPage: (state, action: PayloadAction<number>) => {
      const nextPage = Number(action.payload)
      state.page = Number.isNaN(nextPage) || nextPage < 1 ? 1 : nextPage
    },
    setWarehouseTransferPageSize: (state, action: PayloadAction<number>) => {
      const nextSize = Number(action.payload)
      state.pageSize = Number.isNaN(nextSize) || nextSize < 1 ? DEFAULT_PAGE_SIZE : nextSize
      if (state.page < 1) {
        state.page = 1
      }
    },
    clearWarehouseTransferDetail: (state) => {
      state.detail = null
      state.detailStatus = 'idle'
      state.detailError = null
    },
    clearWarehouseTransferMutation: (state, action: PayloadAction<WarehouseTransferMutation>) => {
      const key = action.payload
      state.mutationStatus[key] = 'idle'
      state.mutationErrors[key] = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Load list
      .addCase(loadWarehouseTransfers.pending, (state) => {
        state.transfersStatus = 'loading'
        state.transfersError = null
      })
      .addCase(loadWarehouseTransfers.fulfilled, (state, action) => {
        state.transfersStatus = 'succeeded'
        const payload = action.payload ?? ({} as PaginatedResponse<WarehouseTransfer>)
        state.transfers = payload.results ?? []
        state.pagination = {
          count: payload.count ?? 0,
          next: payload.next ?? null,
          previous: payload.previous ?? null,
        }
        const effectivePageSize = state.pageSize > 0 ? state.pageSize : DEFAULT_PAGE_SIZE
        const totalPages = payload.count && payload.count > 0
          ? Math.max(1, Math.ceil(payload.count / effectivePageSize))
          : 1
        if (state.page > totalPages) {
          state.page = totalPages
        }
      })
      .addCase(loadWarehouseTransfers.rejected, (state, action) => {
        state.transfersStatus = 'failed'
        state.transfersError = (action.payload as string) ?? 'Failed to load warehouse transfers.'
      })

      // Load detail
      .addCase(loadWarehouseTransferDetail.pending, (state) => {
        state.detailStatus = 'loading'
        state.detailError = null
      })
      .addCase(loadWarehouseTransferDetail.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded'
        state.detail = action.payload
        upsertWarehouseTransfer(state, action.payload)
      })
      .addCase(loadWarehouseTransferDetail.rejected, (state, action) => {
        state.detailStatus = 'failed'
        state.detailError = (action.payload as string) ?? 'Failed to load warehouse transfer details.'
      })

      // Create
      .addCase(createWarehouseTransfer.pending, (state) => {
        state.mutationStatus.create = 'loading'
        state.mutationErrors.create = null
      })
      .addCase(createWarehouseTransfer.fulfilled, (state, action) => {
        state.mutationStatus.create = 'succeeded'
        state.detail = action.payload
        state.detailStatus = 'succeeded'
        state.pagination.count += 1
        state.transfers = ensureUniqueById([action.payload, ...state.transfers])
      })
      .addCase(createWarehouseTransfer.rejected, (state, action) => {
        state.mutationStatus.create = 'failed'
        state.mutationErrors.create = (action.payload as string) ?? 'Failed to create warehouse transfer.'
      })

      // Complete
      .addCase(completeWarehouseTransferThunk.pending, (state) => {
        state.mutationStatus.complete = 'loading'
        state.mutationErrors.complete = null
      })
      .addCase(completeWarehouseTransferThunk.fulfilled, (state, action) => {
        state.mutationStatus.complete = 'succeeded'
        state.detail = action.payload
        state.detailStatus = 'succeeded'
        upsertWarehouseTransfer(state, action.payload)
      })
      .addCase(completeWarehouseTransferThunk.rejected, (state, action) => {
        state.mutationStatus.complete = 'failed'
        state.mutationErrors.complete = (action.payload as string) ?? 'Failed to complete warehouse transfer.'
      })

      // Cancel
      .addCase(cancelWarehouseTransferThunk.pending, (state) => {
        state.mutationStatus.cancel = 'loading'
        state.mutationErrors.cancel = null
      })
      .addCase(cancelWarehouseTransferThunk.fulfilled, (state, action) => {
        state.mutationStatus.cancel = 'succeeded'
        state.detail = action.payload
        state.detailStatus = 'succeeded'
        upsertWarehouseTransfer(state, action.payload)
      })
      .addCase(cancelWarehouseTransferThunk.rejected, (state, action) => {
        state.mutationStatus.cancel = 'failed'
        state.mutationErrors.cancel = (action.payload as string) ?? 'Failed to cancel warehouse transfer.'
      })

      // Delete
      .addCase(deleteWarehouseTransferThunk.pending, (state) => {
        state.mutationStatus.delete = 'loading'
        state.mutationErrors.delete = null
      })
      .addCase(deleteWarehouseTransferThunk.fulfilled, (state, action) => {
        state.mutationStatus.delete = 'succeeded'
        const deletedId = action.payload
        // Remove from list
        state.transfers = state.transfers.filter((t) => t.id !== deletedId)
        // Clear detail if it was the deleted transfer
        if (state.detail?.id === deletedId) {
          state.detail = null
          state.detailStatus = 'idle'
        }
        // Update pagination count
        if (state.pagination.count > 0) {
          state.pagination.count -= 1
        }
      })
      .addCase(deleteWarehouseTransferThunk.rejected, (state, action) => {
        state.mutationStatus.delete = 'failed'
        state.mutationErrors.delete = (action.payload as string) ?? 'Failed to delete warehouse transfer.'
      })
  },
})

// ============================================================================
// Exports
// ============================================================================

export const {
  setWarehouseTransferFilters,
  resetWarehouseTransferFilters,
  setWarehouseTransferPage,
  setWarehouseTransferPageSize,
  clearWarehouseTransferDetail,
  clearWarehouseTransferMutation,
} = warehouseTransferSlice.actions

export const selectWarehouseTransfersState = (state: RootState) => state.warehouseTransfers
export const selectWarehouseTransfers = (state: RootState) => state.warehouseTransfers.transfers
export const selectWarehouseTransfersStatus = (state: RootState) => state.warehouseTransfers.transfersStatus
export const selectWarehouseTransfersError = (state: RootState) => state.warehouseTransfers.transfersError
export const selectWarehouseTransfersPagination = (state: RootState) => state.warehouseTransfers.pagination
export const selectWarehouseTransfersPage = (state: RootState) => state.warehouseTransfers.page
export const selectWarehouseTransfersPageSize = (state: RootState) => state.warehouseTransfers.pageSize
export const selectWarehouseTransferFilters = (state: RootState) => state.warehouseTransfers.filters
export const selectWarehouseTransferDetail = (state: RootState) => state.warehouseTransfers.detail
export const selectWarehouseTransferDetailStatus = (state: RootState) => state.warehouseTransfers.detailStatus
export const selectWarehouseTransferDetailError = (state: RootState) => state.warehouseTransfers.detailError
export const selectWarehouseTransferMutationStatus = (state: RootState) => state.warehouseTransfers.mutationStatus
export const selectWarehouseTransferMutationErrors = (state: RootState) => state.warehouseTransfers.mutationErrors

export default warehouseTransferSlice.reducer
