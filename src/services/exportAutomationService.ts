/**
 * Export Automation API Service
 * 
 * Service layer for interacting with the Export Automation backend API.
 * Base URL: /reports/api/automation/
 * 
 * All requests require authentication via JWT token (handled by httpClient).
 */

import httpClient from './httpClient.js'
import type {
  ExportSchedule,
  ExportHistory,
  ExportNotificationSettings,
  ExportStatistics,
  PaginatedExportHistory,
  CreateSchedulePayload,
  TriggerSchedulePayload,
  ScheduleListParams,
  HistoryListParams,
} from '../types/exports'

const BASE_URL = '/reports/api/automation'

// ==================== Export Schedules ====================

/**
 * List all export schedules
 */
export async function listSchedules(params?: ScheduleListParams): Promise<ExportSchedule[]> {
  const response = await httpClient.get<ExportSchedule[]>(`${BASE_URL}/schedules/`, { params })
  return response.data
}

/**
 * Get a single schedule by ID
 */
export async function getSchedule(id: string): Promise<ExportSchedule> {
  const response = await httpClient.get<ExportSchedule>(`${BASE_URL}/schedules/${id}/`)
  return response.data
}

/**
 * Create a new export schedule
 */
export async function createSchedule(data: CreateSchedulePayload): Promise<ExportSchedule> {
  const response = await httpClient.post<ExportSchedule>(`${BASE_URL}/schedules/`, data)
  return response.data
}

/**
 * Update an existing schedule (full update)
 */
export async function updateSchedule(
  id: string,
  data: CreateSchedulePayload
): Promise<ExportSchedule> {
  const response = await httpClient.put<ExportSchedule>(`${BASE_URL}/schedules/${id}/`, data)
  return response.data
}

/**
 * Partially update a schedule
 */
export async function partialUpdateSchedule(
  id: string,
  data: Partial<CreateSchedulePayload>
): Promise<ExportSchedule> {
  const response = await httpClient.patch<ExportSchedule>(`${BASE_URL}/schedules/${id}/`, data)
  return response.data
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(id: string): Promise<void> {
  await httpClient.delete(`${BASE_URL}/schedules/${id}/`)
}

/**
 * Activate a schedule
 */
export async function activateSchedule(id: string): Promise<ExportSchedule> {
  const response = await httpClient.post<ExportSchedule>(`${BASE_URL}/schedules/${id}/activate/`)
  return response.data
}

/**
 * Deactivate a schedule
 */
export async function deactivateSchedule(id: string): Promise<ExportSchedule> {
  const response = await httpClient.post<ExportSchedule>(`${BASE_URL}/schedules/${id}/deactivate/`)
  return response.data
}

/**
 * Manually trigger a schedule to run now
 */
export async function triggerSchedule(
  id: string,
  payload?: Omit<TriggerSchedulePayload, 'schedule_id'>
): Promise<ExportHistory> {
  const response = await httpClient.post<ExportHistory>(`${BASE_URL}/schedules/${id}/trigger/`, {
    schedule_id: id,
    ...payload,
  })
  return response.data
}

/**
 * Get upcoming scheduled exports (next 10)
 */
export async function getUpcomingExports(): Promise<ExportSchedule[]> {
  const response = await httpClient.get<ExportSchedule[]>(`${BASE_URL}/schedules/upcoming/`)
  return response.data
}

/**
 * Get overdue scheduled exports
 */
export async function getOverdueExports(): Promise<ExportSchedule[]> {
  const response = await httpClient.get<ExportSchedule[]>(`${BASE_URL}/schedules/overdue/`)
  return response.data
}

// ==================== Export History ====================

/**
 * List export history with pagination and filters
 */
export async function listExportHistory(
  params?: HistoryListParams
): Promise<PaginatedExportHistory> {
  const response = await httpClient.get<PaginatedExportHistory>(`${BASE_URL}/history/`, { params })
  return response.data
}

/**
 * Get a single export history record by ID
 */
export async function getExportHistory(id: string): Promise<ExportHistory> {
  const response = await httpClient.get<ExportHistory>(`${BASE_URL}/history/${id}/`)
  return response.data
}

/**
 * Download an export file
 * Returns a Blob that can be used to trigger a browser download
 */
export async function downloadExport(id: string): Promise<Blob> {
  const response = await httpClient.get<Blob>(`${BASE_URL}/history/${id}/download/`, {
    responseType: 'blob',
  })
  return response.data
}

/**
 * Get export statistics
 */
export async function getExportStatistics(): Promise<ExportStatistics> {
  const response = await httpClient.get<ExportStatistics>(`${BASE_URL}/history/statistics/`)
  return response.data
}

/**
 * Get recent exports (last 10)
 */
export async function getRecentExports(): Promise<ExportHistory[]> {
  const response = await httpClient.get<ExportHistory[]>(`${BASE_URL}/history/recent/`)
  return response.data
}

// ==================== Notifications ====================

/**
 * Get notification settings for the current business
 */
export async function getNotificationSettings(): Promise<ExportNotificationSettings> {
  const response = await httpClient.get<ExportNotificationSettings>(`${BASE_URL}/notifications/`)
  return response.data
}

/**
 * Update notification settings
 */
export async function updateNotificationSettings(
  data: ExportNotificationSettings
): Promise<ExportNotificationSettings> {
  const response = await httpClient.put<ExportNotificationSettings>(
    `${BASE_URL}/notifications/`,
    data
  )
  return response.data
}

// ==================== Utility Functions ====================

/**
 * Trigger a file download in the browser from a Blob
 * Extracts filename from Content-Disposition header if available
 */
export function triggerFileDownload(blob: Blob, defaultFilename: string): void {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = defaultFilename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

/**
 * Download an export and trigger browser download
 * Complete workflow for downloading an export file
 */
export async function downloadAndSaveExport(historyId: string, filename?: string): Promise<void> {
  const blob = await downloadExport(historyId)
  const defaultName = filename || `export_${historyId}.xlsx`
  triggerFileDownload(blob, defaultName)
}
