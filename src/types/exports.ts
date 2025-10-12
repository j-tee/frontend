/**
 * Export Automation Type Definitions
 * 
 * These types match the backend API responses for the Export Automation system.
 * Backend API: /api/reports/automation/
 */

export type ExportType = 'SALES' | 'CUSTOMERS' | 'INVENTORY' | 'AUDIT_LOGS'
export type ExportFormat = 'excel' | 'csv' | 'pdf'
export type ExportFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY'
export type ExportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EMAILED'
export type ExportTrigger = 'MANUAL' | 'SCHEDULED' | 'API'

/**
 * Export Schedule - Automated export configuration
 */
export interface ExportSchedule {
  id: string
  name: string
  export_type: ExportType
  format: ExportFormat
  frequency: ExportFrequency
  hour: number // 0-23 (UTC)
  day_of_week: number | null // 0-6 (Monday-Sunday), required for WEEKLY
  day_of_month: number | null // 1-28, required for MONTHLY
  recipients: string[] // Email addresses
  include_creator_email: boolean
  email_subject: string
  email_message: string
  filters: Record<string, unknown> // Export-specific filters
  is_active: boolean
  last_run_at: string | null
  next_run_at: string | null
  created_at: string
  updated_at: string
  created_by: string
  created_by_name: string
  // Computed fields
  next_run_display: string // "In 2 hours"
  last_run_display: string // "2 days ago"
  status_display: string // "Active", "Inactive", "Overdue"
}

/**
 * Export History - Record of export execution
 */
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
  file_size: number // bytes
  file_path: string
  record_count: number
  filters_applied: Record<string, unknown>
  email_sent: boolean
  email_recipients: string[]
  email_sent_at: string | null
  error_message: string | null
  error_traceback: string | null
  user: string
  user_name: string
  schedule: string | null
  schedule_name: string | null
  // Computed fields
  duration_display: string // "45s", "2m 15s"
  file_size_display: string // "1.5 MB"
  status_display: string
  duration_seconds: number
  file_size_mb: number
}

/**
 * Notification Settings - Email preferences per business
 */
export interface ExportNotificationSettings {
  notify_on_success: boolean
  notify_on_failure: boolean
  default_recipients: string[]
  from_name: string
  reply_to_email: string
}

/**
 * Export Statistics - Aggregated metrics
 */
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

/**
 * Paginated response for export history
 */
export interface PaginatedExportHistory {
  count: number
  next: string | null
  previous: string | null
  results: ExportHistory[]
}

/**
 * Payload for creating a new schedule
 */
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
  filters: Record<string, unknown>
  is_active?: boolean
}

/**
 * Payload for manually triggering a schedule
 */
export interface TriggerSchedulePayload {
  schedule_id: string
  send_email?: boolean
  override_recipients?: string[]
}

/**
 * Query parameters for listing schedules
 */
export interface ScheduleListParams {
  is_active?: boolean
  export_type?: ExportType
  frequency?: ExportFrequency
}

/**
 * Query parameters for listing export history
 */
export interface HistoryListParams {
  export_type?: ExportType
  format?: ExportFormat
  status?: ExportStatus
  trigger?: ExportTrigger
  schedule_id?: string
  start_date?: string
  end_date?: string
  page?: number
  page_size?: number
}
