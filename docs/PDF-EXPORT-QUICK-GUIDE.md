# Quick Guide: Adding PDF Export to Other Reports

## Overview

This guide shows how to add PDF export to the remaining 15 reports using the Sales Summary implementation as a template.

## Current Status

- ✅ **Sales Summary** - Fully implemented
- ⏳ **Remaining 15 reports** - Frontend ready, need backend `_export_pdf()` method

## Step-by-Step Guide

### For Each Report View

Each report view needs:
1. Import reportlab (already done globally)
2. Add `_export_pdf()` method
3. Update `_handle_export()` to call it

### Template Code

```python
def _export_pdf(self, summary, breakdown, top_items, start_date, end_date):
    """Export {report_name} as PDF"""
    buffer = io.BytesIO()
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=18,
    )
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=30,
        alignment=TA_CENTER,
    )
    
    title = Paragraph("{Report Name}", title_style)
    elements.append(title)
    
    # Period
    period_text = f"Period: {start_date} to {end_date}<br/>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    elements.append(Paragraph(period_text, styles['Normal']))
    elements.append(Spacer(1, 0.3*inch))
    
    # Summary Table (customize columns)
    summary_data = [
        ['Metric', 'Value'],
        # Add your metrics here
    ]
    
    summary_table = Table(summary_data, colWidths=[3.5*inch, 2.5*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')]),
    ]))
    elements.append(summary_table)
    
    # Build and return
    doc.build(elements)
    pdf_data = buffer.getvalue()
    buffer.close()
    
    response = HttpResponse(pdf_data, content_type='application/pdf')
    filename = f'{report_name}-{start_date}-to-{end_date}.pdf'
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    return response
```

## Report-Specific Customizations

### 1. Product Performance Report
**Columns**: Product Name, SKU, Units Sold, Revenue, Profit Margin, Growth %
**Color**: Blue (#3b82f6)

### 2. Customer Analytics Report
**Columns**: Customer Name, Purchases, Total Spent, Avg Order Value, Last Purchase
**Color**: Green (#10b981)

### 3. Revenue Trends Report
**Columns**: Period, Revenue, Transactions, Growth Rate, Forecast
**Color**: Purple (#8b5cf6)

### 4. Stock Levels Report
**Columns**: Product, SKU, Current Stock, Min Level, Status, Value
**Color**: Orange (#f97316)

### 5. Low Stock Alerts Report
**Columns**: Product, Current Stock, Min Level, Reorder Qty, Priority
**Color**: Red (#ef4444)

### 6. Stock Movements Report
**Columns**: Date, Product, Type, Quantity, Before, After, User
**Color**: Indigo (#6366f1)

### 7. Warehouse Analytics Report
**Columns**: Warehouse, Total Items, Value, Utilization %, Top Products
**Color**: Teal (#14b8a6)

### 8. Revenue & Profit Report
**Columns**: Period, Revenue, COGS, Gross Profit, Net Profit, Margin %
**Color**: Emerald (#10b981)

### 9. AR Aging Report
**Columns**: Customer, Current, 30 Days, 60 Days, 90+ Days, Total Due
**Color**: Yellow (#eab308)

### 10. Collection Rates Report
**Columns**: Period, Invoiced, Collected, Collection Rate %, Outstanding
**Color**: Lime (#84cc16)

### 11. Cash Flow Report
**Columns**: Period, Cash In, Cash Out, Net Flow, Opening, Closing Balance
**Color**: Sky (#0ea5e9)

### 12. Top Customers Report
**Columns**: Rank, Customer, Total Spent, Orders, Avg Order, Lifetime Value
**Color**: Pink (#ec4899)

### 13. Purchase Patterns Report
**Columns**: Product Category, Frequency, Avg Qty, Preferred Time, Trend
**Color**: Violet (#8b5cf6)

### 14. Credit Utilization Report
**Columns**: Customer, Credit Limit, Used, Available, Utilization %, Status
**Color**: Amber (#f59e0b)

### 15. Customer Segmentation Report
**Columns**: Segment, Count, Avg Revenue, Total Revenue, Growth, Retention %
**Color**: Cyan (#06b6d4)

## Color Palette Reference

```python
# Primary colors (from Tailwind)
BLUE = colors.HexColor('#3b82f6')
GREEN = colors.HexColor('#10b981')
PURPLE = colors.HexColor('#8b5cf6')
ORANGE = colors.HexColor('#f97316')
RED = colors.HexColor('#ef4444')
INDIGO = colors.HexColor('#6366f1')
TEAL = colors.HexColor('#14b8a6')
YELLOW = colors.HexColor('#eab308')
PINK = colors.HexColor('#ec4899')
AMBER = colors.HexColor('#f59e0b')
CYAN = colors.HexColor('#06b6d4')

# Neutral colors
DARK_GRAY = colors.HexColor('#1f2937')
LIGHT_GRAY = colors.HexColor('#f3f4f6')
```

## Implementation Checklist

For each of the 15 remaining reports:

- [ ] **1. Identify data structure** - What's in `summary`, `breakdown`, `top_items`?
- [ ] **2. Choose color scheme** - Pick from palette above
- [ ] **3. Design table layout** - Define columns and widths
- [ ] **4. Copy `_export_pdf()` template** - From sales_reports.py
- [ ] **5. Customize data mapping** - Map your data to table rows
- [ ] **6. Adjust column widths** - Based on content (total should be ~6.5 inches)
- [ ] **7. Test with curl** - Verify PDF generation
- [ ] **8. Check file size** - Should be 2-5 KB for typical data
- [ ] **9. Validate formatting** - Open PDF and check layout
- [ ] **10. Update documentation** - Mark as complete

## Quick Test Command

```bash
# Test PDF export for any report
curl -H "Authorization: Token {token}" \
  "http://localhost:8000/reports/api/{endpoint}/?export_format=pdf&start_date=2025-10-01&end_date=2025-10-15" \
  -o test-report.pdf

# Verify it's a valid PDF
file test-report.pdf
```

## Common Issues & Solutions

### Issue: PDF too large (>5 KB)
**Solution**: Limit rows (e.g., `breakdown[:20]` for top 20 only)

### Issue: Table doesn't fit on page
**Solution**: Reduce font size or column widths, or split into multiple tables

### Issue: Currency not formatting correctly
**Solution**: Use `f"${value:,.2f}"` for currency formatting

### Issue: Date formatting inconsistent
**Solution**: Use `datetime.strftime('%Y-%m-%d')` for consistent formatting

### Issue: Colors not showing
**Solution**: Use `colors.HexColor('#xxxxxx')` not plain strings

## Priority Order

Recommended implementation order based on usage:

1. **Product Performance** (high usage)
2. **Stock Levels** (high usage)
3. **Revenue & Profit** (high business value)
4. **Top Customers** (high business value)
5. **Revenue Trends** (medium usage)
6. **Customer Analytics** (medium usage)
7. **Low Stock Alerts** (medium usage)
8. **AR Aging** (medium business value)
9. **Cash Flow** (medium business value)
10. **Stock Movements** (low usage)
11. **Warehouse Analytics** (low usage)
12. **Collection Rates** (low usage)
13. **Purchase Patterns** (low usage)
14. **Credit Utilization** (low usage)
15. **Customer Segmentation** (low usage)

## Batch Implementation Script

For faster implementation, consider creating a script:

```python
# generate_pdf_exports.py
reports = [
    ('ProductPerformanceReportView', 'product-performance', ['Product', 'Sales', 'Profit']),
    ('StockLevelsReportView', 'stock-levels', ['Product', 'Stock', 'Value']),
    # ... add all reports
]

for view_class, filename, columns in reports:
    # Generate _export_pdf method for each
    # Save to file
    pass
```

## Resources

- ReportLab User Guide: https://www.reportlab.com/docs/reportlab-userguide.pdf
- ReportLab Colors: https://www.reportlab.com/chartgallery/colors/
- PDF Best Practices: Keep file size small, use standard fonts, test on multiple PDF readers

---

**Next Step**: Pick a report from the priority list and implement PDF export following this template!
