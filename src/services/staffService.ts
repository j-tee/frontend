import httpClient from './httpClient.js'
import type { PaginatedResponse } from '../types/common.js'
import type {
  BusinessInvitation,
  CreateInvitationPayload,
  Membership,
  MembershipStorefrontUpdatePayload,
  MembershipUpdatePayload,
} from '../types/employees.js'

interface InvitationQueryParams {
  status?: string
  page?: number
}

interface MembershipQueryParams {
  search?: string
  role?: string
  status?: string
  storefront?: string
  page?: number
}

export const fetchInvitations = async (businessId: string, params?: InvitationQueryParams) => {
  const { data } = await httpClient.get<PaginatedResponse<BusinessInvitation>>(
    `/inventory/api/businesses/${businessId}/invitations/`,
    { params },
  )
  return data
}

export const createInvitation = async (businessId: string, payload: CreateInvitationPayload) => {
  const { data } = await httpClient.post<BusinessInvitation>(
    `/inventory/api/businesses/${businessId}/invitations/`,
    payload,
  )
  return data
}

export const resendInvitation = async (invitationId: string) => {
  await httpClient.post(`/inventory/api/invitations/${invitationId}/resend/`)
}

export const revokeInvitation = async (invitationId: string) => {
  const { data } = await httpClient.post<BusinessInvitation>(
    `/inventory/api/invitations/${invitationId}/revoke/`,
  )
  return data
}

export const fetchMemberships = async (businessId: string, params?: MembershipQueryParams) => {
  const { data } = await httpClient.get<PaginatedResponse<Membership>>(
    `/inventory/api/businesses/${businessId}/memberships/`,
    { params },
  )
  return data
}

export const updateMembership = async (membershipId: string, payload: MembershipUpdatePayload) => {
  const { data } = await httpClient.patch<Membership>(
    `/inventory/api/memberships/${membershipId}/`,
    payload,
  )
  return data
}

export const updateMembershipStorefronts = async (
  membershipId: string,
  payload: MembershipStorefrontUpdatePayload,
) => {
  const { data } = await httpClient.put<Membership>(
    `/inventory/api/memberships/${membershipId}/storefronts/`,
    payload,
  )
  return data
}

export const deleteMembership = async (membershipId: string) => {
  await httpClient.delete(`/inventory/api/memberships/${membershipId}/`)
}