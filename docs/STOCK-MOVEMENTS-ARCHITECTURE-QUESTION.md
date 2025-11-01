# 🎯 Stock Movements Architecture - Critical Question

**Date:** November 1, 2025  
**Priority:** CRITICAL  
**Status:** ⏳ Awaiting Backend Answer

---

## 📋 Quick Summary

**User Issue:** "I see 271 stock intakes but Stock In shows 0"

**Possible Root Causes:**

1. **Design Issue (Most Likely):** Purchases tracked separately from movements
2. **Bug Issue:** Purchases should create movements but pipeline is broken
3. **Date Issue:** Intakes outside selected date range (unlikely with 271 records)

---

## ❓ THE QUESTION

**To Backend Team:**

> In your POS system, when a stock intake/purchase is created (StockProduct record), does it automatically create a corresponding record in the stock movements tracking system?
>
> **A) YES** - Every purchase creates a movement record with `movement_type='in'` and `reference_type='purchase_order'` (or similar)
>
> **B) NO** - Purchases (StockProduct) and Movements are two separate tracking systems
>
> **Your Answer:** _______

---

## 📊 Current Data (October 2025)

```
StockProduct Table:
  ├── Total records: 271 ✅
  └── Example: "Some nice product" (100 units @ Rawlings Park)

Stock Movements Summary (via MovementTracker API):
  ├── total_movements: 46
  ├── total_in: 0        ← This is what confuses the user
  ├── total_out: 42
  └── total_transfers: 4
```

---

## 🔍 If Answer is "NO" (Separate Systems)

**Implication:** ✅ System working correctly, just needs better UI labels

**Action Plan:**
1. ✅ Backend: No fix needed
2. 📝 Frontend: Update labels:
   - "Stock In" → "Inbound Movements (Transfers/Adjustments)"
   - Add separate "Stock Purchases: 271" card
   - Add tooltip explaining the difference
3. 📚 Documentation: Explain two-system architecture

**Status:** NOT A BUG - Design clarification needed

**Timeline:** Frontend updates can be done immediately

---

## 🚨 If Answer is "YES" (Should Create Movements)

**Implication:** ❌ Critical bug - 271 missing movement records

**Action Plan:**
1. 🔧 Backend: Fix purchase → movement creation trigger
2. 🔧 Backend: Backfill 271 October movements
3. 🔧 Backend: Test with new purchase
4. ✅ Frontend: Retest after fix (should show `total_in: 271`)

**Status:** CRITICAL BUG - Immediate fix required

**Timeline:** Backend fix + data migration needed

---

## 📍 Verification Document

Full details in: `BACKEND-VERIFICATION-STOCK-MOVEMENTS-SUMMARY.md`

Includes:
- SQL queries to run
- API curl commands to test
- Expected response structures
- All verification checklists

---

## 🎯 Next Steps

**Immediate (Backend Team):**
1. Answer the primary question (A or B)
2. If A: Fix the bug + backfill data
3. If B: Explain architecture + provide example data
4. Run verification queries from main document
5. Report findings to frontend team

**Once Answered (Frontend Team):**
- If NO: Update UI labels (1-2 hours work)
- If YES: Wait for backend fix, then retest

---

**Blocking:** User feature (accurate movement tracking)  
**Priority:** HIGH  
**Expected Response:** Within 24 hours

---

**Document Version:** 1.0  
**Created:** November 1, 2025  
**Status:** ⏳ QUESTION PENDING  
**Related:** BACKEND-VERIFICATION-STOCK-MOVEMENTS-SUMMARY.md
