# 📋 Subscription Management System - Complete Implementation Plan

**Date**: October 14, 2025  
**Status**: Planning Phase  
**Priority**: High (Core Business Feature)

---

## 🎯 Executive Summary

### Business Model
- **Target**: Business owners using the POS platform
- **Billing**: Monthly subscription basis
- **Payment Gateways**: Paystack (Mobile Money) + Stripe (Cards)
- **Pricing Control**: Platform owner/authorized employees set pricing
- **Management**: Platform-level subscription oversight and alerts

### Current State ✅
- Basic subscription types defined (`src/types/subscriptions.ts`)
- Redux slice for subscription state (`subscriptionSlice.ts`)
- Basic API service layer (`subscriptionService.ts`)
- Subscription status badge in UI

### What Needs Building 🔨
1. Complete backend API (Django/DRF)
2. Payment gateway integrations (Paystack + Stripe)
3. Platform admin subscription management UI
4. Business owner subscription portal
5. Automated billing & renewal system
6. Alert & notification system
7. Subscription gates/middleware
8. Analytics & reporting

---

## 📊 System Architecture

### Three User Levels

#### 1. Platform Owner/Admins
**Capabilities**:
- Set subscription pricing & plans
- View all business subscriptions
- Suspend/activate subscriptions manually
- Send alerts to business owners
- View payment history & analytics
- Configure payment gateways
- Generate revenue reports

#### 2. Business Owners (Subscribers)
**Capabilities**:
- View their subscription status
- Upgrade/downgrade plans
- Make payments (Paystack/Stripe)
- View payment history
- Update payment methods
- Receive renewal notifications
- Auto-renewal settings

#### 3. Business Employees
**Capabilities**:
- View subscription status (read-only)
- Notified when subscription expires
- Limited access if subscription inactive

---

## 🏗️ Backend Architecture (Django/DRF)

### Database Models

```python
# subscriptions/models.py

from django.db import models
from django.contrib.auth import get_user_model
from decimal import Decimal
import uuid

User = get_user_model()

class SubscriptionPlan(models.Model):
    """Plans that platform owner creates"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)  # "Basic", "Premium", "Enterprise"
    description = models.TextField(blank=True)
    
    # Pricing
    price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='GHS')  # GHS, USD, etc.
    billing_cycle = models.CharField(
        max_length=20,
        choices=[
            ('MONTHLY', 'Monthly'),
            ('QUARTERLY', 'Quarterly'),
            ('ANNUALLY', 'Annually'),
        ],
        default='MONTHLY'
    )
    
    # Features (JSON field for flexibility)
    max_storefronts = models.IntegerField(default=1)
    max_products = models.IntegerField(null=True, blank=True)  # null = unlimited
    max_employees = models.IntegerField(default=5)
    features = models.JSONField(default=dict)  # {"sms_alerts": true, "reports": true}
    
    # Status
    is_active = models.BooleanField(default=True)
    is_visible = models.BooleanField(default=True)  # Show in pricing page
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_plans')
    
    class Meta:
        ordering = ['price']
    
    def __str__(self):
        return f"{self.name} - {self.currency} {self.price}/{self.billing_cycle}"


class Subscription(models.Model):
    """Business subscription instance"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relationships
    business = models.OneToOneField('business.Business', on_delete=models.CASCADE, related_name='subscription')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT)
    
    # Status
    STATUS_CHOICES = [
        ('TRIAL', 'Trial'),  # Initial trial period
        ('ACTIVE', 'Active'),  # Paid and active
        ('PAST_DUE', 'Past Due'),  # Payment failed but grace period
        ('SUSPENDED', 'Suspended'),  # Manually suspended by platform
        ('CANCELLED', 'Cancelled'),  # Business cancelled
        ('EXPIRED', 'Expired'),  # Not renewed after grace period
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='TRIAL')
    
    # Billing periods
    current_period_start = models.DateTimeField()
    current_period_end = models.DateTimeField()
    trial_end = models.DateTimeField(null=True, blank=True)
    
    # Renewal
    auto_renew = models.BooleanField(default=True)
    cancel_at_period_end = models.BooleanField(default=False)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    
    # Grace period (days to pay after expiry)
    grace_period_days = models.IntegerField(default=3)
    
    # Metadata
    notes = models.TextField(blank=True)  # Admin notes
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.business.name} - {self.plan.name} ({self.status})"
    
    @property
    def is_active(self):
        return self.status in ['TRIAL', 'ACTIVE']
    
    @property
    def days_until_renewal(self):
        from django.utils import timezone
        if self.current_period_end:
            delta = self.current_period_end - timezone.now()
            return delta.days
        return 0


class SubscriptionPayment(models.Model):
    """Payment transactions for subscriptions"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relationships
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='payments')
    business = models.ForeignKey('business.Business', on_delete=models.CASCADE)
    
    # Payment details
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='GHS')
    
    # Gateway
    GATEWAY_CHOICES = [
        ('PAYSTACK', 'Paystack'),
        ('STRIPE', 'Stripe'),
        ('MANUAL', 'Manual'),  # Platform admin manual payment
    ]
    payment_gateway = models.CharField(max_length=20, choices=GATEWAY_CHOICES)
    
    # Status
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('REFUNDED', 'Refunded'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    # Gateway references
    transaction_reference = models.CharField(max_length=255, unique=True)
    gateway_response = models.JSONField(default=dict)  # Raw response from gateway
    
    # Billing period this payment covers
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    
    # Metadata
    payment_method = models.CharField(max_length=50, blank=True)  # "Mobile Money", "Card"
    customer_email = models.EmailField()
    customer_phone = models.CharField(max_length=20, blank=True)
    
    # Timestamps
    initiated_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.TextField(blank=True)
    
    # Admin
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-initiated_at']
    
    def __str__(self):
        return f"{self.business.name} - {self.currency} {self.amount} ({self.status})"


class SubscriptionAlert(models.Model):
    """Alerts sent to business owners"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Target
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='alerts')
    business = models.ForeignKey('business.Business', on_delete=models.CASCADE)
    
    # Alert details
    ALERT_TYPE_CHOICES = [
        ('RENEWAL_REMINDER', 'Renewal Reminder'),
        ('PAYMENT_FAILED', 'Payment Failed'),
        ('SUBSCRIPTION_EXPIRED', 'Subscription Expired'),
        ('GRACE_PERIOD', 'Grace Period Warning'),
        ('SUSPENDED', 'Account Suspended'),
        ('PLAN_CHANGE', 'Plan Change'),
        ('CUSTOM', 'Custom Alert'),
    ]
    alert_type = models.CharField(max_length=30, choices=ALERT_TYPE_CHOICES)
    
    title = models.CharField(max_length=255)
    message = models.TextField()
    
    # Delivery
    sent_via_email = models.BooleanField(default=True)
    sent_via_sms = models.BooleanField(default=False)
    sent_via_in_app = models.BooleanField(default=True)
    
    # Status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.alert_type} - {self.business.name}"


class PaymentGatewayConfig(models.Model):
    """Platform-level gateway configuration"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    GATEWAY_CHOICES = [
        ('PAYSTACK', 'Paystack'),
        ('STRIPE', 'Stripe'),
    ]
    gateway = models.CharField(max_length=20, choices=GATEWAY_CHOICES, unique=True)
    
    # Credentials (encrypted in production)
    public_key = models.CharField(max_length=255)
    secret_key = models.CharField(max_length=255)
    webhook_secret = models.CharField(max_length=255, blank=True)
    
    # Settings
    is_active = models.BooleanField(default=True)
    is_test_mode = models.BooleanField(default=False)
    
    # Supported features
    supports_mobile_money = models.BooleanField(default=False)
    supports_cards = models.BooleanField(default=False)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        mode = "TEST" if self.is_test_mode else "LIVE"
        return f"{self.gateway} ({mode})"
```

---

## 🔌 API Endpoints

### For Platform Admins

```python
# Platform Admin Endpoints
GET    /api/platform/subscriptions/              # List all subscriptions
GET    /api/platform/subscriptions/:id/          # View specific subscription
PATCH  /api/platform/subscriptions/:id/          # Update subscription (suspend, etc.)
POST   /api/platform/subscriptions/:id/suspend/  # Suspend subscription
POST   /api/platform/subscriptions/:id/activate/ # Activate subscription

GET    /api/platform/plans/                       # List all plans
POST   /api/platform/plans/                       # Create plan
PATCH  /api/platform/plans/:id/                   # Update plan pricing/features
DELETE /api/platform/plans/:id/                   # Deactivate plan

GET    /api/platform/payments/                    # All payments across platform
GET    /api/platform/payments/stats/              # Revenue analytics

POST   /api/platform/alerts/                      # Send custom alert to business
GET    /api/platform/alerts/                      # View sent alerts

GET    /api/platform/gateways/                    # Gateway configurations
PATCH  /api/platform/gateways/:gateway/           # Update gateway config
```

### For Business Owners

```python
# Business Owner Endpoints
GET    /api/subscriptions/me/                     # My subscription details
PATCH  /api/subscriptions/me/                     # Update auto-renew, etc.
POST   /api/subscriptions/me/upgrade/             # Upgrade plan
POST   /api/subscriptions/me/downgrade/           # Downgrade plan
POST   /api/subscriptions/me/cancel/              # Cancel subscription

GET    /api/subscriptions/plans/                  # Available plans
GET    /api/subscriptions/payments/               # My payment history
POST   /api/subscriptions/payments/initiate/      # Start payment process

GET    /api/subscriptions/alerts/                 # My alerts
PATCH  /api/subscriptions/alerts/:id/read/        # Mark alert as read

# Webhook endpoints (for payment gateways)
POST   /api/webhooks/paystack/                    # Paystack webhook
POST   /api/webhooks/stripe/                      # Stripe webhook
```

---

## 💳 Payment Gateway Integration

### Paystack Integration (Mobile Money + Cards)

```python
# subscriptions/payment_gateways/paystack.py

import requests
from django.conf import settings
from typing import Dict, Any

class PaystackGateway:
    """Paystack payment gateway integration"""
    
    BASE_URL = "https://api.paystack.co"
    
    def __init__(self, secret_key: str):
        self.secret_key = secret_key
        self.headers = {
            "Authorization": f"Bearer {secret_key}",
            "Content-Type": "application/json"
        }
    
    def initialize_transaction(
        self,
        email: str,
        amount: Decimal,
        currency: str = "GHS",
        reference: str = None,
        callback_url: str = None,
        metadata: Dict = None
    ) -> Dict[str, Any]:
        """
        Initialize a payment transaction
        Amount should be in smallest currency unit (pesewas for GHS)
        """
        url = f"{self.BASE_URL}/transaction/initialize"
        
        # Convert to pesewas (multiply by 100)
        amount_in_pesewas = int(amount * 100)
        
        payload = {
            "email": email,
            "amount": amount_in_pesewas,
            "currency": currency,
            "reference": reference,
            "callback_url": callback_url,
            "metadata": metadata or {}
        }
        
        response = requests.post(url, json=payload, headers=self.headers)
        response.raise_for_status()
        
        return response.json()
    
    def verify_transaction(self, reference: str) -> Dict[str, Any]:
        """Verify a transaction"""
        url = f"{self.BASE_URL}/transaction/verify/{reference}"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def charge_mobile_money(
        self,
        phone: str,
        amount: Decimal,
        currency: str = "GHS",
        reference: str = None,
        provider: str = "mtn"  # mtn, vodafone, airteltigo
    ) -> Dict[str, Any]:
        """
        Charge via mobile money
        Providers: mtn, vodafone, airteltigo
        """
        url = f"{self.BASE_URL}/charge"
        
        amount_in_pesewas = int(amount * 100)
        
        payload = {
            "phone": phone,
            "amount": amount_in_pesewas,
            "currency": currency,
            "reference": reference,
            "mobile_money": {
                "phone": phone,
                "provider": provider
            }
        }
        
        response = requests.post(url, json=payload, headers=self.headers)
        response.raise_for_status()
        
        return response.json()


# Usage example
def initiate_subscription_payment(subscription: Subscription, payment_method: str):
    """Initiate subscription payment via Paystack"""
    from subscriptions.models import SubscriptionPayment, PaymentGatewayConfig
    import uuid
    
    # Get Paystack config
    gateway_config = PaymentGatewayConfig.objects.get(gateway='PAYSTACK', is_active=True)
    paystack = PaystackGateway(gateway_config.secret_key)
    
    # Create payment record
    payment = SubscriptionPayment.objects.create(
        subscription=subscription,
        business=subscription.business,
        amount=subscription.plan.price,
        currency=subscription.plan.currency,
        payment_gateway='PAYSTACK',
        status='PENDING',
        transaction_reference=f"SUB-{uuid.uuid4().hex[:12].upper()}",
        period_start=subscription.current_period_end,
        period_end=subscription.current_period_end + timedelta(days=30),
        customer_email=subscription.business.owner.email,
    )
    
    # Initialize transaction
    response = paystack.initialize_transaction(
        email=subscription.business.owner.email,
        amount=subscription.plan.price,
        currency=subscription.plan.currency,
        reference=payment.transaction_reference,
        callback_url=f"{settings.FRONTEND_URL}/subscriptions/payment/callback",
        metadata={
            "subscription_id": str(subscription.id),
            "business_name": subscription.business.name,
            "plan_name": subscription.plan.name
        }
    )
    
    # Store gateway response
    payment.gateway_response = response
    payment.save()
    
    return {
        "payment_id": payment.id,
        "authorization_url": response['data']['authorization_url'],
        "access_code": response['data']['access_code'],
        "reference": payment.transaction_reference
    }
```

### Stripe Integration (International Cards)

```python
# subscriptions/payment_gateways/stripe_gateway.py

import stripe
from django.conf import settings
from typing import Dict, Any

class StripeGateway:
    """Stripe payment gateway integration"""
    
    def __init__(self, secret_key: str):
        stripe.api_key = secret_key
    
    def create_payment_intent(
        self,
        amount: Decimal,
        currency: str = "usd",
        customer_email: str = None,
        metadata: Dict = None
    ) -> stripe.PaymentIntent:
        """
        Create a payment intent
        Amount should be in smallest currency unit (cents for USD)
        """
        amount_in_cents = int(amount * 100)
        
        intent = stripe.PaymentIntent.create(
            amount=amount_in_cents,
            currency=currency.lower(),
            receipt_email=customer_email,
            metadata=metadata or {},
            automatic_payment_methods={"enabled": True}
        )
        
        return intent
    
    def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        trial_period_days: int = None
    ) -> stripe.Subscription:
        """Create a Stripe subscription (recurring)"""
        subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{"price": price_id}],
            trial_period_days=trial_period_days,
            payment_behavior="default_incomplete",
            expand=["latest_invoice.payment_intent"]
        )
        
        return subscription
    
    def retrieve_payment_intent(self, payment_intent_id: str) -> stripe.PaymentIntent:
        """Retrieve payment intent details"""
        return stripe.PaymentIntent.retrieve(payment_intent_id)
    
    def create_customer(
        self,
        email: str,
        name: str,
        metadata: Dict = None
    ) -> stripe.Customer:
        """Create a Stripe customer"""
        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata=metadata or {}
        )
        
        return customer


# Usage example
def create_stripe_subscription_payment(subscription: Subscription):
    """Create subscription payment via Stripe"""
    from subscriptions.models import PaymentGatewayConfig
    
    gateway_config = PaymentGatewayConfig.objects.get(gateway='STRIPE', is_active=True)
    stripe_gateway = StripeGateway(gateway_config.secret_key)
    
    # Create or get Stripe customer
    if not subscription.business.stripe_customer_id:
        customer = stripe_gateway.create_customer(
            email=subscription.business.owner.email,
            name=subscription.business.name,
            metadata={
                "business_id": str(subscription.business.id),
                "subscription_id": str(subscription.id)
            }
        )
        subscription.business.stripe_customer_id = customer.id
        subscription.business.save()
    
    # Create payment intent
    intent = stripe_gateway.create_payment_intent(
        amount=subscription.plan.price,
        currency=subscription.plan.currency,
        customer_email=subscription.business.owner.email,
        metadata={
            "subscription_id": str(subscription.id),
            "business_name": subscription.business.name,
            "plan_name": subscription.plan.name
        }
    )
    
    return {
        "client_secret": intent.client_secret,
        "payment_intent_id": intent.id
    }
```

---

## 🎨 Frontend Implementation

### 1. Enhanced TypeScript Types

```typescript
// src/types/subscriptions.ts

import type { UUID } from './common'

export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY'

export type SubscriptionStatus = 
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'EXPIRED'

export type PaymentGateway = 'PAYSTACK' | 'STRIPE' | 'MANUAL'

export type PaymentStatus = 
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED'

export interface SubscriptionPlan {
  id: UUID
  name: string
  description: string
  price: number
  currency: string
  billing_cycle: BillingCycle
  
  // Features
  max_storefronts: number
  max_products: number | null  // null = unlimited
  max_employees: number
  features: {
    sms_alerts?: boolean
    advanced_reports?: boolean
    api_access?: boolean
    priority_support?: boolean
    [key: string]: boolean | undefined
  }
  
  is_active: boolean
  is_visible: boolean
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: UUID
  business: UUID
  business_name: string
  plan: UUID
  plan_details: SubscriptionPlan
  
  status: SubscriptionStatus
  
  current_period_start: string
  current_period_end: string
  trial_end: string | null
  
  auto_renew: boolean
  cancel_at_period_end: boolean
  cancelled_at: string | null
  
  grace_period_days: number
  days_until_renewal: number
  is_active: boolean
  
  notes: string
  created_at: string
  updated_at: string
}

export interface SubscriptionPayment {
  id: UUID
  subscription: UUID
  business: UUID
  business_name: string
  
  amount: number
  currency: string
  
  payment_gateway: PaymentGateway
  status: PaymentStatus
  
  transaction_reference: string
  gateway_response: Record<string, unknown>
  
  period_start: string
  period_end: string
  
  payment_method: string
  customer_email: string
  customer_phone: string
  
  initiated_at: string
  completed_at: string | null
  failed_at: string | null
  failure_reason: string
  
  notes: string
}

export interface SubscriptionAlert {
  id: UUID
  subscription: UUID
  business: UUID
  
  alert_type: 
    | 'RENEWAL_REMINDER'
    | 'PAYMENT_FAILED'
    | 'SUBSCRIPTION_EXPIRED'
    | 'GRACE_PERIOD'
    | 'SUSPENDED'
    | 'PLAN_CHANGE'
    | 'CUSTOM'
  
  title: string
  message: string
  
  sent_via_email: boolean
  sent_via_sms: boolean
  sent_via_in_app: boolean
  
  is_read: boolean
  read_at: string | null
  
  created_at: string
  created_by: UUID | null
}

export interface PaymentInitiationResponse {
  payment_id: UUID
  authorization_url?: string  // Paystack
  access_code?: string  // Paystack
  client_secret?: string  // Stripe
  reference: string
}

export interface PaystackCallbackParams {
  reference: string
  trxref: string
  status: string
}
```

### 2. Enhanced Redux Slice

```typescript
// src/store/slices/subscriptionSlice.ts

import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { toUserFacingError } from '../../utils/errorMessage'
import * as subscriptionService from '../../services/subscriptionService'
import type { 
  Subscription, 
  SubscriptionPlan, 
  SubscriptionPayment,
  SubscriptionAlert,
  PaymentInitiationResponse 
} from '../../types/subscriptions'
import type { RootState } from '../index'

interface SubscriptionState {
  // Current business subscription
  activeSubscription: Subscription | null
  
  // Available plans
  plans: SubscriptionPlan[]
  plansStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  
  // Payment history
  payments: SubscriptionPayment[]
  paymentsStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  
  // Alerts
  alerts: SubscriptionAlert[]
  unreadAlertsCount: number
  
  // UI state
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
  gateMessage: string | null
  isGateVisible: boolean
  
  // Payment processing
  currentPayment: PaymentInitiationResponse | null
  paymentStatus: 'idle' | 'processing' | 'succeeded' | 'failed'
}

const initialState: SubscriptionState = {
  activeSubscription: null,
  plans: [],
  plansStatus: 'idle',
  payments: [],
  paymentsStatus: 'idle',
  alerts: [],
  unreadAlertsCount: 0,
  status: 'idle',
  error: null,
  gateMessage: null,
  isGateVisible: false,
  currentPayment: null,
  paymentStatus: 'idle',
}

// Async thunks
export const loadActiveSubscription = createAsyncThunk(
  'subscription/loadActive',
  async (_, { rejectWithValue }) => {
    try {
      return await subscriptionService.fetchMySubscription()
    } catch (error) {
      return rejectWithValue(toUserFacingError(error))
    }
  }
)

export const loadPlans = createAsyncThunk(
  'subscription/loadPlans',
  async (_, { rejectWithValue }) => {
    try {
      const response = await subscriptionService.fetchPlans()
      return response.results
    } catch (error) {
      return rejectWithValue(toUserFacingError(error))
    }
  }
)

export const loadPaymentHistory = createAsyncThunk(
  'subscription/loadPayments',
  async (_, { rejectWithValue }) => {
    try {
      const response = await subscriptionService.fetchMyPayments()
      return response.results
    } catch (error) {
      return rejectWithValue(toUserFacingError(error))
    }
  }
)

export const loadAlerts = createAsyncThunk(
  'subscription/loadAlerts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await subscriptionService.fetchMyAlerts()
      return response.results
    } catch (error) {
      return rejectWithValue(toUserFacingError(error))
    }
  }
)

export const initiatePayment = createAsyncThunk(
  'subscription/initiatePayment',
  async (gateway: 'PAYSTACK' | 'STRIPE', { rejectWithValue }) => {
    try {
      return await subscriptionService.initiatePayment(gateway)
    } catch (error) {
      return rejectWithValue(toUserFacingError(error))
    }
  }
)

export const upgradePlan = createAsyncThunk(
  'subscription/upgrade',
  async (planId: string, { rejectWithValue }) => {
    try {
      return await subscriptionService.upgradePlan(planId)
    } catch (error) {
      return rejectWithValue(toUserFacingError(error))
    }
  }
)

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    hideSubscriptionGate: (state) => {
      state.isGateVisible = false
      state.gateMessage = null
    },
    showSubscriptionGate: (state, action: PayloadAction<string | null>) => {
      state.isGateVisible = true
      state.gateMessage = action.payload ?? 'Subscription required to continue.'
    },
    markAlertAsRead: (state, action: PayloadAction<string>) => {
      const alert = state.alerts.find(a => a.id === action.payload)
      if (alert && !alert.is_read) {
        alert.is_read = true
        alert.read_at = new Date().toISOString()
        state.unreadAlertsCount = Math.max(0, state.unreadAlertsCount - 1)
      }
    },
    clearPaymentState: (state) => {
      state.currentPayment = null
      state.paymentStatus = 'idle'
    },
  },
  extraReducers: (builder) => {
    // Load subscription
    builder
      .addCase(loadActiveSubscription.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(loadActiveSubscription.fulfilled, (state, action) => {
        state.activeSubscription = action.payload
        state.status = 'succeeded'
        
        // Hide gate if subscription is active
        if (action.payload?.is_active) {
          state.isGateVisible = false
        }
      })
      .addCase(loadActiveSubscription.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload as string
      })
    
    // Load plans
    builder
      .addCase(loadPlans.pending, (state) => {
        state.plansStatus = 'loading'
      })
      .addCase(loadPlans.fulfilled, (state, action) => {
        state.plans = action.payload
        state.plansStatus = 'succeeded'
      })
      .addCase(loadPlans.rejected, (state) => {
        state.plansStatus = 'failed'
      })
    
    // Load payments
    builder
      .addCase(loadPaymentHistory.pending, (state) => {
        state.paymentsStatus = 'loading'
      })
      .addCase(loadPaymentHistory.fulfilled, (state, action) => {
        state.payments = action.payload
        state.paymentsStatus = 'succeeded'
      })
    
    // Load alerts
    builder
      .addCase(loadAlerts.fulfilled, (state, action) => {
        state.alerts = action.payload
        state.unreadAlertsCount = action.payload.filter(a => !a.is_read).length
      })
    
    // Initiate payment
    builder
      .addCase(initiatePayment.pending, (state) => {
        state.paymentStatus = 'processing'
      })
      .addCase(initiatePayment.fulfilled, (state, action) => {
        state.currentPayment = action.payload
        state.paymentStatus = 'succeeded'
      })
      .addCase(initiatePayment.rejected, (state) => {
        state.paymentStatus = 'failed'
      })
  },
})

export const { 
  hideSubscriptionGate, 
  showSubscriptionGate,
  markAlertAsRead,
  clearPaymentState
} = subscriptionSlice.actions

// Selectors
export const selectSubscriptionState = (state: RootState) => state.subscription
export const selectActiveSubscription = (state: RootState) => state.subscription.activeSubscription
export const selectPlans = (state: RootState) => state.subscription.plans
export const selectPayments = (state: RootState) => state.subscription.payments
export const selectAlerts = (state: RootState) => state.subscription.alerts
export const selectUnreadAlertsCount = (state: RootState) => state.subscription.unreadAlertsCount
export const selectIsSubscriptionActive = (state: RootState) => 
  state.subscription.activeSubscription?.is_active ?? false
export const selectDaysUntilRenewal = (state: RootState) =>
  state.subscription.activeSubscription?.days_until_renewal ?? 0

export default subscriptionSlice.reducer
```

### 3. Enhanced API Service

```typescript
// src/services/subscriptionService.ts

import httpClient from './httpClient'
import type { PaginatedResponse } from '../types/common'
import type { 
  Plan, 
  Subscription, 
  SubscriptionPayment,
  SubscriptionAlert,
  PaymentInitiationResponse
} from '../types/subscriptions'

// Plans
export const fetchPlans = async () => {
  const { data } = await httpClient.get<PaginatedResponse<Plan>>(
    '/subscriptions/api/plans/'
  )
  return data
}

// Business owner subscription
export const fetchMySubscription = async () => {
  const { data } = await httpClient.get<Subscription>(
    '/subscriptions/api/me/'
  )
  return data
}

export const updateMySubscription = async (updates: Partial<Subscription>) => {
  const { data } = await httpClient.patch<Subscription>(
    '/subscriptions/api/me/',
    updates
  )
  return data
}

export const upgradePlan = async (planId: string) => {
  const { data } = await httpClient.post<Subscription>(
    '/subscriptions/api/me/upgrade/',
    { plan_id: planId }
  )
  return data
}

export const cancelSubscription = async () => {
  const { data } = await httpClient.post<Subscription>(
    '/subscriptions/api/me/cancel/'
  )
  return data
}

// Payments
export const fetchMyPayments = async () => {
  const { data } = await httpClient.get<PaginatedResponse<SubscriptionPayment>>(
    '/subscriptions/api/payments/'
  )
  return data
}

export const initiatePayment = async (gateway: 'PAYSTACK' | 'STRIPE') => {
  const { data } = await httpClient.post<PaymentInitiationResponse>(
    '/subscriptions/api/payments/initiate/',
    { payment_gateway: gateway }
  )
  return data
}

export const verifyPayment = async (reference: string) => {
  const { data } = await httpClient.post<SubscriptionPayment>(
    '/subscriptions/api/payments/verify/',
    { reference }
  )
  return data
}

// Alerts
export const fetchMyAlerts = async () => {
  const { data } = await httpClient.get<PaginatedResponse<SubscriptionAlert>>(
    '/subscriptions/api/alerts/'
  )
  return data
}

export const markAlertRead = async (alertId: string) => {
  const { data} = await httpClient.patch<SubscriptionAlert>(
    `/subscriptions/api/alerts/${alertId}/read/`
  )
  return data
}

// Platform admin endpoints
export const fetchAllSubscriptions = async (params?: Record<string, unknown>) => {
  const { data } = await httpClient.get<PaginatedResponse<Subscription>>(
    '/api/platform/subscriptions/',
    { params }
  )
  return data
}

export const suspendSubscription = async (subscriptionId: string) => {
  const { data } = await httpClient.post<Subscription>(
    `/api/platform/subscriptions/${subscriptionId}/suspend/`
  )
  return data
}

export const sendCustomAlert = async (
  subscriptionId: string,
  title: string,
  message: string
) => {
  const { data } = await httpClient.post<SubscriptionAlert>(
    '/api/platform/alerts/',
    {
      subscription: subscriptionId,
      alert_type: 'CUSTOM',
      title,
      message
    }
  )
  return data
}
```

---

## 📱 UI Components

### Business Owner Subscription Portal

```tsx
// src/features/subscriptions/pages/SubscriptionPortal.tsx

import { useEffect, useState } from 'react'
import { Container, Row, Col, Card, Button, Badge, Alert } from 'react-bootstrap'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import {
  loadActiveSubscription,
  loadPlans,
  loadPaymentHistory,
  loadAlerts,
  selectActiveSubscription,
  selectPlans,
  selectPayments,
  selectDaysUntilRenewal
} from '../../../store/slices/subscriptionSlice'
import { PlanCard } from '../components/PlanCard'
import { PaymentHistoryTable } from '../components/PaymentHistoryTable'
import { AlertsList } from '../components/AlertsList'

export default function SubscriptionPortal() {
  const dispatch = useAppDispatch()
  const subscription = useAppSelector(selectActiveSubscription)
  const plans = useAppSelector(selectPlans)
  const payments = useAppSelector(selectPayments)
  const daysUntilRenewal = useAppSelector(selectDaysUntilRenewal)
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  
  useEffect(() => {
    void dispatch(loadActiveSubscription())
    void dispatch(loadPlans())
    void dispatch(loadPaymentHistory())
    void dispatch(loadAlerts())
  }, [dispatch])
  
  const getStatusBadge = () => {
    if (!subscription) return null
    
    const variants: Record<string, string> = {
      TRIAL: 'info',
      ACTIVE: 'success',
      PAST_DUE: 'warning',
      SUSPENDED: 'danger',
      CANCELLED: 'secondary',
      EXPIRED: 'danger'
    }
    
    return (
      <Badge bg={variants[subscription.status] || 'secondary'}>
        {subscription.status}
      </Badge>
    )
  }
  
  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>Subscription Management</h2>
        </Col>
      </Row>
      
      {/* Current Subscription Overview */}
      <Row className="mb-4">
        <Col lg={8}>
          <Card>
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Current Subscription</h5>
                {getStatusBadge()}
              </div>
            </Card.Header>
            <Card.Body>
              {subscription ? (
                <>
                  <Row>
                    <Col md={6}>
                      <h4>{subscription.plan_details.name}</h4>
                      <p className="text-muted">
                        {subscription.plan_details.currency} {subscription.plan_details.price} / {subscription.plan_details.billing_cycle}
                      </p>
                    </Col>
                    <Col md={6}>
                      <div className="text-end">
                        <p className="mb-1">
                          <small className="text-muted">Renewal in</small><br />
                          <strong className="fs-4">{daysUntilRenewal} days</strong>
                        </p>
                        <p className="small text-muted">
                          Renews on {new Date(subscription.current_period_end).toLocaleDateString()}
                        </p>
                      </div>
                    </Col>
                  </Row>
                  
                  {daysUntilRenewal <= 7 && subscription.status === 'ACTIVE' && (
                    <Alert variant="warning" className="mt-3">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      Your subscription renews in {daysUntilRenewal} days. Ensure your payment method is up to date.
                    </Alert>
                  )}
                  
                  {subscription.status === 'PAST_DUE' && (
                    <Alert variant="danger" className="mt-3">
                      <i className="bi bi-exclamation-circle me-2"></i>
                      Payment failed. Please update your payment to avoid service interruption.
                      <div className="mt-2">
                        <Button variant="danger" size="sm">Pay Now</Button>
                      </div>
                    </Alert>
                  )}
                  
                  <hr />
                  
                  <Row className="mt-3">
                    <Col>
                      <h6>Plan Features</h6>
                      <ul>
                        <li>Max Storefronts: {subscription.plan_details.max_storefronts}</li>
                        <li>Max Products: {subscription.plan_details.max_products || 'Unlimited'}</li>
                        <li>Max Employees: {subscription.plan_details.max_employees}</li>
                        {subscription.plan_details.features.advanced_reports && (
                          <li>✓ Advanced Reports</li>
                        )}
                        {subscription.plan_details.features.sms_alerts && (
                          <li>✓ SMS Alerts</li>
                        )}
                        {subscription.plan_details.features.api_access && (
                          <li>✓ API Access</li>
                        )}
                      </ul>
                    </Col>
                  </Row>
                  
                  <div className="mt-3 d-flex gap-2">
                    <Button variant="primary" onClick={() => setShowUpgradeModal(true)}>
                      Upgrade Plan
                    </Button>
                    {subscription.auto_renew ? (
                      <Button variant="outline-secondary">
                        Disable Auto-Renew
                      </Button>
                    ) : (
                      <Button variant="outline-success">
                        Enable Auto-Renew
                      </Button>
                    )}
                    <Button variant="outline-danger">Cancel Subscription</Button>
                  </div>
                </>
              ) : (
                <p className="text-muted">Loading subscription details...</p>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={4}>
          <AlertsList />
        </Col>
      </Row>
      
      {/* Available Plans */}
      <Row className="mb-4">
        <Col>
          <h4>Available Plans</h4>
          <Row className="g-3">
            {plans.map(plan => (
              <Col key={plan.id} md={6} lg={4}>
                <PlanCard
                  plan={plan}
                  isCurrent={subscription?.plan === plan.id}
                  onUpgrade={() => {/* handle upgrade */}}
                />
              </Col>
            ))}
          </Row>
        </Col>
      </Row>
      
      {/* Payment History */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Payment History</h5>
            </Card.Header>
            <Card.Body>
              <PaymentHistoryTable payments={payments} />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}
```

### Platform Admin Subscription Dashboard

```tsx
// src/features/platform/pages/SubscriptionsDashboard.tsx

import { useEffect, useState } from 'react'
import { Container, Row, Col, Card, Table, Button, Badge, Form } from 'react-bootstrap'
import { fetchAllSubscriptions, suspendSubscription } from '../../../services/subscriptionService'
import type { Subscription } from '../../../types/subscriptions'

export default function SubscriptionsDashboard() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  
  useEffect(() => {
    loadSubscriptions()
  }, [filterStatus])
  
  const loadSubscriptions = async () => {
    setLoading(true)
    try {
      const params = filterStatus !== 'all' ? { status: filterStatus } : {}
      const response = await fetchAllSubscriptions(params)
      setSubscriptions(response.results)
    } finally {
      setLoading(false)
    }
  }
  
  const handleSuspend = async (subscriptionId: string) => {
    if (confirm('Are you sure you want to suspend this subscription?')) {
      await suspendSubscription(subscriptionId)
      await loadSubscriptions()
    }
  }
  
  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>Platform Subscriptions</h2>
        </Col>
      </Row>
      
      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card>
            <Card.Body>
              <h6 className="text-muted">Total Subscriptions</h6>
              <h3>{subscriptions.length}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card>
            <Card.Body>
              <h6 className="text-muted">Active</h6>
              <h3 className="text-success">
                {subscriptions.filter(s => s.status === 'ACTIVE').length}
              </h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card>
            <Card.Body>
              <h6 className="text-muted">Past Due</h6>
              <h3 className="text-warning">
                {subscriptions.filter(s => s.status === 'PAST_DUE').length}
              </h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card>
            <Card.Body>
              <h6 className="text-muted">Suspended</h6>
              <h3 className="text-danger">
                {subscriptions.filter(s => s.status === 'SUSPENDED').length}
              </h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Subscriptions Table */}
      <Card>
        <Card.Header className="d-flex justify-content-between">
          <h5 className="mb-0">All Subscriptions</h5>
          <Form.Select 
            style={{ width: '200px' }} 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="TRIAL">Trial</option>
            <option value="ACTIVE">Active</option>
            <option value="PAST_DUE">Past Due</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="EXPIRED">Expired</option>
          </Form.Select>
        </Card.Header>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Business</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Renewal Date</th>
                <th>Days Left</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map(sub => (
                <tr key={sub.id}>
                  <td>{sub.business_name}</td>
                  <td>{sub.plan_details.name}</td>
                  <td>
                    <Badge bg={
                      sub.status === 'ACTIVE' ? 'success' :
                      sub.status === 'PAST_DUE' ? 'warning' :
                      sub.status === 'SUSPENDED' ? 'danger' :
                      'secondary'
                    }>
                      {sub.status}
                    </Badge>
                  </td>
                  <td>{new Date(sub.current_period_end).toLocaleDateString()}</td>
                  <td>
                    <span className={sub.days_until_renewal <= 3 ? 'text-danger fw-bold' : ''}>
                      {sub.days_until_renewal} days
                    </span>
                  </td>
                  <td>
                    <Button 
                      size="sm" 
                      variant="outline-primary" 
                      className="me-2"
                    >
                      View
                    </Button>
                    {sub.status !== 'SUSPENDED' && (
                      <Button 
                        size="sm" 
                        variant="outline-danger"
                        onClick={() => handleSuspend(sub.id)}
                      >
                        Suspend
                      </Button>
                    )}
                    {sub.status === 'SUSPENDED' && (
                      <Button 
                        size="sm" 
                        variant="outline-success"
                      >
                        Activate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  )
}
```

---

## ⚙️ Automated Jobs & Background Tasks

### Django Celery Tasks

```python
# subscriptions/tasks.py

from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.core.mail import send_mail
from .models import Subscription, SubscriptionAlert

@shared_task
def check_subscription_renewals():
    """Check for upcoming renewals and send reminders"""
    today = timezone.now()
    
    # 7 days before renewal
    seven_days = today + timedelta(days=7)
    subscriptions_7day = Subscription.objects.filter(
        status='ACTIVE',
        current_period_end__date=seven_days.date()
    )
    
    for sub in subscriptions_7day:
        SubscriptionAlert.objects.create(
            subscription=sub,
            business=sub.business,
            alert_type='RENEWAL_REMINDER',
            title='Subscription Renewal in 7 Days',
            message=f'Your {sub.plan.name} subscription will renew on {sub.current_period_end.strftime("%B %d, %Y")}.',
            sent_via_email=True,
            sent_via_in_app=True
        )
        
        # Send email
        send_mail(
            subject='Subscription Renewal Reminder',
            message=f'Hi {sub.business.owner.first_name},\n\nYour subscription will renew in 7 days.',
            from_email='noreply@possuite.com',
            recipient_list=[sub.business.owner.email]
        )

@shared_task
def expire_subscriptions():
    """Mark expired subscriptions"""
    today = timezone.now()
    
    expired_subs = Subscription.objects.filter(
        status__in=['ACTIVE', 'PAST_DUE'],
        current_period_end__lt=today - timedelta(days=3)  # After grace period
    )
    
    for sub in expired_subs:
        sub.status = 'EXPIRED'
        sub.save()
        
        SubscriptionAlert.objects.create(
            subscription=sub,
            business=sub.business,
            alert_type='SUBSCRIPTION_EXPIRED',
            title='Subscription Expired',
            message='Your subscription has expired. Please renew to continue using the service.',
            sent_via_email=True,
            sent_via_sms=True,
            sent_via_in_app=True
        )

@shared_task
def auto_renew_subscriptions():
    """Process auto-renewals for subscriptions"""
    today = timezone.now()
    
    subs_to_renew = Subscription.objects.filter(
        status='ACTIVE',
        auto_renew=True,
        current_period_end__date=today.date()
    )
    
    for sub in subs_to_renew:
        # Initiate payment through saved payment method
        # This would integrate with Paystack/Stripe
        pass  # Implementation depends on gateway
```

---

## 📈 Implementation Timeline

### Phase 1: Backend Foundation (2 weeks)
**Week 1**:
- [ ] Database models & migrations
- [ ] Basic CRUD APIs (plans, subscriptions)
- [ ] Authentication & permissions

**Week 2**:
- [ ] Payment gateway integration (Paystack)
- [ ] Payment gateway integration (Stripe)
- [ ] Webhook handlers

### Phase 2: Core Features (2 weeks)
**Week 3**:
- [ ] Subscription lifecycle management
- [ ] Auto-renewal system
- [ ] Alert system & notifications
- [ ] Celery background tasks

**Week 4**:
- [ ] Platform admin dashboard API
- [ ] Analytics & reporting endpoints
- [ ] Testing & bug fixes

### Phase 3: Frontend (2 weeks)
**Week 5**:
- [ ] Enhanced Redux state management
- [ ] Business owner subscription portal
- [ ] Payment integration UI (Paystack/Stripe)
- [ ] Subscription gate middleware

**Week 6**:
- [ ] Platform admin dashboard UI
- [ ] Analytics dashboard
- [ ] Testing & refinements

### Phase 4: Polish & Deploy (1 week)
**Week 7**:
- [ ] End-to-end testing
- [ ] Security audit
- [ ] Performance optimization
- [ ] Documentation
- [ ] Staging deployment
- [ ] Production deployment

---

## 🔒 Security Considerations

1. **API Keys**: Store Paystack/Stripe keys in environment variables
2. **Webhooks**: Validate webhook signatures
3. **Payment Data**: Never store full card details
4. **Access Control**: Platform admins only for pricing/suspension
5. **Audit Logging**: Track all subscription changes
6. **Rate Limiting**: Prevent payment spam

---

## 📊 Success Metrics

1. **Conversion Rate**: Trial to paid subscriptions
2. **Churn Rate**: Monthly cancellations
3. **Payment Success Rate**: Successful payments vs failures
4. **MRR (Monthly Recurring Revenue)**: Total monthly revenue
5. **Customer Lifetime Value**: Average revenue per business
6. **Renewal Rate**: Percentage of auto-renewals

---

**Status**: 📋 Planning Complete  
**Next Step**: Backend Implementation  
**Estimated Total Time**: 7 weeks  
**Priority**: High (Revenue-Critical)
