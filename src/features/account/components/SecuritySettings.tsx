import { useState } from 'react'
import {
  Card,
  Form,
  Button,
  Alert,
  Spinner,
  Row,
  Col,
  InputGroup
} from 'react-bootstrap'
import { changePassword, enable2FA, disable2FA } from '../../../services/accountService'

export default function SecuritySettings() {
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    // Validation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' })
      return
    }

    setIsChangingPassword(true)

    try {
      await changePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword
      })
      setMessage({ type: 'success', text: 'Password changed successfully!' })
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to change password'
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleToggle2FA = async () => {
    try {
      if (is2FAEnabled) {
        await disable2FA()
        setIs2FAEnabled(false)
        setMessage({ type: 'success', text: 'Two-factor authentication disabled' })
      } else {
        await enable2FA()
        setIs2FAEnabled(true)
        setShow2FASetup(true)
        setMessage({ type: 'success', text: 'Two-factor authentication enabled' })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update 2FA settings'
      })
    }
  }

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }))
  }

  return (
    <div className="space-y-4">
      {message && (
        <Alert
          variant={message.type === 'success' ? 'success' : 'danger'}
          dismissible
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      {/* Change Password */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">
            <i className="bi bi-key me-2"></i>
            Change Password
          </h5>
        </Card.Header>
        <Card.Body>
          <Form onSubmit={handleSubmitPassword}>
            <Form.Group className="mb-3">
              <Form.Label>Current Password</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPasswords.current ? 'text' : 'password'}
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                  autoComplete="current-password"
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => togglePasswordVisibility('current')}
                >
                  <i className={`bi ${showPasswords.current ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </Button>
              </InputGroup>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPasswords.new ? 'text' : 'password'}
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                  autoComplete="new-password"
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => togglePasswordVisibility('new')}
                >
                  <i className={`bi ${showPasswords.new ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </Button>
              </InputGroup>
              <Form.Text className="text-muted">
                Must be at least 8 characters long
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Confirm New Password</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPasswords.confirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                  autoComplete="new-password"
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => togglePasswordVisibility('confirm')}
                >
                  <i className={`bi ${showPasswords.confirm ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </Button>
              </InputGroup>
            </Form.Group>

            <Button
              variant="primary"
              type="submit"
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Changing Password...
                </>
              ) : (
                <>
                  <i className="bi bi-shield-check me-2"></i>
                  Change Password
                </>
              )}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">
            <i className="bi bi-shield-lock me-2"></i>
            Two-Factor Authentication
          </h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={8}>
              <p className="text-muted mb-3">
                Add an extra layer of security to your account by enabling two-factor authentication.
              </p>
              <Form.Check
                type="switch"
                id="2fa-toggle"
                label={is2FAEnabled ? 'Two-factor authentication is enabled' : 'Enable two-factor authentication'}
                checked={is2FAEnabled}
                onChange={handleToggle2FA}
              />
            </Col>
            <Col md={4} className="text-center">
              <i className={`bi bi-shield-${is2FAEnabled ? 'check' : 'x'} display-3 text-${is2FAEnabled ? 'success' : 'muted'}`}></i>
            </Col>
          </Row>

          {show2FASetup && is2FAEnabled && (
            <Alert variant="info" className="mt-3">
              <h6>Setup Instructions</h6>
              <ol className="mb-0">
                <li>Download an authenticator app (Google Authenticator, Authy, etc.)</li>
                <li>Scan the QR code with your authenticator app</li>
                <li>Enter the 6-digit code from your app to complete setup</li>
              </ol>
              <div className="text-center my-3">
                <div className="bg-white p-3 d-inline-block">
                  {/* QR Code placeholder */}
                  <div style={{ width: 200, height: 200 }} className="bg-light d-flex align-items-center justify-content-center">
                    <span className="text-muted">QR Code Here</span>
                  </div>
                </div>
              </div>
              <Form>
                <Form.Group>
                  <Form.Label>Verification Code</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                  />
                </Form.Group>
                <Button variant="primary" className="mt-2">
                  Verify and Enable
                </Button>
              </Form>
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* Active Sessions */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">
            <i className="bi bi-laptop me-2"></i>
            Active Sessions
          </h5>
        </Card.Header>
        <Card.Body>
          <p className="text-muted">
            Manage devices where you're currently logged in
          </p>
          <Alert variant="info">
            <i className="bi bi-info-circle me-2"></i>
            Session management will be available in the next update.
          </Alert>
        </Card.Body>
      </Card>
    </div>
  )
}
