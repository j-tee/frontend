# Backend Implementation Example: Catalog Filtering

**File**: For Backend Team Reference  
**Language**: Python/Django

---

## 🎯 What to Add

You need to add **query parameter support** to two existing endpoints. Here's exactly what to implement:

---

## 1️⃣ Single Storefront Catalog

**Current Endpoint**:
```python
@action(detail=True, methods=['get'], url_path='sale-catalog')
def sale_catalog(self, request, pk=None):
    storefront = self.get_object()
    
    # Currently returns ALL products
    inventory_items = StorefrontInventory.objects.filter(
        storefront=storefront
    )
    
    products = []
    for inv in inventory_items:
        products.append({
            'product_id': str(inv.product.id),
            'product_name': inv.product.name,
            # ... other fields
        })
    
    return Response({'products': products})
```

**Enhanced Version with Filtering**:
```python
@action(detail=True, methods=['get'], url_path='sale-catalog')
def sale_catalog(self, request, pk=None):
    storefront = self.get_object()
    
    # ✨ NEW: Get query parameters
    search_query = request.query_params.get('search', '').strip()
    category_id = request.query_params.get('category')
    min_price = request.query_params.get('min_price')
    max_price = request.query_params.get('max_price')
    in_stock_only = request.query_params.get('in_stock_only', 'true').lower() == 'true'
    
    # Base queryset
    inventory_items = StorefrontInventory.objects.filter(
        storefront=storefront
    ).select_related('product', 'product__category')
    
    # ✨ NEW: Apply filters
    if in_stock_only:
        inventory_items = inventory_items.filter(available_quantity__gt=0)
    
    if search_query:
        from django.db.models import Q
        inventory_items = inventory_items.filter(
            Q(product__name__icontains=search_query) |
            Q(product__sku__icontains=search_query) |
            Q(product__barcode__icontains=search_query)
        )
    
    if category_id:
        inventory_items = inventory_items.filter(product__category_id=category_id)
    
    if min_price:
        inventory_items = inventory_items.filter(product__retail_price__gte=min_price)
    
    if max_price:
        inventory_items = inventory_items.filter(product__retail_price__lte=max_price)
    
    # Order by name for consistency
    inventory_items = inventory_items.order_by('product__name')
    
    # ✨ NEW: Add pagination
    from rest_framework.pagination import PageNumberPagination
    
    paginator = PageNumberPagination()
    paginator.page_size = int(request.query_params.get('page_size', 50))
    paginator.max_page_size = 200
    
    page = paginator.paginate_queryset(inventory_items, request)
    
    # Build products list (same as before)
    products = []
    for inv in page:
        product = inv.product
        
        # Get stock product IDs
        stock_product_ids = list(
            StockProduct.objects.filter(
                product=product,
                storefront_inventory__storefront=storefront
            ).values_list('id', flat=True)
        )
        
        if not stock_product_ids:
            continue
        
        products.append({
            'product_id': str(product.id),
            'product_name': product.name,
            'sku': product.sku or '',
            'barcode': product.barcode,
            'category_name': product.category.name if product.category else None,
            'unit': product.unit,
            'product_image': product.image.url if product.image else None,
            'available_quantity': inv.available_quantity,
            'retail_price': str(product.retail_price),
            'wholesale_price': str(product.wholesale_price) if product.wholesale_price else None,
            'stock_product_ids': [str(sid) for sid in stock_product_ids],
            'last_stocked_at': inv.last_stocked_at.isoformat() if inv.last_stocked_at else None,
        })
    
    # ✨ NEW: Return paginated response
    return paginator.get_paginated_response({'products': products})
```

---

## 2️⃣ Multi-Storefront Catalog

**Current Endpoint**:
```python
@action(detail=False, methods=['get'], url_path='multi-storefront-catalog')
def multi_storefront_catalog(self, request):
    user = request.user
    
    # Get accessible storefronts
    if hasattr(user, 'business_owner'):
        storefronts = Storefront.objects.filter(
            business=user.business_owner.business,
            is_active=True
        )
    else:
        # Employee logic
        employee_assignments = StoreFrontEmployee.objects.filter(
            employee__user=user
        ).values_list('storefront_id', flat=True)
        storefronts = Storefront.objects.filter(
            id__in=employee_assignments,
            is_active=True
        )
    
    # Currently returns ALL products from ALL storefronts
    all_products = {}
    for storefront in storefronts:
        # ... aggregation logic
    
    return Response({
        'storefronts': [...],
        'products': list(all_products.values())
    })
```

**Enhanced Version with Filtering**:
```python
@action(detail=False, methods=['get'], url_path='multi-storefront-catalog')
def multi_storefront_catalog(self, request):
    user = request.user
    
    # ✨ NEW: Get query parameters
    search_query = request.query_params.get('search', '').strip()
    category_id = request.query_params.get('category')
    min_price = request.query_params.get('min_price')
    max_price = request.query_params.get('max_price')
    in_stock_only = request.query_params.get('in_stock_only', 'true').lower() == 'true'
    storefront_filter = request.query_params.getlist('storefront')
    
    # Get accessible storefronts
    if hasattr(user, 'business_owner'):
        storefronts = Storefront.objects.filter(
            business=user.business_owner.business,
            is_active=True
        )
    else:
        employee_assignments = StoreFrontEmployee.objects.filter(
            employee__user=user
        ).values_list('storefront_id', flat=True)
        storefronts = Storefront.objects.filter(
            id__in=employee_assignments,
            is_active=True
        )
    
    # ✨ NEW: Optional storefront filtering
    if storefront_filter:
        storefronts = storefronts.filter(id__in=storefront_filter)
    
    # Get inventory items with filters
    inventory_items = StorefrontInventory.objects.filter(
        storefront__in=storefronts
    ).select_related('product', 'product__category', 'storefront')
    
    # ✨ NEW: Apply filters
    if in_stock_only:
        inventory_items = inventory_items.filter(available_quantity__gt=0)
    
    if search_query:
        from django.db.models import Q
        inventory_items = inventory_items.filter(
            Q(product__name__icontains=search_query) |
            Q(product__sku__icontains=search_query) |
            Q(product__barcode__icontains=search_query)
        )
    
    if category_id:
        inventory_items = inventory_items.filter(product__category_id=category_id)
    
    if min_price:
        inventory_items = inventory_items.filter(product__retail_price__gte=min_price)
    
    if max_price:
        inventory_items = inventory_items.filter(product__retail_price__lte=max_price)
    
    # Aggregate by product
    from collections import defaultdict
    product_map = defaultdict(lambda: {
        'locations': [],
        'stock_product_ids': [],
        'total_available': 0,
    })
    
    for inv in inventory_items:
        product = inv.product
        product_key = str(product.id)
        
        # Get stock IDs for this location
        stock_ids = list(
            StockProduct.objects.filter(
                product=product,
                storefront_inventory__storefront=inv.storefront
            ).values_list('id', flat=True)
        )
        
        # Initialize product data if first time
        if 'product_name' not in product_map[product_key]:
            product_map[product_key].update({
                'product_id': str(product.id),
                'product_name': product.name,
                'sku': product.sku or '',
                'barcode': product.barcode,
                'category_name': product.category.name if product.category else None,
                'unit': product.unit,
                'product_image': product.image.url if product.image else None,
                'retail_price': str(product.retail_price),
                'wholesale_price': str(product.wholesale_price) if product.wholesale_price else None,
                'last_stocked_at': inv.last_stocked_at.isoformat() if inv.last_stocked_at else None,
            })
        
        # Add location info
        product_map[product_key]['total_available'] += inv.available_quantity
        product_map[product_key]['stock_product_ids'].extend([str(sid) for sid in stock_ids])
        product_map[product_key]['locations'].append({
            'storefront_id': str(inv.storefront.id),
            'storefront_name': inv.storefront.name,
            'available_quantity': inv.available_quantity,
        })
    
    # Convert to list and sort
    products_list = list(product_map.values())
    products_list.sort(key=lambda x: x.get('product_name', ''))
    
    # ✨ NEW: Add pagination
    from rest_framework.pagination import PageNumberPagination
    
    paginator = PageNumberPagination()
    paginator.page_size = int(request.query_params.get('page_size', 50))
    paginator.max_page_size = 200
    
    page = paginator.paginate_queryset(products_list, request)
    
    return paginator.get_paginated_response({
        'storefronts': [{'id': str(sf.id), 'name': sf.name} for sf in storefronts],
        'products': page
    })
```

---

## 🧪 Test Examples

```python
# tests/test_catalog_filtering.py

from django.test import TestCase
from rest_framework.test import APIClient

class CatalogFilteringTests(TestCase):
    
    def setUp(self):
        self.client = APIClient()
        # ... create test data
    
    def test_search_by_product_name(self):
        """Test searching by product name"""
        response = self.client.get(
            f'/inventory/api/storefronts/{self.storefront.id}/sale-catalog/',
            {'search': 'sugar'}
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertGreater(len(response.data['products']), 0)
        
        # Verify all results match search
        for product in response.data['products']:
            self.assertIn('sugar', product['product_name'].lower())
    
    def test_filter_by_category(self):
        """Test filtering by category"""
        response = self.client.get(
            f'/inventory/api/storefronts/{self.storefront.id}/sale-catalog/',
            {'category': str(self.food_category.id)}
        )
        
        self.assertEqual(response.status_code, 200)
        
        # Verify all products are in the category
        for product in response.data['products']:
            self.assertEqual(product['category_name'], 'Food')
    
    def test_filter_by_price_range(self):
        """Test filtering by price range"""
        response = self.client.get(
            f'/inventory/api/storefronts/{self.storefront.id}/sale-catalog/',
            {'min_price': 10, 'max_price': 50}
        )
        
        self.assertEqual(response.status_code, 200)
        
        # Verify all prices are in range
        for product in response.data['products']:
            price = float(product['retail_price'])
            self.assertGreaterEqual(price, 10)
            self.assertLessEqual(price, 50)
    
    def test_combined_filters(self):
        """Test multiple filters together"""
        response = self.client.get(
            f'/inventory/api/storefronts/{self.storefront.id}/sale-catalog/',
            {
                'search': 'rice',
                'category': str(self.food_category.id),
                'max_price': 25,
                'in_stock_only': 'true'
            }
        )
        
        self.assertEqual(response.status_code, 200)
        
        for product in response.data['products']:
            self.assertIn('rice', product['product_name'].lower())
            self.assertEqual(product['category_name'], 'Food')
            self.assertLessEqual(float(product['retail_price']), 25)
            self.assertGreater(product['available_quantity'], 0)
    
    def test_pagination(self):
        """Test pagination works"""
        # Create 100 products
        # ...
        
        response = self.client.get(
            f'/inventory/api/storefronts/{self.storefront.id}/sale-catalog/',
            {'page_size': 10}
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['products']), 10)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)
        self.assertIn('count', response.data)
    
    def test_multi_storefront_search(self):
        """Test multi-storefront search"""
        self.client.force_authenticate(user=self.owner_user)
        
        response = self.client.get(
            '/inventory/api/storefronts/multi-storefront-catalog/',
            {'search': 'sugar'}
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('storefronts', response.data)
        self.assertGreater(len(response.data['products']), 0)
```

---

## 📝 Manual Testing with curl

```bash
# Test search
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/inventory/api/storefronts/$STOREFRONT_ID/sale-catalog/?search=sugar"

# Test category filter
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/inventory/api/storefronts/$STOREFRONT_ID/sale-catalog/?category=$CATEGORY_ID"

# Test price range
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/inventory/api/storefronts/$STOREFRONT_ID/sale-catalog/?min_price=10&max_price=50"

# Test combined filters
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/inventory/api/storefronts/$STOREFRONT_ID/sale-catalog/?search=rice&category=$CAT_ID&max_price=25"

# Test pagination
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/inventory/api/storefronts/$STOREFRONT_ID/sale-catalog/?page=1&page_size=20"

# Test multi-storefront search
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/inventory/api/storefronts/multi-storefront-catalog/?search=sugar"

# Test multi-storefront with specific storefronts
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/inventory/api/storefronts/multi-storefront-catalog/?storefront=$SF1_ID&storefront=$SF2_ID&search=rice"
```

---

## ⚡ Performance Optimization

### Add Database Indexes

```python
# In your Product model migration

class Migration(migrations.Migration):
    
    operations = [
        migrations.RunSQL(
            # Index for text search
            "CREATE INDEX idx_product_name_trgm ON products USING gin(name gin_trgm_ops);",
            reverse_sql="DROP INDEX idx_product_name_trgm;"
        ),
        migrations.RunSQL(
            "CREATE INDEX idx_product_sku ON products (sku);",
            reverse_sql="DROP INDEX idx_product_sku;"
        ),
        migrations.RunSQL(
            "CREATE INDEX idx_product_barcode ON products (barcode);",
            reverse_sql="DROP INDEX idx_product_barcode;"
        ),
        
        # Index for price filtering
        migrations.RunSQL(
            "CREATE INDEX idx_product_retail_price ON products (retail_price);",
            reverse_sql="DROP INDEX idx_product_retail_price;"
        ),
        
        # Index for category filtering
        migrations.RunSQL(
            "CREATE INDEX idx_product_category ON products (category_id);",
            reverse_sql="DROP INDEX idx_product_category;"
        ),
    ]
```

### Enable PostgreSQL Trigram Extension (for better text search)

```python
from django.contrib.postgres.operations import TrigramExtension

class Migration(migrations.Migration):
    operations = [
        TrigramExtension(),
    ]
```

---

## ✅ Checklist

- [ ] Add query parameter extraction to `sale_catalog()`
- [ ] Add filtering logic to `sale_catalog()`
- [ ] Add pagination to `sale_catalog()`
- [ ] Add query parameter extraction to `multi_storefront_catalog()`
- [ ] Add filtering logic to `multi_storefront_catalog()`
- [ ] Add pagination to `multi_storefront_catalog()`
- [ ] Write tests for search functionality
- [ ] Write tests for category filtering
- [ ] Write tests for price range filtering
- [ ] Write tests for pagination
- [ ] Write tests for combined filters
- [ ] Add database indexes
- [ ] Test with 5,000+ products
- [ ] Deploy to staging
- [ ] Notify frontend team

---

That's it! The changes are **backward compatible** (existing calls without parameters still work) and follow Django REST Framework best practices.
