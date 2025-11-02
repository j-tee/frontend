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
  fetchRoles,
  fetchPermissions,
  createRole,
  updateRole,
  deleteRole,
  assignRolePermissions
} from '../../../services/rbacService'
import type { Role, Permission } from '../../../types/rbac'
import { useAppSelector } from '../../../hooks'
import { selectCurrentUser } from '../../../store/slices/authSlice'
import { isSuperAdmin } from '../../../utils/platformPermissions'

export default function RoleManagement() {
  const user = useAppSelector(selectCurrentUser)
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    level: 'BUSINESS' as 'PLATFORM' | 'BUSINESS' | 'STOREFRONT',
    selectedPermissions: [] as string[]
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [rolesData, permsData] = await Promise.all([
        fetchRoles(),
        fetchPermissions()
      ])
      setRoles(rolesData)
      setPermissions(permsData)
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Failed to load roles and permissions'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingRole(null)
    setFormData({
      name: '',
      description: '',
      level: 'BUSINESS',
      selectedPermissions: []
    })
    setShowModal(true)
  }

  const handleEdit = (role: Role) => {
    setEditingRole(role)
    setFormData({
      name: role.name,
      description: role.description || '',
      level: role.level,
      selectedPermissions: role.permissions?.map((p: Permission) => p.id.toString()) || []
    })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    try {
      if (editingRole) {
        await updateRole(editingRole.id, {
          name: formData.name,
          description: formData.description,
          level: formData.level
        })
        // Update permissions
        await assignRolePermissions(editingRole.id, {
          permission_ids: formData.selectedPermissions.map(id => parseInt(id))
        })
      } else {
        const newRole = await createRole({
          name: formData.name,
          description: formData.description,
          level: formData.level
        })
        // Assign permissions
        await assignRolePermissions(newRole.id, {
          permission_ids: formData.selectedPermissions.map(id => parseInt(id))
        })
      }
      setMessage({
        type: 'success',
        text: `Role ${editingRole ? 'updated' : 'created'} successfully!`
      })
      setShowModal(false)
      loadData()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save role'
      })
    }
  }

  const handleDelete = async (roleId: number) => {
    if (!confirm('Are you sure you want to delete this role?')) return

    try {
      await deleteRole(roleId)
      setMessage({ type: 'success', text: 'Role deleted successfully!' })
      loadData()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to delete role'
      })
    }
  }

  const getLevelBadge = (level: string) => {
    const variants = {
      PLATFORM: 'danger',
      BUSINESS: 'primary',
      STOREFRONT: 'info'
    }
    return <Badge bg={variants[level as keyof typeof variants] || 'secondary'}>{level}</Badge>
  }

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = []
    }
    acc[perm.category].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  return (
    <div>
      {message && (
        <Alert
          variant={message.type === 'success' ? 'success' : 'danger'}
          dismissible
          onClose={() => setMessage(null)}
          className="mb-3"
        >
          {message.text}
        </Alert>
      )}

      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-shield-check me-2"></i>
            Role Management
          </h5>
          {isSuperAdmin(user) && (
            <Button variant="primary" size="sm" onClick={handleCreate}>
              <i className="bi bi-plus-circle me-2"></i>
              Create Role
            </Button>
          )}
        </Card.Header>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Role Name</th>
                <th>Level</th>
                <th>Description</th>
                <th>Permissions</th>
                <th>System Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td><strong>{role.name}</strong></td>
                  <td>{getLevelBadge(role.level)}</td>
                  <td>{role.description}</td>
                  <td>
                    <Badge bg="secondary">
                      {role.permissions?.length || 0} permissions
                    </Badge>
                  </td>
                  <td>
                    {role.is_system_role && (
                      <Badge bg="warning">System</Badge>
                    )}
                  </td>
                  <td>
                    <Badge bg={role.is_active ? 'success' : 'secondary'}>
                      {role.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleEdit(role)}
                        disabled={!isSuperAdmin(user)}
                      >
                        <i className="bi bi-pencil"></i>
                      </Button>
                      {!role.is_system_role && isSuperAdmin(user) && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(role.id)}
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingRole ? 'Edit Role' : 'Create New Role'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Role Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Sales Manager"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Level *</Form.Label>
                  <Form.Select
                    value={formData.level}
                    onChange={(e) => setFormData({
                      ...formData,
                      level: e.target.value as 'PLATFORM' | 'BUSINESS' | 'STOREFRONT'
                    })}
                  >
                    <option value="PLATFORM">Platform Level</option>
                    <option value="BUSINESS">Business Level</option>
                    <option value="STOREFRONT">Storefront Level</option>
                  </Form.Select>
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
                placeholder="Describe what this role can do"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Permissions</Form.Label>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }} className="border rounded p-3">
                {Object.entries(groupedPermissions).map(([category, perms]) => (
                  <div key={category} className="mb-3">
                    <h6 className="text-primary">{category}</h6>
                    {(perms as Permission[]).map((perm) => (
                      <Form.Check
                        key={perm.id}
                        type="checkbox"
                        id={`perm-${perm.id}`}
                        label={`${perm.name} (${perm.codename})`}
                        checked={formData.selectedPermissions.includes(perm.id.toString())}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              selectedPermissions: [...formData.selectedPermissions, perm.id.toString()]
                            })
                          } else {
                            setFormData({
                              ...formData,
                              selectedPermissions: formData.selectedPermissions.filter(id => id !== perm.id.toString())
                            })
                          }
                        }}
                        className="mb-2"
                      />
                    ))}
                  </div>
                ))}
              </div>
              <Form.Text className="text-muted">
                Select permissions for this role. {formData.selectedPermissions.length} selected.
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {editingRole ? 'Update Role' : 'Create Role'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
