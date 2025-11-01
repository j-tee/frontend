# Stock Movements Enhancement - Frontend Integration Plan v2

**Team Lead**: Senior Frontend Developer  
**Status**: 🎯 **READY TO START**  
**Backend**: ✅ All 4 Phases Complete  
**Timeline**: 2-3 weeks  
**Date**: November 1, 2025

---

## 🎯 Executive Summary

Following our **established project patterns**, we'll integrate the Stock Movements Enhancement by:
1. Extending existing `reportsService.ts` (NOT creating separate service files)
2. Adding types to existing `types/reports.ts` (NOT creating new type files)
3. Enhancing existing `StockMovementsPage.tsx` (already exists!)
4. Using existing components: `ReportContainer`, `SummaryCard`, `DateRangeFilter`
5. Following React Bootstrap + lucide-react patterns

**No New Architecture** - Just extending what we have! ✅

---

## 🏗️ Our Established Patterns

```
src/
├── services/
│   ├── httpClient.ts            # ✅ Already configured with auth
│   └── reportsService.ts        # ✅ Extend this (inventory section)
├── types/
│   ├── common.ts                # ✅ Has PaginatedResponse, UUID
│   └── reports.ts               # ✅ Extend ReportFilters + add new types
├── features/reports/
│   ├── components/              # ✅ Reuse existing components
│   │   ├── ReportContainer.tsx
│   │   ├── SummaryCard.tsx
│   │   ├── DateRangeFilter.tsx
│   │   └── ReportStates.tsx
│   └── pages/
│       ├── StockMovementsPage.tsx     # ✅ EXISTS - enhance this
│       └── StockMovementsAnalytics.tsx # NEW - create this
└── hooks/
    └── useCurrency.ts           # ✅ Use for formatting
```

**Key Rules**:
- ✅ Use `httpClient` from `services/httpClient.ts` (NOT axios directly)
- ✅ Add types to `types/reports.ts` (NOT separate files)
- ✅ Use `inventoryReportsService` from `reportsService.ts`
- ✅ Use `lucide-react` icons (NOT React Icons)
- ✅ Use `React Bootstrap` components (`Tab`, `Tabs`, `Modal`)
- ✅ Use existing `ReportContainer`, `SummaryCard` patterns

---

## 📦 Install Dependencies First

```bash
# Install recharts for charts (Phase 3-4)
npm install recharts

# Verify backend is running
curl "http://localhost:8000/reports/api/inventory/movements/?start_date=2024-01-01&end_date=2024-01-31"
```

---

## 📋 Phase-by-Phase Implementation

### **Phase 1: Enhanced Product Filtering** (Week 1, Days 1-3)
**Developer**: Senior Dev (You)  
**Backend Endpoint**: `/reports/api/inventory/movements/` (ALREADY EXISTS)  
**New Parameter**: `product_ids` (comma-separated UUIDs)

---

#### **Step 1.1: Update Types** (30 min)

**File**: `src/types/reports.ts`

**Add to existing `ReportFilters` interface**:
```typescript
export interface ReportFilters {
  // ... existing 20+ filters
  product_id?: string;      // NEW: Single product filter
  product_ids?: string;     // NEW: Multiple products (comma-separated UUIDs)
  // ... rest stays the same
}
```

That's it for types! `StockMovementsResponse` already works.

---

#### **Step 1.2: Service Layer** (NO CODE CHANGES NEEDED! ✅)

**File**: `src/services/reportsService.ts`

The existing `inventoryReportsService.getStockMovements()` method already supports this:

```typescript
// EXISTING CODE - no changes needed!
export const inventoryReportsService = {
  getStockMovements: async (filters: ReportFilters = {}): Promise<StockMovementsResponse> => {
    const response = await reportsApi.get<StockMovementsResponse>(
      `/reports/api/inventory/movements${buildQueryString(filters)}`
      // ✅ buildQueryString() automatically includes product_ids if present
    );
    return response.data;
  },
  // ... other methods
};
```

**Why no changes?** The `buildQueryString()` helper automatically converts `ReportFilters` to query params, including our new `product_ids` field!

---

#### **Step 1.3: Update Stock Movements Page** (2 hours)

**File**: `src/features/reports/pages/StockMovementsPage.tsx`

**Changes needed**:

```typescript
// 1. Add state for selected products
const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

// 2. Update fetchData callback to include product_ids
const fetchData = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const params: Record<string, unknown> = {
      start_date: startDate,
      end_date: endDate,
      page,
      page_size: pageSize,
      sort_by: sortBy,
      sort_order: sortOrder,
      // NEW: Add product filtering
      ...(selectedProducts.length > 0 && { 
        product_ids: selectedProducts.join(',') 
      }),
      // Existing filters
      ...(searchQuery.trim() && { search: searchQuery.trim() }),
      ...(warehouseId && { warehouse_id: warehouseId }),
      ...(categoryId && { category_id: categoryId }),
      ...(movementType && { movement_type: movementType }),
      ...(referenceType && { reference_type: referenceType })
    };

    const response = await inventoryReportsService.getStockMovements(params);
    if (response.success && response.data) {
      setData(response.data);
      setMeta(response.meta || null);
    }
  } catch (err) {
    setError((err as Error).message || 'Failed to load stock movements');
  } finally {
    setLoading(false);
  }
}, [startDate, endDate, selectedProducts, page, /* ... other deps */]);

// 3. Update clearFilters to include product selection
const clearFilters = () => {
  setSearchQuery('');
  setWarehouseId('');
  setCategoryId('');
  setMovementType('');
  setReferenceType('');
  setSelectedProducts([]); // NEW
  setPage(1);
};

// 4. Update hasActiveFilters check
const hasActiveFilters = Boolean(
  searchQuery || warehouseId || categoryId || movementType || referenceType || selectedProducts.length > 0 // NEW
);
```

**Add Product Multi-Select UI** (inside the filters section after category filter):

```tsx
{/* Product Multi-Select Filter - NEW */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Filter by Products
  </label>
  <select
    multiple
    value={selectedProducts}
    onChange={(e) => {
      const selected = Array.from(e.target.selectedOptions, option => option.value);
      setSelectedProducts(selected);
      setPage(1);
    }}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    size={5}
  >
    {/* Populate from products list or search results */}
    <option value="">Hold Ctrl/Cmd to select multiple</option>
    {/* TODO: Fetch product list or use autocomplete */}
  </select>
  
  {/* Selected Products Display */}
  {selectedProducts.length > 0 && (
    <div className="mt-2 flex flex-wrap gap-2">
      {selectedProducts.map(productId => (
        <span 
          key={productId}
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
        >
          Product {productId.substring(0, 8)}...
          <X 
            className="w-3 h-3 ml-1 cursor-pointer hover:text-blue-900" 
            onClick={() => setSelectedProducts(prev => prev.filter(id => id !== productId))}
          />
        </span>
      ))}
      <button
        onClick={() => setSelectedProducts([])}
        className="inline-flex items-center px-2 py-0.5 text-xs text-red-600 hover:text-red-800"
      >
        <X className="w-3 h-3 mr-1" />
        Clear All
      </button>
    </div>
  )}
</div>
```

**Phase 1 Complete!** ✅

---

### **Phase 2: Product Search & Quick Filters** (Week 1, Days 4-5)
**Developer**: Dev 2  
**Backend Endpoints**: 
- `/reports/api/inventory/products/search/` (NEW)
- `/reports/api/inventory/movements/quick-filters/` (NEW)

---

#### **Step 2.1: Add Types** (15 min)

**File**: `src/types/reports.ts`

```typescript
// Add after StockMovementsResponse

/**
 * Product Search Response (Phase 2)
 */
export interface ProductSearchResult {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  current_stock: number;
}

export interface ProductSearchResponse {
  success: boolean;
  data: ProductSearchResult[];
}

/**
 * Quick Filters Response (Phase 2)
 */
export interface QuickFilterDetail {
  product_id: string;
  product_name: string;
  sku: string;
  metric_value: number;
  metric_label: string;
  value_impact?: number;
}

export interface QuickFiltersResponse {
  success: boolean;
  data: {
    filter_type: 'top_sellers' | 'most_adjusted' | 'high_transfers' | 'shrinkage';
    product_ids: string[];
    details: QuickFilterDetail[];
    count: number;
  };
}
```

---

#### **Step 2.2: Add Service Methods** (30 min)

**File**: `src/services/reportsService.ts`

**Add to `inventoryReportsService` object**:

```typescript
export const inventoryReportsService = {
  // ... existing methods (getStockLevels, getStockMovements, etc.)
  
  /**
   * Search products for movement filtering (Phase 2)
   */
  searchProducts: async (query: string, limit: number = 10): Promise<ProductSearchResponse> => {
    const response = await reportsApi.get<ProductSearchResponse>(
      `/reports/api/inventory/products/search/`,
      { params: { q: query, limit } }
    );
    return response.data;
  },
  
  /**
   * Get quick filter product lists (Phase 2)
   */
  getQuickFilters: async (
    filterType: 'top_sellers' | 'most_adjusted' | 'high_transfers' | 'shrinkage',
    startDate: string,
    endDate: string,
    limit: number = 10
  ): Promise<QuickFiltersResponse> => {
    const response = await reportsApi.get<QuickFiltersResponse>(
      `/reports/api/inventory/movements/quick-filters/`,
      { params: { filter_type: filterType, start_date: startDate, end_date: endDate, limit } }
    );
    return response.data;
  },
  
  // ... rest of existing methods
};
```

---

#### **Step 2.3: Add Product Search Component** (3 hours)

**File**: `src/features/reports/components/ProductSearchAutocomplete.tsx` (NEW FILE)

```tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Package } from 'lucide-react';
import { inventoryReportsService } from '../../../services/reportsService';
import type { ProductSearchResult } from '../../../types/reports';

interface ProductSearchAutocompleteProps {
  onSelectProducts: (productIds: string[]) => void;
  selectedProductIds: string[];
}

export const ProductSearchAutocomplete: React.FC<ProductSearchAutocompleteProps> = ({
  onSelectProducts,
  selectedProductIds
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  const searchProducts = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      const response = await inventoryReportsService.searchProducts(searchQuery, 10);
      if (response.success) {
        setResults(response.data);
        setShowDropdown(true);
      }
    } catch (error) {
      console.error('Product search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce timer
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) searchProducts(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchProducts]);

  const handleSelectProduct = (product: ProductSearchResult) => {
    if (!selectedProductIds.includes(product.id)) {
      onSelectProducts([...selectedProductIds, product.id]);
    }
    setQuery('');
    setShowDropdown(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Search & Add Products
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type product name or SKU..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelectProduct(product)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
              disabled={selectedProductIds.includes(product.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{product.name}</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    SKU: {product.sku}
                    {product.category && ` • ${product.category}`}
                  </div>
                </div>
                <div className="text-sm text-gray-600 ml-4">
                  Stock: {product.current_stock}
                </div>
              </div>
              {selectedProductIds.includes(product.id) && (
                <div className="mt-2 text-xs text-blue-600">✓ Already selected</div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {showDropdown && !loading && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
          No products found for "{query}"
        </div>
      )}
    </div>
  );
};
```

---

#### **Step 2.4: Add Quick Filters Bar** (2 hours)

**File**: `src/features/reports/components/QuickFiltersBar.tsx` (NEW FILE)

```tsx
import React, { useState } from 'react';
import { TrendingUp, AlertTriangle, Settings, Truck } from 'lucide-react';
import { inventoryReportsService } from '../../../services/reportsService';

interface QuickFiltersBarProps {
  startDate: string;
  endDate: string;
  onFilterApplied: (productIds: string[], filterType: string) => void;
}

export const QuickFiltersBar: React.FC<QuickFiltersBarProps> = ({
  startDate,
  endDate,
  onFilterApplied
}) => {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const quickFilters = [
    {
      type: 'top_sellers',
      label: 'Top Sellers',
      icon: TrendingUp,
      color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
      description: 'Products with highest sales volume'
    },
    {
      type: 'shrinkage',
      label: 'Shrinkage Items',
      icon: AlertTriangle,
      color: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
      description: 'Products with negative adjustments'
    },
    {
      type: 'most_adjusted',
      label: 'Most Adjusted',
      icon: Settings,
      color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100',
      description: 'Products with frequent manual adjustments'
    },
    {
      type: 'high_transfers',
      label: 'High Transfers',
      icon: Truck,
      color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
      description: 'Products frequently moved between warehouses'
    }
  ];

  const applyQuickFilter = async (filterType: string) => {
    setLoading(true);
    try {
      const response = await inventoryReportsService.getQuickFilters(
        filterType as 'top_sellers' | 'most_adjusted' | 'high_transfers' | 'shrinkage',
        startDate,
        endDate,
        10
      );

      if (response.success && response.data.product_ids.length > 0) {
        onFilterApplied(response.data.product_ids, filterType);
        setActiveFilter(filterType);
      } else {
        alert(`No products found for "${filterType}" filter`);
      }
    } catch (error) {
      console.error('Quick filter error:', error);
      alert('Failed to apply filter');
    } finally {
      setLoading(false);
    }
  };

  const clearFilter = () => {
    setActiveFilter(null);
    onFilterApplied([], '');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">Quick Filters</h4>
        {activeFilter && (
          <button
            onClick={clearFilter}
            className="text-xs text-red-600 hover:text-red-800 font-medium"
          >
            Clear Active Filter
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {quickFilters.map((filter) => {
          const Icon = filter.icon;
          const isActive = activeFilter === filter.type;
          
          return (
            <button
              key={filter.type}
              onClick={() => applyQuickFilter(filter.type)}
              disabled={loading}
              className={`
                relative p-3 border rounded-lg text-left transition-all
                ${isActive 
                  ? 'ring-2 ring-blue-500 ring-offset-1' 
                  : filter.color
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <div className="flex items-start justify-between mb-2">
                <Icon className="w-5 h-5" />
                {isActive && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                    Active
                  </span>
                )}
              </div>
              <div className="font-medium text-sm mb-1">{filter.label}</div>
              <div className="text-xs opacity-75">{filter.description}</div>
            </button>
          );
        })}
      </div>
      
      {loading && (
        <div className="mt-3 text-center text-sm text-gray-600">
          Loading filter data...
        </div>
      )}
    </div>
  );
};
```

---

#### **Step 2.5: Integrate into Stock Movements Page** (1 hour)

**File**: `src/features/reports/pages/StockMovementsPage.tsx`

**Add imports**:
```typescript
import { ProductSearchAutocomplete } from '../components/ProductSearchAutocomplete';
import { QuickFiltersBar } from '../components/QuickFiltersBar';
```

**Add quick filter state**:
```typescript
const [activeQuickFilter, setActiveQuickFilter] = useState<string>('');
```

**Add after DateRangeFilter component**:
```tsx
{/* Quick Filters - Phase 2 NEW */}
<QuickFiltersBar
  startDate={startDate}
  endDate={endDate}
  onFilterApplied={(productIds, filterType) => {
    setSelectedProducts(productIds);
    setActiveQuickFilter(filterType);
    setPage(1);
  }}
/>

{/* Product Search - Phase 2 NEW */}
<div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
  <ProductSearchAutocomplete
    selectedProductIds={selectedProducts}
    onSelectProducts={(ids) => {
      setSelectedProducts(ids);
      setPage(1);
    }}
  />
</div>
```

**Phase 2 Complete!** ✅

---

### **Phase 3: Product Movement Summary** (Week 2, Days 1-3)
**Developer**: Dev 3  
**Backend Endpoint**: `/reports/api/inventory/products/{id}/movement-summary/` (NEW)

---

#### **Step 3.1: Add Types** (30 min)

**File**: `src/types/reports.ts`

```typescript
// Add after QuickFiltersResponse

/**
 * Product Movement Summary (Phase 3)
 */
export interface ProductMovementBreakdown {
  sales: {
    quantity: number;
    transaction_count: number;
    value: number;
    percentage: number;
  };
  transfers: {
    in: { quantity: number; transaction_count: number; value: number };
    out: { quantity: number; transaction_count: number; value: number };
    net: { quantity: number; transaction_count: number; value: number };
  };
  adjustments: {
    positive: { quantity: number; transaction_count: number; value: number };
    negative: { quantity: number; transaction_count: number; value: number };
    net: { quantity: number; transaction_count: number; value: number };
    percentage: number;
    by_type: Record<string, { quantity: number; count: number }>;
  };
  net_change: {
    quantity: number;
    value: number;
  };
}

export interface WarehouseDistribution {
  warehouse_id: string;
  warehouse_name: string;
  warehouse_type: string;
  sales: number;
  transfers_net: number;
  adjustments_net: number;
  total_movement: number;
  percentage: number;
  current_stock: number;
}

export interface ProductMovementSummary {
  product: {
    id: string;
    name: string;
    sku: string;
    category: string;
  };
  period: {
    start_date: string;
    end_date: string;
  };
  movement_breakdown: ProductMovementBreakdown;
  warehouse_distribution: WarehouseDistribution[];
}

export interface ProductMovementSummaryResponse {
  success: boolean;
  data: ProductMovementSummary;
}
```

---

#### **Step 3.2: Add Service Method** (15 min)

**File**: `src/services/reportsService.ts`

```typescript
export const inventoryReportsService = {
  // ... existing methods
  
  /**
   * Get product movement summary with breakdown (Phase 3)
   */
  getProductMovementSummary: async (
    productId: string,
    startDate: string,
    endDate: string
  ): Promise<ProductMovementSummaryResponse> => {
    const response = await reportsApi.get<ProductMovementSummaryResponse>(
      `/reports/api/inventory/products/${productId}/movement-summary/`,
      { params: { start_date: startDate, end_date: endDate } }
    );
    return response.data;
  },
  
  // ... rest
};
```

---

#### **Step 3.3: Create Product Summary Modal** (4 hours)

**File**: `src/features/reports/components/ProductMovementSummaryModal.tsx` (NEW FILE)

```tsx
import React, { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { X, Package, TrendingDown, TrendingUp, ArrowRight, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { inventoryReportsService } from '../../../services/reportsService';
import type { ProductMovementSummary } from '../../../types/reports';
import { LoadingState, ErrorState } from './ReportStates';

interface ProductMovementSummaryModalProps {
  productId: string;
  productName: string;
  startDate: string;
  endDate: string;
  isOpen: boolean;
  onClose: () => void;
}

const COLORS = {
  sales: '#ef4444',     // red
  transfers: '#3b82f6', // blue
  adjustments: '#f59e0b' // amber
};

export const ProductMovementSummaryModal: React.FC<ProductMovementSummaryModalProps> = ({
  productId,
  productName,
  startDate,
  endDate,
  isOpen,
  onClose
}) => {
  const [summary, setSummary] = useState<ProductMovementSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && productId) {
      fetchSummary();
    }
  }, [isOpen, productId, startDate, endDate]);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await inventoryReportsService.getProductMovementSummary(
        productId,
        startDate,
        endDate
      );
      if (response.success) {
        setSummary(response.data);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to load product summary');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal show={isOpen} onHide={onClose} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title className="flex items-center space-x-2">
          <Package className="w-6 h-6 text-blue-600" />
          <span>Movement Summary: {productName}</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-6">
        {loading && <LoadingState />}
        {error && <ErrorState error={error} onRetry={fetchSummary} />}
        
        {summary && (
          <div className="space-y-6">
            {/* Product Info Header */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Product Name</div>
                  <div className="text-lg font-semibold">{summary.product.name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">SKU</div>
                  <div className="text-lg font-semibold">{summary.product.sku}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Category</div>
                  <div className="text-lg">{summary.product.category || 'Uncategorized'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Period</div>
                  <div className="text-lg">
                    {new Date(summary.period.start_date).toLocaleDateString()} - {new Date(summary.period.end_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Movement Breakdown Chart & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold mb-4">Movement Breakdown</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Sales', value: Math.abs(summary.movement_breakdown.sales.quantity) },
                        { name: 'Transfers', value: Math.abs(summary.movement_breakdown.transfers.net.quantity) },
                        { name: 'Adjustments', value: Math.abs(summary.movement_breakdown.adjustments.net.quantity) }
                      ].filter(d => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      <Cell fill={COLORS.sales} />
                      <Cell fill={COLORS.transfers} />
                      <Cell fill={COLORS.adjustments} />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Summary Stats */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold mb-4">Summary Statistics</h4>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 text-gray-700">Sales</td>
                      <td className="py-2 text-right font-medium text-red-600">
                        -{summary.movement_breakdown.sales.quantity.toLocaleString()}
                      </td>
                      <td className="py-2 text-right text-gray-600">
                        {summary.movement_breakdown.sales.percentage.toFixed(1)}%
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 text-gray-700">Transfers (Net)</td>
                      <td className="py-2 text-right font-medium text-blue-600">
                        {summary.movement_breakdown.transfers.net.quantity > 0 ? '+' : ''}
                        {summary.movement_breakdown.transfers.net.quantity.toLocaleString()}
                      </td>
                      <td className="py-2 text-right text-gray-600">-</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 text-gray-700">Adjustments (Net)</td>
                      <td className="py-2 text-right font-medium text-amber-600">
                        {summary.movement_breakdown.adjustments.net.quantity > 0 ? '+' : ''}
                        {summary.movement_breakdown.adjustments.net.quantity.toLocaleString()}
                      </td>
                      <td className="py-2 text-right text-gray-600">
                        {summary.movement_breakdown.adjustments.percentage.toFixed(1)}%
                      </td>
                    </tr>
                    <tr className="bg-gray-50 font-bold">
                      <td className="py-2">Net Change</td>
                      <td className={`py-2 text-right ${summary.movement_breakdown.net_change.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {summary.movement_breakdown.net_change.quantity > 0 ? '+' : ''}
                        {summary.movement_breakdown.net_change.quantity.toLocaleString()}
                      </td>
                      <td className="py-2 text-right text-gray-900">
                        ${summary.movement_breakdown.net_change.value.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Warehouse Distribution */}
            {summary.warehouse_distribution.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold mb-4">Warehouse Distribution</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={summary.warehouse_distribution}>
                    <XAxis dataKey="warehouse_name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sales" fill={COLORS.sales} name="Sales" />
                    <Bar dataKey="transfers_net" fill={COLORS.transfers} name="Transfers (Net)" />
                    <Bar dataKey="adjustments_net" fill={COLORS.adjustments} name="Adjustments (Net)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Adjustment Types Breakdown */}
            {Object.keys(summary.movement_breakdown.adjustments.by_type).length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold mb-3 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-amber-600" />
                  Adjustment Types
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(summary.movement_breakdown.adjustments.by_type).map(([type, data]) => (
                    <div key={type} className="bg-white rounded-lg p-3">
                      <div className="text-xs text-gray-600 uppercase">{type.replace(/_/g, ' ')}</div>
                      <div className="text-lg font-semibold text-gray-900">{data.quantity}</div>
                      <div className="text-xs text-gray-500">{data.count} transactions</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Close
        </button>
      </Modal.Footer>
    </Modal>
  );
};
```

---

#### **Step 3.4: Add Click-Through from Stock Movements Page** (30 min)

**File**: `src/features/reports/pages/StockMovementsPage.tsx`

**Add imports**:
```typescript
import { ProductMovementSummaryModal } from '../components/ProductMovementSummaryModal';
```

**Add state**:
```typescript
const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
const [selectedProductName, setSelectedProductName] = useState<string>('');
const [showProductSummary, setShowProductSummary] = useState(false);
```

**Update product name cells to be clickable** (in all table renders):
```tsx
<td className="px-6 py-4">
  <button
    onClick={() => {
      setSelectedProductId(movement.product_id);
      setSelectedProductName(movement.product_name);
      setShowProductSummary(true);
    }}
    className="text-left hover:text-blue-600 hover:underline"
  >
    <div className="text-sm font-medium text-gray-900">
      {movement.product_name}
    </div>
    <div className="text-sm text-gray-500">
      SKU: {movement.sku}
    </div>
  </button>
</td>
```

**Add modal at end of component** (before closing `</ReportContainer>`):
```tsx
{/* Product Movement Summary Modal - Phase 3 */}
{selectedProductId && (
  <ProductMovementSummaryModal
    productId={selectedProductId}
    productName={selectedProductName}
    startDate={startDate}
    endDate={endDate}
    isOpen={showProductSummary}
    onClose={() => {
      setShowProductSummary(false);
      setSelectedProductId(null);
      setSelectedProductName('');
    }}
  />
)}
```

**Phase 3 Complete!** ✅

---

### **Phase 4: Analytics Dashboard** (Week 2-3)
**Developer**: Senior Dev (You)  
**Backend Endpoint**: `/reports/api/inventory/movements/analytics/` (NEW)

This phase creates a completely new page following the existing report page patterns.

---

#### **Step 4.1: Add Types** (45 min)

**File**: `src/types/reports.ts`

```typescript
// Add at the end of the file

/**
 * Stock Movement Analytics (Phase 4)
 */
export interface MovementKPIs {
  total_movements: number;
  total_value: number;
  unique_products: number;
  active_warehouses: number;
  movement_velocity: number;
  shrinkage_rate: number;
}

export interface MovementTypeSummary {
  quantity: number;
  value: number;
  transactions: number;
  percentage: number;
}

export interface DailyTrend {
  date: string;
  quantity: number;
  value: number;
  transactions: number;
}

export interface TopMover {
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  value: number;
  transactions: number;
  velocity?: number;
}

export interface WarehousePerformance {
  warehouse_id: string;
  warehouse_name: string;
  warehouse_type: string;
  total_movements: number;
  total_value: number;
  inbound: number;
  outbound: number;
  net_change: number;
}

export interface ShrinkageAnalysis {
  total_shrinkage: number;
  shrinkage_value: number;
  top_shrinkage_products: TopMover[];
  shrinkage_by_type: Record<string, {
    quantity: number;
    value: number;
    count: number;
  }>;
}

export interface PeriodComparison {
  period: string;
  previous_start_date: string;
  previous_end_date: string;
  changes: Record<string, {
    current: number;
    previous: number;
    change: number;
    change_percentage: number;
  }>;
}

export interface MovementAnalytics {
  period: {
    start_date: string;
    end_date: string;
    days: number;
  };
  kpis: MovementKPIs;
  movement_summary: {
    sales: MovementTypeSummary;
    transfers: MovementTypeSummary;
    adjustments: MovementTypeSummary;
  };
  trends: {
    daily: DailyTrend[];
  };
  top_movers: {
    by_volume: TopMover[];
    by_value: TopMover[];
    by_velocity: TopMover[];
  };
  warehouse_performance: WarehousePerformance[];
  shrinkage_analysis: ShrinkageAnalysis;
  comparison?: PeriodComparison;
}

export interface MovementAnalyticsResponse {
  success: boolean;
  data: MovementAnalytics;
  cached?: boolean;
}
```

---

#### **Step 4.2: Add Service Method** (15 min)

**File**: `src/services/reportsService.ts`

```typescript
export const inventoryReportsService = {
  // ... existing methods
  
  /**
   * Get stock movement analytics dashboard data (Phase 4)
   */
  getMovementAnalytics: async (filters: ReportFilters = {}): Promise<MovementAnalyticsResponse> => {
    const response = await reportsApi.get<MovementAnalyticsResponse>(
      `/reports/api/inventory/movements/analytics${buildQueryString(filters)}`
    );
    return response.data;
  },
  
  // ... rest
};
```

---

#### **Step 4.3: Create Analytics Dashboard Page** (Full day - 8 hours)

**File**: `src/features/reports/pages/StockMovementsAnalytics.tsx` (NEW FILE)

This is a large file - see the next response for the complete implementation following all patterns!

**Phase 4 will be delivered in the next message due to length...**

---

## 📊 Success Criteria

### Phase 1 Complete When:
- ✅ `product_ids` parameter works in existing getStockMovements
- ✅ Product multi-select UI functional
- ✅ Filtering by 1+ products displays correct data

### Phase 2 Complete When:
- ✅ Product search autocomplete works (2+ chars triggers search)
- ✅ All 4 quick filters return product lists
- ✅ Selected products populate main table

### Phase 3 Complete When:
- ✅ Clicking product name opens summary modal
- ✅ Pie chart and bar chart render correctly
- ✅ All calculations displayed (from backend)

### Phase 4 Complete When:
- ✅ Analytics dashboard page created
- ✅ 6 KPI cards display metrics
- ✅ All charts render (pie, line, bar)
- ✅ Top movers tabs functional
- ✅ Cache indicator shows when data is cached

---

## 🎯 Next Action Items

### **TODAY** (Senior Dev - You)
1. [ ] Review backend requirements document (1 hour)
2. [ ] Review all 4 phase completion documents (1 hour)
3. [ ] Install recharts: `npm install recharts` (2 min)
4. [ ] Test backend API endpoints with curl (15 min)
5. [ ] Create task breakdown for team (30 min)

### **Monday** (Team)
1. [ ] Kickoff meeting - review this plan (1 hour)
2. [ ] Assign phases to developers
3. [ ] Senior Dev starts Phase 1 (product filtering)
4. [ ] Dev 2 prepares for Phase 2 (search & filters)
5. [ ] Dev 3 prepares for Phase 3 (product summary)

### **Week 1 Goal**
- ✅ Phases 1 & 2 complete and tested
- ✅ Users can filter by products and use quick filters

### **Week 2-3 Goal**
- ✅ Phases 3 & 4 complete
- ✅ Full analytics dashboard deployed

---

**Estimated Timeline**: 2-3 weeks  
**Risk Level**: **LOW** (Backend complete, following established patterns)  
**Confidence**: **HIGH** (Clear specs, existing codebase patterns)
