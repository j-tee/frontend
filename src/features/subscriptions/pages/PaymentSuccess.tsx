import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Container, Alert, Spinner, Button } from 'react-bootstrap'
import { verifyPayment } from '../../../services/subscriptionService'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const verifyStripePayment = async () => {
      try {
        // Get session_id from URL (Stripe callback)
        const sessionId = searchParams.get('session_id')
        
        if (!sessionId) {
          setStatus('error')
          setMessage('Payment session ID not found in URL')
          return
        }

        // Extract subscription ID from session_id
        // Session ID format: SUB-{subscription_id}-{timestamp}
        // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (5 parts when split by -)
        const sessionParts = sessionId.split('-')
        if (sessionParts.length < 7 || sessionParts[0] !== 'SUB') {
          setStatus('error')
          setMessage('Invalid session ID format')
          return
        }
        
        // Reconstruct full UUID from parts 1-5
        // sessionParts: ['SUB', 'xxxxxxxx', 'xxxx', 'xxxx', 'xxxx', 'xxxxxxxxxxxx', 'timestamp']
        const subscriptionId = `${sessionParts[1]}-${sessionParts[2]}-${sessionParts[3]}-${sessionParts[4]}-${sessionParts[5]}`
        
        // Verify payment with backend
        const result = await verifyPayment(subscriptionId, {
          gateway: 'STRIPE',
          reference: sessionId
        })

        if (result.success) {
          setStatus('success')
          setMessage(result.message || 'Payment verified successfully!')
        } else {
          setStatus('error')
          setMessage(result.message || 'Payment verification failed')
        }
        
      } catch (error) {
        console.error('Payment verification error:', error)
        setStatus('error')
        setMessage(error instanceof Error ? error.message : 'Failed to verify payment')
      }
    }

    verifyStripePayment()
  }, [searchParams])

  return (
    <Container fluid className="py-5 text-center">
      {status === 'processing' && (
        <>
          <Spinner animation="border" role="status" className="mb-3">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <Alert variant="info">
            <h4>Processing Payment...</h4>
            <p>Please wait while we verify your payment with Stripe.</p>
          </Alert>
        </>
      )}

      {status === 'success' && (
        <Alert variant="success">
          <h3>✅ Payment Successful!</h3>
          <p>{message}</p>
          <p>Your subscription has been activated.</p>
          <Button variant="primary" onClick={() => { window.location.href = '/app' }}>
            Go to Dashboard
          </Button>
          {' '}
          <Button variant="outline-secondary" onClick={() => { window.location.href = '/subscriptions' }}>
            Manage Subscription
          </Button>
        </Alert>
      )}

      {status === 'error' && (
        <Alert variant="danger">
          <h4>❌ Payment Verification Failed</h4>
          <p>{message}</p>
          <p className="mb-0">
            <Button variant="primary" onClick={() => { window.location.href = '/app' }}>
              Go to Dashboard
            </Button>
            {' '}
            <Button variant="outline-secondary" onClick={() => { window.location.href = '/subscriptions' }}>
              Manage Subscriptions
            </Button>
          </p>
        </Alert>
      )}
    </Container>
  )
}
