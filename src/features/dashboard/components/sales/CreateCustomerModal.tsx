import { useEffect, useState } from 'react'
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap'
import { createCustomer } from '../../../../services/salesService'
import type { Customer } from '../../../../types/sales'

interface CreateCustomerModalProps {
  show: boolean
  saleType: 'RETAIL' | 'WHOLESALE'
  onHide: () => void
  onCustomerCreated: (customer: Customer) => void
}

const initialFormState = {
  name: '',
  phone: '',
  email: '',
}

export function CreateCustomerModal({ show, saleType, onHide, onCustomerCreated }: CreateCustomerModalProps) {
  const [form, setForm] = useState(initialFormState)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!show) {
      setForm(initialFormState)
      setNotes('')
      setError(null)
      setSubmitting(false)
    }
  }, [show])

  const handleInputChange = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.name.trim()) {
      setError('Customer name is required.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const phoneValue = form.phone.trim() || `000000${Math.floor(Math.random() * 900000 + 100000)}`

      const payload = {
        name: form.name.trim(),
        phone: phoneValue,
        email: form.email.trim() || undefined,
        type: saleType,
        notes: notes.trim() || undefined,
      }

      const customer = await createCustomer(payload)
      onCustomerCreated(customer)
      onHide()
    } catch (err) {
      console.error('Failed to create customer', err)
      setError('Could not create customer. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>New Customer</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          <Form.Group className="mb-3" controlId="customer-name">
            <Form.Label>Customer Name</Form.Label>
            <Form.Control
              value={form.name}
              onChange={handleInputChange('name')}
              placeholder="Enter full name"
              required
              disabled={submitting}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="customer-phone">
            <Form.Label>Phone Number</Form.Label>
            <Form.Control
              value={form.phone}
              onChange={handleInputChange('phone')}
              placeholder="e.g. +233 000 000 000"
              disabled={submitting}
            />
            <Form.Text className="text-muted">Optional, but helps with follow-ups.</Form.Text>
          </Form.Group>

          <Form.Group className="mb-3" controlId="customer-email">
            <Form.Label>Email Address</Form.Label>
            <Form.Control
              type="email"
              value={form.email}
              onChange={handleInputChange('email')}
              placeholder="customer@example.com"
              disabled={submitting}
            />
          </Form.Group>

          <Form.Group className="mb-0" controlId="customer-notes">
            <Form.Label>Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Additional details (optional)"
              disabled={submitting}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onHide} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? (
              <span className="d-inline-flex align-items-center gap-2">
                <Spinner animation="border" size="sm" role="status" />
                Saving...
              </span>
            ) : (
              'Create Customer'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
