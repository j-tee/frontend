/**
 * AI Credits Widget Component
 * Displays credit balance and provides purchase options
 */

import React, { useEffect } from 'react'
import { toast } from 'react-toastify'
import useAppDispatch from '../../../hooks/useAppDispatch'
import useAppSelector from '../../../hooks/useAppSelector'
import {
  fetchCreditsBalance,
  purchaseCredits,
  selectAICredits,
  selectAICreditsLoading,
  showPurchaseModal,
  showCheckoutModal,
} from '../../../store/slices/aiSlice'
import type { CreditPackageType } from '../../../types/ai'
import './AICreditsWidget.css'

interface AICreditsWidgetProps {
  className?: string
  showPurchaseOptions?: boolean
}

export const AICreditsWidget: React.FC<AICreditsWidgetProps> = ({
  className = '',
  showPurchaseOptions = true,
}) => {
  const dispatch = useAppDispatch()
  const credits = useAppSelector(selectAICredits)
  const loading = useAppSelector(selectAICreditsLoading)

  useEffect(() => {
    dispatch(fetchCreditsBalance())
  }, [dispatch])

  const handlePurchase = async (packageType: CreditPackageType) => {
    try {
      // Get frontend base URL for callback
      const frontendUrl = window.location.origin
      
      const response = await dispatch(
        purchaseCredits({
          package: packageType,
          payment_method: 'mobile_money',
          callback_url: `${frontendUrl}/payment/callback`,
        }),
      ).unwrap()

      dispatch(
        showCheckoutModal({
          payment: response,
        }),
      )
    } catch (error) {
      console.error('Purchase failed:', error)
      toast.error('Failed to generate checkout invoice. Please try again.')
    }
  }

  const handleShowPurchaseModal = () => {
    dispatch(showPurchaseModal({}))
  }

  if (loading && !credits) {
    return (
      <div className={`ai-credits-widget loading ${className}`}>
        <div className="spinner"></div>
        <span>Loading credits...</span>
      </div>
    )
  }

  const balanceValue = credits?.balance
  const balance = typeof balanceValue === 'number' ? balanceValue : Number(balanceValue) || 0
  const isLowBalance = balance < 10
  const rawDaysUntilExpiry = credits?.days_until_expiry
  const daysUntilExpiry = typeof rawDaysUntilExpiry === 'number'
    ? rawDaysUntilExpiry
    : rawDaysUntilExpiry != null
      ? Number(rawDaysUntilExpiry)
      : undefined

  return (
    <div className={`ai-credits-widget ${className}`}>
      <div className="balance-display">
        <div className="balance-header">
          <span className="icon">🤖</span>
          <h4>AI Credits</h4>
        </div>
        
        <div className={`balance-amount ${isLowBalance ? 'low' : ''}`}>
          {balance.toFixed(2)}
        </div>
        
        {typeof daysUntilExpiry === 'number' && daysUntilExpiry < 30 && (
          <small className="expiry-warning">
            Expires in {daysUntilExpiry} days
          </small>
        )}
      </div>

      {isLowBalance && (
        <div className="low-balance-warning">
          <span className="warning-icon">⚠️</span>
          <span>Low balance! Purchase more credits to continue using AI features.</span>
        </div>
      )}

      {showPurchaseOptions && (
        <div className="purchase-options">
          <h5>Buy More Credits</h5>
          
          <button
            onClick={() => handlePurchase('starter')}
            className="purchase-btn starter"
          >
            <div className="package-name">Starter Pack</div>
            <div className="package-credits">30 credits</div>
            <div className="package-price">GHS 30</div>
          </button>

          <button
            onClick={() => handlePurchase('value')}
            className="purchase-btn value recommended"
          >
            <div className="package-badge">Best Value</div>
            <div className="package-name">Value Pack</div>
            <div className="package-credits">100 credits</div>
            <div className="package-price">GHS 80</div>
            <div className="package-savings">+25% bonus!</div>
          </button>

          <button
            onClick={() => handlePurchase('premium')}
            className="purchase-btn premium"
          >
            <div className="package-name">Premium Pack</div>
            <div className="package-credits">250 credits</div>
            <div className="package-price">GHS 180</div>
            <div className="package-savings">+39% bonus!</div>
          </button>
        </div>
      )}

      {!showPurchaseOptions && isLowBalance && (
        <button
          onClick={handleShowPurchaseModal}
          className="purchase-link-btn"
        >
          Buy More Credits
        </button>
      )}
    </div>
  )
}

export default AICreditsWidget
