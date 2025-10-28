# Business-Centric Subscription Quick Reference

**Last Updated**: October 14, 2025  
**Status**: ✅ Production Ready

---

## 🚀 Quick Start

### Get Current Business
```typescript
import { useAppSelector } from './hooks'
import { selectCurrentBusiness } from './store/slices/authSlice'

const currentBusiness = useAppSelector(selectCurrentBusiness)
```

### Load Subscription
```typescript
import { loadActiveSubscription } from './store/slices/subscriptionSlice'

useEffect(() => {
  if (currentBusiness?.id) {
    dispatch(loadActiveSubscription(currentBusiness.id))
  }
}, [dispatch, currentBusiness?.id])
```

### Check Subscription Status
```typescript
// Option 1: From business object (RECOMMENDED)
const isActive = 
  currentBusiness?.subscription_status === 'ACTIVE' ||
  currentBusiness?.subscription_status === 'TRIAL'

// Option 2: From subscription detail
const subscription = useAppSelector(selectActiveSubscription)
const isActive = subscription?.status === 'ACTIVE'
```

---

## 🔑 Key Patterns

### Pattern 1: Component with Subscription Check
```typescript
import { useAppSelector } from '../../hooks'
import { selectCurrentBusiness } from '../../store/slices/authSlice'
import { selectActiveSubscription, loadActiveSubscription } from '../../store/slices/subscriptionSlice'

export default function MyComponent() {
  const dispatch = useAppDispatch()
  const currentBusiness = useAppSelector(selectCurrentBusiness)
  const subscription = useAppSelector(selectActiveSubscription)
  
  // Load subscription on mount
  useEffect(() => {
    if (currentBusiness?.id) {
      dispatch(loadActiveSubscription(currentBusiness.id))
    }
  }, [dispatch, currentBusiness?.id])
  
  // Validate business exists
  if (!currentBusiness) {
    return <Alert variant="warning">Please select a business</Alert>
  }
  
  // Check subscription status
  if (currentBusiness.subscription_status !== 'ACTIVE') {
    return <Alert variant="danger">Subscription required</Alert>
  }
  
  return <div>Your component content</div>
}
```

### Pattern 2: Create Subscription
```typescript
const handleSubscribe = async (planId: string) => {
  // Validate business
  if (!currentBusiness?.id) {
    alert('Please select a business first')
    return
  }
  
  // Create subscription
  const result = await dispatch(createSubscription({
    plan_id: planId,
    business_id: currentBusiness.id,  // REQUIRED
    payment_method: 'PAYSTACK',
    is_trial: false
  })).unwrap()
  
  if (result.success) {
    // Redirect to payment
    window.location.href = result.payment_url
  }
}
```

### Pattern 3: Payment Verification
```typescript
const verifyPayment = async (reference: string) => {
  // Validate business
  if (!currentBusiness?.id) {
    setError('No business selected')
    return
  }
  
  // Verify payment
  const result = await dispatch(verifyPayment({
    subscriptionId: subscription.id,
    payload: { gateway: 'PAYSTACK', reference }
  })).unwrap()
  
  // Reload subscription for this business
  if (result.success) {
    await dispatch(loadActiveSubscription(currentBusiness.id))
    navigate('/subscriptions')
  }
}
```

---

## 🎯 Common Use Cases

### Use Case 1: Display Subscription Status
```typescript
const StatusBadge = () => {
  const business = useAppSelector(selectCurrentBusiness)
  
  const variant = {
    ACTIVE: 'success',
    TRIAL: 'info',
    EXPIRED: 'danger',
    SUSPENDED: 'warning'
  }[business?.subscription_status ?? 'EXPIRED'] ?? 'secondary'
  
  return (
    <Badge bg={variant}>
      {business?.subscription_status ?? 'No Subscription'}
    </Badge>
  )
}
```

### Use Case 2: Subscription Guard
```typescript
const SubscriptionGuard = ({ children }) => {
  const business = useAppSelector(selectCurrentBusiness)
  
  if (!business) {
    return <Navigate to="/select-business" />
  }
  
  if (business.subscription_status === 'EXPIRED') {
    return <Navigate to="/subscriptions/upgrade" />
  }
  
  return <>{children}</>
}
```

### Use Case 3: Plan Selection
```typescript
const PlanSelector = () => {
  const dispatch = useAppDispatch()
  const business = useAppSelector(selectCurrentBusiness)
  const plans = useAppSelector(selectPlans)
  
  const handleSelectPlan = async (planId: string) => {
    if (!business?.id) return
    
    await dispatch(createSubscription({
      plan_id: planId,
      business_id: business.id,
      payment_method: 'PAYSTACK'
    }))
  }
  
  return (
    <div>
      {plans.map(plan => (
        <PlanCard 
          key={plan.id} 
          plan={plan}
          onSelect={() => handleSelectPlan(plan.id)}
        />
      ))}
    </div>
  )
}
```

---

## ⚠️ Common Mistakes

### ❌ DON'T: Load subscription without business
```typescript
// WRONG - Missing business context
dispatch(loadActiveSubscription())
```

### ✅ DO: Pass businessId
```typescript
// CORRECT - Includes business context
if (currentBusiness?.id) {
  dispatch(loadActiveSubscription(currentBusiness.id))
}
```

### ❌ DON'T: Create subscription without business_id
```typescript
// WRONG - business_id is required
dispatch(createSubscription({
  plan_id: planId,
  payment_method: 'PAYSTACK'
}))
```

### ✅ DO: Include business_id
```typescript
// CORRECT - business_id included
dispatch(createSubscription({
  plan_id: planId,
  business_id: currentBusiness.id,  // REQUIRED
  payment_method: 'PAYSTACK'
}))
```

### ❌ DON'T: Check user subscription status
```typescript
// WRONG - Subscriptions are business-centric
const isActive = user?.subscription_status === 'ACTIVE'
```

### ✅ DO: Check business subscription status
```typescript
// CORRECT - Check business subscription
const isActive = currentBusiness?.subscription_status === 'ACTIVE'
```

---

## 🔧 Utility Functions

### Check if Business Can Access Feature
```typescript
export const canAccessFeature = (
  business: BusinessSummary | null,
  feature: 'multi_storefront' | 'advanced_reports' | 'api_access'
): boolean => {
  if (!business?.subscription) return false
  
  const featureMap: Record<string, string[]> = {
    multi_storefront: ['Pro', 'Enterprise'],
    advanced_reports: ['Pro', 'Enterprise'],
    api_access: ['Enterprise']
  }
  
  return featureMap[feature]?.includes(business.subscription.plan.name) ?? false
}
```

### Get Days Until Expiration
```typescript
export const getDaysUntilExpiration = (
  business: BusinessSummary | null
): number | null => {
  if (!business?.subscription?.end_date) return null
  
  const endDate = new Date(business.subscription.end_date)
  const today = new Date()
  const diff = endDate.getTime() - today.getTime()
  
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
```

### Format Subscription Display
```typescript
export const formatSubscriptionDisplay = (
  business: BusinessSummary | null
): string => {
  if (!business?.subscription) return 'No Subscription'
  
  const { plan, status } = business.subscription
  return `${plan.name} (${status})`
}
```

---

## 📊 Type Reference

### BusinessSummary
```typescript
interface BusinessSummary {
  id: UUID
  name: string
  subscription_status: 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'SUSPENDED' | 'INACTIVE'
  subscription: {
    id: UUID
    plan: {
      id: UUID
      name: string
      billing_cycle: 'MONTHLY' | 'YEARLY'
      price: string
    }
    status: string
    start_date: string
    end_date: string
  } | null
}
```

### CreateSubscriptionRequest
```typescript
interface CreateSubscriptionRequest {
  plan_id: UUID
  business_id: UUID  // REQUIRED
  payment_method: 'PAYSTACK' | 'STRIPE'
  is_trial?: boolean
}
```

### Subscription
```typescript
interface Subscription {
  id: UUID
  business: UUID
  business_name: string
  created_by: UUID
  created_by_name: string
  plan: UUID
  plan_details: Plan
  status: 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED'
  start_date: string
  end_date: string
  auto_renew: boolean
  payment_gateway: 'PAYSTACK' | 'STRIPE'
  // ... more fields
}
```

---

## 🎨 Redux Selectors

```typescript
// Auth selectors
import { 
  selectCurrentBusiness,  // BusinessSummary | null
  selectAuthState         // { user, business, employment, ... }
} from './store/slices/authSlice'

// Subscription selectors
import {
  selectActiveSubscription,    // Subscription | null
  selectPlans,                  // Plan[]
  selectSubscriptionLoading,    // boolean
  selectSubscriptionError,      // string | null
  selectPaymentHistory,         // SubscriptionPayment[]
  selectAlerts                  // SubscriptionAlert[]
} from './store/slices/subscriptionSlice'
```

---

## 🚦 Status Codes

### Subscription Status
- `ACTIVE` - Subscription is active and paid
- `TRIAL` - In trial period (usually 14 days)
- `EXPIRED` - Subscription expired, needs renewal
- `SUSPENDED` - Temporarily suspended (payment failed)
- `CANCELLED` - User cancelled subscription
- `INACTIVE` - No subscription

### Payment Status
- `PENDING` - Payment initiated, awaiting confirmation
- `COMPLETED` - Payment successful
- `FAILED` - Payment failed
- `REFUNDED` - Payment refunded

---

## 🔗 Related Files

- Types: `src/types/subscriptions.ts`
- Services: `src/services/subscriptionService.ts`
- Redux: `src/store/slices/subscriptionSlice.ts`
- Portal: `src/features/subscriptions/pages/SubscriptionPortal.tsx`
- Payment: `src/features/subscriptions/pages/PaymentCallback.tsx`
- Layout: `src/features/dashboard/DashboardLayout.tsx`

---

## 📚 Documentation

- Full Migration Guide: `SUBSCRIPTION-FRONTEND-MIGRATION.md`
- Completion Summary: `SUBSCRIPTION-BUSINESS-CENTRIC-COMPLETE.md`
- Implementation Guide: `SUBSCRIPTION-FRONTEND-IMPLEMENTATION.md`
- Backend API Guide: See backend documentation

---

**Last Verified**: October 14, 2025  
**TypeScript**: 0 errors  
**Status**: ✅ Production Ready
