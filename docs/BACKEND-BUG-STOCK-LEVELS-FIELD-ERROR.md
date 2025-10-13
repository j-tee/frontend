# Backend Bug: Stock Levels Multiple Errors

## Issue Report
**Date:** October 13, 2025  
**Severity:** Critical  
**Status:** Backend Fix Required
**Updated:** Added second error type

## Error Descriptions

### Error 1: Missing Field
```
FieldError at /reports/api/inventory/stock-levels/
Cannot resolve keyword 'landed_unit_cost' into field. 
Choices are: adjustments, count_items, created_at, description, 
expiry_date, id, product, product_id, quantity, reservations, 
retail_price, storefront, storefront_id, variant, variant_id
```

**Trigger:** When `include_valuation=true` is sent in the request

### Error 2: Invalid Response Argument
```
TypeError at /reports/api/inventory/stock-levels/
ReportResponse.success() got an unexpected keyword argument 'meta'
```

**Trigger:** When `include_valuation=false` (the workaround attempt)

### Error Details
- **URL:** `http://localhost:8000/reports/api/inventory/stock-levels/?include_valuation=true&sort_by=quantity`
- **Method:** GET
- **Status Code:** 500 Internal Server Error
- **Django Version:** 5.2.6
- **Python Version:** 3.13.3

## Root Cause

### Error 1: Missing Database Field
The backend is trying to access a field `landed_unit_cost` that doesn't exist in the database model. Based on the error message, the available fields in the model are:
- adjustments
- count_items
- created_at
- description
- expiry_date
- id
- product
- product_id
- quantity
- reservations
- retail_price
- storefront
- storefront_id
- variant
- variant_id

The backend code is likely trying to:
1. Calculate or access `landed_unit_cost` for valuation purposes
2. Sort or filter by this non-existent field

### Error 2: Invalid Response Constructor
The backend is calling `ReportResponse.success(meta=...)` but the `success()` method doesn't accept a `meta` parameter. This suggests:
1. The response class signature doesn't match how it's being used
2. The backend is trying to pass metadata that the response constructor doesn't support
3. **This error occurs EVEN when valuation is disabled**, indicating a fundamental issue with the response structure

## Frontend Request
The frontend is correctly sending:
```
GET /reports/api/inventory/stock-levels/?include_valuation=true&sort_by=quantity
```

The parameters are valid according to the API contract.

## Backend Fix Required

### Fix for Error 1: Missing Field

#### Option 1: Add Missing Field
If `landed_unit_cost` should exist in the model:
```python
# Add to the StockLevel model
class StockLevel(models.Model):
    # ... existing fields ...
    landed_unit_cost = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        null=True,
        blank=True
    )
```

#### Option 2: Calculate Dynamically
If it should be calculated, use annotation:
```python
from django.db.models import F, Value, DecimalField

queryset = queryset.annotate(
    landed_unit_cost=F('product__cost')  # or appropriate calculation
)
```

#### Option 3: Use Existing Field
If the functionality should use an existing field, update the backend code to reference the correct field name (e.g., `retail_price` or calculated from `product__cost`).

### Fix for Error 2: Invalid Response Argument

The `ReportResponse.success()` method needs to be updated to accept a `meta` parameter, or the calling code should stop passing it:

#### Option A: Update Response Class
```python
class ReportResponse:
    @classmethod
    def success(cls, data, meta=None):  # Add meta parameter
        response = {
            'success': True,
            'data': data,
            'error': None
        }
        if meta:
            response['meta'] = meta
        return response
```

#### Option B: Remove Meta from Caller
```python
# In the stock levels view, change from:
return ReportResponse.success(data=result, meta=metadata)

# To:
return ReportResponse.success(data=result)
# And include metadata in the data dict if needed
```

## Recommended Solution

Based on the field list, it appears the backend should:
1. Use `product.cost` or `product.landed_cost` from the related Product model
2. Annotate the queryset with calculated values instead of trying to access a non-existent field directly

Example fix in backend view:
```python
from django.db.models import F, ExpressionWrapper, DecimalField

def get_stock_levels(request):
    queryset = StockLevel.objects.select_related('product', 'variant')
    
    if include_valuation:
        # Annotate with calculated cost instead of accessing non-existent field
        queryset = queryset.annotate(
            unit_cost=F('product__cost'),
            total_value=ExpressionWrapper(
                F('quantity') * F('product__cost'),
                output_field=DecimalField()
            )
        )
    
    # Rest of the view logic...
```

## Frontend Workaround

While waiting for backend fix, the frontend has:
1. ✅ Show user-friendly error message (implemented)
2. ✅ Provide retry functionality (implemented)
3. ✅ Added "Disable Valuation & Retry" button (implemented)
4. ❌ **Workaround doesn't work** - Error 2 occurs even without valuation

**Status:** No viable frontend workaround exists. Both with and without valuation parameter, the backend returns 500 errors.

## Impact

- **User Impact:** Users CANNOT view stock levels report at all (critical blocker)
- **Feature Impact:** Inventory tracking completely unavailable
- **Business Impact:** Cannot monitor stock values, levels, or make informed purchasing decisions
- **Severity:** CRITICAL - Core inventory feature is non-functional

## Related Files

### Backend (Needs Fix)
- `backend/reports/views/inventory_reports.py` (or similar)
- `backend/inventory/models.py` (StockLevel model)

### Frontend (Working Correctly)
- `src/features/reports/pages/StockLevelsPage.tsx`
- `src/services/reportsService.ts`
- `src/types/reports.ts` (StockLevelsResponse interface)

## Testing After Fix

Once backend is fixed, verify:
1. ✅ Stock levels report loads without errors
2. ✅ Valuation toggle works (`include_valuation=true`)
3. ✅ Sorting by quantity works (`sort_by=quantity`)
4. ✅ All summary fields populate correctly
5. ✅ Export to CSV functionality works

## Communication

**Backend Team:** Please prioritize this fix as it blocks a core inventory management feature. The field name issue needs to be resolved either by adding the field, calculating it dynamically, or using an existing field correctly.

**Frontend Team:** Error handling is in place. No frontend changes needed once backend is fixed.
