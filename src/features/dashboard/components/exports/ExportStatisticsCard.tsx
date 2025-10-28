import { useEffect } from 'react'
import { Card, Spinner, Alert } from 'react-bootstrap'
import { useAppDispatch, useAppSelector } from '../../../../hooks'
import {
  fetchStatistics,
  selectStatistics,
  selectStatisticsLoading,
  selectStatisticsError,
  clearStatisticsError,
} from '../../../../store/slices/exportAutomationSlice'

export function ExportStatisticsCard() {
  const dispatch = useAppDispatch()
  const statistics = useAppSelector(selectStatistics)
  const loading = useAppSelector(selectStatisticsLoading)
  const error = useAppSelector(selectStatisticsError)

  useEffect(() => {
    dispatch(fetchStatistics())
  }, [dispatch])

  useEffect(() => {
    return () => {
      dispatch(clearStatisticsError())
    }
  }, [dispatch])

  const formatFileSize = (bytes: number | undefined): string => {
    if (!bytes || bytes === 0) return '0 MB'
    const mb = bytes / (1024 * 1024)
    if (mb < 1024) return `${mb.toFixed(2)} MB`
    return `${(mb / 1024).toFixed(2)} GB`
  }

  const getSuccessRate = (): string => {
    if (!statistics || statistics.total_exports === 0) return '0%'
    const rate = (statistics.successful_exports / statistics.total_exports) * 100
    return `${rate.toFixed(1)}%`
  }

  // Safe property access with defaults
  const safeStatistics = statistics ? {
    total_exports: statistics.total_exports ?? 0,
    successful_exports: statistics.successful_exports ?? 0,
    failed_exports: statistics.failed_exports ?? 0,
    total_storage_bytes: statistics.total_storage_bytes ?? 0,
    last_export_at: statistics.last_export_at ?? null,
    active_schedules: statistics.active_schedules ?? 0,
  } : null

  return (
    <Card className="h-100 shadow-sm">
      <Card.Header className="bg-white">
        <h5 className="mb-0 text-slate-900 font-bold">
          <i className="bi bi-graph-up me-2 text-primary"></i>
          Export Statistics
        </h5>
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="warning" dismissible onClose={() => dispatch(clearStatisticsError())} className="mb-3">
            <i className="bi bi-exclamation-triangle me-2"></i>
            <div className="font-medium text-slate-900">Backend Not Available</div>
            <div className="text-sm text-slate-700 mt-1">
              Export Automation API endpoints are not implemented yet. 
              The statistics will be available once the backend is ready.
            </div>
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Loading statistics...</span>
            </Spinner>
            <p className="text-muted mt-2 mb-0">Loading statistics...</p>
          </div>
        ) : !statistics ? (
          <div className="text-center py-4">
            <i className="bi bi-info-circle" style={{ fontSize: '2rem', color: '#6c757d' }}></i>
            <p className="text-muted mt-2 mb-0">
              {error ? 'Statistics unavailable - Backend pending' : 'No statistics available'}
            </p>
          </div>
        ) : (
          <div className="row g-3">
            {/* Total Exports */}
            <div className="col-6">
              <div className="p-3 bg-light rounded">
                <div className="text-muted small mb-1">Total Exports</div>
                <div className="h4 mb-0 text-primary">{safeStatistics?.total_exports.toLocaleString() ?? '0'}</div>
              </div>
            </div>

            {/* Success Rate */}
            <div className="col-6">
              <div className="p-3 bg-light rounded">
                <div className="text-muted small mb-1">Success Rate</div>
                <div className="h4 mb-0 text-success">{getSuccessRate()}</div>
              </div>
            </div>

            {/* Successful Exports */}
            <div className="col-6">
              <div className="p-3 bg-light rounded">
                <div className="text-muted small mb-1">Successful</div>
                <div className="h5 mb-0 text-success">
                  <i className="bi bi-check-circle me-1"></i>
                  {safeStatistics?.successful_exports.toLocaleString() ?? '0'}
                </div>
              </div>
            </div>

            {/* Failed Exports */}
            <div className="col-6">
              <div className="p-3 bg-light rounded">
                <div className="text-muted small mb-1">Failed</div>
                <div className="h5 mb-0 text-danger">
                  <i className="bi bi-x-circle me-1"></i>
                  {safeStatistics?.failed_exports.toLocaleString() ?? '0'}
                </div>
              </div>
            </div>

            {/* Storage Used */}
            <div className="col-12">
              <div className="p-3 bg-light rounded">
                <div className="text-muted small mb-1">Storage Used</div>
                <div className="h5 mb-0 text-info">
                  <i className="bi bi-hdd me-1"></i>
                  {formatFileSize(safeStatistics?.total_storage_bytes)}
                </div>
              </div>
            </div>

            {/* Last Export */}
            <div className="col-12">
              <div className="p-3 bg-light rounded">
                <div className="text-muted small mb-1">Last Export</div>
                <div className="small mb-0">
                  {safeStatistics?.last_export_at ? (
                    <>
                      <i className="bi bi-clock me-1"></i>
                      {new Date(safeStatistics.last_export_at).toLocaleString()}
                    </>
                  ) : (
                    <span className="text-muted">No exports yet</span>
                  )}
                </div>
              </div>
            </div>

            {/* Active Schedules */}
            <div className="col-12">
              <div className="p-3 bg-primary text-white rounded">
                <div className="opacity-75 small mb-1">Active Schedules</div>
                <div className="h4 mb-0">
                  <i className="bi bi-calendar-check me-2"></i>
                  {safeStatistics?.active_schedules.toLocaleString() ?? '0'}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  )
}
