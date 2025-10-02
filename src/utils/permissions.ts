import { MEMBERSHIP_ROLES, type MembershipRole } from '../types/common.js'
import type { AccountType } from '../types/auth.js'

export const CAPABILITIES = {
  DASHBOARD_VIEW: 'dashboard.view',
  SALES_VIEW: 'sales.view',
  SALES_MANAGE: 'sales.manage',
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_MANAGE: 'inventory.manage',
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_MANAGE: 'customers.manage',
  EMPLOYEES_VIEW: 'employees.view',
  EMPLOYEES_MANAGE: 'employees.manage',
  REPORTS_VIEW: 'reports.view',
  BOOKKEEPING_VIEW: 'bookkeeping.view',
  BILLING_MANAGE: 'billing.manage',
  SETTINGS_MANAGE: 'settings.manage',
  LOCATIONS_MANAGE: 'locations.manage',
} as const

export type Capability = (typeof CAPABILITIES)[keyof typeof CAPABILITIES]

const ALL_CAPABILITIES = Object.values(CAPABILITIES)

const ROLE_CAPABILITIES: Record<MembershipRole, Capability[]> = {
  OWNER: [...ALL_CAPABILITIES],
  ADMIN: [...ALL_CAPABILITIES],
  MANAGER: [
    CAPABILITIES.DASHBOARD_VIEW,
    CAPABILITIES.SALES_VIEW,
    CAPABILITIES.SALES_MANAGE,
    CAPABILITIES.CUSTOMERS_VIEW,
    CAPABILITIES.CUSTOMERS_MANAGE,
    CAPABILITIES.INVENTORY_VIEW,
    CAPABILITIES.INVENTORY_MANAGE,
    CAPABILITIES.REPORTS_VIEW,
    CAPABILITIES.BOOKKEEPING_VIEW,
  ],
  STAFF: [
    CAPABILITIES.DASHBOARD_VIEW,
    CAPABILITIES.SALES_VIEW,
    CAPABILITIES.SALES_MANAGE,
    CAPABILITIES.CUSTOMERS_VIEW,
  ],
}

const ROLE_CAPABILITY_SETS: Record<MembershipRole, ReadonlySet<Capability>> = {
  OWNER: new Set(ROLE_CAPABILITIES.OWNER),
  ADMIN: new Set(ROLE_CAPABILITIES.ADMIN),
  MANAGER: new Set(ROLE_CAPABILITIES.MANAGER),
  STAFF: new Set(ROLE_CAPABILITIES.STAFF),
}

export const normalizeMembershipRole = (
  role: string | null | undefined,
  accountType?: AccountType | null,
): MembershipRole => {
  const normalizedRole = typeof role === 'string' ? role.trim().toUpperCase() : ''
  if (normalizedRole && (MEMBERSHIP_ROLES as readonly string[]).includes(normalizedRole)) {
    return normalizedRole as MembershipRole
  }

  const normalizedAccountType = typeof accountType === 'string' ? accountType.trim().toUpperCase() : ''
  if (normalizedAccountType === 'OWNER') {
    return 'OWNER'
  }

  return 'STAFF'
}

export const getCapabilitiesForRole = (role: MembershipRole): Capability[] => [...ROLE_CAPABILITIES[role]]

export const getCapabilitySetForRole = (role: MembershipRole): ReadonlySet<Capability> =>
  ROLE_CAPABILITY_SETS[role]

export const hasCapability = (role: MembershipRole, capability: Capability): boolean =>
  ROLE_CAPABILITY_SETS[role]?.has(capability) ?? false
