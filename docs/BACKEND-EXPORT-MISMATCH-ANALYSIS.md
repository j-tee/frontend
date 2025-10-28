# Backend Export API Mismatch Analysis

**Date**: October 15, 2025  
**Issue**: Frontend export functionality failing due to API endpoint mismatch  
**Severity**: High - All CSV/Excel/PDF exports non-functional

## Problem Summary

The frontend expects to use GET requests with a `format` query parameter to export reports (e.g., `/reports/api/sales/summary?format=csv`), but the backend has completely separate POST endpoints for exports.

## Current Backend Architecture

### Analytical Reports (GET - Returns JSON)
Location: `reports/views/sales_reports.py`, `financial_reports.py`, etc.

```
GET /reports/api/sales/summary/
GET /reports/api/sales/products/
GET /reports/api/financial/revenue-profit/
GET /reports/api/inventory/stock-levels/
GET /reports/api/customer/purchase-patterns/
```

**Returns**: JSON analytics data (no export support)

### Export Endpoints (POST - Returns Binary Files)
Location: `reports/views/exports.py`

```
POST /reports/api/exports/sales/
POST /reports/api/exports/customers/
POST /reports/api/exports/inventory/
POST /reports/api/exports/audit/
```

**Request Body**:
```json
{
  "format": "excel",  // excel, csv, or pdf
  "start_date": "2025-01-01",
  "end_date": "2025-03-31",
  "storefront_id": "uuid" (optional),
  "customer_id": "uuid" (optional),
  "sale_type": "RETAIL" or "WHOLESALE" (optional),
  "status": "COMPLETED" (optional),
  "include_items": true
}
```

**Returns**: Binary file (Excel/CSV/PDF)

## Frontend Current Implementation

### Service Layer (`reportsService.ts`)

```typescript
exportSummaryCSV: async (filters: ReportFilters = {}): Promise<void> => {
  const response = await reportsApi.get(
    `/reports/api/sales/summary${buildQueryString({ ...filters, format: 'csv' })}`,
    { responseType: 'blob' }
  );
  downloadFile(response.data, `sales-summary-${new Date().toISOString()}.csv`);
}
```

**Problem**: Sends GET request to `/reports/api/sales/summary?format=csv`  
**Expected**: Backend should return CSV file  
**Actual**: Backend ignores `format` parameter and returns JSON (causing download to fail)

## Available Backend Export Formats

Based on `reports/views/exports.py`, the backend supports:

1. **Excel** (`.xlsx`)
2. **CSV** (`.csv`)
3. **PDF** (`.pdf`)

Using exporter classes from `EXPORTER_MAP`:
- `sales_excel`, `sales_csv`, `sales_pdf`
- `customer_excel`, `customer_csv`, `customer_pdf`
- `inventory_excel`, `inventory_csv`, `inventory_pdf`
- `audit_excel`, `audit_csv`, `audit_pdf`

## Solutions

### Option 1: Update Backend to Support format Parameter (Recommended)

Add format parameter handling to each report view:

```python
class SalesSummaryReportView(BaseReportView):
    def get(self, request, *args, **kwargs):
        # Check if export format is requested
        export_format = request.query_params.get('format')
        
        if export_format in ['csv', 'excel', 'pdf']:
            return self._handle_export(request, export_format)
        
        # Otherwise return JSON analytics
        return self._handle_json_response(request)
    
    def _handle_export(self, request, format):
        # Build export data
        # Use appropriate exporter
        # Return binary file response
        pass
```

**Pros**:
- Single endpoint for both JSON and exports
- Consistent with frontend expectations
- RESTful design (GET for read operations)

**Cons**:
- Requires updating ~15 report views
- Need to ensure export data matches JSON structure

### Option 2: Update Frontend to Use POST Export Endpoints

Change frontend services to use POST `/reports/api/exports/*` endpoints:

```typescript
exportSummaryCSV: async (filters: ReportFilters = {}): Promise<void> => {
  const response = await reportsApi.post(
    `/reports/api/exports/sales/`,
    {
      format: 'csv',
      start_date: filters.start_date,
      end_date: filters.end_date,
      storefront_id: filters.storefront_id,
      sale_type: filters.sale_type,
    },
    { responseType: 'blob' }
  );
  downloadFile(response.data, `sales-summary-${new Date().toISOString()}.csv`);
}
```

**Pros**:
- Backend already implements this
- No backend changes needed
- Supports all formats (Excel, CSV, PDF)

**Cons**:
- Violates REST conventions (POST for download)
- Need to update frontend services
- Export endpoints don't cover all report types

### Option 3: Hybrid Approach

1. Keep backend as-is
2. Update frontend to use correct endpoints:
   - `/reports/api/exports/sales/` → Sales-related reports
   - Add missing export endpoints for other reports
3. Add frontend UI to select format (CSV/Excel/PDF)

## Affected Features

All export functionality is currently broken:

### Sales Reports
- ❌ Sales Summary CSV export
- ❌ Product Performance CSV export
- ❌ Customer Analytics CSV export
- ❌ Revenue Trends CSV export

### Financial Reports
- ❌ Revenue & Profit CSV export
- ❌ AR Aging CSV export
- ❌ Collection Rates CSV export
- ❌ Cash Flow CSV export

### Inventory Reports
- ❌ Stock Levels CSV export
- ❌ Low Stock Alerts CSV export
- ❌ Stock Movements CSV export
- ❌ Warehouse Analytics CSV export

### Customer Reports
- ❌ Top Customers CSV export
- ❌ Purchase Patterns CSV export
- ❌ Credit Utilization CSV export
- ❌ Customer Segmentation CSV export

## Recommended Action Plan

**Phase 1: Quick Fix (Frontend Update)**
1. Update `reportsService.ts` to use POST `/reports/api/exports/sales/` for sales exports
2. Test sales summary CSV export
3. Verify Excel and PDF formats work

**Phase 2: Backend Enhancement**
1. Add format parameter support to report views
2. Migrate export logic from separate endpoints
3. Maintain backward compatibility

**Phase 3: Frontend Enhancement**
1. Add format selector UI (CSV/Excel/PDF buttons)
2. Update all report pages to use new export method
3. Add export progress indicators

## Next Steps

1. ✅ Document the mismatch
2. ⏳ Choose solution approach (recommend Option 1)
3. ⏳ Implement fix
4. ⏳ Test all export formats
5. ⏳ Update documentation

## Testing Checklist

- [ ] Sales Summary CSV export
- [ ] Sales Summary Excel export
- [ ] Sales Summary PDF export
- [ ] Product Performance exports
- [ ] Financial report exports
- [ ] Inventory report exports
- [ ] Customer report exports
- [ ] Error handling for empty datasets
- [ ] Filename generation
- [ ] Date range filtering in exports

## Related Files

**Frontend**:
- `src/services/reportsService.ts` - Service layer
- `src/features/reports/pages/SalesSummaryPage.tsx` - Sales summary page
- `src/features/reports/pages/*.tsx` - Other report pages

**Backend**:
- `reports/views/exports.py` - Export endpoints
- `reports/views/sales_reports.py` - Sales analytics
- `reports/views/financial_reports.py` - Financial analytics
- `reports/views/inventory_reports.py` - Inventory analytics
- `reports/views/customer_reports.py` - Customer analytics
- `reports/urls.py` - URL routing
- `reports/exporters.py` - Export formatters

## API Documentation Needed

Current backend lacks documentation for:
- Export endpoint request/response formats
- Available export formats per report type
- Error codes and messages
- File naming conventions
- Maximum data limits
