import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Badge from 'react-bootstrap/Badge'
import Spinner from 'react-bootstrap/Spinner'
import Alert from 'react-bootstrap/Alert'
import Table from 'react-bootstrap/Table'
import type { StockAdjustment } from '../../../types/stockAdjustments.js'
import { 
  getAdjustmentIcon, 
  getAdjustmentColor,
  formatAdjustmentType,
} from '../../../utils/stockAdjustmentHelpers.js'

interface AdjustmentDetailModalProps {
  show: boolean
  onClose: () => void
  adjustment: StockAdjustment | null
  isLoading?: boolean
  error?: string | null
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onEdit?: (adjustment: StockAdjustment) => void
  onDelete?: (adjustment: StockAdjustment) => void
  isApproving?: boolean
  isRejecting?: boolean
  isDeleting?: boolean
}

export default function AdjustmentDetailModal({
  show,
  onClose,
  adjustment,
  isLoading = false,
  error = null,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  isApproving = false,
  isRejecting = false,
  isDeleting = false,
}: AdjustmentDetailModalProps) {
  if (!show) return null

  // Debug: Log adjustment data to console
  if (adjustment) {
  }

  const canApprove = adjustment?.status === 'PENDING' && adjustment?.requires_approval
  const canReject = adjustment?.status === 'PENDING'
  // Edit and Delete available for all statuses
  const canEdit = !!adjustment
  const canDelete = !!adjustment

  const handleApprove = () => {
    if (adjustment && onApprove) {
      onApprove(adjustment.id)
    }
  }

  const handleReject = () => {
    if (adjustment && onReject) {
      onReject(adjustment.id)
    }
  }

  const handleEdit = () => {
    if (adjustment && onEdit) {
      onEdit(adjustment)
    }
  }

  const handleDelete = () => {
    if (adjustment && onDelete) {
      onDelete(adjustment)
    }
  }

  return (
    <Modal show={show} onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Stock Adjustment Details</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {isLoading && (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted">Loading adjustment details...</p>
          </div>
        )}

        {error && (
          <Alert variant="danger">
            <Alert.Heading>Error loading adjustment</Alert.Heading>
            <p>{error}</p>
          </Alert>
        )}

        {adjustment && !isLoading && (
          <div className="space-y-4">
            {/* Status and Type */}
            <div className="d-flex justify-content-between align-items-start mb-4">
              <div>
                <h5 className="mb-2">
                  {getAdjustmentIcon(adjustment.adjustment_type)}{' '}
                  {formatAdjustmentType(adjustment.adjustment_type)}
                </h5>
                <Badge bg={getAdjustmentColor(adjustment.adjustment_type)}>
                  {adjustment.adjustment_type_display}
                </Badge>
              </div>
              <div className="text-end">
                <Badge 
                  bg={
                    adjustment.status === 'COMPLETED' ? 'success' :
                    adjustment.status === 'APPROVED' ? 'info' :
                    adjustment.status === 'REJECTED' ? 'danger' :
                    'warning'
                  }
                  className="fs-6"
                >
                  {adjustment.status_display}
                </Badge>
                {adjustment.requires_approval && adjustment.status === 'PENDING' && (
                  <div className="text-muted small mt-1">
                    ⚠️ Requires Approval
                  </div>
                )}
              </div>
            </div>

            {/* Stock Product Information */}
            <div className="border rounded p-3 mb-3" style={{ backgroundColor: '#f8f9fa' }}>
              <h6 className="mb-3">Stock Product Information</h6>
              <Table size="sm" className="mb-0">
                <tbody>
                  <tr>
                    <td className="fw-semibold" style={{ width: '40%' }}>Product Name:</td>
                    <td>{adjustment.stock_product_details?.product_name || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Product Code:</td>
                    <td>{adjustment.stock_product_details?.product_code || 'N/A'}</td>
                  </tr>
                  
                  {/* Historical Quantity (at creation) */}
                  {adjustment.stock_product_details?.quantity_at_creation !== null && 
                   adjustment.stock_product_details?.quantity_at_creation !== undefined && (
                    <tr>
                      <td className="fw-semibold">Quantity at Creation:</td>
                      <td>
                        {adjustment.stock_product_details.quantity_at_creation}
                        <small className="text-muted ms-2">
                          (when adjustment was created)
                        </small>
                      </td>
                    </tr>
                  )}
                  
                  {/* Current Quantity (real-time) */}
                  <tr>
                    <td className="fw-semibold">Current Quantity:</td>
                    <td>
                      {adjustment.stock_product_details?.current_quantity ?? 'N/A'}
                      <small className="text-muted ms-2">
                        (real-time)
                      </small>
                    </td>
                  </tr>
                  
                  {/* After Approval (calculated preview) */}
                  {adjustment.status === 'PENDING' && adjustment.stock_product_details?.current_quantity !== undefined && (
                    <tr style={{ backgroundColor: '#e7f3ff' }}>
                      <td className="fw-semibold">After Approval:</td>
                      <td className="fw-bold text-primary">
                        {adjustment.stock_product_details.current_quantity + adjustment.quantity}
                        <small className="text-muted ms-2">
                          (predicted)
                        </small>
                      </td>
                    </tr>
                  )}
                  
                  {adjustment.stock_product_details?.warehouse && (
                    <tr>
                      <td className="fw-semibold">Warehouse:</td>
                      <td>{adjustment.stock_product_details.warehouse}</td>
                    </tr>
                  )}
                  {adjustment.stock_product_details?.supplier && (
                    <tr>
                      <td className="fw-semibold">Supplier:</td>
                      <td>{adjustment.stock_product_details.supplier}</td>
                    </tr>
                  )}
                </tbody>
              </Table>
              
              {/* Change Alert - show if stock has changed since creation */}
              {adjustment.stock_product_details?.quantity_at_creation !== null &&
               adjustment.stock_product_details?.quantity_at_creation !== undefined &&
               adjustment.stock_product_details?.current_quantity !== adjustment.stock_product_details?.quantity_at_creation && (
                <Alert variant="warning" className="mt-3 mb-0">
                  <small>
                    ⚠️ <strong>Stock has changed</strong> from{' '}
                    <strong>{adjustment.stock_product_details.quantity_at_creation}</strong> to{' '}
                    <strong>{adjustment.stock_product_details.current_quantity}</strong>{' '}
                    since this adjustment was created.
                    {adjustment.status === 'PENDING' && (
                      <> Please verify this adjustment is still appropriate before approving.</>
                    )}
                  </small>
                </Alert>
              )}
            </div>

            {/* Adjustment Details */}
            <div className="border rounded p-3 mb-3">
              <h6 className="mb-3">Adjustment Information</h6>
              <Table size="sm" className="mb-0">
                <tbody>
                  <tr>
                    <td className="fw-semibold" style={{ width: '40%' }}>Quantity:</td>
                    <td>
                      <span className={adjustment.is_increase ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                        {adjustment.is_increase ? '+' : '-'}
                        {adjustment.quantity}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Unit Cost:</td>
                    <td>${adjustment.unit_cost}</td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Total Cost:</td>
                    <td className="fw-bold">${adjustment.total_cost}</td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Financial Impact:</td>
                    <td className={adjustment.is_decrease ? 'text-danger' : 'text-success'}>
                      {adjustment.is_decrease ? '-' : '+'}${adjustment.financial_impact}
                    </td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Reason:</td>
                    <td>{adjustment.reason}</td>
                  </tr>
                  {adjustment.reference_number && (
                    <tr>
                      <td className="fw-semibold">Reference Number:</td>
                      <td>
                        <code>{adjustment.reference_number}</code>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>

            {/* Timeline */}
            <div className="border rounded p-3 mb-3">
              <h6 className="mb-3">Timeline</h6>
              <Table size="sm" className="mb-0">
                <tbody>
                  <tr>
                    <td className="fw-semibold" style={{ width: '40%' }}>Created:</td>
                    <td>
                      {new Date(adjustment.created_at).toLocaleString()}
                      {adjustment.created_by_name && (
                        <span className="text-muted"> by {adjustment.created_by_name}</span>
                      )}
                    </td>
                  </tr>
                  {adjustment.approved_at && (
                    <tr>
                      <td className="fw-semibold">Approved:</td>
                      <td>
                        {new Date(adjustment.approved_at).toLocaleString()}
                        {adjustment.approved_by_name && (
                          <span className="text-muted"> by {adjustment.approved_by_name}</span>
                        )}
                      </td>
                    </tr>
                  )}
                  {adjustment.completed_at && (
                    <tr>
                      <td className="fw-semibold">Completed:</td>
                      <td>{new Date(adjustment.completed_at).toLocaleString()}</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>

            {/* Photos & Documents */}
            {(adjustment.has_photos || adjustment.has_documents) && (
              <div className="border rounded p-3">
                <h6 className="mb-3">Attachments</h6>
                {adjustment.has_photos && (
                  <div className="mb-2">
                    <span className="badge bg-info">📷 Has Photos</span>
                  </div>
                )}
                {adjustment.has_documents && (
                  <div>
                    <span className="badge bg-info">📄 Has Documents</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <div className="d-flex justify-content-between w-100">
          <div>
            {canReject && (
              <Button
                variant="danger"
                onClick={handleReject}
                disabled={isRejecting || isApproving}
              >
                {isRejecting ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    Rejecting...
                  </>
                ) : (
                  'Reject'
                )}
              </Button>
            )}
          </div>
          <div className="d-flex gap-2">
            {canEdit && onEdit && (
              <Button
                variant="outline-primary"
                onClick={handleEdit}
                disabled={isApproving || isRejecting || isDeleting}
              >
                Edit
              </Button>
            )}
            {canDelete && onDelete && (
              <Button
                variant="outline-danger"
                onClick={handleDelete}
                disabled={isApproving || isRejecting || isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
            )}
            {canApprove && (
              <Button
                variant="success"
                onClick={handleApprove}
                disabled={isApproving || isRejecting}
              >
                {isApproving ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    Approving...
                  </>
                ) : (
                  'Approve'
                )}
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  )
}
