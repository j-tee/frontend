# 📋 Sales Filter Issue - Complete Documentation Package

## For Backend Developer

**Priority:** 🔴 HIGH  
**Component:** Sales API  
**Status:** BLOCKED - Frontend cannot proceed without backend fix

---

## 📚 Documentation Files

### 1. **Main Investigation Guide** ⭐
**File:** [`BACKEND-SALES-FILTER-ISSUE.md`](./BACKEND-SALES-FILTER-ISSUE.md)

Complete technical documentation including:
- Detailed issue description
- Frontend evidence (console logs, UI behavior)
- Backend investigation checklist
- Test commands for Django shell
- Possible root causes with fixes
- Expected vs actual behavior

👉 **Start here for full context**

---

### 2. **Quick Reference Card** ⚡
**File:** [`BACKEND-SALES-FILTER-QUICK-REF.md`](./BACKEND-SALES-FILTER-QUICK-REF.md)

One-page summary including:
- Problem statement
- Quick shell tests (3 commands)
- Most likely causes
- Action items checklist

👉 **Use this for quick diagnosis**

---

### 3. **Diagnostic Script** 🔧
**File:** [`diagnose_sales_filter.py`](./diagnose_sales_filter.py)

Automated diagnostic script that:
- Checks database counts
- Tests status filtering
- Verifies FilterSet configuration
- Checks user/storefront context
- Simulates API request
- Provides summary of issues found

**How to run:**
```bash
cd /path/to/backend
python manage.py shell < docs/diagnose_sales_filter.py
```

👉 **Run this first to get automated diagnosis**

---

## 🚨 Issue Summary

### The Problem
API endpoint `/sales/api/sales/` ignores the `status` query parameter and always returns the same 26 DRAFT sales.

### Visual Evidence
```
Filter: status=COMPLETED → Returns: 26 DRAFT sales ❌
Filter: status=PENDING   → Returns: 26 DRAFT sales ❌  
Filter: status=REFUNDED  → Returns: 26 DRAFT sales ❌
```

### Frontend is Correct
```javascript
// Frontend sends:
GET /sales/api/sales/?status=COMPLETED&page=1&page_size=100

// Backend returns:
{ count: 26, results: [all DRAFT sales] }  ❌
```

---

## 🎯 Most Likely Root Cause

**Hypothesis:** User's current storefront ("Cow Lane Store") has only 26 sales, all DRAFT.

Backend is auto-filtering by storefront BEFORE applying status filter:

```python
def get_queryset(self):
    # This limits to 26 sales first (all DRAFT)
    queryset = Sale.objects.filter(
        storefront=self.request.user.current_storefront
    )
    # Then status filter can't work because all 26 are DRAFT
    return queryset
```

**Evidence:**
- Database has 375 COMPLETED sales total
- API returns only 26 sales
- All 26 are DRAFT
- Count doesn't change regardless of status filter

---

## ✅ Quick Verification (3 Commands)

Run in Django shell:

```python
# 1. Does filtering work?
from sales.models import Sale
Sale.objects.filter(status='COMPLETED').count()
# Expected: 375

# 2. Check user's storefront
from django.contrib.auth import get_user_model
user = get_user_model().objects.get(username='Mike Tetteh')
Sale.objects.filter(storefront=user.current_storefront).count()
# If this is 26, that's the issue!

# 3. All DRAFT?
Sale.objects.filter(
    storefront=user.current_storefront, 
    status='DRAFT'
).count()
# If this is 26, confirmed!
```

---

## 🔧 Expected Fix

### Current (WRONG):
```python
class SaleViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        # Auto-filter by user's storefront
        return Sale.objects.filter(
            storefront=self.request.user.current_storefront
        )
```

### Fixed (CORRECT):
```python
class SaleViewSet(viewsets.ModelViewSet):
    filterset_class = SaleFilter
    filter_backends = [DjangoFilterBackend]
    
    def get_queryset(self):
        # Don't auto-filter by storefront
        # Let frontend request it via query param if needed
        return Sale.objects.all()
```

OR if storefront filtering is required:

```python
class SaleViewSet(viewsets.ModelViewSet):
    filterset_class = SaleFilter
    filter_backends = [DjangoFilterBackend]
    
    def get_queryset(self):
        queryset = Sale.objects.all()
        
        # Apply storefront filter ONLY if explicitly requested
        storefront = self.request.query_params.get('storefront')
        if storefront:
            queryset = queryset.filter(storefront=storefront)
        
        # Status filter will be applied by FilterSet
        return queryset
```

---

## 📋 Action Steps

### For Backend Developer:

1. **Run diagnostic script:**
   ```bash
   python manage.py shell < docs/diagnose_sales_filter.py
   ```

2. **Review output** - it will identify the issue

3. **Check files:**
   - `sales/views.py` - Check `SaleViewSet.get_queryset()`
   - `sales/filters.py` - Verify `SaleFilter` has `status` field
   - Look for automatic storefront filtering

4. **Apply fix** based on diagnostic results

5. **Test fix:**
   ```bash
   # In shell:
   from sales.views import SaleViewSet
   from django.test import RequestFactory
   
   request = RequestFactory().get('/?status=COMPLETED')
   viewset = SaleViewSet()
   viewset.request = request
   qs = viewset.get_queryset()
   
   print(qs.count())  # Should be 375
   print(qs.first().status)  # Should be COMPLETED
   ```

6. **Notify frontend** - Fix is deployed, test again

---

## 📊 Expected Results After Fix

### API Call:
```http
GET /sales/api/sales/?status=COMPLETED
```

### Response:
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

### Frontend Display:
```
Receipt #: REC-202510-10009  |  Amount: $7.40   |  Status: COMPLETED
Receipt #: REC-202510-10008  |  Amount: $120.00 |  Status: COMPLETED
Receipt #: REC-202510-10007  |  Amount: $45.50  |  Status: COMPLETED
...
```

---

## 📞 Communication

### To Backend Developer:

> Hi Backend Team,
> 
> The Sales History page is broken because the status filter isn't working on `/sales/api/sales/` endpoint.
> 
> **Issue:** Regardless of `?status=COMPLETED`, `?status=PENDING`, etc., the API always returns the same 26 DRAFT sales.
> 
> **Suspected cause:** Auto-filtering by user's current storefront before applying status filter.
> 
> **Please:**
> 1. Run the diagnostic script: `python manage.py shell < docs/diagnose_sales_filter.py`
> 2. Check if Cow Lane Store has only 26 DRAFT sales
> 3. Remove automatic storefront filtering from `get_queryset()`
> 4. Ensure `SaleFilter` is applied via `filterset_class`
> 
> **Documentation:**
> - Full details: `docs/BACKEND-SALES-FILTER-ISSUE.md`
> - Quick ref: `docs/BACKEND-SALES-FILTER-QUICK-REF.md`
> - Diagnostic: `docs/diagnose_sales_filter.py`
> 
> Let me know the diagnostic results!

---

## 🔗 Related Frontend Files

For context, here's what frontend is doing:

**Component:** `src/features/dashboard/components/sales/SalesHistory.tsx`
```typescript
// Sets filter
dispatch(setSalesFilters({ status: 'COMPLETED' }))
```

**Redux Slice:** `src/store/slices/salesSlice.ts`
```typescript
// Builds query params
const queryParams = {
  page: 1,
  page_size: 20,
  ...salesFilters,  // { status: 'COMPLETED' }
}
```

**Service:** `src/services/salesService.ts`
```typescript
// Makes API call
const response = await httpClient.get('/sales/api/sales/', { 
  params: queryParams 
})
```

Frontend is correctly sending the status parameter. Backend is not respecting it.

---

## ✅ Success Criteria

Fix is complete when:

- [ ] `?status=COMPLETED` returns 375 COMPLETED sales
- [ ] `?status=PENDING` returns 91 PENDING sales
- [ ] `?status=DRAFT` returns 33 DRAFT sales
- [ ] Frontend displays real sales (not N/A, $0.00)
- [ ] Filter changes update results correctly
- [ ] Diagnostic script shows no warnings

---

**Date:** October 6, 2025  
**Reported by:** Frontend Team  
**Assigned to:** Backend Team  
**Status:** 🔴 BLOCKED - Awaiting backend fix  
**Estimated fix time:** 30 minutes  

---

## 📝 Backend Response Template

Please fill this out after investigation:

**Diagnostic Results:**
```
[Paste output of diagnose_sales_filter.py here]
```

**Root Cause:**
```
The issue was: ___________
```

**Fix Applied:**
```python
# Paste the fix here
```

**Test Results:**
```
Sale.objects.filter(status='COMPLETED').count() = ___
API with ?status=COMPLETED returns count = ___
First result status = ___
```

**Status:** [ ] Fixed [ ] In Progress [ ] Blocked

---

**All documentation files are in:** `docs/` folder  
**Start with:** Run `diagnose_sales_filter.py` script
