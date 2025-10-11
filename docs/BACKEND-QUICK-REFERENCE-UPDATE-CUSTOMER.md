# 🚀 QUICK REFERENCE: Backend Developer Handoff

**For**: Backend Developer  
**From**: Frontend Team  
**Date**: October 11, 2025  
**Priority**: 🔴 CRITICAL - Blocking customer workflow

---

## 🎯 What We Need

**ONE NEW ENDPOINT**: Update customer on draft sale

**Why**: Customer assignment in POS doesn't persist to backend - ALL sales show "Walk-in Customer" regardless of whether you:
- ❌ Create a new customer (e.g., "Fred Amugi")
- ❌ Select existing customer from dropdown (e.g., "John Doe")

**Impact**: 100% of customer-specific sales are incorrectly assigned to walk-in customer

**Frontend Status**: ✅ Ready - code written for BOTH scenarios, waiting to be activated (15 min after your deployment)

---

## 📋 The Endpoint

### Specification

**URL**: `PATCH /sales/api/sales/{sale_id}/update-customer/`

**Request Body**:
```json
{
  "customer": "uuid-of-customer"
}
```

**Response** (200 OK):
```json
{
  "id": "sale-uuid",
  "customer": "customer-uuid",
  "customer_name": "Fred Amugi",
  "status": "DRAFT",
  ...rest of sale object...
}
```

**Errors**:
- `400`: Sale not in DRAFT status
- `404`: Customer not found or wrong business
- `400`: Missing customer field

---

## 💻 Implementation (30-45 min)

### Add to SaleViewSet

```python
# File: sales/views.py (or wherever SaleViewSet is)

from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

class SaleViewSet(viewsets.ModelViewSet):
    # ... existing code ...
    
    @action(detail=True, methods=['POST', 'PATCH'], url_path='update-customer')
    def update_customer(self, request, pk=None):
        """Update customer on DRAFT sale only"""
        sale = self.get_object()
        
        # 1. Only allow on DRAFT sales
        if sale.status != 'DRAFT':
            return Response(
                {'error': 'Cannot update customer on completed sale'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 2. Get customer ID
        customer_id = request.data.get('customer')
        if not customer_id:
            return Response(
                {'error': 'customer field is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 3. Validate customer exists and belongs to same business
        try:
            customer = Customer.objects.get(
                id=customer_id,
                business=sale.business
            )
        except Customer.DoesNotExist:
            return Response(
                {'error': 'Customer not found or does not belong to this business'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 4. Update customer
        sale.customer = customer
        sale.save(update_fields=['customer'])
        
        # 5. Return updated sale
        serializer = self.get_serializer(sale)
        return Response(serializer.data)
```

**That's it!** 50 lines of code.

---

## 🧪 Testing

### Test 1: Happy Path
```bash
# Create DRAFT sale
POST /sales/api/sales/
{"storefront": "uuid", "type": "WHOLESALE"}
# Returns: {"id": "sale-123", "customer": "walk-in-uuid"}

# Update customer
PATCH /sales/api/sales/sale-123/update-customer/
{"customer": "customer-fred-uuid"}
# Should return: {"customer": "customer-fred-uuid", "customer_name": "Fred Amugi"}

# Verify
GET /sales/api/sales/sale-123/
# Should still show: {"customer_name": "Fred Amugi"}
```

### Test 2: Prevent Updating Completed Sale
```bash
# Complete a sale first
POST /sales/api/sales/sale-456/complete/
{...payment data...}

# Try to update customer
PATCH /sales/api/sales/sale-456/update-customer/
{"customer": "customer-uuid"}
# Should return 400: "Cannot update customer on completed sale"
```

### Test 3: Prevent Wrong Business Customer
```bash
# Try to assign customer from Business B to sale from Business A
PATCH /sales/api/sales/sale-from-business-a/update-customer/
{"customer": "customer-from-business-b-uuid"}
# Should return 404: "Customer not found..."
```

### Test 4: Missing Customer Field
```bash
PATCH /sales/api/sales/sale-123/update-customer/
{}  # Empty body
# Should return 400: "customer field is required"
```

### Test 5: Integration Flow (Most Important)
```python
def test_pos_customer_selection_flow():
    """Simulates actual POS workflow"""
    # User creates customer
    customer = Customer.objects.create(name="Fred Amugi", business=business)
    
    # POS creates DRAFT sale
    sale = Sale.objects.create(business=business, status='DRAFT', customer=walk_in)
    
    # User selects customer from dropdown (THIS IS THE NEW ENDPOINT)
    response = client.patch(f'/sales/api/sales/{sale.id}/update-customer/', 
                           {'customer': str(customer.id)})
    assert response.status_code == 200
    
    # Verify customer updated
    sale.refresh_from_db()
    assert sale.customer == customer
    
    # Complete sale
    client.post(f'/sales/api/sales/{sale.id}/complete/', {...})
    
    # Verify customer still correct
    sale.refresh_from_db()
    assert sale.customer == customer  # NOT walk-in!
```

---

## ✅ Checklist

Before deploying:

- [ ] Endpoint added to SaleViewSet
- [ ] Only allows updating DRAFT sales
- [ ] Validates customer belongs to same business
- [ ] Returns updated sale with customer details
- [ ] Test 1 passes: Happy path
- [ ] Test 2 passes: Rejects completed sale
- [ ] Test 3 passes: Rejects wrong business
- [ ] Test 4 passes: Requires customer field
- [ ] Test 5 passes: Full integration flow
- [ ] Deployed to dev/staging
- [ ] Notify frontend team

---

## 📞 Handoff Communication

**When done, notify frontend team**:
```
✅ update-customer endpoint deployed to [staging/production]

Endpoint: PATCH /sales/api/sales/{id}/update-customer/
Status: Ready for integration
Tests: All 5 test cases passing

Example:
PATCH /sales/api/sales/abc-123/update-customer/
{"customer": "def-456"}
→ Returns: {"customer": "def-456", "customer_name": "Fred Amugi"}
```

**Frontend team will**:
- Uncomment 10 lines of code (5 min)
- Test end-to-end (10 min)
- Deploy to production (15 min)
- **Total**: 30 minutes to full deployment

---

## 📚 Full Documentation

If you need more details:

📁 **Complete Backend Guide**: `docs/BACKEND-REQUEST-UPDATE-CUSTOMER-ENDPOINT.md`
- Detailed problem analysis
- Security considerations
- Alternative implementation approaches
- More test examples
- Frontend integration details

---

## 🎯 Summary

**What**: Single endpoint to update customer on DRAFT sale  
**Why**: Fix customer selection in POS (currently broken)  
**How**: 50 lines of code + 5 tests  
**Time**: 30-45 minutes  
**Priority**: CRITICAL - blocking core feature  
**Frontend**: Ready and waiting  

**Questions?** Check full docs or contact frontend team.

---

## 🚀 Expected Flow After Fix

### Before (BROKEN) ❌
```
1. User selects "Fred Amugi"
2. Frontend state updates
3. Backend sale unchanged (still walk-in)
4. Sale completed
5. Receipt: "Walk-in Customer" ❌
```

### After (FIXED) ✅
```
1. User selects "Fred Amugi"
2. Frontend state updates
3. API: PATCH /update-customer/ ✅
4. Backend sale updated ✅
5. Sale completed
6. Receipt: "Fred Amugi" ✅
```

---

**Time to implement**: 30-45 minutes  
**Time to deploy**: +30 minutes (frontend activation)  
**Impact**: Fixes critical customer tracking bug  
**Risk**: Low - straightforward implementation
