# Backend API Contracts for Payment Infrastructure

## 🎯 Overview

This document defines the **exact API contracts** that the backend team needs to implement. These are the endpoints the frontend will call.

**Architecture**: Backend does ALL calculations and payment logic. Frontend just displays and redirects.

---

## 🔑 API Endpoints Required

### 1. Calculate Subscription Pricing

**Purpose**: Get complete pricing breakdown for a given number of storefronts

**Endpoint**: `GET /subscriptions/api/pricing/calculate/`

**Authentication**: Required (Bearer token)

**Query Parameters**:
```typescript
{
  storefronts: number    // Required: Number of storefronts (1, 2, 3, etc.)
  gateway?: string       // Optional: Payment gateway (PAYSTACK, STRIPE, etc.)
}
```

**Example Request**:
```bash
GET /subscriptions/api/pricing/calculate/?storefronts=2&gateway=PAYSTACK
Authorization: Bearer <token>
```

**Response 200 OK**:
```json
{
  "storefronts": 2,
  "currency": "GHS",
  "base_price": "150.00",
  "taxes": [
    {
      "code": "VAT_GH",
      "name": "VAT",
      "rate": 15.0,
      "amount": "22.50"
    },
    {
      "code": "NHIL_GH",
      "name": "NHIL",
      "rate": 2.5,
      "amount": "3.75"
    },
    {
      "code": "GETFUND_GH",
      "name": "GETFund Levy",
      "rate": 2.5,
      "amount": "3.75"
    },
    {
      "code": "COVID19_GH",
      "name": "COVID-19 Health Recovery Levy",
      "rate": 1.0,
      "amount": "1.50"
    }
  ],
  "total_tax": "31.50",
  "service_charges": [
    {
      "code": "PAYSTACK_FEE",
      "name": "Payment Gateway Fee",
      "type": "PERCENTAGE",
      "rate": 1.95,
      "amount": "3.54"
    }
  ],
  "total_service_charges": "3.54",
  "total_amount": "185.04",
  "breakdown": {
    "tier_description": "2 storefronts: GHS 150.00",
    "base_storefronts": 2,
    "additional_storefronts": 0,
    "price_per_additional": "0.00"
  }
}
```

**Response 400 Bad Request**:
```json
{
  "error": "Invalid storefronts parameter"
}
```

**Response 404 Not Found**:
```json
{
  "error": "No pricing tier found for 10 storefronts"
}
```

---

### 2. Initialize Payment

**Purpose**: Create payment record and get Paystack authorization URL

**Endpoint**: `POST /subscriptions/api/subscriptions/{subscription_id}/initialize_payment/`

**Authentication**: Required (Bearer token)

**Path Parameters**:
- `subscription_id`: UUID of the subscription

**Request Body**:
```json
{
  "gateway": "PAYSTACK",
  "success_url": "https://pos.alphalogiquetechnologies.com/subscriptions/payment/success",
  "cancel_url": "https://pos.alphalogiquetechnologies.com/subscriptions/payment/cancelled"
}
```

**Example Request**:
```bash
POST /subscriptions/api/subscriptions/123e4567-e89b-12d3-a456-426614174000/initialize_payment/
Authorization: Bearer <token>
Content-Type: application/json

{
  "gateway": "PAYSTACK"
}
```

**Response 200 OK**:
```json
{
  "payment_id": "987e6543-e21b-45c3-b789-123456789abc",
  "authorization_url": "https://checkout.paystack.com/abc123def456",
  "reference": "SUB-A1B2C3D4E5F6",
  "amount": "185.04",
  "currency": "GHS"
}
```

**What Backend Must Do**:
1. Get subscription and validate user owns it
2. Count active storefronts for the business
3. Calculate pricing (using pricing calculation logic)
4. Create `SubscriptionPayment` record with:
   - `status='PENDING'`
   - All pricing breakdown fields populated
   - `transaction_reference` generated
5. Call Paystack API to initialize transaction
6. Include `metadata.app_name = "pos"` in Paystack request
7. Save Paystack response to payment record
8. Return authorization URL to frontend

**Response 400 Bad Request**:
```json
{
  "error": "STRIPE not yet implemented"
}
```

**Response 404 Not Found**:
```json
{
  "error": "Subscription not found"
}
```

**Response 403 Forbidden**:
```json
{
  "error": "You don't have permission to access this subscription"
}
```

---

### 3. Verify Payment

**Purpose**: Verify payment with Paystack and update subscription status

**Endpoint**: `POST /subscriptions/api/subscriptions/{subscription_id}/verify_payment/`

**Authentication**: Required (Bearer token)

**Path Parameters**:
- `subscription_id`: UUID of the subscription

**Request Body**:
```json
{
  "reference": "SUB-A1B2C3D4E5F6",
  "gateway": "PAYSTACK"
}
```

**Example Request**:
```bash
POST /subscriptions/api/subscriptions/123e4567-e89b-12d3-a456-426614174000/verify_payment/
Authorization: Bearer <token>
Content-Type: application/json

{
  "reference": "SUB-A1B2C3D4E5F6",
  "gateway": "PAYSTACK"
}
```

**Response 200 OK (Success)**:
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "payment": {
    "id": "987e6543-e21b-45c3-b789-123456789abc",
    "amount": "185.04",
    "status": "SUCCESSFUL",
    "payment_date": "2024-11-02T10:30:00Z"
  },
  "subscription": {
    "status": "ACTIVE",
    "end_date": "2024-12-02"
  }
}
```

**Response 400 Bad Request (Failed Payment)**:
```json
{
  "success": false,
  "message": "Payment verification failed",
  "reason": "Insufficient funds"
}
```

**What Backend Must Do**:
1. Find payment record by reference
2. Call Paystack verify API
3. If successful:
   - Update payment: `status='SUCCESSFUL'`, `payment_date=now()`
   - Update subscription: `status='ACTIVE'`, `end_date=+30 days`
   - Save Paystack response
4. If failed:
   - Update payment: `status='FAILED'`, `failure_reason=<reason>`
5. Return result

**Response 404 Not Found**:
```json
{
  "error": "Payment not found"
}
```

---

### 4. Paystack Webhook Handler

**Purpose**: Handle Paystack webhook events (automatic status updates)

**Endpoint**: `POST /subscriptions/api/webhooks/paystack/`

**Authentication**: None (validated via Paystack signature)

**Headers Required**:
- `x-paystack-signature`: HMAC SHA512 signature

**Request Body** (from Paystack):
```json
{
  "event": "charge.success",
  "data": {
    "reference": "SUB-A1B2C3D4E5F6",
    "status": "success",
    "amount": 18504,
    "currency": "GHS",
    "customer": {
      "email": "user@example.com"
    },
    "metadata": {
      "app_name": "pos",
      "subscription_id": "123e4567-e89b-12d3-a456-426614174000",
      "business_id": "456e7890-e12f-34a5-b678-901234567def",
      "business_name": "My Store",
      "payment_id": "987e6543-e21b-45c3-b789-123456789abc",
      "storefront_count": 2
    }
  }
}
```

**Response 200 OK**:
```
(Empty response)
```

**What Backend Must Do**:
1. Validate `x-paystack-signature` header
2. Check `metadata.app_name == "pos"` (ignore if not)
3. If `event == "charge.success"`:
   - Find payment by reference
   - Update payment status to SUCCESSFUL
   - Update subscription status to ACTIVE
   - Extend subscription end_date
4. If `event == "charge.failed"`:
   - Update payment status to FAILED
   - Record failure reason
5. Log webhook event
6. Return 200 (always, even if event ignored)

**Response 400 Bad Request**:
```
Invalid signature
```

---

## 📊 Database Requirements

### Enhanced SubscriptionPayment Model Fields

These fields must exist in your `SubscriptionPayment` model:

```python
# Pricing breakdown (ALL calculated by backend)
base_amount = DecimalField()              # e.g., "150.00"
storefront_count = IntegerField()         # e.g., 2
pricing_tier_snapshot = JSONField()       # Tier info at time of payment

# Tax breakdown
tax_breakdown = JSONField()               # List of taxes applied
total_tax_amount = DecimalField()         # e.g., "31.50"

# Service charges
service_charges_breakdown = JSONField()   # List of charges applied
total_service_charges = DecimalField()    # e.g., "3.54"

# Payment tracking
attempt_number = IntegerField()           # Payment attempt number
previous_attempt = ForeignKey()           # Link to previous failed attempt
failure_reason = TextField()              # Human-readable failure reason
gateway_error_code = CharField()          # Gateway-specific error code
gateway_error_message = TextField()       # Gateway error message
status_history = JSONField()              # Status change log
```

---

## 🔐 Environment Variables Required

### Backend

```bash
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_16b164b455153a23804423ec0198476b3c4ca206
PAYSTACK_PUBLIC_KEY=pk_test_5309f5af38555dbf7ef47287822ef2c6d3019b9d
PAYSTACK_APP_NAME=pos

# Frontend URL (for payment callbacks)
FRONTEND_URL=https://pos.alphalogiquetechnologies.com
```

---

## 🧪 Testing Checklist

### Endpoint Testing

- [ ] `GET /pricing/calculate/?storefronts=1` returns correct pricing
- [ ] `GET /pricing/calculate/?storefronts=5` calculates additional storefronts
- [ ] `GET /pricing/calculate/?storefronts=0` returns 400 error
- [ ] `POST /initialize_payment/` creates payment and returns Paystack URL
- [ ] `POST /verify_payment/` with valid reference updates status
- [ ] `POST /verify_payment/` with invalid reference returns 404
- [ ] Webhook with valid signature processes successfully
- [ ] Webhook with invalid signature returns 400
- [ ] Webhook with `app_name != "pos"` is ignored

### Integration Testing

- [ ] Full payment flow: initialize → Paystack → callback → verify
- [ ] Test card `4084084084084081` completes successfully
- [ ] Failed payment updates status correctly
- [ ] Webhook triggers even if user closes browser
- [ ] Multiple payment attempts tracked correctly

---

## 📝 Frontend Implementation (After Backend Ready)

Once you implement these endpoints, I will:

1. ✅ Update TypeScript types to match responses
2. ✅ Create API service functions
3. ✅ Build `PricingBreakdown` component
4. ✅ Update `PaymentCallback` page
5. ✅ Add error handling
6. ✅ Test complete flow

---

## 🚀 Deployment Steps

### 1. Backend Deployment

```bash
# Run migrations
python manage.py migrate

# Set up default pricing tiers and taxes
python manage.py setup_default_pricing

# Test endpoints with curl
curl -X GET "https://posbackend.../subscriptions/api/pricing/calculate/?storefronts=1"
```

### 2. Paystack Dashboard Configuration

1. Go to https://dashboard.paystack.com/#/settings/developer
2. Add webhook URL: `https://posbackend.alphalogiquetechnologies.com/subscriptions/api/webhooks/paystack/`
3. Copy webhook secret (if needed for validation)
4. Test webhook delivery

### 3. Frontend Deployment

```bash
# Update .env.production with Paystack public key
VITE_PAYSTACK_PUBLIC_KEY=pk_test_5309f5af38555dbf7ef47287822ef2c6d3019b9d

# Build and deploy
npm run build
```

---

## 🎯 Summary for Backend Team

**You need to implement 4 endpoints:**

1. ✅ `GET /pricing/calculate/` - Return pricing breakdown
2. ✅ `POST /subscriptions/{id}/initialize_payment/` - Create payment, call Paystack
3. ✅ `POST /subscriptions/{id}/verify_payment/` - Verify with Paystack
4. ✅ `POST /webhooks/paystack/` - Handle Paystack webhooks

**All business logic stays on backend:**
- Pricing calculations
- Tax calculations  
- Service charge calculations
- Payment status tracking
- Subscription status updates

**Frontend is just a display layer:**
- Shows pricing from backend
- Redirects to Paystack
- Displays verification results

---

**Created**: November 2, 2025  
**Status**: Ready for Backend Implementation  
**Next**: Backend team implements these 4 endpoints
