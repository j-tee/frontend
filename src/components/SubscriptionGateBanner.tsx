import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../hooks/index.js'
import {
  hideSubscriptionGate,
  selectIsSubscriptionGateVisible,
  selectSubscriptionGateMessage,
} from '../store/slices/subscriptionSlice.js'

const SubscriptionGateBanner = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const isVisible = useAppSelector(selectIsSubscriptionGateVisible)
  const message = useAppSelector(selectSubscriptionGateMessage)

  useEffect(() => {
    if (isVisible) {
      const timeoutId = window.setTimeout(() => {
        navigate('/app/billing')
      }, 2000)
      return () => window.clearTimeout(timeoutId)
    }
    return undefined
  }, [isVisible, navigate])

  if (!isVisible) {
    return null
  }

  return (
    <div
      className="fixed left-1/2 top-0 z-50 w-full max-w-xl -translate-x-1/2 rounded-b-3xl border border-red-200 bg-red-50/95 px-6 py-4 text-red-700 shadow-xl"
      role="alert"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <strong className="text-sm uppercase tracking-wide">Subscription required</strong>
          <p className="mb-0 text-sm">
            {message ?? 'Please renew your subscription to continue.'}
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-transparent px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-200 hover:bg-red-100"
          onClick={() => dispatch(hideSubscriptionGate())}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

export default SubscriptionGateBanner
