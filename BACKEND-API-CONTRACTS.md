# Backend API Requirements for Subscription Payment System

## 🎯 Overview

This document specifies the **exact** backend API endpoints required for the subscription payment system to work. The frontend is already fully implemented and ready to integrate - it just needs these 3 endpoints.

---

## ✅ Required Endpoints

### 1. Create Subscription
### 2. Initialize Payment  
### 3. Verify Payment

---

## 📋 Endpoint 1: Create Subscription

### HTTP Request
```
POST /subscriptions/api/subscriptions/
```

### Headers
```
Authorization: Bearer {token}
Content-Type: application/json
```

### Request Body
```json
{
  "plan_id": "uuid-of-selected-plan",
  "business_id": "uuid-of-users-business",
  "payment_method": "PAYSTACK"
}
```

### Request Body Schema
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `plan_id` | UUID | Yes | ID of the subscription plan (Basic, Starter, Professional, etc.) |
| `business_id` | UUID | Yes | ID of the business subscribing |
| `payment_method` | String | No | Payment gateway: "PAYSTACK" or "STRIPE" (default: "PAYSTACK") |
| `is_trial` | Boolean | No | Whether this is a trial subscription (default: false) |
| `trial_end_date` | String (ISO Date) | No | End date for trial period if is_trial=true |

### Success Response (201 Created)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "business_id": "660e8400-e29b-41d4-a716-446655440000",
  "plan_id": "770e8400-e29b-41d4-a716-446655440000",
  "plan": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "name": "Starter Plan",
    "price": "150.00",
    "billing_cycle": "MONTHLY",
    "currency": "GHS",
    "max_storefronts": 2,
    "max_users": null,
    "max_products": null
  },
  "status": "INACTIVE",
  "payment_status": "UNPAID",
  "current_period_start": "2025-11-02T00:00:00Z",
  "current_period_end": "2025-12-02T23:59:59Z",
  "created_at": "2025-11-02T13:17:00Z",
  "updated_at": "2025-11-02T13:17:00Z"
}
```

### Error Responses

**400 Bad Request** - Invalid input
```json
{
  "error": "Invalid plan_id",
  "detail": "Plan with id 'xyz' does not exist"
}
```

**403 Forbidden** - User doesn't own the business
```json
{
  "error": "Permission denied",
  "detail": "You do not have access to this business"
}
```

**409 Conflict** - Business already has active subscription
```json
{
  "error": "Subscription already exists",
  "detail": "This business already has an active subscription"
}
```

### Business Logic Requirements

1. **Validation**
   - Verify plan exists and is active
   - Verify business exists and user has access
   - Check if business already has active subscription (decide: allow or reject)

2. **Subscription Creation**
   - Create subscription record with status="INACTIVE", payment_status="UNPAID"
   - Set `current_period_start` to now
   - Set `current_period_end` to now + billing cycle (e.g., 30 days for MONTHLY)
   - Link subscription to business and plan

3. **Response**
   - Return full subscription object including nested plan details

---

## 📋 Endpoint 2: Initialize Payment

### HTTP Request
```
POST /subscriptions/api/subscriptions/{subscription_id}/initialize_payment/
```

### Headers
```
Authorization: Bearer {token}
Content-Type: application/json
```

### Request Body
```json
{
  "gateway": "PAYSTACK",
  "callback_url": "https://pos.alphalogiquetechnologies.com/app/subscription/payment/callback",
  "success_url": "https://pos.alphalogiquetechnologies.com/app/subscription/payment/success",
  "cancel_url": "https://pos.alphalogiquetechnologies.com/app/subscription/payment/cancelled"
}
```

### Request Body Schema
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `gateway` | String | Yes | Payment gateway: "PAYSTACK" or "STRIPE" |
| `callback_url` | String | No | URL to redirect after payment (used by Paystack) |
| `success_url` | String | No | URL for successful payment (used by Stripe) |
| `cancel_url` | String | No | URL for cancelled payment (used by Stripe) |

### Success Response (200 OK)
```json
{
  "payment_id": "880e8400-e29b-41d4-a716-446655440000",
  "authorization_url": "https://checkout.paystack.com/abc123def456",
  "reference": "SUB-A1B2C3D4E5F6",
  "amount": "150.00",
  "currency": "GHS"
}
```

### Response Schema
| Field | Type | Description |
|-------|------|-------------|
| `payment_id` | UUID | ID of the payment record created |
| `authorization_url` | String | Paystack checkout URL (frontend redirects user here) |
| `reference` | String | Unique payment reference (used for verification) |
| `amount` | String (Decimal) | Total amount to be paid |
| `currency` | String | Currency code (GHS, USD, etc.) |

### Error Responses

**404 Not Found** - Subscription doesn't exist
```json
{
  "error": "Subscription not found",
  "detail": "No subscription found with id '550e8400-...'"
}
```

**400 Bad Request** - Already paid
```json
{
  "error": "Payment already completed",
  "detail": "This subscription is already active and paid"
}
```

**500 Internal Server Error** - Paystack API error
```json
{
  "error": "Payment initialization failed",
  "detail": "Failed to connect to Paystack API"
}
```

### Business Logic Requirements

1. **Validation**
   - Verify subscription exists and user has access
   - Verify subscription is not already paid (status != "ACTIVE")
   - Verify gateway is supported

2. **Pricing Calculation** (Backend calculates EVERYTHING)
   - Get plan price
   - Count business storefronts
   - Calculate base price (plan price + additional storefronts if applicable)
   - Calculate taxes (VAT, NHIL, GETFund, etc.)
   - Calculate service charges (Paystack fees, etc.)
   - Calculate total amount

3. **Payment Record Creation**
   - Create `SubscriptionPayment` record with:
     - `subscription_id`: Link to subscription
     - `amount`: Total calculated amount
     - `currency`: Plan currency
     - `payment_method`: Gateway (PAYSTACK/STRIPE)
     - `status`: "PENDING"
     - `transaction_reference`: Unique reference (e.g., "SUB-{uuid}")
     - `base_amount`: Plan base price
     - `storefront_count`: Number of storefronts
     - `tax_breakdown`: JSON array of tax details
     - `total_tax_amount`: Sum of all taxes
     - `service_charges_breakdown`: JSON array of charges
     - `total_service_charges`: Sum of all charges

4. **Paystack Integration**
   - Call Paystack API `/transaction/initialize`
   - Include metadata:
     ```json
     {
       "app_name": "pos",
       "subscription_id": "uuid",
       "business_id": "uuid",
       "business_name": "Business Name",
       "payment_id": "uuid",
       "storefront_count": 2
     }
     ```
   - Store Paystack response in payment record

5. **Response**
   - Return payment details including `authorization_url`

### Paystack Integration Details

**Paystack API Endpoint:**
```
POST https://api.paystack.co/transaction/initialize
```

**Headers:**
```
Authorization: Bearer sk_test_16b164b455153a23804423ec0198476b3c4ca206
Content-Type: application/json
```

**Payload:**
```json
{
  "email": "user@example.com",
  "amount": 15000,  // Amount in pesewas (150.00 GHS * 100)
  "currency": "GHS",
  "reference": "SUB-A1B2C3D4E5F6",
  "callback_url": "https://pos.alphalogiquetechnologies.com/app/subscription/payment/callback",
  "metadata": {
    "app_name": "pos",
    "subscription_id": "550e8400-e29b-41d4-a716-446655440000",
    "business_id": "660e8400-e29b-41d4-a716-446655440000",
    "business_name": "DataLogique Systems",
    "payment_id": "880e8400-e29b-41d4-a716-446655440000",
    "storefront_count": 2
  }
}
```

**Paystack Response:**
```json
{
  "status": true,
  "message": "Authorization URL created",
  "data": {
    "authorization_url": "https://checkout.paystack.com/abc123def456",
    "access_code": "abc123def456",
    "reference": "SUB-A1B2C3D4E5F6"
  }
}
```

---

## 📋 Endpoint 3: Verify Payment

### HTTP Request
```
POST /subscriptions/api/subscriptions/{subscription_id}/verify_payment/
```

### Headers
```
Authorization: Bearer {token}
Content-Type: application/json
```

### Request Body
```json
{
  "gateway": "PAYSTACK",
  "reference": "SUB-A1B2C3D4E5F6"
}
```

### Request Body Schema
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `gateway` | String | Yes | Payment gateway: "PAYSTACK" or "STRIPE" |
| `reference` | String | Yes | Payment reference from initialization |

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "payment": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "amount": "150.00",
    "status": "SUCCESSFUL",
    "payment_date": "2025-11-02T13:20:00Z"
  },
  "subscription": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "ACTIVE",
    "payment_status": "PAID",
    "start_date": "2025-11-02T00:00:00Z",
    "end_date": "2025-12-02T23:59:59Z"
  }
}
```

### Failure Response (200 OK with success=false)
```json
{
  "success": false,
  "message": "Payment verification failed",
  "reason": "Transaction was not successful"
}
```

### Error Responses

**404 Not Found** - Payment not found
```json
{
  "error": "Payment not found",
  "detail": "No payment found with reference 'SUB-XYZ'"
}
```

**400 Bad Request** - Missing reference
```json
{
  "error": "Reference is required",
  "detail": "Payment reference must be provided"
}
```

### Business Logic Requirements

1. **Find Payment Record**
   - Look up payment by `transaction_reference`
   - Verify payment belongs to the subscription
   - Verify user has access to subscription

2. **Verify with Paystack**
   - Call Paystack API `/transaction/verify/{reference}`
   - Check transaction status from Paystack response

3. **Update Payment Record** (if successful)
   - Set `status` = "SUCCESSFUL"
   - Set `payment_date` = current timestamp
   - Store Paystack response in `gateway_response` JSON field

4. **Update Subscription** (if payment successful)
   - Set `status` = "ACTIVE"
   - Set `payment_status` = "PAID"
   - Set `start_date` = current date
   - Set `end_date` = start_date + billing cycle
   - Update `updated_at` timestamp

5. **Update Business** (if payment successful)
   - Set `subscription_status` = "ACTIVE"

6. **Handle Failure** (if payment failed)
   - Set payment `status` = "FAILED"
   - Set `failure_reason` from Paystack response
   - Keep subscription status as "INACTIVE"

7. **Response**
   - Return verification result with payment and subscription details

### Paystack Verification Details

**Paystack API Endpoint:**
```
GET https://api.paystack.co/transaction/verify/{reference}
```

**Headers:**
```
Authorization: Bearer sk_test_16b164b455153a23804423ec0198476b3c4ca206
```

**Paystack Success Response:**
```json
{
  "status": true,
  "message": "Verification successful",
  "data": {
    "id": 123456789,
    "status": "success",
    "reference": "SUB-A1B2C3D4E5F6",
    "amount": 15000,
    "currency": "GHS",
    "paid_at": "2025-11-02T13:20:00Z",
    "customer": {
      "email": "user@example.com"
    },
    "metadata": {
      "app_name": "pos",
      "subscription_id": "550e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

**Paystack Failure Response:**
```json
{
  "status": true,
  "message": "Verification successful",
  "data": {
    "status": "failed",
    "reference": "SUB-A1B2C3D4E5F6",
    "gateway_response": "Insufficient Funds"
  }
}
```

---

## 🗄️ Database Requirements

### Tables/Models Needed

#### 1. SubscriptionPayment Model

```python
class SubscriptionPayment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    subscription = models.ForeignKey('Subscription', on_delete=models.CASCADE)
    
    # Basic payment info
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='GHS')
    payment_method = models.CharField(max_length=20)  # PAYSTACK, STRIPE
    status = models.CharField(max_length=20)  # PENDING, SUCCESSFUL, FAILED
    transaction_reference = models.CharField(max_length=100, unique=True)
    
    # Detailed breakdown (all calculated by backend)
    base_amount = models.DecimalField(max_digits=10, decimal_places=2)
    storefront_count = models.IntegerField()
    tax_breakdown = models.JSONField(default=list)
    total_tax_amount = models.DecimalField(max_digits=10, decimal_places=2)
    service_charges_breakdown = models.JSONField(default=list)
    total_service_charges = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Pricing tier snapshot
    pricing_tier_snapshot = models.JSONField(default=dict)
    
    # Payment dates
    payment_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Gateway response
    gateway_response = models.JSONField(default=dict)
    failure_reason = models.TextField(null=True, blank=True)
```

#### 2. Subscription Model Updates

Ensure your Subscription model has these fields:

```python
class Subscription(models.Model):
    # ... existing fields ...
    
    status = models.CharField(max_length=20)  # ACTIVE, INACTIVE, TRIAL, EXPIRED, etc.
    payment_status = models.CharField(max_length=20)  # PAID, UNPAID, PENDING
    start_date = models.DateField(null=True)
    end_date = models.DateField(null=True)
    current_period_start = models.DateTimeField()
    current_period_end = models.DateTimeField()
```

#### 3. Business Model Updates

```python
class Business(models.Model):
    # ... existing fields ...
    
    subscription_status = models.CharField(max_length=20, default='INACTIVE')
```

---

## 🔐 Environment Variables

### Backend `.env` File

```env
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_16b164b455153a23804423ec0198476b3c4ca206
PAYSTACK_PUBLIC_KEY=pk_test_5309f5af38555dbf7ef47287822ef2c6d3019b9d
PAYSTACK_APP_NAME=pos

# Frontend URL (for payment callbacks)
FRONTEND_URL=http://localhost:5173
```

### Backend `settings.py`

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
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
```

---

## 🧪 Testing Requirements

### Test with Paystack Test Cards

**Success Card:**
- Card: `4084084084084081`
- CVV: `408`
- Expiry: Any future date
- PIN: `0000`
- OTP: `123456`

**Decline Card:**
- Card: `4084080000000409`
- CVV: `408`
- Result: Transaction declined

### Test Flow

1. **Create Subscription**
   ```bash
   curl -X POST http://localhost:8000/subscriptions/api/subscriptions/ \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "plan_id": "PLAN_UUID",
       "business_id": "BUSINESS_UUID",
       "payment_method": "PAYSTACK"
     }'
   ```

2. **Initialize Payment**
   ```bash
   curl -X POST http://localhost:8000/subscriptions/api/subscriptions/SUB_UUID/initialize_payment/ \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "gateway": "PAYSTACK",
       "callback_url": "http://localhost:5173/app/subscription/payment/callback"
     }'
   ```

3. **Open `authorization_url` in browser**

4. **Complete payment on Paystack**

5. **Verify Payment**
   ```bash
   curl -X POST http://localhost:8000/subscriptions/api/subscriptions/SUB_UUID/verify_payment/ \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "gateway": "PAYSTACK",
       "reference": "SUB-A1B2C3D4E5F6"
     }'
   ```

---

## 📊 Implementation Checklist

### Phase 1: Models & Database ✅

- [ ] Create/Update `SubscriptionPayment` model
- [ ] Add `payment_status`, `start_date`, `end_date` to `Subscription` model
- [ ] Add `subscription_status` to `Business` model
- [ ] Run migrations

### Phase 2: Paystack Integration ✅

- [ ] Create `payment_gateways/paystack.py` service
- [ ] Add Paystack credentials to `settings.py`
- [ ] Implement `initialize_transaction()` method
- [ ] Implement `verify_transaction()` method

### Phase 3: API Endpoints ✅

- [ ] Implement `POST /subscriptions/api/subscriptions/` (create)
- [ ] Implement `POST /subscriptions/api/subscriptions/{id}/initialize_payment/`
- [ ] Implement `POST /subscriptions/api/subscriptions/{id}/verify_payment/`

### Phase 4: Testing ✅

- [ ] Test subscription creation
- [ ] Test payment initialization
- [ ] Test successful payment flow
- [ ] Test failed payment flow
- [ ] Test error handling

### Phase 5: Production Deployment ✅

- [ ] Update production environment variables
- [ ] Test with real Paystack account (small amount)
- [ ] Configure Paystack webhook (optional but recommended)
- [ ] Monitor first few transactions

---

## 🚨 Critical Security Requirements

### 1. Verify Paystack Responses

**ALWAYS verify payments with Paystack API, never trust frontend:**

```python
# ❌ WRONG - Don't trust frontend
if request.data.get('payment_successful'):
    subscription.status = 'ACTIVE'  # NEVER DO THIS!

# ✅ CORRECT - Always verify with Paystack
verification = paystack.verify_transaction(reference)
if verification['data']['status'] == 'success':
    subscription.status = 'ACTIVE'
```

### 2. Validate User Permissions

```python
# Verify user owns the business they're subscribing for
if not request.user.memberships.filter(business_id=business_id, is_active=True).exists():
    return Response({'error': 'Permission denied'}, status=403)
```

### 3. Prevent Duplicate Payments

```python
# Check if payment for this subscription already exists and is successful
existing_payment = SubscriptionPayment.objects.filter(
    subscription=subscription,
    status='SUCCESSFUL'
).exists()

if existing_payment:
    return Response({'error': 'Payment already completed'}, status=400)
```

### 4. Validate Amount Matches

```python
# Verify payment amount matches expected amount
expected_amount = calculate_total_amount(subscription)
actual_amount = Decimal(verification['data']['amount']) / 100

if actual_amount != expected_amount:
    logger.warning(f"Amount mismatch: expected {expected_amount}, got {actual_amount}")
    # Handle accordingly
```

---

## 📞 Support & Resources

### Paystack Documentation
- API Docs: https://paystack.com/docs/api/
- Test Cards: https://paystack.com/docs/payments/test-payments/

### Test Credentials
- **Secret Key**: `sk_test_16b164b455153a23804423ec0198476b3c4ca206`
- **Public Key**: `pk_test_5309f5af38555dbf7ef47287822ef2c6d3019b9d`
- **App Name**: `pos`

### Contact
- Support: alphalogiquetechnologies@gmail.com

---

## ✅ Acceptance Criteria

The implementation is complete when:

1. ✅ Frontend can create a subscription via API
2. ✅ Frontend receives Paystack checkout URL
3. ✅ User can complete payment on Paystack
4. ✅ Payment verification returns success/failure correctly
5. ✅ Subscription status updates to ACTIVE on successful payment
6. ✅ Business subscription_status updates to ACTIVE
7. ✅ Failed payments are handled gracefully
8. ✅ All error cases return appropriate error messages
9. ✅ Test cards work in development environment
10. ✅ Real payments work in production (with small test amount)

---

**Priority**: 🔥 CRITICAL - Frontend is blocked until these endpoints are implemented

**Estimated Time**: 1-2 days for experienced Django developer

**Status**: Ready for Implementation

**Created**: November 2, 2025
