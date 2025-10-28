# Sales Feature - Comprehensive Specification

## Document Version
Version: 1.0  
Date: October 3, 2025  
Author: Frontend Development Team  
Target: Backend API Implementation Guide

---

## Table of Contents
1. [Overview](#overview)
2. [Business Requirements](#business-requirements)
3. [Data Models](#data-models)
4. [API Endpoints](#api-endpoints)
5. [User Workflows](#user-workflows)
6. [Real-time Stock Tracking](#real-time-stock-tracking)
7. [Payment Processing](#payment-processing)
8. [Refunds & Returns](#refunds--returns)
9. [Audit Trail Requirements](#audit-trail-requirements)
10. [Security & Permissions](#security--permissions)
11. [Validation Rules](#validation-rules)
12. [Error Handling](#error-handling)

---

## Overview

### Purpose
The Sales feature is the core revenue-generating module of the POS system. It enables staff to:
- Create retail and wholesale sales transactions
- Process multiple payment types (cash, credit, card, mobile money)
- Track inventory in real-time during sales
- Manage customer credit lines
- Handle returns, refunds, and exchanges
- Maintain comprehensive audit trails

### Key Principles
1. **Real-time Accuracy**: Stock levels must update immediately during cart operations
2. **Audit Everything**: Every action must be traceable (who, what, when, why)
3. **Payment Flexibility**: Support multiple payment methods and split payments
4. **Customer-Centric**: Track customer purchase history and credit management
5. **Data Integrity**: Use database transactions to prevent inventory/payment inconsistencies

---

## Business Requirements

### Sale Types

#### 1. Retail Sales
- **Purpose**: Point-of-sale transactions for walk-in customers
- **Pricing**: Uses retail prices from stock products
- **Payment**: Typically cash, card, or mobile money
- **Volume**: High frequency, lower value transactions
- **Features**:
  - Quick checkout flow
  - Optional customer association
  - Print receipts immediately
  - No approval workflow

#### 2. Wholesale Sales
- **Purpose**: Bulk sales to business customers
- **Pricing**: Uses wholesale prices from stock products
- **Payment**: Often credit lines or bank transfers
- **Volume**: Lower frequency, higher value transactions
- **Features**:
  - Required customer association
  - Credit limit checks
  - Approval workflow for large amounts
  - Delivery notes/invoices

### Payment Types

#### 1. CASH
- Immediate settlement
- No transaction fees
- Requires cash register balance tracking
- Optional change calculation

#### 2. CARD
- Credit/Debit card payments
- Integration with payment processors (Stripe, Paystack)
- Transaction reference required
- Settlement delay (T+1 or T+2)

#### 3. MOBILE
- Mobile money (MTN MOMO, Airtel Money, etc.)
- Transaction reference required
- Instant confirmation
- Phone number validation

#### 4. CREDIT
- Customer credit line
- Requires credit limit check
- Updates customer outstanding balance
- Payment terms tracking
- Aging report support

#### 5. MIXED
- Combination of payment methods
- Example: Part cash, part card
- Example: Partial payment with credit balance
- Must sum to total amount due

### Sale Statuses

1. **DRAFT**: Cart in progress, not committed
2. **REQUESTED**: Wholesale sale awaiting approval
3. **APPROVED**: Approved for fulfillment (wholesale)
4. **COMPLETED**: Fully paid and closed
5. **PARTIAL**: Partially paid (credit sales)
6. **REFUNDED**: Fully refunded
7. **CANCELLED**: Cancelled before completion

---

## Data Models

### Extended Sale Model

```typescript
interface Sale {
  // Identification
  id: UUID
  receipt_number: string  // Auto-generated unique receipt number (e.g., "SF001-20250110-0042")
  
  // Location & User
  storefront: UUID
  storefront_name: string  // Denormalized for faster queries
  user: UUID
  user_name: string
  
  // Customer
  customer: UUID | null  // Optional for retail, required for wholesale
  customer_name: string | null
  
  // Financial
  type: 'RETAIL' | 'WHOLESALE'
  subtotal: number  // Sum of line items before discounts/tax
  discount_amount: number  // Total discount applied
  tax_amount: number  // Total tax amount
  total_amount: number  // Final amount (subtotal - discount + tax)
  amount_paid: number  // Total paid so far
  amount_due: number  // Remaining balance (total - paid)
  
  // Payment & Status
  payment_type: 'CASH' | 'CARD' | 'MOBILE' | 'CREDIT' | 'MIXED'
  status: SaleStatus
  
  // Metadata
  notes: string | null
  internal_notes: string | null  // Staff notes not visible on receipt
  created_at: string  // ISO datetime
  updated_at: string
  completed_at: string | null
  approved_by: UUID | null  // For wholesale sales
  approved_at: string | null
  
  // Relations
  line_items: SaleItem[]
  payments: Payment[]
  refunds: Refund[]
  
  // Computed fields
  is_paid: boolean  // amount_due === 0
  is_overdue: boolean  // For credit sales past due date
  due_date: string | null  // For credit sales
}
```

### Extended SaleItem Model

```typescript
interface SaleItem {
  id: UUID
  sale: UUID
  
  // Product Info
  product: UUID
  product_name: string  // Denormalized for history
  product_sku: string
  stock_product: UUID  // Links to specific stock batch
  
  // Pricing
  quantity: number
  unit_price: number  // Price at time of sale (retail or wholesale)
  discount_percentage: number
  discount_amount: number
  tax_rate: number  // Percentage (e.g., 12.5 for 12.5%)
  tax_amount: number
  subtotal: number  // quantity * unit_price
  total_price: number  // subtotal - discount + tax
  
  // Stock Tracking
  stock_quantity_before: number  // Snapshot for audit
  stock_quantity_after: number   // Snapshot for audit
  
  // Refund Support
  quantity_refunded: number  // Track partially refunded items
  amount_refunded: number
  is_refundable: boolean  // False if warranty expired
  
  // Metadata
  notes: string | null
  created_at: string
}
```

### Extended Payment Model

```typescript
interface Payment {
  id: UUID
  sale: UUID
  customer: UUID  // For credit tracking
  
  // Payment Details
  amount_paid: number
  payment_method: 'CASH' | 'MOMO' | 'CARD' | 'PAYSTACK' | 'STRIPE' | 'BANK_TRANSFER'
  status: 'SUCCESSFUL' | 'PENDING' | 'FAILED' | 'CANCELLED'
  
  // Transaction Info
  transaction_reference: string | null  // Payment processor reference
  phone_number: string | null  // For mobile money
  card_last_four: string | null  // For card payments
  
  // Metadata
  notes: string | null
  processed_by: UUID  // Staff who processed payment
  processed_by_name: string
  created_at: string
  confirmed_at: string | null
  failed_at: string | null
  failure_reason: string | null
}
```

### Extended Refund Model

```typescript
interface Refund {
  id: UUID
  sale: UUID
  refund_number: string  // Auto-generated (e.g., "REF-20250110-0012")
  
  // Refund Type
  refund_type: 'FULL' | 'PARTIAL' | 'EXCHANGE'
  status: 'REQUESTED' | 'APPROVED' | 'PROCESSED' | 'REJECTED'
  
  // Financial
  amount: number  // Total refund amount
  refund_method: 'CASH' | 'CREDIT_NOTE' | 'ORIGINAL_PAYMENT'
  
  // Reason & Notes
  reason: string
  warranty_claim: boolean  // Is this a warranty return?
  notes: string | null
  
  // Workflow
  requested_by: UUID
  requested_by_name: string
  requested_at: string
  approved_by: UUID | null
  approved_by_name: string | null
  approved_at: string | null
  processed_by: UUID | null
  processed_by_name: string | null
  processed_at: string | null
  rejected_by: UUID | null
  rejection_reason: string | null
  
  // Items
  refund_items: RefundItem[]
  
  // Replacement (for EXCHANGE type)
  replacement_sale: UUID | null  // New sale created for exchange
}
```

### RefundItem Model

```typescript
interface RefundItem {
  id: UUID
  refund: UUID
  sale_item: UUID
  
  // Product Info (denormalized)
  product_name: string
  product_sku: string
  
  // Quantities
  quantity: number  // Quantity being refunded
  original_quantity: number  // Original quantity sold
  unit_price: number
  amount: number  // Refund amount for this item
  
  // Restocking
  restock: boolean  // Should this go back to inventory?
  restock_condition: 'GOOD' | 'DAMAGED' | 'DEFECTIVE' | null
  
  // Replacement (for exchanges)
  replacement_product: UUID | null
  replacement_quantity: number | null
}
```

### Customer Extended Model

```typescript
interface Customer {
  id: UUID
  business: UUID
  
  // Basic Info
  name: string
  email: string | null
  phone: string | null
  address: string | null
  tin_number: string | null  // Tax Identification Number
  
  // Credit Management
  credit_limit: number  // Maximum credit allowed
  outstanding_balance: number  // Current debt
  available_credit: number  // Computed: credit_limit - outstanding_balance
  credit_terms_days: number  // Payment terms (e.g., Net 30)
  
  // Status
  is_active: boolean
  credit_blocked: boolean  // Blocked from new credit purchases
  
  // Statistics (denormalized for performance)
  total_purchases: number
  total_paid: number
  purchase_count: number
  last_purchase_date: string | null
  
  // Metadata
  created_at: string
  updated_at: string
  created_by: UUID
}
```

### CreditTransaction Extended Model

```typescript
interface CreditTransaction {
  id: UUID
  customer: UUID
  
  // Transaction Details
  transaction_type: 'CREDIT_SALE' | 'PAYMENT' | 'ADJUSTMENT' | 'REFUND' | 'CREDIT_NOTE'
  amount: number  // Positive for charges, negative for payments/credits
  
  // Balance Tracking (for audit trail)
  balance_before: number
  balance_after: number
  
  // References
  sale: UUID | null  // If linked to a sale
  payment: UUID | null  // If linked to a payment
  refund: UUID | null  // If linked to a refund
  reference_number: string  // Human-readable reference
  
  // Metadata
  description: string
  notes: string | null
  created_by: UUID
  created_by_name: string
  created_at: string
}
```

### Stock Reservation Model (NEW)

```typescript
// Temporary reservations during cart building
interface StockReservation {
  id: UUID
  storefront: UUID
  stock_product: UUID
  product: UUID
  
  // Reservation Details
  quantity: number
  reserved_by: UUID  // User building the cart
  cart_session_id: string  // Unique cart session
  
  // Expiry
  created_at: string
  expires_at: string  // Auto-expire after 30 minutes
  
  // Status
  status: 'ACTIVE' | 'COMMITTED' | 'EXPIRED' | 'RELEASED'
  committed_to_sale: UUID | null  // Sale ID when reservation is converted
}
```

---

## API Endpoints

### Sales Endpoints

#### 1. Create Sale (Start Cart)
```
POST /api/sales/
```

**Request Body:**
```json
{
  "storefront": "uuid",
  "type": "RETAIL",  // or "WHOLESALE"
  "customer": "uuid",  // optional for retail, required for wholesale
  "notes": "Customer requested expedited checkout"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "receipt_number": "SF001-20250110-0042",
  "storefront": "uuid",
  "type": "RETAIL",
  "status": "DRAFT",
  "subtotal": 0,
  "total_amount": 0,
  "amount_due": 0,
  "line_items": [],
  "created_at": "2025-01-10T14:30:00Z"
}
```

#### 2. Add Line Item to Cart
```
POST /api/sales/{sale_id}/items/
```

**Request Body:**
```json
{
  "product": "uuid",
  "stock_product": "uuid",  // Specific batch
  "quantity": 5,
  "unit_price": 25.50,  // Frontend can suggest, backend validates
  "discount_percentage": 10,  // optional
  "notes": "Customer requested extra packaging"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "product": "uuid",
  "product_name": "Premium Coffee Beans 500g",
  "product_sku": "COF-001",
  "quantity": 5,
  "unit_price": 25.50,
  "discount_amount": 12.75,
  "tax_rate": 12.5,
  "tax_amount": 14.41,
  "total_price": 129.16,
  "stock_quantity_before": 150,
  "stock_quantity_after": 145,  // Reserved, not yet committed
  "is_refundable": true
}
```

**Real-time Stock Check Response:**
```json
{
  "item": { /* item details */ },
  "stock_status": {
    "available": 145,
    "reserved": 5,
    "low_stock_warning": false,
    "out_of_stock": false
  }
}
```

#### 3. Update Line Item
```
PATCH /api/sales/{sale_id}/items/{item_id}/
```

**Request Body:**
```json
{
  "quantity": 7,  // Change quantity
  "discount_percentage": 15
}
```

**Response (200):** Updated line item with new stock status

#### 4. Remove Line Item
```
DELETE /api/sales/{sale_id}/items/{item_id}/
```

**Response (204):** No content, stock reservation released

#### 5. Get Real-time Stock Availability
```
GET /api/storefronts/{storefront_id}/stock-products/{product_id}/availability/
```

**Response (200):**
```json
{
  "product": "uuid",
  "product_name": "Premium Coffee Beans 500g",
  "total_available": 145,
  "reserved_quantity": 5,
  "unreserved_quantity": 140,
  "batches": [
    {
      "id": "uuid",
      "batch_number": "BTH-001",
      "quantity": 100,
      "unit_cost": 20.00,
      "retail_price": 25.50,
      "wholesale_price": 22.00,
      "expiry_date": "2025-12-31",
      "supplier_name": "Coffee Imports Ltd"
    }
  ],
  "reservations": [
    {
      "cart_session_id": "session-123",
      "quantity": 5,
      "expires_at": "2025-01-10T15:00:00Z"
    }
  ]
}
```

#### 6. Complete Sale (Checkout)
```
POST /api/sales/{sale_id}/complete/
```

**Request Body:**
```json
{
  "payment_type": "MIXED",
  "payments": [
    {
      "payment_method": "CASH",
      "amount_paid": 100.00
    },
    {
      "payment_method": "CARD",
      "amount_paid": 50.00,
      "transaction_reference": "stripe_ch_123456"
    }
  ],
  "discount_amount": 10.00,  // Additional cart-level discount
  "notes": "Customer loyalty discount applied"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "receipt_number": "SF001-20250110-0042",
  "status": "COMPLETED",  // or "PARTIAL" if credit
  "total_amount": 150.00,
  "amount_paid": 150.00,
  "amount_due": 0,
  "payments": [/* payment details */],
  "receipt_url": "/api/sales/uuid/receipt/",
  "completed_at": "2025-01-10T14:45:00Z"
}
```

**Error Response (400):**
```json
{
  "error": "INSUFFICIENT_STOCK",
  "message": "Product 'Premium Coffee Beans' only has 3 units available",
  "product": "uuid",
  "available": 3,
  "requested": 5
}
```

#### 7. Get Sale Detail
```
GET /api/sales/{sale_id}/
```

**Response (200):** Full sale object with line items, payments, refunds

#### 8. List Sales
```
GET /api/sales/?storefront=uuid&status=COMPLETED&date_from=2025-01-01&date_to=2025-01-31
```

**Query Parameters:**
- `storefront`: Filter by storefront
- `status`: Filter by status
- `type`: RETAIL or WHOLESALE
- `customer`: Filter by customer
- `user`: Filter by sales staff
- `date_from`: Start date (ISO format)
- `date_to`: End date (ISO format)
- `payment_type`: Filter by payment type
- `search`: Search by receipt number, customer name, product
- `page`: Page number
- `page_size`: Items per page
- `ordering`: Sort field (e.g., `-created_at`)

**Response (200):**
```json
{
  "count": 150,
  "next": "url",
  "previous": "url",
  "results": [/* sale objects */]
}
```

#### 9. Cancel Sale
```
POST /api/sales/{sale_id}/cancel/
```

**Request Body:**
```json
{
  "reason": "Customer changed mind"
}
```

**Response (200):** Updated sale with status CANCELLED, stock released

#### 10. Get Receipt (PDF/Print)
```
GET /api/sales/{sale_id}/receipt/?format=pdf
```

**Response:** PDF file or HTML for printing

### Refund Endpoints

#### 11. Request Refund
```
POST /api/refunds/
```

**Request Body:**
```json
{
  "sale": "uuid",
  "refund_type": "PARTIAL",
  "refund_method": "CASH",
  "reason": "Product defective - warranty claim",
  "warranty_claim": true,
  "refund_items": [
    {
      "sale_item": "uuid",
      "quantity": 2,
      "amount": 51.00,
      "restock": false,
      "restock_condition": "DEFECTIVE"
    }
  ],
  "notes": "Customer has receipt and product in original packaging"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "refund_number": "REF-20250110-0012",
  "status": "REQUESTED",
  "amount": 51.00,
  "requires_approval": true,  // If amount > threshold
  "requested_by_name": "John Doe",
  "requested_at": "2025-01-10T15:00:00Z"
}
```

#### 12. Approve Refund
```
POST /api/refunds/{refund_id}/approve/
```

**Request Body:**
```json
{
  "notes": "Warranty valid, approved for processing"
}
```

**Response (200):** Refund with status APPROVED

#### 13. Process Refund
```
POST /api/refunds/{refund_id}/process/
```

**Request Body:**
```json
{
  "transaction_reference": "refund_123456",  // If electronic refund
  "notes": "Cash refunded to customer"
}
```

**Response (200):** 
- Refund status updated to PROCESSED
- Stock restocked if applicable
- Customer credit updated
- Audit trail created

#### 14. Reject Refund
```
POST /api/refunds/{refund_id}/reject/
```

**Request Body:**
```json
{
  "reason": "Outside warranty period"
}
```

**Response (200):** Refund with status REJECTED

#### 15. Create Exchange
```
POST /api/refunds/{refund_id}/exchange/
```

**Request Body:**
```json
{
  "exchange_items": [
    {
      "product": "uuid",
      "quantity": 2
    }
  ],
  "notes": "Customer exchanging for larger size"
}
```

**Response (201):**
- New sale created for exchange
- Original refund linked to new sale
- Both transactions cross-referenced

### Customer Endpoints

#### 16. Create Customer
```
POST /api/customers/
```

**Request Body:**
```json
{
  "name": "ABC Retail Store",
  "email": "contact@abcretail.com",
  "phone": "+233244123456",
  "address": "123 Main St, Accra",
  "tin_number": "TIN-12345678",
  "credit_limit": 50000.00,
  "credit_terms_days": 30
}
```

**Response (201):** Customer object

#### 17. Get Customer Credit Status
```
GET /api/customers/{customer_id}/credit-status/
```

**Response (200):**
```json
{
  "customer": "uuid",
  "customer_name": "ABC Retail Store",
  "credit_limit": 50000.00,
  "outstanding_balance": 12500.00,
  "available_credit": 37500.00,
  "credit_blocked": false,
  "overdue_amount": 2500.00,
  "aging": {
    "current": 10000.00,
    "30_days": 0,
    "60_days": 2500.00,
    "90_plus_days": 0
  },
  "recent_transactions": [/* last 5 transactions */]
}
```

#### 18. Record Customer Payment
```
POST /api/customers/{customer_id}/payments/
```

**Request Body:**
```json
{
  "amount": 5000.00,
  "payment_method": "BANK_TRANSFER",
  "transaction_reference": "TRX-123456",
  "notes": "Payment for invoices #101, #102"
}
```

**Response (201):**
- Payment recorded
- Outstanding balance updated
- Credit transactions created
- Audit trail logged

#### 19. Get Customer Purchase History
```
GET /api/customers/{customer_id}/purchases/?date_from=2025-01-01
```

**Response (200):**
```json
{
  "customer": "uuid",
  "summary": {
    "total_purchases": 125000.00,
    "purchase_count": 45,
    "average_purchase": 2777.78,
    "last_purchase_date": "2025-01-10"
  },
  "purchases": [/* sale objects */]
}
```

### Reporting Endpoints

#### 20. Daily Sales Report
```
GET /api/reports/daily-sales/?storefront=uuid&date=2025-01-10
```

**Response (200):**
```json
{
  "date": "2025-01-10",
  "storefront": "uuid",
  "storefront_name": "Main Street Store",
  "summary": {
    "total_sales": 15250.00,
    "total_transactions": 48,
    "average_transaction": 317.71,
    "total_refunds": 500.00,
    "net_sales": 14750.00,
    "cash_sales": 8000.00,
    "card_sales": 5000.00,
    "credit_sales": 2250.00
  },
  "by_hour": [/* hourly breakdown */],
  "top_products": [/* best sellers */],
  "sales_by_staff": [/* staff performance */]
}
```

#### 21. Product Sales Analytics
```
GET /api/reports/product-sales/?product=uuid&date_from=2025-01-01&date_to=2025-01-31
```

**Response (200):**
```json
{
  "product": "uuid",
  "product_name": "Premium Coffee Beans 500g",
  "period": {
    "from": "2025-01-01",
    "to": "2025-01-31"
  },
  "summary": {
    "units_sold": 450,
    "revenue": 11475.00,
    "average_price": 25.50,
    "total_cost": 9000.00,
    "gross_profit": 2475.00,
    "profit_margin": 21.57
  },
  "daily_sales": [/* day by day breakdown */]
}
```

---

## User Workflows

### Workflow 1: Retail Cash Sale

1. **Start Sale**
   - Staff clicks "New Sale"
   - System creates DRAFT sale
   - Cart session initiated

2. **Add Products**
   - Staff scans/searches products
   - For each product:
     - Frontend checks real-time availability
     - Staff selects quantity
     - System creates stock reservation
     - Cart updates with pricing
   - Frontend shows running total

3. **Apply Discounts** (Optional)
   - Staff applies item-level discounts
   - Or cart-level discount
   - System recalculates totals

4. **Checkout**
   - Staff reviews cart
   - Selects payment method: CASH
   - Enters amount tendered
   - System calculates change
   - Completes sale
   - Stock committed (reservation → actual deduction)
   - Receipt printed

5. **Post-Sale**
   - Receipt given to customer
   - Transaction logged
   - Daily sales report updated

### Workflow 2: Wholesale Credit Sale

1. **Start Sale**
   - Staff clicks "New Sale" → "Wholesale"
   - Selects customer (required)
   - System checks credit limit

2. **Credit Check**
   - Display available credit
   - Warn if purchase exceeds limit
   - Show overdue amounts

3. **Add Products**
   - Same as retail, but uses wholesale prices
   - Real-time stock tracking
   - Running total displayed

4. **Request Approval** (if needed)
   - If total > approval threshold:
     - Status set to REQUESTED
     - Notification sent to manager
     - Stock reserved but not committed

5. **Manager Approval**
   - Manager reviews sale
   - Checks customer credit history
   - Approves or rejects
   - If approved, status → APPROVED

6. **Complete Sale**
   - Payment type: CREDIT
   - Stock committed
   - Customer balance updated
   - Due date calculated (e.g., Net 30)
   - Invoice printed

7. **Post-Sale**
   - Credit transaction recorded
   - Customer statement updated
   - Aging report updated

### Workflow 3: Mixed Payment Sale

1. **Normal cart building** (steps 1-3 from Retail)

2. **Checkout with Multiple Payments**
   - Total: $150.00
   - Customer pays:
     - Cash: $100.00
     - Card: $50.00
   - Staff enters each payment
   - System validates total matches

3. **Complete Sale**
   - Payment type: MIXED
   - Multiple payment records created
   - Each payment processed/validated
   - If any payment fails, entire transaction rolled back
   - Stock committed only on success

### Workflow 4: Product Return/Refund

1. **Customer Returns Product**
   - Staff looks up original sale (receipt number)
   - Verifies purchase date
   - Inspects product condition

2. **Initiate Refund**
   - Staff creates refund request
   - Selects items to refund
   - Specifies quantities
   - Indicates product condition (GOOD/DAMAGED/DEFECTIVE)
   - Enters reason
   - Marks as warranty claim if applicable

3. **Approval** (if needed)
   - If refund amount > threshold → manager approval
   - Manager reviews:
     - Original sale details
     - Reason for return
     - Product condition
     - Warranty status
   - Approves or rejects

4. **Process Refund**
   - Choose refund method:
     - CASH: Give cash immediately
     - CREDIT_NOTE: Apply to customer account
     - ORIGINAL_PAYMENT: Process reversal
   - If restocking:
     - Update stock quantity
     - Mark condition in inventory
   - Complete refund
   - Print refund receipt

5. **Post-Refund**
   - Audit trail created
   - Inventory updated
   - Customer credit updated (if applicable)
   - Reports updated

### Workflow 5: Product Exchange

1. **Customer Wants Exchange**
   - Staff initiates refund with type: EXCHANGE
   - Selects original items
   - Customer chooses replacement items

2. **Process Exchange**
   - System creates:
     - Refund for original items
     - New sale for replacement items
   - Calculate price difference
   - If replacement costs more → collect difference
   - If replacement costs less → refund difference
   - Stock adjustments for both transactions

3. **Complete Exchange**
   - Cross-reference both transactions
   - Print exchange receipt
   - Update inventory for both products

---

## Real-time Stock Tracking

### Stock Reservation System

#### Purpose
Prevent overselling by reserving stock during cart building.

#### Implementation

**When adding item to cart:**
1. Check available stock (total - reserved)
2. Create stock reservation
3. Set expiry time (30 minutes)
4. Return updated availability to frontend

**Reservation expiry:**
- Background job expires reservations after 30 minutes
- User can refresh/extend reservation if still in cart
- Expired reservations automatically released

**On sale completion:**
- Convert reservations to actual stock deductions
- Mark reservations as COMMITTED
- Update stock_product quantity

**On cart cancellation:**
- Release all reservations
- Stock becomes available again

### Frontend Real-time Updates

**During cart building:**
```javascript
// Every time quantity changes
1. Call PATCH /api/sales/{id}/items/{item_id}/
2. Backend updates reservation
3. Returns new stock availability
4. Frontend updates UI:
   - Show remaining stock
   - Warn if low stock
   - Prevent exceeding available quantity
```

**Stock availability indicator:**
```tsx
<StockIndicator 
  available={45} 
  reserved={5} 
  threshold={10}
/>

// Shows:
// - Green: > threshold
// - Yellow: <= threshold
// - Red: < quantity requested
// - "Out of Stock" badge if 0
```

**Concurrent user handling:**
- User A adds 5 units → 45 available
- User B tries to add 45 units → Error: only 40 available
- User A completes sale → User B can now add 5 more

### Stock Validation Points

1. **Add to cart**: Check availability
2. **Update quantity**: Re-check availability
3. **Checkout**: Final validation before commit
4. **Background**: Auto-expire old reservations

### Error Scenarios

**Insufficient stock:**
```json
{
  "error": "INSUFFICIENT_STOCK",
  "message": "Only 3 units available",
  "product": "uuid",
  "available": 3,
  "requested": 5,
  "suggestions": [
    {
      "warehouse": "Main Warehouse",
      "quantity": 50,
      "transfer_eta": "2 days"
    }
  ]
}
```

**Stock changed during checkout:**
```json
{
  "error": "STOCK_CHANGED",
  "message": "Stock quantity changed while building cart",
  "details": [
    {
      "product": "Premium Coffee",
      "was_available": 10,
      "now_available": 3,
      "in_cart": 5
    }
  ],
  "action": "REVIEW_CART"
}
```

---

## Payment Processing

### Payment Method Integration

#### CASH
- No external integration
- Track cash drawer balance
- Require manager approval for large withdrawals
- End-of-day reconciliation

#### CARD (Stripe/Paystack)
```javascript
// Frontend collects card details
// Creates payment intent
// Backend validates and confirms

POST /api/payments/card-intent/
{
  "amount": 150.00,
  "currency": "GHS",
  "sale": "uuid"
}

Response:
{
  "client_secret": "pi_xxx_secret_xxx",
  "payment_intent_id": "pi_xxx"
}

// Frontend uses Stripe.js to confirm
// Webhook confirms payment
// Backend updates sale status
```

#### MOBILE MONEY
```javascript
POST /api/payments/mobile-money/
{
  "amount": 150.00,
  "phone_number": "+233244123456",
  "network": "MTN",
  "sale": "uuid"
}

Response:
{
  "transaction_id": "MM-123456",
  "status": "PENDING",
  "prompt_sent": true,
  "message": "Customer will receive payment prompt"
}

// Poll for status or use webhook
GET /api/payments/{payment_id}/status/
```

### Split Payments

**Business Rules:**
- Multiple payment methods must sum to total
- Each payment processed independently
- If any payment fails, entire sale rolled back
- Maximum 5 payment methods per sale

**Implementation:**
```javascript
POST /api/sales/{id}/complete/
{
  "payments": [
    {
      "payment_method": "CASH",
      "amount_paid": 100.00
    },
    {
      "payment_method": "CARD",
      "amount_paid": 50.00,
      "card_token": "tok_xxx"  // From Stripe
    }
  ]
}

// Backend:
// 1. Validate sum === total_amount
// 2. Start database transaction
// 3. Process each payment
// 4. If all succeed → commit
// 5. If any fails → rollback all
```

### Payment Reconciliation

**End-of-day process:**
1. Generate payment summary by method
2. Compare with expected amounts
3. Flag discrepancies
4. Manager approval required to close day

```
GET /api/reports/payment-reconciliation/?date=2025-01-10

Response:
{
  "date": "2025-01-10",
  "cash": {
    "expected": 8000.00,
    "counted": 7950.00,
    "variance": -50.00,
    "status": "PENDING_REVIEW"
  },
  "card": {
    "expected": 5000.00,
    "settled": 5000.00,
    "pending": 0,
    "status": "OK"
  },
  "mobile_money": {
    "expected": 2000.00,
    "confirmed": 2000.00,
    "status": "OK"
  }
}
```

---

## Refunds & Returns

### Refund Types

#### 1. FULL Refund
- Entire sale amount returned
- All items returned
- Original sale marked REFUNDED
- All stock restocked (if applicable)

#### 2. PARTIAL Refund
- Specific items or quantities returned
- Partial amount refunded
- Original sale remains COMPLETED
- Line items track refunded quantities

#### 3. EXCHANGE
- Customer swaps products
- No money changes hands (or difference paid/refunded)
- Two linked transactions:
  - Refund for original items
  - New sale for replacement items
- Stock updated for both products

### Warranty Management

**Warranty rules (configurable):**
- Electronics: 90 days
- Clothing: 30 days
- Perishables: 7 days
- Custom rules per product category

**Warranty check:**
```javascript
GET /api/sales/{id}/refund-eligibility/

Response:
{
  "sale_date": "2025-01-01",
  "days_since_purchase": 15,
  "items": [
    {
      "product": "Laptop",
      "warranty_days": 90,
      "remaining_days": 75,
      "is_refundable": true,
      "refund_conditions": ["Original packaging", "No physical damage"]
    },
    {
      "product": "Milk",
      "warranty_days": 7,
      "remaining_days": 0,
      "is_refundable": false,
      "reason": "Warranty expired"
    }
  ]
}
```

### Restocking Logic

**Restock conditions:**
```typescript
interface RestockRule {
  condition: 'GOOD' | 'DAMAGED' | 'DEFECTIVE'
  action: 'RESTOCK_FULL' | 'RESTOCK_DAMAGED' | 'WRITE_OFF'
  location: 'ORIGINAL_STOREFRONT' | 'WAREHOUSE' | 'QUARANTINE'
}

// Examples:
GOOD → Restock at full price to original location
DAMAGED → Restock to warehouse at reduced value
DEFECTIVE → Write off, send to supplier for claim
```

**Implementation:**
```javascript
POST /api/refunds/{id}/process/
{
  "transaction_reference": "REF-123",
  "restock_actions": [
    {
      "refund_item": "uuid",
      "action": "RESTOCK_FULL",
      "location": "uuid",
      "notes": "Product in perfect condition"
    }
  ]
}

// Backend:
// 1. Update stock quantities
// 2. Adjust inventory value if damaged
// 3. Create stock adjustment audit record
// 4. Process refund payment
```

### Approval Thresholds

**Automatic approval:**
- Amount < $50
- Within 7 days of purchase
- Product in GOOD condition
- Staff has SALES_MANAGE permission

**Requires manager approval:**
- Amount >= $50
- After 7 days (but within warranty)
- Product DAMAGED or DEFECTIVE
- Customer has history of frequent returns

**Requires owner approval:**
- Amount >= $500
- Outside warranty period (exception request)
- Suspected fraud
- Policy override needed

---

## Audit Trail Requirements

### What to Audit

**Every action must log:**
- Who (user ID and name)
- What (action taken)
- When (timestamp)
- Where (storefront/location)
- Why (reason/notes if applicable)
- Before/After state (for changes)

### Audit Events

#### Sale Events
```typescript
enum SaleAuditEvent {
  SALE_CREATED = 'sale.created',
  ITEM_ADDED = 'sale.item_added',
  ITEM_UPDATED = 'sale.item_updated',
  ITEM_REMOVED = 'sale.item_removed',
  DISCOUNT_APPLIED = 'sale.discount_applied',
  SALE_COMPLETED = 'sale.completed',
  SALE_CANCELLED = 'sale.cancelled',
  PAYMENT_ADDED = 'sale.payment_added',
  PAYMENT_FAILED = 'sale.payment_failed'
}
```

#### Stock Events
```typescript
enum StockAuditEvent {
  STOCK_RESERVED = 'stock.reserved',
  RESERVATION_EXTENDED = 'stock.reservation_extended',
  RESERVATION_EXPIRED = 'stock.reservation_expired',
  STOCK_COMMITTED = 'stock.committed',
  STOCK_RELEASED = 'stock.released',
  STOCK_RESTOCKED = 'stock.restocked'
}
```

#### Refund Events
```typescript
enum RefundAuditEvent {
  REFUND_REQUESTED = 'refund.requested',
  REFUND_APPROVED = 'refund.approved',
  REFUND_REJECTED = 'refund.rejected',
  REFUND_PROCESSED = 'refund.processed'
}
```

### Audit Log Model

```typescript
interface AuditLog {
  id: UUID
  timestamp: string
  event_type: string
  user: UUID
  user_name: string
  storefront: UUID
  
  // Related entities
  sale: UUID | null
  refund: UUID | null
  payment: UUID | null
  customer: UUID | null
  
  // Event data
  action: string
  before_state: object | null
  after_state: object | null
  changes: object | null
  
  // Context
  ip_address: string
  user_agent: string
  session_id: string
  
  // Additional info
  notes: string | null
  metadata: object | null
}
```

### Audit Query Examples

**Get sale history:**
```
GET /api/audit/sales/{sale_id}/

Response: All events for this sale in chronological order
```

**Get user actions:**
```
GET /api/audit/users/{user_id}/?date_from=2025-01-01&event_type=sale.completed

Response: All sales completed by this user
```

**Get stock movements:**
```
GET /api/audit/products/{product_id}/?event_type=stock.*

Response: All stock-related events for this product
```

### Compliance & Reporting

**Required reports:**
1. Daily transaction log
2. Voided/cancelled sales report
3. Refund summary
4. Discount audit (who gave how much)
5. Credit sales aging
6. Stock variance report

---

## Security & Permissions

### Permission Model

```typescript
enum SalesCapability {
  // View permissions
  SALES_VIEW = 'sales.view',
  SALES_VIEW_ALL = 'sales.view_all',  // See all storefronts
  
  // Create/Manage
  SALES_CREATE = 'sales.create',
  SALES_MANAGE = 'sales.manage',  // Edit, cancel
  
  // Discounts
  DISCOUNT_APPLY = 'sales.discount.apply',
  DISCOUNT_OVERRIDE = 'sales.discount.override',  // Beyond policy
  
  // Payments
  PAYMENT_PROCESS = 'sales.payment.process',
  PAYMENT_REFUND = 'sales.payment.refund',
  
  // Refunds
  REFUND_REQUEST = 'sales.refund.request',
  REFUND_APPROVE = 'sales.refund.approve',
  REFUND_PROCESS = 'sales.refund.process',
  
  // Credit
  CREDIT_SELL = 'sales.credit.sell',
  CREDIT_OVERRIDE_LIMIT = 'sales.credit.override',
  
  // Reports
  SALES_REPORTS_VIEW = 'sales.reports.view',
  SALES_REPORTS_EXPORT = 'sales.reports.export'
}
```

### Role-Based Access

**STAFF:**
- Create retail sales
- Process cash/card payments
- Request refunds (< $50)
- View own sales
- Cannot override discounts
- Cannot sell on credit

**MANAGER:**
- All STAFF permissions
- Create wholesale sales
- Approve credit sales
- Approve refunds (< $500)
- Apply discounts up to 25%
- View all storefront sales
- Access daily reports

**ADMIN:**
- All MANAGER permissions
- Override credit limits
- Approve large refunds
- Apply any discount
- View all sales across locations
- Access all reports
- Manage customers

**OWNER:**
- All permissions
- Financial reports
- Audit log access
- System configuration

### Data Access Rules

**Storefront isolation:**
- Staff can only see sales from their assigned storefront
- Managers can see all sales from storefronts they manage
- Admins/Owners see all sales

**Customer data:**
- Staff see only customer name during sale
- Managers see customer credit info
- Admins see full customer financial history

**Pricing:**
- Retail prices visible to all
- Wholesale prices only to authorized users
- Cost prices only to managers and above

---

## Validation Rules

### Sale Validation

**On create:**
- Storefront must exist and be active
- User must have SALES_CREATE permission
- If wholesale: customer required
- If customer: must be active (not blocked)

**Adding items:**
- Product must exist and be active
- Stock product must belong to storefront
- Quantity must be positive integer
- Quantity must not exceed available stock
- Unit price must be >= minimum price (if set)
- Discount cannot exceed maximum allowed

**Checkout:**
- Sale must have at least one line item
- Payment amount must equal total_amount
- If credit sale:
  - Customer must have sufficient credit
  - Credit limit check
  - No overdue amounts (configurable)
- Stock must still be available

### Refund Validation

**On request:**
- Sale must exist and be COMPLETED
- Items must belong to sale
- Quantities must not exceed sold quantities
- Refund amount must not exceed sale amount
- If warranty claim: check warranty period

**On approval:**
- Approver must have appropriate permission
- Approver cannot be requester
- Amount threshold check

**On processing:**
- Refund must be APPROVED
- Payment method must be valid
- If restocking: stock location must accept inventory

### Customer Validation

**On create:**
- Name required
- Email or phone required
- If credit limit > 0: TIN number recommended
- Credit terms must be valid (0-365 days)

**Credit sale:**
- Customer must not be credit_blocked
- available_credit >= sale amount
- No overdue amounts > grace period

### Payment Validation

**All payments:**
- Amount must be positive
- Payment method must be enabled
- Transaction reference required for electronic payments

**Card payments:**
- Must have valid card token
- Amount must match charge intent
- Validate with payment processor

**Mobile money:**
- Phone number must be valid
- Network must be supported
- Must receive confirmation before completing

---

## Error Handling

### Error Response Format

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable message",
  "field": "field_name",  // If field-specific
  "details": {
    /* Additional context */
  },
  "timestamp": "2025-01-10T15:00:00Z",
  "request_id": "uuid"
}
```

### Common Error Codes

#### Stock Errors
```typescript
INSUFFICIENT_STOCK
STOCK_RESERVED
STOCK_NOT_AVAILABLE
PRODUCT_INACTIVE
BATCH_EXPIRED
```

#### Payment Errors
```typescript
PAYMENT_FAILED
PAYMENT_AMOUNT_MISMATCH
PAYMENT_METHOD_UNAVAILABLE
INSUFFICIENT_CREDIT
CREDIT_LIMIT_EXCEEDED
OVERDUE_BALANCE
```

#### Validation Errors
```typescript
INVALID_QUANTITY
INVALID_PRICE
DISCOUNT_EXCEEDS_MAXIMUM
SALE_ALREADY_COMPLETED
SALE_CANCELLED
REFUND_EXCEEDS_SALE_AMOUNT
WARRANTY_EXPIRED
```

#### Permission Errors
```typescript
PERMISSION_DENIED
APPROVAL_REQUIRED
INSUFFICIENT_PRIVILEGES
```

### Error Recovery

**Insufficient stock:**
1. Show current availability
2. Suggest reducing quantity
3. Offer to check warehouse stock
4. Option to create transfer request

**Payment failure:**
1. Log failed payment attempt
2. Keep sale in DRAFT
3. Allow retry with different method
4. Release stock reservation after timeout

**Credit limit exceeded:**
1. Show customer credit status
2. Suggest partial payment
3. Offer to request limit increase
4. Allow manager override (if authorized)

---

## Performance Considerations

### Database Optimization

**Indexes needed:**
```sql
-- Sales queries
CREATE INDEX idx_sales_storefront_date ON sales(storefront, created_at DESC);
CREATE INDEX idx_sales_customer ON sales(customer);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_receipt ON sales(receipt_number);

-- Line items
CREATE INDEX idx_sale_items_product ON sale_items(product);
CREATE INDEX idx_sale_items_sale ON sale_items(sale);

-- Payments
CREATE INDEX idx_payments_sale ON payments(sale);
CREATE INDEX idx_payments_customer ON payments(customer);
CREATE INDEX idx_payments_date ON payments(created_at DESC);

-- Reservations
CREATE INDEX idx_reservations_expires ON stock_reservations(expires_at);
CREATE INDEX idx_reservations_status ON stock_reservations(status);
```

### Caching Strategy

**Cache:**
- Product prices (invalidate on price change)
- Customer credit limits (invalidate on update)
- Stock availability (short TTL, 30 seconds)
- Storefront configuration

**Don't cache:**
- Active carts/sales
- Stock reservations
- Payment status
- Audit logs

### Query Optimization

**Avoid N+1 queries:**
```python
# Use select_related and prefetch_related
Sale.objects.select_related(
    'customer', 'storefront', 'user'
).prefetch_related(
    'line_items__product',
    'payments',
    'refunds__refund_items'
)
```

**Aggregate efficiently:**
```python
# Daily sales summary
Sale.objects.filter(
    storefront=storefront_id,
    created_at__date=today
).aggregate(
    total_sales=Sum('total_amount'),
    transaction_count=Count('id'),
    avg_transaction=Avg('total_amount')
)
```

---

## Implementation Priorities

### Phase 1: Core Sales (Week 1-2)
1. ✅ Sale creation (DRAFT status)
2. ✅ Add/update/remove line items
3. ✅ Real-time stock availability
4. ✅ Basic checkout (CASH payments only)
5. ✅ Receipt generation
6. ✅ Sales list/detail views

### Phase 2: Payment Methods (Week 3)
1. ✅ Card payment integration (Stripe/Paystack)
2. ✅ Mobile money integration
3. ✅ Split payments
4. ✅ Payment reconciliation

### Phase 3: Credit Sales (Week 4)
1. ✅ Customer management
2. ✅ Credit limit checks
3. ✅ Credit sales workflow
4. ✅ Customer payments
5. ✅ Aging reports

### Phase 4: Refunds (Week 5)
1. ✅ Refund requests
2. ✅ Approval workflow
3. ✅ Refund processing
4. ✅ Restocking logic
5. ✅ Exchanges

### Phase 5: Reporting (Week 6)
1. ✅ Daily sales reports
2. ✅ Product analytics
3. ✅ Staff performance
4. ✅ Audit logs
5. ✅ Export functionality

---

## Testing Requirements

### Unit Tests
- Sale calculation logic (subtotal, tax, discounts)
- Stock reservation/release
- Payment validation
- Credit limit checks
- Refund calculations

### Integration Tests
- End-to-end sale flow
- Payment processing
- Stock updates
- Audit logging
- Concurrent reservations

### Load Tests
- 100 concurrent users
- 1000 sales per hour
- Stock reservation under load
- Payment processing performance

### Security Tests
- Permission enforcement
- SQL injection prevention
- XSS prevention
- CSRF protection
- Rate limiting

---

## Appendix

### Glossary

**Receipt Number**: Unique identifier for a sale (e.g., SF001-20250110-0042)
**Stock Reservation**: Temporary hold on inventory during cart building
**Credit Line**: Maximum amount a customer can owe
**Wholesale Price**: Discounted price for bulk buyers
**Retail Price**: Standard price for walk-in customers
**Warranty Period**: Time window for returns/exchanges
**Aging**: Classification of debt by days overdue
**Refund Number**: Unique identifier for refunds
**Exchange**: Return with replacement, minimal/no cash involved

### Example Receipt Format

```
===========================================
      ACME RETAIL SOLUTIONS
         Main Street Store
       123 Main St, Accra, Ghana
         Tel: +233-244-123456
===========================================

Receipt #: SF001-20250110-0042
Date: Jan 10, 2025 2:45 PM
Cashier: John Doe
Customer: Walk-in

-------------------------------------------
ITEM                  QTY  PRICE   TOTAL
-------------------------------------------
Premium Coffee 500g    2   25.50   51.00
Milk 1L                3    5.00   15.00
Sugar 1kg              1   12.00   12.00
-------------------------------------------
                    Subtotal:      78.00
                    Discount:      -5.00
                      Taxable:     73.00
                      Tax(12.5%):   9.13
-------------------------------------------
                       TOTAL:      82.13

PAYMENT:
  Cash:                        100.00
  Change:                       17.87

===========================================
      Thank you for your business!
     Visit us again!
===========================================

Warranty: 30 days from purchase
Exchange policy: Within 7 days with receipt
Questions? Call us at +233-244-123456

===========================================
```

---

## Backend Implementation Checklist

- [ ] Create database models with proper relationships
- [ ] Implement stock reservation system
- [ ] Add indexes for performance
- [ ] Create all API endpoints
- [ ] Implement permission checks
- [ ] Add validation logic
- [ ] Set up audit logging
- [ ] Integrate payment processors
- [ ] Implement refund workflows
- [ ] Create reporting endpoints
- [ ] Add background jobs (reservation expiry, etc.)
- [ ] Write comprehensive tests
- [ ] Set up monitoring/alerting
- [ ] Document API (OpenAPI/Swagger)
- [ ] Performance optimization
- [ ] Security audit

---

**End of Specification Document**

This specification provides a complete blueprint for implementing the sales feature. Backend developers should use this as the authoritative guide for API design, data models, and business logic implementation.
