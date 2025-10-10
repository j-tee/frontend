# 📊 Stock Adjustment: Current Quantity Display Issue

**Date:** October 6, 2025  
**Priority:** ~~🟢 **LOW-MEDIUM** - Clarification needed~~ ✅ **RESOLVED**  
**Type:** UX Confusion / Design Decision  
**Status:** ✅ **IMPLEMENTED** - Backend added `quantity_before`, Frontend fully integrated

---

## ✅ Resolution Summary

**Backend Response:** Response A - "Shows Real-time, Will Add Historical"

The backend team has successfully implemented the `quantity_before` field:
- ✅ Field added to `StockAdjustment` model
- ✅ Auto-capture working on creation
- ✅ Migration applied and data backfilled
- ✅ Serializer updated to return both values
- ✅ API response includes `quantity_at_creation` and `current_quantity`

**Frontend Integration:** Complete
- ✅ TypeScript types updated with `quantity_at_creation` field
- ✅ Detail modal enhanced to show all three quantities
- ✅ Change detection and alerts implemented
- ✅ Zero TypeScript errors
- ✅ Fully backward compatible

**Documentation:**
- ✅ `STOCK-ADJUSTMENT-HISTORICAL-QUANTITY-INTEGRATION.md` - Technical implementation
- ✅ `STOCK-ADJUSTMENT-REAL-WORLD-EXAMPLE.md` - Production example with real data

**See:** [Real-World Example](./STOCK-ADJUSTMENT-REAL-WORLD-EXAMPLE.md) for complete walkthrough

---

## Original Question (Archived)

---

## 🤔 The Question

In the Stock Adjustment detail view, the "Current Quantity" field is showing **44**, but this may not be the quantity that existed when the adjustment was created. 

**Is this intentional or a bug?**

---

## 📸 What We're Seeing

### Frontend Display:
```
Stock Product Information:
├─ Product Name: 10mm Armoured Cable 50m
├─ Product Code: ELEC-0007
├─ Current Quantity: 44        ← This value
├─ Warehouse: Rawlings Park Warehouse
└─ Supplier: Cheng Song Electricals

Adjustment Information:
├─ Quantity: --4               ← Removing 4 items
├─ Unit Cost: $12.00
├─ Total Cost: $48.00
└─ Financial Impact: -$48.00

Timeline:
└─ Created: 10/6/2025, 10:16:02 AM by Mike Tetteh
```

### The Confusion:

**If the adjustment removes 4 items, after approval the quantity should be:**
- Current: 44
- After adjustment: 40 (44 - 4)

**But users are confused because:**
- They don't know if 44 was the original quantity
- Or if 44 is the current quantity (after other transactions)

---

## 🔍 Data Source

The frontend gets this from the API response:

```json
{
  "id": "adjustment-uuid",
  "stock_product": "product-uuid",
  "stock_product_details": {
    "product_name": "10mm Armoured Cable 50m",
    "product_code": "ELEC-0007",
    "current_quantity": 44,     // ⚠️ What does this represent?
    "warehouse": "Rawlings Park Warehouse",
    "supplier": "Cheng Song Electricals",
    "unit_cost": "12.00",
    "retail_price": "18.00"
  },
  "quantity": 4,
  "created_at": "2025-10-06T10:16:02Z"
}
```

---

## ❓ Key Questions for Backend

### Question 1: What Does `current_quantity` Represent?

**Option A: Real-time Current Quantity** (Dynamic)
```python
# Backend returns the CURRENT quantity of the stock product
# This changes as new sales/adjustments happen
stock_product = StockProduct.objects.get(id=adjustment.stock_product_id)
current_quantity = stock_product.quantity  # Latest value

# Example timeline:
# - Adjustment created when quantity was 48
# - 4 items sold after adjustment created
# - Now showing: 44 (current real-time value)
```

**Option B: Quantity at Time of Creation** (Historical)
```python
# Backend returns a SNAPSHOT of quantity when adjustment was created
# This is stored and never changes
current_quantity = adjustment.quantity_at_creation  # Historical value

# Example timeline:
# - Adjustment created when quantity was 48
# - 4 items sold after adjustment created
# - Still showing: 48 (frozen at creation time)
```

---

## 📊 Pros & Cons

### Option A: Real-time Current Quantity

**Pros:**
- ✅ Shows actual current state
- ✅ Helps prevent negative stock
- ✅ Users see what will happen after approval
- ✅ Useful for decision-making

**Cons:**
- ❌ Confusing - doesn't match historical context
- ❌ Can change between viewing and approving
- ❌ Difficult to audit ("what was it when created?")

### Option B: Quantity at Time of Creation

**Pros:**
- ✅ Accurate historical record
- ✅ Matches original context
- ✅ Easier to understand
- ✅ Better for auditing

**Cons:**
- ❌ May be outdated when approving
- ❌ Could approve adjustment that creates negative stock
- ❌ Doesn't show current state

---

## ✅ Recommended Solution

### Best Approach: Show BOTH Values

Update the UI to show both historical and current quantities:

```
Stock Product Information:
├─ Product Name: 10mm Armoured Cable 50m
├─ Product Code: ELEC-0007
├─ Quantity at Creation: 48       ← New field (historical)
├─ Current Quantity: 44            ← Existing field (real-time)
├─ Warehouse: Rawlings Park Warehouse
└─ Supplier: Cheng Song Electricals

After Approval:
└─ New Quantity: 40 (44 - 4)       ← Calculated preview
```

**Backend Changes Needed:**
```python
# In StockAdjustmentSerializer
class StockAdjustmentSerializer(serializers.ModelSerializer):
    stock_product_details = serializers.SerializerMethodField()
    
    def get_stock_product_details(self, obj):
        stock_product = obj.stock_product
        return {
            'product_name': stock_product.product.name,
            'product_code': stock_product.product.code,
            'quantity_at_creation': obj.quantity_before,  # ← Add this field
            'current_quantity': stock_product.quantity,   # ← Keep this
            'warehouse': stock_product.warehouse.name,
            'supplier': stock_product.supplier.name if stock_product.supplier else None,
            'unit_cost': str(stock_product.unit_cost),
            'retail_price': str(stock_product.retail_price),
        }
```

**Required Model Change:**
```python
# In StockAdjustment model
class StockAdjustment(models.Model):
    # ... existing fields
    quantity_before = models.IntegerField(
        help_text="Stock product quantity before this adjustment"
    )
    
    def save(self, *args, **kwargs):
        # On creation, capture the current quantity
        if not self.pk:  # New object
            self.quantity_before = self.stock_product.quantity
        super().save(*args, **kwargs)
```

---

## 🎨 Frontend Display Update

With the new data, frontend will show:

```tsx
<tr>
  <td className="fw-semibold">Quantity at Creation:</td>
  <td>
    {adjustment.stock_product_details?.quantity_at_creation ?? 'N/A'}
    <span className="text-muted small ms-2">
      (when adjustment was created)
    </span>
  </td>
</tr>
<tr>
  <td className="fw-semibold">Current Quantity:</td>
  <td>
    {adjustment.stock_product_details?.current_quantity ?? 'N/A'}
    <span className="text-muted small ms-2">
      (real-time)
    </span>
  </td>
</tr>
<tr>
  <td className="fw-semibold">After Approval:</td>
  <td className="fw-bold text-primary">
    {(adjustment.stock_product_details?.current_quantity || 0) - 
     (adjustment.is_decrease ? adjustment.quantity : -adjustment.quantity)}
    <span className="text-muted small ms-2">
      (predicted)
    </span>
  </td>
</tr>
```

---

## ⚡ Alternative: Frontend-Only Workaround

If backend cannot add `quantity_before` field, frontend can adapt:

### Option 1: Add Warning Message
```tsx
<tr>
  <td className="fw-semibold">Current Quantity:</td>
  <td>
    {adjustment.stock_product_details?.current_quantity ?? 'N/A'}
    <Alert variant="info" className="mt-2 mb-0">
      <small>
        ⚠️ This is the real-time quantity. It may have changed since 
        the adjustment was created on {formatDate(adjustment.created_at)}.
      </small>
    </Alert>
  </td>
</tr>
```

### Option 2: Calculate Backwards (Less Accurate)
```tsx
// Estimate what quantity was at creation
const estimatedOriginalQuantity = adjustment.status === 'COMPLETED' 
  ? adjustment.stock_product_details.current_quantity  // Already applied
  : adjustment.stock_product_details.current_quantity + 
    (adjustment.is_decrease ? adjustment.quantity : -adjustment.quantity)
```

---

## 🎯 Action Items

### For Backend Developer:

**Immediate (2 minutes):**
- [ ] Confirm what `current_quantity` represents (real-time or historical)
- [ ] Check if `quantity_before` field exists in model

**If quantity_before doesn't exist (30 minutes):**
- [ ] Add `quantity_before` field to `StockAdjustment` model
- [ ] Update `save()` method to capture quantity on creation
- [ ] Add migration
- [ ] Update serializer to include both values
- [ ] Test API response

**If quantity_before exists (5 minutes):**
- [ ] Just update serializer to include it in response
- [ ] Test API response

### For Frontend Developer:

**If backend adds quantity_before (10 minutes):**
- [ ] Update modal to show both values
- [ ] Add "After Approval" calculated field
- [ ] Add helpful tooltips

**If backend cannot change (5 minutes):**
- [ ] Add warning message explaining current_quantity
- [ ] Document the limitation

---

## 📝 Expected Response

Please confirm:

### Response A: "Shows Real-time, Will Add Historical"
```
✅ current_quantity = real-time value
✅ Will add quantity_before field
✅ ETA: 30 minutes
✅ Will update serializer to return both
```

### Response B: "Already Has Both"
```
✅ current_quantity = real-time value
✅ quantity_before field exists
✅ Just need to add to serializer
✅ ETA: 5 minutes
```

### Response C: "Cannot Add Historical Field"
```
⚠️ current_quantity = real-time value
⚠️ Cannot add quantity_before field
→ Frontend will add warning message
```

### Response D: "This is Historical, Not Real-time"
```
✅ current_quantity = quantity at creation time
✅ This is intentional
→ Just rename label to clarify
```

---

## 🚀 Summary

**Issue:** Unclear what "Current Quantity: 44" represents  
**Impact:** User confusion, potential approval errors  
**Best Solution:** Show both historical (at creation) and current (real-time) values  
**Quick Fix:** Add clarifying message  
**Time Estimate:** Backend: 30 min, Frontend: 10 min  

**Your Input Needed:**
- What does `current_quantity` currently represent?
- Can you add `quantity_before` field?
- Or should frontend just add clarification?

---

**Awaiting your response to proceed!** 🔍
