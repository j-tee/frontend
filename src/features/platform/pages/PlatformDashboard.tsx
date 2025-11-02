import { useState } from 'react'
import { Container, Row, Col, Card, Alert, Nav, Tab } from 'react-bootstrap'
import { useAppSelector } from '../../../hooks'
import { selectCurrentUser } from '../../../store/slices/authSlice'
import { isPlatformAdmin, isSuperAdmin } from '../../../utils/platformPermissions'
import PlatformStats from '../components/PlatformStats'
import PlanManagement from '../components/PlanManagement'
import SubscriptionManagement from '../components/SubscriptionManagement'
import RoleManagement from '../components/RoleManagement'
import UserRoleAssignment from '../components/UserRoleAssignment'
import { TaxConfigPage } from '../../subscriptions/pages/TaxConfigPage'

export default function PlatformDashboard() {
  const user = useAppSelector(selectCurrentUser)
  const [activeTab, setActiveTab] = useState('overview')

  // Check platform access
  if (!user || !isPlatformAdmin(user)) {
    return (
      <Container fluid className="py-4">
        <Alert variant="danger">
          <h5>Access Denied</h5>
          <p>You do not have permission to access the platform management dashboard.</p>
          <p className="mb-0">
            This area is restricted to platform administrators only.
          </p>
        </Alert>
      </Container>
    )
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>Platform Management</h2>
          <p className="text-muted">
            System-wide administration and configuration
          </p>
        </Col>
      </Row>

      <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'overview')}>
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Body className="p-0">
                <Nav variant="tabs" className="border-bottom-0">
                  <Nav.Item>
                    <Nav.Link eventKey="overview">Overview & Stats</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="plans">Plan Management</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="subscriptions">Subscriptions</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="taxes">Tax Management</Nav.Link>
                  </Nav.Item>
                  {isSuperAdmin(user) && (
                    <>
                      <Nav.Item>
                        <Nav.Link eventKey="roles">Role Management</Nav.Link>
                      </Nav.Item>
                      <Nav.Item>
                        <Nav.Link eventKey="user-roles">User Role Assignments</Nav.Link>
                      </Nav.Item>
                    </>
                  )}
                </Nav>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Tab.Content>
          <Tab.Pane eventKey="overview">
            <PlatformStats />
          </Tab.Pane>

          <Tab.Pane eventKey="plans">
            <PlanManagement />
          </Tab.Pane>

          <Tab.Pane eventKey="subscriptions">
            <SubscriptionManagement />
          </Tab.Pane>

          <Tab.Pane eventKey="taxes">
            <TaxConfigPage />
          </Tab.Pane>

          {isSuperAdmin(user) && (
            <>
              <Tab.Pane eventKey="roles">
                <RoleManagement />
              </Tab.Pane>

              <Tab.Pane eventKey="user-roles">
                <UserRoleAssignment />
              </Tab.Pane>
            </>
          )}
        </Tab.Content>
      </Tab.Container>
    </Container>
  )
}
