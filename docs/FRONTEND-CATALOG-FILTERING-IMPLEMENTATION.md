# Frontend Implementation: Server-Side Catalog Filtering

**Date**: October 14, 2025  
**Status**: 🟡 Ready for Backend API  
**Depends On**: `BACKEND-REQUEST-CATALOG-FILTERING.md`

---

## 🎯 Overview

This document outlines the frontend implementation for server-side catalog filtering in `ProductSearchPanel.tsx`. This will replace the current client-side filtering approach with efficient server-side queries.

---

## 📋 Current vs. Proposed Architecture

### Current (Client-Side)

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. Load ALL products
       ▼
┌─────────────┐
│   Backend   │ Returns 1000+ products
└─────────────┘
       │
       ▼
┌─────────────┐
│   Browser   │ Filters in memory
│  catalog.   │ with .filter()
│  filter()   │
└─────────────┘
```

### Proposed (Server-Side)

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. Search "sugar"
       ▼
┌─────────────┐
│   Backend   │ SQL query: WHERE name LIKE '%sugar%'
│   Database  │ Returns ~10 matches
└─────────────┘
       │
       ▼
┌─────────────┐
│   Browser   │ Display results
└─────────────┘
```

---

## 🔧 Implementation Steps

### Step 1: Update TypeScript Types

**File**: `src/types/inventory.ts`

```typescript
// Add to existing types

export interface CatalogFilters {
  search?: string
  category?: UUID
  min_price?: number
  max_price?: number
  in_stock_only?: boolean
  page?: number
  page_size?: number
  storefront?: UUID[]  // For multi-storefront filtering
}

export interface PaginatedCatalogResponse {
  count: number
  next: string | null
  previous: string | null
  page_size: number
  total_pages: number
  current_page: number
}

export interface SaleCatalogResponse extends PaginatedCatalogResponse {
  products: SaleCatalogItem[]
}

export interface MultiStorefrontCatalogResponse extends PaginatedCatalogResponse {
  storefronts: Array<{ id: UUID; name: string }>
  products: MultiStorefrontCatalogItem[]
}
```

---

### Step 2: Update Service Layer

**File**: `src/services/inventoryService.ts`

```typescript
// Update existing functions to accept filters

export const fetchSaleCatalog = async (
  storefrontId: UUID,
  filters?: CatalogFilters
) => {
  const { data } = await httpClient.get<SaleCatalogResponse>(
    `/inventory/api/storefronts/${storefrontId}/sale-catalog/`,
    { params: filters }
  )
  return data
}

export const fetchMultiStorefrontCatalog = async (
  filters?: CatalogFilters
) => {
  const { data } = await httpClient.get<MultiStorefrontCatalogResponse>(
    '/inventory/api/storefronts/multi-storefront-catalog/',
    { params: filters }
  )
  return data
}
```

---

### Step 3: Update ProductSearchPanel Component

**File**: `src/features/dashboard/components/sales/ProductSearchPanel.tsx`

#### 3A. Remove Catalog Pre-loading

**Before:**
```typescript
useEffect(() => {
  // Loads ALL products upfront
  const loadCatalog = async () => {
    const response = await fetchSaleCatalog(storefrontId)
    setCatalog(response.products)
  }
  loadCatalog()
}, [storefrontId])
```

**After:**
```typescript
// No initial catalog load needed!
// We'll load on-demand when user searches
```

#### 3B. Update Search Function

**Before:**
```typescript
const searchProducts = useCallback(async (rawQuery: string) => {
  // Client-side filtering
  const matches = catalog.filter((item) =>
    item.name.toLowerCase().includes(lowerQuery) ||
    item.sku.toLowerCase().includes(lowerQuery) ||
    (item.barcode ? item.barcode.toLowerCase().includes(lowerQuery) : false)
  )
  setProducts(matches)
}, [catalog])
```

**After:**
```typescript
const searchProducts = useCallback(async (rawQuery: string) => {
  const trimmedQuery = rawQuery.trim()
  
  if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
    setProducts([])
    setError(null)
    return
  }
  
  try {
    setLoading(true)
    setError(null)
    
    // Server-side search with filters
    const filters: CatalogFilters = {
      search: trimmedQuery,
      in_stock_only: true,
      page_size: 50,
    }
    
    let response: SaleCatalogResponse | MultiStorefrontCatalogResponse
    
    if (multiStorefront || !storefrontId) {
      response = await fetchMultiStorefrontCatalog(filters)
    } else {
      response = await fetchSaleCatalog(storefrontId, filters)
    }
    
    // Normalize response to Product format
    const normalized = (response.products ?? [])
      .filter((item: SaleCatalogItem | MultiStorefrontCatalogItem) => 
        Array.isArray(item.stock_product_ids) && 
        item.stock_product_ids.length > 0
      )
      .map((item: SaleCatalogItem | MultiStorefrontCatalogItem): Product => {
        const isMulti = 'locations' in item
        const retail = parsePrice(item.retail_price)
        const wholesale = parsePrice(item.wholesale_price ?? item.retail_price)
        const available = isMulti 
          ? (item as MultiStorefrontCatalogItem).total_available || 0
          : (item as SaleCatalogItem).available_quantity || 0

        return {
          id: item.product_id,
          name: item.product_name,
          sku: item.sku,
          barcode: item.barcode ?? null,
          category_name: item.category_name ?? 'Uncategorized',
          unit: item.unit ?? 'unit',
          image: item.product_image ?? null,
          stock_product_ids: item.stock_product_ids,
          retail_price: retail,
          wholesale_price: wholesale,
          available_quantity: available,
          locations: isMulti ? (item as MultiStorefrontCatalogItem).locations : undefined,
        }
      })
    
    setProducts(normalized)
    
    // Initialize quantities for new products
    const newQuantities: Record<UUID, number> = {}
    normalized.forEach((product) => {
      if (!quantities[product.id]) {
        newQuantities[product.id] = 1
      }
    })
    if (Object.keys(newQuantities).length > 0) {
      setQuantities((prev) => ({ ...prev, ...newQuantities }))
    }
    
    // Fetch accurate stock levels for matched products
    if (normalized.length > 0) {
      await fetchStockLevels(normalized.map((product) => product.id))
    }
  } catch (err) {
    console.error('[ProductSearch] Search error:', err)
    setError('Failed to search products. Please try again.')
  } finally {
    setLoading(false)
  }
}, [storefrontId, multiStorefront, quantities, fetchStockLevels])
```

#### 3C. Add Advanced Filters (Optional Enhancement)

```typescript
// Add filter state
const [categoryFilter, setCategoryFilter] = useState<UUID | null>(null)
const [priceRange, setPriceRange] = useState<{ min?: number; max?: number }>({})
const [showOutOfStock, setShowOutOfStock] = useState(false)

// Update search to include filters
const searchProducts = useCallback(async (rawQuery: string) => {
  // ... existing code ...
  
  const filters: CatalogFilters = {
    search: trimmedQuery,
    category: categoryFilter || undefined,
    min_price: priceRange.min,
    max_price: priceRange.max,
    in_stock_only: !showOutOfStock,
    page_size: 50,
  }
  
  // ... rest of search logic ...
}, [storefrontId, multiStorefront, categoryFilter, priceRange, showOutOfStock])

// Add filter UI components
return (
  <div>
    {/* Search Bar */}
    <Form.Group className="mb-3">
      {/* ... existing search input ... */}
    </Form.Group>
    
    {/* Advanced Filters */}
    <Row className="mb-3">
      <Col md={4}>
        <Form.Group>
          <Form.Label>Category</Form.Label>
          <Form.Select
            value={categoryFilter || ''}
            onChange={(e) => setCategoryFilter(e.target.value || null)}
          >
            <option value="">All Categories</option>
            {/* Map categories here */}
          </Form.Select>
        </Form.Group>
      </Col>
      
      <Col md={3}>
        <Form.Group>
          <Form.Label>Min Price</Form.Label>
          <Form.Control
            type="number"
            placeholder="0.00"
            value={priceRange.min || ''}
            onChange={(e) => setPriceRange(prev => ({ 
              ...prev, 
              min: e.target.value ? Number(e.target.value) : undefined 
            }))}
          />
        </Form.Group>
      </Col>
      
      <Col md={3}>
        <Form.Group>
          <Form.Label>Max Price</Form.Label>
          <Form.Control
            type="number"
            placeholder="1000.00"
            value={priceRange.max || ''}
            onChange={(e) => setPriceRange(prev => ({ 
              ...prev, 
              max: e.target.value ? Number(e.target.value) : undefined 
            }))}
          />
        </Form.Group>
      </Col>
      
      <Col md={2} className="d-flex align-items-end">
        <Form.Check
          type="checkbox"
          label="Show out of stock"
          checked={showOutOfStock}
          onChange={(e) => setShowOutOfStock(e.target.checked)}
        />
      </Col>
    </Row>
    
    {/* Rest of component */}
  </div>
)
```

---

### Step 4: Add Pagination Support (Optional)

```typescript
const [currentPage, setCurrentPage] = useState(1)
const [totalPages, setTotalPages] = useState(0)
const [totalProducts, setTotalProducts] = useState(0)

const searchProducts = useCallback(async (rawQuery: string, page: number = 1) => {
  // ... existing code ...
  
  const filters: CatalogFilters = {
    search: trimmedQuery,
    in_stock_only: true,
    page: page,
    page_size: 50,
  }
  
  const response = multiStorefront
    ? await fetchMultiStorefrontCatalog(filters)
    : await fetchSaleCatalog(storefrontId!, filters)
  
  // Update pagination state
  setCurrentPage(response.current_page)
  setTotalPages(response.total_pages)
  setTotalProducts(response.count)
  
  // ... rest of code ...
}, [storefrontId, multiStorefront])

// Add pagination UI
return (
  <div>
    {/* Search results */}
    
    {/* Pagination */}
    {totalPages > 1 && (
      <div className="d-flex justify-content-center mt-3">
        <Button
          variant="outline-secondary"
          disabled={currentPage === 1}
          onClick={() => searchProducts(searchQuery, currentPage - 1)}
        >
          Previous
        </Button>
        <span className="mx-3 align-self-center">
          Page {currentPage} of {totalPages} ({totalProducts} total)
        </span>
        <Button
          variant="outline-secondary"
          disabled={currentPage === totalPages}
          onClick={() => searchProducts(searchQuery, currentPage + 1)}
        >
          Next
        </Button>
      </div>
    )}
  </div>
)
```

---

## 🧪 Testing Plan

### Unit Tests

```typescript
// src/features/dashboard/components/sales/ProductSearchPanel.test.tsx

import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ProductSearchPanel } from './ProductSearchPanel'
import * as inventoryService from '../../../../services/inventoryService'

jest.mock('../../../../services/inventoryService')

describe('ProductSearchPanel - Server-Side Filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  it('should not load catalog on mount', () => {
    render(<ProductSearchPanel storefrontId="uuid" saleType="RETAIL" />)
    
    expect(inventoryService.fetchSaleCatalog).not.toHaveBeenCalled()
  })
  
  it('should call API with search query', async () => {
    const mockResponse = {
      count: 1,
      products: [{
        product_id: 'uuid',
        product_name: 'Sugar 1kg',
        sku: 'SUG-001',
        // ... other fields
      }],
      page_size: 50,
      total_pages: 1,
      current_page: 1,
    }
    
    jest.spyOn(inventoryService, 'fetchSaleCatalog').mockResolvedValue(mockResponse)
    
    render(<ProductSearchPanel storefrontId="uuid" saleType="RETAIL" />)
    
    const searchInput = screen.getByPlaceholderText(/search products/i)
    fireEvent.change(searchInput, { target: { value: 'sugar' } })
    
    await waitFor(() => {
      expect(inventoryService.fetchSaleCatalog).toHaveBeenCalledWith(
        'uuid',
        expect.objectContaining({
          search: 'sugar',
          in_stock_only: true,
        })
      )
    }, { timeout: 1000 })
  })
  
  it('should use multi-storefront endpoint when enabled', async () => {
    const mockResponse = {
      count: 1,
      storefronts: [{ id: 'uuid1', name: 'Store 1' }],
      products: [],
      page_size: 50,
      total_pages: 1,
      current_page: 1,
    }
    
    jest.spyOn(inventoryService, 'fetchMultiStorefrontCatalog').mockResolvedValue(mockResponse)
    
    render(<ProductSearchPanel multiStorefront saleType="RETAIL" />)
    
    const searchInput = screen.getByPlaceholderText(/search products/i)
    fireEvent.change(searchInput, { target: { value: 'test' } })
    
    await waitFor(() => {
      expect(inventoryService.fetchMultiStorefrontCatalog).toHaveBeenCalled()
    })
  })
  
  it('should not search with query shorter than minimum length', async () => {
    render(<ProductSearchPanel storefrontId="uuid" saleType="RETAIL" />)
    
    const searchInput = screen.getByPlaceholderText(/search products/i)
    fireEvent.change(searchInput, { target: { value: 'a' } })
    
    await waitFor(() => {
      expect(inventoryService.fetchSaleCatalog).not.toHaveBeenCalled()
    }, { timeout: 1000 })
  })
})
```

### Integration Tests

```typescript
// Test with real API (in development/staging)

describe('ProductSearchPanel - Integration', () => {
  it('should search and display results from API', async () => {
    render(
      <Provider store={store}>
        <ProductSearchPanel storefrontId={testStorefrontId} saleType="RETAIL" />
      </Provider>
    )
    
    const searchInput = screen.getByPlaceholderText(/search products/i)
    fireEvent.change(searchInput, { target: { value: 'sugar' } })
    
    await waitFor(() => {
      expect(screen.getByText(/Sugar 1kg/i)).toBeInTheDocument()
    })
  })
})
```

---

## 📊 Performance Metrics

### Before Server-Side Filtering

| Metric | Value |
|--------|-------|
| Initial catalog load time | 2-5 seconds |
| Network payload (initial) | 500 KB - 2 MB |
| Search response time | <100ms (in-memory) |
| Memory usage | 5-20 MB |
| Works with catalogs up to | ~1,000 products |

### After Server-Side Filtering

| Metric | Value |
|--------|-------|
| Initial catalog load time | **0 seconds** (no load) |
| Network payload (per search) | **5-50 KB** |
| Search response time | 200-500ms (network + DB) |
| Memory usage | **<1 MB** |
| Works with catalogs up to | **10,000+ products** |

### Expected Improvements

- ✅ **80% faster** initial page load
- ✅ **95% smaller** network payloads
- ✅ **90% less** memory usage
- ✅ **10x larger** catalogs supported

---

## 🔄 Migration Checklist

### Pre-Implementation
- [ ] Confirm backend API is deployed and tested
- [ ] Review API documentation
- [ ] Confirm response format matches TypeScript types
- [ ] Test API with curl/Postman

### Implementation
- [ ] Update TypeScript types in `inventory.ts`
- [ ] Update service functions in `inventoryService.ts`
- [ ] Remove catalog pre-loading from `ProductSearchPanel.tsx`
- [ ] Update search function to use server-side API
- [ ] Add loading states for search
- [ ] Add error handling
- [ ] (Optional) Add advanced filters UI
- [ ] (Optional) Add pagination

### Testing
- [ ] Write unit tests for new search logic
- [ ] Test with empty search query
- [ ] Test with very short query (< MIN_LENGTH)
- [ ] Test with query that returns no results
- [ ] Test with query that returns many results
- [ ] Test multi-storefront mode
- [ ] Test single storefront mode
- [ ] Test error scenarios (network failure, 500 errors)
- [ ] Load test with 5,000+ product catalog

### Deployment
- [ ] Deploy to staging
- [ ] Test with real data
- [ ] Monitor API response times
- [ ] Check for any console errors
- [ ] Verify stock levels display correctly
- [ ] Test barcode scanning still works
- [ ] Deploy to production
- [ ] Monitor for 24 hours

---

## 🐛 Common Issues & Solutions

### Issue 1: Search feels slow

**Cause**: Network latency + database query time

**Solutions**:
- Show loading spinner immediately
- Add debouncing (already implemented)
- Consider adding autocomplete suggestions
- Cache recent searches

### Issue 2: Results don't update immediately

**Cause**: Debounce delay

**Solution**:
```typescript
// Add "Search" button for instant search
<Button onClick={() => searchProducts(searchQuery)}>
  Search Now
</Button>
```

### Issue 3: Stock levels don't match search results

**Cause**: `fetchStockLevels` race condition

**Solution**:
```typescript
// Make sure to await stock fetch before showing results
await fetchStockLevels(normalized.map(p => p.id))
setProducts(normalized) // Only set after stock is fetched
```

---

## 🚀 Future Enhancements

### 1. Autocomplete Suggestions

```typescript
const [suggestions, setSuggestions] = useState<string[]>([])

const fetchSuggestions = async (query: string) => {
  const response = await httpClient.get('/inventory/api/products/autocomplete/', {
    params: { q: query }
  })
  setSuggestions(response.data.suggestions)
}
```

### 2. Search History

```typescript
const [searchHistory, setSearchHistory] = useState<string[]>([])

useEffect(() => {
  const history = localStorage.getItem('productSearchHistory')
  if (history) setSearchHistory(JSON.parse(history))
}, [])

const addToHistory = (query: string) => {
  const updated = [query, ...searchHistory.filter(q => q !== query)].slice(0, 10)
  setSearchHistory(updated)
  localStorage.setItem('productSearchHistory', JSON.stringify(updated))
}
```

### 3. Recently Sold Products

```typescript
// Show frequently sold products before search
const [recentlySold, setRecentlySold] = useState<Product[]>([])

useEffect(() => {
  const fetchRecentlySold = async () => {
    const response = await httpClient.get('/sales/api/frequently-sold/', {
      params: { storefront: storefrontId }
    })
    setRecentlySold(response.data.products)
  }
  fetchRecentlySold()
}, [storefrontId])
```

### 4. Keyboard Shortcuts

```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      searchInputRef.current?.focus()
    }
  }
  
  window.addEventListener('keydown', handleKeyPress)
  return () => window.removeEventListener('keydown', handleKeyPress)
}, [])
```

---

## ✅ Success Criteria

- [ ] No catalog is loaded on component mount
- [ ] Search queries trigger server-side API calls
- [ ] Debouncing prevents excessive API calls
- [ ] Loading states display correctly
- [ ] Error states are handled gracefully
- [ ] Search results display accurate stock levels
- [ ] Multi-storefront mode shows products from all locations
- [ ] Barcode scanning still works
- [ ] Add to cart functionality unchanged
- [ ] Performance metrics show improvement
- [ ] No breaking changes to parent components

---

## 📞 Support

**Questions?** Reach out to:
- Frontend Team Lead
- #frontend-dev Slack channel

**Issues?** Create a ticket:
- Tag: `frontend`, `product-search`, `catalog-filtering`
- Include: Steps to reproduce, expected vs actual behavior

---

**Ready to implement?** Start with Step 1 and work through sequentially. Test thoroughly after each step!
