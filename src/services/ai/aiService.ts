/**
 * AI Features Service
 * Handles all API calls for AI-powered features
 */

import httpClient from '../httpClient'
import type {
  AICreditsBalance,
  CreditPurchaseRequest,
  CreditPurchaseResponse,
  AIUsageStats,
  AITransactionListResponse,
  FeatureAvailability,
  NaturalLanguageQueryRequest,
  NaturalLanguageQueryResponse,
  ProductDescriptionRequest,
  ProductDescriptionResponse,
  CollectionMessageRequest,
  CollectionMessageResponse,
  CreditRiskAssessmentRequest,
  CreditRiskAssessmentResponse,
  ReportNarrativeRequest,
  ReportNarrativeResponse,
  InventoryForecastRequest,
  InventoryForecastResponse,
  AICreditVerificationResponse,
} from '../../types/ai'

const AI_BASE_PATH = '/ai/api'

// ============================================
// AI Credit Management
// ============================================

/**
 * Get current AI credit balance for the business
 */
export const getCreditsBalance = async (): Promise<AICreditsBalance> => {
  const response = await httpClient.get<AICreditsBalance>(`${AI_BASE_PATH}/credits/balance/`)
  return response.data
}

/**
 * Purchase AI credits
 */
export const purchaseCredits = async (
  data: CreditPurchaseRequest,
): Promise<CreditPurchaseResponse> => {
  const response = await httpClient.post<CreditPurchaseResponse>(
    `${AI_BASE_PATH}/credits/purchase/`,
    data,
  )
  return response.data
}

/**
 * Verify AI credit payment with the given reference
 */
export const verifyCreditsPayment = async (
  reference: string,
): Promise<AICreditVerificationResponse> => {
  console.log('verifyCreditsPayment called with reference:', reference)
  const response = await httpClient.get<AICreditVerificationResponse>(
    `${AI_BASE_PATH}/credits/verify/`,
    { params: { reference, trxref: reference } },
  )
  console.log('verifyCreditsPayment response:', response.data)
  return response.data
}

/**
 * Get AI usage statistics
 */
export const getUsageStats = async (days: number = 30): Promise<AIUsageStats> => {
  const response = await httpClient.get<AIUsageStats>(`${AI_BASE_PATH}/usage/stats/`, {
    params: { days },
  })
  return response.data
}

/**
 * Get AI transaction history
 */
export const getTransactionHistory = async (
  limit: number = 50,
  feature?: string,
): Promise<AITransactionListResponse> => {
  const response = await httpClient.get<AITransactionListResponse>(
    `${AI_BASE_PATH}/transactions/`,
    {
      params: { limit, feature },
    },
  )
  return response.data
}

/**
 * Check if user has enough credits for a feature
 */
export const checkFeatureAvailability = async (
  feature: string,
): Promise<FeatureAvailability> => {
  const response = await httpClient.get<FeatureAvailability>(
    `${AI_BASE_PATH}/check-availability/`,
    {
      params: { feature },
    },
  )
  return response.data
}

// ============================================
// Natural Language Query
// ============================================

/**
 * Process natural language query about business data
 */
export const processNaturalLanguageQuery = async (
  data: NaturalLanguageQueryRequest,
): Promise<NaturalLanguageQueryResponse> => {
  const response = await httpClient.post<NaturalLanguageQueryResponse>(
    `${AI_BASE_PATH}/query/`,
    data,
  )
  return response.data
}

// ============================================
// Product Description Generator
// ============================================

/**
 * Generate AI-powered product description
 */
export const generateProductDescription = async (
  data: ProductDescriptionRequest,
): Promise<ProductDescriptionResponse> => {
  const response = await httpClient.post<ProductDescriptionResponse>(
    `${AI_BASE_PATH}/products/generate-description/`,
    data,
  )
  return response.data
}

// ============================================
// Smart Collections
// ============================================

/**
 * Generate collection message for customer
 */
export const generateCollectionMessage = async (
  data: CollectionMessageRequest,
): Promise<CollectionMessageResponse> => {
  const response = await httpClient.post<CollectionMessageResponse>(
    `${AI_BASE_PATH}/collections/message/`,
    data,
  )
  return response.data
}

/**
 * Assess customer credit risk
 */
export const assessCreditRisk = async (
  data: CreditRiskAssessmentRequest,
): Promise<CreditRiskAssessmentResponse> => {
  const response = await httpClient.post<CreditRiskAssessmentResponse>(
    `${AI_BASE_PATH}/credit/assess/`,
    data,
  )
  return response.data
}

/**
 * Generate report narrative
 */
export const generateReportNarrative = async (
  data: ReportNarrativeRequest,
): Promise<ReportNarrativeResponse> => {
  const response = await httpClient.post<ReportNarrativeResponse>(
    `${AI_BASE_PATH}/reports/narrative/`,
    data,
  )
  return response.data
}

/**
 * Generate inventory forecast
 */
export const generateInventoryForecast = async (
  data: InventoryForecastRequest,
): Promise<InventoryForecastResponse> => {
  const response = await httpClient.post<InventoryForecastResponse>(
    `${AI_BASE_PATH}/inventory/forecast/`,
    data,
  )
  return response.data
}

// ============================================
// Helper Functions
// ============================================

/**
 * Format credit amount for display
 */
export const formatCredits = (credits: number): string => {
  return credits.toFixed(2)
}

/**
 * Format GHS amount
 */
export const formatGHS = (amount: number): string => {
  return `GHS ${amount.toFixed(2)}`
}

/**
 * Check if AI features are enabled
 */
export const areAIFeaturesEnabled = (): boolean => {
  const flag = import.meta.env.VITE_AI_FEATURES_ENABLED
  if (typeof flag === 'string') {
    return flag.toLowerCase() === 'true'
  }
  return true
}
