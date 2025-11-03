# Flexible Subscription Pricing System - Specification

## Overview

This document specifies a flexible, storefront-based subscription pricing system for the POS platform, replacing the current fixed-plan model with dynamic pricing tiers that scale based on the number of storefronts.

**Key Features:**
- Dynamic pricing based on storefront count
- Platform admin configurable pricing tiers
- Tax and service charge support (Ghana-specific)
- Comprehensive payment tracking (successful, failed, attempted)
- Platform admin dashboard for all payment information

---

## Business Requirements

### Pricing Model

**Base Pricing Structure:**
| Storefronts | Price (GHS) |
|-------------|-------------|
| 1           | 100         |
| 2           | 150         |
| 3           | 180         |
| 4           | 200         |
| 5+          | 200 + (50 × additional storefronts) |

**Example Calculations:**
- 1 storefront = GHS 100
- 2 storefronts = GHS 150
- 3 storefronts = GHS 180
- 4 storefronts = GHS 200
- 5 storefronts = GHS 250 (200 + 50)
- 6 storefronts = GHS 300 (200 + 100)
- 10 storefronts = GHS 500 (200 + 300)

### Ghana Tax and Service Charges

**Tax Types:**
1. **VAT (Value Added Tax)** - Currently 15% in Ghana (as of 2024)
2. **NHIL (National Health Insurance Levy)** - 2.5%
3. **GETFund Levy** - 2.5%
4. **COVID-19 Health Recovery Levy** - 1%

**Total Standard Tax Rate:** ~21% (may vary based on government policy)

**Service Charges:**
- Payment gateway fees (Paystack/Stripe)
- Mobile Money transaction fees
- Other applicable service charges

**Example Invoice:**
```
Base Price (3 storefronts):        GHS 180.00
VAT (15%):                          GHS  27.00
NHIL (2.5%):                        GHS   4.50
GETFund (2.5%):                     GHS   4.50
COVID-19 Levy (1%):                 GHS   1.80
Payment Gateway Fee (2%):           GHS   3.60
-------------------------------------------
Total Amount:                       GHS 221.40
```

---

## Technical Requirements

### 1. Database Schema Changes

#### New Table: `SubscriptionPricingTier`
```python
class SubscriptionPricingTier(models.Model):
    """Dynamic pricing tiers based on storefront count"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    
    # Tier definition
    min_storefronts = models.IntegerField(help_text="Minimum storefronts for this tier")
    max_storefronts = models.IntegerField(null=True, blank=True, help_text="Maximum storefronts (null = unlimited)")
    
    # Pricing
    base_price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Base price for this tier")
    price_per_additional_storefront = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=3, default='GHS')
    
    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        ordering = ['min_storefronts']
        unique_together = [['min_storefronts', 'max_storefronts']]
```

#### New Table: `TaxConfiguration`
```python
class TaxConfiguration(models.Model):
    """Configurable tax rates for different regions/countries"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    
    name = models.CharField(max_length=100)  # e.g., "VAT", "NHIL", "GETFund"
    code = models.CharField(max_length=20, unique=True)  # e.g., "VAT_GH", "NHIL_GH"
    description = models.TextField(blank=True)
    
    # Tax details
    rate = models.DecimalField(max_digits=5, decimal_places=2, help_text="Tax rate as percentage (e.g., 15.00 for 15%)")
    country = models.CharField(max_length=2, default='GH')  # ISO country code
    
    # Application rules
    applies_to_subscriptions = models.BooleanField(default=True)
    is_mandatory = models.BooleanField(default=True)
    calculation_order = models.IntegerField(default=0, help_text="Order in which tax is calculated")
    
    # Status
    is_active = models.BooleanField(default=True)
    effective_from = models.DateField()
    effective_until = models.DateField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['calculation_order', 'name']
```

#### New Table: `ServiceCharge`
```python
class ServiceCharge(models.Model):
    """Configurable service charges"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    
    # Charge details
    charge_type = models.CharField(
        max_length=20,
        choices=[
            ('PERCENTAGE', 'Percentage'),
            ('FIXED', 'Fixed Amount')
        ]
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='GHS')
    
    # Application
    applies_to = models.CharField(
        max_length=20,
        choices=[
            ('SUBTOTAL', 'Subtotal (before tax)'),
            ('TOTAL', 'Total (after tax)')
        ],
        default='SUBTOTAL'
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### Enhanced: `SubscriptionPayment`
```python
class SubscriptionPayment(models.Model):
    """Enhanced payment tracking with detailed breakdown"""
    # ... existing fields ...
    
    # NEW: Pricing breakdown
    base_amount = models.DecimalField(max_digits=10, decimal_places=2)
    storefront_count = models.IntegerField()
    pricing_tier_snapshot = models.JSONField(help_text="Snapshot of pricing tier used")
    
    # NEW: Tax breakdown
    tax_breakdown = models.JSONField(
        default=dict,
        help_text="""
        {
            "VAT": {"rate": 15.00, "amount": 27.00},
            "NHIL": {"rate": 2.50, "amount": 4.50},
            ...
        }
        """
    )
    total_tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # NEW: Service charges
    service_charges_breakdown = models.JSONField(
        default=dict,
        help_text="""
        {
            "payment_gateway": {"type": "PERCENTAGE", "rate": 2.00, "amount": 3.60},
            ...
        }
        """
    )
    total_service_charges = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # NEW: Payment attempt tracking
    attempt_number = models.IntegerField(default=1)
    previous_attempt = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL)
    
    # NEW: Failure tracking
    failure_reason = models.TextField(blank=True)
    gateway_error_code = models.CharField(max_length=50, blank=True)
    gateway_error_message = models.TextField(blank=True)
    
    # Status history
    status_history = models.JSONField(
        default=list,
        help_text="""
        [
            {"status": "PENDING", "timestamp": "2024-01-01T10:00:00Z"},
            {"status": "FAILED", "timestamp": "2024-01-01T10:05:00Z", "reason": "Insufficient funds"},
            ...
        ]
        """
    )
```

---

### 2. Backend API Endpoints

#### A. Pricing Tier Management (Platform Admin Only)

```
GET    /subscriptions/api/pricing-tiers/
POST   /subscriptions/api/pricing-tiers/
PATCH  /subscriptions/api/pricing-tiers/{id}/
DELETE /subscriptions/api/pricing-tiers/{id}/
POST   /subscriptions/api/pricing-tiers/{id}/activate/
POST   /subscriptions/api/pricing-tiers/{id}/deactivate/
GET    /subscriptions/api/pricing-tiers/calculate/?storefronts=5
```

**Example GET Response:**
```json
{
  "count": 5,
  "results": [
    {
      "id": "uuid-1",
      "min_storefronts": 1,
      "max_storefronts": 1,
      "base_price": "100.00",
      "price_per_additional_storefront": "0.00",
      "currency": "GHS",
      "is_active": true
    },
    {
      "id": "uuid-2",
      "min_storefronts": 2,
      "max_storefronts": 2,
      "base_price": "150.00",
      "price_per_additional_storefront": "0.00",
      "currency": "GHS",
      "is_active": true
    },
    {
      "id": "uuid-5",
      "min_storefronts": 5,
      "max_storefronts": null,
      "base_price": "200.00",
      "price_per_additional_storefront": "50.00",
      "currency": "GHS",
      "is_active": true
    }
  ]
}
```

**Calculate Endpoint Response:**
```json
{
  "storefronts": 7,
  "tier": {
    "id": "uuid-5",
    "min_storefronts": 5,
    "base_price": "200.00",
    "price_per_additional_storefront": "50.00"
  },
  "base_price": "200.00",
  "additional_storefronts": 2,
  "additional_cost": "100.00",
  "subtotal": "300.00",
  "taxes": {
    "VAT": {"rate": 15.00, "amount": "45.00"},
    "NHIL": {"rate": 2.50, "amount": "7.50"},
    "GETFund": {"rate": 2.50, "amount": "7.50"},
    "COVID_19": {"rate": 1.00, "amount": "3.00"}
  },
  "total_tax": "63.00",
  "service_charges": {
    "payment_gateway": {"type": "PERCENTAGE", "rate": 2.00, "amount": "6.00"}
  },
  "total_service_charges": "6.00",
  "total_amount": "369.00",
  "breakdown": [
    "Base Price (5 storefronts): GHS 200.00",
    "Additional 2 storefronts @ GHS 50: GHS 100.00",
    "Subtotal: GHS 300.00",
    "VAT (15%): GHS 45.00",
    "NHIL (2.5%): GHS 7.50",
    "GETFund (2.5%): GHS 7.50",
    "COVID-19 Levy (1%): GHS 3.00",
    "Payment Gateway Fee (2%): GHS 6.00",
    "Total: GHS 369.00"
  ]
}
```

#### B. Tax Configuration (Platform Admin Only)

```
GET    /subscriptions/api/tax-config/
POST   /subscriptions/api/tax-config/
PATCH  /subscriptions/api/tax-config/{id}/
DELETE /subscriptions/api/tax-config/{id}/
POST   /subscriptions/api/tax-config/{id}/activate/
POST   /subscriptions/api/tax-config/{id}/deactivate/
GET    /subscriptions/api/tax-config/active/  # Get all active taxes
```

#### C. Service Charge Configuration (Platform Admin Only)

```
GET    /subscriptions/api/service-charges/
POST   /subscriptions/api/service-charges/
PATCH  /subscriptions/api/service-charges/{id}/
DELETE /subscriptions/api/service-charges/{id}/
POST   /subscriptions/api/service-charges/{id}/activate/
POST   /subscriptions/api/service-charges/{id}/deactivate/
```

#### D. Enhanced Payment Tracking

```
GET    /subscriptions/api/payments/
       ?status=SUCCESSFUL,FAILED,PENDING
       &date_from=2024-01-01
       &date_to=2024-12-31
       &business=uuid
       &gateway=PAYSTACK

GET    /subscriptions/api/payments/{id}/
GET    /subscriptions/api/payments/stats/
       # Returns: total_revenue, success_rate, failure_reasons, etc.

GET    /subscriptions/api/payments/{id}/attempts/
       # All payment attempts for a subscription
```

#### E. Platform Admin Dashboard Data

```
GET    /subscriptions/api/platform-dashboard/overview/
Response:
{
  "payments": {
    "total_processed": 1500,
    "successful": 1420,
    "failed": 65,
    "pending": 15,
    "success_rate": 94.67,
    "total_revenue": "GHS 425,000.00"
  },
  "revenue": {
    "today": "GHS 5,200.00",
    "this_month": "GHS 45,000.00",
    "last_month": "GHS 42,300.00",
    "growth_percentage": 6.38
  },
  "taxes_collected": {
    "VAT": "GHS 63,750.00",
    "NHIL": "GHS 10,625.00",
    "GETFund": "GHS 10,625.00",
    "COVID_19": "GHS 4,250.00",
    "total": "GHS 89,250.00"
  },
  "failure_analysis": {
    "insufficient_funds": 35,
    "card_declined": 18,
    "network_error": 8,
    "other": 4
  }
}

GET    /subscriptions/api/platform-dashboard/payments/
       # Paginated list of all payments with filters

GET    /subscriptions/api/platform-dashboard/revenue-chart/
       ?period=MONTHLY  # or WEEKLY, DAILY
Response:
{
  "labels": ["Jan", "Feb", "Mar", ...],
  "datasets": [
    {
      "label": "Revenue",
      "data": [35000, 38000, 42000, ...]
    },
    {
      "label": "Taxes",
      "data": [7350, 7980, 8820, ...]
    }
  ]
}
```

---

### 3. Frontend Changes

#### A. New Types

```typescript
// src/types/subscriptions.ts

export interface PricingTier {
  id: UUID
  min_storefronts: number
  max_storefronts: number | null
  base_price: string
  price_per_additional_storefront: string
  currency: string
  is_active: boolean
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
  is_active: boolean
  effective_from: string
  effective_until: string | null
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
  is_active: boolean
}

export interface PricingCalculation {
  storefronts: number
  tier: PricingTier
  base_price: string
  additional_storefronts: number
  additional_cost: string
  subtotal: string
  taxes: Record<string, { rate: number; amount: string }>
  total_tax: string
  service_charges: Record<string, { type: string; rate?: number; amount: string }>
  total_service_charges: string
  total_amount: string
  breakdown: string[]
}

export interface EnhancedSubscriptionPayment extends SubscriptionPayment {
  base_amount: string
  storefront_count: number
  pricing_tier_snapshot: PricingTier
  tax_breakdown: Record<string, { rate: number; amount: string }>
  total_tax_amount: string
  service_charges_breakdown: Record<string, any>
  total_service_charges: string
  attempt_number: number
  failure_reason: string
  gateway_error_code: string
  gateway_error_message: string
  status_history: Array<{
    status: PaymentStatus
    timestamp: string
    reason?: string
  }>
}

export interface PaymentStats {
  total_processed: number
  successful: number
  failed: number
  pending: number
  success_rate: number
  total_revenue: string
  average_payment: string
  failure_reasons: Record<string, number>
}
```

#### B. New Services

```typescript
// src/services/pricingService.ts

export const fetchPricingTiers = async () => {
  const { data } = await httpClient.get<PaginatedResponse<PricingTier>>(
    '/subscriptions/api/pricing-tiers/'
  )
  return data
}

export const calculatePricing = async (storefronts: number) => {
  const { data } = await httpClient.get<PricingCalculation>(
    `/subscriptions/api/pricing-tiers/calculate/?storefronts=${storefronts}`
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

// Tax configuration
export const fetchTaxConfigs = async () => {
  const { data } = await httpClient.get<PaginatedResponse<TaxConfig>>(
    '/subscriptions/api/tax-config/'
  )
  return data
}

export const createTaxConfig = async (payload: CreateTaxConfigPayload) => {
  const { data } = await httpClient.post<TaxConfig>(
    '/subscriptions/api/tax-config/',
    payload
  )
  return data
}

// Service charges
export const fetchServiceCharges = async () => {
  const { data } = await httpClient.get<PaginatedResponse<ServiceCharge>>(
    '/subscriptions/api/service-charges/'
  )
  return data
}

// Payment stats
export const fetchPaymentStats = async (filters?: PaymentStatsFilters) => {
  const { data } = await httpClient.get<PaymentStats>(
    '/subscriptions/api/payments/stats/',
    { params: filters }
  )
  return data
}
```

#### C. New Components

1. **`PricingTierManagement.tsx`** - Platform admin component for managing pricing tiers
2. **`TaxConfigurationManagement.tsx`** - Manage tax rates
3. **`ServiceChargeManagement.tsx`** - Manage service charges
4. **`PaymentDashboard.tsx`** - Comprehensive payment analytics
5. **`PricingCalculator.tsx`** - Visual pricing calculator for users
6. **`InvoicePreview.tsx`** - Show detailed invoice breakdown before payment

#### D. Enhanced Platform Dashboard

Add new tabs to `/app/platform`:
- **Pricing Configuration** - Manage tiers, taxes, service charges
- **Payment Analytics** - Comprehensive payment dashboard
- **Revenue Reports** - Tax collection, revenue trends

---

## Implementation Plan

### Phase 1: Database & Backend (Week 1-2)

1. **Day 1-2:** Create new models (PricingTier, TaxConfig, ServiceCharge)
2. **Day 3-4:** Enhance SubscriptionPayment model
3. **Day 5-7:** Create API endpoints for pricing tier management
4. **Day 8-10:** Create tax and service charge APIs
5. **Day 11-12:** Implement pricing calculation logic
6. **Day 13-14:** Create platform dashboard analytics endpoints

### Phase 2: Frontend Core (Week 3)

1. **Day 1-2:** Add TypeScript types
2. **Day 3-4:** Create service layer functions
3. **Day 5-7:** Build PricingTierManagement component

### Phase 3: Frontend Admin UI (Week 4)

1. **Day 1-3:** Build TaxConfigurationManagement component
2. **Day 4-5:** Build ServiceChargeManagement component
3. **Day 6-7:** Integrate into Platform Dashboard

### Phase 4: User-Facing Features (Week 5)

1. **Day 1-3:** Build PricingCalculator component
2. **Day 4-5:** Build InvoicePreview component
3. **Day 6-7:** Update subscription flow to use dynamic pricing

### Phase 5: Analytics & Reporting (Week 6)

1. **Day 1-3:** Build PaymentDashboard component
2. **Day 4-5:** Build revenue charts and analytics
3. **Day 6-7:** Testing and bug fixes

### Phase 6: Testing & Deployment (Week 7)

1. **Day 1-2:** Integration testing
2. **Day 3-4:** User acceptance testing
3. **Day 5:** Performance testing
4. **Day 6-7:** Deploy to production

---

## User Stories

### Platform Admin

1. **As a platform admin**, I want to set pricing tiers based on storefront count, so that businesses pay fairly based on their scale.

2. **As a platform admin**, I want to configure tax rates (VAT, NHIL, etc.), so that all invoices comply with Ghana tax regulations.

3. **As a platform admin**, I want to add service charges (payment gateway fees), so that all costs are transparent to customers.

4. **As a platform admin**, I want to see all payment attempts (successful, failed, pending), so that I can monitor system health and assist users.

5. **As a platform admin**, I want to view revenue analytics broken down by taxes and service charges, so that I can track financial performance.

### Business Owner

1. **As a business owner**, I want to see the price automatically calculated based on my storefront count, so that I know exactly what I'll pay.

2. **As a business owner**, I want to see a detailed invoice breakdown showing base price, taxes, and service charges, so that I understand what I'm paying for.

3. **As a business owner**, I want to see my payment history including failed attempts, so that I can track my subscription expenses.

---

## Security Considerations

1. **Access Control:**
   - Only SUPER_ADMIN and ADMIN can modify pricing tiers
   - Only SUPER_ADMIN and ADMIN can modify tax configs
   - All platform employees can view payment data
   - Business owners can only see their own payment history

2. **Data Privacy:**
   - Payment gateway tokens are encrypted
   - Gateway responses stored securely
   - PII (card numbers, etc.) never stored, only reference IDs

3. **Audit Trail:**
   - All pricing tier changes logged with user and timestamp
   - All tax configuration changes logged
   - Payment status changes tracked in status_history

---

## Testing Requirements

### Unit Tests

1. Pricing calculation logic
2. Tax calculation logic
3. Service charge calculation logic
4. Payment status transitions

### Integration Tests

1. Create pricing tier → Calculate pricing
2. Update tax rates → Recalculate invoice
3. Payment attempt → Status updates → Payment history

### User Acceptance Tests

1. Platform admin creates pricing tier
2. Platform admin configures taxes
3. Business subscribes with 3 storefronts
4. Invoice shows correct breakdown
5. Payment succeeds → Status updates
6. Payment fails → Retry flow
7. Dashboard shows all payments

---

## Migration Strategy

### For Existing Subscriptions

1. **One-time migration script:**
   ```python
   # Create default pricing tiers
   tiers = [
       (1, 1, 100.00, 0.00),
       (2, 2, 150.00, 0.00),
       (3, 3, 180.00, 0.00),
       (4, 4, 200.00, 0.00),
       (5, None, 200.00, 50.00),
   ]
   
   for min_sf, max_sf, base, additional in tiers:
       PricingTier.objects.create(
           min_storefronts=min_sf,
           max_storefronts=max_sf,
           base_price=base,
           price_per_additional_storefront=additional,
           currency='GHS'
       )
   
   # Create default tax configs
   taxes = [
       ('VAT', 'VAT_GH', 15.00),
       ('NHIL', 'NHIL_GH', 2.50),
       ('GETFund', 'GETFUND_GH', 2.50),
       ('COVID-19 Levy', 'COVID19_GH', 1.00),
   ]
   
   for name, code, rate in taxes:
       TaxConfiguration.objects.create(
           name=name,
           code=code,
           rate=rate,
           country='GH',
           effective_from=date.today()
       )
   ```

2. **Existing subscriptions:**
   - Keep current plan pricing
   - Next renewal uses new dynamic pricing
   - Or offer one-time migration to new pricing

---

## Success Metrics

1. **Pricing Flexibility:**
   - Platform admin can change pricing in < 2 minutes
   - Pricing changes reflect immediately

2. **Tax Compliance:**
   - 100% of invoices show correct Ghana taxes
   - Tax rates can be updated without code changes

3. **Payment Tracking:**
   - 100% of payment attempts logged
   - Failure reasons captured for 95%+ of failed payments

4. **Admin Visibility:**
   - Platform dashboard loads in < 2 seconds
   - Payment data available for last 12 months minimum

---

## Appendix

### A. Ghana Tax Rates (As of 2024)

| Tax | Rate | Applied To |
|-----|------|------------|
| VAT | 15% | Goods and services |
| NHIL | 2.5% | Goods and services |
| GETFund Levy | 2.5% | Goods and services |
| COVID-19 Health Recovery Levy | 1% | Goods and services |

**Note:** Tax rates may change based on Ghana government policy. The system allows platform admins to update rates without code changes.

### B. Payment Gateway Fees

| Gateway | Type | Rate |
|---------|------|------|
| Paystack | Percentage | 1.95% + GHS 0.50 |
| Stripe | Percentage | 2.9% + $0.30 |
| Mobile Money | Fixed/Percentage | Varies by provider |

---

## Changelog

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2024-11-02 | Initial specification | System |

---

**END OF SPECIFICATION**
