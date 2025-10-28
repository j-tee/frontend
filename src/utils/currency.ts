import type { Currency } from '../types/settings'

/**
 * Format a number as currency based on currency settings
 */
export const formatCurrency = (
  amount: number | string | null | undefined,
  currency: Currency,
  options?: {
    showSymbol?: boolean
    showCode?: boolean
  },
): string => {
  const { showSymbol = true, showCode = false } = options || {}
  
  // Handle null/undefined values
  if (amount === null || amount === undefined) {
    return showSymbol ? `${currency.symbol}0.${'0'.repeat(currency.decimalPlaces)}` : `0.${'0'.repeat(currency.decimalPlaces)}`
  }
  
  // Convert to number if string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  // Handle invalid numbers
  if (isNaN(numAmount)) {
    return showSymbol ? `${currency.symbol}0.${'0'.repeat(currency.decimalPlaces)}` : `0.${'0'.repeat(currency.decimalPlaces)}`
  }
  
  // Format the number with thousand separators
  const formatted = numAmount.toLocaleString('en-US', {
    minimumFractionDigits: currency.decimalPlaces,
    maximumFractionDigits: currency.decimalPlaces,
  })
  
  // Build the result based on options
  let result = formatted
  
  if (showSymbol) {
    if (currency.position === 'before') {
      result = `${currency.symbol}${formatted}`
    } else {
      result = `${formatted} ${currency.symbol}`
    }
  }
  
  if (showCode) {
    result = `${result} ${currency.code}`
  }
  
  return result
}

/**
 * Parse a currency string to a number
 */
export const parseCurrency = (value: string, currency: Currency): number => {
  // Remove currency symbol and any spaces
  const cleaned = value.replace(currency.symbol, '').replace(/\s/g, '').replace(currency.code, '')
  return parseFloat(cleaned) || 0
}

/**
 * Format number with thousand separators
 */
export const formatNumber = (value: number, decimalPlaces: number = 2): string => {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  })
}
