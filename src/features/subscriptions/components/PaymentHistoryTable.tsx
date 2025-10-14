import { Table, Badge } from 'react-bootstrap'
import type { SubscriptionPayment, PaymentStatus } from '../../../types/subscriptions'

interface PaymentHistoryTableProps {
  payments: SubscriptionPayment[]
}

const getStatusVariant = (status: PaymentStatus): string => {
  const variants: Record<PaymentStatus, string> = {
    PAID: 'success',
    PENDING: 'warning',
    FAILED: 'danger',
    OVERDUE: 'danger',
    CANCELLED: 'secondary'
  }
  return variants[status] || 'secondary'
}

export function PaymentHistoryTable({ payments }: PaymentHistoryTableProps) {
  if (payments.length === 0) {
    return (
      <div className="text-center py-4 text-muted">
        <i className="bi bi-receipt fs-1 d-block mb-2"></i>
        <p>No payment history yet</p>
      </div>
    )
  }
  
  return (
    <Table responsive hover>
      <thead>
        <tr>
          <th>Date</th>
          <th>Reference</th>
          <th>Amount</th>
          <th>Method</th>
          <th>Status</th>
          <th>Period</th>
        </tr>
      </thead>
      <tbody>
        {payments.map(payment => (
          <tr key={payment.id}>
            <td>
              {payment.paid_at 
                ? new Date(payment.paid_at).toLocaleDateString()
                : new Date(payment.created_at).toLocaleDateString()
              }
            </td>
            <td>
              <code className="small">{payment.transaction_reference}</code>
            </td>
            <td>
              <strong>{payment.currency} {payment.amount}</strong>
            </td>
            <td>
              <div className="d-flex align-items-center gap-1">
                {payment.payment_method === 'PAYSTACK' && (
                  <i className="bi bi-phone text-success"></i>
                )}
                {payment.payment_method === 'STRIPE' && (
                  <i className="bi bi-credit-card text-primary"></i>
                )}
                <span className="small">{payment.payment_method}</span>
              </div>
            </td>
            <td>
              <Badge bg={getStatusVariant(payment.status)}>
                {payment.status}
              </Badge>
            </td>
            <td className="small text-muted">
              {payment.payment_date && (
                <>
                  {new Date(payment.payment_date).toLocaleDateString()}
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
