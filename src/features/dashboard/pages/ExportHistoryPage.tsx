import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Form, Spinner, Table, Pagination } from 'react-bootstrap'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import {
  fetchExportHistory,
  downloadExport,
  selectExportHistory,
  selectHistoryLoading,
  selectHistoryError,
  selectHistoryPagination,
  selectDownloadingExportId,
  setHistoryPage,
  setHistoryPageSize,
  clearHistoryError,
} from '../../../store/slices/exportAutomationSlice'
import type { ExportStatus, HistoryListParams } from '../../../types/exports'

const ExportHistoryPage = () => {
  const dispatch = useAppDispatch()
  const history = useAppSelector(selectExportHistory)
  const loading = useAppSelector(selectHistoryLoading)
  const error = useAppSelector(selectHistoryError)
  const pagination = useAppSelector(selectHistoryPagination)
  const downloadingId = useAppSelector(selectDownloadingExportId)

  const [filters, setLocalFilters] = useState<HistoryListParams>({})

  const loadHistory = () => {
    dispatch(
      fetchExportHistory({
        page: pagination.currentPage,
        page_size: pagination.pageSize,
        ...filters,
      })
    )
  }

  useEffect(() => {
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.currentPage, pagination.pageSize, filters])

  const handleFilterChange = (field: keyof HistoryListParams) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = event.target.value
    setLocalFilters((prev) => ({
      ...prev,
      [field]: value || undefined,
    }))
    dispatch(setHistoryPage(1)) // Reset to first page on filter change
  }

  const handleClearFilters = () => {
    setLocalFilters({})
    dispatch(setHistoryPage(1))
  }

  const handleDownload = async (exportId: string, filename?: string) => {
    try {
      await dispatch(downloadExport({ id: exportId, filename })).unwrap()
    } catch (err) {
      alert('Failed to download file. Please try again.')
    }
  }

  const handlePageChange = (page: number) => {
    dispatch(setHistoryPage(page))
  }

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(setHistoryPageSize(parseInt(event.target.value, 10)))
  }

  const getStatusBadge = (status: ExportStatus) => {
    const variants: Record<ExportStatus, string> = {
      PENDING: 'secondary',
      PROCESSING: 'warning',
      COMPLETED: 'success',
      FAILED: 'danger',
      EMAILED: 'info',
    }
    return <Badge bg={variants[status]}>{status}</Badge>
  }

  const getTriggerBadge = (trigger: string) => {
    const variants: Record<string, string> = {
      MANUAL: 'primary',
      SCHEDULED: 'success',
      API: 'info',
    }
    return <Badge bg={variants[trigger] || 'secondary'}>{trigger}</Badge>
  }

  const formatFileSize = (bytes: number | null | undefined): string => {
    if (!bytes) return '—'
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    return `${(kb / 1024).toFixed(2)} MB`
  }

  const totalPages = Math.ceil(pagination.count / pagination.pageSize)

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">Export History</h2>
        <p className="text-slate-600 mb-0">
          View and download your past exports. All export files are stored for 30 days.
        </p>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => dispatch(clearHistoryError())}>
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <Form.Group>
                <Form.Label className="small fw-semibold">Export Type</Form.Label>
                <Form.Select
                  size="sm"
                  value={filters.export_type || ''}
                  onChange={handleFilterChange('export_type')}
                >
                  <option value="">All Types</option>
                  <option value="SALES">Sales</option>
                  <option value="CUSTOMERS">Customers</option>
                  <option value="INVENTORY">Inventory</option>
                  <option value="AUDIT_LOGS">Audit Logs</option>
                </Form.Select>
              </Form.Group>
            </div>

            <div className="col-md-3">
              <Form.Group>
                <Form.Label className="small fw-semibold">Status</Form.Label>
                <Form.Select size="sm" value={filters.status || ''} onChange={handleFilterChange('status')}>
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                  <option value="EMAILED">Emailed</option>
                </Form.Select>
              </Form.Group>
            </div>

            <div className="col-md-3">
              <Form.Group>
                <Form.Label className="small fw-semibold">Trigger</Form.Label>
                <Form.Select
                  size="sm"
                  value={filters.trigger || ''}
                  onChange={handleFilterChange('trigger')}
                >
                  <option value="">All Triggers</option>
                  <option value="MANUAL">Manual</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="API">API</option>
                </Form.Select>
              </Form.Group>
            </div>

            <div className="col-md-3 d-flex align-items-end">
              <Button variant="outline-secondary" size="sm" onClick={handleClearFilters} className="w-100">
                <i className="bi bi-x-circle me-2"></i>
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Info */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="text-muted small">
          Showing {history.length > 0 ? (pagination.currentPage - 1) * pagination.pageSize + 1 : 0} to{' '}
          {Math.min(pagination.currentPage * pagination.pageSize, pagination.count)} of {pagination.count}{' '}
          exports
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted small">Show:</span>
          <Form.Select size="sm" style={{ width: 'auto' }} onChange={handlePageSizeChange} value={pagination.pageSize}>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </Form.Select>
          <span className="text-muted small">per page</span>
        </div>
      </div>

      {/* Table */}
      {loading && !history.length ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading export history...</span>
          </Spinner>
          <p className="text-muted mt-3">Loading export history...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-clock-history" style={{ fontSize: '4rem', color: '#6c757d' }}></i>
          <h4 className="mt-3 text-muted">No export history found</h4>
          <p className="text-muted">
            {Object.keys(filters).length > 0
              ? 'Try adjusting your filters to see more results.'
              : 'Create an export schedule or trigger a manual export to get started.'}
          </p>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Format</th>
                  <th>Trigger</th>
                  <th>Created</th>
                  <th>Completed</th>
                  <th>File Size</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((export_item) => (
                  <tr key={export_item.id}>
                    <td>{getStatusBadge(export_item.status)}</td>
                    <td>
                      <Badge bg="info">{export_item.export_type}</Badge>
                    </td>
                    <td>
                      <span className="text-uppercase small">{export_item.format}</span>
                    </td>
                    <td>{getTriggerBadge(export_item.trigger)}</td>
                    <td className="small">
                      {new Date(export_item.created_at).toLocaleString()}
                    </td>
                    <td className="small">
                      {export_item.completed_at ? (
                        new Date(export_item.completed_at).toLocaleString()
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="small text-muted">{formatFileSize(export_item.file_size)}</td>
                    <td>
                      {export_item.status === 'COMPLETED' && export_item.file_path ? (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleDownload(export_item.id, export_item.file_name)}
                          disabled={downloadingId === export_item.id}
                        >
                          {downloadingId === export_item.id ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-2" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-download me-2"></i>
                              Download
                            </>
                          )}
                        </Button>
                      ) : export_item.status === 'FAILED' ? (
                        <span className="text-danger small">
                          <i className="bi bi-exclamation-circle me-1"></i>
                          {export_item.error_message || 'Export failed'}
                        </span>
                      ) : (
                        <span className="text-muted small">
                          <i className="bi bi-hourglass-split me-1"></i>
                          {export_item.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <Pagination>
                <Pagination.First
                  onClick={() => handlePageChange(1)}
                  disabled={pagination.currentPage === 1}
                />
                <Pagination.Prev
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                />

                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (pagination.currentPage <= 3) {
                    pageNum = i + 1
                  } else if (pagination.currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = pagination.currentPage - 2 + i
                  }

                  return (
                    <Pagination.Item
                      key={pageNum}
                      active={pageNum === pagination.currentPage}
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Pagination.Item>
                  )
                })}

                <Pagination.Next
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === totalPages}
                />
                <Pagination.Last
                  onClick={() => handlePageChange(totalPages)}
                  disabled={pagination.currentPage === totalPages}
                />
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ExportHistoryPage
