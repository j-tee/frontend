# Frontend Quick Start Guide: Flexible Subscription Pricing

**For:** Frontend developers (React/TypeScript)  
**Time to complete:** 1-2 hours for initial setup  
**Prerequisites:** React/TypeScript project set up, understanding of subscription UI

---

## 🚀 Quick Setup (Copy-Paste Ready)

### Step 1: Add TypeScript Types

**File:** `src/types/subscriptions.ts`

Add these interfaces to your existing types file:

```typescript
// ============================================
// FLEXIBLE PRICING TYPES
// ============================================

export interface PricingTier {
  id: UUID
  min_storefronts: number
  max_storefronts: number | null
  base_price: string
  price_per_additional_storefront: string
  currency: string
  is_active: boolean
  description?: string
  created_at: string
  updated_at: string
}

export interface TaxConfig {
  id: UUID
  name: string
  code: string
  description: string
  rate: string
  country: string
  applies_to_subscriptions: boolean
  is_mandatory: boolean
  calculation_order: number
  applies_to: 'SUBTOTAL' | 'CUMULATIVE'
  is_active: boolean
  effective_from: string
  effective_until: string | null
  is_effective_now?: boolean
  created_at: string
  updated_at: string
}

export interface ServiceCharge {
  id: UUID
  name: string
  code: string
  description: string
  charge_type: 'PERCENTAGE' | 'FIXED'
  amount: string
  currency: string
  applies_to: 'SUBTOTAL' | 'TOTAL'
  payment_gateway: 'ALL' | 'PAYSTACK' | 'STRIPE' | 'MOMO'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PricingCalculation {
  storefronts: number
  tier: PricingTier
  base_price: string
  additional_storefronts: number
  additional_cost: string
  subtotal: string
  taxes: Record<string, {
    name: string
    rate: number
    amount: string
  }>
  total_tax: string
  service_charges: Record<string, {
    name: string
    type: string
    rate?: number
    amount: string
  }>
  total_service_charges: string
  total_amount: string
  currency: string
  breakdown: string[]
}

// Request payloads
export interface CreatePricingTierPayload {
  min_storefronts: number
  max_storefronts: number | null
  base_price: string
  price_per_additional_storefront: string
  currency: string
  description?: string
  is_active?: boolean
}

// ... copy other types from FRONTEND-FLEXIBLE-SUBSCRIPTION-IMPLEMENTATION.md
```

### Step 2: Create Pricing Service

**File:** `src/services/pricingService.ts`

Create new file with API functions:

```typescript
import httpClient from './httpClient'
import type { PaginatedResponse } from '../types/common'
import type {
  PricingTier,
  TaxConfig,
  ServiceCharge,
  PricingCalculation,
  CreatePricingTierPayload,
} from '../types/subscriptions'

// Pricing Tiers
export const fetchPricingTiers = async (params?: { is_active?: boolean }) => {
  const { data } = await httpClient.get<PaginatedResponse<PricingTier>>(
    '/subscriptions/api/pricing-tiers/',
    { params }
  )
  return data
}

export const calculatePricing = async (
  storefronts: number,
  options?: {
    include_taxes?: boolean
    include_charges?: boolean
    gateway?: string
  }
) => {
  const params = { storefronts, ...options }
  const { data } = await httpClient.get<PricingCalculation>(
    '/subscriptions/api/pricing-tiers/calculate/',
    { params }
  )
  return data
}

export const createPricingTier = async (payload: CreatePricingTierPayload) => {
  const { data } = await httpClient.post<PricingTier>(
    '/subscriptions/api/pricing-tiers/',
    payload
  )
  return data
}

// ... copy other functions from FRONTEND-FLEXIBLE-SUBSCRIPTION-IMPLEMENTATION.md
```

### Step 3: Test API Connection

Create a quick test component:

**File:** `src/features/subscriptions/components/PricingTest.tsx`

```typescript
import { useEffect, useState } from 'react'
import { calculatePricing } from '../../../services/pricingService'

export default function PricingTest() {
  const [pricing, setPricing] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const testPricing = async () => {
      try {
        const result = await calculatePricing(5)
        setPricing(result)
        console.log('Pricing calculation:', result)
      } catch (error) {
        console.error('Failed to calculate pricing:', error)
      } finally {
        setLoading(false)
      }
    }
    
    testPricing()
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <div className="p-4">
      <h3>Pricing Test</h3>
      {pricing && (
        <div>
          <p>Storefronts: {pricing.storefronts}</p>
          <p>Base Price: {pricing.currency} {pricing.base_price}</p>
          <p>Total Tax: {pricing.currency} {pricing.total_tax}</p>
          <p>Total Amount: {pricing.currency} {pricing.total_amount}</p>
        </div>
      )}
    </div>
  )
}
```

Add to your routes temporarily:

```typescript
// src/routes/AppRoutes.tsx
import PricingTest from '../features/subscriptions/components/PricingTest'

// Add route
<Route path="/pricing-test" element={<PricingTest />} />
```

Visit `http://localhost:3000/pricing-test` and check console.

### Step 4: Create Pricing Calculator Component

**File:** `src/features/subscriptions/components/PricingCalculator.tsx`

```typescript
import { useState, useEffect } from 'react'
import { Card, Form, Table, Spinner, Alert } from 'react-bootstrap'
import { calculatePricing } from '../../../services/pricingService'
import type { PricingCalculation } from '../../../types/subscriptions'

interface PricingCalculatorProps {
  initialStorefronts?: number
  gateway?: 'PAYSTACK' | 'STRIPE'
  onPricingChange?: (calculation: PricingCalculation) => void
}

export default function PricingCalculator({
  initialStorefronts = 1,
  gateway = 'PAYSTACK',
  onPricingChange,
}: PricingCalculatorProps) {
  const [storefronts, setStorefronts] = useState(initialStorefronts)
  const [calculation, setCalculation] = useState<PricingCalculation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPricing()
  }, [storefronts, gateway])

  const loadPricing = async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await calculatePricing(storefronts, {
        include_taxes: true,
        include_charges: true,
        gateway,
      })

      setCalculation(result)
      onPricingChange?.(result)
    } catch (err) {
      console.error('Failed to calculate pricing:', err)
      setError('Failed to calculate pricing')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">Pricing Calculator</h5>
      </Card.Header>
      <Card.Body>
        <Form.Group className="mb-4">
          <Form.Label><strong>Number of Storefronts</strong></Form.Label>
          <Form.Control
            type="number"
            min="1"
            value={storefronts}
            onChange={(e) => setStorefronts(parseInt(e.target.value) || 1)}
          />
        </Form.Group>

        <Form.Range
          min="1"
          max="20"
          value={storefronts}
          onChange={(e) => setStorefronts(parseInt(e.target.value))}
          className="mb-4"
        />

        {error && <Alert variant="danger">{error}</Alert>}

        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" />
            <span className="ms-2">Calculating...</span>
          </div>
        ) : calculation ? (
          <Table bordered size="sm">
            <tbody>
              <tr>
                <td><strong>Base Price</strong></td>
                <td className="text-end">{calculation.currency} {calculation.base_price}</td>
              </tr>
              {calculation.additional_storefronts > 0 && (
                <tr>
                  <td>
                    <strong>Additional Storefronts</strong>
                    <div className="small text-muted">
                      {calculation.additional_storefronts} × {calculation.currency}{' '}
                      {calculation.tier.price_per_additional_storefront}
                    </div>
                  </td>
                  <td className="text-end">{calculation.currency} {calculation.additional_cost}</td>
                </tr>
              )}
              <tr className="table-light">
                <td><strong>Subtotal</strong></td>
                <td className="text-end"><strong>{calculation.currency} {calculation.subtotal}</strong></td>
              </tr>
              {Object.entries(calculation.taxes).map(([code, tax]) => (
                <tr key={code}>
                  <td>{tax.name} ({tax.rate}%)</td>
                  <td className="text-end">{calculation.currency} {tax.amount}</td>
                </tr>
              ))}
              {Object.entries(calculation.service_charges).map(([code, charge]) => (
                <tr key={code}>
                  <td>{charge.name} {charge.rate && `(${charge.rate}%)`}</td>
                  <td className="text-end">{calculation.currency} {charge.amount}</td>
                </tr>
              ))}
              <tr className="table-primary">
                <td><strong>Total Amount</strong></td>
                <td className="text-end">
                  <strong className="fs-5">{calculation.currency} {calculation.total_amount}</strong>
                </td>
              </tr>
            </tbody>
          </Table>
        ) : null}
      </Card.Body>
    </Card>
  )
}
```

### Step 5: Add to Subscription Portal

Update `src/features/subscriptions/pages/SubscriptionPortal.tsx`:

```typescript
// Add import
import PricingCalculator from '../components/PricingCalculator'

// In component, add state for storefront count
const [storefrontCount, setStorefrontCount] = useState(1)
const [pricingCalculation, setPricingCalculation] = useState<PricingCalculation | null>(null)

// Add to JSX
<Row className="mb-4">
  <Col>
    <PricingCalculator
      initialStorefronts={storefrontCount}
      gateway={paymentGateway}
      onPricingChange={setPricingCalculation}
    />
  </Col>
</Row>
```

### Step 6: Create Admin Components (Platform Admins Only)

**File:** `src/features/platform/components/PricingTierManagement.tsx`

```typescript
// Copy complete component from FRONTEND-FLEXIBLE-SUBSCRIPTION-IMPLEMENTATION.md
// Or see simplified version below
```

Simplified version for quick start:

```typescript
import { useEffect, useState } from 'react'
import { Card, Table, Button, Spinner } from 'react-bootstrap'
import { fetchPricingTiers } from '../../../services/pricingService'
import type { PricingTier } from '../../../types/subscriptions'

export default function PricingTierManagement() {
  const [tiers, setTiers] = useState<PricingTier[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTiers()
  }, [])

  const loadTiers = async () => {
    try {
      const response = await fetchPricingTiers()
      setTiers(response.results || [])
    } catch (error) {
      console.error('Failed to load pricing tiers:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-5"><Spinner animation="border" /></div>
  }

  return (
    <Card>
      <Card.Header>
        <h5>Pricing Tiers</h5>
      </Card.Header>
      <Card.Body>
        <Table>
          <thead>
            <tr>
              <th>Storefronts</th>
              <th>Base Price</th>
              <th>Additional Price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier) => (
              <tr key={tier.id}>
                <td>
                  {tier.min_storefronts}
                  {tier.max_storefronts ? `-${tier.max_storefronts}` : '+'}
                </td>
                <td>{tier.currency} {tier.base_price}</td>
                <td>{tier.currency} {tier.price_per_additional_storefront}</td>
                <td>{tier.is_active ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  )
}
```

### Step 7: Add to Platform Dashboard

Update `src/features/platform/pages/PlatformDashboard.tsx`:

```typescript
// Add import
import PricingTierManagement from '../components/PricingTierManagement'

// Add tab
const tabs = [
  // ... existing tabs
  { key: 'pricing', title: 'Pricing Configuration', icon: 'bi-currency-dollar' },
]

// Add tab content
{activeTab === 'pricing' && (
  <Tab.Pane eventKey="pricing">
    <PricingTierManagement />
  </Tab.Pane>
)}
```

---

## ✅ Quick Verification

Test your setup:

1. **Types compile without errors:**
   ```bash
   npm run build
   # or
   npm run type-check
   ```

2. **Pricing calculator works:**
   - Navigate to subscription portal
   - See pricing calculator
   - Change storefront count
   - See price update in real-time

3. **Platform admin can see pricing tiers:**
   - Login as platform admin
   - Navigate to `/app/platform`
   - Click "Pricing Configuration" tab
   - See list of pricing tiers

4. **API calls work:**
   - Open browser DevTools
   - Network tab
   - See API calls to `/subscriptions/api/pricing-tiers/`
   - Verify responses

---

## 🧪 Quick Test

Create `src/features/subscriptions/__tests__/PricingCalculator.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PricingCalculator from '../components/PricingCalculator'
import * as pricingService from '../../../services/pricingService'

jest.mock('../../../services/pricingService')

describe('PricingCalculator', () => {
  const mockCalculation = {
    storefronts: 5,
    tier: { min_storefronts: 5, max_storefronts: null },
    base_price: '200.00',
    subtotal: '200.00',
    total_amount: '246.00',
    currency: 'GHS',
    taxes: {},
    service_charges: {},
    breakdown: [],
  }

  beforeEach(() => {
    (pricingService.calculatePricing as jest.Mock).mockResolvedValue(mockCalculation)
  })

  it('renders pricing calculator', () => {
    render(<PricingCalculator />)
    expect(screen.getByText('Pricing Calculator')).toBeInTheDocument()
  })

  it('calculates pricing on storefront change', async () => {
    render(<PricingCalculator initialStorefronts={1} />)
    
    const input = screen.getByRole('spinbutton')
    await userEvent.clear(input)
    await userEvent.type(input, '5')

    await waitFor(() => {
      expect(pricingService.calculatePricing).toHaveBeenCalledWith(5, expect.anything())
    })
  })
})
```

Run tests:

```bash
npm test
```

---

## 🎨 Styling Tips

### Bootstrap Classes

```tsx
// Success/Active badge
<Badge bg="success">Active</Badge>

// Price display
<div className="fs-4 fw-bold text-primary">
  GHS 369.00
</div>

// Breakdown table
<Table bordered size="sm" className="mb-3">
  {/* ... */}
</Table>

// Loading spinner
<Spinner animation="border" size="sm" className="me-2" />
```

### Custom CSS (optional)

```css
/* src/features/subscriptions/PricingCalculator.css */

.pricing-calculator {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.pricing-total {
  font-size: 1.5rem;
  font-weight: bold;
  color: #0d6efd;
}

.pricing-breakdown {
  font-size: 0.875rem;
  color: #6c757d;
}
```

---

## 🔍 Common Issues & Solutions

### Issue: "Type 'PricingCalculation' not found"
**Solution:** Make sure you've added types to `src/types/subscriptions.ts`

### Issue: "API call returns 404"
**Solution:** Verify backend is running and URL is correct

```typescript
// Check your httpClient base URL
console.log(httpClient.defaults.baseURL)
// Should be something like: http://localhost:8000
```

### Issue: "CORS error"
**Solution:** Backend needs to allow your frontend origin

```python
# Django settings.py
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',  # Vite default
]
```

### Issue: "Authentication required"
**Solution:** Make sure auth token is included

```typescript
// Check httpClient interceptor
httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

---

## 📊 Testing Checklist

Quick manual tests:

- [ ] Pricing calculator renders
- [ ] Storefront count can be changed
- [ ] Price updates in real-time
- [ ] Taxes are displayed
- [ ] Service charges are shown
- [ ] Total is calculated correctly
- [ ] Platform admin can see pricing tiers
- [ ] Platform admin sees tax configurations
- [ ] No console errors
- [ ] Network requests succeed

---

## 🎯 Next Steps

After quick setup:

1. **Build full admin components** (see full implementation guide)
2. **Add form validation** for creating/editing tiers
3. **Implement modal dialogs** for create/edit
4. **Add loading states** everywhere
5. **Handle errors gracefully**
6. **Add success messages**
7. **Write comprehensive tests**
8. **Optimize performance** (memoization, lazy loading)

---

## 📚 Reference

- **Full Frontend Guide:** `FRONTEND-FLEXIBLE-SUBSCRIPTION-IMPLEMENTATION.md`
- **TypeScript Types:** Section "TypeScript Types"
- **Components:** Section "Components"
- **Service Layer:** Section "Service Layer"

---

## 🆘 Need Help?

- **Types not working?** → Check `FRONTEND-FLEXIBLE-SUBSCRIPTION-IMPLEMENTATION.md` → Section "TypeScript Types"
- **API calls failing?** → Check network tab, verify backend is running
- **Components not rendering?** → Check console for errors
- **Styling issues?** → Use Bootstrap classes from examples

---

## 🚀 Full Implementation Timeline

- **Quick setup:** 1-2 hours (this guide)
- **Basic UI:** 1 week
- **Full implementation:** 3 weeks
- **Testing & polish:** 1 week

---

**Ready to start?** Begin with Step 1 above! 🎨

**Questions?** Check the full implementation guide or ask the team!
