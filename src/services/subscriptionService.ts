import httpClient from './httpClient.js'
import type { PaginatedResponse } from '../types/common.js'
import type { Plan, Subscription, SubscriptionPayment } from '../types/subscriptions.js'

export const fetchPlans = async () => {
  const { data } = await httpClient.get<PaginatedResponse<Plan>>(
    '/subscriptions/api/plans/',
  )
  return data
}

export const fetchSubscriptions = async (params?: Record<string, unknown>) => {
  const { data } = await httpClient.get<PaginatedResponse<Subscription>>(
    '/subscriptions/api/subscriptions/',
    { params },
  )
  return data
}

export const fetchSubscriptionPayments = async (
  params?: Record<string, unknown>,
) => {
  const { data } = await httpClient.get<PaginatedResponse<SubscriptionPayment>>(
    '/subscriptions/api/payments/',
    { params },
  )
  return data
}
