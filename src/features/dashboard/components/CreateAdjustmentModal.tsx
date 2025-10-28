import { useState, useEffect, useCallback, type FormEvent } from 'react'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import Spinner from 'react-bootstrap/Spinner'
import Badge from 'react-bootstrap/Badge'
import type { StockProduct } from '../../../types/inventory.js'
import type { AdjustmentType, StockAdjustmentCreatePayload } from '../../../types/stockAdjustments.js'
import { searchStockProducts } from '../../../services/inventoryService.js'
import { 
  getAdjustmentIcon, 
  getAdjustmentColor, 
  getAdjustmentTypeGroups,
  isDecreaseType,
  isIncreaseType,
} from '../../../utils/stockAdjustmentHelpers.js'

// Debounce utility
function debounce<T extends (...args: never[]) => unknown>(func: T, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

interface CreateAdjustmentModalProps {
  show: boolean
  onClose: () => void
  onSubmit: (payload: StockAdjustmentCreatePayload) => Promise<void>
  isSubmitting: boolean
  error: string | null
}

interface AdjustmentFormState {
  stock_product: string
  adjustment_type: AdjustmentType | ''
  quantity: string
  reason: string
  reference_number: string
  unit_cost: string
}

const initialFormState: AdjustmentFormState = {
  stock_product: '',
  adjustment_type: '',
  quantity: '',
  reason: '',
  reference_number: '',
  unit_cost: '',
}

export default function CreateAdjustmentModal({
  show,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: CreateAdjustmentModalProps) {
  const [formData, setFormData] = useState<AdjustmentFormState>(initialFormState)
  const [validated, setValidated] = useState(false)
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<StockProduct[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const adjustmentTypeGroups = getAdjustmentTypeGroups()

  // Debounced search handler
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleSearchProducts = useCallback(
    debounce(async (searchTerm: string) => {
      try {
        setIsSearching(true)
        setSearchError(null)
        const response = await searchStockProducts({ 
          q: searchTerm.trim() || undefined, 
          limit: 50 
        })
        setSearchResults(response.results || [])
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to search products'
        setSearchError(errorMessage)
        console.error('Failed to search products:', err)
      } finally {
        setIsSearching(false)
      }
    }, 300),
    []
  )

  // Load initial products when modal opens
  useEffect(() => {
    if (show) {
      handleSearchProducts('')
    }
  }, [show, handleSearchProducts])

  const selectedStockProduct = searchResults.find(sp => sp.id === formData.stock_product)

  const handleClose = () => {
    setFormData(initialFormState)
    setValidated(false)
    setProductSearchTerm('')
    onClose()
  }

  const handleChange = (field: keyof AdjustmentFormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const form = event.currentTarget
    if (!form.checkValidity()) {
      setValidated(true)
      return
    }

    if (!formData.adjustment_type) {
      setValidated(true)
      return
    }

    if (!selectedStockProduct) {
      setValidated(true)
      return
    }

    const payload: StockAdjustmentCreatePayload = {
      stock_product: formData.stock_product,
      adjustment_type: formData.adjustment_type,
      quantity: Math.abs(Number(formData.quantity)),
      reason: formData.reason,
      reference_number: formData.reference_number || undefined,
      // Always provide unit_cost - use override or stock product's default
      unit_cost: formData.unit_cost || selectedStockProduct.unit_cost,
    }

    try {
      await onSubmit(payload)
      handleClose()
    } catch (err) {
      // Error is handled by parent component
      console.error('Failed to create adjustment:', err)
    }
  }

  const getQuantityLabel = () => {
    if (!formData.adjustment_type) return 'Quantity'
    if (isDecreaseType(formData.adjustment_type as AdjustmentType)) {
      return 'Quantity to Remove'
    }
    if (isIncreaseType(formData.adjustment_type as AdjustmentType)) {
      return 'Quantity to Add'
    }
    return 'Quantity'
  }

  const getQuantityPlaceholder = () => {
    if (!formData.adjustment_type) return 'Enter quantity'
    if (isDecreaseType(formData.adjustment_type as AdjustmentType)) {
      return 'Enter quantity to remove'
    }
    if (isIncreaseType(formData.adjustment_type as AdjustmentType)) {
      return 'Enter quantity to add'
    }
    return 'Enter quantity'
  }

  return (
    <Modal show={show} onHide={handleClose} size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Create Stock Adjustment</Modal.Title>
      </Modal.Header>

      <Form noValidate validated={validated} onSubmit={handleSubmit}>
        <Modal.Body>
          {error && (
            <Alert variant="danger" className="mb-3">
              <Alert.Heading>Error creating adjustment</Alert.Heading>
              <p className="mb-0">{error}</p>
            </Alert>
          )}

          {/* Stock Product Selection */}
          <Form.Group className="mb-3" controlId="stockProduct">
            <Form.Label>Stock Product *</Form.Label>
            
            {/* Search Input */}
            <Form.Control
              type="text"
              placeholder="🔍 Search products by name, SKU, or warehouse..."
              value={productSearchTerm}
              onChange={(e) => {
                setProductSearchTerm(e.target.value)
                handleSearchProducts(e.target.value)
              }}
              disabled={isSubmitting}
              className="mb-2"
            />
            
            {/* Loading Indicator */}
            {isSearching && (
              <div className="text-muted small mb-2">
                <Spinner animation="border" size="sm" className="me-2" />
                Searching...
              </div>
            )}
            
            {/* Error Message */}
            {searchError && (
              <Alert variant="warning" className="mb-2 py-2">
                {searchError}
              </Alert>
            )}
            
            {/* Product Select Dropdown */}
            <Form.Select
              required
              value={formData.stock_product}
              onChange={handleChange('stock_product')}
              disabled={isSubmitting || isSearching}
              size="lg"
              style={{ maxHeight: '200px' }}
            >
              <option value="">
                {isSearching 
                  ? 'Searching...' 
                  : productSearchTerm 
                    ? `${searchResults.length} product(s) found - Select one...` 
                    : 'Select a stock product...'}
              </option>
              {searchResults.length === 0 && !isSearching && productSearchTerm ? (
                <option disabled>No products match your search</option>
              ) : (
                searchResults.map(sp => (
                  <option key={sp.id} value={sp.id}>
                    {sp.product_name}
                    {sp.product_sku && ` - ${sp.product_sku}`}
                    {sp.warehouse_name && ` (${sp.warehouse_name})`}
                    {` - Qty: ${sp.quantity}`}
                  </option>
                ))
              )}
            </Form.Select>
            <Form.Control.Feedback type="invalid">
              Please select a stock product.
            </Form.Control.Feedback>
            {productSearchTerm && searchResults.length > 0 && !isSearching && (
              <Form.Text className="text-success">
                ✓ Found {searchResults.length} matching product(s)
              </Form.Text>
            )}
            {selectedStockProduct && (
              <Form.Text className="text-muted d-block mt-1">
                Current quantity: {selectedStockProduct.quantity} | 
                Unit cost: ${selectedStockProduct.unit_cost}
                {selectedStockProduct.expiry_date && 
                  ` | Expires: ${new Date(selectedStockProduct.expiry_date).toLocaleDateString()}`
                }
              </Form.Text>
            )}
          </Form.Group>

          {/* Adjustment Type */}
          <Form.Group className="mb-3" controlId="adjustmentType">
            <Form.Label>Adjustment Type *</Form.Label>
            <Form.Select
              required
              value={formData.adjustment_type}
              onChange={handleChange('adjustment_type')}
              disabled={isSubmitting}
            >
              <option value="">Select adjustment type...</option>
              {adjustmentTypeGroups.map(group => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Form.Select>
            <Form.Control.Feedback type="invalid">
              Please select an adjustment type.
            </Form.Control.Feedback>
            {formData.adjustment_type && (
              <div className="mt-2">
                <Badge bg={getAdjustmentColor(formData.adjustment_type as AdjustmentType)}>
                  {getAdjustmentIcon(formData.adjustment_type as AdjustmentType)}{' '}
                  {formData.adjustment_type}
                  {isDecreaseType(formData.adjustment_type as AdjustmentType) && ' (Decreases Stock)'}
                  {isIncreaseType(formData.adjustment_type as AdjustmentType) && ' (Increases Stock)'}
                </Badge>
              </div>
            )}
          </Form.Group>

          {/* Quantity */}
          <Form.Group className="mb-3" controlId="quantity">
            <Form.Label>{getQuantityLabel()} *</Form.Label>
            <Form.Control
              type="number"
              required
              min="1"
              step="1"
              value={formData.quantity}
              onChange={handleChange('quantity')}
              placeholder={getQuantityPlaceholder()}
              disabled={isSubmitting}
            />
            <Form.Control.Feedback type="invalid">
              Please enter a valid quantity (positive number).
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              Enter the absolute quantity. The system will automatically apply the correct sign.
            </Form.Text>
          </Form.Group>

          {/* Unit Cost (Optional Override) */}
          <Form.Group className="mb-3" controlId="unitCost">
            <Form.Label>Unit Cost (Optional)</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0"
              value={formData.unit_cost}
              onChange={handleChange('unit_cost')}
              placeholder={selectedStockProduct ? `Default: $${selectedStockProduct.unit_cost}` : 'Enter unit cost'}
              disabled={isSubmitting}
            />
            <Form.Text className="text-muted">
              Leave blank to use the stock product's default unit cost.
              {selectedStockProduct && formData.quantity && (
                <> Estimated total cost: ${(
                  Number(formData.unit_cost || selectedStockProduct.unit_cost) * 
                  Number(formData.quantity)
                ).toFixed(2)}</>
              )}
            </Form.Text>
          </Form.Group>

          {/* Reason */}
          <Form.Group className="mb-3" controlId="reason">
            <Form.Label>Reason *</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              required
              value={formData.reason}
              onChange={handleChange('reason')}
              placeholder="Explain the reason for this adjustment..."
              disabled={isSubmitting}
            />
            <Form.Control.Feedback type="invalid">
              Please provide a reason for this adjustment.
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              Provide detailed information about why this adjustment is needed.
            </Form.Text>
          </Form.Group>

          {/* Reference Number */}
          <Form.Group className="mb-3" controlId="referenceNumber">
            <Form.Label>Reference Number (Optional)</Form.Label>
            <Form.Control
              type="text"
              value={formData.reference_number}
              onChange={handleChange('reference_number')}
              placeholder="e.g., INC-2025-042, RMA-12345"
              disabled={isSubmitting}
            />
            <Form.Text className="text-muted">
              External reference (incident report, RMA number, etc.)
            </Form.Text>
          </Form.Group>

          {/* Approval Notice */}
          {formData.adjustment_type && (
            <Alert variant="info" className="mb-0">
              <strong>Note:</strong>{' '}
              {(['THEFT', 'LOSS', 'WRITE_OFF'].includes(formData.adjustment_type)) ? (
                'This adjustment type requires approval before it will be applied to inventory.'
              ) : (
                'This adjustment will be automatically approved and applied to inventory.'
              )}
            </Alert>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            type="submit"
            disabled={isSubmitting || !formData.stock_product || !formData.adjustment_type}
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
                Creating...
              </>
            ) : (
              'Create Adjustment'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
