import { useState } from 'react'
import { Card, Form, Button, ButtonGroup, Alert } from 'react-bootstrap'
import { useAppDispatch, useAppSelector } from '../../../../hooks'
import { completeSale, selectErrors } from '../../../../store/slices/salesSlice'
import type { Sale } from '../../../../types/sales'

interface PaymentPanelProps {
  cart: Sale
  onComplete: () => void
  onCancel: () => void
}

export function PaymentPanel({ cart, onComplete, onCancel }: PaymentPanelProps) {
  const dispatch = useAppDispatch()
  const errors = useAppSelector(selectErrors)
  
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'MOMO' | 'CREDIT'>('CASH')
  const [amountReceived, setAmountReceived] = useState(cart.total_amount.toString())
  const [processing, setProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const amount = parseFloat(amountReceived)
    if (isNaN(amount) || amount < cart.total_amount) {
      return
    }

    setProcessing(true)
    
    const result = await dispatch(
      completeSale({
        saleId: cart.id,
        paymentType: paymentMethod,
        payments: [
          {
            paymentMethod: paymentMethod,
            amountPaid: amount,
          },
        ],
      })
    )

    if (completeSale.fulfilled.match(result)) {
      onComplete()
    }
    
    setProcessing(false)
  }

  const change = parseFloat(amountReceived) - cart.total_amount
  const isValid = !isNaN(parseFloat(amountReceived)) && parseFloat(amountReceived) >= cart.total_amount

  return (
    <Card className="border-primary">
      <Card.Header className="bg-primary text-white">
        <h6 className="mb-0">Complete Payment</h6>
      </Card.Header>
      <Card.Body>
        {errors.checkout && (
          <Alert variant="danger">{errors.checkout}</Alert>
        )}
        
        <Form onSubmit={handleSubmit}>
          {/* Total Amount */}
          <div className="mb-3 p-3 bg-light rounded">
            <div className="d-flex justify-content-between mb-2">
              <span>Total Amount:</span>
              <strong className="fs-5">GH₵ {cart.total_amount.toFixed(2)}</strong>
            </div>
          </div>

          {/* Payment Method */}
          <Form.Group className="mb-3">
            <Form.Label>Payment Method</Form.Label>
            <ButtonGroup className="w-100">
              <Button
                variant={paymentMethod === 'CASH' ? 'primary' : 'outline-primary'}
                onClick={() => setPaymentMethod('CASH')}
              >
                Cash
              </Button>
              <Button
                variant={paymentMethod === 'CARD' ? 'primary' : 'outline-primary'}
                onClick={() => setPaymentMethod('CARD')}
              >
                Card
              </Button>
              <Button
                variant={paymentMethod === 'MOMO' ? 'primary' : 'outline-primary'}
                onClick={() => setPaymentMethod('MOMO')}
              >
                MoMo
              </Button>
              <Button
                variant={paymentMethod === 'CREDIT' ? 'primary' : 'outline-primary'}
                onClick={() => setPaymentMethod('CREDIT')}
                disabled={!cart.customer}
              >
                Credit
              </Button>
            </ButtonGroup>
          </Form.Group>

          {/* Amount Received (for CASH) */}
          {paymentMethod === 'CASH' && (
            <Form.Group className="mb-3">
              <Form.Label>Amount Received</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                isInvalid={!isValid}
              />
              {isValid && change > 0 && (
                <Form.Text className="text-success">
                  Change: GH₵ {change.toFixed(2)}
                </Form.Text>
              )}
            </Form.Group>
          )}

          {/* Quick Amount Buttons (for CASH) */}
          {paymentMethod === 'CASH' && (
            <div className="mb-3">
              <div className="d-flex gap-2 flex-wrap">
                {[10, 20, 50, 100, 200].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => setAmountReceived(amount.toString())}
                  >
                    GH₵ {amount}
                  </Button>
                ))}
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setAmountReceived(cart.total_amount.toString())}
                >
                  Exact
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="d-grid gap-2">
            <Button
              type="submit"
              variant="success"
              size="lg"
              disabled={!isValid || processing}
            >
              {processing ? 'Processing...' : 'Complete Sale'}
            </Button>
            <Button variant="outline-secondary" onClick={onCancel} disabled={processing}>
              Cancel
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  )
}
