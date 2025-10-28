import useAppSelector from './useAppSelector'
import { selectCurrency } from '../store/slices/settingsSlice'
import { formatCurrency as formatCurrencyUtil } from '../utils/currency'

/**
 * Custom hook to format currency based on user's settings
 */
export const useCurrency = () => {
  const currency = useAppSelector(selectCurrency)

  const formatCurrency = (
    amount: number | string,
    options?: {
      showSymbol?: boolean
      showCode?: boolean
    },
  ): string => {
    return formatCurrencyUtil(amount, currency, options)
  }

  return {
    currency,
    formatCurrency,
  }
}
