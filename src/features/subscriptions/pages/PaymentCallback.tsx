import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Container, Alert, Spinner } from 'react-bootstrap'
import { verifyPayment } from '../../../services/subscriptionService'

export default function PaymentCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const [verifying, setVerifying] = useState(true)
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState('Verifying payment...')

  useEffect(() => {
    const handlePaymentVerification = async () => {
      // Get reference from URL query params
      const reference = searchParams.get('reference') || searchParams.get('trxref')
      let subscriptionId = searchParams.get('subscription_id')
      
      if (!reference) {
        setMessage('Invalid payment reference')
        setVerifying(false)
        setSuccess(false)
        return
      }

      // If no subscription_id in URL, try to extract from reference
      // Backend should include subscription_id in metadata that comes back
      if (!subscriptionId) {
        // Try to fetch from session storage (we'll store it before redirect)
        subscriptionId = sessionStorage.getItem('pending_subscription_id')
      }

      if (!subscriptionId) {
        setMessage('Missing subscription information. Please contact support.')
        setVerifying(false)
        setSuccess(false)
        return
      }

      try {
        console.log('Verifying payment:', { reference, subscriptionId })
        
        const result = await verifyPayment(subscriptionId, {
          gateway: 'PAYSTACK',
          reference
        })

        console.log('Payment verification result:', result)

        if (result.success) {
          setSuccess(true)
          setMessage(result.message || 'Payment verified successfully!')
          
          // Clear session storage
          sessionStorage.removeItem('pending_subscription_id')
          
          // Redirect to subscription portal after 3 seconds
          setTimeout(() => {
            navigate('/app/subscription')
          }, 3000)
        } else {
          setSuccess(false)
          setMessage(result.message || 'Payment verification failed')
        }
      } catch (error: unknown) {
        console.error('Payment verification error:', error)
        const err = error as { response?: { data?: { error?: string; detail?: string } }; message?: string }
        const errorMessage = err?.response?.data?.error || 
                            err?.response?.data?.detail || 
                            err?.message || 
                            'Failed to verify payment'
        setMessage(errorMessage)
        setSuccess(false)
      } finally {
        setVerifying(false)
      }
    }

    handlePaymentVerification()
  }, [searchParams, navigate])

  return (
    <Container fluid className="py-5 text-center">
      {verifying ? (
        <>
          <Spinner animation="border" className="mb-3" />
          <h4>Verifying Payment...</h4>
          <p className="text-muted">Please wait while we confirm your payment with Paystack.</p>
        </>
      ) : (
        <Alert variant={success ? 'success' : 'danger'}>
          <h4>{success ? '✓ Payment Successful!' : '✗ Payment Failed'}</h4>
          <p>{message}</p>
          {success ? (
            <p className="mb-0"><small>Redirecting to subscription portal...</small></p>
          ) : (
            <p className="mb-0">
              <a href="/app/subscription">Return to subscription portal</a>
            </p>
          )}
        </Alert>
      )}
    </Container>
  )
}
