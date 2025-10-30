# Stock Item Batch Filtering - Frontend Implementation

## Status: ✅ Backend Ready - Frontend Implementation Needed

## Overview
The backend now supports viewing stock statistics filtered by individual batches. This document outlines the frontend changes needed to implement the batch filtering UI.

## Backend Implementation Summary
- ✅ API endpoint updated: `GET /inventory/api/stocks/{id}/?batch_id={batch_uuid}`
- ✅ Returns `batches` array with all available batches
- ✅ Returns `selected_batch_id` to indicate current filter state
- ✅ Statistics are aggregated when no `batch_id` provided
- ✅ Statistics are filtered when `batch_id` query parameter is provided

## Current Behavior
- Stock item details show aggregated statistics across all batches
- Products can have multiple batches (e.g., "Some nice product" has batch size 200 recorded twice)
- No way to view individual batch statistics

## Required Frontend Changes
- Add batch dropdown when `batches.length > 1`
- Fetch data with `batch_id` query parameter when batch is selected
- Update all statistics to reflect selected batch
- Show visual indicator of current filter state

## TypeScript Interfaces

Add to `/src/types/inventory.ts`:

```typescript
export interface BatchInfo {
  id: string
  batch_identifier: string
  batch_size: number
  created_at: string
  arrival_date: string
}

export interface StockDetail {
  id: string
  business: string
  business_name: string
  arrival_date: string
  description: string
  
  warehouse_id: string
  warehouse_name: string
  
  total_items: number
  total_quantity: number
  
  // Batch filtering support
  batches: BatchInfo[]
  selected_batch_id: string | null
  
  // Statistics (filtered by selected batch)
  batch_size: number
  warehouse_quantity: number
  storefront_transferred: number
  available_for_sale: number
  sold: number
  reserved: number
  shrinkage: number
  corrections: number
  
  landed_cost: string
  reconciliation_formula: string
  inventory_balanced: boolean
  
  items: StockProductItem[]
  created_at: string
  updated_at: string
}
```

## Frontend Implementation Steps

### Step 1: Update API Service

Update the stock detail fetch function to support `batch_id` parameter:

```typescript
// src/services/inventory.ts (or wherever your API calls are)

export const fetchStockDetail = async (
  stockId: string, 
  batchId?: string | null
): Promise<StockDetail> => {
  const url = batchId
    ? `/inventory/api/stocks/${stockId}/?batch_id=${batchId}`
    : `/inventory/api/stocks/${stockId}/`
    
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json'
    }
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch stock details')
  }
  
  return response.json()
}
```

### Step 2: Add Batch Dropdown Component

Create a reusable batch selector component:

```typescript
// src/components/BatchSelector.tsx

import { Form } from 'react-bootstrap'
import type { BatchInfo } from '../types/inventory'

interface BatchSelectorProps {
  batches: BatchInfo[]
  selectedBatchId: string | null
  onBatchChange: (batchId: string | null) => void
  disabled?: boolean
}

const BatchSelector = ({ 
  batches, 
  selectedBatchId, 
  onBatchChange,
  disabled = false
}: BatchSelectorProps) => {
  // Only show if there are multiple batches
  if (batches.length <= 1) {
    return null
  }

  const formatBatchLabel = (batch: BatchInfo) => {
    const date = new Date(batch.created_at).toLocaleDateString()
    const identifier = batch.batch_identifier || 'Unnamed batch'
    return `${identifier} (${date})`
  }

  return (
    <Form.Group className="mb-3">
      <Form.Label>View by batch</Form.Label>
      <Form.Select
        value={selectedBatchId || ''}
        onChange={(e) => onBatchChange(e.target.value || null)}
        disabled={disabled}
      >
        <option value="">All batches (aggregated)</option>
        {batches.map((batch) => (
          <option key={batch.id} value={batch.id}>
            {formatBatchLabel(batch)}
          </option>
        ))}
      </Form.Select>
      {selectedBatchId && (
        <Form.Text className="text-muted">
          Showing statistics for selected batch only
        </Form.Text>
      )}
    </Form.Group>
  )
}

export default BatchSelector
```

### Step 3: Update Stock Detail Modal/Component

Modify the existing stock detail view to include batch filtering:

```typescript
// src/components/StockDetailModal.tsx (example)

import { useState, useEffect } from 'react'
import Modal from 'react-bootstrap/Modal'
import Spinner from 'react-bootstrap/Spinner'
import Alert from 'react-bootstrap/Alert'
import BatchSelector from './BatchSelector'
import { fetchStockDetail } from '../services/inventory'
import type { StockDetail } from '../types/inventory'

interface StockDetailModalProps {
  stockId: string
  show: boolean
  onHide: () => void
}

const StockDetailModal = ({ stockId, show, onHide }: StockDetailModalProps) => {
  const [stockDetail, setStockDetail] = useState<StockDetail | null>(null)
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (show && stockId) {
      loadStockDetail()
    }
  }, [show, stockId, selectedBatchId])

  const loadStockDetail = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchStockDetail(stockId, selectedBatchId)
      setStockDetail(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stock details')
    } finally {
      setLoading(false)
    }
  }

  const handleBatchChange = (batchId: string | null) => {
    setSelectedBatchId(batchId)
  }

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Stock item details</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {loading && (
          <div className="text-center py-4">
            <Spinner animation="border" />
          </div>
        )}

        {error && <Alert variant="danger">{error}</Alert>}

        {stockDetail && !loading && (
          <>
            {/* Product Info */}
            <div className="mb-4">
              <h5>{stockDetail.description || 'Stock Details'}</h5>
              <p className="text-muted mb-0">
                Warehouse: {stockDetail.warehouse_name}
              </p>
              <p className="text-muted">
                Arrival Date: {new Date(stockDetail.arrival_date).toLocaleDateString()}
              </p>
            </div>

            {/* Batch Filter */}
            <BatchSelector
              batches={stockDetail.batches}
              selectedBatchId={selectedBatchId}
              onBatchChange={handleBatchChange}
              disabled={loading}
            />

            {/* Active Filter Indicator */}
            {selectedBatchId && (
              <Alert variant="info" className="mb-3">
                <small>
                  📊 Viewing filtered statistics for: {
                    stockDetail.batches.find(b => b.id === selectedBatchId)?.batch_identifier
                  }
                </small>
              </Alert>
            )}

            {/* Statistics Grid */}
            <div className="row g-3 mb-4">
              <div className="col-6 col-md-3">
                <div className="card text-center">
                  <div className="card-body">
                    <h6 className="card-subtitle mb-2 text-muted">BATCH SIZE</h6>
                    <h3 className="card-title mb-1">{stockDetail.batch_size}</h3>
                    <small className="text-muted">Recorded</small>
                  </div>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="card text-center">
                  <div className="card-body">
                    <h6 className="card-subtitle mb-2 text-muted">WAREHOUSE</h6>
                    <h3 className="card-title mb-1">{stockDetail.warehouse_quantity}</h3>
                    <small className="text-muted">On hand</small>
                  </div>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="card text-center">
                  <div className="card-body">
                    <h6 className="card-subtitle mb-2 text-muted">STOREFRONT</h6>
                    <h3 className="card-title mb-1">{stockDetail.storefront_transferred}</h3>
                    <small className="text-muted">Transferred</small>
                  </div>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="card text-center bg-success text-white">
                  <div className="card-body">
                    <h6 className="card-subtitle mb-2">AVAILABLE</h6>
                    <h3 className="card-title mb-1">{stockDetail.available_for_sale}</h3>
                    <small>For sale</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary Statistics */}
            <div className="row g-2 mb-4">
              <div className="col-3">
                <small className="text-muted d-block">Sold</small>
                <strong>{stockDetail.sold}</strong>
              </div>
              <div className="col-3">
                <small className="text-muted d-block">Reserved</small>
                <strong>{stockDetail.reserved}</strong>
              </div>
              <div className="col-3">
                <small className="text-muted d-block">Shrinkage</small>
                <strong className="text-danger">{stockDetail.shrinkage}</strong>
              </div>
              <div className="col-3">
                <small className="text-muted d-block">Corrections</small>
                <strong>{stockDetail.corrections}</strong>
              </div>
            </div>

            {/* Financial */}
            <div className="mb-4">
              <strong>Landed Cost: </strong>
              <span className="text-success">${stockDetail.landed_cost}</span>
            </div>

            {/* Reconciliation */}
            <div className="mb-3">
              <h6>Reconciliation Formula:</h6>
              <code className="d-block p-2 bg-light rounded">
                {stockDetail.reconciliation_formula}
              </code>
              <div className="mt-2">
                {stockDetail.inventory_balanced ? (
                  <span className="badge bg-success">✓ Inventory Balanced</span>
                ) : (
                  <span className="badge bg-warning">⚠ Inventory Unbalanced</span>
                )}
              </div>
            </div>
          </>
        )}
      </Modal.Body>
      
      <Modal.Footer>
        <button className="btn btn-secondary" onClick={onHide}>
          Close
        </button>
      </Modal.Footer>
    </Modal>
  )
}

export default StockDetailModal
```

### Step 4: Testing Checklist

- [ ] Single batch product: Batch dropdown is hidden
- [ ] Multiple batch product: Batch dropdown is visible
- [ ] Default view shows "All batches" and aggregated statistics
- [ ] Selecting a specific batch updates all statistics correctly
- [ ] Switching between batches updates data in real-time
- [ ] Filter indicator shows current selection
- [ ] Loading states work correctly during batch switching
- [ ] Error handling works if batch_id is invalid
- [ ] Modal can be closed and reopened without issues
- [ ] Statistics display correctly for both aggregated and filtered views

## Backend API Reference

### Endpoint
`GET /inventory/api/stocks/{id}/?batch_id={batch_uuid}`

### Query Parameters
- `batch_id` (UUID, optional): Filter statistics by specific batch

### Response Fields

| Field | Type | Description | Filtered? |
|-------|------|-------------|-----------|
| `batches` | Array | List of all available batches | No (always shows all) |
| `selected_batch_id` | string\|null | Currently selected batch ID | Yes |
| `batch_size` | number | Total quantity recorded | Yes |
| `warehouse_quantity` | number | Current warehouse stock | Yes |
| `storefront_transferred` | number | Qty sent to storefronts | Yes |
| `available_for_sale` | number | Qty available for sale | Yes |
| `sold` | number | Qty sold | Yes |
| `reserved` | number | Qty reserved | Yes |
| `shrinkage` | number | Losses/damage | Yes |
| `corrections` | number | Inventory adjustments | Yes |
| `landed_cost` | string | Total cost | Yes |
| `reconciliation_formula` | string | Balance calculation | Yes |
| `inventory_balanced` | boolean | Balance status | Yes |

### Example Requests

**Aggregated View (All Batches):**
```bash
GET /inventory/api/stocks/abc-123/
```

**Filtered View (Specific Batch):**
```bash
GET /inventory/api/stocks/abc-123/?batch_id=batch-xyz
```

## Key Backend Notes

1. **Stock = Batch**: Each Stock record represents a single batch
2. **Same Product, Multiple Batches**: A product can appear in multiple Stock records
3. **Batch Identifier**: The `description` field serves as the batch identifier
4. **No Schema Changes**: Backend implemented without breaking changes
5. **Backward Compatible**: Existing API calls continue to work

## Implementation Complete - Summary

✅ Backend implementation ready  
✅ Frontend implementation plan documented  
📋 Ready to implement in `StockProductDetailModal.tsx`

### Key Points
- The modal shown in screenshots is `StockProductDetailModal`
- It already fetches and displays reconciliation data
- Need to add batch filtering dropdown when multiple batches exist for same product
- Backend API endpoint supports `batch_id` query parameter
- Frontend needs to detect multiple batches and show selector

### Files to Modify
1. `/src/types/inventory.ts` - Add `BatchInfo` interface
2. `/src/components/BatchSelector.tsx` - New component (create)
3. `/src/features/dashboard/components/StockProductDetailModal.tsx` - Add batch filtering
4. `/src/services/inventoryService.ts` - Add batch_id parameter support

---

**Created:** October 30, 2025  
**Backend Status:** ✅ Implemented (v1.0)  
**Frontend Status:** 📋 Implementation plan ready  
**Last Updated:** October 30, 2025
