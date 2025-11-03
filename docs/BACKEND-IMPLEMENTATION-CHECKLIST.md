# ⚡ BACKEND IMPLEMENTATION REQUIRED - Subscription Pricing System

**Date:** November 3, 2025  
**Status:** 🔴 BLOCKING - Frontend cannot function without these  
**Priority:** URGENT  
**Estimated Time:** 4-6 hours for experienced Django developer  

---

## 🎯 WHAT THE FRONTEND NEEDS

The subscription portal is ready but shows **blank/empty** because these backend endpoints don't exist yet.

### Current Problem

```
User visits: /app/subscription
Frontend calls: GET /subscriptions/api/subscriptions/my-pricing/
Backend returns: 404 Not Found ❌
Result: Blank page with "Your Pricing" header but no content
```

---

## 📋 COMPLETE IMPLEMENTATION CHECKLIST

### Phase 1: Database (30 minutes)

- [ ] **Create model:** `SubscriptionPricingTier`
- [ ] **Update model:** Add `pricing_tier` field to `Subscription`
- [ ] **Create migration**
- [ ] **Run migration**

### Phase 2: API Endpoints (2-3 hours)

- [ ] **Endpoint 1:** `GET /subscriptions/api/subscriptions/my-pricing/`
- [ ] **Endpoint 2:** `GET /subscriptions/api/subscriptions/status/`
- [ ] **Endpoint 3:** Update `POST /subscriptions/api/subscriptions/` (make plan_id optional)
- [ ] **Endpoint 4:** `GET /subscriptions/api/pricing-tiers/` (admin)
- [ ] **Endpoint 5:** `POST /subscriptions/api/pricing-tiers/` (admin)
- [ ] **Endpoint 6:** `PATCH /subscriptions/api/pricing-tiers/{id}/` (admin)
- [ ] **Endpoint 7:** `DELETE /subscriptions/api/pricing-tiers/{id}/` (admin)
- [ ] **Endpoint 8:** `POST /subscriptions/api/pricing-tiers/{id}/activate/` (admin)
- [ ] **Endpoint 9:** `POST /subscriptions/api/pricing-tiers/{id}/deactivate/` (admin)

### Phase 3: Business Logic (1-2 hours)

- [ ] **Function:** `count_business_storefronts(business_id)`
- [ ] **Function:** `find_pricing_tier(storefront_count)`
- [ ] **Function:** `calculate_tier_price(tier, storefront_count)`
- [ ] **Function:** `calculate_taxes(base_price, country)`
- [ ] **Function:** `calculate_service_charges(base_price, gateway)`

### Phase 4: Testing (1 hour)

- [ ] **Test:** Create pricing tiers (1, 2, 3-4, 5+)
- [ ] **Test:** /my-pricing/ returns correct calculation
- [ ] **Test:** /status/ works for user with/without subscription
- [ ] **Test:** Create subscription without plan_id
- [ ] **Test:** Admin CRUD operations on pricing tiers

---

## 🚀 QUICK START GUIDE

### Step 1: Create the Model (5 minutes)

```python
# subscriptions/models.py

class SubscriptionPricingTier(models.Model):
    """Storefront-based pricing tiers - replaces fixed plans"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, help_text="Tier name (e.g., 'Starter', 'Enterprise')")
    description = models.TextField(blank=True, help_text="Internal description")
    
    # Storefront range
    min_storefronts = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Minimum storefronts for this tier"
    )
    max_storefronts = models.IntegerField(
        null=True, 
        blank=True,
        help_text="Maximum storefronts (leave blank for unlimited/open-ended)"
    )
    
    # Pricing
    base_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        help_text="Price for base_storefronts"
    )
    base_storefronts = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Number of storefronts included in base price"
    )
    price_per_additional_storefront = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text="Additional price per storefront above base"
    )
    currency = models.CharField(max_length=3, default='GHS')
    
    # Status
    is_active = models.BooleanField(
        default=True,
        help_text="Only active tiers are used for pricing"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_pricing_tiers'
    )
    
    class Meta:
        ordering = ['min_storefronts']
        verbose_name = "Subscription Pricing Tier"
        verbose_name_plural = "Subscription Pricing Tiers"
    
    def __str__(self):
        if self.max_storefronts:
            return f"{self.name} ({self.min_storefronts}-{self.max_storefronts} storefronts)"
        return f"{self.name} ({self.min_storefronts}+ storefronts)"
    
    def clean(self):
        """Validate tier configuration"""
        if self.max_storefronts and self.max_storefronts < self.min_storefronts:
            raise ValidationError("max_storefronts must be >= min_storefronts")
        
        if self.base_storefronts < self.min_storefronts:
            raise ValidationError("base_storefronts must be >= min_storefronts")
    
    def calculate_price(self, storefront_count):
        """Calculate price for given storefront count"""
        if storefront_count <= self.base_storefronts:
            return self.base_price
        
        additional = storefront_count - self.base_storefronts
        return self.base_price + (additional * self.price_per_additional_storefront)


# Update existing Subscription model
class Subscription(models.Model):
    # ... existing fields ...
    
    # ADD THIS FIELD
    pricing_tier = models.ForeignKey(
        'SubscriptionPricingTier',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='subscriptions',
        help_text="Pricing tier (new system)"
    )
    
    # Make plan optional (old system)
    plan = models.ForeignKey(
        'SubscriptionPlan',
        on_delete=models.PROTECT,
        null=True,  # Changed from required
        blank=True,
        related_name='subscriptions'
    )
```

### Step 2: Create Migration

```bash
python manage.py makemigrations subscriptions
python manage.py migrate
```

### Step 3: Create Helper Functions (10 minutes)

```python
# subscriptions/utils.py

def count_business_storefronts(business):
    """Count active storefronts for a business"""
    from businesses.models import Storefront
    return Storefront.objects.filter(
        business=business,
        is_active=True
    ).count()


def find_pricing_tier(storefront_count):
    """Find appropriate pricing tier for storefront count"""
    from .models import SubscriptionPricingTier
    
    tier = SubscriptionPricingTier.objects.filter(
        is_active=True,
        min_storefronts__lte=storefront_count
    ).filter(
        Q(max_storefronts__gte=storefront_count) | Q(max_storefronts__isnull=True)
    ).first()
    
    if not tier:
        raise ValidationError(
            f"No pricing tier found for {storefront_count} storefronts. "
            "Please contact support."
        )
    
    return tier


def calculate_my_pricing(user):
    """Calculate complete pricing for user's business"""
    
    # 1. Get user's business
    business = user.businesses.filter(is_active=True).first()
    if not business:
        raise ValidationError("No active business found")
    
    # 2. Count storefronts
    storefront_count = count_business_storefronts(business)
    
    # 3. Find matching tier
    tier = find_pricing_tier(storefront_count)
    
    # 4. Calculate base price
    base_price = tier.calculate_price(storefront_count)
    
    # 5. Calculate taxes (Ghana)
    vat_rate = Decimal('0.125')  # 12.5%
    nhil_rate = Decimal('0.025')  # 2.5%
    
    vat_amount = base_price * vat_rate
    nhil_amount = base_price * nhil_rate
    total_tax = vat_amount + nhil_amount
    
    taxes = [
        {
            "code": "VAT",
            "name": "Value Added Tax",
            "rate": float(vat_rate),
            "amount": str(vat_amount.quantize(Decimal('0.01')))
        },
        {
            "code": "NHIL",
            "name": "National Health Insurance Levy",
            "rate": float(nhil_rate),
            "amount": str(nhil_amount.quantize(Decimal('0.01')))
        }
    ]
    
    # 6. Calculate service charges (optional - e.g., payment processing)
    service_charges = []
    total_service_charges = Decimal('0')
    
    # Example: 2% payment processing fee
    # processing_rate = Decimal('0.02')
    # processing_amount = base_price * processing_rate
    # service_charges.append({
    #     "code": "PAYMENT_PROCESSING",
    #     "name": "Payment Processing Fee",
    #     "type": "PERCENTAGE",
    #     "rate": float(processing_rate),
    #     "amount": str(processing_amount.quantize(Decimal('0.01')))
    # })
    # total_service_charges = processing_amount
    
    # 7. Calculate total
    total_amount = base_price + total_tax + total_service_charges
    
    # 8. Build response
    return {
        "storefronts": storefront_count,
        "currency": tier.currency,
        "base_price": str(base_price.quantize(Decimal('0.01'))),
        "taxes": taxes,
        "total_tax": str(total_tax.quantize(Decimal('0.01'))),
        "service_charges": service_charges,
        "total_service_charges": str(total_service_charges.quantize(Decimal('0.01'))),
        "total_amount": str(total_amount.quantize(Decimal('0.01'))),
        "breakdown": {
            "tier_id": str(tier.id),
            "tier_name": tier.name,
            "tier_description": tier.description,
            "base_storefronts": tier.base_storefronts,
            "additional_storefronts": max(0, storefront_count - tier.base_storefronts),
            "price_per_additional": str(tier.price_per_additional_storefront.quantize(Decimal('0.01')))
        }
    }
```

### Step 4: Create API Views (20 minutes)

```python
# subscriptions/views.py

from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from .utils import calculate_my_pricing, count_business_storefronts


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_pricing_view(request):
    """
    GET /subscriptions/api/subscriptions/my-pricing/
    
    Auto-calculate subscription price for current user's business
    """
    try:
        pricing_data = calculate_my_pricing(request.user)
        return Response(pricing_data, status=status.HTTP_200_OK)
    except ValidationError as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {"error": "Failed to calculate pricing"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subscription_status_view(request):
    """
    GET /subscriptions/api/subscriptions/status/
    
    Check if current user's business has an active subscription
    """
    try:
        business = request.user.businesses.filter(is_active=True).first()
        if not business:
            return Response({
                "has_subscription": False
            })
        
        subscription = Subscription.objects.filter(
            business=business,
            status__in=['ACTIVE', 'TRIAL', 'PAST_DUE']
        ).first()
        
        if subscription:
            return Response({
                "has_subscription": True,
                "subscription": {
                    "id": str(subscription.id),
                    "status": subscription.status,
                    "plan_name": subscription.plan.name if subscription.plan else subscription.pricing_tier.name,
                    "current_period_end": subscription.current_period_end.isoformat()
                }
            })
        else:
            return Response({
                "has_subscription": False
            })
    
    except Exception as e:
        return Response(
            {"error": "Failed to check subscription status"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class SubscriptionPricingTierViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing pricing tiers (admin only)
    
    list: GET /subscriptions/api/pricing-tiers/
    create: POST /subscriptions/api/pricing-tiers/
    retrieve: GET /subscriptions/api/pricing-tiers/{id}/
    update: PATCH /subscriptions/api/pricing-tiers/{id}/
    destroy: DELETE /subscriptions/api/pricing-tiers/{id}/
    """
    queryset = SubscriptionPricingTier.objects.all()
    serializer_class = PricingTierSerializer
    permission_classes = [IsAuthenticated, IsPlatformAdmin]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """POST /subscriptions/api/pricing-tiers/{id}/activate/"""
        tier = self.get_object()
        tier.is_active = True
        tier.save()
        return Response({"status": "activated"})
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """POST /subscriptions/api/pricing-tiers/{id}/deactivate/"""
        tier = self.get_object()
        tier.is_active = False
        tier.save()
        return Response({"status": "deactivated"})
```

### Step 5: Create Serializers (10 minutes)

```python
# subscriptions/serializers.py

class PricingTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPricingTier
        fields = [
            'id', 'name', 'description',
            'min_storefronts', 'max_storefronts',
            'base_price', 'base_storefronts',
            'price_per_additional_storefront', 'currency',
            'is_active', 'created_at', 'updated_at', 'created_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
```

### Step 6: Update URLs (5 minutes)

```python
# subscriptions/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'pricing-tiers', views.SubscriptionPricingTierViewSet, basename='pricing-tier')

urlpatterns = [
    # ... existing URLs ...
    
    # NEW: Auto-calculated pricing endpoints
    path('subscriptions/my-pricing/', views.my_pricing_view, name='my-pricing'),
    path('subscriptions/status/', views.subscription_status_view, name='subscription-status'),
    
    # NEW: Pricing tier management (admin)
    path('', include(router.urls)),
]
```

### Step 7: Update Create Subscription (15 minutes)

```python
# subscriptions/views.py - UPDATE existing view

class SubscriptionViewSet(viewsets.ModelViewSet):
    # ... existing code ...
    
    def create(self, request, *args, **kwargs):
        """Create subscription - now supports auto-calculated pricing"""
        
        # NEW: Check if plan_id provided (old way) or auto-calculate (new way)
        if 'plan_id' not in request.data or not request.data.get('plan_id'):
            # NEW WAY: Auto-calculate from storefront count
            try:
                pricing = calculate_my_pricing(request.user)
                tier = SubscriptionPricingTier.objects.get(id=pricing['breakdown']['tier_id'])
                
                subscription = Subscription.objects.create(
                    business_id=request.data['business_id'],
                    pricing_tier=tier,
                    amount=pricing['total_amount'],
                    currency=pricing['currency'],
                    status='PENDING_PAYMENT',
                    payment_method=request.data.get('payment_method'),
                    current_period_start=timezone.now(),
                    current_period_end=timezone.now() + timedelta(days=30),
                    auto_renew=True,
                    is_trial=request.data.get('is_trial', False)
                )
                
                serializer = self.get_serializer(subscription)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                return Response(
                    {"error": str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # OLD WAY: Use plan_id (backward compatibility)
            return super().create(request, *args, **kwargs)
```

---

## 🧪 TESTING THE IMPLEMENTATION

### Test 1: Create Sample Pricing Tiers

```python
# In Django shell or admin

from subscriptions.models import SubscriptionPricingTier

# Tier 1: Starter (1 storefront)
SubscriptionPricingTier.objects.create(
    name="Starter",
    description="For single-location businesses",
    min_storefronts=1,
    max_storefronts=1,
    base_price=100.00,
    base_storefronts=1,
    price_per_additional_storefront=0,
    currency="GHS",
    is_active=True
)

# Tier 2: Business (2 storefronts)
SubscriptionPricingTier.objects.create(
    name="Business",
    description="For small multi-location businesses",
    min_storefronts=2,
    max_storefronts=2,
    base_price=150.00,
    base_storefronts=2,
    price_per_additional_storefront=0,
    currency="GHS",
    is_active=True
)

# Tier 3: Professional (3-4 storefronts)
SubscriptionPricingTier.objects.create(
    name="Professional",
    description="For growing businesses",
    min_storefronts=3,
    max_storefronts=4,
    base_price=180.00,
    base_storefronts=3,
    price_per_additional_storefront=20.00,
    currency="GHS",
    is_active=True
)

# Tier 4: Enterprise (5+ storefronts)
SubscriptionPricingTier.objects.create(
    name="Enterprise",
    description="For large organizations",
    min_storefronts=5,
    max_storefronts=None,  # Unlimited
    base_price=200.00,
    base_storefronts=5,
    price_per_additional_storefront=50.00,
    currency="GHS",
    is_active=True
)
```

### Test 2: Test API Endpoints

```bash
# Test my-pricing endpoint
curl -X GET \
  http://localhost:8000/subscriptions/api/subscriptions/my-pricing/ \
  -H 'Authorization: Bearer YOUR_TOKEN'

# Expected: 200 OK with pricing breakdown

# Test status endpoint
curl -X GET \
  http://localhost:8000/subscriptions/api/subscriptions/status/ \
  -H 'Authorization: Bearer YOUR_TOKEN'

# Expected: 200 OK with has_subscription: false

# Test create subscription (auto-calculated)
curl -X POST \
  http://localhost:8000/subscriptions/api/subscriptions/ \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "business_id": "YOUR_BUSINESS_UUID",
    "payment_method": "PAYSTACK",
    "is_trial": false
  }'

# Expected: 201 Created
```

---

## ✅ SUCCESS CRITERIA

When complete, you should be able to:

1. ✅ Visit `/app/subscription` and see pricing breakdown (not blank)
2. ✅ See storefront count auto-detected from backend
3. ✅ See correct tier name and pricing
4. ✅ See tax breakdown (VAT 12.5%, NHIL 2.5%)
5. ✅ See total amount calculated
6. ✅ Click "Subscribe Now" and create subscription
7. ✅ Admin can manage pricing tiers from `/app/platform`

---

## 📞 SUPPORT

**Frontend is ready and waiting!**

Once you implement these endpoints, the frontend will automatically work. No frontend changes needed.

**Questions?** Ask the frontend team - we're ready to help integrate!

---

**Status:** 🔴 BLOCKING PRODUCTION  
**Estimated Time:** 4-6 hours  
**Documentation:** Complete and ready  
**Frontend:** ✅ READY (waiting for backend)

---

**END OF DOCUMENT**
