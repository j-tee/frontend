import { useState } from 'react'
import { Container, Row, Col, Nav, Tab } from 'react-bootstrap'
import ProfileSettings from '../components/ProfileSettings'
import SecuritySettings from '../components/SecuritySettings'
import PreferencesSettings from '../components/PreferencesSettings'
import NotificationSettings from '../components/NotificationSettings'

/**
 * Account Settings Page
 * User profile, security, preferences management for all users
 */
export default function AccountSettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>Account Settings</h2>
          <p className="text-muted">Manage your profile, security, and preferences</p>
        </Col>
      </Row>

      <Tab.Container
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k || 'profile')}
      >
        <Row>
          <Col md={3}>
            <Nav variant="pills" className="flex-column">
              <Nav.Item>
                <Nav.Link eventKey="profile">
                  <i className="bi bi-person me-2"></i>
                  Profile
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="security">
                  <i className="bi bi-shield-lock me-2"></i>
                  Security
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="preferences">
                  <i className="bi bi-sliders me-2"></i>
                  Preferences
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="notifications">
                  <i className="bi bi-bell me-2"></i>
                  Notifications
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Col>

          <Col md={9}>
            <Tab.Content>
              <Tab.Pane eventKey="profile">
                <ProfileSettings />
              </Tab.Pane>

              <Tab.Pane eventKey="security">
                <SecuritySettings />
              </Tab.Pane>

              <Tab.Pane eventKey="preferences">
                <PreferencesSettings />
              </Tab.Pane>

              <Tab.Pane eventKey="notifications">
                <NotificationSettings />
              </Tab.Pane>
            </Tab.Content>
          </Col>
        </Row>
      </Tab.Container>
    </Container>
  )
}
