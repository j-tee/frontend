# Stock Adjustments - All Products Loading Fix

## Problem
Products that exist in the database and are visible on other pages (Sales, Stock Products) were not appearing in the CreateAdjustmentModal dropdown. This was because the modal was receiving `stockProducts` from the Redux store, which only contains the current page of filtered/paginated results.

## Root Cause
1. **Paginated Data**: The `stockProducts` from Redux is paginated with a `page_size` limit (e.g., 25, 50, 100)
2. **Filtered Data**: The data respects active filters (stock batch, supplier, has_quantity, search term, ordering)
3. **Limited Scope**: Modal only had access to products visible on the current page with current filters

## Solution
Implemented a separate data fetch specifically for the CreateAdjustmentModal that loads ALL stock products (up to 1000) when the modal opens.

### Implementation Details

#### 1. Added State for All Stock Products
```typescript
const [allStockProductsForModal, setAllStockProductsForModal] = useState<StockProduct[]>([])
const [isLoadingAllStockProducts, setIsLoadingAllStockProducts] = useState(false)
```

#### 2. Added Import
```typescript
import { fetchProducts, fetchStockProducts, fetchStorefronts } from '../../../services/inventoryService.js'
```

#### 3. Created Handler Function
```typescript
const handleOpenCreateAdjustmentModal = async () => {
  setShowCreateAdjustmentModal(true)
  
  // Load all stock products for the modal (not just current page)
  setIsLoadingAllStockProducts(true)
  try {
    const response = await fetchStockProducts({ page: 1, page_size: 1000 })
    const results = Array.isArray(response)
      ? response
      : Array.isArray(response.results)
        ? response.results
        : []
    setAllStockProductsForModal(results)
  } catch (error) {
    console.error('Failed to load all stock products:', error)
    // Fallback to using the paginated stock products from Redux
    setAllStockProductsForModal(stockProducts)
  } finally {
    setIsLoadingAllStockProducts(false)
  }
}
```

#### 4. Updated "Create Adjustment" Button
```typescript
<Button
  variant="primary"
  className="rounded-pill px-4"
  onClick={() => void handleOpenCreateAdjustmentModal()}
>
  Create Adjustment
</Button>
```

#### 5. Updated CreateAdjustmentModal Props
```typescript
<CreateAdjustmentModal
  show={showCreateAdjustmentModal}
  onClose={() => setShowCreateAdjustmentModal(false)}
  stockProducts={allStockProductsForModal.length > 0 ? allStockProductsForModal : stockProducts}
  onSubmit={handleCreateAdjustment}
  isSubmitting={createAdjustmentStatus === 'loading' || isLoadingAllStockProducts}
  error={createAdjustmentError}
/>
```

## Benefits

### 1. Complete Product Access
- Users can now create adjustments for ANY stock product in the system
- No longer limited to products on the current page or matching current filters

### 2. Better User Experience
- Search functionality in modal now searches across ALL products
- No confusion about "missing" products
- Consistent behavior across different pages

### 3. Graceful Fallback
- If the all-products fetch fails, falls back to the paginated data
- Loading state prevents user from submitting while data loads
- Error handling ensures modal still works even if fetch fails

### 4. Performance Considerations
- Only fetches all products when modal opens (not on page load)
- Uses reasonable limit of 1000 products (can be adjusted if needed)
- Caches the result in state while modal is open

## Technical Notes

### Data Flow
1. **Page Load**: Main page loads paginated stock products (e.g., 50 per page)
2. **Table Display**: Shows current page with active filters
3. **Create Button Click**: Triggers `handleOpenCreateAdjustmentModal()`
4. **Modal Opens**: Fetches all stock products (up to 1000) in background
5. **Modal Receives Data**: Gets `allStockProductsForModal` or falls back to `stockProducts`
6. **User Searches**: Search works across all loaded products
7. **User Selects**: Can select from complete product list

### API Call
```typescript
fetchStockProducts({ page: 1, page_size: 1000 })
```
- **Endpoint**: `GET /inventory/api/stock-products/?page=1&page_size=1000`
- **Response**: Paginated response with up to 1000 stock products
- **Note**: If there are more than 1000 stock products, may need pagination handling

## Testing Recommendations

### Test Case 1: Product on Different Page
1. Navigate to Stock Products tab
2. Set page size to 25
3. Find a product on page 2 or later
4. Click "Create Adjustment"
5. Search for the product
6. ✅ Product should appear in dropdown

### Test Case 2: Filtered Out Product
1. Apply filters (e.g., only products with quantity)
2. Note a product that's filtered out
3. Click "Create Adjustment"
4. Search for the filtered-out product
5. ✅ Product should appear in dropdown

### Test Case 3: Large Product List
1. System with 500+ stock products
2. Click "Create Adjustment"
3. ✅ Modal should show loading state
4. ✅ All products should load within reasonable time
5. ✅ Search should work smoothly

### Test Case 4: Network Error
1. Disable network or simulate API error
2. Click "Create Adjustment"
3. ✅ Modal should still open
4. ✅ Should fall back to paginated products
5. ✅ Error should be logged but not crash

## Future Improvements

### Potential Enhancements
1. **Infinite Scroll/Virtual Scroll**: For systems with thousands of products
2. **Server-Side Search**: Search endpoint that returns all matching products
3. **Caching Strategy**: Cache all products for a period to avoid repeated fetches
4. **Progressive Loading**: Load first 100 immediately, then fetch rest in background
5. **Product Groups**: Group products by category/warehouse for easier navigation

### Performance Optimization
If the system grows to have many thousands of stock products:
1. Consider implementing server-side filtering in the modal
2. Use virtual scrolling library (e.g., react-window, react-virtual)
3. Implement debounced search with backend endpoint
4. Add product type/category pre-filters before loading

## Related Files
- `src/features/dashboard/pages/ManageStocksPage.tsx` - Main implementation
- `src/features/dashboard/components/CreateAdjustmentModal.tsx` - Modal with search
- `src/services/inventoryService.ts` - API service with `fetchStockProducts`

## Related Documentation
- `STOCK-ADJUSTMENTS-EDIT-FEATURE.md` - Edit adjustment feature
- `STOCK-ADJUSTMENTS-SEARCH-FILTER.md` - Table search and filter
- `STOCK-ADJUSTMENTS-DELETE-FEATURE.md` - Delete with confirmation
