# Sales Feature - Frontend Implementation Plan

## Overview
This document outlines the frontend implementation plan for the sales feature, aligned with the comprehensive specification in `sales-feature-specification.md`.

## Component Architecture

```
src/features/dashboard/pages/SalesPage.tsx
├── components/sales/
│   ├── SaleCart.tsx                    // Main cart interface
│   ├── ProductSearch.tsx               // Search/scan products
│   ├── CartLineItem.tsx                // Individual cart item
│   ├── CartSummary.tsx                 // Totals, discounts, tax
│   ├── PaymentPanel.tsx                // Payment method selection
│   ├── CustomerSelector.tsx            // Customer search/select
│   ├── CheckoutModal.tsx               // Final checkout confirmation
│   ├── ReceiptModal.tsx                // Receipt display/print
│   ├── SalesList.tsx                   // Sales history table
│   ├── SaleDetailModal.tsx             // Sale details view
│   ├── RefundRequestForm.tsx           // Refund initiation
│   ├── RefundApprovalModal.tsx         // Manager approval
│   ├── StockAvailabilityIndicator.tsx  // Real-time stock display
│   └── PaymentMethodCard.tsx           // Payment method UI
├── components/customers/
│   ├── CustomerList.tsx                // Customer management
│   ├── CustomerDetailModal.tsx         // Customer info/credit
│   ├── CreditStatusCard.tsx            // Credit limit display
│   ├── CustomerPaymentForm.tsx         // Record payment
│   └── PurchaseHistoryTable.tsx        // Customer purchases
└── components/reports/
    ├── DailySalesReport.tsx            // Daily summary
    ├── ProductSalesChart.tsx           // Product analytics
    └── SalesAnalyticsDashboard.tsx     // Overview dashboard
```

## State Management

### Sales Slice (`src/store/slices/salesSlice.ts`)

```typescript
interface SalesState {
  // Current cart
  currentCart: Sale | null
  cartLoading: boolean
  cartError: string | null
  
  // Sales list
  sales: Sale[]
  salesStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  salesError: string | null
  salesPagination: PaginationInfo
  salesFilters: SalesFilters
  
  // Sale detail
  saleDetail: Sale | null
  saleDetailStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  
  // Mutations
  mutations: {
    addItem: RequestStatus
    updateItem: RequestStatus
    removeItem: RequestStatus
    checkout: RequestStatus
    cancel: RequestStatus
  }
  
  // Errors
  errors: {
    addItem: string | null
    updateItem: string | null
    removeItem: string | null
    checkout: string | null
    cancel: string | null
  }
}
```

### Customers Slice (`src/store/slices/customersSlice.ts`)

```typescript
interface CustomersState {
  customers: Customer[]
  customersStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  customersError: string | null
  
  customerDetail: CustomerDetail | null
  customerDetailStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  
  creditStatus: CreditStatus | null
  
  mutations: {
    create: RequestStatus
    update: RequestStatus
    recordPayment: RequestStatus
  }
}
```

### Refunds Slice (`src/store/slices/refundsSlice.ts`)

```typescript
interface RefundsState {
  refunds: Refund[]
  refundsStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  
  refundDetail: Refund | null
  
  mutations: {
    request: RequestStatus
    approve: RequestStatus
    reject: RequestStatus
    process: RequestStatus
  }
}
```

## Service Layer

### Sales Service (`src/services/salesService.ts`)

```typescript
export const salesService = {
  // Cart operations
  createSale(payload: CreateSalePayload): Promise<Sale>
  addItem(saleId: UUID, item: AddItemPayload): Promise<SaleItem>
  updateItem(saleId: UUID, itemId: UUID, updates: UpdateItemPayload): Promise<SaleItem>
  removeItem(saleId: UUID, itemId: UUID): Promise<void>
  
  // Checkout
  completeSale(saleId: UUID, payload: CompleteSalePayload): Promise<Sale>
  cancelSale(saleId: UUID, reason: string): Promise<Sale>
  
  // Queries
  getSale(saleId: UUID): Promise<Sale>
  listSales(params: SalesQueryParams): Promise<PaginatedResponse<Sale>>
  
  // Stock
  checkStockAvailability(storefrontId: UUID, productId: UUID): Promise<StockAvailability>
  
  // Receipt
  getReceipt(saleId: UUID, format: 'pdf' | 'html'): Promise<Blob | string>
}
```

### Customers Service (`src/services/customersService.ts`)

```typescript
export const customersService = {
  createCustomer(payload: CustomerPayload): Promise<Customer>
  updateCustomer(id: UUID, payload: Partial<CustomerPayload>): Promise<Customer>
  getCustomer(id: UUID): Promise<CustomerDetail>
  listCustomers(params: CustomersQueryParams): Promise<PaginatedResponse<Customer>>
  
  getCreditStatus(customerId: UUID): Promise<CreditStatus>
  recordPayment(customerId: UUID, payload: PaymentPayload): Promise<Payment>
  getPurchaseHistory(customerId: UUID, params: QueryParams): Promise<PaginatedResponse<Sale>>
}
```

### Refunds Service (`src/services/refundsService.ts`)

```typescript
export const refundsService = {
  requestRefund(payload: RefundRequestPayload): Promise<Refund>
  approveRefund(refundId: UUID, notes: string): Promise<Refund>
  rejectRefund(refundId: UUID, reason: string): Promise<Refund>
  processRefund(refundId: UUID, payload: ProcessRefundPayload): Promise<Refund>
  
  listRefunds(params: RefundsQueryParams): Promise<PaginatedResponse<Refund>>
  getRefund(refundId: UUID): Promise<Refund>
}
```

## Implementation Phases

### Phase 1: Basic Cart & Cash Sales (Priority 1)
**Goal:** Staff can create simple cash sales

**Components to build:**
1. ✅ SaleCart.tsx - Main interface
2. ✅ ProductSearch.tsx - Find products
3. ✅ CartLineItem.tsx - Display items
4. ✅ CartSummary.tsx - Show totals
5. ✅ PaymentPanel.tsx - Cash payment only
6. ✅ CheckoutModal.tsx - Confirm and complete

**State management:**
- Create salesSlice with cart operations
- Implement addItem, updateItem, removeItem thunks
- Implement checkout thunk (cash only)

**API integration:**
- POST /api/sales/ (create cart)
- POST /api/sales/{id}/items/ (add item)
- PATCH /api/sales/{id}/items/{item_id}/ (update)
- DELETE /api/sales/{id}/items/{item_id}/ (remove)
- POST /api/sales/{id}/complete/ (checkout)

**Acceptance criteria:**
- Staff can search for products
- Add products to cart with quantities
- Update quantities
- Remove items
- See real-time totals
- Complete cash sale
- Print receipt

### Phase 2: Stock Tracking (Priority 1)
**Goal:** Real-time stock visibility and reservation

**Components to build:**
1. ✅ StockAvailabilityIndicator.tsx - Show stock levels
2. ✅ LowStockWarning.tsx - Alert component
3. ✅ OutOfStockBadge.tsx - Visual indicator

**Features:**
- Real-time stock checks during cart building
- Visual indicators (green/yellow/red)
- Prevent exceeding available stock
- Show reserved vs available quantities
- Auto-refresh stock on cart changes

**API integration:**
- GET /api/storefronts/{id}/stock-products/{product_id}/availability/

**Acceptance criteria:**
- Stock levels update in real-time
- Cannot add more than available
- Clear warnings when stock is low
- Graceful handling of out-of-stock

### Phase 3: Sales History (Priority 2)
**Goal:** View and search past sales

**Components to build:**
1. ✅ SalesList.tsx - Table view
2. ✅ SaleDetailModal.tsx - Full details
3. ✅ SalesFilters.tsx - Filter panel
4. ✅ ReceiptModal.tsx - View/print receipt

**Features:**
- Paginated sales list
- Filter by date, status, payment type, customer
- Search by receipt number
- View sale details
- Reprint receipts
- Export to CSV/PDF

**API integration:**
- GET /api/sales/ (with filters)
- GET /api/sales/{id}/
- GET /api/sales/{id}/receipt/

**Acceptance criteria:**
- Can browse sales history
- Filters work correctly
- Sale details are complete
- Receipts can be reprinted

### Phase 4: Customer Management (Priority 2)
**Goal:** Manage customer database

**Components to build:**
1. ✅ CustomerList.tsx - Customer table
2. ✅ CustomerForm.tsx - Create/edit
3. ✅ CustomerDetailModal.tsx - View details
4. ✅ CustomerSelector.tsx - Search in cart

**Features:**
- Create new customers
- Edit customer info
- View purchase history
- Search customers quickly
- Select customer for sale

**API integration:**
- POST /api/customers/
- PATCH /api/customers/{id}/
- GET /api/customers/
- GET /api/customers/{id}/

**Acceptance criteria:**
- Can create customers
- Can update customer info
- Can search customers
- Can associate customer with sale

### Phase 5: Credit Sales (Priority 2)
**Goal:** Sell on credit with limit checks

**Components to build:**
1. ✅ CreditStatusCard.tsx - Show credit info
2. ✅ CreditLimitWarning.tsx - Alert component
3. ✅ CustomerPaymentForm.tsx - Record payments
4. ✅ CreditTransactionsList.tsx - Transaction history

**Features:**
- Check credit limit before sale
- Visual credit status (available/used)
- Warning if approaching limit
- Block sale if over limit
- Record customer payments
- Update outstanding balance

**API integration:**
- GET /api/customers/{id}/credit-status/
- POST /api/customers/{id}/payments/
- GET /api/customers/{id}/purchases/

**Acceptance criteria:**
- Credit limits enforced
- Clear credit status display
- Can record payments
- Balance updates correctly

### Phase 6: Refunds & Returns (Priority 3)
**Goal:** Handle product returns

**Components to build:**
1. ✅ RefundRequestForm.tsx - Initiate refund
2. ✅ RefundApprovalModal.tsx - Manager approval
3. ✅ RefundProcessModal.tsx - Process refund
4. ✅ RefundsList.tsx - Refunds history
5. ✅ WarrantyChecker.tsx - Check eligibility

**Features:**
- Request refund from original sale
- Select items and quantities
- Check warranty eligibility
- Manager approval workflow
- Process refund (cash/credit note)
- Restock handling

**API integration:**
- POST /api/refunds/
- POST /api/refunds/{id}/approve/
- POST /api/refunds/{id}/reject/
- POST /api/refunds/{id}/process/
- GET /api/sales/{id}/refund-eligibility/

**Acceptance criteria:**
- Can initiate refund
- Warranty checks work
- Approval workflow functions
- Refunds process correctly
- Stock restocked if applicable

### Phase 7: Multiple Payment Methods (Priority 3)
**Goal:** Accept card, mobile money, credit

**Components to build:**
1. ✅ PaymentMethodSelector.tsx - Choose methods
2. ✅ CardPaymentForm.tsx - Stripe/Paystack
3. ✅ MobileMoneyForm.tsx - Phone input
4. ✅ SplitPaymentPanel.tsx - Multiple methods

**Features:**
- Card payment integration
- Mobile money integration
- Split payments
- Payment validation
- Transaction references
- Failure handling

**API integration:**
- POST /api/payments/card-intent/
- POST /api/payments/mobile-money/
- GET /api/payments/{id}/status/

**Acceptance criteria:**
- Card payments work
- Mobile money works
- Can split payments
- Errors handled gracefully
- Payment status tracked

### Phase 8: Reporting (Priority 4)
**Goal:** Sales analytics and insights

**Components to build:**
1. ✅ DailySalesReport.tsx - Daily summary
2. ✅ ProductSalesChart.tsx - Product performance
3. ✅ StaffPerformanceTable.tsx - Staff metrics
4. ✅ SalesAnalyticsDashboard.tsx - Overview

**Features:**
- Daily sales summary
- Product performance charts
- Staff performance metrics
- Export reports
- Date range filtering

**API integration:**
- GET /api/reports/daily-sales/
- GET /api/reports/product-sales/

**Acceptance criteria:**
- Reports display correctly
- Charts are accurate
- Can export data
- Filters work

## UI/UX Guidelines

### Cart Interface
- **Left side:** Product search and catalog
- **Right side:** Active cart
- **Bottom:** Totals and checkout button
- **Colors:** Green (add), Yellow (low stock), Red (out of stock)

### Keyboard Shortcuts
- `F2`: New sale
- `F3`: Search product
- `F4`: Customer lookup
- `F8`: Checkout
- `ESC`: Cancel action
- `Enter`: Confirm
- `/`: Focus search

### Mobile Responsiveness
- Stack cart below product search on mobile
- Touch-friendly buttons (min 44px)
- Simplified layout for small screens

### Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader announcements for cart changes
- High contrast mode support

## Testing Strategy

### Unit Tests
- Cart calculation logic
- Stock availability checks
- Payment validation
- Discount calculations

### Integration Tests
- Complete sale workflow
- Refund workflow
- Customer payment workflow

### E2E Tests (Cypress)
- Create retail sale
- Create credit sale
- Process refund
- Split payment sale

## Performance Optimizations

### Lazy Loading
- Load components on demand
- Defer heavy reports
- Paginate large lists

### Caching
- Cache product catalog (5 minutes)
- Cache customer list (1 minute)
- Invalidate on mutations

### Debouncing
- Product search (300ms)
- Stock availability checks (500ms)
- Auto-save cart (1 second)

## Error Handling

### User-Friendly Messages
```typescript
const ERROR_MESSAGES = {
  INSUFFICIENT_STOCK: "Not enough stock available. Only {available} units left.",
  CREDIT_LIMIT_EXCEEDED: "Credit limit exceeded. Customer has ${available} available credit.",
  PAYMENT_FAILED: "Payment failed: {reason}. Please try again or use a different method.",
  NETWORK_ERROR: "Connection lost. Changes saved locally and will sync when reconnected."
}
```

### Retry Logic
- Auto-retry failed API calls (3 attempts)
- Exponential backoff (1s, 2s, 4s)
- Queue mutations for offline support

## Accessibility Requirements

- WCAG 2.1 Level AA compliance
- Keyboard navigation
- Screen reader support
- Color contrast ratios
- Focus indicators
- Skip links

## Browser Support

- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)
- Mobile Safari (iOS 13+)
- Chrome Mobile (Android 10+)

## Next Steps

1. Review this plan with team
2. Set up project board with tasks
3. Create component skeletons
4. Implement Phase 1 (basic cart)
5. Iterate based on feedback

---

**Total estimated time:** 6-8 weeks
**Team size:** 2 frontend developers
**Review cadence:** Weekly demos
