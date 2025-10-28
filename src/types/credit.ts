import type { UUID } from './common'

/**
 * Sales Summary Response with Cash on Hand Calculation
 * Backend endpoint: GET /api/sales/summary/
 */
export interface SalesSummary {
  // Revenue Metrics (Accrual Basis)
  total_sales: string
  total_refunds: string
  net_sales: string
  total_transactions: number
  completed_transactions: number
  avg_transaction: string
  
  // Cash Accounting (Revenue-Based)
  cash_at_hand: string // Total amount_paid
  accounts_receivable: string // Total amount_due for CREDIT PENDING/PARTIAL
  
  // Profit Accounting (NEW - Backend Implementation)
  total_profit: string // Profit from all COMPLETED sales
  outstanding_credit: string // Profit from PENDING/PARTIAL credit sales
  cash_on_hand: string // total_profit - outstanding_credit (ACTUAL CASH)
  total_credit_sales: string // Same as accounts_receivable
  unpaid_credit_count: number // Number of PENDING/PARTIAL credit sales
  
  // Financial Position
  financial_position: {
    cash_at_hand: string
    accounts_receivable: string
    total_assets: string
    cash_percentage: number
    receivables_percentage: number
  }
  
  // Credit Health Metrics
  credit_health: {
    total_credit_sales: string // All credit sales (COMPLETED included)
    unpaid_amount: string // PENDING credit sales
    partially_paid_amount: string // PARTIAL credit sales
    fully_paid_amount: string // COMPLETED credit sales
    collection_rate: number // Percentage of credit sales fully paid
  }
  
  // Payment Method Breakdown
  cash_sales: string
  card_sales: string
  credit_sales_total: string // Only COMPLETED credit sales
  mobile_sales: string
  
  // Status Breakdown
  status_breakdown: Array<{
    status: string
    count: number
    total: string
  }>
}

/**
 * Record Payment Request
 * Backend endpoint: POST /api/sales/{id}/record_payment/
 */
export interface RecordPaymentRequest {
  amount: string | number
  payment_method: 'CASH' | 'CARD' | 'MOBILE' | 'BANK_TRANSFER' | 'CHECK' | 'OTHER'
  reference_number?: string
  notes?: string
}

/**
 * Record Payment Response
 */
export interface RecordPaymentResponse {
  message: string
  sale: {
    id: UUID
    receipt_number: string
    status: 'PENDING' | 'PARTIAL' | 'COMPLETED'
    total_amount: string
    amount_paid: string
    amount_due: string
    payment_status: 'unpaid' | 'partial' | 'paid'
    payment_completion_percentage: number
  }
  payment: {
    id: UUID
    amount: string
    payment_method: string
    reference_number: string | null
    created_at: string
    notes: string | null
  }
}

/**
 * Credit Sales Filters
 * Available query parameters for GET /api/sales/
 */
export interface CreditSalesFilters {
  status?: 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'DRAFT' | 'REFUNDED' | 'CANCELLED'
  payment_type?: 'CASH' | 'CARD' | 'CREDIT' | 'MOBILE' | 'SPLIT'
  payment_status?: 'unpaid' | 'partial' | 'paid'
  has_outstanding_balance?: boolean
  days_outstanding?: number // Filter sales older than X days
  min_amount_due?: number
  max_amount_due?: number
  customer_id?: UUID
  storefront?: UUID
  date_from?: string // ISO date
  date_to?: string // ISO date
  page?: number
  page_size?: number
}

/**
 * Credit Management Dashboard Stats
 */
export interface CreditManagementStats {
  totalOutstanding: number
  unpaidCount: number
  unpaidAmount: number
  partialCount: number
  partialAmount: number
  overdueCount: number
  overdueAmount: number
  collectionRate: number
  averageDaysOutstanding: number
}

/**
 * Customer Credit Balance
 */
export interface CustomerCreditBalance {
  customer_id: UUID
  customer_name: string
  outstanding_balance: number
  credit_limit: number
  available_credit: number
  unpaid_sales_count: number
  oldest_unpaid_date: string | null
  credit_blocked: boolean
}
