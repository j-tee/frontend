import { createSlice, createAsyncThunk, createSelector, type PayloadAction } from '@reduxjs/toolkit'
import type { BusinessSettings, SettingsState, AppearanceSettings, RegionalSettings, Currency } from '../../types/settings'
import settingsService from '../../services/settingsService.js'

// Default settings
const getDefaultCurrency = (): Currency => {
  return {
    code: 'GHS',
    symbol: '₵',
    name: 'Ghanaian Cedi',
    position: 'before',
    decimalPlaces: 2,
  }
}

const initialState: SettingsState = {
  settings: null,
  status: 'idle',
  error: null,
  saveStatus: 'idle',
  saveError: null,
}

// Async thunks
export const fetchSettings = createAsyncThunk(
  'settings/fetchSettings',
  async (_, { rejectWithValue }) => {
    try {
      return await settingsService.getSettings()
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch settings')
    }
  },
)

export const updateSettings = createAsyncThunk(
  'settings/updateSettings',
  async (settings: Partial<BusinessSettings>, { rejectWithValue }) => {
    try {
      return await settingsService.updateSettings(settings)
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update settings')
    }
  },
)

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    // Update appearance settings locally (before saving)
    setAppearanceSettings: (state, action: PayloadAction<Partial<AppearanceSettings>>) => {
      if (state.settings) {
        state.settings.appearance = {
          ...state.settings.appearance,
          ...action.payload,
        }
      }
    },
    // Update regional settings locally
    setRegionalSettings: (state, action: PayloadAction<Partial<RegionalSettings>>) => {
      if (state.settings) {
        state.settings.regional = {
          ...state.settings.regional,
          ...action.payload,
        }
      }
    },
    // Set currency
    setCurrency: (state, action: PayloadAction<Currency>) => {
      if (state.settings) {
        state.settings.regional.currency = action.payload
      }
    },
    // Reset save status
    resetSaveStatus: (state) => {
      state.saveStatus = 'idle'
      state.saveError = null
    },
    // Initialize default settings
    initializeDefaultSettings: (state, action: PayloadAction<string>) => {
      const businessId = action.payload
      state.settings = {
        business: businessId,
        regional: {
          currency: getDefaultCurrency(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          firstDayOfWeek: 0,
          numberFormat: 'en-US',
        },
        appearance: {
          colorScheme: 'auto',
          themePreset: 'default-blue',
          fontSize: 'medium',
          compactMode: false,
          animationsEnabled: true,
          highContrast: false,
        },
        notifications: {
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false,
          lowStockAlerts: true,
          salesUpdates: true,
          systemUpdates: true,
          marketingEmails: false,
        },
        receipt: {
          showLogo: true,
          showTaxBreakdown: true,
          showBarcode: true,
          paperSize: 'thermal-80mm',
        },
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch settings
      .addCase(fetchSettings.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.settings = action.payload
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload as string
      })
      // Update settings
      .addCase(updateSettings.pending, (state) => {
        state.saveStatus = 'saving'
        state.saveError = null
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.saveStatus = 'saved'
        state.settings = action.payload
        // Reset save status after 3 seconds
        setTimeout(() => {
          if (state.saveStatus === 'saved') {
            state.saveStatus = 'idle'
          }
        }, 3000)
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.saveStatus = 'failed'
        state.saveError = action.payload as string
      })
  },
})

export const {
  setAppearanceSettings,
  setRegionalSettings,
  setCurrency,
  resetSaveStatus,
  initializeDefaultSettings,
} = settingsSlice.actions

export default settingsSlice.reducer

// Selectors
export const selectSettings = (state: { settings: SettingsState }) => state.settings.settings

// Memoized selectors to prevent unnecessary re-renders
export const selectAppearanceSettings = createSelector(
  [selectSettings],
  (settings) => settings?.appearance
)

export const selectRegionalSettings = createSelector(
  [selectSettings],
  (settings) => settings?.regional
)

export const selectCurrency = createSelector(
  [selectSettings],
  (settings) => settings?.regional.currency || getDefaultCurrency()
)

export const selectSettingsStatus = (state: { settings: SettingsState }) => state.settings.status
export const selectSaveStatus = (state: { settings: SettingsState }) => state.settings.saveStatus
