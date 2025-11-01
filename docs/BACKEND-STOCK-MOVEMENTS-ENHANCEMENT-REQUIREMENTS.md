# 🔧 Backend Requirements - Stock Movements Enhancement

**Date:** November 1, 2025  
**Priority:** HIGH  
**Target Audience:** Backend Team  
**Frontend Request:** Stock Movements Analytics & Product Drill-Down

---

## 📋 Executive Summary

The frontend requires backend API enhancements to support advanced stock movement analytics and product-specific drill-down capabilities. **All business logic, calculations, and aggregations should be handled on the backend.** The frontend will only render data provided by the API.

---

## 🎯 Core Principles

### ✅ Backend Responsibilities (Business Logic)
- All data calculations and aggregations
- Movement type categorization
- Net change calculations
- Percentage calculations
- Trend analysis
- Top/bottom product identification
- Date range filtering
- Complex queries and joins

### ❌ Frontend Responsibilities (Presentation Only)
- Rendering data in tables and charts
- User interactions (clicks, filters)
- Navigation and routing
- Display formatting only (not calculation)

---

## 📊 Phase-by-Phase Requirements

---

## **PHASE 1: Product Drill-Down Support** 🥇

### Priority: **CRITICAL** | Timeline: **Week 1**

### 1.1 Enhanced Movement Filtering

**Endpoint:** `GET /reports/api/inventory/movements/`  
**Status:** ⚠️ **UPDATE REQUIRED**

#### New Query Parameters Required:

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `product_id` | UUID | No | Filter movements for specific product | `?product_id=550e8400-e29b-41d4-a716-446655440000` |
| `product_ids` | String (comma-separated UUIDs) | No | Filter movements for multiple products | `?product_ids=uuid1,uuid2,uuid3` |

#### Backend Implementation:

```python
# views.py or wherever movements endpoint is defined

class StockMovementsAPIView(APIView):
    def get(self, request):
        # Existing parameters
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        warehouse_id = request.GET.get('warehouse_id')
        category_id = request.GET.get('category_id')
        search = request.GET.get('search')
        
        # NEW: Product filtering
        product_id = request.GET.get('product_id')
        product_ids = request.GET.get('product_ids')
        
        # Base queryset
        queryset = StockMovement.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date
        )
        
        # NEW: Apply product filters
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        elif product_ids:
            product_id_list = product_ids.split(',')
            queryset = queryset.filter(product_id__in=product_id_list)
        
        # ... rest of existing filtering logic
        
        # Return paginated results with summary
        return Response({
            'success': True,
            'data': {
                'summary': self._calculate_summary(queryset),  # Backend calculates
                'movements': self._serialize_movements(queryset),
                'by_warehouse': self._group_by_warehouse(queryset),  # Backend groups
                'by_category': self._group_by_category(queryset)
            },
            'meta': {
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total': queryset.count(),
                    'total_pages': math.ceil(queryset.count() / page_size)
                }
            }
        })
    
    def _calculate_summary(self, queryset):
        """
        BUSINESS LOGIC: Calculate movement summary
        Frontend should NOT perform these calculations
        """
        return {
            'total_movements': queryset.count(),
            'total_in': queryset.filter(movement_type='in').aggregate(
                total=Sum('quantity')
            )['total'] or 0,
            'total_out': queryset.filter(movement_type='out').aggregate(
                total=Sum('quantity')
            )['total'] or 0,
            'total_adjustments': queryset.filter(
                reference_type='adjustment'
            ).count(),
            'total_transfers': queryset.filter(
                reference_type='transfer'
            ).count(),
        }
```

#### Testing Verification:

```bash
# Test product_id filter
curl "http://localhost:8000/reports/api/inventory/movements/?product_id=550e8400-e29b-41d4-a716-446655440000&start_date=2025-10-01&end_date=2025-10-31" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test multiple products
curl "http://localhost:8000/reports/api/inventory/movements/?product_ids=uuid1,uuid2,uuid3&start_date=2025-10-01&end_date=2025-10-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:** Only movements for specified product(s)

**Success Criteria:**
- ✅ Filtering by single product works
- ✅ Filtering by multiple products works
- ✅ Summary calculations reflect filtered data only
- ✅ Pagination works with filters

---

## **PHASE 2: Product Search & Quick Filters** 🥈

### Priority: **HIGH** | Timeline: **Week 2**

### 2.1 Product Search API

**Endpoint:** `GET /reports/api/inventory/products/search/` **(NEW)**

#### Purpose:
Enable autocomplete product search for movement filtering

#### Query Parameters:

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `q` | String | Yes | Search query (min 2 chars) | `?q=samsung` |
| `limit` | Integer | No | Max results (default: 10) | `?limit=20` |

#### Backend Implementation:

```python
# views.py

class ProductSearchAPIView(APIView):
    """
    BUSINESS LOGIC: Product search with relevance ranking
    Frontend should NOT implement search logic
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        query = request.GET.get('q', '').strip()
        limit = int(request.GET.get('limit', 10))
        
        if len(query) < 2:
            return Response({
                'success': False,
                'error': 'Search query must be at least 2 characters'
            }, status=400)
        
        # BUSINESS LOGIC: Search across name, SKU, and description
        # Use database full-text search or trigram similarity
        products = Product.objects.filter(
            Q(name__icontains=query) |
            Q(sku__icontains=query) |
            Q(description__icontains=query)
        ).annotate(
            # BUSINESS LOGIC: Relevance scoring
            name_match=Case(
                When(name__icontains=query, then=Value(3)),
                default=Value(0),
                output_field=IntegerField()
            ),
            sku_match=Case(
                When(sku__icontains=query, then=Value(2)),
                default=Value(0),
                output_field=IntegerField()
            ),
            relevance=F('name_match') + F('sku_match')
        ).order_by('-relevance', 'name')[:limit]
        
        return Response({
            'success': True,
            'data': [
                {
                    'id': str(product.id),
                    'name': product.name,
                    'sku': product.sku,
                    'category': product.category.name if product.category else None,
                    'current_stock': product.get_total_stock()  # Backend calculates
                }
                for product in products
            ]
        })
```

#### Expected Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Samsung TV 43\"",
      "sku": "ELEC-0005",
      "category": "Electronics",
      "current_stock": 404
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Samsung Galaxy A14",
      "sku": "ELEC-0091",
      "category": "Electronics",
      "current_stock": 384
    }
  ]
}
```

---

### 2.2 Quick Filters API

**Endpoint:** `GET /reports/api/inventory/movements/quick-filters/` **(NEW)**

#### Purpose:
Return product IDs for common filter scenarios (Top Sellers, Most Adjusted, etc.)

#### Query Parameters:

| Parameter | Type | Required | Description | Values |
|-----------|------|----------|-------------|--------|
| `filter_type` | String | Yes | Type of quick filter | `top_sellers`, `most_adjusted`, `high_transfers`, `shrinkage` |
| `start_date` | Date | Yes | Filter start date | `2025-10-01` |
| `end_date` | Date | Yes | Filter end date | `2025-10-31` |
| `limit` | Integer | No | Max products (default: 10) | `10` |

#### Backend Implementation:

```python
# views.py

class QuickFiltersAPIView(APIView):
    """
    BUSINESS LOGIC: Identify products matching quick filter criteria
    All ranking and identification logic stays on backend
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        filter_type = request.GET.get('filter_type')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        limit = int(request.GET.get('limit', 10))
        
        if filter_type not in ['top_sellers', 'most_adjusted', 'high_transfers', 'shrinkage']:
            return Response({
                'success': False,
                'error': 'Invalid filter_type'
            }, status=400)
        
        # BUSINESS LOGIC: Different filters use different calculations
        product_ids = []
        
        if filter_type == 'top_sellers':
            # BUSINESS LOGIC: Find products with most sales
            product_ids = self._get_top_sellers(start_date, end_date, limit)
            
        elif filter_type == 'most_adjusted':
            # BUSINESS LOGIC: Find products with most adjustments
            product_ids = self._get_most_adjusted(start_date, end_date, limit)
            
        elif filter_type == 'high_transfers':
            # BUSINESS LOGIC: Find products with most transfer activity
            product_ids = self._get_high_transfers(start_date, end_date, limit)
            
        elif filter_type == 'shrinkage':
            # BUSINESS LOGIC: Find products with negative adjustments
            product_ids = self._get_shrinkage_products(start_date, end_date, limit)
        
        return Response({
            'success': True,
            'data': {
                'filter_type': filter_type,
                'product_ids': product_ids,
                'count': len(product_ids)
            }
        })
    
    def _get_top_sellers(self, start_date, end_date, limit):
        """Find products with highest sales volume"""
        results = StockMovement.objects.filter(
            reference_type='sale',
            created_at__gte=start_date,
            created_at__lte=end_date
        ).values('product_id').annotate(
            total_sold=Sum('quantity')
        ).order_by('-total_sold')[:limit]
        
        return [str(r['product_id']) for r in results]
    
    def _get_most_adjusted(self, start_date, end_date, limit):
        """Find products with most adjustment activity"""
        results = StockMovement.objects.filter(
            reference_type='adjustment',
            created_at__gte=start_date,
            created_at__lte=end_date
        ).values('product_id').annotate(
            adjustment_count=Count('id')
        ).order_by('-adjustment_count')[:limit]
        
        return [str(r['product_id']) for r in results]
    
    def _get_high_transfers(self, start_date, end_date, limit):
        """Find products with high transfer activity"""
        results = StockMovement.objects.filter(
            reference_type='transfer',
            created_at__gte=start_date,
            created_at__lte=end_date
        ).values('product_id').annotate(
            transfer_count=Count('id')
        ).order_by('-transfer_count')[:limit]
        
        return [str(r['product_id']) for r in results]
    
    def _get_shrinkage_products(self, start_date, end_date, limit):
        """Find products with negative adjustments (shrinkage/damage)"""
        results = StockMovement.objects.filter(
            reference_type='adjustment',
            movement_type='out',  # Negative adjustments
            created_at__gte=start_date,
            created_at__lte=end_date
        ).values('product_id').annotate(
            total_shrinkage=Sum('quantity')
        ).order_by('total_shrinkage')[:limit]  # Most negative first
        
        return [str(r['product_id']) for r in results]
```

#### Expected Response:

```json
{
  "success": true,
  "data": {
    "filter_type": "top_sellers",
    "product_ids": [
      "550e8400-e29b-41d4-a716-446655440000",
      "660e8400-e29b-41d4-a716-446655440001",
      "770e8400-e29b-41d4-a716-446655440002"
    ],
    "count": 3
  }
}
```

---

## **PHASE 3: Product Movement Summary** 🥉

### Priority: **HIGH** | Timeline: **Week 3**

### 3.1 Product Movement Summary API

**Endpoint:** `GET /reports/api/inventory/movements/product-summary/` **(NEW)**

#### Purpose:
Provide comprehensive movement summary for a single product with all calculations done on backend

#### Query Parameters:

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `product_id` | UUID | Yes | Product to summarize | `550e8400-...` |
| `start_date` | Date | Yes | Summary start date | `2025-10-01` |
| `end_date` | Date | Yes | Summary end date | `2025-10-31` |

#### Backend Implementation:

```python
# views.py

class ProductMovementSummaryAPIView(APIView):
    """
    BUSINESS LOGIC: Calculate comprehensive product movement summary
    ALL calculations performed on backend
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        product_id = request.GET.get('product_id')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        
        if not product_id:
            return Response({
                'success': False,
                'error': 'product_id is required'
            }, status=400)
        
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Product not found'
            }, status=404)
        
        # BUSINESS LOGIC: Get all movements for this product in date range
        movements = StockMovement.objects.filter(
            product_id=product_id,
            created_at__gte=start_date,
            created_at__lte=end_date
        )
        
        # BUSINESS LOGIC: Calculate movement breakdown
        summary = self._calculate_movement_breakdown(movements)
        
        # BUSINESS LOGIC: Get current stock level
        current_stock = self._get_current_stock(product)
        
        # BUSINESS LOGIC: Calculate warehouse distribution
        warehouse_distribution = self._calculate_warehouse_distribution(product)
        
        return Response({
            'success': True,
            'data': {
                'product_id': str(product.id),
                'product_name': product.name,
                'sku': product.sku,
                'current_stock': current_stock,
                'movements': summary,
                'net_change': summary['net_change'],
                'by_warehouse': warehouse_distribution
            }
        })
    
    def _calculate_movement_breakdown(self, movements):
        """
        BUSINESS LOGIC: Categorize and sum movements
        Frontend receives pre-calculated values
        """
        # Sales (outbound)
        sales = movements.filter(
            reference_type='sale',
            movement_type='out'
        ).aggregate(total=Sum('quantity'))['total'] or 0
        
        # Transfers in (inbound)
        transfers_in = movements.filter(
            reference_type='transfer',
            movement_type='in'
        ).aggregate(total=Sum('quantity'))['total'] or 0
        
        # Transfers out (outbound)
        transfers_out = movements.filter(
            reference_type='transfer',
            movement_type='out'
        ).aggregate(total=Sum('quantity'))['total'] or 0
        
        # Adjustments up (inbound)
        adjustments_up = movements.filter(
            reference_type='adjustment',
            movement_type='in'
        ).aggregate(total=Sum('quantity'))['total'] or 0
        
        # Adjustments down (outbound - shrinkage/damage)
        adjustments_down = movements.filter(
            reference_type='adjustment',
            movement_type='out'
        ).aggregate(total=Sum('quantity'))['total'] or 0
        
        # BUSINESS LOGIC: Calculate net change
        # Positive: transfers_in + adjustments_up
        # Negative: sales + transfers_out + adjustments_down
        net_change = (transfers_in + adjustments_up) - (sales + transfers_out + adjustments_down)
        
        return {
            'sales': -abs(sales),  # Negative for display
            'transfers_in': transfers_in,
            'transfers_out': -abs(transfers_out),  # Negative for display
            'adjustments_up': adjustments_up,
            'adjustments_down': -abs(adjustments_down),  # Negative for display
            'net_change': net_change
        }
    
    def _get_current_stock(self, product):
        """
        BUSINESS LOGIC: Calculate current stock across all warehouses
        """
        return StockProduct.objects.filter(
            product=product
        ).aggregate(
            total=Sum('current_quantity')
        )['total'] or 0
    
    def _calculate_warehouse_distribution(self, product):
        """
        BUSINESS LOGIC: Calculate stock distribution by warehouse
        Includes percentage calculations
        """
        total_stock = self._get_current_stock(product)
        
        if total_stock == 0:
            return []
        
        # Get stock by warehouse
        warehouse_stock = StockProduct.objects.filter(
            product=product
        ).values(
            'warehouse_id',
            'warehouse__name'
        ).annotate(
            quantity=Sum('current_quantity')
        ).order_by('-quantity')
        
        # BUSINESS LOGIC: Calculate percentages
        distribution = []
        for item in warehouse_stock:
            if item['quantity'] > 0:
                percentage = (item['quantity'] / total_stock) * 100
                distribution.append({
                    'warehouse_id': str(item['warehouse_id']),
                    'warehouse_name': item['warehouse__name'],
                    'quantity': item['quantity'],
                    'percentage': round(percentage, 2)
                })
        
        return distribution
```

#### Expected Response:

```json
{
  "success": true,
  "data": {
    "product_id": "550e8400-e29b-41d4-a716-446655440000",
    "product_name": "Samsung TV 43\"",
    "sku": "ELEC-0005",
    "current_stock": 404,
    "movements": {
      "sales": -145,
      "transfers_in": 28,
      "transfers_out": -35,
      "adjustments_up": 5,
      "adjustments_down": -8,
      "net_change": -155
    },
    "net_change": -155,
    "by_warehouse": [
      {
        "warehouse_id": "440e8400-e29b-41d4-a716-446655440000",
        "warehouse_name": "Main Warehouse",
        "quantity": 145,
        "percentage": 35.89
      },
      {
        "warehouse_id": "550e8400-e29b-41d4-a716-446655440001",
        "warehouse_name": "Store 1",
        "quantity": 120,
        "percentage": 29.70
      },
      {
        "warehouse_id": "660e8400-e29b-41d4-a716-446655440002",
        "warehouse_name": "Store 2",
        "quantity": 89,
        "percentage": 22.03
      },
      {
        "warehouse_id": "770e8400-e29b-41d4-a716-446655440003",
        "warehouse_name": "Warehouse 3",
        "quantity": 50,
        "percentage": 12.38
      }
    ]
  }
}
```

**Critical Business Logic Notes:**
- ✅ All movement calculations done on backend
- ✅ Percentages calculated and rounded on backend
- ✅ Net change formula applied on backend
- ✅ Current stock aggregated on backend
- ❌ Frontend does NOT calculate anything - only displays

---

## **PHASE 4: Movement Analytics Dashboard** 🏅

### Priority: **MEDIUM** | Timeline: **Week 4**

### 4.1 Movement Analytics API

**Endpoint:** `GET /reports/api/inventory/movements/analytics/` **(NEW)**

#### Purpose:
Provide pre-calculated analytics data for dashboard charts and metrics

#### Query Parameters:

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `start_date` | Date | Yes | Analysis start date | `2025-10-01` |
| `end_date` | Date | Yes | Analysis end date | `2025-10-31` |
| `warehouse_id` | UUID | No | Filter to warehouse | `uuid` |
| `category_id` | UUID | No | Filter to category | `uuid` |

#### Backend Implementation:

```python
# views.py

class MovementAnalyticsAPIView(APIView):
    """
    BUSINESS LOGIC: Generate comprehensive movement analytics
    ALL calculations, aggregations, and rankings done on backend
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        warehouse_id = request.GET.get('warehouse_id')
        category_id = request.GET.get('category_id')
        
        # Base queryset
        movements = StockMovement.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date
        )
        
        if warehouse_id:
            movements = movements.filter(warehouse_id=warehouse_id)
        if category_id:
            movements = movements.filter(product__category_id=category_id)
        
        # BUSINESS LOGIC: Calculate all analytics
        analytics = {
            'top_sellers': self._get_top_sellers(movements),
            'movement_breakdown': self._get_movement_breakdown(movements),
            'daily_trend': self._get_daily_trend(movements, start_date, end_date),
            'shrinkage_leaders': self._get_shrinkage_leaders(movements),
            'metrics': self._calculate_metrics(movements, start_date, end_date)
        }
        
        return Response({
            'success': True,
            'data': analytics
        })
    
    def _get_top_sellers(self, movements, limit=10):
        """
        BUSINESS LOGIC: Identify and rank top selling products
        """
        top_products = movements.filter(
            reference_type='sale'
        ).values(
            'product__name',
            'product__sku'
        ).annotate(
            quantity_sold=Sum('quantity')
        ).order_by('-quantity_sold')[:limit]
        
        return [
            {
                'product_name': p['product__name'],
                'sku': p['product__sku'],
                'quantity_sold': abs(p['quantity_sold'])
            }
            for p in top_products
        ]
    
    def _get_movement_breakdown(self, movements):
        """
        BUSINESS LOGIC: Calculate movement type totals and percentages
        """
        total_movements = movements.count()
        
        if total_movements == 0:
            return {'sales': 0, 'transfers': 0, 'adjustments': 0}
        
        sales_count = movements.filter(reference_type='sale').aggregate(
            total=Sum('quantity')
        )['total'] or 0
        
        transfers_count = movements.filter(reference_type='transfer').aggregate(
            total=Sum('quantity')
        )['total'] or 0
        
        adjustments_count = movements.filter(reference_type='adjustment').aggregate(
            total=Sum('quantity')
        )['total'] or 0
        
        # BUSINESS LOGIC: Calculate percentages
        total_qty = abs(sales_count) + abs(transfers_count) + abs(adjustments_count)
        
        return {
            'sales': abs(sales_count),
            'transfers': abs(transfers_count),
            'adjustments': abs(adjustments_count),
            'sales_percentage': round((abs(sales_count) / total_qty * 100), 2) if total_qty > 0 else 0,
            'transfers_percentage': round((abs(transfers_count) / total_qty * 100), 2) if total_qty > 0 else 0,
            'adjustments_percentage': round((abs(adjustments_count) / total_qty * 100), 2) if total_qty > 0 else 0
        }
    
    def _get_daily_trend(self, movements, start_date, end_date):
        """
        BUSINESS LOGIC: Generate daily movement trend data
        """
        from datetime import datetime, timedelta
        
        # Create date range
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        daily_data = []
        current_date = start
        
        while current_date <= end:
            next_date = current_date + timedelta(days=1)
            
            day_movements = movements.filter(
                created_at__gte=current_date,
                created_at__lt=next_date
            )
            
            # BUSINESS LOGIC: Aggregate by type for each day
            sales = abs(day_movements.filter(
                reference_type='sale'
            ).aggregate(total=Sum('quantity'))['total'] or 0)
            
            transfers = abs(day_movements.filter(
                reference_type='transfer'
            ).aggregate(total=Sum('quantity'))['total'] or 0)
            
            adjustments = abs(day_movements.filter(
                reference_type='adjustment'
            ).aggregate(total=Sum('quantity'))['total'] or 0)
            
            daily_data.append({
                'date': current_date.strftime('%Y-%m-%d'),
                'sales': sales,
                'transfers': transfers,
                'adjustments': adjustments,
                'total': sales + transfers + adjustments
            })
            
            current_date = next_date
        
        return daily_data
    
    def _get_shrinkage_leaders(self, movements, limit=10):
        """
        BUSINESS LOGIC: Identify products with most shrinkage
        Calculate value impact
        """
        shrinkage_products = movements.filter(
            reference_type='adjustment',
            movement_type='out'  # Negative adjustments
        ).values(
            'product__name',
            'product__sku'
        ).annotate(
            quantity=Sum('quantity'),
            # BUSINESS LOGIC: Calculate value impact
            value_impact=Sum(
                F('quantity') * F('product__unit_price'),
                output_field=DecimalField()
            )
        ).order_by('quantity')[:limit]  # Most negative first
        
        return [
            {
                'product_name': p['product__name'],
                'sku': p['product__sku'],
                'quantity': abs(p['quantity']),
                'value_impact': abs(p['value_impact']) if p['value_impact'] else 0
            }
            for p in shrinkage_products
        ]
    
    def _calculate_metrics(self, movements, start_date, end_date):
        """
        BUSINESS LOGIC: Calculate key performance metrics
        """
        from datetime import datetime
        
        # Calculate date range in days
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
        days = (end - start).days + 1
        
        total_movements = movements.aggregate(total=Sum('quantity'))['total'] or 0
        
        # BUSINESS LOGIC: Average daily movement
        avg_daily = abs(total_movements) / days if days > 0 else 0
        
        # BUSINESS LOGIC: Total movement value
        total_value = movements.aggregate(
            value=Sum(
                F('quantity') * F('product__unit_price'),
                output_field=DecimalField()
            )
        )['value'] or 0
        
        # BUSINESS LOGIC: Unique products moved
        unique_products = movements.values('product_id').distinct().count()
        
        # BUSINESS LOGIC: Stock velocity (simplified)
        # Average days between movements per product
        velocity_data = movements.values('product_id').annotate(
            movement_count=Count('id')
        ).aggregate(
            avg_movements=Avg('movement_count')
        )
        
        avg_movements_per_product = velocity_data['avg_movements'] or 0
        stock_velocity = days / avg_movements_per_product if avg_movements_per_product > 0 else 0
        
        return {
            'avg_daily_movement': round(avg_daily, 2),
            'total_movement_value': float(abs(total_value)),
            'unique_products': unique_products,
            'stock_velocity_days': round(stock_velocity, 2),
            'total_movements': abs(total_movements),
            'date_range_days': days
        }
```

#### Expected Response:

```json
{
  "success": true,
  "data": {
    "top_sellers": [
      {
        "product_name": "iPhone 13",
        "sku": "ELEC-0002",
        "quantity_sold": 245
      },
      {
        "product_name": "HP Laptop 15\"",
        "sku": "ELEC-0093",
        "quantity_sold": 180
      },
      {
        "product_name": "Samsung TV 43\"",
        "sku": "ELEC-0005",
        "quantity_sold": 145
      }
    ],
    "movement_breakdown": {
      "sales": 856,
      "transfers": 289,
      "adjustments": 45,
      "sales_percentage": 71.93,
      "transfers_percentage": 24.29,
      "adjustments_percentage": 3.78
    },
    "daily_trend": [
      {
        "date": "2025-10-01",
        "sales": 28,
        "transfers": 12,
        "adjustments": 2,
        "total": 42
      },
      {
        "date": "2025-10-02",
        "sales": 35,
        "transfers": 8,
        "adjustments": 1,
        "total": 44
      }
      // ... more days
    ],
    "shrinkage_leaders": [
      {
        "product_name": "Samsung Galaxy A14",
        "sku": "ELEC-0091",
        "quantity": 15,
        "value_impact": 4500.50
      },
      {
        "product_name": "iPhone 13",
        "sku": "ELEC-0002",
        "quantity": 8,
        "value_impact": 8500.00
      }
    ],
    "metrics": {
      "avg_daily_movement": 38.39,
      "total_movement_value": 1245000.50,
      "unique_products": 147,
      "stock_velocity_days": 2.35,
      "total_movements": 1190,
      "date_range_days": 31
    }
  }
}
```

**Critical Business Logic:**
- ✅ ALL ranking logic on backend
- ✅ ALL percentage calculations on backend
- ✅ ALL aggregations on backend
- ✅ Daily trend generation on backend
- ✅ Metrics calculations on backend
- ❌ Frontend only renders charts with provided data

---

## 📊 Business Logic Summary

### Backend Owns:
1. **Data Aggregation**
   - Summing quantities
   - Counting movements
   - Grouping by product/warehouse/date

2. **Calculations**
   - Net change (in - out)
   - Percentages (movement type distribution, warehouse distribution)
   - Averages (daily movement, stock velocity)
   - Value calculations (quantity × price)

3. **Ranking & Sorting**
   - Top sellers identification
   - Most adjusted products
   - Shrinkage leaders
   - Relevance scoring for search

4. **Date Range Processing**
   - Generating daily trend data
   - Filling gaps in date ranges
   - Date-based aggregations

5. **Complex Queries**
   - Multi-table joins
   - Nested aggregations
   - Conditional logic

### Frontend Only:
1. **Display Formatting**
   - Currency symbols (but NOT conversion)
   - Number formatting with commas
   - Date display format

2. **User Interaction**
   - Clicks, hovers, selections
   - Navigation
   - Form submission

3. **Visual Rendering**
   - Charts (using backend-provided data)
   - Tables
   - UI components

---

## 🔒 Security & Performance Considerations

### Authentication & Authorization
All new endpoints require:
```python
permission_classes = [IsAuthenticated]

# Additionally, filter by user's organization/tenant
queryset = queryset.filter(
    product__organization=request.user.organization
)
```

### Query Optimization
```python
# Use select_related for foreign keys
movements = StockMovement.objects.select_related(
    'product',
    'warehouse',
    'product__category'
).filter(...)

# Use prefetch_related for reverse relationships
products = Product.objects.prefetch_related(
    'stock_products',
    'stock_products__warehouse'
).filter(...)

# Add database indexes
class StockMovement(models.Model):
    class Meta:
        indexes = [
            models.Index(fields=['product_id', 'created_at']),
            models.Index(fields=['reference_type', 'movement_type']),
            models.Index(fields=['created_at', 'warehouse_id']),
        ]
```

### Caching Strategy
```python
from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

class MovementAnalyticsAPIView(APIView):
    @method_decorator(cache_page(60 * 5))  # Cache for 5 minutes
    def get(self, request):
        # Analytics data changes infrequently
        # Cache to reduce database load
        pass
```

### Pagination
```python
# Always paginate list endpoints
from rest_framework.pagination import PageNumberPagination

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class StockMovementsAPIView(APIView):
    pagination_class = StandardResultsSetPagination
```

---

## 🧪 Testing Requirements

### Unit Tests
```python
# test_movement_analytics.py

class MovementAnalyticsTestCase(TestCase):
    def setUp(self):
        # Create test data
        self.product = Product.objects.create(name="Test Product", sku="TEST-001")
        self.warehouse = Warehouse.objects.create(name="Test Warehouse")
        
    def test_calculate_movement_breakdown(self):
        """Test that movement breakdown calculates correctly"""
        # Create test movements
        StockMovement.objects.create(
            product=self.product,
            reference_type='sale',
            movement_type='out',
            quantity=10
        )
        
        # Call API
        response = self.client.get('/reports/api/inventory/movements/analytics/')
        
        # Assert calculations are correct
        self.assertEqual(response.data['data']['movement_breakdown']['sales'], 10)
    
    def test_top_sellers_ranking(self):
        """Test that top sellers are ranked correctly"""
        # Create products with different sales volumes
        # Assert ranking is correct
        pass
    
    def test_percentage_calculations(self):
        """Test that percentages add up to 100%"""
        # Assert warehouse distribution percentages = 100%
        # Assert movement breakdown percentages = 100%
        pass
```

### API Integration Tests
```bash
# Test all new endpoints with curl or Postman

# Product search
curl -X GET "http://localhost:8000/reports/api/inventory/products/search/?q=samsung" \
  -H "Authorization: Bearer TOKEN"

# Quick filters
curl -X GET "http://localhost:8000/reports/api/inventory/movements/quick-filters/?filter_type=top_sellers&start_date=2025-10-01&end_date=2025-10-31" \
  -H "Authorization: Bearer TOKEN"

# Product summary
curl -X GET "http://localhost:8000/reports/api/inventory/movements/product-summary/?product_id=UUID&start_date=2025-10-01&end_date=2025-10-31" \
  -H "Authorization: Bearer TOKEN"

# Analytics
curl -X GET "http://localhost:8000/reports/api/inventory/movements/analytics/?start_date=2025-10-01&end_date=2025-10-31" \
  -H "Authorization: Bearer TOKEN"
```

---

## 📋 Implementation Checklist

### Phase 1: Product Filtering
- [ ] Add `product_id` parameter to movements endpoint
- [ ] Add `product_ids` parameter for multi-select
- [ ] Update queryset filtering logic
- [ ] Test with single product
- [ ] Test with multiple products
- [ ] Update API documentation

### Phase 2: Search & Quick Filters
- [ ] Create product search endpoint
- [ ] Implement search ranking logic
- [ ] Create quick filters endpoint
- [ ] Implement top sellers logic
- [ ] Implement most adjusted logic
- [ ] Implement high transfers logic
- [ ] Implement shrinkage logic
- [ ] Add database indexes for performance
- [ ] Write unit tests
- [ ] Test all quick filter types

### Phase 3: Product Summary
- [ ] Create product summary endpoint
- [ ] Implement movement breakdown calculation
- [ ] Implement net change calculation
- [ ] Implement current stock calculation
- [ ] Implement warehouse distribution calculation
- [ ] Implement percentage calculations
- [ ] Add error handling for missing products
- [ ] Write unit tests for all calculations
- [ ] Test with various date ranges
- [ ] Verify percentage totals = 100%

### Phase 4: Analytics Dashboard
- [ ] Create analytics endpoint
- [ ] Implement top sellers calculation
- [ ] Implement movement breakdown with percentages
- [ ] Implement daily trend generation
- [ ] Implement shrinkage leaders calculation
- [ ] Implement metrics calculations
- [ ] Add caching for analytics data
- [ ] Optimize queries with select_related
- [ ] Write comprehensive unit tests
- [ ] Load test with large datasets
- [ ] Document all metric formulas

---

## 🔗 API Endpoints Summary

| Endpoint | Method | Purpose | Phase | Priority |
|----------|--------|---------|-------|----------|
| `/reports/api/inventory/movements/` | GET | Enhanced with product filtering | 1 | CRITICAL |
| `/reports/api/inventory/products/search/` | GET | Product autocomplete search | 2 | HIGH |
| `/reports/api/inventory/movements/quick-filters/` | GET | Quick filter product lists | 2 | HIGH |
| `/reports/api/inventory/movements/product-summary/` | GET | Per-product movement summary | 3 | HIGH |
| `/reports/api/inventory/movements/analytics/` | GET | Dashboard analytics data | 4 | MEDIUM |

---

## 📖 Additional Notes

### Data Integrity
- Ensure all calculations use consistent rounding (2 decimal places for currency)
- Handle division by zero in percentage calculations
- Return 0 instead of null for missing aggregations
- Validate date ranges (end_date >= start_date)

### Error Handling
```python
# Consistent error response format
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### Response Format
```python
# Consistent success response format
{
  "success": true,
  "data": {
    # Actual data here
  },
  "meta": {
    "pagination": {...},
    "filters_applied": {...}
  }
}
```

---

## 🎯 Success Criteria

### Functional Requirements
- ✅ All calculations produce correct results
- ✅ Percentages always sum to 100%
- ✅ Rankings are accurate and consistent
- ✅ Date range filtering works correctly
- ✅ Multi-product filtering works

### Performance Requirements
- ✅ Product search responds in < 500ms
- ✅ Movement summary loads in < 2s
- ✅ Analytics dashboard loads in < 3s
- ✅ All endpoints handle 1000+ products
- ✅ Queries optimized with proper indexes

### Code Quality Requirements
- ✅ All business logic has unit tests
- ✅ Code coverage > 80%
- ✅ No N+1 query problems
- ✅ Proper error handling
- ✅ API documentation complete

---

## 📞 Contact & Support

**Frontend Team Contact:**
- Questions about expected response formats
- Clarification on calculation logic
- Testing coordination

**Backend Team Deliverables:**
1. API implementation for all 4 phases
2. Unit tests for all business logic
3. API documentation with examples
4. Performance optimization
5. Database migrations (if needed)

---

**Document Version:** 1.0  
**Created:** November 1, 2025  
**Status:** 🎯 READY FOR BACKEND IMPLEMENTATION  
**Business Logic Principle:** ALL calculations, aggregations, and ranking logic MUST be on backend  
**Frontend Responsibility:** Display only, NO business logic
