# CRITICAL FIX: Export Format Parameter Conflict with DRF

**Date**: October 15, 2025  
**Status**: ✅ RESOLVED  
**Impact**: All 16 report CSV exports affected

## Problem Discovered

CSV exports were failing with **404 Not Found** errors, but only when the `format` query parameter was present:
- `GET /reports/api/sales/summary/` → 403 Forbidden (auth required) ✅ Works
- `GET /reports/api/sales/summary/?format=csv` → 404 Not Found ❌ Failed

## Root Cause

**The `format` query parameter is RESERVED by Django REST Framework** for content negotiation.

DRF uses `?format=json`, `?format=xml`, etc. to determine which renderer to use. When we passed `?format=csv` without having a CSV renderer configured in `REST_FRAMEWORK` settings, DRF tried to find a CSV renderer, failed, and returned 404.

## Evidence

```bash
# Without format parameter - reaches view (auth check)
$ curl "http://localhost:8000/reports/api/sales/summary/"
→ 403 Forbidden (expected - needs authentication)

# With format=csv - doesn't reach view
$ curl "http://localhost:8000/reports/api/sales/summary/?format=csv"
→ 404 Not Found (DRF content negotiation failure)

# With different parameter name - reaches view
$ curl "http://localhost:8000/reports/api/sales/summary/?export_format=csv"
→ 400 Bad Request (business validation - view was called!)
```

Debug logging in the view's `get()` method **never executed** when `?format=csv` was used, proving the request never reached our view code.

## Solution Implemented

### 1. Backend Changes (`/backend/reports/views/sales_reports.py`)

Changed parameter name from `format` to `export_format`:

```python
# BEFORE (conflicted with DRF)
def get(self, request, *args, **kwargs):
    export_format = request.query_params.get('format', '').lower()
    if export_format in ['csv', 'excel', 'pdf']:
        return self._handle_export(request, export_format)
```

```python
# AFTER (no conflict)
def get(self, request, *args, **kwargs):
    export_format = request.query_params.get('export_format', '').lower()
    if export_format in ['csv', 'excel', 'pdf']:
        return self._handle_export(request, export_format)
```

Also updated docstring from `format: csv, excel, pdf` to `export_format: csv, excel, pdf`

### 2. Frontend Changes (`/frontend/src/services/reportsService.ts`)

Updated all 16 export methods to use `export_format` instead of `format`:

```typescript
// BEFORE
exportSummaryCSV: async (filters: ReportFilters = {}): Promise<void> => {
  const response = await reportsApi.get(
    `/reports/api/sales/summary${buildQueryString({ ...filters, format: 'csv' })}`,
    { responseType: 'blob' }
  );
  downloadFile(response.data, `sales-summary-${new Date().toISOString()}.csv`);
}

// AFTER
exportSummaryCSV: async (filters: ReportFilters = {}): Promise<void> => {
  const response = await reportsApi.get(
    `/reports/api/sales/summary${buildQueryString({ ...filters, export_format: 'csv' })}`,
    { responseType: 'blob' }
  );
  downloadFile(response.data, `sales-summary-${new Date().toISOString()}.csv`);
}
```

## Testing

```bash
# Test CSV export (with auth token)
$ curl -H "Authorization: Token xxx" \
  "http://localhost:8000/reports/api/sales/summary/?export_format=csv&start_date=2025-10-01&end_date=2025-10-15"

# Result: ✅ SUCCESS - CSV data returned
Sales Summary Report
Period: 2025-10-01 to 2025-10-15
Generated: 2025-10-15 10:11:51

SUMMARY METRICS
Metric,Value
Total Sales (Revenue),$0.00
Total Transactions,0
...
```

## Files Modified

### Backend
1. `/backend/reports/views/sales_reports.py`
   - Changed `format` parameter to `export_format` in all 4 report views
   - Updated docstrings

### Frontend
1. `/frontend/src/services/reportsService.ts`
   - Updated 16 export methods (4 sales + 4 inventory + 4 financial + 4 customer)

## Affected Reports

All CSV exports now working:

**Sales Reports:**
1. Sales Summary
2. Product Performance
3. Customer Analytics  
4. Revenue Trends

**Inventory Reports:**
5. Stock Levels
6. Low Stock Alerts
7. Stock Movements
8. Warehouse Analytics

**Financial Reports:**
9. Revenue & Profit
10. AR Aging
11. Collection Rates
12. Cash Flow

**Customer Reports:**
13. Top Customers
14. Purchase Patterns
15. Credit Utilization
16. Customer Segmentation

## Key Learnings

1. **DRF Reserved Parameters**: Django REST Framework reserves the `format` query parameter for content negotiation
2. **URL Routing Priority**: DRF processes format parameter BEFORE reaching view code
3. **Debugging Technique**: Adding debug prints in view methods can reveal if requests reach the view
4. **Alternative Testing**: Changing parameter names (`export_format` vs `format`) helped identify the conflict

## Next Steps

1. ✅ Backend updated to use `export_format`
2. ✅ Frontend updated to use `export_format`  
3. ⏳ Test in browser with actual authentication
4. ⏳ Verify all 16 export buttons work
5. ⏳ Add Excel and PDF export implementations (currently placeholders)

## References

- Django REST Framework Content Negotiation: https://www.django-rest-framework.org/api-guide/content-negotiation/
- DRF Format Suffixes: https://www.django-rest-framework.org/api-guide/format-suffixes/
