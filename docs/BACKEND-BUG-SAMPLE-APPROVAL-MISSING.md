# 🐛 Bug Report: SAMPLE Adjustments Not Requiring Approval

**Date:** October 6, 2025  
**Type:** 🔴 **BACKEND BUG** - Data Inconsistency  
**Priority:** 🟡 **MEDIUM** - Approval workflow bypassed  
**Status:** 🔴 **ACTIVE**

---

## Problem Summary

Sample/Promotional (SAMPLE) adjustments are being created with `requires_approval = false`, which causes the Approve button to not show in the UI, bypassing the approval workflow.

**Expected:** ALL adjustments should require approval  
**Actual:** SAMPLE adjustments have `requires_approval = false`  
**Impact:** Approval workflow is bypassed for these adjustments

---

## User Report

> "Approve button is not showing for Sample/Promotional option"

---

## Frontend Behavior (Correct)

**Button Visibility Logic:**
```typescript
const canApprove = adjustment?.status === 'PENDING' && adjustment?.requires_approval
//                                                      ^^^^^^^^^^^^^^^^^^^^^^^^
//                                                      This is FALSE for SAMPLE

// Button only shows when BOTH conditions are true:
// 1. status === 'PENDING' ✅
// 2. requires_approval === true ❌ (FALSE for SAMPLE)
```

**Result:**
- Status: PENDING ✅
- Requires Approval: false ❌
- Button Shows: NO ❌

**Frontend is working correctly** - it's following the data from the backend.

---

## Backend Issue

According to the backend configuration document provided today, **ALL adjustments should require approval**:

### Expected Backend Behavior

**File:** `adjustment_serializers.py`

```python
def validate(self, data):
    # ALL adjustments require approval for proper oversight
    # This ensures every stock change is reviewed before being applied
    data['requires_approval'] = True
    return data
```

**Expected Result:** Every adjustment created should have `requires_approval = True`

### Actual Backend Behavior

**API Response for SAMPLE adjustment:**
```json
{
  "id": "adjustment-uuid",
  "adjustment_type": "SAMPLE",
  "adjustment_type_display": "Sample/Promotional",
  "status": "PENDING",
  "requires_approval": false,    // ❌ Should be true
  // ... other fields
}
```

**Issue:** `requires_approval` is `false` instead of `true`

---

## Root Cause Analysis

### Possible Causes

**Cause 1: Conditional Logic Bypassing Validation (Most Likely)**

The backend might have conditional logic that skips setting `requires_approval = True` for certain types:

```python
# ❌ WRONG: Conditional approval based on type
def validate(self, data):
    adjustment_type = data.get('adjustment_type')
    
    # Old logic that might still exist:
    if adjustment_type in ['SAMPLE', 'TRANSFER_IN', 'TRANSFER_OUT']:
        data['requires_approval'] = False  # ❌ Bypass approval
    else:
        data['requires_approval'] = True
    
    return data
```

**Fix:** Remove conditional logic, always set to `True`:
```python
# ✅ CORRECT: All require approval
def validate(self, data):
    data['requires_approval'] = True
    return data
```

---

**Cause 2: Model Default Value**

The `StockAdjustment` model might have a default value of `False`:

```python
# ❌ Model with default False
class StockAdjustment(models.Model):
    requires_approval = models.BooleanField(default=False)  # ❌
```

And the serializer validation might not be running or being overridden.

**Fix:** Change default to `True` or ensure validation always runs:
```python
# ✅ CORRECT: Default to True
class StockAdjustment(models.Model):
    requires_approval = models.BooleanField(default=True)
```

---

**Cause 3: Type-Specific Validation Method**

There might be a type-specific method that overrides the general validation:

```python
class StockAdjustmentSerializer(serializers.ModelSerializer):
    def validate(self, data):
        data['requires_approval'] = True
        return data
    
    def validate_sample_adjustment(self, data):
        # Type-specific method that overrides
        data['requires_approval'] = False  # ❌
        return data
```

**Fix:** Remove type-specific overrides or update them.

---

## How to Debug

### Step 1: Check API Response

**Create a SAMPLE adjustment and check the response:**

```bash
# Create SAMPLE adjustment
POST /api/stock-adjustments/
{
  "stock_product": "uuid",
  "adjustment_type": "SAMPLE",
  "quantity": -5,
  "reason": "Promotional samples",
  "unit_cost": "10.00"
}

# Check response
{
  "requires_approval": ???  // Should be true, probably false
}
```

### Step 2: Check Database

```python
# Django shell
adjustment = StockAdjustment.objects.last()
print(f"Type: {adjustment.adjustment_type}")
print(f"Requires Approval: {adjustment.requires_approval}")

# Expected:
# Type: SAMPLE
# Requires Approval: True

# Actual (probably):
# Type: SAMPLE
# Requires Approval: False ❌
```

### Step 3: Check Serializer

Add debug logging to the serializer:

```python
def validate(self, data):
    print(f"=== BEFORE VALIDATION ===")
    print(f"Type: {data.get('adjustment_type')}")
    print(f"Requires Approval: {data.get('requires_approval', 'NOT SET')}")
    
    # Set to True for ALL
    data['requires_approval'] = True
    
    print(f"=== AFTER VALIDATION ===")
    print(f"Requires Approval: {data['requires_approval']}")
    
    return data
```

**Expected Output:**
```
=== BEFORE VALIDATION ===
Type: SAMPLE
Requires Approval: NOT SET
=== AFTER VALIDATION ===
Requires Approval: True
```

**If you see:**
```
=== AFTER VALIDATION ===
Requires Approval: False  ❌
```

Then something is overriding the value after validation.

---

## Verification Checklist

### For Backend Developer

**Check 1: Serializer Validation**
- [ ] Open `adjustment_serializers.py`
- [ ] Find the `validate()` method
- [ ] Verify it sets `data['requires_approval'] = True`
- [ ] Verify there are NO conditions (no if statements)
- [ ] Verify it's not checking adjustment type

**Check 2: Model Definition**
- [ ] Open `stock_adjustments.py` (model file)
- [ ] Find `StockAdjustment` model
- [ ] Check `requires_approval` field definition
- [ ] Verify default is `True` (or removed if always set in serializer)

**Check 3: Type-Specific Logic**
- [ ] Search for "SAMPLE" in serializer file
- [ ] Search for type-specific validation methods
- [ ] Verify no special handling for SAMPLE type

**Check 4: Signal Handlers**
- [ ] Check if there are any `pre_save` or `post_save` signals
- [ ] Verify signals don't modify `requires_approval`

**Check 5: Create Method**
- [ ] Check if serializer has custom `create()` method
- [ ] Verify it doesn't override `requires_approval`

---

## Quick Fix

### Backend Code Change

**File:** `inventory/adjustment_serializers.py`

**Find and replace:**

```python
# FIND THIS (or similar conditional logic):
def validate(self, data):
    adjustment_type = data.get('adjustment_type')
    
    # Determine if approval required based on type or value
    if adjustment_type in ['SAMPLE', 'TRANSFER_IN', 'TRANSFER_OUT']:
        data['requires_approval'] = False
    else:
        data['requires_approval'] = True
    
    return data
```

**REPLACE WITH:**

```python
# ✅ CORRECT: ALL adjustments require approval
def validate(self, data):
    # ALL adjustments require approval for proper oversight
    # This ensures every stock change is reviewed before being applied
    data['requires_approval'] = True
    return data
```

**Time Estimate:** 2 minutes to fix + 5 minutes to test = **7 minutes total**

---

## Testing After Fix

### Test Case 1: Create SAMPLE Adjustment

```bash
POST /api/stock-adjustments/
{
  "stock_product": "uuid",
  "adjustment_type": "SAMPLE",
  "quantity": -5,
  "reason": "Promotional samples",
  "unit_cost": "10.00"
}

# Expected Response:
{
  "id": "...",
  "adjustment_type": "SAMPLE",
  "status": "PENDING",
  "requires_approval": true,  # ✅ Should be true
  // ...
}
```

### Test Case 2: Frontend Display

**Steps:**
1. Create SAMPLE adjustment via UI
2. Click "View" to open detail modal
3. **Expected:** Approve button is visible ✅
4. **Expected:** "⚠️ Requires Approval" notice shown ✅

### Test Case 3: Other Types Still Work

Create adjustments of other types (DAMAGE, THEFT, etc.) and verify:
- ✅ All have `requires_approval = true`
- ✅ All show Approve button when PENDING

---

## Impact

### Current Impact

**Security/Oversight Issue:**
- ❌ SAMPLE adjustments bypass approval workflow
- ❌ Stock changes applied without manager review
- ❌ Potential for unauthorized sample distribution
- ❌ Audit trail incomplete

**User Experience Issue:**
- ❌ Confusing - why no approve button?
- ❌ Inconsistent - other types show button
- ❌ User reports bug (this report)

### After Fix

**Security/Oversight Restored:**
- ✅ ALL adjustments require approval
- ✅ Complete manager oversight
- ✅ Full audit trail
- ✅ Consistent workflow

**User Experience Improved:**
- ✅ Approve button shows for all PENDING adjustments
- ✅ Consistent behavior across all types
- ✅ Clear workflow for users

---

## Workaround (Temporary)

If backend cannot be fixed immediately, users can:

**Option 1: Manual Approval via API**
```bash
# Manually approve via API call
POST /api/stock-adjustments/{id}/approve/
```

**Option 2: Change Type**
- Don't use SAMPLE type temporarily
- Use CORRECTION instead (requires approval)
- Add note in reason: "Sample/Promotional - using CORRECTION type due to bug"

**Option 3: Backend Admin Panel**
- Go to Django admin
- Find the adjustment
- Manually set `requires_approval = True`
- Save

---

## Related Issues

This is similar to the issue documented in the configuration document provided today, which stated:

> ### All Adjustment Types Require Approval
> 
> Previously, some types were auto-approved. **Now ALL require approval:**
> 
> | Type | Old Behavior | New Behavior |
> |------|--------------|--------------|
> | CUSTOMER_RETURN | **Auto-approved** ❌ | **Required approval** ✅ |
> | TRANSFER_IN | **Auto-approved** ❌ | **Required approval** ✅ |
> | SAMPLE | **Auto-approved** ❌ | **Required approval** ✅ |

**It appears the backend fix was not fully applied to SAMPLE type.**

---

## Frontend Debug Output

When viewing a SAMPLE adjustment, console shows:

```javascript
=== Adjustment Detail Debug ===
Status: PENDING
Requires Approval: false    // ❌ Should be true
Full adjustment: {
  id: "...",
  adjustment_type: "SAMPLE",
  status: "PENDING",
  requires_approval: false,  // ❌ Should be true
  // ...
}
```

**This confirms the issue is backend data, not frontend logic.**

---

## Files to Check (Backend)

1. **`inventory/adjustment_serializers.py`**
   - Main serializer validation
   - Check `validate()` method

2. **`inventory/stock_adjustments.py`**
   - Model definition
   - Check `requires_approval` field default

3. **`inventory/signals.py`** (if exists)
   - Signal handlers
   - Check for approval logic

4. **`inventory/adjustment_views.py`**
   - ViewSet create method
   - Check for overrides

---

## Summary

**Issue:** SAMPLE adjustments have `requires_approval = false`  
**Expected:** `requires_approval = true` (per backend documentation)  
**Root Cause:** Backend conditional logic or model default  
**Fix Location:** `adjustment_serializers.py` validate() method  
**Fix Time:** ~7 minutes  
**Testing:** Create SAMPLE adjustment, verify `requires_approval = true`  

**Frontend Status:** ✅ Working correctly, waiting for backend data fix  
**Urgency:** Medium - approval workflow bypassed for one type  

---

**Reported by:** User (via "Approve button not showing")  
**Analyzed by:** GitHub Copilot  
**Date:** October 6, 2025  
**Status:** 🔴 Awaiting backend fix

---

## Response Template

Please respond with one of the following:

### Response A: "Found and Fixed"
```
✅ Found conditional logic for SAMPLE type
✅ Removed condition
✅ All adjustments now require approval
✅ Tested - SAMPLE adjustments now have requires_approval=true
```

### Response B: "Cannot Reproduce"
```
⚠️ Checked serializer - already sets requires_approval=true
⚠️ Checked SAMPLE adjustment in DB - has requires_approval=true
⚠️ Need more info - can you share the adjustment ID?
```

### Response C: "By Design"
```
ℹ️ SAMPLE type intentionally doesn't require approval
ℹ️ Business rule: promotional samples don't need oversight
→ Frontend should hide approve button and show different message
```

---

**Awaiting backend response!** 🔍
