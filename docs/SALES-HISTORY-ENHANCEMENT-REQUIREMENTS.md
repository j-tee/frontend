# 🚀 Sales History Enhancement Requirements

**Date:** October 6, 2025  
**Priority:** CRITICAL  
**Impact:** Core business functionality - Sales insights & analytics

---

## 🔴 CRITICAL ISSUES TO FIX

### 1. Missing Receipt Numbers in API Response
**Problem:** Receipt numbers not showing in table (column shows empty)  
**Root Cause:** API might not be including `receipt_number` in response

**Backend Requirements:**
```python
# Ensure SaleSerializer includes receipt_number
class SaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sale
        fields = [
            'id',
            'receipt_number',  # ← MUST be included
            'storefront',
            'storefront_name',
            'customer',
            'customer_name',
            # ... all other fields
        ]
```

**Expected Response:**
```json
{
  "results": [
    {
      "id": "uuid-here",
      "receipt_number": "REC-2025-001234",  // ← Must be present
      "storefront_name": "Main Store",
      "customer_name": "John Doe",
      // ...
    }
  ]
}
```

**Test:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/sales/api/sales/ | jq '.results[0].receipt_number'
# Should output: "REC-2025-001234" (not null)
```

---

### 2. Limited Data Return (Only 7 Sales Showing)
**Problem:** User sees only 7 sales, expecting 504 from Jan-Oct  
**Root Cause:** API might be filtering or limiting data incorrectly

**Backend Requirements:**
- ✅ Ensure NO default filters are applied (unless user specifies)
- ✅ Return ALL sales for the user's business
- ✅ Pagination should work correctly with full dataset

**Check:**
```python
# In your ViewSet
def get_queryset(self):
    user = self.request.user
    business = user.business
    
    # Start with ALL sales for this business
    queryset = Sale.objects.filter(storefront__business=business)
    
    # Apply filters ONLY if provided in query params
    storefront_id = self.request.query_params.get('storefront')
    if storefront_id:
        queryset = queryset.filter(storefront_id=storefront_id)
    
    # ... other optional filters
    
    return queryset.order_by('-created_at')  # Newest first
```

**Expected:**
- GET `/sales/api/sales/` → Returns ALL sales (504 in test data)
- GET `/sales/api/sales/?page_size=20` → Returns first 20, count=504
- GET `/sales/api/sales/?storefront=xyz` → Returns filtered sales

**Test:**
```bash
# Should return count: 504
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/sales/api/sales/?page_size=20 | jq '.count'
```

---

## 🎯 REQUIRED ENHANCEMENTS

### 3. Search Functionality
**Requirement:** Search sales by receipt number, customer name, or amount

**Backend Implementation:**
```python
from django.db.models import Q

class SaleViewSet(viewsets.ModelViewSet):
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'receipt_number',           # Search receipt
        'customer__name',           # Search customer
        'customer_name',            # Search customer name (denormalized)
    ]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Custom search for amount
        amount_search = self.request.query_params.get('amount')
        if amount_search:
            try:
                amount = Decimal(amount_search)
                queryset = queryset.filter(
                    Q(total_amount=amount) | 
                    Q(total_amount__gte=amount - 5, total_amount__lte=amount + 5)
                )
            except:
                pass
        
        return queryset
```

**API Endpoints:**
```bash
# Search by receipt number
GET /sales/api/sales/?search=REC-2025-001234

# Search by customer
GET /sales/api/sales/?search=John

# Search by amount (custom)
GET /sales/api/sales/?amount=150.00
```

**Expected Response:**
- Returns only matching sales
- Maintains pagination
- Includes count of results

---

### 4. Date Range Filters
**Requirement:** Filter sales by date range (daily, weekly, monthly, custom)

**Backend Implementation:**
```python
from django_filters import rest_framework as filters
from django.utils import timezone
from datetime import timedelta

class SaleFilter(filters.FilterSet):
    # Date range
    date_from = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    date_to = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    
    # Quick filters
    date_range = filters.CharFilter(method='filter_date_range')
    
    def filter_date_range(self, queryset, name, value):
        now = timezone.now()
        
        if value == 'today':
            start = now.replace(hour=0, minute=0, second=0)
            return queryset.filter(created_at__gte=start)
        
        elif value == 'yesterday':
            start = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0)
            end = now.replace(hour=0, minute=0, second=0)
            return queryset.filter(created_at__gte=start, created_at__lt=end)
        
        elif value == 'this_week':
            start = now - timedelta(days=now.weekday())
            start = start.replace(hour=0, minute=0, second=0)
            return queryset.filter(created_at__gte=start)
        
        elif value == 'this_month':
            start = now.replace(day=1, hour=0, minute=0, second=0)
            return queryset.filter(created_at__gte=start)
        
        elif value == 'last_30_days':
            start = now - timedelta(days=30)
            return queryset.filter(created_at__gte=start)
        
        elif value == 'this_year':
            start = now.replace(month=1, day=1, hour=0, minute=0, second=0)
            return queryset.filter(created_at__gte=start)
        
        return queryset
    
    class Meta:
        model = Sale
        fields = ['storefront', 'status', 'type', 'customer']

class SaleViewSet(viewsets.ModelViewSet):
    filterset_class = SaleFilter
```

**API Endpoints:**
```bash
# Today's sales
GET /sales/api/sales/?date_range=today

# This week
GET /sales/api/sales/?date_range=this_week

# This month
GET /sales/api/sales/?date_range=this_month

# Last 30 days
GET /sales/api/sales/?date_range=last_30_days

# Custom range
GET /sales/api/sales/?date_from=2025-01-01&date_to=2025-03-31

# Combine with other filters
GET /sales/api/sales/?date_range=this_month&status=COMPLETED&storefront=xyz
```

---

### 5. Status and Type Filters
**Requirement:** Filter by sale status (COMPLETED, DRAFT, etc.) and type

**Backend Implementation:**
```python
# Already in SaleFilter above
class SaleFilter(filters.FilterSet):
    status = filters.MultipleChoiceFilter(
        choices=Sale.STATUS_CHOICES,
        conjoined=False  # OR logic
    )
    
    type = filters.ChoiceFilter(
        choices=Sale.TYPE_CHOICES
    )
    
    # Filter by payment type
    payment_type = filters.ChoiceFilter(
        field_name='payment_type'
    )
```

**API Endpoints:**
```bash
# Completed sales only
GET /sales/api/sales/?status=COMPLETED

# Multiple statuses
GET /sales/api/sales/?status=COMPLETED&status=REFUNDED

# By sale type
GET /sales/api/sales/?type=RETAIL

# By payment type
GET /sales/api/sales/?payment_type=CASH

# Combined
GET /sales/api/sales/?status=COMPLETED&type=RETAIL&payment_type=CASH
```

---

### 6. Sales Summary/Analytics Endpoint
**Requirement:** Get sales summary for insights (totals, averages, trends)

**Backend Implementation:**
```python
from django.db.models import Sum, Avg, Count, Q
from django.db.models.functions import TruncDate

class SaleViewSet(viewsets.ModelViewSet):
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get sales summary with analytics"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Apply same filters as list view
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        date_range = request.query_params.get('date_range')
        
        # Calculate aggregates
        summary = queryset.aggregate(
            total_sales=Sum('total_amount', filter=Q(status='COMPLETED')),
            total_refunds=Sum('total_amount', filter=Q(status='REFUNDED')),
            total_transactions=Count('id'),
            avg_transaction=Avg('total_amount', filter=Q(status='COMPLETED')),
            cash_sales=Sum('total_amount', filter=Q(payment_type='CASH', status='COMPLETED')),
            card_sales=Sum('total_amount', filter=Q(payment_type='CARD', status='COMPLETED')),
            credit_sales=Sum('total_amount', filter=Q(payment_type='CREDIT', status='COMPLETED')),
            momo_sales=Sum('total_amount', filter=Q(payment_type='MOMO', status='COMPLETED')),
        )
        
        # Status breakdown
        status_breakdown = queryset.values('status').annotate(
            count=Count('id'),
            total=Sum('total_amount')
        ).order_by('-count')
        
        # Daily trend (last 30 days or filtered range)
        daily_trend = queryset.filter(
            status='COMPLETED'
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            sales=Sum('total_amount'),
            transactions=Count('id')
        ).order_by('date')
        
        # Top customers
        top_customers = queryset.filter(
            status='COMPLETED',
            customer__isnull=False
        ).values('customer_name').annotate(
            total_spent=Sum('total_amount'),
            transaction_count=Count('id')
        ).order_by('-total_spent')[:10]
        
        return Response({
            'summary': summary,
            'status_breakdown': list(status_breakdown),
            'daily_trend': list(daily_trend),
            'top_customers': list(top_customers),
        })
```

**API Endpoint:**
```bash
# Get summary for all sales
GET /sales/api/sales/summary/

# Summary for this month
GET /sales/api/sales/summary/?date_range=this_month

# Summary for date range
GET /sales/api/sales/summary/?date_from=2025-01-01&date_to=2025-03-31

# Summary for specific storefront
GET /sales/api/sales/summary/?storefront=xyz
```

**Expected Response:**
```json
{
  "summary": {
    "total_sales": 125450.00,
    "total_refunds": 3200.00,
    "net_sales": 122250.00,
    "total_transactions": 504,
    "avg_transaction": 248.91,
    "cash_sales": 45000.00,
    "card_sales": 60450.00,
    "credit_sales": 15000.00,
    "momo_sales": 5000.00
  },
  "status_breakdown": [
    {"status": "COMPLETED", "count": 375, "total": 125450.00},
    {"status": "DRAFT", "count": 89, "total": 0},
    {"status": "REFUNDED", "count": 40, "total": 3200.00}
  ],
  "daily_trend": [
    {"date": "2025-01-01", "sales": 5400.00, "transactions": 23},
    {"date": "2025-01-02", "sales": 4200.00, "transactions": 18},
    // ...
  ],
  "top_customers": [
    {"customer_name": "ABC Corp", "total_spent": 15000.00, "transaction_count": 45},
    // ...
  ]
}
```

---

### 7. Sale Detail Endpoint
**Requirement:** Get detailed sale information for modal view

**Backend Implementation:**
```python
class SaleViewSet(viewsets.ModelViewSet):
    
    def retrieve(self, request, pk=None):
        """Get sale detail with all related data"""
        sale = self.get_object()
        
        serializer = SaleDetailSerializer(sale)
        return Response(serializer.data)

class SaleDetailSerializer(serializers.ModelSerializer):
    line_items = SaleItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    refunds = RefundSerializer(many=True, read_only=True)
    
    # Include user details
    user_details = serializers.SerializerMethodField()
    
    # Include customer details
    customer_details = serializers.SerializerMethodField()
    
    def get_user_details(self, obj):
        if obj.user:
            return {
                'id': str(obj.user.id),
                'name': obj.user.get_full_name(),
                'email': obj.user.email
            }
        return None
    
    def get_customer_details(self, obj):
        if obj.customer:
            return {
                'id': str(obj.customer.id),
                'name': obj.customer.name,
                'email': obj.customer.email,
                'phone': obj.customer.phone,
                'type': obj.customer.type,
                'credit_limit': float(obj.customer.credit_limit),
                'outstanding_balance': float(obj.customer.outstanding_balance)
            }
        return None
    
    class Meta:
        model = Sale
        fields = '__all__'
```

**API Endpoint:**
```bash
# Get sale detail
GET /sales/api/sales/{sale_id}/

# Example
GET /sales/api/sales/123e4567-e89b-12d3-a456-426614174000/
```

**Expected Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "receipt_number": "REC-2025-001234",
  "storefront_name": "Main Store",
  "customer_name": "John Doe",
  "user_name": "Jane Smith",
  "status": "COMPLETED",
  "total_amount": 450.00,
  "line_items": [
    {
      "product_name": "Product A",
      "quantity": 2,
      "unit_price": 150.00,
      "total_price": 300.00
    },
    // ...
  ],
  "payments": [
    {
      "payment_method": "CARD",
      "amount_paid": 450.00,
      "status": "COMPLETED"
    }
  ],
  "user_details": {
    "id": "...",
    "name": "Jane Smith",
    "email": "jane@example.com"
  },
  "customer_details": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "type": "RETAIL"
  },
  "created_at": "2025-01-15T10:30:00Z",
  "completed_at": "2025-01-15T10:32:00Z"
}
```

---

### 8. Export Sales Data
**Requirement:** Export sales to CSV for reporting

**Backend Implementation:**
```python
import csv
from django.http import HttpResponse

class SaleViewSet(viewsets.ModelViewSet):
    
    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export sales to CSV"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Apply same filters as list view
        # ... (use same filter logic)
        
        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="sales_export.csv"'
        
        writer = csv.writer(response)
        
        # Header
        writer.writerow([
            'Receipt Number',
            'Date',
            'Storefront',
            'Customer',
            'Items',
            'Subtotal',
            'Tax',
            'Total',
            'Paid',
            'Due',
            'Payment Type',
            'Status',
            'Cashier'
        ])
        
        # Data rows
        for sale in queryset:
            writer.writerow([
                sale.receipt_number,
                sale.created_at.strftime('%Y-%m-%d %H:%M'),
                sale.storefront_name,
                sale.customer_name or 'Walk-in',
                sale.line_items.count(),
                sale.subtotal,
                sale.tax_amount,
                sale.total_amount,
                sale.amount_paid,
                sale.amount_due,
                sale.payment_type,
                sale.status,
                sale.user_name
            ])
        
        return response
```

**API Endpoint:**
```bash
# Export all sales
GET /sales/api/sales/export/

# Export with filters
GET /sales/api/sales/export/?date_range=this_month&status=COMPLETED

# Export with date range
GET /sales/api/sales/export/?date_from=2025-01-01&date_to=2025-03-31
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Immediate (This Week) - CRITICAL
- [ ] **Fix receipt_number display** (10 min)
  - Ensure field is in serializer
  - Test API response includes it
  - Verify in frontend

- [ ] **Fix data return issue** (30 min)
  - Check default filters
  - Ensure all sales returned
  - Test pagination with full dataset

### High Priority (This Week)
- [ ] **Search functionality** (1 hour)
  - Implement search fields
  - Add amount search
  - Test all search cases

- [ ] **Date range filters** (2 hours)
  - Implement filter class
  - Add quick filters (today, this week, etc.)
  - Add custom date range
  - Test all combinations

- [ ] **Sales summary endpoint** (2 hours)
  - Implement analytics aggregation
  - Add daily trend calculation
  - Add top customers
  - Test with various filters

### Medium Priority (Next Week)
- [ ] **Status/type filters** (30 min)
  - Add to filter class
  - Test combinations

- [ ] **Sale detail endpoint** (1 hour)
  - Create detailed serializer
  - Include all related data
  - Test response

- [ ] **CSV export** (1 hour)
  - Implement export action
  - Apply filters to export
  - Test file download

---

## 🧪 TESTING REQUIREMENTS

### Unit Tests
```python
class SaleViewSetTestCase(TestCase):
    
    def test_receipt_number_in_response(self):
        """Ensure receipt number is always included"""
        response = self.client.get('/sales/api/sales/')
        self.assertIn('receipt_number', response.data['results'][0])
        self.assertIsNotNone(response.data['results'][0]['receipt_number'])
    
    def test_all_sales_returned(self):
        """Ensure all sales are returned without filters"""
        # Create 100 sales
        # ...
        response = self.client.get('/sales/api/sales/')
        self.assertEqual(response.data['count'], 100)
    
    def test_search_by_receipt(self):
        """Test search by receipt number"""
        sale = Sale.objects.create(receipt_number='REC-TEST-001')
        response = self.client.get('/sales/api/sales/?search=REC-TEST-001')
        self.assertEqual(response.data['count'], 1)
    
    def test_date_range_filter(self):
        """Test date range filtering"""
        response = self.client.get('/sales/api/sales/?date_range=this_month')
        # Assert correct filtering
    
    def test_sales_summary(self):
        """Test sales summary endpoint"""
        response = self.client.get('/sales/api/sales/summary/')
        self.assertIn('summary', response.data)
        self.assertIn('total_sales', response.data['summary'])
```

### Manual Testing Checklist
- [ ] Receipt numbers visible in all responses
- [ ] All sales returned (count matches database)
- [ ] Search works for receipt, customer, amount
- [ ] Date filters work (today, this week, month, custom)
- [ ] Status filters work
- [ ] Summary shows correct calculations
- [ ] CSV export includes all filtered sales
- [ ] Performance < 1s for 1000 sales

---

## 📊 EXPECTED OUTCOMES

**After Implementation:**

1. **Receipt Numbers Visible** ✅
   - Every sale shows its receipt number
   - Can search by receipt number

2. **All Sales Accessible** ✅
   - See all 504 sales (Jan-Oct)
   - Proper pagination (20/page)
   - Can navigate all pages

3. **Powerful Search** ✅
   - Search by receipt: "REC-2025-001234"
   - Search by customer: "John"
   - Search by amount: "$150.00"

4. **Date Filtering** ✅
   - Quick filters: Today, This Week, This Month
   - Custom range: Jan 1 - Mar 31
   - Year-to-date view

5. **Business Insights** ✅
   - Total sales: $125,450
   - Average transaction: $248.91
   - Top customers list
   - Daily sales trend

6. **Data Export** ✅
   - Export to CSV
   - Applies current filters
   - Ready for Excel/analysis

---

## 🚀 DEPLOYMENT PLAN

### Stage 1: Critical Fixes (Today)
1. Fix receipt_number serializer
2. Fix data return issue
3. Deploy to staging
4. Test with frontend

### Stage 2: Search & Filters (Tomorrow)
1. Implement search
2. Implement date filters
3. Deploy to staging
4. Integration test

### Stage 3: Analytics (Day 3)
1. Implement summary endpoint
2. Test calculations
3. Deploy to staging
4. Frontend integration

### Stage 4: Export & Details (Day 4)
1. Implement CSV export
2. Implement detail view
3. Final testing
4. Deploy to production

---

## 📞 COMMUNICATION

**When Complete, Please Confirm:**

1. ✅ Receipt numbers showing: `receipt_number` field in response
2. ✅ All sales accessible: Count returns 504, pagination works
3. ✅ Search implemented: Works for receipt, customer, amount
4. ✅ Date filters working: Today, this week, month, custom range
5. ✅ Summary endpoint: Returns analytics data
6. ✅ Export working: CSV downloads with filters

**Share Sample Responses:**
```bash
# List with receipt numbers
curl /sales/api/sales/ | jq '.results[0].receipt_number'

# Search result
curl /sales/api/sales/?search=REC-2025 | jq '.count'

# Summary
curl /sales/api/sales/summary/?date_range=this_month | jq '.summary'
```

---

**Estimated Total Time:** 8-10 hours  
**Priority:** CRITICAL  
**Target Completion:** October 8, 2025  
**Owner:** Backend Team  
**Review:** Frontend Team

---

**Questions? Issues?**  
Contact frontend team immediately if:
- Any requirement is unclear
- API structure needs changes
- Timeline needs adjustment
- Testing reveals issues
