# 🏪 Wholesale & Retail Sales - Complete Guide

**Status**: ✅ **ALREADY FULLY IMPLEMENTED**  
**Date**: October 11, 2025  
**Feature**: Switch between Retail and Wholesale pricing for sales transactions

---

## 🎉 Good News: It's Already Working!

The wholesale/retail functionality is **already fully implemented** in your POS system! You can switch between retail and wholesale pricing with a single click.

---

## 🎯 How to Use Wholesale Sales

### Step 1: Start a New Sale
```
1. Go to Sales page (http://localhost:5173/app/sales)
2. You'll see "RETAIL" button in the top-left of the Point of Sale card
```

### Step 2: Switch to Wholesale Mode
```
1. Click the "RETAIL" button
2. It toggles to "WHOLESALE"
3. All product prices now show wholesale prices ✅
```

### Step 3: Add Products
```
1. Search for products (e.g., "sugar")
2. Price shown is now WHOLESALE price
3. Add to cart - uses wholesale pricing ✅
```

### Step 4: Complete Sale
```
1. Select customer (optional)
2. Click "Checkout"
3. Process payment
4. Sale is recorded as WHOLESALE type ✅
```

### Step 5: Switch Back to Retail
```
1. Click "WHOLESALE" button
2. Toggles back to "RETAIL"
3. Prices show retail pricing again ✅
```

---

## 📊 How It Works

### Frontend Implementation

**Location**: `src/features/dashboard/pages/SalesPage.tsx`

**State Management**:
```typescript
const [saleType, setSaleType] = useState<'RETAIL' | 'WHOLESALE'>('RETAIL')
```

**Toggle Button** (Line ~806):
```typescript
<Button
  variant="outline-secondary"
  size="sm"
  onClick={() => setSaleType(saleType === 'RETAIL' ? 'WHOLESALE' : 'RETAIL')}
  disabled={!!currentCart}  // Can't change after adding items
>
  {saleType}  // Shows "RETAIL" or "WHOLESALE"
</Button>
```

**Price Selection** (ProductSearchPanel.tsx, Line ~654):
```typescript
const getPrice = (product: Product) => {
  const stock = stockData[product.id]
  const priceSource = saleType === 'WHOLESALE'
    ? stock?.wholesale_price ?? product.wholesale_price  // Wholesale
    : stock?.retail_price ?? product.retail_price        // Retail

  return typeof priceSource === 'number' && Number.isFinite(priceSource) ? priceSource : 0
}
```

**Sale Creation** (Line ~437):
```typescript
await dispatch(createSale({
  location: currentLocation.id,
  customer: customerId,
  type: saleType,  // 'RETAIL' or 'WHOLESALE' sent to backend
}))
```

---

## 🔍 Visual Guide

### Retail Mode (Default)
```
┌─────────────────────────────────────────────┐
│ Point of Sale                    [RETAIL]   │  ← Click to toggle
├─────────────────────────────────────────────┤
│ Search: sugar                               │
│                                             │
│ 📦 Sugar 1kg                    GH₵ 3.12   │  ← Retail price
│     SKU: FOOD-0003 | Food        per unit  │
│     ✅ 917 in stock                         │
│     [1]  [+]              [+ Add]          │
└─────────────────────────────────────────────┘
```

### Wholesale Mode
```
┌─────────────────────────────────────────────┐
│ Point of Sale                  [WHOLESALE]  │  ← Toggled
├─────────────────────────────────────────────┤
│ Search: sugar                               │
│                                             │
│ 📦 Sugar 1kg                    GH₵ 2.50   │  ← Wholesale price
│     SKU: FOOD-0003 | Food        per unit  │
│     ✅ 917 in stock                         │
│     [1]  [+]              [+ Add]          │
└─────────────────────────────────────────────┘
```

---

## 📋 Product Pricing Example

### Sugar 1kg Product
```
Retail Price:     GH₵ 3.12 per unit
Wholesale Price:  GH₵ 2.50 per unit
Difference:       GH₵ 0.62 (20% discount)
```

### Coca Cola Product
```
Retail Price:     GH₵ 5.00 per unit
Wholesale Price:  GH₵ 4.00 per unit  
Difference:       GH₵ 1.00 (20% discount)
```

---

## 🎯 Business Rules

### When to Use Retail
```
✅ Walk-in customers
✅ Individual consumers
✅ Small quantity purchases
✅ Default mode
```

### When to Use Wholesale
```
✅ Registered wholesale customers
✅ Bulk purchases
✅ Business-to-business sales
✅ Resellers and distributors
```

### Important Constraints

**Cannot Change After Adding Items**:
```
1. Start sale in RETAIL mode
2. Add Sugar to cart
3. RETAIL button is now disabled ⚠️
4. Must clear cart to switch to WHOLESALE
```

**Why?** Prevents mixing retail and wholesale prices in same transaction.

---

## 🔧 Backend Integration

### Sale Type Field
```typescript
interface Sale {
  id: UUID
  type: 'RETAIL' | 'WHOLESALE'  // ✅ Sent to backend
  // ... other fields
}
```

### Create Sale Payload
```typescript
{
  location: "storefront-id",
  customer: "customer-id",
  type: "WHOLESALE"  // or "RETAIL"
}
```

### Backend Should Track
```
✅ Sale type (RETAIL vs WHOLESALE)
✅ Sale items with correct pricing
✅ Total revenue by sale type
✅ Analytics: Retail sales vs Wholesale sales
✅ Customer purchase history by type
```

---

## 📊 Backend Requirements

### Sales Table
```sql
-- Should have:
type VARCHAR(10) CHECK (type IN ('RETAIL', 'WHOLESALE'))
```

### Sale Items Table
```sql
-- Should track:
unit_price DECIMAL(10,2)  -- Price used (retail or wholesale)
```

### Reports/Analytics
```sql
-- Group by sale type:
SELECT 
  type,
  COUNT(*) as transaction_count,
  SUM(total_amount) as total_revenue
FROM sales
WHERE created_at >= '2025-10-01'
GROUP BY type;

-- Example output:
-- type      | transaction_count | total_revenue
-- RETAIL    | 150              | 45,000.00
-- WHOLESALE | 25               | 35,000.00
```

---

## 🧪 Testing Checklist

### Test 1: Switch to Wholesale
```
Steps:
1. Go to Sales page
2. Note the button shows "RETAIL"
3. Click the button
4. Verify it now shows "WHOLESALE" ✅
```

### Test 2: Wholesale Pricing
```
Steps:
1. Ensure in WHOLESALE mode
2. Search for "sugar"
3. Check price displayed
Expected: GH₵ 2.50 (wholesale price) ✅
Not: GH₵ 3.12 (retail price) ❌
```

### Test 3: Add to Cart (Wholesale)
```
Steps:
1. In WHOLESALE mode
2. Add Sugar 1kg (qty: 10)
3. Check cart total
Expected: 10 × GH₵ 2.50 = GH₵ 25.00 ✅
```

### Test 4: Cannot Change After Adding
```
Steps:
1. In RETAIL mode
2. Add any product to cart
3. Try to click RETAIL button
Expected: Button is disabled ✅
```

### Test 5: Complete Wholesale Sale
```
Steps:
1. In WHOLESALE mode
2. Add products
3. Click Checkout
4. Process payment
5. Check backend: sale.type should be "WHOLESALE" ✅
```

### Test 6: Switch Back to Retail
```
Steps:
1. After completing wholesale sale
2. Cart is empty
3. Click WHOLESALE button
4. Verify it toggles to RETAIL ✅
```

---

## 📈 Analytics & Reporting

### Metrics to Track

**Daily Sales by Type**:
```
Date       | Retail Txns | Retail Revenue | Wholesale Txns | Wholesale Revenue
2025-10-11 | 45          | GH₵ 12,500    | 8              | GH₵ 18,000
```

**Customer Type Breakdown**:
```
Customer Type | Preferred Sale Type | Avg Transaction Value
Walk-in       | RETAIL             | GH₵ 250
Business      | WHOLESALE          | GH₵ 2,100
```

**Product Performance by Sale Type**:
```
Product    | Retail Units | Wholesale Units | Total Revenue
Sugar 1kg  | 150         | 500            | GH₵ 1,718
Coca Cola  | 300         | 200            | GH₵ 2,300
```

---

## 🎨 UI/UX Details

### Toggle Button States
```
State: RETAIL (Default)
Color: Outline Secondary (Gray)
Text: "RETAIL"
Click: Switches to WHOLESALE

State: WHOLESALE (Active)
Color: Outline Secondary (Gray)
Text: "WHOLESALE"
Click: Switches to RETAIL

State: Disabled (Cart has items)
Color: Muted (Grayed out)
Text: Current type
Click: No action (disabled)
```

### Price Display
```
Retail Mode:
  Sugar 1kg    GH₵ 3.12 per unit

Wholesale Mode:
  Sugar 1kg    GH₵ 2.50 per unit

Visual Cue: Price updates immediately when toggling
```

---

## 🚀 Future Enhancements (Optional)

### 1. Customer-Based Auto-Selection
```typescript
// Automatically set sale type based on customer type
useEffect(() => {
  if (selectedCustomer) {
    const customer = customerOptions.find(c => c.value === selectedCustomer)
    if (customer?.type === 'WHOLESALE') {
      setSaleType('WHOLESALE')  // Auto-switch for wholesale customers
    }
  }
}, [selectedCustomer])
```

### 2. Minimum Quantity for Wholesale
```typescript
// Require minimum quantity for wholesale pricing
const MIN_WHOLESALE_QTY = 10

if (saleType === 'WHOLESALE' && totalQuantity < MIN_WHOLESALE_QTY) {
  showError('Wholesale sales require minimum 10 units')
}
```

### 3. Visual Price Comparison
```typescript
// Show both prices with discount
<div>
  <span className="text-muted text-decoration-line-through">
    Retail: GH₵ 3.12
  </span>
  <span className="text-success fw-bold ms-2">
    Wholesale: GH₵ 2.50 (20% off)
  </span>
</div>
```

### 4. Wholesale Approval Workflow
```typescript
// Require manager approval for wholesale sales
if (saleType === 'WHOLESALE' && userRole !== 'MANAGER') {
  await requestManagerApproval()
}
```

---

## 🐛 Troubleshooting

### Issue: Toggle Button Not Visible
**Check**: Make sure you're on the Sales page (`/app/sales`)  
**Location**: Top-left corner of "Point of Sale" card

### Issue: Price Not Changing
**Check**: 
1. Ensure button shows "WHOLESALE" (not "RETAIL")
2. Check product has wholesale_price set in backend
3. Clear cart and try again

### Issue: Can't Toggle After Adding Items
**This is correct behavior!**  
**Solution**: Click "Clear Cart" button, then toggle

### Issue: Backend Not Receiving Sale Type
**Check**:
1. Inspect network request (DevTools → Network)
2. Look for POST to `/sales/` endpoint
3. Request body should include: `"type": "WHOLESALE"`

---

## 📚 Related Documentation

- **Product Pricing**: Check product setup to ensure both retail and wholesale prices are configured
- **Customer Types**: Customers can be marked as RETAIL or WHOLESALE type
- **Sales Reports**: Filter sales by type for analytics

---

## ✅ Summary

### What's Already Working ✅

1. **Toggle Button**: Switch between RETAIL/WHOLESALE modes
2. **Price Selection**: Automatically uses correct price based on mode
3. **Cart Prevention**: Can't change mode after adding items
4. **Backend Integration**: Sale type sent to backend
5. **Product Search**: Prices update immediately when toggling

### What Backend Should Support ✅

1. **Save Sale Type**: Store `type: 'RETAIL' | 'WHOLESALE'` in sales table
2. **Track Pricing**: Record which price was used (retail or wholesale)
3. **Analytics**: Report on retail vs wholesale sales
4. **Customer History**: Track customer's preferred sale type

### How to Test Right Now ⚡

```
1. Open: http://localhost:5173/app/sales
2. Look for: "RETAIL" button (top-left)
3. Click it: Toggles to "WHOLESALE"
4. Search: "sugar"
5. Check price: Should show wholesale price (GH₵ 2.50)
6. Add to cart: Uses wholesale pricing ✅
```

---

**Status**: ✅ **FULLY FUNCTIONAL**  
**Location**: Sales Page → Point of Sale card → Toggle button  
**Documentation**: Complete  
**Backend**: Should track sale type and provide analytics

**The feature you need is already built and working!** Just click the RETAIL/WHOLESALE toggle button. 🎉

