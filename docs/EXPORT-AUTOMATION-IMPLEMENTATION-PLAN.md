# Export Automation - Frontend Implementation Plan

**Status:** 📋 Ready for Implementation  
**Priority:** Medium  
**Estimated Time:** 2-3 days  
**Dependencies:** Backend API (Complete ✅)

---

## Overview

This document outlines the implementation plan for integrating the Export Automation system into the POS frontend. The backend API is fully operational and ready for integration.

**Key Features:**
- Automated export scheduling (Daily/Weekly/Monthly)
- Export history with download capability
- Real-time export status tracking
- Email notification management
- Export statistics dashboard

---

## Phase 1: Type Definitions & API Service

### 1.1 Create Type Definitions

**File:** `src/types/exports.ts`

```typescript
export type ExportType = 'SALES' | 'CUSTOMERS' | 'INVENTORY' | 'AUDIT_LOGS'
export type ExportFormat = 'excel' | 'csv' | 'pdf'
export type ExportFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY'
export type ExportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EMAILED'
export type ExportTrigger = 'MANUAL' | 'SCHEDULED' | 'API'

export interface ExportSchedule {
  id: string
  name: string
  export_type: ExportType
  format: ExportFormat
  frequency: ExportFrequency
  hour: number
  day_of_week: number | null
  day_of_month: number | null
  recipients: string[]
  include_creator_email: boolean
  email_subject: string
  email_message: string
  filters: Record<string, any>
  is_active: boolean
  last_run_at: string | null
  next_run_at: string | null
  created_at: string
  updated_at: string
  created_by: string
  created_by_name: string
  next_run_display: string
  last_run_display: string
  status_display: string
}

export interface ExportHistory {
  id: string
  export_type: ExportType
  format: ExportFormat
  trigger: ExportTrigger
  status: ExportStatus
  started_at: string | null
  completed_at: string | null
  created_at: string
  file_name: string
  file_size: number
  file_path: string
  record_count: number
  filters_applied: Record<string, any>
  email_sent: boolean
  email_recipients: string[]
  email_sent_at: string | null
  error_message: string | null
  error_traceback: string | null
  user: string
  user_name: string
  schedule: string | null
  schedule_name: string | null
  duration_display: string
  file_size_display: string
  status_display: string
  duration_seconds: number
  file_size_mb: number
}

export interface ExportNotificationSettings {
  notify_on_success: boolean
  notify_on_failure: boolean
  default_recipients: string[]
  from_name: string
  reply_to_email: string
}

export interface ExportStatistics {
  total_exports: number
  successful_exports: number
  failed_exports: number
  success_rate: number
  by_type: Record<string, { total: number; successful: number; failed: number }>
  by_format: Record<string, { total: number; successful: number; failed: number }>
  recent_exports_7_days: number
  average_file_size_mb: number
}

export interface PaginatedExportHistory {
  count: number
  next: string | null
  previous: string | null
  results: ExportHistory[]
}

export interface CreateSchedulePayload {
  name: string
  export_type: ExportType
  format: ExportFormat
  frequency: ExportFrequency
  hour: number
  day_of_week?: number
  day_of_month?: number
  recipients: string[]
  include_creator_email?: boolean
  email_subject?: string
  email_message?: string
  filters: Record<string, any>
  is_active?: boolean
}

export interface TriggerSchedulePayload {
  schedule_id: string
  send_email?: boolean
  override_recipients?: string[]
}
```

### 1.2 Create API Service

**File:** `src/services/exportAutomationService.ts`

```typescript
import { apiClient } from './apiClient'
import type {
  ExportSchedule,
  ExportHistory,
  ExportNotificationSettings,
  ExportStatistics,
  PaginatedExportHistory,
  CreateSchedulePayload,
  TriggerSchedulePayload,
} from '../types/exports'

const BASE_URL = '/api/reports/automation'

// Schedules
export async function listSchedules(params?: {
  is_active?: boolean
  export_type?: string
  frequency?: string
}): Promise<ExportSchedule[]> {
  const response = await apiClient.get<ExportSchedule[]>(`${BASE_URL}/schedules/`, { params })
  return response.data
}

export async function getSchedule(id: string): Promise<ExportSchedule> {
  const response = await apiClient.get<ExportSchedule>(`${BASE_URL}/schedules/${id}/`)
  return response.data
}

export async function createSchedule(data: CreateSchedulePayload): Promise<ExportSchedule> {
  const response = await apiClient.post<ExportSchedule>(`${BASE_URL}/schedules/`, data)
  return response.data
}

export async function updateSchedule(id: string, data: Partial<CreateSchedulePayload>): Promise<ExportSchedule> {
  const response = await apiClient.put<ExportSchedule>(`${BASE_URL}/schedules/${id}/`, data)
  return response.data
}

export async function partialUpdateSchedule(id: string, data: Partial<CreateSchedulePayload>): Promise<ExportSchedule> {
  const response = await apiClient.patch<ExportSchedule>(`${BASE_URL}/schedules/${id}/`, data)
  return response.data
}

export async function deleteSchedule(id: string): Promise<void> {
  await apiClient.delete(`${BASE_URL}/schedules/${id}/`)
}

export async function activateSchedule(id: string): Promise<ExportSchedule> {
  const response = await apiClient.post<ExportSchedule>(`${BASE_URL}/schedules/${id}/activate/`)
  return response.data
}

export async function deactivateSchedule(id: string): Promise<ExportSchedule> {
  const response = await apiClient.post<ExportSchedule>(`${BASE_URL}/schedules/${id}/deactivate/`)
  return response.data
}

export async function triggerSchedule(id: string, payload: TriggerSchedulePayload): Promise<ExportHistory> {
  const response = await apiClient.post<ExportHistory>(`${BASE_URL}/schedules/${id}/trigger/`, payload)
  return response.data
}

export async function getUpcomingExports(): Promise<ExportSchedule[]> {
  const response = await apiClient.get<ExportSchedule[]>(`${BASE_URL}/schedules/upcoming/`)
  return response.data
}

export async function getOverdueExports(): Promise<ExportSchedule[]> {
  const response = await apiClient.get<ExportSchedule[]>(`${BASE_URL}/schedules/overdue/`)
  return response.data
}

// History
export async function listExportHistory(params?: {
  export_type?: string
  format?: string
  status?: string
  trigger?: string
  schedule_id?: string
  start_date?: string
  end_date?: string
  page?: number
  page_size?: number
}): Promise<PaginatedExportHistory> {
  const response = await apiClient.get<PaginatedExportHistory>(`${BASE_URL}/history/`, { params })
  return response.data
}

export async function getExportHistory(id: string): Promise<ExportHistory> {
  const response = await apiClient.get<ExportHistory>(`${BASE_URL}/history/${id}/`)
  return response.data
}

export async function downloadExport(id: string): Promise<Blob> {
  const response = await apiClient.get(`${BASE_URL}/history/${id}/download/`, {
    responseType: 'blob',
  })
  return response.data
}

export async function getExportStatistics(): Promise<ExportStatistics> {
  const response = await apiClient.get<ExportStatistics>(`${BASE_URL}/history/statistics/`)
  return response.data
}

export async function getRecentExports(): Promise<ExportHistory[]> {
  const response = await apiClient.get<ExportHistory[]>(`${BASE_URL}/history/recent/`)
  return response.data
}

// Notifications
export async function getNotificationSettings(): Promise<ExportNotificationSettings> {
  const response = await apiClient.get<ExportNotificationSettings>(`${BASE_URL}/notifications/`)
  return response.data
}

export async function updateNotificationSettings(
  data: ExportNotificationSettings
): Promise<ExportNotificationSettings> {
  const response = await apiClient.put<ExportNotificationSettings>(`${BASE_URL}/notifications/`, data)
  return response.data
}

// Utility: Trigger file download from blob
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}
```

---

## Phase 2: Redux State Management

### 2.1 Create Export Slice

**File:** `src/store/slices/exportAutomationSlice.ts`

```typescript
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type {
  ExportSchedule,
  ExportHistory,
  ExportNotificationSettings,
  ExportStatistics,
  CreateSchedulePayload,
} from '../../types/exports'
import * as exportService from '../../services/exportAutomationService'

interface ExportAutomationState {
  schedules: ExportSchedule[]
  schedulesLoading: boolean
  schedulesError: string | null
  
  history: ExportHistory[]
  historyCount: number
  historyPage: number
  historyPageSize: number
  historyLoading: boolean
  historyError: string | null
  
  statistics: ExportStatistics | null
  statisticsLoading: boolean
  
  notifications: ExportNotificationSettings | null
  notificationsLoading: boolean
}

const initialState: ExportAutomationState = {
  schedules: [],
  schedulesLoading: false,
  schedulesError: null,
  
  history: [],
  historyCount: 0,
  historyPage: 1,
  historyPageSize: 20,
  historyLoading: false,
  historyError: null,
  
  statistics: null,
  statisticsLoading: false,
  
  notifications: null,
  notificationsLoading: false,
}

// Async thunks
export const fetchSchedules = createAsyncThunk(
  'exportAutomation/fetchSchedules',
  async (params?: { is_active?: boolean; export_type?: string }) => {
    return await exportService.listSchedules(params)
  }
)

export const createSchedule = createAsyncThunk(
  'exportAutomation/createSchedule',
  async (payload: CreateSchedulePayload) => {
    return await exportService.createSchedule(payload)
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

export const fetchHistory = createAsyncThunk(
  'exportAutomation/fetchHistory',
  async (params?: {
    export_type?: string
    status?: string
    page?: number
    page_size?: number
  }) => {
    return await exportService.listExportHistory(params)
  }
)

export const fetchStatistics = createAsyncThunk(
  'exportAutomation/fetchStatistics',
  async () => {
    return await exportService.getExportStatistics()
  }
)

export const fetchNotifications = createAsyncThunk(
  'exportAutomation/fetchNotifications',
  async () => {
    return await exportService.getNotificationSettings()
  }
)

export const updateNotifications = createAsyncThunk(
  'exportAutomation/updateNotifications',
  async (settings: ExportNotificationSettings) => {
    return await exportService.updateNotificationSettings(settings)
  }
)

const exportAutomationSlice = createSlice({
  name: 'exportAutomation',
  initialState,
  reducers: {
    setHistoryPage: (state, action: PayloadAction<number>) => {
      state.historyPage = action.payload
    },
    setHistoryPageSize: (state, action: PayloadAction<number>) => {
      state.historyPageSize = action.payload
    },
  },
  extraReducers: (builder) => {
    // Schedules
    builder
      .addCase(fetchSchedules.pending, (state) => {
        state.schedulesLoading = true
        state.schedulesError = null
      })
      .addCase(fetchSchedules.fulfilled, (state, action) => {
        state.schedulesLoading = false
        state.schedules = action.payload
      })
      .addCase(fetchSchedules.rejected, (state, action) => {
        state.schedulesLoading = false
        state.schedulesError = action.error.message || 'Failed to load schedules'
      })
      
    // Create schedule
    builder
      .addCase(createSchedule.fulfilled, (state, action) => {
        state.schedules.push(action.payload)
      })
      
    // Delete schedule
    builder
      .addCase(deleteSchedule.fulfilled, (state, action) => {
        state.schedules = state.schedules.filter(s => s.id !== action.payload)
      })
      
    // Activate/Deactivate
    builder
      .addCase(activateSchedule.fulfilled, (state, action) => {
        const index = state.schedules.findIndex(s => s.id === action.payload.id)
        if (index !== -1) {
          state.schedules[index] = action.payload
        }
      })
      .addCase(deactivateSchedule.fulfilled, (state, action) => {
        const index = state.schedules.findIndex(s => s.id === action.payload.id)
        if (index !== -1) {
          state.schedules[index] = action.payload
        }
      })
      
    // History
    builder
      .addCase(fetchHistory.pending, (state) => {
        state.historyLoading = true
        state.historyError = null
      })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        state.historyLoading = false
        state.history = action.payload.results
        state.historyCount = action.payload.count
      })
      .addCase(fetchHistory.rejected, (state, action) => {
        state.historyLoading = false
        state.historyError = action.error.message || 'Failed to load history'
      })
      
    // Statistics
    builder
      .addCase(fetchStatistics.pending, (state) => {
        state.statisticsLoading = true
      })
      .addCase(fetchStatistics.fulfilled, (state, action) => {
        state.statisticsLoading = false
        state.statistics = action.payload
      })
      
    // Notifications
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.notificationsLoading = true
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.notificationsLoading = false
        state.notifications = action.payload
      })
      .addCase(updateNotifications.fulfilled, (state, action) => {
        state.notifications = action.payload
      })
  },
})

export const { setHistoryPage, setHistoryPageSize } = exportAutomationSlice.actions
export default exportAutomationSlice.reducer

// Selectors
export const selectSchedules = (state: { exportAutomation: ExportAutomationState }) =>
  state.exportAutomation.schedules
export const selectSchedulesLoading = (state: { exportAutomation: ExportAutomationState }) =>
  state.exportAutomation.schedulesLoading
export const selectHistory = (state: { exportAutomation: ExportAutomationState }) =>
  state.exportAutomation.history
export const selectHistoryLoading = (state: { exportAutomation: ExportAutomationState }) =>
  state.exportAutomation.historyLoading
export const selectStatistics = (state: { exportAutomation: ExportAutomationState }) =>
  state.exportAutomation.statistics
export const selectNotifications = (state: { exportAutomation: ExportAutomationState }) =>
  state.exportAutomation.notifications
```

---

## Phase 3: UI Components

### 3.1 Schedule Management Page

**File:** `src/features/exports/pages/ExportSchedulesPage.tsx`

```typescript
import { useEffect, useState } from 'react'
import { Card, Button, Table, Badge, Spinner } from 'react-bootstrap'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import {
  fetchSchedules,
  deleteSchedule,
  activateSchedule,
  deactivateSchedule,
  selectSchedules,
  selectSchedulesLoading,
} from '../../../store/slices/exportAutomationSlice'
import { ScheduleFormModal } from '../components/ScheduleFormModal'
import type { ExportSchedule } from '../../../types/exports'

export function ExportSchedulesPage() {
  const dispatch = useAppDispatch()
  const schedules = useAppSelector(selectSchedules)
  const loading = useAppSelector(selectSchedulesLoading)
  
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ExportSchedule | null>(null)
  
  useEffect(() => {
    void dispatch(fetchSchedules())
  }, [dispatch])
  
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this schedule?')) {
      await dispatch(deleteSchedule(id))
    }
  }
  
  const handleToggleActive = async (schedule: ExportSchedule) => {
    if (schedule.is_active) {
      await dispatch(deactivateSchedule(schedule.id))
    } else {
      await dispatch(activateSchedule(schedule.id))
    }
  }
  
  return (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Export Schedules</h5>
        <Button onClick={() => setShowCreateModal(true)}>
          Create Schedule
        </Button>
      </Card.Header>
      
      <Card.Body>
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center text-muted py-5">
            <p>No schedules configured</p>
            <Button onClick={() => setShowCreateModal(true)}>
              Create Your First Schedule
            </Button>
          </div>
        ) : (
          <Table responsive hover>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Format</th>
                <th>Frequency</th>
                <th>Status</th>
                <th>Next Run</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule) => (
                <tr key={schedule.id}>
                  <td><strong>{schedule.name}</strong></td>
                  <td>{schedule.export_type}</td>
                  <td>{schedule.format.toUpperCase()}</td>
                  <td>{schedule.frequency}</td>
                  <td>
                    <Badge bg={schedule.is_active ? 'success' : 'secondary'}>
                      {schedule.status_display}
                    </Badge>
                  </td>
                  <td className="small text-muted">{schedule.next_run_display}</td>
                  <td>
                    <div className="d-flex gap-2">
                      <Button
                        size="sm"
                        variant={schedule.is_active ? 'warning' : 'success'}
                        onClick={() => handleToggleActive(schedule)}
                      >
                        {schedule.is_active ? 'Pause' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => setEditingSchedule(schedule)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => handleDelete(schedule.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
      
      <ScheduleFormModal
        show={showCreateModal || !!editingSchedule}
        schedule={editingSchedule}
        onHide={() => {
          setShowCreateModal(false)
          setEditingSchedule(null)
        }}
        onSuccess={() => {
          setShowCreateModal(false)
          setEditingSchedule(null)
          void dispatch(fetchSchedules())
        }}
      />
    </Card>
  )
}
```

---

## Implementation Checklist

### Week 1: Foundation
- [ ] Create type definitions (`src/types/exports.ts`)
- [ ] Create API service (`src/services/exportAutomationService.ts`)
- [ ] Create Redux slice (`src/store/slices/exportAutomationSlice.ts`)
- [ ] Add slice to store configuration
- [ ] Test API service with Postman/curl

### Week 2: UI Components
- [ ] Create ScheduleFormModal component
- [ ] Create ExportSchedulesPage
- [ ] Create ExportHistoryPage
- [ ] Create ExportStatisticsCard component
- [ ] Add routes to router configuration

### Week 3: Polish & Testing
- [ ] Add notification settings page
- [ ] Implement file download functionality
- [ ] Add loading states and error handling
- [ ] Test all CRUD operations
- [ ] Test pagination
- [ ] Test filters
- [ ] Write unit tests
- [ ] Update navigation menu

---

## Next Steps

1. **Review this implementation plan** with the team
2. **Set up development environment** with backend API access
3. **Begin Phase 1** - Type definitions and API service
4. **Test API integration** before proceeding to UI
5. **Implement UI components** incrementally
6. **Conduct user acceptance testing**

---

**Documentation References:**
- Quick Reference: `EXPORT-AUTOMATION-QUICK-REFERENCE.md`
- Backend API: Contact backend team for endpoint documentation

**Status:** Ready to begin implementation
**Last Updated:** October 12, 2025
