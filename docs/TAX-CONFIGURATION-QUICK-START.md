# Tax Configuration - Quick Start Guide

**5-Minute Setup Guide for Developers**

---

## 🎯 What You Need to Know

1. ✅ **All files are created** - Types, services, and components ready
2. ✅ **Backend handles calculations** - Frontend only displays
3. ✅ **Three main components** - TaxList, PricingBreakdown, TaxManagement

---

## 🚀 Quick Integration

### Step 1: Add to Your Subscription Page (2 minutes)

Show pricing breakdown during checkout:

```tsx
// src/features/subscriptions/pages/SubscriptionCheckout.tsx
import { PricingBreakdown } from '../components'

export const SubscriptionCheckout = () => {
  const [storefronts, setStorefronts] = useState(3)

  return (
    <div>
      <h2>Review Subscription</h2>
      
      {/* Storefront selector */}
      <input 
        type="number" 
        value={storefronts}
        onChange={e => setStorefronts(Number(e.target.value))}
      />

      {/* Auto-calculates pricing with taxes */}
      <PricingBreakdown 
        storefronts={storefronts}
        gateway="PAYSTACK"
      />

      <button>Continue to Payment</button>
    </div>
  )
}
```

**Done!** Users now see complete pricing breakdown with taxes.

---

### Step 2: Add Admin Tax Management (1 minute)

Add to your admin routes:

```tsx
// src/App.tsx or routes file
import { TaxConfigPage } from './features/subscriptions/pages/TaxConfigPage'

// In your admin routes
<Route path="/admin/tax-config" element={
  <RequirePermission permission="is_staff">
    <TaxConfigPage />
  </RequirePermission>
} />
```

**Done!** Admins can now manage tax configurations.

---

### Step 3: Show Active Taxes (Optional, 1 minute)

Display which taxes apply:

```tsx
import { TaxList } from '@/features/subscriptions/components'

<TaxList 
  activeOnly={true}
  title="Applicable Taxes"
/>
```

**Done!** Users see which taxes will be applied.

---

## 📦 Available Components

### 1. `<PricingBreakdown />` - Pricing Calculator
**Use for**: Checkout, payment summary, invoices

```tsx
<PricingBreakdown 
  storefronts={3}              // Required: number of storefronts
  gateway="PAYSTACK"           // Optional: payment gateway
  showTierBreakdown={true}     // Optional: show tier info
/>
```

### 2. `<TaxList />` - Tax Display
**Use for**: Settings, info pages, checkout info

```tsx
<TaxList 
  activeOnly={true}            // Optional: show only active
  title="Applicable Taxes"     // Optional: custom title
/>
```

### 3. `<TaxManagement />` - Admin Interface
**Use for**: Admin settings (auto-included in TaxConfigPage)

```tsx
<RequirePermission permission="is_staff">
  <TaxManagement />
</RequirePermission>
```

---

## 🔑 Key Points

### ✅ DO:
- Use `PricingBreakdown` for all pricing displays
- Let backend calculate taxes
- Show breakdown before payment
- Restrict tax management to admins

### ❌ DON'T:
- Calculate taxes on frontend
- Modify tax amounts client-side
- Show tax management to regular users
- Skip showing tax breakdown to users

---

## 🧪 Quick Test

### Test User View:
1. Navigate to subscription page
2. Select number of storefronts
3. Verify pricing breakdown shows
4. Check taxes are listed
5. Verify total is correct

### Test Admin Functions:
1. Login as admin (`is_staff=True`)
2. Navigate to `/admin/tax-config`
3. Create a test tax
4. Edit the tax
5. Delete the test tax

---

## 📊 Example Output

When user selects 3 storefronts with Paystack:

```
Subscription Payment Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Base Price (3 storefronts)    GHS 180.00

Taxes:
  VAT (15%)                    GHS  27.00
  NHIL (2.5%)                  GHS   4.50
  GETFund (2.5%)               GHS   4.50
  COVID Levy (1%)              GHS   1.80
                              ─────────
  Total Tax                    GHS  37.80

Service Charges:
  Payment Gateway Fee (2%)     GHS   4.36
                              ─────────

TOTAL AMOUNT                   GHS 222.16
```

---

## 🔧 Troubleshooting

**Component not found?**
```tsx
// Make sure you import from the right path
import { PricingBreakdown } from '@/features/subscriptions/components'
// or
import { PricingBreakdown } from '../components'
```

**No taxes showing?**
- Check backend is running
- Verify taxes are configured in admin
- Check browser console for errors

**Permission error?**
- Tax management requires `is_staff=True`
- Regular users can only view
- Wrap admin components in `RequirePermission`

---

## 📝 Common Patterns

### Pattern 1: Subscription Flow
```tsx
// Step 1: Select plan
<PlanCard />

// Step 2: Choose storefronts
<StorefrontSelector />

// Step 3: Show pricing (with taxes)
<PricingBreakdown storefronts={selected} />

// Step 4: Payment
<PaymentButton />
```

### Pattern 2: Settings Page
```tsx
<Tabs>
  <Tab label="Subscription">
    <TaxList activeOnly={true} />
  </Tab>
  <Tab label="Billing">
    <PaymentHistory />
  </Tab>
</Tabs>
```

### Pattern 3: Admin Panel
```tsx
<AdminLayout>
  <Sidebar>
    <Link to="/admin/tax-config">Tax Configuration</Link>
  </Sidebar>
  <Content>
    <Route path="/admin/tax-config" element={<TaxConfigPage />} />
  </Content>
</AdminLayout>
```

---

## 🎓 Next Steps

1. ✅ Integrate `PricingBreakdown` in checkout
2. ✅ Add `TaxConfigPage` to admin routes
3. ✅ Test with different storefront counts
4. ✅ Verify admin functions work
5. ✅ Deploy to staging for testing

---

## 📞 Need Help?

- **Full Documentation**: `docs/TAX-CONFIGURATION-FRONTEND-IMPLEMENTATION.md`
- **Backend API Guide**: See main API documentation
- **Component Source**: `src/features/subscriptions/components/`
- **Type Definitions**: `src/types/subscriptions.ts`

---

**Last Updated**: November 2, 2025  
**Status**: Production Ready ✅
