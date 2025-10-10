# 🔍 Debugging: Why Approval Buttons Aren't Showing

**Issue:** Approve/Reject buttons not visible in Stock Adjustments

---

## 🎯 Quick Debug Steps

### Step 1: Open Browser Console
1. Press **F12** or **Ctrl+Shift+I** (Windows/Linux) or **Cmd+Option+I** (Mac)
2. Click the **Console** tab
3. Keep it open

### Step 2: View an Adjustment
1. In the Stock Adjustments table, click **"View"** on any adjustment
2. Modal opens

### Step 3: Check Console Output
Look for output like this:
```
=== Adjustment Detail Debug ===
Status: PENDING
Requires Approval: true
Full adjustment: {id: '...', status: 'PENDING', ...}
```

### Step 4: Verify Data

**Check these values:**

| Field | Expected | What to Look For |
|-------|----------|------------------|
| `status` | `"PENDING"` | Exact match (case-sensitive) |
| `requires_approval` | `true` | Boolean true, not string |
| `adjustment_type` | `"DAMAGE"` or `"THEFT"` etc | Any valid type |

---

## 🔧 Common Issues & Fixes

### Issue 1: Status is Not "PENDING"

**Symptom:**
```
Status: "AWAITING_APPROVAL"  // ❌ Wrong
Status: "Pending"             // ❌ Wrong (case)
Status: "pending"             // ❌ Wrong (case)
```

**Fix:** Backend needs to return exactly `"PENDING"` (all caps)

---

### Issue 2: requires_approval is Not Boolean

**Symptom:**
```
Requires Approval: "true"    // ❌ String, not boolean
Requires Approval: undefined // ❌ Missing field
Requires Approval: null      // ❌ Null
```

**Fix:** Backend needs to return `true` (boolean) or `false` (boolean)

---

### Issue 3: Field Names Don't Match

**Symptom:**
```
requiresApproval: true  // ❌ camelCase (wrong)
requires_approval: true // ✅ snake_case (correct)
```

**Fix:** Backend must use snake_case `requires_approval`

---

## ✅ Expected Working Data

When everything works correctly, console should show:

```javascript
=== Adjustment Detail Debug ===
Status: PENDING
Requires Approval: true
Full adjustment: {
  id: "uuid-here",
  business: "uuid-here",
  stock_product: "uuid-here",
  stock_product_details: {...},
  adjustment_type: "DAMAGE",
  adjustment_type_display: "Damage/Breakage",
  quantity: 4,
  unit_cost: "12.00",
  total_cost: "48.00",
  reason: "Items fell from truck...",
  reference_number: null,
  status: "PENDING",          // ✅ All caps
  status_display: "Pending",
  requires_approval: true,     // ✅ Boolean
  created_by: "uuid-here",
  created_by_name: "Mike Tetteh",
  approved_by: null,
  approved_by_name: null,
  created_at: "2025-10-06T10:16:02.000000Z",
  approved_at: null,
  completed_at: null,
  has_photos: false,
  has_documents: false,
  related_sale: null,
  related_transfer: null,
  financial_impact: "48.00",
  is_increase: false,
  is_decrease: true,
  photos: [],
  documents: []
}
```

---

## 🎨 Button Visibility Logic

### In Detail Modal:

```typescript
// Line 48 in AdjustmentDetailModal.tsx
const canApprove = adjustment?.status === 'PENDING' && adjustment?.requires_approval
const canReject = adjustment?.status === 'PENDING'
```

**Result:**
- ✅ **Approve button shows** when: `status="PENDING"` AND `requires_approval=true`
- ✅ **Reject button shows** when: `status="PENDING"` (always for pending)
- ❌ **No buttons show** when: `status="APPROVED"`, `"REJECTED"`, or `"COMPLETED"`

### In Table (Quick Actions):

```typescript
// Line 1127 in ManageStocksPage.tsx
{adjustment.status === 'PENDING' && adjustment.requires_approval && (
  <>
    <Button variant="success">Approve</Button>
    <Button variant="danger">Reject</Button>
  </>
)}
```

**Result:**
- Same logic as modal
- Approve/Reject buttons only for PENDING + requires approval

---

## 🐛 Troubleshooting Checklist

- [ ] Open browser console (F12)
- [ ] Click "View" on adjustment
- [ ] See debug output in console
- [ ] Check `status` value (must be `"PENDING"`)
- [ ] Check `requires_approval` value (must be `true`)
- [ ] Verify values are correct types (string for status, boolean for requires_approval)
- [ ] If values are wrong, this is a **backend data issue**
- [ ] If values are correct but buttons don't show, this is a **frontend rendering issue**

---

## 📊 Decision Tree

```
Is status === "PENDING"?
├─ NO → ❌ Buttons won't show (expected behavior)
└─ YES → Is requires_approval === true?
           ├─ NO → ❌ Only Reject button shows
           └─ YES → ✅ Both Approve and Reject buttons should show
```

---

## 🔍 Additional Debugging

### Check Network Response

1. Open **Network** tab in DevTools
2. Click "View" on adjustment
3. Look for request to `/inventory/api/stock-adjustments/{id}/`
4. Check the **Response** tab
5. Verify JSON structure matches expected format

### Check React DevTools

1. Install React DevTools extension
2. Open Components tab
3. Find `AdjustmentDetailModal` component
4. Check Props → `adjustment` object
5. Verify `status` and `requires_approval` values

---

## ✅ What to Share with Backend Team

If console shows wrong values, share this with backend developers:

**Example Issue Report:**
```
Current Response:
{
  "status": "Pending",              // ❌ Should be "PENDING"
  "requiresApproval": "true"        // ❌ Should be requires_approval: true (boolean)
}

Expected Response:
{
  "status": "PENDING",              // ✅ All caps
  "requires_approval": true         // ✅ Boolean, snake_case
}
```

---

## 🚀 Once Fixed

After backend returns correct data:

1. Refresh the page
2. Click "View" on adjustment
3. Console should show correct values
4. **Approve** button (green) should appear in modal
5. **Approve/Reject** buttons should appear in table
6. Clicking buttons should work correctly

---

## 📞 Next Steps

1. **Check console output** - Share what you see
2. **If status/requires_approval are wrong** - Backend fix needed
3. **If values are correct but buttons missing** - Frontend bug (we'll fix)
4. **If everything looks right** - Try hard refresh (Ctrl+F5)

Share the console output and we'll solve this! 🔍
