import type { MembershipRole, UUID } from './common'

export type EmployeeRole = Extract<MembershipRole, 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF'>

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'

export type MembershipStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING'

export type MembershipUserStatus = 'ACTIVE' | 'INACTIVE'

export interface BusinessInvitation {
  id: UUID
  business: UUID
  email: string
  role: EmployeeRole
  storefronts: UUID[]
  name?: string | null
  invited_by?: UUID | null
  invited_by_name?: string | null
  status: InvitationStatus
  token?: string | null
  expires_at: string
  invited_at?: string | null
  accepted_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface CreateInvitationPayload {
  email: string
  role: EmployeeRole
  storefronts?: UUID[]
  send_email?: boolean
  name?: string
}

export interface MembershipStorefront {
  id: UUID
  name: string
  status?: string
}

export interface MembershipUserSummary {
  id: UUID
  name: string
  email: string
  status: MembershipUserStatus
}

export interface Membership {
  id: UUID
  business: UUID
  user: MembershipUserSummary
  role: EmployeeRole
  status: MembershipStatus
  assigned_storefronts: MembershipStorefront[]
  created_at?: string | null
  updated_at?: string | null
}

export interface MembershipUpdatePayload {
  role?: EmployeeRole
  status?: MembershipStatus
}

export interface MembershipStorefrontUpdatePayload {
  storefronts: UUID[]
}

export interface BulkUploadSummary {
  created: number
  invited: number
  failed: Array<{ email: string; reason: string }>
}
