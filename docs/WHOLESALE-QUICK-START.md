# ⚡ Quick Guide: Wholesale Sales

**Feature**: Already implemented and working! ✅

---

## 🎯 How to Use (3 Steps)

### Step 1: Find the Toggle Button
```
Location: Sales page → "Point of Sale" card → Top-left corner

┌─────────────────────────────────────────────┐
│ Point of Sale                    [RETAIL] ← │  Click here!
├─────────────────────────────────────────────┤
│ 🔍 Search products...                       │
│                                             │
```

### Step 2: Click to Switch to Wholesale
```
Before click: [RETAIL]
After click:  [WHOLESALE] ✅

Now all prices show wholesale pricing!
```

### Step 3: Search and Add Products
```
Search: sugar

Product shown:
  Sugar 1kg - GH₵ 2.50 per unit  ← Wholesale price!
  (Retail price was GH₵ 3.12)
```

---

## 📊 Price Comparison

### Retail Mode (Default)
```
Sugar 1kg:    GH₵ 3.12 per unit
Coca Cola:    GH₵ 5.00 per unit
```

### Wholesale Mode
```
Sugar 1kg:    GH₵ 2.50 per unit  (20% off)
Coca Cola:    GH₵ 4.00 per unit  (20% off)
```

---

## ⚠️ Important Notes

**Cannot change after adding items to cart!**
```
1. Add product to cart in RETAIL mode
2. Toggle button becomes disabled
3. Must click "Clear Cart" to switch modes
```

**Why?** Prevents mixing retail and wholesale prices in same sale.

---

## 🧪 Test It Now

1. **Go to**: `http://localhost:5173/app/sales`
2. **Look for**: Gray button showing "RETAIL"
3. **Click it**: Changes to "WHOLESALE"
4. **Search**: "sugar"
5. **Check price**: Should be GH₵ 2.50 (wholesale)
6. **Add to cart**: Uses wholesale pricing ✅

---

## 🎉 That's It!

The wholesale functionality is **already fully working** in your POS system.

**Frontend**: ✅ Toggle button, price switching, sale type tracking  
**Backend**: Should save sale type and provide analytics

Just click the RETAIL/WHOLESALE button and you're good to go! 🚀

