# Stock Display Enhancement - Storefront vs Warehouse

## Problem

The product search panel was showing only one stock quantity, which could represent either the storefront-specific stock or the total warehouse stock, depending on the mode. This caused confusion when:

1. User sees "276 in stock" badge on product
2. User tries to add 5 to cart
3. System shows error: "Insufficient storefront inventory for 'HP Laptop 15'". Available: 2.00, Requested: 5.00"

The mismatch between displayed stock (276) and actual available stock at the storefront (2) was misleading.

## Root Cause

The system operates in two modes:

### Single Storefront Mode
- Fetches stock data from `/inventory/api/storefronts/{id}/stock-products/`
- `stock.quantity` = Total warehouse/business quantity
- `stock.available_quantity` = Storefront-specific available quantity

### Multi-Storefront Mode
- Fetches catalog from `/inventory/api/multi-storefront-catalog/`
- `product.available_quantity` = Total across all storefronts
- `product.locations[]` = Per-storefront breakdown with `available_quantity` for each

The `getStockStatus` function was only showing one quantity without distinguishing between:
- Storefront-specific stock (what you can actually sell right now)
- Total stock across all locations (what exists in the system)

## Solution

Enhanced the `getStockStatus` function to intelligently display stock based on the mode and data available:

### Multi-Storefront Mode with Locations Data
When `product.locations` exists and `storefrontId` is provided:
1. Find the current storefront in the `locations` array
2. Extract storefront-specific `available_quantity`
3. Compare with `product.available_quantity` (total)
4. Display both if they differ

### Single Storefront Mode
When stock data is fetched individually:
1. Use `stock.available_quantity` for storefront stock
2. Use `stock.quantity` for warehouse total
3. Display both if they differ

### Display Logic

1. **Multi-storefront with stock at other locations**:
   - Current storefront > 5: `"2 here (276 total)"`
   - Current storefront ≤ 5: `"Low: 2 here (276 total)"`
   - Current storefront = 0, others > 0: `"Out of Stock (276 at other stores)"`

2. **Multi-storefront with all stock at current location**:
   - Stock > 5: `"276 in stock"`
   - Stock ≤ 5: `"Low: 276"`

3. **Single storefront with warehouse total ≠ storefront**:
   - Storefront > 5: `"2 here (276 total)"`
   - Storefront ≤ 5: `"Low: 2 here (276 total)"`

4. **Single storefront with matching quantities**:
   - Stock > 5: `"50 in stock"`
   - Stock ≤ 5: `"Low: 5"`

5. **Out of stock everywhere**:
   - `"Out of Stock"`

### Badge Colors

- 🟢 **Green (success)**: Available quantity > 5
- 🟡 **Yellow (warning)**: Available quantity ≤ 5 but > 0
- 🔴 **Red (danger)**: Available quantity = 0

### Code Changes

```typescript
const getStockStatus = (product: Product) => {
  const stock = stockData[product.id]
  
  // In multi-storefront mode with locations data
  if (product.locations && product.locations.length > 0 && storefrontId) {
    // Find the current storefront in the locations array
    const currentLocationStock = product.locations.find(loc => loc.storefront_id === storefrontId)
    const storefrontAvailable = currentLocationStock?.available_quantity ?? 0
    const totalAvailable = product.available_quantity ?? 0
    
    const available = Number.isFinite(storefrontAvailable) ? Math.max(0, Math.floor(storefrontAvailable)) : 0
    const total = Number.isFinite(totalAvailable) ? Math.max(0, Math.floor(totalAvailable)) : 0
    
    if (available === 0) {
      // Check if stock exists elsewhere
      if (total > 0) {
        return { color: 'danger', text: `Out of Stock (${total} at other stores)`, available: 0 }
      }
      return { color: 'danger', text: 'Out of Stock', available: 0 }
    }
    
    // Show both storefront and total if they differ
    let text = ''
    if (total > available) {
      // Stock exists at other locations
      if (available <= 5) {
        text = `Low: ${available} here (${total} total)`
      } else {
        text = `${available} here (${total} total)`
      }
    } else {
      // All stock is at this location
      if (available <= 5) {
        text = `Low: ${available}`
      } else {
        text = `${available} in stock`
      }
    }
    
    const color = available <= 5 ? 'warning' : 'success'
    return { color, text, available }
  }
  
  // Single storefront mode or no locations data
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

### Example 1: Multi-Storefront Mode - Low at Current, High at Others
```
Product: HP Laptop 15"
Current Storefront (Cow Lane Store): 2 units
Total Across All Storefronts: 276 units
Badge: 🟡 "Low: 2 here (276 total)"
User Action: Can add max 2 to cart, or request transfer from other locations
```

### Example 2: Multi-Storefront Mode - Out of Stock Here, Available Elsewhere
```
Product: Mouse
Current Storefront: 0 units
Total Across All Storefronts: 50 units
Badge: 🔴 "Out of Stock (50 at other stores)"
User Action: Cannot sell, but knows stock exists at other stores
```

### Example 3: Multi-Storefront Mode - All Stock at Current Location
```
Product: Keyboard
Current Storefront: 25 units
Total Across All Storefronts: 25 units
Badge: 🟢 "25 in stock"
User Action: Can sell up to 25 units
```

### Example 4: Single Storefront Mode - Warehouse vs Storefront
```
Product: Monitor
Storefront: 3 units
Warehouse Total: 100 units
Badge: 🟡 "Low: 3 here (100 total)"
User Action: Can add 3 to cart, knows 97 more in warehouse
```

### Example 5: Single Storefront Mode - Matching Quantities
```
Product: Cable
Storefront: 50 units
Warehouse Total: 50 units
Badge: � "50 in stock"
User Action: Can sell up to 50 units
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

### Test 1: Multi-Storefront Mode - Verify Dual Display
1. Have product with 2 at Cow Lane Store, 274 at other storefronts (276 total)
2. Focus on Cow Lane Store
3. Search for product in sales page
4. Verify badge shows: "Low: 2 here (276 total)"
5. Badge color should be yellow (warning) since 2 ≤ 5
6. Try to add 5 to cart - should show insufficient inventory error
7. Max quantity selector should be limited to 2

### Test 2: Multi-Storefront Mode - All Stock at Current Location
1. Have product with 50 at Cow Lane Store, 0 at other storefronts
2. Focus on Cow Lane Store
3. Search for product
4. Verify badge shows: "50 in stock"
5. Badge color should be green (success) since 50 > 5

### Test 3: Multi-Storefront Mode - Out of Stock Here
1. Product with 0 at Cow Lane Store, 150 at other storefronts
2. Badge should show: "Out of Stock (150 at other stores)"
3. Color should be red (danger)
4. Add button should be disabled
5. User knows to request transfer or direct customer elsewhere

### Test 4: Single Storefront Mode - Verify Dual Display
1. Single storefront with 3 in stock, 100 in warehouse
2. Badge should show: "Low: 3 here (100 total)"
3. Color should be yellow (warning)
4. Can request transfer from warehouse

### Test 5: Single Storefront Mode - Matching Quantities
1. Product with 25 in storefront, 25 in warehouse (same)
2. Badge should show: "25 in stock"
3. Color should be green (success)

### Test 6: Verify Cart Limit Matches Display
1. Product shows "2 here (276 total)"
2. Try to add 5 to cart
3. Should show insufficient inventory error
4. Max quantity selector should be limited to 2
5. Successfully add 2 to cart

## Files Changed

1. **src/features/dashboard/components/sales/ProductSearchPanel.tsx**
   - Updated `getStockStatus` function
   - Added warehouse total detection
   - Added dual quantity display logic

## Commit

```
commit ab05e05 (Initial implementation)
Display both storefront and warehouse stock quantities in product search

commit 5b27f20 (Multi-storefront mode fix)
Fix stock display in multi-storefront mode to show both storefront and total quantities
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
