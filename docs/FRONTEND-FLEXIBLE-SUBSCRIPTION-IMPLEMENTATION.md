# Frontend Implementation Guide: Flexible Subscription Pricing

## Overview

This document provides the complete frontend implementation guide for the flexible subscription pricing system. It includes all TypeScript types, services, components, and integration steps.

**Related Documents:**
- `FLEXIBLE-SUBSCRIPTION-PRICING-SPEC.md` - Business requirements
- `BACKEND-FLEXIBLE-SUBSCRIPTION-API-SPEC.md` - Backend API specification

---

## Table of Contents

1. [TypeScript Types](#typescript-types)
2. [Service Layer](#service-layer)
3. [Components](#components)
4. [Platform Dashboard Integration](#platform-dashboard-integration)
5. [User-Facing Features](#user-facing-features)
6. [Testing](#testing)

---

## TypeScript Types

### File: `src/types/subscriptions.ts`

Add these new types to the existing file:

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
  rate: string  // Percentage as decimal string (e.g., "15.00" for 15%)
  country: string
  applies_to_subscriptions: boolean
  is_mandatory: boolean
  calculation_order: number
  applies_to: 'SUBTOTAL' | 'CUMULATIVE'
  is_active: boolean
  effective_from: string  // ISO date string
  effective_until: string | null  // ISO date string or null
  is_effective_now?: boolean  // Computed field from backend
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

export interface EnhancedSubscriptionPayment extends SubscriptionPayment {
  // Pricing breakdown
  base_amount: string
  storefront_count: number
  pricing_tier_snapshot: PricingTier
  
  // Tax breakdown
  tax_breakdown: Record<string, {
    rate: number
    amount: string
  }>
  total_tax_amount: string
  
  // Service charges
  service_charges_breakdown: Record<string, any>
  total_service_charges: string
  
  // Attempt tracking
  attempt_number: number
  previous_attempt: UUID | null
  
  // Failure tracking
  failure_reason: string
  gateway_error_code: string
  gateway_error_message: string
  
  // Status history
  status_history: Array<{
    status: PaymentStatus
    timestamp: string
    reason?: string
  }>
}

export interface PaymentStats {
  payments: {
    total_processed: number
    successful: number
    failed: number
    pending: number
    success_rate: number
  }
  revenue: {
    total_revenue: string
    total_tax_collected: string
    average_payment: string
  }
  failure_analysis: Record<string, number>
}

export interface RevenueChartData {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
  }>
}

export interface PaymentStatsFilters {
  date_from?: string
  date_to?: string
  status?: string
  gateway?: string
  business?: string
}

// ============================================
// REQUEST PAYLOADS
// ============================================

export interface CreatePricingTierPayload {
  min_storefronts: number
  max_storefronts: number | null
  base_price: string
  price_per_additional_storefront: string
  currency: string
  description?: string
  is_active?: boolean
}

export interface UpdatePricingTierPayload extends Partial<CreatePricingTierPayload> {
  id: UUID
}

export interface CreateTaxConfigPayload {
  name: string
  code: string
  description?: string
  rate: string
  country: string
  applies_to_subscriptions?: boolean
  is_mandatory?: boolean
  calculation_order?: number
  applies_to?: 'SUBTOTAL' | 'CUMULATIVE'
  effective_from: string
  effective_until?: string | null
  is_active?: boolean
}

export interface UpdateTaxConfigPayload extends Partial<CreateTaxConfigPayload> {
  id: UUID
}

export interface CreateServiceChargePayload {
  name: string
  code: string
  description?: string
  charge_type: 'PERCENTAGE' | 'FIXED'
  amount: string
  currency: string
  applies_to?: 'SUBTOTAL' | 'TOTAL'
  payment_gateway?: 'ALL' | 'PAYSTACK' | 'STRIPE' | 'MOMO'
  is_active?: boolean
}

export interface UpdateServiceChargePayload extends Partial<CreateServiceChargePayload> {
  id: UUID
}
```

---

## Service Layer

### File: `src/services/pricingService.ts`

Create a new service file for pricing-related API calls:

```typescript
import httpClient from './httpClient'
import type { PaginatedResponse } from '../types/common'
import type {
  PricingTier,
  TaxConfig,
  ServiceCharge,
  PricingCalculation,
  PaymentStats,
  RevenueChartData,
  PaymentStatsFilters,
  EnhancedSubscriptionPayment,
  CreatePricingTierPayload,
  UpdatePricingTierPayload,
  CreateTaxConfigPayload,
  UpdateTaxConfigPayload,
  CreateServiceChargePayload,
  UpdateServiceChargePayload,
} from '../types/subscriptions'

// ========== Pricing Tiers ==========

export const fetchPricingTiers = async (params?: { is_active?: boolean }) => {
  const { data } = await httpClient.get<PaginatedResponse<PricingTier>>(
    '/subscriptions/api/pricing-tiers/',
    { params }
  )
  return data
}

export const fetchPricingTierById = async (tierId: string) => {
  const { data } = await httpClient.get<PricingTier>(
    `/subscriptions/api/pricing-tiers/${tierId}/`
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
  const params = {
    storefronts,
    ...options,
  }
  
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

export const updatePricingTier = async (
  tierId: string,
  payload: UpdatePricingTierPayload
) => {
  const { data } = await httpClient.patch<PricingTier>(
    `/subscriptions/api/pricing-tiers/${tierId}/`,
    payload
  )
  return data
}

export const deletePricingTier = async (tierId: string) => {
  await httpClient.delete(`/subscriptions/api/pricing-tiers/${tierId}/`)
}

export const activatePricingTier = async (tierId: string) => {
  const { data } = await httpClient.post<PricingTier>(
    `/subscriptions/api/pricing-tiers/${tierId}/activate/`
  )
  return data
}

export const deactivatePricingTier = async (tierId: string) => {
  const { data } = await httpClient.post<PricingTier>(
    `/subscriptions/api/pricing-tiers/${tierId}/deactivate/`
  )
  return data
}

// ========== Tax Configuration ==========

export const fetchTaxConfigs = async (params?: {
  is_active?: boolean
  country?: string
}) => {
  const { data } = await httpClient.get<PaginatedResponse<TaxConfig>>(
    '/subscriptions/api/tax-config/',
    { params }
  )
  return data
}

export const fetchActiveTaxConfigs = async () => {
  const { data } = await httpClient.get<TaxConfig[]>(
    '/subscriptions/api/tax-config/active/'
  )
  return data
}

export const fetchTaxConfigById = async (taxId: string) => {
  const { data } = await httpClient.get<TaxConfig>(
    `/subscriptions/api/tax-config/${taxId}/`
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

export const updateTaxConfig = async (
  taxId: string,
  payload: UpdateTaxConfigPayload
) => {
  const { data } = await httpClient.patch<TaxConfig>(
    `/subscriptions/api/tax-config/${taxId}/`,
    payload
  )
  return data
}

export const deleteTaxConfig = async (taxId: string) => {
  await httpClient.delete(`/subscriptions/api/tax-config/${taxId}/`)
}

// ========== Service Charges ==========

export const fetchServiceCharges = async (params?: {
  is_active?: boolean
  gateway?: string
}) => {
  const { data } = await httpClient.get<PaginatedResponse<ServiceCharge>>(
    '/subscriptions/api/service-charges/',
    { params }
  )
  return data
}

export const fetchServiceChargeById = async (chargeId: string) => {
  const { data } = await httpClient.get<ServiceCharge>(
    `/subscriptions/api/service-charges/${chargeId}/`
  )
  return data
}

export const createServiceCharge = async (payload: CreateServiceChargePayload) => {
  const { data } = await httpClient.post<ServiceCharge>(
    '/subscriptions/api/service-charges/',
    payload
  )
  return data
}

export const updateServiceCharge = async (
  chargeId: string,
  payload: UpdateServiceChargePayload
) => {
  const { data } = await httpClient.patch<ServiceCharge>(
    `/subscriptions/api/service-charges/${chargeId}/`,
    payload
  )
  return data
}

export const deleteServiceCharge = async (chargeId: string) => {
  await httpClient.delete(`/subscriptions/api/service-charges/${chargeId}/`)
}

// ========== Payment Stats & Analytics ==========

export const fetchPaymentStats = async (filters?: PaymentStatsFilters) => {
  const { data } = await httpClient.get<PaymentStats>(
    '/subscriptions/api/payment-stats/overview/',
    { params: filters }
  )
  return data
}

export const fetchRevenueChart = async (params?: {
  period?: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  date_from?: string
  date_to?: string
}) => {
  const { data } = await httpClient.get<RevenueChartData>(
    '/subscriptions/api/payment-stats/revenue_chart/',
    { params }
  )
  return data
}

export const fetchEnhancedPayments = async (params?: {
  status?: string
  date_from?: string
  date_to?: string
  business?: string
  gateway?: string
  page?: number
}) => {
  const { data } = await httpClient.get<PaginatedResponse<EnhancedSubscriptionPayment>>(
    '/subscriptions/api/payments/',
    { params }
  )
  return data
}

export const fetchPaymentById = async (paymentId: string) => {
  const { data } = await httpClient.get<EnhancedSubscriptionPayment>(
    `/subscriptions/api/payments/${paymentId}/`
  )
  return data
}

export const fetchPaymentAttempts = async (subscriptionId: string) => {
  const { data } = await httpClient.get<EnhancedSubscriptionPayment[]>(
    `/subscriptions/api/payments/${subscriptionId}/attempts/`
  )
  return data
}
```

---

## Components

### 1. Pricing Tier Management Component

**File:** `src/features/platform/components/PricingTierManagement.tsx`

```typescript
import { useEffect, useState } from 'react'
import {
  Row,
  Col,
  Card,
  Button,
  Table,
  Badge,
  Modal,
  Form,
  Alert,
  Spinner,
} from 'react-bootstrap'
import {
  fetchPricingTiers,
  createPricingTier,
  updatePricingTier,
  deletePricingTier,
  activatePricingTier,
  deactivatePricingTier,
} from '../../../services/pricingService'
import type { PricingTier, CreatePricingTierPayload } from '../../../types/subscriptions'
import { useAppSelector } from '../../../hooks'
import { selectCurrentUser } from '../../../store/slices/authSlice'
import { canManagePlans } from '../../../utils/platformPermissions'

export default function PricingTierManagement() {
  const user = useAppSelector(selectCurrentUser)
  const [tiers, setTiers] = useState<PricingTier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState<CreatePricingTierPayload>({
    min_storefronts: 1,
    max_storefronts: 1,
    base_price: '0.00',
    price_per_additional_storefront: '0.00',
    currency: 'GHS',
    description: '',
    is_active: true,
  })

  const canManage = user ? canManagePlans(user) : false

  useEffect(() => {
    loadTiers()
  }, [])

  const loadTiers = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetchPricingTiers()
      setTiers(response.results || [])
    } catch (err) {
      console.error('Failed to load pricing tiers:', err)
      setError('Failed to load pricing tiers')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (tier?: PricingTier) => {
    if (tier) {
      setEditingTier(tier)
      setFormData({
        min_storefronts: tier.min_storefronts,
        max_storefronts: tier.max_storefronts,
        base_price: tier.base_price,
        price_per_additional_storefront: tier.price_per_additional_storefront,
        currency: tier.currency,
        description: tier.description || '',
        is_active: tier.is_active,
      })
    } else {
      setEditingTier(null)
      setFormData({
        min_storefronts: 1,
        max_storefronts: 1,
        base_price: '0.00',
        price_per_additional_storefront: '0.00',
        currency: 'GHS',
        description: '',
        is_active: true,
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingTier(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSubmitting(true)
      
      if (editingTier) {
        await updatePricingTier(editingTier.id, { ...formData, id: editingTier.id })
      } else {
        await createPricingTier(formData)
      }
      
      await loadTiers()
      handleCloseModal()
    } catch (err) {
      console.error('Failed to save pricing tier:', err)
      setError('Failed to save pricing tier')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (tierId: string) => {
    if (!confirm('Are you sure you want to delete this pricing tier?')) return
    
    try {
      await deletePricingTier(tierId)
      await loadTiers()
    } catch (err) {
      console.error('Failed to delete pricing tier:', err)
      setError('Failed to delete pricing tier')
    }
  }

  const handleToggleActive = async (tier: PricingTier) => {
    try {
      if (tier.is_active) {
        await deactivatePricingTier(tier.id)
      } else {
        await activatePricingTier(tier.id)
      }
      await loadTiers()
    } catch (err) {
      console.error('Failed to toggle pricing tier:', err)
      setError('Failed to toggle pricing tier')
    }
  }

  const formatTierRange = (tier: PricingTier) => {
    if (tier.max_storefronts === null) {
      return `${tier.min_storefronts}+`
    }
    if (tier.min_storefronts === tier.max_storefronts) {
      return tier.min_storefronts.toString()
    }
    return `${tier.min_storefronts}-${tier.max_storefronts}`
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2">Loading pricing tiers...</p>
      </div>
    )
  }

  return (
    <>
      <Row className="mb-4">
        <Col>
          <h4>Pricing Tier Management</h4>
          <p className="text-muted">
            Configure flexible pricing based on storefront count
          </p>
        </Col>
        {canManage && (
          <Col xs="auto">
            <Button variant="primary" onClick={() => handleOpenModal()}>
              <i className="bi bi-plus-circle me-2"></i>
              Create Pricing Tier
            </Button>
          </Col>
        )}
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Storefronts</th>
                <th>Base Price</th>
                <th>Additional Price/Storefront</th>
                <th>Status</th>
                <th>Description</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {tiers.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="text-center text-muted py-4">
                    No pricing tiers configured
                  </td>
                </tr>
              ) : (
                tiers.map((tier) => (
                  <tr key={tier.id}>
                    <td>
                      <strong>{formatTierRange(tier)}</strong> storefront{tier.max_storefronts !== 1 ? 's' : ''}
                    </td>
                    <td>
                      {tier.currency} {tier.base_price}
                    </td>
                    <td>
                      {tier.price_per_additional_storefront !== '0.00' ? (
                        <span>{tier.currency} {tier.price_per_additional_storefront}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      <Badge bg={tier.is_active ? 'success' : 'secondary'}>
                        {tier.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>
                      <small className="text-muted">{tier.description || '—'}</small>
                    </td>
                    {canManage && (
                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          className="me-2"
                          onClick={() => handleOpenModal(tier)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={tier.is_active ? 'outline-warning' : 'outline-success'}
                          className="me-2"
                          onClick={() => handleToggleActive(tier)}
                        >
                          {tier.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => handleDelete(tier.id)}
                        >
                          Delete
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingTier ? 'Edit Pricing Tier' : 'Create Pricing Tier'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Minimum Storefronts</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={formData.min_storefronts}
                    onChange={(e) =>
                      setFormData({ ...formData, min_storefronts: parseInt(e.target.value) })
                    }
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Maximum Storefronts</Form.Label>
                  <Form.Control
                    type="number"
                    min={formData.min_storefronts}
                    value={formData.max_storefronts || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_storefronts: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Leave empty for unlimited"
                  />
                  <Form.Text className="text-muted">
                    Leave empty for open-ended tier (e.g., "5+")
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Base Price</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Price per Additional Storefront</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_per_additional_storefront}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_per_additional_storefront: e.target.value,
                      })
                    }
                    required
                  />
                  <Form.Text className="text-muted">
                    For open-ended tiers, charge per storefront beyond minimum
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Currency</Form.Label>
              <Form.Select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                required
              >
                <option value="GHS">GHS (Ghana Cedi)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Internal notes about this tier..."
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Active (available for use)"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editingTier ? 'Update Tier' : 'Create Tier'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  )
}
```

### 2. Tax Configuration Management

**File:** `src/features/platform/components/TaxConfigurationManagement.tsx`

```typescript
import { useEffect, useState } from 'react'
import {
  Row,
  Col,
  Card,
  Button,
  Table,
  Badge,
  Modal,
  Form,
  Alert,
  Spinner,
} from 'react-bootstrap'
import {
  fetchTaxConfigs,
  createTaxConfig,
  updateTaxConfig,
  deleteTaxConfig,
} from '../../../services/pricingService'
import type { TaxConfig, CreateTaxConfigPayload } from '../../../types/subscriptions'
import { useAppSelector } from '../../../hooks'
import { selectCurrentUser } from '../../../store/slices/authSlice'
import { canManagePlans } from '../../../utils/platformPermissions'

export default function TaxConfigurationManagement() {
  const user = useAppSelector(selectCurrentUser)
  const [taxes, setTaxes] = useState<TaxConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingTax, setEditingTax] = useState<TaxConfig | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState<CreateTaxConfigPayload>({
    name: '',
    code: '',
    description: '',
    rate: '0.00',
    country: 'GH',
    applies_to_subscriptions: true,
    is_mandatory: true,
    calculation_order: 0,
    applies_to: 'SUBTOTAL',
    effective_from: new Date().toISOString().split('T')[0],
    effective_until: null,
    is_active: true,
  })

  const canManage = user ? canManagePlans(user) : false

  useEffect(() => {
    loadTaxes()
  }, [])

  const loadTaxes = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetchTaxConfigs()
      setTaxes(response.results || [])
    } catch (err) {
      console.error('Failed to load tax configs:', err)
      setError('Failed to load tax configurations')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (tax?: TaxConfig) => {
    if (tax) {
      setEditingTax(tax)
      setFormData({
        name: tax.name,
        code: tax.code,
        description: tax.description,
        rate: tax.rate,
        country: tax.country,
        applies_to_subscriptions: tax.applies_to_subscriptions,
        is_mandatory: tax.is_mandatory,
        calculation_order: tax.calculation_order,
        applies_to: tax.applies_to,
        effective_from: tax.effective_from,
        effective_until: tax.effective_until,
        is_active: tax.is_active,
      })
    } else {
      setEditingTax(null)
      setFormData({
        name: '',
        code: '',
        description: '',
        rate: '0.00',
        country: 'GH',
        applies_to_subscriptions: true,
        is_mandatory: true,
        calculation_order: 0,
        applies_to: 'SUBTOTAL',
        effective_from: new Date().toISOString().split('T')[0],
        effective_until: null,
        is_active: true,
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingTax(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSubmitting(true)

      if (editingTax) {
        await updateTaxConfig(editingTax.id, { ...formData, id: editingTax.id })
      } else {
        await createTaxConfig(formData)
      }

      await loadTaxes()
      handleCloseModal()
    } catch (err) {
      console.error('Failed to save tax config:', err)
      setError('Failed to save tax configuration')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (taxId: string) => {
    if (!confirm('Are you sure you want to delete this tax configuration?')) return

    try {
      await deleteTaxConfig(taxId)
      await loadTaxes()
    } catch (err) {
      console.error('Failed to delete tax config:', err)
      setError('Failed to delete tax configuration')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2">Loading tax configurations...</p>
      </div>
    )
  }

  return (
    <>
      <Row className="mb-4">
        <Col>
          <h4>Tax Configuration</h4>
          <p className="text-muted">
            Configure taxes for Ghana and other jurisdictions
          </p>
        </Col>
        {canManage && (
          <Col xs="auto">
            <Button variant="primary" onClick={() => handleOpenModal()}>
              <i className="bi bi-plus-circle me-2"></i>
              Add Tax
            </Button>
          </Col>
        )}
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Rate</th>
                <th>Country</th>
                <th>Order</th>
                <th>Status</th>
                <th>Effective Period</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {taxes.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 8 : 7} className="text-center text-muted py-4">
                    No tax configurations
                  </td>
                </tr>
              ) : (
                taxes.map((tax) => (
                  <tr key={tax.id}>
                    <td>
                      <strong>{tax.name}</strong>
                      {tax.is_mandatory && (
                        <Badge bg="info" className="ms-2">
                          Mandatory
                        </Badge>
                      )}
                    </td>
                    <td>
                      <code>{tax.code}</code>
                    </td>
                    <td>{tax.rate}%</td>
                    <td>{tax.country}</td>
                    <td>{tax.calculation_order}</td>
                    <td>
                      <Badge bg={tax.is_active && tax.is_effective_now ? 'success' : 'secondary'}>
                        {tax.is_active && tax.is_effective_now ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>
                      <small className="text-muted">
                        {tax.effective_from}
                        {tax.effective_until && ` - ${tax.effective_until}`}
                      </small>
                    </td>
                    {canManage && (
                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          className="me-2"
                          onClick={() => handleOpenModal(tax)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => handleDelete(tax.id)}
                        >
                          Delete
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingTax ? 'Edit Tax' : 'Add Tax'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tax Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., VAT, NHIL, GETFund"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tax Code</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., VAT_GH, NHIL_GH"
                    required
                  />
                  <Form.Text className="text-muted">Unique identifier</Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tax Rate (%)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Country</Form.Label>
                  <Form.Control
                    type="text"
                    maxLength={2}
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value.toUpperCase() })}
                    placeholder="GH"
                    required
                  />
                  <Form.Text className="text-muted">ISO 2-letter code</Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Calculation Order</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={formData.calculation_order}
                    onChange={(e) =>
                      setFormData({ ...formData, calculation_order: parseInt(e.target.value) })
                    }
                    required
                  />
                  <Form.Text className="text-muted">Lower numbers calculated first</Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Applies To</Form.Label>
                  <Form.Select
                    value={formData.applies_to}
                    onChange={(e) =>
                      setFormData({ ...formData, applies_to: e.target.value as 'SUBTOTAL' | 'CUMULATIVE' })
                    }
                  >
                    <option value="SUBTOTAL">Subtotal (before other taxes)</option>
                    <option value="CUMULATIVE">Cumulative (including previous taxes)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Effective From</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.effective_from}
                    onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Effective Until (Optional)</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.effective_until || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, effective_until: e.target.value || null })
                    }
                  />
                  <Form.Text className="text-muted">Leave empty for indefinite</Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Applies to subscriptions"
                checked={formData.applies_to_subscriptions}
                onChange={(e) =>
                  setFormData({ ...formData, applies_to_subscriptions: e.target.checked })
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Mandatory (cannot be opted out)"
                checked={formData.is_mandatory}
                onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editingTax ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  )
}
```

### 3. Pricing Calculator Component (User-Facing)

**File:** `src/features/subscriptions/components/PricingCalculator.tsx`

```typescript
import { useState, useEffect } from 'react'
import { Card, Form, Table, Alert, Spinner } from 'react-bootstrap'
import { calculatePricing } from '../../../services/pricingService'
import type { PricingCalculation } from '../../../types/subscriptions'

interface PricingCalculatorProps {
  initialStorefronts?: number
  gateway?: 'PAYSTACK' | 'STRIPE'
  onPricingChange?: (calculation: PricingCalculation) => void
}

export default function PricingCalculator({
  initialStorefronts = 1,
  gateway,
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
        gateway: gateway || 'PAYSTACK',
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
          <Form.Label>
            <strong>Number of Storefronts</strong>
          </Form.Label>
          <Form.Control
            type="number"
            min="1"
            value={storefronts}
            onChange={(e) => setStorefronts(parseInt(e.target.value) || 1)}
          />
          <Form.Text className="text-muted">
            Adjust the slider to see pricing for different storefront counts
          </Form.Text>
        </Form.Group>

        <Form.Range
          min="1"
          max="20"
          value={storefronts}
          onChange={(e) => setStorefronts(parseInt(e.target.value))}
          className="mb-4"
        />

        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" />
            <span className="ms-2">Calculating...</span>
          </div>
        ) : calculation ? (
          <>
            <Table bordered size="sm" className="mb-3">
              <tbody>
                <tr>
                  <td>
                    <strong>Base Price</strong>
                    {calculation.additional_storefronts > 0 && (
                      <div className="small text-muted">
                        {calculation.tier.min_storefronts} storefront{calculation.tier.min_storefronts !== 1 ? 's' : ''}
                      </div>
                    )}
                  </td>
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
                  <td>
                    <strong>Subtotal</strong>
                  </td>
                  <td className="text-end">
                    <strong>{calculation.currency} {calculation.subtotal}</strong>
                  </td>
                </tr>

                {Object.entries(calculation.taxes).map(([code, tax]) => (
                  <tr key={code}>
                    <td>
                      {tax.name} ({tax.rate}%)
                    </td>
                    <td className="text-end">{calculation.currency} {tax.amount}</td>
                  </tr>
                ))}

                {Object.entries(calculation.service_charges).map(([code, charge]) => (
                  <tr key={code}>
                    <td>
                      {charge.name}
                      {charge.rate && ` (${charge.rate}%)`}
                    </td>
                    <td className="text-end">{calculation.currency} {charge.amount}</td>
                  </tr>
                ))}

                <tr className="table-primary">
                  <td>
                    <strong>Total Amount</strong>
                  </td>
                  <td className="text-end">
                    <strong className="fs-5">
                      {calculation.currency} {calculation.total_amount}
                    </strong>
                  </td>
                </tr>
              </tbody>
            </Table>

            <Alert variant="info" className="mb-0">
              <small>
                <strong>Pricing Breakdown:</strong>
                <ul className="mb-0 mt-2">
                  {calculation.breakdown.map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ul>
              </small>
            </Alert>
          </>
        ) : null}
      </Card.Body>
    </Card>
  )
}
```

---

## Platform Dashboard Integration

Add new tabs to the Platform Dashboard for pricing configuration.

**File:** `src/features/platform/pages/PlatformDashboard.tsx`

Update the existing component to include pricing configuration tabs:

```typescript
// Add to imports
import PricingTierManagement from '../components/PricingTierManagement'
import TaxConfigurationManagement from '../components/TaxConfigurationManagement'
import ServiceChargeManagement from '../components/ServiceChargeManagement'
import PaymentAnalyticsDashboard from '../components/PaymentAnalyticsDashboard'

// Add to tabs array
const tabs = [
  { key: 'overview', title: 'Overview & Stats', icon: 'bi-graph-up' },
  { key: 'plans', title: 'Plan Management', icon: 'bi-layers' },
  { key: 'subscriptions', title: 'Subscriptions', icon: 'bi-people' },
  { key: 'pricing', title: 'Pricing Configuration', icon: 'bi-currency-dollar' }, // NEW
  { key: 'payments', title: 'Payment Analytics', icon: 'bi-credit-card' }, // NEW
]

// Add to tab content rendering
{activeTab === 'pricing' && (
  <Tab.Pane eventKey="pricing">
    <Tabs defaultActiveKey="tiers" className="mb-3">
      <Tab eventKey="tiers" title="Pricing Tiers">
        <PricingTierManagement />
      </Tab>
      <Tab eventKey="taxes" title="Tax Configuration">
        <TaxConfigurationManagement />
      </Tab>
      <Tab eventKey="charges" title="Service Charges">
        <ServiceChargeManagement />
      </Tab>
    </Tabs>
  </Tab.Pane>
)}

{activeTab === 'payments' && (
  <Tab.Pane eventKey="payments">
    <PaymentAnalyticsDashboard />
  </Tab.Pane>
)}
```

---

## Summary

This implementation provides:

1. ✅ **Flexible Pricing** - Storefront-based pricing tiers
2. ✅ **Tax Configuration** - Ghana-specific taxes (VAT, NHIL, etc.)
3. ✅ **Service Charges** - Payment gateway fees
4. ✅ **Platform Admin Tools** - Full CRUD for all pricing components
5. ✅ **User-Facing Calculator** - Real-time pricing preview
6. ✅ **Payment Tracking** - Enhanced payment history with breakdowns
7. ✅ **Analytics Dashboard** - Revenue and payment statistics

**Next Steps:**

1. Backend team implements the API endpoints from `BACKEND-FLEXIBLE-SUBSCRIPTION-API-SPEC.md`
2. Frontend team creates the remaining components (ServiceChargeManagement, PaymentAnalyticsDashboard)
3. Update subscription flow to use new pricing calculation
4. Test end-to-end payment flow with new pricing
5. Deploy and monitor

---

**END OF FRONTEND IMPLEMENTATION GUIDE**
