# Backend Implementation Guide: Subscription Security Fix

**For:** Backend Development Team  
**Priority:** 🚨 CRITICAL - REVENUE SECURITY  
**Estimated Time:** 2-3 days  
**Status:** REQUIRED  

---

## 📋 OVERVIEW

This guide provides complete backend implementation for the subscription pricing security fix. The frontend is complete and waiting for these endpoints.

### What You're Building

Three new/modified endpoints:
1. `GET /subscriptions/api/subscriptions/my-pricing/` - Auto-calculate pricing
2. `GET /subscriptions/api/subscriptions/status/` - Check subscription status
3. `POST /subscriptions/api/subscriptions/` - Modified to auto-calculate (ignore plan_id)

---

## 🔧 IMPLEMENTATION

### Endpoint 1: Get My Subscription Pricing

**File:** `subscriptions/views.py`

```python
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from decimal import Decimal
from django.db.models import Q
from datetime import date

@action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
def my_pricing(self, request):
    """
    Get subscription pricing for current user's business.
    Automatically detects storefront count and calculates price.
    
    NO USER INPUT - everything is calculated from database.
    """
    user = request.user
    
    # Step 1: Get user's business
    try:
        # Assuming relationship: User -> BusinessMembership -> Business
        business = user.business_memberships.first().business
    except AttributeError:
        return Response(
            {
                'error': 'No business found for user',
                'code': 'NO_BUSINESS'
            },
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Step 2: Count ACTUAL storefronts (from database, not user input)
    storefront_count = business.business_storefronts.filter(is_active=True).count()
    
    if storefront_count == 0:
        return Response(
            {
                'error': 'You must have at least one active storefront to subscribe',
                'code': 'NO_STOREFRONTS',
                'storefront_count': 0
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Step 3: Find pricing tier for this storefront count
    tier = SubscriptionPricingTier.objects.filter(
        is_active=True,
        min_storefronts__lte=storefront_count
    ).filter(
        Q(max_storefronts__gte=storefront_count) | Q(max_storefronts__isnull=True)
    ).first()
    
    if not tier:
        return Response(
            {
                'error': f'No pricing tier found for {storefront_count} storefronts',
                'code': 'NO_PRICING_TIER',
                'storefront_count': storefront_count
            },
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Step 4: Calculate base price
    base_price = tier.calculate_price(storefront_count)
    
    # Step 5: Calculate taxes
    taxes = []
    total_tax = Decimal('0.00')
    
    active_taxes = TaxConfiguration.objects.filter(
        is_active=True,
        applies_to_subscriptions=True,
        effective_from__lte=date.today()
    ).filter(
        Q(effective_until__gte=date.today()) | Q(effective_until__isnull=True)
    ).order_by('calculation_order')
    
    current_base = base_price
    for tax in active_taxes:
        if tax.applies_to == 'SUBTOTAL':
            tax_amount = tax.calculate_amount(current_base)
        else:  # CUMULATIVE
            tax_amount = tax.calculate_amount(base_price + total_tax)
        
        taxes.append({
            'code': tax.code,
            'name': tax.name,
            'rate': float(tax.rate),
            'amount': str(tax_amount)
        })
        total_tax += tax_amount
    
    # Step 6: Calculate total
    total = base_price + total_tax
    
    # Step 7: Return complete pricing breakdown
    return Response({
        'business_name': business.name,
        'business_id': str(business.id),
        'storefront_count': storefront_count,
        'currency': tier.currency,
        'base_price': str(base_price),
        'taxes': taxes,
        'total_tax': str(total_tax),
        'total_amount': str(total),
        'billing_cycle': 'MONTHLY',
        'tier_description': str(tier)  # e.g., "4 storefronts: GHS 200.00"
    })
```

### Endpoint 2: Check Subscription Status

**File:** `subscriptions/views.py`

```python
@action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
def status(self, request):
    """
    Check if user has an active subscription.
    Returns subscription status and details.
    """
    user = request.user
    
    try:
        business = user.business_memberships.first().business
    except AttributeError:
        return Response(
            {
                'has_subscription': False,
                'subscription': None
            },
            status=status.HTTP_200_OK
        )
    
    # Find active subscription
    subscription = Subscription.objects.filter(
        business=business,
        status__in=['ACTIVE', 'TRIAL']
    ).first()
    
    if not subscription:
        return Response(
            {
                'has_subscription': False,
                'subscription': None
            },
            status=status.HTTP_200_OK
        )
    
    # Serialize subscription
    from .serializers import SubscriptionSerializer
    return Response(
        {
            'has_subscription': True,
            'subscription': SubscriptionSerializer(subscription).data
        },
        status=status.HTTP_200_OK
    )
```

### Endpoint 3: Modified Create Subscription

**File:** `subscriptions/views.py`

```python
def create(self, request, *args, **kwargs):
    """
    Create subscription - NO PLAN SELECTION.
    Price is automatically calculated from storefront count.
    
    SECURITY: Ignores any plan_id from frontend.
    """
    user = request.user
    
    # Step 1: Get user's business
    try:
        business = user.business_memberships.first().business
    except AttributeError:
        return Response(
            {
                'error': 'No business found for user',
                'code': 'NO_BUSINESS'
            },
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Step 2: Prevent duplicate active subscriptions
    existing = Subscription.objects.filter(
        business=business,
        status__in=['ACTIVE', 'TRIAL']
    ).first()
    
    if existing:
        return Response(
            {
                'error': 'You already have an active subscription',
                'code': 'SUBSCRIPTION_EXISTS',
                'existing_subscription_id': str(existing.id)
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Step 3: Count storefronts
    storefront_count = business.business_storefronts.filter(is_active=True).count()
    
    if storefront_count == 0:
        return Response(
            {
                'error': 'You must have at least one active storefront',
                'code': 'NO_STOREFRONTS'
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Step 4: Find pricing tier
    tier = SubscriptionPricingTier.objects.filter(
        is_active=True,
        min_storefronts__lte=storefront_count
    ).filter(
        Q(max_storefronts__gte=storefront_count) | Q(max_storefronts__isnull=True)
    ).first()
    
    if not tier:
        return Response(
            {
                'error': f'No pricing tier found for {storefront_count} storefronts',
                'code': 'NO_PRICING_TIER',
                'storefront_count': storefront_count
            },
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Step 5: Calculate pricing (same logic as my_pricing)
    base_price = tier.calculate_price(storefront_count)
    
    # Calculate taxes
    total_tax = Decimal('0.00')
    active_taxes = TaxConfiguration.objects.filter(
        is_active=True,
        applies_to_subscriptions=True,
        effective_from__lte=date.today()
    ).filter(
        Q(effective_until__gte=date.today()) | Q(effective_until__isnull=True)
    ).order_by('calculation_order')
    
    current_base = base_price
    for tax in active_taxes:
        if tax.applies_to == 'SUBTOTAL':
            tax_amount = tax.calculate_amount(current_base)
        else:
            tax_amount = tax.calculate_amount(base_price + total_tax)
        total_tax += tax_amount
    
    total = base_price + total_tax
    
    # Step 6: Create subscription
    # IMPORTANT: Do NOT use plan_id from request - ignore it completely
    from datetime import timedelta
    from django.utils import timezone
    
    current_date = timezone.now()
    end_date = current_date + timedelta(days=30)  # Monthly billing
    
    subscription = Subscription.objects.create(
        user=user,
        business=business,
        amount=total,
        currency=tier.currency,
        status='INACTIVE',  # Will become ACTIVE after payment
        payment_status='PENDING',
        billing_cycle='MONTHLY',
        current_period_start=current_date,
        current_period_end=end_date,
        auto_renew=True,
        # Add storefront_count field if it exists in your model
        # storefront_count=storefront_count,
        notes=f'Auto-calculated for {storefront_count} storefronts'
    )
    
    # Step 7: Return subscription
    from .serializers import SubscriptionSerializer
    return Response(
        SubscriptionSerializer(subscription).data,
        status=status.HTTP_201_CREATED
    )
```

---

## 📊 DATABASE CHANGES

### Add Storefront Count to Subscription Model

**File:** `subscriptions/models.py`

```python
class Subscription(models.Model):
    # ... existing fields ...
    
    # NEW FIELD: Track storefront count at time of subscription
    storefront_count = models.IntegerField(
        default=1,
        help_text="Number of storefronts at subscription creation/renewal"
    )
    
    # ... rest of fields ...
```

**Migration:**
```bash
python manage.py makemigrations subscriptions
python manage.py migrate
```

---

## 🧪 TESTING

### Unit Tests

**File:** `subscriptions/tests/test_pricing_endpoints.py`

```python
from django.test import TestCase
from rest_framework.test import APIClient
from decimal import Decimal

class SubscriptionPricingTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Create test user, business, storefronts, pricing tiers
        self.user = User.objects.create_user(username='test', password='test123')
        self.business = Business.objects.create(name='Test Business')
        BusinessMembership.objects.create(user=self.user, business=self.business)
        
        # Create pricing tier: 1-5 storefronts = GHS 100 base + GHS 50/additional
        SubscriptionPricingTier.objects.create(
            name='Standard',
            min_storefronts=1,
            max_storefronts=5,
            base_price=Decimal('100.00'),
            price_per_additional_storefront=Decimal('50.00'),
            base_storefronts=1,
            currency='GHS',
            is_active=True
        )
        
        # Create tax: VAT 3%
        TaxConfiguration.objects.create(
            code='VAT_GH',
            name='VAT',
            rate=Decimal('3.00'),
            applies_to_subscriptions=True,
            is_active=True,
            effective_from='2024-01-01'
        )
        
        self.client.force_authenticate(user=self.user)
    
    def test_my_pricing_with_1_storefront(self):
        """Test pricing calculation for 1 storefront"""
        Storefront.objects.create(business=self.business, is_active=True)
        
        response = self.client.get('/subscriptions/api/subscriptions/my-pricing/')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['storefront_count'], 1)
        self.assertEqual(Decimal(response.data['base_price']), Decimal('100.00'))
        self.assertEqual(Decimal(response.data['total_tax']), Decimal('3.00'))
        self.assertEqual(Decimal(response.data['total_amount']), Decimal('103.00'))
    
    def test_my_pricing_with_4_storefronts(self):
        """Test pricing calculation for 4 storefronts"""
        for i in range(4):
            Storefront.objects.create(business=self.business, is_active=True)
        
        response = self.client.get('/subscriptions/api/subscriptions/my-pricing/')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['storefront_count'], 4)
        # Base 100 + (4-1)*50 = 100 + 150 = 250
        self.assertEqual(Decimal(response.data['base_price']), Decimal('250.00'))
        # Tax 3% = 7.50
        self.assertEqual(Decimal(response.data['total_tax']), Decimal('7.50'))
        self.assertEqual(Decimal(response.data['total_amount']), Decimal('257.50'))
    
    def test_my_pricing_no_storefronts(self):
        """Test error when no storefronts"""
        response = self.client.get('/subscriptions/api/subscriptions/my-pricing/')
        
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['code'], 'NO_STOREFRONTS')
    
    def test_create_subscription_auto_calculates(self):
        """Test subscription creation auto-calculates price"""
        for i in range(2):
            Storefront.objects.create(business=self.business, is_active=True)
        
        response = self.client.post('/subscriptions/api/subscriptions/', {})
        
        self.assertEqual(response.status_code, 201)
        # Base 100 + (2-1)*50 = 150 + 3% tax = 154.50
        self.assertEqual(Decimal(response.data['amount']), Decimal('154.50'))
    
    def test_create_subscription_ignores_plan_id(self):
        """Test subscription creation ignores plan_id from frontend"""
        for i in range(2):
            Storefront.objects.create(business=self.business, is_active=True)
        
        # Try to send plan_id (should be ignored)
        response = self.client.post('/subscriptions/api/subscriptions/', {
            'plan_id': 'some-fake-uuid'
        })
        
        self.assertEqual(response.status_code, 201)
        # Price should still be calculated from storefronts, not plan
        self.assertEqual(Decimal(response.data['amount']), Decimal('154.50'))
```

---

## 🔒 SECURITY CHECKLIST

Before deploying, verify:

- [ ] `my_pricing` gets storefront count from database (not user input)
- [ ] `create` subscription ignores any plan_id from request
- [ ] `create` subscription validates user owns the business
- [ ] No endpoint allows user to specify price or storefront count
- [ ] All pricing calculations are server-side
- [ ] Duplicate subscription prevention works
- [ ] Error messages don't leak sensitive information
- [ ] All endpoints require authentication
- [ ] Audit logging for subscription creation

---

## 📝 SERIALIZER UPDATES

**File:** `subscriptions/serializers.py`

```python
class SubscriptionSerializer(serializers.ModelSerializer):
    # ... existing fields ...
    
    # Add storefront_count to response
    storefront_count = serializers.IntegerField(read_only=True)
    
    # Add business info
    business = serializers.SerializerMethodField()
    
    # Add days until expiry
    days_until_expiry = serializers.SerializerMethodField()
    
    class Meta:
        model = Subscription
        fields = [
            'id', 'user', 'business', 'storefront_count',
            'amount', 'currency', 'status', 'payment_status',
            'billing_cycle', 'current_period_start', 'current_period_end',
            'days_until_expiry', 'auto_renew', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_business(self, obj):
        return {
            'id': str(obj.business.id),
            'name': obj.business.name
        }
    
    def get_days_until_expiry(self, obj):
        from datetime import datetime
        if obj.current_period_end:
            delta = obj.current_period_end - datetime.now()
            return max(0, delta.days)
        return None
```

---

## 🚀 DEPLOYMENT CHECKLIST

**Pre-Deployment:**
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Code review complete
- [ ] Database migrations ready
- [ ] Staging environment tested

**Deployment:**
- [ ] Run migrations
- [ ] Deploy backend code
- [ ] Test endpoints manually
- [ ] Monitor error logs
- [ ] Verify with frontend team

**Post-Deployment:**
- [ ] Test end-to-end subscription flow
- [ ] Monitor subscription creations
- [ ] Check for errors in logs
- [ ] Verify pricing calculations
- [ ] Update API documentation

---

## 📞 SUPPORT

**Questions?** Contact:
- Frontend Team: [Contact info]
- Product Owner: [Contact info]
- DevOps: [Contact info]

**Documentation:**
- Frontend Implementation: `docs/SUBSCRIPTION-SECURITY-FIX-IMPLEMENTATION.md`
- API Contract: See "Frontend Changes Implemented" section

---

**Status:** READY FOR IMPLEMENTATION  
**Priority:** 🚨 CRITICAL  
**Estimated Time:** 2-3 days  
**Dependencies:** None (SubscriptionPricingTier and TaxConfiguration models already exist)  

---

**END OF GUIDE**
