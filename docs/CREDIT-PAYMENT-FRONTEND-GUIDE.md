# 💳 Credit Payment Tracking - Frontend Quick Guide

**Backend Status:** ✅ COMPLETE & READY  
**Frontend Status:** 🔄 Implementation Recommended  
**Priority:** HIGH (Accounts Receivable Management)

---

## 🎯 What's Already Done (Backend)

✅ Payment recording endpoint  
✅ Payment status tracking (PENDING/PARTIAL/COMPLETED)  
✅ Customer balance management  
✅ Payment history  
✅ Advanced filters  
✅ All tests passing  

---

## 📱 Frontend Tasks

### 1. Create Accounts Receivable Page

**Location:** `/src/features/dashboard/pages/AccountsReceivablePage.tsx`

**Features:**
- List all unpaid/partial credit sales
- Show total outstanding balance
- Payment status badges
- Quick payment recording
- Filter by customer, date, amount

**API Calls:**
```typescript
// Get all unpaid credit sales
const unpaidSales = await api.get('/sales/api/sales/', {
  params: { payment_status: 'unpaid' }
})

// Get partially paid sales
const partialSales = await api.get('/sales/api/sales/', {
  params: { payment_status: 'partial' }
})

// Get all sales with outstanding balance
const outstanding = await api.get('/sales/api/sales/', {
  params: { has_outstanding_balance: true }
})
```

---

### 2. Create Record Payment Modal

**Location:** `/src/features/dashboard/components/sales/RecordPaymentModal.tsx`

**Props:**
```typescript
interface RecordPaymentModalProps {
  sale: Sale
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}
```

**Form Fields:**
```typescript
interface RecordPaymentForm {
  amount_paid: number        // Max: sale.amount_due
  payment_method: 'CASH' | 'CARD' | 'MOBILE' | 'CREDIT'
  reference_number?: string
  notes?: string
}
```

**API Call:**
```typescript
const recordPayment = async (saleId: string, data: RecordPaymentForm) => {
  const response = await api.post(
    `/sales/api/sales/${saleId}/record_payment/`,
    data
  )
  return response.data
}
```

**Validation:**
- Amount must be > 0
- Amount must be ≤ amount_due
- Payment method required

---

### 3. Enhance SalesHistory Component

**Add to existing SalesHistory.tsx:**

#### A. New Columns

```typescript
// Add after existing columns
<th>Payment Status</th>
<th>Payment Progress</th>
<th>Actions</th>

// In table body
<td>
  {sale.payment_type === 'CREDIT' ? (
    <Badge bg={getPaymentStatusBadge(sale.status)}>
      {sale.payment_status || 'N/A'}
    </Badge>
  ) : 'N/A'}
</td>

<td>
  {sale.payment_type === 'CREDIT' && sale.payment_completion_percentage && (
    <ProgressBar 
      now={sale.payment_completion_percentage}
      label={`${sale.payment_completion_percentage}%`}
    />
  )}
</td>

<td>
  {sale.payment_type === 'CREDIT' && sale.amount_due > 0 && (
    <Button
      size="sm"
      variant="primary"
      onClick={() => openRecordPaymentModal(sale)}
    >
      Record Payment
    </Button>
  )}
</td>
```

#### B. Helper Functions

```typescript
const getPaymentStatusBadge = (status: string): string => {
  switch (status) {
    case 'PENDING':
      return 'danger'
    case 'PARTIAL':
      return 'warning'
    case 'COMPLETED':
      return 'success'
    default:
      return 'secondary'
  }
}
```

#### C. Payment Filters

```typescript
// Add to existing filters
const [paymentStatus, setPaymentStatus] = useState<string>('')

<Form.Select
  value={paymentStatus}
  onChange={(e) => setPaymentStatus(e.target.value)}
>
  <option value="">All Payments</option>
  <option value="unpaid">Unpaid</option>
  <option value="partial">Partially Paid</option>
  <option value="paid">Fully Paid</option>
</Form.Select>
```

---

### 4. Update Sale Type

**Location:** `/src/types/sale.ts`

Add new fields to `Sale` interface:

```typescript
export interface Sale {
  // ... existing fields ...
  
  // NEW: Credit payment tracking fields
  payment_status?: string  // "Unpaid", "Partially Paid (200/500)", "Fully Paid"
  payment_completion_percentage?: number  // 0-100
  payments?: Payment[]  // Payment history
}

export interface Payment {
  id: string
  amount_paid: string | number
  payment_method: 'CASH' | 'CARD' | 'MOBILE' | 'CREDIT'
  payment_date: string
  reference_number?: string
  notes?: string
}
```

---

### 5. Create API Service

**Location:** `/src/services/salesService.ts`

Add new functions:

```typescript
export async function recordPayment(
  saleId: UUID,
  data: {
    amount_paid: number
    payment_method: string
    reference_number?: string
    notes?: string
  }
): Promise<{ payment: Payment; sale: Sale }> {
  const response = await httpClient.post<{ payment: Payment; sale: Sale }>(
    `/sales/api/sales/${saleId}/record_payment/`,
    data
  )
  return response.data
}

export async function getUnpaidCreditSales(
  storefrontId?: UUID
): Promise<PaginatedResponse<Sale>> {
  const params: Record<string, string> = {
    payment_status: 'unpaid',
    payment_type: 'CREDIT'
  }
  
  if (storefrontId) {
    params.storefront = storefrontId
  }
  
  const response = await httpClient.get<PaginatedResponse<Sale>>(
    '/sales/api/sales/',
    { params }
  )
  return response.data
}
```

---

### 6. Add Redux Actions

**Location:** `/src/store/slices/salesSlice.ts`

```typescript
export const recordSalePayment = createAsyncThunk(
  'sales/recordPayment',
  async ({ saleId, paymentData }: { saleId: UUID; paymentData: any }) => {
    return await recordPayment(saleId, paymentData)
  }
)

// Add to extraReducers
.addCase(recordSalePayment.fulfilled, (state, action) => {
  const updatedSale = action.payload.sale
  const index = state.sales.findIndex(s => s.id === updatedSale.id)
  if (index !== -1) {
    state.sales[index] = updatedSale
  }
})
```

---

## 🎨 UI Components Examples

### Payment Status Badge

```tsx
<Badge 
  bg={sale.status === 'PENDING' ? 'danger' : 
      sale.status === 'PARTIAL' ? 'warning' : 'success'}
>
  {sale.payment_status}
</Badge>
```

### Payment Progress Bar

```tsx
<ProgressBar 
  now={sale.payment_completion_percentage}
  label={`${sale.payment_completion_percentage}%`}
  variant={
    sale.payment_completion_percentage === 100 ? 'success' :
    sale.payment_completion_percentage >= 50 ? 'warning' : 'danger'
  }
/>
```

### Outstanding Balance Alert

```tsx
{sale.amount_due > 0 && (
  <Alert variant="warning">
    <strong>Outstanding Balance:</strong> {formatCurrency(sale.amount_due)}
  </Alert>
)}
```

### Payment History Table

```tsx
<Table size="sm">
  <thead>
    <tr>
      <th>Date</th>
      <th>Amount</th>
      <th>Method</th>
      <th>Reference</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>
    {sale.payments?.map(payment => (
      <tr key={payment.id}>
        <td>{formatDate(payment.payment_date)}</td>
        <td>{formatCurrency(payment.amount_paid)}</td>
        <td><Badge>{payment.payment_method}</Badge></td>
        <td><code>{payment.reference_number || 'N/A'}</code></td>
        <td>{payment.notes || '-'}</td>
      </tr>
    ))}
  </tbody>
</Table>
```

---

## 📊 Sample Implementation

### Complete RecordPaymentModal.tsx

```tsx
import { useState } from 'react'
import { Modal, Button, Form, Alert } from 'react-bootstrap'
import { useAppDispatch } from '../../hooks'
import { recordSalePayment } from '../../store/slices/salesSlice'
import type { Sale } from '../../types/sale'

interface Props {
  sale: Sale
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RecordPaymentModal({ sale, isOpen, onClose, onSuccess }: Props) {
  const dispatch = useAppDispatch()
  const [formData, setFormData] = useState({
    amount_paid: '',
    payment_method: 'CASH',
    reference_number: '',
    notes: ''
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const amount = parseFloat(formData.amount_paid)
    
    // Validation
    if (amount <= 0) {
      setError('Amount must be greater than 0')
      return
    }
    
    if (amount > parseFloat(sale.amount_due)) {
      setError(`Amount cannot exceed outstanding balance (${sale.amount_due})`)
      return
    }

    setIsSubmitting(true)

    try {
      await dispatch(recordSalePayment({
        saleId: sale.id,
        paymentData: {
          ...formData,
          amount_paid: amount
        }
      })).unwrap()

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal show={isOpen} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>Record Payment</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <Alert variant="info">
          <strong>Sale:</strong> {sale.receipt_number}<br />
          <strong>Total:</strong> {sale.total_amount}<br />
          <strong>Paid:</strong> {sale.amount_paid}<br />
          <strong>Outstanding:</strong> {sale.amount_due}
        </Alert>

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Amount to Pay *</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0.01"
              max={sale.amount_due}
              value={formData.amount_paid}
              onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
              required
            />
            <Form.Text>Maximum: {sale.amount_due}</Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Payment Method *</Form.Label>
            <Form.Select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              required
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="MOBILE">Mobile Money</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Reference Number</Form.Label>
            <Form.Control
              type="text"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              placeholder="Transaction ID, Check #, etc."
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Payment notes..."
            />
          </Form.Group>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Recording...' : 'Record Payment'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
```

---

## ✅ Implementation Checklist

### Phase 1: Basic Integration (2-4 hours)
- [ ] Add new fields to `Sale` type
- [ ] Update `salesService.ts` with payment functions
- [ ] Add payment status column to SalesHistory
- [ ] Add payment progress bar
- [ ] Create RecordPaymentModal component
- [ ] Wire up Record Payment button

### Phase 2: Enhanced Features (2-3 hours)
- [ ] Create Accounts Receivable page
- [ ] Add payment status filters
- [ ] Show payment history in sale details
- [ ] Add outstanding balance alerts
- [ ] Update Redux actions

### Phase 3: Polish (1-2 hours)
- [ ] Add loading states
- [ ] Error handling
- [ ] Success notifications
- [ ] Responsive design
- [ ] Testing

**Total Estimated Time:** 5-9 hours

---

## 🧪 Testing Checklist

- [ ] Can record payment on unpaid credit sale
- [ ] Status updates from PENDING → PARTIAL
- [ ] Status updates from PARTIAL → COMPLETED
- [ ] Can't record payment > amount_due
- [ ] Payment history displays correctly
- [ ] Filters work (unpaid/partial/paid)
- [ ] Progress bar shows correct percentage
- [ ] Customer balance updates
- [ ] Handles errors gracefully

---

## 📚 Related Documentation

- **Backend Guide:** `CREDIT_SALES_PAYMENT_TRACKING.md`
- **API Reference:** Backend documentation
- **Sales API:** `/docs/sales-api-endpoints.md`

---

## 🎯 Expected Outcome

After implementation, users will be able to:

✅ See all unpaid credit sales at a glance  
✅ Record payments with transaction details  
✅ Track payment progress visually  
✅ View complete payment history  
✅ Filter by payment status  
✅ Manage accounts receivable effectively  

**Status:** Backend ready → Frontend implementation recommended

**Priority:** HIGH (Critical for financial management)

---

**Questions? Refer to the comprehensive backend documentation!**
