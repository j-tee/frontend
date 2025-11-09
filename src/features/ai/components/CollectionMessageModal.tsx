/**
 * Collection Message Generator Modal
 * AI-powered debt collection message generation
 */

import React, { useState } from 'react'
import { Modal, Button, Form, Alert, Badge } from 'react-bootstrap'
import useAppDispatch from '../../../hooks/useAppDispatch'
import useAppSelector from '../../../hooks/useAppSelector'
import {
  generateMessage,
  clearCollectionMessage,
  selectCollectionMessage,
  selectAICredits,
} from '../../../store/slices/aiSlice'
import type { MessageType, MessageTone, DescriptionLanguage } from '../../../types/ai'
import './CollectionMessageModal.css'

interface CollectionMessageModalProps {
  show: boolean
  onHide: () => void
  customerId: string
  customerName: string
  outstandingAmount?: number
  daysPastDue?: number
}

export const CollectionMessageModal: React.FC<CollectionMessageModalProps> = ({
  show,
  onHide,
  customerId,
  customerName,
  outstandingAmount,
  daysPastDue,
}) => {
  const dispatch = useAppDispatch()
  const result = useAppSelector(selectCollectionMessage)
  const credits = useAppSelector(selectAICredits)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    messageType: 'first_reminder' as MessageType,
    tone: 'professional_friendly' as MessageTone,
    language: 'en' as DescriptionLanguage,
    includePaymentPlan: false,
  })

  const creditCost = 0.5
  const currentBalance = Number(credits?.balance ?? 0)
  const hasEnoughCredits = currentBalance >= creditCost

  const handleGenerate = async () => {
    if (!hasEnoughCredits) return

    setLoading(true)
    setError(null)

    try {
      await dispatch(
        generateMessage({
          customer_id: customerId,
          message_type: formData.messageType,
          tone: formData.tone,
          language: formData.language,
          include_payment_plan: formData.includePaymentPlan,
        }),
      ).unwrap()
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to generate collection message')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleClose = () => {
    dispatch(clearCollectionMessage())
    setError(null)
    setCopiedField(null)
    setFormData({
      messageType: 'first_reminder',
      tone: 'professional_friendly',
      language: 'en',
      includePaymentPlan: false,
    })
    onHide()
  }

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <span className="me-2">💬</span>
          AI Collection Message Generator
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {!hasEnoughCredits && (
          <Alert variant="danger">
            <Alert.Heading>Insufficient Credits</Alert.Heading>
            <p>
              You need {creditCost} credits to generate a collection message. Your current balance
              is {currentBalance.toFixed(2)} credits.
            </p>
            <Button variant="primary" size="sm" href="/app/ai">
              Purchase Credits
            </Button>
          </Alert>
        )}

        <div className="customer-info mb-4">
          <h6 className="text-muted mb-2">Customer Information:</h6>
          <div className="bg-light p-3 rounded">
            <div className="mb-2">
              <strong>Name:</strong> {customerName}
            </div>
            {outstandingAmount !== undefined && (
              <div className="mb-2">
                <strong>Outstanding Amount:</strong>{' '}
                <Badge bg="danger">GHS {outstandingAmount.toFixed(2)}</Badge>
              </div>
            )}
            {daysPastDue !== undefined && daysPastDue > 0 && (
              <div>
                <strong>Days Past Due:</strong>{' '}
                <Badge bg="warning" text="dark">
                  {daysPastDue} days
                </Badge>
              </div>
            )}
          </div>
        </div>

        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Message Type</Form.Label>
            <Form.Select
              value={formData.messageType}
              onChange={(e) =>
                setFormData({ ...formData, messageType: e.target.value as MessageType })
              }
              disabled={loading}
            >
              <option value="first_reminder">First Reminder</option>
              <option value="second_reminder">Second Reminder</option>
              <option value="final_notice">Final Notice</option>
              <option value="payment_plan_offer">Payment Plan Offer</option>
            </Form.Select>
            <Form.Text muted>Choose the stage of collection communication</Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Tone</Form.Label>
            <Form.Select
              value={formData.tone}
              onChange={(e) => setFormData({ ...formData, tone: e.target.value as MessageTone })}
              disabled={loading}
            >
              <option value="professional_friendly">Professional & Friendly</option>
              <option value="firm">Firm</option>
              <option value="formal_legal">Formal/Legal</option>
            </Form.Select>
            <Form.Text muted>Set the communication tone</Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Language</Form.Label>
            <Form.Select
              value={formData.language}
              onChange={(e) =>
                setFormData({ ...formData, language: e.target.value as DescriptionLanguage })
              }
              disabled={loading}
            >
              <option value="en">English</option>
              <option value="tw">Twi</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="Include payment plan suggestion"
              checked={formData.includePaymentPlan}
              onChange={(e) => setFormData({ ...formData, includePaymentPlan: e.target.checked })}
              disabled={loading}
            />
          </Form.Group>
        </Form>

        {error && (
          <Alert variant="danger" className="mt-3">
            <div className="d-flex align-items-start">
              <span className="me-2">⚠️</span>
              <div>
                <strong>Generation Failed</strong>
                <p className="mb-0 mt-1">{error}</p>
              </div>
            </div>
          </Alert>
        )}

        {result && (
          <div className="result-section mt-4">
            <Alert variant="success">
              <Alert.Heading>✅ Generated Messages</Alert.Heading>

              {/* Email Version */}
              <div className="message-version mt-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong>📧 Email Version</strong>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() =>
                      handleCopyToClipboard(
                        `Subject: ${result.subject}\n\n${result.body}`,
                        'email',
                      )
                    }
                  >
                    {copiedField === 'email' ? '✓ Copied!' : 'Copy'}
                  </Button>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="mb-2">
                    <small className="text-muted">Subject:</small>
                    <div className="fw-bold">{result.subject}</div>
                  </div>
                  <div>
                    <small className="text-muted">Body:</small>
                    <p className="mb-0 mt-1" style={{ whiteSpace: 'pre-wrap' }}>
                      {result.body}
                    </p>
                  </div>
                </div>
              </div>

              {/* SMS Version */}
              <div className="message-version mt-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong>💬 SMS Version</strong>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => handleCopyToClipboard(result.sms_version, 'sms')}
                  >
                    {copiedField === 'sms' ? '✓ Copied!' : 'Copy'}
                  </Button>
                </div>
                <div className="bg-white p-3 rounded border">
                  <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                    {result.sms_version}
                  </p>
                  <small className="text-muted d-block mt-2">
                    {result.sms_version.length} characters
                  </small>
                </div>
              </div>

              {/* WhatsApp Version */}
              <div className="message-version mt-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong>📱 WhatsApp Version</strong>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => handleCopyToClipboard(result.whatsapp_version, 'whatsapp')}
                  >
                    {copiedField === 'whatsapp' ? '✓ Copied!' : 'Copy'}
                  </Button>
                </div>
                <div className="bg-white p-3 rounded border">
                  <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                    {result.whatsapp_version}
                  </p>
                </div>
              </div>

              <div className="mt-3 small text-muted">
                <div>Credits used: {result.credits_used}</div>
                <div>New balance: {Number(result.new_balance).toFixed(2)}</div>
              </div>
            </Alert>
          </div>
        )}

        {loading && (
          <div className="loading-section text-center py-4">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">AI is crafting your collection message...</p>
            <small className="text-muted">This may take a few seconds</small>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <div className="d-flex justify-content-between align-items-center w-100">
          <div className="text-muted small">
            {hasEnoughCredits && (
              <>
                Cost: <strong>{creditCost} credits</strong>
              </>
            )}
          </div>
          <div>
            <Button variant="secondary" onClick={handleClose} disabled={loading}>
              Close
            </Button>
            {!result && (
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={loading || !hasEnoughCredits}
                className="ms-2"
              >
                {loading ? 'Generating...' : 'Generate Messages'}
              </Button>
            )}
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  )
}

export default CollectionMessageModal
