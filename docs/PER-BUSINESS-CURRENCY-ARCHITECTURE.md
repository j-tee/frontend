# Per-Business Currency Architecture

## Overview

Currency settings in the POS system are **per-business**, not per-user. This ensures that:
- Each business can operate in its own local currency
- Users working across multiple businesses see the correct currency for each
- Currency settings are a business decision, not a user preference
- All transactions, reports, and displays use the business's configured currency

## Architecture

### 1. Database Schema

```typescript
interface BusinessSettings {
  id: UUID;
  business: UUID;              // 🔑 Foreign key to Business
  regional: {
    currency: Currency;        // Currency config for THIS business
    timezone: string;
    dateFormat: string;
    // ... other regional settings
  };
  appearance: AppearanceSettings;
  notifications: NotificationSettings;
  receipt: ReceiptSettings;
  created_at: string;
  updated_at: string;
}
```

**Key Point**: Settings table has `business` field as foreign key, ensuring one settings record per business.

### 2. Backend API

```python
# settings/views.py
class BusinessSettingsViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        # 🛡️ IMPORTANT: Filter by current business
        return BusinessSettings.objects.filter(
            business=self.request.user.current_business
        )
    
    def perform_create(self, serializer):
        # Automatically set business from request context
        serializer.save(business=self.request.user.current_business)
```

**Key Point**: Backend automatically filters settings by the user's **current active business**.

### 3. Frontend API Service

```typescript
// src/services/settingsService.ts
const settingsService = {
  // GET /settings/api/settings/
  // Backend uses auth token to determine current business
  getSettings: async (): Promise<BusinessSettings> => {
    const response = await httpClient.get(`/settings/api/settings/`);
    return response.data;
  },
  
  // PATCH /settings/api/settings/
  // Updates settings for current business only
  updateSettings: async (settings: Partial<BusinessSettings>) => {
    const response = await httpClient.patch(`/settings/api/settings/`, settings);
    return response.data;
  },
};
```

**Key Point**: No business ID needed in API calls - backend determines from auth context.

### 4. Redux State Management

```typescript
// src/store/slices/settingsSlice.ts
interface SettingsState {
  settings: BusinessSettings | null;  // Current business settings
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// Async thunk fetches settings for current business
export const fetchSettings = createAsyncThunk(
  'settings/fetchSettings',
  async () => {
    // Backend determines business from auth context
    return await settingsService.getSettings();
  }
);
```

**Key Point**: Redux stores settings for the **currently active business**.

## User Flow

### Scenario: User Works Across Multiple Businesses

```
User: Mike Tetteh
Businesses: 
  - Business A (Ghana): GHS (₵)
  - Business B (Nigeria): NGN (₦)
  - Business C (USA): USD ($)

Flow:
1. User logs in → selects Business A
2. App fetches Business A settings → currency = GHS (₵)
3. All displays show: ₵100.00

4. User switches to Business B
5. App fetches Business B settings → currency = NGN (₦)
6. All displays update to: ₦100.00

7. User switches to Business C
8. App fetches Business C settings → currency = USD ($)
9. All displays update to: $100.00
```

**Key Point**: Currency changes automatically when business changes.

## Implementation Details

### 1. Business Switching Trigger

When a user switches businesses, the app must:

```typescript
// When business changes
const handleBusinessSwitch = async (newBusinessId: string) => {
  // 1. Update auth state with new business
  await dispatch(setCurrentBusiness(newBusinessId));
  
  // 2. Fetch settings for the new business
  await dispatch(fetchSettings());
  
  // 3. All currency displays automatically update via useCurrency hook
};
```

### 2. Settings Page Access Control

```typescript
// SettingsPage.tsx
const SettingsPage = () => {
  const currentBusiness = useSelector(selectCurrentBusiness);
  const settings = useSelector(selectSettings);
  
  // Show warning if user doesn't have permission
  if (!hasPermission(currentBusiness, 'manage_settings')) {
    return <AccessDenied message="Only business owners can change currency settings" />;
  }
  
  return (
    <CurrencySettings 
      currentCurrency={settings.regional.currency}
      onSave={(newCurrency) => {
        // Updates currency for CURRENT business only
        dispatch(updateSettings({
          regional: { ...settings.regional, currency: newCurrency }
        }));
      }}
    />
  );
};
```

**Key Point**: UI should clearly show which business's settings are being edited.

### 3. Currency Hook Behavior

```typescript
// src/hooks/useCurrency.ts
export const useCurrency = () => {
  const currency = useSelector(selectCurrency);  // Gets current business's currency
  
  const formatCurrency = (value: number) => {
    return formatCurrencyUtil(value, currency);  // Uses business currency
  };
  
  return { formatCurrency, currency };
};
```

**Key Point**: Hook always uses the **current business's** currency settings.

## Security & Permissions

### 1. Backend Validation

```python
# settings/permissions.py
class BusinessSettingsPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        # User must be authenticated
        if not request.user.is_authenticated:
            return False
        
        # User must have active business
        if not request.user.current_business:
            return False
        
        # For updates, user must be owner or have manage_settings permission
        if request.method in ['PATCH', 'PUT', 'DELETE']:
            return request.user.has_perm('manage_settings', request.user.current_business)
        
        return True
```

### 2. Frontend Permission Checks

```typescript
// Check if user can modify currency settings
const canEditCurrency = () => {
  const user = useSelector(selectCurrentUser);
  const business = useSelector(selectCurrentBusiness);
  
  return (
    user.role === 'owner' ||
    user.permissions.includes('manage_settings')
  );
};
```

## UI/UX Considerations

### 1. Clear Business Context

Always show which business's settings are being edited:

```tsx
<SettingsHeader>
  <BusinessSelector />  {/* Show current business */}
  <h1>Settings for {currentBusiness.name}</h1>
  <p>Currency: {currency.code} ({currency.symbol})</p>
</SettingsHeader>
```

### 2. Warning on Currency Change

```tsx
<CurrencyChangeDialog>
  <Warning>
    Changing currency affects:
    - All product prices
    - Transaction history displays
    - Reports and analytics
    - Receipts and invoices
  </Warning>
  <p>This will update currency for: <strong>{businessName}</strong></p>
  <Checkbox>I understand this affects {businessName} only</Checkbox>
</CurrencyChangeDialog>
```

### 3. Read-Only for Non-Owners

```tsx
{canEditCurrency() ? (
  <CurrencySelector 
    value={currency}
    onChange={handleCurrencyChange}
  />
) : (
  <CurrencyDisplay>
    <LockIcon />
    <span>{currency.name} ({currency.symbol})</span>
    <p>Contact business owner to change currency</p>
  </CurrencyDisplay>
)}
```

## Testing Scenarios

### Test Case 1: Single Business User
```
1. User has one business (Ghana)
2. Currency should always be GHS (₵)
3. User cannot switch to another business
4. Settings page shows GHS currency
5. All displays use ₵ symbol
```

### Test Case 2: Multi-Business User
```
1. User has three businesses:
   - Ghana Store: GHS (₵)
   - Lagos Branch: NGN (₦)
   - NY Office: USD ($)

2. Login → Select Ghana Store
   ✓ Currency displays: ₵
   ✓ Settings show: GHS
   
3. Switch to Lagos Branch
   ✓ Currency updates to: ₦
   ✓ Settings show: NGN
   ✓ All values re-render with new symbol
   
4. Switch to NY Office
   ✓ Currency updates to: $
   ✓ Settings show: USD
```

### Test Case 3: Permission-Based Access
```
1. User is Employee (not owner)
2. Navigate to Settings
3. Currency field is read-only
4. Shows message: "Contact owner to change currency"
5. User can view but not edit

6. User is promoted to Owner
7. Navigate to Settings
8. Currency field is editable
9. Can change and save currency
```

### Test Case 4: Concurrent Business Operations
```
1. Owner opens two browser tabs
2. Tab 1: Business A (USD)
3. Tab 2: Business B (NGN)

4. Tab 1 changes currency to EUR
   ✓ Tab 1 updates to EUR
   ✓ Tab 2 remains NGN (different business)
   
5. Refresh Tab 2
   ✓ Still shows NGN (correct)
```

## Common Pitfalls & Solutions

### ❌ Pitfall 1: Storing Currency in User Profile
```typescript
// DON'T DO THIS
interface UserProfile {
  preferredCurrency: Currency;  // ❌ Wrong!
}
```

**Why it's wrong**: A user may work in multiple businesses with different currencies.

**✅ Correct approach**: Store currency in `BusinessSettings`.

### ❌ Pitfall 2: Not Refreshing Settings on Business Switch
```typescript
// DON'T DO THIS
const switchBusiness = (businessId: string) => {
  dispatch(setCurrentBusiness(businessId));
  // ❌ Missing: dispatch(fetchSettings())
};
```

**Why it's wrong**: Old business's currency will still be used.

**✅ Correct approach**:
```typescript
const switchBusiness = async (businessId: string) => {
  await dispatch(setCurrentBusiness(businessId));
  await dispatch(fetchSettings());  // ✅ Fetch new business settings
};
```

### ❌ Pitfall 3: Caching Currency Globally
```typescript
// DON'T DO THIS
let globalCurrency: Currency = DEFAULT_CURRENCY;  // ❌ Global state!

export const formatCurrency = (value: number) => {
  return format(value, globalCurrency);  // ❌ Uses global, not business-specific
};
```

**Why it's wrong**: Doesn't respect per-business currency.

**✅ Correct approach**: Use Redux selector inside hook.

### ❌ Pitfall 4: Hardcoding Currency in Components
```typescript
// DON'T DO THIS
const ProductCard = ({ price }) => {
  return <div>${price}</div>;  // ❌ Hardcoded $ symbol
};
```

**Why it's wrong**: Doesn't adapt to business currency.

**✅ Correct approach**:
```typescript
const ProductCard = ({ price }) => {
  const { formatCurrency } = useCurrency();  // ✅ Uses business currency
  return <div>{formatCurrency(price)}</div>;
};
```

## Migration Checklist

When adding per-business currency to an existing system:

- [ ] Ensure `BusinessSettings` has `business` foreign key
- [ ] Backend filters settings by `request.user.current_business`
- [ ] Redux fetches settings on business switch
- [ ] All currency displays use `useCurrency` hook
- [ ] Settings UI shows which business is being edited
- [ ] Permission checks prevent unauthorized currency changes
- [ ] Warning dialogs explain currency change scope
- [ ] Test with multiple businesses per user
- [ ] Test permission-based access control
- [ ] Document currency change procedure for admins

## Summary

✅ **Currency is per-business**, not per-user  
✅ **Backend automatically filters** by current business  
✅ **Settings auto-update** when switching businesses  
✅ **useCurrency hook** respects current business  
✅ **Permissions control** who can change currency  
✅ **UI clearly shows** which business's settings are active  

This architecture ensures that each business operates in its own currency while allowing users to work across multiple businesses seamlessly.
