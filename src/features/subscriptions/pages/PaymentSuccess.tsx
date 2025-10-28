import { Container, Alert, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

export default function PaymentSuccess() {
  const navigate = useNavigate()

  return (
    <Container fluid className="py-5 text-center">
      <Alert variant="success">
        <h3>✓ Payment Successful!</h3>
        <p>Your subscription payment has been processed successfully.</p>
        <Button variant="primary" onClick={() => navigate('/app')}>
          Go to Dashboard
        </Button>
      </Alert>
    </Container>
  )
}
