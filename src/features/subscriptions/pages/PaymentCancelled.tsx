import { Container, Alert, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

export default function PaymentCancelled() {
  const navigate = useNavigate()

  return (
    <Container fluid className="py-5 text-center">
      <Alert variant="warning">
        <h3>Payment Cancelled</h3>
        <p>Your payment was cancelled. No charges were made.</p>
        <Button variant="secondary" onClick={() => navigate('/app/subscription')}>
          Back to Subscriptions
        </Button>
      </Alert>
    </Container>
  )
}
