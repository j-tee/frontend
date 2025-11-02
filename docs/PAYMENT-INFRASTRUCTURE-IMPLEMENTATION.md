# Payment Infrastructure Implementation Guide

## 🎯 Architecture Philosophy: Backend-First

**Key Principle:** All payment logic, calculations, and business rules live on the backend. The frontend is a thin client that displays data and triggers backend operations.

---

## 📋 Overview

This guide provides the complete implementation plan for the payment infrastructure with clear separation of concerns:

- **Backend**: All pricing calculations, tax computations, payment processing, Paystack integration
- **Frontend**: Display pricing, collect user input, trigger backend endpoints, show results

---

## 🏗️ Backend Responsibilities (Priority)

### 1. Paystack Integration Service

**File: `backend/subscriptions/payment_gateways/paystack.py`**

```python
"""
Paystack payment gateway integration for POS subscription system.
Uses shared ALPHALOGIQUE TECHNOLOGIES account with app_name routing.
"""

import requests
from django.conf import settings
from typing import Dict, Any
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

class PaystackGateway:
    """
    Paystack integration for subscription payments.
    
    Configuration in settings.py:
    - PAYSTACK_SECRET_KEY: sk_test_16b164b455153a23804423ec0198476b3c4ca206
    - PAYSTACK_PUBLIC_KEY: pk_test_5309f5af38555dbf7ef47287822ef2c6d3019b9d
    - PAYSTACK_APP_NAME: "pos"
    """
    
    BASE_URL = "https://api.paystack.co"
    
    def __init__(self):
        self.secret_key = settings.PAYSTACK_SECRET_KEY
        self.public_key = settings.PAYSTACK_PUBLIC_KEY
        self.app_name = settings.PAYSTACK_APP_NAME  # "pos"
        self.headers = {
            "Authorization": f"Bearer {self.secret_key}",
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
        Initialize a payment transaction.
        
        Args:
            email: Customer email
            amount: Amount in main currency unit (e.g., 100.00 GHS)
            currency: Currency code (default: GHS)
            reference: Unique transaction reference
            callback_url: URL to redirect after payment
            metadata: Additional data (will include app_name automatically)
        
        Returns:
            {
                "status": true,
                "message": "Authorization URL created",
                "data": {
                    "authorization_url": "https://checkout.paystack.com/...",
                    "access_code": "...",
                    "reference": "..."
                }
            }
        """
        url = f"{self.BASE_URL}/transaction/initialize"
        
        # Convert to pesewas (multiply by 100)
        amount_in_pesewas = int(amount * 100)
        
        # Ensure metadata includes app_name for webhook routing
        if metadata is None:
            metadata = {}
        
        metadata['app_name'] = self.app_name  # Critical for multi-app routing
        
        payload = {
            "email": email,
            "amount": amount_in_pesewas,
            "currency": currency,
            "reference": reference,
            "callback_url": callback_url,
            "metadata": metadata
        }
        
        try:
            response = requests.post(url, json=payload, headers=self.headers)
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"Paystack transaction initialized: {reference}")
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Paystack initialization failed: {str(e)}")
            raise Exception(f"Payment initialization failed: {str(e)}")
    
    def verify_transaction(self, reference: str) -> Dict[str, Any]:
        """
        Verify a transaction.
        
        Args:
            reference: Transaction reference
        
        Returns:
            {
                "status": true,
                "message": "Verification successful",
                "data": {
                    "status": "success",
                    "amount": 10000,
                    "currency": "GHS",
                    "customer": {...},
                    "metadata": {...}
                }
            }
        """
        url = f"{self.BASE_URL}/transaction/verify/{reference}"
        
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"Paystack transaction verified: {reference}")
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Paystack verification failed: {str(e)}")
            raise Exception(f"Payment verification failed: {str(e)}")
```

### 2. Backend Constants Configuration

**File: `backend/subscriptions/constants.py`**

```python
"""
Subscription system constants.
These should match environment variables in production.
"""

# Paystack Configuration
PAYSTACK_APP_NAME = "pos"  # Used in metadata for multi-app routing
PAYSTACK_SECRET_KEY = "sk_test_16b164b455153a23804423ec0198476b3c4ca206"
PAYSTACK_PUBLIC_KEY = "pk_test_5309f5af38555dbf7ef47287822ef2c6d3019b9d"

# Payment Configuration
DEFAULT_CURRENCY = "GHS"
PAYMENT_CALLBACK_BASE_URL = "https://pos.alphalogiquetechnologies.com"

# Pricing Defaults
DEFAULT_MIN_STOREFRONT = 1
DEFAULT_MAX_STOREFRONT = 4
```

**File: `backend/config/settings.py` (add these)**

```python
# Paystack Configuration
PAYSTACK_SECRET_KEY = os.getenv(
    'PAYSTACK_SECRET_KEY',
    'sk_test_16b164b455153a23804423ec0198476b3c4ca206'
)
PAYSTACK_PUBLIC_KEY = os.getenv(
    'PAYSTACK_PUBLIC_KEY', 
    'pk_test_5309f5af38555dbf7ef47287822ef2c6d3019b9d'
)
PAYSTACK_APP_NAME = os.getenv('PAYSTACK_APP_NAME', 'pos')

# Frontend URL (for callbacks)
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
```

### 3. Pricing Calculation Endpoint

**Backend calculates EVERYTHING, frontend just displays**

**Endpoint: `GET /subscriptions/api/pricing/calculate/?storefronts=2`**

```python
# In subscriptions/views.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from decimal import Decimal
from .models import SubscriptionPricingTier, TaxConfiguration, ServiceCharge

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def calculate_subscription_pricing(request):
    """
    Calculate complete pricing breakdown for subscription.
    
    Frontend just calls this endpoint and displays the result.
    NO calculation logic on frontend.
    
    Query params:
    - storefronts: Number of storefronts (required)
    - gateway: Payment gateway (PAYSTACK, STRIPE, etc.) - optional
    
    Returns complete pricing with ALL taxes, fees, breakdowns
    """
    try:
        storefront_count = int(request.query_params.get('storefronts', 1))
        gateway = request.query_params.get('gateway', 'PAYSTACK')
    except ValueError:
        return Response(
            {'error': 'Invalid storefronts parameter'},
            status=400
        )
    
    # 1. Find applicable pricing tier
    tier = SubscriptionPricingTier.objects.filter(
        is_active=True,
        min_storefronts__lte=storefront_count
    ).filter(
        Q(max_storefronts__gte=storefront_count) | 
        Q(max_storefronts__isnull=True)
    ).first()
    
    if not tier:
        return Response(
            {'error': f'No pricing tier for {storefront_count} storefronts'},
            status=404
        )
    
    # 2. Calculate base price
    base_price = tier.calculate_price(storefront_count)
    
    # 3. Calculate taxes (Ghana VAT, NHIL, GETFund, COVID levy)
    taxes = []
    total_tax = Decimal('0.00')
    
    active_taxes = TaxConfiguration.objects.filter(
        is_active=True,
        applies_to_subscriptions=True,
        effective_from__lte=date.today()
    ).filter(
        Q(effective_until__gte=date.today()) | 
        Q(effective_until__isnull=True)
    ).order_by('calculation_order')
    
    for tax in active_taxes:
        tax_amount = tax.calculate_amount(base_price)
        taxes.append({
            'code': tax.code,
            'name': tax.name,
            'rate': float(tax.rate),
            'amount': str(tax_amount)
        })
        total_tax += tax_amount
    
    # 4. Calculate service charges (Paystack fees, etc.)
    charges = []
    total_charges = Decimal('0.00')
    
    active_charges = ServiceCharge.objects.filter(
        is_active=True
    ).filter(
        Q(payment_gateway='ALL') | Q(payment_gateway=gateway)
    )
    
    for charge in active_charges:
        charge_amount = charge.calculate_amount(base_price + total_tax)
        charges.append({
            'code': charge.code,
            'name': charge.name,
            'type': charge.charge_type,
            'rate': float(charge.amount) if charge.charge_type == 'PERCENTAGE' else None,
            'amount': str(charge_amount)
        })
        total_charges += charge_amount
    
    # 5. Calculate total
    total_amount = base_price + total_tax + total_charges
    
    # 6. Return complete breakdown
    return Response({
        'storefronts': storefront_count,
        'currency': tier.currency,
        'base_price': str(base_price),
        'taxes': taxes,
        'total_tax': str(total_tax),
        'service_charges': charges,
        'total_service_charges': str(total_charges),
        'total_amount': str(total_amount),
        'breakdown': {
            'tier_description': str(tier),
            'base_storefronts': tier.min_storefronts,
            'additional_storefronts': max(0, storefront_count - tier.min_storefronts),
            'price_per_additional': str(tier.price_per_additional_storefront)
        }
    })
```

### 4. Payment Initialization Endpoint

**Endpoint: `POST /subscriptions/api/subscriptions/{id}/initialize_payment/`**

```python
# In subscriptions/views.py

@action(detail=True, methods=['post'])
def initialize_payment(self, request, pk=None):
    """
    Initialize payment for subscription.
    
    Backend does ALL the work:
    1. Get subscription
    2. Calculate pricing with taxes
    3. Create payment record
    4. Initialize Paystack transaction
    5. Return payment URL
    
    Frontend just:
    1. Calls this endpoint
    2. Redirects to returned URL
    
    Request body:
    {
        "gateway": "PAYSTACK",  // or "STRIPE"
        "success_url": "https://pos.../payment/success",
        "cancel_url": "https://pos.../payment/cancelled"
    }
    
    Response:
    {
        "payment_id": "uuid",
        "authorization_url": "https://checkout.paystack.com/...",
        "reference": "SUB-ABC123",
        "amount": "121.00",
        "currency": "GHS"
    }
    """
    subscription = self.get_object()
    gateway = request.data.get('gateway', 'PAYSTACK')
    
    # 1. Get storefront count for this business
    storefront_count = subscription.business.storefronts.filter(
        is_active=True
    ).count()
    
    # 2. Calculate pricing (using same logic as calculate endpoint)
    pricing = calculate_pricing_internal(storefront_count, gateway)
    
    # 3. Create payment record
    from .models import SubscriptionPayment
    import uuid
    
    payment = SubscriptionPayment.objects.create(
        subscription=subscription,
        amount=pricing['total_amount'],
        currency=pricing['currency'],
        payment_method=gateway,
        status='PENDING',
        transaction_reference=f"SUB-{uuid.uuid4().hex[:12].upper()}",
        
        # Enhanced fields - ALL calculated by backend
        base_amount=pricing['base_price'],
        storefront_count=storefront_count,
        tax_breakdown=pricing['taxes'],
        total_tax_amount=pricing['total_tax'],
        service_charges_breakdown=pricing['service_charges'],
        total_service_charges=pricing['total_service_charges'],
        
        # Pricing tier snapshot
        pricing_tier_snapshot={
            'tier_id': str(pricing['tier_id']),
            'description': pricing['breakdown']['tier_description']
        }
    )
    
    # 4. Initialize payment with gateway
    if gateway == 'PAYSTACK':
        from .payment_gateways.paystack import PaystackGateway
        
        paystack = PaystackGateway()
        callback_url = f"{settings.FRONTEND_URL}/subscriptions/payment/callback"
        
        response = paystack.initialize_transaction(
            email=subscription.business.owner.email,
            amount=Decimal(pricing['total_amount']),
            currency=pricing['currency'],
            reference=payment.transaction_reference,
            callback_url=callback_url,
            metadata={
                'subscription_id': str(subscription.id),
                'business_id': str(subscription.business.id),
                'business_name': subscription.business.name,
                'payment_id': str(payment.id),
                'storefront_count': storefront_count
            }
        )
        
        # Store gateway response
        payment.gateway_response = response
        payment.save()
        
        return Response({
            'payment_id': str(payment.id),
            'authorization_url': response['data']['authorization_url'],
            'reference': payment.transaction_reference,
            'amount': str(payment.amount),
            'currency': payment.currency
        })
    
    else:
        return Response(
            {'error': f'{gateway} not yet implemented'},
            status=400
        )
```

### 5. Payment Verification Endpoint

**Endpoint: `POST /subscriptions/api/subscriptions/{id}/verify_payment/`**

```python
@action(detail=True, methods=['post'])
def verify_payment(self, request, pk=None):
    """
    Verify payment with Paystack.
    
    Backend does:
    1. Verify with Paystack API
    2. Update payment status
    3. Update subscription status
    4. Return result
    
    Frontend just:
    1. Calls this endpoint with reference
    2. Shows success/failure
    
    Request:
    {
        "reference": "SUB-ABC123",
        "gateway": "PAYSTACK"
    }
    
    Response:
    {
        "success": true,
        "message": "Payment verified successfully",
        "payment": {
            "id": "uuid",
            "amount": "121.00",
            "status": "SUCCESSFUL",
            "payment_date": "2024-11-02T10:30:00Z"
        },
        "subscription": {
            "status": "ACTIVE",
            "end_date": "2024-12-02"
        }
    }
    """
    subscription = self.get_object()
    reference = request.data.get('reference')
    gateway = request.data.get('gateway', 'PAYSTACK')
    
    if not reference:
        return Response(
            {'error': 'Reference is required'},
            status=400
        )
    
    # Find payment record
    try:
        payment = SubscriptionPayment.objects.get(
            subscription=subscription,
            transaction_reference=reference
        )
    except SubscriptionPayment.DoesNotExist:
        return Response(
            {'error': 'Payment not found'},
            status=404
        )
    
    # Verify with gateway
    if gateway == 'PAYSTACK':
        from .payment_gateways.paystack import PaystackGateway
        
        paystack = PaystackGateway()
        
        try:
            verification = paystack.verify_transaction(reference)
            
            if verification['data']['status'] == 'success':
                # Update payment
                payment.status = 'SUCCESSFUL'
                payment.payment_date = timezone.now()
                payment.gateway_response = verification
                payment.save()
                
                # Update subscription
                from datetime import timedelta
                subscription.status = 'ACTIVE'
                subscription.payment_status = 'PAID'
                subscription.end_date = timezone.now() + timedelta(days=30)
                subscription.save()
                
                return Response({
                    'success': True,
                    'message': 'Payment verified successfully',
                    'payment': {
                        'id': str(payment.id),
                        'amount': str(payment.amount),
                        'status': payment.status,
                        'payment_date': payment.payment_date.isoformat()
                    },
                    'subscription': {
                        'status': subscription.status,
                        'end_date': subscription.end_date.isoformat()
                    }
                })
            else:
                # Payment failed
                payment.status = 'FAILED'
                payment.failure_reason = verification['data'].get('gateway_response', 'Payment failed')
                payment.save()
                
                return Response({
                    'success': False,
                    'message': 'Payment verification failed',
                    'reason': payment.failure_reason
                }, status=400)
                
        except Exception as e:
            logger.error(f"Payment verification error: {str(e)}")
            return Response(
                {'error': 'Verification failed', 'details': str(e)},
                status=500
            )
```

### 6. Webhook Handler (for Paystack callbacks)

**Endpoint: `POST /subscriptions/api/webhooks/paystack/`**

```python
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
import hmac
import hashlib

@csrf_exempt
@api_view(['POST'])
@permission_classes([])  # No auth for webhooks
def paystack_webhook(request):
    """
    Handle Paystack webhook events.
    
    This is called directly by Paystack when payment status changes.
    Validates signature and processes events.
    """
    # Validate signature
    paystack_signature = request.headers.get('x-paystack-signature')
    
    if not paystack_signature:
        return HttpResponse(status=400)
    
    # Compute signature
    computed_signature = hmac.new(
        settings.PAYSTACK_SECRET_KEY.encode('utf-8'),
        request.body,
        hashlib.sha512
    ).hexdigest()
    
    if computed_signature != paystack_signature:
        logger.warning('Invalid Paystack webhook signature')
        return HttpResponse(status=400)
    
    # Parse event
    event = request.data
    event_type = event.get('event')
    
    # Check app_name to ensure this is for POS
    metadata = event.get('data', {}).get('metadata', {})
    app_name = metadata.get('app_name')
    
    if app_name != 'pos':
        # This event is for another app (school system, etc.)
        logger.info(f'Webhook for app {app_name}, skipping')
        return HttpResponse(status=200)
    
    # Process charge.success event
    if event_type == 'charge.success':
        reference = event['data']['reference']
        
        try:
            payment = SubscriptionPayment.objects.get(
                transaction_reference=reference
            )
            
            # Update payment
            payment.status = 'SUCCESSFUL'
            payment.payment_date = timezone.now()
            payment.gateway_response = event['data']
            payment.save()
            
            # Update subscription
            subscription = payment.subscription
            subscription.status = 'ACTIVE'
            subscription.payment_status = 'PAID'
            subscription.end_date = timezone.now() + timedelta(days=30)
            subscription.save()
            
            logger.info(f'Webhook processed: {reference}')
            
        except SubscriptionPayment.DoesNotExist:
            logger.error(f'Payment not found: {reference}')
    
    return HttpResponse(status=200)
```

---

## 🎨 Frontend Responsibilities (Lightweight)

### 1. Update TypeScript Types

**File: `src/types/subscriptions.ts`**

Add these interfaces to match backend responses:

```typescript
// Pricing calculation response
export interface PricingCalculation {
  storefronts: number
  currency: string
  base_price: string
  taxes: Array<{
    code: string
    name: string
    rate: number
    amount: string
  }>
  total_tax: string
  service_charges: Array<{
    code: string
    name: string
    type: 'PERCENTAGE' | 'FIXED'
    rate: number | null
    amount: string
  }>
  total_service_charges: string
  total_amount: string
  breakdown: {
    tier_description: string
    base_storefronts: number
    additional_storefronts: number
    price_per_additional: string
  }
}

// Payment initialization response
export interface PaymentInitResponse {
  payment_id: string
  authorization_url: string
  reference: string
  amount: string
  currency: string
}

// Payment verification response
export interface PaymentVerifyResponse {
  success: boolean
  message: string
  payment?: {
    id: string
    amount: string
    status: string
    payment_date: string
  }
  subscription?: {
    status: string
    end_date: string
  }
  reason?: string
}

// Enhanced SubscriptionPayment with backend fields
export interface EnhancedSubscriptionPayment extends SubscriptionPayment {
  base_amount: string
  storefront_count: number
  pricing_tier_snapshot: {
    tier_id: string
    description: string
  }
  tax_breakdown: Array<{
    code: string
    name: string
    rate: number
    amount: string
  }>
  total_tax_amount: string
  service_charges_breakdown: Array<{
    code: string
    name: string
    type: string
    rate: number | null
    amount: string
  }>
  total_service_charges: string
  attempt_number: number
  failure_reason?: string
  gateway_error_code?: string
  gateway_error_message?: string
  status_history: Array<{
    status: string
    timestamp: string
    reason?: string
  }>
}
```

### 2. Update Subscription Service

**File: `src/services/subscriptionService.ts`**

Add these simple API calls:

```typescript
// Calculate pricing (backend does ALL calculations)
export const calculatePricing = async (storefronts: number, gateway: string = 'PAYSTACK') => {
  const { data } = await httpClient.get<PricingCalculation>(
    '/subscriptions/api/pricing/calculate/',
    { params: { storefronts, gateway } }
  )
  return data
}

// Initialize payment (backend creates payment and gets Paystack URL)
export const initializeSubscriptionPayment = async (
  subscriptionId: string,
  gateway: string = 'PAYSTACK'
) => {
  const frontendUrl = window.location.origin
  const { data } = await httpClient.post<PaymentInitResponse>(
    `/subscriptions/api/subscriptions/${subscriptionId}/initialize_payment/`,
    {
      gateway,
      success_url: `${frontendUrl}/subscriptions/payment/success`,
      cancel_url: `${frontendUrl}/subscriptions/payment/cancelled`
    }
  )
  return data
}

// Verify payment (backend verifies with Paystack)
export const verifySubscriptionPayment = async (
  subscriptionId: string,
  reference: string,
  gateway: string = 'PAYSTACK'
) => {
  const { data } = await httpClient.post<PaymentVerifyResponse>(
    `/subscriptions/api/subscriptions/${subscriptionId}/verify_payment/`,
    { reference, gateway }
  )
  return data
}
```

### 3. Simple Pricing Display Component

**File: `src/features/subscriptions/components/PricingBreakdown.tsx`**

```typescript
import React, { useEffect, useState } from 'react'
import { Card, Table, Spinner, Alert } from 'react-bootstrap'
import { calculatePricing } from '../../../services/subscriptionService'
import type { PricingCalculation } from '../../../types/subscriptions'
import { useCurrency } from '../../../hooks/useCurrency'

interface Props {
  storefrontCount: number
  gateway?: string
}

export default function PricingBreakdown({ storefrontCount, gateway = 'PAYSTACK' }: Props) {
  const [pricing, setPricing] = useState<PricingCalculation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { formatCurrency } = useCurrency()

  useEffect(() => {
    const fetchPricing = async () => {
      setLoading(true)
      setError(null)
      try {
        // Backend does ALL calculations - we just display
        const data = await calculatePricing(storefrontCount, gateway)
        setPricing(data)
      } catch (err) {
        setError('Failed to calculate pricing')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchPricing()
  }, [storefrontCount, gateway])

  if (loading) {
    return <Spinner animation="border" />
  }

  if (error || !pricing) {
    return <Alert variant="danger">{error || 'No pricing data'}</Alert>
  }

  return (
    <Card>
      <Card.Header>
        <strong>Pricing for {storefrontCount} Storefront{storefrontCount !== 1 ? 's' : ''}</strong>
      </Card.Header>
      <Card.Body>
        <Table size="sm" className="mb-0">
          <tbody>
            {/* Base Price */}
            <tr>
              <td>Base Price</td>
              <td className="text-end">
                {formatCurrency(parseFloat(pricing.base_price))}
              </td>
            </tr>

            {/* Taxes */}
            {pricing.taxes.map(tax => (
              <tr key={tax.code}>
                <td className="ps-3">
                  <small>{tax.name} ({tax.rate}%)</small>
                </td>
                <td className="text-end">
                  <small>{formatCurrency(parseFloat(tax.amount))}</small>
                </td>
              </tr>
            ))}

            {/* Service Charges */}
            {pricing.service_charges.map(charge => (
              <tr key={charge.code}>
                <td className="ps-3">
                  <small>
                    {charge.name}
                    {charge.rate && ` (${charge.rate}%)`}
                  </small>
                </td>
                <td className="text-end">
                  <small>{formatCurrency(parseFloat(charge.amount))}</small>
                </td>
              </tr>
            ))}

            {/* Total */}
            <tr className="fw-bold border-top">
              <td>Total Amount</td>
              <td className="text-end">
                {formatCurrency(parseFloat(pricing.total_amount))}
              </td>
            </tr>
          </tbody>
        </Table>

        {/* Breakdown explanation */}
        <div className="mt-3 text-muted small">
          <p className="mb-0">{pricing.breakdown.tier_description}</p>
          {pricing.breakdown.additional_storefronts > 0 && (
            <p className="mb-0">
              + {pricing.breakdown.additional_storefronts} additional storefront
              {pricing.breakdown.additional_storefronts !== 1 ? 's' : ''} @ {' '}
              {formatCurrency(parseFloat(pricing.breakdown.price_per_additional))} each
            </p>
          )}
        </div>
      </Card.Body>
    </Card>
  )
}
```

### 4. Update Payment Callback Page

**File: `src/features/subscriptions/pages/PaymentCallback.tsx`**

```typescript
import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Container, Alert, Spinner } from 'react-bootstrap'
import { verifySubscriptionPayment } from '../../../services/subscriptionService'
import { useAppSelector } from '../../../store/hooks'
import { selectActiveSubscription } from '../../../store/slices/subscriptionSlice'

export default function PaymentCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const subscription = useAppSelector(selectActiveSubscription)
  
  const [verifying, setVerifying] = useState(true)
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState('Verifying payment...')

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get('reference')
      
      if (!reference) {
        setMessage('Invalid payment reference')
        setVerifying(false)
        return
      }

      if (!subscription) {
        setMessage('No active subscription found')
        setVerifying(false)
        return
      }

      try {
        // Backend does ALL verification work
        const result = await verifySubscriptionPayment(
          subscription.id,
          reference,
          'PAYSTACK'
        )

        if (result.success) {
          setSuccess(true)
          setMessage(result.message)
          
          // Redirect to portal after 2 seconds
          setTimeout(() => {
            navigate('/app/subscription')
          }, 2000)
        } else {
          setSuccess(false)
          setMessage(result.reason || 'Payment verification failed')
        }
      } catch (error) {
        console.error('Verification error:', error)
        setMessage('Failed to verify payment')
        setSuccess(false)
      } finally {
        setVerifying(false)
      }
    }

    verifyPayment()
  }, [searchParams, subscription, navigate])

  return (
    <Container fluid className="py-5 text-center">
      {verifying ? (
        <>
          <Spinner animation="border" className="mb-3" />
          <h4>Verifying Payment...</h4>
          <p className="text-muted">Please wait</p>
        </>
      ) : (
        <Alert variant={success ? 'success' : 'danger'}>
          <h4>{success ? '✓ Payment Successful!' : '✗ Payment Failed'}</h4>
          <p>{message}</p>
          {success && <p className="mb-0"><small>Redirecting...</small></p>}
        </Alert>
      )}
    </Container>
  )
}
```

---

## 🔧 Environment Configuration

### Frontend `.env` Files

**File: `.env`**

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_BYPASS_SUBSCRIPTION_CHECK=true
VITE_USE_NEW_TRANSFER_API=true

# Paystack Public Key (for frontend display only, no logic)
VITE_PAYSTACK_PUBLIC_KEY=pk_test_5309f5af38555dbf7ef47287822ef2c6d3019b9d
```

**File: `.env.production`**

```env
VITE_API_BASE_URL=https://posbackend.alphalogiquetechnologies.com
VITE_BYPASS_SUBSCRIPTION_CHECK=false
VITE_USE_NEW_TRANSFER_API=true

# Paystack Public Key
VITE_PAYSTACK_PUBLIC_KEY=pk_test_5309f5af38555dbf7ef47287822ef2c6d3019b9d
```

### Backend Environment Variables

**File: `backend/.env`**

```env
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_16b164b455153a23804423ec0198476b3c4ca206
PAYSTACK_PUBLIC_KEY=pk_test_5309f5af38555dbf7ef47287822ef2c6d3019b9d
PAYSTACK_APP_NAME=pos

# Frontend URL (for payment callbacks)
FRONTEND_URL=http://localhost:5173
```

**File: `backend/.env.production`**

```env
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_16b164b455153a23804423ec0198476b3c4ca206
PAYSTACK_PUBLIC_KEY=pk_test_5309f5af38555dbf7ef47287822ef2c6d3019b9d
PAYSTACK_APP_NAME=pos

# Frontend URL
FRONTEND_URL=https://pos.alphalogiquetechnologies.com
```

---

## 📊 Implementation Priority

### Phase 1: Backend Core (Week 1) ⭐ PRIORITY

1. ✅ Create `payment_gateways/paystack.py`
2. ✅ Add Paystack settings to `settings.py`
3. ✅ Create `constants.py`
4. ✅ Implement pricing calculation endpoint
5. ✅ Test pricing calculation with curl

### Phase 2: Backend Payment Flow (Week 1-2)

6. ✅ Implement payment initialization endpoint
7. ✅ Implement payment verification endpoint
8. ✅ Implement webhook handler
9. ✅ Test full payment flow with Paystack test cards
10. ✅ Set up webhook URL in Paystack dashboard

### Phase 3: Frontend Integration (Week 2)

11. ✅ Update TypeScript types
12. ✅ Add pricing service functions
13. ✅ Create `PricingBreakdown` component
14. ✅ Update `PaymentCallback` page
15. ✅ Test end-to-end flow

### Phase 4: Enhanced Features (Week 3)

16. Payment history display
17. Invoice generation
18. Payment analytics
19. Retry failed payments
20. Email notifications

---

## 🎯 Key Decisions Made

### ✅ Backend-First Architecture
- **Rationale**: Payment logic is critical and complex, should not be in browser
- **Benefit**: Security, consistency, easier testing
- **Trade-off**: Slightly more API calls, but worth it

### ✅ Single Paystack Account with app_name Routing
- **Your Keys**: Already set up and working
- **Multi-App**: Works with school system and future apps
- **Metadata**: `app_name: "pos"` routes webhooks correctly

### ✅ Complete Pricing Calculation on Backend
- **Frontend**: Just displays backend response
- **Backend**: Calculates all taxes, fees, totals
- **Why**: Prevents calculation mismatches, security

### ✅ Stateless Frontend for Payments
- **No Redux** for payment state during flow
- **Backend** tracks payment status
- **Frontend** just queries backend for current state

---

## 📝 What You Need to Provide

1. **Backend Team**: Implement the endpoints above
2. **Paystack Dashboard**: 
   - Add webhook URL: `https://posbackend.../subscriptions/api/webhooks/paystack/`
   - Test with Paystack test cards
3. **Me (when ready)**: I'll update frontend to use these endpoints

---

## 🧪 Testing Guide

### Test Paystack Integration

```bash
# 1. Test pricing calculation
curl -X GET "http://localhost:8000/subscriptions/api/pricing/calculate/?storefronts=2" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: Full pricing breakdown with taxes

# 2. Test payment initialization
curl -X POST "http://localhost:8000/subscriptions/api/subscriptions/SUB_ID/initialize_payment/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gateway": "PAYSTACK"}'

# Expected: Paystack authorization_url

# 3. Open authorization_url in browser

# 4. Use test card: 4084084084084081, CVV: 408, Expiry: Any future date

# 5. Paystack redirects to callback URL with ?reference=XXX

# 6. Test verification
curl -X POST "http://localhost:8000/subscriptions/api/subscriptions/SUB_ID/verify_payment/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reference": "SUB-ABC123", "gateway": "PAYSTACK"}'

# Expected: success: true, subscription updated
```

---

## 📚 Next Steps

Once backend implements these endpoints, let me know and I'll:

1. ✅ Update frontend types
2. ✅ Create pricing display component
3. ✅ Update payment flow pages
4. ✅ Test complete flow
5. ✅ Add error handling
6. ✅ Add loading states

**The beauty of this approach**: Frontend is SIMPLE because backend does all the hard work!

---

**Created**: November 2, 2025  
**Architecture**: Backend-First, Frontend-Thin  
**Status**: Ready for Backend Implementation
