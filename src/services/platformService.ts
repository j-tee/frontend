import httpClient from './httpClient'
import type { PaginatedResponse } from '../types/common'
import type {
  PlatformStats,
  RevenueByPlan,
  PlatformSubscription,
  CreatePlanPayload,
  UpdatePlanPayload,
} from '../types/platform'
import type { Plan, SubscriptionPayment } from '../types/subscriptions'

// ========== Platform Stats ==========

export const fetchPlatformStats = async () => {
  const { data } = await httpClient.get<PlatformStats>(
    '/subscriptions/api/stats/overview/'
  )
  return data
}

export const fetchRevenueByPlan = async () => {
  const { data } = await httpClient.get<RevenueByPlan[]>(
    '/subscriptions/api/stats/revenue_by_plan/'
  )
  return data
}

// ========== Plan Management ==========

export const fetchAllPlans = async () => {
  const { data } = await httpClient.get<PaginatedResponse<Plan>>(
    '/subscriptions/api/plans/'
  )
  return data
}

export const fetchPlanById = async (planId: string) => {
  const { data } = await httpClient.get<Plan>(
    `/subscriptions/api/plans/${planId}/`
  )
  return data
}

export const createPlan = async (payload: CreatePlanPayload) => {
  const { data } = await httpClient.post<Plan>(
    '/subscriptions/api/plans/',
    payload
  )
  return data
}

export const updatePlan = async (planId: string, payload: UpdatePlanPayload) => {
  const { data } = await httpClient.patch<Plan>(
    `/subscriptions/api/plans/${planId}/`,
    payload
  )
  return data
}

export const deletePlan = async (planId: string) => {
  await httpClient.delete(`/subscriptions/api/plans/${planId}/`)
}

export const activatePlan = async (planId: string) => {
  const { data } = await httpClient.post<Plan>(
    `/subscriptions/api/plans/${planId}/activate/`
  )
  return data
}

export const deactivatePlan = async (planId: string) => {
  const { data } = await httpClient.post<Plan>(
    `/subscriptions/api/plans/${planId}/deactivate/`
  )
  return data
}

// ========== Subscription Management ==========

export const fetchAllSubscriptions = async (params?: {
  status?: string
  plan?: string
  search?: string
  page?: number
}) => {
  const { data } = await httpClient.get<PaginatedResponse<PlatformSubscription>>(
    '/subscriptions/api/subscriptions/',
    { params }
  )
  return data
}

export const fetchSubscriptionById = async (subscriptionId: string) => {
  const { data } = await httpClient.get<PlatformSubscription>(
    `/subscriptions/api/subscriptions/${subscriptionId}/`
  )
  return data
}

export const suspendSubscription = async (subscriptionId: string, reason?: string) => {
  const { data } = await httpClient.post<PlatformSubscription>(
    `/subscriptions/api/subscriptions/${subscriptionId}/suspend/`,
    { reason }
  )
  return data
}

export const activateSubscription = async (subscriptionId: string) => {
  const { data } = await httpClient.post<PlatformSubscription>(
    `/subscriptions/api/subscriptions/${subscriptionId}/activate/`
  )
  return data
}

export const fetchExpiringSoon = async (days: number = 7) => {
  const { data } = await httpClient.get<PaginatedResponse<PlatformSubscription>>(
    '/subscriptions/api/subscriptions/expiring/',
    { params: { days } }
  )
  return data
}

// ========== Payment Management ==========

export const fetchAllPayments = async (params?: {
  status?: string
  gateway?: string
  search?: string
  page?: number
}) => {
  const { data } = await httpClient.get<PaginatedResponse<SubscriptionPayment>>(
    '/subscriptions/api/payments/',
    { params }
  )
  return data
}

export const fetchPaymentStats = async () => {
  const { data } = await httpClient.get<{
    total_revenue: string
    monthly_revenue: string
    pending_payments: number
    failed_payments: number
  }>(
    '/subscriptions/api/payments/stats/'
  )
  return data
}
