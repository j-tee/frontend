# Payment Infrastructure - Quick Reference

## 🎯 What We've Set Up

### Architecture Decision: **Backend-First** ✅

**Backend Responsibilities** (Django):
- ✅ All pricing calculations (base price + taxes + fees)
- ✅ Payment initialization with Paystack
- ✅ Payment verification with Paystack  
- ✅ Webhook handling
- ✅ Subscription status updates
- ✅ All business logic

**Frontend Responsibilities** (React/TypeScript):
- ✅ Display pricing from backend
- ✅ Collect user input
- ✅ Trigger backend endpoints
- ✅ Redirect to Paystack
- ✅ Show success/failure messages
- ✅ **NO calculation logic**

---

## 📁 Files Created

### Documentation
1. **`PAYMENT-INFRASTRUCTURE-IMPLEMENTATION.md`** (15 pages)
   - Complete backend implementation guide
   - Paystack integration service
   - All endpoint implementations
   - Frontend components (lightweight)
   - Environment configuration
   - Testing guide

2. **`BACKEND-API-CONTRACTS.md`** (7 pages)
   - Exact API contracts for backend team
   - Request/response formats
   - All 4 required endpoints
   - Database field requirements
   - Testing checklist
   - Deployment steps

### Configuration Files Updated
3. **`.env`** - Added Paystack public key
4. **`.env.production`** - Added Paystack public key

---

## 🔑 Your Paystack Credentials

**Account**: ALPHALOGIQUE TECHNOLOGIES  
**App Name**: `pos` (for metadata routing)

**Test Keys** (already in .env files):
- **Secret**: `sk_test_16b164b455153a23804423ec0198476b3c4ca206` (backend only)
- **Public**: `pk_test_5309f5af38555dbf7ef47287822ef2c6d3019b9d` (frontend display)

**Usage Pattern**:
- Same keys across all your apps (POS, School Management, etc.)
- Different `app_name` in metadata for routing
- Webhook routes based on `metadata.app_name`

---

## 🏗️ Implementation Flow

### Step 1: Backend Implementation (Priority)

**Backend team implements 4 endpoints:**

```python
# 1. Pricing calculation
GET /subscriptions/api/pricing/calculate/?storefronts=2
→ Returns: base_price, taxes[], charges[], total

# 2. Payment initialization  
POST /subscriptions/api/subscriptions/{id}/initialize_payment/
→ Creates payment record
→ Calls Paystack API
→ Returns: authorization_url

# 3. Payment verification
POST /subscriptions/api/subscriptions/{id}/verify_payment/
→ Verifies with Paystack
→ Updates subscription status
→ Returns: success/failure

# 4. Webhook handler
POST /subscriptions/api/webhooks/paystack/
→ Validates Paystack signature
→ Checks app_name == "pos"
→ Updates payment/subscription
```

**Files to create:**
```
backend/
├── subscriptions/
│   ├── payment_gateways/
│   │   └── paystack.py          # NEW: Paystack integration class
│   ├── constants.py              # NEW: Configuration constants
│   ├── views.py                  # UPDATE: Add 4 endpoints
│   └── urls.py                   # UPDATE: Register endpoints
└── config/
    └── settings.py               # UPDATE: Add PAYSTACK_* settings
```

### Step 2: Test Backend Endpoints

```bash
# Test pricing calculation
curl -X GET "http://localhost:8000/subscriptions/api/pricing/calculate/?storefronts=2" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return full pricing breakdown with:
# - base_price: "150.00"
# - taxes: [VAT, NHIL, GETFund, COVID-19]
# - service_charges: [Paystack fee]
# - total_amount: "185.04"
```

### Step 3: Frontend Integration (After Backend Ready)

Once backend endpoints work, I'll implement:

1. Update TypeScript types to match backend responses
2. Create API service functions
3. Build `PricingBreakdown` component
4. Update `PaymentCallback` page
5. Test complete payment flow

---

## 🧪 Test Payment Flow

### Complete End-to-End Test

1. **Frontend**: User selects plan → frontend calls backend
   ```typescript
   const pricing = await calculatePricing(storefrontCount, 'PAYSTACK')
   // Displays: GHS 185.04 (with breakdown)
   ```

2. **Frontend**: User clicks "Pay Now" → backend initializes payment
   ```typescript
   const payment = await initializeSubscriptionPayment(subscriptionId, 'PAYSTACK')
   window.location.href = payment.authorization_url  // Redirect to Paystack
   ```

3. **Paystack Checkout**: User enters card details
   - Test Card: `4084084084084081`
   - CVV: `408`
   - Expiry: Any future date
   - OTP: `123456`

4. **Paystack Redirect**: Back to your callback URL
   ```
   https://pos.../subscriptions/payment/callback?reference=SUB-ABC123
   ```

5. **Frontend**: Calls verification endpoint
   ```typescript
   const result = await verifySubscriptionPayment(subscriptionId, reference, 'PAYSTACK')
   // Shows: "✓ Payment Successful!"
   ```

6. **Backend Webhook**: Paystack also sends webhook (backup verification)
   ```
   POST /subscriptions/api/webhooks/paystack/
   → Updates subscription even if user closed browser
   ```

---

## 📊 Pricing Calculation Example

**Input**: 2 storefronts

**Backend Calculates**:
```
Base Price (2 storefronts):           GHS 150.00
  └─ Tier: 2 storefronts = GHS 150.00

Taxes:
  ├─ VAT (15%):                       GHS  22.50
  ├─ NHIL (2.5%):                     GHS   3.75
  ├─ GETFund Levy (2.5%):             GHS   3.75
  └─ COVID-19 Levy (1%):              GHS   1.50
  Subtotal Taxes:                     GHS  31.50

Service Charges:
  └─ Paystack Fee (1.95%):            GHS   3.54

TOTAL AMOUNT:                         GHS 185.04
```

**Frontend Displays**: Exactly what backend calculated (no frontend math)

---

## 🔐 Security & Multi-App Setup

### Paystack Metadata Pattern

**Every payment includes**:
```json
{
  "metadata": {
    "app_name": "pos",              // Routes webhook correctly
    "subscription_id": "uuid",
    "business_id": "uuid",
    "business_name": "My Store",
    "payment_id": "uuid",
    "storefront_count": 2
  }
}
```

### Webhook Routing

```python
# Backend webhook handler checks:
if metadata.get('app_name') != 'pos':
    # This is for school system or another app
    return HttpResponse(status=200)  # Ignore

# Otherwise, process payment for POS system
```

**Result**: One Paystack account serves all your apps safely

---

## 🚀 Deployment Checklist

### Backend Deployment

- [ ] Add environment variables to production server:
  ```bash
  PAYSTACK_SECRET_KEY=sk_test_16b164b455153a23804423ec0198476b3c4ca206
  PAYSTACK_PUBLIC_KEY=pk_test_5309f5af38555dbf7ef47287822ef2c6d3019b9d
  PAYSTACK_APP_NAME=pos
  FRONTEND_URL=https://pos.alphalogiquetechnologies.com
  ```

- [ ] Run migrations:
  ```bash
  python manage.py migrate
  python manage.py setup_default_pricing
  ```

- [ ] Test endpoints with curl

- [ ] Configure Paystack webhook:
  - Dashboard: https://dashboard.paystack.com/#/settings/developer
  - Webhook URL: `https://posbackend.../subscriptions/api/webhooks/paystack/`

### Frontend Deployment

- [ ] Verify `.env.production` has Paystack public key
- [ ] Build: `npm run build`
- [ ] Deploy to production server

### Testing

- [ ] Test with Paystack test card: `4084084084084081`
- [ ] Verify webhook triggers on payment success
- [ ] Verify subscription status updates
- [ ] Test payment failure scenario
- [ ] Test callback redirect flow

---

## 📞 What You Need to Provide

### For Backend Team

Share these documents:
1. `PAYMENT-INFRASTRUCTURE-IMPLEMENTATION.md` - Full implementation guide
2. `BACKEND-API-CONTRACTS.md` - Exact API specifications

**They need to implement:**
- Paystack integration service (`payment_gateways/paystack.py`)
- 4 API endpoints (calculate, initialize, verify, webhook)
- Database model enhancements
- Management command for default pricing

### For Me (When Backend Ready)

Let me know when these work:
```bash
# Test these endpoints are working
GET  /subscriptions/api/pricing/calculate/?storefronts=2
POST /subscriptions/api/subscriptions/{id}/initialize_payment/
POST /subscriptions/api/subscriptions/{id}/verify_payment/
POST /subscriptions/api/webhooks/paystack/
```

**Then I'll:**
1. Update frontend TypeScript types
2. Create pricing display component
3. Update payment callback pages
4. Add error handling
5. Test complete flow

---

## 🎯 Key Benefits of This Approach

### ✅ Security
- Payment logic NOT in browser (can't be manipulated)
- Calculations always server-side
- Webhook validates signature

### ✅ Consistency  
- One source of truth for pricing
- Frontend always shows backend calculation
- No frontend/backend mismatch possible

### ✅ Maintainability
- Tax changes: Update backend only
- Fee changes: Update backend only
- Frontend never needs updates for pricing logic

### ✅ Multi-App Ready
- Same Paystack account for all apps
- `app_name` metadata routes correctly
- Webhook handler filters by app

### ✅ Testability
- Backend endpoints testable with curl
- Payment flow testable with Paystack test cards
- Webhook testable with Paystack dashboard

---

## 📚 Related Documents

1. **BACKEND-FLEXIBLE-SUBSCRIPTION-API-SPEC.md** (1241 lines)
   - Original detailed specification
   - Database models with all fields
   - Serializers, permissions, tests
   - Management commands

2. **PAYMENT-INFRASTRUCTURE-IMPLEMENTATION.md** (THIS)
   - Backend-first implementation guide
   - Complete endpoint code
   - Frontend lightweight components
   - Testing and deployment

3. **BACKEND-API-CONTRACTS.md**
   - Exact API contracts for backend team
   - Request/response examples
   - Testing checklist
   - Deployment steps

4. **FLEXIBLE-SUBSCRIPTION-PRICING-SPEC.md**
   - Business requirements
   - Pricing tiers specification
   - Tax configuration
   - Use cases

---

## 🔄 Next Actions

### Your Actions
1. ✅ Review the implementation guides
2. ✅ Share `BACKEND-API-CONTRACTS.md` with backend team
3. ⏳ Wait for backend to implement 4 endpoints
4. ⏳ Test endpoints when ready
5. ⏳ Let me know when to implement frontend

### Backend Team Actions
1. Create `payment_gateways/paystack.py`
2. Add Paystack settings to `settings.py`
3. Implement 4 API endpoints
4. Enhance `SubscriptionPayment` model
5. Test endpoints with curl
6. Configure Paystack webhook

### My Actions (After Backend Ready)
1. Update TypeScript types
2. Create API service functions
3. Build `PricingBreakdown` component
4. Update payment callback pages
5. Test complete flow
6. Deploy

---

**Status**: ✅ Documentation Complete, Ready for Backend Implementation  
**Created**: November 2, 2025  
**Architecture**: Backend-First, Frontend-Thin  
**Test Keys**: Already configured in `.env` files
