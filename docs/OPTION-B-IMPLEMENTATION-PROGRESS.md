# Option B Implementation Progress - Credit as AR System

**Date Started:** October 15, 2025  
**Status:** 🚧 IN PROGRESS  
**Current Phase:** Phase 2 - Sale Completion Logic

---

## ✅ Phase 1: Database Models - COMPLETE

### Models Created

#### 1. AccountsReceivable Model ✅
**File:** `/backend/sales/models.py` (after CreditTransaction)

**Fields:**
- `id` (UUID) - Primary key
- `sale` (OneToOne) - Link to credit sale (PROTECT)
- `customer` (FK) - Customer who owes money (PROTECT)
- `original_amount` - Initial credit amount
- `amount_paid` - Total paid so far
- `amount_outstanding` - Remaining balance (auto-calculated)
- `status` - PENDING | PARTIAL | PAID | WRITTEN_OFF | IN_COLLECTION
- `due_date` - Expected payment date
- `days_outstanding` - Days since sale (auto-calculated)
- `aging_category` - CURRENT | 30_DAYS | 60_DAYS | 90_PLUS (auto-calculated)
- `last_reminder_sent` - Last reminder timestamp
- `reminder_count` - Number of reminders sent
- `assigned_to` (FK User) - Collection agent
- `notes` - AR notes
- `created_at`, `updated_at` - Timestamps
- `created_by` (FK User) - Who created the AR

**Indexes:**
- `(customer, status)`
- `(status, aging_category)`
- `(due_date)`
- `(days_outstanding)`
- `(assigned_to, status)`

**Auto-Calculations in save():**
- `amount_outstanding = original_amount - amount_paid`
- Auto-update `status` based on amounts
- Auto-calculate `days_outstanding` from sale.created_at
- Auto-calculate `aging_category` from days_outstanding

**Properties:**
- `is_overdue` - Boolean, checks if past due_date
- `payment_percentage` - % of AR paid
- `days_overdue` - Days past due date

#### 2. ARPayment Model ✅
**File:** `/backend/sales/models.py` (after AccountsReceivable)

**Fields:**
- `id` (UUID) - Primary key
- `accounts_receivable` (FK) - AR being paid (PROTECT)
- `amount` - Payment amount
- `payment_method` - CASH | MOMO | CARD | BANK_TRANSFER | CHECK
  - NOTE: NO 'CREDIT' - these are actual payments
- `payment_date` - When payment received
- `transaction_id` - External transaction ID
- `reference_number` - Receipt/reference number
- `received_by` (FK User) - Who received the payment
- `notes` - Payment notes
- `created_at` - Timestamp

**Indexes:**
- `(accounts_receivable, payment_date)`
- `(payment_method, payment_date)`
- `(received_by, payment_date)`

**Auto-Actions in save():**
When new ARPayment created:
1. Update AR.amount_paid (sum of all AR payments)
2. AR.save() triggers auto-recalculation of outstanding/status
3. Update Customer.outstanding_balance
4. Update Sale.amount_paid and Sale.amount_due
5. Update Sale.status (COMPLETED/PARTIAL)

#### 3. Sale Model Updates ✅
**File:** `/backend/sales/models.py`

**New Field:**
```python
is_credit_sale = models.BooleanField(
    default=False,
    db_index=True,
    help_text='True if this sale is on credit (AR), False for cash/card/mobile payments'
)
```

**Added after:** `payment_type` field (line ~503)

### Migration ✅
**File:** `sales/migrations/0007_sale_is_credit_sale_accountsreceivable_arpayment_and_more.py`

**Operations:**
1. Add `is_credit_sale` field to Sale
2. Create AccountsReceivable model
3. Create ARPayment model
4. Add 5 indexes to AccountsReceivable
5. Add 3 indexes to ARPayment

**Migration Applied:** ✅ October 15, 2025 18:29 UTC

**Verification:**
```bash
source venv/bin/activate && python manage.py migrate sales
# Result: Applying sales.0007_sale_is_credit_sale_accountsreceivable_arpayment_and_more... OK
```

---

## 🚧 Phase 2: Sale Completion Logic - IN PROGRESS

### Objective
Modify `SaleViewSet.complete()` to route to two separate paths:
- **Payment Flow**: `is_credit_sale=False` → Create Payment records
- **Credit Flow**: `is_credit_sale=True` → Create AR record

### Files to Modify

#### 1. `/backend/sales/views.py`

**Current Logic** (lines ~470):
```python
# PROBLEMATIC - Skips Payment for credit
if data['payment_type'] != 'CREDIT':
    for payment_data in payments_data:
        Payment.objects.create(...)
```

**New Logic** (TO IMPLEMENT):
```python
@action(detail=True, methods=['post'])
def complete(self, request, pk=None):
    """
    Complete sale - routes to either payment flow or credit flow.
    """
    sale = self.get_object()
    is_credit = request.data.get('is_credit_sale', False)
    
    # Route to appropriate flow
    if is_credit:
        return self._complete_credit_sale(sale, request)
    else:
        return self._complete_payment_sale(sale, request)


def _complete_payment_sale(self, sale, request):
    """
    PAYMENT FLOW - for cash/card/mobile sales.
    Creates Payment records, updates sale status.
    """
    payments_data = request.data.get('payments', [])
    
    # Validate payments exist
    if not payments_data:
        return Response(
            {'error': 'Payment sales must have payment records'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Create Payment records
    total_paid = Decimal('0.00')
    for payment_data in payments_data:
        payment = Payment.objects.create(
            sale=sale,
            customer=sale.customer,
            payment_method=payment_data['payment_method'],
            amount_paid=payment_data['amount'],
            status='SUCCESSFUL',
            processed_by=request.user
        )
        total_paid += payment.amount_paid
    
    # Update sale
    sale.amount_paid = total_paid
    sale.amount_due = sale.total_amount - total_paid
    sale.is_credit_sale = False
    
    if sale.amount_due <= 0:
        sale.status = 'COMPLETED'
    elif sale.amount_paid > 0:
        sale.status = 'PARTIAL'
    
    sale.save()
    
    return Response({
        'success': True,
        'sale_id': str(sale.id),
        'receipt_number': sale.receipt_number,
        'flow': 'payment',
        'total_paid': str(total_paid)
    })


def _complete_credit_sale(self, sale, request):
    """
    CREDIT FLOW - for AR sales.
    Creates AR record, updates customer balance.
    """
    from django.db import transaction
    
    with transaction.atomic():
        # Update sale
        sale.is_credit_sale = True
        sale.amount_paid = Decimal('0.00')
        sale.amount_due = sale.total_amount
        sale.status = 'PENDING'
        sale.payment_type = 'CREDIT'  # Set for backward compatibility
        sale.save()
        
        # Get customer's old balance for audit trail
        old_balance = sale.customer.outstanding_balance
        
        # Create AR record
        due_date = request.data.get('due_date')  # Optional expected payment date
        
        ar = AccountsReceivable.objects.create(
            sale=sale,
            customer=sale.customer,
            original_amount=sale.total_amount,
            amount_paid=Decimal('0.00'),
            amount_outstanding=sale.total_amount,
            due_date=due_date,
            created_by=request.user,
            notes=request.data.get('notes', '')
        )
        
        # Update customer balance
        sale.customer.outstanding_balance += sale.total_amount
        sale.customer.save()
        
        # Create audit trail
        CreditTransaction.objects.create(
            customer=sale.customer,
            transaction_type='CREDIT_SALE',
            amount=sale.total_amount,
            balance_before=old_balance,
            balance_after=sale.customer.outstanding_balance,
            reference_id=ar.id,  # Link to AR record
            description=f'Credit sale {sale.receipt_number}',
            created_by=request.user
        )
    
    return Response({
        'success': True,
        'sale_id': str(sale.id),
        'receipt_number': sale.receipt_number,
        'ar_id': str(ar.id),
        'flow': 'credit',
        'amount_due': str(ar.amount_outstanding),
        'due_date': ar.due_date,
        'customer_balance': str(sale.customer.outstanding_balance)
    })
```

**Status:** ⏳ TO IMPLEMENT

---

## 📋 Phase 3: AR Payment Recording - PLANNED

### New Endpoint

**Route:** `POST /api/sales/{id}/ar-payment/`

**Purpose:** Record payment against credit sale AR

**Implementation:**
```python
@action(detail=True, methods=['post'], url_path='ar-payment')
def record_ar_payment(self, request, pk=None):
    """
    Record payment against credit sale AR.
    Completely separate from Payment flow.
    """
    sale = self.get_object()
    
    # Validate it's a credit sale
    if not sale.is_credit_sale:
        return Response(
            {'error': 'This is not a credit sale'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get AR record
    try:
        ar = sale.accounts_receivable
    except AccountsReceivable.DoesNotExist:
        return Response(
            {'error': 'AR record not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Validate AR not already paid
    if ar.status == 'PAID':
        return Response(
            {'error': 'AR already fully paid'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get payment data
    amount = Decimal(request.data.get('amount'))
    payment_method = request.data.get('payment_method')
    
    # Validate amount
    if amount > ar.amount_outstanding:
        return Response(
            {'error': f'Payment ({amount}) exceeds outstanding ({ar.amount_outstanding})'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    from django.db import transaction
    
    with transaction.atomic():
        # Get customer's old balance for audit
        old_balance = sale.customer.outstanding_balance
        
        # Create AR Payment (NOT Payment model!)
        ar_payment = ARPayment.objects.create(
            accounts_receivable=ar,
            amount=amount,
            payment_method=payment_method,
            transaction_id=request.data.get('transaction_id'),
            reference_number=request.data.get('reference_number'),
            received_by=request.user,
            notes=request.data.get('notes', '')
        )
        
        # ARPayment.save() auto-updates:
        # - AR.amount_paid
        # - AR.amount_outstanding
        # - AR.status
        # - Customer.outstanding_balance
        # - Sale.amount_paid/amount_due/status
        
        # Refresh to get updated values
        ar.refresh_from_db()
        sale.refresh_from_db()
        sale.customer.refresh_from_db()
        
        # Create audit trail
        CreditTransaction.objects.create(
            customer=sale.customer,
            transaction_type='PAYMENT',
            amount=-amount,  # Negative = reducing balance
            balance_before=old_balance,
            balance_after=sale.customer.outstanding_balance,
            reference_id=ar_payment.id,
            description=f'AR payment for {sale.receipt_number} via {payment_method}',
            created_by=request.user
        )
    
    return Response({
        'success': True,
        'ar_payment_id': str(ar_payment.id),
        'amount_paid': str(amount),
        'ar_status': ar.status,
        'remaining_balance': str(ar.amount_outstanding),
        'customer_balance': str(sale.customer.outstanding_balance),
        'sale_status': sale.status
    })
```

**Status:** ⏳ NOT STARTED

---

## 📋 Phase 4: Data Migration - PLANNED

### Migrate Existing Credit Sales

**Goal:** Convert all existing `payment_type='CREDIT'` sales to new AR system

**Migration File:** `sales/migrations/0008_migrate_existing_credit_sales.py`

**Logic:**
```python
def migrate_credit_sales(apps, schema_editor):
    """
    Convert existing credit sales to AR system.
    """
    Sale = apps.get_model('sales', 'Sale')
    AccountsReceivable = apps.get_model('sales', 'AccountsReceivable')
    CreditTransaction = apps.get_model('sales', 'CreditTransaction')
    
    credit_sales = Sale.objects.filter(payment_type='CREDIT')
    
    migrated_count = 0
    for sale in credit_sales:
        # Check if AR already exists (avoid duplicates)
        if hasattr(sale, 'accounts_receivable'):
            continue
        
        # Set credit flag
        sale.is_credit_sale = True
        sale.save(update_fields=['is_credit_sale'])
        
        # Create AR record
        ar = AccountsReceivable.objects.create(
            sale=sale,
            customer=sale.customer,
            original_amount=sale.total_amount,
            amount_paid=sale.amount_paid,
            amount_outstanding=sale.amount_due,
            created_at=sale.created_at,
            created_by=sale.created_by,
            notes='Migrated from legacy credit sale'
        )
        
        # Update CreditTransaction references
        CreditTransaction.objects.filter(
            reference_id=sale.id,  # Old: pointed to Sale ID
            transaction_type='CREDIT_SALE'
        ).update(
            reference_id=ar.id  # New: point to AR ID
        )
        
        migrated_count += 1
    
    print(f'Migrated {migrated_count} credit sales to AR system')
```

**Verification:**
```bash
# After migration
python manage.py shell

from sales.models import Sale, AccountsReceivable

credit_sales = Sale.objects.filter(payment_type='CREDIT')
print(f"Total credit sales: {credit_sales.count()}")

ar_count = AccountsReceivable.objects.count()
print(f"Total AR records: {ar_count}")

# Should match!
assert credit_sales.count() == ar_count
```

**Status:** ⏳ NOT STARTED

---

## 📋 Phase 5: Update Analytics & Reports - PLANNED

### 1. Sales Summary Updates

**File:** `/backend/sales/views.py` - `summary()` method

**Current:** Queries based on `sale.payment_type`

**New:** Query based on `sale.is_credit_sale` and AR tables

```python
# Payment sales (is_credit_sale=False)
payment_sales = sales.filter(is_credit_sale=False)

payment_metrics = {
    'total_sales': payment_sales.count(),
    'total_revenue': payment_sales.aggregate(Sum('total_amount'))['total_amount__sum'] or Decimal('0.00'),
    'cash_revenue': Payment.objects.filter(
        sale__in=payment_sales,
        payment_method='CASH'
    ).aggregate(Sum('amount_paid'))['amount_paid__sum'] or Decimal('0.00'),
    # ... other payment methods
}

# Credit sales (is_credit_sale=True)
credit_sales = sales.filter(is_credit_sale=True)
ar_records = AccountsReceivable.objects.filter(sale__in=credit_sales)

credit_metrics = {
    'total_credit_sales': credit_sales.count(),
    'total_credit_issued': ar_records.aggregate(Sum('original_amount'))['original_amount__sum'] or Decimal('0.00'),
    'total_credit_collected': ar_records.aggregate(Sum('amount_paid'))['amount_paid__sum'] or Decimal('0.00'),
    'total_credit_outstanding': ar_records.aggregate(Sum('amount_outstanding'))['amount_outstanding__sum'] or Decimal('0.00'),
    
    # AR status breakdown
    'ar_pending': ar_records.filter(status='PENDING').aggregate(Sum('amount_outstanding'))['amount_outstanding__sum'] or Decimal('0.00'),
    'ar_partial': ar_records.filter(status='PARTIAL').aggregate(Sum('amount_outstanding'))['amount_outstanding__sum'] or Decimal('0.00'),
    'ar_paid_count': ar_records.filter(status='PAID').count(),
    
    # Aging breakdown
    'ar_current': ar_records.filter(aging_category='CURRENT').aggregate(Sum('amount_outstanding'))['amount_outstanding__sum'] or Decimal('0.00'),
    'ar_30_days': ar_records.filter(aging_category='30_DAYS').aggregate(Sum('amount_outstanding'))['amount_outstanding__sum'] or Decimal('0.00'),
    'ar_60_days': ar_records.filter(aging_category='60_DAYS').aggregate(Sum('amount_outstanding'))['amount_outstanding__sum'] or Decimal('0.00'),
    'ar_90_plus': ar_records.filter(aging_category='90_PLUS').aggregate(Sum('amount_outstanding'))['amount_outstanding__sum'] or Decimal('0.00'),
}
```

**Status:** ⏳ NOT STARTED

### 2. AR Aging Report Updates

**File:** `/backend/reports/views/financial_reports.py` - AR Aging view

**Current:** Queries `Sale.objects.filter(status__in=['PENDING', 'PARTIAL'])`

**New:** Query `AccountsReceivable` table directly

```python
# Simple query - dedicated AR table!
ar_records = AccountsReceivable.objects.filter(
    sale__storefront_id=storefront_id,
    status__in=['PENDING', 'PARTIAL']  # Outstanding AR only
).select_related('customer', 'sale')

# AR already has aging_category calculated!
totals = {
    'total_receivables': ar_records.aggregate(Sum('amount_outstanding'))['amount_outstanding__sum'] or Decimal('0.00'),
    'current': ar_records.filter(aging_category='CURRENT').aggregate(Sum('amount_outstanding'))['amount_outstanding__sum'] or Decimal('0.00'),
    '30_days': ar_records.filter(aging_category='30_DAYS').aggregate(Sum('amount_outstanding'))['amount_outstanding__sum'] or Decimal('0.00'),
    '60_days': ar_records.filter(aging_category='60_DAYS').aggregate(Sum('amount_outstanding'))['amount_outstanding__sum'] or Decimal('0.00'),
    '90_plus': ar_records.filter(aging_category='90_PLUS').aggregate(Sum('amount_outstanding'))['amount_outstanding__sum'] or Decimal('0.00'),
}
```

**Status:** ⏳ NOT STARTED

---

## 📋 Phase 6: Update Receipt Generation - PLANNED

**File:** `/backend/sales/receipt_generator.py`

**Change:** Check `is_credit_sale` instead of `payment_type`

```python
# BEFORE
is_credit_sale = sale.payment_type == 'CREDIT'

# AFTER
is_credit_sale = sale.is_credit_sale

# If credit, show AR info
if is_credit_sale:
    try:
        ar = sale.accounts_receivable
        credit_banner = f'''
        <div class="credit-sale-banner">
            <div class="credit-alert">
                <h2>⚠️ CREDIT SALE ⚠️</h2>
                <p class="credit-message">Payment on credit - Customer to pay later</p>
                <p class="credit-due">Amount Due: {format_currency(ar.amount_outstanding)}</p>
                {f'<p class="credit-due-date">Due Date: {ar.due_date.strftime("%B %d, %Y")}</p>' if ar.due_date else ''}
            </div>
        </div>
        '''
    except:
        credit_banner = ''
```

**Status:** ⏳ NOT STARTED

---

## Testing Checklist

### Unit Tests
- [ ] AccountsReceivable auto-calculations
  - [ ] `amount_outstanding = original_amount - amount_paid`
  - [ ] Status auto-update (PENDING → PARTIAL → PAID)
  - [ ] `days_outstanding` calculation
  - [ ] `aging_category` calculation
- [ ] ARPayment cascading updates
  - [ ] AR amounts update when payment created
  - [ ] Customer balance updates
  - [ ] Sale status updates
- [ ] Sale completion flows
  - [ ] Payment flow creates Payment records
  - [ ] Credit flow creates AR record
  - [ ] Validation prevents mixing flows

### Integration Tests
- [ ] Complete credit sale → Verify AR created
- [ ] Record AR payment → Verify all updates cascade
- [ ] Partial payment → Verify status=PARTIAL
- [ ] Full payment → Verify status=PAID, sale=COMPLETED
- [ ] Sales summary shows correct split
- [ ] AR Aging report shows AR records

### End-to-End Workflow
1. [ ] Create credit sale (is_credit_sale=True)
2. [ ] Verify AccountsReceivable created
3. [ ] Verify Customer.outstanding_balance increased
4. [ ] Record partial AR payment
5. [ ] Verify AR.status = PARTIAL
6. [ ] Verify balances updated
7. [ ] Record final payment
8. [ ] Verify AR.status = PAID
9. [ ] Verify Sale.status = COMPLETED
10. [ ] Verify reports reflect changes

---

## Rollback Plan

If issues arise, rollback procedure:

### 1. Revert Migration
```bash
python manage.py migrate sales 0006_sale_amount_refunded
```

### 2. Remove Models
```bash
# Edit sales/models.py
# Remove AccountsReceivable and ARPayment models
# Remove is_credit_sale field from Sale
```

### 3. Revert Code Changes
```bash
git checkout HEAD -- sales/views.py
git checkout HEAD -- reports/views/financial_reports.py
git checkout HEAD -- sales/receipt_generator.py
```

---

## Success Criteria

### Technical
- ✅ All migrations applied without errors
- ⏳ All credit sales have AR records
- ⏳ Payment sales have Payment records
- ⏳ No orphaned balances
- ⏳ All tests passing

### Functional
- ⏳ Can complete credit sales
- ⏳ Can record AR payments
- ⏳ Customer balances accurate
- ⏳ Sales summary separates payment/credit
- ⏳ AR Aging shows correct data
- ⏳ Receipts show credit indicator

---

## Progress Summary

**✅ Completed:**
- Phase 1: Database models created and migrated

**🚧 In Progress:**
- Phase 2: Sale completion logic updates

**⏳ Pending:**
- Phase 3: AR payment recording endpoint
- Phase 4: Data migration
- Phase 5: Analytics updates
- Phase 6: Receipt updates
- Testing & validation

**Next Steps:**
1. Implement `_complete_payment_sale()` and `_complete_credit_sale()`
2. Implement `record_ar_payment()` endpoint
3. Test credit sale creation
4. Create data migration
5. Update analytics and reports
