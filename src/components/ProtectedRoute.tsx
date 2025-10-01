import { useEffect, useMemo } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../hooks/index.js'
import {
  fetchCurrentUser,
  selectAuthState,
  selectIsAuthenticated,
} from '../store/slices/authSlice.js'
import SubscriptionGateBanner from './SubscriptionGateBanner.js'

const ProtectedRoute = () => {
  const dispatch = useAppDispatch()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { token, user, status, error } = useAppSelector(selectAuthState)

  useEffect(() => {
    if (token && !user && status !== 'loading') {
      void dispatch(fetchCurrentUser())
    }
  }, [dispatch, token, user, status])

  const redirect = useMemo(() => {
    if (!token) {
      return '/login'
    }

    if (!user) {
      return null
    }

    if (!user.email_verified) {
      const params = new URLSearchParams({
        status: 'error',
        message: 'Email not verified. Please verify to continue.',
      })
      return `/verify-email?${params.toString()}`
    }

    if (!user.is_active) {
      const params = new URLSearchParams({
        verified: 'error',
        message: 'User account is disabled. Contact your administrator.',
      })
      return `/login?${params.toString()}`
    }

    return null
  }, [token, user])

  const loginRedirectTarget = useMemo(() => {
    if (!isAuthenticated || redirect === '/login') {
      if (status === 'failed' && error) {
        const params = new URLSearchParams({
          session: 'expired',
          message: error,
        })
        return `/login?${params.toString()}`
      }
      return '/login'
    }
    return null
  }, [error, isAuthenticated, redirect, status])

  if (loginRedirectTarget) {
    return <Navigate to={loginRedirectTarget} replace />
  }

  if (redirect && redirect !== '/login') {
    return <Navigate to={redirect} replace />
  }

  if (token && !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
        <div className="text-center text-slate-600">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-500" />
          <p>Loading your workspace…</p>
        </div>
      </main>
    )
  }

  return (
    <>
      <SubscriptionGateBanner />
      <Outlet />
    </>
  )
}

export default ProtectedRoute
