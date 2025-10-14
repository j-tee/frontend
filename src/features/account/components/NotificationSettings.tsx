import { useState } from 'react'
import { Card, Form, Alert, Button, Spinner, Table } from 'react-bootstrap'
import { updateNotificationSettings } from '../../../services/accountService'

export default function NotificationSettings() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [settings, setSettings] = useState({
    sales: {
      email: true,
      push: true,
      sms: false
    },
    inventory: {
      email: true,
      push: false,
      sms: false
    },
    payments: {
      email: true,
      push: true,
      sms: true
    },
    users: {
      email: true,
      push: false,
      sms: false
    },
    system: {
      email: true,
      push: true,
      sms: false
    }
  })

  const handleToggle = (category: keyof typeof settings, channel: 'email' | 'push' | 'sms') => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [channel]: !prev[category][channel]
      }
    }))
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      await updateNotificationSettings(settings)
      setMessage({ type: 'success', text: 'Notification settings updated successfully!' })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update settings'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const notificationCategories = [
    { key: 'sales' as const, label: 'Sales & Transactions', description: 'New sales, refunds, and payment confirmations' },
    { key: 'inventory' as const, label: 'Inventory Alerts', description: 'Low stock alerts, stock updates' },
    { key: 'payments' as const, label: 'Payment Updates', description: 'Payment received, failed payments' },
    { key: 'users' as const, label: 'Team & Users', description: 'New user invitations, role changes' },
    { key: 'system' as const, label: 'System Updates', description: 'System maintenance, new features' }
  ]

  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">
          <i className="bi bi-bell me-2"></i>
          Notification Settings
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

        <p className="text-muted mb-4">
          Choose how you want to be notified about different types of events
        </p>

        <Table responsive bordered hover>
          <thead className="table-light">
            <tr>
              <th>Category</th>
              <th className="text-center">
                <i className="bi bi-envelope me-1"></i>
                Email
              </th>
              <th className="text-center">
                <i className="bi bi-bell me-1"></i>
                Push
              </th>
              <th className="text-center">
                <i className="bi bi-phone me-1"></i>
                SMS
              </th>
            </tr>
          </thead>
          <tbody>
            {notificationCategories.map((category) => (
              <tr key={category.key}>
                <td>
                  <strong>{category.label}</strong>
                  <br />
                  <small className="text-muted">{category.description}</small>
                </td>
                <td className="text-center">
                  <Form.Check
                    type="switch"
                    id={`${category.key}-email`}
                    checked={settings[category.key].email}
                    onChange={() => handleToggle(category.key, 'email')}
                    aria-label={`Email notifications for ${category.label}`}
                  />
                </td>
                <td className="text-center">
                  <Form.Check
                    type="switch"
                    id={`${category.key}-push`}
                    checked={settings[category.key].push}
                    onChange={() => handleToggle(category.key, 'push')}
                    aria-label={`Push notifications for ${category.label}`}
                  />
                </td>
                <td className="text-center">
                  <Form.Check
                    type="switch"
                    id={`${category.key}-sms`}
                    checked={settings[category.key].sms}
                    onChange={() => handleToggle(category.key, 'sms')}
                    aria-label={`SMS notifications for ${category.label}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

        <Alert variant="info" className="mt-3">
          <i className="bi bi-info-circle me-2"></i>
          <strong>Note:</strong> Some critical notifications (e.g., security alerts) will always be sent via email regardless of your preferences.
        </Alert>

        <div className="d-flex justify-content-end mt-3">
          <Button
            variant="primary"
            onClick={handleSubmit}
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
                Save Settings
              </>
            )}
          </Button>
        </div>
      </Card.Body>
    </Card>
  )
}
