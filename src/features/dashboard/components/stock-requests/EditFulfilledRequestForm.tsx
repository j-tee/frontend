import React, { useState, useMemo } from 'react'
import { Form, Button, Table, Alert } from 'react-bootstrap'
import type { TransferRequest } from '../../../../types/inventory.js'
import type { UUID } from '../../../../types/common.js'

interface LineItemEdit {
  id: UUID
  productId: UUID
  productName: string
  originalQuantity: number
  newQuantity: number
  notes: string
}

interface EditFulfilledRequestFormProps {
  request: TransferRequest
  onSubmit: (updates: { lineItems: Array<{ id: UUID; quantity: number; notes: string }> }) => void
  onCancel: () => void
  isSubmitting?: boolean
}

export const EditFulfilledRequestForm: React.FC<EditFulfilledRequestFormProps> = ({
  request,
  onSubmit,
  onCancel,
  isSubmitting = false
}) => {
  // Initialize editable line items from the request
  const [lineItems, setLineItems] = useState<LineItemEdit[]>(
    request.line_items.map(item => ({
      id: item.id,
      productId: item.product,
      productName: item.product_name,
      originalQuantity: item.fulfilled_quantity || item.approved_quantity || item.requested_quantity,
      newQuantity: item.fulfilled_quantity || item.approved_quantity || item.requested_quantity,
      notes: item.notes || ''
    }))
  )

  const [generalError, setGeneralError] = useState<string | null>(null)

  // Check if any changes were made
  const hasChanges = useMemo(() => {
    return lineItems.some(item => 
      item.newQuantity !== item.originalQuantity || 
      item.notes !== (request.line_items.find(li => li.id === item.id)?.notes || '')
    )
  }, [lineItems, request.line_items])

  // Validate all quantities are positive
  const hasValidQuantities = useMemo(() => {
    return lineItems.every(item => item.newQuantity > 0)
  }, [lineItems])

  const handleQuantityChange = (itemId: UUID, value: string) => {
    const quantity = value === '' ? 0 : parseInt(value, 10)
    
    if (isNaN(quantity) || quantity < 0) {
      return
    }

    setLineItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, newQuantity: quantity }
          : item
      )
    )
    setGeneralError(null)
  }

  const handleNotesChange = (itemId: UUID, value: string) => {
    setLineItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, notes: value }
          : item
      )
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError(null)

    // Validate
    if (!hasValidQuantities) {
      setGeneralError('All quantities must be greater than 0')
      return
    }

    if (!hasChanges) {
      setGeneralError('No changes detected')
      return
    }

    // Submit only changed items
    const updates = lineItems
      .filter(item => {
        const original = request.line_items.find(li => li.id === item.id)
        return item.newQuantity !== item.originalQuantity || 
               item.notes !== (original?.notes || '')
      })
      .map(item => ({
        id: item.id,
        quantity: item.newQuantity,
        notes: item.notes
      }))

    onSubmit({ lineItems: updates })
  }

  return (
    <Form onSubmit={handleSubmit}>
      {generalError && (
        <Alert variant="danger" dismissible onClose={() => setGeneralError(null)}>
          {generalError}
        </Alert>
      )}

      <Alert variant="info">
        <strong>Note:</strong> Editing quantities will automatically adjust inventory levels. 
        Increased quantities will add stock, decreased quantities will remove stock.
      </Alert>

      <div className="mb-3">
        <strong>Request ID:</strong> {request.id} | 
        <strong> Storefront:</strong> {request.storefront_name} | 
        <strong> Direction:</strong> {request.direction} | 
        <strong> Status:</strong> <span className="badge bg-success">FULFILLED</span>
      </div>

      <Table bordered hover size="sm">
        <thead>
          <tr>
            <th>Product</th>
            <th style={{ width: '150px' }}>Original Qty</th>
            <th style={{ width: '150px' }}>New Qty</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map(item => {
            const hasChange = item.newQuantity !== item.originalQuantity || 
                             item.notes !== (request.line_items.find(li => li.id === item.id)?.notes || '')
            
            return (
              <tr key={item.id} className={hasChange ? 'table-warning' : ''}>
                <td>{item.productName}</td>
                <td className="text-center">
                  <strong>{item.originalQuantity}</strong>
                </td>
                <td>
                  <Form.Control
                    type="number"
                    min="1"
                    value={item.newQuantity}
                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                    disabled={isSubmitting}
                    size="sm"
                    className={item.newQuantity !== item.originalQuantity ? 'border-warning' : ''}
                  />
                </td>
                <td>
                  <Form.Control
                    as="textarea"
                    rows={1}
                    value={item.notes}
                    onChange={(e) => handleNotesChange(item.id, e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Add notes about this change..."
                    size="sm"
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </Table>

      <div className="d-flex justify-content-between align-items-center">
        <div>
          {hasChanges && (
            <small className="text-muted">
              Items with changes are highlighted in yellow
            </small>
          )}
        </div>
        <div>
          <Button 
            variant="secondary" 
            onClick={onCancel} 
            disabled={isSubmitting}
            className="me-2"
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            type="submit" 
            disabled={isSubmitting || !hasChanges || !hasValidQuantities}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Form>
  )
}

export default EditFulfilledRequestForm
