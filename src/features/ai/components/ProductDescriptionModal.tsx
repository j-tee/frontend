/**
 * Product Description Generator Modal
 * AI-powered product description generation
 */

import React, { useState } from 'react'
import { Modal, Button, Form, Alert } from 'react-bootstrap'
import useAppDispatch from '../../../hooks/useAppDispatch'
import useAppSelector from '../../../hooks/useAppSelector'
import {
  generateDescription,
  clearProductDescription,
  selectProductDescription,
  selectAICredits,
} from '../../../store/slices/aiSlice'
import type { DescriptionTone, DescriptionLanguage } from '../../../types/ai'
import './ProductDescriptionModal.css'

interface ProductDescriptionModalProps {
  show: boolean
  onHide: () => void
  productId?: string // For existing products
  productName: string
  productCategory?: string
  productUnit?: string
  currentDescription?: string
  onAccept: (description: string) => void
}

export const ProductDescriptionModal: React.FC<ProductDescriptionModalProps> = ({
  show,
  onHide,
  productId,
  productName,
  productCategory,
  productUnit,
  onAccept,
}) => {
  const dispatch = useAppDispatch()
  const result = useAppSelector(selectProductDescription)
  const credits = useAppSelector(selectAICredits)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    tone: 'professional' as DescriptionTone,
    language: 'en' as DescriptionLanguage,
    keywords: '',
  })

  const creditCost = 0.1
  const currentBalance = Number(credits?.balance ?? 0)
  const hasEnoughCredits = currentBalance >= creditCost

  const handleGenerate = async () => {
    if (!hasEnoughCredits) return
    
    // For new products without ID, we'll need a temporary placeholder or use name
    if (!productId) {
      setError('Product must be created first before generating AI description')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await dispatch(
        generateDescription({
          product_id: productId,
          tone: formData.tone,
          language: formData.language,
          include_seo: true,
        }),
      ).unwrap()
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to generate description')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = () => {
    if (result?.description) {
      onAccept(result.description)
      handleClose()
    }
  }

  const handleClose = () => {
    dispatch(clearProductDescription())
    setError(null)
    setFormData({
      tone: 'professional',
      language: 'en',
      keywords: '',
    })
    onHide()
  }

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <span className="me-2">✨</span>
          AI Product Description Generator
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {!productId && (
          <Alert variant="info">
            <Alert.Heading>📝 Product Must Be Created First</Alert.Heading>
            <p>
              AI description generation requires an existing product. Please save your product first,
              then you can edit it to generate an AI-powered description.
            </p>
            <small className="text-muted">
              This helps the AI understand your product catalog and generate more relevant descriptions.
            </small>
          </Alert>
        )}

        {!hasEnoughCredits && (
          <Alert variant="danger">
            <Alert.Heading>Insufficient Credits</Alert.Heading>
            <p>
              You need {creditCost} credits to generate a product description. Your current balance
              is {currentBalance.toFixed(2)} credits.
            </p>
            <Button variant="primary" size="sm" href="/app/ai">
              Purchase Credits
            </Button>
          </Alert>
        )}

        <div className="product-info mb-4">
          <h6 className="text-muted mb-2">Product Information:</h6>
          <div className="bg-light p-3 rounded">
            <div className="mb-2">
              <strong>Name:</strong> {productName}
            </div>
            {productCategory && (
              <div className="mb-2">
                <strong>Category:</strong> {productCategory}
              </div>
            )}
            {productUnit && (
              <div>
                <strong>Unit:</strong> {productUnit}
              </div>
            )}
          </div>
        </div>

        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Tone</Form.Label>
            <Form.Select
              value={formData.tone}
              onChange={(e) => setFormData({ ...formData, tone: e.target.value as DescriptionTone })}
              disabled={loading}
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="technical">Technical</option>
              <option value="marketing">Marketing</option>
            </Form.Select>
            <Form.Text muted>Choose the writing style for the description</Form.Text>
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
            <Form.Label>Keywords (Optional)</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g. durable, affordable, high-quality"
              value={formData.keywords}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              disabled={loading}
            />
            <Form.Text muted>Comma-separated keywords to include in the description</Form.Text>
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
              <Alert.Heading>✅ Generated Description</Alert.Heading>
              <div className="generated-description p-3 bg-white rounded border mt-2">
                <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                  {result.description}
                </p>
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
            <p className="text-muted">AI is generating your product description...</p>
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
            <Button variant="secondary" onClick={handleClose} disabled={loading} className="me-2">
              Cancel
            </Button>
            {!result ? (
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={loading || !hasEnoughCredits || !productId}
              >
                {loading ? 'Generating...' : 'Generate Description'}
              </Button>
            ) : (
              <Button variant="success" onClick={handleAccept}>
                Use This Description
              </Button>
            )}
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  )
}

export default ProductDescriptionModal
