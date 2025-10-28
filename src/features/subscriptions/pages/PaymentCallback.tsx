import { Container, Alert, Spinner } from 'react-bootstrap'

export default function PaymentCallback() {
  return (
    <Container fluid className="py-5 text-center">
      <Spinner animation="border" role="status" className="mb-3">
        <span className="visually-hidden">Loading...</span>
      </Spinner>
      <Alert variant="info">
        <h4>Processing Payment...</h4>
        <p>Please wait while we verify your payment with Paystack.</p>
        <p className="mb-0">
          <small className="text-muted">
            Payment verification endpoint integration in progress.
          </small>
        </p>
      </Alert>
    </Container>
  )
}
