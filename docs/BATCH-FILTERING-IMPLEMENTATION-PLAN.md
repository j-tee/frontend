# Batch Filtering - Implementation Plan

## Summary

The backend has implemented batch filtering support for Stock (batch) views. Based on the screenshots, the feature request is to add a batch dropdown to the Stock details modal, NOT the StockProduct details modal.

## Current Understanding

### Data Model
- **Stock** = A batch of inventory (e.g., arrival on Oct 28, 2025)
- **StockProduct** = Individual products within a batch
- Same product can appear in multiple Stock (batch) records
- Example: "Some nice product" appears in 2 different batches with 200 units each

### What the Screenshots Show
The modal displaying "Some nice product" shows:
- Product name (highlighted in blue)
- Batch size: 200
- Warehouse: 200 (on hand)
- Storefront: 0 (transferred)
- Available: 0 (for sale)
- Warehouse: Rawlings Park Warehouse
- Batch: "Some cool Optional Notes"
- Landed Cost: $41.05

This is viewing a **Stock record**, not a StockProduct record.

## Backend API (Already Implemented)

### Endpoint
`GET /api/inventory/stocks/{stock_id}/?batch_id={batch_uuid}`

### Key Response Fields
```typescript
{
  batches: BatchInfo[]           // All batches for this product
  selected_batch_id: string | null  // Currently selected batch
  batch_size: number              // Filtered or aggregated
  warehouse_quantity: number      // Filtered or aggregated
  storefront_transferred: number  // Filtered or aggregated
  available_for_sale: number      // Filtered or aggregated
  // ... other statistics
}
```

## Frontend Implementation Tasks

### 1. Update TypeScript Types

**File:** `src/types/inventory.ts`

Add batch filtering support to `StockBatch` interface:

```typescript
export interface BatchInfo {
  id: string
  batch_identifier: string
  batch_size: number
  created_at: string
  arrival_date: string
}

export interface StockBatch {
  id: UUID
  business: UUID
  business_name?: string
  arrival_date: string | null
  description: string | null
  warehouse_id?: UUID | null
  warehouse_name?: string | null
  total_items?: number
  total_quantity?: number
  items?: StockProduct[]
  created_at?: string
  updated_at?: string
  
  // NEW: Batch filtering support
  batches?: BatchInfo[]
  selected_batch_id?: string | null
  batch_size?: number
  warehouse_quantity?: number
  storefront_transferred?: number
  available_for_sale?: number
  sold?: number
  reserved?: number
  shrinkage?: number
  corrections?: number
  landed_cost?: string
  reconciliation_formula?: string
  inventory_balanced?: boolean
}
```

### 2. Find or Create Stock Detail Modal

**Action Required:** Determine which component shows Stock (batch) details
- The screenshots show a modal that's NOT `StockProductDetailModal`
- Need to find the component that displays Stock/Batch information
- Likely in `ManageStocksPage.tsx` or a dedicated Stock detail modal

### 3. Add Batch Selector Component

**File:** `src/components/BatchSelector.tsx` (new file)

```typescript
import { Form } from 'react-bootstrap'
import type { BatchInfo } from '../types/inventory'

interface BatchSelectorProps {
  batches: BatchInfo[]
  selectedBatchId: string | null
  onBatchChange: (batchId: string | null) => void
  disabled?: boolean
}

const BatchSelector = ({ batches, selectedBatchId, onBatchChange, disabled }: BatchSelectorProps) => {
  if (batches.length <= 1) return null

  const formatBatchLabel = (batch: BatchInfo) => {
    const date = new Date(batch.created_at).toLocaleDateString()
    return `${batch.batch_identifier || 'Unnamed batch'} (${date})`
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

### 4. Update API Service

**File:** `src/services/inventoryService.ts`

Add batch filtering parameter to stock fetch function:

```typescript
export const fetchStockDetail = async (
  stockId: string,
  batchId?: string | null
): Promise<StockBatch> => {
  const params = new URLSearchParams()
  if (batchId) {
    params.append('batch_id', batchId)
  }
  
  const url = `/inventory/api/stocks/${stockId}/${params.toString() ? `?${params.toString()}` : ''}`
  
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

### 5. Update Stock Detail Modal Component

**Action:** Find the component displaying Stock details (from screenshots)

Once found, add:

1. **State for batch selection:**
   ```typescript
   const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null)
   ```

2. **Fetch data with batch filter:**
   ```typescript
   useEffect(() => {
     if (show && stockId) {
       fetchStockDetail(stockId, selectedBatchId)
         .then(setStockData)
         .catch(setError)
     }
   }, [show, stockId, selectedBatchId])
   ```

3. **Add BatchSelector component:**
   ```tsx
   {stockData?.batches && (
     <BatchSelector
       batches={stockData.batches}
       selectedBatchId={selectedBatchId}
       onBatchChange={setSelectedBatchId}
       disabled={loading}
     />
   )}
   ```

4. **Add filter indicator:**
   ```tsx
   {selectedBatchId && (
     <Alert variant="info" className="mb-3">
       📊 Viewing filtered statistics for: {
         stockData.batches?.find(b => b.id === selectedBatchId)?.batch_identifier
       }
     </Alert>
   )}
   ```

5. **Update statistics display:**
   - Use `stockData.batch_size` instead of `stockData.total_quantity`
   - Use `stockData.warehouse_quantity` for warehouse stats
   - Use `stockData.storefront_transferred` for storefront stats
   - Use `stockData.available_for_sale` for sellable units

## Questions to Resolve

1. **Which component displays Stock (batch) details?**
   - Is it part of `ManageStocksPage.tsx`?
   - Is there a separate `StockDetailModal` or `StockBatchDetailModal`?
   - The screenshots show it's accessed via "View" button in stock items table

2. **Where is the "View" button that opens the modal?**
   - In the stock items table on `ManageStocksPage.tsx`
   - Need to trace the click handler to find the modal component

## Next Steps

1. ✅ Backend API ready
2. ⏳ Locate Stock detail modal component
3. ⏳ Add TypeScript interfaces
4. ⏳ Create `BatchSelector` component
5. ⏳ Update API service
6. ⏳ Integrate batch filtering into modal
7. ⏳ Test with single and multiple batch products
8. ⏳ Deploy to production

---

**Status:** Awaiting identification of Stock detail modal component  
**Blocker:** Need to find which component displays the modal from screenshots  
**Next Action:** Search for the component handling "View" button clicks in stock table
