import { useMemo } from 'react'
import Form from 'react-bootstrap/Form'
import Badge from 'react-bootstrap/Badge'
import Stack from 'react-bootstrap/Stack'
import Card from 'react-bootstrap/Card'
import type { BatchInfo, Warehouse } from '../../../types/inventory.js'

export interface StockFilters {
  batchId: string | null
  warehouseId: string | null
  showExpiredOnly: boolean
}

interface StockFilterPanelProps {
  batches: BatchInfo[]
  warehouses: Warehouse[]
  currentWarehouseId?: string | null // The warehouse where this stock item is located
  filters: StockFilters
  onFilterChange: (filters: StockFilters) => void
  disabled?: boolean
}

const StockFilterPanel = ({
  batches,
  warehouses,
  currentWarehouseId,
  filters,
  onFilterChange,
  disabled = false,
}: StockFilterPanelProps) => {
  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return filters.batchId !== null || filters.warehouseId !== null || filters.showExpiredOnly
  }, [filters])

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.batchId) count++
    if (filters.warehouseId) count++
    if (filters.showExpiredOnly) count++
    return count
  }, [filters])

  const formatBatchLabel = (batch: BatchInfo) => {
    const date = new Date(batch.created_at).toLocaleDateString()
    const identifier = batch.batch_identifier || 'Unnamed batch'
    return `${identifier} (${date})`
  }

  const handleBatchChange = (value: string) => {
    onFilterChange({
      ...filters,
      batchId: value || null,
    })
  }

  const handleWarehouseChange = (value: string) => {
    onFilterChange({
      ...filters,
      warehouseId: value || null,
    })
  }

  const handleExpiredToggle = (checked: boolean) => {
    onFilterChange({
      ...filters,
      showExpiredOnly: checked,
    })
  }

  const clearAllFilters = () => {
    onFilterChange({
      batchId: null,
      warehouseId: null,
      showExpiredOnly: false,
    })
  }

  // Only show panel if we have filterable options
  const showBatchFilter = batches.length > 1
  const showWarehouseFilter = warehouses.length > 1
  const showPanel = showBatchFilter || showWarehouseFilter

  if (!showPanel) {
    return null
  }

  return (
    <Card className="mb-3 shadow-sm">
      <Card.Body className="p-3">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div className="d-flex align-items-center gap-2">
            <h6 className="mb-0 fw-semibold text-slate-700">
              📊 Filter Statistics
            </h6>
            {activeFilterCount > 0 && (
              <Badge bg="primary" pill>
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={clearAllFilters}
              disabled={disabled}
            >
              Clear all
            </button>
          )}
        </div>

        <div className="row g-3">
          {/* Batch Filter */}
          {showBatchFilter && (
            <div className="col-md-6">
              <Form.Group controlId="filterBatch">
                <Form.Label className="text-sm fw-medium text-slate-600">
                  Batch
                </Form.Label>
                <Form.Select
                  value={filters.batchId || ''}
                  onChange={(e) => handleBatchChange(e.target.value)}
                  disabled={disabled}
                  size="sm"
                >
                  <option value="">All batches (aggregated)</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {formatBatchLabel(batch)}
                    </option>
                  ))}
                </Form.Select>
                {filters.batchId && (
                  <Form.Text className="text-muted">
                    <small>Viewing data for selected batch only</small>
                  </Form.Text>
                )}
              </Form.Group>
            </div>
          )}

          {/* Warehouse Filter */}
          {showWarehouseFilter && (
            <div className="col-md-6">
              <Form.Group controlId="filterWarehouse">
                <Form.Label className="text-sm fw-medium text-slate-600">
                  Warehouse Location
                </Form.Label>
                <Form.Select
                  value={filters.warehouseId || ''}
                  onChange={(e) => handleWarehouseChange(e.target.value)}
                  disabled={disabled}
                  size="sm"
                >
                  <option value="">All warehouses</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                      {warehouse.id === currentWarehouseId && ' (Current)'}
                    </option>
                  ))}
                </Form.Select>
                {filters.warehouseId && (
                  <Form.Text className="text-muted">
                    <small>Viewing data for selected warehouse only</small>
                  </Form.Text>
                )}
              </Form.Group>
            </div>
          )}

          {/* Expired Items Toggle */}
          <div className="col-12">
            <Form.Group controlId="filterExpired">
              <Form.Check
                type="checkbox"
                label={
                  <span className="text-sm fw-medium text-slate-600">
                    Show only expired items
                  </span>
                }
                checked={filters.showExpiredOnly}
                onChange={(e) => handleExpiredToggle(e.target.checked)}
                disabled={disabled}
              />
            </Form.Group>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-top">
            <div className="text-xs text-slate-600 fw-medium mb-2">Active Filters:</div>
            <Stack direction="horizontal" gap={2} className="flex-wrap">
              {filters.batchId && (
                <Badge bg="primary" className="d-flex align-items-center gap-1">
                  <span>Batch: {batches.find(b => b.id === filters.batchId)?.batch_identifier || 'Selected'}</span>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    style={{ fontSize: '0.5rem' }}
                    onClick={() => handleBatchChange('')}
                    disabled={disabled}
                    aria-label="Clear batch filter"
                  />
                </Badge>
              )}
              {filters.warehouseId && (
                <Badge bg="info" className="d-flex align-items-center gap-1">
                  <span>Warehouse: {warehouses.find(w => w.id === filters.warehouseId)?.name || 'Selected'}</span>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    style={{ fontSize: '0.5rem' }}
                    onClick={() => handleWarehouseChange('')}
                    disabled={disabled}
                    aria-label="Clear warehouse filter"
                  />
                </Badge>
              )}
              {filters.showExpiredOnly && (
                <Badge bg="warning" className="d-flex align-items-center gap-1">
                  <span>Expired items only</span>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    style={{ fontSize: '0.5rem' }}
                    onClick={() => handleExpiredToggle(false)}
                    disabled={disabled}
                    aria-label="Clear expired filter"
                  />
                </Badge>
              )}
            </Stack>
          </div>
        )}
      </Card.Body>
    </Card>
  )
}

export default StockFilterPanel
