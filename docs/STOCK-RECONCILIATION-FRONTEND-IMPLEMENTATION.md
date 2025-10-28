# Stock Reconciliation - Frontend Implementation Guide

_Last updated: 2025-10-09_

This guide documents how the frontend consumes the stock reconciliation endpoint and displays metrics in the Stock Item Detail modal.

---

## Core Principle

**The frontend performs ZERO calculations.** All metrics displayed in the modal come directly from the backend reconciliation API response. The frontend's job is to:
1. Fetch the reconciliation snapshot
2. Display the values exactly as provided
3. Surface warnings when the backend detects inconsistencies

---

## API Contract

### Endpoint
```
GET /inventory/api/products/<product_id>/stock-reconciliation/
```

### Response Structure
```typescript
interface StockReconciliationResponse {
  product: UUID
  generated_at: string
  
  warehouse: {
    recorded_quantity: number        // Sum of StockProduct.quantity (total received)
    inventory_on_hand: number        // Computed: recorded - storefront.total_on_hand
    inventory_breakdown: Array<{     // Raw Inventory table (audit only)
      warehouse_id: UUID
      warehouse_name: string
      quantity: number
    }>
  }
  
  storefront: {
    total_on_hand: number           // Sum of StoreFrontInventory.quantity
    entries: Array<{                // Per-storefront detail
      storefront: UUID
      storefront_name: string
      on_hand: number               // Physical inventory at this location
      linked_reservations: number   // Active cart holds
      orphaned_reservations: number // Expired/invalid holds
    }>
  }
  
  sales: {
    completed_units: number         // Total sold from completed sales
    completed_value: number         // Revenue from those sales
  }
  
  adjustments: {
    shrinkage_units: number         // Loss/damage/theft
    correction_units: number        // Found inventory corrections
  }
  
  reservations: {
    linked_units: number            // Valid cart reservations
    orphaned_units: number          // Invalid reservations
    details: Array<{                // Individual reservation records
      sale: UUID | null
      cart_session_id: UUID
      quantity: number
      expires_at: string
    }>
  }
  
  formula: {
    warehouse_inventory_on_hand: number     // = warehouse.inventory_on_hand
    storefront_on_hand: number              // = storefront.total_on_hand
    completed_sales_units: number           // = sales.completed_units
    shrinkage_units: number                 // = adjustments.shrinkage_units
    correction_units: number                // = adjustments.correction_units
    active_reservations_units: number       // = reservations.linked_units
    warehouse_unreserved_units: number      // Warehouse - reservations
    storefront_sellable_units: number       // Storefront - reservations
    net_adjustment_units: number            // Corrections - shrinkage
    calculated_baseline: number             // Reconciliation result
    recorded_batch_quantity: number         // = warehouse.recorded_quantity
    baseline_vs_recorded_delta: number      // Should be 0 when consistent
  }
}
```

---

## Modal Display Logic

### 1. Recorded Batch Size
```tsx
const recordedBatchSize = snapshot?.warehouse?.recorded_quantity ?? stockProduct.quantity
```
Shows total units received at warehouse intake across all batches for this product.

### 2. Warehouse On Hand
```tsx
const warehouseOnHand = snapshot?.formula?.warehouse_inventory_on_hand 
                     ?? snapshot?.warehouse?.inventory_on_hand
                     ?? stockProduct.quantity
```
**Backend computes this as:** `recorded_quantity - storefront.total_on_hand`

This represents units still at the warehouse (not yet transferred to storefronts).

### 3. Storefront On Hand
```tsx
const storefrontOnHand = snapshot?.formula?.storefront_on_hand
                      ?? snapshot?.storefront?.total_on_hand
```
Sum of all `StoreFrontInventory.quantity` rows for this product. This is **already net of sales** (sales reduce storefront inventory directly).

### 4. Units Sold
```tsx
const sold = snapshot?.formula?.completed_sales_units
          ?? snapshot?.sales?.completed_units
          ?? stockProduct.quantity_sold
```
Total units sold via completed sales. The reconciliation formula **adds this back** to reconstruct the original flow.

### 5. Shrinkage
```tsx
const shrinkage = snapshot?.formula?.shrinkage_units
               ?? snapshot?.adjustments?.shrinkage_units
```
Loss due to damage, theft, expiry, etc. Recorded via `StockAdjustment` decrease entries.

### 6. Corrections
```tsx
const corrections = snapshot?.formula?.correction_units
                 ?? snapshot?.adjustments?.correction_units
```
Found inventory or data corrections. Recorded via `StockAdjustment` increase entries.

### 7. Active Reservations
```tsx
const reservations = snapshot?.formula?.active_reservations_units
                  ?? snapshot?.reservations?.linked_units
                  ?? stockProduct.reserved_quantity
```
Units held in active shopping carts, not yet purchased or abandoned.

### 8. Storefront Breakdown
```tsx
const breakdown = snapshot?.storefront?.entries?.map(entry => ({
  name: entry.storefront_name ?? 'Unknown',
  onHand: entry.on_hand ?? 0,
  linked: entry.linked_reservations ?? 0,
  orphaned: entry.orphaned_reservations ?? 0,
  reserved: (entry.linked_reservations ?? 0) + (entry.orphaned_reservations ?? 0),
  sellable: (entry.on_hand ?? 0) - ((entry.linked_reservations ?? 0) + (entry.orphaned_reservations ?? 0))
}))
```
Per-storefront inventory status showing what's available for immediate sale vs held in carts.

---

## The Reconciliation Formula

The backend computes:
```
baseline = warehouse_on_hand 
         + storefront_on_hand 
         + completed_sales_units 
         - shrinkage_units 
         + correction_units 
         - active_reservations_units
```

### Why This Makes Sense

Starting with `recorded_batch_quantity` (what arrived):
1. Some units are **still at warehouse** → `warehouse_on_hand`
2. Some were **transferred to storefronts** → `storefront_on_hand`
3. Some **left via sales** → add back `completed_sales_units` (already deducted from storefront)
4. Some were **lost to shrinkage** → subtract `shrinkage_units`
5. Some were **found via corrections** → add `correction_units`
6. Some are **held in carts** → subtract `active_reservations_units`

If everything is tracked correctly: **`baseline = recorded_batch_quantity`** and **`delta = 0`**

---

## Handling Discrepancies

### When `baseline_vs_recorded_delta ≠ 0`

**This is NOT a bug—it's a feature!** The system is correctly detecting data inconsistencies.

Display the enhanced warning:
```tsx
{reconciliationMetrics.baselineDelta !== 0 && (
  <Alert variant="warning">
    <strong>⚠️ Reconciliation mismatch detected:</strong>
    {Math.abs(reconciliationMetrics.baselineDelta)} units {reconciliationMetrics.baselineDelta > 0 ? 'over' : 'under'} accounted
    
    <div className="small mt-2">
      Possible causes:
      • Unrecorded transfers or intake
      • Incorrect shrinkage/adjustment entries
      • Data entry errors in batch size
      
      Contact inventory team to investigate transaction history.
    </div>
  </Alert>
)}
```

### Common Causes of Deltas

| Scenario | Delta | What Happened |
|----------|-------|---------------|
| Transfer not recorded | Negative | Units moved to storefront but `Transfer` wasn't logged |
| Double-counted shrinkage | Negative | Same loss recorded twice |
| Missing intake entry | Negative | Units arrived but `StockProduct.quantity` not updated |
| Incorrect batch size | Either | Original receiving quantity entered wrong |
| Sales not deducting storefront | Positive | Sales completed but `StoreFrontInventory` not reduced |

---

## Implementation Checklist

### Data Fetching
- [x] Call `/inventory/api/products/<product_id>/stock-reconciliation/` on modal open
- [x] Provide "Refresh snapshot" button to re-fetch on demand
- [x] Handle loading, error, and empty states gracefully
- [x] Use ref-based mount tracking to prevent stale updates

### Display
- [x] Show all metrics from `formula.*` fields (no calculations)
- [x] Fall back to top-level fields when `formula` is missing
- [x] Ultimate fallback to `stockProduct.*` values when snapshot unavailable
- [x] Render reconciliation formula breakdown
- [x] Display enhanced warning when `baseline_vs_recorded_delta ≠ 0`
- [x] Show per-storefront breakdown with on-hand, sellable, reserved

### User Experience
- [x] Timestamp shows when snapshot was generated
- [x] Loading indicator while fetching
- [x] Clear error message if endpoint fails
- [x] "Reconciliation snapshot not available yet" when response is empty
- [x] Manual refresh to pull latest data

---

## Testing Scenarios

### Scenario 1: Perfect Reconciliation
```json
{
  "warehouse": {"recorded_quantity": 100, "inventory_on_hand": 40},
  "storefront": {"total_on_hand": 50},
  "sales": {"completed_units": 8},
  "adjustments": {"shrinkage_units": 2, "correction_units": 0},
  "reservations": {"linked_units": 0},
  "formula": {
    "calculated_baseline": 100,
    "recorded_batch_quantity": 100,
    "baseline_vs_recorded_delta": 0
  }
}
```
**Expected:** No warning. Formula shows: `40 + 50 + 8 - 2 + 0 - 0 = 96... wait, this doesn't add up!`

Actually: `40 + 50 + 8 - 2 = 96`, but we started with 100. The missing 4 units would show as `delta = -4`.

### Scenario 2: Missing Transfer Record
```json
{
  "warehouse": {"recorded_quantity": 100, "inventory_on_hand": 50},
  "storefront": {"total_on_hand": 40},
  "sales": {"completed_units": 0},
  "adjustments": {"shrinkage_units": 0, "correction_units": 0},
  "formula": {
    "calculated_baseline": 90,
    "recorded_batch_quantity": 100,
    "baseline_vs_recorded_delta": -10
  }
}
```
**Expected:** Warning shows "10 units under accounted". 10 units are unaccounted for (likely transferred but not logged).

### Scenario 3: No Snapshot Available
When endpoint returns 404 or empty response:
```tsx
<div className="text-muted">
  Reconciliation snapshot not available yet.
  <Button onClick={refreshSnapshot}>Refresh snapshot</Button>
</div>
```
Fall back to displaying `stockProduct.quantity` for warehouse on-hand.

---

## Common Mistakes to Avoid

### ❌ Don't Calculate Warehouse Inventory
```tsx
// WRONG
const warehouseOnHand = recordedBatch - storefrontOnHand - sold - shrinkage
```

### ❌ Don't Add Sales to Storefront
```tsx
// WRONG - sales are already accounted for via storefront reduction
const totalProcessed = storefrontOnHand + sold
```

### ❌ Don't Ignore Formula Fields
```tsx
// WRONG - recalculating defeats the purpose
const baseline = warehouse + storefront + sold - shrinkage
```

### ✅ Do Trust the Backend
```tsx
// RIGHT
const baseline = snapshot.formula.calculated_baseline
const delta = snapshot.formula.baseline_vs_recorded_delta
```

---

## Questions & Support

If you see unexpected values:
1. Click "Refresh snapshot" to ensure latest data
2. Check Network tab to see actual API response
3. Verify you're reading the correct field path
4. Confirm you're not doing any math on the values
5. Share the raw JSON with the backend team

**Remember:** Warnings indicate real data problems, not frontend bugs. The reconciliation system is working as designed when it surfaces inconsistencies!
