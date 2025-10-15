import type {
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  RefundStatus,
  SaleStatus,
  SaleType,
  UUID,
} from './common'

// Customer
export interface Customer {
  id: UUID
  business: UUID
  name: string
  email: string | null
  phone: string
  address: string | null
  tax_id: string | null
  type: 'RETAIL' | 'WHOLESALE'
  credit_limit: number
  outstanding_balance: number
  available_credit: number
  credit_terms_days: number
  credit_blocked: boolean
  total_purchases: number
  last_purchase_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Sale Item
export interface SaleItem {
  id: UUID
  sale: UUID
  product: UUID
  stock_product: UUID
  product_name: string
  product_sku: string
  product_category: string | null
  quantity: number
  unit_price: number
  discount_percentage: number
  discount_amount: number
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_price: number
  cost_price: number | null
  profit_margin: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Payment (Credit Payment Tracking)
export interface Payment {
  id: UUID
  sale: UUID
  customer: UUID | null
  payment_method: PaymentMethod
  amount_paid: number // Renamed from amount in backend, or use 'amount'
  status: PaymentStatus
  transaction_reference: string | null // Backend uses reference_number
  phone_number: string | null
  card_last_4: string | null
  card_brand: string | null
  notes: string | null
  created_at: string
  processed_at: string | null
  failed_at: string | null
  error_message: string | null
  
  // Backend fields (credit payment tracking)
  amount?: number // Backend uses 'amount' for payment amount
  reference_number?: string // Backend field name
  payment_date?: string // Backend field
  created_by?: {
    id: UUID
    email: string
  }
}

// Accounts Receivable (AR) - New dedicated AR tracking system
export interface AccountsReceivable {
  id: UUID
  sale: UUID
  customer: UUID
  
  // Amounts
  original_amount: number
  amount_paid: number
  amount_outstanding: number
  
  // Status and aging
  status: 'PENDING' | 'PARTIAL' | 'OVERDUE' | 'PAID'
  due_date: string | null
  days_outstanding: number
  aging_category: 'CURRENT' | '1-30_DAYS' | '31-60_DAYS' | '61-90_DAYS' | 'OVER_90_DAYS'
  
  // Computed properties
  is_overdue: boolean
  payment_percentage: number
  days_overdue: number | null
  
  // Reminder tracking
  last_reminder_sent: string | null
  reminder_count: number
  
  // Assignment
  assigned_to: UUID | null
  assigned_to_name: string | null
  
  // Metadata
  created_at: string
  updated_at: string
}

// AR Payment - Payments against AR (separate from Payment model)
export interface ARPayment {
  id: UUID
  accounts_receivable: UUID
  amount: number
  payment_method: 'CASH' | 'MOMO' | 'CARD' | 'BANK_TRANSFER' | 'CHECK' // No CREDIT option
  payment_date: string
  transaction_id: string | null
  notes: string | null
  received_by: UUID | null
  received_by_name: string | null
  created_at: string
  updated_at: string
}

// Sale
export interface Sale {
  id: UUID
  receipt_number: string
  storefront: UUID
  storefront_name: string
  customer: UUID | null
  customer_name: string | null
  user: UUID
  user_name: string
  type: SaleType
  status: SaleStatus
  
  // Line items
  line_items: SaleItem[]
  
  // Amounts
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  amount_paid: number
  amount_due: number
  
  // Payment
  payment_type: PaymentType
  is_credit_sale: boolean // NEW: Flag to route to payment vs credit flow
  payments: Payment[]
  payment_status: 'unpaid' | 'partial' | 'paid' // NEW: Computed payment status
  payment_completion_percentage: number // NEW: 0-100 payment completion
  
  // Accounts Receivable (for credit sales)
  accounts_receivable?: AccountsReceivable // Only present if is_credit_sale=true
  ar_payments?: ARPayment[] // AR payment history for credit sales
  
  // Metadata
  notes: string | null
  internal_notes: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
}

// Refund Types
export type RefundReason = 'WARRANTY' | 'DEFECTIVE' | 'WRONG_ITEM' | 'CUSTOMER_CHANGE_MIND' | 'OTHER'
export type RefundMethod = 'CASH' | 'CREDIT_NOTE' | 'ORIGINAL_PAYMENT'

export interface RefundItem {
  id: UUID
  refund: UUID
  sale_item: UUID
  product: UUID
  product_name: string
  quantity: number
  unit_price: number
  refund_amount: number
  restock: boolean
  condition: 'UNOPENED' | 'OPENED' | 'DAMAGED'
  notes: string | null
}

export interface Refund {
  id: UUID
  refund_number: string
  sale: UUID
  sale_receipt_number: string
  customer: UUID | null
  customer_name: string | null
  requested_by: UUID
  requested_by_name: string
  approved_by: UUID | null
  approved_by_name: string | null
  processed_by: UUID | null
  processed_by_name: string | null
  
  reason: RefundReason
  reason_details: string | null
  refund_method: RefundMethod
  status: RefundStatus
  
  amount: number
  refund_items: RefundItem[]
  
  created_at: string
  approved_at: string | null
  rejected_at: string | null
  processed_at: string | null
  rejection_reason: string | null
}

// Credit Transaction
export interface CreditTransaction {
  id: UUID
  customer: UUID
  sale: UUID | null
  payment: UUID | null
  type: 'SALE' | 'PAYMENT' | 'ADJUSTMENT' | 'REFUND'
  amount: number
  balance_before: number
  balance_after: number
  description: string
  created_by: UUID
  created_by_name: string
  created_at: string
}

// Stock Reservation
export interface StockReservation {
  id: UUID
  stock_product: UUID
  cart_session_id: UUID
  quantity: number
  status: 'ACTIVE' | 'EXPIRED' | 'COMMITTED' | 'RELEASED'
  expires_at: string
  created_at: string
  committed_at: string | null
  released_at: string | null
}

// Stock Availability
export interface StockAvailability {
  stock_product_id: UUID
  total_quantity: number
  committed_quantity: number
  reserved_quantity: number
  unreserved_quantity: number
  is_available: boolean
  reservations: Array<{
    cart_session_id: UUID
    quantity: number
    expires_at: string
  }>
}

// Audit Log
export interface AuditLog {
  id: UUID
  sale: UUID | null
  refund: UUID | null
  payment: UUID | null
  event_type: string
  event_data: Record<string, unknown>
  user: UUID
  user_name: string
  ip_address: string | null
  user_agent: string | null
  timestamp: string
}

// API Response types
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// Report Types
export interface DailySalesReport {
  date: string
  storefront: {
    id: UUID
    name: string
  }
  summary: {
    total_sales: number
    total_refunds: number
    net_sales: number
    transaction_count: number
    avg_transaction: number
    cash_sales: number
    card_sales: number
    credit_sales: number
    momo_sales: number
  }
  top_products: Array<{
    product_name: string
    units_sold: number
    revenue: number
  }>
  by_hour: Array<{
    hour: string
    sales: number
    transactions: number
  }>
}

export interface ProductSalesReport {
  product: {
    id: UUID
    name: string
    sku: string
  }
  period: {
    from: string
    to: string
  }
  summary: {
    units_sold: number
    total_revenue: number
    total_cost: number
    total_profit: number
    profit_margin: number
    avg_unit_price: number
  }
  by_storefront: Array<{
    storefront_name: string
    units_sold: number
    revenue: number
  }>
  trend: Array<{
    date: string
    units_sold: number
    revenue: number
  }>
}

// Warranty Eligibility
export interface WarrantyEligibility {
  items: Array<{
    product: UUID
    product_name: string
    is_refundable: boolean
    days_since_purchase: number
    warranty_days: number
    remaining_days: number
    reason: string
  }>
}
