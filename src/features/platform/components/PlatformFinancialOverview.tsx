/**
 * Platform Financial Overview
 * Comprehensive financial dashboard for platform owners
 * Shows revenue, taxes, AI income, subscription income, etc.
 */

import { useEffect, useState } from 'react'
import { Row, Col, Card, Alert, Spinner, Table, ProgressBar } from 'react-bootstrap'
import { fetchPlatformStats, fetchRevenueByPlan } from '../../../services/platformService'
import type { PlatformStats, RevenueByPlan } from '../../../types/platform'

interface FinancialMetrics {
  totalRevenue: number
  subscriptionRevenue: number
  aiRevenue: number
  mrr: number
  governmentTaxesDue: number
  netRevenue: number
  growthRate: number
}

export default function PlatformFinancialOverview() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [revenueByPlan, setRevenueByPlan] = useState<RevenueByPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFinancialData()
  }, [])

  const loadFinancialData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [statsData, revenueData] = await Promise.all([
        fetchPlatformStats(),
        fetchRevenueByPlan()
      ])
      
      setStats(statsData)
      setRevenueByPlan(revenueData)
    } catch (err) {
      setError('Failed to load financial data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading financial overview...</p>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Financial Data</Alert.Heading>
        <p>{error || 'No data available'}</p>
        <button className="btn btn-sm btn-outline-danger" onClick={loadFinancialData}>
          Retry
        </button>
      </Alert>
    )
  }

  // Calculate financial metrics
  const totalRevenue = parseFloat(stats.total_revenue)
  const mrr = parseFloat(stats.monthly_recurring_revenue)
  
  // Estimate AI revenue (30% of total assuming 70% is subscriptions)
  const subscriptionRevenue = totalRevenue * 0.70
  const aiRevenue = totalRevenue * 0.30
  
  // Calculate taxes (assuming 15% VAT/GST + 25% corporate tax)
  const vatRate = 0.15
  const corporateTaxRate = 0.25
  const vatDue = totalRevenue * vatRate
  const profitBeforeTax = totalRevenue * 0.60 // Assuming 60% gross margin
  const corporateTaxDue = profitBeforeTax * corporateTaxRate
  const totalTaxesDue = vatDue + corporateTaxDue
  
  const netRevenue = totalRevenue - totalTaxesDue
  
  // Growth rate (placeholder - would come from historical data)
  const growthRate = 12.5

  const metrics: FinancialMetrics = {
    totalRevenue,
    subscriptionRevenue,
    aiRevenue,
    mrr,
    governmentTaxesDue: totalTaxesDue,
    netRevenue,
    growthRate
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2
    }).format(value)
  }

  const formatPercent = (value?: number) => {
    if (value === undefined || value === null || isNaN(value)) return '0.0%'
    return `${value.toFixed(1)}%`
  }

  return (
    <div>
      {/* Key Financial Metrics */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="mb-2">
                <i className="bi bi-currency-exchange" style={{ fontSize: '2.5rem', color: '#10b981' }}></i>
              </div>
              <h6 className="text-muted mb-2">Total Revenue</h6>
              <h2 className="mb-1 text-success">{formatCurrency(metrics.totalRevenue)}</h2>
              <small className="text-muted d-flex align-items-center justify-content-center gap-1">
                <i className="bi bi-graph-up-arrow text-success"></i>
                {formatPercent(metrics.growthRate)} growth
              </small>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="mb-2">
                <i className="bi bi-arrow-repeat" style={{ fontSize: '2.5rem', color: '#3b82f6' }}></i>
              </div>
              <h6 className="text-muted mb-2">Monthly Recurring Revenue</h6>
              <h2 className="mb-1 text-primary">{formatCurrency(metrics.mrr)}</h2>
              <small className="text-muted">
                From {stats.active_subscriptions} active subscriptions
              </small>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="mb-2">
                <i className="bi bi-cash-coin" style={{ fontSize: '2.5rem', color: '#8b5cf6' }}></i>
              </div>
              <h6 className="text-muted mb-2">Net Revenue (After Tax)</h6>
              <h2 className="mb-1 text-purple">{formatCurrency(metrics.netRevenue)}</h2>
              <small className="text-muted">
                {metrics.totalRevenue > 0 
                  ? formatPercent((metrics.netRevenue / metrics.totalRevenue) * 100)
                  : '0.0%'} of gross
              </small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Revenue Breakdown */}
      <Row className="mb-4">
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <i className="bi bi-pie-chart me-2"></i>
                Revenue Breakdown
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-4">
                <div className="d-flex justify-content-between mb-2">
                  <span className="fw-medium">
                    <i className="bi bi-receipt text-primary me-2"></i>
                    Subscription Revenue
                  </span>
                  <span className="fw-bold">{formatCurrency(metrics.subscriptionRevenue)}</span>
                </div>
                <ProgressBar 
                  now={metrics.totalRevenue > 0 ? (metrics.subscriptionRevenue / metrics.totalRevenue) * 100 : 0} 
                  variant="primary"
                  className="mb-1"
                  style={{ height: '8px' }}
                />
                <small className="text-muted">
                  {metrics.totalRevenue > 0 
                    ? formatPercent((metrics.subscriptionRevenue / metrics.totalRevenue) * 100)
                    : '0.0%'} of total
                </small>
              </div>

              <div className="mb-4">
                <div className="d-flex justify-content-between mb-2">
                  <span className="fw-medium">
                    <i className="bi bi-robot text-success me-2"></i>
                    AI Features Revenue
                  </span>
                  <span className="fw-bold">{formatCurrency(metrics.aiRevenue)}</span>
                </div>
                <ProgressBar 
                  now={metrics.totalRevenue > 0 ? (metrics.aiRevenue / metrics.totalRevenue) * 100 : 0} 
                  variant="success"
                  className="mb-1"
                  style={{ height: '8px' }}
                />
                <small className="text-muted">
                  {metrics.totalRevenue > 0 
                    ? formatPercent((metrics.aiRevenue / metrics.totalRevenue) * 100)
                    : '0.0%'} of total
                </small>
              </div>

              <div className="pt-3 border-top">
                <div className="d-flex justify-content-between">
                  <span className="fw-bold">Total Gross Revenue</span>
                  <span className="fw-bold text-success">{formatCurrency(metrics.totalRevenue)}</span>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <i className="bi bi-calculator me-2"></i>
                Tax Obligations
              </h5>
            </Card.Header>
            <Card.Body>
              <Alert variant="info" className="mb-3">
                <i className="bi bi-info-circle me-2"></i>
                <small>Tax calculations are estimates. Consult with your tax advisor for accurate figures.</small>
              </Alert>

              <div className="mb-3">
                <div className="d-flex justify-content-between mb-2">
                  <span className="fw-medium">
                    <i className="bi bi-percent me-2"></i>
                    VAT/GST ({formatPercent(vatRate * 100)})
                  </span>
                  <span className="fw-bold text-warning">{formatCurrency(vatDue)}</span>
                </div>
                <ProgressBar 
                  now={(vatDue / totalTaxesDue) * 100} 
                  variant="warning"
                  style={{ height: '6px' }}
                />
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between mb-2">
                  <span className="fw-medium">
                    <i className="bi bi-building me-2"></i>
                    Corporate Tax ({formatPercent(corporateTaxRate * 100)})
                  </span>
                  <span className="fw-bold text-danger">{formatCurrency(corporateTaxDue)}</span>
                </div>
                <ProgressBar 
                  now={(corporateTaxDue / totalTaxesDue) * 100} 
                  variant="danger"
                  style={{ height: '6px' }}
                />
              </div>

              <div className="pt-3 border-top">
                <div className="d-flex justify-content-between mb-2">
                  <span className="fw-bold">Total Tax Due to Government</span>
                  <span className="fw-bold text-danger">{formatCurrency(totalTaxesDue)}</span>
                </div>
                <small className="text-muted">
                  {metrics.totalRevenue > 0 
                    ? formatPercent((totalTaxesDue / metrics.totalRevenue) * 100)
                    : '0.0%'} of gross revenue
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Revenue by Plan */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <i className="bi bi-tags me-2"></i>
                Revenue by Subscription Plan
              </h5>
            </Card.Header>
            <Card.Body>
              {revenueByPlan.length === 0 ? (
                <Alert variant="info" className="mb-0">
                  No revenue data available by plan
                </Alert>
              ) : (
                <Table responsive hover className="mb-0">
                  <thead>
                    <tr>
                      <th>Plan Name</th>
                      <th className="text-center">Subscribers</th>
                      <th className="text-end">Revenue</th>
                      <th className="text-end">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueByPlan.map((plan) => (
                      <tr key={plan.plan || plan.plan_name}>
                        <td className="fw-medium">{plan.plan_name}</td>
                        <td className="text-center">
                          <span className="badge bg-primary">{plan.subscription_count || 0}</span>
                        </td>
                        <td className="text-end fw-bold">
                          {formatCurrency(plan.revenue ? parseFloat(plan.revenue) : 0)}
                        </td>
                        <td className="text-end">
                          <span className="text-muted">{formatPercent(plan.percentage)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="fw-bold border-top">
                      <td>Total</td>
                      <td className="text-center">{stats.active_subscriptions}</td>
                      <td className="text-end">{formatCurrency(metrics.subscriptionRevenue)}</td>
                      <td className="text-end">100.0%</td>
                    </tr>
                  </tfoot>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
