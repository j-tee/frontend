# 📊 Product Performance Report API - MISSING IMPLEMENTATION

**Status:** ❌ **CRITICAL - NOT IMPLEMENTED**  
**Impact:** Users cannot see product performance data despite having sales in database  
**Priority:** HIGH  
**Date:** November 8, 2025

---

## 🚨 Problem Description

The frontend is calling the **Product Performance Report API**, but the backend is either:
1. **Not implementing the endpoint at all** (404 error)
2. **Returning empty data** when there ARE sales in the database
3. **Using incorrect queries** that don't aggregate sales data properly

### User Experience Impact:
- Users see "No product performance data available"
- Cannot see which products are selling best
- Cannot analyze revenue by product or category
- Cannot make data-driven inventory decisions

---

## 📍 API Endpoint Required

```
GET /reports/api/sales/products/
```

### Query Parameters (Filters):
- `start_date` (string, format: YYYY-MM-DD) - Filter sales from this date
- `end_date` (string, format: YYYY-MM-DD) - Filter sales until this date
- `storefront_id` (UUID, optional) - Filter by specific storefront
- `category_id` (UUID, optional) - Filter by product category
- `warehouse_id` (UUID, optional) - Filter by warehouse
- `export_format` (string, optional: 'csv' | 'pdf') - Export format

### Example Request:
```bash
GET /reports/api/sales/products/?start_date=2025-10-09&end_date=2025-11-08&storefront_id=abc123
```

---

## 📤 Expected Response Format

### Success Response (200 OK):

**⚠️ CRITICAL: Return data at ROOT level - DO NOT wrap in `data:` object!**

```json
{
  "summary": {
    "total_revenue": 125000.50,
    "total_quantity": 1523,
    "total_products": 156,
    "total_transactions": 342,
    "avg_items_per_transaction": 4.45,
    "retail": {
      "revenue": 85000.25,
      "quantity": 1123,
      "transactions": 298,
      "products": 142
    },
    "wholesale": {
      "revenue": 40000.25,
      "quantity": 400,
      "transactions": 44,
      "products": 78
    }
  },
  "products": [
    {
      "product_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "iPhone 15 Pro",
      "sku": "APPLE-IP15P-256",
      "category": "Electronics",
      "total_revenue": 12500.00,
      "total_quantity": 25,
      "total_transactions": 22,
      "avg_price": 500.00,
      "retail": {
        "revenue": 10000.00,
        "quantity": 20,
        "transactions": 18
      },
      "wholesale": {
        "revenue": 2500.00,
        "quantity": 5,
        "transactions": 4
      }
    },
    {
      "product_id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Samsung Galaxy S24",
      "sku": "SAMS-S24-128",
      "category": "Electronics",
      "total_revenue": 9800.00,
      "total_quantity": 28,
      "total_transactions": 24,
      "avg_price": 350.00,
      "retail": {
        "revenue": 7000.00,
        "quantity": 20,
        "transactions": 18
      },
      "wholesale": {
        "revenue": 2800.00,
        "quantity": 8,
        "transactions": 6
      }
    }
  ],
  "categories": [
    {
      "category": "Electronics",
      "revenue": 45000.00,
      "quantity": 156,
      "products": 23,
      "transactions": 98
    },
    {
      "category": "Clothing",
      "revenue": 28000.00,
      "quantity": 489,
      "products": 45,
      "transactions": 156
    }
  ],
  "period": {
    "start": "2025-10-09",
    "end": "2025-11-08",
    "type": "custom"
  }
}
```

---

## 💻 Backend Implementation Guide (Django)

### Step 1: Database Query Structure

You need to aggregate data from your **Sales** and **SaleItems** tables:

```python
from django.db.models import Sum, Count, Avg, F, Q
from django.db.models.functions import Coalesce
from apps.sales.models import Sale, SaleItem
from apps.inventory.models import Product
from datetime import datetime

def get_product_performance(business, start_date=None, end_date=None, 
                           storefront_id=None, category_id=None, warehouse_id=None):
    """
    Generate product performance report
    """
    
    # Base queryset - filter sales by business
    sales_query = Sale.objects.filter(business=business)
    
    # Apply date filters
    if start_date:
        sales_query = sales_query.filter(created_at__gte=start_date)
    if end_date:
        sales_query = sales_query.filter(created_at__lte=end_date)
    
    # Apply storefront filter
    if storefront_id:
        sales_query = sales_query.filter(storefront_id=storefront_id)
    
    # Apply warehouse filter (if products are linked to warehouses)
    if warehouse_id:
        sales_query = sales_query.filter(
            saleitems__product__warehousestock__warehouse_id=warehouse_id
        )
    
    # Get sale items from filtered sales
    sale_items = SaleItem.objects.filter(sale__in=sales_query)
    
    # Apply category filter if specified
    if category_id:
        sale_items = sale_items.filter(product__category_id=category_id)
    
    # ========================================
    # AGGREGATE PRODUCT-LEVEL DATA
    # ========================================
    
    products_data = sale_items.values(
        'product_id',
        'product__name',
        'product__sku',
        'product__category__name'
    ).annotate(
        # Total metrics
        total_revenue=Sum(F('quantity') * F('price')),
        total_quantity=Sum('quantity'),
        total_transactions=Count('sale_id', distinct=True),
        avg_price=Avg('price'),
        
        # Retail metrics (assuming customer_type field on Sale)
        retail_revenue=Sum(
            F('quantity') * F('price'),
            filter=Q(sale__customer_type='retail')
        ),
        retail_quantity=Sum(
            'quantity',
            filter=Q(sale__customer_type='retail')
        ),
        retail_transactions=Count(
            'sale_id',
            filter=Q(sale__customer_type='retail'),
            distinct=True
        ),
        
        # Wholesale metrics
        wholesale_revenue=Sum(
            F('quantity') * F('price'),
            filter=Q(sale__customer_type='wholesale')
        ),
        wholesale_quantity=Sum(
            'quantity',
            filter=Q(sale__customer_type='wholesale')
        ),
        wholesale_transactions=Count(
            'sale_id',
            filter=Q(sale__customer_type='wholesale'),
            distinct=True
        )
    ).order_by('-total_revenue')  # Sort by revenue descending
    
    # ========================================
    # AGGREGATE CATEGORY-LEVEL DATA
    # ========================================
    
    categories_data = sale_items.values(
        'product__category__name'
    ).annotate(
        revenue=Sum(F('quantity') * F('price')),
        quantity=Sum('quantity'),
        products=Count('product_id', distinct=True),
        transactions=Count('sale_id', distinct=True)
    ).order_by('-revenue')
    
    # ========================================
    # CALCULATE SUMMARY TOTALS
    # ========================================
    
    summary_totals = sale_items.aggregate(
        total_revenue=Sum(F('quantity') * F('price')),
        total_quantity=Sum('quantity'),
        total_products=Count('product_id', distinct=True),
        total_transactions=Count('sale_id', distinct=True),
        
        # Retail totals
        retail_revenue=Sum(
            F('quantity') * F('price'),
            filter=Q(sale__customer_type='retail')
        ),
        retail_quantity=Sum(
            'quantity',
            filter=Q(sale__customer_type='retail')
        ),
        retail_transactions=Count(
            'sale_id',
            filter=Q(sale__customer_type='retail'),
            distinct=True
        ),
        retail_products=Count(
            'product_id',
            filter=Q(sale__customer_type='retail'),
            distinct=True
        ),
        
        # Wholesale totals
        wholesale_revenue=Sum(
            F('quantity') * F('price'),
            filter=Q(sale__customer_type='wholesale')
        ),
        wholesale_quantity=Sum(
            'quantity',
            filter=Q(sale__customer_type='wholesale')
        ),
        wholesale_transactions=Count(
            'sale_id',
            filter=Q(sale__customer_type='wholesale'),
            distinct=True
        ),
        wholesale_products=Count(
            'product_id',
            filter=Q(sale__customer_type='wholesale'),
            distinct=True
        )
    )
    
    # Calculate avg items per transaction
    avg_items_per_transaction = (
        summary_totals['total_quantity'] / summary_totals['total_transactions']
        if summary_totals['total_transactions'] > 0 else 0
    )
    
    # ========================================
    # FORMAT RESPONSE
    # ========================================
    
    # ⚠️ CRITICAL: Return data at ROOT level!
    # DO NOT wrap in { "data": {...} }
    # Frontend expects: { "summary": {...}, "products": [...] }
    # NOT: { "data": { "summary": {...} } }
    
    return {
        'summary': {
            'total_revenue': float(summary_totals['total_revenue'] or 0),
            'total_quantity': int(summary_totals['total_quantity'] or 0),
            'total_products': int(summary_totals['total_products'] or 0),
            'total_transactions': int(summary_totals['total_transactions'] or 0),
            'avg_items_per_transaction': round(avg_items_per_transaction, 2),
            'retail': {
                'revenue': float(summary_totals['retail_revenue'] or 0),
                'quantity': int(summary_totals['retail_quantity'] or 0),
                'transactions': int(summary_totals['retail_transactions'] or 0),
                'products': int(summary_totals['retail_products'] or 0)
            },
            'wholesale': {
                'revenue': float(summary_totals['wholesale_revenue'] or 0),
                'quantity': int(summary_totals['wholesale_quantity'] or 0),
                'transactions': int(summary_totals['wholesale_transactions'] or 0),
                'products': int(summary_totals['wholesale_products'] or 0)
            }
        },
        'products': [
            {
                'product_id': str(p['product_id']),
                'name': p['product__name'],
                'sku': p['product__sku'] or '',
                'category': p['product__category__name'] or 'Uncategorized',
                'total_revenue': float(p['total_revenue'] or 0),
                'total_quantity': int(p['total_quantity'] or 0),
                'total_transactions': int(p['total_transactions'] or 0),
                'avg_price': float(p['avg_price'] or 0),
                'retail': {
                    'revenue': float(p['retail_revenue'] or 0),
                    'quantity': int(p['retail_quantity'] or 0),
                    'transactions': int(p['retail_transactions'] or 0)
                },
                'wholesale': {
                    'revenue': float(p['wholesale_revenue'] or 0),
                    'quantity': int(p['wholesale_quantity'] or 0),
                    'transactions': int(p['wholesale_transactions'] or 0)
                }
            }
            for p in products_data
        ],
        'categories': [
            {
                'category': c['product__category__name'] or 'Uncategorized',
                'revenue': float(c['revenue'] or 0),
                'quantity': int(c['quantity'] or 0),
                'products': int(c['products'] or 0),
                'transactions': int(c['transactions'] or 0)
            }
            for c in categories_data
        ],
        'period': {
            'start': start_date.strftime('%Y-%m-%d') if start_date else None,
            'end': end_date.strftime('%Y-%m-%d') if end_date else None,
            'type': 'custom'
        }
    }
```

### Step 2: Create the View

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from datetime import datetime, timedelta
from django.utils import timezone

class ProductPerformanceReportView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get product performance report
        
        Query Params:
            - start_date: YYYY-MM-DD
            - end_date: YYYY-MM-DD
            - storefront_id: UUID
            - category_id: UUID
            - warehouse_id: UUID
            - export_format: csv | pdf
        """
        
        # Get query parameters
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        storefront_id = request.query_params.get('storefront_id')
        category_id = request.query_params.get('category_id')
        warehouse_id = request.query_params.get('warehouse_id')
        export_format = request.query_params.get('export_format')
        
        # Parse dates
        try:
            if start_date_str:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            else:
                # Default to last 30 days
                start_date = timezone.now() - timedelta(days=30)
            
            if end_date_str:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            else:
                end_date = timezone.now()
        except ValueError:
            return Response({
                'error': 'Invalid date format. Use YYYY-MM-DD'
            }, status=400)
        
        # Get business from authenticated user
        business = request.user.business
        
        # Generate report
        report_data = get_product_performance(
            business=business,
            start_date=start_date,
            end_date=end_date,
            storefront_id=storefront_id,
            category_id=category_id,
            warehouse_id=warehouse_id
        )
        
        # Handle export formats
        if export_format == 'csv':
            return export_to_csv(report_data, 'product_performance')
        elif export_format == 'pdf':
            return export_to_pdf(report_data, 'product_performance')
        
        # Return JSON
        return Response(report_data, status=200)
```

### Step 3: Register the URL

In your `urls.py`:

```python
from django.urls import path
from .views import ProductPerformanceReportView

urlpatterns = [
    # ... other URLs ...
    path('reports/api/sales/products/', ProductPerformanceReportView.as_view(), name='product-performance'),
]
```

---

## 🔍 Troubleshooting

### If You're Getting Empty Results:

1. **Check your Sale model has data:**
   ```python
   Sale.objects.filter(business=your_business).count()
   ```

2. **Check SaleItem model has data:**
   ```python
   SaleItem.objects.filter(sale__business=your_business).count()
   ```

3. **Verify date filters aren't too restrictive:**
   ```python
   # Check date range of your sales
   Sale.objects.filter(business=your_business).aggregate(
       min_date=Min('created_at'),
       max_date=Max('created_at')
   )
   ```

4. **Check for field name mismatches:**
   - Your Sale model might use `sale_date` instead of `created_at`
   - Your Sale model might use `order_type` instead of `customer_type`
   - Adjust the field names in the queries above

5. **Test with minimal filters first:**
   ```python
   # Start with just business filter, no dates
   sale_items = SaleItem.objects.filter(sale__business=business)
   print(sale_items.count())  # Should show total items sold
   ```

---

## 🧪 Testing the Endpoint

### Test 1: Basic Request (No Filters)
```bash
curl -X GET "http://localhost:8000/reports/api/sales/products/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:** Returns ALL products sold by your business, ever.

### Test 2: With Date Range
```bash
curl -X GET "http://localhost:8000/reports/api/sales/products/?start_date=2025-10-01&end_date=2025-11-08" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:** Returns products sold in October-November 2025.

### Test 3: With Storefront Filter
```bash
curl -X GET "http://localhost:8000/reports/api/sales/products/?storefront_id=YOUR_STOREFRONT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:** Returns products sold at specific storefront only.

---

## 📊 Database Schema Requirements

Your database should have these tables/relationships:

```
Sale
├── id (UUID)
├── business_id (FK → Business)
├── storefront_id (FK → Storefront)
├── customer_type ('retail' | 'wholesale')
├── created_at (DateTime)
└── total_amount (Decimal)

SaleItem
├── id (UUID)
├── sale_id (FK → Sale)
├── product_id (FK → Product)
├── quantity (Integer)
├── price (Decimal)
└── subtotal (Decimal)

Product
├── id (UUID)
├── business_id (FK → Business)
├── category_id (FK → Category) [Optional]
├── name (String)
└── sku (String)
```

---

## ✅ Definition of Done

The endpoint is complete when:

- [ ] Returns 200 OK with correct JSON structure
- [ ] Shows products even when no filters applied
- [ ] Aggregates revenue = sum(quantity × price) for each product
- [ ] Aggregates quantity = sum(quantity) for each product
- [ ] Counts unique transactions per product
- [ ] Calculates average price correctly
- [ ] Breaks down retail vs wholesale correctly
- [ ] Groups products by category
- [ ] Respects date filters (start_date, end_date)
- [ ] Respects storefront filter
- [ ] Respects category filter
- [ ] Returns empty arrays (not null) when no data
- [ ] Properly filters by business (security)
- [ ] Works with CSV export (export_format=csv)
- [ ] Works with PDF export (export_format=pdf)

---

## 🚀 Quick Fix Checklist

If you want to get this working ASAP:

1. **Create the view** using the code above
2. **Register the URL** at `/reports/api/sales/products/`
3. **Test with no filters first** - should return ALL sales data
4. **Verify field names** match your models (created_at, customer_type, etc.)
5. **Check frontend request** in browser DevTools → Network tab
6. **Match response format** exactly as shown in Expected Response above

---

## 💡 Common Mistakes

### ❌ Wrong:
```python
# Returning null instead of empty array
if not products:
    return Response(None)  # WRONG!
```

### ✅ Correct:
```python
# Always return proper structure, even if empty
return Response({
    'summary': {...},
    'products': [],  # Empty array, not null
    'categories': [],  # Empty array, not null
    'period': {...}
})
```

### ❌ Wrong:
```python
# Not filtering by business (security issue!)
products = Product.objects.all()  # WRONG! Returns all businesses' data
```

### ✅ Correct:
```python
# Always filter by authenticated user's business
products = Product.objects.filter(business=request.user.business)
```

---

**CRITICAL:** The frontend is ready and waiting. The ONLY blocker is this backend endpoint. Once implemented, the Product Performance report will work immediately.

**Questions?** Check the frontend files:
- `/src/services/reportsService.ts` (line 110) - See exact API call
- `/src/types/reports.ts` (line 151) - See expected response structure
- `/src/features/reports/pages/ProductPerformancePage.tsx` - See how data is used

---

*Last Updated: November 8, 2025*  
*Priority: HIGH - Users are seeing "No data" message*  
*Estimate: 2-4 hours to implement*
