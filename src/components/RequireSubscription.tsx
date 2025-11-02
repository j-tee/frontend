import React from 'react'
import { Alert, Button, Container } from 'react-bootstrap'
import { useAppSelector } from '../hooks'
import { selectCurrentBusiness } from '../store/slices/authSlice'
import { selectActiveSubscription } from '../store/slices/subscriptionSlice'

interface Props {
  children: React.ReactNode
  showWarning?: boolean  // Show warning banner instead of blocking
  feature?: string        // Feature name for user messaging
}

/**
 * RequireSubscription Component
 * 
 * Protects routes/features that require an active subscription.
 * Can be configured to either:
 * 1. Block access completely (redirect to subscription page)
 * 2. Show warning banner but allow access
 * 
 * Valid subscription statuses: ACTIVE, TRIAL
 * 
 * @example
 * // Block access completely
 * <RequireSubscription feature="sales operations">
 *   <SalesPage />
 * </RequireSubscription>
 * 
 * @example
 * // Show warning but allow access
 * <RequireSubscription showWarning feature="dashboard features">
 *   <DashboardPage />
 * </RequireSubscription>
 */
const RequireSubscription: React.FC<Props> = ({ 
  children, 
  showWarning = false,
  feature = 'this feature'
}) => {
  const business = useAppSelector(selectCurrentBusiness)
  const subscription = useAppSelector(selectActiveSubscription)

  // Check environment variable for bypass (development/testing only)
  const bypassCheck = import.meta.env.VITE_BYPASS_SUBSCRIPTION_CHECK === 'true'

  if (bypassCheck) {
    return <>{children}</>
  }

  // Get subscription status from business (primary) or subscription object (fallback)
  const subscriptionStatus = business?.subscription_status || subscription?.status

  // Valid subscription statuses
  const validStatuses = ['ACTIVE', 'TRIAL']
  const isValid = subscriptionStatus && validStatuses.includes(subscriptionStatus.toUpperCase())

  // Get user-friendly status message
  const getStatusMessage = () => {
    if (!subscriptionStatus || subscriptionStatus === 'INACTIVE') {
      return 'You do not have an active subscription.'
    }
    
    const status = subscriptionStatus.toUpperCase()
    
    switch (status) {
      case 'PAST_DUE':
        return 'Your payment is overdue.'
      case 'EXPIRED':
        return 'Your subscription has expired.'
      case 'CANCELLED':
        return 'Your subscription was cancelled.'
      case 'SUSPENDED':
        return 'Your subscription is suspended.'
      default:
        return 'Your subscription is not active.'
    }
  }

  // Warning mode: Show banner but allow access
  if (showWarning && !isValid) {
    return (
      <Container fluid className="p-0">
        <Alert variant="danger" className="mb-0 rounded-0 border-0 border-bottom">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="flex-grow-1">
              <div className="d-flex align-items-center gap-2">
                <strong>⚠️ Subscription Required</strong>
                <span className="badge bg-danger-subtle text-danger">
                  {subscriptionStatus || 'Inactive'}
                </span>
              </div>
              <p className="mb-0 mt-1 small text-muted">
                Your subscription has expired. Please renew to continue using {feature}.
              </p>
            </div>
            <Button 
              variant="danger" 
              size="sm"
              onClick={() => window.location.href = '/app/subscription'}
            >
              Renew Now
            </Button>
          </div>
        </Alert>
        {children}
      </Container>
    )
  }

  // Block mode: Show access denied message
  if (!isValid) {
    return (
      <Container fluid className="py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <Alert variant="warning" className="shadow-sm">
              <div className="text-center">
                <div className="display-1 mb-3">🔒</div>
                <h4 className="mb-3">Subscription Required</h4>
                <p className="mb-3">
                  Access to <strong>{feature}</strong> requires an active subscription.
                </p>
                <p className="mb-4 text-muted">
                  {getStatusMessage()}
                </p>
                <div className="d-flex gap-2 justify-content-center flex-wrap">
                  <Button 
                    variant="primary"
                    href="/app/subscription"
                    className="px-4"
                  >
                    View Subscription Options
                  </Button>
                  <Button 
                    variant="outline-secondary"
                    href="/app"
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            </Alert>
            
            {/* Subscription Benefits */}
            <div className="mt-4 p-4 bg-light rounded">
              <h6 className="mb-3">💡 What you get with an active subscription:</h6>
              <ul className="mb-0 small">
                <li>Unlimited sales transactions</li>
                <li>Complete reporting and analytics</li>
                <li>Customer management tools</li>
                <li>Inventory tracking across locations</li>
                <li>Employee management</li>
                <li>Financial bookkeeping</li>
                <li>24/7 customer support</li>
              </ul>
            </div>
          </div>
        </div>
      </Container>
    )
  }

  return <>{children}</>
}

export default RequireSubscription
