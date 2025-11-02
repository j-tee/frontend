# Subscription Components

This directory contains all subscription-related React components for the POS frontend.

## 📁 Components

### Tax Configuration Components

#### `TaxList.tsx`
Displays tax configurations in a table format.

```tsx
<TaxList 
  activeOnly={true}
  title="Applicable Taxes"
  className="my-4"
/>
```

#### `PricingBreakdown.tsx`
Shows complete pricing calculation with taxes and service charges.

```tsx
<PricingBreakdown 
  storefronts={3}
  gateway="PAYSTACK"
  showTierBreakdown={true}
/>
```

#### `TaxManagement.tsx`
Full CRUD interface for tax configurations (Admin only).

```tsx
<RequirePermission permission="is_staff">
  <TaxManagement />
</RequirePermission>
```

### Existing Components

- `AlertsList.tsx` - Subscription alerts display
- `PaymentHistoryTable.tsx` - Payment history table
- `PlanCard.tsx` - Subscription plan card

## 📖 Documentation

- **Full Guide**: `/docs/TAX-CONFIGURATION-FRONTEND-IMPLEMENTATION.md`
- **Quick Start**: `/docs/TAX-CONFIGURATION-QUICK-START.md`
- **Summary**: `/docs/TAX-CONFIGURATION-IMPLEMENTATION-SUMMARY.md`

## 🚀 Usage

All components are exported from `index.ts`:

```tsx
import { 
  TaxList, 
  PricingBreakdown, 
  TaxManagement,
  AlertsList,
  PaymentHistoryTable,
  PlanCard
} from '@/features/subscriptions/components'
```

## 🔑 Key Principles

1. **Backend-First**: Tax calculations always from backend
2. **Permission-Aware**: Admin vs. user access
3. **Self-Contained**: Components work independently
4. **Error-Handled**: Loading and error states included
5. **Type-Safe**: Full TypeScript coverage

## 📝 Notes

- Tax components follow backend-first architecture
- Never calculate taxes client-side
- All API calls use centralized `httpClient`
- Components handle their own loading/error states
