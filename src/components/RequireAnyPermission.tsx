import { type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import usePermissions from '../hooks/usePermissions.js'
import type { Capability } from '../utils/permissions.js'
import { PermissionDeniedFallback } from './RequirePermission.js'

interface RequireAnyPermissionProps {
  capabilities: Capability[]
  fallback?: ReactNode
  children?: ReactNode
}

const RequireAnyPermission = ({ capabilities, fallback, children }: RequireAnyPermissionProps) => {
  const { can } = usePermissions()
  const hasAccess = capabilities.some((capability) => can(capability))

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }
    return <PermissionDeniedFallback />
  }

  if (children) {
    return <>{children}</>
  }

  return <Outlet />
}

export default RequireAnyPermission

