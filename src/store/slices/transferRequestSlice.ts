import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { isAxiosError } from 'axios'
import type { RootState } from '../index.js'
import {
  cancelTransferRequest as cancelTransferRequestApi,
  createTransferRequest as createTransferRequestApi,
  fetchTransferRequestDetail,
  fetchTransferRequests,
  fulfillTransferRequest as fulfillTransferRequestApi,
  updateTransferRequest as updateTransferRequestApi,
} from '../../services/inventoryService.js'
import type {
  TransferRequest,
  TransferRequestCancelPayload,
  TransferRequestCreatePayload,
  TransferRequestFulfillPayload,
  TransferRequestUpdatePayload,
} from '../../types/inventory.js'
import type { PaginatedResponse } from '../../types/common.js'

type AsyncStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

type TransferRequestMutation = 'create' | 'update' | 'cancel' | 'fulfill'

interface TransferRequestFilters {
  status: string | null
  storefront: string | null
  priority: string | null
  search: string
  ordering: string | null
}

interface PaginationState {
  count: number
  next: string | null
  previous: string | null
}

interface TransferRequestState {
  requests: TransferRequest[]
  status: AsyncStatus
  error: string | null
  pagination: PaginationState
  page: number
  pageSize: number
  filters: TransferRequestFilters
  detail: TransferRequest | null
  detailStatus: AsyncStatus
  detailError: string | null
  mutationStatus: Record<TransferRequestMutation, AsyncStatus>
  mutationErrors: Record<TransferRequestMutation, string | null>
}

const DEFAULT_PAGE_SIZE = 20

const initialFilters: TransferRequestFilters = {
  status: null,
  storefront: null,
  priority: null,
  search: '',
  ordering: null,
}

const buildInitialMutationStatus = (): Record<TransferRequestMutation, AsyncStatus> => ({
  create: 'idle',
  update: 'idle',
  cancel: 'idle',
  fulfill: 'idle',
})

const buildInitialMutationErrors = (): Record<TransferRequestMutation, string | null> => ({
  create: null,
  update: null,
  cancel: null,
  fulfill: null,
})

const initialState: TransferRequestState = {
  requests: [],
  status: 'idle',
  error: null,
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
  mutationStatus: buildInitialMutationStatus(),
  mutationErrors: buildInitialMutationErrors(),
}

const GENERIC_ERROR_MESSAGE = 'We ran into a problem talking to the server. Please try again.'

const sanitizeErrorMessage = (value: string): string => {
  const trimmed = value.trim()
  if (!trimmed) return GENERIC_ERROR_MESSAGE
  if (trimmed.length > 260) {
    return `${trimmed.slice(0, 257)}…`
  }
  return trimmed
}

const extractFirstMessage = (input: unknown, depth = 0): string | null => {
  if (depth > 4 || input == null) return null
  if (typeof input === 'string') return sanitizeErrorMessage(input)
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
    if (error.response?.status === 401) {
      return 'Your session has expired. Please log in again.'
    }
    if (error.response?.status === 403) {
      return 'You do not have permission to perform this action.'
    }
    if (error.response?.data) {
      const message = extractFirstMessage(error.response.data)
      if (message) return message
    }
    if (error.message) {
      return sanitizeErrorMessage(error.message)
    }
    return GENERIC_ERROR_MESSAGE
  }
  if (error instanceof Error) return sanitizeErrorMessage(error.message)
  if (typeof error === 'string') return sanitizeErrorMessage(error)
  return GENERIC_ERROR_MESSAGE
}

const ensureUniqueById = <T extends { id: string }>(items: T[]): T[] => {
  const map = new Map<string, T>()
  for (const item of items) {
    map.set(item.id, item)
  }
  return Array.from(map.values())
}

const buildListParams = (state: TransferRequestState) => {
  const params: Record<string, unknown> = {
    page: state.page,
    page_size: state.pageSize,
  }
  const { filters } = state
  if (filters.status) params.status = filters.status
  if (filters.storefront) params.storefront = filters.storefront
  if (filters.priority) params.priority = filters.priority
  if (filters.ordering) params.ordering = filters.ordering
  const trimmedSearch = filters.search.trim()
  if (trimmedSearch) params.search = trimmedSearch
  return params
}

export const loadTransferRequests = createAsyncThunk<PaginatedResponse<TransferRequest>, void, { state: RootState }>(
  'transferRequests/loadAll',
  async (_, thunkAPI) => {
    try {
      const state = thunkAPI.getState()
      const sliceState = state.transferRequests
      const params = buildListParams(sliceState)
      return await fetchTransferRequests(params)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const loadTransferRequestDetail = createAsyncThunk<TransferRequest, string>(
  'transferRequests/loadDetail',
  async (requestId, thunkAPI) => {
    try {
      return await fetchTransferRequestDetail(requestId)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const createTransferRequest = createAsyncThunk<TransferRequest, TransferRequestCreatePayload>(
  'transferRequests/create',
  async (payload, thunkAPI) => {
    try {
      return await createTransferRequestApi(payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const updateTransferRequest = createAsyncThunk<TransferRequest, { requestId: string; payload: TransferRequestUpdatePayload }>(
  'transferRequests/update',
  async ({ requestId, payload }, thunkAPI) => {
    try {
      return await updateTransferRequestApi(requestId, payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const cancelTransferRequest = createAsyncThunk<TransferRequest, { requestId: string; payload?: TransferRequestCancelPayload }>(
  'transferRequests/cancel',
  async ({ requestId, payload }, thunkAPI) => {
    try {
      return await cancelTransferRequestApi(requestId, payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const fulfillTransferRequest = createAsyncThunk<TransferRequest, { requestId: string; payload?: TransferRequestFulfillPayload }>(
  'transferRequests/fulfill',
  async ({ requestId, payload }, thunkAPI) => {
    try {
      return await fulfillTransferRequestApi(requestId, payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

const transferRequestSlice = createSlice({
  name: 'transferRequests',
  initialState,
  reducers: {
    setTransferRequestFilters: (state, action: PayloadAction<Partial<TransferRequestFilters>>) => {
      state.filters = {
        ...state.filters,
        ...action.payload,
      }
    },
    resetTransferRequestFilters: (state) => {
      state.filters = { ...initialFilters }
    },
    setTransferRequestPage: (state, action: PayloadAction<number>) => {
      const nextPage = Number(action.payload)
      state.page = Number.isNaN(nextPage) || nextPage < 1 ? 1 : nextPage
    },
    setTransferRequestPageSize: (state, action: PayloadAction<number>) => {
      const nextSize = Number(action.payload)
      state.pageSize = Number.isNaN(nextSize) || nextSize <= 0 ? DEFAULT_PAGE_SIZE : nextSize
      if (state.page < 1) {
        state.page = 1
      }
    },
    clearTransferRequestDetail: (state) => {
      state.detail = null
      state.detailError = null
      state.detailStatus = 'idle'
    },
    clearTransferRequestMutation: (state, action: PayloadAction<TransferRequestMutation>) => {
      const key = action.payload
      state.mutationStatus[key] = 'idle'
      state.mutationErrors[key] = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadTransferRequests.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadTransferRequests.fulfilled, (state, action) => {
        state.status = 'succeeded'
        const payload = action.payload ?? ({} as PaginatedResponse<TransferRequest>)
        state.requests = payload.results ?? []
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
      .addCase(loadTransferRequests.rejected, (state, action) => {
        state.status = 'failed'
        state.error = (action.payload as string) ?? 'Failed to load transfer requests.'
      })

      .addCase(loadTransferRequestDetail.pending, (state) => {
        state.detailStatus = 'loading'
        state.detailError = null
      })
      .addCase(loadTransferRequestDetail.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded'
        state.detail = action.payload
        state.requests = ensureUniqueById([action.payload, ...state.requests])
      })
      .addCase(loadTransferRequestDetail.rejected, (state, action) => {
        state.detailStatus = 'failed'
        state.detailError = (action.payload as string) ?? 'Failed to load transfer request details.'
      })

      .addCase(createTransferRequest.pending, (state) => {
        state.mutationStatus.create = 'loading'
        state.mutationErrors.create = null
      })
      .addCase(createTransferRequest.fulfilled, (state, action) => {
        state.mutationStatus.create = 'succeeded'
        state.requests = ensureUniqueById([action.payload, ...state.requests])
        state.pagination.count += 1
        state.detail = action.payload
        state.detailStatus = 'succeeded'
      })
      .addCase(createTransferRequest.rejected, (state, action) => {
        state.mutationStatus.create = 'failed'
        state.mutationErrors.create = (action.payload as string) ?? 'Failed to create transfer request.'
      })

      .addCase(updateTransferRequest.pending, (state) => {
        state.mutationStatus.update = 'loading'
        state.mutationErrors.update = null
      })
      .addCase(updateTransferRequest.fulfilled, (state, action) => {
        state.mutationStatus.update = 'succeeded'
        state.detail = action.payload
        state.detailStatus = 'succeeded'
        state.requests = ensureUniqueById([action.payload, ...state.requests])
      })
      .addCase(updateTransferRequest.rejected, (state, action) => {
        state.mutationStatus.update = 'failed'
        state.mutationErrors.update = (action.payload as string) ?? 'Failed to update transfer request.'
      })

      .addCase(cancelTransferRequest.pending, (state) => {
        state.mutationStatus.cancel = 'loading'
        state.mutationErrors.cancel = null
      })
      .addCase(cancelTransferRequest.fulfilled, (state, action) => {
        state.mutationStatus.cancel = 'succeeded'
        state.detail = action.payload
        state.detailStatus = 'succeeded'
        state.requests = ensureUniqueById([action.payload, ...state.requests])
      })
      .addCase(cancelTransferRequest.rejected, (state, action) => {
        state.mutationStatus.cancel = 'failed'
        state.mutationErrors.cancel = (action.payload as string) ?? 'Failed to cancel transfer request.'
      })

      .addCase(fulfillTransferRequest.pending, (state) => {
        state.mutationStatus.fulfill = 'loading'
        state.mutationErrors.fulfill = null
      })
      .addCase(fulfillTransferRequest.fulfilled, (state, action) => {
        state.mutationStatus.fulfill = 'succeeded'
        state.detail = action.payload
        state.detailStatus = 'succeeded'
        state.requests = ensureUniqueById([action.payload, ...state.requests])
      })
      .addCase(fulfillTransferRequest.rejected, (state, action) => {
        state.mutationStatus.fulfill = 'failed'
        state.mutationErrors.fulfill = (action.payload as string) ?? 'Failed to mark request as fulfilled.'
      })
  },
})

export const {
  setTransferRequestFilters,
  resetTransferRequestFilters,
  setTransferRequestPage,
  setTransferRequestPageSize,
  clearTransferRequestDetail,
  clearTransferRequestMutation,
} = transferRequestSlice.actions

export const selectTransferRequestsState = (state: RootState) => state.transferRequests
export const selectTransferRequests = (state: RootState) => state.transferRequests.requests
export const selectTransferRequestsStatus = (state: RootState) => state.transferRequests.status
export const selectTransferRequestsError = (state: RootState) => state.transferRequests.error
export const selectTransferRequestsPagination = (state: RootState) => state.transferRequests.pagination
export const selectTransferRequestsPage = (state: RootState) => state.transferRequests.page
export const selectTransferRequestsPageSize = (state: RootState) => state.transferRequests.pageSize
export const selectTransferRequestFilters = (state: RootState) => state.transferRequests.filters
export const selectTransferRequestDetail = (state: RootState) => state.transferRequests.detail
export const selectTransferRequestDetailStatus = (state: RootState) => state.transferRequests.detailStatus
export const selectTransferRequestDetailError = (state: RootState) => state.transferRequests.detailError
export const selectTransferRequestMutationStatus = (state: RootState) => state.transferRequests.mutationStatus
export const selectTransferRequestMutationErrors = (state: RootState) => state.transferRequests.mutationErrors

export default transferRequestSlice.reducer
