# 📋 Credit Management Feature - Complete Backend Requirements

**Date:** January 7, 2025  
**Feature:** Credit Payment Tracking & Cash on Hand Calculation  
**For:** Backend Developer  
**Priority:** HIGH

---

## 🎯 Overview

This document consolidates **all backend requirements** for the Credit Management feature:

1. ✅ **Payment Tracking API** (Already Implemented)
2. 🆕 **Cash on Hand Calculation** (New Requirement)
3. 🆕 **Credit Management Filters** (Enhancement)

---

## 📦 Feature Breakdown

### 1. Payment Tracking System ✅ COMPLETE

**Status:** Already implemented and tested (10/10 tests passing)

**Endpoints:**
- `POST /sales/api/sales/{id}/record_payment/` ✅
- `GET /sales/api/sales/?payment_status=unpaid` ✅
- `GET /sales/api/sales/?payment_status=partial` ✅

**Fields on Sale Model:** ✅
- `status` (PENDING/PARTIAL/COMPLETED)
- `amount_paid`
- `amount_due`
- `payment_completion_percentage`
- `payments` (related Payment model)

**Reference:** See `CREDIT_SALES_PAYMENT_TRACKING.md`

---

### 2. Cash on Hand Calculation 🆕 NEW REQUIREMENT

#### Problem

Current `GET /sales/api/sales/summary/` shows **Total Profit** which includes unpaid credit sales. This doesn't reflect **actual cash available**.

#### Solution

Add 4 new fields to the summary endpoint:

```json
{
  // Existing
  "total_sales": "10000.00",
  "total_items_sold": 150,
  "total_profit": "2500.00",
  "average_sale_value": "66.67",
  
  // NEW ⬇️
  "outstanding_credit": "600.00",
  "cash_on_hand": "1900.00",
  "total_credit_sales": "3000.00",
  "unpaid_credit_count": 5
}
```

#### Calculations

```python
# Outstanding Credit = Profit from unpaid credit sales
outstanding_credit = Sale.objects.filter(
    payment_type='CREDIT',
    status__in=['PENDING', 'PARTIAL']
).aggregate(Sum('profit'))['profit__sum'] or Decimal('0')

# Cash on Hand = Total Profit - Outstanding Credit
cash_on_hand = total_profit - outstanding_credit

# Total Credit Sales = Amount still owed
total_credit_sales = Sale.objects.filter(
    payment_type='CREDIT',
    status__in=['PENDING', 'PARTIAL']
).aggregate(Sum('amount_due'))['amount_due__sum'] or Decimal('0')

# Count
unpaid_credit_count = Sale.objects.filter(
    payment_type='CREDIT',
    status__in=['PENDING', 'PARTIAL']
).count()
```

#### Implementation

**File:** `sales/views.py` or `sales/api/views.py`

```python
class SalesSummaryView(APIView):
    def get(self, request):
        # Base queryset with filters
        queryset = Sale.objects.filter(business=request.user.business)
        
        storefront_id = request.query_params.get('storefront')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        if storefront_id:
            queryset = queryset.filter(storefront_id=storefront_id)
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        # Use single aggregate query for efficiency
        summary = queryset.aggregate(
            total_sales=Sum('total_amount'),
            total_profit=Sum('profit'),
            total_items=Sum('items__quantity'),
            outstanding_credit=Sum(
                'profit',
                filter=Q(
                    payment_type='CREDIT',
                    status__in=['PENDING', 'PARTIAL']
                )
            ),
            total_credit_due=Sum(
                'amount_due',
                filter=Q(
                    payment_type='CREDIT',
                    status__in=['PENDING', 'PARTIAL']
                )
            )
        )
        
        # Extract and handle nulls
        total_profit = summary['total_profit'] or Decimal('0')
        outstanding_credit = summary['outstanding_credit'] or Decimal('0')
        
        # Calculate cash on hand
        cash_on_hand = total_profit - outstanding_credit
        
        # Count unpaid credit sales
        unpaid_credit_count = queryset.filter(
            payment_type='CREDIT',
            status__in=['PENDING', 'PARTIAL']
        ).count()
        
        # Calculate average
        count = queryset.count()
        average = (summary['total_sales'] or Decimal('0')) / count if count > 0 else Decimal('0')
        
        return Response({
            'total_sales': str(summary['total_sales'] or Decimal('0')),
            'total_items_sold': summary['total_items'] or 0,
            'total_profit': str(total_profit),
            'average_sale_value': str(average),
            # NEW FIELDS
            'outstanding_credit': str(outstanding_credit),
            'cash_on_hand': str(cash_on_hand),
            'total_credit_sales': str(summary['total_credit_due'] or Decimal('0')),
            'unpaid_credit_count': unpaid_credit_count,
        })
```

#### Testing

**File:** `sales/tests/test_summary.py`

```python
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model

class CashOnHandTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='test',
            password='test'
        )
        self.client.force_authenticate(self.user)
    
    def test_no_credit_sales(self):
        """Cash on hand equals total profit when no credit"""
        Sale.objects.create(
            business=self.user.business,
            payment_type='CASH',
            profit=Decimal('100.00'),
            total_amount=Decimal('500.00')
        )
        
        response = self.client.get('/sales/api/sales/summary/')
        
        self.assertEqual(response.data['total_profit'], '100.00')
        self.assertEqual(response.data['outstanding_credit'], '0.00')
        self.assertEqual(response.data['cash_on_hand'], '100.00')
        self.assertEqual(response.data['unpaid_credit_count'], 0)
    
    def test_with_unpaid_credit(self):
        """Cash on hand excludes unpaid credit profit"""
        # Cash sale
        Sale.objects.create(
            payment_type='CASH',
            profit=Decimal('100.00'),
            total_amount=Decimal('500.00')
        )
        
        # Unpaid credit
        Sale.objects.create(
            payment_type='CREDIT',
            status='PENDING',
            profit=Decimal('50.00'),
            total_amount=Decimal('300.00'),
            amount_due=Decimal('300.00')
        )
        
        response = self.client.get('/sales/api/sales/summary/')
        
        self.assertEqual(response.data['total_profit'], '150.00')
        self.assertEqual(response.data['outstanding_credit'], '50.00')
        self.assertEqual(response.data['cash_on_hand'], '100.00')
        self.assertEqual(response.data['total_credit_sales'], '300.00')
        self.assertEqual(response.data['unpaid_credit_count'], 1)
    
    def test_partial_payment_still_outstanding(self):
        """Partial payments still count as outstanding"""
        Sale.objects.create(
            payment_type='CREDIT',
            status='PARTIAL',
            profit=Decimal('100.00'),
            total_amount=Decimal('500.00'),
            amount_paid=Decimal('300.00'),
            amount_due=Decimal('200.00')
        )
        
        response = self.client.get('/sales/api/sales/summary/')
        
        # Full profit still outstanding
        self.assertEqual(response.data['outstanding_credit'], '100.00')
        self.assertEqual(response.data['cash_on_hand'], '0.00')
        self.assertEqual(response.data['total_credit_sales'], '200.00')
    
    def test_completed_credit_in_cash(self):
        """Completed credit sales count as cash"""
        Sale.objects.create(
            payment_type='CREDIT',
            status='COMPLETED',
            profit=Decimal('100.00'),
            total_amount=Decimal('500.00'),
            amount_paid=Decimal('500.00'),
            amount_due=Decimal('0.00')
        )
        
        response = self.client.get('/sales/api/sales/summary/')
        
        self.assertEqual(response.data['total_profit'], '100.00')
        self.assertEqual(response.data['outstanding_credit'], '0.00')
        self.assertEqual(response.data['cash_on_hand'], '100.00')
        self.assertEqual(response.data['unpaid_credit_count'], 0)
```

**Reference:** Full details in `BACKEND-CASH-ON-HAND-CALCULATION.md`

---

### 3. Credit Management Filters 🆕 ENHANCEMENT

#### Additional Filter Parameters

Enhance `GET /sales/api/sales/` with credit-specific filters:

```python
class SaleViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # EXISTING FILTERS ✅
        payment_status = self.request.query_params.get('payment_status')
        payment_type = self.request.query_params.get('payment_type')
        
        if payment_status:
            if payment_status == 'unpaid':
                queryset = queryset.filter(status='PENDING')
            elif payment_status == 'partial':
                queryset = queryset.filter(status='PARTIAL')
            elif payment_status == 'completed':
                queryset = queryset.filter(status='COMPLETED')
        
        # NEW FILTERS ⬇️
        
        # Filter by days outstanding
        days_outstanding = self.request.query_params.get('days_outstanding')
        if days_outstanding:
            cutoff_date = timezone.now() - timedelta(days=int(days_outstanding))
            queryset = queryset.filter(
                payment_type='CREDIT',
                status__in=['PENDING', 'PARTIAL'],
                created_at__lte=cutoff_date
            )
        
        # Filter by minimum amount due
        min_amount_due = self.request.query_params.get('min_amount_due')
        if min_amount_due:
            queryset = queryset.filter(
                amount_due__gte=Decimal(min_amount_due)
            )
        
        # Filter by maximum amount due
        max_amount_due = self.request.query_params.get('max_amount_due')
        if max_amount_due:
            queryset = queryset.filter(
                amount_due__lte=Decimal(max_amount_due)
            )
        
        # Filter by customer
        customer_id = self.request.query_params.get('customer_id')
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        
        # Has outstanding balance (convenience filter)
        has_outstanding = self.request.query_params.get('has_outstanding_balance')
        if has_outstanding == 'true':
            queryset = queryset.filter(
                payment_type='CREDIT',
                status__in=['PENDING', 'PARTIAL'],
                amount_due__gt=0
            )
        
        return queryset
```

#### New Filter Examples

```bash
# Get all overdue (over 30 days)
GET /sales/api/sales/?payment_type=CREDIT&days_outstanding=30

# Get high-value unpaid (over $1000)
GET /sales/api/sales/?payment_status=unpaid&min_amount_due=1000

# Get specific customer's credit
GET /sales/api/sales/?payment_type=CREDIT&customer_id=123

# Get all with outstanding balance
GET /sales/api/sales/?has_outstanding_balance=true
```

---

## 📋 Complete Implementation Checklist

### Phase 1: Cash on Hand (2-3 hours)

**Backend Tasks:**
- [ ] Update `SalesSummaryView` to add 4 new fields
- [ ] Implement calculation logic
- [ ] Write 5+ unit tests
- [ ] Test with existing data
- [ ] Update API documentation/swagger

**Files to Modify:**
- `sales/views.py` or `sales/api/views.py` (summary view)
- `sales/tests/test_summary.py` (new tests)
- API documentation

**New Response Fields:**
```json
{
  "outstanding_credit": "600.00",
  "cash_on_hand": "1900.00",
  "total_credit_sales": "3000.00",
  "unpaid_credit_count": 5
}
```

### Phase 2: Enhanced Filters (1-2 hours)

**Backend Tasks:**
- [ ] Add `days_outstanding` filter
- [ ] Add `min_amount_due` filter
- [ ] Add `max_amount_due` filter
- [ ] Add `customer_id` filter
- [ ] Add `has_outstanding_balance` filter
- [ ] Write tests for each filter
- [ ] Update API documentation

**Files to Modify:**
- `sales/api/views.py` (viewset get_queryset)
- `sales/tests/test_filters.py` (new tests)

### Phase 3: Documentation (30 min)

**Backend Tasks:**
- [ ] Update API documentation
- [ ] Add request/response examples
- [ ] Document all new filters
- [ ] Update changelog

---

## 🧪 Testing Strategy

### Unit Tests Required

**Cash on Hand:**
1. ✅ No credit sales → cash_on_hand = total_profit
2. ✅ All unpaid credit → cash_on_hand = 0
3. ✅ Mixed sales → cash_on_hand = cash profit only
4. ✅ Partial payment → still outstanding
5. ✅ Completed payment → now cash
6. ✅ Date filter → only filtered sales counted

**Filters:**
1. ✅ Days outstanding filter
2. ✅ Min/max amount filters
3. ✅ Customer filter
4. ✅ Has outstanding balance filter
5. ✅ Combined filters

### Integration Tests

```python
def test_full_credit_workflow():
    """Test complete workflow from sale to payment"""
    # 1. Create unpaid credit sale
    sale = create_credit_sale(total=1000, profit=200)
    
    summary = get_summary()
    assert summary['cash_on_hand'] == '0.00'
    assert summary['outstanding_credit'] == '200.00'
    
    # 2. Record partial payment
    record_payment(sale, 500)
    
    summary = get_summary()
    assert summary['outstanding_credit'] == '200.00'  # Still outstanding
    
    # 3. Complete payment
    record_payment(sale, 500)
    
    summary = get_summary()
    assert summary['cash_on_hand'] == '200.00'  # Now available
    assert summary['outstanding_credit'] == '0.00'
```

---

## 📊 Database Performance

### Optimization Tips

```python
# Use aggregate for single query
summary = queryset.aggregate(
    total_profit=Sum('profit'),
    outstanding_credit=Sum(
        'profit',
        filter=Q(payment_type='CREDIT', status__in=['PENDING', 'PARTIAL'])
    )
)

# Add index for frequent filters
class Sale(models.Model):
    class Meta:
        indexes = [
            models.Index(fields=['payment_type', 'status']),
            models.Index(fields=['created_at', 'status']),
            models.Index(fields=['customer', 'status']),
        ]
```

---

## 📱 API Documentation Examples

### Sales Summary Endpoint

**Endpoint:** `GET /sales/api/sales/summary/`

**Query Parameters:**
- `storefront` (optional): Filter by storefront ID
- `date_from` (optional): Start date (ISO format)
- `date_to` (optional): End date (ISO format)

**Response:**
```json
{
  "total_sales": "10000.00",
  "total_items_sold": 150,
  "total_profit": "2500.00",
  "average_sale_value": "66.67",
  "outstanding_credit": "600.00",
  "cash_on_hand": "1900.00",
  "total_credit_sales": "3000.00",
  "unpaid_credit_count": 5
}
```

**Example Request:**
```bash
# Get summary for specific date range
GET /sales/api/sales/summary/?date_from=2025-01-01&date_to=2025-01-07

# Get summary for specific storefront
GET /sales/api/sales/summary/?storefront=uuid-here
```

### Sales List with Filters

**Endpoint:** `GET /sales/api/sales/`

**New Query Parameters:**
- `days_outstanding` (integer): Filter sales older than X days (credit only)
- `min_amount_due` (decimal): Minimum amount owed
- `max_amount_due` (decimal): Maximum amount owed
- `customer_id` (uuid): Filter by customer
- `has_outstanding_balance` (boolean): Only sales with unpaid balance

**Example Requests:**
```bash
# Get credit sales over 30 days old
GET /sales/api/sales/?payment_type=CREDIT&days_outstanding=30

# Get unpaid credit sales over $500
GET /sales/api/sales/?payment_status=unpaid&min_amount_due=500

# Get all sales with outstanding balance
GET /sales/api/sales/?has_outstanding_balance=true

# Get specific customer's unpaid credit
GET /sales/api/sales/?customer_id=uuid&payment_status=unpaid
```

---

## ⚠️ Important Notes

### 1. Decimal Precision

**Always use Decimal for money:**
```python
from decimal import Decimal

# Good ✅
amount = Decimal('100.00')

# Bad ❌
amount = 100.0  # Float causes rounding errors
```

### 2. Status Logic

**Outstanding Credit Includes:**
- ✅ PENDING (not paid at all)
- ✅ PARTIAL (partially paid)

**Cash on Hand Includes:**
- ✅ COMPLETED credit sales
- ✅ All CASH/CARD/MOBILE_MONEY sales

### 3. Date Filters

**Apply to ALL calculations:**
```python
# When date filter applied, outstanding credit should only
# count sales within that date range
if date_from:
    queryset = queryset.filter(created_at__gte=date_from)
```

### 4. Multi-Storefront

**Filter by storefront:**
```python
# Each storefront should have separate cash on hand calculation
if storefront_id:
    queryset = queryset.filter(storefront_id=storefront_id)
```

---

## 🎯 Acceptance Criteria

### Must Have:

✅ **Summary Endpoint:**
- Returns `outstanding_credit`
- Returns `cash_on_hand`
- Returns `total_credit_sales`
- Returns `unpaid_credit_count`
- All calculations accurate
- Respects date/storefront filters
- Handles edge cases (no sales, all paid, etc.)

✅ **Filters:**
- `days_outstanding` works correctly
- `min_amount_due` / `max_amount_due` work
- `customer_id` filter works
- `has_outstanding_balance` filter works
- Can combine multiple filters

✅ **Testing:**
- All unit tests pass
- Integration tests pass
- Manual testing completed
- Edge cases handled

✅ **Documentation:**
- API docs updated
- Code comments added
- Changelog updated

---

## 🚀 Deployment Plan

### Pre-Deployment

1. Run all tests locally
2. Test with production-like data
3. Review code changes
4. Update API documentation

### Deployment

1. Deploy to staging
2. Run smoke tests
3. Verify with real data
4. Deploy to production
5. Monitor for errors

### Post-Deployment

1. Verify summary endpoint
2. Test all filters
3. Check performance
4. Gather user feedback

---

## 📚 Documentation References

**For Backend Developer:**
1. **BACKEND-CASH-ON-HAND-CALCULATION.md** - Detailed calculation logic
2. **CREDIT_SALES_PAYMENT_TRACKING.md** - Payment tracking system (already implemented)
3. This document - Complete requirements overview

**For Frontend Developer:**
4. **ACCOUNTS-RECEIVABLE-IMPLEMENTATION.md** - Frontend UI implementation
5. **CREDIT-PAYMENT-FRONTEND-GUIDE.md** - Frontend API integration

---

## 📞 Questions?

**Contact:** Frontend Team (for UI clarification) or Product Owner (for business logic)

**Priority:** HIGH - This is critical for accurate financial reporting

**Timeline:** 3-5 hours total implementation time

---

## ✅ Summary

### What to Implement:

1. **Add 4 fields to summary endpoint:**
   - `outstanding_credit` (profit from unpaid credit)
   - `cash_on_hand` (total_profit - outstanding_credit)
   - `total_credit_sales` (amount customers owe)
   - `unpaid_credit_count` (number of unpaid sales)

2. **Add 5 new filters to sales endpoint:**
   - `days_outstanding` (overdue filter)
   - `min_amount_due` / `max_amount_due` (amount range)
   - `customer_id` (customer filter)
   - `has_outstanding_balance` (convenience filter)

3. **Write comprehensive tests** for all new features

**Impact:** Users will see **actual available cash** vs **money owed to them**

**Priority:** HIGH 🔴

---

**Backend Developer: All requirements are documented. Ready to implement!** 💪
