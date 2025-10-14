import { useState } from 'react'
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap'
import { updateUserPreferences } from '../../../services/accountService'

export default function PreferencesSettings() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [preferences, setPreferences] = useState({
    language: 'en',
    timezone: 'Africa/Accra',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    emailNotifications: true,
    smsNotifications: false,
    desktopNotifications: true
  })

  const handleChange = (field: string, value: any) => {
    setPreferences(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      await updateUserPreferences(preferences)
      setMessage({ type: 'success', text: 'Preferences updated successfully!' })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update preferences'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">
          <i className="bi bi-sliders me-2"></i>
          User Preferences
        </h5>
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

        <Form onSubmit={handleSubmit}>
          <h6 className="mb-3">Regional Settings</h6>

          <Form.Group className="mb-3">
            <Form.Label>Language</Form.Label>
            <Form.Select
              value={preferences.language}
              onChange={(e) => handleChange('language', e.target.value)}
            >
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Timezone</Form.Label>
            <Form.Select
              value={preferences.timezone}
              onChange={(e) => handleChange('timezone', e.target.value)}
            >
              <option value="Africa/Accra">Africa/Accra (GMT)</option>
              <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
              <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="America/New_York">America/New York (EST/EDT)</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Date Format</Form.Label>
            <Form.Select
              value={preferences.dateFormat}
              onChange={(e) => handleChange('dateFormat', e.target.value)}
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2025)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2025)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (2025-12-31)</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>Time Format</Form.Label>
            <Form.Select
              value={preferences.timeFormat}
              onChange={(e) => handleChange('timeFormat', e.target.value)}
            >
              <option value="12h">12-hour (2:30 PM)</option>
              <option value="24h">24-hour (14:30)</option>
            </Form.Select>
          </Form.Group>

          <hr />

          <h6 className="mb-3 mt-4">Communication Preferences</h6>

          <Form.Check
            type="switch"
            id="email-notifications"
            label="Email Notifications"
            checked={preferences.emailNotifications}
            onChange={(e) => handleChange('emailNotifications', e.target.checked)}
            className="mb-2"
          />

          <Form.Check
            type="switch"
            id="sms-notifications"
            label="SMS Notifications"
            checked={preferences.smsNotifications}
            onChange={(e) => handleChange('smsNotifications', e.target.checked)}
            className="mb-2"
          />

          <Form.Check
            type="switch"
            id="desktop-notifications"
            label="Desktop Notifications"
            checked={preferences.desktopNotifications}
            onChange={(e) => handleChange('desktopNotifications', e.target.checked)}
            className="mb-3"
          />

          <div className="d-flex justify-content-end">
            <Button
              variant="primary"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                <>
                  <i className="bi bi-save me-2"></i>
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  )
}
