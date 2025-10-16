import { useEffect, useMemo, useState } from 'react'
import { Alert, Badge, Modal, Spinner, Table } from 'react-bootstrap'
import { useCurrency } from '../../../../hooks'
import CreditService from '../../../../services/creditService'
import type { Payment, Sale } from '../../../../types/sales'

interface PaymentHistoryModalProps {
  show: boolean
  sale: Sale | null
  onHide: () => void
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

export function PaymentHistoryModal({ show, sale, onHide }: PaymentHistoryModalProps) {
  const { formatCurrency } = useCurrency()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalPaid = useMemo(() => {
    return payments.reduce((sum, payment) => sum + (payment.amount_paid ?? payment.amount ?? 0), 0)
  }, [payments])

  useEffect(() => {
    const fetchPaymentHistory = async () => {
      if (!show || !sale) return
      try {
        setLoading(true)
        setError(null)
        const response = await CreditService.getPaymentHistory(sale.id)
        setPayments(response.results)
      } catch (e) {
        console.error('Failed to load payment history', e)
        setError('Unable to load payment history. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    void fetchPaymentHistory()
  }, [show, sale])

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Payment History</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {!sale ? (
          <p className="text-muted mb-0">Select a credit sale to view its payment history.</p>
        ) : loading ? (
          <div className="py-4 text-center">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="mt-3 text-muted">Fetching payment history…</p>
          </div>
        ) : error ? (
          <Alert variant="danger" className="mb-0">
            {error}
          </Alert>
        ) : payments.length === 0 ? (
          <div className="py-3 text-center text-muted">
            <p className="mb-1">No payments recorded yet.</p>
            <small>Record a payment to start tracking the repayment journey.</small>
          </div>
        ) : (
          <Table responsive hover size="sm" className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => {
                const amountValue = payment.amount_paid ?? payment.amount ?? 0
                return (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.created_at || payment.payment_date)}</td>
                    <td>{formatCurrency(amountValue)}</td>
                    <td>
                      <Badge bg="outline-secondary" className="text-uppercase">
                        {payment.payment_method || '—'}
                      </Badge>
                    </td>
                    <td>{payment.reference_number || payment.transaction_reference || '—'}</td>
                    <td>{payment.notes || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Modal.Body>
      {sale && (
        <Modal.Footer className="d-flex justify-content-between">
          <div className="text-muted small">
            <div>Total Paid: <strong>{formatCurrency(totalPaid)}</strong></div>
            <div>Outstanding: <strong className="text-danger">{formatCurrency(sale.amount_due)}</strong></div>
          </div>
        </Modal.Footer>
      )}
    </Modal>
  )
}
