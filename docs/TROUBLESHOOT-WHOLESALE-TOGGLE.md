# 🐛 Wholesale Toggle Not Working - Troubleshooting Guide

**Issue**: Clicking RETAIL button doesn't change to WHOLESALE  
**Date**: October 11, 2025  
**Status**: Investigating

---

## 🔍 Diagnostic Steps

### Step 1: Check if Button is Disabled

**Symptom**: Button doesn't respond to clicks

**Possible Causes**:
1. Cart already exists (button is disabled when cart has items)
2. JavaScript error preventing state update
3. React re-render not happening

**How to Check**:
```javascript
// Open DevTools Console (F12)
// Type this:
document.querySelector('button').disabled
// If returns `true`, button is disabled
```

---

### Step 2: Check Current Cart State

**The button is DISABLED if there's an active cart.**

**How to Check**:
```javascript
// In DevTools Console:
// Check Redux state
const state = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__?.()
console.log('Current cart:', state?.sales?.currentCart)

// If currentCart is NOT null, button will be disabled
```

**If cart exists**:
- You need to click "Clear Cart" button first
- THEN the toggle will work

---

### Step 3: Check Sale Type State

**How to Check**:
```javascript
// In DevTools Console:
// Check component state via React DevTools
// Or add temporary console.log in code
```

---

## 🎯 Most Likely Issue: Cart Already Exists

### The Design

The toggle button is **intentionally disabled** when there's an active cart to prevent:
- Mixing retail and wholesale prices in one transaction
- Confusion about which price applies to already-added items
- Pricing inconsistencies

### Code Reference

**File**: `SalesPage.tsx` (Line ~807)
```typescript
<Button
  variant="outline-secondary"
  size="sm"
  onClick={() => setSaleType(saleType === 'RETAIL' ? 'WHOLESALE' : 'RETAIL')}
  disabled={!!currentCart}  // ← DISABLED if cart exists!
>
  {saleType}
</Button>
```

### When Cart is Created

Cart is automatically created when:
1. You add first item to cart
2. ensureSaleSession() is called

Cart is cleared when:
1. You click "Clear Cart" button
2. Sale is completed
3. Sale is abandoned

---

## ✅ Solution: Clear Cart First

### Step-by-Step

**If you have items in cart**:
```
1. Look for "Clear Cart" button (next to RETAIL button)
2. Click "Clear Cart"
3. Cart is emptied
4. RETAIL button becomes enabled
5. Click RETAIL → Changes to WHOLESALE ✅
```

**If cart is empty but button still disabled**:
```
This might be a cart session issue.
Try:
1. Refresh the page
2. Check if there's a hidden/empty cart session
```

---

## 🧪 Test the Toggle (No Cart)

### Scenario 1: Fresh Page Load

```
1. Open Sales page (fresh load)
2. DO NOT search or add anything
3. Look at RETAIL button
4. It should NOT be disabled
5. Click RETAIL
6. Should change to WHOLESALE ✅
```

### Scenario 2: After Searching (But Not Adding)

```
1. Search for "sugar"
2. DO NOT click "+ Add"
3. RETAIL button should still work
4. Click RETAIL
5. Should change to WHOLESALE ✅
6. Sugar price should change from GH₵ 3.12 to GH₵ 2.50 ✅
```

### Scenario 3: After Adding Item

```
1. Add Sugar to cart
2. RETAIL button becomes DISABLED ⚠️
3. Cannot toggle (by design)
4. Must click "Clear Cart" first
```

---

## 🔧 Quick Fixes to Try

### Fix 1: Clear Cart
```
1. Click "Clear Cart" button (red button next to RETAIL)
2. Cart empties
3. RETAIL button enabled
4. Click to toggle
```

### Fix 2: Refresh Page
```
1. F5 or Ctrl+R to refresh
2. Clears any stuck state
3. Try toggle again
```

### Fix 3: Check Console Errors
```
1. F12 → Console tab
2. Look for red errors
3. Errors might prevent state updates
```

### Fix 4: Check Network Tab
```
1. F12 → Network tab
2. Click RETAIL button
3. Should NOT make API call (state only)
4. If making API calls, something's wrong
```

---

## 🐛 Debugging: Add Console Logs

If you want to debug further, add console logs:

### Edit SalesPage.tsx

**Around line 806**, add logging:
```typescript
<Button
  variant="outline-secondary"
  size="sm"
  onClick={() => {
    console.log('🔄 Toggle clicked!', {
      currentType: saleType,
      willChangeTo: saleType === 'RETAIL' ? 'WHOLESALE' : 'RETAIL',
      cartExists: !!currentCart
    })
    setSaleType(saleType === 'RETAIL' ? 'WHOLESALE' : 'RETAIL')
  }}
  disabled={!!currentCart}
>
  {saleType}
</Button>
```

**Add state change logger**:
```typescript
// After the useState line
useEffect(() => {
  console.log('📊 Sale type changed to:', saleType)
}, [saleType])
```

---

## 🔍 What to Check in Console

### When Button Works:
```
Console output after click:
🔄 Toggle clicked! {
  currentType: "RETAIL",
  willChangeTo: "WHOLESALE",
  cartExists: false
}
📊 Sale type changed to: WHOLESALE
```

### When Button Doesn't Work:
```
Scenario 1 - Button Disabled:
(No console logs because onClick doesn't fire)
Reason: disabled={!!currentCart} prevents clicks

Scenario 2 - Error:
❌ Error: ... (some error message)
Reason: JavaScript error preventing state update

Scenario 3 - State Not Updating:
🔄 Toggle clicked! { ... }
(But no "Sale type changed to" log)
Reason: setSaleType not working
```

---

## 📊 Expected Behavior

### Normal Flow

**Initial State**:
```
saleType: "RETAIL"
currentCart: null
Button enabled: true
Button shows: "RETAIL"
```

**After First Click**:
```
saleType: "WHOLESALE"
currentCart: null (still empty)
Button enabled: true
Button shows: "WHOLESALE"
Prices: All showing wholesale
```

**After Adding Item**:
```
saleType: "WHOLESALE"
currentCart: { id: "...", items: [...] }
Button enabled: false ⚠️
Button shows: "WHOLESALE" (grayed out)
Prices: Locked to wholesale
```

**After Clear Cart**:
```
saleType: "WHOLESALE"
currentCart: null
Button enabled: true ✅
Button shows: "WHOLESALE"
Can toggle again: Yes
```

---

## 🎯 Backend vs Frontend Issue

### It's Likely Frontend IF:

- Button is disabled (cart exists)
- Console shows errors
- State not updating
- React not re-rendering

### It Might Be Backend IF:

- Button changes to WHOLESALE ✅
- But prices DON'T change ❌
- Products still show retail prices ❌

**Current Situation**: Button not changing = **Frontend issue**

---

## 📝 Summary

### Most Likely Cause
```
Cart already exists → Button disabled → Can't toggle
```

### Solution
```
1. Click "Clear Cart" button
2. Button becomes enabled
3. Click RETAIL → Changes to WHOLESALE
4. Prices update
```

### If That Doesn't Work
```
1. Refresh page
2. Check console for errors
3. Add debug logging
4. Report errors
```

---

## 🚀 Next Steps

### Step 1: Check Cart Status
```
Look for "Clear Cart" button on the page
If visible → You have active cart → Click it
If not visible → Cart is empty → Button should work
```

### Step 2: Test Toggle
```
Click RETAIL button
Expected: Changes to WHOLESALE
If not: Check console for errors
```

### Step 3: Report Findings
```
Share:
- Is "Clear Cart" button visible?
- Any console errors?
- Does button text change?
- Do prices change?
```

---

**Status**: Awaiting user testing  
**Expected Issue**: Cart exists, button disabled  
**Expected Fix**: Clear cart first, then toggle

