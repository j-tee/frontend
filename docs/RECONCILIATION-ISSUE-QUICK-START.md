# QUICK START: Reconciliation Mismatch Issue

**Backend Developer - Read This First!**  
**Date:** October 10, 2025  
**Priority:** Medium  
**Estimated Reading Time:** 2 minutes

---

## 🚨 The Issue in 30 Seconds

User is seeing this warning in production:

```
⚠️ Reconciliation mismatch detected: 135 units over accounted
```

**But the numbers don't make sense:**

- Started with: **459 units** (recorded batch)
- On hand now: **459 units** (280 warehouse + 179 storefront)
- Sold: **135 units**
- Calculated baseline: **324 units**

**Question:** If we sold 135 units, why do we still have 459 units on hand?

---

## 🎯 What Frontend Needs

Frontend is **NOT calculating anything**. We only display values from your API.

We need you to:

1. ✅ **Confirm the reconciliation formula is correct**
2. ✅ **Explain what "calculated_baseline" means**
3. ✅ **Explain what "over accounted" means**
4. ✅ **Fix any calculation bugs** (if they exist)

---

## 📡 API Endpoint

```
GET /inventory/api/products/{product_id}/stock-reconciliation/
```

Returns:
```json
{
  "warehouse": {
    "inventory_on_hand": 280,
    "recorded_quantity": 459
  },
  "storefront": {
    "total_on_hand": 179
  },
  "sales": {
    "completed_units": 135
  },
  "adjustments": {
    "shrinkage_units": 0,
    "correction_units": 0
  },
  "reservations": {
    "linked_units": 0,
    "orphaned_units": 0
  },
  "formula": {
    "warehouse_inventory_on_hand": 280,
    "storefront_on_hand": 179,
    "completed_sales_units": 135,
    "shrinkage_units": 0,
    "correction_units": 0,
    "active_reservations_units": 0,
    "calculated_baseline": 324,
    "recorded_batch_quantity": 459,
    "baseline_vs_recorded_delta": 135
  }
}
```

---

## 🔍 The Suspected Bug

You mentioned in a previous bug report that the formula has:

```python
# WRONG:
calculated_baseline = warehouse + storefront + sold - shrinkage + corrections - reservations
                    = 280 + 179 + 135 - 0 + 0 - 0
                    = 594  ← But API returns 324, so this isn't the current formula?

# CORRECT (?):
calculated_baseline = warehouse + storefront - sold - shrinkage + corrections - reservations
                    = 280 + 179 - 135 - 0 + 0 - 0
                    = 324  ✅ This matches the API response!
```

**So the formula looks correct now!**

But then why do we have 459 units on hand if we sold 135?

---

## 💡 Two Possible Explanations

### Theory 1: Sales Don't Decrement Inventory

```
1. Received 459 units
2. Moved to locations: 280 warehouse + 179 storefront = 459
3. Sold 135 units from storefront
4. BUT: Inventory count wasn't decreased
5. So we still show 179 in storefront (should be 44)

Fix: Ensure sales decrement inventory counts when completed
```

### Theory 2: Batch Size Was Wrong

```
1. Actually received 594 units (not 459)
2. Data entry error: recorded as 459
3. Current state is correct: 459 on hand + 135 sold = 594 total
4. Mismatch because batch size is under-recorded by 135

Fix: Correct the batch size to 594, or investigate receiving records
```

---

## 🎯 Action Items for Backend

### Immediate (5 minutes)

1. **Verify formula** in reconciliation calculation code
   - Confirm `sold_units` is being subtracted (not added)
   - Confirm all fields map correctly to API response

### Short-term (15 minutes)

2. **Check this specific product** (Samsung TV 43", ELEC-0005)
   ```sql
   -- Do 135 sales exist?
   SELECT COUNT(*), SUM(quantity) 
   FROM sales_line_items sli
   JOIN sales s ON sli.sale_id = s.id
   WHERE sli.product_id = 'samsung-tv-id'
     AND s.status = 'COMPLETED';
   
   -- Check stock movements
   SELECT * FROM stock_transactions
   WHERE product_id = 'samsung-tv-id'
   ORDER BY created_at;
   ```

3. **Verify inventory deduction** on sale completion
   - When a sale is marked COMPLETED
   - Is the storefront inventory decremented?
   - Or is it only decremented when items are "picked"?

### Medium-term (30 minutes)

4. **Add better error messages** to the API
   ```json
   {
     "formula": {
       "baseline_vs_recorded_delta": 135,
       "discrepancy_explanation": "Physical inventory (459) exceeds calculated remaining units (324). This suggests sales were not deducted from inventory counts, or additional stock was received without updating the batch size.",
       "recommended_action": "Review sales transaction log and verify all completed sales decremented inventory.",
       "severity": "WARNING"
     }
   }
   ```

---

## 📚 Detailed Documentation

If you need more context, see:

1. **FRONTEND-RECONCILIATION-IMPLEMENTATION-GUIDE.md**  
   Full explanation of how frontend uses the API, with code examples

2. **RECONCILIATION-FORMULA-VISUAL-GUIDE.md**  
   Visual diagrams and step-by-step logical analysis

3. **BACKEND-BUG-RECONCILIATION-CALCULATION.md** (if it exists)  
   Your original bug report about the formula

---

## ✅ Success Criteria

After your fix:

```
Expected result:
- If 135 units were sold, inventory should show:
  - Storefront: 44 units (179 - 135)
  - Total on-hand: 324 units
  - Calculated baseline: 324 units
  - Delta: 0 (no mismatch)

OR

- If inventory counts are correct (459 on-hand):
  - Batch size should be: 594 units
  - Sold: 135 units
  - Remaining: 459 units
  - Calculated baseline: 459 units
  - Delta: 0 (no mismatch)
```

---

## 🤝 Let's Sync

Once you've investigated, please let frontend know:

1. What was causing the mismatch?
2. What did you fix?
3. Should frontend change how we display the formula?
4. Are there any new fields we should use?

**Thanks for looking into this!** 🙏

---

**Frontend is ready to test your fix!**  
Just let us know when the backend changes are deployed.
