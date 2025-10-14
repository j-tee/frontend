# Platform Management System - Complete Implementation ✅

## Overview

The Platform Management System provides a comprehensive dashboard for platform owners (super admins) and authorized employees to manage the entire POS system, including:

- **Subscription Plans** - Create, edit, activate/deactivate subscription plans
- **System Statistics** - View platform-wide metrics and analytics  
- **Subscription Management** - Monitor and manage all business subscriptions

---

## Access Control

### Platform Roles

The system recognizes three platform-level roles (in addition to business-level roles):

| Role | Access Level | Capabilities |
|------|-------------|--------------|
| **SUPER_ADMIN** | Full platform access | Can manage plans, view all stats, manage all subscriptions |
| **ADMIN** | Administrative access | Can manage plans and subscriptions, view stats |
| **SUPPORT** | Support access | Can view and manage subscriptions, view stats (read-only plans) |

### User Profile Structure

```typescript
interface UserProfile {
  id: UUID
  name: string
  email: string
  platform_role?: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | null
  // ... other fields
}
```

### Permission Checks

Use the utility functions in `src/utils/platformPermissions.ts`:

```typescript
import { isPlatformAdmin, isSuperAdmin, canManagePlans } from '@/utils/platformPermissions'

// Check if user has any platform admin access
if (isPlatformAdmin(user)) {
  // Show platform dashboard link
}

// Check if user can manage subscription plans
if (canManagePlans(user)) {
  // Show "Create Plan" button
}

// Check if user is super admin
if (isSuperAdmin(user)) {
  // Full access to everything
}
```

---

## Features

### 1. Platform Statistics Dashboard

**Location:** `/app/platform` (Overview tab)

**Displays:**
- Total businesses (active vs inactive)
- Total users (active vs inactive)
- Subscription statistics (total, active, trial, expired)
- Revenue metrics (total revenue, MRR)
- Revenue breakdown by plan with percentages

**API Endpoints:**
```
GET /platform/api/stats/overview/
GET /platform/api/stats/revenue_by_plan/
```

**Component:** `src/features/platform/components/PlatformStats.tsx`

---

### 2. Plan Management

**Location:** `/app/platform` (Plan Management tab)

**Features:**
- ✅ View all subscription plans in a table
- ✅ Create new plans with full configuration
- ✅ Edit existing plans
- ✅ Activate/Deactivate plans
- ✅ Delete plans
- ✅ Permission-based UI (SUPER_ADMIN and ADMIN can edit)

**Plan Configuration Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Plan name (e.g., "Basic", "Professional") |
| `description` | string | Plan description |
| `price` | decimal | Plan price |
| `currency` | string | Currency code (GHS, USD, EUR) |
| `billing_cycle` | enum | MONTHLY, QUARTERLY, YEARLY |
| `max_storefronts` | integer | Maximum storefronts allowed |
| `max_users` | integer | Maximum users allowed |
| `max_products` | integer | Maximum products allowed |
| `features` | object | Feature flags (multi_storefront, advanced_reports, etc.) |
| `is_popular` | boolean | Mark as "Popular" plan |
| `is_active` | boolean | Available for purchase |

**API Endpoints:**
```
GET    /platform/api/plans/                  # List all plans
POST   /platform/api/plans/                  # Create plan
PATCH  /platform/api/plans/{id}/             # Update plan
DELETE /platform/api/plans/{id}/             # Delete plan
POST   /platform/api/plans/{id}/activate/    # Activate plan
POST   /platform/api/plans/{id}/deactivate/  # Deactivate plan
```

**Component:** `src/features/platform/components/PlanManagement.tsx`

**Example: Creating a Plan**

```typescript
const newPlan = {
  name: "Professional",
  description: "For growing businesses",
  price: "299.00",
  currency: "GHS",
  billing_cycle: "MONTHLY",
  max_storefronts: 5,
  max_users: 10,
  max_products: 5000,
  features: {
    multi_storefront: true,
    advanced_reports: true,
    api_access: true,
    priority_support: true,
    custom_branding: false
  },
  is_popular: true,
  is_active: true
}

await createPlan(newPlan)
```

---

### 3. Subscription Management

**Location:** `/app/platform` (Subscriptions tab)

**Features:**
- ✅ View all subscriptions across all businesses
- ✅ Filter by status (Active, Trial, Expired, etc.)
- ✅ Search by business name or email
- ✅ View subscription details (plan, dates, auto-renew)

**API Endpoints:**
```
GET /platform/api/subscriptions/              # List all subscriptions
GET /platform/api/subscriptions/{id}/         # Get specific subscription
POST /platform/api/subscriptions/{id}/suspend/  # Suspend subscription
POST /platform/api/subscriptions/{id}/activate/ # Activate subscription
GET /platform/api/subscriptions/expiring/     # Get expiring subscriptions
```

**Component:** `src/features/platform/components/SubscriptionManagement.tsx`

---

## Navigation

### Dashboard Access

Platform admins will see a "Platform Admin" button in the main dashboard header (next to the subscription badge):

```tsx
{user && isPlatformAdmin(user) && (
  <Button
    variant="outline-primary"
    size="sm"
    onClick={() => navigate('/app/platform')}
  >
    Platform Admin
  </Button>
)}
```

### Routes

```
/app/platform              # Platform dashboard (protected route)
  ├─ Overview & Stats      # Tab 1: Platform statistics
  ├─ Plan Management       # Tab 2: Manage subscription plans
  └─ Subscriptions         # Tab 3: View all subscriptions
```

---

## File Structure

```
src/
├── features/
│   └── platform/
│       ├── pages/
│       │   └── PlatformDashboard.tsx          # Main dashboard with tabs
│       └── components/
│           ├── PlatformStats.tsx              # Statistics overview
│           ├── PlanManagement.tsx             # Plan CRUD operations
│           └── SubscriptionManagement.tsx     # Subscription monitoring
│
├── services/
│   └── platformService.ts                     # API service layer
│
├── types/
│   └── platform.ts                            # TypeScript types
│
└── utils/
    └── platformPermissions.ts                 # Permission utilities
```

---

## Backend Requirements

### API Endpoints to Implement

#### Platform Statistics
```python
GET /platform/api/stats/overview/
Response:
{
  "total_businesses": 150,
  "active_businesses": 142,
  "total_subscriptions": 138,
  "active_subscriptions": 125,
  "trial_subscriptions": 13,
  "expired_subscriptions": 8,
  "total_revenue": "GHS 425,000.00",
  "monthly_recurring_revenue": "GHS 45,000.00",
  "total_users": 450,
  "active_users": 423
}

GET /platform/api/stats/revenue_by_plan/
Response:
[
  {
    "plan": "uuid-123",
    "plan_name": "Basic",
    "subscription_count": 50,
    "revenue": "GHS 50,000.00",
    "percentage": 35.5
  },
  // ... more plans
]
```

#### Plan Management
```python
GET /platform/api/plans/
POST /platform/api/plans/
PATCH /platform/api/plans/{id}/
DELETE /platform/api/plans/{id}/
POST /platform/api/plans/{id}/activate/
POST /platform/api/plans/{id}/deactivate/
```

#### Subscription Management
```python
GET /platform/api/subscriptions/?status=ACTIVE&search=acme
GET /platform/api/subscriptions/{id}/
POST /platform/api/subscriptions/{id}/suspend/
POST /platform/api/subscriptions/{id}/activate/
GET /platform/api/subscriptions/expiring/?days=7
```

### Permission Middleware

```python
from rest_framework.permissions import BasePermission

class IsPlatformAdmin(BasePermission):
    """
    Only allow platform admins (super_admin, admin, support)
    """
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.platform_role in ['SUPER_ADMIN', 'ADMIN', 'SUPPORT']
        )

class IsPlatformSuperAdmin(BasePermission):
    """
    Only allow super admins
    """
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.platform_role == 'SUPER_ADMIN'
        )

class CanManagePlans(BasePermission):
    """
    Allow super admins and admins to manage plans
    """
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.platform_role in ['SUPER_ADMIN', 'ADMIN']
        )
```

### View Example

```python
from rest_framework import viewsets
from rest_framework.decorators import action
from .permissions import IsPlatformAdmin, CanManagePlans

class PlatformPlanViewSet(viewsets.ModelViewSet):
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [CanManagePlans()]
        return [IsPlatformAdmin()]
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        plan = self.get_object()
        plan.is_active = True
        plan.save()
        return Response(PlanSerializer(plan).data)
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        plan = self.get_object()
        plan.is_active = False
        plan.save()
        return Response(PlanSerializer(plan).data)
```

---

## Usage Guide

### For Platform Owners

1. **Set Up Your Platform Role**
   - Backend admin creates user with `platform_role = 'SUPER_ADMIN'`
   - User logs in and sees "Platform Admin" button in dashboard

2. **Create Subscription Plans**
   - Click "Platform Admin" button
   - Navigate to "Plan Management" tab
   - Click "+ Create New Plan"
   - Fill in plan details:
     - Name and description
     - Pricing and billing cycle
     - Resource limits (storefronts, users, products)
     - Features (checkboxes for capabilities)
     - Mark as popular (optional)
     - Set as active
   - Click "Create Plan"

3. **Monitor Platform**
   - "Overview & Stats" tab shows real-time metrics
   - Track revenue, subscriptions, active businesses
   - See revenue breakdown by plan

4. **Manage Subscriptions**
   - "Subscriptions" tab lists all business subscriptions
   - Filter by status or search by business name
   - View subscription details

### For Business Owners (End Users)

1. **View Available Plans**
   - Navigate to `/app/subscription`
   - See all active plans created by platform admin
   - Compare features and pricing

2. **Subscribe to Plan**
   - Click "Select Plan" on desired plan
   - Choose payment gateway (Paystack/Stripe)
   - Complete payment flow
   - Subscription activated automatically

---

## Security Considerations

### Access Control
- ✅ Routes protected by authentication
- ✅ Platform dashboard checks `isPlatformAdmin(user)`
- ✅ Plan management UI disabled for non-admins
- ✅ Backend must enforce permissions on all endpoints

### Data Protection
- ✅ Platform admins can view all subscriptions (for support)
- ✅ Business data remains private to business owners
- ✅ Subscription creation only via payment flow (not manual)

### Audit Trail
- 🔄 **TODO:** Log all plan changes (who, what, when)
- 🔄 **TODO:** Track subscription status changes
- 🔄 **TODO:** Record platform admin actions

---

## Testing Checklist

### Frontend
- [ ] Platform dashboard loads for admins
- [ ] Access denied for non-admins
- [ ] Plan creation form validates all fields
- [ ] Plan editing updates correctly
- [ ] Plan activation/deactivation works
- [ ] Statistics load and display correctly
- [ ] Subscription list filters work
- [ ] Search functionality works

### Backend
- [ ] Permission middleware blocks unauthorized access
- [ ] Plan CRUD operations work correctly
- [ ] Statistics calculations are accurate
- [ ] Subscription queries filter properly
- [ ] Plan activation/deactivation persists
- [ ] Deleted plans don't break existing subscriptions

### Integration
- [ ] Business owners see only active plans
- [ ] Inactive plans not available for purchase
- [ ] Plan changes reflect immediately
- [ ] Revenue calculations match payment records

---

## Future Enhancements

### Phase 2 Features
- [ ] Plan versioning (update plans without affecting existing subscriptions)
- [ ] Subscription overrides (manual adjustments)
- [ ] Custom alerts to businesses
- [ ] Revenue forecasting
- [ ] Churn analysis
- [ ] Bulk subscription operations
- [ ] Payment reconciliation dashboard
- [ ] Webhook management

### Phase 3 Features
- [ ] Multi-currency support
- [ ] Regional pricing
- [ ] Coupon/discount codes
- [ ] Referral program management
- [ ] Partner/affiliate dashboard
- [ ] API usage monitoring
- [ ] Custom plan features

---

## Troubleshooting

### "Platform Admin button not showing"
**Cause:** User doesn't have `platform_role` set

**Solution:**
```python
# Backend Django shell
from accounts.models import User
user = User.objects.get(email='admin@example.com')
user.platform_role = 'SUPER_ADMIN'
user.save()
```

### "Access Denied" on platform dashboard
**Cause:** User has `platform_role` but backend endpoint not checking it

**Solution:** Ensure backend views use correct permission classes:
```python
permission_classes = [IsPlatformAdmin]
```

### "Plans not loading"
**Cause:** Backend endpoint not implemented or wrong path

**Solution:** 
- Check `/platform/api/plans/` endpoint exists
- Verify response format matches `PaginatedResponse<Plan>`
- Check network tab for errors

### "Can't create plan"
**Cause:** User has `SUPPORT` role (read-only for plans)

**Solution:** Upgrade user to `ADMIN` or `SUPER_ADMIN` role

---

## API Service Reference

### platformService.ts

```typescript
// Statistics
fetchPlatformStats() => Promise<PlatformStats>
fetchRevenueByPlan() => Promise<RevenueByPlan[]>

// Plans
fetchAllPlans() => Promise<PaginatedResponse<Plan>>
createPlan(payload: CreatePlanPayload) => Promise<Plan>
updatePlan(id: string, payload: UpdatePlanPayload) => Promise<Plan>
deletePlan(id: string) => Promise<void>
activatePlan(id: string) => Promise<Plan>
deactivatePlan(id: string) => Promise<Plan>

// Subscriptions
fetchAllSubscriptions(params?) => Promise<PaginatedResponse<PlatformSubscription>>
suspendSubscription(id: string, reason?) => Promise<PlatformSubscription>
activateSubscription(id: string) => Promise<PlatformSubscription>
fetchExpiringSoon(days: number) => Promise<PaginatedResponse<PlatformSubscription>>
```

---

## Summary

The Platform Management System is now **fully implemented** on the frontend:

✅ **Access Control** - Role-based permissions with utilities  
✅ **Dashboard** - Tab-based interface for all platform operations  
✅ **Plan Management** - Full CRUD with activation controls  
✅ **Statistics** - Real-time platform metrics and revenue tracking  
✅ **Subscription Monitoring** - View and filter all subscriptions  
✅ **Navigation** - Integrated into main dashboard for admins  
✅ **Type Safety** - Complete TypeScript types and interfaces  
✅ **Error Handling** - Loading states, error messages, validation  

**Next Steps:**
1. Backend team implements the platform API endpoints
2. Test plan creation and activation flow
3. Verify statistics calculations
4. Set up platform admin accounts
5. Create initial subscription plans

---

**Need Help?**
- Frontend issues: Check browser console for errors
- Backend issues: Contact backend team with endpoint details
- Permission issues: Verify `platform_role` in user profile
- Data issues: Check network tab for API responses
