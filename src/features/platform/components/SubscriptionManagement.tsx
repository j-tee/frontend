import { useEffect, useState } from 'react'
import {
  Row,
  Col,
  Card,
  Button,
  Spinner,
  Alert,
  Table,
  Badge,
  Form,
  InputGroup
} from 'react-bootstrap'
import { fetchAllSubscriptions } from '../../../services/platformService'
import type { PlatformSubscription } from '../../../types/platform'

export default function SubscriptionManagement() {
  const [subscriptions, setSubscriptions] = useState<PlatformSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    loadSubscriptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const loadSubscriptions = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetchAllSubscriptions({
        status: statusFilter || undefined,
        search: searchTerm || undefined
      })
      setSubscriptions(response.results)
    } catch {
      setError('Failed to load subscriptions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    loadSubscriptions()
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      ACTIVE: 'success',
      TRIAL: 'info',
      PAST_DUE: 'warning',
      EXPIRED: 'danger',
      CANCELLED: 'secondary',
      SUSPENDED: 'dark'
    }
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>
  }

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Invalid Date'
      return date.toLocaleDateString()
    } catch {
      return 'Invalid Date'
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-3">Loading subscriptions...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Subscriptions</Alert.Heading>
        <p>{error}</p>
      </Alert>
    )
  }

  return (
    <>
      <Row className="mb-4">
        <Col>
          <h4>All Subscriptions</h4>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={6}>
          <InputGroup>
            <Form.Control
              placeholder="Search by business name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button variant="primary" onClick={handleSearch}>
              Search
            </Button>
          </InputGroup>
        </Col>
        <Col md={3}>
          <Form.Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="TRIAL">Trial</option>
            <option value="PAST_DUE">Past Due</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="SUSPENDED">Suspended</option>
          </Form.Select>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Auto Renew</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => {
                    // Extract plan name from different possible sources
                    const planName = sub.plan_details?.name || sub.plan?.name || 'No Plan'
                    const planPrice = sub.plan_details?.price || sub.plan?.price
                    const planCurrency = sub.plan_details?.currency || sub.plan?.currency
                    const planCycle = sub.plan_details?.billing_cycle || sub.plan?.billing_cycle
                    
                    return (
                      <tr key={sub.id}>
                        <td>
                          <strong>{sub.business_name}</strong>
                          <br />
                          <small className="text-muted">{sub.business_email}</small>
                          <br />
                          <small className="text-muted">Owner: {sub.business_owner}</small>
                        </td>
                        <td>
                          <strong>{planName}</strong>
                          {planPrice && (
                            <>
                              <br />
                              <small className="text-muted">
                                {planCurrency} {planPrice}
                                {planCycle && ` / ${planCycle}`}
                              </small>
                            </>
                          )}
                        </td>
                        <td>{getStatusBadge(sub.status)}</td>
                        <td>{formatDate(sub.current_period_start)}</td>
                        <td>{formatDate(sub.current_period_end)}</td>
                        <td>
                          <Badge bg={sub.auto_renew ? 'success' : 'secondary'}>
                            {sub.auto_renew ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>

              {subscriptions.length === 0 && (
                <Alert variant="info">
                  No subscriptions found matching your criteria.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  )
}
