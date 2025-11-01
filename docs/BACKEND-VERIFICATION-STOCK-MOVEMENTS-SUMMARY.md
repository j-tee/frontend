# 🔍 Backend Verification Request - Stock Movements Summary Statistics

**Date:** November 1, 2025  
**Priority:** ~~CRITICAL~~ → ✅ RESOLVED  
**Requested By:** Frontend Team  
**Purpose:** ~~Verify if October 31 backend fix is working correctly AND clarify system architecture~~ → **CLARIFIED**  
**Status:** ✅ **RESOLVED - Architecture Clarified, UI Labels Updated**

---

## 🎉 RESOLUTION

**Answer Received:** StockProduct (purchases) do **NOT** create movement records - this is **intentional design**.

**Action Taken:** Frontend updated UI labels to clarify the two-system architecture (Scenario A implemented).

**Result:** User confusion eliminated. Backend working as designed. No bug fix needed.

**Implementation:** See `STOCK-MOVEMENTS-UI-CLARIFICATION-COMPLETE.md`

---

## 🚨 CRITICAL CLARIFICATION NEEDED

**The Core Question:** Do StockProduct entries (purchases/intakes) create movement records?

### **Observed Data (October 2025):**
- **StockProduct records (purchases):** 271 entries ✅
- **MovementTracker `total_in`:** 0 ❌ (or is this correct?)
- **Sales records:** 55 entries
- **Transfer records:** 4 entries

### **Two Possible Scenarios:**

#### **Scenario A: StockProduct Does NOT Create Movements (Current System?)**
```
inventory_stockproduct: 271 records
   ↓
   Does NOT create movement records
   ↓
MovementTracker only queries:
   - sales_sale (outbound)
   - inventory_transfer (relocations)
   - inventory_stockadjustment (corrections)
   ↓
Result: total_in = 0 ✅ CORRECT (no transfers in, no positive adjustments)
```

**If this is true:**
- ✅ System is working as designed
- ✅ `total_in: 0` is accurate
- ❌ Frontend labels are misleading (users expect purchases to show as "Stock In")
- 📝 Solution: Frontend labeling update, not backend fix

#### **Scenario B: StockProduct SHOULD Create Movements (Expected System?)**
```
inventory_stockproduct: 271 records
   ↓
   SHOULD create movement records with movement_type='in'
   ↓
MovementTracker queries should include purchase subquery
   ↓
Result: total_in = 271 ✅ (or at least > 0)
```

**If this is true:**
- ❌ System is broken (purchases not creating movements)
- ❌ Data pipeline issue (271 missing movement records)
- 🔧 Solution: Backend code fix + data migration

---

## 📋 Executive Summary

The backend team deployed a fix on **October 31, 2025** to resolve summary statistics showing zeros. We need **backend verification using actual database queries and API calls** to confirm:

1. ✅ The fix is properly deployed and active
2. ✅ Real movement data exists in the database
3. ✅ API is correctly calculating and returning summary counts
4. ✅ Frontend expectations align with backend implementation
5. ⚠️ **CRITICAL:** Clarify if StockProduct (purchases) should create movement records

**Frontend marked this as FIXED based on backend team notification, but user reports suggest Stock In still shows 0.**

**User's Confusion:** "I see 271 stock intake records in Stock Items table, but Stock In shows 0 on Movements page"

---

## 🚨 Current Challenge

### **User Report (November 1, 2025):**
> "In the screenshot are stock intakes with 'some nice product' being the latest intake. So I am expecting Stock In to read some value"

### **Observed Behavior:**
- User can see stock intake records in **Stock Items** table
- User expects **Stock Movements** summary to show Stock In > 0
- Unclear if this is:
  - ❌ Backend fix not deployed yet
  - ❌ Date range filter issue (intake outside selected period)
  - ❌ Data model mismatch (Stock Items ≠ Stock Movements)
  - ❌ API returning wrong data structure

### **Documentation Status:**
- `BACKEND-BUG-STOCK-MOVEMENTS-SUMMARY.md` marked as ✅ FIXED on Oct 31
- No actual data verification performed
- Frontend cannot access backend database directly

---

## 🎯 Verification Required

### **Phase 0: CRITICAL ARCHITECTURE CLARIFICATION** ⚠️

**FIRST: Answer this question before running any queries:**

**Q:** Does the `inventory_stockproduct` table create records in a movements tracking table?

**Expected Answer:** YES / NO

If **NO**: Please proceed to Phase 1-3 to verify fix is working correctly (and we'll update frontend labels)

If **YES**: Please run this additional query to check the data pipeline:

```sql
-- Check if StockProduct entries create movement records
SELECT 
    sp.id as stockproduct_id,
    sp.product_id,
    sp.quantity,
    sp.created_at as intake_date,
    sm.id as movement_id,
    sm.movement_type,
    sm.reference_type
FROM inventory_stockproduct sp
LEFT JOIN stock_movements sm ON (
    sm.reference_type = 'purchase_order' 
    AND sm.reference_id = sp.id
)
WHERE sp.created_at >= '2025-10-01' 
  AND sp.created_at < '2025-11-01'
ORDER BY sp.created_at DESC
LIMIT 20;

-- Count totals
SELECT 
    COUNT(DISTINCT sp.id) as total_stockproduct_records,
    COUNT(DISTINCT sm.id) as total_movement_records_created
FROM inventory_stockproduct sp
LEFT JOIN stock_movements sm ON (
    sm.reference_type = 'purchase_order' 
    AND sm.reference_id = sp.id
)
WHERE sp.created_at >= '2025-10-01' 
  AND sp.created_at < '2025-11-01';
```

**Expected Results:**

**If StockProduct creates movements:**
```
total_stockproduct_records:        271
total_movement_records_created:    271 ✅
```

**If StockProduct does NOT create movements:**
```
total_stockproduct_records:        271
total_movement_records_created:    0 ✅ (this is correct!)
```

---

### **Phase 1: Database-Level Verification**

**Please run these SQL queries against the production database:**

```sql
-- Query 0: CHECK STOCKPRODUCT COUNT (for comparison)
SELECT COUNT(*) as total_stockproduct_intakes
FROM inventory_stockproduct
WHERE created_at >= '2025-10-01' 
  AND created_at < '2025-11-01';

-- Query 1: Check if Stock Movements exist at all
SELECT COUNT(*) as total_movements 
FROM stock_movements;

-- Query 2: Breakdown by movement_type (direction)
SELECT 
    movement_type,
    COUNT(*) as count
FROM stock_movements
GROUP BY movement_type
ORDER BY count DESC;

-- Query 3: Breakdown by reference_type (transaction type)
SELECT 
    reference_type,
    COUNT(*) as count
FROM stock_movements
GROUP BY reference_type
ORDER BY count DESC;

-- Query 4: Recent movements (last 7 days)
SELECT 
    movement_type,
    reference_type,
    COUNT(*) as count,
    DATE(created_at) as date
FROM stock_movements
WHERE created_at >= NOW() - INTERVAL 7 DAY
GROUP BY movement_type, reference_type, DATE(created_at)
ORDER BY date DESC, count DESC;

-- Query 5: October 2025 movements (the period we've been testing)
SELECT 
    movement_type,
    COUNT(*) as count
FROM stock_movements
WHERE created_at >= '2025-10-01' 
  AND created_at < '2025-11-01'
GROUP BY movement_type;

-- Query 6: November 2025 movements (current month)
SELECT 
    movement_type,
    reference_type,
    COUNT(*) as count
FROM stock_movements
WHERE created_at >= '2025-11-01'
GROUP BY movement_type, reference_type;
```

**Expected Results:**
- **Query 0:** Should return 271 (user confirmed this many StockProduct records exist)
- **Query 1:** If > 0, movements table has data
- If Stock Movements table is empty → No data to display (Stock In: 0 is correct)
- If movements exist with `movement_type = 'in'` → Stock In should show count
- If all movements are from previous months → Stock In: 0 is correct for current date range
- **CRITICAL:** If Query 0 shows 271 but Query 1 shows 0 → Data pipeline issue (purchases not creating movements)

---

### **Phase 2: API-Level Verification**

**Please test the actual API endpoint with these curl commands:**

#### **Test 1: October 2025 (Historical Data)**
```bash
# Test the period we've been using in documentation
curl -X GET "http://localhost:8000/reports/api/inventory/movements/?start_date=2025-10-01&end_date=2025-10-31" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq '.'

# Focus on summary section:
curl -X GET "http://localhost:8000/reports/api/inventory/movements/?start_date=2025-10-01&end_date=2025-10-31" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq '.data.summary'
```

**Expected Response Structure:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_movements": 46,           // Or actual count
      "total_in": 20,                  // Count of movement_type='in'
      "total_out": 22,                 // Count of movement_type='out'
      "total_adjustments": 4,          // Count of reference_type='adjustment'
      "total_transfers": 4,            // Count of reference_type='transfer'
      "total_units_in": 1250.0,        // Optional: sum of quantities
      "total_units_out": 980.0         // Optional: sum of quantities
    },
    "movements": [...]
  }
}
```

#### **Test 2: November 2025 (Current Month)**
```bash
# Test current month to see if recent intakes appear
curl -X GET "http://localhost:8000/reports/api/inventory/movements/?start_date=2025-11-01&end_date=2025-11-30" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq '.data.summary'
```

#### **Test 3: Last 7 Days (Recent Activity)**
```bash
# Calculate dates dynamically or use specific dates
curl -X GET "http://localhost:8000/reports/api/inventory/movements/?start_date=2025-10-25&end_date=2025-11-01" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq '.data.summary'
```

#### **Test 4: No Date Filter (All Time)**
```bash
# See if API works without date filters
curl -X GET "http://localhost:8000/reports/api/inventory/movements/" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq '.data.summary'
```

---

### **Phase 3: Stock Items vs Stock Movements Clarification**

**Critical Question:** Are "stock intakes" the user sees actually creating Stock Movement records?

#### **Scenario A: Purchase Orders**
```sql
-- Check if purchase orders create stock movements
SELECT 
    po.id as purchase_order_id,
    po.created_at as po_date,
    sm.id as movement_id,
    sm.movement_type,
    sm.reference_type,
    sm.created_at as movement_date
FROM purchase_orders po
LEFT JOIN stock_movements sm ON (
    sm.reference_type = 'purchase_order' 
    AND sm.reference_id = po.id
)
WHERE po.created_at >= '2025-10-01'
ORDER BY po.created_at DESC
LIMIT 10;
```

**Expected:** Each approved purchase order should create corresponding stock movement records.

#### **Scenario B: Stock Adjustments**
```sql
-- Check if manual stock increases create movements
SELECT 
    sa.id as adjustment_id,
    sa.created_at as adjustment_date,
    sa.quantity_change,
    sm.id as movement_id,
    sm.movement_type,
    sm.reference_type
FROM stock_adjustments sa
LEFT JOIN stock_movements sm ON (
    sm.reference_type = 'adjustment' 
    AND sm.reference_id = sa.id
)
WHERE sa.created_at >= '2025-10-01'
ORDER BY sa.created_at DESC
LIMIT 10;
```

**Expected:** Stock adjustments with positive quantity should create `movement_type = 'in'` records.

#### **Scenario C: Transfers (Incoming)**
```sql
-- Check if incoming transfers create 'in' movements
SELECT 
    t.id as transfer_id,
    t.from_warehouse_id,
    t.to_warehouse_id,
    t.created_at as transfer_date,
    sm.warehouse_id,
    sm.movement_type,
    sm.reference_type,
    sm.quantity
FROM transfers t
INNER JOIN stock_movements sm ON (
    sm.reference_type = 'transfer' 
    AND sm.reference_id = t.id
)
WHERE t.created_at >= '2025-10-01'
  AND sm.movement_type = 'in'
ORDER BY t.created_at DESC
LIMIT 10;
```

**Expected:** Each transfer creates 2 movements (1 OUT at source, 1 IN at destination).

---

## 📊 Expected Results Summary

### **Successful Fix Verification:**

**Database Queries Should Show:**
```
Query 1: total_movements > 0
Query 2: movement_type 'in' has count > 0
Query 2: movement_type 'out' has count > 0
Query 5: October has some movements (or explain if none)
Query 6: November has movements (if user did recent intake)
```

**API Response Should Return:**
```json
{
  "summary": {
    "total_movements": <actual_count>,
    "total_in": <count_where_movement_type_is_in>,
    "total_out": <count_where_movement_type_is_out>,
    "total_adjustments": <count_where_reference_type_is_adjustment>,
    "total_transfers": <count_where_reference_type_is_transfer>
  }
}
```

**Cross-Checks:**
- `total_movements` ≈ `total_in + total_out` (approximately, adjustments may differ)
- If Transfers tab shows 4 transfers → `total_transfers` should be 4
- If database shows 20 'in' movements → `total_in` should be 20
- Date filtering should work (October vs November should show different counts)

---

## 🔧 Backend Implementation Reference

### **What the Fix Should Have Done:**

**File:** `backend/reports/services/movement_tracker.py` (or similar)

```python
from django.db.models import Count, Q

class MovementTracker:
    @staticmethod
    def get_summary(movements_queryset):
        """
        Calculate summary statistics from movements queryset.
        
        Args:
            movements_queryset: Filtered StockMovement queryset
            
        Returns:
            dict: Summary statistics
        """
        # ✅ CORRECT: Use aggregation with filters
        summary = movements_queryset.aggregate(
            total_movements=Count('id'),
            total_in=Count('id', filter=Q(movement_type='in')),
            total_out=Count('id', filter=Q(movement_type='out')),
            total_adjustments=Count('id', filter=Q(reference_type='adjustment')),
            total_transfers=Count('id', filter=Q(reference_type='transfer'))
        )
        
        return summary
```

**File:** `backend/reports/views/inventory_reports.py` (or similar)

```python
class StockMovementsView(APIView):
    def get(self, request):
        # Get filter parameters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        # Build queryset with filters
        movements = StockMovement.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date
        )
        
        # Get summary using MovementTracker
        summary = MovementTracker.get_summary(movements)
        
        # ✅ CRITICAL: Return summary at top level
        return Response({
            'success': True,
            'data': {
                'summary': summary,  # Must be here, not nested deeper
                'movements': self.serialize_movements(movements),
                # ... other data
            }
        })
```

---

## 🐛 Common Issues to Check

### **Issue 1: Fix Not Deployed**
```bash
# Check if the fixed code is actually running
# Look for the aggregation logic in deployed files
grep -r "total_in.*Count.*filter.*Q" backend/reports/

# Check git log for recent changes
git log --since="2025-10-30" --oneline -- backend/reports/
```

### **Issue 2: Wrong Field Names**
```python
# ❌ WRONG - Using reference_type for direction
total_in = movements.filter(reference_type='in').count()  # No such value!

# ✅ CORRECT - Using movement_type for direction
total_in = movements.filter(movement_type='in').count()
```

### **Issue 3: Response Structure Mismatch**
```json
// ❌ WRONG - Summary nested too deep
{
  "data": {
    "results": {
      "summary": { ... }  // Frontend expects data.summary, not data.results.summary
    }
  }
}

// ✅ CORRECT
{
  "data": {
    "summary": { ... }
  }
}
```

### **Issue 4: Date Filter Not Applied**
```python
# ❌ WRONG - Summary ignores date filters
summary = StockMovement.objects.aggregate(...)  # Uses ALL movements

# ✅ CORRECT - Summary respects filters
summary = movements_queryset.aggregate(...)  # Uses filtered movements
```

---

## 📝 Verification Checklist

**Please provide the following information:**

### **0. ARCHITECTURE CLARIFICATION:** ⚠️
- [ ] Does `inventory_stockproduct` create movement records?: **YES / NO**
- [ ] If YES, what `reference_type` is used?: `_____`
- [ ] If NO, is this intentional design (purchases tracked separately)?: **YES / NO**

### **1. Database Verification:**
- [ ] Total StockProduct records (Oct 2025): `_____` (Expected: 271)
- [ ] Total stock movements in database: `_____`
- [ ] Movements with `movement_type='in'`: `_____`
- [ ] Movements with `movement_type='out'`: `_____`
- [ ] Movements in October 2025: `_____`
- [ ] Movements in November 2025: `_____`
- [ ] Latest movement date: `_____`

### **2. API Response Verification:**
Paste actual API response for October 2025:
```json
{
  "data": {
    "summary": {
      "total_movements": ___,
      "total_in": ___,
      "total_out": ___,
      "total_adjustments": ___,
      "total_transfers": ___
    }
  }
}
```

### **3. Code Verification:**
- [ ] Fix is deployed to production: YES / NO
- [ ] Using `movement_type` for in/out counts: YES / NO
- [ ] Using `reference_type` for adjustment/transfer counts: YES / NO
- [ ] Date filters are applied to summary: YES / NO
- [ ] Response structure matches frontend expectations: YES / NO

### **4. Stock Intake Verification:**
- [ ] Do purchase orders create stock movements?: YES / NO
- [ ] Do stock adjustments create movements?: YES / NO
- [ ] Do transfers create movements?: YES / NO
- [ ] Latest stock intake date: `_____`
- [ ] Latest stock intake created movement?: YES / NO

---

## 🎯 Success Criteria

**Fix is verified successful when:**

1. ✅ Database shows movements with `movement_type='in'` exist
2. ✅ API returns non-zero `total_in` when such movements exist in date range
3. ✅ API returns zero `total_in` when no 'in' movements in date range (expected behavior)
4. ✅ Summary counts match database counts
5. ✅ Date filtering works (October vs November shows different numbers)
6. ✅ All transaction types create appropriate movements (PO, transfer, adjustment)

**If ANY of these fail, the fix needs additional work.**

---

## 📞 Frontend Team Needs

**Please provide us with:**

1. **CRITICAL ARCHITECTURE ANSWER:**
   - ❓ Does `inventory_stockproduct` (purchases) create movement records?
   - ❓ If YES: What table stores these movements? What `reference_type` is used?
   - ❓ If NO: Is this intentional design (two separate systems)?
   - ❓ Business decision: SHOULD purchases create movements?

2. **Actual Data Sample:**
   - Real API response (full JSON) for October 2025
   - Real API response for November 2025
   - Real database query results (screenshots OK)
   - **NEW:** StockProduct count vs Movement count comparison

3. **Explanation of Discrepancy:**
   - Why does user see 271 stock intakes but Stock In shows 0?
   - Are intakes outside the date range? (Unlikely - 271 is too many)
   - Are intakes not creating movement records? (Most likely scenario)
   - Is the API calculation incorrect? (Fixed Oct 31, unlikely)
   - Are W2W transfers excluded from IN counts? (Possible)

4. **Date Context:**
   - When was "some nice product" intake created? (exact timestamp)
   - What date range is user filtering by in Stock Movements page?
   - Does this intake fall within that range?

5. **Fix Status:**
   - Is October 31 fix actually deployed and running?
   - Git commit hash of deployed version
   - Any deployment errors or rollbacks?

6. **Data Source Tables:**
   - What tables does MovementTracker query? (List all)
   - Is `inventory_stockproduct` included in the query? (YES/NO)
   - SQL query used for `total_in` calculation (paste actual code)

---

## 🔄 Next Steps

**Based on Backend Findings:**

### **Scenario A: StockProduct Does NOT Create Movements (Most Likely)**
**Finding:** 271 StockProduct records exist, but 0 movement records with `reference_type='purchase'`

**Root Cause:** System design separates "Stock Acquisition" from "Stock Movements"

**Impact:** ✅ Backend is working correctly, frontend labels are misleading

**Action Items:**
- ✅ Backend: No fix needed, system working as designed
- 📝 Frontend: Update UI labels to clarify:
  - "Stock In" → "Inbound Movements (Transfers/Adjustments)"
  - Add separate "Stock Purchases: 271" card
  - Add tooltip: "Note: Initial purchases tracked separately"
- 📚 Documentation: Explain architecture in user guide

**Status:** ✅ **NOT A BUG - DESIGN CLARIFICATION NEEDED**

---

### **Scenario B: StockProduct SHOULD Create Movements (Data Pipeline Broken)**
**Finding:** 271 StockProduct records exist, should have created 271 movements, but only 0 exist

**Root Cause:** Purchase order → movement creation is broken

**Impact:** ❌ Critical data pipeline issue

**Action Items:**
- 🔧 Backend: Fix purchase order signal/trigger to create movements
- 🔧 Backend: Backfill 271 missing movement records for October
- ✅ Frontend: Retest after backfill, should show `total_in: 271`

**Status:** 🚨 **CRITICAL BUG - IMMEDIATE FIX REQUIRED**

---

### **Scenario C: Fix Working, User Date Range Issue**
- ✅ Backend confirms fix is working
- ✅ Intakes exist but outside selected date range
- 📝 Frontend: Add better date range guidance to UI
- 📝 Frontend: Show "No movements in selected period" message

### **Scenario D: Fix Not Deployed**
- ❌ Backend confirms fix not in production
- 🚀 Backend: Deploy the fix
- ✅ Frontend: Retest after deployment

### **Scenario E: Fix Incomplete**
- ⚠️ Backend confirms partial fix (some fields working, some not)
- 🔧 Backend: Complete the implementation
- ✅ Frontend: Verify all fields after second deployment

### **Scenario F: Transfer Logic Issue**
- ⚠️ Warehouse-to-warehouse transfers creating movements but excluded from IN/OUT counts
- 🔧 Backend: Clarify if W2W transfers should count as "in" at destination warehouse
- ✅ Frontend: Update based on business rule decision

---

## 📎 Related Documentation

- `BACKEND-BUG-STOCK-MOVEMENTS-SUMMARY.md` - Original bug report (marked FIXED)
- `STOCK-MOVEMENTS-TABBED-UI.md` - Frontend implementation details
- `BACKEND-CRITICAL-FIXES-REQUIRED.md` - Other pending API updates

---

## ⏰ Timeline

**Requested:** November 1, 2025  
**Priority:** HIGH  
**Expected Response:** Within 24 hours  
**Reason:** Blocking user's ability to track inventory movements accurately

---

**Thank you for your verification! Please respond with SQL query results and API curl outputs.** 🙏

---

## 📚 Appendix: Expected Architecture Explanation

**Based on user's clarification, we believe the system works as follows:**

### **System Design: Two Separate Tracking Systems**

#### **System 1: Stock Acquisition (StockProduct)**
**Table:** `inventory_stockproduct`  
**Purpose:** Track purchases from suppliers  
**Records:** Permanent audit trail of what was bought  
**October 2025:** 271 records

**What it tracks:**
- Purchase orders
- Initial intake quantities
- Unit costs, pricing
- Supplier information
- Expiry dates

**Key behavior:** `quantity` field never changes (permanent record)

---

#### **System 2: Stock Movements (MovementTracker)**
**Tables Queried:**
- `sales_sale` → Outbound (sales to customers)
- `inventory_transfer` → Relocations (W2W, W2S, S2W)
- `inventory_stockadjustment` → Corrections (theft, damage, errors)

**Purpose:** Track inventory changes AFTER acquisition

**October 2025:** 46 movement records
- 42 sales (outbound)
- 4 transfers (relocations)
- 0 adjustments

**What it tracks:**
- Sales (inventory leaving business)
- Transfers (inventory relocating between locations)
- Adjustments (corrections for shrinkage, damage, count errors)

**What it does NOT track:**
- ❌ StockProduct creation (purchases/intakes)
- ❌ Purchase orders

---

### **Why `total_in: 0` is Correct (If System 1 & 2 Are Separate)**

**October 2025 Data:**
```
StockProduct (Purchases):    271 records ✅ (tracked separately)
Sales:                       55 records → Creates 42 movements ✅
Transfers:                   4 records → Creates 4 movements ✅
Adjustments:                 0 records → Creates 0 movements ✅

MovementTracker Summary:
  total_movements: 46        ✅ (42 sales + 4 transfers)
  total_in: 0                ✅ (No incoming transfers, no positive adjustments)
  total_out: 42              ✅ (All sales are outbound)
  total_transfers: 4         ✅ (4 W2W transfers)
```

**Why `total_in: 0`:**
- ✅ No incoming transfers from external sources
- ✅ No positive stock adjustments
- ✅ The 4 W2W transfers create IN at destination, but might be counted separately
- ✅ **StockProduct creation doesn't create movement records** (by design)

---

### **Frontend Recommendation (If Architecture Above is Correct)**

**Update Stock Movements page labels:**

**Current (Confusing):**
```tsx
<SummaryCard title="Stock In" value={0} />
// User thinks: "But I just bought 271 items!"
```

**Recommended (Clear):**
```tsx
<SummaryCard 
  title="Inbound Movements" 
  value={0}
  subtitle="Transfers & Adjustments"
  tooltip="Note: Initial purchases tracked in Stock Items page"
/>

<SummaryCard 
  title="Stock Purchases" 
  value={271}
  subtitle="View Details →"
  link="/inventory/stocks"
/>
```

**Or rename page:**
```
"Stock Movements" → "Movement Activity (Post-Acquisition)"
```

---

### **Business Decision Required:**

**Should StockProduct (purchases) create movement records?**

**Option A: Keep Separate (Current)**
- ✅ Clean architecture (acquisition vs movement)
- ✅ StockProduct is permanent audit trail
- ❌ Users confused by "Stock In: 0"
- **Solution:** Update frontend labels

**Option B: Unify Systems**
- ✅ Users see purchases as "Stock In"
- ✅ Complete lifecycle tracking
- ❌ Requires code changes + data migration (271 records)
- ❌ Duplicate tracking

**Our Recommendation:** Option A (keep separate, improve labels)

---

**Document Version:** 1.1  
**Created:** November 1, 2025  
**Updated:** November 1, 2025 (added architecture clarification)  
**Status:** ⏳ AWAITING BACKEND VERIFICATION + ARCHITECTURE CONFIRMATION  
**Requested By:** Frontend Team  
**Assigned To:** Backend Team

---

## 🎯 PRIMARY QUESTION TO ANSWER

**Before running any queries, please answer:**

> ❓ In your system, does `inventory_stockproduct` (purchase/intake records) create entries in the stock movements tracking table?
>
> **A) YES** - Purchases create movement records  
> **B) NO** - Purchases and movements are tracked separately
>
> **Your Answer:** _______

**This answer determines if we have a bug or just a labeling issue.**
