import Alert from 'react-bootstrap/Alert'
import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
import Spinner from 'react-bootstrap/Spinner'
import Table from 'react-bootstrap/Table'
import type { TransferRequest } from '../../../../types/inventory.js'

interface StockRequestDetailModalProps {
  show: boolean
  request: TransferRequest | null
  onClose: () => void
  onCancel?: (requestId: string, reason?: string) => Promise<void>
  onFulfill?: (requestId: string) => Promise<void>
  isCancelling?: boolean
  isFulfilling?: boolean
  cancelError?: string | null
  fulfillError?: string | null
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
  isCancelling = false,
  isFulfilling = false,
  cancelError,
  fulfillError,
}: StockRequestDetailModalProps) => {
  if (!request) return null

  const canCancel = (request.status === 'NEW' || request.status === 'ASSIGNED') && onCancel
  const canFulfill = (request.status === 'ASSIGNED') && onFulfill

  const handleCancel = async () => {
    if (!onCancel) return
    await onCancel(request.id)
  }

  const handleFulfill = async () => {
    if (!onFulfill) return
    await onFulfill(request.id)
  }

  return (
    <Modal show={show} onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Stock request details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {cancelError && <Alert variant="danger">{cancelError}</Alert>}
        {fulfillError && <Alert variant="danger">{fulfillError}</Alert>}

        <div className="mb-4">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label text-muted small">Storefront</label>
              <div className="fw-semibold">{request.storefront_name}</div>
            </div>
            <div className="col-md-3">
              <label className="form-label text-muted small">Status</label>
              <div>{getStatusBadge(request.status)}</div>
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
                <th className="text-end">Approved</th>
                <th className="text-end">Fulfilled</th>
                <th>Unit</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {request.line_items?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-3">
                    No line items found.
                  </td>
                </tr>
              ) : (
                request.line_items?.map((item) => (
                  <tr key={item.id}>
                    <td className="fw-semibold">{item.product_name}</td>
                    <td className="text-end">{item.requested_quantity}</td>
                    <td className="text-end">{item.approved_quantity ?? '—'}</td>
                    <td className="text-end">{item.fulfilled_quantity ?? '—'}</td>
                    <td>{item.unit_of_measure}</td>
                    <td className="text-muted small">{item.notes || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose}>
          Close
        </Button>
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
