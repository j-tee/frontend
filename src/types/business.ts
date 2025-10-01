import type { MembershipRole, UUID } from './common'

export interface Business {
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
  memberships?: BusinessMembership[]
}

export interface BusinessMembership {
  id: UUID
  business: UUID
  business_name: string
  user: UUID
  user_name: string
  role: MembershipRole
  is_admin: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}
