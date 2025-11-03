/**
 * Pricing Service
 * Handles API calls for pricing tier management (admin/platform functionality)
 */

import httpClient from './httpClient'
import type { PaginatedResponse } from '../types/common'
import type {
  PricingTier,
  CreatePricingTierPayload,
  UpdatePricingTierPayload
} from '../types/subscriptions'

// ========== Pricing Tiers ==========

/**
 * Fetch all pricing tiers
 * Used by platform admins to manage pricing configuration
 */
export const fetchPricingTiers = async (params?: { is_active?: boolean }) => {
  const { data } = await httpClient.get<PaginatedResponse<PricingTier>>(
    '/subscriptions/api/pricing-tiers/',
    { params }
  )
  return data
}

/**
 * Fetch a single pricing tier by ID
 */
export const fetchPricingTierById = async (tierId: string) => {
  const { data } = await httpClient.get<PricingTier>(
    `/subscriptions/api/pricing-tiers/${tierId}/`
  )
  return data
}

/**
 * Create a new pricing tier
 * Platform admin only
 */
export const createPricingTier = async (payload: CreatePricingTierPayload) => {
  const { data} = await httpClient.post<PricingTier>(
    '/subscriptions/api/pricing-tiers/',
    payload
  )
  return data
}

/**
 * Update an existing pricing tier
 * Platform admin only
 */
export const updatePricingTier = async (
  tierId: string,
  payload: UpdatePricingTierPayload
) => {
  const { data } = await httpClient.patch<PricingTier>(
    `/subscriptions/api/pricing-tiers/${tierId}/`,
    payload
  )
  return data
}

/**
 * Delete a pricing tier
 * Platform admin only
 */
export const deletePricingTier = async (tierId: string) => {
  await httpClient.delete(`/subscriptions/api/pricing-tiers/${tierId}/`)
}

/**
 * Activate a pricing tier
 * Platform admin only
 */
export const activatePricingTier = async (tierId: string) => {
  const { data } = await httpClient.post<PricingTier>(
    `/subscriptions/api/pricing-tiers/${tierId}/activate/`
  )
  return data
}

/**
 * Deactivate a pricing tier
 * Platform admin only
 */
export const deactivatePricingTier = async (tierId: string) => {
  const { data } = await httpClient.post<PricingTier>(
    `/subscriptions/api/pricing-tiers/${tierId}/deactivate/`
  )
  return data
}
