# 🔍 Subscription Blank Page - Debugging Guide

**Issue:** Users visiting `/app/subscription` see a blank page instead of pricing information.

**Date:** November 3, 2025

---

## 🎯 Quick Diagnosis Steps

### Step 1: Open Browser DevTools (F12)

1. Go to `/app/subscription` page
2. Press **F12** to open DevTools
3. Click on **Console** tab
4. Look for these messages:

#### ✅ Good (Backend Working):
```
(no errors - page loads normally with pricing)
```

#### ⚠️ Warning (Backend Not Ready):
```
My-pricing endpoint not available yet: AxiosError...
Status endpoint not available yet: AxiosError...
```

#### ❌ Bad (API Errors):
```
Failed to load subscription data: Error...
```

---

### Step 2: Check Network Tab

1. In DevTools, click **Network** tab
2. Refresh the page (Ctrl+R / Cmd+R)
3. Look for these requests:

#### Request 1: `/subscriptions/api/subscriptions/my-pricing/`
- **Status 200** ✅ = Working! Should see pricing data
- **Status 404** ⚠️ = Endpoint not implemented yet
- **Status 500** ❌ = Backend error (check Django logs)
- **Status 401** ❌ = Authentication issue

#### Request 2: `/subscriptions/api/subscriptions/status/`
- **Status 200** ✅ = Working!
- **Status 404** ⚠️ = Endpoint not implemented yet
- **Status 500** ❌ = Backend error

---

## 🔧 Common Causes & Fixes

### Cause 1: Backend Endpoints Not Implemented (Most Likely)

**Symptoms:**
- Network tab shows 404 errors
- Console shows "endpoint not available" warnings
- Page shows warning message about missing endpoints

**Fix:**
Backend team needs to implement the endpoints from `BACKEND-IMPLEMENTATION-CHECKLIST.md`

**Required Endpoints:**
```
GET  /subscriptions/api/subscriptions/my-pricing/
GET  /subscriptions/api/subscriptions/status/
```

**Test if they exist:**
```bash
# Replace YOUR_TOKEN with actual auth token
curl -X GET http://localhost:8000/subscriptions/api/subscriptions/my-pricing/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Cause 2: No Pricing Tiers Created

**Symptoms:**
- `/my-pricing/` returns 500 error
- Django logs show "No pricing tier found for X storefronts"

**Fix:**
Create pricing tiers in Django admin or shell:

```python
from subscriptions.models import SubscriptionPricingTier

# Create basic tier for 1 storefront
SubscriptionPricingTier.objects.create(
    name="Starter",
    min_storefronts=1,
    max_storefronts=1,
    base_price=100.00,
    base_storefronts=1,
    price_per_additional_storefront=0,
    currency="GHS",
    is_active=True
)

# Create tier for 2+ storefronts
SubscriptionPricingTier.objects.create(
    name="Business",
    min_storefronts=2,
    max_storefronts=None,  # Unlimited
    base_price=150.00,
    base_storefronts=2,
    price_per_additional_storefront=25.00,
    currency="GHS",
    is_active=True
)
```

---

### Cause 3: User Has No Storefronts

**Symptoms:**
- `/my-pricing/` returns error about "No active business" or "0 storefronts"

**Fix:**
User needs at least 1 storefront registered. Check:

```python
# In Django shell
from businesses.models import Storefront
user_business = user.businesses.first()
storefronts = Storefront.objects.filter(business=user_business, is_active=True)
print(f"Storefront count: {storefronts.count()}")
```

---

### Cause 4: CORS Issues

**Symptoms:**
- Network tab shows requests blocked
- Console shows CORS policy errors

**Fix:**
Check Django `settings.py` has correct CORS configuration:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite dev server
    # Add production domains
]
```

---

### Cause 5: Authentication Token Issues

**Symptoms:**
- 401 Unauthorized errors
- User appears logged in but API returns auth errors

**Fix:**
Check token is being sent correctly in requests. In DevTools Network tab, check request headers should include:

```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

---

## 🧪 Quick Test Commands

### Test 1: Check if endpoints exist
```bash
# Test my-pricing
curl -X GET http://localhost:8000/subscriptions/api/subscriptions/my-pricing/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -v

# Test status
curl -X GET http://localhost:8000/subscriptions/api/subscriptions/status/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -v
```

### Test 2: Check pricing tiers exist
```bash
curl -X GET http://localhost:8000/subscriptions/api/pricing-tiers/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 3: Check user's business has storefronts
```python
# Django shell
from django.contrib.auth import get_user_model
from businesses.models import Storefront

User = get_user_model()
user = User.objects.get(email='test@example.com')  # Replace with actual email
business = user.businesses.first()
storefronts = Storefront.objects.filter(business=business, is_active=True)

print(f"Business: {business.name}")
print(f"Storefronts: {storefronts.count()}")
for sf in storefronts:
    print(f"  - {sf.name}")
```

---

## ✅ Expected Behavior When Working

When everything is working correctly:

1. **User visits** `/app/subscription`
2. **Frontend calls** `GET /subscriptions/api/subscriptions/my-pricing/`
3. **Backend responds** with:
   ```json
   {
     "storefronts": 1,
     "currency": "GHS",
     "base_price": "100.00",
     "taxes": [
       {"code": "VAT", "name": "Value Added Tax", "rate": 0.125, "amount": "12.50"},
       {"code": "NHIL", "name": "National Health Insurance Levy", "rate": 0.025, "amount": "2.50"}
     ],
     "total_tax": "15.00",
     "service_charges": [],
     "total_service_charges": "0.00",
     "total_amount": "115.00",
     "breakdown": {
       "tier_id": "uuid-here",
       "tier_name": "Starter",
       "tier_description": "For single-location businesses",
       "base_storefronts": 1,
       "additional_storefronts": 0,
       "price_per_additional": "0.00"
     }
   }
   ```
4. **Page displays** pricing breakdown with Subscribe button

---

## 📞 What to Report

If still having issues, provide:

1. **Console tab screenshot** (errors/warnings)
2. **Network tab screenshot** showing:
   - Request URL
   - Status code
   - Response (if any)
3. **Django logs** if backend errors
4. **User's storefront count** from database

---

## 🚀 Priority Fix Order

1. ✅ **Implement backend endpoints** (if not done)
2. ✅ **Create pricing tiers** in database
3. ✅ **Ensure user has at least 1 storefront**
4. ✅ **Test with curl/Postman** before checking frontend
5. ✅ **Clear browser cache** and test again

---

**Current Status:** Frontend is ready ✅ - waiting for backend to return data

**Documentation:**
- Full implementation: `BACKEND-IMPLEMENTATION-CHECKLIST.md`
- API spec: `docs/BACKEND-PRICING-ENDPOINTS-SPEC.md`
- Feature overview: `docs/ADMIN-PRICING-TIER-MANAGEMENT.md`
