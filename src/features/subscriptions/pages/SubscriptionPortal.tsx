import { useEffect, useState } from 'react'
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Modal, Form } from 'react-bootstrap'
import { useAppSelector } from '../../../hooks'
import { selectCurrentBusiness } from '../../../store/slices/authSlice'
import type { MyPricingResponse, SubscriptionStatusResponse } from '../../../types/subscriptions'
import { 
  createSubscription, 
  initializePayment, 
  fetchMyPricing, 
  checkSubscriptionStatus 
} from '../../../services/subscriptionService'
import { formatCurrency } from '../../../utils/currency'
import { AVAILABLE_CURRENCIES } from '../../../types/settings'

export default function SubscriptionPortal() {
  const currentBusiness = useAppSelector(selectCurrentBusiness)
  
  // Helper to get Currency object from code
  const getCurrencyFromCode = (code: string) => {
    return AVAILABLE_CURRENCIES.find(c => c.code === code) || AVAILABLE_CURRENCIES[0]
  }
  
  // State
  const [pricing, setPricing] = useState<MyPricingResponse | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentGateway, setPaymentGateway] = useState<'PAYSTACK' | 'STRIPE'>('PAYSTACK')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Try to load auto-calculated pricing (new secure endpoint)
      try {
        const pricingData = await fetchMyPricing()
        setPricing(pricingData)
      } catch (pricingError) {
        console.warn('My-pricing endpoint not available yet:', pricingError)
        // Endpoint not implemented yet - this is expected during transition
        setPricing(null)
      }
      
      // Try to check subscription status (new endpoint)
      try {
        const statusData = await checkSubscriptionStatus()
        setSubscriptionStatus(statusData)
      } catch (statusError) {
        console.warn('Status endpoint not available yet:', statusError)
        // Endpoint not implemented yet - this is expected during transition
        setSubscriptionStatus(null)
      }
      
    } catch (error) {
      console.error('Failed to load subscription data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async () => {
    if (!currentBusiness) return
    
    try {
      setProcessing(true)
      
      // Step 1: Create subscription (backend auto-calculates price)
      // NO plan_id needed - backend determines tier from storefront count
      const newSubscription = await createSubscription({
        business_id: currentBusiness.id,
        payment_method: paymentGateway === 'PAYSTACK' ? 'PAYSTACK' : 'STRIPE',
        is_trial: false
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
        <p className="mt-3">Loading subscription details...</p>
      </Container>
    )
  }

  const hasSubscription = subscriptionStatus?.has_subscription || false
  const subscription = subscriptionStatus?.subscription
  
  const status = subscription?.status || 'INACTIVE'
  const badgeVariant = 
    status === 'ACTIVE' ? 'success' :
    status === 'TRIAL' ? 'info' :
    status === 'PAST_DUE' ? 'warning' :
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
                <Badge bg={badgeVariant}>{status}</Badge>
              </div>
              
              {hasSubscription && subscription && (
                <div>
                  <h5>Current Subscription</h5>
                  <p>
                    <strong>Plan:</strong> {subscription.plan_name}<br/>
                    <strong>Expires:</strong> {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                </div>
              )}
              
              {!hasSubscription && (
                <Alert variant="warning">
                  <strong>No Active Subscription</strong>
                  <p className="mb-0">Subscribe now to unlock all features and start selling!</p>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Pricing Tiers */}
      <Row className="mb-4">
        <Col>
          <h4 className="mb-3">Your Pricing</h4>
        </Col>
      </Row>

      {pricing && pricing.breakdown && (
        <Row>
          <Col lg={8}>
            <Card>
              <Card.Body>
                <div className="mb-4">
                  <h5 className="text-primary">{pricing.breakdown.tier_name}</h5>
                  <p className="text-muted mb-0">{pricing.breakdown.tier_description}</p>
                </div>

                {/* Storefront Count (Read-only - from backend) */}
                <Alert variant="info" className="mb-4">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-shop me-2" style={{ fontSize: '1.5rem' }}></i>
                    <div>
                      <strong>Your Storefronts:</strong> {pricing.storefronts}
                      <br/>
                      <small className="text-muted">
                        Based on your registered {pricing.storefronts === 1 ? 'location' : 'locations'}
                      </small>
                    </div>
                  </div>
                </Alert>

                {/* Pricing Breakdown */}
                <div className="mb-4">
                  <h6 className="mb-3">Price Breakdown</h6>
                  
                  {/* Base Price */}
                  <div className="d-flex justify-content-between mb-2">
                    <span>Base Price ({pricing.breakdown.base_storefronts} {pricing.breakdown.base_storefronts === 1 ? 'storefront' : 'storefronts'})</span>
                    <span className="fw-bold">{formatCurrency(pricing.base_price, getCurrencyFromCode(pricing.currency))}</span>
                  </div>

                  {/* Additional Storefronts */}
                  {pricing.breakdown.additional_storefronts > 0 && (
                    <div className="d-flex justify-content-between mb-2">
                      <span>
                        Additional Storefronts ({pricing.breakdown.additional_storefronts} × {formatCurrency(pricing.breakdown.price_per_additional, getCurrencyFromCode(pricing.currency))})
                      </span>
                      <span className="fw-bold">
                        {formatCurrency(
                          (parseFloat(pricing.breakdown.price_per_additional) * pricing.breakdown.additional_storefronts).toFixed(2),
                          getCurrencyFromCode(pricing.currency)
                        )}
                      </span>
                    </div>
                  )}

                  <hr />

                  {/* Subtotal */}
                  <div className="d-flex justify-content-between mb-2">
                    <span>Subtotal</span>
                    <span className="fw-bold">{formatCurrency(pricing.base_price, getCurrencyFromCode(pricing.currency))}</span>
                  </div>

                  {/* Taxes */}
                  {pricing.taxes.map((tax, idx) => (
                    <div key={idx} className="d-flex justify-content-between mb-2 text-muted">
                      <span>{tax.name} ({(tax.rate * 100).toFixed(2)}%)</span>
                      <span>{formatCurrency(tax.amount, getCurrencyFromCode(pricing.currency))}</span>
                    </div>
                  ))}

                  {/* Service Charges */}
                  {pricing.service_charges.map((charge, idx) => (
                    <div key={idx} className="d-flex justify-content-between mb-2 text-muted">
                      <span>{charge.name}</span>
                      <span>{formatCurrency(charge.amount, getCurrencyFromCode(pricing.currency))}</span>
                    </div>
                  ))}

                  <hr />

                  {/* Total */}
                  <div className="d-flex justify-content-between mb-0">
                    <h5 className="mb-0">Total Amount</h5>
                    <h5 className="mb-0 text-primary">{formatCurrency(pricing.total_amount, getCurrencyFromCode(pricing.currency))}</h5>
                  </div>
                  <small className="text-muted d-block text-end">Billed monthly</small>
                </div>

                {/* Subscribe Button */}
                <div className="d-grid gap-2">
                  <Button 
                    variant={hasSubscription ? 'secondary' : 'primary'}
                    size="lg"
                    onClick={() => setShowPaymentModal(true)}
                    disabled={hasSubscription}
                  >
                    {hasSubscription ? 'Already Subscribed' : 'Subscribe Now'}
                  </Button>
                </div>

                {!hasSubscription && (
                  <p className="text-center text-muted mt-3 mb-0">
                    <small>You will be redirected to a secure payment page</small>
                  </p>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Info Panel */}
          <Col lg={4}>
            <Card className="bg-light">
              <Card.Body>
                <h6 className="mb-3">What's Included</h6>
                <ul className="list-unstyled mb-0">
                  <li className="mb-2">✓ {pricing.storefronts} Active {pricing.storefronts === 1 ? 'Storefront' : 'Storefronts'}</li>
                  <li className="mb-2">✓ Unlimited Products</li>
                  <li className="mb-2">✓ Unlimited Users</li>
                  <li className="mb-2">✓ Advanced Reports</li>
                  <li className="mb-2">✓ Multi-location Management</li>
                  <li className="mb-2">✓ Customer Management</li>
                  <li className="mb-2">✓ Inventory Tracking</li>
                  <li className="mb-2">✓ Sales Analytics</li>
                  <li className="mb-2">✓ 24/7 Support</li>
                </ul>

                <hr />

                <div className="mt-3">
                  <h6 className="mb-2">Need More Storefronts?</h6>
                  <p className="small text-muted mb-0">
                    Add more locations anytime. Your pricing will automatically adjust to the appropriate tier.
                  </p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {!pricing && (
        <Alert variant="warning">
          <h5 className="mb-3">⚠️ Backend API Not Ready</h5>
          <p className="mb-2">
            The subscription pricing system is not yet fully configured. The following backend endpoints are missing:
          </p>
          <ul className="mb-3">
            <li><code>GET /subscriptions/api/subscriptions/my-pricing/</code></li>
            <li><code>GET /subscriptions/api/subscriptions/status/</code></li>
          </ul>
          <p className="mb-0">
            <strong>For Backend Team:</strong> Please implement the endpoints documented in 
            <code>docs/ADMIN-PRICING-TIER-MANAGEMENT.md</code>
          </p>
        </Alert>
      )}

      {/* Payment Modal */}
      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Complete Your Subscription</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!pricing && (
            <Alert variant="warning">
              <h6>Backend API Not Ready</h6>
              <p className="mb-0">
                The pricing calculation endpoint is not available. Please contact support or try again later.
              </p>
            </Alert>
          )}
          
          {pricing && (
            <>
              {/* Subscription Summary */}
              <div className="mb-4">
                <h6 className="text-muted mb-3">Subscription Summary</h6>
                <div className="bg-light p-3 rounded">
                  <div className="d-flex justify-content-between mb-2">
                    <span><strong>Tier:</strong></span>
                    <span>{pricing.breakdown?.tier_name || 'N/A'}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span><strong>Storefronts:</strong></span>
                    <span>{pricing.storefronts}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-0">
                    <span><strong>Total Amount:</strong></span>
                    <span className="text-primary fw-bold">{formatCurrency(pricing.total_amount, getCurrencyFromCode(pricing.currency))}</span>
                  </div>
                  <small className="text-muted">Billed monthly</small>
                </div>
              </div>

              {/* Payment Method Selection */}
              <Form.Group className="mb-4">
                <Form.Label>
                  <strong>Select Payment Method</strong>
                </Form.Label>
                <Form.Select 
                  value={paymentGateway} 
                  onChange={(e) => setPaymentGateway(e.target.value as 'PAYSTACK' | 'STRIPE')}
                  size="lg"
                >
                  <option value="PAYSTACK">📱 Mobile Money / Card (Paystack)</option>
                  <option value="STRIPE">💳 Credit/Debit Card (Stripe)</option>
                </Form.Select>
              </Form.Group>

              <Alert variant="info" className="mb-0">
                <div className="d-flex align-items-start">
                  <i className="bi bi-shield-check me-2" style={{ fontSize: '1.5rem' }}></i>
                  <div>
                    <strong>Secure Payment</strong>
                    <p className="mb-0 mt-1">
                      You will be redirected to a secure payment page to complete your subscription. 
                      Your payment information is encrypted and never stored on our servers.
                    </p>
                  </div>
                </div>
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPaymentModal(false)} disabled={processing}>
            Cancel
          </Button>
          <Button variant="primary" size="lg" onClick={handleSubscribe} disabled={processing || !pricing}>
            {processing ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Processing...
              </>
            ) : (
              <>
                <i className="bi bi-lock-fill me-2"></i>
                Proceed to Payment
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}
