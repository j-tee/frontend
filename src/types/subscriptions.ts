import type { UUID } from './common'

export interface Plan {
  id: UUID
  name: string
  price: number
  billing_cycle: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | string
  features: Record<string, unknown>
}

export interface Subscription {
  id: UUID
  business: UUID
  plan: UUID
  status: string
  current_period_start: string
  current_period_end: string
  auto_renew: boolean
}

export interface SubscriptionPayment {
  id: UUID
  subscription: UUID
  amount: number
  status: string
  transaction_reference?: string
  created_at: string
}
