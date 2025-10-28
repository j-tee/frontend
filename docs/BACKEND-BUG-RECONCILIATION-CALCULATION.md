# Backend Bug: Stock Reconciliation Calculation Error

## Issue Date
October 10, 2025

## Priority
🔴 **HIGH** - Incorrect inventory calculations can lead to serious business problems

## Summary
The stock reconciliation calculation on the backend is incorrect. It's adding "Units sold" instead of subtracting it, leading to inflated baseline calculations.

## Current Behavior (INCORRECT)

**Formula being used:**
```
Warehouse + Storefront + Sold - Shrinkage + Corrections - Reservations = Calculated Baseline
```

**Example from Production:**
```
Product: 10mm Armoured Cable 50m
SKU: ELEC-0007
Batch: 100sq foot warehouse

Current calculation:
Warehouse (23) + Storefront (23) + Sold (10) − Shrinkage (18) + Corrections (20) − Reservations (0) = 58

Recorded batch size: 46
```

**Problem:** The calculation shows 58, but it should be 38 because sold units should be SUBTRACTED, not added.

## Expected Behavior (CORRECT)

**Formula should be:**
```
Warehouse + Storefront - Sold - Shrinkage + Corrections - Reservations = Calculated Baseline
```

**Correct calculation:**
```
Warehouse (23) + Storefront (23) - Sold (10) − Shrinkage (18) + Corrections (20) − Reservations (0) = 38

Recorded batch size: 46
```

This makes more sense because:
- We started with 46 units
- Lost 18 to shrinkage
- Sold 10 to customers
- Added 20 via corrections
- Currently have 23 in warehouse + 23 in storefront = 46 on hand
- **Total accounted: 38 (which should match or be close to the batch size after adjustments)**

## Why This Matters

1. **Inventory Accuracy**: Incorrect calculations lead to wrong inventory counts
2. **Financial Impact**: Overstated inventory values
3. **Decision Making**: Wrong data leads to poor purchasing/stocking decisions
4. **Reconciliation**: Can't properly identify discrepancies if the math is wrong

## Backend API Affected

**Endpoint:**
```
GET /inventory/api/products/{product_id}/stock-reconciliation/
```

**Response Field:**
```json
{
  "formula": {
    "calculated_baseline": 58  // ❌ WRONG - Should be 38
  }
}
```

## Location of Bug (Likely)

The backend calculation logic is probably in one of these files:
- `inventory/views.py` - ProductViewSet or similar
- `inventory/serializers.py` - Reconciliation serializer
- `inventory/models.py` - Model method for reconciliation
- `inventory/services.py` - Business logic service

## Required Fix

**Change this:**
```python
calculated_baseline = (
    warehouse_on_hand + 
    storefront_on_hand + 
    sold -  # ❌ WRONG - should be subtracted
    shrinkage + 
    corrections - 
    reservations
)
```

**To this:**
```python
calculated_baseline = (
    warehouse_on_hand + 
    storefront_on_hand - 
    sold -  # ✅ CORRECT - subtract sold units
    shrinkage + 
    corrections - 
    reservations
)
```

## Testing Requirements

After fixing, verify:

1. **Test Case 1: Basic Calculation**
   ```
   Warehouse: 10
   Storefront: 5
   Sold: 3
   Shrinkage: 2
   Corrections: 0
   Reservations: 0
   
   Expected: 10 + 5 - 3 - 2 + 0 - 0 = 10
   ```

2. **Test Case 2: With Corrections**
   ```
   Warehouse: 23
   Storefront: 23
   Sold: 10
   Shrinkage: 18
   Corrections: 20
   Reservations: 0
   
   Expected: 23 + 23 - 10 - 18 + 20 - 0 = 38
   ```

3. **Test Case 3: With Reservations**
   ```
   Warehouse: 50
   Storefront: 30
   Sold: 20
   Shrinkage: 5
   Corrections: 0
   Reservations: 10
   
   Expected: 50 + 30 - 20 - 5 + 0 - 10 = 45
   ```

## Frontend Impact

**Good News:** The frontend is correctly implemented! It's only displaying what the backend provides.

**Frontend Code (CORRECT):**
```typescript
// src/features/dashboard/components/StockProductDetailModal.tsx
const calculatedBaseline = toRoundedNumberOrNull(snapshot?.formula?.calculated_baseline)
```

The frontend reads `calculated_baseline` from the API response and displays it. Once the backend is fixed, the frontend will automatically show the correct value.

**No frontend changes required** ✅

## Verification Steps

After backend deploys the fix:

1. ✅ Refresh the stock reconciliation snapshot
2. ✅ Verify the calculation shows 38 instead of 58
3. ✅ Check other products to ensure formula is correct
4. ✅ Review any reports or analytics that use this calculation

## Related Documentation

- `BACKEND-README-STOCK-RECONCILIATION.md` - Reconciliation API docs
- `STOCK-RECONCILIATION-FRONTEND-IMPLEMENTATION.md` - Frontend implementation

## Backend Developer Action Items

- [ ] Locate the reconciliation calculation code
- [ ] Change `+ sold` to `- sold` in the formula
- [ ] Add unit tests for the calculation
- [ ] Test with real data
- [ ] Deploy to staging
- [ ] Verify with frontend team
- [ ] Deploy to production
- [ ] Monitor for any issues

## Notes

This is a **logic error** in the backend calculation, not a frontend display issue. The mathematical operator for "Sold" needs to be changed from addition (+) to subtraction (-).

The concept is simple: 
- **Units sold have left our inventory** → They should be subtracted
- **They are no longer available** → Don't count them as "on hand"

---

**Reported By:** Frontend Team  
**Date:** October 10, 2025  
**Status:** 🔴 **AWAITING BACKEND FIX**  
**Urgency:** High - affects inventory accuracy
