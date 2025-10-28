/**
 * Export Automation Redux Slice
 * 
 * Manages state for:
 * - Export schedules (list, selected, form)
 * - Export history (paginated list, filters)
 * - Export statistics
 * - Notification settings
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type {
  ExportSchedule,
  ExportHistory,
  ExportNotificationSettings,
  ExportStatistics,
  CreateSchedulePayload,
  ScheduleListParams,
  HistoryListParams,
} from '../../types/exports'
import * as exportService from '../../services/exportAutomationService'

// ==================== State Interface ====================

interface ExportAutomationState {
  // Schedules
  schedules: {
    data: ExportSchedule[]
    loading: boolean
    error: string | null
    filters: ScheduleListParams
  }
  
  // Selected schedule (for editing)
  selectedSchedule: {
    data: ExportSchedule | null
    loading: boolean
    error: string | null
  }
  
  // History
  history: {
    data: ExportHistory[]
    pagination: {
      count: number
      next: string | null
      previous: string | null
      currentPage: number
      pageSize: number
    }
    loading: boolean
    error: string | null
    filters: HistoryListParams
  }
  
  // Statistics
  statistics: {
    data: ExportStatistics | null
    loading: boolean
    error: string | null
  }
  
  // Notifications
  notifications: {
    settings: ExportNotificationSettings | null
    loading: boolean
    error: string | null
  }
  
  // UI State
  ui: {
    showScheduleForm: boolean
    scheduleFormMode: 'create' | 'edit'
    downloadingExportId: string | null
  }
}

const initialState: ExportAutomationState = {
  schedules: {
    data: [],
    loading: false,
    error: null,
    filters: {},
  },
  selectedSchedule: {
    data: null,
    loading: false,
    error: null,
  },
  history: {
    data: [],
    pagination: {
      count: 0,
      next: null,
      previous: null,
      currentPage: 1,
      pageSize: 20,
    },
    loading: false,
    error: null,
    filters: {},
  },
  statistics: {
    data: null,
    loading: false,
    error: null,
  },
  notifications: {
    settings: null,
    loading: false,
    error: null,
  },
  ui: {
    showScheduleForm: false,
    scheduleFormMode: 'create',
    downloadingExportId: null,
  },
}

// ==================== Async Thunks ====================

// --- Schedules ---

export const fetchSchedules = createAsyncThunk(
  'exportAutomation/fetchSchedules',
  async (params?: ScheduleListParams) => {
    return await exportService.listSchedules(params)
  }
)

export const fetchSchedule = createAsyncThunk(
  'exportAutomation/fetchSchedule',
  async (id: string) => {
    return await exportService.getSchedule(id)
  }
)

export const createSchedule = createAsyncThunk(
  'exportAutomation/createSchedule',
  async (data: CreateSchedulePayload) => {
    return await exportService.createSchedule(data)
  }
)

export const updateSchedule = createAsyncThunk(
  'exportAutomation/updateSchedule',
  async ({ id, data }: { id: string; data: CreateSchedulePayload }) => {
    return await exportService.updateSchedule(id, data)
  }
)

export const deleteSchedule = createAsyncThunk(
  'exportAutomation/deleteSchedule',
  async (id: string) => {
    await exportService.deleteSchedule(id)
    return id
  }
)

export const activateSchedule = createAsyncThunk(
  'exportAutomation/activateSchedule',
  async (id: string) => {
    return await exportService.activateSchedule(id)
  }
)

export const deactivateSchedule = createAsyncThunk(
  'exportAutomation/deactivateSchedule',
  async (id: string) => {
    return await exportService.deactivateSchedule(id)
  }
)

export const triggerSchedule = createAsyncThunk(
  'exportAutomation/triggerSchedule',
  async (id: string) => {
    return await exportService.triggerSchedule(id)
  }
)

export const fetchUpcomingExports = createAsyncThunk(
  'exportAutomation/fetchUpcomingExports',
  async () => {
    return await exportService.getUpcomingExports()
  }
)

export const fetchOverdueExports = createAsyncThunk(
  'exportAutomation/fetchOverdueExports',
  async () => {
    return await exportService.getOverdueExports()
  }
)

// --- History ---

export const fetchExportHistory = createAsyncThunk(
  'exportAutomation/fetchExportHistory',
  async (params?: HistoryListParams) => {
    return await exportService.listExportHistory(params)
  }
)

export const fetchExportHistoryItem = createAsyncThunk(
  'exportAutomation/fetchExportHistoryItem',
  async (id: string) => {
    return await exportService.getExportHistory(id)
  }
)

export const downloadExport = createAsyncThunk(
  'exportAutomation/downloadExport',
  async ({ id, filename }: { id: string; filename?: string }) => {
    await exportService.downloadAndSaveExport(id, filename)
    return id
  }
)

export const fetchRecentExports = createAsyncThunk(
  'exportAutomation/fetchRecentExports',
  async () => {
    return await exportService.getRecentExports()
  }
)

// --- Statistics ---

export const fetchStatistics = createAsyncThunk(
  'exportAutomation/fetchStatistics',
  async () => {
    return await exportService.getExportStatistics()
  }
)

// --- Notifications ---

export const fetchNotificationSettings = createAsyncThunk(
  'exportAutomation/fetchNotificationSettings',
  async () => {
    return await exportService.getNotificationSettings()
  }
)

export const updateNotificationSettings = createAsyncThunk(
  'exportAutomation/updateNotificationSettings',
  async (data: ExportNotificationSettings) => {
    return await exportService.updateNotificationSettings(data)
  }
)

// ==================== Slice ====================

const exportAutomationSlice = createSlice({
  name: 'exportAutomation',
  initialState,
  reducers: {
    // UI Actions
    openScheduleForm: (state, action: PayloadAction<'create' | 'edit'>) => {
      state.ui.showScheduleForm = true
      state.ui.scheduleFormMode = action.payload
    },
    closeScheduleForm: (state) => {
      state.ui.showScheduleForm = false
      state.selectedSchedule.data = null
      state.selectedSchedule.error = null
    },
    
    // Filters
    setScheduleFilters: (state, action: PayloadAction<ScheduleListParams>) => {
      state.schedules.filters = action.payload
    },
    clearScheduleFilters: (state) => {
      state.schedules.filters = {}
    },
    setHistoryFilters: (state, action: PayloadAction<HistoryListParams>) => {
      state.history.filters = action.payload
    },
    clearHistoryFilters: (state) => {
      state.history.filters = {}
    },
    
    // Pagination
    setHistoryPage: (state, action: PayloadAction<number>) => {
      state.history.pagination.currentPage = action.payload
    },
    setHistoryPageSize: (state, action: PayloadAction<number>) => {
      state.history.pagination.pageSize = action.payload
      state.history.pagination.currentPage = 1 // Reset to first page
    },
    
    // Clear errors
    clearSchedulesError: (state) => {
      state.schedules.error = null
    },
    clearSelectedScheduleError: (state) => {
      state.selectedSchedule.error = null
    },
    clearHistoryError: (state) => {
      state.history.error = null
    },
    clearStatisticsError: (state) => {
      state.statistics.error = null
    },
    clearNotificationsError: (state) => {
      state.notifications.error = null
    },
  },
  extraReducers: (builder) => {
    // --- Fetch Schedules ---
    builder.addCase(fetchSchedules.pending, (state) => {
      state.schedules.loading = true
      state.schedules.error = null
    })
    builder.addCase(fetchSchedules.fulfilled, (state, action) => {
      state.schedules.loading = false
      state.schedules.data = action.payload
    })
    builder.addCase(fetchSchedules.rejected, (state, action) => {
      state.schedules.loading = false
      state.schedules.error = action.error.message || 'Failed to fetch schedules'
    })
    
    // --- Fetch Single Schedule ---
    builder.addCase(fetchSchedule.pending, (state) => {
      state.selectedSchedule.loading = true
      state.selectedSchedule.error = null
    })
    builder.addCase(fetchSchedule.fulfilled, (state, action) => {
      state.selectedSchedule.loading = false
      state.selectedSchedule.data = action.payload
    })
    builder.addCase(fetchSchedule.rejected, (state, action) => {
      state.selectedSchedule.loading = false
      state.selectedSchedule.error = action.error.message || 'Failed to fetch schedule'
    })
    
    // --- Create Schedule ---
    builder.addCase(createSchedule.pending, (state) => {
      state.selectedSchedule.loading = true
      state.selectedSchedule.error = null
    })
    builder.addCase(createSchedule.fulfilled, (state, action) => {
      state.selectedSchedule.loading = false
      state.schedules.data.push(action.payload)
      state.ui.showScheduleForm = false
    })
    builder.addCase(createSchedule.rejected, (state, action) => {
      state.selectedSchedule.loading = false
      state.selectedSchedule.error = action.error.message || 'Failed to create schedule'
    })
    
    // --- Update Schedule ---
    builder.addCase(updateSchedule.pending, (state) => {
      state.selectedSchedule.loading = true
      state.selectedSchedule.error = null
    })
    builder.addCase(updateSchedule.fulfilled, (state, action) => {
      state.selectedSchedule.loading = false
      const index = state.schedules.data.findIndex((s) => s.id === action.payload.id)
      if (index !== -1) {
        state.schedules.data[index] = action.payload
      }
      state.selectedSchedule.data = action.payload
      state.ui.showScheduleForm = false
    })
    builder.addCase(updateSchedule.rejected, (state, action) => {
      state.selectedSchedule.loading = false
      state.selectedSchedule.error = action.error.message || 'Failed to update schedule'
    })
    
    // --- Delete Schedule ---
    builder.addCase(deleteSchedule.pending, (state) => {
      state.schedules.loading = true
      state.schedules.error = null
    })
    builder.addCase(deleteSchedule.fulfilled, (state, action) => {
      state.schedules.loading = false
      state.schedules.data = state.schedules.data.filter((s) => s.id !== action.payload)
    })
    builder.addCase(deleteSchedule.rejected, (state, action) => {
      state.schedules.loading = false
      state.schedules.error = action.error.message || 'Failed to delete schedule'
    })
    
    // --- Activate Schedule ---
    builder.addCase(activateSchedule.fulfilled, (state, action) => {
      const index = state.schedules.data.findIndex((s) => s.id === action.payload.id)
      if (index !== -1) {
        state.schedules.data[index] = action.payload
      }
    })
    
    // --- Deactivate Schedule ---
    builder.addCase(deactivateSchedule.fulfilled, (state, action) => {
      const index = state.schedules.data.findIndex((s) => s.id === action.payload.id)
      if (index !== -1) {
        state.schedules.data[index] = action.payload
      }
    })
    
    // --- Trigger Schedule ---
    builder.addCase(triggerSchedule.fulfilled, (state, action) => {
      // Add the new export to history
      state.history.data.unshift(action.payload)
      state.history.pagination.count += 1
    })
    
    // --- Fetch Upcoming Exports ---
    builder.addCase(fetchUpcomingExports.fulfilled, (state, action) => {
      // Could store in separate state if needed, or merge with schedules
      state.schedules.data = action.payload
    })
    
    // --- Fetch Overdue Exports ---
    builder.addCase(fetchOverdueExports.fulfilled, (state, action) => {
      // Could store in separate state if needed, or merge with schedules
      state.schedules.data = action.payload
    })
    
    // --- Fetch Export History ---
    builder.addCase(fetchExportHistory.pending, (state) => {
      state.history.loading = true
      state.history.error = null
    })
    builder.addCase(fetchExportHistory.fulfilled, (state, action) => {
      state.history.loading = false
      state.history.data = action.payload.results
      state.history.pagination = {
        count: action.payload.count,
        next: action.payload.next,
        previous: action.payload.previous,
        currentPage: state.history.pagination.currentPage,
        pageSize: state.history.pagination.pageSize,
      }
    })
    builder.addCase(fetchExportHistory.rejected, (state, action) => {
      state.history.loading = false
      state.history.error = action.error.message || 'Failed to fetch export history'
    })
    
    // --- Download Export ---
    builder.addCase(downloadExport.pending, (state, action) => {
      state.ui.downloadingExportId = action.meta.arg.id
    })
    builder.addCase(downloadExport.fulfilled, (state) => {
      state.ui.downloadingExportId = null
    })
    builder.addCase(downloadExport.rejected, (state) => {
      state.ui.downloadingExportId = null
    })
    
    // --- Fetch Recent Exports ---
    builder.addCase(fetchRecentExports.fulfilled, (state, action) => {
      state.history.data = action.payload
    })
    
    // --- Fetch Statistics ---
    builder.addCase(fetchStatistics.pending, (state) => {
      state.statistics.loading = true
      state.statistics.error = null
    })
    builder.addCase(fetchStatistics.fulfilled, (state, action) => {
      state.statistics.loading = false
      state.statistics.data = action.payload
    })
    builder.addCase(fetchStatistics.rejected, (state, action) => {
      state.statistics.loading = false
      state.statistics.error = action.error.message || 'Failed to fetch statistics'
    })
    
    // --- Fetch Notification Settings ---
    builder.addCase(fetchNotificationSettings.pending, (state) => {
      state.notifications.loading = true
      state.notifications.error = null
    })
    builder.addCase(fetchNotificationSettings.fulfilled, (state, action) => {
      state.notifications.loading = false
      state.notifications.settings = action.payload
    })
    builder.addCase(fetchNotificationSettings.rejected, (state, action) => {
      state.notifications.loading = false
      state.notifications.error = action.error.message || 'Failed to fetch notification settings'
    })
    
    // --- Update Notification Settings ---
    builder.addCase(updateNotificationSettings.pending, (state) => {
      state.notifications.loading = true
      state.notifications.error = null
    })
    builder.addCase(updateNotificationSettings.fulfilled, (state, action) => {
      state.notifications.loading = false
      state.notifications.settings = action.payload
    })
    builder.addCase(updateNotificationSettings.rejected, (state, action) => {
      state.notifications.loading = false
      state.notifications.error = action.error.message || 'Failed to update notification settings'
    })
  },
})

// ==================== Actions ====================

export const {
  openScheduleForm,
  closeScheduleForm,
  setScheduleFilters,
  clearScheduleFilters,
  setHistoryFilters,
  clearHistoryFilters,
  setHistoryPage,
  setHistoryPageSize,
  clearSchedulesError,
  clearSelectedScheduleError,
  clearHistoryError,
  clearStatisticsError,
  clearNotificationsError,
} = exportAutomationSlice.actions

// ==================== Selectors ====================

// Note: RootState type will be imported from store/index.ts in components
// For now, using a local type for the slice state

type RootState = {
  exportAutomation: ExportAutomationState
}

// Schedules
export const selectSchedules = (state: RootState) => state.exportAutomation.schedules.data
export const selectSchedulesLoading = (state: RootState) => state.exportAutomation.schedules.loading
export const selectSchedulesError = (state: RootState) => state.exportAutomation.schedules.error
export const selectScheduleFilters = (state: RootState) => state.exportAutomation.schedules.filters

export const selectActiveSchedules = (state: RootState) =>
  state.exportAutomation.schedules.data.filter((s: ExportSchedule) => s.is_active)

export const selectInactiveSchedules = (state: RootState) =>
  state.exportAutomation.schedules.data.filter((s: ExportSchedule) => !s.is_active)

// Selected Schedule
export const selectSelectedSchedule = (state: RootState) => state.exportAutomation.selectedSchedule.data
export const selectSelectedScheduleLoading = (state: RootState) =>
  state.exportAutomation.selectedSchedule.loading
export const selectSelectedScheduleError = (state: RootState) =>
  state.exportAutomation.selectedSchedule.error

// History
export const selectExportHistory = (state: RootState) => state.exportAutomation.history.data
export const selectHistoryLoading = (state: RootState) => state.exportAutomation.history.loading
export const selectHistoryError = (state: RootState) => state.exportAutomation.history.error
export const selectHistoryPagination = (state: RootState) => state.exportAutomation.history.pagination
export const selectHistoryFilters = (state: RootState) => state.exportAutomation.history.filters

export const selectSuccessfulExports = (state: RootState) =>
  state.exportAutomation.history.data.filter((h: ExportHistory) => h.status === 'COMPLETED')

export const selectFailedExports = (state: RootState) =>
  state.exportAutomation.history.data.filter((h: ExportHistory) => h.status === 'FAILED')

// Statistics
export const selectStatistics = (state: RootState) => state.exportAutomation.statistics.data
export const selectStatisticsLoading = (state: RootState) => state.exportAutomation.statistics.loading
export const selectStatisticsError = (state: RootState) => state.exportAutomation.statistics.error

// Notifications
export const selectNotificationSettings = (state: RootState) =>
  state.exportAutomation.notifications.settings
export const selectNotificationsLoading = (state: RootState) =>
  state.exportAutomation.notifications.loading
export const selectNotificationsError = (state: RootState) =>
  state.exportAutomation.notifications.error

// UI
export const selectShowScheduleForm = (state: RootState) => state.exportAutomation.ui.showScheduleForm
export const selectScheduleFormMode = (state: RootState) => state.exportAutomation.ui.scheduleFormMode
export const selectDownloadingExportId = (state: RootState) =>
  state.exportAutomation.ui.downloadingExportId

// ==================== Export ====================

export default exportAutomationSlice.reducer
