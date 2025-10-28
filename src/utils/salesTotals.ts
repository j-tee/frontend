import type { Sale, SaleItem } from '../types/sales'

export interface SaleTotals {
  subtotal: number
  discount: number
  tax: number
  total: number
  amountPaid: number
  amountDue: number
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const sumLineItems = (
  items: SaleItem[] | undefined,
  selector: (item: SaleItem) => number,
): number => {
  if (!items || items.length === 0) {
    return 0
  }

  return items.reduce((sum, item) => sum + selector(item), 0)
}

export const calculateSaleTotals = (sale: Sale | null | undefined): SaleTotals => {
  if (!sale) {
    return {
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
      amountPaid: 0,
      amountDue: 0,
    }
  }

  const subtotalFromItems = sumLineItems(sale.line_items, (item) => toNumber(item.total_price))
  const discountFromItems = sumLineItems(sale.line_items, (item) => toNumber(item.discount_amount))

  const subtotal = (() => {
    const value = toNumber(sale.subtotal)
    return value > 0 ? value : subtotalFromItems
  })()

  const discount = (() => {
    const value = toNumber(sale.discount_amount)
    return value > 0 ? value : discountFromItems
  })()

  const tax = toNumber(sale.tax_amount)

  const total = (() => {
    const value = toNumber(sale.total_amount)
    return value > 0 ? value : subtotalFromItems
  })()

  const amountPaid = toNumber(sale.amount_paid)
  const explicitAmountDue = toNumber(sale.amount_due)
  const amountDue = explicitAmountDue > 0 ? explicitAmountDue : Math.max(total - amountPaid, 0)

  return {
    subtotal,
    discount,
    tax,
    total,
    amountPaid,
    amountDue,
  }
}
