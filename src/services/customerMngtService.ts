import httpClient from './httpClient.js'
import type { PaginatedResponse } from '../types/common.js'
import type {
  CreditTransaction,
  Customer,
  Payment,
  Refund,
  RefundItem,
  Sale,
  SaleItem,
} from '../types/sales.js'

export const fetchCustomers = async (params?: Record<string, unknown>) => {
  const { data } = await httpClient.get<PaginatedResponse<Customer>>(
    '/sales/api/customers/',
    { params },
  )
  return data
}

export const createSale = async (payload: Partial<Sale>) => {
  const { data } = await httpClient.post<Sale>('/sales/api/sales/', payload)
  return data
}

export const createSaleItem = async (payload: Partial<SaleItem>) => {
  const { data } = await httpClient.post<SaleItem>(
    '/sales/api/sale-items/',
    payload,
  )
  return data
}

export const createPayment = async (payload: Partial<Payment>) => {
  const { data } = await httpClient.post<Payment>(
    '/sales/api/payments/',
    payload,
  )
  return data
}

export const createRefund = async (payload: Partial<Refund>) => {
  const { data } = await httpClient.post<Refund>(
    '/sales/api/refunds/',
    payload,
  )
  return data
}

export const createRefundItem = async (payload: Partial<RefundItem>) => {
  const { data } = await httpClient.post<RefundItem>(
    '/sales/api/refund-items/',
    payload,
  )
  return data
}

export const fetchCustomerCreditTransactions = async (
  params?: Record<string, unknown>,
) => {
  const { data } = await httpClient.get<PaginatedResponse<CreditTransaction>>(
    '/sales/api/credit-transactions/',
    { params },
  )
  return data
}
