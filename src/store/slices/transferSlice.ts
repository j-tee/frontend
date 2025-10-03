import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { isAxiosError } from 'axios'
import type { RootState } from '../index.js'
import {
  approveTransfer as approveTransferApi,
  cancelTransfer as cancelTransferApi,
  completeTransfer as completeTransferApi,
  createTransfer as createTransferApi,
  fetchTransferDetail,
  fetchTransfers,
  markTransferInTransit as markTransferInTransitApi,
  rejectTransfer as rejectTransferApi,
  submitTransfer as submitTransferApi,
  updateTransfer as updateTransferApi,
} from '../../services/inventoryService.js'
import type {
  Transfer,
  TransferApprovePayload,
  TransferCreatePayload,
  TransferFulfillmentPayload,
  TransferRejectPayload,
  TransferUpdatePayload,
} from '../../types/inventory.js'
import type { PaginatedResponse } from '../../types/common.js'

type AsyncStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

type TransferMutation =
  | 'create'
  | 'update'
  | 'submit'
  | 'approve'
  | 'reject'
  | 'markInTransit'
  | 'complete'
  | 'cancel'

interface TransferFilters {
  status: string | null
  warehouse: string | null
  storefront: string | null
  ordering: string | null
  search: string
}

interface TransferState {
  transfers: Transfer[]
  transfersStatus: AsyncStatus
  transfersError: string | null
  pagination: {
    count: number
    next: string | null
    previous: string | null
  }
  page: number
  pageSize: number
  filters: TransferFilters
  detail: Transfer | null
  detailStatus: AsyncStatus
  detailError: string | null
  mutationStatus: Record<TransferMutation, AsyncStatus>
  mutationErrors: Record<TransferMutation, string | null>
}

const DEFAULT_PAGE_SIZE = 25

const initialFilters: TransferFilters = {
  status: null,
  warehouse: null,
  storefront: null,
  ordering: null,
  search: '',
}

const buildInitialMutationState = (): Record<TransferMutation, AsyncStatus> => ({
  create: 'idle',
  update: 'idle',
  submit: 'idle',
  approve: 'idle',
  reject: 'idle',
  markInTransit: 'idle',
  complete: 'idle',
  cancel: 'idle',
})

const buildInitialMutationErrors = (): Record<TransferMutation, string | null> => ({
  create: null,
  update: null,
  submit: null,
  approve: null,
  reject: null,
  markInTransit: null,
  complete: null,
  cancel: null,
})

const initialState: TransferState = {
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
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      console.error('[transfers] HTML error response received', trimmed)
    }
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

const upsertTransfer = (state: TransferState, transfer: Transfer) => {
  const index = state.transfers.findIndex((item) => item.id === transfer.id)
  if (index >= 0) {
    state.transfers[index] = transfer
  } else {
    state.transfers = ensureUniqueById([transfer, ...state.transfers])
  }
}

const buildListParams = (state: TransferState) => {
  const params: Record<string, unknown> = {
    page: state.page,
    page_size: state.pageSize,
  }
  const { filters } = state
  if (filters.status) params.status = filters.status
  if (filters.warehouse) params.warehouse = filters.warehouse
  if (filters.storefront) params.storefront = filters.storefront
  if (filters.ordering) params.ordering = filters.ordering
  const trimmedSearch = filters.search.trim()
  if (trimmedSearch.length > 0) params.search = trimmedSearch
  return params
}

export const loadTransfers = createAsyncThunk<PaginatedResponse<Transfer>, void, { state: RootState }>(
  'transfers/loadTransfers',
  async (_, thunkAPI) => {
    try {
      const state = thunkAPI.getState() as RootState
      const sliceState = state.transfers
      const params = buildListParams(sliceState)
      return await fetchTransfers(params)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const loadTransferDetail = createAsyncThunk<Transfer, string>(
  'transfers/loadTransferDetail',
  async (transferId, thunkAPI) => {
    try {
      return await fetchTransferDetail(transferId)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const createTransfer = createAsyncThunk<Transfer, TransferCreatePayload>(
  'transfers/createTransfer',
  async (payload, thunkAPI) => {
    try {
      return await createTransferApi(payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const updateTransfer = createAsyncThunk<Transfer, { transferId: string; payload: TransferUpdatePayload }>(
  'transfers/updateTransfer',
  async ({ transferId, payload }, thunkAPI) => {
    try {
      return await updateTransferApi(transferId, payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const submitTransfer = createAsyncThunk<Transfer, string>(
  'transfers/submitTransfer',
  async (transferId, thunkAPI) => {
    try {
      return await submitTransferApi(transferId)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const approveTransfer = createAsyncThunk<Transfer, { transferId: string; payload?: TransferApprovePayload }>(
  'transfers/approveTransfer',
  async ({ transferId, payload }, thunkAPI) => {
    try {
      return await approveTransferApi(transferId, payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const rejectTransfer = createAsyncThunk<Transfer, { transferId: string; payload: TransferRejectPayload }>(
  'transfers/rejectTransfer',
  async ({ transferId, payload }, thunkAPI) => {
    try {
      return await rejectTransferApi(transferId, payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const markTransferInTransitThunk = createAsyncThunk<Transfer, { transferId: string; payload?: TransferFulfillmentPayload }>(
  'transfers/markInTransit',
  async ({ transferId, payload }, thunkAPI) => {
    try {
      return await markTransferInTransitApi(transferId, payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const completeTransfer = createAsyncThunk<Transfer, { transferId: string; payload?: TransferFulfillmentPayload }>(
  'transfers/completeTransfer',
  async ({ transferId, payload }, thunkAPI) => {
    try {
      return await completeTransferApi(transferId, payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const cancelTransfer = createAsyncThunk<Transfer, string>(
  'transfers/cancelTransfer',
  async (transferId, thunkAPI) => {
    try {
      return await cancelTransferApi(transferId)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

const transferSlice = createSlice({
  name: 'transfers',
  initialState,
  reducers: {
    setTransferFilters: (state, action: PayloadAction<Partial<TransferFilters>>) => {
      state.filters = {
        ...state.filters,
        ...action.payload,
      }
    },
    resetTransferFilters: (state) => {
      state.filters = { ...initialFilters }
    },
    setTransferPage: (state, action: PayloadAction<number>) => {
      const nextPage = Number(action.payload)
      state.page = Number.isNaN(nextPage) || nextPage < 1 ? 1 : nextPage
    },
    setTransferPageSize: (state, action: PayloadAction<number>) => {
      const nextSize = Number(action.payload)
      state.pageSize = Number.isNaN(nextSize) || nextSize < 1 ? DEFAULT_PAGE_SIZE : nextSize
      if (state.page < 1) {
        state.page = 1
      }
    },
    clearTransferDetail: (state) => {
      state.detail = null
      state.detailStatus = 'idle'
      state.detailError = null
    },
    clearTransferMutation: (state, action: PayloadAction<TransferMutation>) => {
      const key = action.payload
      state.mutationStatus[key] = 'idle'
      state.mutationErrors[key] = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadTransfers.pending, (state) => {
        state.transfersStatus = 'loading'
        state.transfersError = null
      })
      .addCase(loadTransfers.fulfilled, (state, action) => {
        state.transfersStatus = 'succeeded'
        const payload = action.payload ?? ({} as PaginatedResponse<Transfer>)
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
      .addCase(loadTransfers.rejected, (state, action) => {
        state.transfersStatus = 'failed'
        state.transfersError = (action.payload as string) ?? 'Failed to load transfers.'
      })
      .addCase(loadTransferDetail.pending, (state) => {
        state.detailStatus = 'loading'
        state.detailError = null
      })
      .addCase(loadTransferDetail.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded'
        state.detail = action.payload
        upsertTransfer(state, action.payload)
      })
      .addCase(loadTransferDetail.rejected, (state, action) => {
        state.detailStatus = 'failed'
        state.detailError = (action.payload as string) ?? 'Failed to load transfer details.'
      })

      .addCase(createTransfer.pending, (state) => {
        state.mutationStatus.create = 'loading'
        state.mutationErrors.create = null
      })
      .addCase(createTransfer.fulfilled, (state, action) => {
        state.mutationStatus.create = 'succeeded'
        state.detail = action.payload
        state.detailStatus = 'succeeded'
        state.pagination.count += 1
        state.transfers = ensureUniqueById([action.payload, ...state.transfers])
      })
      .addCase(createTransfer.rejected, (state, action) => {
        state.mutationStatus.create = 'failed'
        state.mutationErrors.create = (action.payload as string) ?? 'Failed to create transfer.'
      })

      .addCase(updateTransfer.pending, (state) => {
        state.mutationStatus.update = 'loading'
        state.mutationErrors.update = null
      })
      .addCase(updateTransfer.fulfilled, (state, action) => {
        state.mutationStatus.update = 'succeeded'
        state.detail = action.payload
        state.detailStatus = 'succeeded'
        upsertTransfer(state, action.payload)
      })
      .addCase(updateTransfer.rejected, (state, action) => {
        state.mutationStatus.update = 'failed'
        state.mutationErrors.update = (action.payload as string) ?? 'Failed to update transfer.'
      })

      .addCase(submitTransfer.pending, (state) => {
        state.mutationStatus.submit = 'loading'
        state.mutationErrors.submit = null
      })
      .addCase(submitTransfer.fulfilled, (state, action) => {
        state.mutationStatus.submit = 'succeeded'
        state.detail = action.payload
        state.detailStatus = 'succeeded'
        upsertTransfer(state, action.payload)
      })
      .addCase(submitTransfer.rejected, (state, action) => {
        state.mutationStatus.submit = 'failed'
        state.mutationErrors.submit = (action.payload as string) ?? 'Failed to submit transfer.'
      })

      .addCase(approveTransfer.pending, (state) => {
        state.mutationStatus.approve = 'loading'
        state.mutationErrors.approve = null
      })
      .addCase(approveTransfer.fulfilled, (state, action) => {
        state.mutationStatus.approve = 'succeeded'
        state.detail = action.payload
        state.detailStatus = 'succeeded'
        upsertTransfer(state, action.payload)
      })
      .addCase(approveTransfer.rejected, (state, action) => {
        state.mutationStatus.approve = 'failed'
        state.mutationErrors.approve = (action.payload as string) ?? 'Failed to approve transfer.'
      })

      .addCase(rejectTransfer.pending, (state) => {
        state.mutationStatus.reject = 'loading'
        state.mutationErrors.reject = null
      })
      .addCase(rejectTransfer.fulfilled, (state, action) => {
        state.mutationStatus.reject = 'succeeded'
        state.detail = action.payload
        state.detailStatus = 'succeeded'
        upsertTransfer(state, action.payload)
      })
      .addCase(rejectTransfer.rejected, (state, action) => {
        state.mutationStatus.reject = 'failed'
        state.mutationErrors.reject = (action.payload as string) ?? 'Failed to reject transfer.'
      })

      .addCase(markTransferInTransitThunk.pending, (state) => {
        state.mutationStatus.markInTransit = 'loading'
        state.mutationErrors.markInTransit = null
      })
      .addCase(markTransferInTransitThunk.fulfilled, (state, action) => {
        state.mutationStatus.markInTransit = 'succeeded'
        state.detail = action.payload
        state.detailStatus = 'succeeded'
        upsertTransfer(state, action.payload)
      })
      .addCase(markTransferInTransitThunk.rejected, (state, action) => {
        state.mutationStatus.markInTransit = 'failed'
        state.mutationErrors.markInTransit = (action.payload as string) ?? 'Failed to mark transfer in transit.'
      })

      .addCase(completeTransfer.pending, (state) => {
        state.mutationStatus.complete = 'loading'
        state.mutationErrors.complete = null
      })
      .addCase(completeTransfer.fulfilled, (state, action) => {
        state.mutationStatus.complete = 'succeeded'
        state.detail = action.payload
        state.detailStatus = 'succeeded'
        upsertTransfer(state, action.payload)
      })
      .addCase(completeTransfer.rejected, (state, action) => {
        state.mutationStatus.complete = 'failed'
        state.mutationErrors.complete = (action.payload as string) ?? 'Failed to complete transfer.'
      })

      .addCase(cancelTransfer.pending, (state) => {
        state.mutationStatus.cancel = 'loading'
        state.mutationErrors.cancel = null
      })
      .addCase(cancelTransfer.fulfilled, (state, action) => {
        state.mutationStatus.cancel = 'succeeded'
        state.detail = action.payload
        state.detailStatus = 'succeeded'
        upsertTransfer(state, action.payload)
      })
      .addCase(cancelTransfer.rejected, (state, action) => {
        state.mutationStatus.cancel = 'failed'
        state.mutationErrors.cancel = (action.payload as string) ?? 'Failed to cancel transfer.'
      })
  },
})

export const {
  setTransferFilters,
  resetTransferFilters,
  setTransferPage,
  setTransferPageSize,
  clearTransferDetail,
  clearTransferMutation,
} = transferSlice.actions

export const selectTransfersState = (state: RootState) => state.transfers
export const selectTransfers = (state: RootState) => state.transfers.transfers
export const selectTransfersStatus = (state: RootState) => state.transfers.transfersStatus
export const selectTransfersError = (state: RootState) => state.transfers.transfersError
export const selectTransfersPagination = (state: RootState) => state.transfers.pagination
export const selectTransfersPage = (state: RootState) => state.transfers.page
export const selectTransfersPageSize = (state: RootState) => state.transfers.pageSize
export const selectTransferFilters = (state: RootState) => state.transfers.filters
export const selectTransferDetail = (state: RootState) => state.transfers.detail
export const selectTransferDetailStatus = (state: RootState) => state.transfers.detailStatus
export const selectTransferDetailError = (state: RootState) => state.transfers.detailError
export const selectTransferMutationStatus = (state: RootState) => state.transfers.mutationStatus
export const selectTransferMutationErrors = (state: RootState) => state.transfers.mutationErrors

export default transferSlice.reducer
