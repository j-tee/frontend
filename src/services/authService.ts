import { isAxiosError } from 'axios'
import httpClient from './httpClient.js'
import type {
  AuthResponse,
  LoginPayload,
  PasswordResetConfirmPayload,
  PasswordResetRequestPayload,
  RegisterAccountPayload,
  RegisterAccountResponse,
  RegisterBusinessPayload,
  SimpleMessageResponse,
  UserProfile,
  VerifyEmailPayload,
  VerifyEmailResponse,
  InvitationTokenInfo,
  AcceptInvitationPayload,
  AcceptInvitationResponse,
} from '../types/auth.js'
import type { PaginatedResponse } from '../types/common.js'
import type { Business } from '../types/business.js'

export const registerAccount = async (payload: RegisterAccountPayload) => {
  const { data } = await httpClient.post<RegisterAccountResponse>('/accounts/api/auth/register/', payload)
  return data
}

export const registerBusiness = async (payload: RegisterBusinessPayload) => {
  const { data } = await httpClient.post<AuthResponse>(
    '/accounts/api/auth/register-business/',
    payload,
  )
  return data
}

export const login = async (payload: LoginPayload) => {
  const { data } = await httpClient.post<AuthResponse>(
    '/accounts/api/auth/login/',
    payload,
  )
  return data
}

export const logout = async () => {
  await httpClient.post('/accounts/api/auth/logout/')
}

export const changePassword = async (payload: {
  old_password: string
  new_password: string
}) => {
  await httpClient.post('/accounts/api/auth/change-password/', payload)
}

export const fetchCurrentUser = async () => {
  const { data } = await httpClient.get<UserProfile>('/accounts/api/users/me/')
  return data
}

export const verifyEmail = async (payload: VerifyEmailPayload) => {
  const { data } = await httpClient.post<VerifyEmailResponse>(
    '/accounts/api/auth/verify-email/',
    payload,
  )
  return data
}

export const fetchBusinessesWithToken = async (token: string) => {
  const { data } = await httpClient.get<PaginatedResponse<Business>>('/accounts/api/businesses/', {
    headers: {
      Authorization: `Token ${token}`,
    },
  })
  return data
}

export const requestPasswordReset = async (payload: PasswordResetRequestPayload) => {
  const { data } = await httpClient.post<SimpleMessageResponse>(
    '/accounts/api/auth/password-reset/request/',
    payload,
  )
  return data
}

export const confirmPasswordReset = async (payload: PasswordResetConfirmPayload) => {
  const { data } = await httpClient.post<SimpleMessageResponse>(
    '/accounts/api/auth/password-reset/confirm/',
    payload,
  )
  return data
}

const INVITATION_ENDPOINTS = Object.freeze([
  (token: string) => `/auth/invitations/${token}/`,
  (token: string) => `/accounts/api/auth/invitations/${token}/`,
])

const INVITATION_ACCEPT_ENDPOINTS = Object.freeze([
  (token: string) => `/auth/invitations/${token}/accept/`,
  (token: string) => `/accounts/api/auth/invitations/${token}/accept/`,
])

export const validateInvitationToken = async (token: string) => {
  let lastError: unknown
  for (const buildPath of INVITATION_ENDPOINTS) {
    try {
      const { data } = await httpClient.get<InvitationTokenInfo>(buildPath(token), {
        headers: { 'X-Skip-Auth': 'true' },
      })
      return data
    } catch (error) {
      lastError = error
      if (!isAxiosError(error) || error.response?.status !== 404) {
        throw error
      }
    }
  }
  throw lastError ?? new Error('Unable to validate invitation token.')
}

export const acceptInvitation = async (token: string, payload: AcceptInvitationPayload) => {
  let lastError: unknown
  for (const buildPath of INVITATION_ACCEPT_ENDPOINTS) {
    try {
      const { data } = await httpClient.post<AcceptInvitationResponse>(
        buildPath(token),
        payload,
        {
          headers: { 'X-Skip-Auth': 'true' },
        },
      )
      return data
    } catch (error) {
      lastError = error
      if (!isAxiosError(error) || error.response?.status !== 404) {
        throw error
      }
    }
  }
  throw lastError ?? new Error('Unable to accept invitation.')
}
