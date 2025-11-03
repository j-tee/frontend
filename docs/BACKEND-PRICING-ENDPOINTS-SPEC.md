# Backend Pricing Endpoints Specification

**Date:** November 3, 2025  
**Status:** 🚨 URGENT - Required for subscription system  
**Priority:** CRITICAL  

---

## 🎯 QUICK START

Your frontend is calling these endpoints but getting 404 errors. Please implement them ASAP.

---

## 📡 ENDPOINT 1: Get My Pricing

**Purpose:** Auto-calculate subscription price for current user's business based on actual storefront count.

### Request

```http
GET /subscriptions/api/subscriptions/my-pricing/
Authorization: Bearer <token>
```

**No query parameters needed** - backend should:
1. Get current user from token
2. Get their active business
3. Count active storefronts for that business
4. Find matching pricing tier
5. Calculate price (base + additional)
6. Add taxes and service charges
7. Return complete breakdown

### Response (200 OK)

```json
{
  "storefronts": 4,
  "currency": "GHS",
  "base_price": "200.00",
  "taxes": [
    {
      "code": "VAT",
      "name": "Value Added Tax",
      "rate": 0.125,
      "amount": "25.00"
    },
    {
      "code": "NHIL",
      "name": "National Health Insurance Levy",
      "rate": 0.025,
      "amount": "5.00"
    }
  ],
  "total_tax": "30.00",
  "service_charges": [
    {
      "code": "PAYMENT_PROCESSING",
      "name": "Payment Processing Fee",
      "type": "PERCENTAGE",
      "rate": 0.02,
      "amount": "4.00"
    }
  ],
  "total_service_charges": "4.00",
  "total_amount": "234.00",
  "breakdown": {
    "tier_id": "uuid-here",
    "tier_name": "Professional",
    "tier_description": "For growing businesses with 3-4 locations",
    "base_storefronts": 3,
    "additional_storefronts": 1,
    "price_per_additional": "20.00"
  }
}
```

### Business Logic

```python
def calculate_my_pricing(user):
    # 1. Get user's business
    business = user.get_active_business()
    
    # 2. Count storefronts
    storefront_count = business.storefronts.filter(is_active=True).count()
    
    # 3. Find matching tier
    tier = SubscriptionPricingTier.objects.filter(
        is_active=True,
        min_storefronts__lte=storefront_count
    ).filter(
        Q(max_storefronts__gte=storefront_count) | Q(max_storefronts__isnull=True)
    ).first()
    
    if not tier:
        raise ValidationError("No pricing tier found for this storefront count")
    
    # 4. Calculate base price
    if storefront_count <= tier.base_storefronts:
        base_price = tier.base_price
    else:
        additional = storefront_count - tier.base_storefronts
        base_price = tier.base_price + (additional * tier.price_per_additional_storefront)
    
    # 5. Calculate taxes
    taxes = calculate_taxes(base_price, business.country)
    
    # 6. Calculate service charges
    service_charges = calculate_service_charges(base_price, payment_gateway)
    
    # 7. Calculate total
    total = base_price + sum(taxes) + sum(service_charges)
    
    return {
        "storefronts": storefront_count,
        "currency": tier.currency,
        "base_price": str(base_price),
        "taxes": taxes,
        "total_tax": str(sum(taxes)),
        "service_charges": service_charges,
        "total_service_charges": str(sum(service_charges)),
        "total_amount": str(total),
        "breakdown": {
            "tier_id": str(tier.id),
            "tier_name": tier.name,
            "tier_description": tier.description,
            "base_storefronts": tier.base_storefronts,
            "additional_storefronts": max(0, storefront_count - tier.base_storefronts),
            "price_per_additional": str(tier.price_per_additional_storefront)
        }
    }
```

---

## 📡 ENDPOINT 2: Check Subscription Status

**Purpose:** Check if current user's business has an active subscription.

### Request

```http
GET /subscriptions/api/subscriptions/status/
Authorization: Bearer <token>
```

### Response (200 OK) - Has Subscription

```json
{
  "has_subscription": true,
  "subscription": {
    "id": "uuid-here",
    "status": "ACTIVE",
    "plan_name": "Professional Tier",
    "current_period_end": "2025-12-03T00:00:00Z"
  }
}
```

### Response (200 OK) - No Subscription

```json
{
  "has_subscription": false
}
```

### Business Logic

```python
def check_subscription_status(user):
    business = user.get_active_business()
    
    try:
        subscription = Subscription.objects.get(
            business=business,
            status__in=['ACTIVE', 'TRIAL', 'PAST_DUE']
        )
        
        return {
            "has_subscription": True,
            "subscription": {
                "id": str(subscription.id),
                "status": subscription.status,
                "plan_name": subscription.plan.name if subscription.plan else "Custom Tier",
                "current_period_end": subscription.current_period_end.isoformat()
            }
        }
    except Subscription.DoesNotExist:
        return {
            "has_subscription": False
        }
```

---

## 📡 ENDPOINT 3: Create Subscription (MODIFIED)

**Purpose:** Create subscription with auto-calculated price (no plan_id required).

### Request

```http
POST /subscriptions/api/subscriptions/
Authorization: Bearer <token>
Content-Type: application/json

{
  "business_id": "uuid-here",
  "payment_method": "PAYSTACK",
  "is_trial": false
}
```

**Note:** `plan_id` is now **OPTIONAL**. If not provided, backend should:
1. Call `calculate_my_pricing()` internally
2. Create subscription with calculated price
3. Link to appropriate pricing tier

### Response (201 Created)

```json
{
  "id": "uuid-here",
  "business_id": "uuid-here",
  "business_name": "DataLeague Systems",
  "status": "PENDING_PAYMENT",
  "amount": "234.00",
  "currency": "GHS",
  "current_period_start": "2025-11-03T00:00:00Z",
  "current_period_end": "2025-12-03T00:00:00Z",
  "auto_renew": true,
  "created_at": "2025-11-03T19:45:00Z"
}
```

### Business Logic (UPDATED)

```python
def create_subscription(data, user):
    business = Business.objects.get(id=data['business_id'])
    
    # NEW: Auto-calculate if no plan_id provided
    if 'plan_id' not in data or not data['plan_id']:
        pricing = calculate_my_pricing(user)
        
        # Find or create pricing tier entry
        tier = SubscriptionPricingTier.objects.get(id=pricing['breakdown']['tier_id'])
        
        # Create subscription with calculated price
        subscription = Subscription.objects.create(
            business=business,
            pricing_tier=tier,  # NEW field
            amount=pricing['total_amount'],
            currency=pricing['currency'],
            status='PENDING_PAYMENT',
            payment_method=data.get('payment_method'),
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timedelta(days=30),
            auto_renew=True
        )
    else:
        # OLD: Use plan_id if provided (backward compatibility)
        plan = SubscriptionPlan.objects.get(id=data['plan_id'])
        subscription = Subscription.objects.create(
            business=business,
            plan=plan,
            amount=plan.price,
            # ... rest of fields
        )
    
    return subscription
```

---

## 🗄️ DATABASE CHANGES REQUIRED

### 1. Create SubscriptionPricingTier Model

```python
class SubscriptionPricingTier(models.Model):
    """Storefront-based pricing tiers"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=100)  # "Starter", "Professional", etc.
    description = models.TextField(blank=True)
    
    # Storefront range
    min_storefronts = models.IntegerField(default=1)
    max_storefronts = models.IntegerField(null=True, blank=True)  # null = unlimited
    
    # Pricing
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    base_storefronts = models.IntegerField(default=1)
    price_per_additional_storefront = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='GHS')
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        ordering = ['min_storefronts']
    
    def __str__(self):
        if self.max_storefronts:
            return f"{self.name} ({self.min_storefronts}-{self.max_storefronts} storefronts)"
        return f"{self.name} ({self.min_storefronts}+ storefronts)"
```

### 2. Update Subscription Model

```python
class Subscription(models.Model):
    # ... existing fields ...
    
    # NEW: Add pricing tier field
    pricing_tier = models.ForeignKey(
        'SubscriptionPricingTier',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='subscriptions'
    )
    
    # Make plan optional (for backward compatibility)
    plan = models.ForeignKey(
        'SubscriptionPlan',
        on_delete=models.PROTECT,
        null=True,  # Changed from required
        blank=True,
        related_name='subscriptions'
    )
```

---

## 🧪 TESTING

### Test Endpoint 1: My Pricing

```bash
curl -X GET \
  http://localhost:8000/subscriptions/api/subscriptions/my-pricing/ \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Expected:** 200 OK with pricing breakdown

### Test Endpoint 2: Status

```bash
curl -X GET \
  http://localhost:8000/subscriptions/api/subscriptions/status/ \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Expected:** 200 OK with has_subscription true/false

### Test Endpoint 3: Create Subscription

```bash
curl -X POST \
  http://localhost:8000/subscriptions/api/subscriptions/ \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "business_id": "YOUR_BUSINESS_UUID",
    "payment_method": "PAYSTACK",
    "is_trial": false
  }'
```

**Expected:** 201 Created with subscription object

---

## 🚨 CURRENT ERRORS IN FRONTEND

```
GET http://localhost:8000/subscriptions/api/subscriptions/my-pricing/ 404 (Not Found)
GET http://localhost:8000/subscriptions/api/subscriptions/status/ 404 (Not Found)
```

**Cause:** Endpoints don't exist yet  
**Fix:** Implement the 3 endpoints above  

---

## ✅ VALIDATION CHECKLIST

Before marking as complete, verify:

- [ ] `/my-pricing/` endpoint returns proper JSON structure
- [ ] `/status/` endpoint returns proper JSON structure
- [ ] `/subscriptions/` POST accepts request without `plan_id`
- [ ] SubscriptionPricingTier model created with migration
- [ ] Subscription model updated to include `pricing_tier` field
- [ ] Admin can create pricing tiers via `/api/pricing-tiers/` endpoints
- [ ] Pricing calculation matches frontend expectations
- [ ] Taxes calculated correctly for Ghana (VAT 12.5%, NHIL 2.5%)
- [ ] Frontend loads without errors after refresh

---

## 📞 NEED HELP?

Contact frontend team if:
- Response format unclear
- Need different fields
- Calculation logic questions
- Integration issues

---

**Status:** 🚨 BLOCKING PRODUCTION  
**Assigned To:** Backend Team  
**Due Date:** ASAP  
**Frontend Ready:** ✅ YES (waiting for backend)

---

**END OF DOCUMENT**
