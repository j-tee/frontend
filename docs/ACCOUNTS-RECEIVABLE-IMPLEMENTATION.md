# 💳 Credit Management - Frontend Implementation Plan

**Date:** January 7, 2025  
**Feature:** Credit Sales Payment Tracking  
**Type:** Dual Navigation (Standalone Page + Sales Tab)  
**Priority:** HIGH

---

## 🎯 Overview

Implement **credit payment tracking** with two access points:

1. **Accounts Receivable Page** (Standalone) - Broad financial management, aging reports, customer balances
2. **Credit Management Tab** (Sales Page) - Focused credit sales tracking and payment recording

This is a **financial management feature**, completely separate from the Settings system.

---

## 📍 Location & Navigation

### Dual Navigation Approach

#### Option 1: Standalone Page (Accounts Receivable)

**Path:** `/src/features/dashboard/pages/AccountsReceivablePage.tsx`  
**Route:** `/app/accounts-receivable`  
**Use Case:** Comprehensive AR management, aging reports, customer analysis

**Add to Sidebar:**

```tsx
// In DashboardLayout.tsx sidebar
<Nav.Link 
  as={Link} 
  to="/app/accounts-receivable"
  active={location.pathname === '/app/accounts-receivable'}
>
  <i className="bi bi-cash-coin"></i> Accounts Receivable
</Nav.Link>
```

#### Option 2: Sales Page Tab (Credit Management) ⭐ RECOMMENDED

**Path:** Part of `/src/features/dashboard/pages/SalesPage.tsx`  
**Component:** `/src/features/dashboard/components/sales/CreditManagement.tsx`  
**Use Case:** Quick access to credit sales from Sales context

**Add as Tab in Sales:**

```tsx
// In SalesPage.tsx
<Tabs defaultActiveKey="history" id="sales-tabs" className="mb-3">
  <Tab eventKey="history" title="Sales History">
    <SalesHistory />
  </Tab>
  <Tab eventKey="credit" title="Credit Management">
    <CreditManagement />
  </Tab>
</Tabs>
```

**Both options can coexist** - Sales tab for daily operations, standalone page for detailed AR management.

---

## 🏗️ Page Architecture

### Main Component Structure

```
AccountsReceivablePage/
├── index.tsx                    # Main page component
├── components/
│   ├── UnpaidSalesList.tsx     # List of unpaid credit sales
│   ├── PartialPaymentsList.tsx # Partially paid sales
│   ├── RecordPaymentModal.tsx  # Payment recording modal
│   ├── PaymentHistoryModal.tsx # View payment history
│   ├── CustomerBalanceCard.tsx # Customer outstanding balance
│   └── SummaryCards.tsx        # AR summary metrics
└── styles/
    └── AccountsReceivable.module.css
```

---

## 🎨 UI Layout

### Page Layout (Desktop)

```
┌─────────────────────────────────────────────────────────────┐
│  Accounts Receivable                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Total    │  │ Unpaid   │  │ Partial  │  │ Overdue  │  │
│  │ $50,000  │  │ 33 sales │  │ 5 sales  │  │ 12 sales │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Filters: [Customer ▼] [Date Range ▼] [Amount ▼] [Status ▼]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Unpaid Sales (33)                          [+ Record All] │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Receipt #    │ Customer  │ Amount  │ Due │ Actions    │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ REC-001      │ TechPro   │ $500.00 │ 30d │ [Pay Now] │ │
│  │ REC-002      │ AccraNet  │ $320.70 │ 15d │ [Pay Now] │ │
│  │ REC-003      │ Digital   │ $1,590  │ 5d  │ [Pay Now] │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Partially Paid (5)                                        │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Receipt #    │ Customer  │ Progress │ Due │ Actions   │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ REC-004      │ Walk-in   │ 40% ▓▓░░░│$300│[Pay More] │ │
│  │ REC-005      │ Shop XYZ  │ 75% ▓▓▓▓░│$125│[Pay More] │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Component Specifications

### 1. AccountsReceivablePage.tsx (Main)

**Responsibilities:**
- Fetch unpaid/partial credit sales
- Display summary cards
- Manage filters
- Handle payment recording
- Refresh data after payments

**State:**
```typescript
interface ARPageState {
  unpaidSales: Sale[]
  partialSales: Sale[]
  filters: ARFilters
  selectedSale: Sale | null
  showRecordPaymentModal: boolean
  showPaymentHistoryModal: boolean
  isLoading: boolean
}

interface ARFilters {
  customerId?: string
  dateFrom?: string
  dateTo?: string
  minAmount?: number
  maxAmount?: number
  overdueDays?: number
}
```

**Key Features:**
- Tab navigation: Unpaid / Partial / All / Overdue
- Real-time summary metrics
- Bulk payment recording
- Export to CSV
- Print aging report

---

### 2. UnpaidSalesList.tsx

**Display Columns:**
- Receipt Number (link to sale detail)
- Customer Name
- Sale Date
- Total Amount
- Days Outstanding
- Due Date (if applicable)
- Status Badge (PENDING)
- Actions (Record Payment, View Details)

**Features:**
- Sortable columns
- Pagination
- Selection checkboxes (for bulk actions)
- Quick payment button

**Example Row:**
```tsx
<tr>
  <td>
    <Form.Check type="checkbox" />
  </td>
  <td>
    <Link to={`/app/sales/${sale.id}`}>
      {sale.receipt_number}
    </Link>
  </td>
  <td>{sale.customer_name || 'Walk-in'}</td>
  <td>{formatDate(sale.created_at)}</td>
  <td>
    <strong>{formatCurrency(sale.total_amount)}</strong>
  </td>
  <td>
    <Badge bg={getDaysOutstandingBadge(sale.days_outstanding)}>
      {sale.days_outstanding} days
    </Badge>
  </td>
  <td>
    <Badge bg="danger">UNPAID</Badge>
  </td>
  <td>
    <Button size="sm" onClick={() => openPaymentModal(sale)}>
      Record Payment
    </Button>
  </td>
</tr>
```

---

### 3. PartialPaymentsList.tsx

**Display Columns:**
- Receipt Number
- Customer Name
- Total Amount
- Amount Paid
- Amount Due
- Payment Progress (visual bar)
- Percentage Complete
- Actions (Pay More, View History)

**Example Row:**
```tsx
<tr>
  <td>{sale.receipt_number}</td>
  <td>{sale.customer_name}</td>
  <td>{formatCurrency(sale.total_amount)}</td>
  <td className="text-success">
    {formatCurrency(sale.amount_paid)}
  </td>
  <td className="text-danger">
    {formatCurrency(sale.amount_due)}
  </td>
  <td>
    <ProgressBar 
      now={sale.payment_completion_percentage}
      label={`${sale.payment_completion_percentage}%`}
      variant={getProgressVariant(sale.payment_completion_percentage)}
    />
  </td>
  <td>
    <Button size="sm" variant="primary" onClick={() => openPaymentModal(sale)}>
      Pay More
    </Button>
    <Button size="sm" variant="outline-secondary" onClick={() => viewHistory(sale)}>
      History
    </Button>
  </td>
</tr>
```

---

### 4. RecordPaymentModal.tsx

**Full Implementation** (as previously documented in CREDIT-PAYMENT-FRONTEND-GUIDE.md)

**Props:**
```typescript
interface RecordPaymentModalProps {
  sale: Sale
  isOpen: boolean
  onClose: () => void
  onSuccess: (payment: Payment) => void
}
```

**Form Fields:**
- Amount (max: sale.amount_due)
- Payment Method (CASH/CARD/MOBILE/BANK_TRANSFER)
- Reference Number (optional)
- Payment Date (default: today)
- Notes (optional)

**Validation:**
- Amount > 0
- Amount ≤ amount_due
- Payment method required

---

### 5. SummaryCards.tsx

**4 Metric Cards:**

```tsx
<Row className="mb-4">
  <Col md={3}>
    <Card>
      <Card.Body>
        <h6 className="text-muted">Total Outstanding</h6>
        <h3>{formatCurrency(totalOutstanding)}</h3>
        <small>{totalUnpaidSales} unpaid sales</small>
      </Card.Body>
    </Card>
  </Col>
  
  <Col md={3}>
    <Card>
      <Card.Body>
        <h6 className="text-muted">Unpaid Sales</h6>
        <h3 className="text-danger">{unpaidCount}</h3>
        <small>{formatCurrency(unpaidAmount)}</small>
      </Card.Body>
    </Card>
  </Col>
  
  <Col md={3}>
    <Card>
      <Card.Body>
        <h6 className="text-muted">Partially Paid</h6>
        <h3 className="text-warning">{partialCount}</h3>
        <small>{formatCurrency(partialDue)}</small>
      </Card.Body>
    </Card>
  </Col>
  
  <Col md={3}>
    <Card>
      <Card.Body>
        <h6 className="text-muted">Overdue</h6>
        <h3 className="text-danger">{overdueCount}</h3>
        <small>Over 30 days</small>
      </Card.Body>
    </Card>
  </Col>
</Row>
```

---

### 6. CustomerBalanceCard.tsx

**Show Top Debtors:**

```tsx
<Card>
  <Card.Header>
    <h5>Top Customers by Outstanding Balance</h5>
  </Card.Header>
  <Card.Body>
    <ListGroup variant="flush">
      {topDebtors.map(customer => (
        <ListGroup.Item key={customer.id}>
          <div className="d-flex justify-content-between">
            <div>
              <strong>{customer.name}</strong>
              <br />
              <small className="text-muted">
                {customer.unpaid_sales_count} unpaid sales
              </small>
            </div>
            <div className="text-end">
              <h6 className="text-danger mb-0">
                {formatCurrency(customer.outstanding_balance)}
              </h6>
              <Button size="sm" variant="link">
                View Details
              </Button>
            </div>
          </div>
        </ListGroup.Item>
      ))}
    </ListGroup>
  </Card.Body>
</Card>
```

---

### 7. PaymentHistoryModal.tsx

**Display Payment Timeline:**

```tsx
<Modal show={isOpen} onHide={onClose} size="lg">
  <Modal.Header closeButton>
    <Modal.Title>Payment History - {sale.receipt_number}</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <Alert variant="info">
      <Row>
        <Col>
          <strong>Total:</strong> {formatCurrency(sale.total_amount)}
        </Col>
        <Col>
          <strong>Paid:</strong> {formatCurrency(sale.amount_paid)}
        </Col>
        <Col>
          <strong>Due:</strong> {formatCurrency(sale.amount_due)}
        </Col>
      </Row>
    </Alert>

    <h6>Payment Timeline</h6>
    <Table striped>
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
            <td>{formatDateTime(payment.payment_date)}</td>
            <td className="text-success">
              {formatCurrency(payment.amount_paid)}
            </td>
            <td>
              <Badge>{payment.payment_method}</Badge>
            </td>
            <td>
              <code>{payment.reference_number || 'N/A'}</code>
            </td>
            <td>{payment.notes || '-'}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  </Modal.Body>
</Modal>
```

---

## 🔌 API Integration

### Fetch Unpaid Sales

```typescript
// services/salesService.ts
export async function getUnpaidCreditSales(
  storefrontId?: UUID
): Promise<PaginatedResponse<Sale>> {
  const params: Record<string, string> = {
    payment_status: 'unpaid',
    payment_type: 'CREDIT',
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

### Fetch Partially Paid Sales

```typescript
export async function getPartiallyPaidSales(
  storefrontId?: UUID
): Promise<PaginatedResponse<Sale>> {
  const params: Record<string, string> = {
    payment_status: 'partial',
    payment_type: 'CREDIT',
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

### Calculate Summary

```typescript
export async function getARSummary(
  storefrontId?: UUID
): Promise<ARSummary> {
  const params: Record<string, string> = {
    has_outstanding_balance: 'true',
  }
  
  if (storefrontId) {
    params.storefront = storefrontId
  }
  
  const response = await httpClient.get<PaginatedResponse<Sale>>(
    '/sales/api/sales/',
    { params }
  )
  
  // Calculate totals client-side
  const sales = response.data.results
  return {
    totalOutstanding: sales.reduce((sum, s) => sum + parseFloat(s.amount_due), 0),
    unpaidCount: sales.filter(s => s.status === 'PENDING').length,
    partialCount: sales.filter(s => s.status === 'PARTIAL').length,
    overdueCount: sales.filter(s => isOverdue(s)).length,
  }
}
```

---

## 🎨 UI/UX Features

### Filters

```tsx
<Row className="mb-3">
  <Col md={3}>
    <Form.Group>
      <Form.Label>Customer</Form.Label>
      <Form.Select value={filters.customerId} onChange={handleCustomerChange}>
        <option value="">All Customers</option>
        {customers.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </Form.Select>
    </Form.Group>
  </Col>
  
  <Col md={3}>
    <Form.Group>
      <Form.Label>Days Outstanding</Form.Label>
      <Form.Select value={filters.overdueDays} onChange={handleOverdueChange}>
        <option value="">All</option>
        <option value="7">Over 7 days</option>
        <option value="30">Over 30 days</option>
        <option value="60">Over 60 days</option>
        <option value="90">Over 90 days</option>
      </Form.Select>
    </Form.Group>
  </Col>
  
  <Col md={3}>
    <Form.Group>
      <Form.Label>Amount Range</Form.Label>
      <InputGroup>
        <Form.Control 
          type="number" 
          placeholder="Min"
          value={filters.minAmount}
          onChange={handleMinAmountChange}
        />
        <Form.Control 
          type="number" 
          placeholder="Max"
          value={filters.maxAmount}
          onChange={handleMaxAmountChange}
        />
      </InputGroup>
    </Form.Group>
  </Col>
  
  <Col md={3}>
    <Form.Group>
      <Form.Label>Status</Form.Label>
      <Form.Select value={filters.status} onChange={handleStatusChange}>
        <option value="">All</option>
        <option value="unpaid">Unpaid</option>
        <option value="partial">Partially Paid</option>
        <option value="overdue">Overdue</option>
      </Form.Select>
    </Form.Group>
  </Col>
</Row>
```

### Aging Badges

```typescript
const getDaysOutstandingBadge = (days: number): string => {
  if (days <= 7) return 'success'
  if (days <= 30) return 'warning'
  if (days <= 60) return 'danger'
  return 'dark' // Over 60 days
}
```

### Progress Bars

```typescript
const getProgressVariant = (percentage: number): string => {
  if (percentage >= 75) return 'success'
  if (percentage >= 50) return 'info'
  if (percentage >= 25) return 'warning'
  return 'danger'
}
```

---

## 📱 Mobile Responsiveness

### Card View for Mobile

```tsx
// Mobile view (< 768px)
<Card className="mb-2">
  <Card.Body>
    <div className="d-flex justify-content-between align-items-start">
      <div>
        <strong>{sale.receipt_number}</strong>
        <br />
        <small className="text-muted">{sale.customer_name}</small>
      </div>
      <Badge bg={getStatusBadge(sale.status)}>
        {sale.status}
      </Badge>
    </div>
    
    <hr />
    
    <Row>
      <Col xs={6}>
        <small className="text-muted">Amount</small>
        <div><strong>{formatCurrency(sale.total_amount)}</strong></div>
      </Col>
      <Col xs={6}>
        <small className="text-muted">Due</small>
        <div className="text-danger">
          <strong>{formatCurrency(sale.amount_due)}</strong>
        </div>
      </Col>
    </Row>
    
    {sale.payment_completion_percentage && (
      <>
        <hr />
        <ProgressBar 
          now={sale.payment_completion_percentage}
          label={`${sale.payment_completion_percentage}%`}
        />
      </>
    )}
    
    <div className="mt-3">
      <Button size="sm" variant="primary" block onClick={() => recordPayment(sale)}>
        Record Payment
      </Button>
    </div>
  </Card.Body>
</Card>
```

---

## ✅ Implementation Checklist

### Phase 1: Core Page (4-6 hours)
- [ ] Create `AccountsReceivablePage.tsx`
- [ ] Add route to router
- [ ] Add navigation link to sidebar
- [ ] Create `SummaryCards.tsx` component
- [ ] Create `UnpaidSalesList.tsx` component
- [ ] Integrate with API (unpaid sales)
- [ ] Add basic filters

### Phase 2: Payment Recording (2-3 hours)
- [ ] Create `RecordPaymentModal.tsx`
- [ ] Add payment recording API call
- [ ] Handle success/error states
- [ ] Update Redux state after payment
- [ ] Add success notifications

### Phase 3: Enhanced Features (2-3 hours)
- [ ] Create `PartialPaymentsList.tsx`
- [ ] Create `PaymentHistoryModal.tsx`
- [ ] Create `CustomerBalanceCard.tsx`
- [ ] Add advanced filters
- [ ] Add export to CSV

### Phase 4: Polish (1-2 hours)
- [ ] Mobile responsive design
- [ ] Loading states
- [ ] Empty states
- [ ] Error handling
- [ ] Accessibility (ARIA labels)
- [ ] Documentation

**Total Time Estimate: 9-14 hours**

---

## 🧪 Testing Checklist

- [ ] Can view unpaid credit sales
- [ ] Can view partially paid sales
- [ ] Summary cards show correct metrics
- [ ] Can record payment on unpaid sale
- [ ] Can record additional payment on partial sale
- [ ] Payment history displays correctly
- [ ] Filters work correctly
- [ ] Mobile view displays properly
- [ ] Export to CSV works
- [ ] Handles errors gracefully
- [ ] Loading states display
- [ ] Empty states display

---

## 📊 Success Metrics

**After Implementation:**

✅ Users can see all outstanding credit sales at a glance  
✅ Easy to record payments with full transaction details  
✅ Visual progress tracking for partial payments  
✅ Quick identification of overdue accounts  
✅ Customer balance overview  
✅ Complete payment history  
✅ Efficient accounts receivable management  

---

## 🎯 Key Differences from Settings

| Aspect | Settings | Accounts Receivable |
|--------|----------|---------------------|
| **Purpose** | User preferences | Financial management |
| **Location** | Settings sidebar item | Sales section or standalone |
| **Data** | User/business config | Transaction data |
| **Updates** | Infrequent | Daily/hourly |
| **Audience** | All users | Finance/sales team |
| **Actions** | Save preferences | Record payments |
| **Backend** | Settings API | Sales API |

---

## 📚 Related Documentation

- **Backend API:** `CREDIT_SALES_PAYMENT_TRACKING.md`
- **Sales History:** `SALES-HISTORY-COMPLETE.md`
- **API Endpoints:** Backend documentation

---

## 🚀 Next Steps

1. **Review this plan** with team
2. **Assign to frontend developer**
3. **Set up navigation** (sidebar or tab)
4. **Start with Phase 1** (core page)
5. **Iterate based on feedback**

**Priority:** HIGH - Critical for business operations  
**Estimated Time:** 9-14 hours  
**Dependencies:** Backend API (already complete ✅)

---

**This is a standalone financial management feature, not part of Settings!**
