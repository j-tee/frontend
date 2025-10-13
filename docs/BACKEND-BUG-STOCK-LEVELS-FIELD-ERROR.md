# Backend Bug: Stock Levels Field Error

## Issue Report
**Date:** October 13, 2025  
**Severity:** Critical  
**Status:** Backend Fix Required

## Error Description

### Error Message
```
FieldError at /reports/api/inventory/stock-levels/
Cannot resolve keyword 'landed_unit_cost' into field. 
Choices are: adjustments, count_items, created_at, description, 
expiry_date, id, product, product_id, quantity, reservations, 
retail_price, storefront, storefront_id, variant, variant_id
```

### Error Details
- **URL:** `http://localhost:8000/reports/api/inventory/stock-levels/?include_valuation=true&sort_by=quantity`
- **Method:** GET
- **Status Code:** 500 Internal Server Error
- **Django Version:** 5.2.6
- **Python Version:** 3.13.3

## Root Cause

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

## Frontend Request
The frontend is correctly sending:
```
GET /reports/api/inventory/stock-levels/?include_valuation=true&sort_by=quantity
```

The parameters are valid according to the API contract.

## Backend Fix Required

### Option 1: Add Missing Field
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

### Option 2: Calculate Dynamically
If it should be calculated, use annotation:
```python
from django.db.models import F, Value, DecimalField

queryset = queryset.annotate(
    landed_unit_cost=F('product__cost')  # or appropriate calculation
)
```

### Option 3: Use Existing Field
If the functionality should use an existing field, update the backend code to reference the correct field name (e.g., `retail_price` or calculated from `product__cost`).

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

While waiting for backend fix, the frontend can:
1. ✅ Show user-friendly error message (already implemented)
2. ✅ Provide retry functionality (already implemented)
3. ❌ Disable valuation toggle until backend is fixed (optional)

## Impact

- **User Impact:** Users cannot view stock levels report
- **Feature Impact:** Inventory tracking and valuation unavailable
- **Business Impact:** Cannot monitor stock values or make informed purchasing decisions

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
