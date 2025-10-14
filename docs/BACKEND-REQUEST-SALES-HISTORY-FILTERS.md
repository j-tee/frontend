# Backend Request: Sales History Advanced Filtering

**Date**: October 14, 2025  
**Requested By**: Frontend Team  
**Priority**: HIGH (Phase 1), MEDIUM (Phase 2)  
**Status**: 🟡 Pending Implementation

---

## 🎯 Objective

Add server-side filtering capabilities to the sales history endpoint to enable filtering by product, customer, amount range, category, and user.

---

## 📋 Current Endpoint

```
GET /sales/api/sales/
```

**Existing Parameters** (Already Working ✅):
- `search` - Search by receipt #, customer, or amount
- `status` - Filter by COMPLETED, DRAFT, CANCELLED, REFUNDED
- `storefront` - Filter by storefront ID
- `date_from` - Filter by date range (start)
- `date_to` - Filter by date range (end)
- `payment_type` - Filter by CASH, CARD, MOBILE, CREDIT, SPLIT
- `page` - Pagination page number
- `page_size` - Items per page

---

## ✨ New Parameters Needed

### Phase 1: Core Filters (High Priority) 🔥

#### 1. Product Filter

**Parameters:**
```
?product={product_id}           ← Filter by exact product UUID
?product_name={query}            ← Filter by product name (partial match)
```

**Behavior:**
- Returns sales that contain the specified product in their `line_items`
- Case-insensitive search for `product_name`
- Should use `.distinct()` to avoid duplicate sales

**Implementation:**
```python
product_id = request.query_params.get('product')
product_name = request.query_params.get('product_name')

if product_id:
    queryset = queryset.filter(
        line_items__product_id=product_id
    ).distinct()

if product_name:
    queryset = queryset.filter(
        line_items__product__name__icontains=product_name
    ).distinct()
```

**Example:**
```bash
# Find all sales containing product with ID abc-123
curl "/sales/api/sales/?product=abc-123"

# Find all sales containing "Sugar"
curl "/sales/api/sales/?product_name=sugar"
```

---

#### 2. Customer Filter

**Parameters:**
```
?customer={customer_id}          ← Filter by exact customer UUID
?customer_name={query}           ← Filter by customer name (partial match)
```

**Behavior:**
- Returns sales for the specified customer
- Case-insensitive search for `customer_name`

**Implementation:**
```python
customer_id = request.query_params.get('customer')
customer_name = request.query_params.get('customer_name')

if customer_id:
    queryset = queryset.filter(customer_id=customer_id)

if customer_name:
    queryset = queryset.filter(
        customer__name__icontains=customer_name
    ).distinct()
```

**Example:**
```bash
# Find all sales by customer ID
curl "/sales/api/sales/?customer=def-456"

# Find all sales by customer name
curl "/sales/api/sales/?customer_name=John"
```

---

#### 3. Amount Range Filter

**Parameters:**
```
?min_amount={decimal}            ← Minimum total amount (inclusive)
?max_amount={decimal}            ← Maximum total amount (inclusive)
```

**Behavior:**
- Filters by `total_amount` field
- Can use min only, max only, or both together
- Inclusive range (min <= amount <= max)

**Implementation:**
```python
min_amount = request.query_params.get('min_amount')
max_amount = request.query_params.get('max_amount')

if min_amount:
    queryset = queryset.filter(total_amount__gte=min_amount)

if max_amount:
    queryset = queryset.filter(total_amount__lte=max_amount)
```

**Example:**
```bash
# Find sales over GH₵100
curl "/sales/api/sales/?min_amount=100"

# Find sales under GH₵50
curl "/sales/api/sales/?max_amount=50"

# Find sales between GH₵50 and GH₵200
curl "/sales/api/sales/?min_amount=50&max_amount=200"
```

---

### Phase 2: Analytics Filters (Medium Priority) 📊

#### 4. Category Filter

**Parameters:**
```
?category={category_id}          ← Filter by product category
```

**Behavior:**
- Returns sales containing products from the specified category
- Should use `.distinct()` to avoid duplicate sales

**Implementation:**
```python
category_id = request.query_params.get('category')

if category_id:
    queryset = queryset.filter(
        line_items__product__category_id=category_id
    ).distinct()
```

**Example:**
```bash
# Find all sales with Food category products
curl "/sales/api/sales/?category=food-cat-id"
```

---

#### 5. User/Cashier Filter

**Parameters:**
```
?user={user_id}                  ← Filter by cashier/user who created the sale
```

**Behavior:**
- Returns sales created by the specified user
- May already be implemented

**Implementation:**
```python
user_id = request.query_params.get('user')

if user_id:
    queryset = queryset.filter(user_id=user_id)
```

**Example:**
```bash
# Find all sales by specific cashier
curl "/sales/api/sales/?user=user-123"
```

---

## 🔧 Complete Implementation Example

```python
# sales/views.py

from django.db.models import Q
from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination

class SaleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Sale operations with comprehensive filtering.
    """
    
    def get_queryset(self):
        queryset = Sale.objects.all().select_related(
            'customer',
            'storefront',
            'user'
        ).prefetch_related(
            'line_items',
            'line_items__product',
            'line_items__product__category'
        )
        
        # ========== EXISTING FILTERS (Keep these!) ==========
        
        # Search filter
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(receipt_number__icontains=search) |
                Q(customer__name__icontains=search) |
                Q(total_amount__icontains=search)
            )
        
        # Status filter
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        
        # Storefront filter
        storefront = self.request.query_params.get('storefront')
        if storefront:
            queryset = queryset.filter(storefront_id=storefront)
        
        # Date range filter
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            # Include the entire end date
            queryset = queryset.filter(created_at__lt=f"{date_to}T23:59:59")
        
        # Payment type filter
        payment_type = self.request.query_params.get('payment_type')
        if payment_type:
            queryset = queryset.filter(payment_type=payment_type)
        
        # ========== ✨ NEW FILTERS (Add these!) ==========
        
        # Product filter
        product_id = self.request.query_params.get('product')
        product_name = self.request.query_params.get('product_name')
        
        if product_id:
            queryset = queryset.filter(
                line_items__product_id=product_id
            ).distinct()
        
        if product_name:
            queryset = queryset.filter(
                line_items__product__name__icontains=product_name
            ).distinct()
        
        # Customer filter
        customer_id = self.request.query_params.get('customer')
        customer_name = self.request.query_params.get('customer_name')
        
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        
        if customer_name:
            queryset = queryset.filter(
                customer__name__icontains=customer_name
            ).distinct()
        
        # Amount range filter
        min_amount = self.request.query_params.get('min_amount')
        max_amount = self.request.query_params.get('max_amount')
        
        if min_amount:
            try:
                queryset = queryset.filter(total_amount__gte=float(min_amount))
            except (ValueError, TypeError):
                pass  # Ignore invalid input
        
        if max_amount:
            try:
                queryset = queryset.filter(total_amount__lte=float(max_amount))
            except (ValueError, TypeError):
                pass  # Ignore invalid input
        
        # Category filter
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(
                line_items__product__category_id=category_id
            ).distinct()
        
        # User/Cashier filter
        user_id = self.request.query_params.get('user')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Order by most recent first
        queryset = queryset.order_by('-created_at')
        
        return queryset
```

---

## 📊 Database Optimization

### Add Indexes for Performance

```python
# sales/models.py or create a migration

class Sale(models.Model):
    # ... existing fields ...
    
    class Meta:
        indexes = [
            # Existing indexes
            models.Index(fields=['receipt_number']),
            models.Index(fields=['status']),
            models.Index(fields=['storefront']),
            models.Index(fields=['created_at']),
            models.Index(fields=['payment_type']),
            
            # ✨ NEW: Add these indexes
            models.Index(fields=['customer']),
            models.Index(fields=['total_amount']),
            models.Index(fields=['user']),
            models.Index(fields=['created_at', 'status']),
            models.Index(fields=['storefront', 'created_at']),
        ]

class SaleLineItem(models.Model):
    # ... existing fields ...
    
    class Meta:
        indexes = [
            # ✨ NEW: Add these indexes
            models.Index(fields=['product']),
            models.Index(fields=['sale', 'product']),
        ]
```

**Migration to create indexes:**

```python
# sales/migrations/000X_add_filter_indexes.py

from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('sales', '000X_previous_migration'),
    ]
    
    operations = [
        # Sale table indexes
        migrations.AddIndex(
            model_name='sale',
            index=models.Index(fields=['customer'], name='sale_customer_idx'),
        ),
        migrations.AddIndex(
            model_name='sale',
            index=models.Index(fields=['total_amount'], name='sale_amount_idx'),
        ),
        migrations.AddIndex(
            model_name='sale',
            index=models.Index(fields=['user'], name='sale_user_idx'),
        ),
        migrations.AddIndex(
            model_name='sale',
            index=models.Index(fields=['created_at', 'status'], name='sale_date_status_idx'),
        ),
        
        # SaleLineItem table indexes
        migrations.AddIndex(
            model_name='salelineitem',
            index=models.Index(fields=['product'], name='lineitem_product_idx'),
        ),
        migrations.AddIndex(
            model_name='salelineitem',
            index=models.Index(fields=['sale', 'product'], name='lineitem_sale_product_idx'),
        ),
    ]
```

---

## 🧪 Testing Requirements

### Unit Tests

```python
# sales/tests/test_filters.py

from django.test import TestCase
from rest_framework.test import APIClient

class SalesFilterTests(TestCase):
    
    def setUp(self):
        self.client = APIClient()
        # Create test data: sales with various products, customers, amounts
    
    def test_filter_by_product_id(self):
        """Test filtering sales by product ID"""
        response = self.client.get(
            '/sales/api/sales/',
            {'product': str(self.sugar_product.id)}
        )
        
        self.assertEqual(response.status_code, 200)
        
        # Verify all sales contain the product
        for sale in response.data['results']:
            sale_obj = Sale.objects.get(id=sale['id'])
            self.assertTrue(
                sale_obj.line_items.filter(product=self.sugar_product).exists()
            )
    
    def test_filter_by_product_name(self):
        """Test filtering sales by product name"""
        response = self.client.get(
            '/sales/api/sales/',
            {'product_name': 'sugar'}
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertGreater(len(response.data['results']), 0)
        
        # Verify results contain sugar product
        for sale in response.data['results']:
            sale_obj = Sale.objects.get(id=sale['id'])
            has_sugar = any(
                'sugar' in item.product.name.lower()
                for item in sale_obj.line_items.all()
            )
            self.assertTrue(has_sugar)
    
    def test_filter_by_customer_id(self):
        """Test filtering sales by customer ID"""
        response = self.client.get(
            '/sales/api/sales/',
            {'customer': str(self.john_customer.id)}
        )
        
        self.assertEqual(response.status_code, 200)
        
        # Verify all sales belong to customer
        for sale in response.data['results']:
            self.assertEqual(sale['customer'], str(self.john_customer.id))
    
    def test_filter_by_amount_range(self):
        """Test filtering sales by amount range"""
        response = self.client.get(
            '/sales/api/sales/',
            {'min_amount': '50', 'max_amount': '200'}
        )
        
        self.assertEqual(response.status_code, 200)
        
        # Verify all sales within range
        for sale in response.data['results']:
            amount = float(sale['total_amount'])
            self.assertGreaterEqual(amount, 50)
            self.assertLessEqual(amount, 200)
    
    def test_filter_by_category(self):
        """Test filtering sales by product category"""
        response = self.client.get(
            '/sales/api/sales/',
            {'category': str(self.food_category.id)}
        )
        
        self.assertEqual(response.status_code, 200)
        
        # Verify all sales contain food category products
        for sale in response.data['results']:
            sale_obj = Sale.objects.get(id=sale['id'])
            has_food = sale_obj.line_items.filter(
                product__category=self.food_category
            ).exists()
            self.assertTrue(has_food)
    
    def test_combined_filters(self):
        """Test multiple filters work together"""
        response = self.client.get(
            '/sales/api/sales/',
            {
                'product_name': 'sugar',
                'min_amount': '50',
                'status': 'COMPLETED',
                'date_from': '2025-10-01'
            }
        )
        
        self.assertEqual(response.status_code, 200)
        
        # Verify all conditions are met
        for sale in response.data['results']:
            sale_obj = Sale.objects.get(id=sale['id'])
            
            # Has sugar product
            has_sugar = any(
                'sugar' in item.product.name.lower()
                for item in sale_obj.line_items.all()
            )
            self.assertTrue(has_sugar)
            
            # Amount >= 50
            self.assertGreaterEqual(float(sale['total_amount']), 50)
            
            # Status is COMPLETED
            self.assertEqual(sale['status'], 'COMPLETED')
            
            # Date >= 2025-10-01
            sale_date = sale_obj.created_at.date()
            self.assertGreaterEqual(sale_date, date(2025, 10, 1))
    
    def test_no_duplicate_sales(self):
        """Test that distinct() prevents duplicates when filtering by product"""
        # Create a sale with 2 line items of the same product
        sale = Sale.objects.create(...)
        SaleLineItem.objects.create(sale=sale, product=self.sugar_product, quantity=1)
        SaleLineItem.objects.create(sale=sale, product=self.sugar_product, quantity=2)
        
        response = self.client.get(
            '/sales/api/sales/',
            {'product': str(self.sugar_product.id)}
        )
        
        # Should return sale only once
        sale_ids = [s['id'] for s in response.data['results']]
        self.assertEqual(len(sale_ids), len(set(sale_ids)), "Found duplicate sales!")
```

---

## 📝 Manual Testing with curl

```bash
# Test product filter by ID
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/sales/api/sales/?product=$PRODUCT_ID"

# Test product filter by name
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/sales/api/sales/?product_name=sugar"

# Test customer filter by ID
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/sales/api/sales/?customer=$CUSTOMER_ID"

# Test customer filter by name
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/sales/api/sales/?customer_name=John"

# Test amount range
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/sales/api/sales/?min_amount=50&max_amount=200"

# Test category filter
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/sales/api/sales/?category=$CATEGORY_ID"

# Test combined filters
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/sales/api/sales/?product_name=sugar&min_amount=50&status=COMPLETED"

# Test with pagination
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/sales/api/sales/?product_name=rice&page=1&page_size=20"
```

---

## ⚡ Performance Considerations

### Query Optimization

1. **Use select_related and prefetch_related**
   ```python
   queryset = Sale.objects.select_related(
       'customer',
       'storefront',
       'user'
   ).prefetch_related(
       'line_items',
       'line_items__product',
       'line_items__product__category'
   )
   ```

2. **Use .distinct() carefully**
   - Only when filtering by relationships (product, category)
   - Can be expensive on large datasets

3. **Add database indexes**
   - See "Database Optimization" section above

4. **Limit queryset early**
   - Apply most restrictive filters first
   - Use pagination

### Expected Performance

- Simple filters (customer, status, date): **<100ms**
- Product/category filters (with distinct): **<300ms**
- Combined filters: **<500ms**
- With 10,000+ sales: Should still be **<1s**

---

## ✅ Checklist

### Phase 1 (High Priority)

- [ ] Implement product ID filter
- [ ] Implement product name filter
- [ ] Implement customer ID filter
- [ ] Implement customer name filter
- [ ] Implement min_amount filter
- [ ] Implement max_amount filter
- [ ] Add database indexes
- [ ] Write unit tests for all new filters
- [ ] Write tests for combined filters
- [ ] Test for duplicate prevention (distinct)
- [ ] Manual testing with curl
- [ ] Performance testing with large dataset
- [ ] Deploy to staging
- [ ] Notify frontend team

### Phase 2 (Medium Priority)

- [ ] Implement category filter
- [ ] Implement user/cashier filter
- [ ] Add additional indexes if needed
- [ ] Write unit tests
- [ ] Deploy to staging

---

## 📅 Timeline

| Task | Estimated Time |
|------|----------------|
| Product filter implementation | 2 hours |
| Customer filter implementation | 1.5 hours |
| Amount range filter implementation | 1 hour |
| Database indexes | 0.5 hours |
| Unit tests | 2 hours |
| Manual testing | 1 hour |
| Code review & fixes | 1 hour |
| **Phase 1 Total** | **9 hours** |
| Category filter | 1 hour |
| User filter | 0.5 hours |
| Tests | 1 hour |
| **Phase 2 Total** | **2.5 hours** |
| **Grand Total** | **11.5 hours** |

---

## 📞 Contact

**Questions?** Contact the backend team lead or create a ticket.

**Ready to implement?** Review this document and confirm timeline before starting.
