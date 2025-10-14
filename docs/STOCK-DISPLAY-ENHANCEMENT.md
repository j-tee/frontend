# Stock Display Enhancement - Storefront vs Warehouse

## Problem

The product search panel was showing only one stock quantity (276), which represented the warehouse total, but not the storefront-specific available quantity. This caused confusion when:

1. User sees "276 in stock" badge on product
2. User tries to add 5 to cart
3. System shows error: "Insufficient storefront inventory for 'HP Laptop 15'". Available: 2.00, Requested: 5.00"

The mismatch between displayed stock (276) and actual available stock at the storefront (2) was misleading.

## Root Cause

The `getStockStatus` function in `ProductSearchPanel.tsx` was displaying only one quantity:
- Either `stock.available_quantity` (from API fetch)
- Or `product.available_quantity` (from catalog)

However, the fetched stock data contained TWO different quantities:
- `stock.quantity` - Total warehouse/business quantity (276)
- `stock.available_quantity` - Storefront-specific available quantity (2)

The badge was showing whichever was set, without distinguishing between warehouse total and storefront availability.

## Solution

Updated the `getStockStatus` function to display **both** quantities when they differ:

### Display Logic

1. **If warehouse total ≠ storefront available**: Show both
   - High stock: `"2 here (276 total)"`
   - Low stock (≤5): `"Low: 2 here (276 total)"`

2. **If warehouse total = storefront available OR no warehouse data**: Show single value
   - High stock: `"276 in stock"`
   - Low stock (≤5): `"Low: 5"`

3. **If out of stock**: Show `"Out of Stock"`

### Badge Colors

- 🟢 **Green (success)**: Available quantity > 5
- 🟡 **Yellow (warning)**: Available quantity ≤ 5 but > 0
- 🔴 **Red (danger)**: Available quantity = 0

### Code Changes

```typescript
const getStockStatus = (product: Product) => {
  const stock = stockData[product.id]
  const availableSource = stock?.available_quantity ?? product.available_quantity ?? 0
  const available = Number.isFinite(availableSource) ? Math.max(0, Math.floor(availableSource)) : 0

  // Get warehouse total if available (from fetched stock data)
  const warehouseTotal = stock?.quantity ?? null
  const warehouseTotalNum = warehouseTotal !== null && Number.isFinite(warehouseTotal) 
    ? Math.max(0, Math.floor(warehouseTotal)) 
    : null

  if (available === 0) {
    return { color: 'danger', text: 'Out of Stock', available: 0 }
  }

  // Show both storefront and warehouse quantities if they differ
  let text = ''
  if (warehouseTotalNum !== null && warehouseTotalNum !== available) {
    // Different values - show both
    if (available <= 5) {
      text = `Low: ${available} here (${warehouseTotalNum} total)`
    } else {
      text = `${available} here (${warehouseTotalNum} total)`
    }
  } else {
    // Same value or no warehouse data - show single value
    if (available <= 5) {
      text = `Low: ${available}`
    } else {
      text = `${available} in stock`
    }
  }

  const color = available <= 5 ? 'warning' : 'success'
  return { color, text, available }
}
```

## Impact

### Before
- ✗ Badge showed: `"276 in stock"` (misleading - warehouse total)
- ✗ User tries to add 5
- ✗ System blocks with error about only 2 available
- ✗ Confusion and poor UX

### After
- ✅ Badge shows: `"2 here (276 total)"` (clear and informative)
- ✅ User knows only 2 available at this storefront
- ✅ User understands 276 total exist across all locations
- ✅ Can make informed decision to add 2 or request transfer

## User Benefits

1. **Clarity**: Users immediately see how much they can sell from current storefront
2. **Context**: Users know total inventory exists elsewhere (can request transfer)
3. **Accuracy**: Displayed quantity matches what can actually be added to cart
4. **Decision Making**: Users can choose to:
   - Add only what's available (2)
   - Request stock transfer from warehouse
   - Guide customer to different storefront with more stock

## Examples

### Example 1: Low Storefront Stock, High Warehouse Stock
```
Product: HP Laptop 15"
Storefront: 2 units
Warehouse Total: 276 units
Badge: 🟡 "Low: 2 here (276 total)"
```

### Example 2: Good Storefront Stock
```
Product: Mouse
Storefront: 25 units
Warehouse Total: 25 units
Badge: 🟢 "25 in stock"
```

### Example 3: Low Storefront Stock, No Warehouse Data
```
Product: Keyboard
Storefront: 3 units
Warehouse Total: unknown
Badge: 🟡 "Low: 3"
```

### Example 4: Out of Stock
```
Product: Monitor
Storefront: 0 units
Warehouse Total: 150 units
Badge: 🔴 "Out of Stock"
```

## Related Features

### Stock Transfer Request
When users see "2 here (276 total)", they know they can:
1. Request a transfer from warehouse to storefront
2. Navigate to Inventory → Stock Transfers
3. Create transfer request for needed quantity

### Multi-Storefront Mode
In multi-storefront mode:
- `total_available` shows sum across all accessible storefronts
- `locations` array shows per-storefront breakdown
- Users can see which storefront has stock

### Low Stock Alert Warning
The error message complements the badge:
```
"Insufficient storefront inventory for 'HP Laptop 15'". 
Available: 2.00, Requested: 5.00
Create a transfer request to move more stock to this storefront.
```

## Technical Details

### Data Sources

1. **Catalog API** (`/inventory/api/storefronts/{id}/sale-catalog/`)
   - Single storefront: `available_quantity` = storefront stock
   - Multi storefront: `total_available` = sum across storefronts

2. **Stock Levels API** (`/inventory/api/storefronts/{id}/stock-products/{product_id}/availability/`)
   - `quantity` = warehouse/business total
   - `available_quantity` = storefront available
   - `reserved_quantity` = held for pending orders

3. **Warehouse Availability API** (`/inventory/api/stock/availability/`)
   - Fallback when storefront-specific endpoint unavailable
   - `available_quantity` = warehouse total

### Stock Record Interface

```typescript
interface StockRecord {
  id: UUID
  product: UUID
  quantity: number              // Warehouse/business total
  available_quantity: number    // Storefront available
  reserved_quantity?: number    // Reserved for orders
  unit_cost?: number
  wholesale_price: number
  retail_price: number
  batch_number?: string
  expiry_date?: string | null
}
```

## Testing Scenarios

### Test 1: Verify Dual Display
1. Have product with 2 in storefront, 276 in warehouse
2. Search for product in sales page
3. Verify badge shows: "2 here (276 total)"
4. Badge color should be yellow (warning) since 2 ≤ 5

### Test 2: Verify Single Display
1. Have product with 50 in storefront, 50 in warehouse (same)
2. Search for product
3. Verify badge shows: "50 in stock"
4. Badge color should be green (success) since 50 > 5

### Test 3: Verify Cart Limit
1. Product shows "2 here (276 total)"
2. Try to add 5 to cart
3. Should show insufficient inventory error
4. Max quantity selector should be limited to 2

### Test 4: Verify Low Stock Warning
1. Product with 3 in storefront, 100 in warehouse
2. Badge should show: "Low: 3 here (100 total)"
3. Color should be yellow (warning)

### Test 5: Verify Out of Stock
1. Product with 0 in storefront, 150 in warehouse
2. Badge should show: "Out of Stock"
3. Color should be red (danger)
4. Add button should be disabled

## Files Changed

1. **src/features/dashboard/components/sales/ProductSearchPanel.tsx**
   - Updated `getStockStatus` function
   - Added warehouse total detection
   - Added dual quantity display logic

## Commit

```
commit ab05e05
Display both storefront and warehouse stock quantities in product search
```

## Future Enhancements

### Potential Improvements

1. **Click to Transfer**
   - Make badge clickable
   - Show quick transfer dialog
   - Auto-fill from warehouse to current storefront

2. **Location Breakdown**
   - Hover tooltip showing all locations
   - Quick view of where stock is located
   - One-click view in stock levels report

3. **Smart Suggestions**
   - "Need more? 274 available at warehouse"
   - "Low stock alert: Consider restocking"
   - "Transfer in progress: +10 arriving today"

4. **Historical Context**
   - Show typical daily sales
   - Predict when stock will run out
   - Suggest reorder quantity

5. **Color Coding Enhancement**
   - 🟢 Green: > 20 units
   - 🟡 Yellow: 6-20 units  
   - 🟠 Orange: 1-5 units
   - 🔴 Red: 0 units

## Related Documentation

- [Backend Stock Management Request](./backend-stock-management-request.md)
- [Backend Stock Product Quantity Tracking](./BACKEND-STOCK-PRODUCT-QUANTITY-TRACKING.md)
- [Critical Fix: Stock Level Override](./CRITICAL-FIX-STOCK-LEVEL-OVERRIDE.md)
- [Backend Bug: Stock Levels Field Error](./BACKEND-BUG-STOCK-LEVELS-FIELD-ERROR.md)
