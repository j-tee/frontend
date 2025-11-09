import React, { useEffect } from 'react'
import { toast } from 'react-toastify'
import { useNavigate, useLocation } from 'react-router-dom'
import useAppDispatch from '../../../hooks/useAppDispatch'
import useAppSelector from '../../../hooks/useAppSelector'
import {
  fetchCreditsBalance,
  fetchUsageStats,
  selectAICredits,
  selectAIUsageStats,
} from '../../../store/slices/aiSlice'
import AICreditsWidget from '../components/AICreditsWidget'
import AIQueryBox from '../components/AIQueryBox'
import { AI_FEATURE_COSTS } from '../../../types/ai'
import './AIFeaturesPage.css'

const FEATURE_CARDS = [
  {
    icon: '🤖',
    title: 'Smart Query',
    description: 'Ask questions about your business in plain English',
    cost: AI_FEATURE_COSTS.natural_language_query,
    path: null, // Feature is on this page already
    action: 'scroll-to-query' as const,
    color: '#8b5cf6',
  },
  {
    icon: '💬',
    title: 'Collection Messages',
    description: 'Generate professional payment reminder messages on AR Aging page',
    cost: AI_FEATURE_COSTS.collection_message,
    path: '/app/reports/financial/ar-aging',
    color: '#10b981',
  },
  {
    icon: '🎯',
    title: 'Credit Risk Assessment',
    description: 'AI-powered customer credit analysis on AR Aging page',
    cost: AI_FEATURE_COSTS.credit_assessment,
    path: '/app/reports/financial/ar-aging',
    color: '#f59e0b',
  },
  {
    icon: '📝',
    title: 'Product Descriptions',
    description: 'Generate compelling product descriptions in inventory',
    cost: AI_FEATURE_COSTS.product_description,
    path: '/app/inventory',
    color: '#3b82f6',
  },
  {
    icon: '📊',
    title: 'Report Narratives',
    description: 'Transform sales data into readable business stories',
    cost: AI_FEATURE_COSTS.report_narrative,
    path: '/app/reports/sales',
    color: '#ec4899',
  },
  {
    icon: '📦',
    title: 'Inventory Forecasting',
    description: 'Predict inventory needs and prevent stockouts',
    cost: AI_FEATURE_COSTS.inventory_forecast,
    path: '/app/reports/inventory',
    color: '#6366f1',
  },
]

export const AIFeaturesPage: React.FC = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const credits = useAppSelector(selectAICredits)
  const usageStats = useAppSelector(selectAIUsageStats)

  useEffect(() => {
    dispatch(fetchCreditsBalance())
    dispatch(fetchUsageStats(30))
  }, [dispatch])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const paymentReference = params.get('reference')
    const paymentStatus = params.get('status')

    if (!paymentReference) {
      return
    }

    dispatch(fetchCreditsBalance())
    dispatch(fetchUsageStats(30))

    if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
      toast.error('Payment was not completed. Please try again if you still need credits.')
    } else {
      toast.success('AI credits added successfully!')
    }

    navigate(location.pathname, { replace: true })
  }, [dispatch, location.pathname, location.search, navigate])

  const availableBalance = Number(credits?.balance ?? 0)

  const normalizedUsageStats = usageStats
    ? {
        totalRequests: Number(usageStats.total_requests ?? 0),
        successfulRequests: Number(usageStats.successful_requests ?? 0),
        totalCreditsUsed: Number(usageStats.total_credits_used ?? 0),
        avgProcessingTime: Number(usageStats.avg_processing_time_ms ?? 0),
        featureBreakdown: Array.isArray(usageStats.feature_breakdown)
          ? usageStats.feature_breakdown.map((feature) => ({
              feature: feature.feature,
              label: feature.feature.replace(/_/g, ' '),
              count: Number(feature.count ?? 0),
              creditsUsed: Number(feature.credits_used ?? 0),
            }))
          : [],
      }
    : null

  const successRate = normalizedUsageStats && normalizedUsageStats.totalRequests > 0
    ? (normalizedUsageStats.successfulRequests / normalizedUsageStats.totalRequests) * 100
    : 0

  const handleFeatureClick = (feature: typeof FEATURE_CARDS[number]) => {
    const featureCost = Number(feature.cost ?? 0)
    const canAfford = availableBalance >= featureCost

    if (!canAfford) {
      toast.warning(`You need ${featureCost} credits to use this feature. Current balance: ${availableBalance.toFixed(1)} credits`)
      return
    }

    if (feature.action === 'scroll-to-query') {
      // Scroll to the query box on this page
      const querySection = document.querySelector('.query-section')
      if (querySection) {
        querySection.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Focus on the input field
        setTimeout(() => {
          const input = querySection.querySelector('textarea') as HTMLTextAreaElement
          if (input) {
            input.focus()
          }
        }, 500)
      }
    } else if (feature.path) {
      navigate(feature.path)
    }
  }

  return (
    <div className="ai-features-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="icon">🤖</span>
            AI-Powered Features
          </h1>
          <p className="subtitle">Unlock powerful insights and automation with AI</p>
        </div>
      </div>

      <div className="page-content">
        <div className="credits-section">
          <AICreditsWidget showPurchaseOptions={true} />
        </div>

        {normalizedUsageStats && (
          <div className="usage-stats-section">
            <h2>Usage Overview (Last 30 Days)</h2>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📈</div>
                <div className="stat-value">
                  {normalizedUsageStats.totalRequests.toLocaleString()}
                </div>
                <div className="stat-label">Total Requests</div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-value">{successRate.toFixed(1)}%</div>
                <div className="stat-label">Success Rate</div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">💳</div>
                <div className="stat-value">
                  {normalizedUsageStats.totalCreditsUsed.toFixed(1)}
                </div>
                <div className="stat-label">Credits Used</div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">⚡</div>
                <div className="stat-value">
                  {normalizedUsageStats.avgProcessingTime.toFixed(0)}ms
                </div>
                <div className="stat-label">Avg Response Time</div>
              </div>
            </div>

            {normalizedUsageStats.featureBreakdown.length > 0 && (
              <div className="feature-breakdown">
                <h3>Feature Usage</h3>
                <div className="breakdown-list">
                  {normalizedUsageStats.featureBreakdown.map((feature) => (
                    <div key={feature.feature} className="breakdown-item">
                      <div className="breakdown-name">{feature.label}</div>
                      <div className="breakdown-stats">
                        <span className="count">
                          {feature.count.toLocaleString()} requests
                        </span>
                        <span className="credits">
                          {feature.creditsUsed.toFixed(2)} credits
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="query-section">
          <AIQueryBox />
        </div>

        <div className="features-section">
          <h2>Available AI Features</h2>
          <div className="features-grid">
            {FEATURE_CARDS.map((feature) => {
              const featureCost = Number(feature.cost ?? 0)
              const canAfford = availableBalance >= featureCost
              return (
                <div
                  key={feature.title}
                  className={`feature-card ${!canAfford ? 'disabled' : ''}`.trim()}
                  onClick={() => handleFeatureClick(feature)}
                  style={{ '--feature-color': feature.color } as React.CSSProperties}
                >
                  <div className="feature-icon">{feature.icon}</div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <div className="feature-footer">
                    <span className="feature-cost">
                      {featureCost} {featureCost === 1 ? 'credit' : 'credits'}
                    </span>
                    {!canAfford && <span className="insufficient-badge">Insufficient Credits</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="benefits-section">
          <h2>Why Use AI Features?</h2>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">⏱️</div>
              <h4>Save Time</h4>
              <p>Automate repetitive tasks and get instant insights</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">💡</div>
              <h4>Better Decisions</h4>
              <p>Data-driven insights help you make smarter business choices</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">💰</div>
              <h4>Increase Revenue</h4>
              <p>Improve collections and inventory management</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">📈</div>
              <h4>Scale Faster</h4>
              <p>AI helps you grow without adding overhead</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIFeaturesPage
