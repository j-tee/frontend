import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Form, InputGroup, Modal } from 'react-bootstrap'
import CreditService from '../../../../services/creditService'
import type { Sale } from '../../../../types/sales'

interface RecordPaymentModalProps {
  show: boolean
  sale: Sale | null
  onHide: () => void
  onPaymentRecorded: () => void | Promise<void>
}

const paymentMethods: Array<{ label: string; value: 'CASH' | 'CARD' | 'MOBILE' | 'BANK_TRANSFER' | 'CHECK' | 'OTHER' }> = [
  { label: 'Cash', value: 'CASH' },
  { label: 'Card', value: 'CARD' },
  { label: 'Mobile Money', value: 'MOBILE' },
  { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
  { label: 'Cheque', value: 'CHECK' },
  { label: 'Other', value: 'OTHER' },
]

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function RecordPaymentModal({ show, sale, onHide, onPaymentRecorded }: RecordPaymentModalProps) {
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<typeof paymentMethods[number]['value']>('CASH')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const maxAmount = useMemo(() => sale?.amount_due ?? 0, [sale])

  useEffect(() => {
    if (sale) {
      setAmount((sale.amount_due || 0).toFixed(2))
      setPaymentMethod('CASH')
      setReferenceNumber('')
      setNotes('')
      setError(null)
    }
  }, [sale])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!sale) return

    const numericAmount = Number(amount)
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid payment amount greater than zero.')
      return
    }

    if (numericAmount > maxAmount + 0.01) {
      setError('Payment amount cannot exceed the outstanding balance.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      await CreditService.recordPayment(sale.id, {
        amount: numericAmount.toFixed(2),
        payment_method: paymentMethod,
        reference_number: referenceNumber || undefined,
        notes: notes || undefined,
      })

      await onPaymentRecorded()
    } catch (e) {
      console.error('Failed to record payment', e)
      setError('Unable to record payment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const remainingBalance = Math.max(0, maxAmount - Number(amount || 0))

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Record Payment</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {!sale ? (
            <p className="text-muted mb-0">Select a credit sale to record a payment.</p>
          ) : (
            <>
              <div className="mb-3">
                <small className="text-muted d-block">Receipt</small>
                <strong>{sale.receipt_number}</strong>
                <div className="small text-muted">{sale.customer_name || 'Walk-in Customer'}</div>
              </div>

              <div className="mb-3">
                <small className="text-muted d-block">Outstanding Balance</small>
                <strong className="text-danger">
                  {currencyFormatter.format(sale.amount_due || 0)}
                </strong>
              </div>

              {error && (
                <Alert variant="danger" className="py-2">
                  {error}
                </Alert>
              )}

              <Form.Group controlId="payment-amount" className="mb-3">
                <Form.Label>Amount Received</Form.Label>
                <InputGroup>
                  <InputGroup.Text>₵</InputGroup.Text>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    required
                  />
                </InputGroup>
                <Form.Text className={remainingBalance < 0 ? 'text-danger' : 'text-muted'}>
                  Remaining balance: {currencyFormatter.format(remainingBalance)}
                </Form.Text>
              </Form.Group>

              <Form.Group controlId="payment-method" className="mb-3">
                <Form.Label>Payment Method</Form.Label>
                <Form.Select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)}
                >
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group controlId="payment-reference" className="mb-3">
                <Form.Label>Reference Number (optional)</Form.Label>
                <Form.Control
                  type="text"
                  value={referenceNumber}
                  onChange={(event) => setReferenceNumber(event.target.value)}
                  placeholder="Transaction reference"
                />
              </Form.Group>

              <Form.Group controlId="payment-notes">
                <Form.Label>Notes (optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add any additional information here"
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onHide} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting || !sale}>
            {submitting ? 'Recording...' : 'Record Payment'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
