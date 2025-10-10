# 🐛 Backend Bug Report: Stock Adjustment Creation Failure

**Date:** October 6, 2025  
**Severity:** 🔴 **HIGH** - Blocks stock adjustment feature  
**Status:** 🔄 **NEEDS BACKEND FIX**

---

## Error Summary

**HTTP 500 Internal Server Error** when creating stock adjustments via POST to `/inventory/api/stock-adjustments/`

```
AttributeError: 'Warehouse' object has no attribute 'business'
```

---

## 🔍 Error Details

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /inventory/api/stock-adjustments/` |
| **Error Type** | `AttributeError` |
| **Error Message** | `'Warehouse' object has no attribute 'business'` |
| **Django Version** | 5.2.6 |
| **Python Version** | 3.13.3 |

---

## 📋 Request Information

**Frontend Request Payload (Valid):**
```json
{
  "stock_product": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "adjustment_type": "DAMAGE",
  "quantity": 3,
  "reason": "Dropped during handling",
  "unit_cost": "12.00"
}
```

**Expected Response:** `201 Created` with adjustment object  
**Actual Response:** `500 Internal Server Error`

---

## 🎯 Root Cause

The stock adjustment creation logic is attempting to access `warehouse.business` directly, but the `Warehouse` model doesn't have a `business` attribute.

**Likely Location:** `backend/inventory/views.py` or `backend/inventory/serializers.py`

**Problematic Code Pattern:**
```python
# ❌ THIS FAILS
warehouse = get_warehouse_somehow()
business = warehouse.business  # AttributeError here!
```

---

## ✅ Suggested Fix

The `business` needs to be retrieved through the correct relationship chain. Here are the likely solutions:

### Option 1: Get from Request User
```python
# ✅ RECOMMENDED
business = request.user.current_business
```

### Option 2: Get from Stock Product
```python
# ✅ IF STOCK PRODUCT HAS BUSINESS
stock_product = validated_data['stock_product']
business = stock_product.business
```

### Option 3: Navigate Warehouse Relationship
```python
# ✅ IF WAREHOUSE -> STOREFRONT -> BUSINESS
warehouse = stock_product.warehouse
business = warehouse.storefront.business
```

### Option 4: Get from Stock/Batch
```python
# ✅ IF WAREHOUSE HAS STOCK/BATCH RELATIONSHIP
business = warehouse.stock.business
# OR
business = warehouse.batch.business
```

---

## 🔧 Where to Look

Check these files for the problematic code:

1. **`backend/inventory/views.py`**
   - Look for `StockAdjustmentViewSet` or similar
   - Check `create()` or `perform_create()` methods

2. **`backend/inventory/serializers.py`**
   - Look for `StockAdjustmentSerializer`
   - Check `create()` or `validate()` methods

3. **`backend/inventory/models.py`**
   - Verify `Warehouse` model relationships
   - Check if there's a property/method to get business

---

## 🧪 Testing After Fix

### Step 1: Verify Model Relationships
```python
# In Django shell
from inventory.models import Warehouse, StockProduct

warehouse = Warehouse.objects.first()
print(f"Warehouse: {warehouse}")

# Check available attributes/relationships
print(dir(warehouse))

# Try to access business through correct path
# Example: print(warehouse.storefront.business)
```

### Step 2: Test API Endpoint
```bash
# Use curl or Postman to test
curl -X POST http://localhost:8000/inventory/api/stock-adjustments/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stock_product": "uuid-here",
    "adjustment_type": "DAMAGE",
    "quantity": 3,
    "reason": "Test adjustment",
    "unit_cost": "12.00"
  }'

# Expected: 201 Created
# Should return adjustment object with ID
```

### Step 3: Verify in Admin
- Check Django admin at `/admin/inventory/stockadjustment/`
- Confirm the adjustment was created
- Verify `business` field is populated correctly

---

## 📊 Database Schema Check

Run this to understand the Warehouse model structure:

```python
# Django shell
from inventory.models import Warehouse
from django.db import connection

# Show Warehouse table structure
with connection.cursor() as cursor:
    cursor.execute("PRAGMA table_info(inventory_warehouse);")
    columns = cursor.fetchall()
    for col in columns:
        print(col)

# Show Warehouse relationships
for field in Warehouse._meta.get_fields():
    print(f"{field.name}: {type(field).__name__}")
```

---

## 💡 Quick Debug Tips

### Add Logging
```python
import logging
logger = logging.getLogger(__name__)

# In the create method
logger.debug(f"Stock product: {validated_data['stock_product']}")
logger.debug(f"Stock product type: {type(validated_data['stock_product'])}")

# Check what attributes are available
stock_product = validated_data['stock_product']
logger.debug(f"Stock product attributes: {dir(stock_product)}")

# Try different paths to business
try:
    business = stock_product.business
    logger.debug(f"Got business from stock_product: {business}")
except AttributeError as e:
    logger.error(f"Cannot get business from stock_product: {e}")
```

### Check Serializer Context
```python
# In serializer
def create(self, validated_data):
    print("=== DEBUG ===")
    print(f"Validated data: {validated_data}")
    print(f"Context: {self.context}")
    print(f"Request user: {self.context['request'].user}")
    print(f"User business: {self.context['request'].user.current_business}")
    print("=============")
    
    # Use the correct business source
    business = self.context['request'].user.current_business
    # ... rest of create logic
```

---

## 🎓 Understanding the Data Flow

```
Frontend Request
    ↓
POST /inventory/api/stock-adjustments/
    ↓
StockAdjustmentViewSet.create()
    ↓
StockAdjustmentSerializer.validate()
    ↓
StockAdjustmentSerializer.create(validated_data)
    ↓
❌ HERE: Trying to access warehouse.business
    ↓
AttributeError raised
    ↓
500 Internal Server Error returned
```

---

## 📝 Expected Behavior

After fix, the flow should be:

```
Frontend sends valid payload
    ↓
Backend validates data
    ↓
Backend gets business correctly (from user/stock_product/etc)
    ↓
Backend creates StockAdjustment with:
    - business = <correct_business>
    - stock_product = <from_payload>
    - adjustment_type = <from_payload>
    - quantity = <from_payload>
    - reason = <from_payload>
    - unit_cost = <from_payload>
    - status = "PENDING" or "APPROVED" (based on type)
    ↓
Backend returns 201 Created
    ↓
Frontend displays success and refreshes list
```

---

## ✅ Checklist for Backend Developer

- [ ] Identify where `warehouse.business` is being accessed
- [ ] Determine correct relationship path to `business`
- [ ] Update code to use correct business source
- [ ] Add logging to help debug similar issues
- [ ] Test with curl/Postman
- [ ] Verify in Django admin
- [ ] Test with frontend UI
- [ ] Check if other endpoints have same issue

---

## 🔗 Related Models to Check

Based on typical POS systems, verify these relationships:

```python
# Expected model structure
StockProduct
    ├── business (FK) ✅ Direct relationship
    ├── warehouse (FK)
    ├── stock (FK)
    └── stock_batch (FK)

Warehouse
    ├── storefront (FK) → Business
    └── ??? (no direct business FK)

Stock/StockBatch
    └── business (FK) ✅ Direct relationship
```

**Most likely solution:** Get `business` from `StockProduct.business` or `request.user.current_business`

---

## 📞 Contact

**Reported by:** Frontend Team  
**Frontend Status:** ✅ Ready and waiting for backend fix  
**Blocking:** Stock Adjustment feature testing

---

## 🚀 After Fix Confirmation

Reply with:
- ✅ Fix implemented
- ✅ Tested locally
- ✅ Returns 201 Created
- ✅ Adjustment visible in admin
- ✅ Frontend integration working

---

**Note:** Frontend code is correct and tested. The payload format matches the API specification. This is purely a backend model relationship issue.
