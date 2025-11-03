import { useEffect, useState } from 'react'
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Modal, Form } from 'react-bootstrap'
import { useAppSelector } from '../../../hooks'
import { selectCurrentBusiness } from '../../../store/slices/authSlice'
import httpClient from '../../../services/httpClient'
import type { Plan, Subscription } from '../../../types/subscriptions'
import { PricingBreakdown } from '../components/PricingBreakdown'
import { createSubscription, initializePayment } from '../../../services/subscriptionService'

export default function SubscriptionPortal() {
  const currentBusiness = useAppSelector(selectCurrentBusiness)
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [paymentGateway, setPaymentGateway] = useState<'PAYSTACK' | 'STRIPE'>('PAYSTACK')
  const [processing, setProcessing] = useState(false)
  const [selectedStorefronts, setSelectedStorefronts] = useState(1)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load plans
      const plansRes = await httpClient.get('/subscriptions/api/plans/')
      
      // Handle different response formats
      const plansData = Array.isArray(plansRes.data) 
        ? plansRes.data 
        : (plansRes.data?.results || plansRes.data?.data || [])
      
      setPlans(plansData)
      
      // Try to load subscription
      // IMPORTANT: /me/ endpoint returns an array!
      try {
        const subRes = await httpClient.get<Subscription[]>('/subscriptions/api/subscriptions/me/')
        // Get the first subscription if any exist
        setSubscription(subRes.data.length > 0 ? subRes.data[0] : null)
      } catch {
        // No subscription yet - that's ok
        setSubscription(null)
      }
    } catch {
      // Failed to load data
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan)
    // Set initial storefronts to the plan's minimum or 1
    setSelectedStorefronts(plan.max_storefronts || 1)
    setShowPaymentModal(true)
  }

  const handleSubscribe = async () => {
    if (!selectedPlan || !currentBusiness) return
    
    try {
      setProcessing(true)
      
      // Step 1: Create the subscription
      const newSubscription = await createSubscription({
        plan_id: selectedPlan.id,
        business_id: currentBusiness.id,
        payment_method: paymentGateway === 'PAYSTACK' ? 'PAYSTACK' : 'STRIPE',
        is_trial: false  // Explicitly set to false - this is a paid subscription
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
      const paymentUrl = paymentResponse.authorization_url 
        || paymentResponse.checkout_url 
        || paymentResponse.data?.authorization_url 
        || paymentResponse.data?.checkout_url
      
      if (paymentUrl) {
        // Redirect user to payment gateway
        window.location.href = paymentUrl
      } else {
        throw new Error('Payment URL not received from gateway')
      }
      
    } catch (error) {
      console.error('Subscription error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize payment'
      alert(`Error: ${errorMessage}. Please try again or contact support.`)
    } finally {
      setProcessing(false)
      setShowPaymentModal(false)
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
        <p className="mt-3">Loading subscription plans...</p>
      </Container>
    )
  }

  const subscriptionStatus = currentBusiness.subscription_status || subscription?.status || 'INACTIVE'
  const badgeVariant = 
    subscriptionStatus === 'ACTIVE' ? 'success' :
    subscriptionStatus === 'TRIAL' ? 'info' :
    subscriptionStatus === 'PAST_DUE' ? 'warning' :
    'secondary'

  return (
    <Container fluid className="py-4">
      {/* Current Subscription Status */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <h4>Subscription Management</h4>
              <div className="mb-3">
                <strong>Business:</strong> {currentBusiness.name}<br/>
                <strong>Status:</strong>{' '}
                <Badge bg={badgeVariant}>{subscriptionStatus}</Badge>
              </div>
              
              {subscription && (
                <div>
                  <h5>Current Plan: {subscription.plan.name}</h5>
                  <p>
                    <strong>Price:</strong> {subscription.plan.currency} {subscription.plan.price} / {subscription.plan.billing_cycle}<br/>
                    <strong>Storefronts:</strong> {subscription.plan.max_storefronts || 'Unlimited'}<br/>
                    <strong>Users:</strong> {subscription.plan.max_users || 'Unlimited'}<br/>
                    <strong>Products:</strong> {subscription.plan.max_products || 'Unlimited'}
                  </p>
                  <p className="text-muted">
                    Period: {new Date(subscription.current_period_start).toLocaleDateString()} - {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                </div>
              )}
              
              {!subscription && subscriptionStatus === 'INACTIVE' && (
                <Alert variant="warning">
                  <strong>No Active Subscription</strong>
                  <p className="mb-0">Select a plan below to get started.</p>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Available Plans */}
      <Row className="mb-4">
        <Col>
          <h4 className="mb-3">Available Plans</h4>
        </Col>
      </Row>

      <Row>
        {plans.map(plan => (
          <Col key={plan.id} md={6} lg={4} className="mb-4">
            <Card className={plan.is_popular ? 'border-primary' : ''}>
              {plan.is_popular && (
                <Card.Header className="bg-primary text-white text-center">
                  <strong>MOST POPULAR</strong>
                </Card.Header>
              )}
              <Card.Body>
                <h5>{plan.name}</h5>
                <p className="text-muted">{plan.description}</p>
                
                <h3 className="mb-3">
                  {plan.currency} {plan.price}
                  <small className="text-muted"> / {plan.billing_cycle}</small>
                </h3>
                
                <ul className="list-unstyled">
                  <li>✓ {plan.max_storefronts || 'Unlimited'} {plan.max_storefronts === 1 ? 'Storefront' : 'Storefronts'}</li>
                  <li>✓ {plan.max_users || 'Unlimited'} {plan.max_users === 1 ? 'User' : 'Users'}</li>
                  <li>✓ {plan.max_products ? `${plan.max_products} Products` : 'Unlimited Products'}</li>
                  {typeof plan.features === 'object' && !Array.isArray(plan.features) && plan.features.multi_storefront && <li>✓ Multi-Storefront Management</li>}
                  {typeof plan.features === 'object' && !Array.isArray(plan.features) && plan.features.advanced_reports && <li>✓ Advanced Reports</li>}
                  {typeof plan.features === 'object' && !Array.isArray(plan.features) && plan.features.api_access && <li>✓ API Access</li>}
                  {typeof plan.features === 'object' && !Array.isArray(plan.features) && plan.features.priority_support && <li>✓ Priority Support</li>}
                  {Array.isArray(plan.features) && plan.features.map((feature, idx) => (
                    <li key={idx}>✓ {feature}</li>
                  ))}
                </ul>
                
                <Button 
                  variant={subscription?.plan_id === plan.id ? 'secondary' : 'primary'}
                  className="w-100"
                  onClick={() => handleSelectPlan(plan)}
                  disabled={subscription?.plan_id === plan.id}
                >
                  {subscription?.plan_id === plan.id ? 'Current Plan' : 'Select Plan'}
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Payment Modal */}
      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Subscribe to {selectedPlan?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Plan Details */}
          <div className="mb-4">
            <h6 className="text-muted mb-3">Plan Details</h6>
            <p className="mb-2">
              <strong>Plan:</strong> {selectedPlan?.name}
            </p>
            <p className="text-muted mb-0">{selectedPlan?.description}</p>
          </div>

          {/* Storefront Selection */}
          <Form.Group className="mb-4">
            <Form.Label>
              <strong>Number of Storefronts</strong>
            </Form.Label>
            <Form.Control
              type="number"
              min="1"
              max={selectedPlan?.max_storefronts || 100}
              value={selectedStorefronts}
              onChange={(e) => setSelectedStorefronts(Math.max(1, parseInt(e.target.value) || 1))}
            />
            <Form.Text className="text-muted">
              {selectedPlan?.max_storefronts 
                ? `Choose between 1 and ${selectedPlan.max_storefronts} storefronts`
                : 'Choose number of storefronts for your subscription'
              }
            </Form.Text>
          </Form.Group>

          {/* Pricing Breakdown - Shows complete cost with taxes */}
          <div className="mb-4">
            <PricingBreakdown
              storefronts={selectedStorefronts}
              gateway={paymentGateway}
              showTierBreakdown={true}
            />
          </div>

          {/* Payment Method Selection */}
          <Form.Group className="mb-3">
            <Form.Label>
              <strong>Payment Method</strong>
            </Form.Label>
            <Form.Select 
              value={paymentGateway} 
              onChange={(e) => setPaymentGateway(e.target.value as 'PAYSTACK' | 'STRIPE')}
            >
              <option value="PAYSTACK">Mobile Money / Card (Paystack)</option>
              <option value="STRIPE">Credit/Debit Card (Stripe)</option>
            </Form.Select>
          </Form.Group>

          <Alert variant="info" className="mb-0">
            <strong>Note:</strong> You will be redirected to a secure payment page to complete your subscription.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubscribe} disabled={processing}>
            {processing ? 'Processing...' : 'Proceed to Payment'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}
