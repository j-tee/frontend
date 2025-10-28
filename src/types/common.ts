export const PAYMENT_TYPES = [
  'CASH',
  'CARD',
  'CREDIT',
  'MOBILE',
  'SPLIT',
] as const

export type PaymentType = (typeof PAYMENT_TYPES)[number]

export const SALE_STATUSES = [
  'DRAFT',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
] as const

export type SaleStatus = (typeof SALE_STATUSES)[number]

export const SALE_TYPES = ['RETAIL', 'WHOLESALE'] as const

export type SaleType = (typeof SALE_TYPES)[number]

export const PAYMENT_METHODS = [
  'CASH',
  'CARD',
  'MOBILE',
  'CREDIT',
  'BANK_TRANSFER',
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_STATUSES = [
  'PENDING',
  'COMPLETED',
  'FAILED',
] as const

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const REFUND_TYPES = ['FULL', 'PARTIAL', 'EXCHANGE'] as const

export type RefundType = (typeof REFUND_TYPES)[number]

export const REFUND_STATUSES = [
  'DRAFT',
  'REQUESTED',
  'APPROVED',
  'APPROVED',
  'PROCESSED',
  'REJECTED',
] as const

export type RefundStatus = (typeof REFUND_STATUSES)[number]

export const TRANSFER_STATUSES = [
  'DRAFT',
  'REQUESTED',
  'APPROVED',
  'IN_TRANSIT',
  'REJECTED',
  'COMPLETED',
  'CANCELLED',
] as const

export type TransferStatus = (typeof TRANSFER_STATUSES)[number]

export const STOCK_ALERT_TYPES = [
  'LOW_STOCK',
  'OUT_OF_STOCK',
  'EXPIRY_WARNING',
] as const

export type StockAlertType = (typeof STOCK_ALERT_TYPES)[number]

export const MEMBERSHIP_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'] as const

export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number]

export type UUID = string

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export const TRANSFER_REQUEST_STATUSES = [
  'NEW',
  'ASSIGNED',
  'FULFILLED',
  'CANCELLED',
] as const

export type TransferRequestStatus = (typeof TRANSFER_REQUEST_STATUSES)[number]

export const TRANSFER_REQUEST_PRIORITIES = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
] as const

export type TransferRequestPriority = (typeof TRANSFER_REQUEST_PRIORITIES)[number]

export const TRANSFER_DIRECTIONS = [
  'FORWARD',  // Warehouse → Storefront (stock replenishment)
  'REVERSE',  // Storefront → Warehouse (returns, excess inventory)
] as const

export type TransferDirection = (typeof TRANSFER_DIRECTIONS)[number]
