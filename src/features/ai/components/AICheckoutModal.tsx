import React, { useMemo } from 'react'
import { toast } from 'react-toastify'
import useAppDispatch from '../../../hooks/useAppDispatch'
import useAppSelector from '../../../hooks/useAppSelector'
import {
  hideCheckoutModal,
  selectCheckoutModal,
} from '../../../store/slices/aiSlice'
import type { AICreditInvoiceLine, CreditPurchaseResponse } from '../../../types/ai'
import './AICheckoutModal.css'

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const formatCurrency = (value: number | null): string => {
  if (value == null) {
    return '—'
  }
  return `GHS ${value.toFixed(2)}`
}

const findPaymentUrl = (payload: CreditPurchaseResponse | null): string | null => {
  if (!payload) {
    return null
  }

  const candidateFields = [
    payload.authorization_url,
    payload.payment_link,
    payload.payment?.authorization_url,
    payload.payment?.checkout_url,
    payload.payment?.payment_url,
  ]

  for (const candidate of candidateFields) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate
    }
  }

  return null
}

const normalizeTaxes = (lines?: AICreditInvoiceLine[]): AICreditInvoiceLine[] => {
  if (!Array.isArray(lines)) {
    return []
  }

  return lines.filter((line) => typeof line === 'object' && line != null)
}

export const AICheckoutModal: React.FC = () => {
  const dispatch = useAppDispatch()
  const { isOpen, payment } = useAppSelector(selectCheckoutModal)

  const invoice = payment?.invoice
  const taxes = useMemo(() => {
    if (!invoice) {
      return [] as AICreditInvoiceLine[]
    }

    const primary = normalizeTaxes(invoice.taxes)
    if (primary.length > 0) {
      return primary
    }
    return normalizeTaxes(invoice.breakdown)
  }, [invoice])

  const baseAmount = toNumber(invoice?.base_amount ?? invoice?.subtotal ?? payment?.amount)
  const totalTax = toNumber(invoice?.tax_total)
  const totalAmount = toNumber(invoice?.total_amount ?? invoice?.total ?? payment?.amount)
  const packageName = payment?.package ?? payment?.purchase?.package ?? 'AI Credits'

  const creditsQuantity =
    toNumber(payment?.credits_to_add ?? payment?.purchase?.credits_to_add) ??
    toNumber(payment?.purchase?.credits) ??
    null

  const bonusCredits = toNumber(payment?.purchase?.bonus_credits)

  const handleClose = () => {
    dispatch(hideCheckoutModal())
  }

  const handleProceed = () => {
    const paymentUrl = findPaymentUrl(payment ?? null)

    if (!paymentUrl) {
      toast.error('Payment link is not available. Please try again.')
      return
    }

    dispatch(hideCheckoutModal())
    window.location.href = paymentUrl
  }

  if (!isOpen || !payment) {
    return null
  }

  return (
    <>
      <div className="modal-overlay" onClick={handleClose} />

      <div className="checkout-modal">
        <div className="modal-header">
          <h2>Confirm Purchase · {packageName}</h2>
          <button
            className="close-btn"
            onClick={handleClose}
            aria-label="Close checkout modal"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="invoice-summary">
            <div className="summary-row">
              <span className="label">Base Amount</span>
              <span className="value">{formatCurrency(baseAmount)}</span>
            </div>

            {taxes.map((taxLine, index) => {
              const rate = toNumber(taxLine.rate)
              const amount = toNumber(taxLine.amount)
              const hasRate = rate != null
              const name = taxLine.name ?? taxLine.label ?? 'Tax'

              return (
                <div className="summary-row tax-row" key={taxLine.tax_id ?? `${name}-${index}`}>
                  <span className="label">
                    {name}
                    {hasRate ? ` (${rate.toFixed(2)}%)` : ''}
                  </span>
                  <span className="value">{formatCurrency(amount)}</span>
                </div>
              )
            })}

            <div className="divider" />

            <div className="summary-row">
              <span className="label">Total Tax</span>
              <span className="value">{formatCurrency(totalTax)}</span>
            </div>

            <div className="summary-row total">
              <span className="label">Total Amount Due</span>
              <span className="value">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <div className="credits-summary">
            <div className="credits-line">
              <span className="label">Credits</span>
              <span className="value">
                {creditsQuantity != null ? `${creditsQuantity.toFixed(0)} credits` : '—'}
              </span>
            </div>
            {bonusCredits != null && bonusCredits > 0 && (
              <div className="credits-line bonus">
                <span className="label">Includes Bonus</span>
                <span className="value">+{bonusCredits.toFixed(0)} credits</span>
              </div>
            )}
            {invoice?.expires_at && (
              <div className="credits-note">Invoice expires on {new Date(invoice.expires_at).toLocaleString()}</div>
            )}
          </div>

          {payment?.payment?.message && (
            <div className="payment-note">{payment.payment.message}</div>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={handleClose}>
            Cancel
          </button>
          <button className="primary-btn" onClick={handleProceed}>
            Proceed to Paystack
          </button>
        </div>
      </div>
    </>
  )
}

export default AICheckoutModal
