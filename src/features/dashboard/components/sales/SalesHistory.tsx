import { Card, Table, Badge } from 'react-bootstrap'

export function SalesHistory() {
  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">Recent Sales</h5>
      </Card.Header>
      <Card.Body>
        <div className="text-center text-muted py-5">
          <p>No sales history yet</p>
          <small>Completed sales will appear here</small>
        </div>

        {/* Placeholder for when we have data */}
        {false && (
          <Table responsive hover>
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>RCP-001</td>
                <td>Oct 3, 2025 10:30 AM</td>
                <td>Walk-in</td>
                <td><Badge bg="info">RETAIL</Badge></td>
                <td>GH₵ 150.00</td>
                <td><Badge bg="success">COMPLETED</Badge></td>
                <td>
                  <a href="#view">View</a>
                </td>
              </tr>
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  )
}
