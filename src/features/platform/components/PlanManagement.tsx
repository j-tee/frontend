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
  fetchAllPlans,
  createPlan,
  updatePlan,
  activatePlan,
  deactivatePlan,
  deletePlan
} from '../../../services/platformService'
import type { Plan } from '../../../types/subscriptions'
import type { CreatePlanPayload, BillingCycle } from '../../../types/platform'
import { useAppSelector } from '../../../hooks'
import { selectCurrentUser } from '../../../store/slices/authSlice'
import { canManagePlans } from '../../../utils/platformPermissions'

export default function PlanManagement() {
  const user = useAppSelector(selectCurrentUser)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [formData, setFormData] = useState<CreatePlanPayload>({
    name: '',
    description: '',
    price: '0.00',
    currency: 'GHS',
    billing_cycle: 'MONTHLY',
    max_storefronts: 1,
    max_users: 1,
    max_products: 100,
    features: {
      multi_storefront: false,
      advanced_reports: false,
      api_access: false,
      priority_support: false,
      custom_branding: false,
    },
    is_popular: false,
    is_active: true
  })
  const [submitting, setSubmitting] = useState(false)

  const canManage = user ? canManagePlans(user) : false

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetchAllPlans()
      setPlans(response.results || response.data || [])
    } catch (err) {
      console.error('Failed to load plans:', err)
      setError('Failed to load subscription plans')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan)
      const planFeatures = typeof plan.features === 'object' && !Array.isArray(plan.features) 
        ? plan.features 
        : {
            multi_storefront: false,
            advanced_reports: false,
            api_access: false,
            priority_support: false,
            custom_branding: false,
          }
      
      setFormData({
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        billing_cycle: plan.billing_cycle as BillingCycle,
        max_storefronts: plan.max_storefronts || null,
        max_users: plan.max_users || null,
        max_products: plan.max_products || null,
        features: planFeatures,
        is_popular: plan.is_popular,
        is_active: plan.is_active
      })
    } else {
      setEditingPlan(null)
      setFormData({
        name: '',
        description: '',
        price: '0.00',
        currency: 'GHS',
        billing_cycle: 'MONTHLY',
        max_storefronts: 1,
        max_users: 1,
        max_products: 100,
        features: {
          multi_storefront: false,
          advanced_reports: false,
          api_access: false,
          priority_support: false,
          custom_branding: false,
        },
        is_popular: false,
        is_active: true
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingPlan(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSubmitting(true)
      
      if (editingPlan) {
        await updatePlan(editingPlan.id, formData)
      } else {
        await createPlan(formData)
      }
      
      await loadPlans()
      handleCloseModal()
    } catch (err) {
      console.error('Failed to save plan:', err)
      alert('Failed to save plan. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (plan: Plan) => {
    try {
      if (plan.is_active) {
        await deactivatePlan(plan.id)
      } else {
        await activatePlan(plan.id)
      }
      await loadPlans()
    } catch (err) {
      console.error('Failed to toggle plan status:', err)
      alert('Failed to update plan status')
    }
  }

  const handleDelete = async (plan: Plan) => {
    if (!window.confirm(`Are you sure you want to delete the "${plan.name}" plan? This action cannot be undone.`)) {
      return
    }
    
    try {
      await deletePlan(plan.id)
      await loadPlans()
    } catch (err) {
      console.error('Failed to delete plan:', err)
      alert('Failed to delete plan')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-3">Loading plans...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Plans</Alert.Heading>
        <p>{error}</p>
      </Alert>
    )
  }

  return (
    <>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h4>Subscription Plans</h4>
            {canManage && (
              <Button variant="primary" onClick={() => handleOpenModal()}>
                + Create New Plan
              </Button>
            )}
          </div>
        </Col>
      </Row>

      {!canManage && (
        <Alert variant="warning" className="mb-4">
          You have view-only access to subscription plans. Contact a super admin to make changes.
        </Alert>
      )}

      <Row>
        <Col>
          <Card>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Billing</th>
                    <th>Limits</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.id}>
                      <td>
                        <strong>{plan.name}</strong>
                        {plan.is_popular && (
                          <Badge bg="primary" className="ms-2">Popular</Badge>
                        )}
                        <br />
                        <small className="text-muted">{plan.description}</small>
                      </td>
                      <td>
                        <strong>{plan.currency} {plan.price}</strong>
                      </td>
                      <td>{plan.billing_cycle}</td>
                      <td>
                        <small>
                          {plan.max_storefronts || 'Unlimited'} storefronts<br />
                          {plan.max_users || 'Unlimited'} users<br />
                          {plan.max_products || 'Unlimited'} products
                        </small>
                      </td>
                      <td>
                        <Badge bg={plan.is_active ? 'success' : 'secondary'}>
                          {plan.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          {canManage && (
                            <>
                              <Button
                                variant="outline-primary"
                                onClick={() => handleOpenModal(plan)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant={plan.is_active ? 'outline-warning' : 'outline-success'}
                                onClick={() => handleToggleActive(plan)}
                              >
                                {plan.is_active ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button
                                variant="outline-danger"
                                onClick={() => handleDelete(plan)}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {plans.length === 0 && (
                <Alert variant="info">
                  No subscription plans found. Create your first plan to get started.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingPlan ? 'Edit Plan' : 'Create New Plan'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Plan Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
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
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description *</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Price *</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Billing Cycle *</Form.Label>
                  <Form.Select
                    value={formData.billing_cycle}
                    onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value as BillingCycle })}
                    required
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Max Storefronts</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={formData.max_storefronts ?? ''}
                    onChange={(e) => setFormData({ ...formData, max_storefronts: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Unlimited"
                  />
                  <Form.Text className="text-muted">Leave blank for unlimited</Form.Text>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Max Users</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={formData.max_users ?? ''}
                    onChange={(e) => setFormData({ ...formData, max_users: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Unlimited"
                  />
                  <Form.Text className="text-muted">Leave blank for unlimited</Form.Text>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Max Products</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={formData.max_products ?? ''}
                    onChange={(e) => setFormData({ ...formData, max_products: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Unlimited"
                  />
                  <Form.Text className="text-muted">Leave blank for unlimited</Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Features</Form.Label>
              <div>
                <Form.Check
                  type="checkbox"
                  label="Multi-Storefront Management"
                  checked={formData.features.multi_storefront || false}
                  onChange={(e) => setFormData({
                    ...formData,
                    features: { ...formData.features, multi_storefront: e.target.checked }
                  })}
                />
                <Form.Check
                  type="checkbox"
                  label="Advanced Reports"
                  checked={formData.features.advanced_reports || false}
                  onChange={(e) => setFormData({
                    ...formData,
                    features: { ...formData.features, advanced_reports: e.target.checked }
                  })}
                />
                <Form.Check
                  type="checkbox"
                  label="API Access"
                  checked={formData.features.api_access || false}
                  onChange={(e) => setFormData({
                    ...formData,
                    features: { ...formData.features, api_access: e.target.checked }
                  })}
                />
                <Form.Check
                  type="checkbox"
                  label="Priority Support"
                  checked={formData.features.priority_support || false}
                  onChange={(e) => setFormData({
                    ...formData,
                    features: { ...formData.features, priority_support: e.target.checked }
                  })}
                />
                <Form.Check
                  type="checkbox"
                  label="Custom Branding"
                  checked={formData.features.custom_branding || false}
                  onChange={(e) => setFormData({
                    ...formData,
                    features: { ...formData.features, custom_branding: e.target.checked }
                  })}
                />
              </div>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Check
                  type="checkbox"
                  label="Mark as Popular Plan"
                  checked={formData.is_popular || false}
                  onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                />
              </Col>
              <Col md={6}>
                <Form.Check
                  type="checkbox"
                  label="Active (Available for Purchase)"
                  checked={formData.is_active || false}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  )
}
