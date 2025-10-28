import type { UUID } from './common'
import type { Subscription } from './subscriptions'

export type PlatformRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | null

export interface PlatformUser {
  id: UUID
  name: string
  email: string
  platform_role: PlatformRole
  is_superuser: boolean
  is_staff: boolean
  is_active: boolean
  created_at: string
}

export interface PlatformStats {
  total_businesses: number
  active_businesses: number
  total_subscriptions: number
  active_subscriptions: number
  trial_subscriptions: number
  expired_subscriptions: number
  total_revenue: string
  monthly_recurring_revenue: string
  total_users: number
  active_users: number
}

export interface RevenueByPlan {
  plan: string
  plan_name: string
  subscription_count: number
  revenue: string
  percentage: number
}

export interface PlatformSubscription extends Subscription {
  business_email?: string
  business_owner?: string
  plan_details?: {
    name: string
    price: string
    interval: string
    billing_cycle: string
  }
}

export interface CreatePlanPayload {
  name: string
  description: string
  price: string
  currency: string
  billing_cycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
  max_storefronts: number | null
  max_users: number | null
  max_products: number | null
  features: {
    multi_storefront?: boolean
    advanced_reports?: boolean
    api_access?: boolean
    priority_support?: boolean
    custom_branding?: boolean
    [key: string]: boolean | undefined
  }
  is_popular?: boolean
  is_active?: boolean
}

export interface UpdatePlanPayload extends Partial<CreatePlanPayload> {
  id: string
}

export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
