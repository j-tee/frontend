/**
 * Platform System Health
 * Monitor system health, performance, and infrastructure
 */

import { Row, Col, Card, Alert, Badge, ProgressBar } from 'react-bootstrap'

export default function PlatformSystemHealth() {
  // Mock data - replace with real API calls
  const systemMetrics = {
    apiStatus: 'operational',
    databaseStatus: 'operational',
    paymentGateway: 'operational',
    aiService: 'operational',
    uptime: 99.97,
    responseTime: 124,
    activeConnections: 1247
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return <Badge bg="success">Operational</Badge>
      case 'degraded':
        return <Badge bg="warning">Degraded</Badge>
      case 'outage':
        return <Badge bg="danger">Outage</Badge>
      default:
        return <Badge bg="secondary">Unknown</Badge>
    }
  }

  return (
    <div>
      <Row className="mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <i className="bi bi-speedometer" style={{ fontSize: '2.5rem', color: '#10b981' }}></i>
              <h6 className="text-muted mb-2 mt-3">System Uptime</h6>
              <h2 className="mb-0 text-success">{systemMetrics.uptime}%</h2>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <i className="bi bi-lightning" style={{ fontSize: '2.5rem', color: '#3b82f6' }}></i>
              <h6 className="text-muted mb-2 mt-3">Avg Response Time</h6>
              <h2 className="mb-0 text-primary">{systemMetrics.responseTime}ms</h2>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <i className="bi bi-diagram-3" style={{ fontSize: '2.5rem', color: '#8b5cf6' }}></i>
              <h6 className="text-muted mb-2 mt-3">Active Connections</h6>
              <h2 className="mb-0 text-purple">{systemMetrics.activeConnections}</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <i className="bi bi-activity me-2"></i>
                Service Status
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-medium">
                    <i className="bi bi-hdd-network me-2"></i>
                    API Server
                  </span>
                  {getStatusBadge(systemMetrics.apiStatus)}
                </div>
                <ProgressBar now={100} variant="success" style={{ height: '4px' }} />
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-medium">
                    <i className="bi bi-database me-2"></i>
                    Database
                  </span>
                  {getStatusBadge(systemMetrics.databaseStatus)}
                </div>
                <ProgressBar now={100} variant="success" style={{ height: '4px' }} />
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-medium">
                    <i className="bi bi-credit-card me-2"></i>
                    Payment Gateway
                  </span>
                  {getStatusBadge(systemMetrics.paymentGateway)}
                </div>
                <ProgressBar now={100} variant="success" style={{ height: '4px' }} />
              </div>

              <div className="mb-0">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-medium">
                    <i className="bi bi-robot me-2"></i>
                    AI Service
                  </span>
                  {getStatusBadge(systemMetrics.aiService)}
                </div>
                <ProgressBar now={100} variant="success" style={{ height: '4px' }} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col>
          <Alert variant="info">
            <i className="bi bi-info-circle me-2"></i>
            <strong>Additional System Monitoring Features:</strong>
            <ul className="mt-2 mb-0">
              <li>Real-time error logs and monitoring</li>
              <li>Performance metrics and bottleneck analysis</li>
              <li>Infrastructure costs and optimization</li>
              <li>Scheduled maintenance windows</li>
              <li>Automated alerts and notifications</li>
            </ul>
          </Alert>
        </Col>
      </Row>
    </div>
  )
}
