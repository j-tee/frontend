# Subscription Frontend - Quick Reference Card

**Date**: October 14, 2025 | **Status**: ✅ COMPLETE

---

## 🚀 Quick Start

### 1. Add Routes (Required)
```tsx
// In your router file
import SubscriptionPortal from './features/subscriptions/pages/SubscriptionPortal'
import PaymentCallback from './features/subscriptions/pages/PaymentCallback'
import PaymentSuccess from './features/subscriptions/pages/PaymentSuccess'
import PaymentCancelled from './features/subscriptions/pages/PaymentCancelled'

<Route path="/subscriptions" element={<SubscriptionPortal />} />
<Route path="/subscriptions/payment-callback" element={<PaymentCallback />} />
<Route path="/subscriptions/payment-success" element={<PaymentSuccess />} />
<Route path="/subscriptions/payment-cancelled" element={<PaymentCancelled />} />
```

### 2. Load on App Start (Required)
```tsx
// In DashboardLayout or App.tsx
import { useAppDispatch } from './hooks'
import { loadActiveSubscription } from './store/slices/subscriptionSlice'

useEffect(() => {
  void dispatch(loadActiveSubscription())
}, [dispatch])
```

---

## 📦 Key Imports

```tsx
// Redux
import { useAppDispatch, useAppSelector } from './hooks'
import {
  // Thunks
  loadActiveSubscription,
  loadPlans,
  loadPaymentHistory,
  loadAlerts,
  initiatePayment,
  verifyPayment,
  markAlertRead,
  
  // Selectors
  selectActiveSubscription,
  selectPlans,
  selectPayments,
  selectAlerts,
  selectIsSubscriptionActive,
  selectDaysUntilRenewal,
  selectSubscriptionStatus,
  selectUnreadAlertsCount
} from './store/slices/subscriptionSlice'

// Types
import type {
  Subscription,
  Plan,
  SubscriptionPayment,
  SubscriptionAlert,
  PaymentGateway
} from './types/subscriptions'
```

---

## 🎯 Common Use Cases

### Display Subscription Badge
```tsx
const status = useAppSelector(selectSubscriptionStatus)
const daysLeft = useAppSelector(selectDaysUntilRenewal)

<Badge bg={status === 'ACTIVE' ? 'success' : 'danger'}>
  {status} {status === 'ACTIVE' && `(${daysLeft} days)`}
</Badge>
```

### Check if Subscription Active
```tsx
const isActive = useAppSelector(selectIsSubscriptionActive)

if (!isActive) {
  return <SubscriptionRequiredMessage />
}
```

### Show Unread Alerts Count
```tsx
const unreadCount = useAppSelector(selectUnreadAlertsCount)

<Badge bg="danger" pill>{unreadCount}</Badge>
```

### Get Current Subscription Details
```tsx
const subscription = useAppSelector(selectActiveSubscription)

{subscription && (
  <div>
    <p>Plan: {subscription.plan_details.name}</p>
    <p>Status: {subscription.status}</p>
    <p>Renews: {new Date(subscription.current_period_end).toLocaleDateString()}</p>
  </div>
)}
```

---

## 💳 Payment Flows

### Paystack (Mobile Money & Cards)
```
User Action → Payment Modal → Select Paystack 
→ initiatePayment() → Redirect to Paystack 
→ User Pays → Callback URL → verifyPayment() 
→ Success ✅
```

### Stripe (International Cards)
```
User Action → Payment Modal → Select Stripe 
→ initiatePayment() → Redirect to Stripe Checkout 
→ User Pays → Success URL → verifyPayment() 
→ Success ✅
```

---

## 📊 Redux Selectors

| Selector | Returns | Use Case |
|----------|---------|----------|
| `selectActiveSubscription` | `Subscription \| null` | Full subscription data |
| `selectIsSubscriptionActive` | `boolean` | Gate access to features |
| `selectSubscriptionStatus` | `SubscriptionStatus` | Display status badge |
| `selectDaysUntilRenewal` | `number` | Show renewal countdown |
| `selectPlans` | `Plan[]` | List available plans |
| `selectPayments` | `SubscriptionPayment[]` | Payment history |
| `selectAlerts` | `SubscriptionAlert[]` | All alerts |
| `selectUnreadAlertsCount` | `number` | Unread badge count |

---

## 🔧 Redux Thunks

| Thunk | Params | Purpose |
|-------|--------|---------|
| `loadActiveSubscription` | none | Load current subscription |
| `loadPlans` | none | Load all plans |
| `loadPaymentHistory` | none | Load payment records |
| `loadAlerts` | none | Load all alerts |
| `initiatePayment` | `{ subscriptionId, payload }` | Start payment process |
| `verifyPayment` | `{ subscriptionId, payload }` | Verify completed payment |
| `markAlertRead` | `alertId` | Mark alert as read |
| `dismissAlert` | `alertId` | Dismiss alert |

---

## 🎨 Components

### SubscriptionPortal
```tsx
<SubscriptionPortal />
```
**Full-featured subscription management page**
- Subscription overview
- Payment initiation
- Plan selection
- Payment history
- Alerts

### PlanCard
```tsx
<PlanCard 
  plan={plan} 
  isCurrent={false}
  onUpgrade={(planId) => console.log(planId)}
/>
```
**Display individual plan**

### PaymentHistoryTable
```tsx
<PaymentHistoryTable payments={payments} />
```
**Payment records table**

### AlertsList
```tsx
<AlertsList alerts={alerts} />
```
**Alerts sidebar/widget**

---

## 🚦 Status Values

### Subscription Status
- `TRIAL` → Blue (info)
- `ACTIVE` → Green (success)
- `PAST_DUE` → Yellow (warning)
- `INACTIVE` → Gray (secondary)
- `CANCELLED` → Gray (secondary)
- `SUSPENDED` → Red (danger)
- `EXPIRED` → Red (danger)

### Payment Status
- `PAID` → Green
- `PENDING` → Yellow
- `FAILED` → Red
- `OVERDUE` → Red
- `CANCELLED` → Gray

### Alert Priority
- `LOW` → Blue
- `MEDIUM` → Primary
- `HIGH` → Yellow
- `CRITICAL` → Red

---

## 🧪 Test Cards

### Paystack
- **Success**: `4084084084084081`
- **Decline**: `5060666666666666666`

### Stripe
- **Success**: `4242424242424242`
- **Decline**: `4000000000000002`
- **3D Secure**: `4000002500003155`

---

## 📍 Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/subscriptions` | SubscriptionPortal | Main portal |
| `/subscriptions/payment-callback` | PaymentCallback | Paystack callback |
| `/subscriptions/payment-success` | PaymentSuccess | Stripe success |
| `/subscriptions/payment-cancelled` | PaymentCancelled | Stripe cancel |

---

## 🔗 Backend Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/subscriptions/api/subscriptions/me/` | GET | Current subscription |
| `/subscriptions/api/plans/` | GET | Available plans |
| `/subscriptions/api/payments/` | GET | Payment history |
| `/subscriptions/api/alerts/` | GET | Alert notifications |
| `/subscriptions/api/subscriptions/{id}/initialize_payment/` | POST | Start payment |
| `/subscriptions/api/subscriptions/{id}/verify_payment/` | POST | Verify payment |
| `/subscriptions/api/alerts/{id}/mark_read/` | POST | Mark alert read |

---

## ⚠️ Important Notes

1. **Always load subscription on app start**
2. **Use selectors, not direct state access**
3. **Handle null subscription (no subscription yet)**
4. **Payment callbacks must verify with backend**
5. **Test with test cards before production**
6. **Configure CORS for payment redirects**
7. **Set up webhook URLs in gateways**

---

## 📁 File Locations

```
src/
├── types/subscriptions.ts
├── services/subscriptionService.ts
├── store/slices/subscriptionSlice.ts
└── features/subscriptions/
    ├── pages/
    │   ├── SubscriptionPortal.tsx
    │   ├── PaymentCallback.tsx
    │   ├── PaymentSuccess.tsx
    │   └── PaymentCancelled.tsx
    └── components/
        ├── PlanCard.tsx
        ├── PaymentHistoryTable.tsx
        └── AlertsList.tsx
```

---

## 🆘 Troubleshooting

### Payment not redirecting
- Check `window.location.href` assignment
- Verify authorization_url/checkout_url in response
- Check browser console for errors

### Payment verification failing
- Ensure backend webhook is configured
- Check reference/session_id is correct
- Verify CORS allows POST requests
- Check backend API logs

### Subscription not loading
- Check `loadActiveSubscription()` is called
- Verify backend endpoint returns data
- Check Redux DevTools for state
- Ensure authentication token is valid

### Alerts not showing
- Call `loadAlerts()` on portal mount
- Check backend returns alert data
- Verify alert types match enum

---

**For Full Documentation**: See `docs/SUBSCRIPTION-FRONTEND-IMPLEMENTATION.md`  
**For Implementation Summary**: See `docs/SUBSCRIPTION-FRONTEND-COMPLETE.md`  
**For Backend API**: See Backend API Quick Reference Card
