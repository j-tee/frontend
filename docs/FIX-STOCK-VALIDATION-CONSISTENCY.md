# Fix: Stock Validation Consistency in Multi-Storefront Mode

## Problem

There was a mismatch between the stock quantity displayed on the badge and the frontend validation check:

**Visual Display:**
- Badge showed: "1 here (273 total)" ✅ Correct

**Frontend Validation:**
- Allowed adding 4 items (based on total 273) ❌ Incorrect
- Should only allow 1 item (storefront-specific)

**Backend Validation:**
- Error: "Available: 2.00, Requested: 4.00" ✅ Correct
- Backend correctly checked storefront-specific stock

**Result:** User saw "1 here" on badge, tried to add 4, frontend didn't stop them, but backend returned error showing "2.00 available" (which was also wrong in this case, but revealed the frontend validation issue).

## Root Cause

In the `handleAddToCart` function, when creating a fallback `StockRecord` for products not yet in the `stockData` map, the code was using `product.available_quantity` for both the `quantity` and `available_quantity` fields:

```typescript
const fallbackStock: StockRecord = {
  id: product.stock_product_ids[0],
  product: product.id,
  quantity: product.available_quantity,      // ❌ Total (273)
  available_quantity: product.available_quantity, // ❌ Total (273) - WRONG!
  // ... other fields
}
```

In **multi-storefront mode**, `product.available_quantity` contains the **total** across all storefronts (273), not the storefront-specific quantity (1).

The validation check on line 608 used this incorrect value:
```typescript
if (stock.available_quantity < quantity) {
  setError(`Only ${stock.available_quantity} available`) // Would show "Only 273 available"
  return
}
```

This meant:
- User sees badge: "1 here (273 total)" 
- User enters quantity: 4
- Frontend validation: Passes ✅ (because 4 < 273)
- Backend validation: Fails ❌ (because 4 > 1)
- Error shown: "Available: 2.00" (backend's view, which might also be slightly off)

## Solution

Updated the fallback stock creation to use the **storefront-specific** quantity from the `locations` array:

```typescript
let stock = stockData[productId]
if (!stock) {
  const product = catalog.find((item) => item.id === productId)
  if (product && product.stock_product_ids.length > 0) {
    // In multi-storefront mode, get storefront-specific quantity from locations
    let storefrontAvailableQty = product.available_quantity
    if (product.locations && product.locations.length > 0 && storefrontId) {
      const currentLocationStock = product.locations.find(loc => loc.storefront_id === storefrontId)
      if (currentLocationStock) {
        storefrontAvailableQty = currentLocationStock.available_quantity
      }
    }
    
    const fallbackStock: StockRecord = {
      id: product.stock_product_ids[0],
      product: product.id,
      quantity: product.available_quantity,        // ✅ Total across all locations
      available_quantity: storefrontAvailableQty,  // ✅ Storefront-specific quantity
      reserved_quantity: 0,
      unit_cost: 0,
      retail_price: product.retail_price,
      wholesale_price: product.wholesale_price,
      batch_number: undefined,
      expiry_date: null,
    }
    stock = fallbackStock
    // ... rest of code
  }
}
```

### Key Changes

1. **Extract storefront-specific quantity**: Search `product.locations` array for current `storefrontId`
2. **Set correct available_quantity**: Use storefront-specific value, not total
3. **Maintain total in quantity field**: Keep `product.available_quantity` (total) in `quantity` field for reference

## Impact

### Before Fix
- ✗ Badge: "1 here (273 total)"
- ✗ User enters: 4
- ✗ Frontend validation: PASSES (4 < 273)
- ✗ Backend validation: FAILS (4 > 1)
- ✗ Confusing error message

### After Fix
- ✅ Badge: "1 here (273 total)"
- ✅ User enters: 4
- ✅ Frontend validation: FAILS (4 > 1)
- ✅ Error shown: "Only 1 available"
- ✅ User prevented from triggering backend error
- ✅ Consistent experience

## Related Code Paths

This fix ensures consistency across three code paths:

### 1. Display (getStockStatus)
```typescript
// Uses locations array to show "X here (Y total)"
const currentLocationStock = product.locations.find(loc => loc.storefront_id === storefrontId)
const storefrontAvailable = currentLocationStock?.available_quantity ?? 0
```

### 2. Frontend Validation (handleAddToCart)
```typescript
// NOW FIXED: Uses storefront-specific quantity
if (stock.available_quantity < quantity) {
  setError(`Only ${stock.available_quantity} available`)
  return
}
```

### 3. Backend Validation
```typescript
// Backend checks actual storefront stock
// Returns error if insufficient
```

All three now use the same storefront-specific quantity!

## Testing

### Test Scenario 1: Multi-Storefront with Limited Local Stock
1. Product has 1 at Cow Lane Store, 272 at other stores (273 total)
2. Badge shows: "Low: 1 here (273 total)"
3. Try to add 4 to cart
4. Frontend should show: "Only 1 available"
5. Request should not reach backend

### Test Scenario 2: Multi-Storefront with Adequate Local Stock
1. Product has 50 at Cow Lane Store, 223 at other stores (273 total)
2. Badge shows: "50 here (273 total)"
3. Try to add 30 to cart
4. Should succeed without error

### Test Scenario 3: Single Storefront Mode
1. Product has 25 at storefront, 25 in warehouse
2. Badge shows: "25 in stock"
3. Try to add 20 to cart
4. Should succeed without error
5. Try to add 30 to cart
6. Should show: "Only 25 available"

## Files Changed

**src/features/dashboard/components/sales/ProductSearchPanel.tsx**
- Updated `handleAddToCart` function
- Added storefront-specific quantity extraction for fallback stock
- Ensures `available_quantity` matches what's shown on badge

## Commits

```
commit 5b27f20
Fix stock display in multi-storefront mode to show both storefront and total quantities

commit 9773cdb (This fix)
Fix frontend stock validation to use storefront-specific quantity in multi-storefront mode
```

## Prevention

To prevent similar issues:

1. **Always use locations array** in multi-storefront mode for storefront-specific data
2. **Validate consistency** between display, frontend validation, and backend validation
3. **Test with realistic scenarios** where storefront quantity ≠ total quantity
4. **Document data sources** clearly:
   - `product.available_quantity` = Total across all storefronts
   - `product.locations[].available_quantity` = Storefront-specific
   - `stock.quantity` = Warehouse/business total
   - `stock.available_quantity` = Storefront available

## Related Documentation

- [Stock Display Enhancement](./STOCK-DISPLAY-ENHANCEMENT.md)
- [Backend Stock Product Quantity Tracking](./BACKEND-STOCK-PRODUCT-QUANTITY-TRACKING.md)
- [Multi-Storefront Catalog Implementation](./DEPLOYMENT-READY-MULTI-STOREFRONT.md)
