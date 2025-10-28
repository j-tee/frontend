# Stock Movement History - Enhancement Plan

## Date: October 16, 2025

---

## Current Status

**File:** `src/features/reports/pages/StockMovementsPage.tsx`
- ❌ No currency globalization (useCurrency hook not used)
- ❌ Limited filters (only movement type)
- ❌ No search functionality
- ❌ Basic pagination (page-based only)
- ❌ No warehouse/category filter dropdowns
- ❌ No advanced sorting options

---

## Enhancement Goals

Similar to Stock Levels & Low Stock Alerts, we will add:

1. ✅ **Currency Globalization** - Add useCurrency hook
2. ✅ **Search Functionality** - Search by product name/SKU
3. ✅ **Enhanced Filters** - Warehouse, Category, Movement Type, Reference Type
4. ✅ **Server-Side Pagination** - Full pagination controls
5. ✅ **Advanced Sorting** - Multiple sort options
6. ✅ **Clear All Filters** - One-click reset
7. ✅ **Mobile Responsive** - Improved mobile UX

---

## Stock Movement Types

The system tracks 4 types of inventory movements:

### 1. **IN** (Stock Increases)
- Icon: TrendingUp (green)
- Sources:
  - Purchase Orders
  - Returns from customers
  - Stock adjustments (increase)
  - Transfers IN from other warehouses

### 2. **OUT** (Stock Decreases)
- Icon: TrendingDown (red)
- Sources:
  - Sales (completed)
  - Damaged/expired items
  - Stock adjustments (decrease)
  - Transfers OUT to other warehouses

### 3. **TRANSFER** (Inter-warehouse)
- Icon: ArrowRight (blue)
- Sources:
  - Warehouse-to-warehouse transfers
  - Location changes within facility

### 4. **ADJUSTMENT** (Manual Changes)
- Icon: Activity (amber)
- Sources:
  - Stock count corrections
  - Reconciliation adjustments
  - Administrative corrections

---

## Reference Types

Each movement links to a source transaction:

1. **purchase_order** - Stock received from supplier
2. **sale** - Stock sold to customer
3. **transfer** - Inter-warehouse movement
4. **adjustment** - Manual stock correction

---

## Planned Filters

### **Current Filters:**
- Date Range (start_date, end_date)
- Movement Type (in/out/adjustment/transfer)
- Product ID (hidden, not user-facing)
- Warehouse ID (hidden, not user-facing)

### **New Filters to Add:**
1. **Search** - Product name or SKU
2. **Warehouse Dropdown** - Filter by location
3. **Category Dropdown** - Filter by product category
4. **Reference Type Dropdown** - Filter by source (PO, Sale, etc.)
5. **Movement Type** - Already exists, keep as is
6. **Clear All Button** - Reset all filters

---

## Planned Sort Options

Currently: No explicit sorting (likely chronological by default)

**Add:**
1. **Date** - Newest/Oldest first
2. **Quantity** - Largest/Smallest movements
3. **Product Name** - Alphabetical
4. **Movement Type** - Group by type

---

## Pagination Enhancement

**Current:**
- Page-based navigation
- Page size: 50 (fixed)

**Add:**
- Page size selector (10/20/50/100)
- First/Previous/Next/Last buttons
- Smart page numbers (max 5 shown)
- Item counter ("Showing X to Y of Z")
- Auto-scroll on page change

---

## Backend Requirements

The backend API endpoint should support:

**Endpoint:** `GET /reports/api/inventory/movements`

**Current Parameters:**
- `start_date`
- `end_date`
- `product_id`
- `warehouse_id`
- `movement_type`
- `page`
- `page_size`

**New Parameters Needed:**
- `search` - Product name/SKU search
- `category_id` - Filter by category
- `reference_type` - Filter by source (purchase_order/sale/transfer/adjustment)
- `sort_by` - Sort field (date/quantity/product/type)
- `sort_order` - asc/desc

**Response Structure Needed:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_movements": 150,
      "total_in": 60,
      "total_out": 70,
      "total_adjustments": 10,
      "total_transfers": 10
    },
    "movements": [...],
    "by_warehouse": {
      "uuid": {
        "name": "Main Warehouse",
        "movements": 80,
        "net_change": +150
      }
    },
    "by_category": {
      "uuid": {
        "name": "Electronics",
        "movements": 45,
        "net_change": -20
      }
    }
  },
  "meta": {
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_count": 150,
      "total_pages": 8
    }
  }
}
```

---

## Data Structure

### **StockMovement Interface:**

```typescript
export interface StockMovement {
  movement_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  warehouse_id: string;
  warehouse_name: string;
  movement_type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  reference_type: 'purchase_order' | 'sale' | 'transfer' | 'adjustment';
  reference_id: string;
  performed_by: string;
  performed_by_id: string;
  notes: string;
  created_at: string;  // ISO datetime
}
```

### **StockMovementsResponse Interface:**

```typescript
export interface StockMovementsResponse {
  success: boolean;
  data: {
    summary: {
      total_movements: number;
      total_in: number;
      total_out: number;
      total_adjustments: number;
      total_transfers: number;
    };
    movements: StockMovement[];
    by_warehouse?: Record<string, {
      name: string;
      movements: number;
      net_change: number;
    }>;
    by_category?: Record<string, {
      name: string;
      movements: number;
      net_change: number;
    }>;
  };
  meta?: {
    pagination?: {
      page: number;
      page_size: number;
      total_count: number;
      total_pages: number;
    };
  };
}
```

---

## UI Components to Add

### 1. **Filters Section**
```tsx
<div className="bg-white rounded-lg border p-6 mb-6">
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center space-x-2">
      <Filter className="w-5 h-5" />
      <h3>Filters</h3>
    </div>
    <button onClick={clearFilters}>Clear All</button>
  </div>
  
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {/* Search */}
    {/* Warehouse */}
    {/* Category */}
    {/* Movement Type */}
    {/* Reference Type */}
  </div>
</div>
```

### 2. **Pagination Controls**
```tsx
<div className="flex items-center justify-between">
  {/* Page size selector */}
  <div className="flex items-center space-x-2">
    <label>Items per page:</label>
    <select value={pageSize} onChange={...}>
      <option>10</option>
      <option>20</option>
      <option>50</option>
      <option>100</option>
    </select>
  </div>
  
  {/* Page navigation */}
  <div className="flex items-center space-x-2">
    <button>First</button>
    <button>Previous</button>
    {/* Page numbers */}
    <button>Next</button>
    <button>Last</button>
  </div>
</div>
```

### 3. **Enhanced Movement Table**
- Add sort arrows to column headers
- Color-code movement types
- Show before → after quantities
- Link to reference transactions
- Display performer name/timestamp

---

## Implementation Steps

### **Phase 1: Frontend Enhancements**
1. Add `useCurrency` hook import
2. Add search state and input
3. Add warehouse/category filter dropdowns
4. Add reference type filter
5. Add pagination controls
6. Add sort options
7. Add clear all filters button
8. Update type definitions

### **Phase 2: Backend Updates**
1. Add search parameter support
2. Add category_id filter
3. Add reference_type filter
4. Add sort_by and sort_order
5. Build by_warehouse grouping
6. Build by_category grouping
7. Update response structure
8. Add `.distinct()` to queryset

### **Phase 3: Testing**
1. Test all filters
2. Test pagination
3. Test sorting
4. Test currency formatting
5. Test mobile responsiveness

---

## Success Criteria

### **Functionality:**
- ✅ Currency displays using global settings
- ✅ Search filters movements by product
- ✅ All filters work independently and together
- ✅ Pagination works correctly
- ✅ Sort options apply properly
- ✅ Clear all resets to defaults

### **Performance:**
- ⚡ Page load < 2 seconds
- ⚡ Filter response < 500ms
- ⚡ Pagination < 300ms

### **UX:**
- ✅ Mobile responsive
- ✅ Clear visual hierarchy
- ✅ Intuitive filter controls
- ✅ No console errors/warnings

---

## Next Steps

1. **Review current implementation** - Check what already exists
2. **Update frontend** - Add all enhancements
3. **Update backend** - Add missing features
4. **Test thoroughly** - Verify all functionality
5. **Document changes** - Create complete summary

---

**Status:** ⏳ **READY TO START**

**Priority:** HIGH (Next on inventory reports index)

**Estimated Time:** 1-2 hours

---

**Prepared by:** GitHub Copilot  
**Date:** October 16, 2025
