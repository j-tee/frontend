import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import Tooltip from 'react-bootstrap/Tooltip'
import StockFilterPanel, { type StockFilters } from './StockFilterPanel'
import { fetchProductStockReconciliation } from '../../../services/inventoryService'
import type {
  BatchInfo,
  StockBatch,
  StockProduct,
  StockReconciliationResponse,
  Warehouse,
} from '../../../types/inventory.js'

type Props = {
  stockProduct: StockProduct | null
  stockProducts: StockProduct[]
  stockBatches: StockBatch[]
  warehouses: Warehouse[]
  onSelectStockProduct: (stockProductId: string | null) => void
  isStockProductsLoading: boolean
}

type SelectOption = {
  id: string
  label: string
}

const defaultFilters: StockFilters = {
  batchId: null,
  warehouseId: null,
  showExpiredOnly: false,
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

const formatQuantity = (value: number | null) => {
  if (value == null) return '—'
  return value.toLocaleString()
}

const StockProductOverviewPanel = ({
  stockProduct,
  stockProducts,
  stockBatches,
  warehouses,
  onSelectStockProduct,
  isStockProductsLoading,
}: Props) => {
  const [filters, setFilters] = useState<StockFilters>(defaultFilters)
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

  const productOptions: SelectOption[] = useMemo(() => {
    if (!stockProducts.length) {
      return []
    }
    return stockProducts.map((product) => ({
      id: product.id,
      label: `${product.product_name ?? 'Unnamed product'} — SKU: ${product.product_sku ?? '—'}`,
    }))
  }, [stockProducts])

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

      const snapshot = await fetchProductStockReconciliation(productId, {
        batchId: filters.batchId ?? null,
        warehouseId: filters.warehouseId ?? null,
      })

      if (isMountedRef.current && stockProduct?.product === productId) {
        setReconciliationSnapshot(snapshot)
      }
    } catch {
      if (isMountedRef.current) {
        setReconciliationSnapshot(null)
        setReconciliationError('Unable to fetch reconciliation snapshot right now.')
      }
    } finally {
      if (isMountedRef.current) {
        setReconciliationLoading(false)
      }
    }
  }, [filters.batchId, filters.warehouseId, resetReconciliationState, stockProduct?.product])

  useEffect(() => {
    if (!stockProduct) {
      setFilters(defaultFilters)
      resetReconciliationState()
      return
    }
    setFilters(defaultFilters)
    resetReconciliationState()
    void fetchReconciliationSnapshot()
  }, [fetchReconciliationSnapshot, resetReconciliationState, stockProduct])

  const availableBatches = useMemo(() => {
    if (!stockProduct?.product) return []
    const sameProductStocks = stockProducts.filter((sp) => sp.product === stockProduct.product)
    const uniqueBatchIds = new Set<string>()
    sameProductStocks.forEach((sp) => {
      const batchId = sp.stock_batch ?? sp.stock
      if (batchId) {
        uniqueBatchIds.add(batchId)
      }
    })

    return Array.from(uniqueBatchIds)
      .map((batchId): BatchInfo | null => {
        const batch = stockBatches.find((b) => b.id === batchId)
        if (!batch) return null
        return {
          id: batch.id,
          batch_identifier: batch.description || `Batch ${batch.id.slice(0, 8)}`,
          batch_size: batch.total_quantity || 0,
          created_at: batch.created_at || '',
          arrival_date: batch.arrival_date || '',
        }
      })
      .filter((batch): batch is BatchInfo => batch !== null)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [stockBatches, stockProduct, stockProducts])

  const availableWarehouses = useMemo(() => {
    if (!stockProduct?.product) return warehouses
    const sameProductStocks = stockProducts.filter((sp) => sp.product === stockProduct.product)
    const warehouseIds = new Set<string>()
    sameProductStocks.forEach((sp) => {
      const warehouseId = sp.warehouse
      if (warehouseId) {
        warehouseIds.add(warehouseId)
      }
    })
    return warehouses.filter((warehouse) => warehouseIds.has(warehouse.id))
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

    const warehouseUnreserved = clampToNonNegative(toNumberOrNull(snapshot?.formula?.warehouse_unreserved_units))

    const storefrontOnHand = clampToNonNegative(
      toNumberOrNull(snapshot?.formula?.storefront_on_hand) ??
        toNumberOrNull(snapshot?.storefront?.total_on_hand),
    )

    const reservationsLinked = clampToNonNegative(toNumberOrNull(snapshot?.reservations?.linked_units))
    const reservationsOrphaned = clampToNonNegative(toNumberOrNull(snapshot?.reservations?.orphaned_units))
    const reservationsFromFormula = clampToNonNegative(toNumberOrNull(snapshot?.formula?.active_reservations_units))

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
    const entries =
      reconciliationSnapshot?.storefront?.entries ??
      reconciliationSnapshot?.storefront?.breakdown ??
      []
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

      const sellableFromPayload = clampToNonNegative(toNumberOrNull(entry.sellable))
      const sellable =
        sellableFromPayload != null
          ? sellableFromPayload
          : onHand == null
            ? null
            : reservedSum == null
              ? onHand
              : clampToNonNegative(onHand - (reservedSum ?? 0))

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

  const appliedBatchLabel = reconciliationSnapshot?.filters?.batch_name ?? null
  const appliedWarehouseLabel = reconciliationSnapshot?.filters?.warehouse_name ?? null
  const backendFormulaExplanation = reconciliationSnapshot?.formula?.formula_explanation ?? null

  const handleProductChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    onSelectStockProduct(value || null)
  }

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Inventory overview</h3>
          <p className="text-slate-600">Review reconciliation metrics and storefront distribution for a stock product.</p>
        </div>
        <div className="min-w-[240px]">
          <Form.Group controlId="overviewStockProductSelect">
            <Form.Label className="text-sm font-medium text-slate-700">Select stock product</Form.Label>
            <Form.Select
              value={stockProduct?.id ?? ''}
              onChange={handleProductChange}
              disabled={isStockProductsLoading || productOptions.length === 0}
            >
              <option value="">Choose a stock product</option>
              {productOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Form.Select>
            {productOptions.length === 0 ? (
              <Form.Text muted>No stock products available. Record stock intake to get started.</Form.Text>
            ) : null}
          </Form.Group>
        </div>
      </div>

      {!stockProduct ? (
        <Alert variant="info" className="mb-0">
          Select a stock product to view its reconciliation snapshot and storefront breakdown.
        </Alert>
      ) : (
        <div className="space-y-4">
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

            <StockFilterPanel
              batches={availableBatches}
              warehouses={availableWarehouses}
              currentWarehouseId={stockProduct.warehouse}
              filters={filters}
              onFilterChange={setFilters}
              disabled={reconciliationLoading}
            />

            {(appliedBatchLabel || appliedWarehouseLabel) ? (
              <div className="mb-4 flex flex-wrap gap-2">
                {appliedBatchLabel ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                    Batch: {appliedBatchLabel}
                  </span>
                ) : null}
                {appliedWarehouseLabel ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    Warehouse: {appliedWarehouseLabel}
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-3 border border-indigo-200 shadow-sm">
                <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-1">Batch Size</div>
                <div className="text-2xl font-bold text-indigo-900">{formatQuantity(reconciliationMetrics.recordedBatchSize)}</div>
                <div className="text-xs text-indigo-600 mt-1">Recorded</div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200 shadow-sm">
                <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Warehouse</div>
                <div className="text-2xl font-bold text-blue-900">{formatQuantity(reconciliationMetrics.warehouseOnHand)}</div>
                <div className="text-xs text-blue-600 mt-1">On hand</div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200 shadow-sm">
                <div className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">Storefront</div>
                <div className="text-2xl font-bold text-purple-900">{formatQuantity(reconciliationMetrics.storefrontOnHand)}</div>
                <div className="text-xs text-purple-600 mt-1">Transferred</div>
              </div>

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

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
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

              <div className="bg-white rounded-lg p-3 border-2 border-amber-200">
                <div className="text-xs font-medium text-amber-700 mb-1">🔒 Reserved</div>
                <div className="text-xl font-bold text-amber-900">{formatQuantity(reconciliationMetrics.reservations)}</div>
              </div>

              <div className="bg-white rounded-lg p-3 border-2 border-red-200">
                <div className="text-xs font-medium text-red-700 mb-1">📉 Shrinkage</div>
                <div className="text-xl font-bold text-red-900">{formatQuantity(reconciliationMetrics.shrinkage)}</div>
              </div>

              <div className="bg-white rounded-lg p-3 border-2 border-green-200">
                <div className="text-xs font-medium text-green-700 mb-1">✏️ Corrections</div>
                <div className="text-xl font-bold text-green-900">{formatQuantity(reconciliationMetrics.corrections)}</div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 mb-4">
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Warehouse</div>
                <div className="text-sm font-medium text-slate-900">
                  {stockProduct.warehouse_name ?? '—'}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Batch</div>
                <div className="text-sm font-medium text-slate-900">
                  {(() => {
                    const batchId = stockProduct.stock_batch ?? stockProduct.stock
                    const batch = batchId ? stockBatches.find((item) => item.id === batchId) : null
                    if (!batch) {
                      return batchId ? `Batch ${batchId.slice(0, 8)}` : '—'
                    }
                    return batch.description?.length ? batch.description : `Batch ${batch.id.slice(0, 8)}`
                  })()}
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
                  {backendFormulaExplanation
                    ? backendFormulaExplanation
                    : `Warehouse (${formatQuantity(reconciliationMetrics.warehouseOnHand)}) + Storefront transferred (${formatQuantity(reconciliationMetrics.storefrontOnHand)}) - Shrinkage (${formatQuantity(reconciliationMetrics.shrinkage)}) + Corrections (${formatQuantity(reconciliationMetrics.corrections)}) - Reservations (${formatQuantity(reconciliationMetrics.reservations)}) = ${formatQuantity(reconciliationMetrics.calculatedBaseline)}`}
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

                      <div className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

                          <div className="text-center p-2 bg-purple-50 rounded border border-purple-200">
                            <div className="text-xs text-purple-600 font-medium mb-1">On Hand</div>
                            <div className="text-xl font-bold text-purple-900">{formatQuantity(entry.onHand)}</div>
                          </div>

                          <div className="text-center p-2 bg-emerald-50 rounded border border-emerald-200">
                            <div className="text-xs text-emerald-600 font-medium mb-1">Sellable</div>
                            <div className="text-xl font-bold text-emerald-900">{formatQuantity(entry.sellable)}</div>
                          </div>

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
        </div>
      )}
    </section>
  )
}

export default StockProductOverviewPanel
