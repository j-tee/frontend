import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { isAxiosError } from 'axios'
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

type LocationType = 'storefront' | 'warehouse'

interface SelectedLocation {
  type: LocationType
  id: string
}

interface LocationState {
  storefronts: Storefront[]
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
  warehouses: [],
  status: 'idle',
  error: null,
  selectedLocation: null,
  createStorefrontStatus: 'idle',
  createStorefrontError: null,
  createWarehouseStatus: 'idle',
  createWarehouseError: null,
}

const extractError = (error: unknown): string => {
  if (isAxiosError(error)) {
    if (error.response?.data) {
      if (typeof error.response.data === 'string') {
        return error.response.data
      }
      try {
        return JSON.stringify(error.response.data)
      } catch {
        return error.message
      }
    }
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Failed to load locations.'
}

interface LoadLocationsResult {
  storefronts: Storefront[]
  warehouses: Warehouse[]
}

export const loadLocations = createAsyncThunk<LoadLocationsResult>(
  'locations/loadAll',
  async (_, thunkAPI) => {
    try {
      const [storefronts, warehouses] = await Promise.all([
        fetchStorefronts(),
        fetchWarehouses(),
      ])

      return {
        storefronts,
        warehouses,
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
          const { storefronts, warehouses } = action.payload
          state.status = 'succeeded'
          state.storefronts = storefronts
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
          state.storefronts = [action.payload, ...state.storefronts]
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
export const selectWarehouses = (state: RootState) => state.locations.warehouses
export const selectLocationStatus = (state: RootState) => state.locations.status
export const selectLocationError = (state: RootState) => state.locations.error
export const selectActiveLocation = (state: RootState) => state.locations.selectedLocation
export const selectCreateStorefrontStatus = (state: RootState) => state.locations.createStorefrontStatus
export const selectCreateStorefrontError = (state: RootState) => state.locations.createStorefrontError
export const selectCreateWarehouseStatus = (state: RootState) => state.locations.createWarehouseStatus
export const selectCreateWarehouseError = (state: RootState) => state.locations.createWarehouseError

export default locationSlice.reducer
