# Admin Interface Redesign: Plan Management → Pricing Tier Management

**Date:** November 3, 2025  
**Status:** ✅ COMPLETE  
**Priority:** CRITICAL - Aligns with subscription security fix  

---

## 📋 OVERVIEW

Replaced obsolete **Plan Management** interface with new **Pricing Tier Management** to align with the subscription security fix.

### What Changed

**OLD (Obsolete - Security Vulnerability):**
- Admin creates fixed subscription plans (Basic, Starter, Professional, etc.)
- Each plan has fixed price, fixed storefront limit
- Users SELECT which plan they want
- **PROBLEM:** User with 4 storefronts can select 2-storefront plan

**NEW (Secure - Storefront-Based):**
- Admin creates pricing TIERS based on storefront count
- Each tier defines a RANGE (e.g., 1-2 storefronts, 3-4 storefronts, 5+ storefronts)
- Users CANNOT select - system auto-calculates based on actual count
- **SOLUTION:** User with 4 storefronts automatically charged tier 3-4 price

---

## 🔄 FILES CHANGED

### New Files Created

1. **`src/features/platform/components/PricingTierManagement.tsx`**
   - Replaces: `PlanManagement.tsx` (now obsolete)
   - Purpose: Admin interface for managing pricing tiers
   - Features:
     - List all pricing tiers
     - Create new tiers
     - Edit existing tiers
     - Activate/deactivate tiers
     - Delete tiers
     - Preview pricing calculations

2. **`src/services/pricingService.ts`**
   - New service for pricing tier API calls
   - Functions:
     - `fetchPricingTiers()` - Get all tiers
     - `createPricingTier()` - Create new tier
     - `updatePricingTier()` - Update existing tier
     - `activatePricingTier()` - Activate tier
     - `deactivatePricingTier()` - Deactivate tier
     - `deletePricingTier()` - Delete tier

### Modified Files

3. **`src/types/subscriptions.ts`**
   - Added `PricingTier` interface
   - Added `CreatePricingTierPayload` interface
   - Added `UpdatePricingTierPayload` type

4. **`src/features/platform/pages/PlatformDashboard.tsx`**
   - Changed import: `PlanManagement` → `PricingTierManagement`
   - Changed tab name: "Plan Management" → "Pricing Tier Management"
   - Changed tab key: `plans` → `pricing`

### Files to Remove (After Verification)

5. **`src/features/platform/components/PlanManagement.tsx`**
   - **Status:** Obsolete - do NOT delete yet
   - **Action:** Keep as backup until new system is fully tested
   - **Delete After:** Backend pricing tier endpoints are live and tested

---

## 🎨 NEW UI FEATURES

### Pricing Tier Management Interface

**What Admin Sees:**

```
┌──────────────────────────────────────────────────────────────────┐
│ Subscription Pricing Tiers                 [+ Create Pricing Tier]│
├──────────────────────────────────────────────────────────────────┤
│ Tier Name    │ Storefronts │ Base Price │ Additional │ Example   │
│──────────────│─────────────│────────────│────────────│───────────│
│ Starter      │ 1           │ GHS 100    │ —          │ 1: GHS 100│
│ Business     │ 2           │ GHS 150    │ —          │ 2: GHS 150│
│ Professional │ 3-4         │ GHS 180    │ —          │ 3: GHS 180│
│              │             │            │            │ 4: GHS 200│
│ Enterprise   │ 5+          │ GHS 200    │ GHS 50     │ 5: GHS 200│
│              │             │            │            │10: GHS 450│
└──────────────────────────────────────────────────────────────────┘
```

### Create/Edit Tier Modal

**Form Fields:**
- **Tier Name:** Internal name (e.g., "Starter", "Enterprise")
- **Minimum Storefronts:** Start of range (e.g., 1, 2, 5)
- **Maximum Storefronts:** End of range (leave blank for open-ended like "5+")
- **Base Storefronts:** How many storefronts included in base price
- **Base Price:** Price for base storefronts
- **Price Per Additional:** Extra charge per storefront (for open-ended tiers)
- **Currency:** GHS, USD, EUR
- **Description:** Internal notes
- **Active:** Enable/disable this tier

**Example Configuration:**

**Tier: Enterprise (5+ Storefronts)**
```
Min Storefronts: 5
Max Storefronts: (blank - unlimited)
Base Storefronts: 5
Base Price: GHS 200
Price Per Additional: GHS 50
Currency: GHS
Description: For large organizations with multiple locations
Active: ✓
```

**How it calculates:**
- 5 storefronts: GHS 200 (base)
- 6 storefronts: GHS 250 (200 + 50)
- 7 storefronts: GHS 300 (200 + 100)
- 10 storefronts: GHS 450 (200 + 250)

---

## 🔌 BACKEND API REQUIREMENTS

### Required Endpoints (Same as subscription security fix)

```
GET    /subscriptions/api/pricing-tiers/
POST   /subscriptions/api/pricing-tiers/
PATCH  /subscriptions/api/pricing-tiers/{id}/
DELETE /subscriptions/api/pricing-tiers/{id}/
POST   /subscriptions/api/pricing-tiers/{id}/activate/
POST   /subscriptions/api/pricing-tiers/{id}/deactivate/
```

### PricingTier Model (Backend)

```python
class SubscriptionPricingTier(models.Model):
    name = models.CharField(max_length=100)
    min_storefronts = models.IntegerField(default=1)
    max_storefronts = models.IntegerField(null=True, blank=True)  # null = unlimited
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    base_storefronts = models.IntegerField(default=1)
    price_per_additional_storefront = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='GHS')
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
```

---

## 📊 EXAMPLE PRICING TIER CONFIGURATION

### Recommended Tiers for Ghana Market

**Tier 1: Starter (1 Storefront)**
- Min: 1, Max: 1
- Base Price: GHS 100
- Additional Price: GHS 0
- Use Case: Small single-location businesses

**Tier 2: Business (2 Storefronts)**
- Min: 2, Max: 2
- Base Price: GHS 150
- Additional Price: GHS 0
- Use Case: Small multi-location businesses

**Tier 3: Professional (3-4 Storefronts)**
- Min: 3, Max: 4
- Base Price: GHS 180 (for 3 storefronts)
- Additional Price: GHS 20
- Use Case: Medium businesses
- Calculation: 3 stores = GHS 180, 4 stores = GHS 200

**Tier 4: Enterprise (5+ Storefronts)**
- Min: 5, Max: null (unlimited)
- Base Price: GHS 200 (for 5 storefronts)
- Additional Price: GHS 50
- Use Case: Large organizations
- Calculation: 5 = GHS 200, 10 = GHS 450, 20 = GHS 950

---

## 🧪 TESTING CHECKLIST

### Admin UI Tests

- [ ] Load pricing tiers page → Shows all tiers
- [ ] Click "Create Pricing Tier" → Opens modal with form
- [ ] Fill form and submit → Creates new tier
- [ ] Click "Edit" on tier → Opens modal with data pre-filled
- [ ] Update tier and submit → Updates successfully
- [ ] Click activate/deactivate → Toggles status
- [ ] Click delete → Shows confirmation, deletes tier
- [ ] Create tier with max_storefronts = null → Shows as "5+" range
- [ ] Example pricing column → Shows correct calculations

### Calculation Tests

- [ ] Tier 1 (1 storefront): GHS 100
- [ ] Tier 2 (2 storefronts): GHS 150
- [ ] Tier 3 (3 storefronts): GHS 180
- [ ] Tier 3 (4 storefronts): GHS 200
- [ ] Tier 4 (5 storefronts): GHS 200
- [ ] Tier 4 (10 storefronts): GHS 450 (200 + 5*50)
- [ ] Tier 4 (20 storefronts): GHS 950 (200 + 15*50)

### Integration Tests

- [ ] Create tier → Appears in subscription pricing calculations
- [ ] Deactivate tier → Not used for new subscriptions
- [ ] Delete tier → Users on this tier not affected (existing subscriptions)
- [ ] User with 4 storefronts → Gets tier 3 pricing (GHS 200)
- [ ] User adds 5th storefront → Next billing uses tier 4 pricing

---

## 🔒 SECURITY CONSIDERATIONS

### Admin Access Control

**Who Can Access:**
- Platform Super Admins
- Platform Admins

**Who CANNOT Access:**
- Regular users
- Business owners
- Business admins
- Staff members

**Permission Check:**
```typescript
const canManage = user ? canManagePlans(user) : false
```

### Data Validation

**Frontend:**
- Min storefronts ≥ 1
- Max storefronts ≥ min storefronts (if set)
- Base price ≥ 0
- Base storefronts ≥ 1
- Additional price ≥ 0

**Backend (Required):**
- Verify user has platform admin role
- Validate no overlapping ranges
- Ensure at least one active tier exists
- Validate currency codes
- Prevent deletion of tiers with active subscriptions

---

## 🚀 DEPLOYMENT PLAN

### Phase 1: Frontend Deployment (COMPLETE ✅)

- [x] Create PricingTierManagement component
- [x] Add pricing tier service functions
- [x] Add pricing tier types
- [x] Update PlatformDashboard
- [x] Document changes

### Phase 2: Backend Implementation (PENDING ⏳)

- [ ] Create SubscriptionPricingTier model
- [ ] Create migration
- [ ] Implement pricing tier ViewSet
- [ ] Add admin permissions
- [ ] Write unit tests
- [ ] Deploy to staging

### Phase 3: Integration Testing (PENDING ⏳)

- [ ] Test admin UI end-to-end
- [ ] Verify pricing calculations
- [ ] Test with subscription flow
- [ ] UAT with stakeholders

### Phase 4: Production Deployment (PENDING ⏳)

- [ ] Run migration
- [ ] Create default pricing tiers
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Monitor for errors

### Phase 5: Cleanup (PENDING ⏳)

- [ ] Remove old PlanManagement component
- [ ] Update API documentation
- [ ] Archive old plan-based code
- [ ] Train support team

---

## 📝 ADMIN USER GUIDE

### How to Configure Pricing Tiers

**Step 1: Access Pricing Management**
1. Navigate to Platform Dashboard (`/app/platform`)
2. Click "Pricing Tier Management" tab

**Step 2: Create Your First Tier**
1. Click "+ Create Pricing Tier"
2. Fill in the form:
   - Tier Name: "Starter"
   - Min Storefronts: 1
   - Max Storefronts: 1
   - Base Storefronts: 1
   - Base Price: 100.00
   - Additional Price: 0.00
   - Currency: GHS
3. Click "Create Tier"

**Step 3: Create Additional Tiers**
Repeat for each tier (Business, Professional, Enterprise)

**Step 4: Create Open-Ended Tier**
For "5+ storefronts":
- Min Storefronts: 5
- Max Storefronts: (leave blank)
- Base Storefronts: 5
- Base Price: 200.00
- Additional Price: 50.00

**Step 5: Activate Tiers**
Ensure all tiers are marked as "Active"

### How Pricing is Calculated

When a user creates a subscription:
1. System counts their active storefronts (e.g., 4)
2. System finds matching tier (Min ≤ 4 ≤ Max)
3. System calculates price:
   - If within base: Use base price
   - If above base: Base price + (additional count × additional price)
4. System adds taxes (VAT, NHIL, etc.)
5. User is charged calculated amount

---

## ✅ BENEFITS OF NEW SYSTEM

**For Admins:**
- ✅ Flexible pricing configuration
- ✅ Easy to add new tiers
- ✅ Clear pricing calculations
- ✅ No plan selection confusion
- ✅ Better revenue management

**For Users:**
- ✅ Fair pricing based on actual usage
- ✅ No confusion about which plan to choose
- ✅ Transparent pricing breakdown
- ✅ Automatic price adjustments
- ✅ No way to underpay

**For Business:**
- ✅ Eliminates revenue leakage
- ✅ Ensures fair pricing
- ✅ Scalable pricing model
- ✅ Automatic enforcement
- ✅ Better financial forecasting

---

**Status:** ✅ FRONTEND COMPLETE  
**Backend:** ⏳ PENDING IMPLEMENTATION  
**Next Step:** Backend team implements pricing tier endpoints  

---

**Related Documents:**
- `docs/SUBSCRIPTION-SECURITY-FIX-IMPLEMENTATION.md` - Overall security fix
- `docs/BACKEND-SUBSCRIPTION-SECURITY-FIX-GUIDE.md` - Backend implementation
- `docs/SUBSCRIPTION-SECURITY-FIX-QUICK-REFERENCE.md` - Quick reference

---

**END OF DOCUMENT**
