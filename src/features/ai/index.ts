/**
 * AI Features Module Exports
 */

// Components
export { default as AICreditsWidget } from './components/AICreditsWidget'
export { default as AIQueryBox } from './components/AIQueryBox'
export { default as PurchaseCreditsModal } from './components/PurchaseCreditsModal'
export { default as AICheckoutModal } from './components/AICheckoutModal'
export { default as ProductDescriptionModal } from './components/ProductDescriptionModal'
export { default as CollectionMessageModal } from './components/CollectionMessageModal'
export { default as CreditRiskAssessmentModal } from './components/CreditRiskAssessmentModal'
export { default as ReportNarrativeWidget } from './components/ReportNarrativeWidget'
export { default as InventoryForecastWidget } from './components/InventoryForecastWidget'

// Pages
export { default as AIFeaturesPage } from './pages/AIFeaturesPage'

// Re-export types
export * from '../../types/ai'

// Re-export service functions
export * from '../../services/ai/aiService'

// Re-export store actions and selectors
export {
  fetchCreditsBalance,
  purchaseCredits,
  fetchUsageStats,
  fetchTransactionHistory,
  processQuery,
  generateDescription,
  generateMessage,
  assessRisk,
  generateNarrative,
  generateForecast,
  showPurchaseModal,
  hidePurchaseModal,
  showCheckoutModal,
  hideCheckoutModal,
  clearQueryResult,
  clearProductDescription,
  clearCollectionMessage,
  clearCreditAssessment,
  clearReportNarrative,
  clearInventoryForecast,
  clearAllErrors,
  selectAICredits,
  selectAICreditsLoading,
  selectAIUsageStats,
  selectAITransactions,
  selectQueryResult,
  selectQueryLoading,
  selectPurchaseModal,
  selectCheckoutModal,
  selectCollectionMessage,
  selectCreditAssessment,
  selectReportNarrative,
  selectInventoryForecast,
} from '../../store/slices/aiSlice'
