import { type ChangeEvent, memo, useState, useEffect, useRef } from 'react'
import Alert from 'react-bootstrap/Alert'
import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Spinner from 'react-bootstrap/Spinner'
import Table from 'react-bootstrap/Table'
import type { TransferRequest, Storefront } from '../../../../types/inventory.js'

interface StockRequestListProps {
  requests: TransferRequest[]
  storefronts: Storefront[]
  isLoading: boolean
  error: string | null
  pagination: {
    count: number
    page: number
    pageSize: number
    totalPages: number
  }
  filters: {
    status: string | null
    storefront: string | null
    priority: string | null
    search: string
  }
  onFilterChange: (filters: Partial<{
    status: string | null
    storefront: string | null
    priority: string | null
    search: string
  }>) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onRefresh: () => void
  onViewDetail?: (request: TransferRequest) => void
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'NEW':
      return <Badge bg="info">New</Badge>
    case 'ASSIGNED':
      return <Badge bg="warning">Assigned</Badge>
    case 'FULFILLED':
      return <Badge bg="success">Fulfilled</Badge>
    case 'CANCELLED':
      return <Badge bg="secondary">Cancelled</Badge>
    default:
      return <Badge bg="secondary">{status}</Badge>
  }
}

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'HIGH':
      return <Badge bg="danger">High</Badge>
    case 'MEDIUM':
      return <Badge bg="warning">Medium</Badge>
    case 'LOW':
      return <Badge bg="secondary">Low</Badge>
    default:
      return <Badge bg="secondary">{priority}</Badge>
  }
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const StockRequestList = ({
  requests,
  storefronts,
  isLoading,
  error,
  pagination,
  filters,
  onFilterChange,
  onPageChange,
  onPageSizeChange,
  onRefresh,
  onViewDetail,
}: StockRequestListProps) => {
  const { page, pageSize, totalPages, count } = pagination
  const showingFrom = count === 0 ? 0 : (page - 1) * pageSize + 1
  const showingTo = Math.min(page * pageSize, count)

  // Local state for search input to prevent losing focus
  const [searchQuery, setSearchQuery] = useState(filters.search)
  const debounceTimerRef = useRef<number | null>(null)
  const isUserTypingRef = useRef(false)

  // Sync local state when filters.search changes from outside (e.g., reset button)
  useEffect(() => {
    // Only update if we're not currently typing
    if (!isUserTypingRef.current && filters.search !== searchQuery) {
      setSearchQuery(filters.search)
    }
  }, [filters.search, searchQuery])

  // Handle search input change
  const handleSearchChange = (value: string) => {
    isUserTypingRef.current = true
    setSearchQuery(value)

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      onFilterChange({ search: value })
      isUserTypingRef.current = false
    }, 500)
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const handlePageSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(event.target.value)
    if (!Number.isNaN(newSize) && newSize > 0) {
      onPageSizeChange(newSize)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h5 className="mb-0">Filters</h5>
          <Button variant="outline-secondary" size="sm" onClick={onRefresh} disabled={isLoading}>
            Refresh
          </Button>
        </div>

        <div className="row g-3">
          <Form.Group className="col-md-3" controlId="filterSearch">
            <Form.Label>Search</Form.Label>
            <Form.Control
              type="search"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              disabled={isLoading}
            />
          </Form.Group>

          <Form.Group className="col-md-3" controlId="filterStatus">
            <Form.Label>Status</Form.Label>
            <Form.Select
              value={filters.status || ''}
              onChange={(e) => onFilterChange({ status: e.target.value || null })}
              disabled={isLoading}
            >
              <option value="">All statuses</option>
              <option value="NEW">New</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="FULFILLED">Fulfilled</option>
              <option value="CANCELLED">Cancelled</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="col-md-3" controlId="filterStorefront">
            <Form.Label>Storefront</Form.Label>
            <Form.Select
              value={filters.storefront || ''}
              onChange={(e) => onFilterChange({ storefront: e.target.value || null })}
              disabled={isLoading}
            >
              <option value="">All storefronts</option>
              {storefronts.map((sf) => (
                <option key={sf.id} value={sf.id}>
                  {sf.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="col-md-3" controlId="filterPriority">
            <Form.Label>Priority</Form.Label>
            <Form.Select
              value={filters.priority || ''}
              onChange={(e) => onFilterChange({ priority: e.target.value || null })}
              disabled={isLoading}
            >
              <option value="">All priorities</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </Form.Select>
          </Form.Group>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h5 className="mb-0">Stock requests</h5>
            <p className="mb-0 text-sm text-slate-600">
              Showing {showingFrom.toLocaleString()}–{showingTo.toLocaleString()} of {count.toLocaleString()}
            </p>
          </div>
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Spinner animation="border" size="sm" />
              Loading...
            </div>
          )}
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        <div className="max-w-full overflow-x-auto">
          <Table responsive hover size="sm">
            <thead>
              <tr>
                <th>Storefront</th>
                <th>Type</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Requested by</th>
                <th>Items</th>
                <th>Created</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-sm text-slate-500">
                    {isLoading ? 'Loading stock requests...' : 'No stock requests found.'}
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id}>
                    <td className="font-medium">{request.storefront_name}</td>
                    <td>
                      {(request.direction || 'FORWARD') === 'FORWARD' ? (
                        <Badge bg="primary" className="text-xs">Request</Badge>
                      ) : (
                        <Badge bg="warning" className="text-xs">Return</Badge>
                      )}
                    </td>
                    <td>{getStatusBadge(request.status)}</td>
                    <td>{getPriorityBadge(request.priority)}</td>
                    <td>{request.requested_by_name}</td>
                    <td>{request.line_items?.length || 0} items</td>
                    <td>{formatDate(request.created_at)}</td>
                    <td className="text-end">
                      {onViewDetail && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => onViewDetail(request)}
                        >
                          View
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
          <Form.Select
            size="sm"
            className="w-auto"
            value={pageSize}
            onChange={handlePageSizeChange}
            disabled={isLoading}
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </Form.Select>

          <div className="flex items-center gap-2">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={isLoading || page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm text-slate-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={isLoading || page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(StockRequestList)
