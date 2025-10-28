import { useCallback, useMemo } from 'react'
import useAppSelector from './useAppSelector.js'
import { selectAuthState } from '../store/slices/authSlice.js'
import { getCapabilitySetForRole, normalizeMembershipRole } from '../utils/permissions.js'
import type { Capability } from '../utils/permissions.js'
import type { MembershipRole } from '../types/common.js'

export interface PermissionChecker {
  role: MembershipRole
  can: (capability: Capability) => boolean
  capabilities: ReadonlySet<Capability>
  hasAll: (required: Capability[]) => boolean
  hasAny: (required: Capability[]) => boolean
}

const usePermissions = (): PermissionChecker => {
  const { user, employment } = useAppSelector(selectAuthState)
  const membershipRole = employment?.role ?? user?.role

  const role: MembershipRole = useMemo(
    () => normalizeMembershipRole(membershipRole, user?.account_type),
    [membershipRole, user?.account_type],
  )

  const capabilities = useMemo(() => getCapabilitySetForRole(role), [role])

  const can = useCallback((capability: Capability) => capabilities.has(capability), [capabilities])

  const hasAll = useCallback(
    (required: Capability[]) => required.every((capability) => capabilities.has(capability)),
    [capabilities],
  )

  const hasAny = useCallback(
    (required: Capability[]) => required.some((capability) => capabilities.has(capability)),
    [capabilities],
  )

  return useMemo(
    () => ({
      role,
      can,
      hasAll,
      hasAny,
      capabilities,
    }),
    [role, can, hasAll, hasAny, capabilities],
  )
}

export default usePermissions
