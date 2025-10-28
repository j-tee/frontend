# Credit as Payment Method - Architectural Refactor

**Date:** October 15, 2025  
**Status:** 📋 PLANNING  
**Impact:** 🔴 HIGH - Major architectural change

## Executive Summary

### Current Architecture (TO BE CHANGED)
- Credit sales skip Payment table entirely
- `Sale.payment_type = 'CREDIT'` but no Payment record
- Customer.outstanding_balance tracked separately
- AR tracked at Sale level (status='PENDING'/'PARTIAL')

### Proposed Architecture (NEW)
- Credit becomes a valid `Payment.payment_method`
- **All sales create Payment records** (including credit)
- Payment table becomes single source of truth
- AR = Payments where `payment_method='CREDIT'`
- Financial analysis separates credit from other payment methods

---

## 1. Rationale - Why This Change?

### Business Logic
✅ **Credit IS a payment method** - Customer "pays" on credit  
✅ **Consistent data model** - All sales have payment records  
✅ **Easier tracking** - Query Payment table for all transactions  
✅ **Better analytics** - Single table for all payment analysis  
✅ **Clear separation** - Credit vs non-credit is just payment_method filter  

### Technical Benefits
1. **Unified Payment Tracking**: All payments in one table
2. **Simplified Queries**: No special handling for credit sales
3. **Better Reporting**: Filter by payment_method instead of sale.payment_type
4. **Audit Trail**: Payment table shows complete transaction history
5. **Flexible Payback**: Create new Payment records when credit is paid

---

## 2. Database Schema Changes

### Payment Model Updates

**File:** `/backend/sales/models.py` (Lines 1115-1125)

#### Change 1: Add CREDIT to Payment Methods
```python
# BEFORE
PAYMENT_METHOD_CHOICES = [
    ('CASH', 'Cash'),
    ('MOMO', 'Mobile Money'),
    ('CARD', 'Card'),
    ('PAYSTACK', 'Paystack'),
    ('STRIPE', 'Stripe'),
    ('BANK_TRANSFER', 'Bank Transfer'),
]

# AFTER
PAYMENT_METHOD_CHOICES = [
    ('CASH', 'Cash'),
    ('MOMO', 'Mobile Money'),
    ('CARD', 'Card'),
    ('CREDIT', 'Credit'),  # ← NEW: Credit is now a payment method
    ('PAYSTACK', 'Paystack'),
    ('STRIPE', 'Stripe'),
    ('BANK_TRANSFER', 'Bank Transfer'),
]
```

#### Change 2: Add AR Status Field
```python
class Payment(models.Model):
    # ... existing fields ...
    
    # NEW FIELD: Track if this payment represents AR
    is_accounts_receivable = models.BooleanField(default=False)
    
    # NEW FIELD: Link to payment that settled this AR (if paid back)
    settled_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='settles_ar_payments'
    )
    
    # NEW FIELD: Settlement date
    settled_at = models.DateTimeField(null=True, blank=True)
```

#### Change 3: Add Property Methods
```python
@property
def is_credit_payment(self):
    """Check if this is a credit payment (AR)"""
    return self.payment_method == 'CREDIT'

@property
def is_settled(self):
    """Check if this AR payment has been settled"""
    return self.settled_by is not None

@property
def outstanding_amount(self):
    """Amount still outstanding for credit payments"""
    if not self.is_credit_payment:
        return Decimal('0.00')
    
    if self.is_settled:
        return Decimal('0.00')
    
    # For partial settlements, calculate remaining
    settlements = Payment.objects.filter(
        settles_ar_payments=self
    ).aggregate(total=Sum('amount_paid'))['total'] or Decimal('0.00')
    
    return self.amount_paid - settlements
```

### Migration File
```python
# File: backend/sales/migrations/XXXX_add_credit_payment_method.py

from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [
        ('sales', 'XXXX_previous_migration'),
    ]

    operations = [
        # Add CREDIT to payment method choices
        migrations.AlterField(
            model_name='payment',
            name='payment_method',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('CASH', 'Cash'),
                    ('MOMO', 'Mobile Money'),
                    ('CARD', 'Card'),
                    ('CREDIT', 'Credit'),  # NEW
                    ('PAYSTACK', 'Paystack'),
                    ('STRIPE', 'Stripe'),
                    ('BANK_TRANSFER', 'Bank Transfer'),
                ]
            ),
        ),
        
        # Add AR tracking fields
        migrations.AddField(
            model_name='payment',
            name='is_accounts_receivable',
            field=models.BooleanField(default=False),
        ),
        
        migrations.AddField(
            model_name='payment',
            name='settled_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='settles_ar_payments',
                to='sales.payment'
            ),
        ),
        
        migrations.AddField(
            model_name='payment',
            name='settled_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        
        # Add index for AR queries
        migrations.AddIndex(
            model_name='payment',
            index=models.Index(
                fields=['payment_method', 'is_accounts_receivable'],
                name='payment_ar_idx'
            ),
        ),
    ]
```

---

## 3. Sale Completion Logic Changes

### Current Logic (TO BE REMOVED)
**File:** `/backend/sales/views.py` (Lines ~470)

```python
# CURRENT - SKIP Payment for credit
if data['payment_type'] != 'CREDIT':
    for payment_data in payments_data:
        Payment.objects.create(
            sale=sale,
            payment_method=payment_data['payment_method'],
            amount=payment_data['amount'],
            # ...
        )
```

### New Logic (REPLACEMENT)
```python
# NEW - CREATE Payment for ALL payment types including CREDIT
for payment_data in payments_data:
    is_credit = payment_data['payment_method'] == 'CREDIT'
    
    payment = Payment.objects.create(
        sale=sale,
        customer=sale.customer,
        payment_method=payment_data['payment_method'],
        amount_paid=payment_data['amount'],
        is_accounts_receivable=is_credit,  # Mark as AR if credit
        status='SUCCESSFUL',
        processed_by=request.user,
        # ... other fields
    )
    
    # If credit, update customer balance
    if is_credit:
        sale.customer.outstanding_balance += payment_data['amount']
        sale.customer.save()
        
        # Create audit trail
        CreditTransaction.objects.create(
            customer=sale.customer,
            transaction_type='CREDIT_SALE',
            amount=payment_data['amount'],
            balance_before=old_balance,
            balance_after=sale.customer.outstanding_balance,
            reference_id=payment.id,  # Link to Payment record
            description=f'Credit payment for sale {sale.receipt_number}',
            created_by=request.user
        )
```

---

## 4. Credit Payback Logic (NEW)

### Scenario: Customer Pays Back Credit

**Endpoint:** `POST /api/sales/{id}/record-credit-payment/`

```python
@action(detail=True, methods=['post'])
def record_credit_payment(self, request, pk=None):
    """
    Record payment against a credit sale.
    Creates new Payment record and updates original AR payment.
    """
    sale = self.get_object()
    amount = Decimal(request.data.get('amount'))
    payment_method = request.data.get('payment_method')  # CASH, MOMO, CARD, etc.
    
    # Validate
    if payment_method == 'CREDIT':
        return Response(
            {'error': 'Cannot pay credit with credit'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Find original credit payment(s)
    ar_payments = sale.payments.filter(
        payment_method='CREDIT',
        is_accounts_receivable=True
    ).order_by('payment_date')
    
    total_ar = ar_payments.aggregate(total=Sum('amount_paid'))['total'] or Decimal('0.00')
    total_settled = Payment.objects.filter(
        settles_ar_payments__in=ar_payments
    ).aggregate(total=Sum('amount_paid'))['total'] or Decimal('0.00')
    
    outstanding = total_ar - total_settled
    
    if amount > outstanding:
        return Response(
            {'error': f'Payment amount ({amount}) exceeds outstanding ({outstanding})'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Create settlement payment
    settlement_payment = Payment.objects.create(
        sale=sale,
        customer=sale.customer,
        payment_method=payment_method,
        amount_paid=amount,
        is_accounts_receivable=False,  # This is actual payment, not AR
        status='SUCCESSFUL',
        processed_by=request.user,
        notes=f'Payment against credit sale {sale.receipt_number}'
    )
    
    # Link to AR payment(s) - apply FIFO (oldest first)
    remaining = amount
    for ar_payment in ar_payments:
        if remaining <= 0:
            break
        
        ar_outstanding = ar_payment.outstanding_amount
        if ar_outstanding <= 0:
            continue
        
        # Apply payment to this AR
        applied = min(remaining, ar_outstanding)
        
        # Create linking payment
        Payment.objects.create(
            sale=sale,
            customer=sale.customer,
            payment_method='CREDIT_SETTLEMENT',  # Special internal type
            amount_paid=applied,
            is_accounts_receivable=False,
            settled_by=settlement_payment,  # Link to actual payment
            status='SUCCESSFUL',
            processed_by=request.user,
            notes=f'Settlement of AR payment {ar_payment.id}'
        )
        
        # If fully settled, mark AR payment
        if applied == ar_outstanding:
            ar_payment.settled_at = timezone.now()
            ar_payment.save()
        
        remaining -= applied
    
    # Update customer balance
    old_balance = sale.customer.outstanding_balance
    sale.customer.outstanding_balance -= amount
    sale.customer.save()
    
    # Update sale amounts
    sale.amount_paid += amount
    sale.amount_due -= amount
    
    if sale.amount_due <= 0:
        sale.status = 'COMPLETED'
    elif sale.amount_paid > 0:
        sale.status = 'PARTIAL'
    
    sale.save()
    
    # Create audit trail
    CreditTransaction.objects.create(
        customer=sale.customer,
        transaction_type='PAYMENT',
        amount=-amount,  # Negative because reducing balance
        balance_before=old_balance,
        balance_after=sale.customer.outstanding_balance,
        reference_id=settlement_payment.id,
        description=f'Payment via {payment_method} for sale {sale.receipt_number}',
        created_by=request.user
    )
    
    return Response({
        'success': True,
        'payment_id': settlement_payment.id,
        'amount_paid': amount,
        'remaining_balance': sale.amount_due,
        'customer_balance': sale.customer.outstanding_balance
    })
```

---

## 5. Financial Analysis Updates

### Sales Summary Changes
**File:** `/backend/sales/views.py` (Lines 520-750)

#### Current Approach (Sale-based)
```python
# CURRENT - Filter by sale.payment_type
credit_sales = Sale.objects.filter(payment_type='CREDIT')
credit_total = credit_sales.aggregate(Sum('total_amount'))
```

#### New Approach (Payment-based)
```python
# NEW - Filter by payment.payment_method
from django.db.models import Q, Sum, Count, F, Case, When, DecimalField

# All payments breakdown
payments_summary = Payment.objects.filter(
    sale__storefront=storefront,
    sale__created_at__range=[start_date, end_date],
    status='SUCCESSFUL'
).aggregate(
    # Total revenue by payment method
    cash_revenue=Sum(
        Case(When(payment_method='CASH', then='amount_paid'),
             default=0, output_field=DecimalField())
    ),
    momo_revenue=Sum(
        Case(When(payment_method='MOMO', then='amount_paid'),
             default=0, output_field=DecimalField())
    ),
    card_revenue=Sum(
        Case(When(payment_method='CARD', then='amount_paid'),
             default=0, output_field=DecimalField())
    ),
    credit_revenue=Sum(
        Case(When(payment_method='CREDIT', then='amount_paid'),
             default=0, output_field=DecimalField())
    ),
    
    # AR metrics
    ar_total=Sum(
        Case(When(
            payment_method='CREDIT',
            is_accounts_receivable=True,
            then='amount_paid'
        ), default=0, output_field=DecimalField())
    ),
    ar_outstanding=Sum(
        Case(When(
            payment_method='CREDIT',
            is_accounts_receivable=True,
            settled_at__isnull=True,
            then='amount_paid'
        ), default=0, output_field=DecimalField())
    ),
    ar_collected=Sum(
        Case(When(
            payment_method='CREDIT',
            is_accounts_receivable=True,
            settled_at__isnull=False,
            then='amount_paid'
        ), default=0, output_field=DecimalField())
    ),
)

# Separate realized vs unrealized revenue
realized_revenue = (
    payments_summary['cash_revenue'] +
    payments_summary['momo_revenue'] +
    payments_summary['card_revenue'] +
    payments_summary['ar_collected']  # Only collected credit
)

unrealized_revenue = payments_summary['ar_outstanding']  # Uncollected credit

total_revenue = realized_revenue + unrealized_revenue
```

### AR Aging Report Updates
**File:** `/backend/reports/views/financial_reports.py`

#### Current Query (Sale-based)
```python
# CURRENT
ar_sales = Sale.objects.filter(
    status__in=['PENDING', 'PARTIAL'],
    amount_due__gt=0
)
```

#### New Query (Payment-based)
```python
# NEW
ar_payments = Payment.objects.filter(
    payment_method='CREDIT',
    is_accounts_receivable=True,
    settled_at__isnull=True,  # Only unsettled AR
    storefront=storefront
).select_related('sale', 'customer')

# Group by customer
ar_by_customer = ar_payments.values(
    'customer__id',
    'customer__name',
    'customer__phone'
).annotate(
    total_ar=Sum('amount_paid'),
    oldest_ar=Min('payment_date'),
    newest_ar=Max('payment_date'),
    ar_count=Count('id')
)

# Age calculations
for customer_ar in ar_by_customer:
    age_days = (timezone.now().date() - customer_ar['oldest_ar'].date()).days
    
    if age_days <= 30:
        customer_ar['aging_category'] = 'current'
    elif age_days <= 60:
        customer_ar['aging_category'] = '30_days'
    elif age_days <= 90:
        customer_ar['aging_category'] = '60_days'
    else:
        customer_ar['aging_category'] = '90_days'
```

---

## 6. CreditTransaction Updates

### Link to Payment Records
**File:** `/backend/sales/models.py` (Lines 1221+)

```python
class CreditTransaction(models.Model):
    # ... existing fields ...
    
    # CHANGE: reference_id now points to Payment.id instead of Sale.receipt_number
    reference_id = models.UUIDField(
        null=True,
        blank=True,
        help_text='Payment ID that caused this transaction'
    )
    
    # NEW: Direct link to Payment record
    payment = models.ForeignKey(
        Payment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='credit_transactions'
    )
```

### Transaction Types Clarification
```python
TRANSACTION_TYPES = (
    ('CREDIT_SALE', 'Credit Sale'),          # Payment created with method=CREDIT
    ('PAYMENT', 'Payment'),                  # Payment created with method≠CREDIT, settles AR
    ('ADJUSTMENT', 'Adjustment'),            # Manual balance adjustment
    ('REFUND', 'Refund'),                    # Credit from refund
    ('BALANCE_SYNC', 'Balance Sync'),        # System balance correction
)
```

---

## 7. Receipt Display Updates

### Payment Section Changes
**File:** `/backend/sales/receipt_generator.py`

```python
# Display all payments including credit
payment_rows = ''
for payment in sale.payments.all():
    is_ar = payment.payment_method == 'CREDIT'
    
    payment_rows += f'''
    <tr>
        <td style="text-align: left;">{payment.get_payment_method_display()}</td>
        <td style="text-align: right;">{format_currency(payment.amount_paid)}</td>
        {'<td style="color: red; font-weight: bold;">AR</td>' if is_ar else ''}
    </tr>
    '''

# Credit banner still shows if payment_method=CREDIT
has_credit = sale.payments.filter(payment_method='CREDIT').exists()
credit_banner = ''
if has_credit:
    ar_amount = sale.payments.filter(
        payment_method='CREDIT'
    ).aggregate(Sum('amount_paid'))['amount_paid__sum'] or Decimal('0.00')
    
    credit_banner = f'''
    <div class="credit-sale-banner">
        <div class="credit-alert">
            <h2>⚠️ CREDIT SALE ⚠️</h2>
            <p class="credit-message">Payment on credit - Customer to pay later</p>
            <p class="credit-due">Amount Due: {format_currency(ar_amount)}</p>
        </div>
    </div>
    '''
```

---

## 8. Frontend Updates

### Payment Form Changes
**File:** `/frontend/src/components/sales/PaymentModal.tsx`

```typescript
// Add CREDIT to payment method options
const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'MOMO', label: 'Mobile Money' },
  { value: 'CARD', label: 'Card' },
  { value: 'CREDIT', label: 'Credit (Pay Later)', color: 'red' },  // ← NEW
  { value: 'PAYSTACK', label: 'Paystack' },
  { value: 'STRIPE', label: 'Stripe' },
];

// Show warning when CREDIT selected
{selectedMethod === 'CREDIT' && (
  <Alert severity="warning">
    <AlertTitle>Credit Payment - Accounts Receivable</AlertTitle>
    This will create an AR entry. Customer must pay later.
    Customer balance will be updated automatically.
  </Alert>
)}
```

### Credit Payback Component (NEW)
**File:** `/frontend/src/components/sales/CreditPaybackModal.tsx`

```typescript
interface CreditPaybackModalProps {
  sale: Sale;
  onSuccess: () => void;
}

export function CreditPaybackModal({ sale, onSuccess }: CreditPaybackModalProps) {
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MOMO' | 'CARD'>('CASH');
  
  // Calculate outstanding AR
  const arPayments = sale.payments.filter(p => p.payment_method === 'CREDIT');
  const totalAR = arPayments.reduce((sum, p) => sum + p.amount_paid, 0);
  const outstanding = sale.amount_due;  // Remaining balance
  
  const handleSubmit = async () => {
    try {
      await api.post(`/api/sales/${sale.id}/record-credit-payment/`, {
        amount: paymentAmount,
        payment_method: paymentMethod
      });
      
      toast.success('Payment recorded successfully');
      onSuccess();
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };
  
  return (
    <Dialog>
      <DialogTitle>Record Credit Payment</DialogTitle>
      <DialogContent>
        <Typography>Outstanding Balance: {formatCurrency(outstanding)}</Typography>
        
        <TextField
          label="Payment Amount"
          type="number"
          value={paymentAmount}
          onChange={(e) => setPaymentAmount(Number(e.target.value))}
          inputProps={{ max: outstanding }}
        />
        
        <Select
          label="Payment Method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <MenuItem value="CASH">Cash</MenuItem>
          <MenuItem value="MOMO">Mobile Money</MenuItem>
          <MenuItem value="CARD">Card</MenuItem>
        </Select>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleSubmit}>Record Payment</Button>
      </DialogActions>
    </Dialog>
  );
}
```

---

## 9. Data Migration Strategy

### Step 1: Backup Database
```bash
python manage.py dumpdata sales > backup_sales_before_credit_refactor.json
```

### Step 2: Create Migration
```bash
python manage.py makemigrations sales
```

### Step 3: Migrate Existing Credit Sales (Data Migration)
```python
# File: backend/sales/migrations/XXXX_migrate_existing_credit_sales.py

from django.db import migrations
from decimal import Decimal

def migrate_credit_sales(apps, schema_editor):
    """
    Convert existing credit sales to Payment records.
    For each Sale with payment_type='CREDIT', create Payment with method='CREDIT'.
    """
    Sale = apps.get_model('sales', 'Sale')
    Payment = apps.get_model('sales', 'Payment')
    CreditTransaction = apps.get_model('sales', 'CreditTransaction')
    
    credit_sales = Sale.objects.filter(payment_type='CREDIT')
    
    for sale in credit_sales:
        # Check if payment already exists (avoid duplicates)
        existing = Payment.objects.filter(
            sale=sale,
            payment_method='CREDIT'
        ).exists()
        
        if existing:
            continue
        
        # Create Payment record for the credit amount
        payment = Payment.objects.create(
            sale=sale,
            customer=sale.customer,
            payment_method='CREDIT',
            amount_paid=sale.total_amount,
            is_accounts_receivable=True,
            status='SUCCESSFUL',
            payment_date=sale.created_at,
            processed_by=sale.created_by,
            notes='Migrated from legacy credit sale'
        )
        
        # Update CreditTransaction to link to Payment
        CreditTransaction.objects.filter(
            reference_id=sale.receipt_number,
            transaction_type='CREDIT_SALE'
        ).update(
            reference_id=payment.id,
            payment=payment
        )
        
        print(f'Migrated credit sale {sale.receipt_number} → Payment {payment.id}')

def reverse_migration(apps, schema_editor):
    """
    Remove migrated Payment records.
    """
    Payment = apps.get_model('sales', 'Payment')
    Payment.objects.filter(
        payment_method='CREDIT',
        notes__contains='Migrated from legacy credit sale'
    ).delete()

class Migration(migrations.Migration):
    dependencies = [
        ('sales', 'XXXX_add_credit_payment_method'),
    ]

    operations = [
        migrations.RunPython(migrate_credit_sales, reverse_migration),
    ]
```

### Step 4: Run Migration
```bash
python manage.py migrate sales
```

### Step 5: Verify Data
```bash
# Check all credit sales have Payment records
python manage.py shell

from sales.models import Sale, Payment

credit_sales = Sale.objects.filter(payment_type='CREDIT')
print(f"Total credit sales: {credit_sales.count()}")

sales_with_payment = credit_sales.filter(payments__payment_method='CREDIT').distinct()
print(f"Credit sales with Payment: {sales_with_payment.count()}")

# Should be equal!
assert credit_sales.count() == sales_with_payment.count()
```

---

## 10. Testing Checklist

### Unit Tests

#### Test Payment Creation
```python
def test_credit_sale_creates_payment_record():
    """Credit sales should create Payment with method=CREDIT"""
    sale = create_test_sale(payment_type='CREDIT')
    
    payment = sale.payments.get(payment_method='CREDIT')
    assert payment.is_accounts_receivable == True
    assert payment.amount_paid == sale.total_amount
    assert sale.customer.outstanding_balance == sale.total_amount
```

#### Test Credit Payback
```python
def test_credit_payback_updates_balances():
    """Paying back credit should update customer balance and sale status"""
    sale = create_credit_sale(amount=1000)
    
    # Record payback
    record_credit_payment(sale, amount=600, method='CASH')
    
    sale.refresh_from_db()
    assert sale.amount_paid == 600
    assert sale.amount_due == 400
    assert sale.status == 'PARTIAL'
    assert sale.customer.outstanding_balance == 400
```

#### Test AR Queries
```python
def test_ar_aging_uses_payment_records():
    """AR Aging should query Payment table"""
    create_credit_sale(customer=customer1, amount=1000, days_ago=45)
    create_credit_sale(customer=customer2, amount=500, days_ago=15)
    
    ar_payments = Payment.objects.filter(
        payment_method='CREDIT',
        is_accounts_receivable=True,
        settled_at__isnull=True
    )
    
    assert ar_payments.count() == 2
    assert ar_payments.aggregate(Sum('amount_paid'))['amount_paid__sum'] == 1500
```

### Integration Tests

```python
def test_end_to_end_credit_workflow():
    """
    Complete workflow:
    1. Create credit sale
    2. Verify Payment record
    3. Check AR appears in reports
    4. Record partial payment
    5. Verify balances updated
    6. Record final payment
    7. Verify AR cleared
    """
    # 1. Create credit sale
    sale = complete_sale(
        customer=customer,
        items=[{'product': product, 'quantity': 5}],
        payment_type='CREDIT'
    )
    
    # 2. Verify Payment record
    ar_payment = sale.payments.get(payment_method='CREDIT')
    assert ar_payment.is_accounts_receivable == True
    assert ar_payment.amount_paid == 1200
    
    # 3. Check AR in reports
    ar_aging = get_ar_aging_report()
    assert customer in ar_aging['customers']
    assert ar_aging['total'] == 1200
    
    # 4. Record partial payment
    record_credit_payment(sale, amount=700, method='CASH')
    
    # 5. Verify balances
    sale.refresh_from_db()
    customer.refresh_from_db()
    assert sale.amount_due == 500
    assert customer.outstanding_balance == 500
    
    # 6. Record final payment
    record_credit_payment(sale, amount=500, method='MOMO')
    
    # 7. Verify AR cleared
    sale.refresh_from_db()
    customer.refresh_from_db()
    ar_payment.refresh_from_db()
    
    assert sale.status == 'COMPLETED'
    assert sale.amount_due == 0
    assert customer.outstanding_balance == 0
    assert ar_payment.settled_at is not None
    assert ar_payment.is_settled == True
```

---

## 11. Rollout Plan

### Phase 1: Development (Week 1)
- [ ] Add CREDIT to Payment.PAYMENT_METHOD_CHOICES
- [ ] Add is_accounts_receivable, settled_by, settled_at fields
- [ ] Create migration files
- [ ] Update Sale completion logic
- [ ] Update CreditTransaction model

### Phase 2: Backend Logic (Week 1-2)
- [ ] Implement record_credit_payment endpoint
- [ ] Update sales summary queries
- [ ] Update AR aging queries
- [ ] Update receipt generation
- [ ] Write unit tests

### Phase 3: Data Migration (Week 2)
- [ ] Backup production database
- [ ] Test migration on staging
- [ ] Run migration on production
- [ ] Verify all credit sales have Payment records
- [ ] Verify customer balances unchanged

### Phase 4: Frontend Updates (Week 2-3)
- [ ] Add CREDIT to payment method options
- [ ] Create CreditPaybackModal component
- [ ] Update sales list to show AR indicator
- [ ] Update customer detail to show AR payments
- [ ] Add credit payment recording UI

### Phase 5: Testing (Week 3)
- [ ] Unit tests (all passing)
- [ ] Integration tests (end-to-end workflow)
- [ ] Manual testing (create credit sale, record payments)
- [ ] Performance testing (query optimization)
- [ ] UAT with stakeholders

### Phase 6: Documentation (Week 3-4)
- [ ] Update API documentation
- [ ] Create user guide for credit sales
- [ ] Create admin guide for AR management
- [ ] Update training materials

### Phase 7: Deployment (Week 4)
- [ ] Deploy to staging
- [ ] Stakeholder approval
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Gather feedback

---

## 12. Risks & Mitigation

### Risk 1: Data Loss During Migration
**Mitigation:**
- Full database backup before migration
- Test migration on copy of production data
- Reversible migration with rollback script
- Verify data integrity after migration

### Risk 2: Performance Impact
**Mitigation:**
- Add database indexes on payment_method + is_accounts_receivable
- Optimize AR aging queries with select_related/prefetch_related
- Monitor query performance in production
- Cache frequently accessed AR reports

### Risk 3: Breaking Existing Integrations
**Mitigation:**
- Maintain backward compatibility for Sale.payment_type
- Keep existing CreditTransaction working
- Deprecate old fields gradually
- Comprehensive integration tests

### Risk 4: User Confusion
**Mitigation:**
- Clear UI warnings when selecting CREDIT
- Training sessions for staff
- In-app tooltips and help text
- Gradual rollout with feedback collection

---

## 13. Success Metrics

### Technical Metrics
- [ ] 100% of credit sales have Payment records
- [ ] Customer balances match Payment aggregates
- [ ] AR aging reports load in < 2 seconds
- [ ] Zero data integrity errors after migration

### Business Metrics
- [ ] Users can record credit payments in < 30 seconds
- [ ] AR collection rate visible in dashboard
- [ ] Credit vs cash revenue clearly separated
- [ ] Customer credit history easily accessible

---

## 14. Conclusion

This refactor transforms credit from a **special case** into a **standard payment method**, bringing several key benefits:

✅ **Unified Data Model**: All payments in Payment table  
✅ **Simplified Queries**: Filter by payment_method instead of complex sale logic  
✅ **Better Tracking**: Payment records provide complete audit trail  
✅ **Clearer Analytics**: Separate credit from other methods with simple filters  
✅ **Flexible Payback**: Record payments against AR using standard Payment flow  

**Recommendation**: Proceed with implementation. The benefits outweigh the risks, and the migration strategy provides safety nets for data integrity.

**Timeline**: 4 weeks from start to production deployment  
**Effort**: ~40-60 hours development + testing + documentation  
**Priority**: HIGH - Improves core business functionality
