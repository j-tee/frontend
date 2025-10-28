# Sales Filter Bug - Quick Summary for Backend

## 🚨 The Problem

**API endpoint:** `/sales/api/sales/`  
**Issue:** Status filter (`?status=COMPLETED`) is ignored  
**Result:** Always returns same 26 DRAFT sales regardless of filter

## 📸 Evidence

| Filter Applied | Expected Result | Actual Result |
|---------------|-----------------|---------------|
| `?status=COMPLETED` | 375 COMPLETED sales | 26 DRAFT sales ❌ |
| `?status=PENDING` | 91 PENDING sales | 26 DRAFT sales ❌ |
| `?status=REFUNDED` | Some refunded sales | 26 DRAFT sales ❌ |

**Frontend IS sending the filter correctly:**
```javascript
Final Query Params: { page: 1, page_size: 100, status: "COMPLETED" }
```

**Backend IS ignoring it:**
```javascript
API Response: { count: 26, results: [all DRAFT] }
```

## 🔍 Quick Tests (Run in Django Shell)

```python
# Test 1: Does filtering work at all?
from sales.models import Sale
Sale.objects.filter(status='COMPLETED').count()
# Expected: 375

# Test 2: Is FilterSet working?
from sales.filters import SaleFilter
from django.http import QueryDict
filterset = SaleFilter(QueryDict('status=COMPLETED'), queryset=Sale.objects.all())
filterset.qs.count()
# Expected: 375

# Test 3: Check storefront
from django.contrib.auth import get_user_model
user = get_user_model().objects.get(username='Mike Tetteh')
if hasattr(user, 'current_storefront'):
    Sale.objects.filter(storefront=user.current_storefront).count()
    # If this returns 26, that's the issue!
```

## 🎯 Most Likely Causes

### 1. Auto-Storefront Filtering (Most Likely!)
```python
# WRONG - Limits queryset before status filter
def get_queryset(self):
    queryset = Sale.objects.filter(
        storefront=self.request.user.current_storefront
    )  # Only 26 sales in this storefront, all DRAFT!
    return queryset
```

**Fix:** Don't auto-filter by storefront. Let frontend request it explicitly.

### 2. FilterSet Not Applied
```python
# WRONG - Missing filterset_class
class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.all()  # No filtering!
```

**Fix:**
```python
# CORRECT
class SaleViewSet(viewsets.ModelViewSet):
    filterset_class = SaleFilter
    filter_backends = [DjangoFilterBackend]
```

### 3. Filter Name Mismatch
```python
# WRONG - Different field name
class SaleFilter(FilterSet):
    sale_status = CharFilter(field_name='status')  # Wrong!
    class Meta:
        fields = ['sale_status']  # Frontend sends 'status'!
```

**Fix:**
```python
# CORRECT
class SaleFilter(FilterSet):
    status = CharFilter(field_name='status')
    class Meta:
        fields = ['status']
```

## ✅ What Backend Should Return

### When called with `?status=COMPLETED`:
```json
{
  "count": 375,
  "results": [
    {
      "status": "COMPLETED",
      "receipt_number": "REC-202510-10009",
      "total_amount": 7.40,
      ...
    },
    ...
  ]
}
```

### Currently returning:
```json
{
  "count": 26,
  "results": [
    {
      "status": "DRAFT",
      "receipt_number": null,
      "total_amount": 0.00,
      ...
    },
    ...
  ]
}
```

## 📋 Action Items

1. [ ] Run quick tests above
2. [ ] Check if `current_storefront` filtering is active
3. [ ] Verify `SaleFilter` is applied to viewset
4. [ ] Check if "Cow Lane Store" has only 26 DRAFT sales
5. [ ] Fix and test with frontend

## 📞 Questions to Answer

1. **Does filtering work directly?**
   `Sale.objects.filter(status='COMPLETED').count()` → ?

2. **Is FilterSet configured?**
   `SaleViewSet.filterset_class` → ?

3. **Is storefront auto-filtering?**
   Check `get_queryset()` for `storefront=` → ?

4. **How many sales in Cow Lane Store?**
   `Sale.objects.filter(storefront=<cow_lane>).count()` → ?
   `Sale.objects.filter(storefront=<cow_lane>, status='DRAFT').count()` → ?

---

**See full details:** `docs/BACKEND-SALES-FILTER-ISSUE.md`
