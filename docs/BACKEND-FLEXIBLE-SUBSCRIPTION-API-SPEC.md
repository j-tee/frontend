# Backend API Specification: Flexible Subscription Pricing System

## Overview

This document provides the complete backend API specification for implementing the flexible subscription pricing system. This should be implemented by the backend team.

**Related Document:** See `FLEXIBLE-SUBSCRIPTION-PRICING-SPEC.md` for complete business requirements.

---

## Database Models

### 1. SubscriptionPricingTier

**File:** `subscriptions/models.py`

```python
import uuid
from django.db import models
from django.conf import settings
from decimal import Decimal

class SubscriptionPricingTier(models.Model):
    """
    Dynamic pricing tiers based on storefront count.
    Allows platform admins to configure flexible pricing.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Tier definition
    min_storefronts = models.IntegerField(
        help_text="Minimum number of storefronts for this tier (inclusive)"
    )
    max_storefronts = models.IntegerField(
        null=True,
        blank=True,
        help_text="Maximum number of storefronts (inclusive). NULL means unlimited."
    )
    
    # Pricing
    base_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Base price for this tier in the specified currency"
    )
    price_per_additional_storefront = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Price per storefront beyond min_storefronts. Used for open-ended tiers."
    )
    currency = models.CharField(max_length=3, default='GHS')
    
    # Metadata
    is_active = models.BooleanField(
        default=True,
        help_text="Only active tiers are used for pricing calculation"
    )
    description = models.TextField(
        blank=True,
        help_text="Internal notes about this tier"
    )
    
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
        db_table = 'subscription_pricing_tier'
        verbose_name = 'Subscription Pricing Tier'
        verbose_name_plural = 'Subscription Pricing Tiers'
        indexes = [
            models.Index(fields=['is_active', 'min_storefronts']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(max_storefronts__gte=models.F('min_storefronts')) | models.Q(max_storefronts__isnull=True),
                name='max_storefronts_gte_min_storefronts'
            ),
        ]
    
    def __str__(self):
        if self.max_storefronts:
            return f"{self.min_storefronts}-{self.max_storefronts} storefronts: {self.currency} {self.base_price}"
        else:
            return f"{self.min_storefronts}+ storefronts: {self.currency} {self.base_price} + {self.price_per_additional_storefront}/extra"
    
    def applies_to_storefront_count(self, count: int) -> bool:
        """Check if this tier applies to the given storefront count"""
        if count < self.min_storefronts:
            return False
        if self.max_storefronts is None:
            return True
        return count <= self.max_storefronts
    
    def calculate_price(self, storefront_count: int) -> Decimal:
        """Calculate the total price for the given storefront count"""
        if not self.applies_to_storefront_count(storefront_count):
            raise ValueError(f"This tier does not apply to {storefront_count} storefronts")
        
        if storefront_count <= self.min_storefronts:
            return self.base_price
        
        additional_storefronts = storefront_count - self.min_storefronts
        additional_cost = additional_storefronts * self.price_per_additional_storefront
        
        return self.base_price + additional_cost
```

### 2. TaxConfiguration

```python
from django.core.validators import MinValueValidator, MaxValueValidator

class TaxConfiguration(models.Model):
    """
    Configurable tax rates for different jurisdictions.
    Supports Ghana-specific taxes (VAT, NHIL, GETFund, COVID-19 Levy, etc.)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Tax identification
    name = models.CharField(
        max_length=100,
        help_text="Tax name (e.g., 'VAT', 'NHIL', 'GETFund Levy')"
    )
    code = models.CharField(
        max_length=20,
        unique=True,
        help_text="Unique code (e.g., 'VAT_GH', 'NHIL_GH')"
    )
    description = models.TextField(blank=True)
    
    # Tax details
    rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Tax rate as percentage (e.g., 15.00 for 15%)"
    )
    country = models.CharField(
        max_length=2,
        default='GH',
        help_text="ISO 3166-1 alpha-2 country code"
    )
    
    # Application rules
    applies_to_subscriptions = models.BooleanField(
        default=True,
        help_text="Whether this tax applies to subscription payments"
    )
    is_mandatory = models.BooleanField(
        default=True,
        help_text="Whether this tax must be applied (cannot be opted out)"
    )
    calculation_order = models.IntegerField(
        default=0,
        help_text="Order in which tax is calculated (lower numbers first)"
    )
    applies_to = models.CharField(
        max_length=20,
        choices=[
            ('SUBTOTAL', 'Subtotal (before other taxes)'),
            ('CUMULATIVE', 'Cumulative (including previous taxes)'),
        ],
        default='SUBTOTAL',
        help_text="What amount to apply the tax to"
    )
    
    # Status and validity
    is_active = models.BooleanField(default=True)
    effective_from = models.DateField(
        help_text="Date from which this tax rate is effective"
    )
    effective_until = models.DateField(
        null=True,
        blank=True,
        help_text="Date until which this tax rate is effective (NULL = indefinite)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_tax_configs'
    )
    
    class Meta:
        ordering = ['calculation_order', 'name']
        db_table = 'tax_configuration'
        verbose_name = 'Tax Configuration'
        verbose_name_plural = 'Tax Configurations'
        indexes = [
            models.Index(fields=['is_active', 'effective_from', 'effective_until']),
            models.Index(fields=['country', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.rate}%) - {self.country}"
    
    def is_effective(self, date=None) -> bool:
        """Check if this tax is effective on the given date"""
        from datetime import date as date_module
        check_date = date or date_module.today()
        
        if check_date < self.effective_from:
            return False
        
        if self.effective_until and check_date > self.effective_until:
            return False
        
        return True
    
    def calculate_amount(self, base_amount: Decimal) -> Decimal:
        """Calculate tax amount for given base amount"""
        return (base_amount * self.rate) / Decimal('100')
```

### 3. ServiceCharge

```python
class ServiceCharge(models.Model):
    """
    Configurable service charges (e.g., payment gateway fees, processing fees)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Charge identification
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    
    # Charge details
    charge_type = models.CharField(
        max_length=20,
        choices=[
            ('PERCENTAGE', 'Percentage of amount'),
            ('FIXED', 'Fixed amount'),
        ]
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="For PERCENTAGE: rate as percentage (e.g., 2.00 for 2%). For FIXED: absolute amount."
    )
    currency = models.CharField(max_length=3, default='GHS')
    
    # Application
    applies_to = models.CharField(
        max_length=20,
        choices=[
            ('SUBTOTAL', 'Subtotal (before tax)'),
            ('TOTAL', 'Total (after tax)'),
        ],
        default='SUBTOTAL'
    )
    payment_gateway = models.CharField(
        max_length=20,
        choices=[
            ('ALL', 'All gateways'),
            ('PAYSTACK', 'Paystack only'),
            ('STRIPE', 'Stripe only'),
            ('MOMO', 'Mobile Money only'),
        ],
        default='ALL',
        help_text="Which payment gateways this charge applies to"
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_service_charges'
    )
    
    class Meta:
        db_table = 'service_charge'
        ordering = ['name']
    
    def __str__(self):
        if self.charge_type == 'PERCENTAGE':
            return f"{self.name}: {self.amount}%"
        return f"{self.name}: {self.currency} {self.amount}"
    
    def calculate_amount(self, base_amount: Decimal) -> Decimal:
        """Calculate service charge amount"""
        if self.charge_type == 'PERCENTAGE':
            return (base_amount * self.amount) / Decimal('100')
        return self.amount
```

### 4. Enhanced SubscriptionPayment Model

```python
# Add these fields to existing SubscriptionPayment model

class SubscriptionPayment(models.Model):
    # ... existing fields ...
    
    # NEW FIELDS - Pricing breakdown
    base_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Base subscription price before taxes and charges"
    )
    storefront_count = models.IntegerField(
        default=1,
        help_text="Number of storefronts at time of payment"
    )
    pricing_tier_snapshot = models.JSONField(
        default=dict,
        help_text="Snapshot of pricing tier configuration used for this payment"
    )
    
    # Tax breakdown
    tax_breakdown = models.JSONField(
        default=dict,
        help_text="""
        Tax breakdown: {
            "VAT": {"rate": 15.00, "amount": "27.00"},
            "NHIL": {"rate": 2.50, "amount": "4.50"}
        }
        """
    )
    total_tax_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    # Service charges
    service_charges_breakdown = models.JSONField(
        default=dict,
        help_text="""
        Service charges: {
            "payment_gateway": {"type": "PERCENTAGE", "rate": 2.00, "amount": "3.60"}
        }
        """
    )
    total_service_charges = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    # Payment attempt tracking
    attempt_number = models.IntegerField(
        default=1,
        help_text="Number of this payment attempt (1 for first attempt)"
    )
    previous_attempt = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='retry_attempts',
        help_text="Link to previous failed attempt if this is a retry"
    )
    
    # Failure tracking
    failure_reason = models.TextField(
        blank=True,
        help_text="Human-readable failure reason"
    )
    gateway_error_code = models.CharField(
        max_length=50,
        blank=True,
        help_text="Error code from payment gateway"
    )
    gateway_error_message = models.TextField(
        blank=True,
        help_text="Error message from payment gateway"
    )
    
    # Status history
    status_history = models.JSONField(
        default=list,
        help_text="""
        Payment status history: [
            {"status": "PENDING", "timestamp": "2024-01-01T10:00:00Z"},
            {"status": "FAILED", "timestamp": "2024-01-01T10:05:00Z", "reason": "..."}
        ]
        """
    )
    
    def save(self, *args, **kwargs):
        # Add current status to history
        if not self.status_history:
            self.status_history = []
        
        from django.utils import timezone
        self.status_history.append({
            'status': self.status,
            'timestamp': timezone.now().isoformat(),
            'reason': self.failure_reason or self.notes
        })
        
        super().save(*args, **kwargs)
```

---

## Serializers

### File: `subscriptions/serializers.py`

```python
from rest_framework import serializers
from .models import SubscriptionPricingTier, TaxConfiguration, ServiceCharge, SubscriptionPayment

class SubscriptionPricingTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPricingTier
        fields = [
            'id', 'min_storefronts', 'max_storefronts',
            'base_price', 'price_per_additional_storefront', 'currency',
            'is_active', 'description', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class TaxConfigurationSerializer(serializers.ModelSerializer):
    is_effective_now = serializers.SerializerMethodField()
    
    class Meta:
        model = TaxConfiguration
        fields = [
            'id', 'name', 'code', 'description', 'rate', 'country',
            'applies_to_subscriptions', 'is_mandatory', 'calculation_order',
            'applies_to', 'is_active', 'effective_from', 'effective_until',
            'is_effective_now', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_is_effective_now(self, obj):
        return obj.is_effective()

class ServiceChargeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCharge
        fields = [
            'id', 'name', 'code', 'description', 'charge_type', 'amount',
            'currency', 'applies_to', 'payment_gateway', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class EnhancedSubscriptionPaymentSerializer(serializers.ModelSerializer):
    """Enhanced serializer with full pricing breakdown"""
    subscription_plan_name = serializers.CharField(source='subscription.plan.name', read_only=True)
    subscription_business_name = serializers.CharField(source='subscription.business.name', read_only=True)
    
    class Meta:
        model = SubscriptionPayment
        fields = [
            'id', 'subscription', 'subscription_plan_name', 'subscription_business_name',
            'amount', 'currency', 'payment_method', 'status',
            'transaction_id', 'transaction_reference', 'gateway_reference', 'gateway_response',
            'payment_date', 'billing_period_start', 'billing_period_end',
            # Enhanced fields
            'base_amount', 'storefront_count', 'pricing_tier_snapshot',
            'tax_breakdown', 'total_tax_amount',
            'service_charges_breakdown', 'total_service_charges',
            'attempt_number', 'previous_attempt', 'failure_reason',
            'gateway_error_code', 'gateway_error_message', 'status_history',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
```

---

## API Endpoints

### 1. Pricing Tier Management

**ViewSet:** `subscriptions/views.py`

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from decimal import Decimal
from datetime import date

class SubscriptionPricingTierViewSet(viewsets.ModelViewSet):
    """
    API endpoints for managing subscription pricing tiers.
    
    Permissions:
    - List/Retrieve: Any authenticated user
    - Create/Update/Delete: Platform admins only (SUPER_ADMIN, ADMIN)
    """
    queryset = SubscriptionPricingTier.objects.all()
    serializer_class = SubscriptionPricingTierSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset
    
    def get_permissions(self):
        # Only platform admins can create/update/delete
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            from .permissions import IsPlatformAdmin
            return [IsPlatformAdmin()]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a pricing tier"""
        tier = self.get_object()
        tier.is_active = True
        tier.save()
        return Response(
            SubscriptionPricingTierSerializer(tier).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a pricing tier"""
        tier = self.get_object()
        tier.is_active = False
        tier.save()
        return Response(
            SubscriptionPricingTierSerializer(tier).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['get'])
    def calculate(self, request):
        """
        Calculate pricing for a given number of storefronts.
        
        Query params:
        - storefronts: Number of storefronts (required)
        - include_taxes: Include tax calculation (default: true)
        - include_charges: Include service charges (default: true)
        - gateway: Payment gateway for gateway-specific charges (optional)
        
        Returns detailed pricing breakdown.
        """
        try:
            storefront_count = int(request.query_params.get('storefronts', 0))
            if storefront_count < 1:
                return Response(
                    {'error': 'Storefronts must be at least 1'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid storefronts parameter'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find applicable pricing tier
        tier = SubscriptionPricingTier.objects.filter(
            is_active=True,
            min_storefronts__lte=storefront_count
        ).filter(
            Q(max_storefronts__gte=storefront_count) | Q(max_storefronts__isnull=True)
        ).first()
        
        if not tier:
            return Response(
                {'error': f'No pricing tier found for {storefront_count} storefronts'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Calculate base price
        base_price = tier.calculate_price(storefront_count)
        additional_storefronts = max(0, storefront_count - tier.min_storefronts)
        additional_cost = additional_storefronts * tier.price_per_additional_storefront
        
        # Tax calculation
        include_taxes = request.query_params.get('include_taxes', 'true').lower() == 'true'
        taxes = {}
        total_tax = Decimal('0.00')
        
        if include_taxes:
            active_taxes = TaxConfiguration.objects.filter(
                is_active=True,
                applies_to_subscriptions=True,
                effective_from__lte=date.today()
            ).filter(
                Q(effective_until__gte=date.today()) | Q(effective_until__isnull=True)
            ).order_by('calculation_order')
            
            current_base = base_price
            for tax in active_taxes:
                tax_amount = tax.calculate_amount(
                    current_base if tax.applies_to == 'SUBTOTAL' else (base_price + total_tax)
                )
                taxes[tax.code] = {
                    'name': tax.name,
                    'rate': float(tax.rate),
                    'amount': str(tax_amount)
                }
                total_tax += tax_amount
        
        # Service charges calculation
        include_charges = request.query_params.get('include_charges', 'true').lower() == 'true'
        service_charges = {}
        total_charges = Decimal('0.00')
        
        if include_charges:
            gateway = request.query_params.get('gateway', 'ALL')
            active_charges = ServiceCharge.objects.filter(
                is_active=True
            ).filter(
                Q(payment_gateway='ALL') | Q(payment_gateway=gateway)
            )
            
            for charge in active_charges:
                charge_base = base_price if charge.applies_to == 'SUBTOTAL' else (base_price + total_tax)
                charge_amount = charge.calculate_amount(charge_base)
                service_charges[charge.code] = {
                    'name': charge.name,
                    'type': charge.charge_type,
                    'rate': float(charge.amount) if charge.charge_type == 'PERCENTAGE' else None,
                    'amount': str(charge_amount)
                }
                total_charges += charge_amount
        
        # Total calculation
        total_amount = base_price + total_tax + total_charges
        
        # Build breakdown text
        breakdown = [
            f"Pricing Tier: {tier}",
            f"Base Price ({tier.min_storefronts} storefronts): {tier.currency} {tier.base_price}",
        ]
        
        if additional_storefronts > 0:
            breakdown.append(
                f"Additional {additional_storefronts} storefronts @ {tier.currency} {tier.price_per_additional_storefront}: {tier.currency} {additional_cost}"
            )
        
        breakdown.append(f"Subtotal: {tier.currency} {base_price}")
        
        for code, tax_info in taxes.items():
            breakdown.append(f"{tax_info['name']} ({tax_info['rate']}%): {tier.currency} {tax_info['amount']}")
        
        for code, charge_info in service_charges.items():
            if charge_info['type'] == 'PERCENTAGE':
                breakdown.append(f"{charge_info['name']} ({charge_info['rate']}%): {tier.currency} {charge_info['amount']}")
            else:
                breakdown.append(f"{charge_info['name']}: {tier.currency} {charge_info['amount']}")
        
        breakdown.append(f"Total: {tier.currency} {total_amount}")
        
        return Response({
            'storefronts': storefront_count,
            'tier': SubscriptionPricingTierSerializer(tier).data,
            'base_price': str(base_price),
            'additional_storefronts': additional_storefronts,
            'additional_cost': str(additional_cost),
            'subtotal': str(base_price),
            'taxes': taxes,
            'total_tax': str(total_tax),
            'service_charges': service_charges,
            'total_service_charges': str(total_charges),
            'total_amount': str(total_amount),
            'currency': tier.currency,
            'breakdown': breakdown
        })
```

### 2. Tax Configuration Management

```python
class TaxConfigurationViewSet(viewsets.ModelViewSet):
    """
    API endpoints for managing tax configurations.
    
    Permissions:
    - List/Retrieve: Any authenticated user
    - Create/Update/Delete: Platform admins only
    """
    queryset = TaxConfiguration.objects.all()
    serializer_class = TaxConfigurationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by country
        country = self.request.query_params.get('country')
        if country:
            queryset = queryset.filter(country=country.upper())
        
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            from .permissions import IsPlatformAdmin
            return [IsPlatformAdmin()]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all currently active taxes"""
        active_taxes = TaxConfiguration.objects.filter(
            is_active=True,
            effective_from__lte=date.today()
        ).filter(
            Q(effective_until__gte=date.today()) | Q(effective_until__isnull=True)
        )
        
        serializer = self.get_serializer(active_taxes, many=True)
        return Response(serializer.data)
```

### 3. Service Charge Management

```python
class ServiceChargeViewSet(viewsets.ModelViewSet):
    """API endpoints for managing service charges"""
    queryset = ServiceCharge.objects.all()
    serializer_class = ServiceChargeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        gateway = self.request.query_params.get('gateway')
        if gateway:
            queryset = queryset.filter(
                Q(payment_gateway='ALL') | Q(payment_gateway=gateway.upper())
            )
        
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            from .permissions import IsPlatformAdmin
            return [IsPlatformAdmin()]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
```

### 4. Payment Stats & Analytics

```python
from django.db.models import Count, Sum, Q, Avg
from django.db.models.functions import TruncMonth, TruncWeek, TruncDay

class PaymentStatsViewSet(viewsets.ViewSet):
    """Analytics endpoints for payment data"""
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def overview(self, request):
        """
        Get overall payment statistics.
        
        Returns:
        - Total payments processed
        - Success/failure counts and rates
        - Revenue metrics
        - Failure reason analysis
        """
        # Only platform admins can see all payments
        from .permissions import IsPlatformAdmin
        if not IsPlatformAdmin().has_permission(request, self):
            # Regular users see only their business payments
            payments = SubscriptionPayment.objects.filter(
                subscription__business__businessuser__user=request.user
            )
        else:
            payments = SubscriptionPayment.objects.all()
        
        # Apply date filters
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            payments = payments.filter(created_at__gte=date_from)
        if date_to:
            payments = payments.filter(created_at__lte=date_to)
        
        # Calculate stats
        total_count = payments.count()
        successful = payments.filter(status='SUCCESSFUL').count()
        failed = payments.filter(status='FAILED').count()
        pending = payments.filter(status='PENDING').count()
        
        success_rate = (successful / total_count * 100) if total_count > 0 else 0
        
        # Revenue
        total_revenue = payments.filter(status='SUCCESSFUL').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        total_tax = payments.filter(status='SUCCESSFUL').aggregate(
            total=Sum('total_tax_amount')
        )['total'] or Decimal('0.00')
        
        # Failure reasons
        failure_reasons = {}
        failed_payments = payments.filter(status='FAILED')
        for payment in failed_payments:
            reason = payment.failure_reason or 'Unknown'
            failure_reasons[reason] = failure_reasons.get(reason, 0) + 1
        
        return Response({
            'payments': {
                'total_processed': total_count,
                'successful': successful,
                'failed': failed,
                'pending': pending,
                'success_rate': round(success_rate, 2)
            },
            'revenue': {
                'total_revenue': str(total_revenue),
                'total_tax_collected': str(total_tax),
                'average_payment': str(total_revenue / successful) if successful > 0 else '0.00'
            },
            'failure_analysis': failure_reasons
        })
    
    @action(detail=False, methods=['get'])
    def revenue_chart(self, request):
        """
        Get revenue data for charts.
        
        Query params:
        - period: DAILY, WEEKLY, MONTHLY (default: MONTHLY)
        - date_from: Start date
        - date_to: End date
        """
        period = request.query_params.get('period', 'MONTHLY')
        
        payments = SubscriptionPayment.objects.filter(status='SUCCESSFUL')
        
        # Apply date filters
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            payments = payments.filter(payment_date__gte=date_from)
        if date_to:
            payments = payments.filter(payment_date__lte=date_to)
        
        # Group by period
        if period == 'DAILY':
            trunc_func = TruncDay
        elif period == 'WEEKLY':
            trunc_func = TruncWeek
        else:  # MONTHLY
            trunc_func = TruncMonth
        
        revenue_data = payments.annotate(
            period=trunc_func('payment_date')
        ).values('period').annotate(
            revenue=Sum('amount'),
            tax=Sum('total_tax_amount'),
            count=Count('id')
        ).order_by('period')
        
        labels = []
        revenue_values = []
        tax_values = []
        
        for item in revenue_data:
            labels.append(item['period'].strftime('%Y-%m-%d'))
            revenue_values.append(float(item['revenue']))
            tax_values.append(float(item['tax']))
        
        return Response({
            'labels': labels,
            'datasets': [
                {
                    'label': 'Revenue',
                    'data': revenue_values
                },
                {
                    'label': 'Taxes',
                    'data': tax_values
                }
            ]
        })
```

---

## URL Configuration

**File:** `subscriptions/urls.py`

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

---

## Permissions

**File:** `subscriptions/permissions.py`

```python
from rest_framework.permissions import BasePermission

class IsPlatformAdmin(BasePermission):
    """
    Permission check for platform administrators.
    Allows SUPER_ADMIN and ADMIN roles.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if user has platform_role attribute
        platform_role = getattr(request.user, 'platform_role', None)
        
        return platform_role in ['SUPER_ADMIN', 'ADMIN']

class IsSuperAdmin(BasePermission):
    """
    Permission check for super administrators only.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        platform_role = getattr(request.user, 'platform_role', None)
        return platform_role == 'SUPER_ADMIN'
```

---

## Migration Script

**File:** `subscriptions/management/commands/setup_default_pricing.py`

```python
from django.core.management.base import BaseCommand
from subscriptions.models import SubscriptionPricingTier, TaxConfiguration
from decimal import Decimal
from datetime import date

class Command(BaseCommand):
    help = 'Set up default pricing tiers and tax configurations for Ghana'
    
    def handle(self, *args, **options):
        self.stdout.write('Setting up default pricing tiers...')
        
        # Create pricing tiers
        tiers = [
            (1, 1, Decimal('100.00'), Decimal('0.00')),
            (2, 2, Decimal('150.00'), Decimal('0.00')),
            (3, 3, Decimal('180.00'), Decimal('0.00')),
            (4, 4, Decimal('200.00'), Decimal('0.00')),
            (5, None, Decimal('200.00'), Decimal('50.00')),  # 5+ storefronts
        ]
        
        for min_sf, max_sf, base, additional in tiers:
            tier, created = SubscriptionPricingTier.objects.get_or_create(
                min_storefronts=min_sf,
                max_storefronts=max_sf,
                defaults={
                    'base_price': base,
                    'price_per_additional_storefront': additional,
                    'currency': 'GHS',
                    'is_active': True,
                    'description': f'Tier for {min_sf}{"-" + str(max_sf) if max_sf else "+"} storefronts'
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Created tier: {tier}'))
            else:
                self.stdout.write(f'  Tier already exists: {tier}')
        
        self.stdout.write('\nSetting up Ghana tax configurations...')
        
        # Create tax configurations
        taxes = [
            ('VAT', 'VAT_GH', 'Value Added Tax', Decimal('15.00')),
            ('NHIL', 'NHIL_GH', 'National Health Insurance Levy', Decimal('2.50')),
            ('GETFund Levy', 'GETFUND_GH', 'Ghana Education Trust Fund Levy', Decimal('2.50')),
            ('COVID-19 Health Recovery Levy', 'COVID19_GH', 'COVID-19 Health Recovery Levy', Decimal('1.00')),
        ]
        
        for order, (name, code, desc, rate) in enumerate(taxes):
            tax, created = TaxConfiguration.objects.get_or_create(
                code=code,
                defaults={
                    'name': name,
                    'description': desc,
                    'rate': rate,
                    'country': 'GH',
                    'applies_to_subscriptions': True,
                    'is_mandatory': True,
                    'calculation_order': order,
                    'applies_to': 'SUBTOTAL',
                    'is_active': True,
                    'effective_from': date.today()
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Created tax: {tax}'))
            else:
                self.stdout.write(f'  Tax already exists: {tax}')
        
        self.stdout.write(self.style.SUCCESS('\n✅ Setup complete!'))
```

**Run with:**
```bash
python manage.py setup_default_pricing
```

---

## Testing

### Unit Tests

**File:** `subscriptions/tests/test_pricing.py`

```python
from django.test import TestCase
from decimal import Decimal
from subscriptions.models import SubscriptionPricingTier, TaxConfiguration
from datetime import date

class PricingTierTestCase(TestCase):
    def setUp(self):
        # Create test pricing tiers
        self.tier_1 = SubscriptionPricingTier.objects.create(
            min_storefronts=1,
            max_storefronts=1,
            base_price=Decimal('100.00'),
            currency='GHS'
        )
        
        self.tier_5_plus = SubscriptionPricingTier.objects.create(
            min_storefronts=5,
            max_storefronts=None,
            base_price=Decimal('200.00'),
            price_per_additional_storefront=Decimal('50.00'),
            currency='GHS'
        )
    
    def test_tier_applies_to_count(self):
        """Test if tier correctly identifies applicable storefront counts"""
        self.assertTrue(self.tier_1.applies_to_storefront_count(1))
        self.assertFalse(self.tier_1.applies_to_storefront_count(2))
        
        self.assertTrue(self.tier_5_plus.applies_to_storefront_count(5))
        self.assertTrue(self.tier_5_plus.applies_to_storefront_count(10))
    
    def test_price_calculation(self):
        """Test price calculation for different storefront counts"""
        # 1 storefront
        self.assertEqual(self.tier_1.calculate_price(1), Decimal('100.00'))
        
        # 5 storefronts
        self.assertEqual(self.tier_5_plus.calculate_price(5), Decimal('200.00'))
        
        # 7 storefronts (5 base + 2 additional @ 50 each)
        self.assertEqual(self.tier_5_plus.calculate_price(7), Decimal('300.00'))
        
        # 10 storefronts (5 base + 5 additional @ 50 each)
        self.assertEqual(self.tier_5_plus.calculate_price(10), Decimal('450.00'))
```

### API Tests

**File:** `subscriptions/tests/test_api.py`

```python
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from subscriptions.models import SubscriptionPricingTier

User = get_user_model()

class PricingTierAPITestCase(APITestCase):
    def setUp(self):
        # Create platform admin user
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            platform_role='SUPER_ADMIN'
        )
        
        # Create regular user
        self.regular_user = User.objects.create_user(
            email='user@example.com',
            password='testpass123'
        )
        
        # Create pricing tier
        self.tier = SubscriptionPricingTier.objects.create(
            min_storefronts=1,
            max_storefronts=1,
            base_price='100.00',
            currency='GHS'
        )
    
    def test_list_pricing_tiers(self):
        """Any authenticated user can list pricing tiers"""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/subscriptions/api/pricing-tiers/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_calculate_pricing(self):
        """Test pricing calculation endpoint"""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/subscriptions/api/pricing-tiers/calculate/?storefronts=1')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['base_price'], '100.00')
    
    def test_create_tier_requires_admin(self):
        """Only platform admins can create pricing tiers"""
        # Regular user should be denied
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post('/subscriptions/api/pricing-tiers/', {
            'min_storefronts': 2,
            'max_storefronts': 2,
            'base_price': '150.00',
            'currency': 'GHS'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Admin should succeed
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post('/subscriptions/api/pricing-tiers/', {
            'min_storefronts': 2,
            'max_storefronts': 2,
            'base_price': '150.00',
            'currency': 'GHS'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
```

---

## Deployment Checklist

- [ ] Run migrations: `python manage.py migrate`
- [ ] Set up default pricing: `python manage.py setup_default_pricing`
- [ ] Create platform admin user with `platform_role='SUPER_ADMIN'`
- [ ] Test pricing calculation endpoint
- [ ] Test payment creation with new fields
- [ ] Verify tax calculations for Ghana
- [ ] Test payment stats endpoints
- [ ] Set up monitoring for payment failures
- [ ] Configure payment gateway webhook handlers to populate new fields

---

## Notes for Backend Team

1. **User Model:** Ensure `User` model has `platform_role` field:
   ```python
   platform_role = models.CharField(
       max_length=20,
       choices=[
           ('SUPER_ADMIN', 'Super Administrator'),
           ('ADMIN', 'Administrator'),
           ('SUPPORT', 'Support Staff'),
       ],
       null=True,
       blank=True
   )
   ```

2. **Payment Creation:** When creating `SubscriptionPayment`, calculate and populate:
   - `base_amount`
   - `storefront_count`
   - `pricing_tier_snapshot`
   - `tax_breakdown`
   - `service_charges_breakdown`

3. **Status History:** Automatically updated on save() - no manual intervention needed.

4. **Webhooks:** Update payment webhook handlers to extract error codes/messages from gateway responses.

5. **Performance:** Add database indexes on frequently queried fields (already included in models).

---

**END OF BACKEND API SPECIFICATION**
