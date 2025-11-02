import { useEffect, useState } from 'react'
import { Row, Col, Card, Spinner, Alert } from 'react-bootstrap'
import { fetchPlatformStats, fetchRevenueByPlan } from '../../../services/platformService'
import type { PlatformStats as Stats, RevenueByPlan } from '../../../types/platform'

export default function PlatformStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [revenue, setRevenue] = useState<RevenueByPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [statsData, revenueData] = await Promise.all([
        fetchPlatformStats(),
        fetchRevenueByPlan()
      ])
      
      setStats(statsData)
      setRevenue(revenueData)
    } catch (err) {
      setError('Failed to load platform statistics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-3">Loading statistics...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Stats</Alert.Heading>
        <p>{error}</p>
      </Alert>
    )
  }

  if (!stats) {
    return (
      <Alert variant="info">
        No statistics available
      </Alert>
    )
  }

  return (
    <>
      {/* Business Stats */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-primary">
            <Card.Body>
              <h6 className="text-muted mb-2">Total Businesses</h6>
              <h3 className="mb-0">{stats.total_businesses}</h3>
              <small className="text-success">
                {stats.active_businesses} active
              </small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="border-success">
            <Card.Body>
              <h6 className="text-muted mb-2">Total Users</h6>
              <h3 className="mb-0">{stats.total_users}</h3>
              <small className="text-success">
                {stats.active_users} active
              </small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="border-info">
            <Card.Body>
              <h6 className="text-muted mb-2">Subscriptions</h6>
              <h3 className="mb-0">{stats.total_subscriptions}</h3>
              <small className="text-info">
                {stats.active_subscriptions} active
              </small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="border-warning">
            <Card.Body>
              <h6 className="text-muted mb-2">Trial Subscriptions</h6>
              <h3 className="mb-0">{stats.trial_subscriptions}</h3>
              <small className="text-warning">
                {stats.expired_subscriptions} expired
              </small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Revenue Stats */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Body>
              <h6 className="text-muted mb-2">Total Revenue</h6>
              <h2 className="mb-0 text-success">{stats.total_revenue}</h2>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card>
            <Card.Body>
              <h6 className="text-muted mb-2">Monthly Recurring Revenue (MRR)</h6>
              <h2 className="mb-0 text-primary">{stats.monthly_recurring_revenue}</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Revenue by Plan */}
      {revenue.length > 0 && (
        <Row>
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Revenue by Plan</h5>
              </Card.Header>
              <Card.Body>
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Plan</th>
                        <th>Subscriptions</th>
                        <th>Revenue</th>
                        <th>% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenue.map((item) => (
                        <tr key={item.plan}>
                          <td><strong>{item.plan_name}</strong></td>
                          <td>{item.subscription_count}</td>
                          <td className="text-success">{item.revenue}</td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="progress flex-grow-1 me-2" style={{ height: '20px' }}>
                                <div
                                  className="progress-bar bg-primary"
                                  role="progressbar"
                                  style={{ width: `${item.percentage || 0}%` }}
                                  aria-valuenow={item.percentage || 0}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                >
                                  {(item.percentage || 0).toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </>
  )
}
