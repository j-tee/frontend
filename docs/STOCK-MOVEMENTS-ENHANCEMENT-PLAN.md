# 📊 Stock Movements Enhancement - Complete Implementation Plan# Stock Movement History - Enhancement Plan



**Date:** November 1, 2025  ## Date: October 16, 2025

**Status:** 🎯 READY TO IMPLEMENT  

**Goal:** Transform Stock Movements into a comprehensive inventory analytics platform---



---## Current Status



## 🎯 Executive Summary**File:** `src/features/reports/pages/StockMovementsPage.tsx`

- ❌ No currency globalization (useCurrency hook not used)

Enhance the Stock Movements page to provide deep product-level insights, movement analytics, and drill-down capabilities. This will help answer critical business questions:- ❌ Limited filters (only movement type)

- "How much of Product X have we sold this month?"- ❌ No search functionality

- "Which products have the most shrinkage?"- ❌ Basic pagination (page-based only)

- "Why is our stock decreasing faster than sales?"- ❌ No warehouse/category filter dropdowns

- "Where did this product go?" (track transfers)- ❌ No advanced sorting options



------



## 📐 Current State Assessment## Enhancement Goals



### ✅ What We Have (Already Implemented)Similar to Stock Levels & Low Stock Alerts, we will add:

- Tabbed interface (All, Sales, Transfers, Adjustments)

- Summary cards showing movement totals1. ✅ **Currency Globalization** - Add useCurrency hook

- Date range filtering2. ✅ **Search Functionality** - Search by product name/SKU

- Movement detail modal with click-through3. ✅ **Enhanced Filters** - Warehouse, Category, Movement Type, Reference Type

- Warehouse and category filtering4. ✅ **Server-Side Pagination** - Full pagination controls

- Search by product name/SKU5. ✅ **Advanced Sorting** - Multiple sort options

- Pagination support6. ✅ **Clear All Filters** - One-click reset

- CSV export7. ✅ **Mobile Responsive** - Improved mobile UX

- Clear UI labels explaining post-acquisition tracking

---

### 🎯 What We Need (To Be Implemented)

## Stock Movement Types

1. **Product drill-down from Stock Levels page**

2. **Enhanced filtering with product selector**The system tracks 4 types of inventory movements:

3. **Per-product movement summary**

4. **Movement analytics dashboard**### 1. **IN** (Stock Increases)

5. **Visual trend charts**- Icon: TrendingUp (green)

6. **Top products reports**- Sources:

  - Purchase Orders

---  - Returns from customers

  - Stock adjustments (increase)

## 🗺️ Implementation Phases  - Transfers IN from other warehouses



### **PHASE 1: Product Drill-Down** 🥇### 2. **OUT** (Stock Decreases)

**Priority:** HIGH | **Effort:** Low (1-2 days) | **Value:** High- Icon: TrendingDown (red)

- Sources:

#### Deliverables:  - Sales (completed)

1. ✅ Add "View Movements" button/link to Stock Levels page table  - Damaged/expired items

2. ✅ Create product context for StockMovementsPage  - Stock adjustments (decrease)

3. ✅ Filter movements by selected product  - Transfers OUT to other warehouses

4. ✅ Show product-specific summary

### 3. **TRANSFER** (Inter-warehouse)

#### Implementation Details:- Icon: ArrowRight (blue)

- Sources:

**Step 1.1: Modify Stock Levels Page**  - Warehouse-to-warehouse transfers

File: `src/features/reports/pages/StockLevelsPage.tsx`  - Location changes within facility



Add click handler and button to product rows:### 4. **ADJUSTMENT** (Manual Changes)

- Icon: Activity (amber)

```tsx- Sources:

// Add import  - Stock count corrections

import { Activity } from 'lucide-react';  - Reconciliation adjustments

import { useNavigate } from 'react-router-dom';  - Administrative corrections



// In component---

const navigate = useNavigate();

## Reference Types

const handleViewMovements = (productId: string, productName: string) => {

  navigate(`/app/reports/inventory/stock-movements?product_id=${productId}&product_name=${encodeURIComponent(productName)}`);Each movement links to a source transaction:

};

1. **purchase_order** - Stock received from supplier

// In table rendering (add to LAST RESTOCK column or new column)2. **sale** - Stock sold to customer

<td className="px-6 py-4 whitespace-nowrap">3. **transfer** - Inter-warehouse movement

  <button4. **adjustment** - Manual stock correction

    onClick={() => handleViewMovements(item.product_id, item.name)}

    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 hover:text-blue-700 transition-colors"---

    title="View movement history for this product"

  >## Planned Filters

    <Activity className="w-4 h-4 mr-1.5" />

    View Movements### **Current Filters:**

  </button>- Date Range (start_date, end_date)

</td>- Movement Type (in/out/adjustment/transfer)

```- Product ID (hidden, not user-facing)

- Warehouse ID (hidden, not user-facing)

**Step 1.2: Modify Stock Movements Page**

File: `src/features/reports/pages/StockMovementsPage.tsx`### **New Filters to Add:**

1. **Search** - Product name or SKU

Add URL parameter support and product context:2. **Warehouse Dropdown** - Filter by location

3. **Category Dropdown** - Filter by product category

```tsx4. **Reference Type Dropdown** - Filter by source (PO, Sale, etc.)

// Add at top of component (after existing state declarations)5. **Movement Type** - Already exists, keep as is

const searchParams = new URLSearchParams(window.location.search);6. **Clear All Button** - Reset all filters

const productIdParam = searchParams.get('product_id');

const productNameParam = searchParams.get('product_name');---



const [productId, setProductId] = useState<string>(productIdParam || '');## Planned Sort Options



// Update fetchData to include product_id filterCurrently: No explicit sorting (likely chronological by default)

useEffect(() => {

  const params = {**Add:**

    // ... existing params1. **Date** - Newest/Oldest first

    product_id: productId || undefined,2. **Quantity** - Largest/Smallest movements

  };3. **Product Name** - Alphabetical

  // ... rest of fetch logic4. **Movement Type** - Group by type

}, [productId, /* other dependencies */]);

---

// Add product context banner (insert after info banner, before summary cards)

{productId && productNameParam && (## Pagination Enhancement

  <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-5 mb-6 shadow-sm">

    <div className="flex items-center justify-between">**Current:**

      <div className="flex items-center space-x-4">- Page-based navigation

        <div className="bg-blue-600 rounded-full p-2">- Page size: 50 (fixed)

          <Package className="w-6 h-6 text-white" />

        </div>**Add:**

        <div>- Page size selector (10/20/50/100)

          <h4 className="text-lg font-bold text-blue-900">- First/Previous/Next/Last buttons

            {productNameParam}- Smart page numbers (max 5 shown)

          </h4>- Item counter ("Showing X to Y of Z")

          <p className="text-sm text-blue-700 mt-1">- Auto-scroll on page change

            Showing all movement transactions for this product

          </p>---

        </div>

      </div>## Backend Requirements

      <button

        onClick={() => {The backend API endpoint should support:

          setProductId('');

          window.history.pushState({}, '', '/app/reports/inventory/stock-movements');**Endpoint:** `GET /reports/api/inventory/movements`

          fetchData();

        }}**Current Parameters:**

        className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"- `start_date`

      >- `end_date`

        <X className="w-4 h-4 mr-2" />- `product_id`

        Clear Filter- `warehouse_id`

      </button>- `movement_type`

    </div>- `page`

  </div>- `page_size`

)}

```**New Parameters Needed:**

- `search` - Product name/SKU search

**Step 1.3: Backend Verification**- `category_id` - Filter by category

Check if backend supports `product_id` parameter:- `reference_type` - Filter by source (purchase_order/sale/transfer/adjustment)

```bash- `sort_by` - Sort field (date/quantity/product/type)

# Test API endpoint- `sort_order` - asc/desc

curl "http://localhost:8000/reports/api/inventory/movements/?product_id=PRODUCT_UUID" \

  -H "Authorization: Bearer TOKEN"**Response Structure Needed:**

``````json

{

If NOT supported, backend needs to add:  "success": true,

```python  "data": {

# In backend view    "summary": {

product_id = request.GET.get('product_id')      "total_movements": 150,

if product_id:      "total_in": 60,

    queryset = queryset.filter(product_id=product_id)      "total_out": 70,

```      "total_adjustments": 10,

      "total_transfers": 10

**Success Criteria:**    },

- ✅ Click "View Movements" in Stock Levels → navigates to filtered page    "movements": [...],

- ✅ Product context banner shows selected product    "by_warehouse": {

- ✅ Only movements for that product are displayed      "uuid": {

- ✅ Can clear filter to see all movements        "name": "Main Warehouse",

        "movements": 80,

---        "net_change": +150

      }

### **PHASE 2: Enhanced Filtering & Product Selector** 🥈    },

**Priority:** HIGH | **Effort:** Medium (2-3 days) | **Value:** High    "by_category": {

      "uuid": {

#### Deliverables:        "name": "Electronics",

1. ✅ Product autocomplete/select dropdown        "movements": 45,

2. ✅ Multi-select filtering (select multiple products)        "net_change": -20

3. ✅ Quick filter buttons (Top Sellers, Most Adjusted)      }

4. ✅ Filter presets    }

  },

#### Implementation Details:  "meta": {

    "pagination": {

**Step 2.1: Create Product Selector Component**      "page": 1,

File: `src/features/reports/components/ProductSelector.tsx` (NEW)      "page_size": 20,

      "total_count": 150,

```tsx      "total_pages": 8

import React, { useState, useEffect } from 'react';    }

import { Search, X, Package } from 'lucide-react';  }

import { inventoryReportsService } from '../../../services/reportsService';}

```

interface ProductSelectorProps {

  selectedProductIds: string[];---

  onSelectionChange: (ids: string[]) => void;

  placeholder?: string;## Data Structure

}

### **StockMovement Interface:**

interface Product {

  id: string;```typescript

  name: string;export interface StockMovement {

  sku: string;  movement_id: string;

}  product_id: string;

  product_name: string;

export const ProductSelector: React.FC<ProductSelectorProps> = ({  sku: string;

  selectedProductIds,  warehouse_id: string;

  onSelectionChange,  warehouse_name: string;

  placeholder = "Search products..."  movement_type: 'in' | 'out' | 'adjustment' | 'transfer';

}) => {  quantity: number;

  const [searchQuery, setSearchQuery] = useState('');  quantity_before: number;

  const [products, setProducts] = useState<Product[]>([]);  quantity_after: number;

  const [loading, setLoading] = useState(false);  reference_type: 'purchase_order' | 'sale' | 'transfer' | 'adjustment';

  const [showDropdown, setShowDropdown] = useState(false);  reference_id: string;

  performed_by: string;

  useEffect(() => {  performed_by_id: string;

    if (searchQuery.length < 2) {  notes: string;

      setProducts([]);  created_at: string;  // ISO datetime

      return;}

    }```



    const timer = setTimeout(async () => {### **StockMovementsResponse Interface:**

      setLoading(true);

      try {```typescript

        // Call API to search productsexport interface StockMovementsResponse {

        const response = await inventoryReportsService.searchProducts(searchQuery);  success: boolean;

        setProducts(response.data || []);  data: {

      } catch (err) {    summary: {

        console.error('Product search error:', err);      total_movements: number;

      } finally {      total_in: number;

        setLoading(false);      total_out: number;

      }      total_adjustments: number;

    }, 300);      total_transfers: number;

    };

    return () => clearTimeout(timer);    movements: StockMovement[];

  }, [searchQuery]);    by_warehouse?: Record<string, {

      name: string;

  const handleAddProduct = (product: Product) => {      movements: number;

    if (!selectedProductIds.includes(product.id)) {      net_change: number;

      onSelectionChange([...selectedProductIds, product.id]);    }>;

    }    by_category?: Record<string, {

    setSearchQuery('');      name: string;

    setShowDropdown(false);      movements: number;

  };      net_change: number;

    }>;

  const handleRemoveProduct = (productId: string) => {  };

    onSelectionChange(selectedProductIds.filter(id => id !== productId));  meta?: {

  };    pagination?: {

      page: number;

  return (      page_size: number;

    <div className="relative">      total_count: number;

      {/* Search Input */}      total_pages: number;

      <div className="relative">    };

        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />  };

        <input}

          type="text"```

          value={searchQuery}

          onChange={(e) => {---

            setSearchQuery(e.target.value);

            setShowDropdown(true);## UI Components to Add

          }}

          onFocus={() => setShowDropdown(true)}### 1. **Filters Section**

          placeholder={placeholder}```tsx

          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"<div className="bg-white rounded-lg border p-6 mb-6">

        />  <div className="flex items-center justify-between mb-4">

      </div>    <div className="flex items-center space-x-2">

      <Filter className="w-5 h-5" />

      {/* Dropdown */}      <h3>Filters</h3>

      {showDropdown && searchQuery.length >= 2 && (    </div>

        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">    <button onClick={clearFilters}>Clear All</button>

          {loading ? (  </div>

            <div className="p-4 text-center text-gray-500">Searching...</div>  

          ) : products.length === 0 ? (  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            <div className="p-4 text-center text-gray-500">No products found</div>    {/* Search */}

          ) : (    {/* Warehouse */}

            products.map((product) => (    {/* Category */}

              <button    {/* Movement Type */}

                key={product.id}    {/* Reference Type */}

                onClick={() => handleAddProduct(product)}  </div>

                className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center justify-between"</div>

                disabled={selectedProductIds.includes(product.id)}```

              >

                <div>### 2. **Pagination Controls**

                  <div className="font-medium text-gray-900">{product.name}</div>```tsx

                  <div className="text-sm text-gray-500">SKU: {product.sku}</div><div className="flex items-center justify-between">

                </div>  {/* Page size selector */}

                {selectedProductIds.includes(product.id) && (  <div className="flex items-center space-x-2">

                  <span className="text-xs text-green-600 font-medium">Selected</span>    <label>Items per page:</label>

                )}    <select value={pageSize} onChange={...}>

              </button>      <option>10</option>

            ))      <option>20</option>

          )}      <option>50</option>

        </div>      <option>100</option>

      )}    </select>

  </div>

      {/* Selected Products Chips */}  

      {selectedProductIds.length > 0 && (  {/* Page navigation */}

        <div className="mt-2 flex flex-wrap gap-2">  <div className="flex items-center space-x-2">

          {selectedProductIds.map((id) => (    <button>First</button>

            <div    <button>Previous</button>

              key={id}    {/* Page numbers */}

              className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"    <button>Next</button>

            >    <button>Last</button>

              <Package className="w-3 h-3 mr-1" />  </div>

              <span>Product {id.substring(0, 8)}...</span></div>

              <button```

                onClick={() => handleRemoveProduct(id)}

                className="ml-2 hover:text-blue-900"### 3. **Enhanced Movement Table**

              >- Add sort arrows to column headers

                <X className="w-3 h-3" />- Color-code movement types

              </button>- Show before → after quantities

            </div>- Link to reference transactions

          ))}- Display performer name/timestamp

        </div>

      )}---

    </div>

  );## Implementation Steps

};

```### **Phase 1: Frontend Enhancements**

1. Add `useCurrency` hook import

**Step 2.2: Add Quick Filters**2. Add search state and input

File: `src/features/reports/pages/StockMovementsPage.tsx`3. Add warehouse/category filter dropdowns

4. Add reference type filter

```tsx5. Add pagination controls

// Add to filters section (after existing filters)6. Add sort options

<div className="mt-6 pt-6 border-t border-gray-200">7. Add clear all filters button

  <label className="block text-sm font-medium text-gray-700 mb-3">8. Update type definitions

    Quick Filters

  </label>### **Phase 2: Backend Updates**

  <div className="flex flex-wrap gap-2">1. Add search parameter support

    <button2. Add category_id filter

      onClick={() => applyQuickFilter('top_sellers')}3. Add reference_type filter

      className="inline-flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors font-medium"4. Add sort_by and sort_order

    >5. Build by_warehouse grouping

      🔥 Top Sellers (Last 30 Days)6. Build by_category grouping

    </button>7. Update response structure

    <button8. Add `.distinct()` to queryset

      onClick={() => applyQuickFilter('most_adjusted')}

      className="inline-flex items-center px-4 py-2 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 transition-colors font-medium"### **Phase 3: Testing**

    >1. Test all filters

      ⚖️ Most Adjusted2. Test pagination

    </button>3. Test sorting

    <button4. Test currency formatting

      onClick={() => applyQuickFilter('high_transfers')}5. Test mobile responsiveness

      className="inline-flex items-center px-4 py-2 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition-colors font-medium"

    >---

      🔄 High Transfer Activity

    </button>## Success Criteria

    <button

      onClick={() => applyQuickFilter('shrinkage')}### **Functionality:**

      className="inline-flex items-center px-4 py-2 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors font-medium"- ✅ Currency displays using global settings

    >- ✅ Search filters movements by product

      ⚠️ Shrinkage Issues- ✅ All filters work independently and together

    </button>- ✅ Pagination works correctly

  </div>- ✅ Sort options apply properly

</div>- ✅ Clear all resets to defaults



// Add handler function### **Performance:**

const applyQuickFilter = async (filterType: string) => {- ⚡ Page load < 2 seconds

  setLoading(true);- ⚡ Filter response < 500ms

  try {- ⚡ Pagination < 300ms

    const response = await inventoryReportsService.getQuickFilterProducts(filterType, {

      start_date: startDate,### **UX:**

      end_date: endDate- ✅ Mobile responsive

    });- ✅ Clear visual hierarchy

    if (response.product_ids) {- ✅ Intuitive filter controls

      setSelectedProductIds(response.product_ids);- ✅ No console errors/warnings

      setPage(1);

      fetchData();---

    }

  } catch (err) {## Next Steps

    console.error('Quick filter error:', err);

    alert('Quick filter failed. Feature may require backend support.');1. **Review current implementation** - Check what already exists

  } finally {2. **Update frontend** - Add all enhancements

    setLoading(false);3. **Update backend** - Add missing features

  }4. **Test thoroughly** - Verify all functionality

};5. **Document changes** - Create complete summary

```

---

**Step 2.3: Backend API Support**

New endpoints needed:**Status:** ⏳ **READY TO START**



```python**Priority:** HIGH (Next on inventory reports index)

# /reports/api/inventory/products/search/

# GET with ?q=search_term**Estimated Time:** 1-2 hours

# Returns: [{"id": "uuid", "name": "Product Name", "sku": "SKU-123"}, ...]

---

# /reports/api/inventory/movements/quick-filters/

# GET with ?filter_type=top_sellers&start_date=...&end_date=...**Prepared by:** GitHub Copilot  

# Returns: {"product_ids": ["uuid1", "uuid2", ...]}**Date:** October 16, 2025

```

**Success Criteria:**
- ✅ Can search and select products from dropdown
- ✅ Selected products show as chips
- ✅ Quick filters populate product list automatically
- ✅ Movements filter to selected products

---

### **PHASE 3: Per-Product Movement Summary** 🥉
**Priority:** HIGH | **Effort:** Medium (3-4 days) | **Value:** High

#### Deliverables:
1. ✅ Product-level summary cards
2. ✅ Net change calculation
3. ✅ Movement type breakdown per product
4. ✅ Warehouse distribution

#### Implementation Details:

**Step 3.1: Create Product Movement Summary Component**
File: `src/features/reports/components/ProductMovementSummary.tsx` (NEW)

```tsx
import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, TrendingDown, ArrowRight, Activity, Warehouse } from 'lucide-react';
import { inventoryReportsService } from '../../../services/reportsService';
import { useCurrency } from '../../../hooks/useCurrency';

interface ProductMovementSummaryProps {
  productId: string;
  productName: string;
  startDate: string;
  endDate: string;
}

interface MovementSummaryData {
  product_id: string;
  product_name: string;
  current_stock: number;
  movements: {
    sales: number;
    transfers_in: number;
    transfers_out: number;
    adjustments_up: number;
    adjustments_down: number;
  };
  net_change: number;
  by_warehouse: Array<{
    warehouse_id: string;
    warehouse_name: string;
    quantity: number;
    percentage: number;
  }>;
}

export const ProductMovementSummary: React.FC<ProductMovementSummaryProps> = ({
  productId,
  productName,
  startDate,
  endDate
}) => {
  const { formatCurrency } = useCurrency();
  const [data, setData] = useState<MovementSummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await inventoryReportsService.getProductMovementSummary({
          product_id: productId,
          start_date: startDate,
          end_date: endDate
        });
        setData(response.data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [productId, startDate, endDate]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">Failed to load summary: {error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { movements, net_change, current_stock, by_warehouse } = data;

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 rounded-lg p-2">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Movement Summary</h3>
            <p className="text-sm text-gray-600">
              {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Current Stock</div>
          <div className="text-2xl font-bold text-gray-900">{current_stock.toLocaleString()} units</div>
        </div>
      </div>

      {/* Movement Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Sales */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-900">Sales</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-red-600">
            {movements.sales} units
          </div>
        </div>

        {/* Transfers In */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Transfers In</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-green-600">
            +{movements.transfers_in} units
          </div>
        </div>

        {/* Transfers Out */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <ArrowRight className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Transfers Out</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {movements.transfers_out} units
          </div>
        </div>

        {/* Adjustments Up */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Adjustments Up</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-green-600">
            +{movements.adjustments_up} units
          </div>
        </div>

        {/* Adjustments Down */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-900">Adjustments Down</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {movements.adjustments_down} units
          </div>
          <div className="text-xs text-amber-700 mt-1">Shrinkage/Damage</div>
        </div>

        {/* Net Change */}
        <div className={`border-2 rounded-lg p-4 ${
          net_change >= 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Activity className={`w-5 h-5 ${net_change >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              <span className={`text-sm font-medium ${net_change >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                Net Change
              </span>
            </div>
          </div>
          <div className={`text-2xl font-bold ${net_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {net_change >= 0 ? '+' : ''}{net_change} units
          </div>
        </div>
      </div>

      {/* Warehouse Distribution */}
      {by_warehouse.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
            <Warehouse className="w-4 h-4 mr-2" />
            Distribution by Location
          </h4>
          <div className="space-y-2">
            {by_warehouse.map((warehouse) => (
              <div key={warehouse.warehouse_id} className="flex items-center">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {warehouse.warehouse_name}
                    </span>
                    <span className="text-sm text-gray-600">
                      {warehouse.quantity.toLocaleString()} units ({warehouse.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${warehouse.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

**Step 3.2: Integrate into Stock Movements Page**
File: `src/features/reports/pages/StockMovementsPage.tsx`

```tsx
import { ProductMovementSummary } from '../components/ProductMovementSummary';

// Add after product context banner
{productId && productNameParam && (
  <ProductMovementSummary
    productId={productId}
    productName={productNameParam}
    startDate={startDate}
    endDate={endDate}
  />
)}
```

**Step 3.3: Backend API**
New endpoint: `/reports/api/inventory/movements/product-summary/`

```python
# Expected response:
{
  "success": true,
  "data": {
    "product_id": "uuid",
    "product_name": "Samsung TV 43\"",
    "current_stock": 404,
    "movements": {
      "sales": -145,
      "transfers_in": 28,
      "transfers_out": -35,
      "adjustments_up": 5,
      "adjustments_down": -8
    },
    "net_change": -155,
    "by_warehouse": [
      {
        "warehouse_id": "uuid",
        "warehouse_name": "Main Warehouse",
        "quantity": 145,
        "percentage": 35.89
      }
    ]
  }
}
```

**Success Criteria:**
- ✅ Summary shows when viewing single product
- ✅ All movement types calculated correctly
- ✅ Net change is accurate
- ✅ Warehouse distribution percentages add up to 100%

---

### **PHASE 4: Movement Analytics Dashboard** 🏅
**Priority:** MEDIUM | **Effort:** High (5-7 days) | **Value:** High

#### Deliverables:
1. ✅ Top selling products chart
2. ✅ Movement type distribution chart
3. ✅ Daily trend line chart
4. ✅ Products with most shrinkage table
5. ✅ Key metrics cards

#### Implementation Details:

**Step 4.1: Install Charting Library**
```bash
npm install recharts
```

**Step 4.2: Create Chart Components**

File: `src/features/reports/components/charts/TopProductsChart.tsx` (NEW)

```tsx
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface TopProductsChartProps {
  data: Array<{
    product_name: string;
    quantity_sold: number;
  }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const TopProductsChart: React.FC<TopProductsChartProps> = ({ data }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Top Selling Products
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="product_name" 
            angle={-45}
            textAnchor="end"
            height={100}
          />
          <YAxis />
          <Tooltip />
          <Bar dataKey="quantity_sold" name="Units Sold">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
```

File: `src/features/reports/components/charts/MovementTrendChart.tsx` (NEW)

```tsx
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface MovementTrendChartProps {
  data: Array<{
    date: string;
    sales: number;
    transfers: number;
    adjustments: number;
  }>;
}

export const MovementTrendChart: React.FC<MovementTrendChartProps> = ({ data }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Movement Trend (Daily)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="sales" stroke="#EF4444" name="Sales" strokeWidth={2} />
          <Line type="monotone" dataKey="transfers" stroke="#3B82F6" name="Transfers" strokeWidth={2} />
          <Line type="monotone" dataKey="adjustments" stroke="#F59E0B" name="Adjustments" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
```

File: `src/features/reports/components/charts/MovementBreakdownChart.tsx` (NEW)

```tsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface MovementBreakdownChartProps {
  data: {
    sales: number;
    transfers: number;
    adjustments: number;
  };
}

const COLORS = {
  sales: '#EF4444',
  transfers: '#3B82F6',
  adjustments: '#F59E0B'
};

export const MovementBreakdownChart: React.FC<MovementBreakdownChartProps> = ({ data }) => {
  const chartData = [
    { name: 'Sales', value: Math.abs(data.sales) },
    { name: 'Transfers', value: Math.abs(data.transfers) },
    { name: 'Adjustments', value: Math.abs(data.adjustments) }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Movement Type Breakdown
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
```

**Step 4.3: Create Analytics Dashboard Component**

File: `src/features/reports/components/MovementAnalyticsDashboard.tsx` (NEW)

```tsx
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { inventoryReportsService } from '../../../services/reportsService';
import { TopProductsChart } from './charts/TopProductsChart';
import { MovementTrendChart } from './charts/MovementTrendChart';
import { MovementBreakdownChart } from './charts/MovementBreakdownChart';
import { useCurrency } from '../../../hooks/useCurrency';

interface AnalyticsDashboardProps {
  startDate: string;
  endDate: string;
}

export const MovementAnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  startDate,
  endDate
}) => {
  const { formatCurrency } = useCurrency();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await inventoryReportsService.getMovementAnalytics({
          start_date: startDate,
          end_date: endDate
        });
        setData(response.data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [startDate, endDate]);

  if (loading) {
    return <div className="text-center py-12">Loading analytics...</div>;
  }

  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">
          Analytics dashboard requires backend support. Feature coming soon!
        </p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Avg Daily Movement</span>
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {data.metrics?.avg_daily_movement || 0} units
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Movement Value</span>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(data.metrics?.total_movement_value || 0)}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Stock Velocity</span>
            <TrendingDown className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {data.metrics?.stock_velocity_days || 0} days
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Products Moved</span>
            <Activity className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {data.metrics?.unique_products || 0}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProductsChart data={data.top_sellers || []} />
        <MovementBreakdownChart data={data.movement_breakdown || {}} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <MovementTrendChart data={data.daily_trend || []} />
      </div>

      {/* Shrinkage Table */}
      {data.shrinkage_leaders && data.shrinkage_leaders.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Products with Most Shrinkage
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Product
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Shrinkage
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Value Impact
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.shrinkage_leaders.map((item: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {item.product_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-red-600">
                      {item.quantity} units
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {formatCurrency(item.value_impact || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
```

**Step 4.4: Add Analytics Tab to Stock Movements Page**

File: `src/features/reports/pages/StockMovementsPage.tsx`

```tsx
import { MovementAnalyticsDashboard } from '../components/MovementAnalyticsDashboard';

// Add new tab to the Tabs component
<Tab 
  eventKey="analytics" 
  title={
    <span className="flex items-center space-x-2">
      <Activity className="w-4 h-4" />
      <span>Analytics</span>
    </span>
  }
>
  <div className="p-6">
    <MovementAnalyticsDashboard
      startDate={startDate}
      endDate={endDate}
    />
  </div>
</Tab>
```

**Step 4.5: Backend API**

New endpoint: `/reports/api/inventory/movements/analytics/`

Expected response structure documented in plan above.

**Success Criteria:**
- ✅ All charts render correctly
- ✅ Data updates when date range changes
- ✅ Charts are interactive (tooltips, hover states)
- ✅ Dashboard answers key business questions

---

## 🚀 Recommended Implementation Order

### Week 1: Phase 1 (Days 1-2)
**Goal:** Get product drill-down working
- Start with backend verification
- Implement Stock Levels "View Movements" button
- Add product filtering to Stock Movements page
- Test end-to-end flow

### Week 2: Phase 2 (Days 3-5)
**Goal:** Enhanced filtering
- Create ProductSelector component
- Add quick filters
- Backend work on product search API
- Integration and testing

### Week 3: Phase 3 (Days 6-9)
**Goal:** Product summaries
- Create ProductMovementSummary component
- Backend API for summary endpoint
- Integration with Stock Movements page
- Testing with real data

### Week 4: Phase 4 (Days 10-16)
**Goal:** Analytics dashboard
- Install and configure recharts
- Create chart components
- Build analytics dashboard
- Backend analytics API
- Final testing and polish

---

## 📋 Implementation Checklist

### Phase 1: Product Drill-Down
- [ ] Backend: Verify `product_id` parameter support
- [ ] Frontend: Add "View Movements" button to Stock Levels
- [ ] Frontend: Add URL parameter reading to Stock Movements
- [ ] Frontend: Add product context banner
- [ ] Frontend: Implement filter clearing
- [ ] Test: End-to-end drill-down flow
- [ ] Test: Filter clearing works
- [ ] Document: User guide for feature

### Phase 2: Enhanced Filtering
- [ ] Backend: Create product search endpoint
- [ ] Backend: Create quick filters endpoint
- [ ] Frontend: Create ProductSelector component
- [ ] Frontend: Add quick filter buttons
- [ ] Frontend: Integrate ProductSelector
- [ ] Test: Product search works
- [ ] Test: Quick filters populate correctly
- [ ] Test: Multi-select works
- [ ] Document: API documentation

### Phase 3: Product Summary
- [ ] Backend: Create product summary endpoint
- [ ] Backend: Calculate movement aggregations
- [ ] Backend: Calculate warehouse distribution
- [ ] Frontend: Create ProductMovementSummary component
- [ ] Frontend: Integrate into Stock Movements page
- [ ] Test: Summary data accuracy
- [ ] Test: Warehouse percentages add to 100%
- [ ] Test: Net change calculation
- [ ] Document: Component usage

### Phase 4: Analytics Dashboard
- [ ] Install recharts library
- [ ] Backend: Create analytics endpoint
- [ ] Backend: Calculate daily trends
- [ ] Backend: Calculate top products
- [ ] Frontend: Create TopProductsChart
- [ ] Frontend: Create MovementTrendChart
- [ ] Frontend: Create MovementBreakdownChart
- [ ] Frontend: Create MovementAnalyticsDashboard
- [ ] Frontend: Add Analytics tab
- [ ] Test: Charts render correctly
- [ ] Test: Data updates with filters
- [ ] Test: Mobile responsiveness
- [ ] Document: Analytics guide

---

## 🎯 Success Metrics

### User Success Metrics
- Users can answer "How much of Product X sold?" in <5 clicks
- Users can identify shrinkage issues in <10 seconds
- Dashboard loads in <3 seconds
- 90% of movement questions answered without backend queries

### Technical Success Metrics
- All API calls < 2 seconds response time
- Charts render in < 1 second
- Zero console errors
- 100% TypeScript type coverage
- Mobile responsive (works on 375px width)

---

## 📚 Resources & References

### Libraries
- **recharts**: https://recharts.org/
- **react-select**: https://react-select.com/

### Design Inspiration
- Shopify Analytics Dashboard
- WooCommerce Reports
- Square Dashboard

### Internal Documentation
- `STOCK-MOVEMENTS-FINAL-RESOLUTION.md`
- `BACKEND-VERIFICATION-STOCK-MOVEMENTS-SUMMARY.md`
- `StockMovementsPage.tsx` (current implementation)

---

## ✅ Final Notes

This plan provides a complete roadmap for transforming the Stock Movements page into a powerful analytics tool. Each phase builds on the previous one, ensuring incremental value delivery.

**Key Principles:**
1. **Incremental delivery** - Each phase provides immediate value
2. **Backend collaboration** - Clear API requirements documented
3. **User-centric** - Focused on answering real business questions
4. **Maintainable** - Reusable components and clear structure

**Next Actions:**
1. Review with stakeholders
2. Get backend team commitment on timelines
3. Begin Phase 1 implementation
4. Set up regular progress check-ins

---

**Document Status:** ✅ READY FOR IMPLEMENTATION  
**Created:** November 1, 2025  
**Estimated Timeline:** 4 weeks  
**Estimated Effort:** 80-100 hours  
**Business Value:** HIGH
