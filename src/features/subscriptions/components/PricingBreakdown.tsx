/**
 * PricingBreakdown Component
 * Displays complete pricing calculation with taxes and service charges
 * 
 * IMPORTANT: This component NEVER calculates taxes - it only displays
 * what the backend provides via the /subscriptions/api/pricing/calculate/ endpoint
 */

import { useEffect, useState } from 'react'
import type { PricingBreakdown as PricingBreakdownType, PaymentGateway } from '../../../types/subscriptions'
import { calculatePricing } from '../../../services/subscriptionService'

interface PricingBreakdownProps {
  /**
   * Number of storefronts to calculate pricing for
   */
  storefronts: number
  /**
   * Payment gateway (optional) - affects service charges
   */
  gateway?: PaymentGateway
  /**
   * Custom class for styling
   */
  className?: string
  /**
   * If true, shows detailed breakdown of pricing tiers
   */
  showTierBreakdown?: boolean
}

export const PricingBreakdown = ({ 
  storefronts, 
  gateway = 'PAYSTACK',
  className = '',
  showTierBreakdown = true
}: PricingBreakdownProps) => {
  const [pricing, setPricing] = useState<PricingBreakdownType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPricing = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await calculatePricing({ storefronts, gateway })
      setPricing(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate pricing')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPricing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storefronts, gateway])

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-gray-200 rounded-lg p-6 space-y-3">
          <div className="h-6 bg-gray-300 rounded w-1/2"></div>
          <div className="h-4 bg-gray-300 rounded"></div>
          <div className="h-4 bg-gray-300 rounded"></div>
          <div className="h-4 bg-gray-300 rounded"></div>
          <div className="h-8 bg-gray-300 rounded mt-4"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <p className="text-red-800 font-medium">Error calculating pricing</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={loadPricing}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!pricing) {
    return null
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Subscription Payment Summary
      </h3>

      {/* Tier Breakdown (Optional) */}
      {showTierBreakdown && pricing.breakdown && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded text-sm">
          <p className="text-blue-800 font-medium mb-1">Pricing Tier</p>
          <p className="text-blue-600">{pricing.breakdown.tier_description}</p>
          {pricing.breakdown.additional_storefronts > 0 && (
            <p className="text-blue-600 text-xs mt-1">
              {pricing.breakdown.base_storefronts} base + {pricing.breakdown.additional_storefronts} additional
              @ {pricing.currency} {pricing.breakdown.price_per_additional} each
            </p>
          )}
        </div>
      )}

      <div className="space-y-2 border-b border-gray-200 pb-4">
        {/* Base Price */}
        <div className="flex justify-between items-center">
          <span className="text-gray-700">
            Base Price ({pricing.storefronts} storefront{pricing.storefronts !== 1 ? 's' : ''})
          </span>
          <span className="font-medium text-gray-900">
            {pricing.currency} {pricing.base_price}
          </span>
        </div>
      </div>

      {/* Taxes Section */}
      {pricing.taxes.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">Taxes:</p>
          {pricing.taxes.map((tax) => (
            <div key={tax.code} className="flex justify-between items-center pl-4">
              <span className="text-sm text-gray-600">
                {tax.name} ({tax.rate}%)
              </span>
              <span className="text-sm text-gray-900">
                {pricing.currency} {tax.amount}
              </span>
            </div>
          ))}
          <div className="flex justify-between items-center pl-4 pt-2 border-t border-gray-100">
            <span className="text-sm font-medium text-gray-700">Total Tax</span>
            <span className="text-sm font-semibold text-gray-900">
              {pricing.currency} {pricing.total_tax}
            </span>
          </div>
        </div>
      )}

      {/* Service Charges Section */}
      {pricing.service_charges.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">Service Charges:</p>
          {pricing.service_charges.map((charge) => (
            <div key={charge.code} className="flex justify-between items-center pl-4">
              <span className="text-sm text-gray-600">
                {charge.name}
                {charge.type === 'PERCENTAGE' && charge.rate && ` (${charge.rate}%)`}
              </span>
              <span className="text-sm text-gray-900">
                {pricing.currency} {charge.amount}
              </span>
            </div>
          ))}
          <div className="flex justify-between items-center pl-4 pt-2 border-t border-gray-100">
            <span className="text-sm font-medium text-gray-700">Total Charges</span>
            <span className="text-sm font-semibold text-gray-900">
              {pricing.currency} {pricing.total_service_charges}
            </span>
          </div>
        </div>
      )}

      {/* Total Amount */}
      <div className="mt-6 pt-4 border-t-2 border-gray-300">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">TOTAL AMOUNT</span>
          <span className="text-2xl font-bold text-gray-900">
            {pricing.currency} {pricing.total_amount}
          </span>
        </div>
      </div>

      {/* Info Note */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
        <p>
          ℹ️ All prices include applicable taxes and service charges.
          Amount shown is what will be charged to your payment method.
        </p>
      </div>
    </div>
  )
}
