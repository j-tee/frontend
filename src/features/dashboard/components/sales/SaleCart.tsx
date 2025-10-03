import { Card, Table, Button, Badge } from 'react-bootstrap'
import type { Sale } from '../../../../types/sales'

interface SaleCartProps {
  cart: Sale | null
  onCheckout: () => void
  loading?: boolean
}

export function SaleCart({ cart, onCheckout, loading }: SaleCartProps) {
  if (!cart) {
    return (
      <Card>
        <Card.Body className="text-center text-muted py-5">
          <p>No items in cart. Search for products above to add them.</p>
        </Card.Body>
      </Card>
    )
  }

  const hasItems = cart.line_items && cart.line_items.length > 0

  return (
    <Card>
      <Card.Header>
        <h6 className="mb-0">Shopping Cart</h6>
      </Card.Header>
      <Card.Body>
        {!hasItems ? (
          <div className="text-center text-muted py-4">
            <p>Cart is empty</p>
          </div>
        ) : (
          <>
            <Table responsive hover size="sm">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="text-end">Qty</th>
                  <th className="text-end">Price</th>
                  <th className="text-end">Discount</th>
                  <th className="text-end">Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cart.line_items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div>
                        <div className="fw-semibold">{item.product_name}</div>
                        <small className="text-muted">{item.product_sku}</small>
                      </div>
                    </td>
                    <td className="text-end">{item.quantity}</td>
                    <td className="text-end">GH₵ {item.unit_price.toFixed(2)}</td>
                    <td className="text-end">
                      {item.discount_percentage > 0 ? (
                        <Badge bg="success">{item.discount_percentage}%</Badge>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="text-end fw-semibold">
                      GH₵ {item.total_price.toFixed(2)}
                    </td>
                    <td>
                      <Button variant="link" size="sm" className="text-danger p-0">
                        ×
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <hr />

            {/* Totals */}
            <div className="ms-auto" style={{ maxWidth: '300px' }}>
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal:</span>
                <strong>GH₵ {cart.subtotal.toFixed(2)}</strong>
              </div>
              {cart.discount_amount > 0 && (
                <div className="d-flex justify-content-between mb-2 text-success">
                  <span>Discount:</span>
                  <strong>- GH₵ {cart.discount_amount.toFixed(2)}</strong>
                </div>
              )}
              {cart.tax_amount > 0 && (
                <div className="d-flex justify-content-between mb-2">
                  <span>Tax:</span>
                  <strong>GH₵ {cart.tax_amount.toFixed(2)}</strong>
                </div>
              )}
              <hr />
              <div className="d-flex justify-content-between mb-3">
                <span className="fs-5">Total:</span>
                <strong className="fs-4">GH₵ {cart.total_amount.toFixed(2)}</strong>
              </div>
              <Button
                variant="primary"
                size="lg"
                className="w-100"
                onClick={onCheckout}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Checkout'}
              </Button>
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  )
}
