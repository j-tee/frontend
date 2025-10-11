# Frontend Stock Reconciliation Implementation Guide

**For Backend Developer**  
**Date:** October 10, 2025  
**Issue:** Reconciliation mismatch showing incorrect values  
**Frontend Status:** ✅ FIXED - Implementation complete

---

## ✅ RESOLUTION UPDATE

**Date**: October 10, 2025  
**Status**: RESOLVED

The reconciliation formula has been fixed on both backend and frontend:

1. **Backend**: Updated formula to NOT subtract sold units
2. **Frontend**: Updated display to match new formula and added `sellable_now` support
3. **Documentation**: See `RECONCILIATION-FORMULA-FIX-IMPLEMENTATION.md` for details

**Key Changes**:
- Formula now: `Warehouse + Storefront Transferred - Shrinkage + Corrections - Reservations`
- Sold units tracked separately for information only
- Added `storefront.sellable_now` field for current availability
- Enhanced tooltips and user messaging

For implementation details, see:
- `RECONCILIATION-FORMULA-FIX-IMPLEMENTATION.md` - Full implementation summary
- `RECONCILIATION-QUICK-REFERENCE.md` - Developer quick reference

---

## 📋 Original Issue Documentation

**Below is the original documentation written when requesting backend clarification.**

---

## 🎯 Purpose of This Document

The frontend is displaying a "Reconciliation mismatch detected: 135 units over accounted" warning, but we're showing values that don't make logical sense. This document explains:

1. **What data the frontend receives** from the backend API
2. **How the frontend displays** this data (NO calculations)
3. **What the frontend expects** from the backend
4. **The actual issue** we're seeing in production

We need your help understanding the reconciliation formula logic so we can ensure the frontend is correctly interpreting and displaying the backend's calculations.

---

## 📡 Current API Integration

### Endpoint Being Called

```
GET /inventory/api/products/{product_id}/stock-reconciliation/
```

**When it's called:**
- User clicks "View" button on a stock product in the Manage Stocks page
- Modal opens and automatically fetches reconciliation snapshot
- User can click "Refresh snapshot" button to re-fetch

**Frontend code location:**
- Service: `/src/services/inventoryService.ts` → `fetchProductStockReconciliation()`
- Component: `/src/features/dashboard/components/StockProductDetailModal.tsx`
- Types: `/src/types/inventory.ts` → `StockReconciliationResponse`

---

## 📦 Data Structure: What Frontend Receives

### TypeScript Interface (Frontend Expectation)

```typescript
export interface StockReconciliationResponse {
  product?: UUID | null
  generated_at?: string | null
  
  warehouse?: {
    recorded_quantity?: number | string | null
    inventory_on_hand?: number | string | null
    inventory_breakdown?: StockReconciliationWarehouseEntry[]
  }
  
  storefront?: {
    total_on_hand?: number | string | null
    entries?: StockReconciliationStorefrontEntry[]
  }
  
  sales?: {
    completed_units?: number | string | null
    completed_value?: number | string | null
  }
  
  adjustments?: {
    shrinkage_units?: number | string | null
    correction_units?: number | string | null
  }
  
  reservations?: {
    linked_units?: number | string | null
    orphaned_units?: number | string | null
    details?: StockReconciliationReservationDetail[]
  }
  
  formula?: StockReconciliationFormula
}

export interface StockReconciliationFormula {
  warehouse_inventory_on_hand?: number | string | null
  warehouse_unreserved_units?: number | string | null
  storefront_on_hand?: number | string | null
  storefront_sellable_units?: number | string | null
  completed_sales_units?: number | string | null
  shrinkage_units?: number | string | null
  correction_units?: number | string | null
  active_reservations_units?: number | string | null
  calculated_baseline?: number | string | null
  recorded_batch_quantity?: number | string | null
  baseline_vs_recorded_delta?: number | string | null
  net_adjustment_units?: number | string | null
}
```

---

## 🖥️ Frontend Display Logic (Read-Only)

### How We Extract Values from API Response

The frontend **DOES NOT CALCULATE** anything. We only extract and display values provided by the backend.

```typescript
const reconciliationMetrics = useMemo(() => {
  const snapshot = reconciliationSnapshot // API response
  
  // Extract recorded batch size
  const recordedBatchSize = toRoundedNumberOrNull(
    snapshot?.formula?.recorded_batch_quantity ?? 
    snapshot?.warehouse?.recorded_quantity
  )
  
  // Extract warehouse values
  const warehouseOnHand = toRoundedNumberOrNull(
    snapshot?.formula?.warehouse_inventory_on_hand ?? 
    snapshot?.warehouse?.inventory_on_hand
  )
  
  const warehouseUnreserved = toRoundedNumberOrNull(
    snapshot?.formula?.warehouse_unreserved_units
  )
  
  // Extract storefront values
  const storefrontOnHand = toRoundedNumberOrNull(
    snapshot?.formula?.storefront_on_hand ?? 
    snapshot?.storefront?.total_on_hand
  )
  
  const storefrontSellable = toRoundedNumberOrNull(
    snapshot?.formula?.storefront_sellable_units
  )
  
  // Extract reservations
  const reservations = toRoundedNumberOrNull(
    snapshot?.formula?.active_reservations_units ?? 
    (
      toNumberOrNull(snapshot?.reservations?.linked_units) ?? 0
    ) + (
      toNumberOrNull(snapshot?.reservations?.orphaned_units) ?? 0
    )
  )
  
  // Extract sold units
  const sold = toRoundedNumberOrNull(
    snapshot?.formula?.completed_sales_units ?? 
    snapshot?.sales?.completed_units
  )
  
  // Extract adjustments
  const shrinkage = toRoundedNumberOrNull(
    snapshot?.formula?.shrinkage_units ?? 
    snapshot?.adjustments?.shrinkage_units
  )
  
  const corrections = toRoundedNumberOrNull(
    snapshot?.formula?.correction_units ?? 
    snapshot?.adjustments?.correction_units
  )
  
  const netAdjustments = toRoundedNumberOrNull(
    snapshot?.formula?.net_adjustment_units
  ) ?? (corrections ?? 0) - (shrinkage ?? 0)
  
  // Extract calculated baseline (THIS IS THE KEY VALUE)
  const calculatedBaseline = toRoundedNumberOrNull(
    snapshot?.formula?.calculated_baseline
  )
  
  // Extract delta (THIS IS THE MISMATCH VALUE)
  const baselineDelta = toRoundedNumberOrNull(
    snapshot?.formula?.baseline_vs_recorded_delta
  )
  
  return {
    recordedBatchSize,
    warehouseOnHand,
    warehouseUnreserved,
    storefrontOnHand,
    storefrontSellable,
    reservations,
    sold,
    shrinkage,
    corrections,
    netAdjustments,
    calculatedBaseline,
    baselineDelta,
  }
}, [reconciliationSnapshot])
```

### Helper Functions (No Business Logic)

```typescript
// Just rounds to integer, no calculations
const toRoundedNumberOrNull = (value: unknown): number | null => {
  const parsed = toNumberOrNull(value)
  if (parsed == null) return null
  return Math.round(parsed)
}

// Just converts to number, no calculations
const toNumberOrNull = (value: unknown): number | null => {
  if (value == null) return null
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}
```

**KEY POINT:** The frontend only converts strings to numbers and rounds decimals. We do NOT calculate:
- ❌ `calculated_baseline`
- ❌ `baseline_vs_recorded_delta`
- ❌ Any inventory formulas

---

## 📊 How Frontend Displays the Formula

### UI Display Code

```tsx
<div className="mt-3 rounded-xl bg-slate-100 p-3 text-xs text-slate-600">
  Warehouse ({formatQuantity(reconciliationMetrics.warehouseOnHand)}) + 
  Storefront ({formatQuantity(reconciliationMetrics.storefrontOnHand)}) + 
  Sold ({formatQuantity(reconciliationMetrics.sold)}) − 
  Shrinkage ({formatQuantity(reconciliationMetrics.shrinkage)}) + 
  Corrections ({formatQuantity(reconciliationMetrics.corrections)}) − 
  Reservations ({formatQuantity(reconciliationMetrics.reservations)}) = 
  {formatQuantity(reconciliationMetrics.calculatedBaseline)}
  {' '}&mdash; Recorded batch size {formatQuantity(reconciliationMetrics.recordedBatchSize)}
</div>
```

**What this displays (example from screenshot):**
```
Warehouse (280) + Storefront (179) + Sold (135) − Shrinkage (0) + Corrections (0) − Reservations (0) = 324 — Recorded batch size 459
```

### Mismatch Warning Display

```tsx
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
        </div>
      </div>
    </div>
  </Alert>
) : null}
```

**What this displays (example from screenshot):**
```
⚠️ Reconciliation mismatch detected: 135 units over accounted
```

---

## ❓ The Problem We're Seeing

### Example from Production (Samsung TV 43")

**API Response Values (what backend sent):**
- Warehouse on hand: **280**
- Storefront on hand: **179**
- Units sold: **135**
- Shrinkage: **0**
- Corrections applied: **0**
- Active reservations: **0**
- Calculated baseline: **324** (from `formula.calculated_baseline`)
- Recorded batch size: **459** (from `formula.recorded_batch_quantity`)
- Baseline delta: **135** (from `formula.baseline_vs_recorded_delta`)

**Frontend displays:**
```
Warehouse (280) + Storefront (179) + Sold (135) − Shrinkage (0) + Corrections (0) − Reservations (0) = 324 — Recorded batch size 459

⚠️ Reconciliation mismatch detected: 135 units over accounted
```

### 🔍 Questions for Backend Developer

1. **What is the intended reconciliation formula?**
   - Frontend displays: `Warehouse + Storefront + Sold − Shrinkage + Corrections − Reservations = Baseline`
   - Is this the correct formula?
   - Should `Sold` be added or subtracted?

2. **What does `calculated_baseline` represent?**
   - Is it the theoretical starting inventory?
   - Is it the current total units that should exist?
   - Based on your previous bug report, you mentioned the formula has `+ sold` instead of `- sold`. Is this still the issue?

3. **What does `baseline_vs_recorded_delta` represent?**
   - In the example: `baseline_vs_recorded_delta = 135`
   - Is this: `calculated_baseline - recorded_batch_quantity`? (324 - 459 = -135, but we're getting +135)
   - Or is it: `recorded_batch_quantity - calculated_baseline`? (459 - 324 = 135) ✅ This matches!

4. **Should the delta show a different message?**
   - Currently shows: "135 units over accounted"
   - Does "over accounted" mean we recorded more than we should have?
   - Or does it mean we have 135 units unaccounted for?

5. **Is the formula in the UI display correct?**
   - We show: `Warehouse + Storefront + Sold − Shrinkage + Corrections − Reservations`
   - Should it be: `Warehouse + Storefront − Sold − Shrinkage + Corrections − Reservations`?

---

## 🎯 What Frontend Needs from Backend

### Option 1: Backend Fixes the Calculation

If the formula calculation is wrong in the backend:

```python
# Backend should ensure this formula is correct:
calculated_baseline = (
    warehouse_on_hand + 
    storefront_on_hand - 
    sold_units -  # Should this be minus?
    shrinkage_units + 
    correction_units - 
    active_reservations
)

baseline_vs_recorded_delta = calculated_baseline - recorded_batch_quantity
```

### Option 2: Backend Provides Explicit Formula String

Add a new field to help frontend display correctly:

```json
{
  "formula": {
    "calculated_baseline": 324,
    "baseline_vs_recorded_delta": 135,
    "formula_display": "Warehouse + Storefront - Sold - Shrinkage + Corrections - Reservations",
    "formula_explanation": "Starting batch minus units that left the system"
  }
}
```

### Option 3: Backend Provides Mismatch Explanation

Add helper text:

```json
{
  "formula": {
    "baseline_vs_recorded_delta": 135,
    "delta_direction": "UNDER_ACCOUNTED",  // or "OVER_ACCOUNTED"
    "delta_explanation": "135 units are missing from inventory - physical count is less than recorded batch",
    "severity": "WARNING"  // or "ERROR", "INFO"
  }
}
```

---

## 📝 Frontend Requirements Summary

**What frontend is doing RIGHT:**
✅ Only displaying values from backend API  
✅ No client-side inventory calculations  
✅ Proper type safety with TypeScript  
✅ Clear visual hierarchy showing formula breakdown

**What frontend needs from backend:**
1. **Confirmation of the correct reconciliation formula**
2. **Clarification on what `calculated_baseline` means**
3. **Clarification on what `baseline_vs_recorded_delta` means**
4. **Fix for the calculation if there's a bug** (you mentioned `+ sold` vs `- sold`)
5. **Optional: Better field names or additional explanatory fields**

---

## 🔧 Current Backend Bug Reference

You mentioned in your previous documentation (`BACKEND-BUG-RECONCILIATION-CALCULATION.md`) that the formula has:

```python
# WRONG (current backend):
calculated_baseline = warehouse + storefront + sold - shrinkage + corrections - reservations

# CORRECT (should be):
calculated_baseline = warehouse + storefront - sold - shrinkage + corrections - reservations
```

**If this is still the case**, then the frontend is correctly displaying the backend's incorrect calculation. We just need you to fix the backend formula, and the frontend will automatically display the correct values.

---

## 📸 Visual Example from Screenshot

**What user sees:**

```
Product: Samsung TV 43"
SKU: ELEC-0005

Reconciliation snapshot not available yet. [Refresh snapshot]

Warehouse: Rawlings Park Warehouse
Batch: Stock intake for October 2025

Recorded batch size: 459
Landed unit cost: 379.39

Warehouse on hand: 280 ← Sellable now: 179
Storefront on hand: 179 ← Sellable now: 179
Units sold: 135
Active reservations: 0

Shrinkage / write-offs: 0
Corrections applied: 0
Net adjustment: 0

Warehouse (280) + Storefront (179) + Sold (135) − Shrinkage (0) + Corrections (0) − Reservations (0) = 324 — Recorded batch size 459

⚠️ Reconciliation mismatch detected: 135 units over accounted
Possible causes:
• Unrecorded transfers or intake
• Incorrect shrinkage/adjustment entries
• Data entry errors in batch size
```

**What doesn't make sense:**
- If we started with 459 units
- And we have 280 in warehouse + 179 in storefront = 459 total on hand
- And we sold 135 units
- Then we should have: 459 - 135 = 324 units remaining
- But we have 459 units on hand (280 + 179)
- So we're actually 135 units OVER, not under

**This suggests the `sold` units are not being subtracted from the baseline calculation.**

---

## 🤝 Next Steps

1. **Backend Developer:** Please review this document
2. **Confirm or correct** the reconciliation formula
3. **Explain** what each field in `StockReconciliationFormula` represents
4. **Fix** the backend calculation if needed
5. **Optionally:** Add more descriptive fields to help frontend display better messages

Once we understand your reconciliation logic, we can ensure the frontend displays it correctly!

---

## 📞 Contact

**Frontend Developer:** [Your Name]  
**File Location:** `/docs/FRONTEND-RECONCILIATION-IMPLEMENTATION-GUIDE.md`  
**Related Files:**
- `/src/features/dashboard/components/StockProductDetailModal.tsx` (lines 230-320)
- `/src/services/inventoryService.ts` (line 298)
- `/src/types/inventory.ts` (lines 271-303)

**Backend Documentation Reference:**
- `BACKEND-BUG-RECONCILIATION-CALCULATION.md` (if it exists)

---

**Thank you for your help in resolving this! 🙏**
