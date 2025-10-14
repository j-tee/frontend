import { useEffect, useState } from 'react'
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Modal, Form } from 'react-bootstrap'
import { useAppSelector } from '../../../hooks'
import { selectCurrentBusiness } from '../../../store/slices/authSlice'
import httpClient from '../../../services/httpClient'
import type { Plan, Subscription } from '../../../types/subscriptions'

export default function SubscriptionPortal() {
  const currentBusiness = useAppSelector(selectCurrentBusiness)
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [paymentGateway, setPaymentGateway] = useState<'PAYSTACK' | 'STRIPE'>('PAYSTACK')
  const [processing, setProcessing] = useState(false)

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
      
      // Initialize payment - will be implemented when backend endpoint is ready
      // const frontendUrl = window.location.origin
      // Payload for when subscription creation is available
      // const payload = paymentGateway === 'PAYSTACK'
      //   ? {
      //       gateway: 'PAYSTACK',
      //       callback_url: `${frontendUrl}/payment/callback`
      //     }
      //   : {
      //       gateway: 'STRIPE',
      //       success_url: `${frontendUrl}/payment/success`,
      //       cancel_url: `${frontendUrl}/payment/cancelled`
      //     }
      
      // For now, we'll need a subscription ID. Since we can't create one via API yet,
      // we'll show instructions to contact support
      alert('To subscribe to this plan, please contact support at alphalogiquetechnologies@gmail.com with your business details.')
      
    } catch (error) {
      console.error('Payment initialization failed:', error)
      alert('Failed to initialize payment. Please try again.')
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
      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Subscribe to {selectedPlan?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            <strong>Plan:</strong> {selectedPlan?.name}<br/>
            <strong>Price:</strong> {selectedPlan?.currency} {selectedPlan?.price} / {selectedPlan?.billing_cycle}
          </p>
          
          <Form.Group className="mb-3">
            <Form.Label>Payment Method</Form.Label>
            <Form.Select 
              value={paymentGateway} 
              onChange={(e) => setPaymentGateway(e.target.value as 'PAYSTACK' | 'STRIPE')}
            >
              <option value="PAYSTACK">Mobile Money / Card (Paystack)</option>
              <option value="STRIPE">Credit/Debit Card (Stripe)</option>
            </Form.Select>
          </Form.Group>

          <Alert variant="info">
            <strong>Note:</strong> Backend API endpoint for creating subscriptions is being implemented. 
            For now, please contact support to activate your subscription.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubscribe} disabled={processing}>
            {processing ? 'Processing...' : 'Contact Support'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}
