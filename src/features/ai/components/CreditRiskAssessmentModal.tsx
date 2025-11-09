/**
 * Credit Risk Assessment Modal
 * AI-powered customer credit risk analysis
 */

import React, { useState } from 'react'
import { Modal, Button, Form, Alert, Badge, ProgressBar } from 'react-bootstrap'
import useAppDispatch from '../../../hooks/useAppDispatch'
import useAppSelector from '../../../hooks/useAppSelector'
import {
  assessRisk,
  clearCreditAssessment,
  selectCreditAssessment,
  selectAICredits,
} from '../../../store/slices/aiSlice'
import type { AssessmentType } from '../../../types/ai'
import './CreditRiskAssessmentModal.css'

interface CreditRiskAssessmentModalProps {
  show: boolean
  onHide: () => void
  customerId: string
  customerName: string
  currentCreditLimit?: number
  requestedCreditLimit: number
  onAcceptSuggestion?: (suggestedLimit: number) => void
}

export const CreditRiskAssessmentModal: React.FC<CreditRiskAssessmentModalProps> = ({
  show,
  onHide,
  customerId,
  customerName,
  currentCreditLimit,
  requestedCreditLimit,
  onAcceptSuggestion,
}) => {
  const dispatch = useAppDispatch()
  const result = useAppSelector(selectCreditAssessment)
  const credits = useAppSelector(selectAICredits)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [assessmentType, setAssessmentType] = useState<AssessmentType>(
    currentCreditLimit ? 'increase' : 'new_credit'
  )

  const creditCost = 3.0
  const currentBalance = Number(credits?.balance ?? 0)
  const hasEnoughCredits = currentBalance >= creditCost

  const handleAssess = async () => {
    if (!hasEnoughCredits) return

    setLoading(true)
    setError(null)

    try {
      await dispatch(
        assessRisk({
          customer_id: customerId,
          requested_credit_limit: requestedCreditLimit,
          assessment_type: assessmentType,
        }),
      ).unwrap()
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to assess credit risk')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = () => {
    if (result && onAcceptSuggestion) {
      onAcceptSuggestion(result.recommendation.suggested_limit)
    }
    handleClose()
  }

  const handleClose = () => {
    dispatch(clearCreditAssessment())
    setError(null)
    onHide()
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW':
        return 'success'
      case 'MEDIUM':
        return 'warning'
      case 'HIGH':
        return 'danger'
      case 'CRITICAL':
        return 'dark'
      default:
        return 'secondary'
    }
  }

  const getRecommendationBadge = (action: string) => {
    switch (action) {
      case 'APPROVE_FULL':
        return <Badge bg="success">Approve Full Amount</Badge>
      case 'APPROVE_PARTIAL':
        return <Badge bg="warning">Approve Partial Amount</Badge>
      case 'DENY':
        return <Badge bg="danger">Deny Credit Request</Badge>
      case 'REQUIRE_MORE_INFO':
        return <Badge bg="info">More Information Needed</Badge>
      default:
        return <Badge bg="secondary">{action}</Badge>
    }
  }

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <span className="me-2">🎯</span>
          AI Credit Risk Assessment
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {!hasEnoughCredits && (
          <Alert variant="danger">
            <Alert.Heading>Insufficient Credits</Alert.Heading>
            <p>
              You need {creditCost} credits for credit risk assessment. Your current balance is{' '}
              {currentBalance.toFixed(2)} credits.
            </p>
            <Button variant="primary" size="sm" href="/app/ai">
              Purchase Credits
            </Button>
          </Alert>
        )}

        <div className="customer-info mb-4">
          <h6 className="text-muted mb-2">Assessment Details:</h6>
          <div className="bg-light p-3 rounded">
            <div className="mb-2">
              <strong>Customer:</strong> {customerName}
            </div>
            {currentCreditLimit !== undefined && (
              <div className="mb-2">
                <strong>Current Credit Limit:</strong> GHS {currentCreditLimit.toFixed(2)}
              </div>
            )}
            <div className="mb-2">
              <strong>Requested Credit Limit:</strong> GHS {requestedCreditLimit.toFixed(2)}
            </div>
            {currentCreditLimit !== undefined && requestedCreditLimit > currentCreditLimit && (
              <div>
                <strong>Increase Amount:</strong>{' '}
                <Badge bg="primary">
                  +GHS {(requestedCreditLimit - currentCreditLimit).toFixed(2)}
                </Badge>
              </div>
            )}
          </div>
        </div>

        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Assessment Type</Form.Label>
            <Form.Select
              value={assessmentType}
              onChange={(e) => setAssessmentType(e.target.value as AssessmentType)}
              disabled={loading}
            >
              <option value="new_credit">New Credit Application</option>
              <option value="increase">Credit Limit Increase</option>
              <option value="renewal">Credit Renewal</option>
            </Form.Select>
            <Form.Text muted>Type of credit assessment being performed</Form.Text>
          </Form.Group>
        </Form>

        {error && (
          <Alert variant="danger" className="mt-3">
            <div className="d-flex align-items-start">
              <span className="me-2">⚠️</span>
              <div>
                <strong>Assessment Failed</strong>
                <p className="mb-0 mt-1">{error}</p>
              </div>
            </div>
          </Alert>
        )}

        {result && (
          <div className="result-section mt-4">
            {/* Risk Score */}
            <Alert variant={getRiskColor(result.risk_level)}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <Alert.Heading className="mb-1">Risk Assessment Complete</Alert.Heading>
                  <div className="d-flex align-items-center gap-2">
                    <strong>Risk Level:</strong>
                    <Badge bg={getRiskColor(result.risk_level)} className="fs-6">
                      {result.risk_level}
                    </Badge>
                  </div>
                </div>
                <div className="text-center">
                  <div className="display-6 fw-bold">{result.risk_score}</div>
                  <small>Risk Score</small>
                </div>
              </div>
              <ProgressBar
                now={result.risk_score}
                variant={getRiskColor(result.risk_level)}
                className="mb-2"
              />
            </Alert>

            {/* Recommendation */}
            <div className="recommendation-section mb-3">
              <h6>📋 Recommendation</h6>
              <div className="bg-light p-3 rounded">
                <div className="mb-2">{getRecommendationBadge(result.recommendation.action)}</div>
                <div className="mb-2">
                  <strong>Suggested Credit Limit:</strong> GHS{' '}
                  {result.recommendation.suggested_limit.toFixed(2)}
                </div>
                <div className="mb-2">
                  <strong>Suggested Terms:</strong> {result.recommendation.suggested_terms_days} days
                </div>
                <div>
                  <strong>Confidence Level:</strong>{' '}
                  {(result.recommendation.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Analysis */}
            <div className="analysis-section mb-3">
              <h6>📊 Analysis</h6>
              
              {/* Positive Factors */}
              {result.analysis.positive_factors.length > 0 && (
                <div className="mb-3">
                  <strong className="text-success">✓ Positive Factors:</strong>
                  <ul className="mb-0 mt-1">
                    {result.analysis.positive_factors.map((factor, index) => (
                      <li key={index} className="text-success">
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risk Factors */}
              {result.analysis.risk_factors.length > 0 && (
                <div className="mb-3">
                  <strong className="text-danger">⚠ Risk Factors:</strong>
                  <ul className="mb-0 mt-1">
                    {result.analysis.risk_factors.map((factor, index) => (
                      <li key={index} className="text-danger">
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Comparable Customers */}
              <div className="bg-light p-2 rounded">
                <small className="text-muted">
                  <strong>Market Benchmark:</strong> Similar customers have an average approved
                  limit of GHS {result.analysis.comparable_customers.similar_approved_limit_avg.toFixed(2)}.
                  Default rate: {result.analysis.comparable_customers.default_rate_for_similar_profile}
                </small>
              </div>
            </div>

            {/* Conditions */}
            {result.conditions && result.conditions.length > 0 && (
              <div className="conditions-section mb-3">
                <h6>📌 Recommended Conditions:</h6>
                <ul className="mb-0">
                  {result.conditions.map((condition, index) => (
                    <li key={index}>{condition}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Explanation */}
            <div className="explanation-section">
              <h6>💡 Explanation:</h6>
              <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                {result.explanation}
              </p>
            </div>

            <div className="mt-3 small text-muted">
              <div>Credits used: {result.credits_used}</div>
              <div>New balance: {Number(result.new_balance).toFixed(2)}</div>
            </div>
          </div>
        )}

        {loading && (
          <div className="loading-section text-center py-4">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">AI is analyzing credit risk...</p>
            <small className="text-muted">This may take a few seconds</small>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <div className="d-flex justify-content-between align-items-center w-100">
          <div className="text-muted small">
            {hasEnoughCredits && !result && (
              <>
                Cost: <strong>{creditCost} credits</strong>
              </>
            )}
          </div>
          <div>
            <Button variant="secondary" onClick={handleClose} disabled={loading}>
              Close
            </Button>
            {!result ? (
              <Button
                variant="primary"
                onClick={handleAssess}
                disabled={loading || !hasEnoughCredits}
                className="ms-2"
              >
                {loading ? 'Assessing...' : 'Assess Credit Risk'}
              </Button>
            ) : onAcceptSuggestion ? (
              <Button variant="success" onClick={handleAccept} className="ms-2">
                Apply Suggested Limit
              </Button>
            ) : null}
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  )
}

export default CreditRiskAssessmentModal
