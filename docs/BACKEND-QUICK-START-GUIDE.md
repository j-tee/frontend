# Backend Quick Start Guide: Flexible Subscription Pricing

**For:** Backend developers (Django/Python)  
**Time to complete:** 2-3 hours for initial setup  
**Prerequisites:** Django project set up, basic understanding of subscription system

---

## 🚀 Quick Setup (Copy-Paste Ready)

### Step 1: Add Models to `subscriptions/models.py`

Copy the complete model definitions from `BACKEND-FLEXIBLE-SUBSCRIPTION-API-SPEC.md` sections 1-4.

**Quick check:**
```python
# You should have these models:
from subscriptions.models import (
    SubscriptionPricingTier,
    TaxConfiguration,
    ServiceCharge,
    SubscriptionPayment  # Enhanced
)
```

### Step 2: Create and Run Migrations

```bash
# Create migrations
python manage.py makemigrations subscriptions

# Review migration file
# Should create: pricing tier, tax config, service charge tables
# Should alter: subscription payment table

# Run migrations
python manage.py migrate subscriptions

# Verify tables created
python manage.py dbshell
\dt subscription*
\q
```

### Step 3: Set Up Default Data

Create `subscriptions/management/commands/setup_default_pricing.py`:

```python
# Copy complete code from BACKEND-FLEXIBLE-SUBSCRIPTION-API-SPEC.md
# Section: "Migration Script"
```

Run the command:

```bash
python manage.py setup_default_pricing

# You should see:
# ✓ Created tier: 1 storefronts: GHS 100.00
# ✓ Created tier: 2 storefronts: GHS 150.00
# ...
# ✓ Created tax: VAT (15.00%) - GH
# ...
# ✅ Setup complete!
```

### Step 4: Add Serializers to `subscriptions/serializers.py`

Copy serializers from `BACKEND-FLEXIBLE-SUBSCRIPTION-API-SPEC.md`:

```python
from rest_framework import serializers
from .models import (
    SubscriptionPricingTier,
    TaxConfiguration,
    ServiceCharge,
    SubscriptionPayment
)

class SubscriptionPricingTierSerializer(serializers.ModelSerializer):
    # ... copy from spec

class TaxConfigurationSerializer(serializers.ModelSerializer):
    # ... copy from spec

class ServiceChargeSerializer(serializers.ModelSerializer):
    # ... copy from spec

class EnhancedSubscriptionPaymentSerializer(serializers.ModelSerializer):
    # ... copy from spec
```

### Step 5: Create ViewSets in `subscriptions/views.py`

Copy ViewSet implementations from spec:

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Sum, Count
from decimal import Decimal
from datetime import date

class SubscriptionPricingTierViewSet(viewsets.ModelViewSet):
    # ... copy complete implementation from spec

class TaxConfigurationViewSet(viewsets.ModelViewSet):
    # ... copy complete implementation from spec

class ServiceChargeViewSet(viewsets.ModelViewSet):
    # ... copy complete implementation from spec

class PaymentStatsViewSet(viewsets.ViewSet):
    # ... copy complete implementation from spec
```

### Step 6: Add Permissions to `subscriptions/permissions.py`

```python
from rest_framework.permissions import BasePermission

class IsPlatformAdmin(BasePermission):
    """Allow SUPER_ADMIN and ADMIN roles"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        platform_role = getattr(request.user, 'platform_role', None)
        return platform_role in ['SUPER_ADMIN', 'ADMIN']

class IsSuperAdmin(BasePermission):
    """Allow SUPER_ADMIN only"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        platform_role = getattr(request.user, 'platform_role', None)
        return platform_role == 'SUPER_ADMIN'
```

### Step 7: Update URL Configuration in `subscriptions/urls.py`

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SubscriptionPricingTierViewSet,
    TaxConfigurationViewSet,
    ServiceChargeViewSet,
    PaymentStatsViewSet,
)

router = DefaultRouter()
router.register(r'pricing-tiers', SubscriptionPricingTierViewSet, basename='pricing-tier')
router.register(r'tax-config', TaxConfigurationViewSet, basename='tax-config')
router.register(r'service-charges', ServiceChargeViewSet, basename='service-charge')
router.register(r'payment-stats', PaymentStatsViewSet, basename='payment-stats')

urlpatterns = [
    path('api/', include(router.urls)),
]
```

### Step 8: Update User Model

**Important:** Ensure your User model has `platform_role` field:

```python
# accounts/models.py (or wherever your User model is)

class User(AbstractBaseUser):
    # ... existing fields ...
    
    platform_role = models.CharField(
        max_length=20,
        choices=[
            ('SUPER_ADMIN', 'Super Administrator'),
            ('ADMIN', 'Administrator'),
            ('SUPPORT', 'Support Staff'),
        ],
        null=True,
        blank=True,
        help_text="Platform-level administrative role"
    )
```

If you need to add this field:

```bash
python manage.py makemigrations accounts
python manage.py migrate accounts
```

### Step 9: Create a Platform Admin User

```bash
python manage.py shell
```

```python
from accounts.models import User

# Create or update user
admin = User.objects.create_user(
    email='admin@yourplatform.com',
    password='SecurePassword123!',
    name='Platform Administrator',
    platform_role='SUPER_ADMIN'
)
admin.save()

print(f"Created admin user: {admin.email}")
print(f"Platform role: {admin.platform_role}")
```

### Step 10: Test the API

Start your development server:

```bash
python manage.py runserver
```

Test endpoints using curl or Postman:

```bash
# Get pricing tiers
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/subscriptions/api/pricing-tiers/

# Calculate pricing for 5 storefronts
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/subscriptions/api/pricing-tiers/calculate/?storefronts=5"

# Get active tax configurations
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/subscriptions/api/tax-config/active/

# Get payment stats
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/subscriptions/api/payment-stats/overview/
```

Expected response for pricing calculation:

```json
{
  "storefronts": 5,
  "tier": { ... },
  "base_price": "200.00",
  "additional_storefronts": 0,
  "additional_cost": "0.00",
  "subtotal": "200.00",
  "taxes": {
    "VAT_GH": {
      "name": "VAT",
      "rate": 15.0,
      "amount": "30.00"
    },
    ...
  },
  "total_tax": "42.00",
  "service_charges": { ... },
  "total_service_charges": "4.00",
  "total_amount": "246.00",
  "currency": "GHS"
}
```

---

## ✅ Verification Checklist

After completing setup, verify:

- [ ] All models created (check `\dt` in database)
- [ ] Default pricing tiers exist (5 tiers)
- [ ] Default tax configs exist (4 Ghana taxes)
- [ ] Platform admin user created
- [ ] API endpoints accessible
- [ ] Pricing calculation works correctly
- [ ] Permissions block non-admin users
- [ ] Tests pass

### Quick Database Check

```bash
python manage.py shell
```

```python
from subscriptions.models import *

# Check pricing tiers
print(f"Pricing tiers: {SubscriptionPricingTier.objects.count()}")
for tier in SubscriptionPricingTier.objects.all():
    print(f"  {tier}")

# Check tax configs
print(f"\nTax configs: {TaxConfiguration.objects.count()}")
for tax in TaxConfiguration.objects.all():
    print(f"  {tax}")

# Test pricing calculation
tier = SubscriptionPricingTier.objects.get(min_storefronts=5)
price = tier.calculate_price(7)
print(f"\nPrice for 7 storefronts: GHS {price}")
# Should be: GHS 300.00 (200 base + 2*50 additional)
```

---

## 🧪 Quick Tests

Create `subscriptions/tests/test_quick.py`:

```python
from django.test import TestCase
from decimal import Decimal
from subscriptions.models import SubscriptionPricingTier, TaxConfiguration
from datetime import date

class QuickSetupTest(TestCase):
    """Quick test to verify setup is correct"""
    
    def test_pricing_tiers_exist(self):
        """Default pricing tiers should be created"""
        self.assertEqual(SubscriptionPricingTier.objects.count(), 5)
    
    def test_tax_configs_exist(self):
        """Ghana tax configs should be created"""
        self.assertEqual(TaxConfiguration.objects.filter(country='GH').count(), 4)
    
    def test_pricing_calculation_1_storefront(self):
        """1 storefront should be GHS 100"""
        tier = SubscriptionPricingTier.objects.get(min_storefronts=1)
        price = tier.calculate_price(1)
        self.assertEqual(price, Decimal('100.00'))
    
    def test_pricing_calculation_5_storefronts(self):
        """5 storefronts should be GHS 200"""
        tier = SubscriptionPricingTier.objects.get(min_storefronts=5)
        price = tier.calculate_price(5)
        self.assertEqual(price, Decimal('200.00'))
    
    def test_pricing_calculation_7_storefronts(self):
        """7 storefronts should be GHS 300 (200 + 2*50)"""
        tier = SubscriptionPricingTier.objects.get(min_storefronts=5)
        price = tier.calculate_price(7)
        self.assertEqual(price, Decimal('300.00'))
    
    def test_tax_calculation(self):
        """VAT should calculate correctly"""
        vat = TaxConfiguration.objects.get(code='VAT_GH')
        amount = vat.calculate_amount(Decimal('100.00'))
        self.assertEqual(amount, Decimal('15.00'))  # 15% of 100
```

Run tests:

```bash
python manage.py test subscriptions.tests.test_quick
```

---

## 🔍 Common Issues & Solutions

### Issue: "platform_role not found"
**Solution:** Add `platform_role` field to User model and run migrations.

```python
# In User model
platform_role = models.CharField(...)
```

```bash
python manage.py makemigrations
python manage.py migrate
```

### Issue: "No pricing tiers found"
**Solution:** Run setup command.

```bash
python manage.py setup_default_pricing
```

### Issue: "Permission denied on endpoints"
**Solution:** Make sure you're authenticated as platform admin.

```python
# In shell
user = User.objects.get(email='your@email.com')
user.platform_role = 'SUPER_ADMIN'
user.save()
```

### Issue: "Migration conflicts"
**Solution:** Delete migration files and recreate.

```bash
# Backup database first!
rm subscriptions/migrations/00*.py
python manage.py makemigrations subscriptions
python manage.py migrate subscriptions
python manage.py setup_default_pricing
```

---

## 📊 Testing Your Setup

### Manual Test Flow

1. **Create a pricing tier:**
   ```bash
   curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "min_storefronts": 10,
       "max_storefronts": 15,
       "base_price": "400.00",
       "price_per_additional_storefront": "0.00",
       "currency": "GHS"
     }' \
     http://localhost:8000/subscriptions/api/pricing-tiers/
   ```

2. **Calculate pricing:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:8000/subscriptions/api/pricing-tiers/calculate/?storefronts=12"
   ```

3. **List all tiers:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/subscriptions/api/pricing-tiers/
   ```

---

## 🎯 Next Steps

After completing quick setup:

1. **Write comprehensive tests** (see spec for examples)
2. **Integrate with payment flow** (update payment creation to use new fields)
3. **Set up monitoring** (track API performance)
4. **Document API** (use tools like Swagger/OpenAPI)
5. **Coordinate with frontend team** (share API documentation)

---

## 📚 Reference

- **Full Backend Spec:** `BACKEND-FLEXIBLE-SUBSCRIPTION-API-SPEC.md`
- **Business Requirements:** `FLEXIBLE-SUBSCRIPTION-PRICING-SPEC.md`
- **Project Checklist:** `FLEXIBLE-SUBSCRIPTION-PRICING-PROJECT-CHECKLIST.md`

---

## 🆘 Need Help?

- **Model issues?** → See spec section "Database Models"
- **API not working?** → See spec section "API Endpoints"
- **Tests failing?** → See spec section "Testing"
- **Permission errors?** → See spec section "Permissions"

---

**Estimated Time:**
- Initial setup: 2-3 hours
- Full implementation: 1-2 weeks
- Testing: 2-3 days

**Ready to start?** Begin with Step 1 above! 🚀
