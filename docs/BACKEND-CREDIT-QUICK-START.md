# 📋 Credit Management - Quick Summary for Backend Developer

**Date:** January 7, 2025  
**Read Time:** 2 minutes  
**Full Docs:** See BACKEND-CREDIT-MANAGEMENT-REQUIREMENTS.md

---

## 🎯 What You Need to Do

Add **4 new fields** to the sales summary endpoint and **5 new filters** to the sales list endpoint.

---

## 1️⃣ Cash on Hand Calculation (NEW)

### Endpoint
`GET /sales/api/sales/summary/`

### Add These Fields

```json
{
  // Existing fields stay
  "total_profit": "2500.00",
  
  // ADD THESE ⬇️
  "outstanding_credit": "600.00",     // Profit from unpaid credit sales
  "cash_on_hand": "1900.00",          // total_profit - outstanding_credit
  "total_credit_sales": "3000.00",    // Amount customers owe
  "unpaid_credit_count": 5            // Number of unpaid credit sales
}
```

### The Logic

```python
# Outstanding Credit = Profit from unpaid credit
outstanding_credit = Sale.objects.filter(
    payment_type='CREDIT',
    status__in=['PENDING', 'PARTIAL']
).aggregate(Sum('profit'))['profit__sum'] or Decimal('0')

# Cash on Hand = Total Profit - Outstanding Credit
cash_on_hand = total_profit - outstanding_credit
```

### Why?

**Problem:** Total Profit includes credit sales that haven't been paid yet.  
**Solution:** Show actual cash available by subtracting outstanding credit.

**Example:**
```
Total Profit: $2,500
Outstanding Credit: $600 (from unpaid credit sales)
Cash on Hand: $1,900 ← The money you actually have
```

---

## 2️⃣ Enhanced Filters (NEW)

### Endpoint
`GET /sales/api/sales/`

### Add These Filters

```python
# Filter by days outstanding (overdue sales)
?days_outstanding=30  # Sales older than 30 days

# Filter by amount range
?min_amount_due=500&max_amount_due=2000

# Filter by customer
?customer_id=uuid-here

# Filter sales with outstanding balance
?has_outstanding_balance=true
```

### Implementation

```python
class SaleViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Days outstanding filter
        days = self.request.query_params.get('days_outstanding')
        if days:
            cutoff = timezone.now() - timedelta(days=int(days))
            queryset = queryset.filter(
                payment_type='CREDIT',
                status__in=['PENDING', 'PARTIAL'],
                created_at__lte=cutoff
            )
        
        # Min/max amount filters
        min_amt = self.request.query_params.get('min_amount_due')
        if min_amt:
            queryset = queryset.filter(amount_due__gte=Decimal(min_amt))
        
        max_amt = self.request.query_params.get('max_amount_due')
        if max_amt:
            queryset = queryset.filter(amount_due__lte=Decimal(max_amt))
        
        # Customer filter
        customer_id = self.request.query_params.get('customer_id')
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        
        # Outstanding balance filter
        if self.request.query_params.get('has_outstanding_balance') == 'true':
            queryset = queryset.filter(
                payment_type='CREDIT',
                status__in=['PENDING', 'PARTIAL'],
                amount_due__gt=0
            )
        
        return queryset
```

---

## 3️⃣ Testing Requirements

### Minimum Tests Needed

```python
# Cash on Hand Tests
def test_cash_on_hand_no_credit():
    """Cash on hand = total profit when no credit"""
    
def test_cash_on_hand_with_unpaid():
    """Cash on hand excludes unpaid credit profit"""
    
def test_cash_on_hand_partial_payment():
    """Partial payments still count as outstanding"""
    
def test_cash_on_hand_completed_credit():
    """Completed credit included in cash on hand"""

# Filter Tests
def test_days_outstanding_filter():
    """Filter by overdue days works"""
    
def test_amount_range_filters():
    """Min/max amount filters work"""
    
def test_customer_filter():
    """Customer filter works"""
```

---

## ⏱️ Time Estimate

- **Cash on Hand:** 2-3 hours (implementation + tests)
- **Filters:** 1-2 hours (implementation + tests)
- **Total:** 3-5 hours

---

## 📝 Files to Modify

1. `sales/api/views.py` - Add fields to SalesSummaryView
2. `sales/api/views.py` - Add filters to SaleViewSet
3. `sales/tests/test_summary.py` - Cash on hand tests
4. `sales/tests/test_filters.py` - Filter tests
5. API documentation - Update swagger/docs

---

## ⚠️ Critical Points

### 1. What Counts as Outstanding?

✅ **INCLUDED:**
- Status = 'PENDING' (not paid)
- Status = 'PARTIAL' (partially paid)

❌ **EXCLUDED:**
- Status = 'COMPLETED' (fully paid)
- Payment Type = 'CASH/CARD/MOBILE_MONEY'

### 2. Use Decimal for Money

```python
# Good ✅
amount = Decimal('100.00')

# Bad ❌
amount = 100.0  # Float causes rounding errors
```

### 3. Respect Filters

```python
# When date filter applied, only count sales in that range
if date_from:
    queryset = queryset.filter(created_at__gte=date_from)

# Same for storefront filter
if storefront_id:
    queryset = queryset.filter(storefront_id=storefront_id)
```

---

## 📚 Full Documentation

For complete details, code examples, and edge cases:

👉 **BACKEND-CREDIT-MANAGEMENT-REQUIREMENTS.md** (comprehensive guide)  
👉 **BACKEND-CASH-ON-HAND-CALCULATION.md** (detailed logic)

---

## ✅ Acceptance Criteria

**Summary Endpoint Must:**
- [ ] Return `outstanding_credit`
- [ ] Return `cash_on_hand` (= total_profit - outstanding_credit)
- [ ] Return `total_credit_sales` (amount customers owe)
- [ ] Return `unpaid_credit_count`
- [ ] Handle edge cases (no sales, all paid, etc.)
- [ ] Respect date/storefront filters

**Filters Must:**
- [ ] `days_outstanding` filter works
- [ ] `min_amount_due` / `max_amount_due` work
- [ ] `customer_id` filter works
- [ ] `has_outstanding_balance` filter works
- [ ] All tests pass

---

## 🚀 Implementation Order

1. **Start with Cash on Hand** (most important)
   - Update summary view
   - Write tests
   - Verify calculations

2. **Then Add Filters**
   - Implement in get_queryset
   - Write tests
   - Test combinations

3. **Documentation**
   - Update API docs
   - Add examples

---

## 💡 Example Use Cases

### Frontend Will Call:

```bash
# Get summary with cash breakdown
GET /sales/api/sales/summary/
→ Shows total profit, outstanding credit, actual cash on hand

# Get overdue credit sales (over 30 days)
GET /sales/api/sales/?payment_type=CREDIT&days_outstanding=30
→ Shows sales that need follow-up

# Get high-value unpaid credit
GET /sales/api/sales/?payment_status=unpaid&min_amount_due=1000
→ Shows priority collections
```

---

## 📞 Questions?

- **Business Logic:** Check BACKEND-CREDIT-MANAGEMENT-REQUIREMENTS.md
- **Calculations:** Check BACKEND-CASH-ON-HAND-CALCULATION.md
- **Frontend Impact:** Check ACCOUNTS-RECEIVABLE-IMPLEMENTATION.md

---

## 🎯 The Goal

**Show users the difference between:**
- 💰 **Total Profit** = All sales (includes unpaid credit)
- ⚠️ **Outstanding Credit** = Money customers owe
- ✅ **Cash on Hand** = Actual money available

**Priority:** 🔴 HIGH - Critical for financial management

---

**That's it! Read the full docs for details. You got this! 💪**
