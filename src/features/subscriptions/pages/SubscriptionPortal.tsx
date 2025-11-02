import { useEffect, useState } from 'react'
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Modal, Form } from 'react-bootstrap'
import { useAppSelector } from '../../../hooks'
import { useCurrency } from '../../../hooks/useCurrency'
import { selectCurrentBusiness } from '../../../store/slices/authSlice'
import { createSubscription, initializePayment } from '../../../services/subscriptionService'
import httpClient from '../../../services/httpClient'
import type { Plan, Subscription, PaymentGateway } from '../../../types/subscriptions'

export default function SubscriptionPortal() {
  const currentBusiness = useAppSelector(selectCurrentBusiness)
  const { formatCurrency } = useCurrency()
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [paymentGateway, setPaymentGateway] = useState<PaymentGateway>('PAYSTACK')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load plans
      const plansRes = await httpClient.get('/subscriptions/api/plans/')
      console.log('Plans response:', plansRes.data)
      
      // Handle different response formats
      const plansData = Array.isArray(plansRes.data) 
        ? plansRes.data 
        : (plansRes.data?.results || plansRes.data?.data || [])
      
      setPlans(plansData)
      
      // Try to load subscription
      // IMPORTANT: /me/ endpoint returns an array!
      try {
        const subRes = await httpClient.get<Subscription[]>('/subscriptions/api/subscriptions/me/')
        console.log('Subscription response:', subRes.data)
        // Get the first subscription if any exist
        setSubscription(subRes.data.length > 0 ? subRes.data[0] : null)
      } catch {
        // No subscription yet - that's ok
        setSubscription(null)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan)
    setShowPaymentModal(true)
  }

  const handleSubscribe = async () => {
    if (!selectedPlan || !currentBusiness) return
    
    try {
      setProcessing(true)
      setError(null)
      
      // Step 1: Create subscription
      console.log('Creating subscription...', {
        plan_id: selectedPlan.id,
        business_id: currentBusiness.id,
        payment_method: paymentGateway
      })
      
      const newSubscription = await createSubscription({
        plan_id: selectedPlan.id,
        business_id: currentBusiness.id,
        payment_method: paymentGateway
      })
      
      console.log('Subscription created:', newSubscription)
      
      // Step 2: Initialize payment
      const frontendUrl = window.location.origin
      
      console.log('Initializing payment...', {
        subscriptionId: newSubscription.id,
        gateway: paymentGateway
      })
      
      const paymentInit = await initializePayment(newSubscription.id, {
        gateway: paymentGateway,
        callback_url: `${frontendUrl}/app/subscription/payment/callback`,
        success_url: `${frontendUrl}/app/subscription/payment/success`,
        cancel_url: `${frontendUrl}/app/subscription/payment/cancelled`
      })
      
      console.log('Payment initialized:', paymentInit)
      
      // Store subscription ID in session storage for callback
      sessionStorage.setItem('pending_subscription_id', newSubscription.id)
      
      // Step 3: Redirect to payment gateway
      if (paymentInit.authorization_url) {
        window.location.href = paymentInit.authorization_url
      } else {
        throw new Error('No authorization URL received from payment gateway')
      }
      
    } catch (err: unknown) {
      console.error('Subscription/Payment error:', err)
      const error = err as { 
        response?: { 
          status?: number
          data?: { error?: string; detail?: string } 
        }
        message?: string 
      }
      
      let errorMessage = ''
      
      // Check if it's a 404 (endpoint not found)
      if (error?.response?.status === 404) {
        errorMessage = '⚠️ Backend API Not Ready\n\n' +
                      'The subscription creation endpoint has not been implemented yet.\n\n' +
                      'Next Steps:\n' +
                      '1. Backend team needs to implement:\n' +
                      '   • POST /subscriptions/api/subscriptions/\n' +
                      '   • POST /subscriptions/api/subscriptions/{id}/initialize_payment/\n' +
                      '   • POST /subscriptions/api/subscriptions/{id}/verify_payment/\n\n' +
                      '2. See PAYMENT-INFRASTRUCTURE-IMPLEMENTATION.md for complete code\n\n' +
                      'For now, please contact support at:\n' +
                      'alphalogiquetechnologies@gmail.com'
      } else {
        errorMessage = error?.response?.data?.error || 
                      error?.response?.data?.detail || 
                      error?.message || 
                      'Failed to initialize subscription. Please try again.'
      }
      
      setError(errorMessage)
      alert(errorMessage)
    } finally {
      setProcessing(false)
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
                    <strong>Price:</strong> {formatCurrency(parseFloat(subscription.plan.price))} / {subscription.plan.billing_cycle}<br/>
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
                  {formatCurrency(parseFloat(plan.price))}
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
      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Subscribe to {selectedPlan?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            <strong>Plan:</strong> {selectedPlan?.name}<br/>
            <strong>Price:</strong> {selectedPlan && formatCurrency(parseFloat(selectedPlan.price))} / {selectedPlan?.billing_cycle}
          </p>
          
          <Form.Group className="mb-3">
            <Form.Label>Payment Method</Form.Label>
            <Form.Select 
              value={paymentGateway} 
              onChange={(e) => setPaymentGateway(e.target.value as PaymentGateway)}
            >
              <option value="PAYSTACK">Mobile Money / Card (Paystack)</option>
            </Form.Select>
          </Form.Group>

          {error && (
            <Alert variant="danger" className="mb-3" style={{ whiteSpace: 'pre-line' }}>
              {error}
            </Alert>
          )}

          <Alert variant="info">
            <strong>📋 Payment Flow:</strong>
            <ol className="mb-0 mt-2 ps-3">
              <li>Subscription will be created via backend API</li>
              <li>Payment initialized with Paystack</li>
              <li>You'll be redirected to Paystack checkout</li>
              <li>After payment, verification happens automatically</li>
            </ol>
          </Alert>
          
          <Alert variant="warning" className="mb-0">
            <small>
              <strong>Note:</strong> If you see a "Not found" error, the backend API endpoints 
              are not yet implemented. See <code>PAYMENT-INFRASTRUCTURE-IMPLEMENTATION.md</code> for 
              backend implementation code.
            </small>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPaymentModal(false)} disabled={processing}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubscribe} disabled={processing}>
            {processing ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Processing...
              </>
            ) : (
              'Proceed to Payment'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}
