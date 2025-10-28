# Global Currency System

## Overview

The POS system now has a global currency configuration that allows users to set their preferred currency in Settings. All monetary values throughout the application will automatically use the configured currency symbol, position, and decimal places.

## Architecture

### 1. Redux Store (`src/store/slices/settingsSlice.ts`)
The currency settings are stored in Redux under `settings.regional.currency` with the following structure:

```typescript
interface Currency {
  code: string;        // e.g., 'USD', 'PHP', 'EUR'
  symbol: string;      // e.g., '$', '₱', '€'
  name: string;        // e.g., 'US Dollar', 'Philippine Peso'
  position: 'before' | 'after';  // Symbol position relative to amount
  decimalPlaces: number;         // Number of decimal places (usually 2)
}
```

### 2. Currency Utilities (`src/utils/currency.ts`)
Core functions for currency formatting:

- `formatCurrency(amount, currency, options?)` - Format amount with currency symbol
- `parseCurrency(value, currency)` - Parse currency string back to number
- `formatNumber(value, decimalPlaces?)` - Format number with thousand separators

### 3. Custom Hook (`src/hooks/useCurrency.ts`)
React hook that provides easy access to currency formatting:

```typescript
const { formatCurrency, currency } = useCurrency();
```

### 4. Alternative Utilities (`src/utils/formatters.ts`)
Additional formatting utilities:
- `formatCurrency(value, currency?)` - Standalone formatter
- `formatNumber(value)` - Safe number formatter
- `formatPercent(value, decimalPlaces?)` - Percentage formatter
- `safeParseFloat(value)` - Safe number parser

## Usage

### Method 1: Using the Hook (Recommended for Components)

```typescript
import { useCurrency } from '../../../hooks/useCurrency';

const MyComponent = () => {
  const { formatCurrency, currency } = useCurrency();
  
  return (
    <div>
      <p>Price: {formatCurrency(99.99)}</p>
      <p>Currency: {currency.name} ({currency.code})</p>
    </div>
  );
};
```

### Method 2: Using Redux Selector Directly

```typescript
import { useSelector } from 'react-redux';
import { selectCurrency } from '../store/slices/settingsSlice';
import { formatCurrency } from '../utils/currency';

const MyComponent = () => {
  const currency = useSelector(selectCurrency);
  
  return (
    <div>
      {formatCurrency(price, currency)}
    </div>
  );
};
```

### Method 3: Using Standalone Utility

```typescript
import { formatCurrency } from '../utils/formatters';

// With custom currency
const formatted = formatCurrency(100, {
  code: 'PHP',
  symbol: '₱',
  name: 'Philippine Peso',
  position: 'before',
  decimalPlaces: 2
});
// Returns: "₱100.00"

// Without currency (uses USD default)
const defaultFormatted = formatCurrency(100);
// Returns: "$100.00"
```

## Features

### 1. Null Safety
All formatters handle null/undefined/NaN values gracefully:

```typescript
formatCurrency(null)      // "$0.00"
formatCurrency(undefined) // "$0.00"
formatCurrency(NaN)       // "$0.00"
```

### 2. Thousand Separators
Numbers are automatically formatted with thousand separators:

```typescript
formatCurrency(1000)     // "$1,000.00"
formatCurrency(1000000)  // "$1,000,000.00"
```

### 3. Flexible Symbol Position
Supports both prefix and suffix currency symbols:

```typescript
// USD: Symbol before
{ symbol: '$', position: 'before' }  // "$100.00"

// EUR: Symbol after
{ symbol: '€', position: 'after' }   // "100.00 €"
```

### 4. Configurable Decimal Places

```typescript
// US Dollar: 2 decimals
{ code: 'USD', decimalPlaces: 2 }  // "$100.00"

// Japanese Yen: 0 decimals
{ code: 'JPY', decimalPlaces: 0 }  // "¥100"
```

## Updating Report Pages

To update existing report pages to use global currency:

### Before:
```typescript
const formatCurrency = (value: number | string) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
};
```

### After:
```typescript
import { useCurrency } from '../../../hooks/useCurrency';

const MyReportPage = () => {
  const { formatCurrency } = useCurrency();
  
  // Use formatCurrency throughout the component
  return (
    <div>
      <span>{formatCurrency(summary.total_revenue)}</span>
    </div>
  );
};
```

## Common Currencies

| Currency | Code | Symbol | Position | Decimals |
|----------|------|--------|----------|----------|
| US Dollar | USD | $ | before | 2 |
| Philippine Peso | PHP | ₱ | before | 2 |
| Euro | EUR | € | after | 2 |
| British Pound | GBP | £ | before | 2 |
| Japanese Yen | JPY | ¥ | before | 0 |
| Canadian Dollar | CAD | C$ | before | 2 |
| Australian Dollar | AUD | A$ | before | 2 |
| Swiss Franc | CHF | CHF | before | 2 |
| Chinese Yuan | CNY | ¥ | before | 2 |
| Indian Rupee | INR | ₹ | before | 2 |

## Settings Page

Users can change their currency preference in:
**Settings → Regional Settings → Currency**

Changes are:
- Saved to the backend via `settingsService.updateSettings()`
- Stored in Redux for immediate application-wide access
- Persisted in localStorage for offline access
- Applied automatically to all monetary displays

## Migration Checklist

To migrate a page to use global currency:

- [ ] Import `useCurrency` hook
- [ ] Replace local `formatCurrency` function with hook
- [ ] Update TypeScript types to accept null/undefined values
- [ ] Remove hardcoded currency symbols ('$', 'USD', etc.)
- [ ] Test with different currencies (USD, PHP, EUR, JPY)
- [ ] Verify null/undefined values render correctly
- [ ] Check thousand separators work properly
- [ ] Ensure decimal places match currency config

## Best Practices

1. **Always use the hook in React components**: Ensures currency updates propagate correctly
2. **Handle null/undefined values**: Formatters are safe, but validate data at source
3. **Don't hardcode currency symbols**: Always use the configured currency
4. **Test with different currencies**: Especially those with different positions/decimals
5. **Use formatNumber for non-currency numbers**: Maintains consistency
6. **Document currency assumptions**: If a feature requires specific currency behavior

## Troubleshooting

### Currency not updating after change
- Check if Redux store is updating: Use Redux DevTools
- Verify settings API call succeeded
- Ensure component is using `useCurrency` hook, not local state

### Wrong symbol or format
- Check currency configuration in Redux state
- Verify settings service returns correct data
- Test with different currencies to isolate issue

### Null/undefined errors
- Update formatter type signature to accept null/undefined
- Use safe parse functions: `safeParseFloat()`
- Add validation before display

## Future Enhancements

- [ ] Currency exchange rate support
- [ ] Multi-currency transactions
- [ ] Currency conversion utility
- [ ] Historical currency rates
- [ ] Custom currency creation
- [ ] Currency-specific validation rules
