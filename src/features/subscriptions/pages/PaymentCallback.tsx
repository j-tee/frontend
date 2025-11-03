import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Container, Alert, Spinner } from 'react-bootstrap'
import { verifyPayment } from '../../../services/subscriptionService'

export default function PaymentCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const verifyPaystackPayment = async () => {
      try {
        // Get payment reference from URL
        const reference = searchParams.get('reference')
        
        if (!reference) {
          setStatus('error')
          setMessage('Payment reference not found in URL')
          return
        }

        // Extract subscription ID from reference
        // Reference format: SUB-{subscription_id}-{timestamp}
        // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (5 parts when split by -)
        const refParts = reference.split('-')
        if (refParts.length < 7 || refParts[0] !== 'SUB') {
          setStatus('error')
          setMessage('Invalid payment reference format')
          return
        }
        
        // Reconstruct full UUID from parts 1-5
        // refParts: ['SUB', 'xxxxxxxx', 'xxxx', 'xxxx', 'xxxx', 'xxxxxxxxxxxx', 'timestamp']
        const subscriptionId = `${refParts[1]}-${refParts[2]}-${refParts[3]}-${refParts[4]}-${refParts[5]}`
        
        // Verify payment with backend
        const result = await verifyPayment(subscriptionId, {
          gateway: 'PAYSTACK',
          reference: reference
        })

        if (result.success) {
          setStatus('success')
          setMessage(result.message || 'Payment verified successfully!')
          
          // Redirect to dashboard after 2 seconds
          // User can see active subscription status and continue working
          setTimeout(() => {
            window.location.href = '/app'
          }, 2000)
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

    verifyPaystackPayment()
  }, [searchParams, navigate])

  return (
    <Container fluid className="py-5 text-center">
      {status === 'processing' && (
        <>
          <Spinner animation="border" role="status" className="mb-3">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <Alert variant="info">
            <h4>Processing Payment...</h4>
            <p>Please wait while we verify your payment with Paystack.</p>
          </Alert>
        </>
      )}

      {status === 'success' && (
        <Alert variant="success">
          <h4>✅ Payment Successful!</h4>
          <p>{message}</p>
          <p className="mb-0">
            <small className="text-muted">
              Redirecting you to dashboard...
            </small>
          </p>
        </Alert>
      )}

      {status === 'error' && (
        <Alert variant="danger">
          <h4>❌ Payment Verification Failed</h4>
          <p>{message}</p>
          <p className="mb-0">
            <a href="/app" className="btn btn-primary">
              Go to Dashboard
            </a>
            {' '}
            <a href="/subscriptions" className="btn btn-outline-secondary">
              Manage Subscriptions
            </a>
          </p>
        </Alert>
      )}
    </Container>
  )
}
