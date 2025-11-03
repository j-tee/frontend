/**
 * PricingTierManagement Component
 * 
 * REPLACES: PlanManagement (obsolete plan-based system)
 * 
 * PURPOSE:
 * - Manage subscription pricing tiers based on storefront count
 * - Configure flexible pricing (e.g., 1-2 storefronts = GHS 100, 5+ = GHS 200 + GHS 50/additional)
 * - Platform admin interface for pricing configuration
 * 
 * SECURITY:
 * - Users cannot select plans (security vulnerability fixed)
 * - Pricing is auto-calculated from actual storefront count
 * - This interface shows admins what users will be charged
 */

import { useEffect, useState } from 'react'
import {
  Row,
  Col,
  Card,
  Button,
  Spinner,
  Alert,
  Modal,
  Form,
  Badge,
  Table
} from 'react-bootstrap'
import {
  fetchPricingTiers,
  createPricingTier,
  updatePricingTier,
  activatePricingTier,
  deactivatePricingTier,
  deletePricingTier
} from '../../../services/pricingService'
import type { PricingTier, CreatePricingTierPayload } from '../../../types/subscriptions'
import { useAppSelector } from '../../../hooks'
import { useCurrency } from '../../../hooks/useCurrency'
import { selectCurrentUser } from '../../../store/slices/authSlice'
import { canManagePlans } from '../../../utils/platformPermissions'

export default function PricingTierManagement() {
  const user = useAppSelector(selectCurrentUser)
  const { formatCurrency } = useCurrency()
  const [tiers, setTiers] = useState<PricingTier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null)
  const [formData, setFormData] = useState<CreatePricingTierPayload>({
    name: '',
    min_storefronts: 1,
    max_storefronts: 1,
    base_price: '100.00',
    base_storefronts: 1,
    price_per_additional_storefront: '0.00',
    currency: 'GHS',
    description: '',
    is_active: true
  })
  const [submitting, setSubmitting] = useState(false)

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
      setError('Failed to load pricing tiers')
      console.error('Failed to load pricing tiers:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (tier?: PricingTier) => {
    if (tier) {
      setEditingTier(tier)
      setFormData({
        name: tier.name,
        min_storefronts: tier.min_storefronts,
        max_storefronts: tier.max_storefronts,
        base_price: tier.base_price,
        base_storefronts: tier.base_storefronts,
        price_per_additional_storefront: tier.price_per_additional_storefront,
        currency: tier.currency,
        description: tier.description || '',
        is_active: tier.is_active
      })
    } else {
      setEditingTier(null)
      setFormData({
        name: '',
        min_storefronts: 1,
        max_storefronts: 1,
        base_price: '100.00',
        base_storefronts: 1,
        price_per_additional_storefront: '0.00',
        currency: 'GHS',
        description: '',
        is_active: true
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
      alert('Failed to save pricing tier. Please try again.')
      console.error('Failed to save pricing tier:', err)
    } finally {
      setSubmitting(false)
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
      alert('Failed to update pricing tier status')
      console.error('Failed to toggle pricing tier:', err)
    }
  }

  const handleDelete = async (tier: PricingTier) => {
    if (!window.confirm(`Are you sure you want to delete the "${tier.name}" pricing tier? This action cannot be undone.`)) {
      return
    }
    
    try {
      await deletePricingTier(tier.id)
      await loadTiers()
    } catch (err) {
      alert('Failed to delete pricing tier')
      console.error('Failed to delete pricing tier:', err)
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

  const calculateExamplePrice = (tier: PricingTier, storefronts: number) => {
    const basePrice = parseFloat(tier.base_price)
    const additionalPrice = parseFloat(tier.price_per_additional_storefront)
    
    if (storefronts <= tier.base_storefronts) {
      return basePrice
    }
    
    const additionalCount = storefronts - tier.base_storefronts
    return basePrice + (additionalCount * additionalPrice)
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-3">Loading pricing tiers...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Pricing Tiers</Alert.Heading>
        <p>{error}</p>
        <Button variant="outline-danger" onClick={loadTiers}>
          Try Again
        </Button>
      </Alert>
    )
  }

  return (
    <>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h4>Subscription Pricing Tiers</h4>
              <p className="text-muted mb-0">
                Configure flexible pricing based on storefront count. Users are automatically charged based on their actual storefront count.
              </p>
            </div>
            {canManage && (
              <Button
                variant="primary"
                className="pricing-tier-cta"
                onClick={() => handleOpenModal()}
              >
                <i className="bi bi-plus-circle"></i>
                Create Pricing Tier
              </Button>
            )}
          </div>
        </Col>
      </Row>

      {!canManage && (
        <Alert variant="warning" className="mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          You have view-only access to pricing tiers. Contact a super admin to make changes.
        </Alert>
      )}

      <Row>
        <Col>
          <Card>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Tier Name</th>
                    <th>Storefronts</th>
                    <th>Base Price</th>
                    <th>Additional Price</th>
                    <th>Example Pricing</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((tier) => (
                    <tr key={tier.id}>
                      <td>
                        <strong>{tier.name}</strong>
                        <br />
                        {tier.description && (
                          <small className="text-muted">{tier.description}</small>
                        )}
                      </td>
                      <td>
                        <Badge bg="info" className="fs-6">
                          {formatTierRange(tier)}
                        </Badge>
                      </td>
                      <td>
                        <strong>{tier.currency} {tier.base_price}</strong>
                        <br />
                        <small className="text-muted">
                          (for {tier.base_storefronts} {tier.base_storefronts === 1 ? 'storefront' : 'storefronts'})
                        </small>
                      </td>
                      <td>
                        {parseFloat(tier.price_per_additional_storefront) > 0 ? (
                          <>
                            <strong>{tier.currency} {tier.price_per_additional_storefront}</strong>
                            <br />
                            <small className="text-muted">per additional storefront</small>
                          </>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <small>
                          {tier.min_storefronts} store: {tier.currency} {formatCurrency(calculateExamplePrice(tier, tier.min_storefronts))}
                          {tier.max_storefronts && tier.max_storefronts > tier.min_storefronts && (
                            <>
                              <br />
                              {tier.max_storefronts} stores: {tier.currency} {formatCurrency(calculateExamplePrice(tier, tier.max_storefronts))}
                            </>
                          )}
                          {tier.max_storefronts === null && (
                            <>
                              <br />
                              10 stores: {tier.currency} {formatCurrency(calculateExamplePrice(tier, 10))}
                            </>
                          )}
                        </small>
                      </td>
                      <td>
                        <Badge bg={tier.is_active ? 'success' : 'secondary'}>
                          {tier.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>
                        {canManage && (
                          <div className="d-flex flex-wrap gap-2 justify-content-end">
                            <Button
                              variant="light"
                              size="sm"
                              className="tier-action-btn tier-action-edit"
                              onClick={() => handleOpenModal(tier)}
                              title="Edit pricing tier"
                            >
                              <i className="bi bi-pencil"></i>
                              Edit
                            </Button>
                            <Button
                              variant="light"
                              size="sm"
                              className={`tier-action-btn ${tier.is_active ? 'tier-action-pause' : 'tier-action-activate'}`}
                              onClick={() => handleToggleActive(tier)}
                              title={tier.is_active ? 'Deactivate tier' : 'Activate tier'}
                            >
                              <i className={tier.is_active ? 'bi bi-pause-circle' : 'bi bi-play-circle'}></i>
                              {tier.is_active ? 'Pause' : 'Activate'}
                            </Button>
                            <Button
                              variant="light"
                              size="sm"
                              className="tier-action-btn tier-action-delete"
                              onClick={() => handleDelete(tier)}
                              title="Delete pricing tier"
                            >
                              <i className="bi bi-trash"></i>
                              Delete
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {tiers.length === 0 && (
                <Alert variant="info">
                  <i className="bi bi-info-circle me-2"></i>
                  No pricing tiers found. Create your first tier to get started.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Help Card */}
      <Row className="mt-4">
        <Col>
          <Card className="border-info">
            <Card.Body>
              <h6 className="text-info">
                <i className="bi bi-lightbulb me-2"></i>
                How Pricing Tiers Work
              </h6>
              <ul className="mb-0 small">
                <li>
                  <strong>Storefront Range:</strong> Define min/max storefronts for this tier (e.g., 1-2, 3-4, 5+)
                </li>
                <li>
                  <strong>Base Price:</strong> The price charged for the base number of storefronts
                </li>
                <li>
                  <strong>Additional Price:</strong> Extra charge per storefront beyond the base (for open-ended tiers like "5+")
                </li>
                <li>
                  <strong>Auto-Calculation:</strong> Users are automatically charged based on their actual storefront count - no manual selection
                </li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingTier ? 'Edit Pricing Tier' : 'Create New Pricing Tier'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {/* Tier Name */}
            <Form.Group className="mb-3">
              <Form.Label>Tier Name *</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Starter, Business, Enterprise"
              />
              <Form.Text className="text-muted">
                Internal name for this pricing tier
              </Form.Text>
            </Form.Group>

            {/* Storefront Range */}
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Minimum Storefronts *</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={formData.min_storefronts}
                    onChange={(e) => setFormData({ ...formData, min_storefronts: parseInt(e.target.value) })}
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
                    value={formData.max_storefronts ?? ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      max_storefronts: e.target.value ? parseInt(e.target.value) : null 
                    })}
                    placeholder="Leave blank for open-ended (e.g., 5+)"
                  />
                  <Form.Text className="text-muted">
                    Leave blank for unlimited (e.g., "5+ storefronts")
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            {/* Pricing */}
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Currency *</Form.Label>
                  <Form.Select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    required
                  >
                    <option value="GHS">GHS (Ghana)</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Base Storefronts *</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={formData.base_storefronts}
                    onChange={(e) => setFormData({ ...formData, base_storefronts: parseInt(e.target.value) })}
                    required
                  />
                  <Form.Text className="text-muted">
                    How many storefronts included in base price
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Base Price *</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                    required
                  />
                  <Form.Text className="text-muted">
                    Price for base storefronts
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Price Per Additional Storefront</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                min="0"
                value={formData.price_per_additional_storefront}
                onChange={(e) => setFormData({ ...formData, price_per_additional_storefront: e.target.value })}
              />
              <Form.Text className="text-muted">
                Extra charge per storefront beyond base storefronts (for open-ended tiers)
              </Form.Text>
            </Form.Group>

            {/* Description */}
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Internal notes about this tier..."
              />
            </Form.Group>

            {/* Active Status */}
            <Form.Check
              type="checkbox"
              label="Active (Available for automatic pricing calculation)"
              checked={formData.is_active || false}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />

            {/* Preview */}
            {formData.base_price && (
              <Alert variant="info" className="mt-3">
                <strong>Preview:</strong> Users with {formData.base_storefronts} {formData.base_storefronts === 1 ? 'storefront' : 'storefronts'} will pay {formData.currency} {formData.base_price}/month
                {parseFloat(formData.price_per_additional_storefront) > 0 && (
                  <>
                    <br />
                    Each additional storefront: +{formData.currency} {formData.price_per_additional_storefront}/month
                  </>
                )}
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Saving...
                </>
              ) : (
                editingTier ? 'Update Tier' : 'Create Tier'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  )
}
