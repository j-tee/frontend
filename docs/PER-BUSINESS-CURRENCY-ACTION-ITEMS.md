# Per-Business Currency: Implementation Status & Action Items

## ✅ What's Already Correct

The system **already implements per-business currency** correctly:

### 1. Database & Backend ✅
```typescript
interface BusinessSettings {
  id: UUID;
  business: UUID;  // ✅ Foreign key to Business table
  regional: {
    currency: Currency;  // ✅ Each business has its own currency
    // ...
  };
}
```

- Settings table has `business` field
- Backend API filters by current business automatically
- One settings record per business

### 2. API Service ✅
```typescript
// settingsService.ts
getSettings(): Promise<BusinessSettings>  // ✅ Gets current business settings
updateSettings(settings): Promise<BusinessSettings>  // ✅ Updates current business only
```

- No business ID needed in API calls
- Backend determines business from auth context
- Secure by design

### 3. Redux State ✅
```typescript
interface SettingsState {
  settings: BusinessSettings | null;  // ✅ Current business settings
  // ...
}
```

- Stores settings for currently active business
- Updates when business changes (need to ensure this)

### 4. Currency Hook ✅
```typescript
export const useCurrency = () => {
  const currency = useSelector(selectCurrency);  // ✅ Gets current business currency
  // ...
};
```

- Always uses current business's currency
- Automatically updates when settings change

## ⚠️ What Needs Verification/Enhancement

### 1. Business Switch Handler (CRITICAL)

**Current Gap**: Need to ensure settings are refreshed when user switches businesses.

**Required Implementation**:
```typescript
// When business changes, must:
1. Update auth.business
2. Fetch new business settings ← VERIFY THIS HAPPENS
3. All displays auto-update ← Should work via Redux
```

**Action Items**:
- [ ] Verify `fetchSettings()` is called on business switch
- [ ] Add `useBusinessSettings()` hook to main layout
- [ ] Test multi-business switching scenario

### 2. Settings Page UI Clarity

**Current Gap**: Settings page may not clearly show which business is being edited.

**Required Enhancement**:
```tsx
<SettingsPage>
  {/* Show which business's settings are being edited */}
  <BusinessContext>
    <BusinessName>{currentBusiness.name}</BusinessName>
    <CurrencyBadge>{currency.code} ({currency.symbol})</CurrencyBadge>
  </BusinessContext>
  
  <CurrencySettings />
</SettingsPage>
```

**Action Items**:
- [ ] Add business name display to Settings page
- [ ] Show current currency prominently
- [ ] Add tooltip: "Currency affects only {businessName}"

### 3. Permission Checks

**Current Gap**: UI may not restrict currency editing based on permissions.

**Required Enhancement**:
```typescript
// Only allow currency changes if user has permission
const canEditCurrency = () => {
  const user = useSelector(selectCurrentUser);
  return user.role === 'owner' || user.permissions.includes('manage_settings');
};
```

**Action Items**:
- [ ] Add permission check in Settings UI
- [ ] Show read-only view for non-owners
- [ ] Add clear permission denied message

### 4. Currency Change Warning

**Current Gap**: No warning when changing currency.

**Required Enhancement**:
```tsx
<CurrencyChangeDialog>
  <Warning>
    This will change the currency for: <strong>{businessName}</strong>
    
    Affects:
    - All product prices displayed
    - Transaction history
    - Reports and analytics
    - Receipts and invoices
  </Warning>
  
  <Note>
    This change only affects {businessName}.
    Other businesses will keep their currencies.
  </Note>
</CurrencyChangeDialog>
```

**Action Items**:
- [ ] Add confirmation dialog for currency changes
- [ ] List affected areas
- [ ] Emphasize business-specific scope

## 📋 Implementation Checklist

### Phase 1: Verification (High Priority)
- [ ] Test current implementation with multiple businesses
- [ ] Verify settings refresh on business switch
- [ ] Confirm backend filters correctly by business
- [ ] Test permission-based access

### Phase 2: Core Functionality (High Priority)
- [ ] Implement `useBusinessSettings()` hook
- [ ] Add hook to App.tsx or MainLayout
- [ ] Ensure settings load on business switch
- [ ] Test with 2-3 businesses with different currencies

### Phase 3: UI/UX Enhancements (Medium Priority)
- [ ] Add business context display to Settings page
- [ ] Implement currency change confirmation dialog
- [ ] Add permission-based UI restrictions
- [ ] Show currency badge in header/navigation

### Phase 4: Testing (High Priority)
- [ ] Test Case 1: Single business user
  - [ ] Currency always correct
  - [ ] Settings page works
  - [ ] All displays use correct symbol
  
- [ ] Test Case 2: Multi-business user
  - [ ] Currency changes when switching
  - [ ] Each business keeps its currency
  - [ ] No cross-business contamination
  
- [ ] Test Case 3: Permission-based access
  - [ ] Owner can edit currency
  - [ ] Employee cannot edit (read-only)
  - [ ] Clear permission denied message
  
- [ ] Test Case 4: Currency change
  - [ ] Warning dialog appears
  - [ ] Change only affects current business
  - [ ] All displays update immediately

### Phase 5: Documentation (Medium Priority)
- [ ] Update user documentation
- [ ] Add "How to change currency" guide
- [ ] Document multi-business currency behavior
- [ ] Create troubleshooting guide

## 🔧 Quick Implementation Guide

### Step 1: Add Business Settings Hook to App

```typescript
// src/App.tsx
import { useBusinessSettings } from './hooks/useBusinessSettings';

const App = () => {
  useBusinessSettings();  // ✅ Ensures settings refresh on business switch
  
  return (
    <Routes>
      {/* ... */}
    </Routes>
  );
};
```

### Step 2: Enhance Settings Page

```typescript
// src/features/dashboard/pages/SettingsPage.tsx
import { useCurrency } from '../../../hooks/useCurrency';
import { selectCurrentBusiness } from '../../../store/slices/authSlice';

const SettingsPage = () => {
  const { currency } = useCurrency();
  const business = useSelector(selectCurrentBusiness);
  
  return (
    <div>
      {/* Business Context */}
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-gray-600">Editing settings for:</p>
        <p className="text-lg font-semibold">{business.name}</p>
        <p className="text-sm text-gray-600">
          Current Currency: {currency.name} ({currency.symbol})
        </p>
      </div>
      
      {/* Rest of settings */}
    </div>
  );
};
```

### Step 3: Add Currency Change Confirmation

```typescript
const handleCurrencyChange = (newCurrency: Currency) => {
  // Show confirmation dialog
  confirm({
    title: `Change currency for ${business.name}?`,
    description: `This will change the currency from ${currency.code} to ${newCurrency.code}.`,
    warning: 'This affects all monetary displays for this business only.',
    onConfirm: () => {
      dispatch(updateSettings({
        regional: { ...regional, currency: newCurrency }
      }));
    }
  });
};
```

## 🎯 Success Criteria

✅ **Functional**:
- Settings refresh automatically on business switch
- Each business maintains its own currency
- Currency changes don't affect other businesses
- Permissions control who can change currency

✅ **User Experience**:
- Clear indication of which business's settings are shown
- Warning dialog on currency change
- Read-only view for non-permitted users
- Smooth transition when switching businesses

✅ **Data Integrity**:
- No cross-business currency contamination
- Backend properly filters by business
- All API calls use correct business context
- Settings persist correctly per business

## 📖 Related Documentation

- `GLOBAL-CURRENCY-SYSTEM.md` - Technical implementation
- `PER-BUSINESS-CURRENCY-ARCHITECTURE.md` - Architecture details
- `GLOBAL-CURRENCY-IMPLEMENTATION-SUMMARY.md` - Migration roadmap

## 🚦 Current Status

**Architecture**: ✅ Correct (per-business from the start)  
**Backend**: ✅ Correct (filters by business)  
**API Service**: ✅ Correct (uses business context)  
**Redux**: ✅ Correct (stores current business settings)  
**Currency Hook**: ✅ Correct (uses current business currency)  

**Needs Work**:
- ⚠️ Business switch handler (ensure settings refresh)
- ⚠️ Settings UI (show business context clearly)
- ⚠️ Permission checks (UI restrictions)
- ⚠️ Change warnings (confirmation dialogs)

**Priority**: HIGH - Complete Phase 1 & 2 to ensure proper multi-business support
