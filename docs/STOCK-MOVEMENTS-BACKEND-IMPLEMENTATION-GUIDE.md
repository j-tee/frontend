# Stock Movement History - Backend Implementation Guide

## Date: October 16, 2025

---

## Overview

This guide details the backend changes needed to support the enhanced Stock Movement History frontend with search, filters, pagination, and groupings.

---

## Required Changes to `StockMovementHistoryReportView`

### File: `backend/reports/views/inventory_reports.py`

---

## 1. Update Query Parameters

### Current Parameters:
```python
warehouse_id = request.GET.get('warehouse_id')
product_id = request.GET.get('product_id')
movement_type = request.GET.get('movement_type', 'all')
adjustment_type = request.GET.get('adjustment_type')
grouping = request.GET.get('grouping', 'daily')
```

### Add These New Parameters:
```python
search_term = request.GET.get('search', '').strip()
category_id = request.GET.get('category_id')
sort_by = request.GET.get('sort_by', 'date_desc')
```

### Complete Updated Parameters Section:
```python
# Parse filters
search_term = request.GET.get('search', '').strip()
warehouse_id = request.GET.get('warehouse_id')
category_id = request.GET.get('category_id')
product_id = request.GET.get('product_id')
movement_type = request.GET.get('movement_type', 'all')
adjustment_type = request.GET.get('adjustment_type')
sort_by = request.GET.get('sort_by', 'date_desc')  # date_desc|date_asc|quantity|product
grouping = request.GET.get('grouping', 'daily')
```

---

## 2. Update `_build_movements()` Method

### Add Search Filter Support

In the `_build_movements()` method, add product search capability:

```python
def _build_movements(self, start_date, end_date, warehouse_id, product_id,
                     movement_type, adjustment_type, request,
                     search_term=None, category_id=None, sort_by='date_desc'):
    """Build list of individual movements"""
    
    # ... existing code ...
    
    # Apply search filter to adjustments
    if search_term:
        adjustments_list = [
            adj for adj in adjustments_list
            if search_term.lower() in adj['product_name'].lower() or
               search_term.lower() in adj['sku'].lower()
        ]
    
    # Apply search filter to sales
    if search_term:
        sales_list = [
            sale for sale in sales_list
            if search_term.lower() in sale['product_name'].lower() or
               search_term.lower() in sale['sku'].lower()
        ]
    
    # Apply category filter
    if category_id:
        adjustments_list = [
            adj for adj in adjustments_list
            if adj.get('category_id') == category_id
        ]
        sales_list = [
            sale for sale in sales_list
            if sale.get('category_id') == category_id
        ]
```

### Add Sorting Support

```python
# Apply sorting
if sort_by == 'date_desc':
    movements.sort(key=lambda x: x['created_at'], reverse=True)
elif sort_by == 'date_asc':
    movements.sort(key=lambda x: x['created_at'])
elif sort_by == 'quantity':
    movements.sort(key=lambda x: abs(x['quantity']), reverse=True)
elif sort_by == 'product':
    movements.sort(key=lambda x: x['product_name'])
```

### Ensure Product Fields in Movement Records

Make sure each movement record includes:
```python
{
    # ... existing fields ...
    'category_id': str(stock_product.product.category.id) if stock_product.product.category else None,
    'category_name': stock_product.product.category.name if stock_product.product.category else 'Uncategorized',
    # ... rest of fields ...
}
```

---

## 3. Add Helper Methods for Groupings

Add these two new methods to the `StockMovementHistoryReportView` class:

```python
def _build_warehouse_grouping(self, movements: List[Dict]) -> Dict[str, Any]:
    """Group movements by warehouse for filter dropdown"""
    warehouse_groups = {}
    
    for movement in movements:
        warehouse_id = movement.get('warehouse_id')
        if not warehouse_id:
            continue
        
        if warehouse_id not in warehouse_groups:
            warehouse_groups[warehouse_id] = {
                'name': movement['warehouse_name'],
                'movements': 0
            }
        
        warehouse_groups[warehouse_id]['movements'] += 1
    
    return warehouse_groups

def _build_category_grouping(self, movements: List[Dict]) -> Dict[str, Any]:
    """Group movements by category for filter dropdown"""
    category_groups = {}
    
    for movement in movements:
        category_id = movement.get('category_id')
        if not category_id:
            continue
        
        if category_id not in category_groups:
            category_groups[category_id] = {
                'name': movement['category_name'],
                'movements': 0
            }
        
        category_groups[category_id]['movements'] += 1
    
    return category_groups
```

---

## 4. Update Response Structure

### Current Return Statement:
```python
# Combine summary with time series
summary_data = {
    **summary,
    'time_series': time_series
}

# Metadata
metadata = {
    'date_range': {
        'start': start_date.isoformat(),
        'end': end_date.isoformat()
    },
    'warehouse_id': warehouse_id,
    'product_id': product_id,
    'movement_type': movement_type,
    'adjustment_type': adjustment_type,
    'grouping': grouping,
    **pagination
}

return ReportResponse.success(summary_data, movements, metadata)
```

### New Return Structure:
```python
# Build warehouse and category groupings for filters
by_warehouse = self._build_warehouse_grouping(movements)
by_category = self._build_category_grouping(movements)

# Build response data
data = {
    'summary': summary,
    'movements': movements,
    'time_series': time_series,
    'by_warehouse': by_warehouse,
    'by_category': by_category
}

# Build metadata with nested pagination
metadata = {
    'date_range': {
        'start': start_date.isoformat(),
        'end': end_date.isoformat()
    },
    'pagination': pagination  # Nest pagination here
}

# Return custom Response to match frontend expectations
return Response({
    'success': True,
    'data': data,
    'meta': metadata
})
```

---

## 5. Update Docstring

Update the class docstring to document new parameters:

```python
class StockMovementHistoryReportView(BaseReportView):
    """
    Stock Movement History Report
    
    GET /reports/api/inventory/movements/
    
    Tracks all inventory changes over time including sales, adjustments,
    returns, and transfers. Provides shrinkage analysis and movement trends.
    
    Query Parameters:
    - start_date: YYYY-MM-DD (default: 30 days ago)
    - end_date: YYYY-MM-DD (default: today)
    - search: str (optional - search by product name or SKU)          # NEW
    - warehouse_id: UUID (optional - filter by warehouse)
    - category_id: UUID (optional - filter by category)               # NEW
    - product_id: UUID (optional - filter by product)
    - movement_type: all|sales|adjustments|returns (default: all)
    - adjustment_type: THEFT|DAMAGE|EXPIRED|... (optional - specific type)
    - sort_by: date_desc|date_asc|quantity|product (default: date_desc) # NEW
    - grouping: daily|weekly|monthly (default: daily)
    - page: int (pagination)
    - page_size: int (pagination, default: 20)                         # UPDATED default
    
    Response Format:
    {
        "success": true,
        "data": {
            "summary": {...},
            "movements": [...],
            "time_series": [...],
            "by_warehouse": {...},                                      # NEW
            "by_category": {...}                                        # NEW
        },
        "meta": {
            "date_range": {...},
            "pagination": {...}                                         # NESTED
        }
    }
    """
```

---

## 6. Complete Implementation Example

Here's the complete updated `get()` method:

```python
def get(self, request):
    """Generate stock movement history report"""
    # Get business ID
    business_id, error = self.get_business_or_error(request)
    if error:
        return ReportResponse.error(error)
    
    # Parse date range
    start_date, end_date, error = self.get_date_range(request, default_days=30)
    if error:
        return ReportResponse.error(error)
    
    # Parse filters
    search_term = request.GET.get('search', '').strip()
    warehouse_id = request.GET.get('warehouse_id')
    category_id = request.GET.get('category_id')
    product_id = request.GET.get('product_id')
    movement_type = request.GET.get('movement_type', 'all')
    adjustment_type = request.GET.get('adjustment_type')
    sort_by = request.GET.get('sort_by', 'date_desc')
    grouping = request.GET.get('grouping', 'daily')
    
    # Build summary
    summary = self._build_summary(
        start_date, end_date, warehouse_id, product_id, 
        movement_type, adjustment_type, business_id
    )
    
    # Build time series
    time_series = self._build_time_series(
        start_date, end_date, warehouse_id, product_id,
        movement_type, grouping, business_id
    )
    
    # Build movements list (paginated, with search and filters)
    movements, pagination = self._build_movements(
        start_date, end_date, warehouse_id, product_id,
        movement_type, adjustment_type, request, business_id,
        search_term, category_id, sort_by
    )
    
    # Build warehouse and category groupings for filters
    by_warehouse = self._build_warehouse_grouping(movements)
    by_category = self._build_category_grouping(movements)
    
    # Build response data
    data = {
        'summary': summary,
        'movements': movements,
        'time_series': time_series,
        'by_warehouse': by_warehouse,
        'by_category': by_category
    }
    
    # Build metadata with nested pagination
    metadata = {
        'date_range': {
            'start': start_date.isoformat(),
            'end': end_date.isoformat()
        },
        'pagination': pagination
    }
    
    # Return custom Response to match frontend expectations
    return Response({
        'success': True,
        'data': data,
        'meta': metadata
    })
```

---

## 7. Testing Checklist

After implementing changes, test:

- [ ] Search by product name works
- [ ] Search by SKU works
- [ ] Warehouse filter works
- [ ] Category filter works
- [ ] Sort by date (desc/asc) works
- [ ] Sort by quantity works
- [ ] Sort by product name works
- [ ] Pagination returns correct structure
- [ ] by_warehouse grouping populated
- [ ] by_category grouping populated
- [ ] Date range filtering works
- [ ] Movement type filtering works

---

## 8. Expected API Response

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_movements": 500,
      "total_units_in": 3000,
      "total_units_out": 2500,
      "net_change": 500,
      "value_in": "150000.00",
      "value_out": "125000.00",
      "net_value_change": "25000.00",
      "movement_breakdown": {
        "sales": -2000,
        "adjustment": 300,
        "theft": -50
      },
      "shrinkage": {
        "total_units": 50,
        "total_value": "2500.00",
        "percentage_of_outbound": 2.0
      }
    },
    "movements": [
      {
        "movement_id": "uuid",
        "product_id": "uuid",
        "product_name": "Product Name",
        "sku": "SKU-001",
        "category_id": "uuid",
        "category_name": "Electronics",
        "warehouse_id": "uuid",
        "warehouse_name": "Main Warehouse",
        "movement_type": "adjustment",
        "quantity": 100,
        "quantity_before": 50,
        "quantity_after": 150,
        "reference_type": "adjustment",
        "reference_id": "uuid",
        "performed_by": "John Doe",
        "performed_by_id": "uuid",
        "notes": "Restock",
        "created_at": "2025-10-16T10:30:00Z"
      }
    ],
    "time_series": [...],
    "by_warehouse": {
      "uuid": {
        "name": "Main Warehouse",
        "movements": 250
      }
    },
    "by_category": {
      "uuid": {
        "name": "Electronics",
        "movements": 180
      }
    }
  },
  "meta": {
    "date_range": {
      "start": "2025-09-16",
      "end": "2025-10-16"
    },
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_count": 500,
      "total_pages": 25
    }
  }
}
```

---

## Summary of Changes

1. ✅ Add `search`, `category_id`, and `sort_by` parameters
2. ✅ Implement search filtering in `_build_movements()`
3. ✅ Implement category filtering in `_build_movements()`
4. ✅ Implement sorting in `_build_movements()`
5. ✅ Add `_build_warehouse_grouping()` method
6. ✅ Add `_build_category_grouping()` method
7. ✅ Update response structure to nest pagination
8. ✅ Return custom Response object
9. ✅ Update docstring with new parameters
10. ✅ Ensure all movement records include category fields

---

**Implementation Guide Created:** October 16, 2025  
**Frontend Status:** ✅ Complete  
**Backend Status:** 📝 Needs Implementation (Use this guide)
