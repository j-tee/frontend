import { useEffect, useState } from 'react'
import {
  Card,
  Button,
  Table,
  Badge,
  Modal,
  Form,
  Row,
  Col,
  Alert,
  Spinner
} from 'react-bootstrap'
import {
  fetchUserRoles,
  fetchRoles,
  assignUserRole,
  removeUserRole
} from '../../../services/rbacService'
import type { UserRole, Role } from '../../../types/rbac'
import { useAppSelector } from '../../../hooks'
import { selectCurrentUser } from '../../../store/slices/authSlice'
import { isSuperAdmin } from '../../../utils/platformPermissions'

export default function UserRoleAssignment() {
  const currentUser = useAppSelector(selectCurrentUser)
  const [userRoles, setUserRoles] = useState<UserRole[]>([])
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [formData, setFormData] = useState({
    userId: '',
    roleId: '',
    scope: 'BUSINESS' as 'PLATFORM' | 'BUSINESS' | 'STOREFRONT',
    businessId: '',
    storefrontId: '',
    expiresAt: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [userRolesData, rolesData] = await Promise.all([
        fetchUserRoles(),
        fetchRoles()
      ])
      setUserRoles(userRolesData)
      setAvailableRoles(rolesData)
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Failed to load user roles'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = () => {
    setFormData({
      userId: '',
      roleId: '',
      scope: 'BUSINESS',
      businessId: '',
      storefrontId: '',
      expiresAt: ''
    })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    try {
      await assignUserRole({
        user_id: parseInt(formData.userId),
        role_id: parseInt(formData.roleId),
        scope: formData.scope,
        business_id: formData.businessId ? parseInt(formData.businessId) : undefined,
        storefront_id: formData.storefrontId ? parseInt(formData.storefrontId) : undefined,
        expires_at: formData.expiresAt || undefined
      })
      setMessage({
        type: 'success',
        text: 'Role assigned successfully!'
      })
      setShowModal(false)
      loadData()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to assign role'
      })
    }
  }

  const handleRemove = async (userRoleId: number) => {
    if (!window.confirm('Are you sure you want to remove this role assignment?')) {
      return
    }
    try {
      await removeUserRole(userRoleId)
      setMessage({
        type: 'success',
        text: 'Role removed successfully!'
      })
      loadData()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to remove role'
      })
    }
  }

  const getScopeBadgeVariant = (scope: string) => {
    switch (scope) {
      case 'PLATFORM':
        return 'danger'
      case 'BUSINESS':
        return 'primary'
      case 'STOREFRONT':
        return 'info'
      default:
        return 'secondary'
    }
  }

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  return (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">User Role Assignments</h5>
        {isSuperAdmin(currentUser) && (
          <Button variant="primary" size="sm" onClick={handleAssign}>
            + Assign Role
          </Button>
        )}
      </Card.Header>
      <Card.Body>
        {message && (
          <Alert
            variant={message.type === 'success' ? 'success' : 'danger'}
            dismissible
            onClose={() => setMessage(null)}
          >
            {message.text}
          </Alert>
        )}

        <Table responsive hover>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Scope</th>
              <th>Business/Storefront</th>
              <th>Assigned By</th>
              <th>Assigned At</th>
              <th>Expires At</th>
              <th>Status</th>
              {isSuperAdmin(currentUser) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {userRoles.length === 0 ? (
              <tr>
                <td colSpan={isSuperAdmin(currentUser) ? 9 : 8} className="text-center text-muted py-4">
                  No role assignments found
                </td>
              </tr>
            ) : (
              userRoles.map((userRole) => (
                <tr key={userRole.id}>
                  <td>User #{userRole.user}</td>
                  <td>
                    {userRole.role_details?.name || `Role #${userRole.role}`}
                  </td>
                  <td>
                    <Badge bg={getScopeBadgeVariant(userRole.scope)}>
                      {userRole.scope}
                    </Badge>
                  </td>
                  <td>
                    {userRole.business && `Business #${userRole.business}`}
                    {userRole.storefront && `Storefront #${userRole.storefront}`}
                    {!userRole.business && !userRole.storefront && '-'}
                  </td>
                  <td>User #{userRole.assigned_by}</td>
                  <td>{new Date(userRole.assigned_at).toLocaleDateString()}</td>
                  <td>
                    {userRole.expires_at ? (
                      <span className={isExpired(userRole.expires_at) ? 'text-danger' : ''}>
                        {new Date(userRole.expires_at).toLocaleDateString()}
                        {isExpired(userRole.expires_at) && ' (Expired)'}
                      </span>
                    ) : (
                      'Never'
                    )}
                  </td>
                  <td>
                    <Badge bg={userRole.is_active && !isExpired(userRole.expires_at) ? 'success' : 'secondary'}>
                      {userRole.is_active && !isExpired(userRole.expires_at) ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  {isSuperAdmin(currentUser) && (
                    <td>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleRemove(userRole.id)}
                      >
                        Remove
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card.Body>

      {/* Assign Role Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Assign Role to User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>User ID *</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    placeholder="Enter user ID"
                    required
                  />
                  <Form.Text className="text-muted">
                    Enter the ID of the user to assign the role to
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Role *</Form.Label>
                  <Form.Select
                    value={formData.roleId}
                    onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                    required
                  >
                    <option value="">Select a role</option>
                    {availableRoles.filter(r => r.is_active).map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name} ({role.level})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Scope *</Form.Label>
                  <Form.Select
                    value={formData.scope}
                    onChange={(e) => setFormData({
                      ...formData,
                      scope: e.target.value as 'PLATFORM' | 'BUSINESS' | 'STOREFRONT'
                    })}
                  >
                    <option value="PLATFORM">Platform-wide</option>
                    <option value="BUSINESS">Business-specific</option>
                    <option value="STOREFRONT">Storefront-specific</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Business ID</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.businessId}
                    onChange={(e) => setFormData({ ...formData, businessId: e.target.value })}
                    placeholder="Optional"
                    disabled={formData.scope === 'PLATFORM'}
                  />
                  <Form.Text className="text-muted">
                    Required for BUSINESS scope
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Storefront ID</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.storefrontId}
                    onChange={(e) => setFormData({ ...formData, storefrontId: e.target.value })}
                    placeholder="Optional"
                    disabled={formData.scope !== 'STOREFRONT'}
                  />
                  <Form.Text className="text-muted">
                    Required for STOREFRONT scope
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Expires At (Optional)</Form.Label>
              <Form.Control
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              />
              <Form.Text className="text-muted">
                Leave empty for permanent assignment
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!formData.userId || !formData.roleId}
          >
            Assign Role
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  )
}
