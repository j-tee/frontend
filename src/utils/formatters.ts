import type { Currency } from '../types/settings';

/**
 * Format a number as currency using the provided currency settings
 * @param value - The numeric value to format
 * @param currency - Currency configuration (code, symbol, position, decimalPlaces)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  value: number | string | null | undefined,
  currency?: Currency
): string => {
  // Handle null/undefined/invalid values
  if (value === null || value === undefined) return currency?.symbol || '$' + '0.00';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return currency?.symbol || '$' + '0.00';

  // Use provided currency or default
  const currencyConfig: Currency = currency || {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    position: 'before',
    decimalPlaces: 2,
  };

  // Format the number with proper decimal places
  const formatted = num.toFixed(currencyConfig.decimalPlaces);
  
  // Apply thousand separators
  const parts = formatted.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formattedValue = parts.join('.');

  // Apply currency symbol based on position
  if (currencyConfig.position === 'before') {
    return `${currencyConfig.symbol}${formattedValue}`;
  } else {
    return `${formattedValue}${currencyConfig.symbol}`;
  }
};

/**
 * Format a number with thousand separators
 * @param value - The numeric value to format
 * @returns Formatted number string
 */
export const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return value.toLocaleString();
};

/**
 * Format a percentage value
 * @param value - The numeric value to format as percentage
 * @param decimalPlaces - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export const formatPercent = (
  value: number | null | undefined,
  decimalPlaces: number = 2
): string => {
  if (value === null || value === undefined || isNaN(value)) return `0.${'0'.repeat(decimalPlaces)}%`;
  return `${value.toFixed(decimalPlaces)}%`;
};

/**
 * Parse a currency string back to a number
 * @param value - The currency string to parse
 * @returns Numeric value
 */
export const parseCurrency = (value: string): number => {
  // Remove currency symbols, commas, and spaces
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

/**
 * Safe float parser that handles null/undefined and string values
 * @param value - The value to parse
 * @returns Numeric value or 0 if invalid
 */
export const safeParseFloat = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? 0 : num;
};
