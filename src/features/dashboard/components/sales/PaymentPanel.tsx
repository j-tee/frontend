import { useEffect, useMemo, useState } from 'react'
import { Card, Form, Button, ButtonGroup, Alert } from 'react-bootstrap'
import { toast } from 'react-toastify'
import { useAppDispatch, useAppSelector, useCurrency } from '../../../../hooks'
import { completeSale, selectErrors } from '../../../../store/slices/salesSlice'
import type { Sale } from '../../../../types/sales'
import { calculateSaleTotals } from '../../../../utils/salesTotals'
import type { UUID } from '../../../../types/common'

interface PaymentPanelProps {
  cart: Sale
  onComplete: (sale: Sale) => void
  onCancel: () => void
  customerId?: UUID | null
}

export function PaymentPanel({ cart, onComplete, onCancel, customerId }: PaymentPanelProps) {
  const dispatch = useAppDispatch()
  const errors = useAppSelector(selectErrors)
  const { formatCurrency } = useCurrency()

  const totals = useMemo(() => calculateSaleTotals(cart), [cart])
  const totalAmount = totals.total
  const amountDue = totals.amountDue
  const defaultCashAmount = totalAmount > 0 ? totalAmount.toFixed(2) : ''
  const checkoutCustomerId = cart.customer ?? customerId ?? null
  
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'MOBILE' | 'CREDIT'>('CASH')
  const [amountReceived, setAmountReceived] = useState(defaultCashAmount)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (paymentMethod === 'CASH' && amountReceived) {
      return
    }

    setAmountReceived(defaultCashAmount)
  }, [amountReceived, cart?.id, defaultCashAmount, paymentMethod])

  const handleMethodChange = (method: 'CASH' | 'CARD' | 'MOBILE' | 'CREDIT') => {
    setPaymentMethod(method)

    if (method !== 'CASH') {
      setAmountReceived(defaultCashAmount)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cashAmount = parseFloat(amountReceived)
    const isCash = paymentMethod === 'CASH'
    const isCredit = paymentMethod === 'CREDIT'
    const paymentAmount = isCash ? cashAmount : isCredit ? 0 : totalAmount

    if (isCash) {
      if (isNaN(cashAmount) || cashAmount < totalAmount) {
        return
      }
    } else if (!isCredit && totalAmount <= 0) {
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
            amountPaid: paymentAmount,
          },
        ],
        customerId: checkoutCustomerId ?? undefined,
      })
    )

    if (completeSale.fulfilled.match(result)) {
      toast.success('Sale completed successfully')
      onComplete(result.payload)
    } else {
      const errorMessage =
        (typeof result.payload === 'string' && result.payload) ||
        result.error.message ||
        'Unable to complete sale. Please try again.'
      toast.error(errorMessage)
    }
    
    setProcessing(false)
  }

  const cashAmount = parseFloat(amountReceived)
  const change = paymentMethod === 'CASH' ? cashAmount - totalAmount : 0
  const isCash = paymentMethod === 'CASH'
  const isCashValid = !isNaN(cashAmount) && cashAmount >= totalAmount
  const requiresCustomer = paymentMethod === 'CREDIT'
  const hasCustomer = Boolean(checkoutCustomerId)
  const canSubmit = isCash ? isCashValid : (!requiresCustomer || hasCustomer) && totalAmount > 0

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
              <strong className="fs-5">{formatCurrency(totalAmount)}</strong>
            </div>
            {amountDue > 0 && (
              <div className="d-flex justify-content-between text-muted small">
                <span>Amount Due:</span>
                <strong>{formatCurrency(amountDue)}</strong>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <Form.Group className="mb-3">
            <Form.Label>Payment Method</Form.Label>
            <ButtonGroup className="w-100">
              <Button
                variant={paymentMethod === 'CASH' ? 'primary' : 'outline-primary'}
                onClick={() => handleMethodChange('CASH')}
              >
                Cash
              </Button>
              <Button
                variant={paymentMethod === 'CARD' ? 'primary' : 'outline-primary'}
                onClick={() => handleMethodChange('CARD')}
              >
                Card
              </Button>
              <Button
                variant={paymentMethod === 'MOBILE' ? 'primary' : 'outline-primary'}
                onClick={() => handleMethodChange('MOBILE')}
              >
                Mobile Money
              </Button>
              <Button
                variant={paymentMethod === 'CREDIT' ? 'primary' : 'outline-primary'}
                onClick={() => handleMethodChange('CREDIT')}
                disabled={!checkoutCustomerId}
              >
                Credit
              </Button>
            </ButtonGroup>
          </Form.Group>

          {/* Amount Received (for CASH) */}
          {isCash && (
            <Form.Group className="mb-3">
              <Form.Label>Amount Received</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                isInvalid={!isCashValid}
              />
              {isCashValid && change > 0 && (
                <Form.Text className="text-success">
                  Change: {formatCurrency(change)}
                </Form.Text>
              )}
            </Form.Group>
          )}

          {/* Quick Amount Buttons (for CASH) */}
          {isCash && (
            <div className="mb-3">
              <div className="d-flex gap-2 flex-wrap">
                {[10, 20, 50, 100, 200].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => setAmountReceived(amount.toFixed(2))}
                  >
                    {formatCurrency(amount)}
                  </Button>
                ))}
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setAmountReceived(defaultCashAmount)}
                >
                  Exact
                </Button>
              </div>
            </div>
          )}

          {!isCash && paymentMethod !== 'CREDIT' && (
            <Alert variant="info" className="mb-3 py-2">
              <small>
                This payment method will charge {formatCurrency(totalAmount)}.
              </small>
            </Alert>
          )}

          {paymentMethod === 'CREDIT' && (
            <Alert variant="warning" className="mb-3 py-2">
              <small>
                {hasCustomer
                  ? 'Credit sales will record the full amount as outstanding balance for the customer.'
                  : 'Select a customer before completing a credit sale. The outstanding balance will be tied to that account.'}
              </small>
            </Alert>
          )}

          {/* Actions */}
          <div className="d-grid gap-2">
            <Button
              type="submit"
              variant="success"
              size="lg"
              disabled={!canSubmit || processing}
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
