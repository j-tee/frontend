import httpClient from './httpClient.js'
import type {
  Sale,
  SaleItem,
  Customer,
  Payment,
  Refund,
  StockAvailability,
  PaginatedResponse,
  DailySalesReport,
  ProductSalesReport,
  WarrantyEligibility,
} from '../types/sales.js'
import type { UUID } from '../types/common.js'

// ============= Sales API =============

/**
 * Create a new sale (start cart)
 * POST /sales/api/sales/
 */
export async function createSale(payload: {
  storefront: UUID
  type: 'RETAIL' | 'WHOLESALE'
  customer?: UUID
  notes?: string
}): Promise<Sale> {
  const response = await httpClient.post<Sale>('/sales/api/sales/', payload)
  return response.data
}

/**
 * Get sale by ID
 * GET /sales/api/sales/{id}/
 */
export async function getSale(saleId: UUID): Promise<Sale> {
  const response = await httpClient.get<Sale>(`/sales/api/sales/${saleId}/`)
  return response.data
}

/**
 * List sales with filters and pagination
 * GET /sales/api/sales/
 */
export async function listSales(params?: Record<string, unknown>): Promise<PaginatedResponse<Sale>> {
  const response = await httpClient.get<PaginatedResponse<Sale>>('/sales/api/sales/', { params })
  return response.data
}

/**
 * Update sale
 * PATCH /sales/api/sales/{id}/
 */
export async function updateSale(
  saleId: UUID,
  updates: Partial<Pick<Sale, 'notes' | 'discount_amount'>>
): Promise<Sale> {
  const response = await httpClient.patch<Sale>(`/sales/api/sales/${saleId}/`, updates)
  return response.data
}

/**
 * Delete sale (only DRAFT)
 * DELETE /sales/api/sales/{id}/
 */
export async function deleteSale(saleId: UUID): Promise<void> {
  await httpClient.delete(`/sales/api/sales/${saleId}/`)
}

// ============= Sale Items API =============

/**
 * Add item to cart
 * POST /sales/api/sales/{id}/add_item/
 */
export async function addItem(
  saleId: UUID,
  itemData: {
    product: UUID
    stock_product: UUID
    quantity: number
    unit_price?: number
    discount_percentage?: number
    notes?: string
  }
): Promise<SaleItem> {
  const response = await httpClient.post<SaleItem>(`/sales/api/sales/${saleId}/add_item/`, itemData)
  return response.data
}

/**
 * Update cart item
 * PATCH /sales/api/sales/{id}/items/{item_id}/
 */
export async function updateItem(
  saleId: UUID,
  itemId: UUID,
  updates: {
    quantity?: number
    discount_percentage?: number
    notes?: string
  }
): Promise<SaleItem> {
  const response = await httpClient.patch<SaleItem>(
    `/sales/api/sales/${saleId}/items/${itemId}/`,
    updates
  )
  return response.data
}

/**
 * Remove cart item
 * DELETE /sales/api/sales/{id}/items/{item_id}/
 */
export async function removeItem(saleId: UUID, itemId: UUID): Promise<void> {
  await httpClient.delete(`/sales/api/sales/${saleId}/items/${itemId}/`)
}

// ============= Checkout API =============

/**
 * Complete sale (checkout)
 * POST /sales/api/sales/{id}/complete/
 */
export async function completeSale(
  saleId: UUID,
  checkoutData: {
    payment_type: string
    payments: Array<{
      payment_method: string
      amount_paid: number
      transaction_reference?: string
      phone_number?: string
    }>
    discount_amount?: number
    notes?: string
  }
): Promise<Sale> {
  const response = await httpClient.post<Sale>(`/sales/api/sales/${saleId}/complete/`, checkoutData)
  return response.data
}

/**
 * Cancel sale
 */
export async function cancelSale(saleId: UUID, reason: string): Promise<Sale> {
  const response = await httpClient.post<Sale>(`/api/sales/${saleId}/cancel/`, { reason })
  return response.data
}

// ============= Stock API =============

/**
 * Check stock availability for a product
 */
export async function checkStockAvailability(
  storefrontId: UUID,
  productId: UUID
): Promise<StockAvailability> {
  const response = await httpClient.get<StockAvailability>(
    `/api/storefronts/${storefrontId}/stock-products/${productId}/availability/`
  )
  return response.data
}

// ============= Customers API =============

/**
 * Create customer
 * POST /sales/api/customers/
 */
export async function createCustomer(customerData: {
  name: string
  phone: string
  email?: string
  address?: string
  tax_id?: string
  type: 'RETAIL' | 'WHOLESALE'
  credit_limit?: number
  credit_terms_days?: number
  notes?: string
}): Promise<Customer> {
  const response = await httpClient.post<Customer>('/sales/api/customers/', customerData)
  return response.data
}

/**
 * Get customer by ID
 * GET /sales/api/customers/{id}/
 */
export async function getCustomer(customerId: UUID): Promise<Customer> {
  const response = await httpClient.get<Customer>(`/sales/api/customers/${customerId}/`)
  return response.data
}

/**
 * List customers
 * GET /sales/api/customers/
 */
export async function listCustomers(params?: Record<string, unknown>): Promise<PaginatedResponse<Customer>> {
  const response = await httpClient.get<PaginatedResponse<Customer>>('/sales/api/customers/', { params })
  return response.data
}

/**
 * Update customer
 */
export async function updateCustomer(
  customerId: UUID,
  updates: Partial<Customer>
): Promise<Customer> {
  const response = await httpClient.patch<Customer>(`/api/customers/${customerId}/`, updates)
  return response.data
}

/**
 * Get customer credit status
 */
export async function getCustomerCreditStatus(customerId: UUID): Promise<{
  credit_limit: number
  outstanding_balance: number
  available_credit: number
  overdue_amount: number
  credit_blocked: boolean
  aging: {
    current: number
    days_30: number
    days_60: number
    days_90: number
    days_90_plus: number
  }
}> {
  const response = await httpClient.get(`/api/customers/${customerId}/credit-status/`)
  return response.data
}

/**
 * Record customer payment
 */
export async function recordCustomerPayment(
  customerId: UUID,
  paymentData: {
    amount: number
    payment_method: string
    transaction_reference?: string
    notes?: string
  }
): Promise<Payment> {
  const response = await httpClient.post<Payment>(
    `/api/customers/${customerId}/payments/`,
    paymentData
  )
  return response.data
}

/**
 * Get customer purchase history
 */
export async function getCustomerPurchases(
  customerId: UUID,
  params?: Record<string, unknown>
): Promise<PaginatedResponse<Sale>> {
  const response = await httpClient.get<PaginatedResponse<Sale>>(
    `/api/customers/${customerId}/purchases/`,
    { params }
  )
  return response.data
}

// ============= Refunds API =============

/**
 * Request refund
 */
export async function requestRefund(refundData: {
  sale: UUID
  reason: string
  reason_details?: string
  refund_method: 'CASH' | 'CREDIT_NOTE' | 'ORIGINAL_PAYMENT'
  items: Array<{
    sale_item: UUID
    quantity: number
    restock: boolean
    condition: 'UNOPENED' | 'OPENED' | 'DAMAGED'
    notes?: string
  }>
}): Promise<Refund> {
  const response = await httpClient.post<Refund>('/api/refunds/', refundData)
  return response.data
}

/**
 * Get refund by ID
 */
export async function getRefund(refundId: UUID): Promise<Refund> {
  const response = await httpClient.get<Refund>(`/api/refunds/${refundId}/`)
  return response.data
}

/**
 * List refunds
 */
export async function listRefunds(params?: Record<string, unknown>): Promise<PaginatedResponse<Refund>> {
  const response = await httpClient.get<PaginatedResponse<Refund>>('/api/refunds/', { params })
  return response.data
}

/**
 * Approve refund
 */
export async function approveRefund(refundId: UUID, notes?: string): Promise<Refund> {
  const response = await httpClient.post<Refund>(`/api/refunds/${refundId}/approve/`, { notes })
  return response.data
}

/**
 * Reject refund
 */
export async function rejectRefund(refundId: UUID, reason: string): Promise<Refund> {
  const response = await httpClient.post<Refund>(`/api/refunds/${refundId}/reject/`, { reason })
  return response.data
}

/**
 * Process refund
 */
export async function processRefund(refundId: UUID): Promise<Refund> {
  const response = await httpClient.post<Refund>(`/api/refunds/${refundId}/process/`)
  return response.data
}

/**
 * Check warranty eligibility
 */
export async function checkWarrantyEligibility(
  saleId: UUID,
  items: Array<{ product: UUID; quantity: number }>
): Promise<WarrantyEligibility> {
  const response = await httpClient.post<WarrantyEligibility>(
    `/api/sales/${saleId}/refund-eligibility/`,
    { items }
  )
  return response.data
}

// ============= Payments API =============

/**
 * Create card payment intent (Stripe/Paystack)
 */
export async function createCardPaymentIntent(saleId: UUID, amount: number): Promise<{
  client_secret: string
  payment_intent_id: string
}> {
  const response = await httpClient.post('/api/payments/card-intent/', { sale: saleId, amount })
  return response.data
}

/**
 * Initiate mobile money payment
 */
export async function initiateMobileMoneyPayment(
  saleId: UUID,
  amount: number,
  phoneNumber: string,
  network: string
): Promise<{
  transaction_id: string
  status: string
  message: string
}> {
  const response = await httpClient.post('/api/payments/mobile-money/', {
    sale: saleId,
    amount,
    phone_number: phoneNumber,
    network,
  })
  return response.data
}

/**
 * Check payment status
 */
export async function checkPaymentStatus(paymentId: UUID): Promise<Payment> {
  const response = await httpClient.get<Payment>(`/api/payments/${paymentId}/status/`)
  return response.data
}

// ============= Reports API =============

/**
 * Get daily sales report
 */
export async function getDailySalesReport(
  storefrontId: UUID,
  date: string
): Promise<DailySalesReport> {
  const response = await httpClient.get<DailySalesReport>('/api/reports/daily-sales/', {
    params: { storefront: storefrontId, date },
  })
  return response.data
}

/**
 * Get product sales report
 */
export async function getProductSalesReport(
  productId: UUID,
  params: {
    from: string
    to: string
    storefront?: UUID
  }
): Promise<ProductSalesReport> {
  const response = await httpClient.get<ProductSalesReport>('/api/reports/product-sales/', {
    params: { product: productId, ...params },
  })
  return response.data
}
