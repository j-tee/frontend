/**
 * AI Features Module Exports
 */

// Components
export { default as AICreditsWidget } from './components/AICreditsWidget'
export { default as AIQueryBox } from './components/AIQueryBox'
export { default as PurchaseCreditsModal } from './components/PurchaseCreditsModal'
export { default as AICheckoutModal } from './components/AICheckoutModal'

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
  showPurchaseModal,
  hidePurchaseModal,
  showCheckoutModal,
  hideCheckoutModal,
  clearQueryResult,
  clearProductDescription,
  clearCollectionMessage,
  clearCreditAssessment,
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
} from '../../store/slices/aiSlice'
