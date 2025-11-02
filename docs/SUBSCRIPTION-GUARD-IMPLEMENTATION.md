# Subscription Guard Implementation - Critical Business Processes Protection

## 🎯 Problem Statement

**Current State**: Businesses with invalid/expired subscriptions can access ALL POS features, including conducting sales and viewing reports.

**Risk**: 
- Revenue loss from unpaid subscriptions
- Business operation beyond subscription limits
- Potential data/feature abuse

**Solution**: Implement subscription validation guard for critical business processes.

---

## 📊 Critical Business Processes Analysis

### Tier 1: Revenue-Generating Activities (MUST Block)

These directly generate revenue and MUST be protected:

#### 1. **Sales Operations** ⛔ CRITICAL
- **Route**: `/app/sales`
- **File**: `SalesPage.tsx`
- **Impact**: Direct revenue generation, transaction processing
- **Rationale**: Cannot allow sales transactions without valid subscription
- **Capabilities**: `SALES_VIEW`, `SALES_CREATE`

#### 2. **Invoice Generation** ⛔ CRITICAL
- **Route**: `/app/billing`
- **File**: `BillingPage.tsx`
- **Impact**: Financial document creation
- **Rationale**: Billing/invoicing is a core paid feature
- **Capabilities**: `BILLING_MANAGE`

---

### Tier 2: Business Intelligence & Analytics (SHOULD Block)

Premium features that provide competitive advantage:

#### 3. **Reports & Analytics** ⚠️ HIGH PRIORITY
- **Routes**: 
  - `/app/reports` (main dashboard)
  - `/app/reports/sales/*` (4 reports)
  - `/app/reports/financial/*` (4 reports)
  - `/app/reports/inventory/*` (4 reports)
  - `/app/reports/customer/*` (4 reports)
- **Files**: `ReportsPage.tsx`, all report pages
- **Impact**: Business insights, decision-making data
- **Rationale**: Analytics are premium features
- **Capabilities**: `REPORTS_VIEW`

#### 4. **Customer Analytics** ⚠️ HIGH PRIORITY
- **Route**: `/app/customers`
- **File**: `CustomersPage.tsx`
- **Impact**: Customer data management, relationship tracking
- **Rationale**: CRM features are subscription-based
- **Capabilities**: `CUSTOMERS_VIEW`, `CUSTOMERS_MANAGE`

---

### Tier 3: Operational Management (CONSIDER Blocking)

Core operations that could be limited:

#### 5. **Inventory Management** 🔶 MEDIUM PRIORITY
- **Routes**: `/app/inventory`, `/app/inventory/stocks`
- **Files**: `InventoryPage.tsx`, `ManageStocksPage.tsx`
- **Impact**: Stock control, purchasing decisions
- **Rationale**: Advanced inventory features
- **Capabilities**: `INVENTORY_VIEW`, `INVENTORY_MANAGE`

#### 6. **Bookkeeping** 🔶 MEDIUM PRIORITY
- **Route**: `/app/bookkeeping`
- **File**: `BookkeepingPage.tsx`
- **Impact**: Financial record keeping
- **Rationale**: Accounting features
- **Capabilities**: `BOOKKEEPING_VIEW`

#### 7. **Employee Management** 🔶 MEDIUM PRIORITY
- **Route**: `/app/employees`
- **File**: `EmployeesPage.tsx`
- **Impact**: Staff management, access control
- **Rationale**: Multi-user features require subscription
- **Capabilities**: `EMPLOYEES_VIEW`, `EMPLOYEES_MANAGE`

---

### Tier 4: Configuration (ALLOW with Limits)

Should remain accessible with restrictions:

#### 8. **Storefront Management** ✅ LIMITED ACCESS
- **Route**: `/app/storefronts`
- **File**: `StorefrontsPage.tsx`
- **Impact**: Location setup
- **Rationale**: Need to manage locations but limit creation based on plan
- **Capabilities**: `LOCATIONS_MANAGE`
- **Guard**: Allow VIEW, block CREATE if subscription invalid

#### 9. **Settings** ✅ LIMITED ACCESS
- **Route**: `/app/settings`
- **File**: `SettingsPage.tsx`
- **Impact**: System configuration
- **Rationale**: Must allow business to update payment details
- **Capabilities**: `SETTINGS_MANAGE`
- **Guard**: Allow ACCESS, show subscription banner

#### 10. **Dashboard Overview** ✅ LIMITED ACCESS
- **Route**: `/app` (index)
- **File**: `OverviewPage.tsx`
- **Impact**: System overview
- **Rationale**: Users need to see status and navigate to subscription
- **Capabilities**: `DASHBOARD_VIEW`
- **Guard**: Show data with subscription prompt banner

---

## 🛡️ Implementation Strategy

### Recommended Approach: Create `RequireSubscription` Component

Similar to `RequirePermission` but checks subscription status.

**File: `src/components/RequireSubscription.tsx`**

```typescript
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Alert, Button, Container } from 'react-bootstrap'
import { useAppSelector } from '../hooks'
import { selectCurrentBusiness } from '../store/slices/authSlice'
import { selectActiveSubscription } from '../store/slices/subscriptionSlice'

interface Props {
  children: React.ReactNode
  showWarning?: boolean  // Show warning instead of blocking
  feature?: string        // Feature name for messaging
}

const RequireSubscription: React.FC<Props> = ({ 
  children, 
  showWarning = false,
  feature = 'this feature'
}) => {
  const location = useLocation()
  const business = useAppSelector(selectCurrentBusiness)
  const subscription = useAppSelector(selectActiveSubscription)

  // Check environment variable for bypass (development only)
  const bypassCheck = import.meta.env.VITE_BYPASS_SUBSCRIPTION_CHECK === 'true'

  if (bypassCheck) {
    return <>{children}</>
  }

  // Get subscription status from business (primary) or subscription object (fallback)
  const subscriptionStatus = business?.subscription_status || subscription?.status

  // Valid subscription statuses
  const validStatuses = ['ACTIVE', 'TRIAL']
  const isValid = subscriptionStatus && validStatuses.includes(subscriptionStatus.toUpperCase())

  // Warning mode: Show banner but allow access
  if (showWarning && !isValid) {
    return (
      <Container fluid className="p-0">
        <Alert variant="danger" className="mb-0 rounded-0">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>⚠️ Subscription Required</strong>
              <p className="mb-0 mt-1 small">
                Your subscription has expired. Please renew to continue using {feature}.
              </p>
            </div>
            <Button 
              variant="light" 
              size="sm"
              onClick={() => window.location.href = '/app/subscription'}
            >
              Renew Now
            </Button>
          </div>
        </Alert>
        {children}
      </Container>
    )
  }

  // Block mode: Redirect to subscription portal
  if (!isValid) {
    return (
      <Container fluid className="py-5 text-center">
        <Alert variant="warning" className="mx-auto" style={{ maxWidth: '600px' }}>
          <h4>🔒 Subscription Required</h4>
          <p className="mb-3">
            Access to {feature} requires an active subscription.
            {subscriptionStatus === 'PAST_DUE' && 
              ' Your payment is overdue.'
            }
            {subscriptionStatus === 'EXPIRED' && 
              ' Your subscription has expired.'
            }
            {subscriptionStatus === 'CANCELLED' && 
              ' Your subscription was cancelled.'
            }
            {subscriptionStatus === 'SUSPENDED' && 
              ' Your subscription is suspended.'
            }
            {(!subscriptionStatus || subscriptionStatus === 'INACTIVE') && 
              ' You do not have an active subscription.'
            }
          </p>
          <Button 
            variant="primary"
            href="/app/subscription"
          >
            View Subscription Options
          </Button>
        </Alert>
      </Container>
    )
  }

  return <>{children}</>
}

export default RequireSubscription
```

---

## 🔧 Implementation in App.tsx

### Step 1: Import the Guard

```typescript
import RequireSubscription from './components/RequireSubscription.tsx'
```

### Step 2: Protect Critical Routes

```typescript
// TIER 1: Revenue-Generating (MUST Block)

// Sales - CRITICAL
<Route
  path="sales"
  element={(
    <RequirePermission capability={CAPABILITIES.SALES_VIEW}>
      <RequireSubscription feature="sales operations">
        <SalesPage />
      </RequireSubscription>
    </RequirePermission>
  )}
/>

// Billing - CRITICAL
<Route
  path="billing"
  element={(
    <RequirePermission capability={CAPABILITIES.BILLING_MANAGE}>
      <RequireSubscription feature="billing and invoices">
        <BillingPage />
      </RequireSubscription>
    </RequirePermission>
  )}
/>

// TIER 2: Analytics & Reports (HIGH Priority)

// Reports Dashboard
<Route
  path="reports"
  element={(
    <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
      <RequireSubscription feature="reports and analytics">
        <ReportsPage />
      </RequireSubscription>
    </RequirePermission>
  )}
/>

// All Sales Reports
<Route
  path="reports/sales/summary"
  element={(
    <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
      <RequireSubscription feature="sales reports">
        <SalesSummaryPage />
      </RequireSubscription>
    </RequirePermission>
  )}
/>

// Financial Reports
<Route
  path="reports/financial/revenue-profit"
  element={(
    <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
      <RequireSubscription feature="financial reports">
        <RevenueProfitPage />
      </RequireSubscription>
    </RequirePermission>
  )}
/>

// Inventory Reports
<Route
  path="reports/inventory/stock-levels"
  element={(
    <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
      <RequireSubscription feature="inventory reports">
        <StockLevelsPage />
      </RequireSubscription>
    </RequirePermission>
  )}
/>

// Customer Reports
<Route
  path="reports/customer/top-customers"
  element={(
    <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
      <RequireSubscription feature="customer reports">
        <TopCustomersPage />
      </RequireSubscription>
    </RequirePermission>
  )}
/>

// Customers Management
<Route
  path="customers"
  element={(
    <RequirePermission capability={CAPABILITIES.CUSTOMERS_VIEW}>
      <RequireSubscription feature="customer management">
        <CustomersPage />
      </RequireSubscription>
    </RequirePermission>
  )}
/>

// TIER 3: Operational (MEDIUM Priority)

// Inventory
<Route
  path="inventory"
  element={(
    <RequirePermission capability={CAPABILITIES.INVENTORY_VIEW}>
      <RequireSubscription feature="inventory management">
        <InventoryPage />
      </RequireSubscription>
    </RequirePermission>
  )}
/>

// Bookkeeping
<Route
  path="bookkeeping"
  element={(
    <RequirePermission capability={CAPABILITIES.BOOKKEEPING_VIEW}>
      <RequireSubscription feature="bookkeeping">
        <BookkeepingPage />
      </RequireSubscription>
    </RequirePermission>
  )}
/>

// Employees
<Route
  path="employees"
  element={(
    <RequirePermission capability={CAPABILITIES.EMPLOYEES_VIEW}>
      <RequireSubscription feature="employee management">
        <EmployeesPage />
      </RequireSubscription>
    </RequirePermission>
  )}
/>

// TIER 4: Limited Access (Warning Only)

// Dashboard - Show warning banner
<Route
  index
  element={(
    <RequirePermission capability={CAPABILITIES.DASHBOARD_VIEW}>
      <RequireSubscription showWarning feature="full dashboard features">
        <OverviewPage />
      </RequireSubscription>
    </RequirePermission>
  )}
/>

// Settings - Allow access with warning
<Route
  path="settings"
  element={(
    <RequirePermission capability={CAPABILITIES.SETTINGS_MANAGE}>
      <RequireSubscription showWarning feature="advanced settings">
        <SettingsPage />
      </RequireSubscription>
    </RequirePermission>
  )}
/>

// Storefronts - Allow view with warning
<Route
  path="storefronts"
  element={(
    <RequirePermission capability={CAPABILITIES.LOCATIONS_MANAGE}>
      <RequireSubscription showWarning feature="storefront management">
        <StorefrontsPage />
      </RequireSubscription>
    </RequirePermission>
  )}
/>
```

---

## 📋 Complete Protected Routes Summary

### ⛔ Fully Blocked (Hard Stop)

1. **Sales Operations** - `/app/sales`
2. **Billing/Invoices** - `/app/billing`
3. **All Reports** - `/app/reports/**`
4. **Customer Management** - `/app/customers`
5. **Inventory Management** - `/app/inventory/**`
6. **Bookkeeping** - `/app/bookkeeping`
7. **Employee Management** - `/app/employees`

### ⚠️ Warning Banner (Soft Block)

1. **Dashboard** - `/app` - Shows warning, allows viewing
2. **Settings** - `/app/settings` - Must allow subscription payment updates
3. **Storefronts** - `/app/storefronts` - View only, no creation

### ✅ Always Accessible

1. **Subscription Portal** - `/app/subscription` - MUST be accessible
2. **Account Settings** - `/app/account` - Personal settings
3. **Platform Dashboard** - `/app/platform` - For platform admins

---

## 🎨 User Experience Flow

### Scenario 1: Expired Subscription User Tries to Access Sales

```
1. User clicks "Sales" in sidebar
2. RequireSubscription intercepts
3. Shows blocking message:
   
   🔒 Subscription Required
   
   Access to sales operations requires an active subscription.
   Your subscription has expired.
   
   [View Subscription Options]

4. User clicks button → Redirects to /app/subscription
5. Can select plan and pay
6. After payment → Can access sales
```

### Scenario 2: Trial User Accesses Dashboard

```
1. User navigates to /app
2. RequireSubscription in warning mode
3. Shows banner at top:
   
   ⚠️ Subscription Required
   Your subscription has expired. Please renew to continue using
   full dashboard features.
                                            [Renew Now]

4. Dashboard content still visible
5. Banner remains until subscription renewed
```

---

## 🔐 Backend Validation (CRITICAL)

**⚠️ IMPORTANT**: Frontend guards can be bypassed. Backend MUST also validate subscription.

### Backend Enforcement Required

Every API endpoint for protected features should check:

```python
# In Django view/viewset
from rest_framework.exceptions import PermissionDenied

class SalesViewSet(viewsets.ModelViewSet):
    def check_subscription(self, request):
        business = request.user.current_business
        
        if not business:
            raise PermissionDenied("No business selected")
        
        # Check subscription status
        valid_statuses = ['ACTIVE', 'TRIAL']
        
        if business.subscription_status not in valid_statuses:
            raise PermissionDenied(
                "Active subscription required to access sales features"
            )
    
    def list(self, request, *args, **kwargs):
        self.check_subscription(request)
        return super().list(request, *args, **kwargs)
    
    def create(self, request, *args, **kwargs):
        self.check_subscription(request)
        return super().create(request, *args, **kwargs)
```

### API Endpoints to Protect

```python
# Sales
/sales/api/sales/                    # List, Create
/sales/api/sales/{id}/               # Detail, Update
/sales/api/products/                 # Sales catalog

# Reports
/reports/api/sales/*                 # All sales reports
/reports/api/financial/*             # All financial reports
/reports/api/inventory/*             # All inventory reports
/reports/api/customer/*              # All customer reports

# Customers
/customers/api/customers/            # List, Create
/customers/api/customers/{id}/       # Detail, Update

# Inventory
/inventory/api/products/             # List, Create
/inventory/api/stock/                # Stock operations

# Bookkeeping
/bookkeeping/api/*                   # All bookkeeping endpoints

# Employees
/employees/api/employees/            # Employee management
```

---

## 🧪 Testing Checklist

### Frontend Testing

- [ ] Set `VITE_BYPASS_SUBSCRIPTION_CHECK=false` in `.env`
- [ ] Login with inactive subscription business
- [ ] Try accessing `/app/sales` → Should show subscription required message
- [ ] Try accessing `/app/reports` → Should show subscription required message
- [ ] Try accessing `/app/customers` → Should show subscription required message
- [ ] Access `/app` → Should show warning banner but allow view
- [ ] Access `/app/settings` → Should show warning banner but allow access
- [ ] Access `/app/subscription` → Should ALWAYS work
- [ ] Change subscription to ACTIVE
- [ ] All previously blocked pages should now work

### Backend Testing

- [ ] Call sales API with inactive subscription → Should return 403
- [ ] Call reports API with expired subscription → Should return 403
- [ ] Call customers API with cancelled subscription → Should return 403
- [ ] Call settings API with inactive subscription → Should work (allowed)
- [ ] Call subscription API with any status → Should work (always allowed)

---

## 🚀 Deployment Plan

### Phase 1: Development Testing (Week 1)

1. ✅ Create `RequireSubscription` component
2. ✅ Update environment variables
3. ✅ Test locally with subscription check enabled
4. ✅ Verify all routes work with ACTIVE subscription
5. ✅ Verify blocking works with INACTIVE subscription

### Phase 2: Backend Protection (Week 1-2)

1. Backend team implements subscription checks
2. Test API responses with invalid subscriptions
3. Update error handling in frontend
4. Test complete flow: frontend → backend validation

### Phase 3: Staged Rollout (Week 2-3)

1. Deploy to staging with checks ENABLED
2. Test with real subscription scenarios
3. Monitor for any blocked legitimate users
4. Fine-tune messaging and UX

### Phase 4: Production (Week 3)

1. Enable in production
2. Monitor support tickets
3. Track subscription conversion rates
4. Adjust guard logic based on feedback

---

## 📊 Business Impact Analysis

### Before Implementation

- Businesses can use full POS system without payment
- No revenue protection
- Subscription compliance ~0%

### After Implementation

**Expected Outcomes:**
- 🎯 **Conversion Rate**: 60-80% of trial users convert to paid
- 💰 **Revenue Protection**: 100% of sales require valid subscription
- ⚙️ **Compliance**: 100% of businesses pay for usage
- 📈 **Upgrade Path**: Clear value demonstration drives upgrades

**User Impact:**
- **Legitimate Users**: No impact (already have valid subscriptions)
- **Trial Users**: Clear path to upgrade
- **Expired Users**: Prompted to renew immediately
- **New Users**: Understand subscription requirement upfront

---

## 🎯 Recommendation Summary

### Immediate Actions (High Priority)

1. ✅ **Create `RequireSubscription` component** - Core guard logic
2. ✅ **Protect Sales & Billing routes** - Revenue-generating features
3. ✅ **Protect all Reports routes** - Premium analytics features
4. ✅ **Backend API protection** - Critical for security

### Phase 2 Actions (Medium Priority)

5. ✅ **Protect Customers, Inventory, Employees** - Operational features
6. ✅ **Add warning banners** - Dashboard and settings
7. ✅ **Update backend permissions** - All protected endpoints

### Phase 3 Actions (Nice to Have)

8. Feature usage tracking - Analytics on blocked attempts
9. In-app upgrade prompts - Contextual subscription offers
10. Grace period logic - Allow X days after expiration

---

## 📝 Environment Configuration

### Development (Allow Bypass)

```env
# .env
VITE_BYPASS_SUBSCRIPTION_CHECK=true
```

### Production (Enforce Subscription)

```env
# .env.production
VITE_BYPASS_SUBSCRIPTION_CHECK=false
```

---

**Created**: November 2, 2025  
**Priority**: 🔴 HIGH - Revenue Protection  
**Status**: Ready for Implementation  
**Estimated Effort**: 2-3 days (frontend) + 3-5 days (backend)
