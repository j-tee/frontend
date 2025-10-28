# Walk-In Customer Creation Fix

## Problem

Walk-in customers were failing to create with a 400 Bad Request error:
```
POST http://localhost:8000/customers/api/customers/
{"business":["This field is required."]}
```

Regular customers were creating successfully, but walk-in customers (auto-generated for quick sales) were failing because the API payload was missing the required `business` field.

## Root Cause

In `SalesPage.tsx`, the `getOrCreateWalkInCustomer` function was calling `createCustomerService` without including the `business` field in the payload:

```typescript
const customer = await createCustomerService({
  name: WALK_IN_NAME,
  phone: '+233000000000',
  type: 'RETAIL',
  notes: 'Auto-generated walk-in customer',
  // ❌ Missing: business field
})
```

## Solution

### 1. Import Required Selector

Added `selectCurrentBusiness` to imports from `authSlice`:

```typescript
import { selectUserStorefronts, selectCurrentBusiness } from '../../../store/slices/authSlice'
```

### 2. Access Current Business in Component

Added selector to get current business from Redux store:

```typescript
const currentBusiness = useAppSelector(selectCurrentBusiness)
```

### 3. Include Business in Walk-In Customer Payload

Updated the walk-in customer creation to include the business field:

```typescript
const customer = await createCustomerService({
  name: WALK_IN_NAME,
  phone: '+233000000000',
  type: 'RETAIL',
  notes: 'Auto-generated walk-in customer',
  business: currentBusiness?.id, // ✅ Added
})
```

### 4. Updated useCallback Dependencies

Added `currentBusiness?.id` to the dependency array:

```typescript
}, [customerOptions, upsertCustomerOption, currentBusiness?.id])
```

### 5. Updated Type Definition

Modified `createCustomer` function signature in `salesService.ts` to accept optional business field:

```typescript
export async function createCustomer(customerData: {
  name: string
  phone: string
  email?: string
  address?: string
  tax_id?: string
  type: 'RETAIL' | 'WHOLESALE'
  credit_limit?: number
  credit_terms_days?: number
  notes?: string
  business?: UUID  // ✅ Added
}): Promise<Customer>
```

## Impact

### What Was Fixed
✅ Walk-in customers can now be created successfully
✅ Business field is correctly included in API payload
✅ Walk-in customer creation follows same business isolation as regular customers

### What Was NOT Changed
✅ Regular customer creation logic untouched
✅ No changes to customer search functionality
✅ No changes to customer selection UI
✅ No changes to existing customer management workflows

## Testing

### Test Scenarios

1. **Walk-In Customer Creation**
   - Start a new sale
   - Click "Quick Walk-In" or let system auto-create walk-in customer
   - Verify customer is created without errors
   - Verify customer is associated with current business

2. **Regular Customer Creation**
   - Create a new customer through the form
   - Verify it still works as before
   - Verify business association is correct

3. **Multi-Business Scenario**
   - Switch between businesses
   - Create walk-in customers in each business
   - Verify each walk-in customer is isolated to its business
   - Verify you can't see other businesses' walk-in customers

4. **Existing Walk-In Customer**
   - If walk-in customer already exists for the business
   - Verify system finds and uses existing walk-in customer
   - Verify no duplicate walk-in customers are created

## Files Changed

1. **src/features/dashboard/pages/SalesPage.tsx**
   - Added `selectCurrentBusiness` import
   - Added `currentBusiness` selector
   - Added `business: currentBusiness?.id` to walk-in customer payload
   - Updated `useCallback` dependencies

2. **src/services/salesService.ts**
   - Added optional `business?: UUID` field to `createCustomer` parameters

## Commit

```
commit c07bf79
Fix walk-in customer creation - add business field to API payload
```

## Architecture Notes

### Per-Business Isolation

This fix maintains the per-business architecture:
- Each business has its own walk-in customer
- Walk-in customers are automatically scoped to the current business
- Users cannot see or use walk-in customers from other businesses

### Business Field Propagation

The `business` field comes from:
1. Redux store: `state.auth.business`
2. Set during login/business selection
3. Used throughout the app for business isolation
4. Backend API filters all data by this business field

### Walk-In Customer Lifecycle

1. **First Sale**: Walk-in customer doesn't exist
   - System tries to find walk-in customer (fails)
   - System creates new walk-in customer with business field
   - Customer is saved to database
   - System uses this customer for the sale

2. **Subsequent Sales**: Walk-in customer exists
   - System finds existing walk-in customer
   - System uses existing customer for the sale
   - No duplicate creation

3. **Multiple Businesses**: Each has own walk-in
   - Business A has walk-in customer with `business: A_UUID`
   - Business B has walk-in customer with `business: B_UUID`
   - When you switch businesses, you get the correct walk-in

## Prevention

To prevent similar issues in the future:

1. **Always include business field** when creating business-scoped entities:
   - Customers
   - Products
   - Sales
   - Stock movements
   - Etc.

2. **Check type definitions** match backend requirements:
   - If backend requires a field, TypeScript should too
   - Use `?` for truly optional fields
   - Don't omit required fields from type definitions

3. **Test with multiple businesses**:
   - Always test features with 2+ businesses
   - Verify data isolation
   - Verify business switching works correctly

4. **Review error messages**:
   - 400 Bad Request often means missing required field
   - Check backend error response for field names
   - Update frontend to include missing fields

## Related Documentation

- [Per-Business Currency Architecture](./PER-BUSINESS-CURRENCY-ARCHITECTURE.md)
- [Backend Requirements Summary](./BACKEND-REQUIREMENTS-SUMMARY.md)
- [Backend Integration Issues](./BACKEND-INTEGRATION-ISSUES.md)
