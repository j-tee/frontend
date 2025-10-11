# Stock Reconciliation Documentation Index

**For Backend Developer**  
**Issue:** Reconciliation mismatch showing incorrect values  
**Date:** October 10, 2025

---

## 📋 Documentation Overview

This documentation package explains the stock reconciliation mismatch issue from the frontend perspective. The frontend is **not calculating** any inventory values - we only display what the backend API provides.

---

## 🚀 Start Here

### 1. Quick Start (2-minute read)
**File:** `RECONCILIATION-ISSUE-QUICK-START.md`

Read this first for a high-level overview of:
- What the issue is
- What frontend needs from you
- Quick action items
- Success criteria

---

## 📖 Detailed Documentation

### 2. Frontend Implementation Guide (15-minute read)
**File:** `FRONTEND-RECONCILIATION-IMPLEMENTATION-GUIDE.md`

Comprehensive technical documentation covering:
- **API Integration:** How frontend calls your reconciliation endpoint
- **Data Structures:** TypeScript interfaces showing expected API response
- **Display Logic:** Exact code showing how we extract and display values
- **Current Issue:** Real production example with screenshots
- **Specific Questions:** What we need clarified about the reconciliation logic

**Key sections:**
- 📡 Current API Integration
- 📦 Data Structure: What Frontend Receives
- 🖥️ Frontend Display Logic (Read-Only)
- ❓ The Problem We're Seeing
- 🎯 What Frontend Needs from Backend

---

### 3. Visual Formula Guide (10-minute read)
**File:** `RECONCILIATION-FORMULA-VISUAL-GUIDE.md`

Visual diagrams and logical analysis:
- **The Problem in One Image:** Visual breakdown of current values
- **Logical Analysis:** Why the numbers don't make sense
- **Two Reconciliation Approaches:** Different ways to interpret the formula
- **Real Question:** What does "over accounted" mean?
- **Most Likely Scenarios:** Three hypotheses about what's wrong
- **Recommended Actions:** Specific SQL queries to investigate

**Key sections:**
- 🎯 The Problem in One Image
- 🤔 Logical Analysis
- 📐 Two Possible Reconciliation Approaches
- 💡 Most Likely Scenario
- 🔧 What Backend Should Verify

---

## 🎯 Quick Reference

### The Numbers That Don't Add Up

```
Product: Samsung TV 43" (ELEC-0005)

Recorded batch size:      459 units
Warehouse on hand:        280 units
Storefront on hand:       179 units
─────────────────────────────────
Total on hand:            459 units  ← Should be 324 if 135 were sold?

Units sold:               135 units  ← Were these deducted from inventory?
Calculated baseline:      324 units
Delta:                    135 units "over accounted"
```

### Key Questions

1. **Should `sold_units` be added or subtracted in the formula?**
   - Frontend shows: `Warehouse + Storefront + Sold - Shrinkage + Corrections - Reservations = 324`
   - Is this correct, or should it be `Warehouse + Storefront - Sold`?

2. **Do sales automatically decrement inventory counts?**
   - If 135 units were sold, why does storefront still show 179?
   - Should it show 44 (179 - 135)?

3. **What does "calculated_baseline" represent?**
   - Is it: "Units that should exist now" = Starting batch - Sold - Shrinkage?
   - Or: "Total units accounted for" = On hand + Sold?

4. **What does "over accounted" mean?**
   - Too many physical units compared to what we should have?
   - Or too many transactions compared to starting inventory?

---

## 🔍 Frontend Code Locations

For your reference, here's where the reconciliation logic lives in the frontend:

### Service Layer
**File:** `/src/services/inventoryService.ts`
```typescript
// Line ~298
export const fetchProductStockReconciliation = async (productId: string) => {
  const { data } = await httpClient.get<StockReconciliationResponse>(
    `/inventory/api/products/${productId}/stock-reconciliation/`
  )
  return data
}
```

### Type Definitions
**File:** `/src/types/inventory.ts`
```typescript
// Lines 271-303
export interface StockReconciliationResponse {
  product?: UUID | null
  generated_at?: string | null
  warehouse?: { ... }
  storefront?: { ... }
  sales?: { ... }
  adjustments?: { ... }
  reservations?: { ... }
  formula?: StockReconciliationFormula
}

export interface StockReconciliationFormula {
  calculated_baseline?: number | string | null
  baseline_vs_recorded_delta?: number | string | null
  // ... other fields
}
```

### Display Component
**File:** `/src/features/dashboard/components/StockProductDetailModal.tsx`
```typescript
// Lines 230-320: Reconciliation metrics extraction
const reconciliationMetrics = useMemo(() => {
  const snapshot = reconciliationSnapshot
  
  // Extract values from API response (NO CALCULATIONS)
  const calculatedBaseline = toRoundedNumberOrNull(
    snapshot?.formula?.calculated_baseline
  )
  
  const baselineDelta = toRoundedNumberOrNull(
    snapshot?.formula?.baseline_vs_recorded_delta
  )
  
  // ... returns extracted values
}, [reconciliationSnapshot])

// Lines 620-720: UI Display
// Shows formula breakdown and mismatch warning
```

---

## ✅ What We Know

### Frontend is Doing This Correctly ✅
- Only displaying values from backend API
- Not performing any inventory calculations
- Proper error handling and loading states
- Clear visual hierarchy
- Responsive UI design

### Frontend is NOT Doing ❌
- Calculating `calculated_baseline`
- Calculating `baseline_vs_recorded_delta`
- Any inventory math whatsoever
- Interpreting what "over accounted" means

---

## 🎯 What Backend Needs to Provide

### Minimum (Fix the Current Issue)
1. Verify reconciliation formula is correct
2. Ensure sales decrement inventory when completed
3. Fix any calculation bugs

### Recommended (Better User Experience)
4. Add clearer field names or explanations:
   ```json
   {
     "formula": {
       "calculated_baseline": 324,
       "baseline_vs_recorded_delta": 135,
       "discrepancy_type": "EXCESS_INVENTORY" | "MISSING_INVENTORY",
       "discrepancy_explanation": "Human-readable explanation of what's wrong"
     }
   }
   ```

### Optional (Enhanced Features)
5. Transaction history endpoint for debugging
6. Reconciliation audit log
7. Suggested corrective actions

---

## 📞 Communication Protocol

### When Backend Has Questions
**Ask about:**
- Frontend code implementation
- How we're interpreting API responses
- What fields we're using
- UI/UX requirements

**Contact:** Frontend team  
**Slack/Email:** [Your contact info]

### When Backend Has Answers
**Please provide:**
1. Explanation of what was wrong
2. What you fixed
3. New API response examples (if changed)
4. Any changes to field names or structures
5. Timeline for deployment

### When Backend Deploys Fix
**We need to:**
1. Test with real data in development
2. Verify formula display is correct
3. Update documentation if needed
4. Deploy frontend changes (if any)

---

## 🧪 Testing Checklist

After backend fix, frontend will verify:

- [ ] Reconciliation snapshot loads without errors
- [ ] `calculated_baseline` value makes logical sense
- [ ] `baseline_vs_recorded_delta` correctly shows discrepancy
- [ ] Mismatch warning appears only when there's an actual issue
- [ ] Formula display matches backend calculation logic
- [ ] All edge cases handled (null values, zero quantities, etc.)
- [ ] Performance is acceptable (< 2s response time)

---

## 📚 Related Documentation

### Frontend Docs
- `FRONTEND-RECONCILIATION-IMPLEMENTATION-GUIDE.md` - Complete technical guide
- `RECONCILIATION-FORMULA-VISUAL-GUIDE.md` - Visual analysis
- `RECONCILIATION-ISSUE-QUICK-START.md` - Quick overview

### Backend Docs (if available)
- `BACKEND-BUG-RECONCILIATION-CALCULATION.md` - Original bug report about formula
- Stock reconciliation endpoint documentation
- Inventory transaction model documentation

### User Docs
- `STOCK-RECONCILIATION-FRONTEND-IMPLEMENTATION.md` - User-facing features
- Stock management user guide

---

## 🎉 Success Looks Like

### Before Fix
```
⚠️ Reconciliation mismatch detected: 135 units over accounted

Warehouse (280) + Storefront (179) + Sold (135) = 324
Recorded batch: 459
Delta: 135 over
```
**User confused:** "Why does it say over accounted? What does that mean?"

### After Fix (Option 1: Sales are deducted properly)
```
✅ Reconciliation matches recorded batch

Warehouse (280) + Storefront (44) = 324
Sold (135)
Total accounted: 459 (324 on-hand + 135 sold)
Recorded batch: 459
Delta: 0 (balanced)
```
**User happy:** "Everything balances!"

### After Fix (Option 2: Batch size corrected)
```
✅ Reconciliation matches recorded batch

Warehouse (280) + Storefront (179) = 459
Sold (135)
Total accounted: 594 (459 on-hand + 135 sold)
Recorded batch: 594 (corrected)
Delta: 0 (balanced)
```
**User happy:** "Ah, someone entered the wrong batch size. Fixed now!"

---

## 🙏 Thank You!

We appreciate your help resolving this issue. The reconciliation feature is critical for inventory accuracy, and getting this right will help our users trust the system.

**Frontend team is here to support you!**  
Don't hesitate to reach out with questions.

---

**Documentation created:** October 10, 2025  
**Status:** Awaiting backend investigation  
**Priority:** Medium  
**Estimated backend effort:** 1-2 hours investigation + fix time
