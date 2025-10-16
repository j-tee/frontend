# Stock Levels Report Enhancement Plan
**Date**: October 16, 2025  
**Status**: In Progress

## 📋 Overview
Enhance the Stock Levels Summary report to be comprehensive and informative, with proper backend-frontend alignment.

## 🎯 Expected Features (from Index Page)
1. **Real-time stock quantities** - Current stock across all warehouses
2. **Multi-location tracking** - Per-warehouse breakdown
3. **Stock valuation** - Total value of inventory
4. **Available vs Reserved** - Distinguish between available and reserved stock

## 🎨 Frontend Enhancements (COMPLETED ✅)

### Visual Improvements
- ✅ **5 Summary Cards** instead of 4
  - Total Products (with variants)
  - In Stock (percentage)
  - Low Stock (count)
  - Out of Stock (separate card)
  - Total Value (across locations)

- ✅ **Stock Status Distribution Chart**
  - Visual progress bars for In Stock, Low Stock, Out of Stock
  - Percentages and counts

- ✅ **Quick Insights Panel**
  - Stock Health assessment
  - Inventory Value display
  - Coverage (number of locations)

- ✅ **Enhanced Table**
  - Product icons
  - Status badges (color-coded)
  - Reserved column (separate from available)
  - Days since restock
  - Per-location expandable breakdown

### Current Frontend Structure
```typescript
interface StockLevel {
  product_id: string;
  product_name: string;
  sku: string;
  category: string;
  locations: StockLocation[];
  total_quantity: number;
  total_available: number;
  unit_cost: number;
  total_value: number;
  last_restocked: string;
  days_until_stockout: number;
}

interface StockLocation {
  warehouse_id: string;
  warehouse_name: string;
  quantity: number;
  reserved: number;
  available: number;
  reorder_point: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}
```

## 🔧 Backend Updates Needed

### Current Backend Structure (MISMATCH ❌)
```python
{
  "data": {
    "summary": {...},
    "by_warehouse": [...],
    "by_category": [...]
  },
  "results": [...],  # Product stocks with 'warehouses' array
  "meta": {...}
}
```

### Required Backend Structure (TO IMPLEMENT ✅)
```python
{
  "success": true,
  "data": {
    "summary": {
      "total_products": int,
      "total_variants": int,
      "in_stock": int,           # NEW: Products with stock > 0
      "low_stock": int,          # Products with 0 < stock < reorder_point
      "out_of_stock": int,       # Products with stock == 0
      "total_stock_value": decimal,
      "warehouses_count": int
    },
    "items": [                   # RENAME from 'results' to 'items'
      {
        "product_id": str,
        "product_name": str,
        "sku": str,
        "category": str,
        "locations": [           # RENAME from 'warehouses' to 'locations'
          {
            "warehouse_id": str,
            "warehouse_name": str,
            "quantity": int,
            "reserved": int,     # NEW: Reserved stock
            "available": int,    # NEW: Available = quantity - reserved
            "reorder_point": int,# NEW: Reorder threshold
            "status": str        # NEW: 'in_stock'|'low_stock'|'out_of_stock'
          }
        ],
        "total_quantity": int,
        "total_available": int,  # NEW: Sum of available across locations
        "unit_cost": decimal,
        "total_value": decimal,
        "last_restocked": date,  # NEW: Most recent restock
        "days_until_stockout": int # NEW: Estimated days
      }
    ]
  },
  "meta": {...}
}
```

### Backend Changes Required

#### 1. Update `_build_summary()` ✅
- Add `in_stock` count (products with quantity > 0)
- Keep `low_stock` and `out_of_stock` separate
- Ensure correct calculation logic

#### 2. Update `_build_stock_levels()` ✅
- **Rename** `warehouses` → `locations`
- **Add** `reserved` field per location (from StockProduct reserved field or sale reservations)
- **Add** `available` field per location (quantity - reserved)
- **Add** `reorder_point` per location
- **Add** `status` per location based on available vs reorder_point
- **Add** `total_available` at product level
- **Add** `last_restocked` (most recent stock intake/adjustment date)
- **Add** `days_until_stockout` (calculated from sales velocity)

#### 3. Update Response Structure ✅
```python
return ReportResponse.success(
    {**summary},  # Just summary, not with breakdowns
    items,        # Renamed from stock_levels
    metadata
)
```

## 🎛️ Frontend Filters to Add

### Current Filters (Basic)
- Stock Status dropdown
- Sort By dropdown
- Include Valuation checkbox

### Additional Filters Needed
1. **Warehouse Filter** ✅
   - Dropdown to filter by specific warehouse
   - "All Warehouses" default option

2. **Category Filter** ✅
   - Dropdown to filter by product category
   - "All Categories" default option

3. **Search Filter** ✅
   - Search by product name or SKU
   - Real-time filtering

4. **Value Range Filter** (Optional)
   - Min/Max total value sliders
   - For focusing on high-value items

## 📊 Enhanced Features

### 1. Stock Health Indicators
- Green: In Stock (available > reorder_point)
- Amber: Low Stock (available < reorder_point but > 0)
- Red: Out of Stock (available == 0)

### 2. Reserved Stock Tracking
- Show reserved quantities separately
- Highlight items with high reservation ratio
- Calculate true availability

### 3. Restock Insights
- Days since last restock
- Days until stockout (based on sales velocity)
- Recommended reorder quantities

### 4. Multi-Location Insights
- Compare stock levels across warehouses
- Identify warehouse imbalances
- Transfer suggestions

## 🚀 Implementation Steps

### Phase 1: Backend Alignment ✅
1. Update `inventory_reports.py` - `StockLevelsSummaryReportView`
2. Add reserved stock calculation
3. Add sales velocity calculation for days_until_stockout
4. Add last_restocked tracking
5. Rename fields to match frontend expectations
6. Test API response structure

### Phase 2: Frontend Filters ✅
1. Add warehouse dropdown filter
2. Add category dropdown filter
3. Add product search input
4. Wire up filters to API calls
5. Add loading states during filtering

### Phase 3: Testing ✅
1. Test with empty database
2. Test with single warehouse
3. Test with multiple warehouses
4. Test reserved stock calculations
5. Test all filter combinations

## 📝 Notes
- Backend has `by_warehouse` and `by_category` breakdowns - we can use these for filter dropdowns
- Frontend already has beautiful UI - just need data alignment
- Reserved stock might need to query Sale items with status='RESERVED' or similar
- Last restocked can come from StockProduct.created_at or StockAdjustment records
- Days until stockout requires sales velocity calculation (30-day average)

## ✅ Success Criteria
- [ ] Backend returns correct structure matching frontend types
- [ ] All 4 expected features working (real-time, multi-location, valuation, available vs reserved)
- [ ] Filters functional (warehouse, category, search, status, sort)
- [ ] Empty states handled gracefully
- [ ] Performance acceptable with 1000+ products
- [ ] Data accuracy verified against database
