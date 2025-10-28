# 🔴 CRITICAL: Backend Endpoint Required - Update Customer on Draft Sale

**Issue**: Customer selection in POS not persisting to completed sales  
**Status**: ❌ **BLOCKING** - Frontend ready, awaiting backend implementation  
**Priority**: 🔴 **CRITICAL** - Core POS functionality broken  
**Date**: October 11, 2025  

---

## 🐛 The Problem

### Current Behavior (BROKEN) - AFFECTS ALL CUSTOMER ASSIGNMENTS

**Scenario 1: Creating New Customer**
1. User opens POS (SalesPage)
2. Backend creates draft sale with walk-in customer
3. User clicks "Create Customer" and adds "Fred Amugi"
4. Customer created successfully ✅
5. Frontend updates local state: `selectedCustomer = Fred Amugi`
6. User adds products to cart
7. User completes payment
8. **BUG**: Receipt shows "Walk-in Customer" instead of "Fred Amugi" ❌

**Scenario 2: Selecting Existing Customer**
1. User opens POS (SalesPage)
2. Backend creates draft sale with walk-in customer
3. User selects "John Doe" from customer dropdown
4. Frontend updates local state: `selectedCustomer = John Doe`
5. User adds products to cart
6. User completes payment
7. **BUG**: Receipt shows "Walk-in Customer" instead of "John Doe" ❌

**CRITICAL**: Whether you create a new customer OR select an existing customer from the dropdown, the backend sale NEVER gets updated - it ALWAYS shows walk-in customer on receipts.

**Expected Behavior:**
- When user creates OR selects a customer
- Backend sale should be updated with that customer
- Receipt should show correct customer name

**Root Cause:**
```python
# Current backend endpoint: PATCH /sales/api/sales/{id}/
class SaleViewSet:
    def update(self, request, pk=None):
        # Only allows updating these fields:
        allowed_fields = ['notes', 'discount_amount']
        
        # ❌ DOES NOT ALLOW: 'customer'
        # When frontend tries to update customer → silently ignored
```

---

## 📊 Evidence of Bug

### Backend API Response
```json
// PATCH /sales/api/sales/{sale_id}/
// Request body: { "customer": "uuid-of-fred-amugi" }

// Response: 200 OK
{
  "id": "sale-uuid",
  "customer": "walk-in-customer-uuid",  // ❌ NOT UPDATED!
  "notes": "",
  "discount_amount": "0.00"
}
```

### Frontend State vs Backend State
```typescript
// Frontend state (Redux):
{
  selectedCustomer: {
    id: "customer-uuid-fred",
    name: "Fred Amugi",
    phone: "4575467457646S"
  }
}

// Backend sale object:
{
  "customer": "walk-in-customer-uuid",  // ❌ WRONG!
  "customer_name": "Walk-in Customer"
}
```

### Completed Receipt
```
Receipt: REC-2025-001234
Customer: Walk-in Customer  // ❌ SHOULD BE "Fred Amugi"
```

---

## 🎯 Required Backend Implementation

### New Endpoint/Action Required

**Option 1: Add Custom Action to Sale ViewSet (Recommended)**

```python
# File: sales/views.py (or wherever SaleViewSet is defined)

from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

class SaleViewSet(viewsets.ModelViewSet):
    # ... existing code ...
    
    @action(detail=True, methods=['POST', 'PATCH'], url_path='update-customer')
    def update_customer(self, request, pk=None):
        """
        Update the customer on a DRAFT sale.
        
        Security:
        - Only allow updating customer on DRAFT sales
        - Validate customer belongs to same business
        - Prevent updating completed sales
        
        Request body:
        {
          "customer": "uuid-of-customer"  // Required
        }
        
        Returns: Updated sale object with new customer
        """
        sale = self.get_object()
        
        # 1. Security Check: Only allow on DRAFT sales
        if sale.status != 'DRAFT':
            return Response(
                {'error': 'Cannot update customer on completed sale'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 2. Get and validate customer
        customer_id = request.data.get('customer')
        if not customer_id:
            return Response(
                {'error': 'customer field is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 3. Ensure customer exists and belongs to same business
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
        
        # 4. Update the customer
        sale.customer = customer
        sale.save(update_fields=['customer'])
        
        # 5. Return updated sale
        serializer = self.get_serializer(sale)
        return Response(serializer.data)
```

**Resulting Endpoint:**
```
POST/PATCH /sales/api/sales/{sale_id}/update-customer/

Request Body:
{
  "customer": "uuid-of-selected-customer"
}

Response: 200 OK
{
  "id": "sale-uuid",
  "customer": "uuid-of-selected-customer",  // ✅ UPDATED!
  "customer_name": "Fred Amugi",
  "status": "DRAFT",
  ...full sale object...
}
```

---

**Option 2: Modify Existing Update Endpoint (Less Preferred)**

```python
# File: sales/views.py

class SaleViewSet(viewsets.ModelViewSet):
    
    def update(self, request, *args, **kwargs):
        """
        Modified to allow customer updates on DRAFT sales
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Allow customer update only on DRAFT sales
        if 'customer' in request.data:
            if instance.status != 'DRAFT':
                return Response(
                    {'error': 'Cannot update customer on completed sale'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate customer exists and belongs to business
            customer_id = request.data['customer']
            try:
                customer = Customer.objects.get(
                    id=customer_id,
                    business=instance.business
                )
            except Customer.DoesNotExist:
                return Response(
                    {'error': 'Invalid customer'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Continue with normal update
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(serializer.data)
    
    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)
```

**Why Option 1 is Better:**
- ✅ Clearer intent - specific action for customer updates
- ✅ Easier to add additional validation/logic
- ✅ Doesn't complicate existing update endpoint
- ✅ Self-documenting API (explicit `/update-customer/` path)
- ✅ Can add customer-specific business logic later

---

## 🔒 Security Considerations

### Critical Checks Required

1. **Only DRAFT Sales**
   ```python
   if sale.status != 'DRAFT':
       raise ValidationError('Cannot modify completed sale')
   ```

2. **Business Boundary Check**
   ```python
   if customer.business != sale.business:
       raise ValidationError('Customer does not belong to this business')
   ```

3. **Permission Check**
   ```python
   # User must have permission to modify sales
   if not request.user.has_perm('sales.change_sale'):
       raise PermissionDenied
   ```

4. **Audit Trail** (Optional but Recommended)
   ```python
   # Log customer changes for audit
   AuditLog.objects.create(
       action='CUSTOMER_UPDATED',
       sale=sale,
       old_customer=old_customer,
       new_customer=new_customer,
       changed_by=request.user
   )
   ```

---

## 🧪 Testing Requirements

### Test Cases Backend Should Implement

```python
# tests/test_update_customer.py

class TestUpdateCustomerEndpoint:
    
    def test_update_customer_on_draft_sale_success(self):
        """Should successfully update customer on DRAFT sale"""
        # Create DRAFT sale with walk-in customer
        # Create real customer
        # Call update-customer endpoint
        # Assert customer updated
        # Assert response includes updated customer details
    
    def test_update_customer_on_completed_sale_fails(self):
        """Should reject customer update on COMPLETED sale"""
        # Create COMPLETED sale
        # Try to update customer
        # Assert 400 error
        # Assert error message mentions completed sale
    
    def test_update_customer_wrong_business_fails(self):
        """Should reject customer from different business"""
        # Create sale for Business A
        # Create customer for Business B
        # Try to update sale with Business B customer
        # Assert 404 error
    
    def test_update_customer_nonexistent_fails(self):
        """Should reject invalid customer UUID"""
        # Create DRAFT sale
        # Try to update with non-existent UUID
        # Assert 404 error
    
    def test_update_customer_missing_field_fails(self):
        """Should reject request without customer field"""
        # Create DRAFT sale
        # Call endpoint with empty body
        # Assert 400 error
    
    def test_update_customer_preserves_other_fields(self):
        """Should only update customer, not other fields"""
        # Create DRAFT sale with items, notes, discount
        # Update customer
        # Assert items, notes, discount unchanged
```

---

## 📝 Frontend Integration (Ready to Deploy)

### Frontend Code Waiting for Backend

**File: `src/services/salesService.ts`**

```typescript
/**
 * Update the customer on a DRAFT sale
 * 
 * NEW ENDPOINT - Requires backend implementation
 */
export async function updateSaleCustomer(
  saleId: UUID,
  customerId: UUID
): Promise<Sale> {
  const response = await apiClient.patch<Sale>(
    `/sales/api/sales/${saleId}/update-customer/`,
    { customer: customerId }
  )
  return response.data
}
```

**File: `src/features/dashboard/pages/SalesPage.tsx`**

```typescript
// Handler 1: When customer selected from dropdown
const handleCustomerChange = async (customerId: UUID | null) => {
  setSelectedCustomer(customerId)
  dispatch(setCurrentCartCustomer(customerId))
  
  // NEW: Update backend if cart exists
  if (currentCart?.id && customerId) {
    try {
      const updatedSale = await updateSaleCustomer(currentCart.id, customerId)
      console.log('✅ Customer updated on backend:', updatedSale.customer_name)
    } catch (err) {
      console.error('❌ Failed to update customer on backend:', err)
      setError('Failed to update customer. Please try again.')
    }
  }
}

// Handler 2: When new customer is created
const handleCustomerCreated = async (customer: Customer) => {
  upsertCustomerOption({ id: customer.id, name: customer.name })
  setSelectedCustomer(customer.id)
  dispatch(setCurrentCartCustomer({ customerId: customer.id, customerName: customer.name }))
  
  // NEW: Update backend if cart exists
  if (currentCart?.id) {
    try {
      const updatedSale = await updateSaleCustomer(currentCart.id, customer.id)
      console.log('✅ Newly created customer updated on backend:', updatedSale.customer_name)
    } catch (err) {
      console.error('❌ Failed to update customer on backend:', err)
      setError('Customer created but failed to assign to sale. Please select from dropdown.')
    }
  }
}
```

**Status**: ✅ Code written for BOTH scenarios, commented out, waiting for backend

---

## 🚀 Deployment Checklist

### Backend Developer Tasks

- [ ] Implement `update-customer` action on SaleViewSet
- [ ] Add validation: only DRAFT sales
- [ ] Add validation: customer belongs to same business
- [ ] Add validation: customer exists
- [ ] Add tests (minimum 5 test cases above)
- [ ] Update API documentation
- [ ] Deploy to staging
- [ ] Notify frontend team when ready

### Frontend Developer Tasks (After Backend Ready)

- [ ] Uncomment `updateSaleCustomer()` service call
- [ ] Uncomment backend update in `handleCustomerChange()`
- [ ] Add error handling UI (toast/alert)
- [ ] Test with real backend
- [ ] Test error scenarios (completed sale, wrong business)
- [ ] Update documentation

---

## 📊 Expected Impact

### Before Fix
```
Customer Selection Flow:
1. User selects "Fred Amugi"
2. Frontend state: ✅ Fred Amugi
3. Backend sale: ❌ Walk-in Customer
4. Receipt shows: ❌ Walk-in Customer
```

### After Fix
```
Customer Selection Flow:
1. User selects "Fred Amugi"
2. Frontend state: ✅ Fred Amugi
3. API Call: PATCH /sales/{id}/update-customer/
4. Backend sale: ✅ Fred Amugi
5. Receipt shows: ✅ Fred Amugi
```

---

## 🔍 How to Verify Fix

### Manual Testing

```bash
# 1. Create a DRAFT sale (happens automatically in POS)
POST /sales/api/sales/
{
  "storefront": "storefront-uuid",
  "type": "WHOLESALE"
}
# Returns: { "id": "sale-123", "customer": "walk-in-uuid" }

# 2. Update the customer (NEW ENDPOINT)
PATCH /sales/api/sales/sale-123/update-customer/
{
  "customer": "customer-fred-uuid"
}
# Returns: { "id": "sale-123", "customer": "customer-fred-uuid" }

# 3. Verify customer persisted
GET /sales/api/sales/sale-123/
# Returns: { "customer": "customer-fred-uuid", "customer_name": "Fred Amugi" }

# 4. Complete the sale
POST /sales/api/sales/sale-123/payment/
{
  "amount": "25.00",
  "payment_type": "CASH"
}

# 5. Check receipt
GET /sales/api/sales/sale-123/
# Returns: { 
#   "customer_name": "Fred Amugi",  // ✅ CORRECT!
#   "receipt_number": "REC-2025-001234"
# }
```

### Automated Test

```python
def test_pos_customer_selection_flow():
    """Integration test: Customer selection persists through sale completion"""
    
    # Create customer
    customer = Customer.objects.create(
        business=business,
        name="Fred Amugi",
        phone="4575467457646S"
    )
    
    # Create DRAFT sale (simulating POS session start)
    sale = Sale.objects.create(
        business=business,
        storefront=storefront,
        type='WHOLESALE',
        status='DRAFT',
        customer=walk_in_customer  # Initially walk-in
    )
    
    # Update customer (simulating dropdown selection)
    url = f'/sales/api/sales/{sale.id}/update-customer/'
    response = client.patch(url, {'customer': str(customer.id)})
    assert response.status_code == 200
    
    # Verify customer updated
    sale.refresh_from_db()
    assert sale.customer == customer
    
    # Add items and complete sale
    CartItem.objects.create(sale=sale, product=product, quantity=10)
    complete_url = f'/sales/api/sales/{sale.id}/payment/'
    client.post(complete_url, {'amount': '25.00', 'payment_type': 'CASH'})
    
    # Final verification: Customer still correct
    sale.refresh_from_db()
    assert sale.customer == customer
    assert sale.status == 'COMPLETED'
    assert 'Fred Amugi' in sale.receipt_number or sale.customer_name == 'Fred Amugi'
```

---

## 📞 Communication

### Questions for Backend Team

1. **Preferred implementation**: Option 1 (custom action) or Option 2 (modify update)?
2. **Audit logging**: Should we log customer changes?
3. **Permissions**: Any specific permission checks needed beyond `change_sale`?
4. **Estimated completion**: When can this be deployed?

### Frontend Team Status

- ✅ Code written and ready
- ✅ Error handling prepared
- ✅ Tests identified
- ⏳ Waiting for backend endpoint
- 📅 Can deploy within 30 minutes of backend availability

---

## 🎯 Summary

**Problem**: Customer selection in POS doesn't persist to backend  
**Root Cause**: No backend endpoint to update customer on DRAFT sale  
**Solution**: Add `/update-customer/` action to Sale ViewSet  
**Complexity**: Low (30-45 minutes backend dev)  
**Priority**: CRITICAL - blocking core POS functionality  

**Backend Implementation Required:**
```python
@action(detail=True, methods=['POST', 'PATCH'], url_path='update-customer')
def update_customer(self, request, pk=None):
    # Only allow on DRAFT sales
    # Validate customer belongs to business
    # Update sale.customer
    # Return updated sale
```

**Frontend Status:** ✅ Ready and waiting

---

**Contact**: Frontend team ready to integrate immediately upon backend deployment  
**Estimated Total Time**: 30-45 min (backend) + 15 min (frontend integration) + 30 min (testing) = **1.5 hours total**
