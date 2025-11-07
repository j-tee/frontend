import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Container, Alert, Spinner } from 'react-bootstrap'
import { verifyPayment } from '../../../services/subscriptionService'
import { verifyCreditsPayment } from '../../../services/ai/aiService'
import useAppDispatch from '../../../hooks/useAppDispatch'
import useAppSelector from '../../../hooks/useAppSelector'
import { fetchCreditsBalance } from '../../../store/slices/aiSlice'
import { selectAuthState } from '../../../store/slices/authSlice'

export default function PaymentCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { token } = useAppSelector(selectAuthState)
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const verifyPaystackPayment = async () => {
      try {
        // Debug: Check localStorage directly
        const storedToken = localStorage.getItem('pos_token')
        console.log('PaymentCallback - Token from localStorage:', storedToken ? `${storedToken.substring(0, 20)}...` : 'NO TOKEN IN LOCALSTORAGE')
        console.log('PaymentCallback - Token from Redux:', !!token)
        console.log('PaymentCallback - Token value:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN')
        
        // Wait for token to be available
        if (!token) {
          console.log('Waiting for auth token...')
          return
        }

        // Get payment reference from URL
        const reference = searchParams.get('reference') || searchParams.get('trxref')
        console.log('PaymentCallback - Reference:', reference)
        
        if (!reference) {
          setStatus('error')
          setMessage('Payment reference not found in URL')
          return
        }

        if (reference.startsWith('AI-CREDIT')) {
          console.log('AI Credit payment detected, verifying with backend...')
          
          try {
            // Call the verify endpoint with authentication
            const verifyResult = await verifyCreditsPayment(reference)
            
            // Backend may return either { success: true } or { status: "success" }
            const isSuccess = verifyResult.success === true || verifyResult.status === 'success'
            
            if (isSuccess) {
              setStatus('success')
              setMessage(
                verifyResult.message || 
                `Payment verified! ${verifyResult.credits_added || 0} credits added. New balance: ${verifyResult.new_balance || verifyResult.balance || 0}`
              )
              
              // Refresh credit balance
              await dispatch(fetchCreditsBalance()).unwrap()
              
              // Redirect to AI features page after 2 seconds
              setTimeout(() => {
                window.location.href = '/app/ai'
              }, 2000)
            } else {
              setStatus('error')
              setMessage(verifyResult.message || 'Payment verification failed')
            }
          } catch (error) {
            console.error('AI credit verification error:', error)
            setStatus('error')
            setMessage('Failed to verify AI credit payment. Please contact support with reference: ' + reference)
          }
          
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
          reference: reference,
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

    // Only run when we have a token
    if (token) {
      verifyPaystackPayment()
    }
  }, [dispatch, navigate, searchParams, token]) // token is in dependency array so effect re-runs when it changes

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
            {!token && (
              <p className="mt-3">
                <small className="text-muted">Waiting for authentication...</small>
              </p>
            )}
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
            <a href="/app/subscription" className="btn btn-outline-secondary">
              Manage Subscriptions
            </a>
          </p>
        </Alert>
      )}
    </Container>
  )
}
