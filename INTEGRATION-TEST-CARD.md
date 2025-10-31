# 🎯 Movement Details Integration - Quick Test Card

**Status:** ✅ READY FOR TESTING  
**Date:** October 31, 2025

---

## ⚡ 3-Minute Integration Test

### **Prerequisites**
- ✅ Backend server running on `http://localhost:8000`
- ✅ Frontend dev server running (usually `http://localhost:5173`)
- ✅ Logged in user with `SALES_VIEW` and `INVENTORY_VIEW` permissions

---

### **Test 1: Sale Details** (60 seconds)

1. Navigate to: `/app/reports/stock-movements`
2. Filter: Reference Type = "Sale"
3. Click any sale reference
4. **Verify Modal Shows:**
   - ✅ Sale number, date, warehouse, customer
   - ✅ Items table with products
   - ✅ Quantities, prices, totals
   - ✅ **NEW:** Tax column (if data present)
   - ✅ **NEW:** Profit column with green/red color (if data present)
   - ✅ Total amount at bottom
5. Close modal
6. **Result:** ✅ PASS / ❌ FAIL

---

### **Test 2: Transfer Details** (60 seconds)

1. Filter: Reference Type = "Transfer"
2. Click any transfer reference
3. **Verify Modal Shows:**
   - ✅ Transfer number, date, status, created by
   - ✅ From → To warehouse flow diagram
   - ✅ Items table
   - ✅ **NEW:** Supplier column (if data present)
   - ✅ **NEW:** Cost column (if data present)
   - ✅ Notes section (if present)
4. Close modal
5. **Result:** ✅ PASS / ❌ FAIL

---

### **Test 3: Adjustment Details** (60 seconds)

1. Filter: Reference Type = "Adjustment"
2. Click any adjustment reference
3. **Verify Modal Shows:**
   - ✅ Adjustment number, type, reason, date
   - ✅ Warehouse, created by
   - ✅ Items table with Before/After/Change
   - ✅ **NEW:** Warehouse column per item (if data present)
   - ✅ Green "+2" for increases, red "-3" for decreases
   - ✅ Notes section (if present)
4. Close modal
5. **Result:** ✅ PASS / ❌ FAIL

---

## 🔍 Browser Console Check

**Open DevTools (F12) → Console Tab**

**Expected (Success):**
```
✅ No errors
✅ No warnings
✅ API calls return 200 OK
```

**Failure Signs:**
```
❌ "Cannot read property 'map' of undefined"
❌ "items_detail is not defined"
❌ 404 Not Found on API calls
❌ 500 Internal Server Error
```

---

## 📝 Quick API Verification

```bash
# Replace YOUR_TOKEN with actual auth token

# Test Sale endpoint
curl "http://localhost:8000/sales/api/sales/{sale_id}/" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.items_detail[0]'

# Expected output includes: tax, profit fields
# {"product_name": "...", "quantity": 2, "tax": 80.00, "profit": 150.00, ...}

# Test Transfer endpoint
curl "http://localhost:8000/inventory/api/transfers/{transfer_id}/" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.items_detail[0]'

# Expected output includes: supplier, cost fields
# {"product_name": "...", "quantity": 5, "supplier": "...", "cost": 12.50}

# Test Adjustment endpoint
curl "http://localhost:8000/inventory/api/stock-adjustments/{adjustment_id}/" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.items_detail[0]'

# Expected output includes: warehouse_name, direction fields
# {"product_name": "...", "warehouse_name": "...", "adjustment": 2, "direction": "increase"}
```

---

## ✅ Quick Pass/Fail Criteria

| Test | Criteria | Result |
|------|----------|--------|
| Sale Modal | Opens, shows items with optional tax/profit columns | [ ] |
| Transfer Modal | Opens, shows items with optional supplier/cost columns | [ ] |
| Adjustment Modal | Opens, shows items with optional warehouse column | [ ] |
| Color Coding | Profit green/red, adjustments green/red | [ ] |
| No Crashes | Modal opens/closes without errors | [ ] |
| Console Clean | No TypeScript or React errors | [ ] |

**Overall:** [ ] ✅ PASS  /  [ ] ❌ FAIL

---

## 🚨 If Tests Fail

### **Modal Doesn't Open**
- Check: Backend API endpoints exist (`/sales/api/sales/{id}/`, etc.)
- Check: `reference_id` in movements API is correct
- Check: User has proper permissions

### **Enhanced Columns Missing**
- Check: Backend returns `items_detail` (not just `items`)
- Check: Enhanced fields (tax, profit, supplier, cost) present in API response
- Run curl commands above to verify

### **React Errors in Console**
- Check: `items_detail` is an array (not null/undefined)
- Check: All items in array have required fields (`product_name`, `quantity`, etc.)
- Verify: Frontend safety checks working

### **Table Layout Broken**
- Check: Browser zoom at 100%
- Check: No CSS conflicts
- Check: Responsive design working (resize browser)

---

## 📞 Support

**Frontend Code:**
- File: `src/features/reports/components/MovementDetailModal.tsx`
- Lines: ~476 total
- Status: ✅ 0 TypeScript errors

**Backend Endpoints:**
- Sale: `GET /sales/api/sales/{id}/`
- Transfer: `GET /inventory/api/transfers/{id}/`
- Adjustment: `GET /inventory/api/stock-adjustments/{id}/`

**Documentation:**
- Full spec: `BACKEND-API-REQUIREMENTS-FOR-MOVEMENT-DETAILS.md`
- Integration guide: `BACKEND-FRONTEND-INTEGRATION-COMPLETE.md`
- Adjustment verification: `BACKEND-ADJUSTMENT-ITEMS-VERIFICATION.md`

---

## 🎯 Expected Test Duration

- **Quick Test:** 3 minutes (all 3 transaction types)
- **Thorough Test:** 15 minutes (includes edge cases, error scenarios)
- **Full QA:** 30 minutes (includes API verification, multiple records, console checks)

---

**Test Completed:** __________ (Date/Time)  
**Tested By:** __________  
**Result:** [ ] ✅ PASS  /  [ ] ❌ FAIL  
**Notes:** ________________________________________

---

**Version:** 1.0  
**Last Updated:** October 31, 2025
