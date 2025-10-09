import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import Alert from 'react-bootstrap/Alert'
import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import Stack from 'react-bootstrap/Stack'
import type { StockBatch, StockProduct, StockProductPayload, Supplier, Warehouse } from '../../../types/inventory.js'

type FormValues = {
  supplier: string
  quantity: string
  unit_cost: string
  unit_tax_rate: string
  unit_tax_amount: string
  unit_additional_cost: string
  retail_price: string
  wholesale_price: string
  expiry_date: string
  description: string
}

interface StockProductDetailModalProps {
  show: boolean
  stockProduct: StockProduct | null
  suppliers: Supplier[]
  stockBatches: StockBatch[]
  warehouses: Warehouse[]
  isUpdating: boolean
  updateError: string | null
  isDeleting: boolean
  deleteError: string | null
  onClose: () => void
  onUpdate: (id: string, payload: Partial<StockProductPayload>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const defaultFormValues: FormValues = {
  supplier: '',
  quantity: '',
  unit_cost: '',
  unit_tax_rate: '',
  unit_tax_amount: '',
  unit_additional_cost: '',
  retail_price: '',
  wholesale_price: '',
  expiry_date: '',
  description: '',
}

const normalizeDateInput = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value ?? '—'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(date)
}

const formatDecimal = (value?: string | null) => {
  if (!value) return '—'
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return value
  return parsed.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const StockProductDetailModal = ({
  show,
  stockProduct,
  suppliers,
  stockBatches,
  warehouses,
  isUpdating,
  updateError,
  isDeleting,
  deleteError,
  onClose,
  onUpdate,
  onDelete,
}: StockProductDetailModalProps) => {
  const [formValues, setFormValues] = useState<FormValues>(defaultFormValues)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const stockBatch = useMemo(() => {
    if (!stockProduct) return null
    const batchId = stockProduct.stock_batch ?? stockProduct.stock
    if (!batchId) return null
    return stockBatches.find((batch) => batch.id === batchId) ?? null
  }, [stockBatches, stockProduct])

  const warehouse = useMemo(() => {
    if (stockProduct?.warehouse_name) return null
    if (!stockProduct?.stock && !stockBatch?.warehouse) return null
    const warehouseId = stockBatch?.warehouse ?? stockProduct?.stock ?? null
    if (!warehouseId) return null
    return warehouses.find((item) => item.id === warehouseId) ?? null
  }, [stockBatch?.warehouse, stockProduct, warehouses])

  useEffect(() => {
    if (!show) {
      setIsConfirmingDelete(false)
      setSuccessMessage(null)
    }
  }, [show])

  useEffect(() => {
    if (!stockProduct) {
      setFormValues(defaultFormValues)
      return
    }

    setFormValues({
      supplier: stockProduct.supplier ?? '',
      quantity: stockProduct.quantity.toString(),
      unit_cost: stockProduct.unit_cost ?? '',
      unit_tax_rate: stockProduct.unit_tax_rate ?? '',
      unit_tax_amount: stockProduct.unit_tax_amount ?? '',
      unit_additional_cost: stockProduct.unit_additional_cost ?? '',
      retail_price: stockProduct.retail_price ?? '',
      wholesale_price: stockProduct.wholesale_price ?? '',
      expiry_date: normalizeDateInput(stockProduct.expiry_date),
      description: stockProduct.description ?? '',
    })
    setSuccessMessage(null)
    setIsConfirmingDelete(false)
  }, [stockProduct])

  const handleChange = (field: keyof FormValues) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = event.target.value
    setFormValues((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  const parsedQuantity = useMemo(() => {
    if (!formValues.quantity.trim()) return NaN
    return Number(formValues.quantity)
  }, [formValues.quantity])

  const quantityValid = Number.isFinite(parsedQuantity) && parsedQuantity >= 0
  const unitCostValid = formValues.unit_cost.trim().length > 0

  const changedFields = useMemo(() => {
    if (!stockProduct) return new Set<keyof FormValues>()
    const diffs = new Set<keyof FormValues>()
    if ((formValues.supplier || '') !== (stockProduct.supplier ?? '')) diffs.add('supplier')
    if (quantityValid && parsedQuantity !== stockProduct.quantity) diffs.add('quantity')
    if ((formValues.unit_cost || '') !== (stockProduct.unit_cost ?? '')) diffs.add('unit_cost')
    if ((formValues.unit_tax_rate || '') !== (stockProduct.unit_tax_rate ?? '')) diffs.add('unit_tax_rate')
    if ((formValues.unit_tax_amount || '') !== (stockProduct.unit_tax_amount ?? '')) diffs.add('unit_tax_amount')
    if ((formValues.unit_additional_cost || '') !== (stockProduct.unit_additional_cost ?? '')) diffs.add('unit_additional_cost')
    if ((formValues.retail_price || '') !== (stockProduct.retail_price ?? '')) diffs.add('retail_price')
    if ((formValues.wholesale_price || '') !== (stockProduct.wholesale_price ?? '')) diffs.add('wholesale_price')
    if (formValues.expiry_date !== normalizeDateInput(stockProduct.expiry_date)) diffs.add('expiry_date')
    if ((formValues.description || '').trim() !== (stockProduct.description ?? '').trim()) diffs.add('description')
    return diffs
  }, [formValues, parsedQuantity, quantityValid, stockProduct])

  const hasChanges = changedFields.size > 0

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!stockProduct || !quantityValid || !unitCostValid || !hasChanges) return
    const payload: Partial<StockProductPayload> = {}

    if (changedFields.has('supplier')) {
      payload.supplier = formValues.supplier ? formValues.supplier : null
    }
    if (changedFields.has('quantity')) {
      payload.quantity = parsedQuantity
    }
    if (changedFields.has('unit_cost')) {
      payload.unit_cost = formValues.unit_cost
    }
    if (changedFields.has('unit_tax_rate')) {
      payload.unit_tax_rate = formValues.unit_tax_rate ? formValues.unit_tax_rate : null
    }
    if (changedFields.has('unit_tax_amount')) {
      payload.unit_tax_amount = formValues.unit_tax_amount ? formValues.unit_tax_amount : null
    }
    if (changedFields.has('unit_additional_cost')) {
      payload.unit_additional_cost = formValues.unit_additional_cost ? formValues.unit_additional_cost : null
    }
    if (changedFields.has('retail_price')) {
      payload.retail_price = formValues.retail_price ? formValues.retail_price : null
    }
    if (changedFields.has('wholesale_price')) {
      payload.wholesale_price = formValues.wholesale_price ? formValues.wholesale_price : null
    }
    if (changedFields.has('expiry_date')) {
      payload.expiry_date = formValues.expiry_date ? formValues.expiry_date : null
    }
    if (changedFields.has('description')) {
      payload.description = formValues.description.trim() ? formValues.description.trim() : null
    }

    try {
      await onUpdate(stockProduct.id, payload)
      setSuccessMessage('Stock item updated successfully.')
      setIsConfirmingDelete(false)
    } catch {
      // Errors are handled via updateError prop sourced from the store.
    }
  }

  const handleDelete = async () => {
    if (!stockProduct) return
    try {
      await onDelete(stockProduct.id)
    } catch {
      // Errors are handled via deleteError prop sourced from the store.
    }
  }

  const supplierOptions = useMemo(() => {
    const sorted = [...suppliers]
    sorted.sort((a, b) => a.name.localeCompare(b.name))
    return sorted
  }, [suppliers])

  const canSubmit = !!stockProduct && hasChanges && quantityValid && unitCostValid && !isUpdating && !isDeleting
  const disableDeleteButton = !stockProduct || isUpdating

  return (
    <Modal show={show} onHide={onClose} size="lg" backdrop="static" centered>
      <Form id="stockProductDetailForm" onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Stock item details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {stockProduct ? (
            <Stack gap={3}>
              {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}
              {updateError ? <Alert variant="danger">{updateError}</Alert> : null}
              {deleteError ? <Alert variant="danger">{deleteError}</Alert> : null}

              <div className="rounded-3xl bg-slate-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-slate-600">Product</div>
                    <div className="text-base font-semibold text-slate-900">{stockProduct.product_name ?? '—'}</div>
                    <div className="text-sm text-slate-500">SKU: {stockProduct.product_sku ?? '—'}</div>
                  </div>
                  <div className="text-right text-sm text-slate-600">
                    <div>Updated {formatDateTime(stockProduct.updated_at)}</div>
                    <div>Created {formatDateTime(stockProduct.created_at)}</div>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <div>
                    <span className="font-medium text-slate-700">Warehouse:</span>{' '}
                    {stockProduct.warehouse_name ?? warehouse?.name ?? '—'}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Batch:</span>{' '}
                    {stockBatch?.description?.length
                      ? stockBatch.description
                      : stockBatch
                        ? `Batch ${stockBatch.id.slice(0, 8)}`
                        : stockProduct.stock_batch
                          ? `Batch ${stockProduct.stock_batch.slice(0, 8)}`
                          : '—'}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Quantity Stocked:</span>{' '}
                    <Badge bg="primary" pill>
                      {stockProduct.quantity.toLocaleString()}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Quantity Available:</span>{' '}
                    <Badge bg="success" pill>
                      {(stockProduct.available_quantity ?? stockProduct.quantity).toLocaleString()}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Quantity Sold:</span>{' '}
                    <Badge bg="info" pill>
                      {(stockProduct.sold_quantity ?? 0).toLocaleString()}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Quantity Reserved:</span>{' '}
                    <Badge bg="warning" pill>
                      {(stockProduct.reserved_quantity ?? 0).toLocaleString()}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Landed unit cost:</span>{' '}
                    {formatDecimal(stockProduct.landed_unit_cost)}
                  </div>
                </div>
              </div>

              <Form.Group controlId="stockProductSupplier">
                <Form.Label>Supplier</Form.Label>
                <Form.Select
                  value={formValues.supplier}
                  onChange={handleChange('supplier')}
                  disabled={isUpdating || isDeleting}
                >
                  <option value="">Unassigned</option>
                  {supplierOptions.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <div className="grid gap-3 md:grid-cols-2">
                <Form.Group controlId="stockProductQuantity">
                  <Form.Label>Quantity</Form.Label>
                  <Form.Control
                    type="number"
                    min={0}
                    value={formValues.quantity}
                    onChange={handleChange('quantity')}
                    disabled={isUpdating || isDeleting}
                    isInvalid={!quantityValid && formValues.quantity.trim().length > 0}
                    placeholder="0"
                  />
                  <Form.Control.Feedback type="invalid">
                    Enter a valid quantity.
                  </Form.Control.Feedback>
                </Form.Group>
                <Form.Group controlId="stockProductUnitCost">
                  <Form.Label>Unit cost</Form.Label>
                  <Form.Control
                    type="text"
                    value={formValues.unit_cost}
                    onChange={handleChange('unit_cost')}
                    disabled={isUpdating || isDeleting}
                    isInvalid={!unitCostValid}
                    placeholder="0.00"
                  />
                  <Form.Control.Feedback type="invalid">
                    Unit cost is required.
                  </Form.Control.Feedback>
                </Form.Group>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Form.Group controlId="stockProductTaxRate">
                  <Form.Label>Tax rate (%)</Form.Label>
                  <Form.Control
                    type="text"
                    value={formValues.unit_tax_rate}
                    onChange={handleChange('unit_tax_rate')}
                    disabled={isUpdating || isDeleting}
                    placeholder="e.g. 7.5"
                  />
                </Form.Group>
                <Form.Group controlId="stockProductTaxAmount">
                  <Form.Label>Tax amount per unit</Form.Label>
                  <Form.Control
                    type="text"
                    value={formValues.unit_tax_amount}
                    onChange={handleChange('unit_tax_amount')}
                    disabled={isUpdating || isDeleting}
                    placeholder="0.00"
                  />
                </Form.Group>
                <Form.Group controlId="stockProductAdditionalCost">
                  <Form.Label>Additional cost per unit</Form.Label>
                  <Form.Control
                    type="text"
                    value={formValues.unit_additional_cost}
                    onChange={handleChange('unit_additional_cost')}
                    disabled={isUpdating || isDeleting}
                    placeholder="0.00"
                  />
                </Form.Group>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Form.Group controlId="stockProductRetailPrice">
                  <Form.Label>Retail price</Form.Label>
                  <Form.Control
                    type="text"
                    value={formValues.retail_price}
                    onChange={handleChange('retail_price')}
                    disabled={isUpdating || isDeleting}
                    placeholder="0.00"
                  />
                </Form.Group>
                <Form.Group controlId="stockProductWholesalePrice">
                  <Form.Label>Wholesale price</Form.Label>
                  <Form.Control
                    type="text"
                    value={formValues.wholesale_price}
                    onChange={handleChange('wholesale_price')}
                    disabled={isUpdating || isDeleting}
                    placeholder="0.00"
                  />
                </Form.Group>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Form.Group controlId="stockProductExpiryDate">
                  <Form.Label>Expiry date</Form.Label>
                  <Form.Control
                    type="date"
                    value={formValues.expiry_date}
                    onChange={handleChange('expiry_date')}
                    disabled={isUpdating || isDeleting}
                  />
                </Form.Group>
                <Form.Group controlId="stockProductDescription">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formValues.description}
                    onChange={handleChange('description')}
                    disabled={isUpdating || isDeleting}
                    placeholder="Add internal notes about this stock item"
                  />
                </Form.Group>
              </div>
            </Stack>
          ) : (
            <Alert variant="info" className="mb-0">
              Stock item details are unavailable. Close this modal and try again.
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose} disabled={isUpdating || isDeleting}>
              Close
            </Button>
            <Button
              type="submit"
              form="stockProductDetailForm"
              variant="primary"
              disabled={!canSubmit}
            >
              {isUpdating ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {isConfirmingDelete ? (
              <Alert variant="warning" className="mb-0 py-2 text-sm">
                This action permanently removes the stock item.
              </Alert>
            ) : null}
            <Button
              variant={isConfirmingDelete ? 'danger' : 'outline-danger'}
              onClick={() => {
                if (!isConfirmingDelete) {
                  setIsConfirmingDelete(true)
                  return
                }
                if (!isDeleting) {
                  void handleDelete()
                }
              }}
              disabled={disableDeleteButton || isDeleting}
            >
              {isDeleting ? 'Deleting…' : isConfirmingDelete ? 'Confirm delete' : 'Delete item'}
            </Button>
            {isConfirmingDelete ? (
              <Button
                variant="outline-secondary"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isUpdating || isDeleting}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

export default StockProductDetailModal
