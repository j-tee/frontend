# Sale Catalog Issue - Quick Reference

**Problem**: Cow Lane products not showing in sales page, Adenta products work fine  
**Root Cause**: Backend API not returning products for Cow Lane storefront  
**Status**: 🔴 BACKEND BUG - Requires backend fix

---

## 🎯 Quick Summary

The frontend is working correctly. The issue is in the backend API endpoint:

```
GET /inventory/api/storefronts/{storefront_id}/sale-catalog/
```

This endpoint returns an **empty products array** for Cow Lane but works for Adenta.

---

## 🔍 Frontend Code (Working Correctly)

**Location**: `src/features/dashboard/components/sales/ProductSearchPanel.tsx`

```typescript
// When user opens sales page, frontend calls:
const response = await fetchSaleCatalog(storefrontId)

// For Adenta: Returns products ✅
{
  "storefront": "adenta-id",
  "products": [
    {
      "product_id": "prod-1",
      "product_name": "Cable 10mm",
      "sku": "ELEC-0007",
      "stock_product_ids": ["sp-1", "sp-2"],  // ✅ Has IDs
      "available_quantity": 50
    }
  ]
}

// For Cow Lane: Returns empty ❌
{
  "storefront": "cowlane-id",
  "products": []  // ❌ EMPTY - This is the bug
}
```

### Frontend Filter Logic

```typescript
// Frontend filters products that have stock_product_ids
const normalized = (response.products ?? [])
  .filter((item) => 
    Array.isArray(item.stock_product_ids) && 
    item.stock_product_ids.length > 0  // ✅ This is correct
  )
```

**Why this matters**: If backend returns products without `stock_product_ids`, frontend will filter them out. But the real issue is backend returning **empty products array**.

---

## 🐛 What Backend Should Check

### 1. Database Query
```sql
-- Check if Cow Lane has inventory
SELECT 
  s.name as storefront,
  COUNT(*) as products,
  SUM(si.available_quantity) as total_qty
FROM storefront_inventory si
JOIN storefronts s ON si.storefront_id = s.id
WHERE s.name LIKE '%Cow Lane%'
GROUP BY s.name;

-- Compare with Adenta
SELECT 
  s.name as storefront,
  COUNT(*) as products,
  SUM(si.available_quantity) as total_qty
FROM storefront_inventory si
JOIN storefronts s ON si.storefront_id = s.id
WHERE s.name LIKE '%Adenta%'
GROUP BY s.name;
```

### 2. Possible Backend Issues

**Issue A: Storefront Inactive**
```python
# Bad filter that might exclude Cow Lane
Storefront.objects.filter(
    id=storefront_id,
    is_active=True  # ❌ Is Cow Lane marked inactive?
)
```

**Issue B: Wrong Join/Query**
```python
# Wrong way - looking at warehouse instead of storefront
products = Product.objects.filter(
    stockproduct__warehouse=warehouse  # ❌ Wrong
)

# Correct way - should look at storefront_inventory
products = Product.objects.filter(
    storefrontinventory__storefront=storefront_id,  # ✅ Correct
    storefrontinventory__available_quantity__gt=0
)
```

**Issue C: Missing stock_product_ids**
```python
# Backend must return stock_product_ids array
{
    "stock_product_ids": []  # ❌ Frontend filters this out
}

# Must be:
{
    "stock_product_ids": ["sp-uuid-1", "sp-uuid-2"]  # ✅ Required
}
```

---

## 🧪 Quick Test Commands

### Test API Directly
```bash
# Get storefront IDs
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/inventory/api/storefronts/ | jq '.results[] | {id, name}'

# Test Cow Lane
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/inventory/api/storefronts/COWLANE_ID/sale-catalog/ | jq .

# Test Adenta
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/inventory/api/storefronts/ADENTA_ID/sale-catalog/ | jq .
```

### Run Diagnostic Script
```bash
# Copy diagnose_sale_catalog.py to backend project
cd /path/to/backend
python diagnose_sale_catalog.py

# Select option 4: Quick check Cow Lane vs Adenta
```

---

## ✅ What Success Looks Like

After backend fix, API should return:

```json
{
  "storefront": "cowlane-uuid",
  "products": [
    {
      "product_id": "uuid-1",
      "product_name": "10mm Armoured Cable",
      "sku": "ELEC-0007",
      "barcode": "123456",
      "category_name": "Electrical",
      "unit": "meters",
      "product_image": "/media/products/cable.jpg",
      "available_quantity": 50,
      "retail_price": "150.00",
      "wholesale_price": "120.00",
      "stock_product_ids": ["sp-uuid-1", "sp-uuid-2"],
      "last_stocked_at": "2025-10-10T14:30:00Z"
    }
    // ... more products
  ]
}
```

Then frontend will:
1. ✅ Display products in search
2. ✅ Allow SKU search
3. ✅ Enable adding to cart
4. ✅ Complete sales transactions

---

## 📁 Documentation Files

All detailed documentation created in `/docs/`:

1. **BACKEND-BUG-SALE-CATALOG-MISSING-PRODUCTS.md** (Main doc)
   - Complete problem analysis
   - SQL queries for investigation
   - Expected backend implementation
   - Testing checklist

2. **diagnose_sale_catalog.py** (Diagnostic tool)
   - Interactive Python script
   - Compare working vs broken storefronts
   - Simulate API responses
   - Identify exact issues

3. **SALE-CATALOG-ISSUE-QUICK-REF.md** (This file)
   - Quick summary
   - Fast troubleshooting steps

---

## 🚨 Priority

**Impact**: CRITICAL - Storefront cannot process sales  
**Complexity**: MEDIUM - Likely simple query/filter bug  
**Timeline**: Same-day fix expected

---

## 💡 Next Steps

1. **Backend Dev**: 
   - Read BACKEND-BUG-SALE-CATALOG-MISSING-PRODUCTS.md
   - Run diagnose_sale_catalog.py
   - Fix the bug
   - Test with curl/Postman
   - Deploy

2. **Frontend Dev**: 
   - No action needed
   - Code is working correctly
   - Will work automatically after backend fix

3. **Testing**:
   - Open sales page
   - Select Cow Lane storefront
   - Search for product by name or SKU
   - Verify products appear
   - Complete test sale

---

## 📞 Questions?

If you need more details:
- See full documentation in BACKEND-BUG-SALE-CATALOG-MISSING-PRODUCTS.md
- Run the diagnostic script for specific data
- Check database directly with provided SQL queries

**Remember**: Frontend is working perfectly. This is 100% a backend data/API issue! 🎯
