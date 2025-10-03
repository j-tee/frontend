# Sales API Endpoints - Quick Reference

## Base URL
All sales endpoints are prefixed with `/sales/api/`

---

## ✅ Currently Implemented Endpoints

### Sales Operations

#### 1. Create Sale (Start Cart)
```
POST /sales/api/sales/
```
**Request Body:**
```json
{
  "storefront": "uuid",
  "type": "RETAIL" | "WHOLESALE",
  "customer": "uuid" (optional),
  "notes": "string" (optional)
}
```
**Response:** Sale object with DRAFT status

---

#### 2. List Sales
```
GET /sales/api/sales/
```
**Query Parameters:**
- `page` - Page number
- `page_size` - Items per page
- `storefront` - Filter by storefront
- `status` - Filter by status
- `type` - Filter by type (RETAIL/WHOLESALE)
- `customer` - Filter by customer
- `date_from` - Filter by date range
- `date_to` - Filter by date range

**Response:** Paginated list of Sale objects

---

#### 3. Add Item to Cart
```
POST /sales/api/sales/{sale_id}/add_item/
```
**Request Body:**
```json
{
  "product": "uuid",
  "stock_product": "uuid",
  "quantity": 2,
  "unit_price": 10.50 (optional),
  "discount_percentage": 10 (optional),
  "notes": "string" (optional)
}
```
**Response:** SaleItem object with updated sale totals

---

#### 4. Complete Sale (Checkout)
```
POST /sales/api/sales/{sale_id}/complete/
```
**Request Body:**
```json
{
  "payment_type": "CASH" | "CARD" | "MOBILE" | "CREDIT" | "MIXED",
  "payments": [
    {
      "payment_method": "CASH" | "CARD" | "MOMO" | "CREDIT",
      "amount_paid": 100.00,
      "transaction_reference": "string" (optional),
      "phone_number": "string" (optional for MOMO)
    }
  ],
  "discount_amount": 10.00 (optional),
  "notes": "string" (optional)
}
```
**Response:** Sale object with COMPLETED status

---

### Customer Operations

#### 5. List Customers
```
GET /sales/api/customers/
```
**Query Parameters:**
- `page` - Page number
- `page_size` - Items per page
- `type` - Filter by type (RETAIL/WHOLESALE)
- `search` - Search by name, email, phone

**Response:** Paginated list of Customer objects

---

#### 6. Create Customer
```
POST /sales/api/customers/
```
**Request Body:**
```json
{
  "name": "John Doe",
  "phone": "+233123456789",
  "email": "john@example.com" (optional),
  "address": "123 Main St" (optional),
  "tax_id": "TIN123" (optional),
  "type": "RETAIL" | "WHOLESALE",
  "credit_limit": 5000.00 (optional, for WHOLESALE),
  "credit_terms_days": 30 (optional, for WHOLESALE),
  "notes": "string" (optional)
}
```
**Response:** Customer object

---

## 🚧 Additional Endpoints (To Be Implemented)

### Sale Items Management
```
PATCH /sales/api/sales/{sale_id}/items/{item_id}/  - Update cart item
DELETE /sales/api/sales/{sale_id}/items/{item_id}/ - Remove cart item
```

### Customer Management
```
GET /sales/api/customers/{id}/                     - Get customer details
PATCH /sales/api/customers/{id}/                   - Update customer
GET /sales/api/customers/{id}/credit-status/       - Get credit info
POST /sales/api/customers/{id}/payments/           - Record payment
GET /sales/api/customers/{id}/purchases/           - Purchase history
```

### Stock Availability
```
GET /sales/api/storefronts/{id}/stock-products/{product_id}/availability/
```

### Refunds
```
POST /sales/api/refunds/                           - Request refund
GET /sales/api/refunds/                            - List refunds
POST /sales/api/refunds/{id}/approve/              - Approve refund
POST /sales/api/refunds/{id}/reject/               - Reject refund
POST /sales/api/refunds/{id}/process/              - Process refund
GET /sales/api/sales/{id}/refund-eligibility/      - Check warranty
```

### Payments
```
POST /sales/api/payments/card-intent/              - Stripe/Paystack
POST /sales/api/payments/mobile-money/             - Mobile money
GET /sales/api/payments/{id}/status/               - Payment status
```

### Reports
```
GET /sales/api/reports/daily-sales/                - Daily summary
GET /sales/api/reports/product-sales/              - Product analytics
```

---

## 📝 Usage Examples

### Example 1: Complete Cash Sale Flow

```javascript
// 1. Create sale
const sale = await createSale({
  storefront: "uuid-here",
  type: "RETAIL"
})

// 2. Add items
const item1 = await addItem(sale.id, {
  product: "product-uuid",
  stock_product: "stock-uuid",
  quantity: 2
})

const item2 = await addItem(sale.id, {
  product: "product-uuid-2",
  stock_product: "stock-uuid-2",
  quantity: 1,
  discount_percentage: 10
})

// 3. Complete sale
const completedSale = await completeSale(sale.id, {
  payment_type: "CASH",
  payments: [{
    payment_method: "CASH",
    amount_paid: sale.total_amount
  }]
})
```

### Example 2: Wholesale Credit Sale

```javascript
// 1. Create customer (if not exists)
const customer = await createCustomer({
  name: "ABC Company Ltd",
  phone: "+233123456789",
  email: "abc@company.com",
  type: "WHOLESALE",
  credit_limit: 10000.00,
  credit_terms_days: 30
})

// 2. Create sale
const sale = await createSale({
  storefront: "uuid-here",
  type: "WHOLESALE",
  customer: customer.id
})

// 3. Add items
await addItem(sale.id, {
  product: "product-uuid",
  stock_product: "stock-uuid",
  quantity: 50
})

// 4. Complete with credit
const completedSale = await completeSale(sale.id, {
  payment_type: "CREDIT",
  payments: [{
    payment_method: "CREDIT",
    amount_paid: 0  // Pay later
  }]
})
```

### Example 3: Mixed Payment Sale

```javascript
// Create and add items to sale...

// Complete with mixed payment
const completedSale = await completeSale(sale.id, {
  payment_type: "MIXED",
  payments: [
    {
      payment_method: "CASH",
      amount_paid: 50.00
    },
    {
      payment_method: "CARD",
      amount_paid: 30.00,
      transaction_reference: "stripe_pi_123"
    },
    {
      payment_method: "MOMO",
      amount_paid: 20.00,
      phone_number: "+233123456789",
      transaction_reference: "momo_tx_456"
    }
  ]
})
```

---

## 🔍 Response Structures

### Sale Object
```typescript
{
  id: UUID
  receipt_number: string
  storefront: UUID
  storefront_name: string
  customer: UUID | null
  customer_name: string | null
  user: UUID
  user_name: string
  type: "RETAIL" | "WHOLESALE"
  status: "DRAFT" | "PENDING" | "COMPLETED" | "CANCELLED"
  
  line_items: SaleItem[]
  payments: Payment[]
  
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  amount_paid: number
  amount_due: number
  
  payment_type: "CASH" | "CARD" | "MOBILE" | "CREDIT" | "MIXED"
  
  notes: string | null
  created_at: string (ISO datetime)
  updated_at: string (ISO datetime)
  completed_at: string | null (ISO datetime)
}
```

### Customer Object
```typescript
{
  id: UUID
  business: UUID
  name: string
  email: string | null
  phone: string
  address: string | null
  tax_id: string | null
  type: "RETAIL" | "WHOLESALE"
  
  credit_limit: number
  outstanding_balance: number
  available_credit: number
  credit_terms_days: number
  credit_blocked: boolean
  
  total_purchases: number
  last_purchase_date: string | null
  
  notes: string | null
  created_at: string (ISO datetime)
  updated_at: string (ISO datetime)
}
```

---

## ⚠️ Important Notes

1. **Base URL**: All endpoints use `/sales/api/` prefix (not `/api/`)
2. **Add Item**: Uses `/add_item/` action endpoint (not nested `/items/` resource)
3. **Authentication**: All endpoints require authentication
4. **Permissions**: Check user permissions for sales operations
5. **Storefront**: Sales are scoped to specific storefronts
6. **Stock Reservation**: Items are reserved when added to cart
7. **Payment Validation**: Total payments must equal total_amount for checkout

---

## 🔐 Error Handling

Common error responses:

```json
{
  "error": "Error message",
  "detail": "Detailed error description"
}
```

**Common Status Codes:**
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - No permission
- `404 Not Found` - Resource not found
- `409 Conflict` - Stock unavailable, etc.
- `500 Internal Server Error` - Server error

---

## 📚 Related Documentation

- `sales-feature-specification.md` - Complete technical specification
- `BACKEND-README-SALES.md` - Backend implementation guide
- `sales-frontend-implementation-plan.md` - Frontend architecture
- `sales-implementation-progress.md` - Current implementation status
