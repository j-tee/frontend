import type { MembershipRole, UUID } from './common'

export interface UserProfile {
  id: UUID
  name: string
  email: string
  account_type: AccountType
  email_verified: boolean
  platform_role?: string | null
  role: string | null
  role_name: string | null
  picture_url: string | null
  subscription_status: 'Active' | 'Inactive' | 'Suspended' | string | null
  is_active: boolean
  profile: UserDetail | null
  created_at: string
  updated_at: string
}

export interface UserDetail {
  id: UUID
  phone: string | null
  address: string | null
  date_of_birth: string | null
  emergency_contact: string | null
}

export interface RegisterBusinessPayload {
  owner_name: string
  owner_email: string
  owner_password: string
  name: string
  tin: string
  email: string
  address: string
  phone_numbers: string[]
  website?: string
  social_handles?: Record<string, string>
  generate_token?: boolean
}

export interface LoginPayload {
  email: string
  password: string
}

export type AccountType = 'OWNER' | 'EMPLOYEE'

export interface RegisterAccountPayload {
  name: string
  email: string
  password: string
  account_type: AccountType
}

export interface RegisterAccountResponse {
  message: string
  user_id: UUID
  account_type: AccountType
  detail?: string
}

export interface AuthResponse {
  token?: string
  user?: UserProfile
  business?: BusinessSummary
  employment?: EmploymentContext | null
}

export interface InvitationTokenInfo {
  email: string
  business_name: string
  role: string
  expires_at: string
}

export interface AcceptInvitationPayload {
  email: string
  name: string
  password: string
  phone?: string
}

export type AcceptedMembershipStorefront = UUID | { id: UUID; name?: string }

export interface AcceptedMembershipSummary {
  id: UUID
  business: UUID
  role: string
  status: string
  assigned_storefronts: AcceptedMembershipStorefront[]
}

export interface AcceptInvitationResponse {
  user: {
    id: UUID
    email: string
    name: string
  }
  membership: AcceptedMembershipSummary
  auth?: {
    token?: string
  }
}

export interface PasswordResetRequestPayload {
  email: string
}

export interface PasswordResetConfirmPayload {
  token: string
  new_password: string
}

export interface VerifyEmailPayload {
  token: string
}

export interface VerifyEmailResponse {
  message: string
  user_id: UUID
  account_type: AccountType
  detail?: string
}

export interface SimpleMessageResponse {
  message?: string
  detail?: string
  [key: string]: unknown
}

export interface BusinessSummary {
  id: UUID
  name: string
  tin: string
  email: string
  address: string
  website?: string | null
  phone_numbers: string[]
  social_handles?: Record<string, string>
  is_active: boolean
  owner: UUID
  owner_name: string
  created_at: string
  updated_at: string
}

export interface EmploymentContext {
  id: UUID
  role: MembershipRole
  is_admin: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  business: BusinessSummary
}
