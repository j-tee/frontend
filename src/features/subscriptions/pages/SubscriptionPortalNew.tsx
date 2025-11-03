/**
 * SubscriptionPortal - New Implementation
 * 
 * CRITICAL SECURITY FIX:
 * - Removes plan selection UI (security vulnerability)
 * - Price is automatically calculated based on ACTUAL storefront count
 * - Backend controls all pricing - frontend only displays
 * - Users cannot manipulate prices by selecting wrong plans
 * 
 * Flow:
 * 1. Load user's pricing (backend auto-calculates from storefronts)
 * 2. Display pricing breakdown (no selection, just info)
 * 3. User clicks "Subscribe" (no choices, no manipulation)
 * 4. Backend creates subscription with correct price
 * 5. Redirect to payment gateway
 */

import { useEffect, useState } from 'react'
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner } from 'react-bootstrap'
import { useAppSelector } from '../../../hooks'
import { selectCurrentBusiness } from '../../../store/slices/authSlice'
import { fetchMyPricing, createSubscription, initializePayment, checkSubscriptionStatus } from '../../../services/subscriptionService'
import type { MyPricingResponse, SubscriptionStatusResponse } from '../../../types/subscriptions'

export default function SubscriptionPortalNew() {
  const currentBusiness = useAppSelector(selectCurrentBusiness)
  const [pricing, setPricing] = useState<MyPricingResponse | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentGateway] = useState<'PAYSTACK' | 'STRIPE'>('PAYSTACK')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load pricing and status in parallel
      const [pricingData, statusData] = await Promise.all([
        fetchMyPricing(),
        checkSubscriptionStatus()
      ])
      
      setPricing(pricingData)
      setSubscriptionStatus(statusData)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load subscription data'
      setError(errorMessage)
      console.error('Failed to load subscription data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async () => {
    if (!currentBusiness) return
    
    try {
      setSubscribing(true)
      setError(null)

      // Step 1: Create subscription (empty body - backend calculates everything)
      const newSubscription = await createSubscription({
        // No plan_id - backend auto-calculates from storefront count
        // No business_id - backend infers from authenticated user
        is_trial: false  // Explicitly set to false for paid subscriptions
      })

      // Step 2: Initialize payment
      const frontendUrl = window.location.origin
      const paymentPayload = paymentGateway === 'PAYSTACK'
        ? {
            gateway: 'PAYSTACK' as const,
            callback_url: `${frontendUrl}/payment/callback`
          }
        : {
            gateway: 'STRIPE' as const,
            success_url: `${frontendUrl}/payment/success`,
            cancel_url: `${frontendUrl}/payment/cancelled`
          }

      const paymentResponse = await initializePayment(newSubscription.id, paymentPayload)

      // Step 3: Redirect to payment gateway
      const paymentUrl = 
        paymentResponse.authorization_url || 
        paymentResponse.checkout_url || 
        paymentResponse.data?.authorization_url || 
        paymentResponse.data?.checkout_url

      if (paymentUrl) {
        window.location.href = paymentUrl
      } else {
        throw new Error('Payment URL not received from gateway')
      }

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment'
      setError(`Error: ${errorMessage}. Please try again or contact support.`)
      console.error('Subscription error:', err)
    } finally {
      setSubscribing(false)
    }
  }

  if (!currentBusiness) {
    return (
      <Container fluid className="py-4">
        <Alert variant="warning">
          <h5>No Business Selected</h5>
          <p>Please select a business to manage subscriptions.</p>
        </Alert>
      </Container>
    )
  }

  if (loading) {
    return (
      <Container fluid className="py-4 text-center">
        <Spinner animation="border" />
        <p className="mt-3">Loading subscription information...</p>
      </Container>
    )
  }

  if (error && !pricing) {
    return (
      <Container fluid className="py-4">
        <Alert variant="danger">
          <h5>Error Loading Subscription Data</h5>
          <p>{error}</p>
          <Button variant="primary" onClick={loadData}>
            Try Again
          </Button>
        </Alert>
      </Container>
    )
  }

  const activeSubscription = subscriptionStatus?.subscription
  const hasActiveSubscription = subscriptionStatus?.has_subscription && 
    activeSubscription?.status === 'ACTIVE'

  const subscriptionStatusBadge = 
    activeSubscription?.status === 'ACTIVE' ? 'success' :
    activeSubscription?.status === 'TRIAL' ? 'info' :
    activeSubscription?.status === 'PAST_DUE' ? 'warning' :
    'secondary'

  const subscriptionAmount =
    activeSubscription?.currency && activeSubscription?.amount
      ? `${activeSubscription.currency} ${activeSubscription.amount}`
      : null

  const subscriptionStartDate = activeSubscription?.current_period_start
    ? new Date(activeSubscription.current_period_start).toLocaleDateString()
    : null

  const subscriptionEndDate = activeSubscription?.current_period_end
    ? new Date(activeSubscription.current_period_end).toLocaleDateString()
    : null

  return (
    <Container fluid className="py-4">
      {/* Error Display */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Current Subscription Status */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <h4>Subscription Management</h4>
              <div className="mb-3">
                <strong>Business:</strong> {currentBusiness.name}<br/>
                <strong>Status:</strong>{' '}
                <Badge bg={subscriptionStatusBadge}>
                  {activeSubscription?.status || 'INACTIVE'}
                </Badge>
              </div>

              {activeSubscription && (
                <div>
                  <h5>Current Subscription</h5>
                  <p>
                    <strong>Amount:</strong> {subscriptionAmount ?? 'Not available'}{subscriptionAmount ? ' / month' : ''}<br/>
                    <strong>Start Date:</strong> {subscriptionStartDate ?? 'Not available'}<br/>
                    <strong>End Date:</strong> {subscriptionEndDate ?? 'Not available'}
                    {activeSubscription.days_until_expiry !== undefined && (
                      <>
                        <br/>
                        <strong>Days Until Renewal:</strong> {activeSubscription.days_until_expiry}
                      </>
                    )}
                  </p>
                </div>
              )}

              {!activeSubscription && (
                <Alert variant="info">
                  <strong>No Active Subscription</strong>
                  <p className="mb-0">Subscribe below to access all features.</p>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Pricing Display - NO PLAN SELECTION */}
      {!hasActiveSubscription && pricing && (
        <>
          <Row className="mb-3">
            <Col>
              <h4>Your Subscription Pricing</h4>
              <p className="text-muted">
                Pricing is automatically calculated based on your active storefronts.
              </p>
            </Col>
          </Row>

          <Row className="mb-4">
            <Col lg={8} className="mx-auto">
              <Card className="shadow-lg">
                {/* Header */}
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0">POS Suite Subscription</h5>
                </Card.Header>

                <Card.Body className="p-4">
                  {/* Business & Storefront Info */}
                  <div className="mb-4 p-3 bg-light rounded">
                    <Row>
                      <Col md={6}>
                        <div className="mb-3 mb-md-0">
                          <p className="text-muted mb-1 small">Business Name</p>
                          <h6 className="mb-0">{pricing.business_name}</h6>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div>
                          <p className="text-muted mb-1 small">Active Storefronts</p>
                          <h6 className="mb-0">
                            <Badge bg="info" className="fs-6">
                              {pricing.storefront_count}
                            </Badge>
                          </h6>
                        </div>
                      </Col>
                    </Row>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="mb-4">
                    <h6 className="mb-3">Price Breakdown</h6>

                    {/* Base Price */}
                    <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                      <span>
                        Base Price ({pricing.storefront_count} storefront{pricing.storefront_count !== 1 ? 's' : ''})
                      </span>
                      <strong>{pricing.currency} {pricing.base_price}</strong>
                    </div>

                    {/* Taxes */}
                    {pricing.taxes.map((tax) => (
                      <div
                        key={tax.code}
                        className="d-flex justify-content-between align-items-center py-2 border-bottom small"
                      >
                        <span className="text-muted">
                          {tax.name} ({tax.rate}%)
                        </span>
                        <span>{pricing.currency} {tax.amount}</span>
                      </div>
                    ))}

                    {/* Total */}
                    <div className="d-flex justify-content-between align-items-center py-3 border-top border-2 mt-2">
                      <strong className="fs-5">Total Monthly</strong>
                      <strong className="fs-4 text-primary">
                        {pricing.currency} {pricing.total_amount}
                      </strong>
                    </div>
                  </div>

                  {/* Tier Description */}
                  <div className="mb-4 p-3 bg-light rounded">
                    <p className="mb-0 small text-muted">
                      <strong>Pricing Tier:</strong> {pricing.tier_description}
                    </p>
                  </div>

                  {/* Subscribe Button */}
                  <div className="d-grid">
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleSubscribe}
                      disabled={subscribing}
                    >
                      {subscribing ? (
                        <>
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-2"
                          />
                          Processing...
                        </>
                      ) : (
                        `Subscribe Now - ${pricing.currency} ${pricing.total_amount}/month`
                      )}
                    </Button>
                  </div>

                  {/* Info Note */}
                  <p className="text-muted text-center mt-3 mb-0 small">
                    Your subscription will automatically renew monthly. You can cancel anytime.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Information Cards */}
          <Row className="mb-4">
            <Col md={4} className="mb-3">
              <Card className="h-100 border-info">
                <Card.Body>
                  <h6 className="text-info">
                    <i className="bi bi-shield-check me-2"></i>
                    Secure Pricing
                  </h6>
                  <p className="mb-0 small">
                    Your subscription price is automatically calculated based on your actual storefront count. 
                    No hidden fees or surprises.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-3">
              <Card className="h-100 border-success">
                <Card.Body>
                  <h6 className="text-success">
                    <i className="bi bi-arrow-repeat me-2"></i>
                    Flexible Billing
                  </h6>
                  <p className="mb-0 small">
                    If you add or remove storefronts, your subscription price will automatically adjust 
                    on your next billing cycle.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-3">
              <Card className="h-100 border-warning">
                <Card.Body>
                  <h6 className="text-warning">
                    <i className="bi bi-credit-card me-2"></i>
                    Easy Payment
                  </h6>
                  <p className="mb-0 small">
                    Pay securely through Paystack with mobile money, cards, or bank transfer. 
                    Your payment information is always protected.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* Already Subscribed */}
      {hasActiveSubscription && (
        <Row>
          <Col lg={8} className="mx-auto">
            <Alert variant="success">
              <h5>
                <i className="bi bi-check-circle me-2"></i>
                You Have an Active Subscription
              </h5>
              <p className="mb-0">
                Your subscription is active and will automatically renew on{' '}
                {activeSubscription?.current_period_end && 
                  new Date(activeSubscription.current_period_end).toLocaleDateString()}
              </p>
            </Alert>
          </Col>
        </Row>
      )}
    </Container>
  )
}
