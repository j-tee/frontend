# Verify Stuck Payment - Manual Steps

## Current Situation

**Payment Details:**
- Amount: GHS 163.50
- Reference: `SUB-4f11fb3f-7d38-452d-be15-b9a86b663025-1762185417.508158`
- Status: Paid on Paystack ✅
- Subscription Status: TRIAL ❌ (Should be ACTIVE)

**Problem:** Payment was completed but verification callback was stuck in infinite loop, so the backend never updated the subscription to ACTIVE status.

---

## Option 1: Reload the Payment Callback Page (Recommended)

The fix is now deployed. Just reload the stuck callback page in your browser:

1. Go back to the tab stuck at: `http://localhost:5173/payment/callback?reference=SUB-4f11fb3f...`
2. Press `Ctrl+F5` or `Cmd+Shift+R` to hard reload
3. The new verification code will run automatically
4. Watch it verify and redirect to subscriptions
5. Subscription status should change to ACTIVE ✅

---

## Option 2: Manually Call Verification API

If the callback page doesn't work, manually verify via API:

### Using Browser Console:

1. Open browser console (F12)
2. Run this code:

```javascript
// Extract subscription ID from reference
const reference = 'SUB-4f11fb3f-7d38-452d-be15-b9a86b663025-1762185417.508158'
const subscriptionId = '4f11fb3f-7d38-452d-be15-b9a86b663025'

// Call verification API
fetch('http://localhost:8000/subscriptions/api/subscriptions/' + subscriptionId + '/verify_payment/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('access_token') // Adjust if token stored differently
  },
  body: JSON.stringify({
    gateway: 'PAYSTACK',
    reference: reference
  })
})
.then(res => res.json())
.then(data => {
  console.log('Verification result:', data)
  if (data.success) {
    alert('Payment verified! Reloading page...')
    window.location.reload()
  }
})
.catch(err => console.error('Error:', err))
```

### Using cURL (Backend Direct):

```bash
curl -X POST http://localhost:8000/subscriptions/api/subscriptions/4f11fb3f-7d38-452d-be15-b9a86b663025/verify_payment/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "gateway": "PAYSTACK",
    "reference": "SUB-4f11fb3f-7d38-452d-be15-b9a86b663025-1762185417.508158"
  }'
```

---

## Option 3: Backend Admin Panel

If you have Django admin access:

1. Go to: `http://localhost:8000/admin/`
2. Navigate to: **Subscriptions → Subscriptions**
3. Find subscription: `4f11fb3f-7d38-452d-be15-b9a86b663025`
4. Manually change:
   - Status: `TRIAL` → `ACTIVE`
   - `is_trial`: `True` → `False`
5. Save changes

---

## Verification Checklist

After verification, check that:

- [ ] Subscription status changed from TRIAL to ACTIVE
- [ ] Badge color changed from blue (TRIAL) to green (ACTIVE)
- [ ] Trial period dates removed or updated
- [ ] Payment record exists in subscription payments
- [ ] Business can access full subscription features

---

## What Was Fixed

### 1. Subscription Creation (Going Forward)
```typescript
// OLD - defaulted to TRIAL
createSubscription({
  plan_id: selectedPlan.id,
  business_id: currentBusiness.id,
  payment_method: 'PAYSTACK'
})

// NEW - explicitly sets is_trial: false
createSubscription({
  plan_id: selectedPlan.id,
  business_id: currentBusiness.id,
  payment_method: 'PAYSTACK',
  is_trial: false  // ✅ FIXED!
})
```

### 2. Payment Callback Loop
```typescript
// OLD - No verification logic, just infinite spinner
return <Spinner /> <Alert>Processing...</Alert>

// NEW - Actual verification logic
useEffect(() => {
  const verify = async () => {
    const result = await verifyPayment(subscriptionId, {
      gateway: 'PAYSTACK',
      reference: reference
    })
    if (result.success) {
      window.location.href = '/subscriptions' // Force reload
    }
  }
  verify()
}, [])
```

### 3. Force Reload After Verification
- Changed from `navigate('/subscriptions')` to `window.location.href = '/subscriptions'`
- This ensures the page fully reloads and fetches fresh subscription data from backend
- Prevents stale TRIAL status from staying in UI

---

## Root Cause Analysis

### Why Did It Create TRIAL Subscription?

1. **Backend Default Behavior**: When `is_trial` is not specified, backend defaults to creating TRIAL subscriptions
2. **Frontend Omission**: We didn't pass `is_trial: false` in the creation request
3. **Expected Flow**: Backend should update TRIAL → ACTIVE after payment verification

### Why Wasn't It Updated to ACTIVE?

1. **Callback Loop**: Payment callback page was stuck in infinite loop
2. **No Verification**: The `verifyPayment` API was never called
3. **Status Stuck**: Subscription remained in TRIAL status because verification never ran

---

## Testing New Payment Flow

To test that this is now fixed:

1. **Create new test subscription**
2. **Select plan and click "Proceed to Payment"**
3. **Verify subscription created with `is_trial: false`** ✅
4. **Complete payment on Paystack**
5. **Redirect to callback page**
6. **Verify verification API is called** ✅
7. **Check subscription status changes to ACTIVE** ✅
8. **Verify page reloads showing ACTIVE status** ✅

---

## Expected vs Actual

### What SHOULD Happen:
```
Create subscription (is_trial: false, status: INACTIVE)
       ↓
Initialize payment
       ↓
User pays on Paystack
       ↓
Callback → Verify payment
       ↓
Backend updates: status: ACTIVE, is_trial: false
       ↓
Frontend shows: Status: ACTIVE (green badge)
```

### What WAS Happening:
```
Create subscription (is_trial: undefined → defaults to TRIAL)
       ↓
Initialize payment
       ↓
User pays on Paystack
       ↓
Callback → STUCK IN LOOP (no verification)
       ↓
Backend never updated
       ↓
Frontend shows: Status: TRIAL (blue badge)
```

### What WILL Happen Now:
```
Create subscription (is_trial: false, status: INACTIVE)
       ↓
Initialize payment
       ↓
User pays on Paystack
       ↓
Callback → Verify payment ✅
       ↓
Backend updates: status: ACTIVE, is_trial: false ✅
       ↓
Force reload → Fresh data from backend ✅
       ↓
Frontend shows: Status: ACTIVE (green badge) ✅
```

---

## Status

- ✅ Fixed subscription creation to set `is_trial: false`
- ✅ Fixed payment callback infinite loop
- ✅ Added force reload after verification
- ⏳ **Need to verify stuck payment manually (see options above)**

---

**Next Action:** Reload the payment callback page or manually verify the payment using one of the options above.
