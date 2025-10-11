# Stock Reconciliation - Quick Reference Guide

**Last Updated**: October 10, 2025  
**Status**: ✅ Production Ready

---

## 🎯 Quick Summary

The reconciliation formula verifies that inventory is correctly accounted for across all locations. **Sold units are tracked separately and do NOT affect the reconciliation calculation.**

---

## 📐 The Formula

```
Warehouse + Storefront Transferred - Shrinkage + Corrections - Reservations = Baseline
```

**Compare**: `Baseline` vs `Recorded Batch Quantity`

- **Delta = 0**: Inventory is balanced ✅
- **Delta > 0**: Under accounted (missing units from records)
- **Delta < 0**: Over accounted (extra units in records)

---

## 🔑 Key Fields

### From API Response

```typescript
{
  storefront: {
    total_on_hand: 174,    // Total transferred (fixed, doesn't change with sales)
    sellable_now: 169      // Available for sale (total - sold)
  },
  formula: {
    storefront_on_hand: 174,           // Same as total_on_hand
    storefront_sellable: 169,           // Same as sellable_now
    completed_sales_units: 5,           // Total sold
    calculated_baseline: 459,           // Formula result
    recorded_batch_quantity: 459,       // Original batch size
    baseline_vs_recorded_delta: 0       // Mismatch indicator
  }
}
```

### Usage in Frontend

| Field | Use For | Display As |
|-------|---------|------------|
| `total_on_hand` | Reconciliation formula | "Storefront transferred" |
| `sellable_now` | Sales availability | "Available for sale" |
| `completed_sales_units` | Information only | "Units sold (tracked separately)" |

---

## ⚠️ Common Mistakes

### ❌ DON'T
```typescript
// WRONG: Using total_on_hand for sales availability
const canSell = total_on_hand >= requestedQty

// WRONG: Including sold in reconciliation
const baseline = warehouse + storefront - sold
```

### ✅ DO
```typescript
// CORRECT: Using sellable_now for sales availability
const canSell = sellable_now >= requestedQty

// CORRECT: Sold units are separate
const baseline = warehouse + storefront - shrinkage + corrections - reservations
```

---

## 💡 Understanding Delta

### Delta = 0 ✅
**Meaning**: Inventory is perfectly balanced

**Example**:
- Recorded: 459 units
- Warehouse: 285 units
- Transferred: 174 units
- Formula: 285 + 174 = 459
- Delta: 459 - 459 = 0 ✅

### Delta = +10 ⚠️ (Under Accounted)
**Meaning**: System has 10 MORE units than originally recorded

**Example**:
- Recorded: 459 units
- Calculated: 469 units
- Delta: 469 - 459 = +10
- **Issue**: Where did the extra 10 units come from?

### Delta = -10 ⚠️ (Over Accounted)
**Meaning**: System has 10 FEWER units than originally recorded

**Example**:
- Recorded: 459 units
- Calculated: 449 units
- Delta: 449 - 459 = -10
- **Issue**: Where did 10 units go?

---

## 🧪 Quick Test Checklist

When testing reconciliation:

- [ ] Fresh product (no sales) shows `total_on_hand === sellable_now`
- [ ] After sales, `total_on_hand` stays the same
- [ ] After sales, `sellable_now` decreases
- [ ] Delta = 0 for balanced inventory with sales
- [ ] Formula display does NOT include sold units
- [ ] Sold units appear in "Additional Information"
- [ ] Tooltips explain "transferred" vs "sellable"
- [ ] Mismatch warnings show correct direction

---

## 🔍 Troubleshooting

### "Why does storefront show 174 units but only 169 are sellable?"
**Answer**: 174 is the total transferred (historical fact), 169 is what's currently available after 5 units were sold.

### "Why doesn't the formula subtract sold units?"
**Answer**: Reconciliation verifies the original batch accounting. Sold units came FROM the transferred inventory, so they're already accounted for in the transfer amount.

### "I see a delta but inventory looks correct"
**Check**:
1. When did the delta appear? Before or after sales?
2. If after sales and delta equals sold units: Update to latest frontend code
3. If appeared before sales: Real inventory discrepancy - investigate

### "What's the difference between over/under accounted?"
**Remember**:
- **Under accounted** (positive delta): You have MORE than you recorded
- **Over accounted** (negative delta): You have LESS than you recorded

---

## 📞 Need Help?

1. Check the full implementation guide: `RECONCILIATION-FORMULA-FIX-IMPLEMENTATION.md`
2. Review the original requirements: `FRONTEND-RECONCILIATION-IMPLEMENTATION-GUIDE.md`
3. Contact the development team

---

## 🎯 One-Minute Summary

**The reconciliation formula tracks WHERE inventory is located, not how much was sold.**

- **Transferred amount** (174) = historical fact, doesn't change
- **Sellable amount** (169) = current availability, changes with sales
- **Reconciliation** checks: warehouse + transferred = recorded batch
- **Sold units** are tracked separately for reference only

**Remember**: A balanced inventory (delta = 0) can have sales. The formula cares about location, not sales activity.
