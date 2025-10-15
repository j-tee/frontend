# Sales Summary Report Export Fix

**Implementation Plan**: Add format parameter support to Sales Summary Report

## Changes Required

### File: `/backend/reports/views/sales_reports.py`

Add export handling to `SalesSummaryReportView`:

```python
from django.http import HttpResponse
from django.utils import timezone
import csv
import io

class SalesSummaryReportView(BaseReportView):
    
    def get(self, request, *args, **kwargs):
        # Check for export format request
        export_format = request.query_params.get('format', '').lower()
        
        if export_format in ['csv', 'excel', 'pdf']:
            return self._handle_export(request, export_format)
        
        # Original JSON response logic
        # ... existing code ...
    
    def _handle_export(self, request, format_type):
        """Handle export in various formats"""
        # Get business ID
        business_id, error = self.get_business_or_error(request)
        if error:
            return Response(
                {'error': str(error)},
                status=http_status.HTTP_400_BAD_REQUEST
            )
        
        # Get date range
        start_date, end_date, error = self.get_date_range(request)
        if error:
            return Response(
                {'error': str(error)},
                status=http_status.HTTP_400_BAD_REQUEST
            )
        
        # Build data (reuse existing methods)
        queryset = self._build_queryset(request, business_id, start_date, end_date)
        summary = self._build_summary(queryset, start_date, end_date)
        breakdown = self._build_period_breakdown(queryset, start_date, end_date)
        
        if format_type == 'csv':
            return self._export_csv(summary, breakdown, start_date, end_date)
        elif format_type == 'excel':
            return self._export_excel(summary, breakdown, start_date, end_date)
        elif format_type == 'pdf':
            return self._export_pdf(summary, breakdown, start_date, end_date)
    
    def _export_csv(self, summary, breakdown, start_date, end_date):
        """Export as CSV"""
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow(['Sales Summary Report'])
        writer.writerow([f'Period: {start_date} to {end_date}'])
        writer.writerow([f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}'])
        writer.writerow([])
        
        # Summary section
        writer.writerow(['SUMMARY'])
        writer.writerow(['Metric', 'Value'])
        writer.writerow(['Total Sales', f"${summary['total_sales']:,.2f}"])
        writer.writerow(['Total Transactions', summary['total_transactions']])
        writer.writerow(['Average Transaction', f"${summary['average_transaction_value']:,.2f}"])
        writer.writerow(['Total Items Sold', summary['total_items_sold']])
        writer.writerow(['Total Customers', summary['total_customers']])
        writer.writerow(['Discounts Given', f"${summary['total_discounts_given']:,.2f}"])
        writer.writerow(['Net Sales', f"${summary['net_sales']:,.2f}"])
        writer.writerow(['Growth Rate', f"{summary['growth_rate']:.1f}%"])
        writer.writerow([])
        
        # Breakdown section
        writer.writerow(['DAILY BREAKDOWN'])
        writer.writerow(['Date', 'Sales', 'Transactions', 'Avg Value', 'Items Sold', 'Customers'])
        
        for item in breakdown:
            writer.writerow([
                item['period'],
                f"${item['sales']:,.2f}",
                item['transactions'],
                f"${item['avg_value']:,.2f}",
                item['items_sold'],
                item['customers']
            ])
        
        # Generate response
        output.seek(0)
        response = HttpResponse(output.getvalue(), content_type='text/csv')
        filename = f'sales-summary-{start_date}-to-{end_date}.csv'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response
```

## Implementation Steps

1. Add imports at top of sales_reports.py
2. Add `_handle_export()` method
3. Add `_export_csv()` method
4. Modify `get()` method to check for format parameter
5. Test with: `GET /reports/api/sales/summary?format=csv`

## Testing

```bash
# Test CSV export
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8000/reports/api/sales/summary?start_date=2025-10-08&end_date=2025-10-15&format=csv" \
  -o sales-summary.csv

# Verify file contents
cat sales-summary.csv
```

Expected output:
```csv
Sales Summary Report
Period: 2025-10-08 to 2025-10-15
Generated: 2025-10-15 12:30:45

SUMMARY
Metric,Value
Total Sales,"$7,864.75"
Total Transactions,9
Average Transaction,"$873.86"
Total Items Sold,235
...
```

## Benefits

1. ✅ No frontend changes needed
2. ✅ RESTful (GET for read operations)
3. ✅ Backward compatible (JSON still default)
4. ✅ Simple CSV format (easy to implement)
5. ✅ Can extend to Excel/PDF later

## Next Steps

1. Implement CSV export for sales summary
2. Test functionality
3. Extend to other report types
4. Add Excel format support
5. Add PDF format support
