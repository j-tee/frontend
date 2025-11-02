import { useEffect, useState, useCallback } from 'react'
import { Modal, Button, Alert, Spinner, Badge } from 'react-bootstrap'
import { useCurrency } from '../../../../hooks'
import { useAppSelector } from '../../../../hooks'
import { selectCurrentBusiness } from '../../../../store/slices/authSlice'
import { getSale } from '../../../../services/salesService'
import type { UUID } from '../../../../types/common'
import type { Sale } from '../../../../types/sales'

interface ReceiptModalProps {
  show: boolean
  saleId: UUID | null
  onHide: () => void
}

export function ReceiptModal({ show, saleId, onHide }: ReceiptModalProps) {
  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { formatCurrency } = useCurrency()
  const business = useAppSelector(selectCurrentBusiness)

  const loadSaleDetails = useCallback(async () => {
    if (!saleId) return

    setLoading(true)
    setError(null)
    
    try {
      const data = await getSale(saleId)
      setSale(data)
    } catch {
      setError('Failed to load receipt details. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [saleId])

  useEffect(() => {
    if (show && saleId) {
      void loadSaleDetails()
    }
  }, [show, saleId, loadSaleDetails])

  const handlePrint = () => {
    const printContent = document.getElementById('receipt-print-content')
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt ${sale?.receipt_number || ''}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            max-width: 80mm;
            margin: 0 auto;
            padding: 10mm;
          }
          .text-center { text-align: center; }
          .text-end { text-align: right; }
          .fw-bold { font-weight: bold; }
          .mb-3 { margin-bottom: 1rem; }
          .mb-2 { margin-bottom: 0.5rem; }
          .mt-3 { margin-top: 1rem; }
          .border-top { border-top: 2px solid #000; padding-top: 0.5rem; }
          .border-bottom { border-bottom: 1px dashed #000; padding-bottom: 0.5rem; }
          .wholesale-badge {
            background-color: #ffc107;
            color: #000;
            padding: 8px;
            font-weight: bold;
            text-align: center;
            margin: 10px 0;
          }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          td { padding: 4px 0; }
          .item-row td { border-bottom: 1px dotted #ccc; }
          .total-row td { font-weight: bold; font-size: 1.1em; }
          @media print {
            body { margin: 0; padding: 5mm; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `)
    
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          Receipt {sale?.receipt_number}
          {sale?.type === 'WHOLESALE' && (
            <Badge bg="warning" text="dark" className="ms-2">WHOLESALE</Badge>
          )}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <div className="mt-2">Loading receipt...</div>
          </div>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : sale ? (
          <div id="receipt-print-content">
            {/* Business Header */}
            <div className="text-center mb-3 border-bottom pb-3">
              <h4 className="mb-1">{sale.business_name || business?.name || 'Business Name'}</h4>
              <div className="text-muted">{sale.storefront_name || 'Store'}</div>
              <div className="text-muted small mt-2">
                Thank you for your business
              </div>
            </div>

            {/* Sale Type Warning */}
            {sale.type === 'WHOLESALE' && (
              <div className="wholesale-badge mb-3">
                <strong>⚠️ WHOLESALE SALE ⚠️</strong>
              </div>
            )}

            {/* Receipt Details */}
            <div className="mb-3">
              <table className="w-100">
                <tbody>
                  <tr>
                    <td><strong>Receipt:</strong></td>
                    <td className="text-end">{sale.receipt_number || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td><strong>Date:</strong></td>
                    <td className="text-end">{formatDateTime(sale.completed_at || sale.created_at)}</td>
                  </tr>
                  <tr>
                    <td><strong>Customer:</strong></td>
                    <td className="text-end">{sale.customer_name || 'Walk-in Customer'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Line Items */}
            <div className="border-top border-bottom mb-3">
              <div className="fw-bold mb-2 mt-2">Items:</div>
              <table className="w-100">
                <tbody>
                  {sale.line_items?.map((item, idx) => (
                    <tr key={idx} className="item-row">
                      <td>
                        <div className="fw-bold">{item.product_name}</div>
                        <div className="text-muted small">
                          {item.quantity} × {formatCurrency(item.unit_price)}
                          {sale.type === 'WHOLESALE' && ' (Wholesale)'}
                        </div>
                      </td>
                      <td className="text-end fw-bold">
                        {formatCurrency(item.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="border-top pt-2">
              <table className="w-100">
                <tbody>
                  <tr>
                    <td>Subtotal:</td>
                    <td className="text-end">{formatCurrency(sale.subtotal || sale.total_amount)}</td>
                  </tr>
                  {sale.tax_amount && Number(sale.tax_amount) > 0 && (
                    <tr>
                      <td>Tax:</td>
                      <td className="text-end">{formatCurrency(sale.tax_amount)}</td>
                    </tr>
                  )}
                  {sale.discount_amount && Number(sale.discount_amount) > 0 && (
                    <tr>
                      <td>Discount:</td>
                      <td className="text-end">-{formatCurrency(sale.discount_amount)}</td>
                    </tr>
                  )}
                  <tr className="total-row border-top">
                    <td><strong>TOTAL:</strong></td>
                    <td className="text-end"><strong>{formatCurrency(sale.total_amount)}</strong></td>
                  </tr>
                  <tr>
                    <td>Paid ({sale.payment_type || 'CASH'}):</td>
                    <td className="text-end">{formatCurrency(sale.amount_paid || sale.total_amount)}</td>
                  </tr>
                  {sale.amount_due && Number(sale.amount_due) > 0 && (
                    <tr className="text-danger">
                      <td><strong>Amount Due:</strong></td>
                      <td className="text-end"><strong>{formatCurrency(sale.amount_due)}</strong></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="text-center mt-3 text-muted small">
              <div>********************************</div>
              <div className="mt-2">Thank you for your business!</div>
              {sale.type === 'WHOLESALE' && (
                <div>Wholesale Customer</div>
              )}
              <div className="mt-2">Visit us again!</div>
            </div>
          </div>
        ) : (
          <Alert variant="warning">No receipt data available</Alert>
        )}
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>
          Close
        </Button>
        <Button variant="primary" onClick={handlePrint} disabled={!sale || loading}>
          🖨️ Print Receipt
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
