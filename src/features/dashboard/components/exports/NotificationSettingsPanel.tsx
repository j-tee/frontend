import { useEffect, useState } from 'react'
import { Alert, Button, Card, Form, Spinner, Badge } from 'react-bootstrap'
import { useAppDispatch, useAppSelector } from '../../../../hooks'
import {
  fetchNotificationSettings,
  updateNotificationSettings,
  selectNotificationSettings,
  selectNotificationsLoading,
  selectNotificationsError,
  clearNotificationsError,
} from '../../../../store/slices/exportAutomationSlice'
import type { ExportNotificationSettings } from '../../../../types/exports'

export function NotificationSettingsPanel() {
  const dispatch = useAppDispatch()
  const settings = useAppSelector(selectNotificationSettings)
  const loading = useAppSelector(selectNotificationsLoading)
  const error = useAppSelector(selectNotificationsError)

  const [form, setForm] = useState<ExportNotificationSettings>({
    enable_notifications: true,
    notify_on_success: true,
    notify_on_failure: true,
    default_recipients: [],
    cc_recipients: [],
  })

  const [recipientInput, setRecipientInput] = useState('')
  const [ccInput, setCcInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    dispatch(fetchNotificationSettings())
  }, [dispatch])

  useEffect(() => {
    if (settings) {
      setForm(settings)
    }
  }, [settings])

  useEffect(() => {
    return () => {
      dispatch(clearNotificationsError())
    }
  }, [dispatch])

  const handleCheckboxChange = (field: keyof ExportNotificationSettings) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: event.target.checked }))
  }

  const handleAddRecipient = (type: 'default' | 'cc') => {
    const input = type === 'default' ? recipientInput : ccInput
    const email = input.trim()

    if (!email) return

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address')
      return
    }

    const field = type === 'default' ? 'default_recipients' : 'cc_recipients'
    const currentRecipients = form[field] || []

    if (currentRecipients.includes(email)) {
      alert('This email is already in the recipients list')
      return
    }

    setForm((prev) => ({
      ...prev,
      [field]: [...currentRecipients, email],
    }))

    if (type === 'default') {
      setRecipientInput('')
    } else {
      setCcInput('')
    }
  }

  const handleRemoveRecipient = (email: string, type: 'default' | 'cc') => {
    const field = type === 'default' ? 'default_recipients' : 'cc_recipients'
    setForm((prev) => ({
      ...prev,
      [field]: (prev[field] || []).filter((r) => r !== email),
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setSuccessMessage(null)

    try {
      await dispatch(updateNotificationSettings(form)).unwrap()
      setSuccessMessage('Notification settings updated successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      // Error is handled by Redux and shown in Alert
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-white">
        <h5 className="mb-0">
          <i className="bi bi-bell me-2 text-primary"></i>
          Email Notification Settings
        </h5>
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => dispatch(clearNotificationsError())}>
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert variant="success" dismissible onClose={() => setSuccessMessage(null)}>
            <i className="bi bi-check-circle me-2"></i>
            {successMessage}
          </Alert>
        )}

        {loading && !settings ? (
          <div className="text-center py-4">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Loading settings...</span>
            </Spinner>
            <p className="text-muted mt-2 mb-0">Loading notification settings...</p>
          </div>
        ) : (
          <Form onSubmit={handleSubmit}>
            {/* Enable Notifications */}
            <div className="mb-4 p-3 bg-light rounded">
              <Form.Check
                type="switch"
                id="enable-notifications"
                label={
                  <span className="fw-semibold">
                    Enable Email Notifications
                    <div className="text-muted small fw-normal">
                      Receive emails when exports complete or fail
                    </div>
                  </span>
                }
                checked={form.enable_notifications}
                onChange={handleCheckboxChange('enable_notifications')}
              />
            </div>

            {/* Notification Triggers */}
            {form.enable_notifications && (
              <>
                <h6 className="mb-3">Notification Triggers</h6>
                <div className="mb-4">
                  <Form.Check
                    type="checkbox"
                    id="notify-on-success"
                    label="Notify on successful exports"
                    checked={form.notify_on_success}
                    onChange={handleCheckboxChange('notify_on_success')}
                    className="mb-2"
                  />
                  <Form.Check
                    type="checkbox"
                    id="notify-on-failure"
                    label="Notify on failed exports"
                    checked={form.notify_on_failure}
                    onChange={handleCheckboxChange('notify_on_failure')}
                  />
                </div>

                {/* Default Recipients */}
                <h6 className="mb-3">Default Recipients</h6>
                <Form.Group className="mb-4">
                  <Form.Label>
                    These email addresses will receive all export notifications by default.
                  </Form.Label>
                  <div className="input-group mb-2">
                    <Form.Control
                      type="email"
                      placeholder="email@example.com"
                      value={recipientInput}
                      onChange={(e) => setRecipientInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddRecipient('default')
                        }
                      }}
                    />
                    <Button
                      variant="outline-secondary"
                      onClick={() => handleAddRecipient('default')}
                    >
                      Add
                    </Button>
                  </div>

                  <div className="d-flex flex-wrap gap-2 mb-2">
                    {(form.default_recipients || []).map((email) => (
                      <Badge key={email} bg="primary" className="d-flex align-items-center">
                        {email}
                        <button
                          type="button"
                          className="btn-close btn-close-white ms-2"
                          style={{ fontSize: '0.65rem' }}
                          onClick={() => handleRemoveRecipient(email, 'default')}
                          aria-label="Remove"
                        ></button>
                      </Badge>
                    ))}
                  </div>
                </Form.Group>

                {/* CC Recipients */}
                <h6 className="mb-3">CC Recipients</h6>
                <Form.Group className="mb-4">
                  <Form.Label>
                    Optional CC recipients who will be copied on all export notifications.
                  </Form.Label>
                  <div className="input-group mb-2">
                    <Form.Control
                      type="email"
                      placeholder="cc@example.com"
                      value={ccInput}
                      onChange={(e) => setCcInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddRecipient('cc')
                        }
                      }}
                    />
                    <Button variant="outline-secondary" onClick={() => handleAddRecipient('cc')}>
                      Add
                    </Button>
                  </div>

                  <div className="d-flex flex-wrap gap-2 mb-2">
                    {(form.cc_recipients || []).map((email) => (
                      <Badge key={email} bg="secondary" className="d-flex align-items-center">
                        {email}
                        <button
                          type="button"
                          className="btn-close btn-close-white ms-2"
                          style={{ fontSize: '0.65rem' }}
                          onClick={() => handleRemoveRecipient(email, 'cc')}
                          aria-label="Remove"
                        ></button>
                      </Badge>
                    ))}
                  </div>
                </Form.Group>
              </>
            )}

            {/* Submit Button */}
            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button
                variant="secondary"
                onClick={() => settings && setForm(settings)}
                disabled={submitting}
              >
                Reset
              </Button>
              <Button variant="primary" type="submit" disabled={submitting || loading}>
                {submitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </Form>
        )}
      </Card.Body>
    </Card>
  )
}
