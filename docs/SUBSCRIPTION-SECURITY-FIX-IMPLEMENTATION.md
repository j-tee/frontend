# Subscription Flow Security Fix - Implementation Summary

**Priority:** 🚨 CRITICAL  
**Status:** ✅ FRONTEND COMPLETE - AWAITING BACKEND IMPLEMENTATION  
**Date:** November 3, 2025  
**Impact:** Revenue Security, User Experience, Business Logic Integrity  

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Frontend Changes Implemented](#frontend-changes-implemented)
4. [Backend Requirements](#backend-requirements)
5. [API Contract](#api-contract)
6. [Migration Plan](#migration-plan)
7. [Testing Checklist](#testing-checklist)

---

## 🎯 EXECUTIVE SUMMARY

### The Critical Flaw

**OLD SYSTEM (BROKEN):**
- ❌ User selects subscription plan from dropdown
- ❌ Plans have fixed prices (Starter, Business, Professional)
- ❌ **SECURITY HOLE:** User with 4 storefronts can select 2-storefront plan and pay less

**NEW SYSTEM (SECURE):**
- ✅ System automatically detects storefront count
- ✅ Price calculated based on ACTUAL storefronts
- ✅ User sees their price (NO selection allowed)
- ✅ Backend validates and enforces correct pricing

### Revenue Impact

```
Example Scenario:
- User has 4 storefronts
- Old system: User selects "Business (2 storefronts)" = GHS 163.50
- Correct pricing: 4 storefronts = GHS 218.00
- Revenue loss per user: GHS 54.50/month = GHS 654/year

If 10 users exploit: GHS 6,540/year lost
If 100 users: GHS 65,400/year lost
```

---

## 🔴 PROBLEM STATEMENT

### Issue 1: User Can Choose Wrong Plan

**Current Broken Flow:**
```
User has 4 storefronts
↓
Sees plans: Starter (1), Business (2), Professional (4)
↓
Selects "Business Plan" (GHS 150 for 2 storefronts)
↓
System charges GHS 150
↓
❌ USER UNDERPAID! Should pay for 4 storefronts (GHS 200)
```

### Issue 2: Two Conflicting Pricing Systems

**System 1 - Subscription Plans (Frontend currently uses):**
- Table: `subscription_plans`
- Fixed plans with fixed prices
- User SELECTS a plan

**System 2 - Pricing Tiers (Backend should use):**
- Table: `subscription_pricing_tier`
- Dynamic pricing based on ACTUAL storefront count
- System DETECTS storefronts automatically

### Issue 3: Endpoint Mismatch

**Frontend currently calls:**
```
GET /api/pricing/calculate/?storefronts=2&gateway=PAYSTACK
```

**Problem:** Requires manual storefront count input - user can manipulate this

**Should call:**
```
GET /api/subscriptions/my-pricing/
↓
Backend automatically:
1. Gets current user's business
2. Counts ACTUAL storefronts
3. Calculates correct price
4. Returns non-negotiable amount
```

---

## ✅ FRONTEND CHANGES IMPLEMENTED

### 1. New TypeScript Types

**File:** `src/types/subscriptions.ts`

```typescript
// New response from /my-pricing/ endpoint
export interface MyPricingResponse {
  business_name: string
  business_id: UUID
  storefront_count: number
  currency: string
  base_price: string
  taxes: TaxBreakdownItem[]
  total_tax: string
  total_amount: string
  billing_cycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
  tier_description: string
}

// New response from /status/ endpoint
export interface SubscriptionStatusResponse {
  has_subscription: boolean
  subscription: Subscription | null
}

// Updated subscription creation (no plan_id required)
export interface CreateSubscriptionRequest {
  plan_id?: UUID  // DEPRECATED - backend auto-calculates
  business_id?: UUID  // Optional - backend infers from user
  payment_method?: PaymentMethodType
  is_trial?: boolean
  trial_end_date?: string
}
```

### 2. New Service Functions

**File:** `src/services/subscriptionService.ts`

```typescript
/**
 * Fetch subscription pricing for current user's business
 * Backend automatically detects storefront count and calculates price
 */
export const fetchMyPricing = async () => {
  const { data } = await httpClient.get<MyPricingResponse>(
    '/subscriptions/api/subscriptions/my-pricing/'
  )
  return data
}

/**
 * Check if user has an active subscription
 */
export const checkSubscriptionStatus = async () => {
  const { data } = await httpClient.get<SubscriptionStatusResponse>(
    '/subscriptions/api/subscriptions/status/'
  )
  return data
}
```

### 3. New UI Component

**File:** `src/features/subscriptions/pages/SubscriptionPortalNew.tsx`

**Key Features:**
- ✅ NO plan selection dropdown
- ✅ Automatically loads pricing on page load
- ✅ Displays storefront count (read-only)
- ✅ Shows complete price breakdown with taxes
- ✅ Single "Subscribe Now" button
- ✅ Creates subscription with empty body (backend calculates)

**Flow:**
```
1. User navigates to page
   ↓
2. Frontend calls GET /subscriptions/my-pricing/
   ↓
3. Backend returns pricing based on actual storefronts
   ↓
4. Frontend displays pricing (no selection, just info)
   ↓
5. User clicks "Subscribe Now"
   ↓
6. Frontend calls POST /subscriptions/ with empty body {}
   ↓
7. Backend creates subscription with correct price
   ↓
8. Redirect to payment gateway
```

---

## 🔧 BACKEND REQUIREMENTS

### CRITICAL: Required New Endpoints

#### 1. Get My Subscription Pricing

**Endpoint:** `GET /subscriptions/api/subscriptions/my-pricing/`  
**Authentication:** Required (Bearer token)  
**Purpose:** Get subscription price for current user's business

**Backend Must:**
1. Get current user from authentication token
2. Find user's business via `user.business_memberships.first().business`
3. Count active storefronts: `business.business_storefronts.filter(is_active=True).count()`
4. Find pricing tier for that storefront count
5. Calculate taxes (VAT, NHIL, GETFund, COVID-19 levy)
6. Return complete pricing breakdown

**Response 200 OK:**
```json
{
  "business_name": "DataLogique Systems",
  "business_id": "2050bdf4-88b7-4ffa-a26a-b5bb34e9b9fb",
  "storefront_count": 4,
  "currency": "GHS",
  "base_price": "200.00",
  "taxes": [
    {
      "code": "VAT_GH",
      "name": "Value Added Tax",
      "rate": 3.0,
      "amount": "6.00"
    },
    {
      "code": "NHIL_GH",
      "name": "National Health Insurance Levy",
      "rate": 2.5,
      "amount": "5.00"
    },
    {
      "code": "GETFUND_GH",
      "name": "GETFund Levy",
      "rate": 2.5,
      "amount": "5.00"
    },
    {
      "code": "COVID19_GH",
      "name": "COVID-19 Health Recovery Levy",
      "rate": 1.0,
      "amount": "2.00"
    }
  ],
  "total_tax": "18.00",
  "total_amount": "218.00",
  "billing_cycle": "MONTHLY",
  "tier_description": "4 storefronts: GHS 200.00"
}
```

**Error Responses:**
```json
// No business found
{
  "error": "No business found for user",
  "code": "NO_BUSINESS"
}

// No pricing tier
{
  "error": "No pricing tier found for 4 storefronts",
  "code": "NO_PRICING_TIER",
  "storefront_count": 4
}

// No active storefronts
{
  "error": "You must have at least one active storefront to subscribe",
  "code": "NO_STOREFRONTS",
  "storefront_count": 0
}
```

#### 2. Check Subscription Status

**Endpoint:** `GET /subscriptions/api/subscriptions/status/`  
**Authentication:** Required (Bearer token)  
**Purpose:** Check if user has active subscription

**Response 200 OK (With Subscription):**
```json
{
  "has_subscription": true,
  "subscription": {
    "id": "a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d",
    "status": "ACTIVE",
    "payment_status": "PAID",
    "storefront_count": 4,
    "amount": "218.00",
    "start_date": "2025-11-03",
    "end_date": "2025-12-03",
    "days_until_expiry": 28,
    "auto_renew": true
  }
}
```

**Response 200 OK (No Subscription):**
```json
{
  "has_subscription": false,
  "subscription": null
}
```

#### 3. Modified Create Subscription

**Endpoint:** `POST /subscriptions/api/subscriptions/`  
**Authentication:** Required (Bearer token)  
**Request Body:** `{}` (empty - backend calculates everything)

**Backend Must:**
1. Get user's business
2. Count storefronts (same logic as my-pricing)
3. Calculate pricing (same logic as my-pricing)
4. Create subscription with calculated amount
5. **CRITICAL:** Ignore any `plan_id` sent from frontend (security)
6. Return subscription with `storefront_count` field

**Response 201 Created:**
```json
{
  "id": "a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d",
  "business": {
    "id": "2050bdf4-88b7-4ffa-a26a-b5bb34e9b9fb",
    "name": "DataLogique Systems"
  },
  "storefront_count": 4,
  "amount": "218.00",
  "currency": "GHS",
  "status": "INACTIVE",
  "payment_status": "PENDING",
  "billing_cycle": "MONTHLY",
  "start_date": "2025-11-03",
  "end_date": "2025-12-03",
  "created_at": "2025-11-03T10:30:00Z"
}
```

**Error Responses:**
```json
// Active subscription exists
{
  "error": "You already have an active subscription",
  "code": "SUBSCRIPTION_EXISTS",
  "existing_subscription_id": "existing-uuid"
}

// No storefronts
{
  "error": "You must have at least one active storefront",
  "code": "NO_STOREFRONTS"
}
```

---

## 📝 API CONTRACT

### Frontend → Backend Contract

**Frontend Promises:**
1. ✅ Will call `/my-pricing/` to get pricing (never calculate locally)
2. ✅ Will display pricing as read-only (no user manipulation)
3. ✅ Will send empty body `{}` when creating subscription
4. ✅ Will NOT send `plan_id` or `storefront_count` in create request
5. ✅ Will handle all error codes properly

**Backend Must Provide:**
1. ⏳ `/my-pricing/` endpoint that auto-detects storefronts
2. ⏳ `/status/` endpoint to check subscription state
3. ⏳ Modified `/subscriptions/` POST to ignore plan_id and auto-calculate
4. ⏳ Validation to prevent price manipulation
5. ⏳ Proper error responses with error codes

### Error Code Mapping

| Code | HTTP Status | Meaning | User Message |
|------|-------------|---------|--------------|
| `NO_BUSINESS` | 404 | User not in any business | "Your account is not associated with a business. Contact support." |
| `NO_PRICING_TIER` | 404 | No pricing tier for storefront count | "Unable to calculate pricing. Contact support." |
| `NO_STOREFRONTS` | 400 | No active storefronts | "You need at least one active storefront to subscribe." |
| `SUBSCRIPTION_EXISTS` | 400 | Active subscription exists | "You already have an active subscription." |

---

## 🔄 MIGRATION PLAN

### Phase 1: Backend Implementation (Week 1)

**Day 1-2: Create New Endpoints**
- [ ] Implement `my-pricing` endpoint
- [ ] Implement `status` endpoint
- [ ] Write unit tests for both endpoints

**Day 3-4: Modify Subscription Creation**
- [ ] Update `create` subscription to auto-calculate
- [ ] Add validation to prevent plan_id manipulation
- [ ] Add storefront count to subscription model/response
- [ ] Write integration tests

**Day 5: Testing & Documentation**
- [ ] Manual testing with various storefront counts (1, 2, 3, 4, 5+)
- [ ] Error scenario testing
- [ ] Update API documentation
- [ ] Backend team code review

### Phase 2: Frontend Integration (Week 1-2)

**Day 1: Switch to New Component**
- [ ] Update routing to use `SubscriptionPortalNew.tsx`
- [ ] Remove imports of old `SubscriptionPortal.tsx`
- [ ] Test new UI flow end-to-end

**Day 2-3: Testing**
- [ ] Test with various storefront counts
- [ ] Test all error scenarios
- [ ] Test payment flow completion
- [ ] Browser compatibility testing

**Day 4: Cleanup**
- [ ] Remove old `SubscriptionPortal.tsx` (keep as backup first)
- [ ] Remove unused plan selection components
- [ ] Update related documentation
- [ ] Code review

### Phase 3: Deployment (Week 2)

**Day 1: Staging Deployment**
- [ ] Deploy backend changes to staging
- [ ] Deploy frontend changes to staging
- [ ] Run E2E tests on staging

**Day 2: UAT**
- [ ] Stakeholder testing
- [ ] Finance team review
- [ ] Customer support training

**Day 3: Production Deployment**
- [ ] Deploy backend (non-breaking - supports both old and new)
- [ ] Deploy frontend (switch to new component)
- [ ] Monitor error logs
- [ ] Monitor successful subscriptions

### Phase 4: Data Cleanup (Week 3)

**Day 1-3: Audit Existing Subscriptions**
- [ ] Query all active subscriptions
- [ ] Compare plan pricing vs actual storefront count
- [ ] Identify discrepancies

**Day 4-5: Customer Communication**
- [ ] Contact affected customers
- [ ] Explain pricing correction
- [ ] Offer prorated adjustments or grace period

---

## ✅ TESTING CHECKLIST

### Unit Tests (Backend)

- [ ] `my-pricing` returns correct price for 1 storefront
- [ ] `my-pricing` returns correct price for 2 storefronts
- [ ] `my-pricing` returns correct price for 4 storefronts
- [ ] `my-pricing` returns correct price for 10+ storefronts
- [ ] `my-pricing` calculates taxes correctly
- [ ] `my-pricing` handles user with no business
- [ ] `my-pricing` handles business with no storefronts
- [ ] `status` returns correct data when subscription exists
- [ ] `status` returns correct data when no subscription
- [ ] `create` subscription calculates price correctly
- [ ] `create` subscription ignores frontend plan_id
- [ ] `create` subscription prevents duplicate active subscriptions

### Integration Tests (Frontend + Backend)

- [ ] Load subscription page → shows correct pricing
- [ ] Click Subscribe → creates subscription with correct amount
- [ ] Payment flow → completes successfully
- [ ] Add storefront → pricing updates on next renewal
- [ ] Remove storefront → pricing updates on next renewal
- [ ] User with no storefronts → sees error message
- [ ] User with active subscription → sees "already subscribed" message

### End-to-End Tests

**Scenario 1: New User with 1 Storefront**
1. Navigate to subscription page
2. Verify shows: Storefront count = 1, Price = GHS 109
3. Click "Subscribe Now"
4. Verify redirected to Paystack
5. Complete payment
6. Verify subscription status = ACTIVE

**Scenario 2: User with 4 Storefronts**
1. Navigate to subscription page
2. Verify shows: Storefront count = 4, Price = GHS 218
3. Click "Subscribe Now"
4. Verify subscription created with amount = 218.00
5. Complete payment
6. Verify subscription status = ACTIVE

**Scenario 3: User Already Subscribed**
1. Navigate to subscription page
2. Verify shows "You Have an Active Subscription"
3. Verify "Subscribe Now" button not shown

**Scenario 4: User with No Storefronts**
1. Navigate to subscription page
2. Verify shows error message
3. Verify "Subscribe Now" button disabled or hidden

---

## 📞 CONTACTS & NEXT STEPS

### Action Items

**Backend Team:**
- [ ] Review this document
- [ ] Review API contract section
- [ ] Implement `my-pricing` endpoint
- [ ] Implement `status` endpoint
- [ ] Modify `create` subscription endpoint
- [ ] Schedule frontend/backend integration meeting

**Frontend Team:**
- [ ] ✅ Complete - Waiting for backend endpoints
- [ ] Test new UI with mock data
- [ ] Prepare E2E test scenarios
- [ ] Update user documentation

**Product Owner:**
- [ ] Approve business logic changes
- [ ] Approve pricing calculation logic
- [ ] Approve error messages
- [ ] Schedule stakeholder review

**Finance Team:**
- [ ] Review pricing calculation logic
- [ ] Approve tax breakdown display
- [ ] Plan for existing subscription audit
- [ ] Prepare customer communication templates

### Meeting Schedule

1. **Backend/Frontend Alignment Meeting**
   - Duration: 1.5 hours
   - Attendees: Backend lead, Frontend lead, Product owner
   - Agenda: Review API contract, discuss implementation timeline

2. **UAT Session**
   - Duration: 2 hours
   - Attendees: All stakeholders, QA team
   - Agenda: Test new flow end-to-end, verify pricing calculations

3. **Deployment Planning**
   - Duration: 1 hour
   - Attendees: DevOps, Backend lead, Frontend lead
   - Agenda: Deployment strategy, rollback plan, monitoring

---

## 📊 SUCCESS CRITERIA

Subscription flow is fixed when:

1. ✅ User CANNOT select a plan
2. ✅ Price is AUTOMATICALLY calculated from actual storefronts
3. ✅ User sees ONLY their calculated price
4. ✅ Backend VALIDATES storefront count before charging
5. ✅ No revenue leakage possible
6. ✅ Clear user experience
7. ✅ All existing subscriptions reviewed and corrected

---

## 🔒 SECURITY VALIDATIONS

**Backend Must Enforce:**
1. ✅ Pricing calculated server-side ONLY
2. ✅ Storefront count from database, not user input
3. ✅ Ignore any plan_id from frontend
4. ✅ Validate user owns the business
5. ✅ Prevent duplicate active subscriptions
6. ✅ Audit log all subscription creations

**Frontend Must:**
1. ✅ Never calculate prices locally
2. ✅ Never send storefront count in requests
3. ✅ Never allow plan selection
4. ✅ Display only backend-provided pricing
5. ✅ Handle all errors gracefully

---

**Document Status:** ✅ FRONTEND COMPLETE  
**Backend Status:** ⏳ AWAITING IMPLEMENTATION  
**Next Review:** After backend endpoints are available  
**Version:** 1.0  
**Last Updated:** November 3, 2025  

---

**END OF DOCUMENT**
