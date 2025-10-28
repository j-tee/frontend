import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { toUserFacingError } from '../../utils/errorMessage'
import {
  createStorefront,
  createWarehouse,
  fetchStorefronts,
  fetchWarehouses,
} from '../../services/inventoryService.js'
import type {
  Storefront,
  StorefrontPayload,
  Warehouse,
  WarehousePayload,
} from '../../types/inventory.js'
import type { RootState } from '../index.js'

const DEFAULT_STOREFRONT_PAGE_SIZE = 20

type LocationType = 'storefront' | 'warehouse'

interface SelectedLocation {
  type: LocationType
  id: string
}

interface PaginationState {
  count: number
  next: string | null
  previous: string | null
  page: number
  pageSize: number
}

interface LocationState {
  storefronts: Storefront[]
  storefrontPagination: PaginationState
  warehouses: Warehouse[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
  selectedLocation: SelectedLocation | null
  createStorefrontStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  createStorefrontError: string | null
  createWarehouseStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  createWarehouseError: string | null
}

const initialState: LocationState = {
  storefronts: [],
  storefrontPagination: {
    count: 0,
    next: null,
    previous: null,
    page: 1,
    pageSize: DEFAULT_STOREFRONT_PAGE_SIZE,
  },
  warehouses: [],
  status: 'idle',
  error: null,
  selectedLocation: null,
  createStorefrontStatus: 'idle',
  createStorefrontError: null,
  createWarehouseStatus: 'idle',
  createWarehouseError: null,
}

const extractError = (
  error: unknown,
  fallback = "We couldn't load locations right now. Please try again.",
): string => toUserFacingError(error, { fallback })

interface LoadLocationsArgs {
  storefrontPage?: number
}

interface LoadLocationsResult {
  storefronts: Storefront[]
  storefrontPagination: PaginationState
  warehouses: Warehouse[]
}

export const loadLocations = createAsyncThunk<
  LoadLocationsResult,
  LoadLocationsArgs | undefined,
  { state: RootState }
>(
  'locations/loadAll',
  async (args, thunkAPI) => {
    try {
      const page = args?.storefrontPage ?? 1
      const state = thunkAPI.getState()
      const targetBusinessId = state.auth.employment?.business.id ?? state.auth.business?.id ?? null

      const resolveBusinessId = (item: unknown): string | null => {
        if (!item || typeof item !== 'object') return null
        const record = item as Record<string, unknown>
        const direct = record.business
        if (typeof direct === 'string') return direct
        if (direct && typeof direct === 'object' && 'id' in direct) {
          const nestedId = (direct as { id?: unknown }).id
          if (typeof nestedId === 'string') return nestedId
        }
        const snake = record.business_id
        if (typeof snake === 'string') return snake
        const camel = record.businessId
        if (typeof camel === 'string') return camel
        return null
      }

      const filterByBusiness = <T>(items: T[]): T[] => {
        if (!targetBusinessId) return items
        const hasBusinessMetadata = items.some((item) => resolveBusinessId(item) !== null)
        if (!hasBusinessMetadata) {
          return items
        }
        return items.filter((item) => resolveBusinessId(item) === targetBusinessId)
      }

      const storefrontParams = targetBusinessId ? { page, business: targetBusinessId } : { page }
      const warehouseParams = targetBusinessId ? { business: targetBusinessId } : undefined
      const [storefrontsResponse, warehouses] = await Promise.all([
        fetchStorefronts(storefrontParams),
        fetchWarehouses(warehouseParams),
      ])

      const storefronts = filterByBusiness(storefrontsResponse.results)
      const scopedWarehouses = filterByBusiness(warehouses)

      const storefrontsWereFiltered = storefronts.length !== storefrontsResponse.results.length
      const shouldPaginate = !targetBusinessId

      return {
        storefronts,
        storefrontPagination: {
          count: storefrontsWereFiltered || targetBusinessId ? storefronts.length : storefrontsResponse.count,
          next: shouldPaginate ? storefrontsResponse.next : null,
          previous: shouldPaginate ? storefrontsResponse.previous : null,
          page: storefrontsResponse.page,
          pageSize: DEFAULT_STOREFRONT_PAGE_SIZE,
        },
        warehouses: scopedWarehouses,
      }
    } catch (error) {
      return thunkAPI.rejectWithValue(extractError(error))
    }
  },
)

export const addStorefront = createAsyncThunk<Storefront, StorefrontPayload>(
  'locations/addStorefront',
  async (payload, thunkAPI) => {
    try {
      return await createStorefront(payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractError(error))
    }
  },
)

export const addWarehouse = createAsyncThunk<Warehouse, WarehousePayload>(
  'locations/addWarehouse',
  async (payload, thunkAPI) => {
    try {
      return await createWarehouse(payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractError(error))
    }
  },
)

const locationSlice = createSlice({
  name: 'locations',
  initialState,
  reducers: {
    selectLocation: (state: LocationState, action: PayloadAction<SelectedLocation>) => {
      state.selectedLocation = action.payload
    },
    clearSelectedLocation: (state: LocationState) => {
      state.selectedLocation = null
    },
    resetLocationCreationState: (state: LocationState) => {
      state.createStorefrontStatus = 'idle'
      state.createStorefrontError = null
      state.createWarehouseStatus = 'idle'
      state.createWarehouseError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadLocations.pending, (state: LocationState) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(
        loadLocations.fulfilled,
        (state: LocationState, action: PayloadAction<LoadLocationsResult>) => {
          const { storefronts, storefrontPagination, warehouses } = action.payload
          state.status = 'succeeded'
          state.storefronts = storefronts
          state.storefrontPagination = storefrontPagination
          state.warehouses = warehouses
          state.error = null

          if (!state.selectedLocation) {
            if (storefronts.length > 0) {
              state.selectedLocation = { type: 'storefront', id: storefronts[0].id }
            } else if (warehouses.length > 0) {
              state.selectedLocation = { type: 'warehouse', id: warehouses[0].id }
            }
          } else {
            const { type, id } = state.selectedLocation
            const exists =
              type === 'storefront'
                ? storefronts.some((storefront) => storefront.id === id)
                : warehouses.some((warehouse) => warehouse.id === id)
            if (!exists) {
              if (storefronts.length > 0) {
                state.selectedLocation = { type: 'storefront', id: storefronts[0].id }
              } else if (warehouses.length > 0) {
                state.selectedLocation = { type: 'warehouse', id: warehouses[0].id }
              } else {
                state.selectedLocation = null
              }
            }
          }
        },
      )
      .addCase(loadLocations.rejected, (state: LocationState, action) => {
        state.status = 'failed'
        state.error = (action.payload as string) ?? 'Failed to load locations.'
      })
      .addCase(addStorefront.pending, (state: LocationState) => {
        state.createStorefrontStatus = 'loading'
        state.createStorefrontError = null
      })
      .addCase(
        addStorefront.fulfilled,
        (state: LocationState, action: PayloadAction<Storefront>) => {
          state.createStorefrontStatus = 'succeeded'
          state.storefrontPagination.count += 1
          if (state.storefrontPagination.page === 1) {
            const nextStorefronts = [action.payload, ...state.storefronts]
            state.storefronts = nextStorefronts.slice(0, state.storefrontPagination.pageSize)
          } else {
            state.storefronts = [action.payload, ...state.storefronts]
            state.storefrontPagination.page = 1
            state.storefrontPagination.previous = null
          }
          state.selectedLocation = { type: 'storefront', id: action.payload.id }
        },
      )
      .addCase(addStorefront.rejected, (state: LocationState, action) => {
        state.createStorefrontStatus = 'failed'
        state.createStorefrontError = (action.payload as string) ?? 'Failed to create storefront.'
      })
      .addCase(addWarehouse.pending, (state: LocationState) => {
        state.createWarehouseStatus = 'loading'
        state.createWarehouseError = null
      })
      .addCase(
        addWarehouse.fulfilled,
        (state: LocationState, action: PayloadAction<Warehouse>) => {
          state.createWarehouseStatus = 'succeeded'
          state.warehouses = [action.payload, ...state.warehouses]
          state.selectedLocation = { type: 'warehouse', id: action.payload.id }
        },
      )
      .addCase(addWarehouse.rejected, (state: LocationState, action) => {
        state.createWarehouseStatus = 'failed'
        state.createWarehouseError = (action.payload as string) ?? 'Failed to create warehouse.'
      })
  },
})

export const { selectLocation, clearSelectedLocation, resetLocationCreationState } = locationSlice.actions

export const selectLocationsState = (state: RootState) => state.locations
export const selectStorefronts = (state: RootState) => state.locations.storefronts
export const selectStorefrontPagination = (state: RootState) => state.locations.storefrontPagination
export const selectWarehouses = (state: RootState) => state.locations.warehouses
export const selectLocationStatus = (state: RootState) => state.locations.status
export const selectLocationError = (state: RootState) => state.locations.error
export const selectActiveLocation = (state: RootState) => state.locations.selectedLocation
export const selectCreateStorefrontStatus = (state: RootState) => state.locations.createStorefrontStatus
export const selectCreateStorefrontError = (state: RootState) => state.locations.createStorefrontError
export const selectCreateWarehouseStatus = (state: RootState) => state.locations.createWarehouseStatus
export const selectCreateWarehouseError = (state: RootState) => state.locations.createWarehouseError

export default locationSlice.reducer
