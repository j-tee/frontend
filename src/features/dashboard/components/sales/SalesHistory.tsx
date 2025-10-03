import { Card } from 'react-bootstrap'

export function SalesHistory() {
  // TODO: Implement sales history with filters and pagination
  const hasSales = false

  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">Recent Sales</h5>
      </Card.Header>
      <Card.Body>
        {!hasSales ? (
          <div className="text-center text-muted py-5">
            <p>No sales history yet</p>
            <small>Completed sales will appear here</small>
          </div>
        ) : (
          <div className="text-muted">
            <p>Sales list coming soon...</p>
          </div>
        )}
      </Card.Body>
    </Card>
  )
}
