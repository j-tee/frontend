import { type ReactNode } from 'react'
import Button from 'react-bootstrap/Button'
import { Outlet, useNavigate } from 'react-router-dom'
import usePermissions from '../hooks/usePermissions.js'
import type { Capability } from '../utils/permissions.js'

interface RequirePermissionProps {
  capability: Capability
  fallback?: ReactNode
  children?: ReactNode
}

const PermissionDeniedFallback = () => {
  const navigate = useNavigate()

  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4 py-12">
      <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-secondary/10 text-brand-secondary">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 8v4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 16h.01" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Access restricted</h1>
        <p className="mt-3 text-sm text-slate-600">
          You don&apos;t have permission to view this workspace yet. Ask your administrator to update your role or switch to a different page.
        </p>
        <div className="mt-5 flex justify-center">
          <Button variant="primary" className="rounded-pill px-4" onClick={() => navigate('/app')}>
            Back to dashboard
          </Button>
        </div>
      </div>
    </main>
  )
}

const RequirePermission = ({ capability, fallback, children }: RequirePermissionProps) => {
  const { can } = usePermissions()

  if (!can(capability)) {
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

export default RequirePermission
