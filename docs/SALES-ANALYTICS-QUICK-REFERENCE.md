# 📋 Sales Analytics - Quick Reference Card

**Print this and keep it handy!**

---

## 🎯 Quick Actions

| I want to... | How to do it |
|--------------|--------------|
| **See today's profit** | Date Range → "Today", check "Total Profit" in summary |
| **Filter cash sales** | Payment Method → "💵 Cash" |
| **View product margins** | Click any sale row to expand |
| **Check tax collected** | Look at "Total Tax" in summary |
| **Find low-margin items** | Expand sales, look for 🟡 yellow badges |
| **See card payments** | Payment Method → "💳 Card" |
| **Export data** | Click "Export" button (top right) |
| **Clear all filters** | Click "Clear All Filters" button |

---

## 📊 Summary Dashboard Metrics

| Metric | What it shows | Where to find it |
|--------|---------------|------------------|
| **Total Sales Volume** | Revenue from all sales | Top left box (blue) |
| **Total Profit** | What you actually made | Top middle box (green) |
| **Total Tax** | Taxes collected | Top right box (blue) |
| **Total Discounts** | Money discounted | Bottom left box (yellow) |
| **Cash Sales** | Total cash payments | Payment method row |
| **Card Sales** | Total card payments | Payment method row |
| **Mobile Sales** | Total mobile money | Payment method row |
| **Credit Sales** | Total credit (owed) | Payment method row |

---

## 🎨 Color Code Cheat Sheet

### Margin Badges
| Color | Meaning | Action |
|-------|---------|--------|
| 🟢 **Green** ≥30% | Excellent profit! | Keep pricing |
| 🔵 **Blue** 15-29% | Good profit | Acceptable |
| 🟡 **Yellow** <15% | Low profit | Review pricing |
| 🔴 **Red** Negative | Losing money | Urgent review! |

### Amounts
| Color | Meaning |
|-------|---------|
| **Gray** | Cost (supporting data) |
| **Blue** | Tax (informational) |
| **Green** | Positive profit, Discounts |
| **Red** | Negative profit (alert) |

---

## 📋 Expanded Product Table Columns

| Column | Shows | Example |
|--------|-------|---------|
| Product | Name | MS Office |
| SKU | Code | SOFT-DL-0002 |
| Category | Badge | [Software] |
| Qty | Quantity | 13.00 |
| Unit Price | Price/unit | $243.56 |
| **Cost** 🆕 | Your cost | $150 × 13 |
| **Tax** 🆕 | Tax + rate | $42 (12.5%) |
| Discount | Discount + % | -$10 (5%) |
| **Subtotal** 🆕 | Final price | $3,166.28 |
| **Profit** 🆕 | Revenue - cost | $1,216.28 |
| **Margin %** 🆕 | Profit % | [38.4%] |

---

## 🔢 Quick Calculations

### Profit Formula
```
Profit = (Unit Price × Qty) - (Cost × Qty) - Discount
```

### Margin Formula
```
Margin % = (Profit ÷ Revenue) × 100
```

### Example
```
Product: Laptop Charger
Unit Price: $45.00
Cost: $22.50
Qty: 5
Discount: $0

Profit = ($45 × 5) - ($22.50 × 5) - $0 = $112.50
Margin = ($112.50 ÷ $225) × 100 = 50%
```

---

## 🎯 Target Metrics

| Metric | Target | Status |
|--------|--------|--------|
| **Profit Margin** | >30% | ✅ Excellent |
| | 15-30% | ✅ Good |
| | <15% | ⚠️ Review |
| **Discount Rate** | <10% of revenue | ✅ Healthy |
| | 10-15% | ⚠️ Watch |
| | >15% | 🚨 Too high |
| **Cost/Revenue** | <70% | ✅ Good margins |
| | 70-85% | ⚠️ Tight |
| | >85% | 🚨 Very tight |

---

## ⚡ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Search | Click search box |
| Export | Ctrl/Cmd + Click Export |
| Print | Ctrl/Cmd + P |
| Refresh | F5 or Ctrl/Cmd + R |

---

## 🔍 Filters Available

| Filter | Options |
|--------|---------|
| **Search** | Receipt #, customer, amount |
| **Status** | Completed, Pending, Draft, Cancelled |
| **Storefront** | All Storefronts, [Your stores] |
| **Payment** 🆕 | All, Cash, Card, Mobile, Credit |
| **Date** | Today, Yesterday, This Week, Custom |

---

## 📱 Mobile Tips

- **Swipe** table left/right to see all columns
- **Tap** sale row to expand
- **Tap again** to collapse
- Summary boxes **stack** vertically
- All features **work** on mobile!

---

## ⚠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| Profit shows "N/A" | Add cost price in Inventory |
| Summary seems wrong | Check pagination (per-page totals) |
| Columns missing | Scroll table right |
| Can't see new features | Refresh browser (F5) |

---

## 💡 Pro Tips

### Daily Routine
1. ✅ Filter to "Today" + "Completed"
2. ✅ Check Total Profit in summary
3. ✅ Review margin badges (look for yellow)
4. ✅ Check discount percentage (<10% ideal)

### Weekly Review
1. ✅ Filter to "This Week"
2. ✅ Compare payment methods
3. ✅ Identify low-margin products
4. ✅ Export for detailed analysis

### Monthly Analysis
1. ✅ Filter to "This Month"
2. ✅ Calculate overall profit margin
3. ✅ Review discount impact
4. ✅ Export for accounting

---

## 🚨 Red Flags to Watch

| Warning Sign | What to do |
|--------------|------------|
| 🚨 Margin <5% | Increase price or stop selling |
| ⚠️ Discounts >20% sale | Review discount policy |
| ⚠️ Many "N/A" costs | Update inventory costs |
| 🚨 Negative profit | URGENT: Review that sale! |
| ⚠️ Credit >30% total | Collection risk - monitor |

---

## 📞 Need Help?

1. Check **User Guide** (SALES-ANALYTICS-USER-GUIDE.md)
2. Check **Technical Docs** (SALES-ANALYTICS-ENHANCEMENT-COMPLETE.md)
3. Ask your **manager**
4. Contact **IT support**

---

## ✅ Daily Checklist

- [ ] Check today's total profit
- [ ] Review any yellow margin badges
- [ ] Verify all products have cost prices
- [ ] Monitor discount percentage
- [ ] Check payment method balance
- [ ] Review any negative profits

---

**Version:** 1.0  
**Last Updated:** October 7, 2025  
**Keep this handy for quick reference! 📌**
