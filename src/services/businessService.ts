import httpClient from './httpClient.js'
import type { PaginatedResponse } from '../types/common.js'
import type { Business, BusinessMembership } from '../types/business.js'

export const fetchBusinesses = async () => {
  const { data } = await httpClient.get<PaginatedResponse<Business>>(
    '/accounts/api/businesses/',
  )
  return data
}

export const fetchBusinessMemberships = async () => {
  const { data } = await httpClient.get<PaginatedResponse<BusinessMembership>>(
    '/accounts/api/business-memberships/',
  )
  return data
}
