# 🚨 Backend Integration Issues - Action Required

**Date:** October 4, 2025  
**Priority:** 🔴 **HIGH** - Blocking POS functionality  
**Status:** ⏳ Waiting for backend implementation

---

## 📋 Executive Summary

The frontend POS system is **complete and ready**, but missing critical backend APIs. The product search is working, but **prices and stock quantities are not displaying** because the required endpoints are not implemented yet.

**Current State:**
- ✅ Frontend fully implemented (569 lines of code)
- ✅ Product search working (finds products by name/SKU)
- ❌ Stock availability endpoint missing → Shows "N/A" for stock
- ❌ Prices showing GH₵ 0.00 → Availability endpoint returns no data

**Impact:**
- 🚫 Cannot add items to cart (no stock data)
- 🚫 Cannot show prices to customers
- 🚫 Cannot complete sales
- 🚫 POS system is non-functional

---

## 🎯 What Frontend is Currently Doing

### Product Search Flow

1. **User searches for "cable"**
2. Frontend calls: `GET /inventory/api/products/?search=cable`
3. Backend returns: ✅ Product list (working!)
   ```json
   {
     "results": [
       {
         "id": "product-uuid",
         "name": "10mm Armoured Cable 50m",
         "sku": "ELEC-0007",
         "category_name": "Electrical Cables",
         "unit": "coil"
       }
     ]
   }
   ```

4. **Frontend tries to fetch stock/prices**
5. Frontend calls: `GET /inventory/api/storefronts/{storefront_id}/stock-products/{product_id}/availability/`
6. Backend returns: ❌ **404 NOT FOUND** (endpoint doesn't exist!)
7. Frontend falls back to: `GET /inventory/api/stock-products/?storefront={id}&product__in={product_id}`
8. Backend returns: ❌ **Empty or missing price fields**

**Result:** Product shows but with:
- Price: GH₵ 0.00 ❌
- Stock: "N/A" badge ❌
- Add to Cart button: Disabled ❌

---

## 🔧 What Backend Developer Must Implement

### Priority 1: Stock Availability Endpoint (CRITICAL)

**Endpoint:**
```
GET /inventory/api/storefronts/{storefront_id}/stock-products/{product_id}/availability/
```

**Required Response:**
```json
{
  "product": "product-uuid",
  "product_name": "10mm Armoured Cable 50m",
  "total_available": 145,           // ⭐ Total stock across all batches
  "reserved_quantity": 5,            // ⭐ Stock in active carts (30-min expiry)
  "unreserved_quantity": 140,        // ⭐ CRITICAL: Available for NEW sales
  "batches": [
    {
      "id": "batch-uuid",
      "batch_number": "BTH-001",
      "quantity": 100,                // This batch's current stock
      "unit_cost": 20.00,
      "retail_price": 25.50,         // ⭐ MUST HAVE for pricing
      "wholesale_price": 22.00,      // ⭐ MUST HAVE for pricing
      "expiry_date": "2025-12-31",
      "supplier_name": "ABC Suppliers"
    },
    {
      "id": "batch-uuid-2",
      "batch_number": "BTH-002",
      "quantity": 45,
      "unit_cost": 18.00,
      "retail_price": 25.50,
      "wholesale_price": 22.00,
      "expiry_date": "2025-06-30"
    }
  ],
  "reservations": [                  // ⭐ Active cart reservations
    {
      "cart_session_id": "sale-uuid-123",
      "quantity": 5,
      "expires_at": "2025-10-04T15:00:00Z"  // 30 minutes from creation
    }
  ]
}
```

**Calculation Logic Required:**
```python
def get_stock_availability(storefront_id, product_id):
    """
    Calculate real-time stock availability
    
    This is CRITICAL - must account for all inventory movements!
    """
    # Step 1: Get all stock batches for this product at this storefront
    batches = StockProduct.objects.filter(
        storefront_id=storefront_id,
        product_id=product_id
    )
    
    # Step 2: Calculate total from all batches
    total_available = sum(batch.quantity for batch in batches)
    
    # Step 3: Subtract completed sales
    completed_sales_qty = SaleItem.objects.filter(
        sale__storefront_id=storefront_id,
        sale__status='COMPLETED',
        product_id=product_id
    ).aggregate(Sum('quantity'))['quantity__sum'] or 0
    
    total_available -= completed_sales_qty
    
    # Step 4: Subtract spoilage, damage, theft
    adjustments_qty = StockAdjustment.objects.filter(
        storefront_id=storefront_id,
        product_id=product_id,
        adjustment_type__in=['SPOILAGE', 'DAMAGE', 'THEFT']
    ).aggregate(Sum('quantity'))['quantity__sum'] or 0
    
    total_available -= adjustments_qty
    
    # Step 5: Account for transfers
    transfers_out = Transfer.objects.filter(
        from_storefront_id=storefront_id,
        product_id=product_id,
        status='COMPLETED'
    ).aggregate(Sum('quantity'))['quantity__sum'] or 0
    
    transfers_in = Transfer.objects.filter(
        to_storefront_id=storefront_id,
        product_id=product_id,
        status='COMPLETED'
    ).aggregate(Sum('quantity'))['quantity__sum'] or 0
    
    total_available = total_available - transfers_out + transfers_in
    
    # Step 6: Get active reservations (not expired, not completed)
    reserved_quantity = StockReservation.objects.filter(
        storefront_id=storefront_id,
        product_id=product_id,
        status='ACTIVE',
        expires_at__gt=timezone.now()  # Only active reservations
    ).aggregate(Sum('quantity'))['quantity__sum'] or 0
    
    # Step 7: Calculate unreserved (available for NEW sales)
    unreserved_quantity = max(0, total_available - reserved_quantity)
    
    # Step 8: Build response
    return {
        'product': product_id,
        'product_name': product.name,
        'total_available': total_available,
        'reserved_quantity': reserved_quantity,
        'unreserved_quantity': unreserved_quantity,  # ⭐ Frontend needs this!
        'batches': [
            {
                'id': batch.id,
                'batch_number': batch.batch_number,
                'quantity': batch.quantity,
                'unit_cost': batch.unit_cost,
                'retail_price': batch.retail_price,      # ⭐ MUST HAVE
                'wholesale_price': batch.wholesale_price, # ⭐ MUST HAVE
                'expiry_date': batch.expiry_date,
                'supplier_name': batch.supplier.name if batch.supplier else None
            }
            for batch in batches
        ],
        'reservations': [
            {
                'cart_session_id': res.cart_session_id,
                'quantity': res.quantity,
                'expires_at': res.expires_at
            }
            for res in active_reservations
        ]
    }
```

**Why This Calculation is Critical:**

The frontend was previously using the static `quantity` field from `StockProduct`, which is just the **intake quantity**. This doesn't account for:
- ❌ Items already sold
- ❌ Items in other users' carts (reservations)
- ❌ Spoilage/damage/theft
- ❌ Transfers between locations
- ❌ Returns/refunds

**Result:** Overselling, data inconsistencies, cart conflicts!

The **availability endpoint** solves this by calculating the **real-time available stock** dynamically.

---

### Priority 2: Ensure Stock-Products Has Prices (FALLBACK)

**Current Issue:**
When availability endpoint isn't ready, frontend falls back to:
```
GET /inventory/api/stock-products/?storefront={id}&product__in={product_id}
```

**This endpoint MUST return:**
```json
{
  "results": [
    {
      "id": "stock-uuid",
      "product": "product-uuid",
      "quantity": 100,
      "retail_price": "25.50",      // ⭐ MUST HAVE (currently missing/null)
      "wholesale_price": "22.00",   // ⭐ MUST HAVE (currently missing/null)
      "unit_cost": "20.00"
    }
  ]
}
```

**Problem:** Backend is returning `retail_price: null` or not including it at all.

**Solution:** Ensure `StockProduct` model has `retail_price` and `wholesale_price` fields populated.

---

## 🐛 Current Errors/Behavior

### What User Sees:
1. Search for "cable" → Product found ✅
2. Product card shows:
   - Name: "10mm Armoured Cable 50m" ✅
   - SKU: "ELEC-0007" ✅
   - Category: "Electrical Cables" ✅
   - **Price: GH₵ 0.00** ❌ (Should be GH₵ 25.50)
   - **Stock: "N/A"** ❌ (Should be "140 in stock")
   - **Add to Cart: Disabled** ❌

### What Frontend Console Shows:
```
[ProductSearch] Searching for: cable
[ProductSearch] Response: { results: [...] } ✅
[StockFetch] Trying availability endpoint...
[StockFetch] GET /inventory/api/storefronts/store-123/stock-products/product-456/availability/
[StockFetch] Error: 404 Not Found ❌
[StockFetch] Falling back to stock-products endpoint...
[StockFetch] GET /inventory/api/stock-products/?storefront=store-123&product__in=product-456
[StockFetch] Response: { results: [{ quantity: 100, retail_price: null }] } ❌
[StockFetch] Warning: No price data available ⚠️
```

---

## 📝 Implementation Checklist for Backend

### Step 1: Create Availability Endpoint
- [ ] Create view: `StockAvailabilityView`
- [ ] URL pattern: `/inventory/api/storefronts/<uuid:storefront_id>/stock-products/<uuid:product_id>/availability/`
- [ ] Implement calculation logic (see code above)
- [ ] Return all required fields:
  - [ ] `total_available` (int)
  - [ ] `reserved_quantity` (int)
  - [ ] `unreserved_quantity` (int)
  - [ ] `batches[]` array with prices
  - [ ] `reservations[]` array

### Step 2: Add Prices to Stock-Products Response
- [ ] Ensure `StockProduct` model has `retail_price` field
- [ ] Ensure `StockProduct` model has `wholesale_price` field
- [ ] Populate these fields when creating stock
- [ ] Include in serializer output
- [ ] Test endpoint returns prices

### Step 3: Test the Integration
- [ ] Create test product with stock
- [ ] Call availability endpoint
- [ ] Verify response matches spec
- [ ] Test with multiple batches
- [ ] Test with active reservations
- [ ] Test after completing a sale (stock should decrease)

### Step 4: Verify Frontend Works
- [ ] Search for product
- [ ] Verify price displays correctly
- [ ] Verify stock badge shows quantity
- [ ] Verify Add to Cart button is enabled
- [ ] Add item to cart
- [ ] Verify stock updates (reservation created)

---

## 🔍 Testing Examples

### Test Case 1: Single Batch, No Reservations

**Setup:**
```sql
INSERT INTO stock_products (id, product_id, storefront_id, quantity, retail_price, wholesale_price)
VALUES ('batch-1', 'product-123', 'store-1', 100, 25.50, 22.00);
```

**Expected Response:**
```json
{
  "total_available": 100,
  "reserved_quantity": 0,
  "unreserved_quantity": 100,
  "batches": [
    {
      "quantity": 100,
      "retail_price": 25.50,
      "wholesale_price": 22.00
    }
  ]
}
```

**Frontend Should Show:**
- Price: GH₵ 25.50 ✅
- Stock: "100 in stock" (green badge) ✅
- Add to Cart: Enabled ✅

---

### Test Case 2: Multiple Batches, With Reservations

**Setup:**
```sql
-- Batch 1: 100 units
INSERT INTO stock_products VALUES ('batch-1', 'product-123', 'store-1', 100, 25.50, 22.00);

-- Batch 2: 45 units
INSERT INTO stock_products VALUES ('batch-2', 'product-123', 'store-1', 45, 25.50, 22.00);

-- Active reservation: 5 units (expires in 25 minutes)
INSERT INTO stock_reservations 
VALUES ('res-1', 'sale-abc', 'product-123', 'store-1', 5, 'ACTIVE', NOW() + INTERVAL '25 minutes');
```

**Expected Response:**
```json
{
  "total_available": 145,          // 100 + 45
  "reserved_quantity": 5,          // Active reservation
  "unreserved_quantity": 140,      // 145 - 5
  "batches": [
    { "quantity": 100, "retail_price": 25.50 },
    { "quantity": 45, "retail_price": 25.50 }
  ],
  "reservations": [
    { "cart_session_id": "sale-abc", "quantity": 5 }
  ]
}
```

**Frontend Should Show:**
- Price: GH₵ 25.50 ✅
- Stock: "140 in stock" (green badge) ✅
- Add to Cart: Enabled ✅

---

### Test Case 3: Low Stock

**Setup:**
```sql
INSERT INTO stock_products VALUES ('batch-1', 'product-123', 'store-1', 3, 25.50, 22.00);
```

**Expected Response:**
```json
{
  "total_available": 3,
  "reserved_quantity": 0,
  "unreserved_quantity": 3
}
```

**Frontend Should Show:**
- Price: GH₵ 25.50 ✅
- Stock: "Only 3 left" (yellow badge) ⚠️
- Add to Cart: Enabled ✅

---

### Test Case 4: Out of Stock

**Setup:**
```sql
-- Batch has 5 units, but all are reserved
INSERT INTO stock_products VALUES ('batch-1', 'product-123', 'store-1', 5, 25.50, 22.00);
INSERT INTO stock_reservations VALUES ('res-1', 'sale-abc', 'product-123', 'store-1', 5, 'ACTIVE', NOW() + INTERVAL '20 minutes');
```

**Expected Response:**
```json
{
  "total_available": 5,
  "reserved_quantity": 5,
  "unreserved_quantity": 0        // All stock reserved!
}
```

**Frontend Should Show:**
- Price: GH₵ 25.50 ✅
- Stock: "Out of stock" (red badge) 🔴
- Add to Cart: **DISABLED** ✅

---

## 📚 Reference Documentation

**Backend Developer Should Read:**
1. `docs/sales-feature-specification.md` - Lines 509-585 (Availability endpoint spec)
2. `docs/STOCK-AVAILABILITY-EXPLAINED.md` - Complete explanation (455 lines)
3. `docs/BACKEND-README-SALES.md` - This file (Phase 1 requirements)

**Key Sections:**
- Stock Reservation System (30-minute expiry)
- Real-time Availability Calculation
- Preventing Overselling
- Database Transactions

---

## 🚀 Quick Start for Backend Dev

### Minimal Implementation (Get it working fast)

```python
# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum
from django.utils import timezone

class StockAvailabilityView(APIView):
    """
    GET /inventory/api/storefronts/{storefront_id}/stock-products/{product_id}/availability/
    """
    
    def get(self, request, storefront_id, product_id):
        # Get all batches for this product at this storefront
        batches = StockProduct.objects.filter(
            storefront_id=storefront_id,
            product_id=product_id
        )
        
        if not batches.exists():
            return Response({
                'total_available': 0,
                'reserved_quantity': 0,
                'unreserved_quantity': 0,
                'batches': []
            })
        
        # Calculate total stock
        total = sum(batch.quantity for batch in batches)
        
        # Get active reservations (simplified - just sum active ones)
        reserved = StockReservation.objects.filter(
            storefront_id=storefront_id,
            product_id=product_id,
            status='ACTIVE',
            expires_at__gt=timezone.now()
        ).aggregate(Sum('quantity'))['quantity__sum'] or 0
        
        unreserved = max(0, total - reserved)
        
        # Build response
        product = batches[0].product
        
        return Response({
            'product': str(product.id),
            'product_name': product.name,
            'total_available': total,
            'reserved_quantity': reserved,
            'unreserved_quantity': unreserved,
            'batches': [
                {
                    'id': str(batch.id),
                    'batch_number': batch.batch_number or '',
                    'quantity': batch.quantity,
                    'unit_cost': float(batch.unit_cost or 0),
                    'retail_price': float(batch.retail_price or 0),
                    'wholesale_price': float(batch.wholesale_price or 0),
                    'expiry_date': batch.expiry_date,
                }
                for batch in batches
            ],
            'reservations': [
                {
                    'cart_session_id': str(res.cart_session_id),
                    'quantity': res.quantity,
                    'expires_at': res.expires_at.isoformat()
                }
                for res in StockReservation.objects.filter(
                    storefront_id=storefront_id,
                    product_id=product_id,
                    status='ACTIVE',
                    expires_at__gt=timezone.now()
                )
            ]
        })

# urls.py
urlpatterns = [
    path(
        'storefronts/<uuid:storefront_id>/stock-products/<uuid:product_id>/availability/',
        StockAvailabilityView.as_view(),
        name='stock-availability'
    ),
]
```

**This minimal version:**
- ✅ Returns correct format
- ✅ Includes prices
- ✅ Calculates reservations
- ✅ Will make frontend work immediately
- ⚠️ Needs enhancement later for sales/spoilage/transfers

---

## ⏱️ Timeline

**Immediate (Today):**
- Implement minimal availability endpoint (1-2 hours)
- Test with frontend (30 minutes)
- Fix any issues (1 hour)

**This Week:**
- Add sales deduction logic
- Add spoilage/damage tracking
- Add transfer accounting
- Full testing

**Next Week:**
- Stock reservation creation on add-to-cart
- Reservation expiry cleanup job
- Performance optimization

---

## 💬 Communication

**If you have questions:**
1. Check `docs/STOCK-AVAILABILITY-EXPLAINED.md` first
2. Review `docs/sales-feature-specification.md` (lines 509-585)
3. Ask in team chat: "Frontend needs availability endpoint - see BACKEND-INTEGRATION-ISSUES.md"

**When you're ready to test:**
1. Deploy to dev environment
2. Tell frontend dev: "Availability endpoint is ready at /inventory/api/storefronts/{id}/stock-products/{id}/availability/"
3. Frontend will test and report results

---

## 🎯 Success Criteria

**Backend implementation is complete when:**
- [ ] Availability endpoint exists and returns 200
- [ ] Response matches specification format
- [ ] Includes `unreserved_quantity` field
- [ ] Includes `batches[]` with `retail_price` and `wholesale_price`
- [ ] Calculates active reservations correctly
- [ ] Frontend shows prices (not GH₵ 0.00)
- [ ] Frontend shows stock quantity (not "N/A")
- [ ] Frontend Add to Cart button is enabled
- [ ] User can complete a sale end-to-end

---

## 📊 Current Status Summary

| Component | Status | Blocker |
|-----------|--------|---------|
| Frontend Product Search | ✅ Working | None |
| Frontend Cart Management | ✅ Ready | Needs stock data |
| Frontend Checkout | ✅ Ready | Needs prices |
| Backend Products API | ✅ Working | None |
| Backend Availability API | ❌ Missing | **BLOCKING** |
| Backend Stock-Products Prices | ⚠️ Incomplete | Missing price fields |
| End-to-End Sale Flow | 🚫 Blocked | Needs above APIs |

**Bottom Line:** Frontend is 100% ready. Backend needs 1 critical endpoint to unblock everything.

---

**Priority:** 🔴 **URGENT**  
**Assignee:** Backend Developer  
**Estimated Time:** 2-4 hours for minimal implementation  
**Impact:** Unblocks entire POS system

**Questions?** See `docs/STOCK-AVAILABILITY-EXPLAINED.md` or ask in team chat.

---

**Last Updated:** October 4, 2025  
**Created By:** Frontend Team  
**Status:** 🔴 Blocking Development
