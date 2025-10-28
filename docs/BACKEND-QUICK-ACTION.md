# Backend Developer - Quick Action Items

## 🚨 URGENT: POS System Blocked

**Status:** Frontend complete, waiting for 1 critical backend endpoint  
**Impact:** Cannot display prices or stock → POS non-functional  
**Estimated Fix Time:** 2-4 hours

---

## 📋 What's Happening

**Current Behavior:**
- ✅ Product search works
- ❌ Prices show GH₵ 0.00 (should be GH₵ 25.50)
- ❌ Stock shows "N/A" (should be "140 in stock")
- ❌ Cannot add to cart (disabled)

**Root Cause:**
Frontend is calling an endpoint that doesn't exist yet:
```
GET /inventory/api/storefronts/{id}/stock-products/{id}/availability/
→ 404 Not Found
```

---

## ✅ What You Need to Do

### 1. Create This Endpoint (PRIMARY FIX)

**URL:**
```
GET /inventory/api/storefronts/<uuid:storefront_id>/stock-products/<uuid:product_id>/availability/
```

**Response Format:**
```json
{
  "product": "uuid",
  "product_name": "10mm Armoured Cable 50m",
  "total_available": 145,
  "reserved_quantity": 5,
  "unreserved_quantity": 140,
  "batches": [
    {
      "id": "uuid",
      "quantity": 100,
      "retail_price": 25.50,        // ⭐ MUST HAVE
      "wholesale_price": 22.00,     // ⭐ MUST HAVE
      "unit_cost": 20.00
    }
  ],
  "reservations": [
    {
      "cart_session_id": "sale-uuid",
      "quantity": 5,
      "expires_at": "2025-10-04T15:00:00Z"
    }
  ]
}
```

**Minimal Working Code:** (Copy-paste ready)
```python
# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum

class StockAvailabilityView(APIView):
    def get(self, request, storefront_id, product_id):
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
        
        total = sum(batch.quantity for batch in batches)
        
        reserved = StockReservation.objects.filter(
            storefront_id=storefront_id,
            product_id=product_id,
            status='ACTIVE',
            expires_at__gt=timezone.now()
        ).aggregate(Sum('quantity'))['quantity__sum'] or 0
        
        unreserved = max(0, total - reserved)
        product = batches[0].product
        
        return Response({
            'product': str(product.id),
            'product_name': product.name,
            'total_available': total,
            'reserved_quantity': reserved,
            'unreserved_quantity': unreserved,
            'batches': [
                {
                    'id': str(b.id),
                    'quantity': b.quantity,
                    'unit_cost': float(b.unit_cost or 0),
                    'retail_price': float(b.retail_price or 0),
                    'wholesale_price': float(b.wholesale_price or 0),
                }
                for b in batches
            ],
            'reservations': []
        })

# urls.py
path(
    'storefronts/<uuid:storefront_id>/stock-products/<uuid:product_id>/availability/',
    StockAvailabilityView.as_view()
)
```

### 2. Ensure Stock Has Prices (FALLBACK FIX)

Make sure `StockProduct` model includes:
```python
class StockProduct(models.Model):
    # ... other fields ...
    retail_price = models.DecimalField(max_digits=10, decimal_places=2)    # ⭐ MUST HAVE
    wholesale_price = models.DecimalField(max_digits=10, decimal_places=2) # ⭐ MUST HAVE
```

And populate these when creating stock.

---

## 🧪 How to Test

1. **Create test data:**
   ```python
   StockProduct.objects.create(
       product_id='product-123',
       storefront_id='store-456',
       quantity=100,
       retail_price=25.50,
       wholesale_price=22.00
   )
   ```

2. **Call endpoint:**
   ```bash
   curl http://localhost:8000/inventory/api/storefronts/store-456/stock-products/product-123/availability/
   ```

3. **Expected response:**
   ```json
   {
     "total_available": 100,
     "unreserved_quantity": 100,
     "batches": [
       {
         "retail_price": 25.50,
         "wholesale_price": 22.00
       }
     ]
   }
   ```

4. **Test in frontend:**
   - Refresh browser
   - Search for product
   - Should show: "GH₵ 25.50" and "100 in stock"
   - Add to Cart button should be enabled

---

## 📚 Complete Documentation

**For detailed implementation guide:**
→ See `docs/BACKEND-INTEGRATION-ISSUES.md` (620 lines)

**Includes:**
- Complete calculation logic for stock availability
- Test cases with examples
- Database query optimization
- Error handling
- Performance considerations

**For business logic explanation:**
→ See `docs/STOCK-AVAILABILITY-EXPLAINED.md` (455 lines)

---

## ⏱️ Timeline

**Today (2-4 hours):**
1. Copy-paste the minimal code above (30 min)
2. Add URL pattern (5 min)
3. Test with curl (15 min)
4. Deploy to dev (30 min)
5. Test with frontend (1 hour)
6. Fix any issues (1-2 hours)

**Result:** POS system working end-to-end

---

## 🎯 Success = Frontend Shows:

- ✅ Price: **GH₵ 25.50** (not 0.00)
- ✅ Stock: **"100 in stock"** (not N/A)
- ✅ Add to Cart: **Enabled** (not disabled)

---

## 💬 Questions?

1. Read `docs/BACKEND-INTEGRATION-ISSUES.md` first
2. Check `docs/sales-feature-specification.md` lines 509-585
3. Ask in team chat

---

## 📊 Impact

**Without this fix:**
- 🚫 Cannot make sales
- 🚫 Cannot test POS
- 🚫 Cannot demo to stakeholders
- 🚫 Project blocked

**With this fix:**
- ✅ Full POS functionality
- ✅ Can complete sales
- ✅ Can test all features
- ✅ Ready for production

---

**Priority:** 🔴 **CRITICAL**  
**Status:** ⏳ **Blocking**  
**ETA:** 2-4 hours

**Let's get this done!** 🚀
