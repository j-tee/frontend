# 🛒 Backend Requirements: Sales History API

**Date:** October 6, 2025  
**Type:** 🔴 **MISSING BACKEND IMPLEMENTATION**  
**Priority:** 🔴 **HIGH** - Core feature not functional  
**Status:** 🔴 **BLOCKED** - Frontend ready, backend missing

---

## Problem Summary

Sales History is showing "No sales history yet" because the backend API endpoints are **not implemented or not returning data**.

**Current State:**
- ✅ Frontend UI complete (`SalesHistory.tsx`)
- ✅ Redux state management ready (`salesSlice.ts`)
- ✅ Service layer defined (`salesService.ts`)
- ❌ Backend API not implemented or not working
- ❌ No sales data being returned

**Impact:**
- Users cannot view completed sales
- No sales reporting or history tracking
- Revenue tracking impossible
- Refund workflow blocked (requires sale lookup)

---

## What Frontend Expects

### API Endpoint

**URL:** `GET /sales/api/sales/`

**Method:** GET with query parameters

**Authentication:** Required (JWT Bearer token)

---

## Request Format

### Query Parameters

The frontend will send these query parameters:

```typescript
{
  page: number              // Pagination: current page (1-indexed)
  page_size: number         // Items per page (default: 20)
  
  // Optional filters (all optional):
  storefront?: UUID         // Filter by storefront ID
  status?: string           // Filter by status: 'DRAFT', 'COMPLETED', 'CANCELLED', 'REFUNDED'
  type?: string             // Filter by type: 'RETAIL', 'WHOLESALE'
  customer?: UUID           // Filter by customer ID
  user?: UUID               // Filter by user/cashier ID
  date_from?: string        // ISO date: '2025-10-01'
  date_to?: string          // ISO date: '2025-10-31'
  payment_type?: string     // Filter by payment type: 'CASH', 'CARD', 'CREDIT', 'MOMO', 'SPLIT'
  search?: string           // Search by receipt number, customer name, or product
}
```

### Example Request

```http
GET /sales/api/sales/?page=1&page_size=20&storefront=abc123&status=COMPLETED
Authorization: Bearer <jwt_token>
```

---

## Response Format (REQUIRED)

### Success Response: 200 OK

**Structure:** Paginated response with sales array

```json
{
  "count": 150,
  "next": "http://api.example.com/sales/api/sales/?page=2",
  "previous": null,
  "results": [
    {
      "id": "sale-uuid-1",
      "receipt_number": "REC-2025-001234",
      "storefront": "storefront-uuid",
      "storefront_name": "Main Store",
      "customer": "customer-uuid",
      "customer_name": "John Doe",
      "user": "user-uuid",
      "user_name": "Jane Smith (Cashier)",
      "type": "RETAIL",
      "status": "COMPLETED",
      
      "line_items": [
        {
          "id": "item-uuid-1",
          "sale": "sale-uuid-1",
          "product": "product-uuid",
          "stock_product": "stock-product-uuid",
          "product_name": "10mm Armoured Cable",
          "product_sku": "CABLE-10MM-ARM",
          "product_category": "Electrical",
          "quantity": 5,
          "unit_price": 100.00,
          "discount_percentage": 0,
          "discount_amount": 0,
          "subtotal": 500.00,
          "tax_rate": 16.00,
          "tax_amount": 80.00,
          "total_price": 580.00,
          "cost_price": 70.00,
          "profit_margin": 30.00,
          "notes": null,
          "created_at": "2025-10-06T10:30:00Z",
          "updated_at": "2025-10-06T10:30:00Z"
        }
      ],
      
      "subtotal": 500.00,
      "discount_amount": 0,
      "tax_amount": 80.00,
      "total_amount": 580.00,
      "amount_paid": 580.00,
      "amount_due": 0,
      
      "payment_type": "CASH",
      "payments": [
        {
          "id": "payment-uuid-1",
          "sale": "sale-uuid-1",
          "customer": null,
          "payment_method": "CASH",
          "amount_paid": 580.00,
          "status": "COMPLETED",
          "transaction_reference": null,
          "phone_number": null,
          "card_last_4": null,
          "card_brand": null,
          "notes": null,
          "created_at": "2025-10-06T10:32:00Z",
          "processed_at": "2025-10-06T10:32:00Z",
          "failed_at": null,
          "error_message": null
        }
      ],
      
      "notes": "Customer requested gift wrap",
      "internal_notes": null,
      "created_at": "2025-10-06T10:30:00Z",
      "updated_at": "2025-10-06T10:32:00Z",
      "completed_at": "2025-10-06T10:32:00Z",
      "cancelled_at": null,
      "cancellation_reason": null
    },
    {
      "id": "sale-uuid-2",
      "receipt_number": "REC-2025-001235",
      // ... more sales
    }
  ]
}
```

### Field Requirements

#### Top-Level Fields (All REQUIRED)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `count` | integer | ✅ YES | Total number of sales matching filters |
| `next` | string \| null | ✅ YES | URL to next page (null if last page) |
| `previous` | string \| null | ✅ YES | URL to previous page (null if first page) |
| `results` | array | ✅ YES | Array of Sale objects |

#### Sale Object Fields (All REQUIRED)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | ✅ YES | Unique sale identifier |
| `receipt_number` | string | ✅ YES | Human-readable receipt number |
| `storefront` | UUID | ✅ YES | Storefront ID |
| `storefront_name` | string | ✅ YES | Storefront display name |
| `customer` | UUID \| null | ✅ YES | Customer ID (null for walk-in) |
| `customer_name` | string \| null | ✅ YES | Customer display name |
| `user` | UUID | ✅ YES | User/cashier ID |
| `user_name` | string | ✅ YES | User/cashier display name |
| `type` | string | ✅ YES | "RETAIL" or "WHOLESALE" |
| `status` | string | ✅ YES | "DRAFT", "COMPLETED", "CANCELLED", "REFUNDED" |
| `line_items` | array | ✅ YES | Array of SaleItem objects |
| `subtotal` | decimal | ✅ YES | Sum of all items before discount/tax |
| `discount_amount` | decimal | ✅ YES | Total discount applied (0 if none) |
| `tax_amount` | decimal | ✅ YES | Total tax amount (0 if none) |
| `total_amount` | decimal | ✅ YES | Final amount (subtotal - discount + tax) |
| `amount_paid` | decimal | ✅ YES | Amount already paid |
| `amount_due` | decimal | ✅ YES | Amount still owed (0 if fully paid) |
| `payment_type` | string | ✅ YES | "CASH", "CARD", "CREDIT", "MOMO", "SPLIT" |
| `payments` | array | ✅ YES | Array of Payment objects |
| `notes` | string \| null | ✅ YES | Customer-visible notes |
| `internal_notes` | string \| null | ✅ YES | Internal staff notes |
| `created_at` | string | ✅ YES | ISO timestamp when sale created |
| `updated_at` | string | ✅ YES | ISO timestamp of last update |
| `completed_at` | string \| null | ✅ YES | ISO timestamp when completed |
| `cancelled_at` | string \| null | ✅ YES | ISO timestamp when cancelled |
| `cancellation_reason` | string \| null | ✅ YES | Reason if cancelled |

#### Line Item Object Fields (All REQUIRED)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | ✅ YES | Line item ID |
| `sale` | UUID | ✅ YES | Parent sale ID |
| `product` | UUID | ✅ YES | Product ID |
| `stock_product` | UUID | ✅ YES | Stock product ID |
| `product_name` | string | ✅ YES | Product display name |
| `product_sku` | string | ✅ YES | Product SKU/code |
| `product_category` | string \| null | ✅ YES | Product category |
| `quantity` | integer | ✅ YES | Quantity sold |
| `unit_price` | decimal | ✅ YES | Price per unit |
| `discount_percentage` | decimal | ✅ YES | Discount % (0 if none) |
| `discount_amount` | decimal | ✅ YES | Discount amount (0 if none) |
| `subtotal` | decimal | ✅ YES | quantity × unit_price |
| `tax_rate` | decimal | ✅ YES | Tax rate % (0 if none) |
| `tax_amount` | decimal | ✅ YES | Tax amount (0 if none) |
| `total_price` | decimal | ✅ YES | Final price with tax/discount |
| `cost_price` | decimal \| null | ✅ YES | Unit cost (for profit calculation) |
| `profit_margin` | decimal \| null | ✅ YES | Profit % (null if no cost) |
| `notes` | string \| null | ✅ YES | Item-specific notes |
| `created_at` | string | ✅ YES | ISO timestamp |
| `updated_at` | string | ✅ YES | ISO timestamp |

#### Payment Object Fields (All REQUIRED)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | ✅ YES | Payment ID |
| `sale` | UUID | ✅ YES | Parent sale ID |
| `customer` | UUID \| null | ✅ YES | Customer ID (for credit payments) |
| `payment_method` | string | ✅ YES | "CASH", "CARD", "MOMO", "CREDIT" |
| `amount_paid` | decimal | ✅ YES | Amount paid via this method |
| `status` | string | ✅ YES | "PENDING", "COMPLETED", "FAILED" |
| `transaction_reference` | string \| null | ✅ YES | External reference (for card/momo) |
| `phone_number` | string \| null | ✅ YES | Phone for mobile money |
| `card_last_4` | string \| null | ✅ YES | Last 4 digits of card |
| `card_brand` | string \| null | ✅ YES | "VISA", "MASTERCARD", etc. |
| `notes` | string \| null | ✅ YES | Payment notes |
| `created_at` | string | ✅ YES | ISO timestamp |
| `processed_at` | string \| null | ✅ YES | When payment processed |
| `failed_at` | string \| null | ✅ YES | When payment failed |
| `error_message` | string \| null | ✅ YES | Error if failed |

---

## Data Requirements

### Status Values (MUST USE THESE EXACT VALUES)

```python
# Sale Status
class SaleStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'              # Cart in progress
    COMPLETED = 'COMPLETED', 'Completed'  # Paid and finalized
    CANCELLED = 'CANCELLED', 'Cancelled'  # Cancelled
    REFUNDED = 'REFUNDED', 'Refunded'     # Fully refunded

# Sale Type
class SaleType(models.TextChoices):
    RETAIL = 'RETAIL', 'Retail'
    WHOLESALE = 'WHOLESALE', 'Wholesale'

# Payment Type
class PaymentType(models.TextChoices):
    CASH = 'CASH', 'Cash'
    CARD = 'CARD', 'Card'
    CREDIT = 'CREDIT', 'Credit'
    MOMO = 'MOMO', 'Mobile Money'
    SPLIT = 'SPLIT', 'Split Payment'

# Payment Method
class PaymentMethod(models.TextChoices):
    CASH = 'CASH', 'Cash'
    CARD = 'CARD', 'Card'
    MOMO = 'MOMO', 'Mobile Money'
    CREDIT = 'CREDIT', 'Credit Account'
    BANK_TRANSFER = 'BANK_TRANSFER', 'Bank Transfer'

# Payment Status
class PaymentStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    COMPLETED = 'COMPLETED', 'Completed'
    FAILED = 'FAILED', 'Failed'
```

### Calculation Requirements

**Subtotal:**
```python
subtotal = sum(item.quantity * item.unit_price for item in line_items)
```

**Item Discount:**
```python
item.discount_amount = item.subtotal * (item.discount_percentage / 100)
```

**Item Tax:**
```python
item_after_discount = item.subtotal - item.discount_amount
item.tax_amount = item_after_discount * (item.tax_rate / 100)
```

**Item Total:**
```python
item.total_price = item.subtotal - item.discount_amount + item.tax_amount
```

**Sale Total:**
```python
sale.total_amount = sum(item.total_price for item in line_items) - sale.discount_amount
```

**Amount Due:**
```python
sale.amount_due = sale.total_amount - sale.amount_paid
```

---

## Filtering Requirements

### Required Filters

1. **By Storefront** (CRITICAL)
   ```python
   if 'storefront' in params:
       queryset = queryset.filter(storefront_id=params['storefront'])
   ```

2. **By Status**
   ```python
   if 'status' in params:
       queryset = queryset.filter(status=params['status'])
   ```

3. **By Date Range**
   ```python
   if 'date_from' in params:
       queryset = queryset.filter(completed_at__gte=params['date_from'])
   if 'date_to' in params:
       queryset = queryset.filter(completed_at__lte=params['date_to'])
   ```

4. **By Customer**
   ```python
   if 'customer' in params:
       queryset = queryset.filter(customer_id=params['customer'])
   ```

5. **By Payment Type**
   ```python
   if 'payment_type' in params:
       queryset = queryset.filter(payment_type=params['payment_type'])
   ```

6. **Search** (receipt number, customer name, product name)
   ```python
   if 'search' in params:
       search_term = params['search']
       queryset = queryset.filter(
           Q(receipt_number__icontains=search_term) |
           Q(customer__name__icontains=search_term) |
           Q(line_items__product__name__icontains=search_term)
       ).distinct()
   ```

### Default Ordering

**MUST order by most recent first:**
```python
queryset = queryset.order_by('-completed_at', '-created_at')
```

---

## Pagination Requirements

### Settings

```python
# Django REST Framework settings.py
REST_FRAMEWORK = {
    'PAGE_SIZE': 20,
    'MAX_PAGE_SIZE': 100,
}
```

### Serializer

```python
from rest_framework.pagination import PageNumberPagination

class SalePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
```

### View

```python
class SaleViewSet(viewsets.ModelViewSet):
    pagination_class = SalePagination
    # ...
```

---

## Performance Requirements

### Required Optimizations

1. **Use select_related for foreign keys:**
   ```python
   queryset = Sale.objects.select_related(
       'storefront',
       'customer',
       'user'
   )
   ```

2. **Use prefetch_related for reverse relations:**
   ```python
   queryset = queryset.prefetch_related(
       'line_items',
       'line_items__product',
       'line_items__stock_product',
       'payments'
   )
   ```

3. **Index database fields:**
   ```python
   class Meta:
       indexes = [
           models.Index(fields=['storefront', '-completed_at']),
           models.Index(fields=['customer', '-completed_at']),
           models.Index(fields=['status', '-completed_at']),
           models.Index(fields=['receipt_number']),
       ]
   ```

4. **Response time:**
   - Target: < 500ms for 20 items
   - Maximum: < 2s for 100 items

---

## Error Responses

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "detail": "You do not have permission to view sales for this storefront."
}
```

### 400 Bad Request (Invalid filters)
```json
{
  "error": "Invalid status value. Must be one of: DRAFT, COMPLETED, CANCELLED, REFUNDED"
}
```

### 500 Internal Server Error
```json
{
  "detail": "An error occurred while fetching sales."
}
```

---

## Testing Checklist

### Backend Developer Must Test:

**Test 1: Basic List**
- [ ] `GET /sales/api/sales/` returns paginated sales
- [ ] Response has `count`, `next`, `previous`, `results`
- [ ] Each sale has all required fields
- [ ] Line items are included
- [ ] Payments are included

**Test 2: Empty State**
- [ ] New storefront with no sales returns:
  ```json
  {
    "count": 0,
    "next": null,
    "previous": null,
    "results": []
  }
  ```

**Test 3: Pagination**
- [ ] `?page=1&page_size=5` returns 5 items
- [ ] `next` URL points to page 2
- [ ] `previous` is null on page 1
- [ ] Last page has `next: null`

**Test 4: Filtering**
- [ ] `?storefront=uuid` filters by storefront ✅
- [ ] `?status=COMPLETED` shows only completed ✅
- [ ] `?date_from=2025-10-01` filters by date ✅
- [ ] `?search=REC-123` finds receipt ✅

**Test 5: Performance**
- [ ] 20 sales load in < 500ms
- [ ] 100 sales load in < 2s
- [ ] No N+1 query problems

**Test 6: Calculations**
- [ ] `subtotal` = sum of items
- [ ] `tax_amount` calculated correctly
- [ ] `total_amount` = subtotal - discount + tax
- [ ] `amount_due` = total - paid

**Test 7: Data Types**
- [ ] All UUIDs are valid
- [ ] All decimals have 2 decimal places
- [ ] All timestamps are ISO format
- [ ] All nullable fields return `null` (not missing)

---

## Integration Testing

### Frontend Will Test:

1. **Load sales on tab open**
   ```typescript
   useEffect(() => {
     dispatch(loadSales())
   }, [])
   ```

2. **Filter by storefront**
   ```typescript
   dispatch(setSalesFilters({ storefront: selectedStorefrontId }))
   dispatch(loadSales())
   ```

3. **Pagination**
   ```typescript
   dispatch(setSalesPage(2))
   dispatch(loadSales())
   ```

4. **Search**
   ```typescript
   dispatch(setSalesFilters({ search: 'REC-123' }))
   dispatch(loadSales())
   ```

---

## Sample Backend Implementation

### Django Model

```python
from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

class Sale(models.Model):
    class SaleStatus(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'
        REFUNDED = 'REFUNDED', 'Refunded'
    
    class SaleType(models.TextChoices):
        RETAIL = 'RETAIL', 'Retail'
        WHOLESALE = 'WHOLESALE', 'Wholesale'
    
    class PaymentType(models.TextChoices):
        CASH = 'CASH', 'Cash'
        CARD = 'CARD', 'Card'
        CREDIT = 'CREDIT', 'Credit'
        MOMO = 'MOMO', 'Mobile Money'
        SPLIT = 'SPLIT', 'Split Payment'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    receipt_number = models.CharField(max_length=50, unique=True)
    storefront = models.ForeignKey('inventory.Storefront', on_delete=models.PROTECT)
    customer = models.ForeignKey('sales.Customer', null=True, blank=True, on_delete=models.SET_NULL)
    user = models.ForeignKey(User, on_delete=models.PROTECT)
    
    type = models.CharField(max_length=20, choices=SaleType.choices)
    status = models.CharField(max_length=20, choices=SaleStatus.choices, default=SaleStatus.DRAFT)
    
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_due = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    payment_type = models.CharField(max_length=20, choices=PaymentType.choices)
    
    notes = models.TextField(null=True, blank=True)
    internal_notes = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(null=True, blank=True)
    
    class Meta:
        ordering = ['-completed_at', '-created_at']
        indexes = [
            models.Index(fields=['storefront', '-completed_at']),
            models.Index(fields=['customer', '-completed_at']),
            models.Index(fields=['status', '-completed_at']),
            models.Index(fields=['receipt_number']),
        ]
    
    def __str__(self):
        return f"{self.receipt_number} - {self.storefront.name}"


class SaleItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale = models.ForeignKey(Sale, related_name='line_items', on_delete=models.CASCADE)
    product = models.ForeignKey('inventory.Product', on_delete=models.PROTECT)
    stock_product = models.ForeignKey('inventory.StockProduct', on_delete=models.PROTECT)
    
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    profit_margin = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.product.name} x {self.quantity}"
```

### Django Serializer

```python
from rest_framework import serializers
from .models import Sale, SaleItem, Payment

class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.code', read_only=True)
    product_category = serializers.CharField(source='product.category.name', read_only=True, allow_null=True)
    
    class Meta:
        model = SaleItem
        fields = [
            'id', 'sale', 'product', 'stock_product',
            'product_name', 'product_sku', 'product_category',
            'quantity', 'unit_price', 'discount_percentage', 'discount_amount',
            'subtotal', 'tax_rate', 'tax_amount', 'total_price',
            'cost_price', 'profit_margin', 'notes',
            'created_at', 'updated_at'
        ]

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'sale', 'customer', 'payment_method', 'amount_paid',
            'status', 'transaction_reference', 'phone_number',
            'card_last_4', 'card_brand', 'notes',
            'created_at', 'processed_at', 'failed_at', 'error_message'
        ]

class SaleSerializer(serializers.ModelSerializer):
    storefront_name = serializers.CharField(source='storefront.name', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True, allow_null=True)
    user_name = serializers.SerializerMethodField()
    line_items = SaleItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Sale
        fields = [
            'id', 'receipt_number', 'storefront', 'storefront_name',
            'customer', 'customer_name', 'user', 'user_name',
            'type', 'status', 'line_items',
            'subtotal', 'discount_amount', 'tax_amount', 'total_amount',
            'amount_paid', 'amount_due', 'payment_type', 'payments',
            'notes', 'internal_notes',
            'created_at', 'updated_at', 'completed_at',
            'cancelled_at', 'cancellation_reason'
        ]
    
    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
```

### Django ViewSet

```python
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Sale
from .serializers import SaleSerializer
from .pagination import SalePagination

class SaleViewSet(viewsets.ModelViewSet):
    serializer_class = SaleSerializer
    pagination_class = SalePagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['storefront', 'status', 'type', 'customer', 'user', 'payment_type']
    search_fields = ['receipt_number', 'customer__name', 'line_items__product__name']
    ordering_fields = ['completed_at', 'created_at', 'total_amount']
    ordering = ['-completed_at', '-created_at']
    
    def get_queryset(self):
        queryset = Sale.objects.select_related(
            'storefront',
            'customer',
            'user'
        ).prefetch_related(
            'line_items',
            'line_items__product',
            'line_items__stock_product',
            'payments'
        )
        
        # Filter by date range
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if date_from:
            queryset = queryset.filter(completed_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(completed_at__lte=date_to)
        
        # Filter by business (ensure user can only see their business)
        user = self.request.user
        if hasattr(user, 'business'):
            queryset = queryset.filter(storefront__business=user.business)
        
        return queryset
```

### URL Configuration

```python
from rest_framework.routers import DefaultRouter
from .views import SaleViewSet

router = DefaultRouter()
router.register(r'sales', SaleViewSet, basename='sale')

urlpatterns = router.urls
```

---

## Quick Implementation Guide

### Step 1: Create Models (30 minutes)
- Copy model definitions above
- Run `python manage.py makemigrations`
- Run `python manage.py migrate`

### Step 2: Create Serializers (15 minutes)
- Copy serializer definitions
- Test in Django shell

### Step 3: Create ViewSet (15 minutes)
- Copy viewset definition
- Add to urls.py

### Step 4: Test (30 minutes)
- Create test sales in Django admin
- Test API with Postman/curl
- Verify all fields present
- Check pagination works

### Step 5: Optimize (15 minutes)
- Add database indexes
- Add select_related/prefetch_related
- Test performance with 100+ sales

**Total Time: ~2 hours** ⏱️

---

## Frontend Integration (After Backend Ready)

Once backend is implemented, frontend needs minimal changes:

### Update SalesHistory.tsx

```typescript
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import { loadSales, selectSales, selectSalesStatus } from '../../../store/slices/salesSlice'
import { Card, Table, Badge, Spinner } from 'react-bootstrap'

export function SalesHistory() {
  const dispatch = useAppDispatch()
  const sales = useAppSelector(selectSales)
  const status = useAppSelector(selectSalesStatus)
  
  useEffect(() => {
    dispatch(loadSales())
  }, [dispatch])
  
  const isLoading = status === 'loading'
  const hasSales = sales.length > 0
  
  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">Recent Sales</h5>
      </Card.Header>
      <Card.Body>
        {isLoading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
          </div>
        ) : !hasSales ? (
          <div className="text-center text-muted py-5">
            <p>No sales history yet</p>
            <small>Completed sales will appear here</small>
          </div>
        ) : (
          <Table responsive hover>
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(sale => (
                <tr key={sale.id}>
                  <td>{sale.receipt_number}</td>
                  <td>{new Date(sale.completed_at || sale.created_at).toLocaleDateString()}</td>
                  <td>{sale.customer_name || 'Walk-in'}</td>
                  <td>${sale.total_amount.toFixed(2)}</td>
                  <td>
                    <Badge bg={sale.status === 'COMPLETED' ? 'success' : 'warning'}>
                      {sale.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  )
}
```

**Estimated Frontend Update Time: 15 minutes** ⏱️

---

## Summary for Backend Developer

### What You Need to Build:

1. **Endpoint:** `GET /sales/api/sales/`
2. **Response:** Paginated list with all sale details, line items, and payments
3. **Filters:** storefront, status, date range, customer, search
4. **Performance:** < 500ms for 20 items
5. **Testing:** 7 test cases to verify

### Expected Timeline:

- **Models:** 30 minutes
- **Serializers:** 15 minutes  
- **ViewSet:** 15 minutes
- **Testing:** 30 minutes
- **Optimization:** 15 minutes

**Total: ~2 hours** ⏱️

### Deliverables:

- [ ] API endpoint returns sales list ✅
- [ ] All required fields present ✅
- [ ] Pagination works ✅
- [ ] Filters work (storefront, status, date) ✅
- [ ] Search works (receipt, customer, product) ✅
- [ ] Performance < 500ms ✅
- [ ] Test data created ✅

---

## Contact & Questions

**Frontend Developer:** Ready to integrate once API is live  
**Backend Developer:** Please confirm:
1. When can API be ready?
2. What is the exact endpoint URL?
3. Are there any authentication requirements beyond JWT?
4. What is the staging/dev server URL for testing?

**Status:** 🔴 **BLOCKED - Awaiting Backend Implementation**

---

**Created:** October 6, 2025  
**Priority:** HIGH - Core sales feature  
**Frontend Status:** ✅ Complete and ready  
**Backend Status:** ❌ Not implemented  
**Next Step:** Backend developer implements API (2 hours estimated)
