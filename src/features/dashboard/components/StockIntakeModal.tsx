import { useEffect, useMemo, useState, type FormEvent, type ChangeEvent } from 'react'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import Spinner from 'react-bootstrap/Spinner'
import Table from 'react-bootstrap/Table'
import { useCurrency } from '../../../hooks'
import type {
  Product,
  StockBatch,
  StockBatchPayload,
  StockProduct,
  StockProductPayload,
  Supplier,
  SupplierPayload,
  Warehouse,
} from '../../../types/inventory.js'

interface StockIntakeModalProps {
  show: boolean
  onClose: () => void
  warehouses: Warehouse[]
  stockBatches: StockBatch[]
  suppliers: Supplier[]
  products: Product[]
  createBatch: (payload: StockBatchPayload) => Promise<StockBatch>
  createStockProduct: (payload: StockProductPayload) => Promise<StockProduct>
  createSupplier: (payload: SupplierPayload) => Promise<Supplier>
  resetBatchState: () => void
  resetStockProductState: () => void
  resetSupplierState: () => void
  isCreatingBatch: boolean
  batchError: string | null
  isCreatingStockProduct: boolean
  stockProductError: string | null
  isCreatingSupplier: boolean
  supplierError: string | null
  onComplete?: (stockId: string) => void
}

interface BatchFormState {
  warehouse: string
  arrival_date: string
  description: string
}

interface LineItemFormState {
  product: string
  supplier: string
  quantity: number
  unit_cost: string
  unit_tax_rate: string
  unit_tax_amount: string
  unit_additional_cost: string
  retail_price: string
  wholesale_price: string
  expiry_date: string
  description: string
}

const initialBatchForm: BatchFormState = {
  warehouse: '',
  arrival_date: '',
  description: '',
}

const initialLineItemForm: LineItemFormState = {
  product: '',
  supplier: '',
  quantity: 1,
  unit_cost: '',
  unit_tax_rate: '',
  unit_tax_amount: '',
  unit_additional_cost: '',
  retail_price: '',
  wholesale_price: '',
  expiry_date: '',
  description: '',
}

interface SupplierFormState {
  name: string
  contact_person: string
  email: string
  phone_number: string
  address: string
  notes: string
}

const initialSupplierForm: SupplierFormState = {
  name: '',
  contact_person: '',
  email: '',
  phone_number: '',
  address: '',
  notes: '',
}

const StockIntakeModal = ({
  show,
  onClose,
  warehouses,
  stockBatches,
  suppliers,
  products,
  createBatch,
  createStockProduct,
  createSupplier,
  resetBatchState,
  resetStockProductState,
  resetSupplierState,
  isCreatingBatch,
  batchError,
  isCreatingStockProduct,
  stockProductError,
  isCreatingSupplier,
  supplierError,
  onComplete,
}: StockIntakeModalProps) => {
  const { formatCurrency } = useCurrency()
  const [batchForm, setBatchForm] = useState<BatchFormState>(initialBatchForm)
  const [lineItemForm, setLineItemForm] = useState<LineItemFormState>(initialLineItemForm)
  const [createdBatch, setCreatedBatch] = useState<StockBatch | null>(null)
  const [lineItems, setLineItems] = useState<StockProduct[]>([])
  const [batchSuccessMessage, setBatchSuccessMessage] = useState<string | null>(null)
  const [itemSuccessMessage, setItemSuccessMessage] = useState<string | null>(null)
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [supplierForm, setSupplierForm] = useState<SupplierFormState>(initialSupplierForm)
  const [supplierFormError, setSupplierFormError] = useState<string | null>(null)
  const [arrivalDateFilter, setArrivalDateFilter] = useState<string>('')
  const [selectedExistingBatchId, setSelectedExistingBatchId] = useState<string>('')

  useEffect(() => {
    if (!show) {
      setBatchForm(initialBatchForm)
      setLineItemForm(initialLineItemForm)
      setCreatedBatch(null)
      setLineItems([])
      setBatchSuccessMessage(null)
      setItemSuccessMessage(null)
      resetBatchState()
      resetStockProductState()
      resetSupplierState()
      setShowSupplierModal(false)
      setSupplierForm(initialSupplierForm)
      setSupplierFormError(null)
      setArrivalDateFilter('')
      setSelectedExistingBatchId('')
    }
  }, [resetBatchState, resetStockProductState, resetSupplierState, show])

  useEffect(() => {
    if (batchSuccessMessage) {
      const timeoutId = window.setTimeout(() => setBatchSuccessMessage(null), 4000)
      return () => window.clearTimeout(timeoutId)
    }
    return undefined
  }, [batchSuccessMessage])

  useEffect(() => {
    if (itemSuccessMessage) {
      const timeoutId = window.setTimeout(() => setItemSuccessMessage(null), 4000)
      return () => window.clearTimeout(timeoutId)
    }
    return undefined
  }, [itemSuccessMessage])


  const productOptions = useMemo(() => {
    return products.map((product) => ({
      id: product.id,
      label: `${product.name}${product.sku ? ` • ${product.sku}` : ''}`,
    }))
  }, [products])

  const supplierOptions = useMemo(() => {
    return suppliers.map((supplier) => ({
      id: supplier.id,
      label: supplier.name,
    }))
  }, [suppliers])

  const warehouseOptions = useMemo(() => {
    return warehouses.map((warehouse) => ({
      id: warehouse.id,
      label: `${warehouse.name}${warehouse.location ? ` • ${warehouse.location}` : ''}`,
    }))
  }, [warehouses])
  const hasWarehouses = warehouseOptions.length > 0

  const getEpoch = (value?: string | null, fallback?: string | null) => {
    const candidate = value ?? fallback ?? null
    if (!candidate) return Number.NEGATIVE_INFINITY
    const parsed = Date.parse(candidate)
    return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed
  }

  const sortedStockOptions = useMemo(() => {
    const options = [...stockBatches]
    return options.sort((a, b) => {
      const bTime = getEpoch(b.arrival_date, b.created_at ?? null)
      const aTime = getEpoch(a.arrival_date, a.created_at ?? null)
      return bTime - aTime
    })
  }, [stockBatches])

  const filteredStockOptions = useMemo(() => {
    if (!arrivalDateFilter) return sortedStockOptions
    return sortedStockOptions.filter((batch) => batch.arrival_date === arrivalDateFilter)
  }, [arrivalDateFilter, sortedStockOptions])

  const hasExistingStock = sortedStockOptions.length > 0

  const formatBatchLabel = (batch: StockBatch) => {
    const arrival = batch.arrival_date
      ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(batch.arrival_date))
      : 'No arrival date'
    const description = batch.description?.trim()?.length
      ? batch.description
      : `Batch ${batch.id.slice(0, 8)}`
    return `${arrival} • ${description}`
  }

  const handleBatchFieldChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setBatchForm((previous) => ({ ...previous, [name]: value }))
  }

  const handleLineItemFieldChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    if (name === 'quantity') {
      const numericValue = Number(value)
      setLineItemForm((previous) => ({ ...previous, quantity: Number.isNaN(numericValue) ? 0 : numericValue }))
      return
    }
    setLineItemForm((previous) => ({ ...previous, [name]: value }))
  }

  const handleArrivalDateFilterChange = (event: ChangeEvent<HTMLInputElement>) => {
    setArrivalDateFilter(event.target.value)
    setSelectedExistingBatchId('')
  }

  const handleExistingBatchChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedExistingBatchId(event.target.value)
  }

  const handleUseExistingBatch = () => {
    if (!selectedExistingBatchId) return
    const batch = stockBatches.find((candidate) => candidate.id === selectedExistingBatchId)
    if (!batch) return
    setCreatedBatch(batch)
    setBatchForm({
      warehouse: batch.warehouse_id ?? '',
      arrival_date: batch.arrival_date ?? '',
      description: batch.description ?? '',
    })
    setBatchSuccessMessage('Existing stock selected. Add line items below to continue intake.')
    setItemSuccessMessage(null)
    setLineItems([])
    resetBatchState()
  }

  const handleOpenSupplierModal = () => {
    setShowSupplierModal(true)
    setSupplierForm(initialSupplierForm)
    setSupplierFormError(null)
    resetSupplierState()
  }

  const handleCloseSupplierModal = () => {
    setShowSupplierModal(false)
    setSupplierForm(initialSupplierForm)
    setSupplierFormError(null)
    resetSupplierState()
  }

  const handleSupplierFieldChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    setSupplierForm((previous) => ({ ...previous, [name]: value }))
  }

  const buildSupplierPayload = (): SupplierPayload => {
    const trimOrNull = (value: string) => {
      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed : null
    }
    return {
      name: supplierForm.name.trim(),
      contact_person: trimOrNull(supplierForm.contact_person),
      email: trimOrNull(supplierForm.email),
      phone_number: trimOrNull(supplierForm.phone_number),
      address: trimOrNull(supplierForm.address),
      notes: trimOrNull(supplierForm.notes),
    }
  }

  const handleSupplierSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSupplierFormError(null)
    if (!supplierForm.name.trim()) {
      setSupplierFormError('Supplier name is required.')
      return
    }
    try {
      const payload = buildSupplierPayload()
      const supplier = await createSupplier(payload)
      setLineItemForm((previous) => ({ ...previous, supplier: supplier.id }))
      setShowSupplierModal(false)
      setSupplierForm(initialSupplierForm)
      setItemSuccessMessage('Supplier created. Continue adding stock details below.')
      resetSupplierState()
    } catch (error) {
      const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unable to create supplier.'
      setSupplierFormError(message)
    }
  }

  const handleCreateBatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!hasWarehouses) return
    if (!batchForm.warehouse) return
    try {
      const payload: StockBatchPayload = {
        arrival_date: batchForm.arrival_date ? batchForm.arrival_date : null,
        description: batchForm.description.trim() ? batchForm.description.trim() : null,
      }
      const batch = await createBatch(payload)
      setCreatedBatch(batch)
      setBatchSuccessMessage('Stock record created. Add line items below to complete the intake.')
    } catch (error) {
      console.error('Failed to create stock batch', error)
    }
  }

  const handleAddLineItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!createdBatch) return
    if (!lineItemForm.product) return
    if (!lineItemForm.unit_cost.trim()) return
    if (lineItemForm.quantity <= 0) return

  const warehouseId = createdBatch.warehouse_id ?? batchForm.warehouse

    if (!warehouseId) {
      console.error('Missing warehouse on stock batch, cannot create stock product', {
        createdBatch,
      })
      return
    }

    const payload: StockProductPayload = {
      stock: createdBatch.id,
      warehouse: warehouseId,
      product: lineItemForm.product,
      supplier: lineItemForm.supplier ? lineItemForm.supplier : null,
      quantity: lineItemForm.quantity,
      unit_cost: lineItemForm.unit_cost.trim(),
      unit_tax_rate: lineItemForm.unit_tax_rate.trim() ? lineItemForm.unit_tax_rate.trim() : null,
      unit_tax_amount: lineItemForm.unit_tax_amount.trim() ? lineItemForm.unit_tax_amount.trim() : null,
      unit_additional_cost: lineItemForm.unit_additional_cost.trim() ? lineItemForm.unit_additional_cost.trim() : null,
  retail_price: lineItemForm.retail_price.trim() ? lineItemForm.retail_price.trim() : undefined,
  wholesale_price: lineItemForm.wholesale_price.trim() ? lineItemForm.wholesale_price.trim() : undefined,
      expiry_date: lineItemForm.expiry_date ? lineItemForm.expiry_date : null,
      description: lineItemForm.description.trim() ? lineItemForm.description.trim() : null,
    }

    try {
      const createdItem = await createStockProduct(payload)
      setLineItems((previous) => [createdItem, ...previous])
      setLineItemForm(initialLineItemForm)
      setItemSuccessMessage('Stock item added successfully.')
      onComplete?.(createdBatch.id)
    } catch (error) {
      console.error('Failed to create stock item', error)
    }
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <>
      <Modal show={show} onHide={handleClose} size="lg" centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Record stock intake</Modal.Title>
      </Modal.Header>
      <Modal.Body className="space-y-4">
        <section className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Stock metadata</h3>
            <p className="text-sm text-slate-600">
              Create the stock record by selecting a warehouse and arrival information. You can add products once the stock exists.
            </p>
          </div>

          {batchError ? <Alert variant="danger">{batchError}</Alert> : null}
          {batchSuccessMessage ? <Alert variant="success">{batchSuccessMessage}</Alert> : null}
          {hasExistingStock ? (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-semibold text-slate-800">Append to an existing stock record</h4>
                <p className="text-xs text-slate-600">
                  Filter by arrival date, then pick the stock record you want to extend with new products.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Form.Group controlId="existingStockArrivalDate">
                  <Form.Label>Arrival date filter</Form.Label>
                  <Form.Control
                    type="date"
                    value={arrivalDateFilter}
                    onChange={handleArrivalDateFilterChange}
                    disabled={Boolean(createdBatch)}
                  />
                  <div className="flex items-center justify-between">
                    <Form.Text muted>Leave blank to see every stock record.</Form.Text>
                    {arrivalDateFilter ? (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="px-0"
                        onClick={() => setArrivalDateFilter('')}
                        disabled={Boolean(createdBatch)}
                      >
                        Clear
                      </Button>
                    ) : null}
                  </div>
                </Form.Group>
                <Form.Group controlId="existingStockSelector" className="md:col-span-2">
                  <Form.Label>Existing stock records</Form.Label>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                    <Form.Select
                      value={selectedExistingBatchId}
                      onChange={handleExistingBatchChange}
                      disabled={Boolean(createdBatch) || filteredStockOptions.length === 0}
                    >
                      <option value="">
                        {filteredStockOptions.length === 0 ? 'No records match this arrival date' : 'Select stock'}
                      </option>
                      {filteredStockOptions.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {formatBatchLabel(batch)}
                        </option>
                      ))}
                    </Form.Select>
                    <Button
                      type="button"
                      variant="outline-secondary"
                      onClick={handleUseExistingBatch}
                      disabled={Boolean(createdBatch) || !selectedExistingBatchId}
                    >
                      Use stock
                    </Button>
                  </div>
                  <Form.Text muted>Sorted by newest arrival date first. Selecting one bypasses the creation step.</Form.Text>
                  {arrivalDateFilter && filteredStockOptions.length === 0 ? (
                    <div className="text-xs text-amber-600">No stock records found for this date.</div>
                  ) : null}
                </Form.Group>
              </div>
            </div>
          ) : (
            <Alert variant="info">
              No stock records exist yet. Create a new stock below to begin tracking intake.
            </Alert>
          )}
          {!hasWarehouses ? (
            <Alert variant="info">
              Add a warehouse first to record stock. Visit the Locations workspace to create one, then return here.
            </Alert>
          ) : null}

          <Form onSubmit={handleCreateBatch} className="grid gap-3 md:grid-cols-2">
            <Form.Group controlId="stockWarehouse" className="md:col-span-2">
              <Form.Label>Warehouse</Form.Label>
              <Form.Select
                name="warehouse"
                value={batchForm.warehouse}
                onChange={handleBatchFieldChange}
                disabled={!hasWarehouses || isCreatingBatch || Boolean(createdBatch)}
                required
              >
                <option value="">Select warehouse</option>
                {warehouseOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group controlId="stockArrivalDate">
              <Form.Label>Arrival date</Form.Label>
              <Form.Control
                type="date"
                name="arrival_date"
                value={batchForm.arrival_date}
                onChange={handleBatchFieldChange}
                disabled={isCreatingBatch || Boolean(createdBatch)}
              />
            </Form.Group>
            <Form.Group controlId="stockDescription" className="md:col-span-2">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="description"
                placeholder="Optional notes"
                value={batchForm.description}
                onChange={handleBatchFieldChange}
                disabled={isCreatingBatch || Boolean(createdBatch)}
              />
            </Form.Group>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={!hasWarehouses || isCreatingBatch || Boolean(createdBatch)}>
                {isCreatingBatch ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner animation="border" size="sm" role="status" aria-hidden />
                    Creating…
                  </span>
                ) : createdBatch ? (
                  'Stock created'
                ) : (
                  'Create stock'
                )}
              </Button>
            </div>
          </Form>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Line items</h3>
            <p className="text-sm text-slate-600">
              Add products, landed cost information, and supplier context to this stock.
            </p>
          </div>

          {!createdBatch ? (
            <Alert variant="info">
              Create the stock record above to unlock line item intake.
            </Alert>
          ) : null}

          {stockProductError ? <Alert variant="danger">{stockProductError}</Alert> : null}
          {itemSuccessMessage ? <Alert variant="success">{itemSuccessMessage}</Alert> : null}

          <Form onSubmit={handleAddLineItem} className="grid gap-3 md:grid-cols-2">
            <fieldset className="contents" disabled={!createdBatch}>
              <Form.Group controlId="lineItemProduct">
                <Form.Label>Product</Form.Label>
                <Form.Select
                  name="product"
                  value={lineItemForm.product}
                  onChange={handleLineItemFieldChange}
                  disabled={!createdBatch || isCreatingStockProduct}
                  required
                >
                  <option value="">Select product</option>
                  {productOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group controlId="lineItemSupplier">
                <div className="flex items-center justify-between gap-2">
                  <Form.Label className="mb-0">Supplier</Form.Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="px-0"
                    onClick={handleOpenSupplierModal}
                    disabled={isCreatingStockProduct}
                  >
                    Add supplier
                  </Button>
                </div>
                <Form.Select
                  name="supplier"
                  value={lineItemForm.supplier}
                  onChange={handleLineItemFieldChange}
                  disabled={!createdBatch || isCreatingStockProduct}
                >
                  <option value="">Optional supplier</option>
                  {supplierOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
                {supplierOptions.length === 0 ? (
                  <Form.Text muted>No suppliers yet. Add one to track landed cost partners.</Form.Text>
                ) : null}
              </Form.Group>
              <Form.Group controlId="lineItemQuantity">
                <Form.Label>Quantity</Form.Label>
                <Form.Control
                  type="number"
                  name="quantity"
                  min={0}
                  step={1}
                  value={lineItemForm.quantity}
                  onChange={handleLineItemFieldChange}
                  disabled={!createdBatch || isCreatingStockProduct}
                  required
                />
              </Form.Group>
              <Form.Group controlId="lineItemUnitCost">
                <Form.Label>Unit cost</Form.Label>
                <Form.Control
                  type="number"
                  name="unit_cost"
                  min={0}
                  step="0.01"
                  value={lineItemForm.unit_cost}
                  onChange={handleLineItemFieldChange}
                  disabled={!createdBatch || isCreatingStockProduct}
                  required
                />
              </Form.Group>
              <Form.Group controlId="lineItemTaxRate">
                <Form.Label>Unit tax rate (%)</Form.Label>
                <Form.Control
                  type="number"
                  name="unit_tax_rate"
                  min={0}
                  step="0.01"
                  value={lineItemForm.unit_tax_rate}
                  onChange={handleLineItemFieldChange}
                  disabled={!createdBatch || isCreatingStockProduct}
                />
              </Form.Group>
              <Form.Group controlId="lineItemTaxAmount">
                <Form.Label>Unit tax amount</Form.Label>
                <Form.Control
                  type="number"
                  name="unit_tax_amount"
                  min={0}
                  step="0.01"
                  value={lineItemForm.unit_tax_amount}
                  onChange={handleLineItemFieldChange}
                  disabled={!createdBatch || isCreatingStockProduct}
                />
              </Form.Group>
              <Form.Group controlId="lineItemAdditionalCost">
                <Form.Label>Unit additional cost</Form.Label>
                <Form.Control
                  type="number"
                  name="unit_additional_cost"
                  min={0}
                  step="0.01"
                  value={lineItemForm.unit_additional_cost}
                  onChange={handleLineItemFieldChange}
                  disabled={!createdBatch || isCreatingStockProduct}
                />
              </Form.Group>
              <Form.Group controlId="lineItemRetailPrice">
                <Form.Label>Retail price</Form.Label>
                <Form.Control
                  type="number"
                  name="retail_price"
                  min={0}
                  step="0.01"
                  value={lineItemForm.retail_price}
                  onChange={handleLineItemFieldChange}
                  disabled={!createdBatch || isCreatingStockProduct}
                />
                <Form.Text muted>Optional — price point shown to customers.</Form.Text>
              </Form.Group>
              <Form.Group controlId="lineItemWholesalePrice">
                <Form.Label>Wholesale price</Form.Label>
                <Form.Control
                  type="number"
                  name="wholesale_price"
                  min={0}
                  step="0.01"
                  value={lineItemForm.wholesale_price}
                  onChange={handleLineItemFieldChange}
                  disabled={!createdBatch || isCreatingStockProduct}
                />
                <Form.Text muted>Optional — preferred bulk sale price.</Form.Text>
              </Form.Group>
              <Form.Group controlId="lineItemExpiry">
                <Form.Label>Expiry date</Form.Label>
                <Form.Control
                  type="date"
                  name="expiry_date"
                  value={lineItemForm.expiry_date}
                  onChange={handleLineItemFieldChange}
                  disabled={!createdBatch || isCreatingStockProduct}
                />
              </Form.Group>
              <Form.Group controlId="lineItemDescription" className="md:col-span-2">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="description"
                  placeholder="Optional notes for handlers"
                  value={lineItemForm.description}
                  onChange={handleLineItemFieldChange}
                  disabled={!createdBatch || isCreatingStockProduct}
                />
              </Form.Group>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={!createdBatch || isCreatingStockProduct}>
                  {isCreatingStockProduct ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner animation="border" size="sm" role="status" aria-hidden />
                      Saving…
                    </span>
                  ) : (
                    'Add item'
                  )}
                </Button>
              </div>
            </fieldset>
          </Form>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Items added</h4>
            <div className="max-h-60 overflow-auto">
              <Table size="sm" hover responsive>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th className="text-end">Unit cost</th>
                    <th className="text-end">Retail price</th>
                    <th className="text-end">Wholesale price</th>
                    <th className="text-end">Landed unit</th>
                    <th className="text-end">Total landed</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-3 text-center text-sm text-slate-500">
                        No items added yet.
                      </td>
                    </tr>
                  ) : (
                    lineItems.map((item) => (
                      <tr key={item.id}>
                        <td>{item.product_name ?? '—'}</td>
                        <td>{item.quantity.toLocaleString()}</td>
                        <td className="text-end">{formatCurrency(item.unit_cost ?? 0)}</td>
                        <td className="text-end">{formatCurrency(item.retail_price ?? 0)}</td>
                        <td className="text-end">{formatCurrency(item.wholesale_price ?? 0)}</td>
                        <td className="text-end">{formatCurrency(item.landed_unit_cost ?? 0)}</td>
                        <td className="text-end">{formatCurrency(item.total_landed_cost ?? 0)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </div>
        </section>
      </Modal.Body>
      <Modal.Footer className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          {createdBatch ? 'Stock saved. You can continue adding items or close the dialog.' : 'Create the stock to begin adding items.'}
        </div>
        <div className="flex gap-2">
          <Button variant="outline-secondary" onClick={handleClose}>
            Close
          </Button>
        </div>
      </Modal.Footer>
      </Modal>

      <Modal show={showSupplierModal} onHide={handleCloseSupplierModal} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Add supplier</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSupplierSubmit}>
          <Modal.Body className="space-y-3">
            <p className="text-sm text-slate-600">
              Capture supplier details so future stock receipts remain linked to cost history.
            </p>
            {supplierFormError ? <Alert variant="warning">{supplierFormError}</Alert> : null}
            {supplierError ? <Alert variant="danger">{supplierError}</Alert> : null}
            <Form.Group controlId="supplierName">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={supplierForm.name}
                onChange={handleSupplierFieldChange}
                placeholder="e.g. Acme Supplies"
                disabled={isCreatingSupplier}
                required
              />
            </Form.Group>
            <Form.Group controlId="supplierContact">
              <Form.Label>Contact person</Form.Label>
              <Form.Control
                type="text"
                name="contact_person"
                value={supplierForm.contact_person}
                onChange={handleSupplierFieldChange}
                placeholder="Optional contact name"
                disabled={isCreatingSupplier}
              />
            </Form.Group>
            <Form.Group controlId="supplierEmail">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={supplierForm.email}
                onChange={handleSupplierFieldChange}
                placeholder="name@example.com"
                disabled={isCreatingSupplier}
              />
            </Form.Group>
            <Form.Group controlId="supplierPhone">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                type="tel"
                name="phone_number"
                value={supplierForm.phone_number}
                onChange={handleSupplierFieldChange}
                placeholder="Optional phone number"
                disabled={isCreatingSupplier}
              />
            </Form.Group>
            <Form.Group controlId="supplierAddress">
              <Form.Label>Address</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="address"
                value={supplierForm.address}
                onChange={handleSupplierFieldChange}
                placeholder="Street, city, region"
                disabled={isCreatingSupplier}
              />
            </Form.Group>
            <Form.Group controlId="supplierNotes">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="notes"
                value={supplierForm.notes}
                onChange={handleSupplierFieldChange}
                placeholder="Optional internal notes"
                disabled={isCreatingSupplier}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="flex items-center justify-between">
            <Button type="button" variant="outline-secondary" onClick={handleCloseSupplierModal} disabled={isCreatingSupplier}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreatingSupplier}>
              {isCreatingSupplier ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner animation="border" size="sm" role="status" aria-hidden />
                  Saving…
                </span>
              ) : (
                'Save supplier'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  )
}

export default StockIntakeModal
