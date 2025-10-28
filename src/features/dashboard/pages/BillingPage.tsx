import { useEffect } from 'react'
import Button from 'react-bootstrap/Button'
import { useAppDispatch, useAppSelector } from '../../../hooks/index.js'
import {
  loadActiveSubscription,
  selectActiveSubscription,
  selectSubscriptionState,
} from '../../../store/slices/subscriptionSlice.js'

const BillingPage = () => {
  const dispatch = useAppDispatch()
  const subscription = useAppSelector(selectActiveSubscription)
  const { status } = useAppSelector(selectSubscriptionState)

  useEffect(() => {
    void dispatch(loadActiveSubscription())
  }, [dispatch])

  return (
    <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Billing</h2>
        <p className="text-slate-600">Manage your SaaS subscription and invoice history.</p>
      </div>
      <div className="space-y-3 rounded-3xl border border-brand-primary/30 bg-brand-primary/10 p-5">
        <p className="text-sm font-semibold text-brand-secondary">
          Status: {status === 'loading' ? 'Checking…' : subscription?.status ?? 'Inactive'}
        </p>
        <p className="text-sm text-slate-700">Current plan: {typeof subscription?.plan === 'string' ? subscription.plan : subscription?.plan?.name ?? 'Select a plan'}</p>
        <Button variant="primary" className="rounded-pill px-4">
          View plans
        </Button>
      </div>
    </div>
  )
}

export default BillingPage
