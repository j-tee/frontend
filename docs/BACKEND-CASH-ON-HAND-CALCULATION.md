# 💰 Cash on Hand Calculation - Backend Requirements

**Date:** January 7, 2025  
**Feature:** Actual Cash on Hand Tracking  
**Priority:** HIGH  
**Backend Developer:** Required Implementation

---

## 🎯 Problem Statement

### Current Situation

The Sales History page shows **Total Profit** in the financial summary, but this includes **credit sales that haven't been paid yet**. This gives an **inaccurate picture of actual cash available**.

### Example Scenario

```
Total Sales: $10,000
Total Profit: $2,500

BUT...
- 5 credit sales totaling $3,000 (unpaid)
- Profit from those credit sales: $600

Actual Cash on Hand should be: $2,500 - $600 = $1,900
```

### User Need

Users need to see:
1. **Total Profit** (includes all sales)
2. **Outstanding Credit** (money owed but not received)
3. **Cash on Hand** (actual money available = Total Profit - Outstanding Credit)

---

## 📋 Required Backend Changes

### 1. Add New Fields to Sales Summary Response

**Endpoint:** `GET /sales/api/sales/summary/`

**Current Response:**
```json
{
  "total_sales": "10000.00",
  "total_items_sold": 150,
  "total_profit": "2500.00",
  "average_sale_value": "66.67"
}
```

**Required New Response:**
```json
{
  "total_sales": "10000.00",
  "total_items_sold": 150,
  "total_profit": "2500.00",
  "average_sale_value": "66.67",
  
  // NEW FIELDS ⬇️
  "outstanding_credit": "600.00",        // Profit from unpaid credit sales
  "cash_on_hand": "1900.00",             // total_profit - outstanding_credit
  "total_credit_sales": "3000.00",       // Total amount of unpaid credit sales
  "unpaid_credit_count": 5               // Number of unpaid credit sales
}
```

---

## 🔧 Implementation Details

### Backend Logic (Python/Django)

```python
# In sales/views.py or sales/api/views.py

from django.db.models import Sum, Count, Q, F, DecimalField
from decimal import Decimal

class SalesSummaryView(APIView):
    def get(self, request):
        # Get query parameters
        storefront_id = request.query_params.get('storefront')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        # Base queryset
        queryset = Sale.objects.filter(business=request.user.business)
        
        if storefront_id:
            queryset = queryset.filter(storefront_id=storefront_id)
        
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        # EXISTING CALCULATIONS
        total_sales = queryset.aggregate(
            total=Sum('total_amount')
        )['total'] or Decimal('0')
        
        total_items_sold = queryset.aggregate(
            total=Sum('items__quantity')
        )['total'] or 0
        
        total_profit = queryset.aggregate(
            total=Sum('profit')
        )['total'] or Decimal('0')
        
        average_sale_value = (
            total_sales / queryset.count() if queryset.count() > 0 
            else Decimal('0')
        )
        
        # NEW CALCULATIONS ⬇️
        
        # Get unpaid credit sales (PENDING status or has outstanding balance)
        unpaid_credit_sales = queryset.filter(
            payment_type='CREDIT',
            status__in=['PENDING', 'PARTIAL']
        )
        
        # Calculate outstanding credit (profit from unpaid sales)
        outstanding_credit_profit = unpaid_credit_sales.aggregate(
            total=Sum('profit')
        )['total'] or Decimal('0')
        
        # Calculate total amount of unpaid credit sales
        total_credit_sales_amount = unpaid_credit_sales.aggregate(
            total=Sum('amount_due')  # Only count what's still owed
        )['total'] or Decimal('0')
        
        # Count unpaid credit sales
        unpaid_credit_count = unpaid_credit_sales.count()
        
        # Calculate actual cash on hand
        cash_on_hand = total_profit - outstanding_credit_profit
        
        return Response({
            # Existing fields
            'total_sales': str(total_sales),
            'total_items_sold': total_items_sold,
            'total_profit': str(total_profit),
            'average_sale_value': str(average_sale_value),
            
            # New fields
            'outstanding_credit': str(outstanding_credit_profit),
            'cash_on_hand': str(cash_on_hand),
            'total_credit_sales': str(total_credit_sales_amount),
            'unpaid_credit_count': unpaid_credit_count,
        })
```

---

## 🧮 Calculation Formulas

### Outstanding Credit (Profit)

```python
outstanding_credit = Sum(
    profit from sales where 
    payment_type = 'CREDIT' AND 
    (status = 'PENDING' OR status = 'PARTIAL')
)
```

### Cash on Hand

```python
cash_on_hand = total_profit - outstanding_credit
```

### Total Credit Sales Amount

```python
total_credit_sales = Sum(
    amount_due from sales where 
    payment_type = 'CREDIT' AND 
    (status = 'PENDING' OR status = 'PARTIAL')
)
```

---

## 📊 Example Calculations

### Scenario 1: Simple Case

**Sales Data:**
```
Sale 1: CASH    - Total: $500, Profit: $100
Sale 2: CREDIT  - Total: $300, Profit: $60  (PENDING)
Sale 3: CASH    - Total: $200, Profit: $40
```

**Calculation:**
```python
total_sales = $1,000
total_profit = $200
outstanding_credit = $60      # Only Sale 2
cash_on_hand = $200 - $60 = $140
```

### Scenario 2: Partial Payments

**Sales Data:**
```
Sale 1: CASH    - Total: $500,  Profit: $100
Sale 2: CREDIT  - Total: $400,  Profit: $80   (PARTIAL: Paid $200, Due $200)
Sale 3: CREDIT  - Total: $300,  Profit: $60   (PENDING: Paid $0, Due $300)
Sale 4: CREDIT  - Total: $500,  Profit: $100  (COMPLETED: Fully paid)
```

**Calculation:**
```python
total_sales = $1,700
total_profit = $340

# Outstanding credit from PARTIAL and PENDING only
outstanding_credit = $80 + $60 = $140

cash_on_hand = $340 - $140 = $200

# Total unpaid amount
total_credit_sales = $200 + $300 = $500

unpaid_credit_count = 2  # Sales 2 and 3
```

---

## 🔍 Edge Cases to Handle

### 1. No Credit Sales

```python
if unpaid_credit_count == 0:
    outstanding_credit = Decimal('0')
    cash_on_hand = total_profit
    total_credit_sales = Decimal('0')
```

### 2. All Credit Sales Paid

```python
# Only count PENDING and PARTIAL status
# COMPLETED credit sales should NOT affect cash_on_hand
```

### 3. Negative Profit Sales

```python
# Handle sales with negative profit (returns, discounts)
# Should still be included in calculation
```

### 4. Date Range Filters

```python
# When filtering by date range:
# - Only include sales within the range
# - Only count unpaid credit from those sales
# - Don't include credit from outside the range
```

---

## ✅ Testing Requirements

### Unit Tests

```python
class CashOnHandCalculationTest(TestCase):
    def test_cash_on_hand_no_credit_sales(self):
        """Test cash on hand equals total profit when no credit sales"""
        # Create 3 cash sales
        create_sale(payment_type='CASH', profit=100)
        create_sale(payment_type='CASH', profit=50)
        create_sale(payment_type='CASH', profit=75)
        
        response = self.client.get('/sales/api/sales/summary/')
        
        self.assertEqual(response.data['total_profit'], '225.00')
        self.assertEqual(response.data['outstanding_credit'], '0.00')
        self.assertEqual(response.data['cash_on_hand'], '225.00')
    
    def test_cash_on_hand_with_unpaid_credit(self):
        """Test cash on hand excludes unpaid credit profit"""
        # Cash sales
        create_sale(payment_type='CASH', profit=100)
        
        # Unpaid credit
        create_sale(payment_type='CREDIT', status='PENDING', profit=50)
        
        response = self.client.get('/sales/api/sales/summary/')
        
        self.assertEqual(response.data['total_profit'], '150.00')
        self.assertEqual(response.data['outstanding_credit'], '50.00')
        self.assertEqual(response.data['cash_on_hand'], '100.00')
    
    def test_cash_on_hand_with_partial_payment(self):
        """Test cash on hand with partially paid credit sale"""
        # Partially paid credit sale
        sale = create_sale(
            payment_type='CREDIT',
            total_amount=500,
            profit=100,
            status='PARTIAL',
            amount_paid=300,
            amount_due=200
        )
        
        response = self.client.get('/sales/api/sales/summary/')
        
        # Full profit is outstanding until fully paid
        self.assertEqual(response.data['outstanding_credit'], '100.00')
        self.assertEqual(response.data['cash_on_hand'], '0.00')
    
    def test_cash_on_hand_completed_credit_included(self):
        """Test completed credit sales are included in cash on hand"""
        # Completed credit sale (fully paid)
        create_sale(
            payment_type='CREDIT',
            status='COMPLETED',
            profit=100
        )
        
        response = self.client.get('/sales/api/sales/summary/')
        
        self.assertEqual(response.data['total_profit'], '100.00')
        self.assertEqual(response.data['outstanding_credit'], '0.00')
        self.assertEqual(response.data['cash_on_hand'], '100.00')
    
    def test_cash_on_hand_with_date_filter(self):
        """Test cash on hand calculation with date filters"""
        # Create sales on different dates
        old_sale = create_sale(
            date='2025-01-01',
            payment_type='CREDIT',
            status='PENDING',
            profit=50
        )
        
        new_sale = create_sale(
            date='2025-01-07',
            payment_type='CREDIT',
            status='PENDING',
            profit=30
        )
        
        # Filter for only new sale
        response = self.client.get(
            '/sales/api/sales/summary/',
            {'date_from': '2025-01-07'}
        )
        
        # Should only include new sale
        self.assertEqual(response.data['outstanding_credit'], '30.00')
        self.assertEqual(response.data['unpaid_credit_count'], 1)
```

### Integration Tests

```python
def test_full_workflow(self):
    """Test complete workflow from sale to payment"""
    # 1. Create credit sale
    sale = create_sale(
        payment_type='CREDIT',
        total_amount=1000,
        profit=200,
        status='PENDING'
    )
    
    summary = get_summary()
    assert summary['outstanding_credit'] == '200.00'
    assert summary['cash_on_hand'] == '0.00'
    
    # 2. Record partial payment
    record_payment(sale, amount=500)
    
    summary = get_summary()
    assert sale.status == 'PARTIAL'
    assert summary['outstanding_credit'] == '200.00'  # Still outstanding
    
    # 3. Complete payment
    record_payment(sale, amount=500)
    
    summary = get_summary()
    assert sale.status == 'COMPLETED'
    assert summary['outstanding_credit'] == '0.00'
    assert summary['cash_on_hand'] == '200.00'  # Now available
```

---

## 🎨 Frontend Display (Reference)

The frontend will display this in the Sales History page:

```tsx
<Card>
  <Card.Header>Financial Summary</Card.Header>
  <Card.Body>
    <Row>
      <Col md={3}>
        <h6>Total Profit</h6>
        <h4>{formatCurrency(summary.total_profit)}</h4>
        <small className="text-muted">All sales</small>
      </Col>
      
      <Col md={3}>
        <h6>Outstanding Credit</h6>
        <h4 className="text-warning">
          {formatCurrency(summary.outstanding_credit)}
        </h4>
        <small className="text-muted">
          {summary.unpaid_credit_count} unpaid sales
        </small>
      </Col>
      
      <Col md={3}>
        <h6>Cash on Hand</h6>
        <h4 className="text-success">
          {formatCurrency(summary.cash_on_hand)}
        </h4>
        <small className="text-muted">Actual available cash</small>
      </Col>
      
      <Col md={3}>
        <h6>Unpaid Credit</h6>
        <h4 className="text-danger">
          {formatCurrency(summary.total_credit_sales)}
        </h4>
        <small className="text-muted">Amount owed by customers</small>
      </Col>
    </Row>
  </Card.Body>
</Card>
```

---

## 📝 API Response Schema

### Updated Summary Response

```typescript
interface SalesSummary {
  // Existing fields
  total_sales: string          // Total revenue from all sales
  total_items_sold: number     // Total quantity of items sold
  total_profit: string         // Total profit from all sales (includes unpaid)
  average_sale_value: string   // Average value per sale
  
  // NEW FIELDS
  outstanding_credit: string   // Profit from unpaid credit sales
  cash_on_hand: string        // Actual available cash (total_profit - outstanding_credit)
  total_credit_sales: string  // Total amount owed by customers
  unpaid_credit_count: number // Number of unpaid credit sales
}
```

---

## 🚀 Migration Plan

### Phase 1: Backend Implementation (2-3 hours)

1. **Update summary endpoint** with new fields
2. **Write unit tests** for calculations
3. **Test with real data** (existing sales)
4. **Update API documentation**

### Phase 2: Frontend Integration (1-2 hours)

1. **Update TypeScript interfaces**
2. **Update SalesHistory component** to display new fields
3. **Add tooltips** explaining the difference
4. **Test with various scenarios**

---

## ⚠️ Important Considerations

### 1. Performance

```python
# Use select_related and aggregate for efficiency
queryset = Sale.objects.filter(
    business=request.user.business
).select_related('storefront').prefetch_related('items')

# Single query with aggregation
summary = queryset.aggregate(
    total_sales=Sum('total_amount'),
    total_profit=Sum('profit'),
    outstanding_credit=Sum(
        'profit',
        filter=Q(
            payment_type='CREDIT',
            status__in=['PENDING', 'PARTIAL']
        )
    )
)
```

### 2. Decimal Precision

```python
# Always use Decimal for money calculations
from decimal import Decimal

outstanding_credit = Decimal('0.00')
cash_on_hand = Decimal('0.00')

# Convert strings to Decimal for calculations
total_profit = Decimal(str(total_profit or 0))
```

### 3. Null Safety

```python
# Handle cases where there are no sales
outstanding_credit = summary.get('outstanding_credit') or Decimal('0')
cash_on_hand = total_profit - outstanding_credit
```

---

## 📊 Business Logic Rules

### What Counts as "Outstanding Credit"?

✅ **INCLUDED:**
- Credit sales with status = 'PENDING' (not paid at all)
- Credit sales with status = 'PARTIAL' (partially paid)

❌ **EXCLUDED:**
- Credit sales with status = 'COMPLETED' (fully paid)
- Cash sales (payment_type = 'CASH')
- Card sales (payment_type = 'CARD')
- Mobile money sales (payment_type = 'MOBILE_MONEY')

### When Does Credit Move to "Cash on Hand"?

```
PENDING → Record Payment → PARTIAL → Still Outstanding
PARTIAL → Complete Payment → COMPLETED → Now Cash on Hand
```

Only when status = 'COMPLETED' does the profit become "cash on hand"

---

## ✅ Acceptance Criteria

### Backend Must:

- [ ] Add 4 new fields to summary response
- [ ] Calculate outstanding credit correctly
- [ ] Calculate cash on hand correctly
- [ ] Handle edge cases (no credit, all paid, negatives)
- [ ] Work with date range filters
- [ ] Work with storefront filters
- [ ] Pass all unit tests
- [ ] Return proper decimal precision (2 places)
- [ ] Handle null/zero cases gracefully

### Response Must Include:

- [ ] `outstanding_credit` (profit from unpaid credit)
- [ ] `cash_on_hand` (total_profit - outstanding_credit)
- [ ] `total_credit_sales` (total amount owed)
- [ ] `unpaid_credit_count` (number of unpaid sales)

---

## 🧪 Manual Testing Checklist

### Test Scenarios:

1. **No Credit Sales**
   - Create only cash sales
   - Verify: `cash_on_hand == total_profit`
   - Verify: `outstanding_credit == 0`

2. **All Credit Unpaid**
   - Create only unpaid credit sales
   - Verify: `cash_on_hand == 0`
   - Verify: `outstanding_credit == total_profit`

3. **Mixed Sales**
   - Create cash + unpaid credit
   - Verify: `cash_on_hand = cash_profit only`
   - Verify: `outstanding_credit = credit_profit`

4. **Partial Payment**
   - Create credit sale, pay 50%
   - Verify: Still counts as outstanding
   - Pay remaining 50%
   - Verify: Now counts as cash on hand

5. **Date Filter**
   - Create sales on different dates
   - Apply date filter
   - Verify: Only filtered sales counted

---

## 📚 Related Documentation

- **Payment Tracking:** `CREDIT_SALES_PAYMENT_TRACKING.md`
- **Sales API:** Backend sales API documentation
- **Frontend Guide:** `ACCOUNTS-RECEIVABLE-IMPLEMENTATION.md`

---

## 🎯 Summary

**Goal:** Show users the **actual cash they have** vs **money owed to them**

**Solution:** Add 4 new fields to summary endpoint:
1. `outstanding_credit` - Profit from unpaid credit
2. `cash_on_hand` - Actual available cash
3. `total_credit_sales` - Total amount customers owe
4. `unpaid_credit_count` - Number of unpaid sales

**Formula:**
```
Cash on Hand = Total Profit - Outstanding Credit
```

**Priority:** HIGH - Critical for accurate financial reporting

---

**Backend Developer: Please implement these changes to the sales summary endpoint.** 💰
