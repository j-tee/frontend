/**
 * Platform Owner Dashboard
 * Specialized dashboard for platform owners - focuses on administration and financial oversight
 * No business operations (sales, inventory, etc.) - only platform management
 */

import { Container, Row, Col, Card, Tab, Alert, Spinner } from 'react-bootstrap'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppSelector } from '../../../hooks'
import { selectCurrentUser } from '../../../store/slices/authSlice'
import { isSuperAdmin, isPlatformAdmin } from '../../../utils/platformPermissions'

// Import platform-specific components
import PlatformFinancialOverview from '../components/PlatformFinancialOverview.tsx'
import PlatformRevenueAnalytics from '../components/PlatformRevenueAnalytics.tsx'
import PlatformStats from '../components/PlatformStats.tsx'
import PricingTierManagement from '../components/PricingTierManagement.tsx'
import SubscriptionManagement from '../components/SubscriptionManagement.tsx'
import RoleManagement from '../components/RoleManagement.tsx'
import UserRoleAssignment from '../components/UserRoleAssignment.tsx'
import { TaxConfigPage } from '../../subscriptions/pages/TaxConfigPage'
import PlatformUserManagement from '../components/PlatformUserManagement.tsx'
import PlatformSystemHealth from '../components/PlatformSystemHealth.tsx'

export default function PlatformOwnerDashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const user = useAppSelector(selectCurrentUser)
  
  // Get active tab from URL query parameter, default to 'dashboard'
  const activeTab = searchParams.get('tab') || 'dashboard'

  // Debug log
  console.log('PlatformOwnerDashboard - User:', user)
  console.log('PlatformOwnerDashboard - isPlatformAdmin:', user && isPlatformAdmin(user))
  console.log('PlatformOwnerDashboard - Active Tab:', activeTab)

  // Access control - only platform admins
  if (!user) {
    return (
      <Container fluid className="py-5">
        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <Alert variant="warning" className="text-center">
              <Spinner animation="border" className="me-2" />
              Loading user information...
            </Alert>
          </Col>
        </Row>
      </Container>
    )
  }

  if (!isPlatformAdmin(user)) {
    return (
      <Container fluid className="py-5">
        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <Alert variant="danger" className="text-center">
              <Alert.Heading>
                <i className="bi bi-shield-exclamation me-2"></i>
                Access Denied
              </Alert.Heading>
              <p className="mb-3">
                You do not have permission to access the platform administration dashboard.
              </p>
              <p className="mb-3">
                This area is restricted to platform owners and administrators only.
              </p>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/app')}
              >
                Return to Dashboard
              </button>
            </Alert>
          </Col>
        </Row>
      </Container>
    )
  }

  const isSuper = isSuperAdmin(user)

  return (
    <div className="platform-owner-dashboard" style={{ background: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '2rem 0',
        marginBottom: '2rem',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <Container fluid>
          <Row className="align-items-center">
            <Col>
              <h1 className="mb-2 d-flex align-items-center gap-2">
                <i className="bi bi-gear-fill"></i>
                Platform Administration
              </h1>
              <p className="mb-0 opacity-90">
                System-wide financial oversight, subscription management, and administrative controls
              </p>
            </Col>
            <Col xs="auto">
              <Card bg="white" text="dark" className="shadow-sm">
                <Card.Body className="p-3">
                  <div className="d-flex align-items-center gap-2">
                    <div 
                      className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{ 
                        width: '40px', 
                        height: '40px', 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white'
                      }}
                    >
                      <i className="bi bi-person-badge-fill"></i>
                    </div>
                    <div>
                      <div className="fw-bold">{user.name}</div>
                      <small className="text-muted">
                        {isSuper ? 'Super Admin' : 'Platform Admin'}
                      </small>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      <Container fluid>
        <Tab.Container activeKey={activeTab}>
          {/* Tab Content - Navigation is now in the header */}
          <Tab.Content>
            {/* Dashboard Overview */}
            <Tab.Pane eventKey="dashboard">
              <PlatformStats />
            </Tab.Pane>

            {/* Financial Overview */}
            <Tab.Pane eventKey="financial">
              <PlatformFinancialOverview />
            </Tab.Pane>

            {/* Revenue Analytics */}
            <Tab.Pane eventKey="revenue">
              <PlatformRevenueAnalytics />
            </Tab.Pane>

            {/* Subscriptions Management */}
            <Tab.Pane eventKey="subscriptions">
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <h5 className="mb-4">
                    <i className="bi bi-receipt me-2"></i>
                    Subscription Management
                  </h5>
                  <SubscriptionManagement />
                </Card.Body>
              </Card>
            </Tab.Pane>

            {/* Pricing Tier Management */}
            <Tab.Pane eventKey="pricing">
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <h5 className="mb-4">
                    <i className="bi bi-tags me-2"></i>
                    Pricing Plans & Tiers
                  </h5>
                  <PricingTierManagement />
                </Card.Body>
              </Card>
            </Tab.Pane>

            {/* Tax Configuration */}
            <Tab.Pane eventKey="taxes">
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <h5 className="mb-4">
                    <i className="bi bi-calculator me-2"></i>
                    Tax Configuration
                  </h5>
                  <TaxConfigPage />
                </Card.Body>
              </Card>
            </Tab.Pane>

            {/* Platform Users */}
            <Tab.Pane eventKey="users">
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <h5 className="mb-4">
                    <i className="bi bi-people me-2"></i>
                    Platform User Management
                  </h5>
                  <PlatformUserManagement />
                </Card.Body>
              </Card>
            </Tab.Pane>

            {/* Role Management (Super Admin Only) */}
            {isSuper && (
              <>
                <Tab.Pane eventKey="roles">
                  <Card className="shadow-sm border-0">
                    <Card.Body>
                      <h5 className="mb-4">
                        <i className="bi bi-shield-lock me-2"></i>
                        Role & Permission Management
                      </h5>
                      <Row>
                        <Col lg={12} className="mb-4">
                          <RoleManagement />
                        </Col>
                        <Col lg={12}>
                          <UserRoleAssignment />
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Tab.Pane>

                {/* System Health */}
                <Tab.Pane eventKey="system">
                  <PlatformSystemHealth />
                </Tab.Pane>
              </>
            )}
          </Tab.Content>
        </Tab.Container>
      </Container>
    </div>
  )
}
