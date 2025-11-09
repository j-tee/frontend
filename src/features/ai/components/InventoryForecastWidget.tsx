/**
 * Inventory Forecasting Widget
 * AI-powered inventory forecasting to predict stockouts and suggest reorders
 */

import React, { useState } from 'react'
import { Card, Button, Alert, Spinner, Badge, Table, ProgressBar } from 'react-bootstrap'
import useAppDispatch from '../../../hooks/useAppDispatch'
import useAppSelector from '../../../hooks/useAppSelector'
import {
  generateForecast,
  clearInventoryForecast,
  selectInventoryForecast,
  selectAICredits,
} from '../../../store/slices/aiSlice'
import { useCurrency } from '../../../hooks/useCurrency'
import './InventoryForecastWidget.css'

interface InventoryForecastWidgetProps {
  warehouseId?: string
  categoryId?: string
  forecastDays?: number
  className?: string
}

export const InventoryForecastWidget: React.FC<InventoryForecastWidgetProps> = ({
  warehouseId,
  categoryId,
  forecastDays = 30,
  className = '',
}) => {
  const dispatch = useAppDispatch()
  const forecast = useAppSelector(selectInventoryForecast)
  const credits = useAppSelector(selectAICredits)
  const { formatCurrency } = useCurrency()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const creditCost = 4.0
  const currentBalance = Number(credits?.balance ?? 0)
  const hasEnoughCredits = currentBalance >= creditCost

  const handleGenerate = async () => {
    if (!hasEnoughCredits) return

    setLoading(true)
    setError(null)

    try {
      await dispatch(
        generateForecast({
          warehouse_id: warehouseId,
          category_id: categoryId,
          forecast_days: forecastDays,
        }),
      ).unwrap()
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to generate inventory forecast')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    dispatch(clearInventoryForecast())
    setError(null)
  }

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return <Badge bg="danger">Critical</Badge>
      case 'high':
        return <Badge bg="warning" text="dark">High</Badge>
      case 'medium':
        return <Badge bg="info">Medium</Badge>
      case 'low':
        return <Badge bg="success">Low</Badge>
      default:
        return <Badge bg="secondary">{riskLevel}</Badge>
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return '📈'
      case 'decreasing':
        return '📉'
      case 'stable':
        return '➡️'
      default:
        return '📊'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <Card className={`inventory-forecast-widget ${className}`}>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <span className="fs-5">📦</span>
          <strong>AI Inventory Forecast ({forecastDays} days)</strong>
        </div>
        <div className="d-flex align-items-center gap-2">
          {forecast && (
            <Button variant="outline-secondary" size="sm" onClick={handleRefresh}>
              🔄 New Forecast
            </Button>
          )}
          {!forecast && (
            <Badge bg="secondary" pill>
              {creditCost} credits
            </Badge>
          )}
        </div>
      </Card.Header>

      <Card.Body>
        {!hasEnoughCredits && !forecast && (
          <Alert variant="danger">
            <Alert.Heading>Insufficient Credits</Alert.Heading>
            <p>
              You need {creditCost} credits for inventory forecasting. Your current balance is{' '}
              {currentBalance.toFixed(2)} credits.
            </p>
            <Button variant="primary" size="sm" href="/app/ai">
              Purchase Credits
            </Button>
          </Alert>
        )}

        {error && (
          <Alert variant="danger">
            <div className="d-flex align-items-start gap-2">
              <span>⚠️</span>
              <div>
                <strong>Forecast Failed</strong>
                <p className="mb-0 mt-1">{error}</p>
              </div>
            </div>
          </Alert>
        )}

        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" className="mb-3" />
            <p className="text-muted mb-0">AI is analyzing inventory patterns...</p>
            <small className="text-muted">This may take up to 30 seconds</small>
          </div>
        )}

        {!forecast && !loading && (
          <div className="text-center py-4">
            <p className="text-muted mb-3">
              Generate AI-powered inventory forecast to predict stockouts and get reorder recommendations
            </p>
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={!hasEnoughCredits}
              size="lg"
            >
              📊 Generate Forecast
            </Button>
          </div>
        )}

        {forecast && !loading && (
          <div className="forecast-results">
            {/* Summary Stats */}
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <div className="stat-card bg-danger bg-opacity-10 p-3 rounded">
                  <small className="text-muted d-block">Critical Items</small>
                  <h4 className="mb-0 text-danger">{forecast.summary.critical_items}</h4>
                </div>
              </div>
              <div className="col-md-3">
                <div className="stat-card bg-warning bg-opacity-10 p-3 rounded">
                  <small className="text-muted d-block">High Risk</small>
                  <h4 className="mb-0 text-warning">{forecast.summary.high_risk_items}</h4>
                </div>
              </div>
              <div className="col-md-3">
                <div className="stat-card bg-info bg-opacity-10 p-3 rounded">
                  <small className="text-muted d-block">Medium Risk</small>
                  <h4 className="mb-0 text-info">{forecast.summary.medium_risk_items}</h4>
                </div>
              </div>
              <div className="col-md-3">
                <div className="stat-card bg-success bg-opacity-10 p-3 rounded">
                  <small className="text-muted d-block">Total Reorder Value</small>
                  <h4 className="mb-0 text-success">
                    {formatCurrency(forecast.summary.total_recommended_reorder_value)}
                  </h4>
                </div>
              </div>
            </div>

            <Alert variant="info" className="mb-4">
              <strong>Analyzed:</strong> {forecast.total_products_analyzed} products •{' '}
              <strong>At Risk:</strong> {forecast.products_at_risk} products need attention
            </Alert>

            {/* Forecasts Table */}
            {forecast.forecasts.length > 0 ? (
              <div className="table-responsive">
                <Table hover size="sm">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="text-center">Risk</th>
                      <th className="text-end">Current Stock</th>
                      <th className="text-center">Stockout Date</th>
                      <th className="text-center">Days Until</th>
                      <th className="text-end">Reorder Qty</th>
                      <th className="text-center">Reorder By</th>
                      <th className="text-center">Trend</th>
                      <th className="text-end">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.forecasts
                      .sort((a, b) => {
                        const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 }
                        return riskOrder[a.risk_level] - riskOrder[b.risk_level]
                      })
                      .map((product) => (
                        <tr
                          key={product.product_id}
                          className={product.risk_level === 'critical' ? 'table-danger' : ''}
                        >
                          <td>
                            <div>
                              <strong>{product.product_name}</strong>
                              <br />
                              <small className="text-muted">{product.sku}</small>
                            </div>
                          </td>
                          <td className="text-center">{getRiskBadge(product.risk_level)}</td>
                          <td className="text-end">
                            <Badge
                              bg={
                                product.current_stock <= product.reorder_point
                                  ? 'danger'
                                  : 'secondary'
                              }
                            >
                              {product.current_stock}
                            </Badge>
                          </td>
                          <td className="text-center">
                            {product.predicted_stockout_date ? (
                              <span className="text-danger">
                                {formatDate(product.predicted_stockout_date)}
                              </span>
                            ) : (
                              <span className="text-muted">N/A</span>
                            )}
                          </td>
                          <td className="text-center">
                            {product.days_until_stockout !== null ? (
                              <Badge
                                bg={
                                  product.days_until_stockout <= 7
                                    ? 'danger'
                                    : product.days_until_stockout <= 14
                                    ? 'warning'
                                    : 'info'
                                }
                              >
                                {product.days_until_stockout}d
                              </Badge>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td className="text-end">
                            <strong>{product.recommended_reorder_quantity}</strong>
                          </td>
                          <td className="text-center">
                            {product.recommended_reorder_date ? (
                              <span className="text-primary">
                                {formatDate(product.recommended_reorder_date)}
                              </span>
                            ) : (
                              <span className="text-muted">Now</span>
                            )}
                          </td>
                          <td className="text-center">
                            <span title={product.trend}>
                              {getTrendIcon(product.trend)}
                            </span>
                          </td>
                          <td className="text-end">
                            <div style={{ width: '80px' }}>
                              <ProgressBar
                                now={product.confidence_score * 100}
                                variant={
                                  product.confidence_score >= 0.8
                                    ? 'success'
                                    : product.confidence_score >= 0.6
                                    ? 'info'
                                    : 'warning'
                                }
                                style={{ height: '8px' }}
                              />
                              <small className="text-muted">
                                {(product.confidence_score * 100).toFixed(0)}%
                              </small>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <Alert variant="success">
                <strong>All Clear!</strong> No products require immediate attention based on current
                forecast.
              </Alert>
            )}

            <div className="mt-3 text-muted small">
              <div>Credits used: {forecast.credits_used}</div>
              <div>New balance: {Number(forecast.new_balance).toFixed(2)}</div>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  )
}

export default InventoryForecastWidget
