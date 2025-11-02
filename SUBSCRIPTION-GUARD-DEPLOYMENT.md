# Subscription Guard - Deployment Guide

## ✅ Component Created

The `RequireSubscription` component has been created at:
- **Location**: `src/components/RequireSubscription.tsx`
- **Dependencies**: All Redux selectors verified ✓
- **Testing**: Ready for local testing

---

## 🚀 Next Steps

### Step 1: Protect Critical Routes (IMMEDIATE)

Update `App.tsx` to wrap revenue-generating routes with the subscription guard.

#### Import the Component
```tsx
import RequireSubscription from './components/RequireSubscription'
```

#### Protect Sales Route (HIGHEST PRIORITY)
```tsx
// BEFORE
<Route path="sales" element={<SalesPage />} />

// AFTER
<Route 
  path="sales" 
  element={
    <RequireSubscription feature="sales operations">
      <SalesPage />
    </RequireSubscription>
  } 
/>
```

#### Protect Billing Route
```tsx
<Route 
  path="billing" 
  element={
    <RequireSubscription feature="billing and invoices">
      <BillingPage />
    </RequireSubscription>
  } 
/>
```

#### Protect All Reports Routes
```tsx
<Route 
  path="reports/*" 
  element={
    <RequireSubscription feature="reports and analytics">
      <Outlet />
    </RequireSubscription>
  }
>
  {/* All report subroutes automatically protected */}
  <Route index element={<ReportsPage />} />
  <Route path="sales/*" element={...} />
  <Route path="financial/*" element={...} />
  <Route path="inventory/*" element={...} />
  <Route path="customer/*" element={...} />
</Route>
```

---

### Step 2: Add Warning Banners (Dashboard, Settings)

For pages that should show a warning but still allow access:

```tsx
// Dashboard - Show warning but allow view
<Route 
  path="" 
  element={
    <RequireSubscription showWarning feature="full dashboard features">
      <OverviewPage />
    </RequireSubscription>
  } 
/>

// Settings - Allow access to update payment method
<Route 
  path="settings" 
  element={
    <RequireSubscription showWarning feature="business settings">
      <SettingsPage />
    </RequireSubscription>
  } 
/>
```

---

### Step 3: Test Locally

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Test with Bypass Enabled (Current State)**
   - `.env` has `VITE_BYPASS_SUBSCRIPTION_CHECK=true`
   - All routes should work normally
   - No blocking or warnings

3. **Test with Subscription Check Enabled**
   
   Update `.env`:
   ```env
   VITE_BYPASS_SUBSCRIPTION_CHECK=false
   ```
   
   Restart the dev server:
   ```bash
   npm run dev
   ```

4. **Test Scenarios**
   
   | Subscription Status | Expected Behavior |
   |-------------------|-------------------|
   | `ACTIVE` | Full access to all features |
   | `TRIAL` | Full access to all features |
   | `PAST_DUE` | Blocked from sales/reports, warning on dashboard |
   | `EXPIRED` | Blocked from sales/reports, warning on dashboard |
   | `INACTIVE` | Blocked from sales/reports, warning on dashboard |
   | `CANCELLED` | Blocked from sales/reports, warning on dashboard |
   | `SUSPENDED` | Blocked from sales/reports, warning on dashboard |

5. **Test User Flows**
   - ✅ Try accessing `/app/sales` with expired subscription
   - ✅ Try accessing `/app/reports` with expired subscription
   - ✅ Verify "Renew Now" button redirects to `/app/subscription`
   - ✅ Verify subscription portal is always accessible
   - ✅ Verify settings page is accessible (with warning)

---

### Step 4: Backend API Protection (CRITICAL)

⚠️ **Frontend guards can be bypassed in the browser!**

The backend MUST enforce subscription checks on all protected endpoints.

#### Required Backend Changes

Add subscription validation to Django REST API views:

```python
# backend/subscriptions/middleware.py or decorators.py

from rest_framework.response import Response
from rest_framework import status

def require_active_subscription(view_func):
    """
    Decorator to require active subscription for API endpoints
    """
    def wrapper(request, *args, **kwargs):
        business = request.user.memberships.filter(
            is_active=True
        ).first()?.business
        
        if not business:
            return Response(
                {'error': 'No active business membership'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        subscription_status = business.subscription_status
        valid_statuses = ['ACTIVE', 'TRIAL']
        
        if subscription_status not in valid_statuses:
            return Response({
                'error': 'Active subscription required',
                'subscription_status': subscription_status,
                'message': 'Please renew your subscription to access this feature'
            }, status=status.HTTP_402_PAYMENT_REQUIRED)
        
        return view_func(request, *args, **kwargs)
    
    return wrapper
```

#### Apply to Protected Endpoints

```python
# backend/sales/api/views.py

from subscriptions.middleware import require_active_subscription

class SaleViewSet(viewsets.ModelViewSet):
    @require_active_subscription
    def create(self, request, *args, **kwargs):
        # Create sale logic
        pass
    
    @require_active_subscription
    def list(self, request, *args, **kwargs):
        # List sales logic
        pass
```

#### Endpoints to Protect

1. **Sales API** - All operations
   - `POST /sales/api/sales/` - Create sale
   - `GET /sales/api/sales/` - List sales
   - `PUT /sales/api/sales/{id}/` - Update sale
   - `DELETE /sales/api/sales/{id}/` - Delete sale

2. **Reports API** - All report generation
   - `GET /reports/api/sales/*`
   - `GET /reports/api/financial/*`
   - `GET /reports/api/inventory/*`
   - `GET /reports/api/customer/*`

3. **Billing API** - All operations
   - `POST /billing/api/invoices/`
   - `GET /billing/api/invoices/`

4. **Customers API** - Read/write operations
   - `POST /customers/api/customers/`
   - `PUT /customers/api/customers/{id}/`

---

### Step 5: Production Deployment

#### Update Production Environment

Update `.env.production`:
```env
# BEFORE
VITE_BYPASS_SUBSCRIPTION_CHECK=true

# AFTER
VITE_BYPASS_SUBSCRIPTION_CHECK=false
```

#### Deployment Checklist

- [ ] Backend subscription validation implemented and tested
- [ ] Frontend `RequireSubscription` component tested locally
- [ ] All critical routes wrapped with subscription guard
- [ ] Warning banners tested on dashboard/settings
- [ ] `.env.production` updated to disable bypass
- [ ] Deployment plan includes database migration (if needed)
- [ ] Support team notified about subscription requirements
- [ ] User communication prepared (email/notification about feature access)

#### Rollback Plan

If issues arise after deployment:

1. **Quick Fix**: Update `.env.production`
   ```env
   VITE_BYPASS_SUBSCRIPTION_CHECK=true
   ```
   Redeploy frontend

2. **Backend Fix**: Temporarily remove `@require_active_subscription` decorators

3. **Investigation**: Check logs for subscription status errors

---

## 📊 Route Protection Summary

| Route | Protection | Feature Name | Behavior |
|-------|-----------|--------------|----------|
| `/app/sales` | ✅ Block | "sales operations" | Redirect to subscription portal |
| `/app/billing` | ✅ Block | "billing and invoices" | Redirect to subscription portal |
| `/app/reports/*` | ✅ Block | "reports and analytics" | Redirect to subscription portal |
| `/app/customers` | ✅ Block | "customer management" | Redirect to subscription portal |
| `/app/inventory/*` | ⚠️ Optional | "inventory management" | Consider blocking for Premium tier |
| `/app/bookkeeping` | ⚠️ Optional | "financial records" | Consider blocking for Premium tier |
| `/app/employees` | ⚠️ Optional | "employee management" | Consider blocking for Premium tier |
| `/app` (dashboard) | 🔔 Warning | "full dashboard features" | Show banner, allow access |
| `/app/settings` | 🔔 Warning | "business settings" | Show banner, allow access |
| `/app/subscription` | ✅ Always Allow | N/A | Must be accessible to renew |
| `/app/account` | ✅ Always Allow | N/A | Personal settings always accessible |

---

## 🧪 Testing Commands

```bash
# Test with subscription checks ENABLED
VITE_BYPASS_SUBSCRIPTION_CHECK=false npm run dev

# Test with subscription checks DISABLED (development)
VITE_BYPASS_SUBSCRIPTION_CHECK=true npm run dev

# Build for production (uses .env.production)
npm run build

# Preview production build
npm run preview
```

---

## 🔍 Monitoring After Deployment

### Metrics to Track

1. **Subscription Conversions**
   - Users hitting subscription wall
   - Click-through rate on "Renew Now" button
   - Successful subscription renewals

2. **User Support**
   - Support tickets about "access denied"
   - Questions about subscription benefits
   - Payment issues

3. **Revenue Impact**
   - Reduction in unpaid usage
   - Increase in active subscriptions
   - Past due payment recoveries

### Error Monitoring

Watch for these errors in logs:

- Frontend: `subscription_status === null` (missing data)
- Backend: `402 Payment Required` responses
- Payment: Failed Paystack verifications

---

## 📞 Support Escalation

If users report access issues:

1. **Check subscription status** in admin panel
2. **Verify payment history** in Paystack dashboard
3. **Check webhook delivery** (if payment succeeded but status not updated)
4. **Temporary bypass** (if legitimate issue):
   - Update user's subscription_status to 'ACTIVE' in database
   - Investigate root cause separately

---

## ✨ Component Features

### Props

- **`children`**: React components to protect
- **`showWarning`**: Boolean - show warning banner instead of blocking (default: false)
- **`feature`**: String - feature name for user messaging (default: "this feature")

### Valid Subscription Statuses

- ✅ `ACTIVE` - Full access
- ✅ `TRIAL` - Full access (trial period)
- ❌ `PAST_DUE` - Blocked (payment overdue)
- ❌ `EXPIRED` - Blocked (subscription ended)
- ❌ `INACTIVE` - Blocked (no subscription)
- ❌ `CANCELLED` - Blocked (user cancelled)
- ❌ `SUSPENDED` - Blocked (admin suspended)

### Bypass Mode

Controlled by environment variable:
```env
VITE_BYPASS_SUBSCRIPTION_CHECK=true   # Development - allow all access
VITE_BYPASS_SUBSCRIPTION_CHECK=false  # Production - enforce subscription
```

---

## 🎯 Quick Implementation Example

```tsx
// App.tsx
import RequireSubscription from './components/RequireSubscription'

// Inside your routes:
<Route 
  path="sales" 
  element={
    <RequireSubscription feature="sales operations">
      <SalesPage />
    </RequireSubscription>
  } 
/>

<Route 
  path="reports/*" 
  element={
    <RequireSubscription feature="reports and analytics">
      <Outlet />
    </RequireSubscription>
  }
>
  <Route index element={<ReportsPage />} />
  {/* All subroutes protected */}
</Route>

<Route 
  path="" 
  element={
    <RequireSubscription showWarning feature="full dashboard features">
      <OverviewPage />
    </RequireSubscription>
  } 
/>
```

---

**Ready to deploy!** 🚀

Start with local testing, verify blocking works correctly, then coordinate with backend team for API protection before production deployment.
