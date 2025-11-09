/**
 * Report Narrative Generator Component
 * AI-powered natural language summaries for business reports
 */

import React, { useState } from 'react'
import { Button, Alert, Spinner, Badge } from 'react-bootstrap'
import useAppDispatch from '../../../hooks/useAppDispatch'
import useAppSelector from '../../../hooks/useAppSelector'
import {
  generateNarrative,
  clearReportNarrative,
  selectReportNarrative,
  selectAICredits,
} from '../../../store/slices/aiSlice'
import type { ReportType, ReportData } from '../../../types/ai'
import './ReportNarrativeWidget.css'

interface ReportNarrativeWidgetProps {
  reportType: ReportType
  reportData: ReportData
  reportTitle: string
  className?: string
}

export const ReportNarrativeWidget: React.FC<ReportNarrativeWidgetProps> = ({
  reportType,
  reportData,
  reportTitle,
  className = '',
}) => {
  const dispatch = useAppDispatch()
  const narrative = useAppSelector(selectReportNarrative)
  const credits = useAppSelector(selectAICredits)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  const creditCost = 0.2
  const currentBalance = Number(credits?.balance ?? 0)
  const hasEnoughCredits = currentBalance >= creditCost

  const handleGenerate = async () => {
    if (!hasEnoughCredits) return

    setLoading(true)
    setError(null)
    setIsExpanded(true)

    try {
      await dispatch(
        generateNarrative({
          report_type: reportType,
          report_data: reportData,
        }),
      ).unwrap()
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to generate report narrative')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setIsExpanded(false)
    dispatch(clearReportNarrative())
    setError(null)
  }

  return (
    <div className={`report-narrative-widget ${className}`}>
      {!isExpanded ? (
        <Button
          variant="outline-primary"
          size="sm"
          onClick={handleGenerate}
          disabled={loading || !hasEnoughCredits}
          className="d-flex align-items-center gap-2"
        >
          <span>📊</span>
          <span>AI Summary</span>
          {loading && <Spinner animation="border" size="sm" />}
        </Button>
      ) : (
        <div className="narrative-container">
          <div className="narrative-header">
            <div className="d-flex align-items-center gap-2">
              <span className="fs-5">📊</span>
              <strong>AI Summary: {reportTitle}</strong>
            </div>
            <div className="d-flex align-items-center gap-2">
              <Badge bg="secondary" pill>
                {creditCost} credits
              </Badge>
              <Button
                variant="link"
                size="sm"
                onClick={handleClose}
                className="p-0 text-decoration-none"
              >
                ✕
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="danger" className="mb-0">
              <div className="d-flex align-items-start gap-2">
                <span>⚠️</span>
                <div>
                  <strong>Generation Failed</strong>
                  <p className="mb-0 mt-1">{error}</p>
                </div>
              </div>
            </Alert>
          )}

          {loading && (
            <div className="narrative-loading">
              <Spinner animation="border" variant="primary" />
              <p className="text-muted mb-0 mt-2">AI is analyzing your report...</p>
            </div>
          )}

          {narrative && !loading && (
            <div className="narrative-content">
              {/* Executive Summary */}
              <div className="mb-3">
                <h6 className="section-title">📌 Executive Summary</h6>
                <p className="mb-0">{narrative.executive_summary}</p>
              </div>

              {/* Key Insights */}
              {narrative.key_insights.length > 0 && (
                <div className="mb-3">
                  <h6 className="section-title">💡 Key Insights</h6>
                  <ul className="insights-list">
                    {narrative.key_insights.map((insight, index) => (
                      <li key={index}>{insight}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Trends */}
              {narrative.trends.length > 0 && (
                <div className="mb-3">
                  <h6 className="section-title">📈 Trends</h6>
                  <ul className="trends-list">
                    {narrative.trends.map((trend, index) => (
                      <li key={index}>{trend}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {narrative.recommendations.length > 0 && (
                <div className="mb-3">
                  <h6 className="section-title">✅ Recommendations</h6>
                  <ul className="recommendations-list">
                    {narrative.recommendations.map((recommendation, index) => (
                      <li key={index}>{recommendation}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Alerts */}
              {narrative.alerts && narrative.alerts.length > 0 && (
                <div className="mb-3">
                  <h6 className="section-title text-warning">⚠️ Alerts</h6>
                  <ul className="alerts-list">
                    {narrative.alerts.map((alert, index) => (
                      <li key={index} className="text-warning">
                        {alert}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="narrative-footer">
                <small className="text-muted">
                  Generated using {narrative.credits_used} credits • Remaining balance:{' '}
                  {Number(narrative.new_balance).toFixed(2)}
                </small>
              </div>
            </div>
          )}

          {!hasEnoughCredits && !narrative && (
            <Alert variant="warning" className="mb-0">
              <Alert.Heading>Insufficient Credits</Alert.Heading>
              <p>
                You need {creditCost} credits to generate a report summary. Your current balance
                is {currentBalance.toFixed(2)} credits.
              </p>
              <Button variant="primary" size="sm" href="/app/ai">
                Purchase Credits
              </Button>
            </Alert>
          )}
        </div>
      )}
    </div>
  )
}

export default ReportNarrativeWidget
