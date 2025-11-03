import { Container, Alert, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

export default function PaymentCancelled() {
  const navigate = useNavigate()

  return (
    <Container fluid className="py-5 text-center">
      <Alert variant="warning">
        <h3>⚠️ Payment Cancelled</h3>
        <p>Your payment was cancelled. No charges were made.</p>
        <p className="text-muted">You can try again anytime.</p>
        <Button variant="primary" onClick={() => navigate('/app')}>
          Go to Dashboard
        </Button>
        {' '}
        <Button variant="outline-secondary" onClick={() => navigate('/subscriptions')}>
          Manage Subscriptions
        </Button>
      </Alert>
    </Container>
  )
}
