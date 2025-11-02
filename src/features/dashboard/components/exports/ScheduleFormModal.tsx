import { useEffect, useState } from 'react'
import { Modal, Button, Form, Alert, Spinner, Badge } from 'react-bootstrap'
import { useAppDispatch, useAppSelector } from '../../../../hooks'
import {
  createSchedule,
  updateSchedule,
  fetchSchedule,
  selectSelectedSchedule,
  selectSelectedScheduleLoading,
  selectSelectedScheduleError,
  selectShowScheduleForm,
  selectScheduleFormMode,
  closeScheduleForm,
  clearSelectedScheduleError,
} from '../../../../store/slices/exportAutomationSlice'
import type { CreateSchedulePayload, ExportType, ExportFormat, ExportFrequency } from '../../../../types/exports'

interface ScheduleFormModalProps {
  scheduleId: string | null
}

const EXPORT_TYPES: { value: ExportType; label: string }[] = [
  { value: 'SALES', label: 'Sales Report' },
  { value: 'CUSTOMERS', label: 'Customers Report' },
  { value: 'INVENTORY', label: 'Inventory Report' },
  { value: 'AUDIT_LOGS', label: 'Audit Logs' },
]

const EXPORT_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'excel', label: 'Excel (.xlsx)' },
  { value: 'csv', label: 'CSV (.csv)' },
  { value: 'pdf', label: 'PDF (.pdf)' },
]

const FREQUENCIES: { value: ExportFrequency; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
]

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const initialFormState: CreateSchedulePayload = {
  name: '',
  export_type: 'SALES',
  format: 'excel',
  frequency: 'DAILY',
  hour: 9,
  day_of_week: undefined,
  day_of_month: undefined,
  recipients: [],
  include_creator_email: true,
  email_subject: '',
  email_message: '',
  filters: {},
  is_active: true,
}

export function ScheduleFormModal({ scheduleId }: ScheduleFormModalProps) {
  const dispatch = useAppDispatch()
  const show = useAppSelector(selectShowScheduleForm)
  const mode = useAppSelector(selectScheduleFormMode)
  const selectedSchedule = useAppSelector(selectSelectedSchedule)
  const loading = useAppSelector(selectSelectedScheduleLoading)
  const error = useAppSelector(selectSelectedScheduleError)

  const [form, setForm] = useState<CreateSchedulePayload>(initialFormState)
  const [recipientInput, setRecipientInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Load schedule data for editing
  useEffect(() => {
    if (show && mode === 'edit' && scheduleId) {
      dispatch(fetchSchedule(scheduleId))
    }
  }, [show, mode, scheduleId, dispatch])

  // Populate form with selected schedule data
  useEffect(() => {
    if (selectedSchedule && mode === 'edit') {
      setForm({
        name: selectedSchedule.name,
        export_type: selectedSchedule.export_type,
        format: selectedSchedule.format,
        frequency: selectedSchedule.frequency,
        hour: selectedSchedule.hour,
        day_of_week: selectedSchedule.day_of_week ?? undefined,
        day_of_month: selectedSchedule.day_of_month ?? undefined,
        recipients: selectedSchedule.recipients,
        include_creator_email: selectedSchedule.include_creator_email,
        email_subject: selectedSchedule.email_subject,
        email_message: selectedSchedule.email_message,
        filters: selectedSchedule.filters,
        is_active: selectedSchedule.is_active,
      })
    } else if (mode === 'create') {
      setForm(initialFormState)
    }
  }, [selectedSchedule, mode])

  // Reset form on close
  useEffect(() => {
    if (!show) {
      setForm(initialFormState)
      setRecipientInput('')
      setSubmitting(false)
      dispatch(clearSelectedScheduleError())
    }
  }, [show, dispatch])

  const handleClose = () => {
    dispatch(closeScheduleForm())
  }

  const handleInputChange = (field: keyof CreateSchedulePayload) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleNumberChange = (field: keyof CreateSchedulePayload) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value ? parseInt(event.target.value, 10) : null
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCheckboxChange = (field: keyof CreateSchedulePayload) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: event.target.checked }))
  }

  const handleFrequencyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const frequency = event.target.value as ExportFrequency
    setForm((prev) => ({
      ...prev,
      frequency,
      day_of_week: frequency === 'WEEKLY' ? 1 : undefined,
      day_of_month: frequency === 'MONTHLY' ? 1 : undefined,
    }))
  }

  const handleAddRecipient = () => {
    const email = recipientInput.trim()
    if (!email) return

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address')
      return
    }

    if (form.recipients.includes(email)) {
      alert('This email is already in the recipients list')
      return
    }

    setForm((prev) => ({
      ...prev,
      recipients: [...prev.recipients, email],
    }))
    setRecipientInput('')
  }

  const handleRemoveRecipient = (email: string) => {
    setForm((prev) => ({
      ...prev,
      recipients: prev.recipients.filter((r) => r !== email),
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    // Validation
    if (!form.name.trim()) {
      alert('Schedule name is required')
      return
    }

    if (form.frequency === 'WEEKLY' && (form.day_of_week === null || form.day_of_week === undefined)) {
      alert('Please select a day of week for weekly schedules')
      return
    }

    if (form.frequency === 'MONTHLY' && (form.day_of_month === null || form.day_of_month === undefined)) {
      alert('Please select a day of month for monthly schedules')
      return
    }

    if (form.recipients.length === 0 && !form.include_creator_email) {
      alert('Please add at least one recipient or include creator email')
      return
    }

    setSubmitting(true)

    try {
      if (mode === 'create') {
        await dispatch(createSchedule(form)).unwrap()
      } else if (mode === 'edit' && scheduleId) {
        await dispatch(updateSchedule({ id: scheduleId, data: form })).unwrap()
      }
      handleClose()
    } catch (err) {
      // Error is handled by Redux and shown in Alert
    } finally {
      setSubmitting(false)
    }
  }

  const title = mode === 'create' ? 'Create Export Schedule' : 'Edit Export Schedule'

  return (
    <Modal show={show} onHide={handleClose} size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => dispatch(clearSelectedScheduleError())}>
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </Alert>
          )}

          {loading && mode === 'edit' ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <p className="text-muted mt-2">Loading schedule...</p>
            </div>
          ) : (
            <>
              {/* Basic Information */}
              <h6 className="mb-3">Basic Information</h6>

              <Form.Group className="mb-3">
                <Form.Label>
                  Schedule Name <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g., Daily Sales Report"
                  value={form.name}
                  onChange={handleInputChange('name')}
                  required
                />
              </Form.Group>

              <div className="row mb-3">
                <div className="col-md-6">
                  <Form.Group>
                    <Form.Label>
                      Export Type <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Select value={form.export_type} onChange={handleInputChange('export_type')}>
                      {EXPORT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </div>

                <div className="col-md-6">
                  <Form.Group>
                    <Form.Label>
                      Format <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Select value={form.format} onChange={handleInputChange('format')}>
                      {EXPORT_FORMATS.map((format) => (
                        <option key={format.value} value={format.value}>
                          {format.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </div>
              </div>

              {/* Schedule Settings */}
              <h6 className="mb-3 mt-4">Schedule Settings</h6>

              <div className="row mb-3">
                <div className="col-md-4">
                  <Form.Group>
                    <Form.Label>
                      Frequency <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Select value={form.frequency} onChange={handleFrequencyChange}>
                      {FREQUENCIES.map((freq) => (
                        <option key={freq.value} value={freq.value}>
                          {freq.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </div>

                <div className="col-md-4">
                  <Form.Group>
                    <Form.Label>
                      Hour (UTC) <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      max="23"
                      value={form.hour}
                      onChange={handleNumberChange('hour')}
                      required
                    />
                    <Form.Text className="text-muted">0-23 (24-hour format)</Form.Text>
                  </Form.Group>
                </div>

                {form.frequency === 'WEEKLY' && (
                  <div className="col-md-4">
                    <Form.Group>
                      <Form.Label>
                        Day of Week <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Select
                        value={form.day_of_week ?? ''}
                        onChange={(e) => setForm(prev => ({ ...prev, day_of_week: parseInt(e.target.value, 10) }))}
                      >
                        {DAYS_OF_WEEK.map((day, index) => (
                          <option key={index} value={index}>
                            {day}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </div>
                )}

                {form.frequency === 'MONTHLY' && (
                  <div className="col-md-4">
                    <Form.Group>
                      <Form.Label>
                        Day of Month <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="number"
                        min="1"
                        max="28"
                        value={form.day_of_month ?? ''}
                        onChange={handleNumberChange('day_of_month')}
                        required
                      />
                      <Form.Text className="text-muted">1-28</Form.Text>
                    </Form.Group>
                  </div>
                )}
              </div>

              {/* Email Settings */}
              <h6 className="mb-3 mt-4">Email Settings</h6>

              <Form.Group className="mb-3">
                <Form.Label>Recipients</Form.Label>
                <div className="input-group mb-2">
                  <Form.Control
                    type="email"
                    placeholder="email@example.com"
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddRecipient()
                      }
                    }}
                  />
                  <Button variant="outline-secondary" onClick={handleAddRecipient}>
                    Add
                  </Button>
                </div>

                <div className="d-flex flex-wrap gap-2 mb-2">
                  {form.recipients.map((email) => (
                    <Badge key={email} bg="primary" className="d-flex align-items-center">
                      {email}
                      <button
                        type="button"
                        className="btn-close btn-close-white ms-2"
                        style={{ fontSize: '0.65rem' }}
                        onClick={() => handleRemoveRecipient(email)}
                        aria-label="Remove"
                      ></button>
                    </Badge>
                  ))}
                </div>

                <Form.Check
                  type="checkbox"
                  label="Include creator's email in recipients"
                  checked={form.include_creator_email}
                  onChange={handleCheckboxChange('include_creator_email')}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Email Subject</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Leave empty for default subject"
                  value={form.email_subject}
                  onChange={handleInputChange('email_subject')}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Email Message</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Optional custom message for the email body"
                  value={form.email_message}
                  onChange={handleInputChange('email_message')}
                />
              </Form.Group>

              {/* Status */}
              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="Activate schedule immediately"
                  checked={form.is_active}
                  onChange={handleCheckboxChange('is_active')}
                />
                <Form.Text className="text-muted">
                  {form.is_active
                    ? 'Schedule will run automatically at the specified time'
                    : 'Schedule will be created but not activated'}
                </Form.Text>
              </Form.Group>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting || (loading && mode === 'edit')}>
            {submitting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {mode === 'create' ? 'Creating...' : 'Updating...'}
              </>
            ) : mode === 'create' ? (
              'Create Schedule'
            ) : (
              'Update Schedule'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
