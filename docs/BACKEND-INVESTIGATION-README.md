# Sales Filter Not Working - Backend Investigation Required

## 🚨 Quick Start

**Backend Developer:** Run this command first:

```bash
python manage.py shell < docs/diagnose_sales_filter.py
```

This will automatically diagnose the issue and show you what's wrong.

---

## 📚 Documentation Files

| File | Purpose | Use When |
|------|---------|----------|
| **[BACKEND-SALES-FILTER-PACKAGE.md](./BACKEND-SALES-FILTER-PACKAGE.md)** | Master index | Start here - overview of all docs |
| **[BACKEND-SALES-FILTER-ISSUE.md](./BACKEND-SALES-FILTER-ISSUE.md)** | Full technical details | Need complete context |
| **[BACKEND-SALES-FILTER-QUICK-REF.md](./BACKEND-SALES-FILTER-QUICK-REF.md)** | One-page summary | Need quick reference |
| **[diagnose_sales_filter.py](./diagnose_sales_filter.py)** | Automated diagnostic | Run first to identify issue |

---

## 🎯 The Issue

**API Endpoint:** `/sales/api/sales/`  
**Problem:** Status filter (`?status=COMPLETED`) is being ignored  
**Result:** Always returns same 26 DRAFT sales

**Evidence:**
```
?status=COMPLETED → 26 DRAFT sales ❌
?status=PENDING   → 26 DRAFT sales ❌
?status=REFUNDED  → 26 DRAFT sales ❌
```

---

## 🔍 Most Likely Cause

User's current storefront has only 26 sales (all DRAFT). Backend is auto-filtering by storefront before applying status filter.

**Fix:** Remove automatic storefront filtering from `get_queryset()` or apply it AFTER status filter.

---

## ✅ Quick Fix Verification

```python
# In Django shell:
from sales.models import Sale

# Should return 375, not 26
Sale.objects.filter(status='COMPLETED').count()
```

If this returns 375 but API returns 26, it's a storefront filtering issue.

---

## 📋 Action Items

1. Run `diagnose_sales_filter.py` 
2. Read output and identify root cause
3. Apply fix (usually in `sales/views.py`)
4. Test: Call API with `?status=COMPLETED`
5. Verify: Response count should be 375

---

## 📞 Contact

**Reported by:** Frontend Team  
**Date:** October 6, 2025  
**Priority:** HIGH  
**Impact:** Sales History page unusable
