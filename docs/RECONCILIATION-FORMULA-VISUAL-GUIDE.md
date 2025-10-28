# Stock Reconciliation Formula - Visual Guide

**Quick Reference for Backend Developer**  
**Date:** October 10, 2025

---

## 🎯 The Problem in One Image

### What Frontend Currently Displays

```
Samsung TV 43" (ELEC-0005)
Recorded batch size: 459 units

┌─────────────────────────────────────────────────────────┐
│  CURRENT LOCATION BREAKDOWN                             │
├─────────────────────────────────────────────────────────┤
│  📦 Warehouse on hand:        280 units                 │
│  🏪 Storefront on hand:       179 units                 │
│  ═══════════════════════════════════                    │
│  📊 Total physical units:     459 units                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  MOVEMENT HISTORY                                       │
├─────────────────────────────────────────────────────────┤
│  💰 Units sold:               135 units                 │
│  ⚠️  Shrinkage/write-offs:    0 units                   │
│  ✅ Corrections applied:      0 units                   │
│  🔒 Active reservations:      0 units                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  BACKEND RECONCILIATION FORMULA                         │
├─────────────────────────────────────────────────────────┤
│  Warehouse (280)                                        │
│  + Storefront (179)                                     │
│  + Sold (135)          ← ❌ SHOULD THIS BE MINUS?      │
│  − Shrinkage (0)                                        │
│  + Corrections (0)                                      │
│  − Reservations (0)                                     │
│  ═══════════════════════════════════                    │
│  = Calculated baseline: 324                             │
│  − Recorded batch: 459                                  │
│  ═══════════════════════════════════                    │
│  = Delta: -135 (shown as "135 over accounted")         │
└─────────────────────────────────────────────────────────┘
```

---

## 🤔 Logical Analysis

### Scenario 1: If Sold Units Should Be ADDED (Current Backend)

```
Starting inventory: 459 units

280 (warehouse) + 179 (storefront) + 135 (sold) = 594 units

❌ This doesn't make sense!
   We can't have MORE units than we started with
   just because we sold some!
```

### Scenario 2: If Sold Units Should Be SUBTRACTED (Suggested Fix)

```
Starting inventory: 459 units

Current on-hand:
280 (warehouse) + 179 (storefront) = 459 units

Units that left inventory:
135 (sold)

Accounting check:
459 (on-hand) + 135 (sold) = 594 units total

Wait... if we started with 459 and we have 459 on hand,
plus we sold 135, that's 594 total units processed.

That means we're actually 135 units OVER!
```

---

## 📐 Two Possible Reconciliation Approaches

### Approach A: "What Should Exist Now" (Current Approach?)

**Formula:**
```
Calculated Baseline = Starting Batch - Units That Left System

Where "Units That Left" includes:
  - Sold units
  - Shrinkage
  - Minus corrections (because they add units back)
  
Calculated Baseline = 459 - 135 - 0 + 0 = 324 units

Current Physical Count = 280 (warehouse) + 179 (storefront) = 459 units

Mismatch = Current Physical - Calculated Baseline
         = 459 - 324
         = +135 (we have 135 more than we should)
```

**This makes sense!** ✅  
- We should have 324 units remaining
- But we physically have 459 units
- So we have 135 "extra" units (over accounted)

### Approach B: "Total Units Processed" (Alternative)

**Formula:**
```
Total Units Accounted For = On Hand + Sold + Shrinkage - Corrections

Total Accounted = 459 (on-hand) + 135 (sold) + 0 - 0 = 594 units

Mismatch = Total Accounted - Starting Batch
         = 594 - 459
         = +135 (we processed 135 more than we started with)
```

**This also makes sense!** ✅  
- We started with 459 units
- We've accounted for 594 units total (459 on-hand + 135 sold)
- So we somehow gained 135 units

---

## 🎯 The Real Question

### What Does "Over Accounted" Mean?

**Option 1:** We have more physical units than the math says we should
```
Should have: 324 units (after selling 135 from 459)
Actually have: 459 units
Difference: +135 units (over accounted = too many units)
```

**Option 2:** We recorded more transactions than the starting inventory supports
```
Started with: 459 units
Transactions: 459 (still on hand) + 135 (sold) = 594 total
Difference: +135 units (over accounted = processed more than we received)
```

---

## 💡 Most Likely Scenario

Based on the data:
- Recorded batch size: **459 units**
- Current warehouse: **280 units**
- Current storefront: **179 units**
- Total on hand: **459 units**
- Units sold: **135 units**

### Hypothesis A: Sold units were never deducted from inventory

```
Timeline:
1. Received 459 units → recorded in batch
2. Moved some to storefront (280 stay in warehouse, 179 to storefront)
3. Sold 135 units from storefront
4. BUT: Inventory counts weren't decremented when sales happened
5. So we still show 459 units on hand, even though 135 were sold

Result: We're "over accounted" because the physical count
        doesn't reflect the sales that happened
```

### Hypothesis B: Batch size was recorded incorrectly

```
Timeline:
1. Actually received 594 units (not 459)
2. Someone entered 459 as the batch size (data entry error)
3. Moved units around: 280 warehouse, 179 storefront = 459 on hand
4. Sold 135 units
5. Current state matches reality, but batch size is wrong

Result: We're "over accounted" because we recorded receiving
        135 fewer units than we actually got
```

### Hypothesis C: Multiple batches were merged

```
Timeline:
1. Received batch A: 459 units
2. Received batch B: 135 units (but someone added to batch A instead)
3. Total should be: 594 units
4. System thinks batch size is: 459 units
5. Current on-hand: 459 units (after selling 135 from the 594 total)

Result: Reconciliation thinks we're over because it doesn't
        know about the 135 units from batch B
```

---

## 🔧 What Backend Should Verify

### 1. Check the Calculation Formula

Current backend formula (suspected):
```python
calculated_baseline = (
    warehouse_on_hand +      # 280
    storefront_on_hand +     # 179
    sold_units +             # 135  ← Should this be MINUS?
    corrections -            # 0
    shrinkage_units -        # 0
    active_reservations      # 0
) = 324
```

Should it be:
```python
calculated_baseline = (
    recorded_batch_quantity -  # 459
    sold_units -              # 135
    shrinkage_units +         # 0
    corrections -             # 0
    active_reservations       # 0
) = 324
```

### 2. Check the Sales Ledger

Query to verify:
```sql
SELECT COUNT(*), SUM(quantity)
FROM sales_line_items
WHERE product_id = 'Samsung-TV-43-product-id'
  AND sale.status = 'COMPLETED'
  AND stock_product_id IN (
    SELECT id FROM stock_products 
    WHERE product_id = 'Samsung-TV-43-product-id'
  );
```

Expected: 135 units sold  
Verify: Do these sales exist in the database?

### 3. Check Stock Movement History

Query to verify:
```sql
SELECT 
  transaction_type,
  quantity,
  created_at
FROM stock_transactions
WHERE product_id = 'Samsung-TV-43-product-id'
ORDER BY created_at;
```

Look for:
- Initial intake: Should show +459
- Sales: Should show -1, -1, -1... (totaling -135)
- Transfers: Any warehouse → storefront moves?

### 4. Check for Duplicate Batch Entries

Query to verify:
```sql
SELECT 
  batch_id,
  product_id,
  quantity,
  arrival_date
FROM stock_batches
WHERE product_id = 'Samsung-TV-43-product-id'
ORDER BY arrival_date;
```

Are there multiple batches that should have been one?

---

## 📊 Expected vs Actual Comparison Table

| Metric | What Frontend Gets from API | What Makes Sense | Status |
|--------|---------------------------|------------------|---------|
| Recorded batch | 459 | ✅ Probably correct | OK |
| Warehouse on hand | 280 | ✅ Physical count | OK |
| Storefront on hand | 179 | ✅ Physical count | OK |
| Total on hand | 459 | ⚠️ Should be 324 if 135 were sold | **ISSUE** |
| Units sold | 135 | ✅ From sales records | OK |
| Calculated baseline | 324 | ✅ Math checks out | OK |
| Delta | 135 over | ⚠️ Correct value, confusing message | **ISSUE** |

---

## ✅ Recommended Backend Actions

1. **Verify the formula** is correct in the reconciliation calculation
2. **Check if sales are deducting** from inventory counts
3. **Investigate** this specific product (ELEC-0005) for transaction history
4. **Clarify** what "over accounted" should mean to users
5. **Add** more detailed explanation in the API response:

```json
{
  "formula": {
    "calculated_baseline": 324,
    "baseline_vs_recorded_delta": 135,
    "discrepancy_type": "EXCESS_INVENTORY",
    "explanation": "Physical inventory (459) exceeds expected remaining units (324) by 135. This suggests either: 1) Sales were not deducted from inventory, 2) Batch size was under-recorded, or 3) Unrecorded stock was added."
  }
}
```

---

## 📞 Questions for Backend Developer

1. Should `sold_units` be added or subtracted in the reconciliation formula?
2. Do sales automatically decrement inventory counts when completed?
3. Is there a stock transaction log we can review for this product?
4. Should the formula show `Starting Batch - Sold - Shrinkage` or `Current On Hand + Sold + Shrinkage`?
5. What does "over accounted" mean from a business perspective?

---

**Frontend is ready to display whatever the correct calculation is!**  
**We just need to understand the intended logic. 🎯**
