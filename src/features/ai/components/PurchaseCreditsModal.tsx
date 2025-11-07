/**
 * Purchase Credits Modal Component
 * Modal for purchasing AI credits when insufficient
 */

import React from 'react'
import { toast } from 'react-toastify'
import useAppDispatch from '../../../hooks/useAppDispatch'
import useAppSelector from '../../../hooks/useAppSelector'
import {
  purchaseCredits,
  hidePurchaseModal,
  selectPurchaseModal,
  selectAICreditsLoading,
  showCheckoutModal,
} from '../../../store/slices/aiSlice'
import type { CreditPackageType } from '../../../types/ai'
import './PurchaseCreditsModal.css'

export const PurchaseCreditsModal: React.FC = () => {
  const dispatch = useAppDispatch()
  const modalState = useAppSelector(selectPurchaseModal)
  const loading = useAppSelector(selectAICreditsLoading)

  if (!modalState.isOpen) return null

  const { requiredCredits, currentBalance, shortage } = modalState
  const normalizedBalance =
    typeof currentBalance === 'number' ? currentBalance : currentBalance != null ? Number(currentBalance) || 0 : undefined
  const normalizedShortage =
    typeof shortage === 'number' ? shortage : shortage != null ? Number(shortage) || 0 : undefined
  const normalizedRequired =
    typeof requiredCredits === 'number'
      ? requiredCredits
      : requiredCredits != null
        ? Number(requiredCredits) || 0
        : undefined

  const handlePurchase = async (packageType: CreditPackageType) => {
    try {
      const response = await dispatch(
        purchaseCredits({
          package: packageType,
          payment_method: 'mobile_money',
        }),
      ).unwrap()

      dispatch(hidePurchaseModal())
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

  const handleClose = () => {
    if (!loading) {
      dispatch(hidePurchaseModal())
    }
  }

  return (
    <>
      <div className="modal-overlay" onClick={handleClose} />
      
      <div className="purchase-modal">
        <div className="modal-header">
          <h2>⚠️ Insufficient AI Credits</h2>
          <button
            className="close-btn"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {normalizedRequired !== undefined && normalizedBalance !== undefined && (
            <div className="credit-info">
              <div className="info-row">
                <span className="label">Required:</span>
                <span className="value required">{normalizedRequired} credits</span>
              </div>
              <div className="info-row">
                <span className="label">Current Balance:</span>
                <span className="value current">{normalizedBalance.toFixed(2)} credits</span>
              </div>
              {normalizedShortage !== undefined && (
                <div className="info-row shortage">
                  <span className="label">Shortage:</span>
                  <span className="value">{normalizedShortage.toFixed(2)} credits</span>
                </div>
              )}
            </div>
          )}

          <p className="modal-message">
            Purchase more AI credits to continue using AI-powered features.
          </p>

          <div className="package-options">
            <button
              onClick={() => handlePurchase('starter')}
              className="package-btn starter"
              disabled={loading}
            >
              <div className="package-header">
                <span className="package-name">Starter Pack</span>
              </div>
              <div className="package-details">
                <span className="credits">30 credits</span>
                <span className="price">GHS 30</span>
              </div>
            </button>

            <button
              onClick={() => handlePurchase('value')}
              className="package-btn value recommended"
              disabled={loading}
            >
              <span className="badge">Best Value</span>
              <div className="package-header">
                <span className="package-name">Value Pack</span>
              </div>
              <div className="package-details">
                <span className="credits">100 credits</span>
                <span className="price">GHS 80</span>
              </div>
              <span className="savings">+25% bonus!</span>
            </button>

            <button
              onClick={() => handlePurchase('premium')}
              className="package-btn premium"
              disabled={loading}
            >
              <div className="package-header">
                <span className="package-name">Premium Pack</span>
              </div>
              <div className="package-details">
                <span className="credits">250 credits</span>
                <span className="price">GHS 180</span>
              </div>
              <span className="savings">+39% bonus!</span>
            </button>
          </div>

          {loading && (
            <div className="processing-overlay">
              <div className="spinner"></div>
              <p>Processing payment...</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            onClick={handleClose}
            className="cancel-btn"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}

export default PurchaseCreditsModal
