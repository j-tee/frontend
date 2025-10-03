# 🔧 Troubleshooting: Product Search 500 Error

**Error:** `Request failed with status code 500` when searching products  
**Component:** ProductSearchPanel.tsx  
**Endpoint:** `GET /inventory/api/products/`

---

## 🎯 Quick Diagnosis Steps

### 1. Check Backend Console Logs (FIRST!)

The 500 error means the backend crashed. Check your Django console:

```bash
# Look for red error messages in your Django terminal
# Common issues you might see:
```

**Common Backend Errors:**

#### A) `AttributeError: 'Product' has no attribute 'is_active'`
**Cause:** Product model doesn't have `is_active` field  
**Fix:** Remove the filter from frontend or add field to backend

**Frontend Fix (Quick):**
```typescript
// In ProductSearchPanel.tsx, line ~75
const response = await httpClient.get('/inventory/api/products/', {
  params: {
    search: query,
    // is_active: true,  // ← Comment this out temporarily
  },
})
```

**Backend Fix (Proper):**
```python
# In inventory/models.py
class Product(models.Model):
    # ... existing fields ...
    is_active = models.BooleanField(default=True)  # ← Add this field

# Then run:
# python manage.py makemigrations
# python manage.py migrate
```

---

#### B) `DoesNotExist: Product matching query does not exist`
**Cause:** No products in database  
**Fix:** Create test products

```python
# python manage.py shell
from inventory.models import Product, Category

cat = Category.objects.create(name="Test Category")
Product.objects.create(
    name="Test Product",
    sku="TEST001",
    barcode="1234567890",
    category=cat,
    unit="pcs"
)
```

---

#### C) `RelatedObjectDoesNotExist: Product has no category`
**Cause:** Product has null category and query tries to access it  
**Fix:** Ensure all products have categories

```python
# python manage.py shell
from inventory.models import Product, Category

# Create default category
default_cat = Category.objects.get_or_create(name="Uncategorized")[0]

# Update products without category
Product.objects.filter(category__isnull=True).update(category=default_cat)
```

---

#### D) `FieldError: Cannot resolve keyword 'is_active' into field`
**Cause:** FilterSet or query using field that doesn't exist  
**Fix:** Check your ProductFilter or queryset

```python
# In inventory/views.py or filters.py
class ProductViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        queryset = Product.objects.all()
        
        # Remove this line if is_active doesn't exist:
        # queryset = queryset.filter(is_active=True)
        
        # Search parameter
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(sku__icontains=search)
            )
        
        return queryset
```

---

### 2. Test Endpoint Directly with cURL

```bash
# Replace YOUR_TOKEN with your actual auth token
# (Get it from browser localStorage or login response)

curl -H "Authorization: Token YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     "http://localhost:8000/inventory/api/products/?search=test" \
     -v
```

**Expected Success Response:**
```json
{
  "results": [
    {
      "id": "uuid",
      "name": "Test Product",
      "sku": "TEST001",
      "barcode": "1234567890",
      "category_name": "Test Category",
      "unit": "pcs",
      "is_active": true
    }
  ]
}
```

**Or without pagination:**
```json
[
  {
    "id": "uuid",
    "name": "Test Product",
    ...
  }
]
```

---

### 3. Check Browser Console

Open DevTools (F12) and look for the detailed logs:

```
[ProductSearch] Searching for: test
[ProductSearch] API URL: /inventory/api/products/
[ProductSearch] Base URL: http://localhost:8000
[ProductSearch] Error status: 500
[ProductSearch] Error data: { ... }
```

The `Error data` will show the actual Django error message.

---

### 4. Verify Backend is Running

```bash
# Check if backend is responding
curl http://localhost:8000/admin/
# Should return HTML page (not error)

# Check inventory app is loaded
curl http://localhost:8000/inventory/api/
# Should return API root or endpoints list
```

---

## 🔧 Quick Fixes

### Fix #1: Remove is_active Filter (Temporary)

**File:** `src/features/dashboard/components/sales/ProductSearchPanel.tsx`

```typescript
// Line ~75
const response = await httpClient.get('/inventory/api/products/', {
  params: {
    search: query,
    // is_active: true,  // ← Comment out
  },
})
```

### Fix #2: Change Endpoint Path (If Different)

If your backend uses a different path:

```typescript
// Try these alternatives:
'/api/inventory/products/'  // Alternative 1
'/api/products/'            // Alternative 2
'/products/'                // Alternative 3
```

### Fix #3: Handle Backend Not Ready

Add a mock data fallback:

```typescript
const searchProducts = useCallback(async (query: string) => {
  try {
    // ... existing code ...
  } catch (err) {
    console.error('Backend error, using mock data')
    
    // Mock data for testing
    setProducts([
      {
        id: '1',
        name: 'Test Product',
        sku: 'TEST001',
        barcode: '123456',
        category_name: 'Test',
        unit: 'pcs',
        image: null
      }
    ])
  }
}, [fetchStockLevels])
```

---

## 📋 Backend Checklist

Ensure your Django backend has:

- [ ] `inventory` app installed in `INSTALLED_APPS`
- [ ] Product model with required fields
- [ ] ProductViewSet with GET endpoint
- [ ] URL routing: `/inventory/api/products/`
- [ ] Authentication middleware working
- [ ] CORS headers configured (if frontend on different port)
- [ ] Database migrations applied
- [ ] At least one test product exists

---

## 🐛 Common Backend Issues

### Issue: CORS Error (Not 500)
If you see CORS error instead:

```python
# settings.py
INSTALLED_APPS = [
    ...
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # ← Add this first
    'django.middleware.common.CommonMiddleware',
    ...
]

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',  # Vite default
    'http://localhost:3000',  # React default
]
```

### Issue: Endpoint Not Found (404)
Check your URLs:

```python
# inventory/urls.py
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')

urlpatterns = router.urls

# Main urls.py
urlpatterns = [
    path('inventory/api/', include('inventory.urls')),
]
```

### Issue: Authentication Failed (401)
Token might be expired:

```typescript
// Check in browser console
console.log(localStorage.getItem('token'))

// If null, log out and log back in
```

---

## 🔍 Debug Script

I've created a test script for you. Run it:

```bash
bash /tmp/test-backend-api.sh
```

It will test all endpoints and show you exactly what's failing.

---

## 📞 Next Steps

1. **Check your Django console** - The error message there will tell you exactly what's wrong
2. **Copy the error message** - Share it with the team or paste it here
3. **Check the Backend Readiness doc** - Ensure all Phase 1 endpoints are implemented
4. **Verify database** - Ensure migrations are applied and data exists

---

## 💡 Most Likely Cause

Based on the backend readiness summary you shared, the backend **should** have all these endpoints ready. The 500 error most likely means:

1. **Missing field:** `is_active` field doesn't exist on Product model
2. **Missing migration:** Database schema is out of sync
3. **Missing data:** No products exist in the database
4. **Query error:** FilterSet or query using wrong field names

**Quick test:**
```bash
# In Django shell
python manage.py shell

>>> from inventory.models import Product
>>> Product.objects.all()
# If this errors, you have a model issue
# If this returns [], you need to create products
# If this works, check the view/serializer
```

---

## ✅ When Fixed

Once you fix the backend issue:

1. Refresh the frontend page
2. Try searching again
3. You should see products appear
4. Stock indicators should work
5. Add to cart should function

---

**Need more help?** Share the Django console error message and I can provide a more specific fix!

**Last Updated:** October 3, 2025  
**Component:** ProductSearchPanel.tsx  
**Error Code:** 500
