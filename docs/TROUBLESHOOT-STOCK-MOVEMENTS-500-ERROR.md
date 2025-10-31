# 🔧 Troubleshooting: Stock Movements 500 Error

**Issue:** Stock Movement History page shows "Error Loading Report - Request failed with status code 500"

**Date:** October 31, 2025  
**Status:** 🔴 **Backend Error - Needs Investigation**

---

## 🔍 Quick Diagnosis

The error is **on the backend**, not the frontend. The frontend integration is correct, but the backend API is returning a 500 error.

**Endpoint:** `GET /reports/api/inventory/movements/`  
**Error:** HTTP 500 Internal Server Error  
**Expected:** HTTP 200 OK with JSON response

---

## ✅ What to Check

### **1. Is Backend Running?**

```bash
# Check if backend is running
curl http://localhost:8000/api/health  # or whatever health check endpoint exists

# Expected: 200 OK
# If fails: Start backend server
```

**If backend is not running:**
```bash
cd ~/Documents/Projects/pos/backend
source venv/bin/activate
python manage.py runserver
```

---

### **2. Are Priority 1 Changes Deployed?**

The backend developer completed Priority 1 tasks today. Check if they're deployed:

```bash
# Test the endpoint directly
curl "http://localhost:8000/reports/api/inventory/movements/?page=1&page_size=5" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  | jq '.'
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "movements": [...],
    "summary": {...}
  },
  "meta": {
    "pagination": {...}
  }
}
```

**If 500 error:** Backend code has a bug

---

### **3. Check Backend Logs**

Look for error details in backend logs:

```bash
# Backend terminal should show error traceback
# Look for something like:

# ERROR: Exception in view StockMovementHistoryReportView
# Traceback:
#   File "inventory_reports.py", line XXX
#   AttributeError: 'NoneType' object has no attribute 'id'
```

**Common Issues:**
- `AttributeError`: Missing field in MovementTracker response
- `KeyError`: Expected field not present in movement dict
- `TypeError`: Wrong data type (e.g., expecting UUID, got string)

---

### **4. Check Database**

Verify movements exist:

```bash
# Django shell
python manage.py shell

# Check if movements exist
>>> from inventory.models import StockAdjustment
>>> from sales.models import Sale
>>> 
>>> StockAdjustment.objects.count()  # Should be > 0
>>> Sale.objects.filter(status='COMPLETED').count()  # Should be > 0
```

**If no movements:** Create test data first

---

## 🐛 Known Issues & Fixes

### **Issue 1: MovementTracker not providing warehouse_id**

**Error in backend logs:**
```python
KeyError: 'warehouse_id'
```

**Fix:** Backend needs to update MovementTracker to include warehouse UUIDs
```python
# In movement_tracker.py
movements.append({
    'warehouse_id': str(adjustment.warehouse.id),  # ← Add this
    'warehouse_name': adjustment.warehouse.name,
})
```

---

### **Issue 2: reference_id not resolved**

**Error in backend logs:**
```python
AttributeError: 'dict' object has no attribute 'sale_id'
```

**Fix:** Backend needs to verify `_resolve_reference_id()` is working
```python
# In inventory_reports.py
def _build_movements(self, raw_movements):
    for movement in raw_movements:
        reference_id = self._resolve_reference_id(movement)  # ← Should work
```

---

### **Issue 3: Pagination not implemented**

**Error in backend logs:**
```python
TypeError: 'MovementTracker' object is not subscriptable
```

**Fix:** Backend needs to implement paginated methods
```python
# Should use:
movements = MovementTracker.get_movements_paginated(filters, offset, limit)

# Not:
movements = MovementTracker.get_movements(filters)[offset:limit]  # ← Wrong
```

---

## 🚀 Quick Workaround (Frontend)

While backend fixes the issue, you can add better error handling:

**Option 1: Show More Detailed Error**
```typescript
// In StockMovementsPage.tsx
catch (err) {
  const errorMessage = err.response?.data?.message || err.message || 'Unknown error';
  const errorDetail = err.response?.data?.detail || '';
  
  setError(`Backend Error: ${errorMessage}${errorDetail ? '\n' + errorDetail : ''}`);
  console.error('Full error:', err.response?.data);
}
```

**Option 2: Add Retry with Delay**
```typescript
const fetchData = async (retryCount = 0) => {
  try {
    // ... existing fetch code
  } catch (err) {
    if (retryCount < 3) {
      setTimeout(() => fetchData(retryCount + 1), 2000);
    } else {
      setError('Backend unavailable. Please contact support.');
    }
  }
};
```

**Option 3: Mock Data for Development**
```typescript
// Temporarily use mock data if backend fails
if (process.env.NODE_ENV === 'development' && error?.response?.status === 500) {
  setData(mockStockMovements);
  setError(null);
}
```

---

## 📞 What to Tell Backend Team

Send this to backend developer:

> **Stock Movements API Returning 500 Error**
>
> **Endpoint:** `GET /reports/api/inventory/movements/`  
> **Error:** HTTP 500 Internal Server Error  
> **Frontend Status:** Integration complete, waiting for backend fix
>
> **Request Details:**
> ```
> GET /reports/api/inventory/movements/?start_date=2025-10-01&end_date=2025-10-30&page=1&page_size=20
> ```
>
> **Please check:**
> 1. Are Priority 1 changes deployed to your local/dev server?
> 2. Any errors in backend logs/console?
> 3. Do movements exist in database?
> 4. Is MovementTracker providing warehouse_id and reference_id correctly?
>
> **Frontend is ready** - just need backend API to work!

---

## ✅ Verification After Backend Fix

Once backend is fixed, test:

```bash
# 1. API should return 200
curl "http://localhost:8000/reports/api/inventory/movements/" -I
# HTTP/1.1 200 OK

# 2. Response should have correct structure
curl "http://localhost:8000/reports/api/inventory/movements/?page_size=2" | jq '.data.movements[0]'
# Should show: reference_id, warehouse_id, movement_type, etc.

# 3. Frontend should load
# Open http://localhost:5173/app/reports/inventory/stock-movements
# Should show: movements table, summary cards, filters
```

---

## 🎯 Next Steps

1. **Contact Backend Developer:**
   - Show them this error
   - Ask for backend logs
   - Verify Priority 1 deployment status

2. **Check Backend Status:**
   - Is server running?
   - Are migrations applied?
   - Is test data available?

3. **Wait for Fix:**
   - Backend needs to resolve 500 error
   - Frontend integration is complete and ready

4. **Test After Fix:**
   - Refresh page
   - Click on movement references
   - Verify navigation works

---

**Summary:** The frontend integration is **complete and working**. The error is on the backend API. Contact backend team to investigate the 500 error and deploy the Priority 1 fixes.

**Status:** 🟡 **Waiting for Backend Fix**  
**Frontend:** ✅ Ready  
**Backend:** ❌ Needs debugging
