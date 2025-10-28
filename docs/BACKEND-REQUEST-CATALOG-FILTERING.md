# Backend Request: Server-Side Catalog Filtering

**Date**: October 14, 2025  
**Requested By**: Frontend Team  
**Priority**: High  
**Status**: 🟡 Pending Implementation

---

## 🎯 Objective

Add server-side filtering and pagination to sale catalog endpoints to improve performance and user experience when searching for products.

---

## 📋 Current Situation

### Existing Endpoints

1. **Single Storefront Catalog**
   ```
   GET /inventory/api/storefronts/{storefront_id}/sale-catalog/
   ```
   - Returns ALL products from a single storefront
   - No filtering support
   - No pagination
   - Frontend filters client-side

2. **Multi-Storefront Catalog**
   ```
   GET /inventory/api/storefronts/multi-storefront-catalog/
   ```
   - Returns ALL products from all accessible storefronts
   - No filtering support
   - No pagination
   - Frontend filters client-side

### Current Frontend Implementation

```typescript
// Client-side filtering in ProductSearchPanel.tsx
const searchProducts = useCallback(async (rawQuery: string) => {
  const lowerQuery = rawQuery.toLowerCase()
  
  // Filters in-memory catalog
  const matches = catalog.filter((item) =>
    item.name.toLowerCase().includes(lowerQuery) ||
    item.sku.toLowerCase().includes(lowerQuery) ||
    (item.barcode ? item.barcode.toLowerCase().includes(lowerQuery) : false)
  )
  
  setProducts(matches)
}, [catalog])
```

### Problems with Current Approach

1. ❌ **Performance Issues**
   - Loads ALL products upfront (could be 1000+ items)
   - Slow initial page load
   - High memory usage
   - Wasteful network bandwidth

2. ❌ **Poor UX**
   - Long wait for catalog to load before searching
   - No ability to filter by category, price range, etc.
   - No pagination

3. ❌ **Scalability Issues**
   - Won't scale well with large product catalogs (5000+ products)
   - Client-side filtering doesn't leverage database indexes

---

## ✅ Proposed Solution

Add query parameters to both catalog endpoints for **server-side filtering and pagination**.

---

## 📝 API Specification

### 1. Single Storefront Catalog (Enhanced)

**Endpoint:**
```
GET /inventory/api/storefronts/{storefront_id}/sale-catalog/
```

**Query Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `search` | string | No | Search by product name, SKU, or barcode (case-insensitive, partial match) | `?search=sugar` |
| `category` | UUID | No | Filter by category ID | `?category=abc-123` |
| `min_price` | decimal | No | Minimum retail price (inclusive) | `?min_price=10.00` |
| `max_price` | decimal | No | Maximum retail price (inclusive) | `?max_price=100.00` |
| `in_stock_only` | boolean | No | Show only products with available_quantity > 0 (default: true) | `?in_stock_only=true` |
| `page` | integer | No | Page number for pagination (default: 1) | `?page=2` |
| `page_size` | integer | No | Items per page (default: 50, max: 200) | `?page_size=100` |

**Response Format:**

```json
{
  "count": 150,
  "next": "/inventory/api/storefronts/{id}/sale-catalog/?page=2",
  "previous": null,
  "page_size": 50,
  "total_pages": 3,
  "current_page": 1,
  "products": [
    {
      "product_id": "uuid",
      "product_name": "Sugar 1kg",
      "sku": "SUG-001",
      "barcode": "1234567890",
      "category_name": "Food",
      "unit": "kg",
      "product_image": "https://...",
      "available_quantity": 917,
      "retail_price": "15.00",
      "wholesale_price": "12.50",
      "stock_product_ids": ["uuid1", "uuid2"],
      "last_stocked_at": "2025-10-10T14:30:00Z"
    }
  ]
}
```

**Example Queries:**

```bash
# Search for "sugar"
GET /inventory/api/storefronts/{id}/sale-catalog/?search=sugar

# Products in "Food" category
GET /inventory/api/storefronts/{id}/sale-catalog/?category={category_id}

# Products between GH₵10 and GH₵50
GET /inventory/api/storefronts/{id}/sale-catalog/?min_price=10&max_price=50

# Search + category + price range
GET /inventory/api/storefronts/{id}/sale-catalog/?search=rice&category={id}&min_price=5&max_price=20

# Page 2 with 100 items per page
GET /inventory/api/storefronts/{id}/sale-catalog/?page=2&page_size=100

# Include out-of-stock products
GET /inventory/api/storefronts/{id}/sale-catalog/?in_stock_only=false
```

---

### 2. Multi-Storefront Catalog (Enhanced)

**Endpoint:**
```
GET /inventory/api/storefronts/multi-storefront-catalog/
```

**Query Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `search` | string | No | Search by product name, SKU, or barcode across all storefronts | `?search=sugar` |
| `category` | UUID | No | Filter by category ID | `?category=abc-123` |
| `storefront` | UUID | No | Filter to specific storefront(s) - can be repeated | `?storefront=uuid1&storefront=uuid2` |
| `min_price` | decimal | No | Minimum retail price | `?min_price=10.00` |
| `max_price` | decimal | No | Maximum retail price | `?max_price=100.00` |
| `in_stock_only` | boolean | No | Show only products with total_available > 0 (default: true) | `?in_stock_only=true` |
| `page` | integer | No | Page number (default: 1) | `?page=2` |
| `page_size` | integer | No | Items per page (default: 50, max: 200) | `?page_size=100` |

**Response Format:**

```json
{
  "count": 250,
  "next": "/inventory/api/storefronts/multi-storefront-catalog/?page=2",
  "previous": null,
  "page_size": 50,
  "total_pages": 5,
  "current_page": 1,
  "storefronts": [
    { "id": "uuid1", "name": "Adenta Store" },
    { "id": "uuid2", "name": "Cow Lane Store" }
  ],
  "products": [
    {
      "product_id": "uuid",
      "product_name": "Sugar 1kg",
      "sku": "SUG-001",
      "barcode": "1234567890",
      "category_name": "Food",
      "unit": "kg",
      "product_image": "https://...",
      "total_available": 1050,
      "retail_price": "15.00",
      "wholesale_price": "12.50",
      "stock_product_ids": ["uuid1", "uuid2", "uuid3"],
      "locations": [
        {
          "storefront_id": "uuid1",
          "storefront_name": "Adenta Store",
          "available_quantity": 133
        },
        {
          "storefront_id": "uuid2",
          "storefront_name": "Cow Lane Store",
          "available_quantity": 917
        }
      ],
      "last_stocked_at": "2025-10-10T14:30:00Z"
    }
  ]
}
```

**Example Queries:**

```bash
# Search across all storefronts
GET /inventory/api/storefronts/multi-storefront-catalog/?search=sugar

# Filter to specific storefronts only
GET /inventory/api/storefronts/multi-storefront-catalog/?storefront={uuid1}&storefront={uuid2}

# Search + category + price filter
GET /inventory/api/storefronts/multi-storefront-catalog/?search=rice&category={id}&max_price=25
```

---

## 🔧 Backend Implementation Guide

### Django Implementation

```python
# inventory/views.py

from django.db.models import Q, Sum
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

class CatalogPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200

class StorefrontViewSet(viewsets.ModelViewSet):
    
    @action(detail=True, methods=['get'], url_path='sale-catalog')
    def sale_catalog(self, request, pk=None):
        """
        Enhanced sale catalog with server-side filtering and pagination.
        """
        storefront = self.get_object()
        
        # Get query parameters
        search_query = request.query_params.get('search', '').strip()
        category_id = request.query_params.get('category')
        min_price = request.query_params.get('min_price')
        max_price = request.query_params.get('max_price')
        in_stock_only = request.query_params.get('in_stock_only', 'true').lower() == 'true'
        
        # Base queryset
        inventory_items = StorefrontInventory.objects.filter(
            storefront=storefront
        ).select_related('product', 'product__category')
        
        # Filter: In stock only
        if in_stock_only:
            inventory_items = inventory_items.filter(available_quantity__gt=0)
        
        # Filter: Search by name, SKU, or barcode
        if search_query:
            inventory_items = inventory_items.filter(
                Q(product__name__icontains=search_query) |
                Q(product__sku__icontains=search_query) |
                Q(product__barcode__icontains=search_query)
            )
        
        # Filter: Category
        if category_id:
            inventory_items = inventory_items.filter(product__category_id=category_id)
        
        # Filter: Price range
        if min_price:
            inventory_items = inventory_items.filter(product__retail_price__gte=min_price)
        if max_price:
            inventory_items = inventory_items.filter(product__retail_price__lte=max_price)
        
        # Order by name for consistent results
        inventory_items = inventory_items.order_by('product__name')
        
        # Apply pagination
        paginator = CatalogPagination()
        page = paginator.paginate_queryset(inventory_items, request)
        
        # Build response
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
        
        return paginator.get_paginated_response({'products': products})
    
    @action(detail=False, methods=['get'], url_path='multi-storefront-catalog')
    def multi_storefront_catalog(self, request):
        """
        Enhanced multi-storefront catalog with server-side filtering and pagination.
        """
        user = request.user
        
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
        
        # Optional: Filter to specific storefronts
        storefront_filter = request.query_params.getlist('storefront')
        if storefront_filter:
            storefronts = storefronts.filter(id__in=storefront_filter)
        
        # Get query parameters
        search_query = request.query_params.get('search', '').strip()
        category_id = request.query_params.get('category')
        min_price = request.query_params.get('min_price')
        max_price = request.query_params.get('max_price')
        in_stock_only = request.query_params.get('in_stock_only', 'true').lower() == 'true'
        
        # Get all inventory items across storefronts
        inventory_items = StorefrontInventory.objects.filter(
            storefront__in=storefronts
        ).select_related('product', 'product__category', 'storefront')
        
        # Apply filters
        if in_stock_only:
            inventory_items = inventory_items.filter(available_quantity__gt=0)
        
        if search_query:
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
            
            # Get stock product IDs for this location
            stock_ids = list(
                StockProduct.objects.filter(
                    product=product,
                    storefront_inventory__storefront=inv.storefront
                ).values_list('id', flat=True)
            )
            
            if product_key not in product_map or 'product_name' not in product_map[product_key]:
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
            
            product_map[product_key]['total_available'] += inv.available_quantity
            product_map[product_key]['stock_product_ids'].extend([str(sid) for sid in stock_ids])
            product_map[product_key]['locations'].append({
                'storefront_id': str(inv.storefront.id),
                'storefront_name': inv.storefront.name,
                'available_quantity': inv.available_quantity,
            })
        
        # Convert to list and apply pagination
        products_list = list(product_map.values())
        products_list.sort(key=lambda x: x.get('product_name', ''))
        
        paginator = CatalogPagination()
        page = paginator.paginate_queryset(products_list, request)
        
        return paginator.get_paginated_response({
            'storefronts': [{'id': str(sf.id), 'name': sf.name} for sf in storefronts],
            'products': page
        })
```

---

## 🎨 Frontend Integration

### Updated TypeScript Types

```typescript
// src/types/inventory.ts

export interface SaleCatalogResponse {
  count: number
  next: string | null
  previous: string | null
  page_size: number
  total_pages: number
  current_page: number
  products: SaleCatalogItem[]
}

export interface MultiStorefrontCatalogResponse {
  count: number
  next: string | null
  previous: string | null
  page_size: number
  total_pages: number
  current_page: number
  storefronts: Array<{ id: UUID; name: string }>
  products: MultiStorefrontCatalogItem[]
}
```

### Updated Service Functions

```typescript
// src/services/inventoryService.ts

export interface CatalogFilters {
  search?: string
  category?: UUID
  min_price?: number
  max_price?: number
  in_stock_only?: boolean
  page?: number
  page_size?: number
  storefront?: UUID[]  // For multi-storefront only
}

export const fetchSaleCatalog = async (
  storefrontId: UUID,
  filters?: CatalogFilters
) => {
  const { data } = await httpClient.get<SaleCatalogResponse>(
    `/inventory/api/storefronts/${storefrontId}/sale-catalog/`,
    { params: filters }
  )
  return data
}

export const fetchMultiStorefrontCatalog = async (
  filters?: CatalogFilters
) => {
  const { data } = await httpClient.get<MultiStorefrontCatalogResponse>(
    '/inventory/api/storefronts/multi-storefront-catalog/',
    { params: filters }
  )
  return data
}
```

### Updated Component

```typescript
// src/features/dashboard/components/sales/ProductSearchPanel.tsx

const searchProducts = useCallback(async (rawQuery: string) => {
  const trimmedQuery = rawQuery.trim()
  
  if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
    setProducts([])
    return
  }
  
  try {
    setLoading(true)
    setError(null)
    
    // Server-side search
    const filters: CatalogFilters = {
      search: trimmedQuery,
      in_stock_only: true,
      page_size: 50,
    }
    
    const response = multiStorefront
      ? await fetchMultiStorefrontCatalog(filters)
      : await fetchSaleCatalog(storefrontId!, filters)
    
    const normalized = response.products.map((item): Product => ({
      // ... mapping logic
    }))
    
    setProducts(normalized)
    
    // Fetch stock levels for matched products
    if (normalized.length > 0) {
      await fetchStockLevels(normalized.map(p => p.id))
    }
  } catch (err) {
    console.error('[ProductSearch] Search error:', err)
    setError('Failed to search products')
  } finally {
    setLoading(false)
  }
}, [storefrontId, multiStorefront])
```

---

## 🧪 Testing Requirements

### Backend Tests

```python
# tests/test_catalog_filtering.py

def test_sale_catalog_search():
    response = client.get(
        f'/inventory/api/storefronts/{storefront.id}/sale-catalog/',
        {'search': 'sugar'}
    )
    assert response.status_code == 200
    assert len(response.data['products']) > 0
    assert 'sugar' in response.data['products'][0]['product_name'].lower()

def test_sale_catalog_category_filter():
    response = client.get(
        f'/inventory/api/storefronts/{storefront.id}/sale-catalog/',
        {'category': category.id}
    )
    assert all(
        p['category_name'] == category.name 
        for p in response.data['products']
    )

def test_sale_catalog_price_range():
    response = client.get(
        f'/inventory/api/storefronts/{storefront.id}/sale-catalog/',
        {'min_price': 10, 'max_price': 50}
    )
    assert all(
        10 <= float(p['retail_price']) <= 50 
        for p in response.data['products']
    )

def test_sale_catalog_pagination():
    response = client.get(
        f'/inventory/api/storefronts/{storefront.id}/sale-catalog/',
        {'page': 1, 'page_size': 10}
    )
    assert response.data['page_size'] == 10
    assert len(response.data['products']) <= 10
    assert 'next' in response.data
```

### Manual Testing

```bash
# Test search
curl "http://localhost:8000/inventory/api/storefronts/{id}/sale-catalog/?search=sugar"

# Test category filter
curl "http://localhost:8000/inventory/api/storefronts/{id}/sale-catalog/?category={cat_id}"

# Test price range
curl "http://localhost:8000/inventory/api/storefronts/{id}/sale-catalog/?min_price=10&max_price=50"

# Test pagination
curl "http://localhost:8000/inventory/api/storefronts/{id}/sale-catalog/?page=2&page_size=20"

# Test multi-storefront search
curl "http://localhost:8000/inventory/api/storefronts/multi-storefront-catalog/?search=rice"

# Test combined filters
curl "http://localhost:8000/inventory/api/storefronts/{id}/sale-catalog/?search=sugar&category={id}&max_price=20&page_size=25"
```

---

## 📊 Performance Impact

### Before (Client-Side Filtering)

- **Initial Load**: 2-5 seconds (loads ALL products)
- **Search Response**: Instant (filters in memory)
- **Memory Usage**: High (all products in browser)
- **Network**: Heavy initial payload

### After (Server-Side Filtering)

- **Initial Load**: Not needed (lazy loading)
- **Search Response**: 200-500ms (database query + network)
- **Memory Usage**: Low (only search results)
- **Network**: Light, paginated responses

### Expected Improvements

- ✅ **70-80% faster** initial page load
- ✅ **90% less** memory usage
- ✅ **60-70% less** network bandwidth
- ✅ Scales to **10,000+ products** without performance issues

---

## 📅 Implementation Timeline

| Task | Estimated Time | Owner |
|------|----------------|-------|
| Backend: Single storefront filtering | 3 hours | Backend Team |
| Backend: Multi-storefront filtering | 3 hours | Backend Team |
| Backend: Tests | 2 hours | Backend Team |
| Frontend: Service layer updates | 1 hour | Frontend Team |
| Frontend: Component updates | 2 hours | Frontend Team |
| Frontend: Testing | 2 hours | Frontend Team |
| Integration testing | 2 hours | Both Teams |
| **Total** | **15 hours** | |

---

## 🚀 Migration Strategy

### Phase 1: Add Backend Support (Non-Breaking)
- Add query parameters to endpoints
- Keep existing behavior when no params provided
- Deploy to staging

### Phase 2: Update Frontend (Progressive)
- Update service layer
- Update ProductSearchPanel to use server-side search
- Keep backward compatibility
- Deploy to staging

### Phase 3: Testing & Optimization
- Load testing with large catalogs
- Optimize database queries (add indexes if needed)
- Fine-tune pagination defaults

### Phase 4: Production Deployment
- Deploy backend first (backward compatible)
- Monitor for issues
- Deploy frontend
- Monitor performance metrics

---

## 📝 Additional Considerations

### Database Indexes Needed

```sql
-- For fast text search
CREATE INDEX idx_product_name ON products USING gin(to_tsvector('english', name));
CREATE INDEX idx_product_sku ON products (sku);
CREATE INDEX idx_product_barcode ON products (barcode);

-- For price filtering
CREATE INDEX idx_product_retail_price ON products (retail_price);

-- For category filtering
CREATE INDEX idx_product_category ON products (category_id);

-- For storefront inventory lookups
CREATE INDEX idx_storefront_inventory_available ON storefront_inventory (available_quantity) 
WHERE available_quantity > 0;
```

### Future Enhancements

1. **Full-text search** using PostgreSQL's built-in FTS
2. **Sort options** (by name, price, recently added)
3. **Favorites/frequently sold** products
4. **Batch barcode scanning** for multi-add
5. **Product suggestions** based on search history

---

## ✅ Acceptance Criteria

- [ ] Both endpoints support `search`, `category`, `min_price`, `max_price`, `in_stock_only` parameters
- [ ] Both endpoints return paginated responses with count, next, previous
- [ ] Search is case-insensitive and matches name, SKU, or barcode
- [ ] Default page size is 50, max is 200
- [ ] Multi-storefront endpoint supports `storefront` filter
- [ ] All filters can be combined
- [ ] Tests achieve 90%+ coverage
- [ ] API response time < 500ms for typical queries
- [ ] Frontend successfully integrates and uses server-side filtering
- [ ] No breaking changes to existing API consumers

---

## 📞 Contact

**Questions?** Contact the API team or refer to:
- API Documentation: `/docs/api/`
- Swagger UI: `http://localhost:8000/api/schema/swagger-ui/`

**Ready to implement?** Let's coordinate on timing and review the implementation plan together.
