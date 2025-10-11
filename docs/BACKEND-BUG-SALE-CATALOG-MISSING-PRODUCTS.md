# ✅ RESOLVED: Sale Catalog Multi-Storefront Issue

**Issue Date**: October 11, 2025  
**Resolution Date**: October 11, 2025  
**Original Report**: Backend bug - Products missing  
**Actual Issue**: Frontend limitation - Only queries one storefront  
**Status**: � SOLUTION IDENTIFIED - See SOLUTION-MULTI-STOREFRONT-SALE-CATALOG.md

---

## 🎯 RESOLUTION UPDATE

**The backend is working correctly!** ✅

Testing revealed that:
- Cow Lane `/sale-catalog/` returns Sugar 1kg with 917 units ✅
- Adenta `/sale-catalog/` returns its products ✅
- Each endpoint works when called individually

**The real issue**: The frontend ProductSearchPanel only calls the sale-catalog endpoint for the **currently selected storefront**. When a user selects Adenta, they only see Adenta products. When they select Cow Lane, they only see Cow Lane products.

**Business Requirement**: Business owners should see products from **ALL storefronts** they have access to.

**Solution**: See `SOLUTION-MULTI-STOREFRONT-SALE-CATALOG.md` for complete implementation guide.

---

## 📋 Original Problem Report (Keep for Reference)

**User reported**: Products from Cow Lane not showing, Adenta products appear

### User Impact
- ❌ Cannot sell products from Cow Lane storefront
- ❌ SKU search returns nothing for Cow Lane products
- ✅ Adenta storefront works correctly
- ✅ All other functionality works (transfer requests fulfilled successfully)

### Root Cause
The backend API endpoint `/inventory/api/storefronts/{storefront_id}/sale-catalog/` is **not returning products** for Cow Lane storefront even though:
1. Transfer requests were successfully fulfilled
2. Products were transferred to Cow Lane
3. Inventory exists in the storefront

---

## 🔍 Technical Details

### API Endpoint
```
GET /inventory/api/storefronts/{storefrontId}/sale-catalog/
```

### Expected Response Format
```typescript
interface SaleCatalogResponse {
  storefront: UUID
  products: SaleCatalogItem[]
}

interface SaleCatalogItem {
  product_id: UUID
  product_name: string
  sku: string
  barcode?: string | null
  category_name?: string | null
  unit?: string | null
  product_image?: string | null
  available_quantity: number
  retail_price: string
  wholesale_price?: string | null
  stock_product_ids: UUID[]
  last_stocked_at?: string | null
}
```

### Frontend Implementation
```typescript
// Location: src/features/dashboard/components/sales/ProductSearchPanel.tsx

useEffect(() => {
  const loadCatalog = async () => {
    try {
      // This API call returns empty products array for Cow Lane
      const response = await fetchSaleCatalog(storefrontId)
      
      // Filters products that have stock_product_ids
      const normalized = (response.products ?? [])
        .filter((item: SaleCatalogItem) => 
          Array.isArray(item.stock_product_ids) && 
          item.stock_product_ids.length > 0
        )
        .map((item: SaleCatalogItem): Product => ({
          id: item.product_id,
          name: item.product_name,
          sku: item.sku,
          // ... other fields
          stock_product_ids: item.stock_product_ids,
          available_quantity: item.available_quantity,
        }))
      
      setCatalog(normalized)
    } catch (err) {
      setError('Unable to load catalog for this storefront')
    }
  }

  loadCatalog()
}, [storefrontId])
```

---

## 🐛 Symptoms

### What Works ✅
1. **Adenta Storefront**:
   - Products appear in search
   - SKU search works
   - Can add items to cart
   - Sales transactions complete successfully

2. **Transfer Workflow**:
   - Transfer requests created successfully
   - Transfer requests fulfilled successfully
   - Inventory transferred to Cow Lane

### What Fails ❌
1. **Cow Lane Storefront**:
   - Product search returns empty results
   - SKU search finds nothing
   - Cannot conduct sales
   - Products "invisible" on sales page

---

## 🔬 Backend Investigation Steps

### Step 1: Check Database Records

```sql
-- Check if Cow Lane storefront exists
SELECT id, name, location, is_active 
FROM storefronts 
WHERE name LIKE '%Cow Lane%';

-- Check if products were transferred to Cow Lane
SELECT 
  tr.id,
  tr.storefront_id,
  s.name as storefront_name,
  tr.status,
  tr.fulfilled_at
FROM transfer_requests tr
JOIN storefronts s ON tr.storefront_id = s.id
WHERE s.name LIKE '%Cow Lane%'
  AND tr.status = 'FULFILLED';

-- Check storefront inventory for Cow Lane
SELECT 
  si.id,
  si.storefront_id,
  s.name as storefront_name,
  si.product_id,
  p.name as product_name,
  p.sku,
  si.quantity,
  si.available_quantity
FROM storefront_inventory si
JOIN storefronts s ON si.storefront_id = s.id
JOIN products p ON si.product_id = p.id
WHERE s.name LIKE '%Cow Lane%';

-- Compare with Adenta (working storefront)
SELECT 
  si.id,
  si.storefront_id,
  s.name as storefront_name,
  si.product_id,
  p.name as product_name,
  p.sku,
  si.quantity,
  si.available_quantity
FROM storefront_inventory si
JOIN storefronts s ON si.storefront_id = s.id
JOIN products p ON si.product_id = p.id
WHERE s.name LIKE '%Adenta%';
```

### Step 2: Test the API Endpoint Directly

```bash
# Get Cow Lane storefront ID
COWLANE_ID="<uuid-from-database>"

# Get Adenta storefront ID
ADENTA_ID="<uuid-from-database>"

# Test Cow Lane endpoint
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/inventory/api/storefronts/$COWLANE_ID/sale-catalog/ \
  | jq .

# Test Adenta endpoint
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/inventory/api/storefronts/$ADENTA_ID/sale-catalog/ \
  | jq .
```

### Step 3: Check Backend View/Serializer Code

**Common Issues to Look For:**

1. **Storefront Filtering Bug**
```python
# BAD - May be filtering out Cow Lane incorrectly
def get_sale_catalog(storefront_id):
    # Check if there's a bug in storefront filtering
    storefronts = Storefront.objects.filter(
        id=storefront_id,
        is_active=True,  # Is Cow Lane marked inactive?
        # Any other filters that might exclude Cow Lane?
    )
```

2. **Stock Product Query Issue**
```python
# BAD - May not be joining correctly
def get_sale_catalog(storefront_id):
    products = Product.objects.filter(
        stockproduct__warehouse__storefront=storefront_id,  # Wrong join?
        # Should be looking at storefront_inventory table
    )
```

3. **Permissions/Access Control**
```python
# BAD - May have permission issue
def get_sale_catalog(storefront_id):
    # Check if there's a permissions filter excluding Cow Lane
    user_storefronts = request.user.accessible_storefronts
    if storefront_id not in user_storefronts:
        return []  # This would cause empty results
```

4. **Missing Stock Product IDs**
```python
# CRITICAL - Must return stock_product_ids array
{
    "product_id": "uuid",
    "product_name": "Cable 10mm",
    "sku": "ELEC-0007",
    "available_quantity": 50,
    "stock_product_ids": []  # ❌ EMPTY ARRAY = FILTERED OUT BY FRONTEND
}

# CORRECT
{
    "product_id": "uuid",
    "product_name": "Cable 10mm",
    "sku": "ELEC-0007",
    "available_quantity": 50,
    "stock_product_ids": ["stock-uuid-1", "stock-uuid-2"]  # ✅ REQUIRED
}
```

---

## 💡 Expected Backend Implementation

### Correct Query Logic

```python
# In inventory/views.py or storefronts/views.py

class StorefrontViewSet(viewsets.ModelViewSet):
    @action(detail=True, methods=['get'], url_path='sale-catalog')
    def sale_catalog(self, request, pk=None):
        """
        Get all products available for sale at this storefront
        
        Returns products that:
        1. Have storefront_inventory records for this storefront
        2. Have available_quantity > 0
        3. Include their stock_product_ids for cart operations
        """
        storefront = self.get_object()
        
        # Query storefront inventory
        inventory_items = StorefrontInventory.objects.filter(
            storefront=storefront,
            available_quantity__gt=0  # Only products that can be sold
        ).select_related(
            'product',
            'product__category'
        ).prefetch_related(
            'stock_products'  # Get associated stock product records
        )
        
        products = []
        for inventory in inventory_items:
            product = inventory.product
            
            # Get all stock product IDs for this product at this storefront
            stock_product_ids = list(
                StockProduct.objects.filter(
                    product=product,
                    storefront_inventory__storefront=storefront
                ).values_list('id', flat=True)
            )
            
            # CRITICAL: Must have stock_product_ids or frontend filters it out
            if not stock_product_ids:
                continue
            
            products.append({
                'product_id': str(product.id),
                'product_name': product.name,
                'sku': product.sku or '',
                'barcode': product.barcode,
                'category_name': product.category.name if product.category else None,
                'unit': product.unit,
                'product_image': product.image.url if product.image else None,
                'available_quantity': inventory.available_quantity,
                'retail_price': str(product.retail_price),
                'wholesale_price': str(product.wholesale_price) if product.wholesale_price else None,
                'stock_product_ids': stock_product_ids,  # ✅ REQUIRED
                'last_stocked_at': inventory.last_stocked_at.isoformat() if inventory.last_stocked_at else None,
            })
        
        return Response({
            'storefront': str(storefront.id),
            'products': products
        })
```

---

## 🧪 Testing Checklist

After backend fix, verify:

### Database Checks
- [ ] Cow Lane storefront record exists and is_active=True
- [ ] Cow Lane has storefront_inventory records
- [ ] Cow Lane inventory has available_quantity > 0
- [ ] Stock products exist for Cow Lane products
- [ ] Stock products are properly linked to storefront_inventory

### API Response Checks
- [ ] `/inventory/api/storefronts/{cow_lane_id}/sale-catalog/` returns products
- [ ] Each product has non-empty `stock_product_ids` array
- [ ] `available_quantity` matches database
- [ ] `retail_price` and `wholesale_price` are present
- [ ] Response matches SaleCatalogResponse interface

### Frontend Verification
- [ ] Open Sales page
- [ ] Select Cow Lane storefront
- [ ] Products appear in search
- [ ] SKU search works (e.g., "ELEC-0007")
- [ ] Can add products to cart
- [ ] Can complete sale transaction

---

## 🔧 Quick Fix Script

```python
# Django management command to diagnose issue
# python manage.py diagnose_sale_catalog

from django.core.management.base import BaseCommand
from storefronts.models import Storefront
from inventory.models import StorefrontInventory, StockProduct

class Command(BaseCommand):
    help = 'Diagnose sale catalog issue for storefronts'
    
    def handle(self, *args, **kwargs):
        # Find Cow Lane
        cow_lane = Storefront.objects.filter(name__icontains='Cow Lane').first()
        if not cow_lane:
            self.stdout.write(self.style.ERROR('Cow Lane storefront not found'))
            return
        
        self.stdout.write(f'Cow Lane ID: {cow_lane.id}')
        self.stdout.write(f'Active: {cow_lane.is_active}')
        
        # Check inventory
        inventory_count = StorefrontInventory.objects.filter(
            storefront=cow_lane
        ).count()
        self.stdout.write(f'Inventory records: {inventory_count}')
        
        # Check available inventory
        available_count = StorefrontInventory.objects.filter(
            storefront=cow_lane,
            available_quantity__gt=0
        ).count()
        self.stdout.write(f'Available products: {available_count}')
        
        # Check stock products
        for inv in StorefrontInventory.objects.filter(storefront=cow_lane, available_quantity__gt=0)[:5]:
            stock_products = StockProduct.objects.filter(
                product=inv.product,
                storefront_inventory__storefront=cow_lane
            )
            self.stdout.write(f'\nProduct: {inv.product.name}')
            self.stdout.write(f'  SKU: {inv.product.sku}')
            self.stdout.write(f'  Available: {inv.available_quantity}')
            self.stdout.write(f'  Stock Product IDs: {[str(sp.id) for sp in stock_products]}')
            
            if not stock_products:
                self.stdout.write(self.style.WARNING('  ⚠️  No stock products found!'))
        
        # Compare with Adenta
        adenta = Storefront.objects.filter(name__icontains='Adenta').first()
        if adenta:
            self.stdout.write(f'\n\n=== ADENTA (Working) ===')
            adenta_count = StorefrontInventory.objects.filter(
                storefront=adenta,
                available_quantity__gt=0
            ).count()
            self.stdout.write(f'Available products: {adenta_count}')
```

---

## 🎯 Expected Outcome

After fix, this should work:

```javascript
// Sales Page - Cow Lane Storefront
// User types "ELEC-0007" in search bar

// API Call: GET /inventory/api/storefronts/{cow_lane_id}/sale-catalog/
// Response:
{
  "storefront": "cow-lane-uuid",
  "products": [
    {
      "product_id": "prod-uuid",
      "product_name": "10mm Armoured Cable",
      "sku": "ELEC-0007",
      "barcode": "123456789",
      "category_name": "Electrical",
      "available_quantity": 50,
      "retail_price": "150.00",
      "wholesale_price": "120.00",
      "stock_product_ids": ["sp-uuid-1", "sp-uuid-2"],  // ✅ MUST BE PRESENT
      "last_stocked_at": "2025-10-10T14:30:00Z"
    }
    // ... more products
  ]
}

// Frontend filters and displays: "10mm Armoured Cable - ELEC-0007"
// User can add to cart and complete sale ✅
```

---

## 📝 Related Files

### Backend (Needs Investigation/Fix)
- `inventory/views.py` - StorefrontViewSet.sale_catalog action
- `storefronts/views.py` - Alternative location
- `inventory/serializers.py` - SaleCatalogSerializer
- `inventory/models.py` - StorefrontInventory, StockProduct models

### Frontend (Working Correctly)
- `/src/features/dashboard/components/sales/ProductSearchPanel.tsx` - Uses the API
- `/src/services/inventoryService.ts` - fetchSaleCatalog function
- `/src/types/inventory.ts` - SaleCatalogResponse interface

---

## 🚨 Action Items

### Backend Developer (URGENT)
1. ✅ Run diagnostic SQL queries to compare Cow Lane vs Adenta
2. ✅ Test API endpoint directly with curl/Postman
3. ✅ Review sale-catalog view/serializer implementation
4. ✅ Check for storefront filtering logic differences
5. ✅ Verify stock_product_ids are being populated
6. ✅ Fix the bug causing empty products array
7. ✅ Add test coverage for sale-catalog endpoint
8. ✅ Deploy fix to dev/staging
9. ✅ Verify with frontend team

### Frontend Developer (No Action Needed)
- ℹ️ Frontend code is working correctly
- ℹ️ Issue is 100% backend data/API
- ℹ️ Will automatically work when backend fixed

---

## 📊 Priority Assessment

**Business Impact**: 🔴 CRITICAL
- Storefront cannot process sales
- Lost revenue
- Poor customer experience
- Staff cannot do their job

**Technical Complexity**: 🟡 MEDIUM
- Likely simple query/filter bug
- Probably missing join or wrong condition
- Should be quick fix once identified

**Recommended Timeline**: 
- Investigation: **2-4 hours**
- Fix: **1-2 hours**
- Testing: **2 hours**
- **Total: Same day fix**

---

## 💬 Questions for Backend Team

1. **Is Cow Lane storefront marked as inactive?**
2. **Are there any permissions/access controls filtering Cow Lane?**
3. **Is the StorefrontInventory table properly populated for Cow Lane?**
4. **Are stock_product_ids being queried correctly?**
5. **Are there any recent migrations that might have affected this?**
6. **Is there a difference in how Cow Lane was set up vs Adenta?**

---

## 📞 Support

If you need help debugging this issue:
- Check Django admin for Cow Lane storefront settings
- Review recent transfer request logs
- Compare database records between working/non-working storefronts
- Test with different user accounts to rule out permissions

**This is a blocking issue - prioritize accordingly!** 🚨

