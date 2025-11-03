import type { UUID } from './common'

export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'YEARLY'

export type SubscriptionStatus = 
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'INACTIVE'
  | 'CANCELLED'
  | 'SUSPENDED'
  | 'EXPIRED'

export type PaymentGateway = 'PAYSTACK' | 'STRIPE' | 'MOMO' | 'BANK_TRANSFER'

export type PaymentStatus = 'PAID' | 'PENDING' | 'FAILED' | 'OVERDUE' | 'CANCELLED' | 'SUCCESSFUL' | 'REFUNDED'

export type PaymentMethodType = 'MOMO' | 'PAYSTACK' | 'STRIPE' | 'BANK_TRANSFER'

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'

export type AlertPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type AlertType =
  | 'PAYMENT_DUE'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_SUCCESS'
  | 'TRIAL_ENDING'
  | 'SUBSCRIPTION_EXPIRING'
  | 'SUBSCRIPTION_EXPIRED'
  | 'USAGE_LIMIT_WARNING'
  | 'USAGE_LIMIT_REACHED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'SUBSCRIPTION_SUSPENDED'
  | 'SUBSCRIPTION_ACTIVATED'

export type TaxAppliesTo = 'SUBTOTAL' | 'CUMULATIVE'

export type ServiceChargeType = 'PERCENTAGE' | 'FIXED'

// Business info included in subscription responses
export interface BusinessInfo {
  id: UUID
  name: string
  description?: string
}

// ============================================
// TAX CONFIGURATION
// ============================================

export interface TaxConfiguration {
  id: UUID
  name: string
  code: string
  description: string
  rate: string
  country: string
  applies_to_subscriptions: boolean
  is_mandatory: boolean
  calculation_order: number
  applies_to: TaxAppliesTo
  is_active: boolean
  effective_from: string
  effective_until: string | null
  is_effective_now: boolean
  created_at: string
  updated_at: string
}

export interface CreateTaxConfigPayload {
  name: string
  code: string
  description?: string
  rate: string
  country: string
  applies_to_subscriptions?: boolean
  is_mandatory?: boolean
  calculation_order?: number
  applies_to?: TaxAppliesTo
  is_active?: boolean
  effective_from: string
  effective_until?: string | null
}

export type UpdateTaxConfigPayload = Partial<CreateTaxConfigPayload>

// ============================================
// PRICING TIERS (STOREFRONT-BASED PRICING)
// ============================================

export interface PricingTier {
  id: UUID
  name: string
  min_storefronts: number
  max_storefronts: number | null
  base_price: string
  base_storefronts: number
  price_per_additional_storefront: string
  currency: string
  is_active: boolean
  description: string
  created_at: string
  updated_at: string
  created_by?: UUID
}

export interface CreatePricingTierPayload {
  name: string
  min_storefronts: number
  max_storefronts: number | null
  base_price: string
  base_storefronts: number
  price_per_additional_storefront: string
  currency: string
  description?: string
  is_active?: boolean
}

export type UpdatePricingTierPayload = Partial<CreatePricingTierPayload> & { id: UUID }

// ============================================
// PRICING CALCULATION
// ============================================

export interface TaxBreakdownItem {
  code: string
  name: string
  rate: number
  amount: string
}

export interface ServiceChargeItem {
  code: string
  name: string
  type: ServiceChargeType
  rate?: number
  amount: string
}

export interface PricingBreakdown {
  storefronts: number
  currency: string
  base_price: string
  taxes: TaxBreakdownItem[]
  total_tax: string
  service_charges: ServiceChargeItem[]
  total_service_charges: string
  total_amount: string
  breakdown: {
    tier_id: UUID
    tier_description: string
    base_storefronts: number
    additional_storefronts: number
    price_per_additional: string
  }
}

export interface PricingCalculationParams {
  storefronts: number
  gateway?: PaymentGateway
}

// ============================================
// SECURE PRICING (Auto-calculated by backend)
// ============================================

/**
 * Response from /subscriptions/api/subscriptions/my-pricing/
 * Backend auto-calculates pricing based on user's actual storefront count
 */
export interface MyPricingResponse {
  business_name: string
  business_id: UUID
  storefront_count: number
  currency: string
  base_price: string
  taxes: TaxBreakdownItem[]
  total_tax: string
  total_amount: string
  billing_cycle: BillingCycle | string
  tier_description: string
  service_charges?: ServiceChargeItem[]
  total_service_charges?: string

  // Legacy fields (kept optional for backward compatibility with older specs)
  storefronts?: number
  breakdown?: {
    tier_id?: UUID
    tier_name?: string
    tier_description?: string
    base_storefronts?: number
    additional_storefronts?: number
    price_per_additional?: string
  }
}

/**
 * Response from /subscriptions/api/subscriptions/status/
 * Check if user has an active subscription
 */
export interface SubscriptionStatusResponse {
  has_subscription: boolean
  subscription?: (Subscription & { plan_name?: string }) | {
    id?: UUID
    status?: SubscriptionStatus
    plan_name?: string
    current_period_end?: string
  } | null
}

export interface Plan {
  id: UUID
  name: string
  description: string
  price: string
  currency: string
  billing_cycle: BillingCycle
  billing_cycle_display?: string
  
  // Limits
  max_users: number | null
  max_employees?: number | null
  max_storefronts: number | null
  max_products: number | null
  max_transactions_per_month?: number | null
  
  // Features (can be list or object)
  features: string[] | Record<string, boolean>
  features_display?: string[]
  
  is_active: boolean
  is_popular: boolean
  sort_order?: number
  trial_period_days?: number
  active_subscriptions_count?: number
  
  created_at: string
  updated_at: string
}

export interface UsageStats {
  users?: {
    current: number
    limit: number | null
    exceeded: boolean
  }
  storefronts?: {
    current: number
    limit: number | null
    exceeded: boolean
  }
  products?: {
    current: number
    limit: number | null
    exceeded: boolean
  }
}

export interface Subscription {
  id: UUID
  
  // Business relationship (NOT user!)
  business_id: UUID
  business_name: string
  business?: BusinessInfo
  
  // Plan relationship
  plan: Plan
  plan_id?: UUID
  
  // Status and lifecycle
  status: SubscriptionStatus
  payment_status?: PaymentStatus
  payment_method?: string
  
  // Billing periods
  start_date?: string
  end_date?: string
  current_period_start: string
  current_period_end: string
  next_billing_date?: string | null
  
  // Trial info
  is_trial?: boolean
  trial_end_date?: string | null
  
  // Renewal and cancellation
  auto_renew: boolean
  cancel_at_period_end: boolean
  cancelled_at: string | null
  cancelled_by?: UUID | null
  
  // Amounts
  amount?: string
  currency?: string
  
  // Computed fields
  grace_period_days: number
  days_until_expiry?: number
  is_active: boolean
  is_expired?: boolean
  
  // Usage tracking
  usage_limits?: UsageStats
  latest_payment?: {
    id: string
    amount: string
    payment_date: string
    payment_method: string
  }
  
  // Metadata
  notes: string
  created_at: string
  updated_at: string
}

// For /me/ endpoint - returns array of subscriptions
export type MySubscriptionsResponse = Subscription[]

export interface SubscriptionPayment {
  id: UUID
  subscription: UUID
  subscription_plan_name?: string
  subscription_business_name?: string
  
  amount: string
  currency?: string
  payment_method: PaymentMethodType
  status: 'SUCCESSFUL' | 'PENDING' | 'FAILED' | 'CANCELLED' | 'REFUNDED'
  
  transaction_id: string | null
  transaction_reference?: string
  gateway_reference?: string | null
  gateway_response: Record<string, unknown>
  
  payment_date: string | null
  paid_at?: string | null
  
  billing_period_start?: string
  billing_period_end?: string
  
  notes: string
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: UUID
  subscription: UUID
  subscription_plan_name?: string
  subscription_business_name?: string
  
  invoice_number: string
  amount: string
  tax_amount?: string
  total_amount?: string
  
  status: InvoiceStatus
  
  billing_period_start: string
  billing_period_end: string
  issue_date: string
  due_date: string
  paid_date: string | null
  
  is_overdue?: boolean
  days_overdue?: number
  
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface SubscriptionAlert {
  id: UUID
  subscription: UUID
  subscription_business_name?: string
  subscription_plan_name?: string
  
  alert_type: AlertType
  priority: AlertPriority
  
  title: string
  message: string
  
  // Notification channels
  email_sent?: boolean
  sms_sent?: boolean
  in_app_shown?: boolean
  
  // User actions
  is_read: boolean
  is_dismissed: boolean
  action_taken?: boolean
  action_taken_at?: string | null
  
  read_at: string | null
  dismissed_at: string | null
  
  metadata?: Record<string, unknown>
  
  created_at: string
}

export interface PaymentInitiationResponse {
  status?: string
  message?: string
  data?: {
    authorization_url?: string
    checkout_url?: string
    access_code?: string
    session_id?: string
    reference: string
  }
  // Legacy support
  authorization_url?: string
  checkout_url?: string
  reference?: string
  session_id?: string
}

export interface PaymentVerificationResponse {
  success: boolean
  message: string
  payment?: SubscriptionPayment
}

export interface SubscriptionStats {
  total_subscriptions: number
  active_subscriptions: number
  trial_subscriptions: number
  expired_subscriptions: number
  cancelled_subscriptions: number
  total_revenue: string
  monthly_recurring_revenue: string
  average_subscription_value: string
  churn_rate: number
}

export interface CreateSubscriptionRequest {
  plan_id?: UUID  // Optional - backend auto-calculates tier from storefront count
  business_id?: UUID  // Optional - backend can infer from authenticated user
  payment_method?: PaymentMethodType
  is_trial?: boolean
  trial_end_date?: string
}

// New simplified subscription creation (no plan selection)
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CreateSubscriptionRequestV2 {
  // Empty body - backend calculates everything automatically
  // based on user's business storefront count
}

export interface CancelSubscriptionRequest {
  immediately?: boolean
  reason?: string
}

export interface InitializePaymentRequest {
  gateway: PaymentGateway
  callback_url?: string
  success_url?: string
  cancel_url?: string
}

export interface VerifyPaymentRequest {
  gateway: PaymentGateway
  reference: string
}

// ============================================
// API Response Types
// ============================================

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
  data?: T[]  // Alternative field name used by some endpoints
}

// Plans list response
export type PlansListResponse = PaginatedResponse<Plan>

// Subscriptions list response
export type SubscriptionsListResponse = PaginatedResponse<Subscription>

// Payments list response
export type PaymentsListResponse = PaginatedResponse<SubscriptionPayment>

// Invoices list response
export type InvoicesListResponse = PaginatedResponse<Invoice>

// Alerts list response
export type AlertsListResponse = PaginatedResponse<SubscriptionAlert>

// ============================================
// Usage Examples for Frontend
// ============================================

/*
IMPORTANT NOTES FOR FRONTEND DEVELOPERS:

1. GET /subscriptions/api/subscriptions/me/ returns ARRAY, not single object!
   
   ❌ WRONG:
   const { data: subscription } = await api.get('/subscriptions/api/subscriptions/me/')
   // subscription is array!
   
   ✅ CORRECT:
   const { data: subscriptions } = await api.get('/subscriptions/api/subscriptions/me/')
   if (subscriptions.length > 0) {
     // Use subscriptions[0]
   }

2. Creating subscription requires business_id (REQUIRED):
   
   ❌ WRONG:
   await api.post('/subscriptions/api/subscriptions/', {
     plan_id: selectedPlan.id
     // Missing business_id!
   })
   
   ✅ CORRECT:
   await api.post('/subscriptions/api/subscriptions/', {
     plan_id: selectedPlan.id,
     business_id: currentBusiness.id  // Required!
   })

3. Subscription belongs to BUSINESS, not USER:
   - Each business has one subscription
   - Users access subscriptions through business membership
   - Use subscription.business_id and subscription.business_name

4. Empty /me/ response is [] not 404:
   ✅ CORRECT:
   const { data: subscriptions } = await api.get('/subscriptions/api/subscriptions/me/')
   if (subscriptions.length === 0) {
     // No subscriptions - this is normal!
   }

5. Payment gateway types:
   - 'PAYSTACK' - For Ghana/Mobile Money
   - 'STRIPE' - For international cards
   - 'MOMO' - Mobile Money direct
   - 'BANK_TRANSFER' - Bank transfer

6. Billing cycles:
   - 'MONTHLY' - Monthly billing
   - 'QUARTERLY' - Every 3 months
   - 'YEARLY' - Annual billing (not 'ANNUALLY')

7. Plan object is embedded in subscription (not just UUID):
   ✅ CORRECT:
   // subscription.plan.name works
   // subscription.plan.price works
   
   ❌ WRONG:
   // plan_details doesn't exist!
*/

