/**
 * Manual Payment Verification Tool
 * Use this page to manually verify stuck payments
 */

import { useState } from 'react'
import { Container, Form, Button, Alert, Card } from 'react-bootstrap'
import { verifyCreditsPayment } from '../../../services/ai/aiService'
import { verifyPayment } from '../../../services/subscriptionService'
import useAppDispatch from '../../../hooks/useAppDispatch'
import { fetchCreditsBalance } from '../../../store/slices/aiSlice'

export default function ManualVerifyPayment() {
  const dispatch = useAppDispatch()
  const [reference, setReference] = useState('')
  const [paymentType, setPaymentType] = useState<'ai_credit' | 'subscription'>('ai_credit')
  const [subscriptionId, setSubscriptionId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    status: 'success' | 'error'
    message: string
  } | null>(null)

  const handleVerify = async () => {
    setLoading(true)
    setResult(null)

    try {
      if (paymentType === 'ai_credit') {
        // Verify AI credit payment
        const response = await verifyCreditsPayment(reference)
        
        if (response.success) {
          setResult({
            status: 'success',
            message: response.message || 'Payment verified successfully! Credits have been added to your account.',
          })
          
          // Refresh credit balance
          await dispatch(fetchCreditsBalance()).unwrap()
        } else {
          setResult({
            status: 'error',
            message: response.message || 'Payment verification failed.',
          })
        }
      } else {
        // Verify subscription payment
        if (!subscriptionId) {
          setResult({
            status: 'error',
            message: 'Please enter a subscription ID',
          })
          setLoading(false)
          return
        }

        const response = await verifyPayment(subscriptionId, {
          gateway: 'PAYSTACK',
          reference: reference,
        })

        if (response.success) {
          setResult({
            status: 'success',
            message: response.message || 'Payment verified successfully!',
          })
        } else {
          setResult({
            status: 'error',
            message: response.message || 'Payment verification failed.',
          })
        }
      }
    } catch (error) {
      console.error('Verification error:', error)
      setResult({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to verify payment',
      })
    } finally {
      setLoading(false)
    }
  }

  // Extract reference from URL if present
  const urlParams = new URLSearchParams(window.location.search)
  const urlReference = urlParams.get('reference') || urlParams.get('trxref')

  return (
    <Container className="py-5">
      <Card className="mx-auto" style={{ maxWidth: '600px' }}>
        <Card.Header className="bg-primary text-white">
          <h4 className="mb-0">🔧 Manual Payment Verification</h4>
        </Card.Header>
        <Card.Body>
          {urlReference && !reference && (
            <Alert variant="info">
              <strong>Reference found in URL:</strong> {urlReference}
              <br />
              <Button
                size="sm"
                variant="outline-primary"
                className="mt-2"
                onClick={() => setReference(urlReference)}
              >
                Use this reference
              </Button>
            </Alert>
          )}

          <p className="text-muted">
            Use this tool if your payment was successful but credits weren't added to your account.
          </p>

          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Payment Type</Form.Label>
              <Form.Select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as 'ai_credit' | 'subscription')}
              >
                <option value="ai_credit">AI Credit Purchase</option>
                <option value="subscription">Subscription Payment</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Payment Reference</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., AI-CREDIT-1762538007-b748c3e"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
              <Form.Text className="text-muted">
                This is the reference code from Paystack (found in confirmation email or URL)
              </Form.Text>
            </Form.Group>

            {paymentType === 'subscription' && (
              <Form.Group className="mb-3">
                <Form.Label>Subscription ID</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
                  value={subscriptionId}
                  onChange={(e) => setSubscriptionId(e.target.value)}
                />
                <Form.Text className="text-muted">
                  UUID format subscription ID
                </Form.Text>
              </Form.Group>
            )}

            <Button
              variant="primary"
              onClick={handleVerify}
              disabled={loading || !reference}
              className="w-100"
            >
              {loading ? 'Verifying...' : 'Verify Payment'}
            </Button>
          </Form>

          {result && (
            <Alert variant={result.status === 'success' ? 'success' : 'danger'} className="mt-3">
              <strong>
                {result.status === 'success' ? '✅ Success!' : '❌ Error'}
              </strong>
              <br />
              {result.message}
            </Alert>
          )}

          {result?.status === 'success' && (
            <div className="mt-3 text-center">
              <Button variant="outline-primary" href="/app/ai">
                Go to AI Features
              </Button>
              {' '}
              <Button variant="outline-secondary" href="/app">
                Go to Dashboard
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  )
}
