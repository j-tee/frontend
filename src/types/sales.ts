import type {
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  RefundStatus,
  RefundType,
  SaleStatus,
  SaleType,
  UUID,
} from './common'

export interface Customer {
  id: UUID
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  credit_limit?: number | null
  outstanding_balance: number
  available_credit: number
}

export interface Sale {
  id: UUID
  storefront: UUID
  customer?: UUID | null
  user: UUID
  total_amount: number
  payment_type: PaymentType
  status: SaleStatus
  type: SaleType
  amount_due: number
  discount_amount: number
  tax_amount: number
  receipt_number: string
  notes?: string | null
}

export interface SaleItem {
  id: UUID
  sale: UUID
  product: UUID
  stock?: UUID | null
  quantity: number
  unit_price: number
  discount_amount: number
  tax_rate?: number
  tax_amount?: number
  total_price: number
}

export interface Payment {
  id: UUID
  sale?: UUID | null
  customer: UUID
  amount_paid: number
  payment_method: PaymentMethod
  status: PaymentStatus
  transaction_reference?: string | null
}

export interface Refund {
  id: UUID
  sale: UUID
  refund_type: RefundType
  amount: number
  reason: string
  status: RefundStatus
  requested_by: UUID
  approved_by?: UUID | null
  processed_by?: UUID | null
}

export interface RefundItem {
  id: UUID
  refund: UUID
  sale_item: UUID
  quantity: number
  amount: number
}

export interface CreditTransaction {
  id: UUID
  customer: UUID
  transaction_type: 'CREDIT_SALE' | 'PAYMENT' | 'ADJUSTMENT' | 'REFUND'
  amount: number
  balance_before: number
  balance_after: number
  reference_id?: string | null
  description?: string | null
}
