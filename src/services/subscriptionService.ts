import httpClient from './httpClient'
import type { PaginatedResponse } from '../types/common'
import type { 
  Plan, 
  Subscription, 
  SubscriptionPayment,
  Invoice,
  SubscriptionAlert,
  SubscriptionStats,
  CreateSubscriptionRequest,
  CancelSubscriptionRequest,
  InitializePaymentRequest,
  VerifyPaymentRequest,
  PaymentInitiationResponse,
  PaymentVerificationResponse,
  TaxConfiguration,
  CreateTaxConfigPayload,
  UpdateTaxConfigPayload,
  PricingBreakdown,
  PricingCalculationParams,
  MyPricingResponse,
  SubscriptionStatusResponse
} from '../types/subscriptions'

// ========== Plans ==========

export const fetchPlans = async () => {
  const { data } = await httpClient.get<PaginatedResponse<Plan>>(
    '/subscriptions/api/plans/'
  )
  return data
}

export const fetchPlanDetails = async (planId: string) => {
  const { data } = await httpClient.get<Plan>(
    `/subscriptions/api/plans/${planId}/`
  )
  return data
}

export const fetchPopularPlans = async () => {
  const { data } = await httpClient.get<Plan[]>(
    '/subscriptions/api/plans/popular/'
  )
  return data
}

// ========== Subscriptions ==========

export const createSubscription = async (payload: CreateSubscriptionRequest) => {
  const { data } = await httpClient.post<Subscription>(
    '/subscriptions/api/subscriptions/',
    payload
  )
  return data
}

export const fetchMySubscription = async () => {
  const { data } = await httpClient.get<Subscription>(
    '/subscriptions/api/subscriptions/me/'
  )
  return data
}

export const fetchSubscriptions = async (businessId?: string) => {
  const { data } = await httpClient.get<PaginatedResponse<Subscription>>(
    '/subscriptions/api/subscriptions/',
    businessId ? { params: { business_id: businessId } } : undefined
  )
  return data
}

export const fetchSubscriptionDetails = async (subscriptionId: string) => {
  const { data } = await httpClient.get<Subscription>(
    `/subscriptions/api/subscriptions/${subscriptionId}/`
  )
  return data
}

export const cancelSubscription = async (
  subscriptionId: string,
  payload: CancelSubscriptionRequest
) => {
  const { data } = await httpClient.post<Subscription>(
    `/subscriptions/api/subscriptions/${subscriptionId}/cancel/`,
    payload
  )
  return data
}

export const renewSubscription = async (
  subscriptionId: string,
  paymentMethod?: string
) => {
  const { data } = await httpClient.post<Subscription>(
    `/subscriptions/api/subscriptions/${subscriptionId}/renew/`,
    paymentMethod ? { payment_method: paymentMethod } : {}
  )
  return data
}

export const fetchSubscriptionUsage = async (subscriptionId: string) => {
  const { data } = await httpClient.get<Subscription>(
    `/subscriptions/api/subscriptions/${subscriptionId}/usage/`
  )
  return data
}

// ========== Payments ==========

export const initializePayment = async (
  subscriptionId: string,
  payload: InitializePaymentRequest
) => {
  const { data } = await httpClient.post<PaymentInitiationResponse>(
    `/subscriptions/api/subscriptions/${subscriptionId}/initialize_payment/`,
    payload
  )
  return data
}

export const verifyPayment = async (
  subscriptionId: string,
  payload: VerifyPaymentRequest
) => {
  const { data } = await httpClient.post<PaymentVerificationResponse>(
    `/subscriptions/api/subscriptions/${subscriptionId}/verify_payment/`,
    payload
  )
  return data
}

export const fetchPayments = async () => {
  const { data } = await httpClient.get<PaginatedResponse<SubscriptionPayment>>(
    '/subscriptions/api/payments/'
  )
  return data
}

export const fetchSubscriptionPayments = async (subscriptionId: string) => {
  const { data } = await httpClient.get<PaginatedResponse<SubscriptionPayment>>(
    `/subscriptions/api/subscriptions/${subscriptionId}/payments/`
  )
  return data
}

// ========== Invoices ==========

export const fetchInvoices = async () => {
  const { data } = await httpClient.get<PaginatedResponse<Invoice>>(
    '/subscriptions/api/invoices/'
  )
  return data
}

export const fetchSubscriptionInvoices = async (subscriptionId: string) => {
  const { data } = await httpClient.get<PaginatedResponse<Invoice>>(
    `/subscriptions/api/subscriptions/${subscriptionId}/invoices/`
  )
  return data
}

export const fetchInvoiceDetails = async (invoiceId: string) => {
  const { data } = await httpClient.get<Invoice>(
    `/subscriptions/api/invoices/${invoiceId}/`
  )
  return data
}

// ========== Alerts ==========

export const fetchAlerts = async () => {
  const { data } = await httpClient.get<PaginatedResponse<SubscriptionAlert>>(
    '/subscriptions/api/alerts/'
  )
  return data
}

export const fetchSubscriptionAlerts = async (subscriptionId: string) => {
  const { data } = await httpClient.get<PaginatedResponse<SubscriptionAlert>>(
    `/subscriptions/api/subscriptions/${subscriptionId}/alerts/`
  )
  return data
}

export const fetchUnreadAlerts = async () => {
  const { data } = await httpClient.get<PaginatedResponse<SubscriptionAlert>>(
    '/subscriptions/api/alerts/unread/'
  )
  return data
}

export const fetchCriticalAlerts = async () => {
  const { data } = await httpClient.get<PaginatedResponse<SubscriptionAlert>>(
    '/subscriptions/api/alerts/critical/'
  )
  return data
}

export const markAlertAsRead = async (alertId: string) => {
  const { data } = await httpClient.post<SubscriptionAlert>(
    `/subscriptions/api/alerts/${alertId}/mark_read/`
  )
  return data
}

export const dismissAlert = async (alertId: string) => {
  const { data } = await httpClient.post<SubscriptionAlert>(
    `/subscriptions/api/alerts/${alertId}/dismiss/`
  )
  return data
}

// ========== Admin Stats (Platform Owner) ==========

export const fetchSubscriptionStats = async () => {
  const { data } = await httpClient.get<SubscriptionStats>(
    '/subscriptions/api/stats/overview/'
  )
  return data
}

export const fetchRevenueByPlan = async () => {
  const { data } = await httpClient.get<Array<{ plan: string; revenue: string }>>(
    '/subscriptions/api/stats/revenue_by_plan/'
  )
  return data
}

export const fetchExpiringSoon = async () => {
  const { data } = await httpClient.get<PaginatedResponse<Subscription>>(
    '/subscriptions/api/stats/expiring_soon/'
  )
  return data
}

// ========== Tax Configuration ==========

/**
 * Fetch all tax configurations with optional filtering
 * @param params - Optional filters: is_active, country
 */
export const fetchTaxConfigurations = async (params?: {
  is_active?: boolean
  country?: string
}) => {
  const { data } = await httpClient.get<TaxConfiguration[]>(
    '/subscriptions/api/tax-config/',
    params ? { params } : undefined
  )
  return data
}

/**
 * Fetch a single tax configuration by ID
 * @param taxId - UUID of the tax configuration
 */
export const fetchTaxConfiguration = async (taxId: string) => {
  const { data } = await httpClient.get<TaxConfiguration>(
    `/subscriptions/api/tax-config/${taxId}/`
  )
  return data
}

/**
 * Fetch only currently active/effective tax configurations
 * Considers effective_from and effective_until dates
 */
export const fetchActiveTaxConfigurations = async () => {
  const { data } = await httpClient.get<TaxConfiguration[]>(
    '/subscriptions/api/tax-config/active/'
  )
  return data
}

/**
 * Create a new tax configuration (Platform Admin only)
 * @param payload - Tax configuration data
 */
export const createTaxConfiguration = async (payload: CreateTaxConfigPayload) => {
  const { data } = await httpClient.post<TaxConfiguration>(
    '/subscriptions/api/tax-config/',
    payload
  )
  return data
}

/**
 * Update an existing tax configuration (Platform Admin only)
 * @param taxId - UUID of the tax configuration
 * @param payload - Partial tax configuration data to update
 */
export const updateTaxConfiguration = async (
  taxId: string,
  payload: UpdateTaxConfigPayload
) => {
  const { data } = await httpClient.patch<TaxConfiguration>(
    `/subscriptions/api/tax-config/${taxId}/`,
    payload
  )
  return data
}

/**
 * Delete a tax configuration (Platform Admin only)
 * @param taxId - UUID of the tax configuration
 */
export const deleteTaxConfiguration = async (taxId: string) => {
  await httpClient.delete(`/subscriptions/api/tax-config/${taxId}/`)
}

// ========== Pricing Calculation ==========

/**
 * Calculate complete pricing breakdown including taxes and service charges
 * NEVER implement tax calculation on frontend - always use this endpoint
 * @param params - storefronts (required), gateway (optional)
 */
export const calculatePricing = async (params: PricingCalculationParams) => {
  const queryParams = new URLSearchParams({
    storefronts: params.storefronts.toString(),
    ...(params.gateway && { gateway: params.gateway })
  })
  
  const { data } = await httpClient.get<PricingBreakdown>(
    `/subscriptions/api/pricing/calculate/?${queryParams}`
  )
  return data
}

// ========== Secure Pricing (Auto-calculated) ==========

/**
 * Get auto-calculated pricing for the current user's business
 * Backend counts actual storefronts and calculates pricing
 * NO user input - prevents pricing manipulation
 */
export const fetchMyPricing = async () => {
  const { data } = await httpClient.get<MyPricingResponse>(
    '/subscriptions/api/subscriptions/my-pricing/'
  )
  return data
}

/**
 * Check if current business has an active subscription
 * Used to show appropriate UI (subscribe vs manage)
 */
export const checkSubscriptionStatus = async () => {
  const { data } = await httpClient.get<SubscriptionStatusResponse>(
    '/subscriptions/api/subscriptions/status/'
  )
  return data
}
