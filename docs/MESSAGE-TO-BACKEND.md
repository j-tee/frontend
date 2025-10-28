# Message to Backend Developer

---

**Subject:** Sales API Filter Not Working - Investigation Needed

---

Hi Backend Team,

I need your help investigating an issue with the Sales API. The status filter on `/sales/api/sales/` endpoint is not working correctly.

## 🚨 The Problem

No matter what `status` parameter we send, the API always returns the same 26 DRAFT sales.

**Examples:**
- `GET /sales/api/sales/?status=COMPLETED` → Returns 26 DRAFT sales ❌
- `GET /sales/api/sales/?status=PENDING` → Returns same 26 DRAFT sales ❌
- `GET /sales/api/sales/?status=REFUNDED` → Returns same 26 DRAFT sales ❌

We've confirmed the frontend is sending the parameters correctly. The console shows:
```javascript
Query Params: { page: 1, page_size: 100, status: "COMPLETED" }
Response: { count: 26, results: [all DRAFT] }
```

## 🔍 Quick Diagnosis

I've created a diagnostic script. Please run:

```bash
python manage.py shell < docs/diagnose_sales_filter.py
```

This will automatically check:
- ✅ If database has COMPLETED sales (should be ~375)
- ✅ If filtering works at the model level
- ✅ If FilterSet is configured correctly
- ✅ If viewset is applying filters
- ✅ If user's storefront is limiting results
- ✅ Simulated API request

## 🎯 Suspected Cause

I suspect the user's current storefront ("Cow Lane Store") might only have 26 sales, all DRAFT. If the backend is auto-filtering by storefront before applying the status filter, that would explain why we always see the same results.

**Hypothesis:**
```python
# Current (probably)
def get_queryset(self):
    # This limits to 26 sales first
    return Sale.objects.filter(storefront=request.user.current_storefront)
    # Status filter can't work if all 26 are DRAFT
```

**Expected:**
```python
# Should be
def get_queryset(self):
    # Let FilterSet handle status filtering
    return Sale.objects.all()
```

## 📚 Documentation

I've prepared complete documentation in the `docs/` folder:

1. **[BACKEND-INVESTIGATION-README.md](./BACKEND-INVESTIGATION-README.md)** - Start here
2. **[diagnose_sales_filter.py](./diagnose_sales_filter.py)** - Automated diagnostic script
3. **[BACKEND-SALES-FILTER-ISSUE.md](./BACKEND-SALES-FILTER-ISSUE.md)** - Full technical details
4. **[BACKEND-SALES-FILTER-QUICK-REF.md](./BACKEND-SALES-FILTER-QUICK-REF.md)** - Quick reference

## ✅ Next Steps

1. Run the diagnostic script
2. Share the output with me
3. We'll identify the root cause together
4. Apply the fix
5. I'll test from the frontend

## 🕐 Expected Results After Fix

When we call `GET /sales/api/sales/?status=COMPLETED`, we should get:
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

Instead of:
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

## 📞 Questions?

Let me know if you need any clarification or have questions about the diagnostic script or documentation.

Thanks for looking into this!

---

**Priority:** HIGH  
**Impact:** Sales History page is currently unusable  
**Blocking:** Frontend development  

---

## Quick Links

- 📋 [Investigation README](./BACKEND-INVESTIGATION-README.md)
- 🔧 [Diagnostic Script](./diagnose_sales_filter.py)
- 📖 [Full Technical Details](./BACKEND-SALES-FILTER-ISSUE.md)
- ⚡ [Quick Reference](./BACKEND-SALES-FILTER-QUICK-REF.md)
