import { useEffect, useState } from 'react'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Alert from 'react-bootstrap/Alert'
import Spinner from 'react-bootstrap/Spinner'
import Badge from 'react-bootstrap/Badge'
import type { StockAdjustment } from '../../../types/stockAdjustments.js'

interface EditAdjustmentModalProps {
  show: boolean
  onClose: () => void
  adjustment: StockAdjustment | null
  onSubmit: (id: string, payload: StockAdjustmentEditPayload) => Promise<void>
  isSubmitting?: boolean
  error?: string | null
}

export interface StockAdjustmentEditPayload {
  stock_product: string
  adjustment_type: string
  quantity: number
  reason: string
  unit_cost?: string
  reference_number?: string
}

export default function EditAdjustmentModal({
  show,
  onClose,
  adjustment,
  onSubmit,
  isSubmitting = false,
  error = null,
}: EditAdjustmentModalProps) {
  const [formData, setFormData] = useState<StockAdjustmentEditPayload>({
    stock_product: '',
    adjustment_type: 'DAMAGE',
    quantity: 0,
    reason: '',
    unit_cost: '',
    reference_number: '',
  })

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Populate form when adjustment changes
  useEffect(() => {
    if (adjustment && show) {
      setFormData({
        stock_product: adjustment.stock_product,
        adjustment_type: adjustment.adjustment_type,
        quantity: adjustment.quantity,
        reason: adjustment.reason,
        unit_cost: adjustment.unit_cost,
        reference_number: adjustment.reference_number || '',
      })
      setValidationErrors({})
    }
  }, [adjustment, show])

  // Validate form
  const validate = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.reason.trim()) {
      errors.reason = 'Reason is required'
    } else if (formData.reason.trim().length < 10) {
      errors.reason = 'Reason must be at least 10 characters'
    }

    if (formData.quantity === 0) {
      errors.quantity = 'Quantity cannot be zero'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!adjustment) return
    if (!validate()) return

    await onSubmit(adjustment.id, formData)
  }

  const handleChange = (field: keyof StockAdjustmentEditPayload, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  if (!show) return null

  if (!adjustment) return null

  // Show warning for non-PENDING statuses
  const showWarning = adjustment.status !== 'PENDING'

  return (
    <Modal show={show} onHide={onClose} size="lg" backdrop="static">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>
            Edit Stock Adjustment
            <Badge bg="warning" className="ms-2">PENDING</Badge>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {showWarning && (
            <Alert variant="warning" className="mb-3">
              <Alert.Heading>⚠️ Warning</Alert.Heading>
              <p>
                This adjustment has status <strong>{adjustment.status_display}</strong>.
                Editing non-PENDING adjustments may have unexpected consequences on your inventory.
              </p>
              <p className="mb-0">
                <strong>Proceed with caution!</strong> Consider creating a new adjustment instead.
              </p>
            </Alert>
          )}

          {error && (
            <Alert variant="danger" className="mb-3">
              <Alert.Heading>Error</Alert.Heading>
              <p className="mb-0">{error}</p>
            </Alert>
          )}

          {/* Product Info (Read-only) */}
          <Alert variant="info" className="mb-3">
            <div className="mb-2">
              <strong>Product:</strong> {adjustment.stock_product_details?.product_name}
              {' '}({adjustment.stock_product_details?.product_code})
            </div>
            <div>
              <strong>Current Quantity:</strong> {adjustment.stock_product_details?.current_quantity ?? 'N/A'}
            </div>
          </Alert>

          {/* Adjustment Type */}
          <Form.Group className="mb-3" controlId="adjustmentType">
            <Form.Label>Adjustment Type <span className="text-danger">*</span></Form.Label>
            <Form.Select
              value={formData.adjustment_type}
              onChange={(e) => handleChange('adjustment_type', e.target.value)}
              disabled={isSubmitting}
              isInvalid={!!validationErrors.adjustment_type}
            >
              <option value="DAMAGE">Damage/Breakage</option>
              <option value="THEFT">Theft/Shrinkage</option>
              <option value="EXPIRY">Expired/Obsolete</option>
              <option value="FOUND">Found Inventory</option>
              <option value="CORRECTION">Inventory Correction</option>
              <option value="RETURN">Customer Return</option>
              <option value="OTHER">Other</option>
            </Form.Select>
            <Form.Control.Feedback type="invalid">
              {validationErrors.adjustment_type}
            </Form.Control.Feedback>
          </Form.Group>

          {/* Quantity */}
          <Form.Group className="mb-3" controlId="quantity">
            <Form.Label>Quantity <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="number"
              value={formData.quantity}
              onChange={(e) => handleChange('quantity', parseFloat(e.target.value) || 0)}
              disabled={isSubmitting}
              isInvalid={!!validationErrors.quantity}
              placeholder="Negative for losses, positive for gains"
            />
            <Form.Text className="text-muted">
              Use negative numbers for losses (e.g., -5), positive for gains (e.g., +3)
            </Form.Text>
            <Form.Control.Feedback type="invalid">
              {validationErrors.quantity}
            </Form.Control.Feedback>
          </Form.Group>

          {/* Unit Cost */}
          <Form.Group className="mb-3" controlId="unitCost">
            <Form.Label>Unit Cost</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              value={formData.unit_cost}
              onChange={(e) => handleChange('unit_cost', e.target.value)}
              disabled={isSubmitting}
              placeholder={adjustment.stock_product_details?.unit_cost || '0.00'}
            />
            <Form.Text className="text-muted">
              Optional - defaults to stock product cost
            </Form.Text>
          </Form.Group>

          {/* Reason */}
          <Form.Group className="mb-3" controlId="reason">
            <Form.Label>Reason <span className="text-danger">*</span></Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={formData.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              disabled={isSubmitting}
              isInvalid={!!validationErrors.reason}
              placeholder="Explain why this adjustment is needed..."
            />
            <Form.Control.Feedback type="invalid">
              {validationErrors.reason}
            </Form.Control.Feedback>
          </Form.Group>

          {/* Reference Number */}
          <Form.Group className="mb-3" controlId="referenceNumber">
            <Form.Label>Reference Number (Optional)</Form.Label>
            <Form.Control
              type="text"
              value={formData.reference_number}
              onChange={(e) => handleChange('reference_number', e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g., INV-2025-001"
            />
          </Form.Group>

          {/* Preview Calculation */}
          {formData.quantity !== 0 && formData.unit_cost && (
            <Alert variant="secondary" className="mb-0">
              <div className="small">
                <div className="mb-1">
                  <strong>Preview:</strong>
                </div>
                <div>
                  Estimated Total Cost: ${(Math.abs(formData.quantity) * parseFloat(formData.unit_cost || '0')).toFixed(2)}
                </div>
                <div className="text-muted mt-1">
                  (Backend will calculate exact total_cost)
                </div>
              </div>
            </Alert>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
