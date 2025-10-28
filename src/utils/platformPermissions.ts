import type { UserProfile } from '../types/auth'
import type { PlatformRole } from '../types/platform'

/**
 * Check if user has platform admin access
 */
export const isPlatformAdmin = (user: UserProfile | null): boolean => {
  if (!user) return false
  
  // Check if superuser or has platform role
  return (
    user.platform_role === 'SUPER_ADMIN' ||
    user.platform_role === 'ADMIN' ||
    user.platform_role === 'SUPPORT'
  )
}

/**
 * Check if user is super admin (full platform access)
 */
export const isSuperAdmin = (user: UserProfile | null): boolean => {
  if (!user) return false
  return user.platform_role === 'SUPER_ADMIN'
}

/**
 * Check if user can manage plans
 */
export const canManagePlans = (user: UserProfile | null): boolean => {
  if (!user) return false
  return user.platform_role === 'SUPER_ADMIN' || user.platform_role === 'ADMIN'
}

/**
 * Check if user can manage subscriptions
 */
export const canManageSubscriptions = (user: UserProfile | null): boolean => {
  if (!user) return false
  return (
    user.platform_role === 'SUPER_ADMIN' ||
    user.platform_role === 'ADMIN' ||
    user.platform_role === 'SUPPORT'
  )
}

/**
 * Check if user can view platform stats
 */
export const canViewPlatformStats = (user: UserProfile | null): boolean => {
  if (!user) return false
  return isPlatformAdmin(user)
}

/**
 * Get platform role display name
 */
export const getPlatformRoleDisplayName = (role: PlatformRole): string => {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Administrator'
    case 'ADMIN':
      return 'Administrator'
    case 'SUPPORT':
      return 'Support Staff'
    default:
      return 'User'
  }
}
