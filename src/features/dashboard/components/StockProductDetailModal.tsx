import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import Stack from 'react-bootstrap/Stack'
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import Tooltip from 'react-bootstrap/Tooltip'
import { fetchProductStockReconciliation } from '../../../services/inventoryService'
import StockFilterPanel, { type StockFilters } from './StockFilterPanel'
import type {
  BatchInfo,
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
  stockProducts?: StockProduct[] // Optional: list of all stock products to find batches for same product
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
  stockProducts = [], // Default to empty array
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
  const [filters, setFilters] = useState<StockFilters>({
    batchId: null,
    warehouseId: null,
    showExpiredOnly: false,
  })
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
    if (!stockProduct) return null
    if (stockProduct.warehouse_name) return null
    const warehouseId = stockProduct.warehouse ?? stockBatch?.warehouse_id ?? null
    if (!warehouseId) return null
    return warehouses.find((item) => item.id === warehouseId) ?? null
  }, [stockBatch?.warehouse_id, stockProduct, warehouses])

  // Compute available batches for the same product
  const availableBatches = useMemo((): BatchInfo[] => {
    if (!stockProduct?.product) return []
    
    console.log('[BatchFilter] Computing batches for product:', stockProduct.product_name)
    console.log('[BatchFilter] Product ID:', stockProduct.product)
    console.log('[BatchFilter] StockProducts list:', stockProducts)
    
    // Find all stock products with the same product ID
    const sameProductStocks = stockProducts.filter(sp => sp.product === stockProduct.product)
    console.log('[BatchFilter] Found stock products for same product:', sameProductStocks)
    
    // Get unique batch IDs from those stock products
    const uniqueBatchIds = new Set<string>()
    sameProductStocks.forEach(sp => {
      const batchId = sp.stock_batch ?? sp.stock
      if (batchId) {
        uniqueBatchIds.add(batchId)
      }
    })
    
    console.log('[BatchFilter] Unique batch IDs:', Array.from(uniqueBatchIds))
    
    // Map batch IDs to batch info
    const batches = Array.from(uniqueBatchIds)
      .map(batchId => {
        const batch = stockBatches.find(b => b.id === batchId)
        if (!batch) return null
        
        return {
          id: batch.id,
          batch_identifier: batch.description || `Batch ${batch.id.slice(0, 8)}`,
          batch_size: batch.total_quantity || 0,
          created_at: batch.created_at || '',
          arrival_date: batch.arrival_date || '',
        }
      })
      .filter((b): b is BatchInfo => b !== null)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    
    console.log('[BatchFilter] Final batches list:', batches)
    console.log('[BatchFilter] Batches count:', batches.length, '- Dropdown will', batches.length > 1 ? 'SHOW' : 'HIDE')
    
    return batches
  }, [stockProduct, stockBatches, stockProducts])

  // Compute available warehouses for the same product (for filtering purposes)
  const availableWarehouses = useMemo(() => {
    if (!stockProduct?.product) return warehouses
    
    // Find unique warehouses where this product exists
    const sameProductStocks = stockProducts.filter(sp => sp.product === stockProduct.product)
    const warehouseIds = new Set<string>()
    
    sameProductStocks.forEach(sp => {
      const warehouseId = sp.warehouse
      if (warehouseId) {
        warehouseIds.add(warehouseId)
      }
    })
    
    // Return only warehouses that have this product
    return warehouses.filter(w => warehouseIds.has(w.id))
  }, [stockProduct, stockProducts, warehouses])

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
        toNumberOrNull(snapshot?.storefront?.sellable_now) ??
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
        location: string | null
        onHand: number | null
        sellable: number | null
        reserved: number | null
        linked: number | null
        orphaned: number | null
        transferred: number | null
        sold: number | null
        transferDate: string | null
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

      // TODO: Backend integration - these fields need to be added to API response
      const transferred = clampToNonNegative(toNumberOrNull(entry.transferred_quantity))
      const sold = clampToNonNegative(toNumberOrNull(entry.sold_quantity))
      const location = entry.location ?? null
      const transferDate = entry.last_transfer_date ?? null

      return {
        key: entry.storefront ? String(entry.storefront) : `storefront-${index}`,
        name: entry.storefront_name ?? `Storefront ${index + 1}`,
        location,
        onHand,
        sellable,
        reserved: reservedSum,
        linked,
        orphaned,
        transferred,
        sold,
        transferDate,
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
      setFilters({
        batchId: null,
        warehouseId: null,
        showExpiredOnly: false,
      })
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
      payload.retail_price = formValues.retail_price ? formValues.retail_price : undefined
    }
    if (changedFields.has('wholesale_price')) {
      payload.wholesale_price = formValues.wholesale_price ? formValues.wholesale_price : undefined
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
    <Modal show={show} onHide={onClose} size="xl" backdrop="static" centered>
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

              <div className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 shadow-sm border border-slate-200">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Product</div>
                    <div className="text-xl font-bold text-slate-900">{stockProduct.product_name ?? '—'}</div>
                    <div className="text-sm text-slate-600 font-medium mt-1">SKU: {stockProduct.product_sku ?? '—'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Updated {formatDateTime(stockProduct.updated_at)}</div>
                    <div className="text-xs text-slate-500">Created {formatDateTime(stockProduct.created_at)}</div>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-lg border border-slate-200 mb-4">
                  <div className="flex-1 min-w-[200px]">
                    <span className="text-xs text-slate-600">
                      {reconciliationLoading
                        ? '🔄 Loading stock reconciliation…'
                        : reconciliationSnapshot?.generated_at
                          ? `✅ Reconciled ${formatDateTime(reconciliationSnapshot.generated_at)}`
                          : '⏳ Reconciliation snapshot not available yet.'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => {
                      void fetchReconciliationSnapshot()
                    }}
                    disabled={reconciliationLoading}
                  >
                    {reconciliationLoading ? '⟳ Refreshing…' : '↻ Refresh snapshot'}
                  </Button>
                </div>
                {reconciliationError ? (
                  <Alert variant="danger" className="mb-3 py-2 text-sm">
                    {reconciliationError}
                  </Alert>
                ) : null}

                {/* Multi-Filter Panel */}
                <StockFilterPanel
                  batches={availableBatches}
                  warehouses={availableWarehouses}
                  currentWarehouseId={stockProduct.warehouse ?? stockBatch?.warehouse_id}
                  filters={filters}
                  onFilterChange={setFilters}
                  disabled={reconciliationLoading || isUpdating || isDeleting}
                />

                {/* Key Metrics - Enhanced Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  {/* Recorded Batch Size */}
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-3 border border-indigo-200 shadow-sm">
                    <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-1">Batch Size</div>
                    <div className="text-2xl font-bold text-indigo-900">{formatQuantity(reconciliationMetrics.recordedBatchSize)}</div>
                    <div className="text-xs text-indigo-600 mt-1">Recorded</div>
                  </div>

                  {/* Warehouse Inventory */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200 shadow-sm">
                    <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Warehouse</div>
                    <div className="text-2xl font-bold text-blue-900">{formatQuantity(reconciliationMetrics.warehouseOnHand)}</div>
                    <div className="text-xs text-blue-600 mt-1">On hand</div>
                  </div>

                  {/* Storefront Inventory */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200 shadow-sm">
                    <div className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">Storefront</div>
                    <div className="text-2xl font-bold text-purple-900">{formatQuantity(reconciliationMetrics.storefrontOnHand)}</div>
                    <div className="text-xs text-purple-600 mt-1">Transferred</div>
                  </div>

                  {/* Available for Sale */}
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-3 border border-emerald-200 shadow-sm">
                    <OverlayTrigger
                      placement="top"
                      overlay={(
                        <Tooltip id="sellable-card-tooltip">
                          Current available inventory for sale (after deducting sold units and reservations)
                        </Tooltip>
                      )}
                    >
                      <div>
                        <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">Available</div>
                        <div className="text-2xl font-bold text-emerald-900">{formatQuantity(reconciliationMetrics.storefrontSellable)}</div>
                        <div className="text-xs text-emerald-600 mt-1">For sale</div>
                      </div>
                    </OverlayTrigger>
                  </div>
                </div>

                {/* Secondary Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  {/* Units Sold */}
                  <div className="bg-white rounded-lg p-3 border-2 border-slate-200">
                    <OverlayTrigger
                      placement="top"
                      overlay={(
                        <Tooltip id="sold-units-card-tooltip">
                          Total completed sales. Tracked separately from reconciliation.
                        </Tooltip>
                      )}
                    >
                      <div>
                        <div className="text-xs font-medium text-slate-600 mb-1">💰 Sold</div>
                        <div className="text-xl font-bold text-slate-900">{formatQuantity(reconciliationMetrics.sold)}</div>
                      </div>
                    </OverlayTrigger>
                  </div>

                  {/* Reservations */}
                  <div className="bg-white rounded-lg p-3 border-2 border-amber-200">
                    <div className="text-xs font-medium text-amber-700 mb-1">🔒 Reserved</div>
                    <div className="text-xl font-bold text-amber-900">{formatQuantity(reconciliationMetrics.reservations)}</div>
                  </div>

                  {/* Shrinkage */}
                  <div className="bg-white rounded-lg p-3 border-2 border-red-200">
                    <div className="text-xs font-medium text-red-700 mb-1">📉 Shrinkage</div>
                    <div className="text-xl font-bold text-red-900">{formatQuantity(reconciliationMetrics.shrinkage)}</div>
                  </div>

                  {/* Corrections */}
                  <div className="bg-white rounded-lg p-3 border-2 border-green-200">
                    <div className="text-xs font-medium text-green-700 mb-1">✏️ Corrections</div>
                    <div className="text-xl font-bold text-green-900">{formatQuantity(reconciliationMetrics.corrections)}</div>
                  </div>
                </div>

                {/* Warehouse and Batch Info */}
                <div className="grid gap-3 sm:grid-cols-2 mb-4">
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Warehouse</div>
                    <div className="text-sm font-medium text-slate-900">
                      {stockProduct.warehouse_name ?? warehouse?.name ?? '—'}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Batch</div>
                    <div className="text-sm font-medium text-slate-900">
                      {stockBatch?.description?.length
                        ? stockBatch.description
                        : stockBatch
                          ? `Batch ${stockBatch.id.slice(0, 8)}`
                          : stockProduct.stock_batch
                            ? `Batch ${stockProduct.stock_batch.slice(0, 8)}`
                            : '—'}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Landed Cost</div>
                    <div className="text-sm font-bold text-slate-900">
                      ${formatDecimal(stockProduct.landed_unit_cost)}
                    </div>
                  </div>
                  {reconciliationMetrics.netAdjustments !== null && reconciliationMetrics.netAdjustments !== 0 ? (
                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Net Adjustment</div>
                      <div className={`text-sm font-bold ${reconciliationMetrics.netAdjustments > 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {reconciliationMetrics.netAdjustments > 0 ? '+' : '−'}
                        {formatQuantity(Math.abs(reconciliationMetrics.netAdjustments))} units
                        <span className="text-xs ml-1">
                          {reconciliationMetrics.netAdjustments > 0 ? '(adds)' : '(removes)'}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
                {reconciliationMetrics.calculatedBaseline !== null ? (
                  <div className="mt-3 rounded-xl bg-slate-100 p-3">
                    <div className="text-xs text-slate-600">
                      <strong>Reconciliation Formula:</strong>
                    </div>
                    <div className="text-xs text-slate-700 mt-1 font-mono">
                      Warehouse ({formatQuantity(reconciliationMetrics.warehouseOnHand)}) + Storefront transferred ({formatQuantity(reconciliationMetrics.storefrontOnHand)}) − Shrinkage ({formatQuantity(reconciliationMetrics.shrinkage)}) + Corrections ({formatQuantity(reconciliationMetrics.corrections)}) − Reservations ({formatQuantity(reconciliationMetrics.reservations)}) = {formatQuantity(reconciliationMetrics.calculatedBaseline)}
                    </div>
                    <div className="text-xs text-slate-500 mt-2 pt-2 border-top">
                      <div>Recorded batch size: <strong>{formatQuantity(reconciliationMetrics.recordedBatchSize)}</strong></div>
                      {reconciliationMetrics.baselineDelta !== null && reconciliationMetrics.baselineDelta === 0 && (
                        <div className="text-success mt-1">✅ Inventory is balanced</div>
                      )}
                    </div>
                    {(reconciliationMetrics.storefrontSellable !== null || (reconciliationMetrics.sold !== null && reconciliationMetrics.sold > 0)) && (
                      <div className="text-xs text-slate-500 mt-2 pt-2 border-top">
                        <div className="fw-semibold mb-1">Additional Information:</div>
                        {reconciliationMetrics.storefrontSellable !== null && (
                          <div>• Available for sale: {formatQuantity(reconciliationMetrics.storefrontSellable)} units</div>
                        )}
                        {reconciliationMetrics.sold !== null && reconciliationMetrics.sold > 0 && (
                          <div>• Units sold: {formatQuantity(reconciliationMetrics.sold)} (tracked separately, doesn't affect reconciliation)</div>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
                {reconciliationMetrics.baselineDelta !== null && reconciliationMetrics.baselineDelta !== 0 ? (
                  <Alert variant="warning" className="mt-3 mb-0">
                    <div className="d-flex align-items-start gap-2">
                      <span className="fw-bold">⚠️</span>
                      <div className="flex-grow-1">
                        <div className="fw-semibold mb-1">
                          Reconciliation mismatch detected: {formatQuantity(Math.abs(reconciliationMetrics.baselineDelta))} units{' '}
                          {reconciliationMetrics.baselineDelta > 0 ? 'under accounted' : 'over accounted'}
                        </div>
                        <div className="small">
                          {reconciliationMetrics.baselineDelta > 0 ? (
                            <div className="mb-2">
                              <strong>Meaning:</strong> The recorded batch quantity ({formatQuantity(reconciliationMetrics.recordedBatchSize)}) is LESS than 
                              the calculated baseline ({formatQuantity(reconciliationMetrics.calculatedBaseline)}). 
                              You have {formatQuantity(Math.abs(reconciliationMetrics.baselineDelta))} more units in the system than originally recorded.
                            </div>
                          ) : (
                            <div className="mb-2">
                              <strong>Meaning:</strong> The recorded batch quantity ({formatQuantity(reconciliationMetrics.recordedBatchSize)}) is MORE than 
                              the calculated baseline ({formatQuantity(reconciliationMetrics.calculatedBaseline)}). 
                              You have {formatQuantity(Math.abs(reconciliationMetrics.baselineDelta))} fewer units in the system than originally recorded.
                            </div>
                          )}
                          <div>Possible causes:</div>
                          <ul className="mb-0 ps-3">
                            <li>Unrecorded transfers or intake</li>
                            <li>Incorrect shrinkage/adjustment entries</li>
                            <li>Data entry errors in batch size</li>
                            <li>Physical inventory discrepancies (theft, damage, misplacement)</li>
                          </ul>
                          <div className="mt-2 fst-italic">
                            Contact inventory team to investigate transaction history for this product.
                          </div>
                        </div>
                      </div>
                    </div>
                  </Alert>
                ) : null}
                {storefrontBreakdown.length > 0 ? (
                  <div className="mt-4">
                    <div className="mb-3">
                      <div className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                        <span>🏪</span>
                        <span>Storefront Breakdown</span>
                        <span className="text-xs font-normal text-slate-500 normal-case">
                          ({storefrontBreakdown.length} {storefrontBreakdown.length === 1 ? 'location' : 'locations'})
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {storefrontBreakdown.map((entry) => (
                        <div key={entry.key} className="bg-white rounded-lg border-2 border-slate-200 overflow-hidden hover:border-blue-300 hover:shadow-md transition-all">
                          {/* Storefront Header */}
                          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 border-b border-slate-200">
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex-1">
                                <div className="text-base font-bold text-slate-900">{entry.name}</div>
                                {entry.location ? (
                                  <div className="text-xs text-slate-600 mt-1">📍 {entry.location}</div>
                                ) : (
                                  <div className="text-xs text-slate-400 mt-1 italic">Location not available</div>
                                )}
                              </div>
                              {entry.transferDate ? (
                                <div className="text-xs text-slate-500">
                                  <div>Last transfer:</div>
                                  <div className="font-medium">{formatDateTime(entry.transferDate)}</div>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {/* Metrics Grid */}
                          <div className="p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {/* Total Transferred */}
                              {entry.transferred !== null ? (
                                <div className="text-center p-2 bg-blue-50 rounded border border-blue-200">
                                  <div className="text-xs text-blue-600 font-medium mb-1">Transferred</div>
                                  <div className="text-xl font-bold text-blue-900">{formatQuantity(entry.transferred)}</div>
                                </div>
                              ) : (
                                <div className="text-center p-2 bg-slate-50 rounded border border-slate-200">
                                  <div className="text-xs text-slate-400 font-medium mb-1">Transferred</div>
                                  <div className="text-sm text-slate-400 italic">Not available</div>
                                </div>
                              )}

                              {/* On Hand */}
                              <div className="text-center p-2 bg-purple-50 rounded border border-purple-200">
                                <div className="text-xs text-purple-600 font-medium mb-1">On Hand</div>
                                <div className="text-xl font-bold text-purple-900">{formatQuantity(entry.onHand)}</div>
                              </div>

                              {/* Sellable */}
                              <div className="text-center p-2 bg-emerald-50 rounded border border-emerald-200">
                                <div className="text-xs text-emerald-600 font-medium mb-1">Sellable</div>
                                <div className="text-xl font-bold text-emerald-900">{formatQuantity(entry.sellable)}</div>
                              </div>

                              {/* Sold */}
                              {entry.sold !== null ? (
                                <div className="text-center p-2 bg-amber-50 rounded border border-amber-200">
                                  <div className="text-xs text-amber-600 font-medium mb-1">Sold</div>
                                  <div className="text-xl font-bold text-amber-900">{formatQuantity(entry.sold)}</div>
                                </div>
                              ) : (
                                <div className="text-center p-2 bg-slate-50 rounded border border-slate-200">
                                  <div className="text-xs text-slate-400 font-medium mb-1">Sold</div>
                                  <div className="text-sm text-slate-400 italic">Not available</div>
                                </div>
                              )}
                            </div>

                            {/* Reservations Detail */}
                            {(entry.reserved !== null && entry.reserved > 0) ? (
                              <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-xs font-semibold text-yellow-800">🔒 Reserved Units</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-bold text-yellow-900">{formatQuantity(entry.reserved)}</div>
                                    {(entry.linked !== null || entry.orphaned !== null) && (
                                      <div className="text-xs text-yellow-700">
                                        Linked: {formatQuantity(entry.linked)} • Orphaned: {formatQuantity(entry.orphaned)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            {/* Data Availability Warning */}
                            {(entry.transferred === null || entry.sold === null) && (
                              <Alert variant="info" className="mt-3 mb-0 py-2 text-xs">
                                <strong>ℹ️ Limited Data:</strong> Some metrics are not available. 
                                The backend needs to provide transferred_quantity, sold_quantity, and location fields.
                              </Alert>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : reconciliationSnapshot?.storefront?.total_on_hand ? (
                  <Alert variant="warning" className="mt-3 mb-0">
                    <strong>⚠️ No Storefront Breakdown Available</strong>
                    <p className="mb-0 mt-1 text-sm">
                      Storefront data shows {formatQuantity(reconciliationMetrics.storefrontOnHand)} units transferred, 
                      but detailed breakdown by location is not available. The backend needs to provide the 
                      storefront.entries array with per-location details.
                    </p>
                  </Alert>
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
