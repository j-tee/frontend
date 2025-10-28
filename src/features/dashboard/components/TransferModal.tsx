import React, { useState, useMemo } from 'react'
import { Modal, Button, Form, Alert } from 'react-bootstrap'

interface TransferProductLine {
  product: string
  quantity: number
}

interface TransferModalProps {
  show: boolean
  onClose: () => void
  onSubmit: (payload: {
    sourceWarehouse: string
    destinationWarehouse: string
    products: TransferProductLine[]
    reason?: string
  }) => void
  warehouses: Array<{ id: string; name: string }>
  products: Array<{ id: string; name: string }>
  stockProducts?: Array<{
    id: string
    product: string
    product_name?: string
    stock?: string
    warehouse?: string
    warehouse_name?: string
    quantity: number
  }>
  isSubmitting?: boolean
  error?: string | null
}

export const TransferModal: React.FC<TransferModalProps> = ({
  show,
  onClose,
  onSubmit,
  warehouses,
  products,
  stockProducts,
  isSubmitting,
  error,
}) => {
  const [sourceWarehouse, setSourceWarehouse] = useState<string>('')
  const [destinationWarehouse, setDestinationWarehouse] = useState<string>('')
  const [lines, setLines] = useState<TransferProductLine[]>([])
  const [reason, setReason] = useState<string>('')
  const [formError, setFormError] = useState<string | null>(null)

  const handleAddLine = () => setLines((s) => [...s, { product: '', quantity: 1 }])
  const handleLineChange = (idx: number, field: keyof TransferProductLine, value: string | number) => {
    setLines((current) => current.map((line, i) => (i === idx ? { ...line, [field]: value } : line)))
  }
  const handleRemoveLine = (idx: number) => setLines((current) => current.filter((_, i) => i !== idx))

  const filteredProducts = useMemo(() => {
    if (stockProducts && sourceWarehouse) {
      const seen = new Set<string>()
      return stockProducts
        .filter((sp) => ((sp.warehouse === sourceWarehouse) || (sp.stock === sourceWarehouse)) && (sp.quantity ?? 0) > 0)
        .map((sp) => ({ id: sp.product, name: sp.product_name || 'Unnamed Product' }))
        .filter((p) => {
          if (seen.has(p.id)) return false
          seen.add(p.id)
          return true
        })
    }
    const seen = new Set<string>()
    return products.filter((p) => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
  }, [stockProducts, sourceWarehouse, products])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!sourceWarehouse || !destinationWarehouse) {
      setFormError('Please select both source and destination warehouses.')
      return
    }
    if (sourceWarehouse === destinationWarehouse) {
      setFormError('Source and destination warehouses must be different.')
      return
    }
    if (lines.length === 0 || lines.some((l) => !l.product || l.quantity <= 0)) {
      setFormError('Please add at least one valid product and quantity.')
      return
    }
    onSubmit({ sourceWarehouse, destinationWarehouse, products: lines, reason })
  }

  return (
    <Modal show={show} onHide={onClose} size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Initiate Inter-Warehouse Transfer</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {formError && <Alert variant="danger">{formError}</Alert>}
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Source Warehouse</Form.Label>
            <Form.Select value={sourceWarehouse} onChange={(e) => setSourceWarehouse(e.target.value)} required>
              <option value="">Select source warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Destination Warehouse</Form.Label>
            <Form.Select value={destinationWarehouse} onChange={(e) => setDestinationWarehouse(e.target.value)} required>
              <option value="">Select destination warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Label>Products & Quantities</Form.Label>
          {lines.map((line, idx) => (
            <div key={idx} className="d-flex align-items-center mb-2 gap-2">
              <Form.Select
                value={line.product}
                onChange={(e) => handleLineChange(idx, 'product', e.target.value)}
                required
                style={{ minWidth: 200 }}
              >
                <option value="">Select product</option>
                {filteredProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Form.Select>

              <Form.Control
                type="number"
                min={1}
                value={line.quantity}
                onChange={(e) => handleLineChange(idx, 'quantity', Number(e.target.value))}
                required
                style={{ width: 100 }}
              />

              <Button variant="outline-danger" size="sm" onClick={() => handleRemoveLine(idx)} disabled={isSubmitting}>
                Remove
              </Button>
            </div>
          ))}

          <Button variant="outline-primary" size="sm" onClick={handleAddLine} disabled={isSubmitting} className="mb-3">
            + Add Product
          </Button>

          <Form.Group className="mb-3">
            <Form.Label>Reason / Notes</Form.Label>
            <Form.Control as="textarea" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional reason for transfer" />
          </Form.Group>

          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              Initiate Transfer
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  )
}
