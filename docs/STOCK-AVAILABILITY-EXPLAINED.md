# Stock Availability - Dynamic Calculation Explained

## 🎯 The Problem

**Question:** Why can't we just use the `quantity` field from the StockProduct table?

**Answer:** Because `quantity` is a **snapshot at intake time**, not the **current available stock**.

---

## 📊 Understanding Stock Quantities

### Static vs. Dynamic Quantities

| Field | Type | Definition | Use Case |
|-------|------|------------|----------|
| `quantity` | **Static** | Stock quantity at intake/stocking time | Historical record, audit trail |
| `available_quantity` | **Dynamic** | Real-time calculated availability | Sales, reservations, add-to-cart |

### Why Dynamic Calculation is Critical

Over time, the `quantity` field becomes **outdated** due to:

1. **Sales** - Items sold reduce available stock
2. **Reservations** - Items in other users' carts (30-min expiry)
3. **Spoilage** - Expired or damaged goods
4. **Damage** - Physical damage during handling
5. **Theft** - Stock loss incidents
6. **Transfers** - Stock moved between locations
7. **Returns/Refunds** - Items returned to inventory
8. **Adjustments** - Manual stock corrections

---

## 🔍 Example: Why Static Quantity Fails

### Scenario: Coffee Beans Stock

**Initial State (Jan 1):**
```
StockProduct {
  product: "Premium Coffee Beans",
  quantity: 100,          // At intake
  available_quantity: 100 // Calculated
}
```

**After One Week (Jan 8):**

| Transaction | Impact | Quantity (Static) | Available (Dynamic) |
|-------------|--------|-------------------|---------------------|
| Initial | - | 100 | 100 |
| Sale of 20 | -20 sold | 100 ❌ | 80 ✅ |
| Cart reservation (5) | -5 reserved | 100 ❌ | 75 ✅ |
| Spoilage (3) | -3 damaged | 100 ❌ | 72 ✅ |
| Transfer out (10) | -10 moved | 100 ❌ | 62 ✅ |

**Result:**
- `quantity` = 100 (WRONG! Shows original intake)
- `available_quantity` = 62 (CORRECT! Shows what can be sold)

**What happens if we use `quantity`?**
- ❌ Overselling - Customer tries to buy 80, but only 62 available
- ❌ Data inconsistency - Stock shows 100 but only 62 exists
- ❌ Cart conflicts - Multiple users reserve more than available
- ❌ Inventory mismatch - Physical count doesn't match system

---

## ✅ The Solution: Availability Endpoint

### Backend Endpoint
```
GET /api/storefronts/{storefront_id}/stock-products/{product_id}/availability/
```

### What It Returns

```json
{
  "product": "uuid",
  "product_name": "Premium Coffee Beans 500g",
  "total_available": 145,        // Sum of all batches
  "reserved_quantity": 5,         // In active carts (expires in 30min)
  "unreserved_quantity": 140,     // ⭐ Available for NEW sales
  "batches": [
    {
      "id": "uuid",
      "batch_number": "BTH-001",
      "quantity": 100,              // This batch's current stock
      "unit_cost": 20.00,
      "retail_price": 25.50,
      "wholesale_price": 22.00,
      "expiry_date": "2025-12-31"
    },
    {
      "id": "uuid",
      "batch_number": "BTH-002",
      "quantity": 45,
      "unit_cost": 18.00,
      "retail_price": 25.50,
      "wholesale_price": 22.00,
      "expiry_date": "2025-06-30"
    }
  ],
  "reservations": [
    {
      "cart_session_id": "user-123-cart",
      "quantity": 5,
      "expires_at": "2025-01-10T15:00:00Z"
    }
  ]
}
```

### Calculation Formula

```
total_available = SUM(all batches.quantity)
                - SUM(completed_sales.quantity)
                - SUM(spoilage.quantity)
                - SUM(damage.quantity)
                - SUM(theft.quantity)
                - SUM(transfers_out.quantity)
                + SUM(transfers_in.quantity)
                + SUM(refunded_items.quantity)

reserved_quantity = SUM(active_reservations.quantity)
                   WHERE expires_at > NOW()

unreserved_quantity = total_available - reserved_quantity
```

**unreserved_quantity** is what the frontend should display as **"available"**!

---

## 🔧 Frontend Implementation

### Old Code (WRONG ❌)
```typescript
// Fetching raw stock - Uses static quantity
const response = await httpClient.get('/inventory/api/stock-products/', {
  params: {
    storefront: storefrontId,
    product__in: productIds.join(','),
  },
})

const stockList = response.data.results
stockList.forEach((stock: StockProduct) => {
  stockMap[stock.product] = stock  // ❌ Uses static quantity
})
```

**Problems:**
- Uses `quantity` field (static, outdated)
- Doesn't account for reservations
- Causes overselling
- Data inconsistencies

### New Code (CORRECT ✅)
```typescript
// Fetch CALCULATED availability for each product
const stockPromises = productIds.map(async (productId) => {
  const response = await httpClient.get(
    `/inventory/api/storefronts/${storefrontId}/stock-products/${productId}/availability/`
  )
  return { productId, data: response.data }
})

const results = await Promise.all(stockPromises)
const stockMap: Record<UUID, StockProduct> = {}

results.forEach((result) => {
  if (result && result.data) {
    const { productId, data } = result
    const firstBatch = data.batches?.[0]
    
    stockMap[productId] = {
      id: firstBatch?.id || productId,
      product: productId,
      quantity: data.total_available || 0,           // Total stock
      available_quantity: data.unreserved_quantity || 0, // ⭐ CRITICAL: Available for sales
      reserved_quantity: data.reserved_quantity || 0,
      retail_price: firstBatch?.retail_price || 0,
      wholesale_price: firstBatch?.wholesale_price || 0,
    }
  }
})
```

**Benefits:**
- ✅ Uses `unreserved_quantity` (dynamic, real-time)
- ✅ Accounts for all transactions
- ✅ Prevents overselling
- ✅ Accurate stock levels
- ✅ Reservation-aware

---

## 🎨 UI Display

### Stock Status Indicators

```typescript
const getStockStatus = (productId: UUID) => {
  const stock = stockData[productId]
  if (!stock) return { color: 'secondary', text: 'Unknown', available: 0 }

  const available = stock.available_quantity  // ⭐ Using unreserved quantity

  if (available === 0) {
    return { color: 'danger', text: 'Out of stock', available: 0 }
  } else if (available <= 5) {
    return { color: 'warning', text: `Only ${available} left`, available }
  } else {
    return { color: 'success', text: `${available} in stock`, available }
  }
}
```

**What Users See:**
- 🟢 Green badge: "140 in stock" (plenty available)
- 🟡 Yellow badge: "3 left" (low stock warning)
- 🔴 Red badge: "Out of stock" (can't add to cart)
- ⚪ Gray badge: "undefined in stock" (no data - **this was the bug!**)

---

## 🐛 The Bug We Fixed

### Before (Showing "undefined in stock")
```typescript
const getStockStatus = (productId: UUID) => {
  const stock = stockData[productId]
  if (!stock) return { /* ... */ }

  // ❌ Problem: stock.available_quantity doesn't exist
  // because we were using /stock-products/ endpoint
  // which returns { quantity: 100 } not { available_quantity: 62 }
  const available = stock.available_quantity  // undefined!
  
  return { text: `${available} in stock` }  // "undefined in stock" 🐛
}
```

### After (Showing "62 in stock")
```typescript
// ✅ Now fetching from /availability/ endpoint
// which returns { unreserved_quantity: 62 }
stockMap[productId] = {
  available_quantity: data.unreserved_quantity || 0,  // 62 ✅
}

const getStockStatus = (productId: UUID) => {
  const stock = stockData[productId]
  const available = stock.available_quantity  // 62 ✅
  return { text: `${available} in stock` }  // "62 in stock" ✅
}
```

---

## 📝 Backend Requirements

### The Availability Endpoint MUST Calculate:

```python
def get_stock_availability(storefront_id, product_id):
    """
    Calculate real-time stock availability
    
    Returns:
    - total_available: Physical stock across all batches
    - reserved_quantity: Stock in active carts
    - unreserved_quantity: Available for new sales
    """
    # Get all stock batches for this product at this storefront
    batches = StockProduct.objects.filter(
        storefront_id=storefront_id,
        product_id=product_id
    )
    
    # Calculate total from all batches
    total_available = sum(batch.quantity for batch in batches)
    
    # Subtract completed sales
    total_available -= SaleItem.objects.filter(
        sale__storefront_id=storefront_id,
        sale__status='COMPLETED',
        product_id=product_id
    ).aggregate(Sum('quantity'))['quantity__sum'] or 0
    
    # Subtract spoilage/damage/theft
    total_available -= StockAdjustment.objects.filter(
        storefront_id=storefront_id,
        product_id=product_id,
        adjustment_type__in=['SPOILAGE', 'DAMAGE', 'THEFT']
    ).aggregate(Sum('quantity'))['quantity__sum'] or 0
    
    # Account for transfers
    transfers_out = Transfer.objects.filter(
        from_storefront_id=storefront_id,
        product_id=product_id,
        status='COMPLETED'
    ).aggregate(Sum('quantity'))['quantity__sum'] or 0
    
    transfers_in = Transfer.objects.filter(
        to_storefront_id=storefront_id,
        product_id=product_id,
        status='COMPLETED'
    ).aggregate(Sum('quantity'))['quantity__sum'] or 0
    
    total_available = total_available - transfers_out + transfers_in
    
    # Get active reservations (not expired)
    reserved_quantity = StockReservation.objects.filter(
        storefront_id=storefront_id,
        product_id=product_id,
        status='ACTIVE',
        expires_at__gt=timezone.now()
    ).aggregate(Sum('quantity'))['quantity__sum'] or 0
    
    unreserved_quantity = max(0, total_available - reserved_quantity)
    
    return {
        'total_available': total_available,
        'reserved_quantity': reserved_quantity,
        'unreserved_quantity': unreserved_quantity,
        'batches': batches,
    }
```

---

## 🧪 Testing the Fix

### Test Scenario 1: Basic Availability

**Setup:**
```sql
-- Initial stock
INSERT INTO stock_products (product_id, storefront_id, quantity)
VALUES ('product-123', 'store-1', 100);

-- No sales, no reservations
```

**Expected:**
```json
{
  "total_available": 100,
  "reserved_quantity": 0,
  "unreserved_quantity": 100
}
```

**Frontend Display:** "100 in stock" ✅

---

### Test Scenario 2: With Reservations

**Setup:**
```sql
-- Initial stock: 100
-- Sale completed: 20
-- Active reservation: 5
```

**Expected:**
```json
{
  "total_available": 80,    // 100 - 20 (sold)
  "reserved_quantity": 5,    // In someone's cart
  "unreserved_quantity": 75  // 80 - 5 (reserved)
}
```

**Frontend Display:** "75 in stock" ✅

---

### Test Scenario 3: Out of Stock

**Setup:**
```sql
-- Initial stock: 10
-- Sales: 8
-- Reservations: 2
```

**Expected:**
```json
{
  "total_available": 2,      // 10 - 8 (sold)
  "reserved_quantity": 2,    // All stock reserved
  "unreserved_quantity": 0   // Nothing available!
}
```

**Frontend Display:** "Out of stock" (Red badge, can't add to cart) ✅

---

## 🎯 Key Takeaways

### For Frontend Developers:
1. ✅ **Always use** `/availability/` endpoint, not `/stock-products/`
2. ✅ **Display** `unreserved_quantity` as available stock
3. ✅ **Check** `unreserved_quantity` before allowing add-to-cart
4. ✅ **Refresh** availability after cart operations

### For Backend Developers:
1. ✅ **Never expose** raw `quantity` field for availability checks
2. ✅ **Calculate dynamically** accounting for all transactions
3. ✅ **Include** reservation logic with 30-min expiry
4. ✅ **Optimize** with database indexes on relevant fields
5. ✅ **Cache** availability results (30-second TTL)

### For QA/Testers:
1. ✅ **Test** with multiple users adding same product
2. ✅ **Verify** reservations expire after 30 minutes
3. ✅ **Check** stock updates after sales completion
4. ✅ **Ensure** overselling prevention works
5. ✅ **Validate** stock shows "undefined" never appears

---

## 📚 Related Documentation

- `sales-feature-specification.md` - Lines 509-540 (Availability endpoint spec)
- `BACKEND-README-SALES.md` - Phase 1 stock reservation requirements
- `ISSUE-RESOLVED.md` - Fix for product search 500 error
- `TROUBLESHOOTING-PRODUCT-SEARCH.md` - Common backend issues

---

## 🚀 Summary

**The Problem:** Using static `quantity` field causes data inconsistencies

**The Solution:** Use dynamic `/availability/` endpoint with `unreserved_quantity`

**The Result:** Accurate stock levels, no overselling, reliable POS system

**Commit:** See latest commit for complete implementation

---

**Last Updated:** October 4, 2025  
**Issue:** "undefined in stock" display bug  
**Status:** ✅ **RESOLVED** - Now using availability endpoint  
**Impact:** Critical - Prevents overselling and ensures data accuracy
