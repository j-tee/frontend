# Backend Requirements: Stock Product Search for Adjustments

## Overview
We need a dedicated server-side search endpoint for stock products to be used in the Create Stock Adjustment modal. The current client-side approach of loading all products (up to 1000) is not scalable and doesn't work well when searching for specific products.

## Problem Statement
Currently, when creating a stock adjustment:
1. Modal opens and fetches up to 1000 stock products
2. Search is performed client-side by filtering the loaded products
3. This approach fails when:
   - System has more than 1000 stock products
   - Network is slow (loading 1000 products takes time)
   - Products matching search criteria aren't in the first 1000 results
   - Search term doesn't match due to inconsistent filtering logic

## Required Solution
A lightweight, fast search endpoint that returns relevant stock products based on a search query, without requiring the frontend to load all products upfront.

---

## API Endpoint Specification

### Endpoint
```
GET /inventory/api/stock-products/search/
```

### Purpose
Search for stock products by name, SKU, or warehouse name with real-time filtering capabilities.

### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `q` or `search` | string | Yes | Search query string | `10mm`, `Adidas`, `USB-C` |
| `limit` | integer | No | Maximum number of results (default: 50, max: 100) | `20` |
| `warehouse` | string/uuid | No | Filter by warehouse ID | `uuid-here` |
| `has_quantity` | boolean | No | Only return products with quantity > 0 | `true` |
| `ordering` | string | No | Sort results | `product_name`, `-quantity` |

### Search Logic Requirements

The search should match against:
1. **Product Name** (case-insensitive, partial match)
2. **Product SKU** (case-insensitive, partial match)
3. **Warehouse Name** (case-insensitive, partial match)
4. **Batch Number** (if applicable, case-insensitive)

**Search should be fuzzy/flexible:**
- Match partial strings (e.g., "10mm" should match "Cable 10mm", "10mm Armoured Cable")
- Ignore leading/trailing whitespace
- Case-insensitive matching
- Match words in any order (e.g., "adidas samba" matches "Samba Adidas Classic")

### Response Format

```json
{
  "results": [
    {
      "id": "uuid-string",
      "product": "uuid-string",
      "product_name": "10mm Armoured Cable 50m",
      "product_sku": "CABLE-10MM-ARM",
      "warehouse": "uuid-string",
      "warehouse_name": "DataLogique Central Warehouse",
      "stock": "uuid-string",
      "batch_number": "BATCH-2025-001",
      "quantity": 528,
      "unit_cost": "45.00",
      "expiry_date": "2026-12-31",
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-10-09T14:22:00Z"
    },
    {
      "id": "uuid-string-2",
      "product": "uuid-string-2",
      "product_name": "10mm Armoured Cable 100m",
      "product_sku": "CABLE-10MM-ARM-100",
      "warehouse": "uuid-string",
      "warehouse_name": "Rawlings Park Warehouse",
      "stock": "uuid-string-2",
      "batch_number": "BATCH-2025-002",
      "quantity": 150,
      "unit_cost": "85.00",
      "expiry_date": null,
      "created_at": "2025-02-20T09:15:00Z",
      "updated_at": "2025-10-08T11:45:00Z"
    }
  ],
  "count": 2
}
```

### Response Fields

All fields from the `StockProduct` model should be included:

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | string (uuid) | No | Stock product unique identifier |
| `product` | string (uuid) | No | Related product ID |
| `product_name` | string | No | Product name (from related Product) |
| `product_sku` | string | Yes | Product SKU/code |
| `warehouse` | string (uuid) | No | Warehouse ID |
| `warehouse_name` | string | No | Warehouse name |
| `stock` | string (uuid) | Yes | Stock batch ID |
| `batch_number` | string | Yes | Batch/lot number |
| `quantity` | number | No | Current quantity in stock |
| `unit_cost` | string (decimal) | No | Unit cost as decimal string |
| `expiry_date` | string (date) | Yes | Expiry date (ISO 8601) |
| `created_at` | string (datetime) | No | Creation timestamp (ISO 8601) |
| `updated_at` | string (datetime) | No | Last update timestamp (ISO 8601) |

---

## Performance Requirements

### Response Time
- **Target**: < 200ms for typical searches
- **Maximum**: < 500ms for complex searches
- Should work efficiently with databases containing 10,000+ stock products

### Optimization Suggestions
1. **Database Indexing**
   - Add indexes on frequently searched fields:
     - `product_name` (or use full-text search index)
     - `product_sku`
     - `warehouse_name`
     - Composite index on (`warehouse`, `product_name`)

2. **Query Optimization**
   - Use `ILIKE` for PostgreSQL or equivalent for other databases
   - Consider implementing full-text search for better performance
   - Use `select_related()` and `prefetch_related()` to avoid N+1 queries
   - Limit fields returned if possible (but include all fields listed above)

3. **Caching** (Optional but recommended)
   - Cache popular searches for 1-5 minutes
   - Clear cache when stock products are updated

---

## Example API Calls

### Example 1: Basic Search
```http
GET /inventory/api/stock-products/search/?q=10mm
```

**Expected Response:**
Returns all stock products where product name, SKU, or warehouse contains "10mm"

### Example 2: Search with Limit
```http
GET /inventory/api/stock-products/search/?q=cable&limit=20
```

**Expected Response:**
Returns up to 20 stock products matching "cable"

### Example 3: Search with Warehouse Filter
```http
GET /inventory/api/stock-products/search/?q=adidas&warehouse=uuid-warehouse-central
```

**Expected Response:**
Returns stock products matching "adidas" only from the specified warehouse

### Example 4: Search for In-Stock Items Only
```http
GET /inventory/api/stock-products/search/?q=usb&has_quantity=true
```

**Expected Response:**
Returns stock products matching "usb" that have quantity > 0

### Example 5: Empty Search (List All)
```http
GET /inventory/api/stock-products/search/?q=&limit=50
```

**Expected Response:**
Returns first 50 stock products (useful for initial dropdown load)

---

## Error Handling

### 400 Bad Request
```json
{
  "error": "Invalid limit parameter. Must be between 1 and 100."
}
```

### 500 Internal Server Error
```json
{
  "error": "An error occurred while searching stock products."
}
```

---

## Implementation Notes for Backend Developer

### Django/DRF Implementation Example

```python
# views.py or viewsets.py
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

class StockProductViewSet(viewsets.ModelViewSet):
    # ... existing code ...
    
    @action(detail=False, methods=['get'], url_path='search')
    def search(self, request):
        """
        Search stock products by name, SKU, or warehouse.
        Query params:
        - q or search: search query string
        - limit: max results (default 50, max 100)
        - warehouse: filter by warehouse ID
        - has_quantity: filter by quantity > 0
        - ordering: sort field
        """
        query = request.query_params.get('q') or request.query_params.get('search', '')
        limit = min(int(request.query_params.get('limit', 50)), 100)
        warehouse_id = request.query_params.get('warehouse')
        has_quantity = request.query_params.get('has_quantity')
        ordering = request.query_params.get('ordering', 'product_name')
        
        # Start with base queryset with related data loaded
        queryset = StockProduct.objects.select_related(
            'product', 
            'warehouse', 
            'stock'
        ).all()
        
        # Apply search filter
        if query:
            queryset = queryset.filter(
                Q(product__name__icontains=query) |
                Q(product__sku__icontains=query) |
                Q(warehouse__name__icontains=query) |
                Q(stock__batch_number__icontains=query)
            )
        
        # Apply warehouse filter
        if warehouse_id:
            queryset = queryset.filter(warehouse_id=warehouse_id)
        
        # Apply quantity filter
        if has_quantity and has_quantity.lower() == 'true':
            queryset = queryset.filter(quantity__gt=0)
        
        # Apply ordering
        queryset = queryset.order_by(ordering)
        
        # Limit results
        queryset = queryset[:limit]
        
        # Serialize and return
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'results': serializer.data,
            'count': len(serializer.data)
        })
```

### Serializer Requirements

Ensure the `StockProductSerializer` includes all necessary fields:

```python
class StockProductSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    batch_number = serializers.CharField(source='stock.batch_number', read_only=True)
    
    class Meta:
        model = StockProduct
        fields = [
            'id', 'product', 'product_name', 'product_sku',
            'warehouse', 'warehouse_name', 'stock', 'batch_number',
            'quantity', 'unit_cost', 'expiry_date',
            'created_at', 'updated_at'
        ]
```

---

## Frontend Implementation Plan

Once the backend endpoint is ready, the frontend will:

1. **Replace the current `handleOpenCreateAdjustmentModal` function** to NOT load all products upfront

2. **Add debounced search** in `CreateAdjustmentModal` that calls the new endpoint:
   ```typescript
   const handleSearchProducts = useCallback(
     debounce(async (searchTerm: string) => {
       const response = await fetchStockProducts({ 
         q: searchTerm, 
         limit: 50 
       })
       setSearchResults(response.results)
     }, 300),
     []
   )
   ```

3. **Update the dropdown** to show search results instead of filtering pre-loaded data

4. **Add loading states** for better UX during search

5. **Handle empty states** gracefully (no results found, etc.)

---

## Testing Requirements

### Backend Testing
Please ensure the endpoint works correctly for:

1. **Empty search** - returns first N products
2. **Partial match** - "10mm" finds "10mm Armoured Cable"
3. **Case insensitive** - "ADIDAS" finds "Adidas Samba"
4. **Multiple words** - "adidas samba" finds "Samba Adidas Classic"
5. **SKU search** - searching by SKU code works
6. **Warehouse search** - searching by warehouse name works
7. **Special characters** - handles hyphens, slashes, etc.
8. **No results** - returns empty array gracefully
9. **Large datasets** - performs well with 10,000+ products
10. **Filter combinations** - search + warehouse + has_quantity works together

### Test Cases

| Test Case | Query | Expected Behavior |
|-----------|-------|-------------------|
| Basic search | `q=10mm` | Returns all products with "10mm" in name/SKU |
| Case insensitive | `q=CABLE` | Returns products with "cable" (any case) |
| SKU search | `q=CABLE-10MM` | Returns products with matching SKU |
| Warehouse search | `q=central` | Returns products from "Central Warehouse" |
| Empty search | `q=` | Returns first 50 products |
| No results | `q=xyzabc999` | Returns empty results array |
| With filters | `q=cable&has_quantity=true` | Returns only in-stock cables |
| Limit | `q=cable&limit=10` | Returns max 10 results |

---

## Migration Path

### Phase 1: Backend Implementation
- Backend developer implements the search endpoint
- Backend developer adds tests
- Backend developer deploys to staging

### Phase 2: Frontend Integration
- Frontend developer updates CreateAdjustmentModal
- Frontend developer adds debounced search
- Frontend developer tests with staging backend

### Phase 3: Testing & Deployment
- QA tests search functionality
- Performance testing with large datasets
- Deploy to production

---

## Additional Considerations

### Future Enhancements
1. **Autocomplete suggestions** - return top 5-10 matches as user types
2. **Search history** - cache recent searches
3. **Advanced filters** - filter by expiry date, batch number, etc.
4. **Sorting options** - allow sorting by name, quantity, date, etc.
5. **Pagination** - if more than 100 results, allow pagination

### Security Considerations
- Ensure endpoint respects user permissions
- Only return stock products user has access to
- Validate and sanitize search query to prevent SQL injection
- Rate limit to prevent abuse

---

## Questions for Backend Developer

Before implementation, please clarify:

1. **Database type** - PostgreSQL, MySQL, etc.? (affects search optimization)
2. **Current indexes** - Are there existing indexes on product_name, SKU, etc.?
3. **Response time** - Can you achieve < 200ms with your current setup?
4. **Full-text search** - Do you have full-text search capabilities available?
5. **Permissions** - Are there any permission/access control requirements?
6. **Rate limiting** - Should we implement rate limiting for this endpoint?

---

## Contact & Support

**Frontend Developer**: [Your Name]
**Date**: October 10, 2025
**Related Issue**: Stock Product Search in Create Adjustment Modal

Please reach out if you need clarification on any requirements or have suggestions for improvements.
