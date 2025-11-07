# URGENT: Backend AI Credits Verify Endpoint Returning 500 Error

**Date**: November 7, 2025  
**Status**: 🔴 CRITICAL - Payment verification failing  
**Priority**: URGENT  
**Issue**: Backend endpoint `/ai/api/credits/verify/` returns 500 Internal Server Error

---

## Problem Summary

The frontend successfully calls the AI credits verification endpoint after payment, but the **backend returns 500 Internal Server Error**, preventing credits from being added to user accounts.

### Evidence

**Frontend logs**:
```
verifyCreditsPayment called with reference: AI-CREDIT-1762542056443-08ed01c0
HTTP Interceptor - Token from state: 4a21cd8d48ce4ce87add...
HTTP Interceptor - Authorization header set
GET http://localhost:8000/ai/api/credits/verify/?reference=AI-CREDIT-1762542056443-08ed01c0&trxref=AI-CREDIT-1762542056443-08ed01c0
HTTP/1.1 500 Internal Server Error
AxiosError: Request failed with status code 500
ERR_BAD_RESPONSE
```

**User impact**:
- ✅ User completes payment successfully on Paystack
- ✅ User redirected to frontend callback page
- ✅ Frontend makes authenticated API call
- ❌ Backend returns 500 error
- ❌ Credits NOT added to account
- ❌ User sees error message

---

## Why Subscriptions Work But AI Credits Don't

### ✅ Subscription Verification (WORKS)

**Endpoint**: `POST /subscriptions/api/subscriptions/{subscription_id}/verify_payment/`

**Request**:
```json
{
  "gateway": "PAYSTACK",
  "reference": "SUB-{uuid}-{timestamp}"
}
```

**Backend Logic**:
1. Get subscription by ID from URL
2. Verify reference with Paystack
3. Update subscription status
4. Return success response

**Why it works**: Backend has the subscription_id from the URL path, making it easy to find the record to update.

---

### ❌ AI Credits Verification (FAILS - 500 ERROR)

**Endpoint**: `GET /ai/api/credits/verify/?reference=AI-CREDIT-xxx`

**Request**: Only the reference parameter

**Backend Logic (EXPECTED)**:
1. Get reference from query params
2. Find payment record by reference
3. Verify with Paystack
4. Add credits to user account
5. Return success response

**Why it fails**: Backend endpoint has a bug or missing implementation. Possible causes:
1. Payment record not created during purchase
2. Database query failing to find payment
3. Paystack verification failing
4. Credit addition logic error
5. Missing error handling

---

## Backend Investigation Needed

### Check 1: Payment Record Creation

When `POST /ai/api/credits/purchase/` is called, does it:
- ✅ Create a payment record in database?
- ✅ Store the reference correctly?
- ✅ Link to user and business?

**How to verify**:
```python
# In Django shell or view
from ai_features.models import CreditPayment
payment = CreditPayment.objects.filter(reference='AI-CREDIT-1762542056443-08ed01c0').first()
print(payment)  # Should exist
print(payment.status)  # Should be 'pending'
```

### Check 2: Verify Endpoint Implementation

Does `GET /ai/api/credits/verify/` properly:
- ✅ Extract reference from params?
- ✅ Query payment record?
- ✅ Call Paystack verify API?
- ✅ Handle Paystack response?
- ✅ Update payment status?
- ✅ Add credits to account?

**Expected code structure**:
```python
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def verify_payment(request):
    try:
        # Get reference
        if request.method == 'GET':
            reference = request.GET.get('reference') or request.GET.get('trxref')
        else:
            reference = request.data.get('reference') or request.data.get('trxref')
        
        if not reference:
            return Response({
                'status': 'failed',
                'message': 'Payment reference is required'
            }, status=400)
        
        # Find payment record
        payment = CreditPayment.objects.filter(
            reference=reference,
            user=request.user
        ).first()
        
        if not payment:
            return Response({
                'status': 'failed',
                'message': 'Payment record not found'
            }, status=404)
        
        # Check if already processed
        if payment.status == 'successful':
            return Response({
                'status': 'success',
                'message': 'Payment already processed',
                'reference': reference,
                'credits_added': payment.credits_added,
                'current_balance': get_user_balance(request.user)
            })
        
        # Verify with Paystack
        paystack_result = PaystackService.verify_transaction(reference)
        
        if not paystack_result['status']:
            return Response({
                'status': 'failed',
                'message': 'Payment verification failed with Paystack'
            }, status=400)
        
        # Check payment status
        if paystack_result['data']['status'] != 'success':
            return Response({
                'status': 'failed',
                'message': f"Payment was not successful: {paystack_result['data']['status']}"
            })
        
        # Add credits
        credits_balance = get_or_create_credits_balance(request.user, request.user.business)
        credits_balance.balance += payment.credits_to_add
        credits_balance.save()
        
        # Update payment status
        payment.status = 'successful'
        payment.verified_at = timezone.now()
        payment.save()
        
        return Response({
            'status': 'success',
            'message': 'Payment verified and credits added successfully',
            'reference': reference,
            'credits_added': payment.credits_to_add,
            'new_balance': credits_balance.balance
        })
        
    except Exception as e:
        logger.error(f'Error verifying payment: {e}')
        return Response({
            'status': 'error',
            'message': f'Internal error: {str(e)}'
        }, status=500)
```

### Check 3: Paystack Integration

Is Paystack verify working?
```python
# Test Paystack verify
from ai_features.services import PaystackService

result = PaystackService.verify_transaction('AI-CREDIT-1762542056443-08ed01c0')
print(result)
```

### Check 4: Error Logs

**Check backend logs for**:
- Python exceptions
- Database errors
- Paystack API errors
- Missing environment variables

```bash
# Check Django logs
tail -f /path/to/django/logs/error.log

# Or in Django
import logging
logger = logging.getLogger(__name__)
logger.error(f'Error: {e}', exc_info=True)
```

---

## Comparison: Working vs Broken

| Aspect | Subscriptions (✅) | AI Credits (❌) |
|--------|-------------------|----------------|
| **Endpoint** | `POST /subscriptions/{id}/verify_payment/` | `GET /ai/api/credits/verify/` |
| **ID in URL** | ✅ subscription_id | ❌ Only reference param |
| **Payment Record** | Subscription table | CreditPayment table |
| **Record Lookup** | By ID (easy) | By reference (needs query) |
| **Verification** | Works | 500 Error |
| **Status Code** | 200 OK | 500 Internal Server Error |

---

## Immediate Actions Required

### Priority 1: Fix the 500 Error

1. **Add proper error handling** to verify endpoint
2. **Log the actual error** that's causing 500
3. **Check database** for payment record
4. **Test Paystack verify** call manually

### Priority 2: Ensure Payment Record Created

1. Verify `/ai/api/credits/purchase/` creates payment record
2. Check payment record has correct reference format
3. Ensure payment linked to correct user/business

### Priority 3: Test End-to-End

1. Purchase credits with test account
2. Check payment record created
3. Complete payment on Paystack
4. Verify callback works
5. Check credits added
6. Verify no errors in logs

---

## Testing Commands

### Test Payment Record Creation
```bash
# After purchasing credits
python manage.py shell

from ai_features.models import CreditPayment
from django.contrib.auth import get_user_model
User = get_user_model()

user = User.objects.get(email='test@example.com')
payment = CreditPayment.objects.filter(user=user).order_by('-created_at').first()
print(f"Reference: {payment.reference}")
print(f"Status: {payment.status}")
print(f"Credits: {payment.credits_to_add}")
```

### Test Verification Manually
```bash
# Manually verify a payment
python manage.py shell

from ai_features.views import verify_payment
from django.test import RequestFactory
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.get(email='test@example.com')

factory = RequestFactory()
request = factory.get('/ai/api/credits/verify/?reference=AI-CREDIT-xxx')
request.user = user

response = verify_payment(request)
print(response.data)
```

### Test Paystack Verify
```python
from ai_features.services import PaystackService

result = PaystackService.verify_transaction('AI-CREDIT-1762542056443-08ed01c0')
print(result)
```

---

## Expected Fix

The backend `/ai/api/credits/verify/` endpoint needs to:

1. ✅ Accept GET requests with reference param
2. ✅ Query CreditPayment table by reference
3. ✅ Verify payment with Paystack
4. ✅ Add credits to user's balance
5. ✅ Update payment status
6. ✅ Return success response
7. ✅ Handle errors gracefully (no 500 errors)

---

## Temporary Workaround

Until backend is fixed, users can:

1. Go to: `http://frontend.com/payment/verify`
2. Enter payment reference
3. Manually verify payment

**But this is NOT acceptable for production** - automatic verification must work!

---

## Success Criteria

- ✅ No 500 errors from verify endpoint
- ✅ Credits automatically added after payment
- ✅ Payment status updated correctly
- ✅ User sees success message
- ✅ Works 100% of the time

---

**Status**: 🔴 BLOCKING PRODUCTION DEPLOYMENT  
**Severity**: CRITICAL  
**Impact**: HIGH - Users cannot purchase credits  
**Owner**: Backend Team  
**Frontend Status**: ✅ Complete and working  
**Backend Status**: ❌ Verify endpoint returning 500 error

---

**Next Steps**:
1. Backend team investigates 500 error
2. Backend team fixes verify endpoint
3. Test end-to-end with real payment
4. Deploy and monitor

---

**Last Updated**: November 7, 2025  
**Reported By**: Frontend Team  
**Assigned To**: Backend Team
