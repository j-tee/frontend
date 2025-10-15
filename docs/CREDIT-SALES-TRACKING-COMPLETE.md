# Credit Sales Tracking - Complete System Overview

**Last Updated:** 2024-01-XX  
**Status:** ✅ FULLY IMPLEMENTED

## Executive Summary

Credit sales are comprehensively tracked throughout the POS system with:
- **Prominent Receipt Display** with danger/warning styling
- **Complete Audit Trail** via CreditTransaction table
- **Detailed Analytics** with 8+ credit-specific metrics
- **AR Aging Integration** for credit management
- **Data Integrity Validation** preventing orphaned balances

---

## 1. Receipt Display - PROMINENT CREDIT INDICATOR

### Visual Design
When a credit sale is completed, the receipt displays a **bold, impossible-to-miss banner**:

```
┌──────────────────────────────────────┐
│                                      │
│     ⚠️ CREDIT SALE ⚠️                │
│                                      │
│  Payment on credit - Customer to     │
│  pay later                          │
│                                      │
│  Amount Due: ₱1,200.00              │
│                                      │
└──────────────────────────────────────┘
```

### Implementation Details
**File:** `/backend/sales/receipt_generator.py`

**HTML Structure (Lines 127-147):**
```python
credit_banner = ''
if is_credit_sale and float(amount_due) > 0:
    credit_banner = '''
    <div class="credit-sale-banner">
        <div class="credit-alert">
            <h2>⚠️ CREDIT SALE ⚠️</h2>
            <p class="credit-message">Payment on credit - Customer to pay later</p>
            <p class="credit-due">Amount Due: ''' + format_currency(amount_due) + '''</p>
        </div>
    </div>
    '''
```

**CSS Styling (Lines 248-282):**
```css
/* Credit Sale Banner */
.credit-sale-banner {
    background: #f8d7da;          /* Light red/danger background */
    border: 3px solid #dc3545;    /* Bold red border */
    padding: 15px;
    margin: 15px 0;
    text-align: center;
}

.credit-alert {
    color: #721c24;               /* Dark red text */
}

.credit-alert h2 {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 8px;
    text-transform: uppercase;    /* "CREDIT SALE" all caps */
    letter-spacing: 2px;          /* Spaced for emphasis */
}

.credit-message {
    font-size: 13px;
    margin-bottom: 8px;
    font-weight: bold;
}

.credit-due {
    font-size: 16px;              /* Large amount display */
    font-weight: bold;
    margin-top: 8px;
    color: #dc3545;               /* Bright red for amount */
}
```

**Print Styling (Lines 174-194):**
```css
@media print {
    /* Ensure credit banner is visible when printed */
    .credit-sale-banner {
        background: #f8d7da !important;
        border: 3px solid #dc3545 !important;
        padding: 15px !important;
        page-break-inside: avoid;           /* Don't split banner across pages */
        -webkit-print-color-adjust: exact;  /* Force color printing */
        print-color-adjust: exact;
    }
    
    .credit-alert h2,
    .credit-message,
    .credit-due {
        color: #721c24 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
}
```

### Design Rationale
- **Red/Danger Colors**: Universally recognized as "attention required"
- **Large Font Size**: 20px heading, 16px amount - highly visible
- **Bold Borders**: 3px solid red border creates visual barrier
- **Print-Friendly**: `print-color-adjust: exact` ensures colors print
- **Page Break Protection**: `page-break-inside: avoid` keeps banner intact
- **Uppercase + Letter Spacing**: Maximum visual impact

---

## 2. Database Tracking - CreditTransaction Table

### Model Structure
**File:** `/backend/sales/models.py` (Lines 1221-1253)

```python
class CreditTransaction(models.Model):
    """
    Audit trail for all customer balance changes.
    Tracks every credit sale, payment, adjustment, and refund.
    """
    
    TRANSACTION_TYPES = (
        ('CREDIT_SALE', 'Credit Sale'),      # New sale on credit
        ('PAYMENT', 'Payment'),              # Customer payment
        ('ADJUSTMENT', 'Adjustment'),        # Manual adjustment
        ('REFUND', 'Refund'),                # Credit from refund
        ('BALANCE_SYNC', 'Balance Sync'),    # System balance correction
    )
    
    customer = models.ForeignKey(
        'Customer',
        on_delete=models.CASCADE,
        related_name='credit_transactions'
    )
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    balance_before = models.DecimalField(max_digits=10, decimal_places=2)
    balance_after = models.DecimalField(max_digits=10, decimal_places=2)
    reference_id = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### Transaction Flow

**When Credit Sale is Completed:**
```python
# File: sales/models.py - Sale.complete_sale() method (lines 847-881)

if self.payment_type == 'CREDIT':
    # Update customer's outstanding balance
    self.customer.outstanding_balance += self.amount_due
    self.customer.save()
    
    # Create audit trail
    CreditTransaction.objects.create(
        customer=self.customer,
        transaction_type='CREDIT_SALE',
        amount=self.amount_due,
        balance_before=old_balance,
        balance_after=self.customer.outstanding_balance,
        reference_id=self.receipt_number,
        description=f'Credit sale {self.receipt_number}',
        created_by=self.created_by
    )
```

**When Customer Makes Payment:**
```python
# When recording payment against credit
CreditTransaction.objects.create(
    customer=customer,
    transaction_type='PAYMENT',
    amount=payment_amount,
    balance_before=customer.outstanding_balance,
    balance_after=customer.outstanding_balance - payment_amount,
    reference_id=payment.id,
    description=f'Payment received - Receipt {payment.receipt_number}',
    created_by=request.user
)
```

### Audit Trail Benefits
1. **Complete History**: Every balance change tracked with before/after values
2. **User Accountability**: `created_by` tracks who made the transaction
3. **Reference Linking**: `reference_id` links to Sale/Payment records
4. **Timestamps**: `created_at` provides chronological audit trail
5. **Balance Verification**: Can recalculate balance from transaction history

---

## 3. Sales Analytics - Comprehensive Credit Tracking

### Sales Summary Endpoint
**File:** `/backend/sales/views.py` (Lines 520-750)

The sales summary endpoint tracks **8+ credit-specific metrics** that separate cash from credit revenue/profit:

```python
# Credit Sales Totals
credit_total_amount = Decimal('0.00')
credit_total_completed = Decimal('0.00')

# Credit Payments & Outstanding
credit_amount_paid_total = Decimal('0.00')
credit_amount_due_total = Decimal('0.00')
credit_amount_due_partial = Decimal('0.00')
credit_amount_due_pending = Decimal('0.00')

# Credit Profit Analysis
credit_realized_profit = Decimal('0.00')
credit_outstanding_profit = Decimal('0.00')
```

### Metric Definitions

| Metric | Description | Business Value |
|--------|-------------|----------------|
| `credit_total_amount` | Total value of all credit sales (PENDING + PARTIAL + COMPLETED) | Overall credit sales volume |
| `credit_total_completed` | Total value of fully paid credit sales (status=COMPLETED) | Successfully collected credit revenue |
| `credit_amount_paid_total` | Sum of all payments received on credit sales | Cash collected from credit |
| `credit_amount_due_total` | Total outstanding balance on all credit sales | Current AR amount |
| `credit_amount_due_partial` | Outstanding on partially paid credit sales (PARTIAL) | Active payment plans |
| `credit_amount_due_pending` | Outstanding on unpaid credit sales (PENDING) | Uncollected credit sales |
| `credit_realized_profit` | Profit on completed credit sales | Actual profit earned |
| `credit_outstanding_profit` | Profit on uncollected credit sales (PENDING + PARTIAL) | Potential profit at risk |

### Example Response
```json
{
  "credit_total_amount": "45000.00",
  "credit_total_completed": "30000.00",
  "credit_amount_paid_total": "35000.00",
  "credit_amount_due_total": "10000.00",
  "credit_amount_due_partial": "4000.00",
  "credit_amount_due_pending": "6000.00",
  "credit_realized_profit": "8500.00",
  "credit_outstanding_profit": "2800.00"
}
```

### Business Intelligence
This separation allows management to:
- **Track Collection Rate**: `credit_amount_paid / credit_total_amount`
- **Assess Credit Risk**: `credit_amount_due_pending` (uncollected sales)
- **Monitor Payment Plans**: `credit_amount_due_partial` (active payments)
- **Analyze Profitability**: `credit_realized_profit` vs `credit_outstanding_profit`
- **Compare Cash vs Credit**: Side-by-side cash and credit metrics

---

## 4. Accounts Receivable - AR Aging Report

### Integration with AR Aging
**File:** `/backend/reports/views/financial_reports.py` (Lines 305-600)

Credit sales appear in the AR Aging report when they have outstanding balances:

```python
# AR Aging Query
ar_sales = Sale.objects.filter(
    status__in=['PENDING', 'PARTIAL'],  # Credit sales with outstanding balance
    amount_due__gt=0,                    # Has unpaid amount
    storefront=storefront
).select_related('customer')
```

### Aging Buckets
Credit sales are categorized by how long they've been outstanding:

| Bucket | Age Range | Description |
|--------|-----------|-------------|
| Current | 0-30 days | Recently issued credit |
| 30 Days | 31-60 days | Slightly overdue |
| 60 Days | 61-90 days | Moderately overdue |
| 90 Days | 90+ days | Seriously overdue |

### Retail vs Wholesale Breakdown
AR Aging separates retail and wholesale credit:

```python
retail_total = ar_sales.filter(
    sale_type='RETAIL'
).aggregate(total=Sum('amount_due'))['total'] or Decimal('0.00')

wholesale_total = ar_sales.filter(
    sale_type='WHOLESALE'
).aggregate(total=Sum('amount_due'))['total'] or Decimal('0.00')
```

**Example Output:**
```json
{
  "total_receivables": "72495.25",
  "retail_receivables": "45000.00",
  "wholesale_receivables": "27495.25",
  "aging": {
    "current": "50000.00",
    "30_days": "15000.00",
    "60_days": "5495.25",
    "90_days": "2000.00"
  }
}
```

---

## 5. Sale Completion Logic - No Payment Records

### Why Credit Sales Skip Payment Records

**File:** `/backend/sales/views.py` (Lines 454-519)

```python
@action(detail=True, methods=['post'])
def complete(self, request, pk=None):
    sale = self.get_object()
    data = request.data
    
    # Validate and save sale data
    # ...
    
    # CRITICAL: Only create Payment records for non-credit sales
    if data['payment_type'] != 'CREDIT':
        for payment_data in payments_data:
            Payment.objects.create(
                sale=sale,
                payment_method=payment_data['payment_method'],
                amount=payment_data['amount'],
                # ... other fields
            )
    
    # Credit sales update customer balance instead
    sale.complete_sale()  # Handles credit logic internally
```

### Payment Model Validation
**File:** `/backend/sales/models.py` (Lines 1120-1135)

```python
class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = (
        ('CASH', 'Cash'),
        ('MOMO', 'Mobile Money'),
        ('CARD', 'Card'),
        ('PAYSTACK', 'Paystack'),
        ('STRIPE', 'Stripe'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        # NOTE: 'CREDIT' is NOT a payment method
        # Credit sales have no Payment records initially
    )
```

### Design Rationale
1. **Credit ≠ Payment**: Credit sales are **promises to pay later**, not actual payments
2. **Payment Records**: Created when customer actually pays, not at sale completion
3. **Customer Balance**: Credit sales update `Customer.outstanding_balance`
4. **Future Payments**: When customer pays later, THEN create Payment record with actual method (CASH/MOMO/CARD)

### Payment Flow Comparison

**Cash Sale:**
```
Sale (payment_type=CASH)
  → Payment (payment_method=CASH, amount=total)
  → Sale.amount_paid = total
  → Sale.amount_due = 0
  → Sale.status = COMPLETED
```

**Credit Sale:**
```
Sale (payment_type=CREDIT)
  → No Payment record
  → Sale.amount_paid = 0
  → Sale.amount_due = total
  → Sale.status = PENDING
  → Customer.outstanding_balance += total
  → CreditTransaction created
```

**Credit Sale Later Payment:**
```
Customer Payment (₱500)
  → Payment (payment_method=CASH, amount=500)
  → Sale.amount_paid += 500
  → Sale.amount_due -= 500
  → Sale.status = PARTIAL (if not fully paid)
  → Customer.outstanding_balance -= 500
  → CreditTransaction created
```

---

## 6. Data Integrity - Preventing Orphaned Balances

### Validation System
**File:** `/backend/sales/validators.py`

```python
class ARIntegrityValidator:
    """
    Comprehensive AR data integrity validation.
    Prevents orphaned customer balances.
    """
    
    @staticmethod
    def validate_customer_balance(customer):
        """
        Verify customer.outstanding_balance matches actual sales.
        Returns (is_valid, expected_balance, actual_balance, discrepancy)
        """
        
    @staticmethod
    def calculate_customer_balance(customer):
        """
        Calculate what customer balance SHOULD be from actual sales.
        """
        return Sale.objects.filter(
            customer=customer,
            status__in=['PENDING', 'PARTIAL']
        ).aggregate(
            total=Sum('amount_due')
        )['total'] or Decimal('0.00')
```

### Automatic Validation
**File:** `/backend/sales/models.py` (Lines 883-955)

```python
class Sale(models.Model):
    def save(self, *args, **kwargs):
        # Validate balance integrity before saving
        self._validate_balance_integrity()
        super().save(*args, **kwargs)
    
    def _validate_balance_integrity(self):
        """
        Prevent invalid status/balance combinations.
        Catches issues before they corrupt data.
        """
        if self.status == 'COMPLETED' and self.amount_due > 0:
            raise ValidationError(
                "COMPLETED sale cannot have outstanding balance"
            )
        
        if self.status == 'CANCELLED' and self.amount_due > 0:
            raise ValidationError(
                "CANCELLED sale must have amount_due = 0"
            )
        
        if self.status == 'PENDING' and self.amount_paid > 0:
            raise ValidationError(
                "PENDING sale cannot have payments"
            )
```

### Management Command
**File:** `/backend/sales/management/commands/validate_ar_integrity.py`

```bash
# Check all customer balances for discrepancies
python manage.py validate_ar_integrity --verbose

# Automatically fix orphaned balances
python manage.py validate_ar_integrity --fix
```

**Example Output:**
```
Running AR Integrity Validation...
=====================================

Checking customer balances...
✗ John Doe (ID: 1) - Balance Mismatch
  Database: ₱5000.00
  Expected: ₱3000.00
  Discrepancy: ₱2000.00
  Issue: Orphaned balance from deleted sale

✓ Jane Smith (ID: 2) - OK
  Balance: ₱1200.00 matches sales

Checking sale balance consistency...
✗ Sale #12345 - Invalid Status
  Status: CANCELLED
  Amount Due: ₱500.00
  Issue: Cancelled sales must have amount_due = 0

Summary:
Total Customers: 50
Balance Mismatches: 1
Invalid Sales: 1

Use --fix to automatically correct these issues.
```

---

## 7. Testing Credit Sales - Complete Workflow

### Step 1: Create Credit Sale
**Frontend Action:**
```javascript
// Complete sale with payment_type='CREDIT'
POST /api/sales/{id}/complete/
{
  "payment_type": "CREDIT",
  "payments": []  // Empty - no payment records for credit
}
```

**Expected Backend Actions:**
1. ✅ Sale.status → PENDING
2. ✅ Sale.amount_due → total_amount
3. ✅ Sale.amount_paid → 0
4. ✅ Customer.outstanding_balance += amount_due
5. ✅ CreditTransaction created (type=CREDIT_SALE)
6. ✅ No Payment records created

### Step 2: Print Receipt
**Frontend Action:**
```javascript
GET /api/sales/{id}/print-receipt/
```

**Expected Receipt Elements:**
1. ✅ Red banner with "⚠️ CREDIT SALE ⚠️"
2. ✅ "Payment on credit - Customer to pay later"
3. ✅ Amount Due prominently displayed
4. ✅ Customer name (who owes the money)
5. ✅ Payment type: CREDIT
6. ✅ Print-friendly CSS (colors visible when printed)

### Step 3: Verify in Sales Summary
**Frontend Action:**
```javascript
GET /api/sales/summary/?start_date=2024-01-01&end_date=2024-01-31
```

**Expected Metrics:**
```json
{
  "credit_total_amount": 1200.00,        // Includes new credit sale
  "credit_amount_due_pending": 1200.00,  // Appears in pending
  "credit_outstanding_profit": 300.00,   // Expected profit
  // ... other credit metrics
}
```

### Step 4: Check AR Aging
**Frontend Action:**
```javascript
GET /api/reports/ar-aging/?storefront_id=1
```

**Expected Results:**
```json
{
  "total_receivables": 1200.00,
  "retail_receivables": 1200.00,  // If RETAIL sale
  "aging": {
    "current": 1200.00  // New sale in "Current" bucket
  },
  "customers": [
    {
      "customer_name": "John Doe",
      "outstanding_balance": 1200.00,
      "sales": [
        {
          "receipt_number": "12345",
          "sale_date": "2024-01-15",
          "amount_due": 1200.00,
          "aging_category": "current"
        }
      ]
    }
  ]
}
```

### Step 5: Record Partial Payment
**Frontend Action:**
```javascript
// Customer pays ₱500
POST /api/sales/{id}/complete/
{
  "payment_type": "MIXED",  // Now has both credit and payment
  "payments": [
    {
      "payment_method": "CASH",
      "amount": 500.00
    }
  ]
}
```

**Expected Backend Actions:**
1. ✅ Payment record created (method=CASH, amount=500)
2. ✅ Sale.amount_paid → 500
3. ✅ Sale.amount_due → 700 (1200 - 500)
4. ✅ Sale.status → PARTIAL
5. ✅ Customer.outstanding_balance → 700
6. ✅ CreditTransaction created (type=PAYMENT, amount=-500)

### Step 6: Verify in Analytics
**After Partial Payment:**
```json
{
  "credit_total_amount": 1200.00,        // Still ₱1200 total sale
  "credit_amount_paid_total": 500.00,    // ₱500 collected
  "credit_amount_due_total": 700.00,     // ₱700 still owed
  "credit_amount_due_partial": 700.00,   // Moved to PARTIAL
  "credit_amount_due_pending": 0.00      // No longer PENDING
}
```

---

## 8. Credit Transaction Query Examples

### Get Customer's Credit History
```python
# All credit transactions for a customer
transactions = CreditTransaction.objects.filter(
    customer=customer
).order_by('-created_at')

for txn in transactions:
    print(f"{txn.created_at}: {txn.transaction_type}")
    print(f"  Amount: {txn.amount}")
    print(f"  Balance: {txn.balance_before} → {txn.balance_after}")
    print(f"  Reference: {txn.reference_id}")
```

**Example Output:**
```
2024-01-15 14:30: PAYMENT
  Amount: -500.00
  Balance: ₱1200.00 → ₱700.00
  Reference: PAY-001

2024-01-10 09:15: CREDIT_SALE
  Amount: 1200.00
  Balance: ₱0.00 → ₱1200.00
  Reference: RCP-12345
```

### Reconcile Customer Balance
```python
# Verify current balance matches transaction history
customer = Customer.objects.get(id=1)

# Get initial balance (usually 0)
initial_balance = Decimal('0.00')

# Sum all transactions
total_credit_sales = CreditTransaction.objects.filter(
    customer=customer,
    transaction_type='CREDIT_SALE'
).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')

total_payments = CreditTransaction.objects.filter(
    customer=customer,
    transaction_type='PAYMENT'
).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')

calculated_balance = initial_balance + total_credit_sales + total_payments

# Should match customer.outstanding_balance
assert calculated_balance == customer.outstanding_balance
```

### Find Stale Credit Sales
```python
from datetime import datetime, timedelta

# Credit sales older than 90 days
stale_threshold = datetime.now() - timedelta(days=90)

stale_sales = Sale.objects.filter(
    payment_type='CREDIT',
    status__in=['PENDING', 'PARTIAL'],
    created_at__lt=stale_threshold
).select_related('customer')

for sale in stale_sales:
    print(f"Customer: {sale.customer.name}")
    print(f"Sale Date: {sale.created_at.date()}")
    print(f"Amount Due: {sale.amount_due}")
    print(f"Age: {(datetime.now() - sale.created_at).days} days")
```

---

## 9. Summary - Credit Tracking Touchpoints

### Complete System Coverage

| Component | Status | Description |
|-----------|--------|-------------|
| **Receipt Display** | ✅ DONE | Prominent red banner with "CREDIT SALE" warning |
| **Payment Logic** | ✅ DONE | Skips Payment records for credit sales |
| **Customer Balance** | ✅ DONE | Updates outstanding_balance on credit sales |
| **Audit Trail** | ✅ DONE | CreditTransaction logs all balance changes |
| **Sales Analytics** | ✅ DONE | 8+ credit-specific metrics in summary |
| **AR Aging** | ✅ DONE | Filters PENDING/PARTIAL credit sales |
| **Data Validation** | ✅ DONE | Prevents orphaned balances |
| **Management Commands** | ✅ DONE | validate_ar_integrity for maintenance |

### Data Flow Summary

```
Credit Sale Completion
    ↓
┌─────────────────────────┐
│ Sale Record             │
│ - payment_type: CREDIT  │
│ - status: PENDING       │
│ - amount_due: ₱1200     │
│ - amount_paid: ₱0       │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ Customer Record         │
│ outstanding_balance     │
│ += ₱1200                │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ CreditTransaction       │
│ - type: CREDIT_SALE     │
│ - amount: ₱1200         │
│ - reference: RCP-12345  │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ Receipt with Banner     │
│ ⚠️ CREDIT SALE ⚠️       │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ Sales Summary           │
│ credit_amount_due_      │
│ pending: ₱1200          │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ AR Aging Report         │
│ Current: ₱1200          │
└─────────────────────────┘
```

---

## 10. Future Enhancements (Optional)

### Potential Improvements

1. **Credit Limit Enforcement**
   - Add `Customer.credit_limit` field
   - Validate new credit sales don't exceed limit
   - Alert when customer approaches limit

2. **Automated Payment Reminders**
   - Email/SMS reminders for overdue credit
   - Escalation for 30/60/90 day aging
   - Customizable reminder templates

3. **Credit Score Tracking**
   - Calculate payment reliability score
   - Track average days to payment
   - Flag high-risk customers

4. **Interest Calculation**
   - Add interest for overdue credit
   - Configurable interest rates by customer/product
   - Compound interest for long-term debt

5. **Collection Workflow**
   - Assign credit sales to collection agents
   - Track collection attempts
   - Generate collection reports

---

## Conclusion

The POS system provides **comprehensive credit sales tracking** from sale completion through payment collection. The prominent receipt banner ensures credit sales are unmistakable, while the audit trail and analytics provide complete visibility into credit operations.

**Key Success Factors:**
- ✅ Visual prominence (red danger styling)
- ✅ Complete audit trail (CreditTransaction)
- ✅ Detailed analytics (8+ credit metrics)
- ✅ Data integrity (automatic validation)
- ✅ Print-friendly (exact color printing)

**Next Steps:**
1. Test credit sale end-to-end in frontend
2. Verify receipt prints with CREDIT banner
3. Monitor credit metrics in sales summary
4. Use AR Aging to manage collections
