# 🚨 Sales API Filter Issue - Backend Investigation Required

**Date:** October 6, 2025  
**Severity:** HIGH  
**Component:** Sales API (`/sales/api/sales/`)  
**Issue:** Status filter parameter not working - always returns same results

---

## 📋 Issue Summary

The Sales History API endpoint is **NOT respecting the `status` query parameter**. Regardless of what status filter is sent, the API always returns the same 26 sales records, all with `status: "DRAFT"`.

### Expected Behavior
```http
GET /sales/api/sales/?status=COMPLETED
→ Should return ~375 COMPLETED sales

GET /sales/api/sales/?status=PENDING  
→ Should return ~22 PENDING sales

GET /sales/api/sales/?status=REFUNDED
→ Should return REFUNDED sales
```

### Actual Behavior
```http
GET /sales/api/sales/?status=COMPLETED
→ Returns 26 DRAFT sales ❌

GET /sales/api/sales/?status=PENDING
→ Returns same 26 DRAFT sales ❌

GET /sales/api/sales/?status=REFUNDED  
→ Returns same 26 DRAFT sales ❌
```

---

## 🔍 Frontend Evidence

### Console Logs Show:

**Test 1: Status = COMPLETED**
```javascript
Filters State: { status: "COMPLETED" }
Final Query Params: { page: 1, page_size: 100, status: "COMPLETED" }

API Response:
  count: 26
  resultsLength: 20
  All Statuses: ["DRAFT", "DRAFT", "DRAFT", "DRAFT", ...] // All DRAFT!
```

**Test 2: Status = REFUNDED**
```javascript
Filters State: { status: "REFUNDED" }
Final Query Params: { page: 1, page_size: 100, status: "REFUNDED" }

API Response:
  count: 26
  resultsLength: 20
  All Statuses: ["DRAFT", "DRAFT", "DRAFT", "DRAFT", ...] // Still DRAFT!
```

**Test 3: Status = PENDING**
```javascript
Filters State: { status: "PENDING" }
Final Query Params: { page: 1, page_size: 100, status: "PENDING" }

API Response:
  count: 26
  resultsLength: 20  
  All Statuses: ["DRAFT", "DRAFT", "DRAFT", "DRAFT", ...] // Still DRAFT!
```

### UI Evidence:
- Dropdown shows: "✅ Completed" or "↩️ Refunded" or "⏳ Pending"
- Active Filter Badge shows: `status: COMPLETED` / `status: REFUNDED` / `status: PENDING`
- Table Results show: **ALL DRAFT sales with N/A receipts and $0.00 amounts**
- Count always shows: **26 sales** (regardless of filter)

---

## 🎯 Database Context

Based on previous backend analysis, the database contains:

| Status | Expected Count |
|--------|---------------|
| COMPLETED | 375 |
| PENDING | 91 |
| PARTIAL | 21 |
| DRAFT | 33 |
| **TOTAL** | **520** |

But API always returns: **26 records, all DRAFT**

---

## 🔧 Backend Investigation Checklist

### 1. Check API View Implementation

**File to check:** `sales/views.py` or similar

```python
# QUESTION 1: Is the status filter implemented?
class SaleViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        queryset = Sale.objects.all()
        
        # Is there code like this?
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        
        return queryset
```

**Verify:**
- [ ] Does the viewset have `get_queryset()` method?
- [ ] Is it reading `status` from `request.query_params`?
- [ ] Is it applying the filter to the queryset?
- [ ] Are there any exceptions or errors being swallowed?

---

### 2. Check FilterSet Implementation

**File to check:** `sales/filters.py` or similar

```python
# QUESTION 2: Is there a FilterSet being used?
class SaleFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name='status')
    # OR
    status = django_filters.ChoiceFilter(choices=Sale.STATUS_CHOICES)
    
    class Meta:
        model = Sale
        fields = ['status', 'storefront', 'type', ...]
```

**Verify:**
- [ ] Is `SaleFilter` properly configured?
- [ ] Is `status` field in the `fields` list?
- [ ] Is the viewset using `filterset_class = SaleFilter`?
- [ ] Check `filter_backends` in viewset

---

### 3. Check for Storefront Auto-Filter

**HYPOTHESIS:** Backend might be auto-filtering by user's current storefront

**IMPORTANT REQUIREMENT:** Storefront filtering should be **optional and user-controlled**, NOT automatic!

```python
# QUESTION 3: Is storefront filtering overriding status filter?
def get_queryset(self):
    queryset = Sale.objects.all()
    
    # WRONG: Is there code like this that runs BEFORE status filter?
    user_storefront = self.request.user.current_storefront
    queryset = queryset.filter(storefront=user_storefront)  # ← This is the issue!
    
    # Then status filter doesn't work because queryset is already limited
    status = self.request.query_params.get('status')
    if status:
        queryset = queryset.filter(status=status)
```

**Verify:**
- [ ] Is there automatic storefront filtering? (This is WRONG)
- [ ] Does the user's current storefront only have DRAFT sales?
- [ ] Is the storefront filter being applied BEFORE status filter?
- [ ] Check if user "Cow Lane Store" has only 26 DRAFT sales

**CORRECT IMPLEMENTATION:**
- Users should see ALL sales they have permission to view by default
- Storefront filter should be optional via `?storefront=<uuid>` query param
- Users with appropriate privileges should be able to filter by storefronts they belong to
- Multi-storefront users should have dropdown to select storefront
- Permissions should determine which storefronts are available to filter

---

### 4. Check Permissions & Middleware

```python
# QUESTION 4: Are permissions blocking the filter?
class SaleViewSet(viewsets.ModelViewSet):
    permission_classes = [...]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Is there middleware that modifies queryset?
        # Is there a permission check that limits queryset?
```

**Verify:**
- [ ] Are there custom permissions limiting queryset?
- [ ] Is there middleware modifying the request?
- [ ] Check `DEFAULT_FILTER_BACKENDS` in settings

---

### 5. Check URL Routing

**File to check:** `sales/urls.py` or `urls.py`

```python
# QUESTION 5: Is the URL routing correct?
urlpatterns = [
    path('api/sales/', SaleViewSet.as_view({'get': 'list'})),
    # OR
    router.register('sales', SaleViewSet)
]
```

**Verify:**
- [ ] Is the endpoint mapped correctly?
- [ ] Is there a custom action overriding `list`?
- [ ] Check if there's a different view handling this endpoint

---

### 6. Check Query Parameter Parsing

```python
# QUESTION 6: How are query params being read?

# Method 1: Direct access (might be case-sensitive)
status = request.GET.get('status')  # Might fail if key is different

# Method 2: Query params (correct)
status = request.query_params.get('status')

# Method 3: Via filterset (correct)
filterset = SaleFilter(request.query_params, queryset=queryset)
```

**Verify:**
- [ ] Is the parameter name case-sensitive?
- [ ] Is it reading from correct source?
- [ ] Are there any transformations applied?

---

## 🏪 Storefront Filtering Requirements

### Current Problem
The backend appears to be **automatically filtering** by user's current storefront, which:
- ❌ Limits results before status filter is applied
- ❌ Prevents users from seeing sales across their accessible storefronts
- ❌ Makes status filter ineffective if current storefront only has DRAFT sales

### Required Behavior

#### 1. Permission-Based Access
```python
# Users should see sales from ALL storefronts they have access to
user_storefronts = user.get_accessible_storefronts()
# OR based on business/role
user_storefronts = user.business.storefronts.all()
# OR based on explicit assignment
user_storefronts = user.assigned_storefronts.all()
```

#### 2. Optional Storefront Filter
```http
# No storefront param: Show all accessible storefronts
GET /sales/api/sales/?status=COMPLETED

# With storefront param: Filter by specific storefront
GET /sales/api/sales/?status=COMPLETED&storefront=<uuid>
```

#### 3. Multi-Storefront Support
- **Single Storefront User:** Sees only their storefront sales
- **Multi-Storefront User:** Sees all their storefronts, can filter to specific one
- **Business Admin:** Sees all storefronts in business, can filter to any
- **Super Admin:** Sees all storefronts, can filter to any

### Frontend Requirements

#### Storefront Filter Dropdown (To Be Implemented)
```tsx
// Add storefront selector if user has multiple storefronts
const userStorefronts = useAppSelector(selectUserStorefronts)

{userStorefronts.length > 1 && (
  <Form.Select
    size="sm"
    value={selectedStorefront}
    onChange={(e) => handleStorefrontChange(e.target.value)}
  >
    <option value="">All My Stores</option>
    {userStorefronts.map(store => (
      <option key={store.id} value={store.id}>
        {store.name}
      </option>
    ))}
  </Form.Select>
)}
```

#### Filter Logic
```typescript
// In SalesHistory component
const handleStorefrontChange = (storefrontId: string) => {
  setSelectedStorefront(storefrontId)
  dispatch(setSalesPage(1)) // Reset page
  
  if (storefrontId) {
    dispatch(setSalesFilters({ 
      ...filters, 
      storefront: storefrontId 
    }))
  } else {
    // Remove storefront filter, keep others
    const { storefront, ...rest } = filters
    dispatch(setSalesFilters(rest))
  }
}
```

### Backend Implementation Checklist

#### API Changes Required:
- [ ] Remove automatic `current_storefront` filtering
- [ ] Implement permission-based storefront access
- [ ] Add `storefront` to `SaleFilter` fields
- [ ] Validate user has access to requested storefront
- [ ] Return user's accessible storefronts in user profile API

#### Permission Model:
```python
# User model or profile
class User:
    def get_accessible_storefronts(self):
        """Return storefronts user can access based on role/permissions"""
        if self.is_superuser:
            return Storefront.objects.all()
        elif self.role == 'BUSINESS_ADMIN':
            return self.business.storefronts.all()
        elif self.role == 'STORE_MANAGER':
            return self.managed_storefronts.all()
        else:
            return self.assigned_storefronts.all()
```

#### ViewSet Implementation:
```python
class SaleViewSet(viewsets.ModelViewSet):
    filterset_class = SaleFilter
    filter_backends = [DjangoFilterBackend]
    
    def get_queryset(self):
        queryset = Sale.objects.all()
        
        # STEP 1: Apply permission-based filtering
        user_storefronts = self.request.user.get_accessible_storefronts()
        queryset = queryset.filter(storefront__in=user_storefronts)
        
        # STEP 2: Let FilterSet handle the rest (status, dates, etc.)
        # Storefront filter in FilterSet allows narrowing to specific store
        return queryset
```

#### FilterSet Configuration:
```python
class SaleFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name='status')
    storefront = django_filters.UUIDFilter(field_name='storefront')
    # ... other filters
    
    class Meta:
        model = Sale
        fields = ['status', 'storefront', 'type', 'customer', ...]
    
    def filter_storefront(self, queryset, name, value):
        """Validate user has access to requested storefront"""
        user_storefronts = self.request.user.get_accessible_storefronts()
        if value in user_storefronts.values_list('id', flat=True):
            return queryset.filter(storefront=value)
        return queryset.none()  # No access
```

### Frontend API Additions

#### Get User's Storefronts
```typescript
// New endpoint or add to user profile
GET /api/users/me/storefronts/
Response:
{
  "storefronts": [
    { "id": "uuid-1", "name": "Cow Lane Store" },
    { "id": "uuid-2", "name": "Rawlings Park Warehouse" }
  ]
}
```

#### Filter by Storefront
```typescript
// Existing endpoint with new param
GET /sales/api/sales/?status=COMPLETED&storefront=uuid-1
```

---

## 🧪 Backend Test Commands

Run these in Django shell to isolate the issue:

### Test 1: Raw Query
```python
from sales.models import Sale

# Total sales
total = Sale.objects.count()
print(f"Total sales: {total}")  # Expected: 520

# COMPLETED sales
completed = Sale.objects.filter(status='COMPLETED').count()
print(f"COMPLETED sales: {completed}")  # Expected: 375

# DRAFT sales
draft = Sale.objects.filter(status='DRAFT').count()
print(f"DRAFT sales: {draft}")  # Expected: 33

# Check if case matters
draft_lower = Sale.objects.filter(status='draft').count()
print(f"draft (lowercase): {draft_lower}")  # Should be 0 if case-sensitive
```

### Test 2: FilterSet Test
```python
from sales.filters import SaleFilter
from sales.models import Sale
from django.http import QueryDict

# Test with COMPLETED filter
query_params = QueryDict('status=COMPLETED')
filterset = SaleFilter(query_params, queryset=Sale.objects.all())
filtered_qs = filterset.qs

print(f"Filtered count: {filtered_qs.count()}")  # Expected: 375
print(f"First result: {filtered_qs.first()}")
print(f"First status: {filtered_qs.first().status}")  # Expected: COMPLETED
```

### Test 3: Simulate API Request
```python
from django.test import RequestFactory
from sales.views import SaleViewSet

factory = RequestFactory()
request = factory.get('/sales/api/sales/?status=COMPLETED')

viewset = SaleViewSet()
viewset.request = request
queryset = viewset.get_queryset()

print(f"Queryset count: {queryset.count()}")  # Expected: 375
print(f"First sale: {queryset.first()}")
print(f"Statuses: {list(queryset.values_list('status', flat=True)[:10])}")
```

### Test 4: Check Storefront Filtering
```python
# Check user's current storefront
from django.contrib.auth import get_user_model
User = get_user_model()

user = User.objects.get(username='Mike Tetteh')  # Or appropriate user
print(f"User: {user}")
print(f"Current storefront: {user.current_storefront if hasattr(user, 'current_storefront') else 'N/A'}")

# Check sales in that storefront
if hasattr(user, 'current_storefront') and user.current_storefront:
    storefront_sales = Sale.objects.filter(storefront=user.current_storefront)
    print(f"Sales in storefront: {storefront_sales.count()}")
    print(f"Statuses: {storefront_sales.values('status').annotate(count=Count('id'))}")
```

---

## 🔍 Expected Output from Tests

### If Filter Works:
```python
# Test 1 Output:
Total sales: 520
COMPLETED sales: 375
DRAFT sales: 33

# Test 2 Output:
Filtered count: 375
First status: COMPLETED

# Test 3 Output:
Queryset count: 375
Statuses: ['COMPLETED', 'COMPLETED', 'COMPLETED', ...]
```

### If Storefront is the Issue:
```python
# Test 4 Output:
User: Mike Tetteh
Current storefront: Cow Lane Store
Sales in storefront: 26
Statuses: [{'status': 'DRAFT', 'count': 26}]  # ← Only DRAFT sales!
```

---

## 🐛 Possible Root Causes

### Hypothesis 1: Status Filter Not Implemented
```python
# WRONG - Filter not implemented
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

---

### Hypothesis 2: Storefront Filter Overriding Status
```python
# WRONG - Automatic storefront filter limits results first
def get_queryset(self):
    queryset = Sale.objects.filter(
        storefront=self.request.user.current_storefront  # Only 26 DRAFT sales!
    )
    # Status filter applied here won't help if all 26 are DRAFT
    return filterset.qs
```

**Fix:**
```python
# CORRECT - Status filter should work on full dataset
# Storefront filter should be optional and user-controlled

def get_queryset(self):
    queryset = Sale.objects.all()
    
    # Apply permission-based filtering
    # Users should only see sales from storefronts they have access to
    user_storefronts = self.request.user.get_accessible_storefronts()
    if user_storefronts:
        queryset = queryset.filter(storefront__in=user_storefronts)
    
    # Apply optional storefront filter if provided in params
    storefront_filter = self.request.query_params.get('storefront')
    if storefront_filter:
        # Validate user has access to this storefront
        if storefront_filter in [str(s.id) for s in user_storefronts]:
            queryset = queryset.filter(storefront=storefront_filter)
    
    # Status filter will be applied by FilterSet
    filterset = SaleFilter(self.request.query_params, queryset=queryset)
    return filterset.qs
```

**Business Rules:**
1. **Default Behavior:** Show all sales from storefronts user has access to
2. **Optional Filtering:** User can filter by specific storefront via `?storefront=<uuid>`
3. **Permission Check:** User must have access to storefront to filter by it
4. **Multi-Storefront Support:** Users belonging to multiple storefronts can filter by any of them
5. **Status Filter Independence:** Status filter should work regardless of storefront filter

---

### Hypothesis 3: Case Sensitivity Issue
```python
# WRONG - Case mismatch
status = request.query_params.get('STATUS')  # Uppercase
# But frontend sends: status=COMPLETED (lowercase key)
```

**Fix:**
```python
# CORRECT
status = request.query_params.get('status')  # Match frontend
```

---

### Hypothesis 4: FilterSet Field Name Mismatch
```python
# WRONG - Field name doesn't match
class SaleFilter(django_filters.FilterSet):
    sale_status = django_filters.CharFilter(field_name='status')  # Wrong name!
    
    class Meta:
        fields = ['sale_status']  # Frontend sends 'status' not 'sale_status'
```

**Fix:**
```python
# CORRECT
class SaleFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name='status')
    
    class Meta:
        fields = ['status']
```

---

## 📊 Network Tab Evidence Needed

Please check browser Network tab and provide:

1. **Request URL:**
   ```
   http://localhost:8000/sales/api/sales/?page=1&page_size=100&status=COMPLETED
   ```

2. **Request Headers:**
   ```
   Authorization: Token ...
   Content-Type: application/json
   ```

3. **Query String Parameters:**
   ```
   page: 1
   page_size: 100
   status: COMPLETED
   ```

4. **Response:**
   ```json
   {
     "count": 26,  // Why 26 and not 375?
     "next": null,
     "previous": null,
     "results": [
       {
         "status": "DRAFT",  // Why DRAFT when we asked for COMPLETED?
         ...
       }
     ]
   }
   ```

---

## ✅ Action Items for Backend Developer

### Immediate Actions:
1. [ ] Run Test 1-4 in Django shell and provide output
2. [ ] Check if `SaleFilter` exists and is configured correctly
3. [ ] Check if viewset uses `filterset_class = SaleFilter`
4. [ ] Verify `status` parameter is being read from request
5. [ ] Check if there's automatic storefront filtering
6. [ ] Check if user "Cow Lane Store" has only 26 DRAFT sales

### Investigation Questions:
1. **Does the status filter work when called directly?**
   - Run: `Sale.objects.filter(status='COMPLETED').count()`
   - Expected: 375

2. **Is FilterSet being used?**
   - Check: `SaleViewSet.filterset_class`
   - Check: `SaleViewSet.filter_backends`

3. **Is storefront auto-filtering enabled?**
   - Check: `get_queryset()` method
   - Look for: `filter(storefront=...)`

4. **What's in the user's current storefront?**
   - Check: User "Mike Tetteh" current storefront
   - Count sales: Sales in that storefront by status

### Expected Fix:
```python
# sales/views.py
from django_filters.rest_framework import DjangoFilterBackend
from .filters import SaleFilter

class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.all()
    serializer_class = SaleSerializer
    filterset_class = SaleFilter
    filter_backends = [DjangoFilterBackend]
    
    # Remove any automatic storefront filtering!
    # Status filter should work across ALL sales
```

---

## 📝 Response Template

Please provide the following information:

**1. ViewSet Configuration:**
```python
# Copy-paste your SaleViewSet class here
```

**2. FilterSet Configuration:**
```python
# Copy-paste your SaleFilter class here
```

**3. Shell Test Results:**
```python
# Run tests 1-4 and paste output here
```

**4. Current Behavior:**
```
Total sales in DB: ___
COMPLETED sales: ___
DRAFT sales: ___
Sales in Cow Lane Store: ___
Statuses in Cow Lane Store: ___
```

**5. Suspected Root Cause:**
```
Based on the tests, the issue is:
[ ] Status filter not implemented
[ ] Storefront auto-filtering limiting results
[ ] Case sensitivity issue
[ ] FilterSet misconfigured
[ ] Other: ___________
```

---

## 🔗 Related Files

**Frontend Files (for reference):**
- Filter implementation: `src/features/dashboard/components/sales/SalesHistory.tsx`
- Redux slice: `src/store/slices/salesSlice.ts`
- Service: `src/services/salesService.ts`

**Backend Files (to check):**
- Views: `sales/views.py`
- Filters: `sales/filters.py`
- Models: `sales/models.py`
- URLs: `sales/urls.py`
- Settings: `settings.py` (check `DEFAULT_FILTER_BACKENDS`)

---

## 📞 Contact

**Reported by:** Frontend Team  
**Date:** October 6, 2025  
**Priority:** HIGH  
**Impact:** Sales History page unusable - shows wrong data

**Next Steps:**
1. Backend developer runs shell tests
2. Identifies root cause
3. Implements fix
4. Frontend re-tests with fix

---

**Current Status:** 🔴 BLOCKED - Awaiting backend investigation
