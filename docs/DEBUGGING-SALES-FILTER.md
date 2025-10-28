# Frontend Sales Filter Debugging Guide

## 🔍 Step-by-Step Debugging

### Step 1: Check Browser Console

Open the browser console (F12) and look for these logs:

```javascript
🔍 ===== LOAD SALES API CALL =====
Pagination State: { page: 1, pageSize: 20, ... }
Filters State: { status: "COMPLETED" }
Raw Params: { page: 1, page_size: 20, status: "COMPLETED" }
Cleaned Query Params: { page: 1, page_size: 20, status: "COMPLETED" }
==================================

📡 salesService.listSales called with params: { page: 1, page_size: 20, status: "COMPLETED" }
📡 FULL API URL: /sales/api/sales/?page=1&page_size=20&status=COMPLETED

✅ ===== API RESPONSE =====
Count: 265
Results Length: 20
All Statuses: ["DRAFT", "DRAFT", "PENDING", ...]  <-- ❌ Should all be "COMPLETED"!
===========================
```

**What to look for:**
- ✅ `Filters State` should show `{ status: "COMPLETED" }`
- ✅ `Cleaned Query Params` should include `status: "COMPLETED"`
- ✅ `FULL API URL` should include `?status=COMPLETED`
- ❌ `All Statuses` array should ONLY contain "COMPLETED" (if backend is working)

---

### Step 2: Check Network Tab

1. Open DevTools (F12)
2. Click **Network** tab
3. Click **XHR** filter
4. Refresh the Sales History page
5. Look for request to `/sales/api/sales/`
6. Click on it

**Check Request URL:**
```
http://localhost:8000/sales/api/sales/?page=1&page_size=20&status=COMPLETED
```

**Check Query String Parameters:**
```
page: 1
page_size: 20
status: COMPLETED  <-- ✅ This should be present
```

**Check Response Preview:**
```json
{
  "count": 265,
  "results": [
    { "id": "...", "status": "DRAFT", ... },     <-- ❌ WRONG! Should be COMPLETED
    { "id": "...", "status": "PENDING", ... },   <-- ❌ WRONG! Should be COMPLETED
    { "id": "...", "status": "COMPLETED", ... }  <-- ✅ This is correct
  ]
}
```

---

### Step 3: Test Backend Directly

Run the diagnostic script:

```bash
cd /home/teejay/Documents/Projects/pos/frontend
./test-sales-filter.sh
```

Enter your auth token when prompted.

**Expected output if backend is WORKING:**
```
TEST 2: Filter by status=COMPLETED
-----------------------------------
Filtered count: 150
Statuses in results:
    150 COMPLETED        <-- ✅ All COMPLETED

📊 ANALYSIS
===========
✅ PASSED: status=COMPLETED filter is working correctly
```

**Actual output if backend is BROKEN:**
```
TEST 2: Filter by status=COMPLETED
-----------------------------------
Filtered count: 265
Statuses in results:
     50 COMPLETED        <-- ❌ Mixed statuses
    150 DRAFT
     65 PENDING

📊 ANALYSIS
===========
❌ FAILED: status=COMPLETED filter is returning other statuses!
   This confirms the backend filter is NOT working.
```

---

### Step 4: Verify Frontend Code

Check that the filter is being sent correctly:

**File:** `src/store/slices/salesSlice.ts`

Look for this console log:
```javascript
🔧 setSalesFilters called: {
  currentFilters: {},
  newFilters: { status: "COMPLETED" },
  mergedFilters: { status: "COMPLETED" }
}
```

✅ If you see this log with `status: "COMPLETED"`, frontend is working correctly.

---

## 🎯 Diagnosis Results

### Scenario A: Frontend sends `status=COMPLETED`, Backend returns mixed results
**Diagnosis:** ❌ **BACKEND BROKEN**

**Evidence:**
- ✅ Frontend state shows `{ status: "COMPLETED" }`
- ✅ Network request shows `?status=COMPLETED` in URL
- ❌ API response contains DRAFT and PENDING sales

**Solution:** Backend team needs to fix the filter (see BACKEND-FILTER-NOT-WORKING.md)

---

### Scenario B: Frontend sends NO status parameter, Backend returns all
**Diagnosis:** ❌ **FRONTEND BROKEN**

**Evidence:**
- ❌ Frontend state shows `{}` (no status)
- ❌ Network request URL has no `?status=` parameter
- ✅ API response contains all statuses (expected behavior)

**Solution:** Frontend filter not being applied properly

---

### Scenario C: Frontend sends empty string `status=`, Backend returns all
**Diagnosis:** ❌ **FRONTEND BROKEN**

**Evidence:**
- ⚠️ Frontend state shows `{ status: "" }`
- ⚠️ Network request shows `?status=` (empty value)
- ✅ API response contains all statuses (backend ignores empty filter)

**Solution:** Frontend cleaning function removing the status value

---

## 🔧 Quick Fixes

### If Frontend is the Problem:

Check the `handleStatusChange` function in SalesHistory.tsx:

```typescript
const handleStatusChange = (value: string) => {
  console.log('🎯 Status changed to:', value)  // <-- Add this log
  setSelectedStatus(value)
  dispatch(setSalesPage(1))
  dispatch(setSalesFilters({ status: value }))  // <-- Should NOT remove if value is truthy
}
```

Make sure it's NOT doing this:
```typescript
// ❌ WRONG - Don't remove status if it's empty
if (value) {
  dispatch(setSalesFilters({ status: value }))
} else {
  const { status, ...rest } = filters
  dispatch(setSalesFilters(rest))
}
```

---

### If Backend is the Problem:

The backend team needs to check `sales/views.py`:

```python
class SaleViewSet(viewsets.ModelViewSet):
    serializer_class = SaleSerializer
    filterset_class = SaleFilter  # <-- MUST be set!
    filter_backends = [DjangoFilterBackend]  # <-- MUST be set!
```

And verify in `sales/filters.py`:

```python
class SaleFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name='status')  # <-- Check field_name matches model
```

---

## 📞 Next Steps

1. **Check browser console** - Look for the logs above
2. **Check Network tab** - Verify the request URL includes `?status=COMPLETED`
3. **Run diagnostic script** - Test backend directly
4. **Share results** - Determine if it's frontend or backend issue

---

**If backend is broken:** Share `BACKEND-FILTER-NOT-WORKING.md` with backend team  
**If frontend is broken:** Check the filter state and handlers in SalesHistory component
