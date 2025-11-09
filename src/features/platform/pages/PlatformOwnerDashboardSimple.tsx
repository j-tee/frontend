/**
 * Platform Owner Dashboard - Simplified Version
 * Clean start to debug issues
 */

import { Container, Row, Col, Card, Alert } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '../../../hooks'
import { selectCurrentUser } from '../../../store/slices/authSlice'
import { isPlatformAdmin, isSuperAdmin } from '../../../utils/platformPermissions'

export default function PlatformOwnerDashboardSimple() {
  const navigate = useNavigate()
  const user = useAppSelector(selectCurrentUser)

  console.log('🔍 Dashboard Debug:', { user, isPlatformAdmin: user && isPlatformAdmin(user) })

  if (!user) {
    return (
      <Container className="py-5">
        <Alert variant="info">Loading user data...</Alert>
      </Container>
    )
  }

  if (!isPlatformAdmin(user)) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <h5>Access Denied</h5>
          <p>You need platform admin privileges to access this page.</p>
          <p>Your platform role: {user.platform_role || 'None'}</p>
          <button className="btn btn-primary" onClick={() => navigate('/app')}>
            Go to Dashboard
          </button>
        </Alert>
      </Container>
    )
  }

  const isSuper = isSuperAdmin(user)

  return (
    <Container fluid className="py-4" style={{ background: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4" style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }}>
              <h1 className="mb-2">
                <i className="bi bi-gear-fill me-2"></i>
                Platform Administration
              </h1>
              <p className="mb-0 opacity-90">
                Welcome, {user.name} ({isSuper ? 'Super Admin' : 'Platform Admin'})
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Stats */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="mb-2">
                <i className="bi bi-building" style={{ fontSize: '2rem', color: '#667eea' }}></i>
              </div>
              <h6 className="text-muted">Total Businesses</h6>
              <h3 className="mb-0">Loading...</h3>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="mb-2">
                <i className="bi bi-people" style={{ fontSize: '2rem', color: '#10b981' }}></i>
              </div>
              <h6 className="text-muted">Total Users</h6>
              <h3 className="mb-0">Loading...</h3>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="mb-2">
                <i className="bi bi-receipt" style={{ fontSize: '2rem', color: '#3b82f6' }}></i>
              </div>
              <h6 className="text-muted">Active Subscriptions</h6>
              <h3 className="mb-0">Loading...</h3>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="mb-2">
                <i className="bi bi-currency-exchange" style={{ fontSize: '2rem', color: '#f59e0b' }}></i>
              </div>
              <h6 className="text-muted">Total Revenue</h6>
              <h3 className="mb-0">Loading...</h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <h5 className="mb-3">Platform Management</h5>
              <Alert variant="success">
                <i className="bi bi-check-circle me-2"></i>
                Platform dashboard loaded successfully!
              </Alert>
              
              <div className="mt-4">
                <h6>Available Features:</h6>
                <ul>
                  <li>✅ Platform Statistics</li>
                  <li>✅ Financial Overview</li>
                  <li>✅ Revenue Analytics</li>
                  <li>✅ Subscription Management</li>
                  <li>✅ Pricing Plans</li>
                  <li>✅ Tax Configuration</li>
                  <li>✅ User Management</li>
                  {isSuper && <li>✅ Role Management (Super Admin Only)</li>}
                  {isSuper && <li>✅ System Health (Super Admin Only)</li>}
                </ul>
              </div>

              <div className="mt-4">
                <button 
                  className="btn btn-primary me-2"
                  onClick={() => window.location.href = '/app/platform'}
                >
                  Reload Full Dashboard
                </button>
                <button 
                  className="btn btn-outline-secondary"
                  onClick={() => navigate('/app')}
                >
                  Back to App
                </button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}
