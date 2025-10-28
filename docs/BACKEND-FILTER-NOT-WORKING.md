# 🚨 Backend Status Filter Not Working - URGENT

**Date:** October 7, 2025  
**Issue:** Sales status filter not applying correctly on backend  
**Impact:** HIGH - Users cannot filter sales by status  
**Frontend Status:** ✅ Working correctly  
**Backend Status:** ❌ BROKEN

---

## 🔍 Problem Summary

Despite the backend claiming to be fixed (October 6, 2025), the **sales status filter is still not working**.

### Evidence from Frontend Console

```javascript
// ✅ Frontend sends correct filter
Filters: { status: "PENDING" }

// ❌ Backend returns mixed statuses (ignoring filter)
All Statuses: ["DRAFT", "DRAFT", "DRAFT", "DRAFT", "DRAFT", "PENDING", "PENDING", "PENDING", "PENDING", "PENDING"]
```

**Expected:** Only PENDING sales  
**Actual:** Mix of DRAFT and PENDING sales

---

## 📡 API Request Details

### Request Being Made

```http
GET /sales/api/sales/?status=PENDING&page=1&page_size=20
Authorization: Token <user-token>
```

### Expected Response

```json
{
  "count": N,
  "results": [
    { "id": "...", "status": "PENDING", ... },
    { "id": "...", "status": "PENDING", ... },
    { "id": "...", "status": "PENDING", ... }
    // ALL should be PENDING
  ]
}
```

### Actual Response

```json
{
  "count": 10,
  "results": [
    { "id": "...", "status": "DRAFT", ... },    // ❌ WRONG
    { "id": "...", "status": "DRAFT", ... },    // ❌ WRONG
    { "id": "...", "status": "DRAFT", ... },    // ❌ WRONG
    { "id": "...", "status": "PENDING", ... },  // ✅ Correct
    { "id": "...", "status": "PENDING", ... },  // ✅ Correct
    // Mix of statuses - filter NOT applied
  ]
}
```

---

## 🔬 Root Cause Analysis

### According to STOREFRONT-FILTERING-REQUIREMENTS.md:

The backend was supposedly fixed on **October 6, 2025** with these changes:

1. ✅ Updated `SaleViewSet.get_queryset()` for permission-based filtering
2. ✅ Added storefront permission methods
3. ✅ Created `/api/users/storefronts/` endpoint
4. ❌ **But status filter is STILL broken!**

### The Actual Problem

Looking at the requirements document, it says:

```python
def get_queryset(self):
    queryset = Sale.objects.all()
    user = self.request.user
    
    # Filter by business
    membership = user.business_membership.filter(is_active=True).first()
    if membership:
        queryset = queryset.filter(business=membership.business)
        
        # Apply permission-based storefront filtering
        user_storefronts = user.get_accessible_storefronts()
        queryset = queryset.filter(storefront__in=user_storefronts)
    
    # FilterSet will handle additional filters (status, storefront, etc.)
    return queryset.order_by('-completed_at', '-created_at')
```

**The comment says "FilterSet will handle additional filters" but FilterSet is NOT being applied!**

### Likely Backend Issues

1. **FilterSet not registered properly**
   - `SaleFilter` class exists but may not be wired to the ViewSet
   - Check: Is `filterset_class = SaleFilter` set in the ViewSet?

2. **Filter backend not configured**
   - Check: Is `filter_backends = [DjangoFilterBackend]` set?
   - Check: Is `django-filter` installed and in `INSTALLED_APPS`?

3. **Field name mismatch**
   - The filter might be looking for `Sale.status` but the field might have a different name
   - Check the actual Sale model field name

4. **queryset returning too early**
   - The `get_queryset()` might be returning before filters are applied
   - FilterSet expects to filter the base queryset

---

## 🧪 Backend Testing Commands

### Test 1: Check if FilterSet is Working

```python
# Django shell
python manage.py shell

from sales.views import SaleViewSet
from sales.filters import SaleFilter

# Check ViewSet configuration
print("FilterSet class:", SaleViewSet.filterset_class)
print("Filter backends:", SaleViewSet.filter_backends)

# Check SaleFilter
print("\nSaleFilter fields:", SaleFilter.Meta.fields)
print("Status filter:", SaleFilter.base_filters.get('status'))
```

### Test 2: Test Filter Directly

```python
# Django shell
from sales.models import Sale
from sales.filters import SaleFilter
from django.test import RequestFactory

# Create a fake request
factory = RequestFactory()
request = factory.get('/sales/api/sales/', {'status': 'PENDING'})

# Apply filter
queryset = Sale.objects.all()
f = SaleFilter(request.GET, queryset=queryset, request=request)

print(f"Total sales: {queryset.count()}")
print(f"Filtered sales: {f.qs.count()}")
print(f"Statuses in filtered: {list(f.qs.values_list('status', flat=True).distinct())}")
```

### Test 3: Check Raw API Response

```bash
# Using curl
TOKEN="your-token-here"
curl -H "Authorization: Token $TOKEN" \
  "http://localhost:8000/sales/api/sales/?status=PENDING" | jq '.results[].status' | sort | uniq -c

# Expected output:
#   N PENDING

# Actual output (broken):
#   X DRAFT
#   Y PENDING
```

---

## 🛠️ Backend Fix Required

### File: `sales/views.py`

**Ensure these are set:**

```python
from django_filters.rest_framework import DjangoFilterBackend
from .filters import SaleFilter

class SaleViewSet(viewsets.ModelViewSet):
    serializer_class = SaleSerializer
    filterset_class = SaleFilter  # ✅ Must be set!
    filter_backends = [DjangoFilterBackend]  # ✅ Must be set!
    
    def get_queryset(self):
        queryset = Sale.objects.all()
        user = self.request.user
        
        # Filter by business
        membership = user.business_membership.filter(is_active=True).first()
        if membership:
            queryset = queryset.filter(business=membership.business)
            
            # Apply permission-based storefront filtering
            user_storefronts = user.get_accessible_storefronts()
            queryset = queryset.filter(storefront__in=user_storefronts)
        
        # ✅ FilterSet will be applied AFTER this by DRF automatically
        return queryset.order_by('-completed_at', '-created_at')
```

### File: `sales/filters.py`

**Ensure status filter is correct:**

```python
import django_filters
from .models import Sale

class SaleFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name='status')  # ✅ Check field_name
    storefront = django_filters.UUIDFilter(
        field_name='storefront__id',
        method='filter_storefront'
    )
    # ... other filters
    
    class Meta:
        model = Sale
        fields = ['status', 'storefront', 'type', 'customer', 'date_from', 'date_to']
    
    def filter_storefront(self, queryset, name, value):
        if not value:
            return queryset
        
        user = self.request.user
        if user.can_access_storefront(value):
            return queryset.filter(storefront__id=value)
        
        return queryset.none()
```

### File: `settings.py`

**Ensure django-filter is installed:**

```python
INSTALLED_APPS = [
    # ...
    'django_filters',  # ✅ Must be in INSTALLED_APPS
    # ...
]

REST_FRAMEWORK = {
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',  # ✅ Optional global setting
    ],
}
```

---

## 📊 Testing Checklist for Backend Team

### Before Fix
- [ ] Run Test 1: Check ViewSet configuration
- [ ] Run Test 2: Test filter directly
- [ ] Run Test 3: Check raw API response
- [ ] Verify `django-filter` is installed
- [ ] Verify `SaleFilter` is registered in ViewSet
- [ ] Verify `DjangoFilterBackend` is in `filter_backends`

### After Fix
- [ ] Run Test 2 again - should return only filtered results
- [ ] Test with curl: `?status=PENDING` returns only PENDING
- [ ] Test with curl: `?status=COMPLETED` returns only COMPLETED
- [ ] Test with curl: `?status=DRAFT` returns only DRAFT
- [ ] Test combined: `?status=PENDING&storefront=uuid` works
- [ ] Frontend refresh - filter now works correctly

---

## 🔗 Related Issues

1. **Original Issue:** BACKEND-SALES-FILTER-ISSUE.md
2. **Requirements:** STOREFRONT-FILTERING-REQUIREMENTS.md
3. **Frontend Implementation:** FRONTEND-STOREFRONT-IMPLEMENTATION-COMPLETE.md

---

## 📝 Action Items

### Backend Team - URGENT
1. ✅ Verify `filterset_class = SaleFilter` in SaleViewSet
2. ✅ Verify `filter_backends = [DjangoFilterBackend]` in SaleViewSet
3. ✅ Verify `django-filter` is installed and configured
4. ✅ Run all test commands above
5. ✅ Fix any configuration issues
6. ✅ Deploy fix to backend
7. ✅ Notify frontend team when fixed

### Frontend Team (This is done)
1. ✅ Enhanced logging to capture full request/response
2. ✅ Documented the issue with evidence
3. ⏳ Waiting for backend fix
4. ⏳ Will retest once backend is fixed

---

## 🎯 Success Criteria

**Filter is working when:**

```javascript
// Console shows:
Filters: { status: "PENDING" }
All Statuses: ["PENDING", "PENDING", "PENDING", "PENDING", "PENDING"]
// ALL statuses match the filter ✅
```

**API returns:**

```bash
curl "http://localhost:8000/sales/api/sales/?status=PENDING" | jq '.results[].status'
# Output:
# "PENDING"
# "PENDING"
# "PENDING"
# (all PENDING, no other statuses) ✅
```

---

**Status:** 🔴 BLOCKED - Waiting for backend fix  
**Priority:** 🔥 URGENT  
**Assignee:** Backend Team  
**Reporter:** Frontend Team  
**Date Reported:** October 7, 2025
