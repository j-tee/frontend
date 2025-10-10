import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import Alert from 'react-bootstrap/Alert'
import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import Stack from 'react-bootstrap/Stack'
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import Tooltip from 'react-bootstrap/Tooltip'
import { fetchProductStockReconciliation } from '../../../services/inventoryService'
import type {
  StockBatch,
  StockProduct,
  StockProductPayload,
  StockReconciliationResponse,
  Supplier,
  Warehouse,
} from '../../../types/inventory.js'

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

const toNumberOrNull = (value: unknown): number | null => {
  if (value == null) {
    return null
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const clampToNonNegative = (value: number | null): number | null => {
  if (value == null) {
    return null
  }
  return Math.max(0, Math.round(value))
}

const toRoundedNumberOrNull = (value: unknown): number | null => {
  const parsed = toNumberOrNull(value)
  if (parsed == null) {
    return null
  }
  return Math.round(parsed)
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
  const [reconciliationSnapshot, setReconciliationSnapshot] = useState<StockReconciliationResponse | null>(null)
  const [reconciliationLoading, setReconciliationLoading] = useState(false)
  const [reconciliationError, setReconciliationError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const resetReconciliationState = useCallback(() => {
    if (!isMountedRef.current) {
      return
    }
    setReconciliationSnapshot(null)
    setReconciliationError(null)
    setReconciliationLoading(false)
  }, [])

  const fetchReconciliationSnapshot = useCallback(async () => {
    const productId = stockProduct?.product

    if (!productId) {
      resetReconciliationState()
      return
    }

    try {
      setReconciliationLoading(true)
      setReconciliationError(null)

      const snapshot = await fetchProductStockReconciliation(productId)

      if (isMountedRef.current && stockProduct?.product === productId) {
        setReconciliationSnapshot(snapshot)
      }
    } catch (error) {
      console.error('[StockProductDetailModal] Failed to fetch stock reconciliation snapshot', {
        stockProductId: stockProduct?.id,
        productId: stockProduct?.product,
        error,
      })

      if (isMountedRef.current) {
        setReconciliationSnapshot(null)
        setReconciliationError('Unable to fetch reconciliation snapshot right now.')
      }
    } finally {
      if (isMountedRef.current) {
        setReconciliationLoading(false)
      }
    }
  }, [resetReconciliationState, stockProduct?.id, stockProduct?.product])

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

  const reconciliationMetrics = useMemo(() => {
    if (!stockProduct) {
      return {
        recordedBatchSize: null as number | null,
        warehouseOnHand: null as number | null,
        warehouseUnreserved: null as number | null,
        storefrontOnHand: null as number | null,
        storefrontSellable: null as number | null,
        reservations: null as number | null,
        reservationsLinked: null as number | null,
        reservationsOrphaned: null as number | null,
        sold: null as number | null,
        shrinkage: null as number | null,
        corrections: null as number | null,
        netAdjustments: null as number | null,
        calculatedBaseline: null as number | null,
        baselineDelta: null as number | null,
      }
    }

    const snapshot = reconciliationSnapshot

    const recordedBatchSize = clampToNonNegative(
      toNumberOrNull(snapshot?.warehouse?.recorded_quantity) ?? toNumberOrNull(stockProduct.quantity),
    )

    const warehouseOnHand = clampToNonNegative(
      toNumberOrNull(snapshot?.formula?.warehouse_inventory_on_hand) ??
        toNumberOrNull(snapshot?.warehouse?.inventory_on_hand),
    )

    const warehouseUnreserved = clampToNonNegative(
      toNumberOrNull(snapshot?.formula?.warehouse_unreserved_units),
    )

    const storefrontOnHand = clampToNonNegative(
      toNumberOrNull(snapshot?.formula?.storefront_on_hand) ??
        toNumberOrNull(snapshot?.storefront?.total_on_hand),
    )

    const reservationsLinked = clampToNonNegative(toNumberOrNull(snapshot?.reservations?.linked_units))
    const reservationsOrphaned = clampToNonNegative(toNumberOrNull(snapshot?.reservations?.orphaned_units))
    const reservationsFromFormula = clampToNonNegative(
      toNumberOrNull(snapshot?.formula?.active_reservations_units),
    )

    let reservations = reservationsFromFormula
    if (reservations == null) {
      if (reservationsLinked != null || reservationsOrphaned != null) {
        reservations = clampToNonNegative((reservationsLinked ?? 0) + (reservationsOrphaned ?? 0))
      } else {
        reservations = clampToNonNegative(toNumberOrNull(stockProduct.reserved_quantity))
      }
    }

    const storefrontSellable = clampToNonNegative(
      toNumberOrNull(snapshot?.formula?.storefront_sellable_units) ??
        (storefrontOnHand != null && reservations != null ? storefrontOnHand - reservations : null),
    )

    const sold = clampToNonNegative(
      toNumberOrNull(snapshot?.formula?.completed_sales_units) ??
        toNumberOrNull(snapshot?.sales?.completed_units) ??
        toNumberOrNull(stockProduct.quantity_sold),
    )

    const shrinkage = clampToNonNegative(
      toNumberOrNull(snapshot?.formula?.shrinkage_units) ??
        toNumberOrNull(snapshot?.adjustments?.shrinkage_units),
    )

    const corrections = clampToNonNegative(
      toNumberOrNull(snapshot?.formula?.correction_units) ??
        toNumberOrNull(snapshot?.adjustments?.correction_units),
    )

    const netAdjustmentsFormula = toRoundedNumberOrNull(snapshot?.formula?.net_adjustment_units)
    const netAdjustments =
      netAdjustmentsFormula ?? (shrinkage == null && corrections == null ? null : (corrections ?? 0) - (shrinkage ?? 0))

    const calculatedBaseline = toRoundedNumberOrNull(snapshot?.formula?.calculated_baseline)
    const baselineDelta = toRoundedNumberOrNull(snapshot?.formula?.baseline_vs_recorded_delta)

    return {
      recordedBatchSize,
      warehouseOnHand,
      warehouseUnreserved,
      storefrontOnHand,
      storefrontSellable,
      reservations,
      reservationsLinked,
      reservationsOrphaned,
      sold,
      shrinkage,
      corrections,
      netAdjustments,
      calculatedBaseline,
      baselineDelta,
    }
  }, [reconciliationSnapshot, stockProduct])

  const storefrontBreakdown = useMemo(() => {
    const entries = reconciliationSnapshot?.storefront?.entries ?? []
    if (!entries.length) {
      return [] as Array<{
        key: string
        name: string
        onHand: number | null
        sellable: number | null
        reserved: number | null
        linked: number | null
        orphaned: number | null
      }>
    }

    return entries.map((entry, index) => {
      const onHand = clampToNonNegative(toNumberOrNull(entry.on_hand))
      const linked = clampToNonNegative(toNumberOrNull(entry.linked_reservations))
      const orphaned = clampToNonNegative(toNumberOrNull(entry.orphaned_reservations))
      const reservedSum =
        linked == null && orphaned == null ? null : clampToNonNegative((linked ?? 0) + (orphaned ?? 0))

      const sellable =
        onHand == null
          ? null
          : reservedSum == null
            ? onHand
            : clampToNonNegative(onHand - (reservedSum ?? 0))

      return {
        key: entry.storefront ? String(entry.storefront) : `storefront-${index}`,
        name: entry.storefront_name ?? `Storefront ${index + 1}`,
        onHand,
        sellable,
        reserved: reservedSum,
        linked,
        orphaned,
      }
    })
  }, [reconciliationSnapshot])

  const formatQuantity = useCallback((value: number | null) => {
    if (value == null) return '—'
    return value.toLocaleString()
  }, [])

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

  useEffect(() => {
    if (!show || !stockProduct) {
      resetReconciliationState()
      return
    }

    void fetchReconciliationSnapshot()
  }, [fetchReconciliationSnapshot, resetReconciliationState, show, stockProduct])

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
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>
                    {reconciliationLoading
                      ? 'Loading stock reconciliation…'
                      : reconciliationSnapshot?.generated_at
                        ? `Reconciled ${formatDateTime(reconciliationSnapshot.generated_at)}`
                        : 'Reconciliation snapshot not available yet.'}
                  </span>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => {
                      void fetchReconciliationSnapshot()
                    }}
                    disabled={reconciliationLoading}
                  >
                    {reconciliationLoading ? 'Refreshing…' : 'Refresh snapshot'}
                  </Button>
                </div>
                {reconciliationError ? (
                  <div className="mt-1 text-xs text-danger">{reconciliationError}</div>
                ) : null}
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
                    <span className="font-medium text-slate-700">Recorded batch size:</span>{' '}
                    <Badge bg="dark" pill>
                      {formatQuantity(reconciliationMetrics.recordedBatchSize)}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Landed unit cost:</span>{' '}
                    {formatDecimal(stockProduct.landed_unit_cost)}
                  </div>
                </div>
                <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <span className="font-medium text-slate-700">Warehouse on hand:</span>{' '}
                    <Badge bg="info" pill>
                      {formatQuantity(reconciliationMetrics.warehouseOnHand)}
                    </Badge>
                    {reconciliationMetrics.warehouseUnreserved !== null &&
                      reconciliationMetrics.warehouseOnHand !== null &&
                      reconciliationMetrics.warehouseUnreserved !== reconciliationMetrics.warehouseOnHand ? (
                        <div className="text-muted small mt-1">
                          Unreserved: {formatQuantity(reconciliationMetrics.warehouseUnreserved)}
                        </div>
                      ) : null}
                  </div>
                  <div>
                    <OverlayTrigger
                      placement="top"
                      overlay={(
                        <Tooltip id="storefront-availability-tooltip">
                          Sum of completed transfers currently on storefront shelves. Sellable excludes active
                          reservations.
                        </Tooltip>
                      )}
                    >
                      <span className="font-medium text-slate-700 d-inline-flex align-items-center gap-1">
                        Storefront on hand
                      </span>
                    </OverlayTrigger>
                    {' '}
                    <Badge bg="primary" pill>
                      {formatQuantity(reconciliationMetrics.storefrontOnHand)}
                    </Badge>
                    {reconciliationMetrics.storefrontSellable !== null ? (
                      <div className="text-muted small mt-1">
                        Sellable now: {formatQuantity(reconciliationMetrics.storefrontSellable)}
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Units sold:</span>{' '}
                    <Badge bg="secondary" pill>
                      {formatQuantity(reconciliationMetrics.sold)}
                    </Badge>
                    {reconciliationMetrics.recordedBatchSize !== null ? (
                      <div className="text-muted small mt-1">
                        Recorded batch size: {formatQuantity(reconciliationMetrics.recordedBatchSize)}
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Active reservations:</span>{' '}
                    <Badge bg="warning" text="dark" pill>
                      {formatQuantity(reconciliationMetrics.reservations)}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Shrinkage / write-offs:</span>{' '}
                    <Badge bg="danger" pill>
                      {formatQuantity(reconciliationMetrics.shrinkage)}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Corrections applied:</span>{' '}
                    <Badge bg="success" pill>
                      {formatQuantity(reconciliationMetrics.corrections)}
                    </Badge>
                    {reconciliationMetrics.netAdjustments !== null ? (
                      <div className="text-muted small mt-1">
                        Net adjustment:{' '}
                        {reconciliationMetrics.netAdjustments > 0
                          ? '+'
                          : reconciliationMetrics.netAdjustments < 0
                            ? '−'
                            : ''}
                        {formatQuantity(Math.abs(reconciliationMetrics.netAdjustments ?? 0))}
                        {reconciliationMetrics.netAdjustments !== 0 ? (
                          <>
                            {' '}
                            {reconciliationMetrics.netAdjustments > 0 ? '(adds units)' : '(removes units)'}
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
                {reconciliationMetrics.calculatedBaseline !== null ? (
                  <div className="mt-3 rounded-xl bg-slate-100 p-3 text-xs text-slate-600">
                    Warehouse ({formatQuantity(reconciliationMetrics.warehouseOnHand)}) + Storefront ({formatQuantity(reconciliationMetrics.storefrontOnHand)}) + Sold ({formatQuantity(reconciliationMetrics.sold)}) − Shrinkage ({formatQuantity(reconciliationMetrics.shrinkage)}) + Corrections ({formatQuantity(reconciliationMetrics.corrections)}) − Reservations ({formatQuantity(reconciliationMetrics.reservations)}) = {formatQuantity(reconciliationMetrics.calculatedBaseline)}
                    {' '}
                    &mdash; Recorded batch size {formatQuantity(reconciliationMetrics.recordedBatchSize)}
                  </div>
                ) : null}
                {reconciliationMetrics.baselineDelta !== null && reconciliationMetrics.baselineDelta !== 0 ? (
                  <Alert variant="warning" className="mt-3 mb-0">
                    <div className="d-flex align-items-start gap-2">
                      <span className="fw-bold">⚠️</span>
                      <div className="flex-grow-1">
                        <div className="fw-semibold mb-1">
                          Reconciliation mismatch detected: {formatQuantity(Math.abs(reconciliationMetrics.baselineDelta))} units{' '}
                          {reconciliationMetrics.baselineDelta > 0 ? 'over' : 'under'} accounted
                        </div>
                        <div className="small text-muted">
                          <div>Possible causes:</div>
                          <ul className="mb-0 ps-3">
                            <li>Unrecorded transfers or intake</li>
                            <li>Incorrect shrinkage/adjustment entries</li>
                            <li>Data entry errors in batch size</li>
                          </ul>
                          <div className="mt-1">
                            Contact inventory team to investigate transaction history for this product.
                          </div>
                        </div>
                      </div>
                    </div>
                  </Alert>
                ) : null}
                {storefrontBreakdown.length > 0 ? (
                  <div className="mt-3 rounded-xl border border-slate-200 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Storefront breakdown
                    </div>
                    <div className="mt-2 flex flex-col gap-2 text-sm">
                      {storefrontBreakdown.map((entry) => (
                        <div key={entry.key} className="d-flex flex-column gap-1">
                          <div className="d-flex flex-wrap justify-between gap-2">
                            <span className="font-medium text-slate-700">{entry.name}</span>
                            <span className="text-slate-600">
                              On hand: {formatQuantity(entry.onHand)} • Sellable: {formatQuantity(entry.sellable)} • Reserved: {formatQuantity(entry.reserved)}
                            </span>
                          </div>
                          {entry.linked !== null || entry.orphaned !== null ? (
                            <div className="text-muted small">
                              Linked: {formatQuantity(entry.linked)} • Orphaned: {formatQuantity(entry.orphaned)}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

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
