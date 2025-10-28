import { useState, useEffect } from 'react'
import Alert from 'react-bootstrap/Alert'
import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'
import Dropdown from 'react-bootstrap/Dropdown'
import Modal from 'react-bootstrap/Modal'
import Spinner from 'react-bootstrap/Spinner'
import Table from 'react-bootstrap/Table'
import type { TransferRequest, StorefrontAvailabilityResponse } from '../../../../types/inventory.js'
import usePermissions from '../../../../hooks/usePermissions.js'
import { useCanEditFulfilled } from '../../../../hooks/index.js'
import { fetchStorefrontAvailability } from '../../../../services/inventoryService.js'

interface StockRequestDetailModalProps {
  show: boolean
  request: TransferRequest | null
  onClose: () => void
  onCancel?: (requestId: string, reason?: string) => Promise<void>
  onFulfill?: (requestId: string) => Promise<void>
  onUpdateStatus?: (requestId: string, status: string, force?: boolean) => Promise<void>
  onEditFulfilled?: (requestId: string) => void
  isCancelling?: boolean
  isFulfilling?: boolean
  isUpdatingStatus?: boolean
  cancelError?: string | null
  fulfillError?: string | null
  updateStatusError?: string | null
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

const StockRequestDetailModal = ({
  show,
  request,
  onClose,
  onCancel,
  onFulfill,
  onUpdateStatus,
  onEditFulfilled,
  isCancelling = false,
  isFulfilling = false,
  isUpdatingStatus = false,
  cancelError,
  fulfillError,
  updateStatusError,
}: StockRequestDetailModalProps) => {
  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const [targetStatus, setTargetStatus] = useState<string>('')
  const [availabilityData, setAvailabilityData] = useState<Map<string, StorefrontAvailabilityResponse>>(new Map())
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const permissions = usePermissions()
  const canEditFulfilled = useCanEditFulfilled()

  // Fetch current availability for fulfilled requests
  useEffect(() => {
    if (!request || request.status !== 'FULFILLED' || !request.storefront || !request.line_items?.length) {
      setAvailabilityData(new Map())
      return
    }

    let isCancelled = false
    setLoadingAvailability(true)

    const fetchAvailability = async () => {
      try {
        const results = await Promise.all(
          request.line_items.map(async (item) => {
            try {
              const data = await fetchStorefrontAvailability(request.storefront, item.product)
              return [item.product, data] as const
            } catch (error) {
              console.error(`Failed to fetch availability for product ${item.product}:`, error)
              return null
            }
          })
        )

        if (!isCancelled) {
          const availabilityMap = new Map(
            results.filter((result): result is [string, StorefrontAvailabilityResponse] => result !== null)
          )
          setAvailabilityData(availabilityMap)
        }
      } catch (error) {
        console.error('Error fetching availability data:', error)
      } finally {
        if (!isCancelled) {
          setLoadingAvailability(false)
        }
      }
    }

    void fetchAvailability()

    return () => {
      isCancelled = true
    }
  }, [request])

  if (!request) return null

  const canCancel = (request.status === 'NEW' || request.status === 'ASSIGNED') && onCancel
  const canFulfill = (request.status === 'ASSIGNED') && onFulfill
  
  // Privileged users (Manager, Admin, Owner) can manually override status
  // Check using capability instead of direct role comparison for more robust permissions
  const canManageStatus = onUpdateStatus && permissions.can('inventory.requests.manage')
  
  // Only managers/admins/owners can edit fulfilled requests
  const canEdit = request.status === 'FULFILLED' && canEditFulfilled && onEditFulfilled

  const handleCancel = async () => {
    if (!onCancel) return
    await onCancel(request.id)
  }

  const handleFulfill = async () => {
    if (!onFulfill) return
    await onFulfill(request.id)
  }

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === request.status) return
    setTargetStatus(newStatus)
    setShowStatusConfirm(true)
  }

  const confirmStatusChange = async () => {
    if (!onUpdateStatus || !targetStatus) return
    // Use force=true for manual status overrides by managers
    await onUpdateStatus(request.id, targetStatus, true)
    setShowStatusConfirm(false)
    setTargetStatus('')
  }

  const cancelStatusChange = () => {
    setShowStatusConfirm(false)
    setTargetStatus('')
  }

  return (
    <Modal show={show} onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Stock request details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {cancelError && <Alert variant="danger">{cancelError}</Alert>}
        {fulfillError && <Alert variant="danger">{fulfillError}</Alert>}
        {updateStatusError && <Alert variant="danger">{updateStatusError}</Alert>}
        
        {showStatusConfirm && (
          <Alert variant="warning" className="mb-3">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Confirm status change:</strong> Change status from <Badge bg="secondary">{request.status}</Badge> to <Badge bg="primary">{targetStatus}</Badge>?
              </div>
              <div className="btn-group btn-group-sm">
                <Button variant="success" size="sm" onClick={confirmStatusChange} disabled={isUpdatingStatus}>
                  {isUpdatingStatus && <Spinner animation="border" size="sm" className="me-1" />}
                  Confirm
                </Button>
                <Button variant="secondary" size="sm" onClick={cancelStatusChange} disabled={isUpdatingStatus}>
                  Cancel
                </Button>
              </div>
            </div>
          </Alert>
        )}

        <div className="mb-4">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label text-muted small">Storefront</label>
              <div className="fw-semibold">{request.storefront_name}</div>
            </div>
            <div className="col-md-6">
              <label className="form-label text-muted small">Transfer type</label>
              <div>
                {(request.direction || 'FORWARD') === 'FORWARD' ? (
                  <Badge bg="primary">Stock Request (Warehouse → Storefront)</Badge>
                ) : (
                  <Badge bg="warning">Return (Storefront → Warehouse)</Badge>
                )}
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label text-muted small">Status</label>
              <div className="d-flex align-items-center gap-2">
                {getStatusBadge(request.status)}
                {canManageStatus && (
                  <Dropdown onSelect={(eventKey) => handleStatusChange(eventKey || '')}>
                    <Dropdown.Toggle variant="outline-secondary" size="sm" disabled={isUpdatingStatus}>
                      Change
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item eventKey="NEW" active={request.status === 'NEW'}>New</Dropdown.Item>
                      <Dropdown.Item eventKey="ASSIGNED" active={request.status === 'ASSIGNED'}>Assigned</Dropdown.Item>
                      <Dropdown.Item eventKey="FULFILLED" active={request.status === 'FULFILLED'}>Fulfilled</Dropdown.Item>
                      <Dropdown.Item eventKey="CANCELLED" active={request.status === 'CANCELLED'}>Cancelled</Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                )}
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label text-muted small">Priority</label>
              <div>{getPriorityBadge(request.priority)}</div>
            </div>
            <div className="col-md-6">
              <label className="form-label text-muted small">Requested by</label>
              <div>{request.requested_by_name}</div>
            </div>
            <div className="col-md-6">
              <label className="form-label text-muted small">Created</label>
              <div>{formatDate(request.created_at)}</div>
            </div>
            {request.linked_transfer_reference && (
              <div className="col-md-6">
                <label className="form-label text-muted small">Linked transfer</label>
                <div className="font-monospace">{request.linked_transfer_reference}</div>
              </div>
            )}
            {request.assigned_at && (
              <div className="col-md-6">
                <label className="form-label text-muted small">Assigned at</label>
                <div>{formatDate(request.assigned_at)}</div>
              </div>
            )}
            {request.fulfilled_at && (
              <div className="col-md-6">
                <label className="form-label text-muted small">Fulfilled at</label>
                <div>{formatDate(request.fulfilled_at)}</div>
              </div>
            )}
            {request.cancelled_at && (
              <div className="col-md-6">
                <label className="form-label text-muted small">Cancelled at</label>
                <div>{formatDate(request.cancelled_at)}</div>
              </div>
            )}
            {request.notes && (
              <div className="col-12">
                <label className="form-label text-muted small">Notes</label>
                <div className="border rounded p-2 bg-light">{request.notes}</div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-3">
          <h6>Line items ({request.line_items?.length || 0})</h6>
          <Table responsive hover size="sm">
            <thead>
              <tr>
                <th>Product</th>
                <th className="text-end">Requested</th>
                <th>Status</th>
                <th>Units</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {request.line_items?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-3">
                    No line items found.
                  </td>
                </tr>
              ) : (
                request.line_items?.map((item) => (
                  <tr key={item.id}>
                    <td className="fw-semibold">{item.product_name}</td>
                    <td className="text-end">{item.requested_quantity}</td>
                    <td>{item.status ? getStatusBadge(item.status) : getStatusBadge(request.status)}</td>
                    <td>{item.unit_of_measure}</td>
                    <td className="text-muted small">{item.notes || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>

        {/* Current Inventory Status - Only show for fulfilled requests */}
        {request.status === 'FULFILLED' && request.line_items && request.line_items.length > 0 && (
          <div className="mb-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h6 className="mb-0">Current Inventory Status</h6>
              {loadingAvailability && (
                <div className="d-flex align-items-center gap-2 text-muted small">
                  <Spinner animation="border" size="sm" />
                  <span>Loading current stock levels...</span>
                </div>
              )}
            </div>
            
            {!loadingAvailability && availabilityData.size > 0 && (
              <>
                <Table responsive size="sm" className="mb-2">
                  <thead className="table-light">
                    <tr>
                      <th>Product</th>
                      <th className="text-end">Fulfilled Qty</th>
                      <th className="text-end">Currently Available</th>
                      <th className="text-end">Reserved in Carts</th>
                      <th className="text-end">Total Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {request.line_items.map((item) => {
                      const availability = availabilityData.get(item.product)
                      const fulfilledQty = item.fulfilled_quantity || item.requested_quantity
                      const unreservedQty = availability?.unreserved_quantity ? Number(availability.unreserved_quantity) : null
                      const reservedQty = availability?.reserved_quantity ? Number(availability.reserved_quantity) : null
                      const totalAvailable = availability?.total_available ? Number(availability.total_available) : null

                      return (
                        <tr key={item.id}>
                          <td className="fw-semibold">{item.product_name}</td>
                          <td className="text-end">
                            <Badge bg="success">{fulfilledQty}</Badge>
                          </td>
                          <td className="text-end">
                            {unreservedQty !== null ? (
                              <span className={unreservedQty > 0 ? 'text-success fw-semibold' : 'text-danger fw-semibold'}>
                                {unreservedQty}
                              </span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className="text-end">
                            {reservedQty !== null && reservedQty > 0 ? (
                              <Badge bg="warning" text="dark">{reservedQty}</Badge>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className="text-end">
                            {totalAvailable !== null ? (
                              <span className="fw-semibold">{totalAvailable}</span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
                <small className="text-muted">
                  <i className="bi bi-info-circle me-1"></i>
                  Showing real-time inventory as of {new Date().toLocaleString()}
                </small>
              </>
            )}

            {!loadingAvailability && availabilityData.size === 0 && (
              <Alert variant="info" className="mb-0">
                <small>
                  <i className="bi bi-info-circle me-2"></i>
                  Unable to load current inventory data. The stock may have been moved or the storefront might be unavailable.
                </small>
              </Alert>
            )}
          </div>
        )}

      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose}>
          Close
        </Button>
        {canEdit && (
          <Button
            variant="primary"
            onClick={() => onEditFulfilled?.(request.id)}
          >
            Edit Quantities
          </Button>
        )}
        {canCancel && (
          <Button
            variant="outline-danger"
            onClick={handleCancel}
            disabled={isCancelling || isFulfilling}
          >
            {isCancelling && <Spinner animation="border" size="sm" className="me-2" />}
            Cancel request
          </Button>
        )}
        {canFulfill && (
          <Button
            variant="success"
            onClick={handleFulfill}
            disabled={isCancelling || isFulfilling}
          >
            {isFulfilling && <Spinner animation="border" size="sm" className="me-2" />}
            Mark as fulfilled
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  )
}

export default StockRequestDetailModal
