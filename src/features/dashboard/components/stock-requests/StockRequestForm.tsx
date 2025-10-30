import { useState, type FormEvent } from 'react'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Spinner from 'react-bootstrap/Spinner'
import Table from 'react-bootstrap/Table'
import type { Product, Storefront, TransferRequestCreatePayload } from '../../../../types/inventory.js'

interface LineItem {
  tempId: string
  product: string
  productName: string
  requestedQuantity: number
  unitOfMeasure: string
  notes: string
}

interface StockRequestFormProps {
  storefronts: Storefront[]
  products: Product[]
  isSubmitting: boolean
  error: string | null
  onSubmit: (payload: TransferRequestCreatePayload) => Promise<void>
  onCancel?: () => void
}

const StockRequestForm = ({
  storefronts,
  products,
  isSubmitting,
  error,
  onSubmit,
  onCancel,
}: StockRequestFormProps) => {
  const [storefront, setStorefront] = useState('')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM')
  const [notes, setNotes] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitOfMeasure, setUnitOfMeasure] = useState('unit')
  const [lineNotes, setLineNotes] = useState('')

  const handleAddLineItem = () => {
    if (!selectedProduct || !quantity || Number(quantity) <= 0) {
      return
    }

    const product = products.find((p) => p.id === selectedProduct)
    if (!product) return

    const newItem: LineItem = {
      tempId: `${Date.now()}_${Math.random()}`,
      product: selectedProduct,
      productName: product.name,
      requestedQuantity: Number(quantity),
      unitOfMeasure,
      notes: lineNotes,
    }

    setLineItems([...lineItems, newItem])
    setSelectedProduct('')
    setQuantity('1')
    setUnitOfMeasure('unit')
    setLineNotes('')
  }

  const handleRemoveLineItem = (tempId: string) => {
    setLineItems(lineItems.filter((item) => item.tempId !== tempId))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!storefront || lineItems.length === 0) {
      return
    }

    const payload: TransferRequestCreatePayload = {
      storefront,
      direction: 'FORWARD',  // Stock requests are always FORWARD (warehouse → storefront)
      priority,
      notes: notes.trim() || undefined,
      line_items: lineItems.map((item) => ({
        product: item.product,
        requested_quantity: item.requestedQuantity,
        unit_of_measure: item.unitOfMeasure,
        notes: item.notes.trim() || undefined,
      })),
    }

    await onSubmit(payload)
  }

  const canSubmit = storefront && lineItems.length > 0 && !isSubmitting
  console.log('canSubmit=====>', canSubmit)
  console.log("storefront", storefront)
  console.log("line Items",lineItems.length)
  console.log('siSubmitting', isSubmitting)

  return (
    <Form onSubmit={handleSubmit}>
      {error && <Alert variant="danger">{error}</Alert>}

      <div className="mb-4">
        <h5 className="mb-3">Request details</h5>
        <div className="row g-3">
          <Form.Group className="col-md-6" controlId="storefront">
            <Form.Label>Storefront <span className="text-danger">*</span></Form.Label>
            <Form.Select
              value={storefront}
              onChange={(e) => setStorefront(e.target.value)}
              disabled={isSubmitting}
              required
            >
              <option value="">Select storefront...</option>
              {storefronts.map((sf) => (
                <option key={sf.id} value={sf.id}>
                  {sf.name} - {sf.location}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="col-md-6" controlId="priority">
            <Form.Label>Priority</Form.Label>
            <Form.Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
              disabled={isSubmitting}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="col-12" controlId="notes">
            <Form.Label>Request notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              placeholder="Add any additional information or context..."
            />
          </Form.Group>
        </div>
      </div>

      <div className="mb-4">
        <h5 className="mb-3">Add items</h5>
        <div className="row g-3 mb-3 p-3 bg-light rounded">
          <Form.Group className="col-md-4" controlId="product">
            <Form.Label>Product</Form.Label>
            <Form.Select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Select product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="col-md-2" controlId="quantity">
            <Form.Label>Quantity</Form.Label>
            <Form.Control
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={isSubmitting}
            />
          </Form.Group>

          <Form.Group className="col-md-2" controlId="unitOfMeasure">
            <Form.Label>Unit</Form.Label>
            <Form.Control
              type="text"
              value={unitOfMeasure}
              onChange={(e) => setUnitOfMeasure(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g., box, carton"
            />
          </Form.Group>

          <Form.Group className="col-md-4" controlId="lineNotes">
            <Form.Label>Item notes</Form.Label>
            <Form.Control
              type="text"
              value={lineNotes}
              onChange={(e) => setLineNotes(e.target.value)}
              disabled={isSubmitting}
              placeholder="Optional notes"
            />
          </Form.Group>

          <div className="col-12">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleAddLineItem}
              disabled={!selectedProduct || !quantity || Number(quantity) <= 0 || isSubmitting}
            >
              + Add item
            </Button>
          </div>
        </div>

        {lineItems.length > 0 && (
          <div>
            <h6 className="mb-2">Requested items ({lineItems.length})</h6>
            <Table responsive hover size="sm">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="text-end">Quantity</th>
                  <th>Unit</th>
                  <th>Notes</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr key={item.tempId}>
                    <td>{item.productName}</td>
                    <td className="text-end">{item.requestedQuantity}</td>
                    <td>{item.unitOfMeasure}</td>
                    <td>{item.notes || '—'}</td>
                    <td className="text-end">
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleRemoveLineItem(item.tempId)}
                        disabled={isSubmitting}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {lineItems.length === 0 && (
          <Alert variant="info" className="mb-0">
            <small>Add at least one product to submit this request.</small>
          </Alert>
        )}
      </div>

      <div className="d-flex gap-2 justify-content-end">
        {onCancel && (
          <Button variant="outline-secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={!canSubmit}>
          {isSubmitting && <Spinner animation="border" size="sm" className="me-2" />}
          Submit stock request
        </Button>
      </div>
    </Form>
  )
}

export default StockRequestForm
