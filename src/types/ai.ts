/**
 * AI Features Type Definitions
 * Based on AI Features API Documentation
 */

// ============================================
// AI Credit Management Types
// ============================================

export interface AICreditsBalance {
  id?: string
  business?: string
  balance: number
  purchased_at?: string
  updated_at?: string
  expires_at?: string
  is_active?: boolean
  is_expired?: boolean
  days_until_expiry?: number
  message?: string
}

export type CreditPackageType = 'starter' | 'value' | 'premium' | 'custom'
export type PaymentMethod = 'mobile_money' | 'card'

export interface CreditPurchaseRequest {
  package: CreditPackageType
  payment_method: PaymentMethod
  custom_amount?: number
  callback_url?: string
}

export interface AICreditInvoiceLine {
  code?: string
  label?: string
  name?: string
  rate?: number | string
  amount: number | string
  tax_id?: string
  applies_to?: 'SUBTOTAL' | 'CUMULATIVE' | string
  type?: string
}

export interface AICreditInvoiceSummary {
  id?: string
  number?: string
  currency?: string
  subtotal?: number | string
  base_amount?: number | string
  tax_total?: number | string
  total?: number | string
  total_amount?: number | string
  taxes?: AICreditInvoiceLine[]
  breakdown?: AICreditInvoiceLine[]
  due_at?: string | null
  expires_at?: string | null
}

export interface AICreditPaymentDetails {
  gateway?: string
  reference?: string
  authorization_url?: string | null
  payment_url?: string | null
  checkout_url?: string | null
  access_code?: string | null
  message?: string
  expires_at?: string | null
}

export interface AICreditPurchaseSummary {
  package: CreditPackageType | string
  credits: number
  bonus_credits?: number
  unit_price?: number | string
  amount?: number | string
  credits_to_add?: number
}

export interface AICreditVerificationResponse {
  success?: boolean
  status?: 'success' | 'failed' | 'error'
  message?: string
  reference?: string
  gateway?: string
  credits_added?: number
  new_balance?: number
  balance?: number
}

export interface CreditPurchaseResponse {
  invoice: AICreditInvoiceSummary
  payment?: AICreditPaymentDetails
  purchase?: AICreditPurchaseSummary

  // Legacy fields for backward compatibility
  purchase_id?: string
  credits_added?: number
  new_balance?: number
  expires_at?: string
  payment_reference?: string
  payment_link?: string
  amount?: number | string
  currency?: string

  // Gateway-first payloads
  authorization_url?: string | null
  access_code?: string | null
  reference?: string
  credits_to_add?: number
  package?: CreditPackageType | string
}

export interface AIUsageStats {
  period_days: number
  current_balance: number
  total_requests: number
  successful_requests: number
  failed_requests: number
  total_credits_used: number
  total_cost_ghs: number
  avg_processing_time_ms: number
  feature_breakdown: AIFeatureUsage[]
}

export interface AIFeatureUsage {
  feature: string
  count: number
  credits_used: number
}

export interface AITransaction {
  id: string
  business: string
  user: string
  feature: string
  feature_display: string
  credits_used: number
  cost_to_us: number
  tokens_used: number
  timestamp: string
  success: boolean
  error_message: string
  processing_time_ms: number
}

export interface AITransactionListResponse {
  count: number
  results: AITransaction[]
}

export interface FeatureAvailability {
  available: boolean
  feature: string
  cost: number
  current_balance: number
  shortage: number
}

// ============================================
// Natural Language Query Types
// ============================================

export type QueryType = 'product' | 'customer' | 'sales' | 'inventory' | 'financial' | 'general'

export interface NaturalLanguageQueryRequest {
  query: string
  storefront_id?: string
}

export interface VisualizationHint {
  type: 'bar_chart' | 'line_chart' | 'pie_chart' | 'table' | 'metric'
  x_axis?: string
  y_axis?: string
  title?: string
}

export interface NaturalLanguageQueryResponse {
  answer: string
  query_type: QueryType
  data: Record<string, unknown>
  follow_up_questions?: string[]
  visualization_hints?: VisualizationHint
  credits_used: number
  new_balance: number
  processing_time_ms: number
}

// ============================================
// Product Description Generator Types
// ============================================

export type DescriptionTone = 'professional' | 'casual' | 'technical' | 'marketing'
export type DescriptionLanguage = 'en' | 'tw'

export interface ProductDescriptionRequest {
  product_id: string
  tone: DescriptionTone
  language: DescriptionLanguage
  include_seo: boolean
}

export interface ProductDescriptionResponse {
  description: string
  short_description: string
  seo_keywords: string[]
  meta_description: string
  credits_used: number
  new_balance: number
}

// ============================================
// Smart Collections Types
// ============================================

export type MessageType = 'first_reminder' | 'second_reminder' | 'final_notice' | 'payment_plan_offer'
export type MessageTone = 'professional_friendly' | 'firm' | 'formal_legal'

export interface CollectionMessageRequest {
  customer_id: string
  message_type: MessageType
  tone: MessageTone
  language: DescriptionLanguage
  include_payment_plan: boolean
}

export interface CollectionMessageResponse {
  subject: string
  body: string
  sms_version: string
  whatsapp_version: string
  credits_used: number
  new_balance: number
}

// ============================================
// Credit Risk Assessment Types
// ============================================

export type AssessmentType = 'new_credit' | 'increase' | 'renewal'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type RecommendationAction = 'APPROVE_FULL' | 'APPROVE_PARTIAL' | 'DENY' | 'REQUIRE_MORE_INFO'

export interface CreditRiskAssessmentRequest {
  customer_id: string
  requested_credit_limit: number
  assessment_type: AssessmentType
}

export interface CustomerSummary {
  id: string
  name: string
  current_limit: number
  requested_limit: number
}

export interface RiskRecommendation {
  action: RecommendationAction
  suggested_limit: number
  suggested_terms_days: number
  confidence: number
}

export interface RiskAnalysis {
  positive_factors: string[]
  risk_factors: string[]
  comparable_customers: {
    similar_approved_limit_avg: number
    default_rate_for_similar_profile: string
  }
}

export interface CreditRiskAssessmentResponse {
  customer: CustomerSummary
  risk_score: number
  risk_level: RiskLevel
  recommendation: RiskRecommendation
  analysis: RiskAnalysis
  conditions: string[]
  explanation: string
  credits_used: number
  new_balance: number
}

// ============================================
// Report Narrative Generator Types
// ============================================

export type ReportType = 
  | 'sales_summary' 
  | 'stock_levels' 
  | 'revenue_profit' 
  | 'ar_aging'
  | 'inventory_movement'
  | 'general'

export type ReportData = Record<string, unknown>

export interface ReportNarrativeRequest {
  report_type: ReportType
  report_data: ReportData
}

export interface ReportNarrativeResponse {
  executive_summary: string
  key_insights: string[]
  trends: string[]
  recommendations: string[]
  alerts?: string[]
  credits_used: number
  new_balance: number
}

// ============================================
// Inventory Forecasting Types
// ============================================

export interface InventoryForecastRequest {
  warehouse_id?: string
  category_id?: string
  forecast_days?: number
}

export interface ProductForecast {
  product_id: string
  product_name: string
  sku: string
  current_stock: number
  reorder_point: number
  predicted_stockout_date: string | null
  days_until_stockout: number | null
  recommended_reorder_quantity: number
  recommended_reorder_date: string | null
  confidence_score: number
  weekly_sales_velocity: number
  trend: 'increasing' | 'stable' | 'decreasing'
  seasonality_factor?: number
  risk_level: 'critical' | 'high' | 'medium' | 'low'
}

export interface InventoryForecastResponse {
  forecast_period_days: number
  total_products_analyzed: number
  products_at_risk: number
  forecasts: ProductForecast[]
  summary: {
    critical_items: number
    high_risk_items: number
    medium_risk_items: number
    low_risk_items: number
    total_recommended_reorder_value: number
  }
  credits_used: number
  new_balance: number
}

// ============================================
// Feature Cost Reference
// ============================================

export interface AIFeatureCost {
  feature: string
  credits: number
  ghs_cost: number
  use_case: string
}

export const AI_FEATURE_COSTS: Record<string, number> = {
  natural_language_query: 0.5,
  product_description: 0.1,
  collection_message: 0.5,
  credit_assessment: 3.0,
  collection_priority: 5.0,
  portfolio_dashboard: 5.0,
  payment_prediction: 1.0,
  inventory_forecast: 4.0,
  report_narrative: 0.2,
}

// ============================================
// Error Types
// ============================================

export interface AIErrorResponse {
  error: string
  message: string
  current_balance?: number
  required_credits?: number
}

// ============================================
// UI State Types
// ============================================

export interface AILoadingState {
  isLoading: boolean
  message?: string
}

export interface AIPurchaseModalState {
  isOpen: boolean
  requiredCredits?: number
  currentBalance?: number
  shortage?: number
}

export interface AICheckoutModalState {
  isOpen: boolean
  payment?: CreditPurchaseResponse | null
}

export interface CreditPaymentCallbackRequest {
  reference: string
  status: 'success' | 'failed' | 'pending'
  gateway?: string
}

export interface CreditPaymentCallbackResponse {
  success: boolean
  message?: string
  credits_added?: number
  new_balance?: number
  invoice_id?: string
  invoice_status?: string
}
