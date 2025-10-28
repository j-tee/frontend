/**
 * Credit Management Service
 * Handles credit sales, payment tracking, and accounts receivable
 */

import httpClient from './httpClient'
import type { UUID } from '../types/common'
import type { Sale, Payment, PaginatedResponse } from '../types/sales'
import type {
  SalesSummary,
  RecordPaymentRequest,
  RecordPaymentResponse,
  CreditSalesFilters,
  CustomerCreditBalance,
} from '../types/credit'

export class CreditService {
  /**
   * Get sales summary with cash on hand calculation
   * Endpoint: GET /api/sales/summary/
   */
  static async getSummary(storefrontId?: UUID): Promise<SalesSummary> {
    const params = storefrontId ? { storefront: storefrontId } : {}
    const response = await httpClient.get<SalesSummary>('/sales/api/sales/summary/', {
      params,
    })
    return response.data
  }

  /**
   * Get unpaid credit sales (PENDING status)
   * Endpoint: GET /api/sales/?payment_type=CREDIT&payment_status=unpaid
   */
  static async getUnpaidCreditSales(
    storefrontId?: UUID
  ): Promise<PaginatedResponse<Sale>> {
    const params: Record<string, string> = {
      payment_type: 'CREDIT',
      payment_status: 'unpaid',
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

  /**
   * Get partially paid credit sales (PARTIAL status)
   * Endpoint: GET /api/sales/?payment_type=CREDIT&payment_status=partial
   */
  static async getPartiallyPaidSales(
    storefrontId?: UUID
  ): Promise<PaginatedResponse<Sale>> {
    const params: Record<string, string> = {
      payment_type: 'CREDIT',
      payment_status: 'partial',
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

  /**
   * Get all sales with outstanding balance (PENDING + PARTIAL)
   * Endpoint: GET /api/sales/?has_outstanding_balance=true
   */
  static async getSalesWithOutstandingBalance(
    storefrontId?: UUID
  ): Promise<PaginatedResponse<Sale>> {
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
    return response.data
  }

  /**
   * Get overdue credit sales (outstanding for more than X days)
   * Endpoint: GET /api/sales/?days_outstanding=30&has_outstanding_balance=true
   */
  static async getOverdueSales(
    days: number = 30,
    storefrontId?: UUID
  ): Promise<PaginatedResponse<Sale>> {
    const params: Record<string, string> = {
      payment_type: 'CREDIT',
      days_outstanding: String(days),
      has_outstanding_balance: 'true',
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

  /**
   * Get credit sales with advanced filters
   * Endpoint: GET /api/sales/
   */
  static async getCreditSales(
    filters: CreditSalesFilters
  ): Promise<PaginatedResponse<Sale>> {
    const params: Record<string, string> = {}

    if (filters.status) params.status = filters.status
    if (filters.payment_type) params.payment_type = filters.payment_type
    if (filters.payment_status) params.payment_status = filters.payment_status
    if (filters.has_outstanding_balance !== undefined) {
      params.has_outstanding_balance = String(filters.has_outstanding_balance)
    }
    if (filters.days_outstanding !== undefined) {
      params.days_outstanding = String(filters.days_outstanding)
    }
    if (filters.min_amount_due !== undefined) {
      params.min_amount_due = String(filters.min_amount_due)
    }
    if (filters.max_amount_due !== undefined) {
      params.max_amount_due = String(filters.max_amount_due)
    }
    if (filters.customer_id) params.customer_id = filters.customer_id
    if (filters.storefront) params.storefront = filters.storefront
    if (filters.date_from) params.date_from = filters.date_from
    if (filters.date_to) params.date_to = filters.date_to
    if (filters.page !== undefined) params.page = String(filters.page)
    if (filters.page_size !== undefined) params.page_size = String(filters.page_size)

    const response = await httpClient.get<PaginatedResponse<Sale>>(
      '/sales/api/sales/',
      { params }
    )
    return response.data
  }

  /**
   * Get customer's credit sales
   * Endpoint: GET /api/sales/?customer_id=uuid&payment_type=CREDIT
   */
  static async getCustomerCreditSales(
    customerId: UUID,
    storefrontId?: UUID
  ): Promise<PaginatedResponse<Sale>> {
    const params: Record<string, string> = {
      customer_id: customerId,
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

  /**
   * Record payment for a credit sale
   * Endpoint: POST /api/sales/{id}/record_payment/
   */
  static async recordPayment(
    saleId: UUID,
    paymentData: RecordPaymentRequest
  ): Promise<RecordPaymentResponse> {
    const response = await httpClient.post<RecordPaymentResponse>(
      `/sales/api/sales/${saleId}/record_payment/`,
      paymentData
    )
    return response.data
  }

  /**
   * Get payment history for a sale
   * Endpoint: GET /api/sales/{id}/payments/
   */
  static async getPaymentHistory(saleId: UUID): Promise<PaginatedResponse<Payment>> {
    const response = await httpClient.get<PaginatedResponse<Payment>>(
      `/sales/api/sales/${saleId}/payments/`
    )
    return response.data
  }

  /**
   * Get top customers by outstanding balance
   * Note: This may need a custom backend endpoint, or we calculate client-side
   */
  static async getTopDebtors(limit: number = 10): Promise<CustomerCreditBalance[]> {
    // This is a placeholder - backend may need a dedicated endpoint
    // For now, we could fetch all outstanding sales and aggregate by customer
    const sales = await this.getSalesWithOutstandingBalance()
    
    // Group by customer and sum outstanding balances
    const customerMap = new Map<UUID, CustomerCreditBalance>()
    
    sales.results.forEach(sale => {
      if (!sale.customer) return
      
      const existing = customerMap.get(sale.customer)
      if (existing) {
        existing.outstanding_balance += sale.amount_due
        existing.unpaid_sales_count += 1
        if (sale.completed_at && (!existing.oldest_unpaid_date || sale.completed_at < existing.oldest_unpaid_date)) {
          existing.oldest_unpaid_date = sale.completed_at
        }
      } else {
        customerMap.set(sale.customer, {
          customer_id: sale.customer,
          customer_name: sale.customer_name || 'Unknown',
          outstanding_balance: sale.amount_due,
          credit_limit: 0, // Would need to fetch customer details
          available_credit: 0,
          unpaid_sales_count: 1,
          oldest_unpaid_date: sale.completed_at,
          credit_blocked: false,
        })
      }
    })
    
    // Sort by outstanding balance and return top N
    return Array.from(customerMap.values())
      .sort((a, b) => b.outstanding_balance - a.outstanding_balance)
      .slice(0, limit)
  }
}

export default CreditService
