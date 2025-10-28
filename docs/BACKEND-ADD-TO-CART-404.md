# 🚨 CRITICAL: Add to Cart - 404 Error

**Date:** October 4, 2025  
**Priority:** 🔴 **CRITICAL** - Blocking POS functionality  
**Error:** `POST /sales/api/sales/{id}/add_item/` returns **404 Not Found**

---

## 📋 What's Happening

**User Action:**
1. Search for product "10mm Armoured Cable" ✅
2. Product found with price GH₵ 60.00 ✅
3. Stock shows "40 in stock" ✅
4. Click **"+ Add"** button
5. **ERROR:** "Request failed with status code 404" ❌

**Network Request:**
```
POST http://localhost:8000/sales/api/sales/713517eb-a0dc-4443-90ab-f3a7dee50c9a/add_item/
Response: 404 Not Found
Body: { "detail": "Not found." }
```

---

## 🎯 Root Cause

Backend is missing the **Add Item to Cart** endpoint that frontend is calling.

**Frontend expects:**
```
POST /sales/api/sales/{sale_id}/add_item/
```

**Backend has:** ❌ Endpoint doesn't exist (404)

---

## ✅ What Backend Developer Must Implement

### Endpoint #1: Add Item to Cart

**URL:**
```
POST /sales/api/sales/{sale_id}/add_item/
```

**Request Body:**
```json
{
  "product": "product-uuid",
  "stock_product": "stock-uuid",
  "quantity": 1,
  "unit_price": 60.00,
  "discount_percentage": 0,
  "notes": ""
}
```

**Expected Response (201 Created):**
```json
{
  "id": "sale-item-uuid",
  "sale": "sale-uuid",
  "product": "product-uuid",
  "product_name": "10mm Armoured Cable 50m",
  "product_sku": "ELEC-0007",
  "stock_product": "stock-uuid",
  "quantity": 1,
  "unit_price": "60.00",
  "discount_percentage": "0.00",
  "discount_amount": "0.00",
  "subtotal": "60.00",
  "tax_rate": "0.00",
  "tax_amount": "0.00",
  "total_price": "60.00",
  "notes": "",
  "created_at": "2025-10-04T12:00:00Z"
}
```

**Business Logic Required:**

```python
# views.py
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.utils import timezone
from datetime import timedelta

class SaleViewSet(viewsets.ModelViewSet):
    
    @action(detail=True, methods=['post'], url_path='add_item')
    def add_item(self, request, pk=None):
        """
        Add item to cart (sale in DRAFT status)
        
        This endpoint:
        1. Validates sale is in DRAFT status
        2. Checks stock availability
        3. Creates stock reservation (30-min expiry)
        4. Creates sale item
        5. Updates sale totals
        6. Returns updated item
        """
        sale = self.get_object()
        
        # Step 1: Validate sale status
        if sale.status != 'DRAFT':
            return Response(
                {'error': 'Can only add items to draft sales'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Step 2: Extract request data
        product_id = request.data.get('product')
        stock_product_id = request.data.get('stock_product')
        quantity = int(request.data.get('quantity', 1))
        unit_price = Decimal(request.data.get('unit_price', 0))
        discount_percentage = Decimal(request.data.get('discount_percentage', 0))
        notes = request.data.get('notes', '')
        
        # Step 3: Get product and stock
        try:
            product = Product.objects.get(id=product_id)
            stock_product = StockProduct.objects.get(id=stock_product_id)
        except (Product.DoesNotExist, StockProduct.DoesNotExist):
            return Response(
                {'error': 'Product or stock not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Step 4: Check stock availability
        # This should call the availability endpoint logic
        available = get_available_quantity(
            stock_product.storefront_id,
            product_id
        )
        
        if available < quantity:
            return Response(
                {'error': f'Insufficient stock. Only {available} available'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Step 5: Use database transaction for atomicity
        with transaction.atomic():
            # Step 5a: Create stock reservation
            reservation = StockReservation.objects.create(
                stock_product=stock_product,
                cart_session_id=str(sale.id),
                quantity=quantity,
                status='ACTIVE',
                expires_at=timezone.now() + timedelta(minutes=30),
                created_by=request.user
            )
            
            # Step 5b: Calculate amounts
            discount_amount = (unit_price * quantity * discount_percentage) / 100
            subtotal = (unit_price * quantity) - discount_amount
            
            # For now, assume no tax (can be added later)
            tax_rate = Decimal('0.00')
            tax_amount = Decimal('0.00')
            total_price = subtotal + tax_amount
            
            # Step 5c: Create sale item
            sale_item = SaleItem.objects.create(
                sale=sale,
                product=product,
                product_name=product.name,
                product_sku=product.sku,
                stock_product=stock_product,
                quantity=quantity,
                unit_price=unit_price,
                discount_percentage=discount_percentage,
                discount_amount=discount_amount,
                subtotal=subtotal,
                tax_rate=tax_rate,
                tax_amount=tax_amount,
                total_price=total_price,
                notes=notes,
                reservation=reservation
            )
            
            # Step 5d: Update sale totals
            update_sale_totals(sale)
            
            # Step 5e: Create audit log
            AuditLog.objects.create(
                event_type='sale.item_added',
                sale=sale,
                user=request.user,
                ip_address=get_client_ip(request),
                details={
                    'item_id': str(sale_item.id),
                    'product': product.name,
                    'quantity': quantity,
                    'price': float(unit_price)
                }
            )
        
        # Step 6: Return created item
        serializer = SaleItemSerializer(sale_item)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


def get_available_quantity(storefront_id, product_id):
    """
    Get unreserved quantity for a product at a storefront
    This should reuse the availability endpoint logic
    """
    # Get total stock
    total = StockProduct.objects.filter(
        storefront_id=storefront_id,
        product_id=product_id
    ).aggregate(Sum('quantity'))['quantity__sum'] or 0
    
    # Subtract active reservations
    reserved = StockReservation.objects.filter(
        stock_product__storefront_id=storefront_id,
        stock_product__product_id=product_id,
        status='ACTIVE',
        expires_at__gt=timezone.now()
    ).aggregate(Sum('quantity'))['quantity__sum'] or 0
    
    return max(0, total - reserved)


def update_sale_totals(sale):
    """
    Recalculate sale totals from all items
    """
    items = sale.line_items.all()
    
    sale.subtotal = sum(item.subtotal for item in items)
    sale.tax_amount = sum(item.tax_amount for item in items)
    sale.total_amount = sum(item.total_price for item in items)
    
    # Apply any cart-level discount if exists
    if sale.discount_amount:
        sale.total_amount -= sale.discount_amount
    
    sale.save()
```

**URL Configuration:**
```python
# urls.py
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'sales', SaleViewSet, basename='sale')

urlpatterns = [
    path('sales/api/', include(router.urls)),
]
```

---

## 🗄️ Required Models

### SaleItem Model
```python
class SaleItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    sale = models.ForeignKey('Sale', on_delete=models.CASCADE, related_name='line_items')
    product = models.ForeignKey('Product', on_delete=models.PROTECT)
    product_name = models.CharField(max_length=255)  # Snapshot at time of sale
    product_sku = models.CharField(max_length=100)
    stock_product = models.ForeignKey('StockProduct', on_delete=models.PROTECT)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True)
    reservation = models.ForeignKey('StockReservation', null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sale_items'
        ordering = ['created_at']
```

### StockReservation Model
```python
class StockReservation(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('COMMITTED', 'Committed'),
        ('EXPIRED', 'Expired'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    stock_product = models.ForeignKey('StockProduct', on_delete=models.CASCADE)
    cart_session_id = models.CharField(max_length=255)  # Sale ID for cart
    quantity = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    expires_at = models.DateTimeField()  # 30 minutes from creation
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'stock_reservations'
        indexes = [
            models.Index(fields=['expires_at']),
            models.Index(fields=['status']),
            models.Index(fields=['cart_session_id']),
        ]
```

---

## 🧪 Testing Steps

### 1. Create Test Sale (Cart)
```bash
curl -X POST http://localhost:8000/sales/api/sales/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token YOUR_TOKEN" \
  -d '{
    "storefront": "storefront-uuid",
    "type": "RETAIL",
    "status": "DRAFT"
  }'

# Response:
{
  "id": "sale-uuid-123",
  "status": "DRAFT",
  "total_amount": "0.00"
}
```

### 2. Add Item to Cart
```bash
curl -X POST http://localhost:8000/sales/api/sales/sale-uuid-123/add_item/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token YOUR_TOKEN" \
  -d '{
    "product": "product-uuid",
    "stock_product": "stock-uuid",
    "quantity": 1,
    "unit_price": 60.00
  }'

# Expected: 201 Created
{
  "id": "item-uuid",
  "quantity": 1,
  "unit_price": "60.00",
  "total_price": "60.00"
}
```

### 3. Verify Reservation Created
```sql
SELECT * FROM stock_reservations 
WHERE cart_session_id = 'sale-uuid-123' 
AND status = 'ACTIVE';

-- Should return 1 row with quantity = 1, expires_at = now + 30 min
```

### 4. Verify Stock Availability Updated
```bash
curl http://localhost:8000/inventory/api/storefronts/store-id/stock-products/product-id/availability/

# Expected:
{
  "total_available": 40,
  "reserved_quantity": 1,    # ← Should increase after add to cart
  "unreserved_quantity": 39  # ← Should decrease
}
```

---

## 📊 Related Endpoints Needed

Based on the spec, backend also needs:

### 2. Update Cart Item
```
PATCH /sales/api/sales/{sale_id}/items/{item_id}/
```

### 3. Remove Cart Item
```
DELETE /sales/api/sales/{sale_id}/items/{item_id}/
```

### 4. Get Cart (Sale) Details
```
GET /sales/api/sales/{sale_id}/
```

All documented in `docs/sales-feature-specification.md`

---

## 🚨 Critical Issues to Address

### Issue 1: No Sales API at all
The error shows the endpoint doesn't exist, which means:
- ❌ No `SaleViewSet` created
- ❌ No URL routing for `/sales/api/`
- ❌ No sales app configured

### Issue 2: No StockReservation System
Without reservations:
- ❌ Multiple users can oversell
- ❌ Cart doesn't hold stock
- ❌ Race conditions possible

### Issue 3: No Sale/Cart Creation
Frontend needs to create cart first:
- Missing: `POST /sales/api/sales/` endpoint
- This creates the initial DRAFT sale (shopping cart)

---

## 📝 Implementation Checklist

### Phase 1: Basic Cart (URGENT - Today)
- [ ] Create `Sale` model
- [ ] Create `SaleItem` model  
- [ ] Create `StockReservation` model
- [ ] Create `SaleViewSet` with basic CRUD
- [ ] Add `add_item` action to viewset
- [ ] Configure URLs: `/sales/api/sales/`
- [ ] Test: Create sale → Add item → Get sale

### Phase 2: Cart Management (This Week)
- [ ] Add `update_item` action
- [ ] Add `remove_item` action
- [ ] Add reservation expiry cleanup (Celery task)
- [ ] Add sale total calculation
- [ ] Add audit logging

### Phase 3: Checkout (Next Week)
- [ ] Add `complete` action (checkout)
- [ ] Commit reservations to stock
- [ ] Generate receipt number
- [ ] Payment processing

---

## 🎯 Success Criteria

**Add to Cart works when:**
- [ ] POST to `/sales/api/sales/{id}/add_item/` returns 201
- [ ] Response includes item with correct price/quantity
- [ ] StockReservation is created with 30-min expiry
- [ ] Sale total_amount is updated
- [ ] Frontend cart updates and shows item
- [ ] User can add multiple items
- [ ] Stock availability decreases (reserved)

---

## 💬 Frontend Error Handling

Currently when add fails, frontend shows:
```
"Request failed with status code 404"
```

Once backend is fixed, it should show:
- ✅ "Item added to cart" (success)
- ⚠️ "Insufficient stock. Only X available" (validation error)
- ❌ "Failed to add item" (server error)

---

## 📚 Documentation References

**For complete implementation:**
1. `docs/sales-feature-specification.md` - Lines 300-450 (Cart endpoints)
2. `docs/BACKEND-README-SALES.md` - Phase 1 implementation guide
3. `docs/sales-api-endpoints.md` - All endpoint specs

**For stock reservation:**
1. `docs/STOCK-AVAILABILITY-EXPLAINED.md` - Reservation logic
2. `docs/sales-feature-specification.md` - Lines 800-950 (Reservation system)

---

## ⏱️ Timeline

**Immediate (Today - 4-6 hours):**
1. Create models: Sale, SaleItem, StockReservation (1 hour)
2. Run migrations (15 min)
3. Create SaleViewSet with add_item (2 hours)
4. Configure URLs (15 min)
5. Test with curl (1 hour)
6. Test with frontend (1 hour)

**Result:** User can add items to cart!

---

## 🔗 Quick Links

- **Full Issue Report:** `docs/BACKEND-INTEGRATION-ISSUES.md`
- **Quick Action Guide:** `docs/BACKEND-QUICK-ACTION.md`
- **Stock Availability:** Already covered in previous docs
- **Sales Spec:** `docs/sales-feature-specification.md`

---

**Priority:** 🔴 **CRITICAL**  
**Impact:** Cannot use POS at all (no cart, no sales)  
**ETA:** 4-6 hours for basic cart functionality  
**Blocker:** Entire sales feature non-functional

**This is more critical than the availability endpoint - it blocks ALL sales functionality!**

---

**Last Updated:** October 4, 2025  
**Issue:** Add to cart returns 404  
**Status:** 🚨 **BLOCKING - URGENT**
