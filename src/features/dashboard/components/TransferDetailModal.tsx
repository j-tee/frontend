import { useState } from 'react'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Badge from 'react-bootstrap/Badge'
import Spinner from 'react-bootstrap/Spinner'
import Alert from 'react-bootstrap/Alert'
import Table from 'react-bootstrap/Table'
import Form from 'react-bootstrap/Form'
import { Trash } from 'react-bootstrap-icons'
import type { WarehouseTransfer } from '../../../types/inventory.js'

interface TransferDetailModalProps {
  show: boolean
  onClose: () => void
  transfer: WarehouseTransfer | null
  isLoading?: boolean
  error?: string | null
  onComplete?: (id: string, notes?: string) => void
  onCancel?: (id: string, reason: string) => void
  onDelete?: (id: string, reason: string) => void
  isCompleting?: boolean
  isCancelling?: boolean
  isDeleting?: boolean
  userRole?: string
}

export default function TransferDetailModal({
  show,
  onClose,
  transfer,
  isLoading = false,
  error = null,
  onComplete,
  onCancel,
  onDelete,
  isCompleting = false,
  isCancelling = false,
  isDeleting = false,
  userRole,
}: TransferDetailModalProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [deleteReason, setDeleteReason] = useState('')
  const [completeNotes, setCompleteNotes] = useState('')

  if (!show) return null

  // Permission checks
  console.log('=== TransferDetailModal Debug ===')
  console.log('transfer?.status:', transfer?.status)
  console.log('userRole:', userRole)
  console.log('userRole type:', typeof userRole)
  console.log('onComplete exists:', !!onComplete)
  console.log('onCancel exists:', !!onCancel)
  console.log('onDelete exists:', !!onDelete)
  console.log('Role check OWNER:', userRole === 'OWNER')
  console.log('Role check ADMIN:', userRole === 'ADMIN')
  console.log('Role check MANAGER:', userRole === 'MANAGER')
  console.log('Includes check:', ['OWNER', 'ADMIN', 'MANAGER'].includes(userRole as string))
  
  const canComplete = 
    transfer?.status === 'pending' &&
    userRole &&
    ['OWNER', 'ADMIN', 'MANAGER'].includes(userRole) &&
    onComplete
  
  const canCancel = 
    (transfer?.status === 'pending' || transfer?.status === 'in_transit') &&
    userRole &&
    ['OWNER', 'ADMIN', 'MANAGER'].includes(userRole) &&
    onCancel
  
  // Only OWNER and ADMIN can delete transfers (not MANAGER)
  // Can delete pending, in_transit, or cancelled transfers (not completed)
  const canDelete =
    transfer?.status !== 'completed' &&
    userRole &&
    ['OWNER', 'ADMIN'].includes(userRole) &&
    onDelete
  
  console.log('canComplete:', canComplete)
  console.log('canCancel:', canCancel)
  console.log('canDelete:', canDelete)
  console.log('===================================')

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'warning',
      in_transit: 'info',
      completed: 'success',
      cancelled: 'secondary',
    }
    return (
      <Badge bg={variants[status] || 'secondary'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  const formatCurrency = (value: string | number | undefined | null) => {
    if (!value) return '₵0.00'
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (Number.isNaN(num)) return '₵0.00'
    return `₵${num.toFixed(2)}`
  }

  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return dateStr
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const handleCompleteClick = () => {
    console.log('=== TransferDetailModal.handleCompleteClick ===')
    console.log('transfer:', transfer)
    console.log('transfer?.id:', transfer?.id)
    console.log('onComplete:', onComplete)
    console.log('completeNotes:', completeNotes)
    
    if (transfer && onComplete) {
      console.log('Calling onComplete with:', transfer.id, completeNotes.trim() || undefined)
      onComplete(transfer.id, completeNotes.trim() || undefined)
      setCompleteNotes('')
    } else {
      console.error('Cannot complete - missing transfer or onComplete handler')
      console.error('transfer exists:', !!transfer)
      console.error('onComplete exists:', !!onComplete)
    }
  }

  const handleCancelSubmit = () => {
    if (transfer && onCancel && cancelReason.trim()) {
      onCancel(transfer.id, cancelReason.trim())
      setCancelReason('')
      setShowCancelConfirm(false)
    }
  }

  const handleDeleteSubmit = () => {
    if (transfer && onDelete && deleteReason.trim()) {
      onDelete(transfer.id, deleteReason.trim())
      setDeleteReason('')
      setShowDeleteConfirm(false)
    }
  }

  const totalItems = transfer?.items.reduce((sum, item) => sum + item.quantity, 0) || 0
  const totalValue = transfer?.items.reduce(
    (sum, item) => sum + parseFloat(item.total_cost || '0'),
    0
  ) || 0

  return (
    <>
      <Modal show={show && !showCancelConfirm && !showDeleteConfirm} onHide={onClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Transfer Details {transfer && getStatusBadge(transfer.status)}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {isLoading && (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted">Loading transfer details...</p>
            </div>
          )}

          {error && (
            <Alert variant="danger">
              <Alert.Heading>Error loading transfer</Alert.Heading>
              <p>{error}</p>
            </Alert>
          )}

          {!isLoading && !error && transfer && (
            <>
              <div className="mb-4">
                <h6 className="text-muted mb-3">Transfer Information</h6>
                <div className="row">
                  <div className="col-md-6 mb-2">
                    <strong>Reference Number:</strong>
                    <br />
                    <code>{transfer.reference_number}</code>
                  </div>
                  <div className="col-md-6 mb-2">
                    <strong>Status:</strong>
                    <br />
                    {getStatusBadge(transfer.status)}
                  </div>
                  <div className="col-md-6 mb-2">
                    <strong>From Warehouse:</strong>
                    <br />
                    {transfer.source_warehouse_name || transfer.source_warehouse}
                  </div>
                  <div className="col-md-6 mb-2">
                    <strong>To Warehouse:</strong>
                    <br />
                    {transfer.destination_warehouse_name || transfer.destination_warehouse || '—'}
                  </div>
                  <div className="col-md-6 mb-2">
                    <strong>Created:</strong>
                    <br />
                    {formatDate(transfer.created_at)}
                    {transfer.created_by_name && (
                      <span className="text-muted"> by {transfer.created_by_name}</span>
                    )}
                  </div>
                  {transfer.completed_at && (
                    <div className="col-md-6 mb-2">
                      <strong>Completed:</strong>
                      <br />
                      {formatDate(transfer.completed_at)}
                      {transfer.completed_by_name && (
                        <span className="text-muted"> by {transfer.completed_by_name}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <h6 className="text-muted mb-3">Items ({transfer.items.length})</h6>
                <Table striped bordered hover size="sm" responsive>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th className="text-end">Quantity</th>
                      <th className="text-end">Unit Cost</th>
                      <th className="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfer.items.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td>{item.product_name || item.product}</td>
                        <td>{item.product_sku || '—'}</td>
                        <td className="text-end">{item.quantity}</td>
                        <td className="text-end">{formatCurrency(item.unit_cost)}</td>
                        <td className="text-end">{formatCurrency(item.total_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="fw-bold">
                      <td colSpan={2}>Total</td>
                      <td className="text-end">{totalItems}</td>
                      <td></td>
                      <td className="text-end">{formatCurrency(totalValue)}</td>
                    </tr>
                  </tfoot>
                </Table>
              </div>

              {transfer.notes && (
                <div className="mb-3">
                  <h6 className="text-muted mb-2">Notes</h6>
                  <p className="border rounded p-3 bg-light mb-0">{transfer.notes}</p>
                </div>
              )}

              {canComplete && (
                <div className="mb-3">
                  <Form.Group>
                    <Form.Label className="text-muted">
                      Completion Notes (optional)
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={completeNotes}
                      onChange={(e) => setCompleteNotes(e.target.value)}
                      placeholder="Add any notes about completing this transfer..."
                      disabled={isCompleting}
                    />
                  </Form.Group>
                </div>
              )}

              {!canComplete && !canCancel && transfer.status === 'pending' && (
                <Alert variant="info" className="mb-0">
                  <small>
                    <strong>Note:</strong> Only Managers, Admins, and Owners can complete or cancel transfers.
                  </small>
                </Alert>
              )}

              {transfer.status === 'completed' && canDelete && (
                <Alert variant="warning" className="mb-0">
                  <small>
                    <strong>Note:</strong> Completed transfers cannot be deleted. Create a reversal transfer instead.
                  </small>
                </Alert>
              )}
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onClose} disabled={isCompleting || isCancelling || isDeleting}>
            Close
          </Button>

          {canDelete && (
            <Button
              variant="outline-danger"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isCompleting || isCancelling || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash className="me-1" />
                  Delete Transfer
                </>
              )}
            </Button>
          )}

          {canCancel && (
            <Button
              variant="danger"
              onClick={() => setShowCancelConfirm(true)}
              disabled={isCompleting || isCancelling || isDeleting}
            >
              {isCancelling ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  Cancelling...
                </>
              ) : (
                'Cancel Transfer'
              )}
            </Button>
          )}

          {canComplete && (
            <Button
              variant="success"
              onClick={handleCompleteClick}
              disabled={isCompleting || isCancelling || isDeleting}
            >
              {isCompleting ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  Completing...
                </>
              ) : (
                'Complete Transfer'
              )}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal show={showCancelConfirm} onHide={() => setShowCancelConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Cancel Transfer</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            <strong>⚠️ Note:</strong> This will mark the transfer as cancelled. 
            The transfer record will remain in the system.
          </Alert>
          <p className="mb-3">
            Are you sure you want to cancel transfer{' '}
            <code>{transfer?.reference_number}</code>?
          </p>
          <Form.Group>
            <Form.Label>
              Cancellation Reason <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Please provide a reason for cancelling this transfer..."
              required
              disabled={isCancelling}
            />
            <Form.Text className="text-muted">
              {cancelReason.length}/10 characters minimum
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowCancelConfirm(false)
              setCancelReason('')
            }}
            disabled={isCancelling}
          >
            Back
          </Button>
          <Button
            variant="danger"
            onClick={handleCancelSubmit}
            disabled={cancelReason.trim().length < 10 || isCancelling}
          >
            {isCancelling ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Cancelling...
              </>
            ) : (
              'Confirm Cancellation'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">
            <Trash className="me-2" />
            Delete Transfer
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger">
            <strong>⚠️ Warning:</strong> This will permanently delete transfer{' '}
            <code>{transfer?.reference_number}</code>. This action cannot be undone.
          </Alert>
          
          <p className="mb-3">
            The transfer and all its items will be removed from the system.
            {transfer?.status === 'in_transit' && (
              <span className="text-warning d-block mt-2">
                <strong>Note:</strong> This transfer is currently in transit. 
                Make sure to verify the physical inventory status before deleting.
              </span>
            )}
          </p>
          
          <Form.Group className="mb-3">
            <Form.Label>
              Reason for Deletion <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Why are you deleting this transfer? (minimum 10 characters)"
              required
              disabled={isDeleting}
            />
            <Form.Text className="text-muted">
              {deleteReason.length}/10 characters minimum
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowDeleteConfirm(false)
              setDeleteReason('')
            }}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteSubmit}
            disabled={deleteReason.trim().length < 10 || isDeleting}
          >
            {isDeleting ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash className="me-1" />
                Delete Transfer
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}
