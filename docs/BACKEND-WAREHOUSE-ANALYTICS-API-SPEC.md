# Warehouse Analytics API Specification

## Overview
This document specifies the backend API requirements for the Warehouse Analytics feature in the POS system. The frontend expects a comprehensive analytics endpoint that provides warehouse-level performance metrics, stock analysis, and product movement data.

---

## Endpoint Details

### Base Endpoint
```
GET /reports/api/inventory/warehouse-analytics/
```

### Authentication
- **Required**: Yes
- **Type**: Bearer Token
- **Header**: `Authorization: Bearer <token>`

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `start_date` | string (ISO date) | Yes | - | Start date for analytics period (e.g., "2025-08-03") |
| `end_date` | string (ISO date) | Yes | - | End date for analytics period (e.g., "2025-11-01") |
| `warehouse_id` | string (UUID) | No | All | Filter by specific warehouse |
| `warehouse_type` | string | No | All | Filter by type: "warehouse" or "storefront" |
| `export_format` | string | No | - | Export format: "csv" or "pdf" |

### Example Request
```bash
curl -X GET "http://localhost:8000/reports/api/inventory/warehouse-analytics/?start_date=2025-08-03&end_date=2025-11-01" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

---

## Response Structure

### Success Response (HTTP 200)

```json
{
  "success": true,
  "data": {
    "warehouses": [
      {
        "warehouse_id": "550e8400-e29b-41d4-a716-446655440000",
        "warehouse_name": "Adenta Store",
        "warehouse_type": "storefront",
        "metrics": {
          "total_products": 150,
          "total_stock_value": 45000.00,
          "stock_turnover_ratio": 2.5,
          "average_days_in_stock": 45,
          "dead_stock_count": 12,
          "dead_stock_value": 5000.00,
          "stock_accuracy": 98.5,
          "storage_utilization": 75.0,
          "movements": {
            "inbound": 250,
            "outbound": 180,
            "transfers_in": 30,
            "transfers_out": 25
          }
        },
        "top_products": [
          {
            "product_id": "650e8400-e29b-41d4-a716-446655440001",
            "product_name": "Red T-Shirt",
            "quantity": 50,
            "value": 2500.00,
            "turnover_rate": 3.2
          },
          {
            "product_id": "650e8400-e29b-41d4-a716-446655440002",
            "product_name": "Blue Jeans",
            "quantity": 35,
            "value": 3500.00,
            "turnover_rate": 2.8
          }
        ],
        "slow_movers": [
          {
            "product_id": "650e8400-e29b-41d4-a716-446655440010",
            "product_name": "Blue Jacket",
            "quantity": 20,
            "value": 1500.00,
            "days_since_last_sale": 180
          },
          {
            "product_id": "650e8400-e29b-41d4-a716-446655440011",
            "product_name": "Red Scarf",
            "quantity": 15,
            "value": 450.00,
            "days_since_last_sale": 210
          }
        ]
      },
      {
        "warehouse_id": "550e8400-e29b-41d4-a716-446655440100",
        "warehouse_name": "Rawlings Park Warehouse",
        "warehouse_type": "warehouse",
        "metrics": {
          "total_products": 320,
          "total_stock_value": 125000.00,
          "stock_turnover_ratio": 1.8,
          "average_days_in_stock": 60,
          "dead_stock_count": 25,
          "dead_stock_value": 8500.00,
          "stock_accuracy": 97.2,
          "storage_utilization": 82.5,
          "movements": {
            "inbound": 500,
            "outbound": 420,
            "transfers_in": 80,
            "transfers_out": 95
          }
        },
        "top_products": [
          {
            "product_id": "650e8400-e29b-41d4-a716-446655440003",
            "product_name": "Black Hoodie",
            "quantity": 80,
            "value": 6400.00,
            "turnover_rate": 4.1
          }
        ],
        "slow_movers": [
          {
            "product_id": "650e8400-e29b-41d4-a716-446655440012",
            "product_name": "Green Sweater",
            "quantity": 30,
            "value": 1800.00,
            "days_since_last_sale": 150
          }
        ]
      }
    ]
  }
}
```

### Error Response (HTTP 400/401/500)

```json
{
  "success": false,
  "error": "Invalid date range",
  "message": "End date must be after start date"
}
```

---

## Data Model Specifications

### Warehouse Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `warehouse_id` | string (UUID) | Yes | Unique identifier for the warehouse |
| `warehouse_name` | string | Yes | Display name of the warehouse |
| `warehouse_type` | enum | Yes | Type: "warehouse" or "storefront" |
| `metrics` | object | Yes | Performance metrics (see below) |
| `top_products` | array | Yes | Top performing products (can be empty array) |
| `slow_movers` | array | Yes | Slow moving products (can be empty array) |

### Metrics Object

| Field | Type | Required | Description | Calculation |
|-------|------|----------|-------------|-------------|
| `total_products` | integer | Yes | Count of unique products in warehouse | COUNT(DISTINCT product_id) |
| `total_stock_value` | decimal | Yes | Total value of inventory | SUM(quantity × unit_cost) |
| `stock_turnover_ratio` | decimal | Yes | How many times inventory sold/replaced | COGS / Average Inventory Value |
| `average_days_in_stock` | integer | Yes | Average days products remain in stock | AVG(CURRENT_DATE - product_arrival_date) |
| `dead_stock_count` | integer | Yes | Products with no movement in 180+ days | COUNT where last_sale > 180 days |
| `dead_stock_value` | decimal | Yes | Value of dead stock | SUM(dead_stock_quantity × unit_cost) |
| `stock_accuracy` | decimal | Yes | Physical vs system stock match % | (Correct Counts / Total Counts) × 100 |
| `storage_utilization` | decimal | Yes | Percentage of storage capacity used | (Used Space / Total Space) × 100 |
| `movements` | object | Yes | Movement counts by type | See Movements Object |

### Movements Object (within Metrics)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `inbound` | integer | Yes | Incoming stock movements (purchases, transfers in, adjustments up) |
| `outbound` | integer | Yes | Outgoing stock movements (sales, transfers out, shrinkage) |
| `transfers_in` | integer | Yes | Stock transferred into this warehouse |
| `transfers_out` | integer | Yes | Stock transferred out to other warehouses |

### Top Products Array Item

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `product_id` | string (UUID) | Yes | Product identifier |
| `product_name` | string | Yes | Product display name |
| `quantity` | integer | Yes | Current stock quantity |
| `value` | decimal | Yes | Total value (quantity × unit_cost) |
| `turnover_rate` | decimal | Yes | Product-specific turnover ratio |

### Slow Movers Array Item

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `product_id` | string (UUID) | Yes | Product identifier |
| `product_name` | string | Yes | Product display name |
| `quantity` | integer | Yes | Current stock quantity |
| `value` | decimal | Yes | Total value (quantity × unit_cost) |
| `days_since_last_sale` | integer | Yes | Days since last outbound movement |

---

## Business Logic Requirements

### 1. Stock Turnover Ratio Calculation
```python
# Formula: Cost of Goods Sold (COGS) / Average Inventory Value
stock_turnover_ratio = (
    total_cogs_in_period / 
    ((beginning_inventory_value + ending_inventory_value) / 2)
)
```

### 2. Dead Stock Identification
- Products with **NO sales** in the last **180 days**
- Must have non-zero quantity on hand
- Include both "no movement" and "only adjustments" scenarios

### 3. Stock Accuracy Calculation
```python
# Based on cycle counts or physical inventory checks
stock_accuracy = (
    count_of_matching_records / 
    total_records_checked
) * 100
```

### 4. Storage Utilization
```python
# If tracking physical storage
storage_utilization = (
    current_occupied_space / 
    total_available_space
) * 100

# OR based on capacity limits
storage_utilization = (
    current_product_count / 
    max_capacity
) * 100
```

### 5. Top Products Selection
- Top **10 products** by **turnover rate** in the date range
- Must have at least 1 sale in the period
- Sorted descending by `turnover_rate`

### 6. Slow Movers Selection
- Products with **days_since_last_sale > 90 days**
- Sorted descending by `days_since_last_sale`
- Limit to top **10 slowest** movers

---

## Frontend Display Logic

### Summary KPI Cards (Across All Warehouses)

1. **Total Warehouses**
   - Count: `warehouses.length`
   - Description: "Total warehouse locations"

2. **Total Stock Value**
   - Calculation: `SUM(warehouse.metrics.total_stock_value)`
   - Format: Currency (₵45,000.00)
   - Description: "Across all locations"

3. **Average Turnover Ratio**
   - Calculation: `AVG(warehouse.metrics.stock_turnover_ratio)`
   - Format: Decimal (2.15)
   - Description: "Needs improvement" if < 2.0, "Good" if >= 2.0

4. **Dead Stock Items**
   - Calculation: `SUM(warehouse.metrics.dead_stock_count)`
   - Format: Integer count
   - Description: "180+ days no movement"

### Warehouse Details Table

Displays each warehouse with columns:
- Warehouse Name
- Type (badge: "Warehouse" or "Storefront")
- Total Products
- Stock Value (formatted currency)
- Turnover Ratio
- Dead Stock Count
- Storage Utilization %

### Empty State Handling
- If `warehouses.length === 0`, show empty state with message:
  - "No warehouse data available"
  - "Try adjusting your date range or filters"

---

## Performance Considerations

### Database Optimization
1. **Index Requirements**:
   - `stock_movements.warehouse_id`
   - `stock_movements.movement_date`
   - `stock_movements.product_id`
   - `products.last_sale_date`
   - `inventory.warehouse_id`

2. **Query Optimization**:
   - Use aggregate functions (COUNT, SUM, AVG) in database
   - Avoid N+1 queries - fetch all warehouse data in single query
   - Consider materialized views for complex calculations

3. **Caching Strategy**:
   - Cache results for 15 minutes (analytics don't need real-time)
   - Cache key: `warehouse_analytics:{start_date}:{end_date}:{warehouse_id}`
   - Invalidate on inventory adjustments

### Response Time Targets
- **< 2 seconds** for single warehouse
- **< 5 seconds** for all warehouses
- **< 10 seconds** for CSV/PDF export

---

## Export Functionality

### CSV Export
```
GET /reports/api/inventory/warehouse-analytics/?start_date=2025-08-03&end_date=2025-11-01&export_format=csv
```

**Expected CSV Structure:**
```csv
Warehouse Name,Type,Total Products,Stock Value,Turnover Ratio,Dead Stock Count,Dead Stock Value,Avg Days in Stock,Storage Utilization
Adenta Store,storefront,150,45000.00,2.5,12,5000.00,45,75.0
Rawlings Park,warehouse,320,125000.00,1.8,25,8500.00,60,82.5
```

### PDF Export
```
GET /reports/api/inventory/warehouse-analytics/?start_date=2025-08-03&end_date=2025-11-01&export_format=pdf
```

**PDF Layout:**
- Header: Report title, date range, generation timestamp
- Summary section: Total warehouses, combined metrics
- Per-warehouse breakdown tables
- Footer: Page numbers, company info

---

## Sample Implementation (Django)

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Avg, Count, F, Q
from datetime import datetime, timedelta
from decimal import Decimal

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def warehouse_analytics(request):
    """
    Get warehouse analytics for the specified date range.
    """
    # Parse query parameters
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    warehouse_id = request.GET.get('warehouse_id')
    warehouse_type = request.GET.get('warehouse_type')
    
    if not start_date or not end_date:
        return Response({
            'success': False,
            'error': 'Missing required parameters',
            'message': 'start_date and end_date are required'
        }, status=400)
    
    # Query warehouses
    warehouses_query = Warehouse.objects.filter(is_active=True)
    
    if warehouse_id:
        warehouses_query = warehouses_query.filter(id=warehouse_id)
    
    if warehouse_type:
        warehouses_query = warehouses_query.filter(warehouse_type=warehouse_type)
    
    warehouse_data = []
    
    for warehouse in warehouses_query:
        # Calculate metrics
        metrics = calculate_warehouse_metrics(
            warehouse=warehouse,
            start_date=start_date,
            end_date=end_date
        )
        
        # Get top products
        top_products = get_top_products(
            warehouse=warehouse,
            start_date=start_date,
            end_date=end_date,
            limit=10
        )
        
        # Get slow movers
        slow_movers = get_slow_movers(
            warehouse=warehouse,
            days_threshold=90,
            limit=10
        )
        
        warehouse_data.append({
            'warehouse_id': str(warehouse.id),
            'warehouse_name': warehouse.name,
            'warehouse_type': warehouse.warehouse_type,
            'metrics': metrics,
            'top_products': top_products,
            'slow_movers': slow_movers
        })
    
    return Response({
        'success': True,
        'data': {
            'warehouses': warehouse_data
        }
    })


def calculate_warehouse_metrics(warehouse, start_date, end_date):
    """
    Calculate all metrics for a warehouse.
    """
    from django.db.models import Q, Sum, Avg, Count
    from datetime import datetime, timedelta
    
    # Total products
    total_products = Inventory.objects.filter(
        warehouse=warehouse,
        quantity__gt=0
    ).values('product').distinct().count()
    
    # Total stock value
    total_stock_value = Inventory.objects.filter(
        warehouse=warehouse
    ).aggregate(
        total=Sum(F('quantity') * F('product__cost_price'))
    )['total'] or Decimal('0.00')
    
    # Stock turnover ratio
    cogs = StockMovement.objects.filter(
        warehouse=warehouse,
        movement_date__range=[start_date, end_date],
        movement_type='out'
    ).aggregate(
        total=Sum(F('quantity') * F('product__cost_price'))
    )['total'] or Decimal('0.00')
    
    beginning_value = get_inventory_value(warehouse, start_date)
    ending_value = total_stock_value
    avg_inventory = (beginning_value + ending_value) / 2
    
    stock_turnover_ratio = (
        float(cogs / avg_inventory) if avg_inventory > 0 else 0.0
    )
    
    # Average days in stock
    avg_days = Inventory.objects.filter(
        warehouse=warehouse,
        quantity__gt=0
    ).aggregate(
        avg=Avg(
            datetime.now().date() - F('product__last_received_date')
        )
    )['avg'] or 0
    
    # Dead stock (180+ days no movement)
    dead_stock_threshold = datetime.now().date() - timedelta(days=180)
    dead_stock = Inventory.objects.filter(
        warehouse=warehouse,
        quantity__gt=0,
        product__last_sale_date__lt=dead_stock_threshold
    ) | Inventory.objects.filter(
        warehouse=warehouse,
        quantity__gt=0,
        product__last_sale_date__isnull=True
    )
    
    dead_stock_count = dead_stock.count()
    dead_stock_value = dead_stock.aggregate(
        total=Sum(F('quantity') * F('product__cost_price'))
    )['total'] or Decimal('0.00')
    
    # Stock accuracy (from cycle counts)
    accuracy_checks = StockCount.objects.filter(
        warehouse=warehouse,
        count_date__range=[start_date, end_date]
    )
    
    if accuracy_checks.exists():
        stock_accuracy = accuracy_checks.aggregate(
            accuracy=Avg(
                Case(
                    When(system_count=F('physical_count'), then=100.0),
                    default=0.0
                )
            )
        )['accuracy'] or 0.0
    else:
        stock_accuracy = 0.0
    
    # Storage utilization
    storage_utilization = (
        (total_products / warehouse.max_capacity * 100)
        if warehouse.max_capacity > 0 else 0.0
    )
    
    # Movement counts
    movements = StockMovement.objects.filter(
        warehouse=warehouse,
        movement_date__range=[start_date, end_date]
    )
    
    inbound = movements.filter(
        Q(movement_type='in') | 
        Q(reference_type='purchase_order') |
        Q(reference_type='transfer', quantity__gt=0)
    ).aggregate(total=Count('id'))['total'] or 0
    
    outbound = movements.filter(
        Q(movement_type='out') | 
        Q(reference_type='sale') |
        Q(reference_type='adjustment', quantity__lt=0)
    ).aggregate(total=Count('id'))['total'] or 0
    
    transfers_in = movements.filter(
        reference_type='transfer',
        destination_warehouse=warehouse
    ).aggregate(total=Count('id'))['total'] or 0
    
    transfers_out = movements.filter(
        reference_type='transfer',
        source_warehouse=warehouse
    ).aggregate(total=Count('id'))['total'] or 0
    
    return {
        'total_products': total_products,
        'total_stock_value': float(total_stock_value),
        'stock_turnover_ratio': round(stock_turnover_ratio, 2),
        'average_days_in_stock': int(avg_days),
        'dead_stock_count': dead_stock_count,
        'dead_stock_value': float(dead_stock_value),
        'stock_accuracy': round(stock_accuracy, 1),
        'storage_utilization': round(storage_utilization, 1),
        'movements': {
            'inbound': inbound,
            'outbound': outbound,
            'transfers_in': transfers_in,
            'transfers_out': transfers_out
        }
    }


def get_top_products(warehouse, start_date, end_date, limit=10):
    """
    Get top performing products by turnover rate.
    """
    from django.db.models import Sum, F, Count
    
    top_products = Inventory.objects.filter(
        warehouse=warehouse,
        quantity__gt=0
    ).annotate(
        total_sales=Sum(
            'product__stockmovement__quantity',
            filter=Q(
                product__stockmovement__movement_type='out',
                product__stockmovement__movement_date__range=[start_date, end_date]
            )
        ),
        value=F('quantity') * F('product__cost_price')
    ).filter(
        total_sales__gt=0
    ).order_by('-total_sales')[:limit]
    
    return [
        {
            'product_id': str(inv.product.id),
            'product_name': inv.product.name,
            'quantity': inv.quantity,
            'value': float(inv.value),
            'turnover_rate': round(
                float(inv.total_sales or 0) / float(inv.quantity or 1), 
                2
            )
        }
        for inv in top_products
    ]


def get_slow_movers(warehouse, days_threshold=90, limit=10):
    """
    Get slow moving products.
    """
    from datetime import datetime, timedelta
    
    threshold_date = datetime.now().date() - timedelta(days=days_threshold)
    
    slow_products = Inventory.objects.filter(
        warehouse=warehouse,
        quantity__gt=0
    ).filter(
        Q(product__last_sale_date__lt=threshold_date) |
        Q(product__last_sale_date__isnull=True)
    ).annotate(
        value=F('quantity') * F('product__cost_price'),
        days_since_sale=Case(
            When(
                product__last_sale_date__isnull=False,
                then=datetime.now().date() - F('product__last_sale_date')
            ),
            default=999,
            output_field=IntegerField()
        )
    ).order_by('-days_since_sale')[:limit]
    
    return [
        {
            'product_id': str(inv.product.id),
            'product_name': inv.product.name,
            'quantity': inv.quantity,
            'value': float(inv.value),
            'days_since_last_sale': inv.days_since_sale
        }
        for inv in slow_products
    ]
```

---

## Testing Requirements

### Unit Tests
1. Test metric calculations with known data
2. Test top products sorting and limiting
3. Test slow movers identification
4. Test date range filtering
5. Test warehouse type filtering

### Integration Tests
1. Test full endpoint with multiple warehouses
2. Test CSV export generation
3. Test PDF export generation
4. Test empty data scenarios
5. Test invalid date ranges

### Sample Test Data
```python
# Create test warehouses
warehouse1 = Warehouse.objects.create(
    name="Test Store",
    warehouse_type="storefront",
    max_capacity=100
)

warehouse2 = Warehouse.objects.create(
    name="Test Warehouse",
    warehouse_type="warehouse",
    max_capacity=500
)

# Create test products
product1 = Product.objects.create(
    name="Test Product 1",
    cost_price=Decimal("10.00"),
    last_sale_date=datetime.now().date() - timedelta(days=10)
)

product2 = Product.objects.create(
    name="Test Product 2",
    cost_price=Decimal("20.00"),
    last_sale_date=datetime.now().date() - timedelta(days=200)  # Dead stock
)

# Create inventory
Inventory.objects.create(
    warehouse=warehouse1,
    product=product1,
    quantity=50
)

Inventory.objects.create(
    warehouse=warehouse1,
    product=product2,
    quantity=20
)

# Create movements
StockMovement.objects.create(
    warehouse=warehouse1,
    product=product1,
    movement_type='out',
    quantity=10,
    movement_date=datetime.now().date(),
    reference_type='sale'
)
```

---

## Deployment Checklist

- [ ] Database indexes created
- [ ] API endpoint implemented and tested
- [ ] CSV export functionality working
- [ ] PDF export functionality working
- [ ] Caching implemented
- [ ] Performance benchmarks met (< 5 seconds)
- [ ] Error handling tested
- [ ] Authentication/permissions verified
- [ ] Frontend integration tested
- [ ] Sample data loaded for demo
- [ ] Documentation updated
- [ ] API versioning considered

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-01 | Initial specification |

---

## Support & Contact

For questions or issues with this API specification:
- **Frontend Team**: Check `/src/types/reports.ts` for TypeScript interfaces
- **Backend Team**: Implement according to this spec
- **Documentation**: This file is the source of truth

---

**End of Specification**
