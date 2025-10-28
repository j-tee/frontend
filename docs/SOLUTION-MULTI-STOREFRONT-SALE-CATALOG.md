# ✅ SOLUTION: Multi-Storefront Sale Catalog

**Date**: October 11, 2025  
**Issue**: Products from Cow Lane not showing, but Adenta products appear  
**Root Cause**: Frontend only calls sale-catalog for ONE selected storefront  
**Status**: 🟢 SOLUTION IDENTIFIED - Implementation Needed

---

## 🎯 The Real Problem

### What We Discovered

The backend is **working correctly**! When you call:
```
GET /inventory/api/storefronts/{cow_lane_id}/sale-catalog/
```

It returns Sugar 1kg with 917 units available ✅

### The Actual Issue

The **frontend ProductSearchPanel** is designed to show products from **ONE storefront at a time**:

```typescript
// src/features/dashboard/components/sales/ProductSearchPanel.tsx
export function ProductSearchPanel({ storefrontId, ... }) {
  useEffect(() => {
    const loadCatalog = async () => {
      // Only loads catalog for ONE storefront
      const response = await fetchSaleCatalog(storefrontId)
      setCatalog(response.products)
    }
    loadCatalog()
  }, [storefrontId])
}
```

**The Sales Page passes the CURRENT SELECTED storefront**:

```typescript
// src/features/dashboard/pages/SalesPage.tsx
export default function SalesPage() {
  const currentLocation = useAppSelector(selectActiveLocation)
  
  return (
    <ProductSearchPanel
      storefrontId={currentLocation.id}  // ⚠️ Only ONE storefront
      ...
    />
  )
}
```

---

## 📊 Current Behavior

### Scenario 1: User Selects Adenta Storefront
1. User selects "Adenta" from storefront dropdown
2. `currentLocation.id` = Adenta UUID
3. Frontend calls `/storefronts/{adenta_id}/sale-catalog/`
4. ✅ Adenta products appear
5. ❌ Cow Lane products DON'T appear (not queried)

### Scenario 2: User Selects Cow Lane Storefront  
1. User selects "Cow Lane" from storefront dropdown
2. `currentLocation.id` = Cow Lane UUID
3. Frontend calls `/storefronts/{cowlane_id}/sale-catalog/`
4. ✅ Cow Lane products appear (Sugar 1kg with 917 units)
5. ❌ Adenta products DON'T appear (not queried)

### The Business Requirement

**Business owners should see products from ALL storefronts they have access to!**

This allows:
- Selling products from any location
- Transferring inventory between stores during sale
- Better inventory visibility
- Improved customer service

---

## 💡 Solution Options

### Option 1: Merge Multiple Sale Catalogs (Frontend)

**Pros:**
- Uses existing backend endpoints
- No backend changes needed
- Fast to implement

**Cons:**
- Multiple API calls (one per storefront)
- More complex frontend logic
- Potential performance issues with many storefronts

**Implementation:**
```typescript
// ProductSearchPanel.tsx
const loadAllStorefrontsCatalog = async (storefronts: Storefront[]) => {
  const catalogPromises = storefronts.map(sf => 
    fetchSaleCatalog(sf.id)
  )
  
  const responses = await Promise.all(catalogPromises)
  
  // Merge all products
  const allProducts = responses.flatMap(r => r.products)
  
  // Deduplicate by product_id
  const uniqueProducts = Array.from(
    new Map(allProducts.map(p => [p.product_id, p])).values()
  )
  
  setCatalog(uniqueProducts)
}
```

### Option 2: New Backend Endpoint (Recommended) ✅

**Pros:**
- Single API call
- Better performance
- Backend handles deduplication
- Can optimize query

**Cons:**
- Requires backend development
- Needs testing

**Backend Implementation:**
```python
# In inventory/views.py - StorefrontViewSet

@action(detail=False, methods=['get'], url_path='multi-storefront-catalog')
def multi_storefront_catalog(self, request):
    """
    Get sale catalog from ALL storefronts the user has access to.
    
    For business owners: Shows products from all storefronts
    For employees: Shows products from assigned storefronts only
    
    Returns aggregated product list with storefront information.
    """
    user = request.user
    
    # Get accessible storefronts
    if user.is_business_owner:
        # Owner sees all storefronts in their business
        storefronts = Storefront.objects.filter(
            business=user.business,
            is_active=True
        )
    else:
        # Employee sees only assigned storefronts
        employee_assignments = StoreFrontEmployee.objects.filter(
            employee__user=user
        ).values_list('storefront_id', flat=True)
        
        storefronts = Storefront.objects.filter(
            id__in=employee_assignments,
            is_active=True
        )
    
    # Collect products from all storefronts
    all_products = {}
    
    for storefront in storefronts:
        inventory_items = StorefrontInventory.objects.filter(
            storefront=storefront,
            available_quantity__gt=0
        ).select_related('product', 'product__category')
        
        for inv in inventory_items:
            product = inv.product
            product_key = str(product.id)
            
            # Get stock product IDs for this storefront
            stock_product_ids = list(
                StockProduct.objects.filter(
                    product=product,
                    storefront_inventory__storefront=storefront
                ).values_list('id', flat=True)
            )
            
            if not stock_product_ids:
                continue
            
            # Aggregate quantities across storefronts
            if product_key in all_products:
                # Product exists in multiple storefronts - sum quantities
                all_products[product_key]['available_quantity'] += inv.available_quantity
                all_products[product_key]['stock_product_ids'].extend(stock_product_ids)
                all_products[product_key]['storefronts'].append({
                    'id': str(storefront.id),
                    'name': storefront.name,
                    'quantity': inv.available_quantity
                })
            else:
                # First time seeing this product
                all_products[product_key] = {
                    'product_id': str(product.id),
                    'product_name': product.name,
                    'sku': product.sku or '',
                    'barcode': product.barcode,
                    'category_name': product.category.name if product.category else None,
                    'unit': product.unit,
                    'product_image': product.image.url if product.image else None,
                    'available_quantity': inv.available_quantity,
                    'retail_price': str(product.retail_price),
                    'wholesale_price': str(product.wholesale_price) if product.wholesale_price else None,
                    'stock_product_ids': stock_product_ids,
                    'last_stocked_at': inv.last_stocked_at.isoformat() if inv.last_stocked_at else None,
                    'storefronts': [{
                        'id': str(storefront.id),
                        'name': storefront.name,
                        'quantity': inv.available_quantity
                    }]
                }
    
    return Response({
        'storefronts': [{'id': str(sf.id), 'name': sf.name} for sf in storefronts],
        'products': list(all_products.values())
    })
```

**Frontend API Call:**
```typescript
// src/services/inventoryService.ts

export const fetchMultiStorefrontCatalog = async () => {
  const { data } = await httpClient.get<MultiStorefrontCatalogResponse>(
    '/inventory/api/storefronts/multi-storefront-catalog/',
  )
  return data
}

export interface MultiStorefrontCatalogResponse {
  storefronts: Array<{ id: UUID; name: string }>
  products: Array<SaleCatalogItem & {
    storefronts: Array<{
      id: UUID
      name: string
      quantity: number
    }>
  }>
}
```

**Frontend Component Update:**
```typescript
// src/features/dashboard/components/sales/ProductSearchPanel.tsx

// Add prop to enable multi-storefront mode
interface ProductSearchPanelProps {
  storefrontId?: UUID  // Optional - if not provided, load all
  multiStorefront?: boolean  // Enable multi-storefront catalog
  // ... other props
}

export function ProductSearchPanel({ 
  storefrontId, 
  multiStorefront = false,
  ...
}: ProductSearchPanelProps) {
  
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        setCatalogLoading(true)
        setError(null)
        
        let response
        
        if (multiStorefront) {
          // Load from all accessible storefronts
          response = await fetchMultiStorefrontCatalog()
        } else if (storefrontId) {
          // Load from single storefront (existing behavior)
          response = await fetchSaleCatalog(storefrontId)
        } else {
          throw new Error('Either storefrontId or multiStorefront must be provided')
        }
        
        const normalized = (response.products ?? [])
          .filter((item) => 
            Array.isArray(item.stock_product_ids) && 
            item.stock_product_ids.length > 0
          )
          .map((item): Product => ({
            id: item.product_id,
            name: item.product_name,
            sku: item.sku,
            // ... other fields
            
            // Optional: Show which storefronts have this product
            storefront_info: item.storefronts || []
          }))
        
        setCatalog(normalized)
      } catch (err) {
        setError('Unable to load catalog')
      } finally {
        setCatalogLoading(false)
      }
    }
    
    loadCatalog()
  }, [storefrontId, multiStorefront])
}
```

**Usage in SalesPage:**
```typescript
// src/features/dashboard/pages/SalesPage.tsx

// Determine if user is business owner or has multiple storefronts
const userRole = useAppSelector(selectUserRole)
const userStorefronts = useAppSelector(selectUserStorefronts)
const enableMultiStorefront = userRole === 'OWNER' || userStorefronts.length > 1

return (
  <ProductSearchPanel
    storefrontId={!enableMultiStorefront ? currentLocation?.id : undefined}
    multiStorefront={enableMultiStorefront}
    saleId={currentCart?.id}
    saleType={saleType}
  />
)
```

---

## 🎨 Enhanced UX: Show Storefront Info

When products come from multiple storefronts, show users where each product is available:

```tsx
// Product Search Results
{products.map((product) => (
  <div key={product.id}>
    <strong>{product.name}</strong> - {product.sku}
    <div className="text-sm text-muted">
      {product.storefront_info && product.storefront_info.length > 1 ? (
        <>
          Available in {product.storefront_info.length} locations:
          {product.storefront_info.map((sf, i) => (
            <Badge key={i} bg="secondary" className="ms-1">
              {sf.name} ({sf.quantity})
            </Badge>
          ))}
        </>
      ) : product.storefront_info?.[0] ? (
        <>
          {product.storefront_info[0].name}: {product.storefront_info[0].quantity} units
        </>
      ) : (
        <>In stock: {product.available_quantity} units</>
      )}
    </div>
  </div>
))}
```

---

## 🧪 Testing Plan

### Test Case 1: Business Owner
1. Login as business owner
2. Open Sales page
3. ✅ Should see products from ALL storefronts
4. Search for "Sugar"
5. ✅ Should show Sugar from both Cow Lane (917) and Adenta (if any)
6. Product badge should show: "Available in 2 locations: Cow Lane (917), Adenta (X)"

### Test Case 2: Employee with Multiple Storefronts
1. Login as employee assigned to both Cow Lane and Adenta
2. Open Sales page
3. ✅ Should see products from assigned storefronts only
4. Search for "Sugar"
5. ✅ Should show Sugar with aggregated quantity

### Test Case 3: Employee with Single Storefront
1. Login as employee assigned to only Cow Lane
2. Open Sales page
3. ✅ Should see products from Cow Lane only (existing behavior)
4. Search for "Sugar"
5. ✅ Should show Sugar with 917 units from Cow Lane

### Test Case 4: Product in Multiple Locations
1. Transfer same product to multiple storefronts
2. Search for that product
3. ✅ Quantity should be sum of all locations
4. ✅ Storefront badges should show breakdown

---

## 📊 Recommended Approach

**For immediate fix: Option 2 (New Backend Endpoint)**

**Reasoning:**
1. ✅ Better performance (single API call)
2. ✅ Cleaner frontend code
3. ✅ Backend handles complex logic
4. ✅ Supports role-based access (owner vs employee)
5. ✅ Provides storefront breakdown information
6. ✅ Easier to maintain and extend

**Implementation Steps:**

### Backend (2-3 hours)
1. Add `multi_storefront_catalog` action to StorefrontViewSet
2. Implement user permission logic (owner vs employee)
3. Aggregate products across storefronts
4. Add storefront breakdown to response
5. Write tests

### Frontend (1-2 hours)
1. Add `fetchMultiStorefrontCatalog` to inventoryService
2. Update ProductSearchPanel to support multi-storefront mode
3. Update SalesPage to enable multi-storefront for owners/multi-storefront employees
4. Add UI to show storefront breakdown
5. Test all user roles

### Testing (2 hours)
1. Test as business owner
2. Test as multi-storefront employee
3. Test as single-storefront employee
4. Verify quantities are correct
5. Verify products from all locations appear

---

## 🚀 Quick Win Alternative

If you need an immediate fix while backend is being developed, use **Option 1** as a temporary solution:

```typescript
// Quick fix in ProductSearchPanel.tsx
const loadAllStorefrontsCatalog = async () => {
  const storefronts = await fetchUserStorefronts()
  const catalogs = await Promise.all(
    storefronts.map(sf => fetchSaleCatalog(sf.id))
  )
  
  const allProducts = catalogs.flatMap(c => c.products)
  const uniqueProducts = Array.from(
    new Map(allProducts.map(p => [p.product_id, p])).values()
  )
  
  setCatalog(uniqueProducts)
}
```

This works but makes multiple API calls. Replace with Option 2 backend endpoint later.

---

## 📝 Summary

**Problem**: Users only see products from currently selected storefront  
**Root Cause**: Frontend loads catalog for ONE storefront at a time  
**Solution**: Create backend endpoint that returns products from all accessible storefronts  
**Impact**: Business owners can see and sell products from any location  
**Timeline**: 5-7 hours total (backend + frontend + testing)

**The backend is working perfectly!** We just need to extend it to support multi-storefront queries. 🎯

