import { useMemo } from 'react'
import { Badge, Button, Card, Col, Container, Row, Stack } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import './LandingPage.css'

interface LandingFeature {
  title: string
  description: string
  icon: string
  benefit: string
}

const landingFeatures: LandingFeature[] = [
  {
    title: 'Comprehensive onboarding',
    description: 'Invite your team, configure tills, and launch loyalty programs in a single guided setup.',
    icon: '🚀',
    benefit: 'Go live in under 48 hours with curated templates for retail, quick-service, and hospitality.',
  },
  {
    title: 'Inventory intelligence',
    description: 'Always-on inventory sync keeps stock accurate across channels, warehouses, and suppliers.',
    icon: '📦',
    benefit: 'Automated replenishment rules prevent outages and signal trending products instantly.',
  },
  {
    title: 'Subscription-aware workflows',
    description: 'Recurring billing, add-ons, and proration handled automatically in every transaction.',
    icon: '💳',
    benefit: 'Protect revenue with smart dunning, retry logic, and proactive expiring-card reminders.',
  },
]

const LandingPage = () => {
  const navigate = useNavigate()

  const stats = useMemo(
    () => [
      { label: 'Retail locations powered', value: '2.3K+' },
      { label: 'Transactions processed monthly', value: '4.8M' },
      { label: 'Inventory sync uptime', value: '99.98%' },
    ],
    [],
  )

  return (
    <main className="landing-page">
      <div className="landing-page__halo" aria-hidden />
      <Container fluid="lg" className="landing-hero">
        <Row className="align-items-center gy-5">
          <Col lg={7} className="landing-hero__copy">
            <Badge bg="primary" pill className="landing-pill">
              POS Suite
            </Badge>
            <h1>Scale your POS operations effortlessly</h1>
            <p>
              Manage inventory, sales, bookkeeping, and subscriptions in one cohesive platform. Accelerate revenue
              with unified workflows and intelligent insights your team will actually enjoy using.
            </p>
            <Stack direction="horizontal" gap={3} className="flex-wrap">
              <Button size="lg" className="btn-gradient" onClick={() => navigate('/register')}>
                Get started
              </Button>
              <Button size="lg" variant="outline-light" className="btn-glass" onClick={() => navigate('/login')}>
                Sign in
              </Button>
              <Link to="/app" className="landing-link">
                Explore dashboard preview
              </Link>
            </Stack>
            <div className="landing-hero__stats" role="list">
              {stats.map((stat) => (
                <article key={stat.label} className="landing-stat" role="listitem">
                  <p className="landing-stat__value">{stat.value}</p>
                  <p className="landing-stat__label">{stat.label}</p>
                </article>
              ))}
            </div>
          </Col>

          <Col lg={5} className="d-none d-lg-block">
            <Card className="hero-panel shadow-lg">
              <Card.Body>
                <div className="hero-panel__header">
                  <div>
                    <span className="dot dot--success" />
                    <span className="dot dot--sky" />
                    <span className="dot dot--rose" />
                  </div>
                  <span className="hero-panel__title">Unified register</span>
                </div>

                <div className="hero-panel__preview">
                  <div className="hero-preview__card">
                    <h3>Live basket</h3>
                    <ul>
                      <li>
                        <span>Espresso Blend Beans</span>
                        <span>$18</span>
                      </li>
                      <li>
                        <span>Reusable Cup</span>
                        <span>$12</span>
                      </li>
                      <li>
                        <span>Membership Renewal</span>
                        <span>$59</span>
                      </li>
                    </ul>
                    <footer>
                      <div>
                        <small>Today&apos;s forecast</small>
                        <strong>+18% vs target</strong>
                      </div>
                      <Button size="sm" className="btn-glass">
                        Launch promo
                      </Button>
                    </footer>
                  </div>

                  <div className="hero-preview__timeline">
                    <h4>Next best actions</h4>
                    <ol>
                      <li>
                        <span className="timeline-bullet timeline-bullet--emerald" />
                        Approve vendor restock for high performers
                      </li>
                      <li>
                        <span className="timeline-bullet timeline-bullet--sky" />
                        Schedule curbside pickup slot for 6pm rush
                      </li>
                      <li>
                        <span className="timeline-bullet timeline-bullet--rose" />
                        Send loyalty push for abandoned baskets
                      </li>
                    </ol>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      <Container fluid="lg" className="landing-features">
        <Row className="gy-4">
          {landingFeatures.map((feature) => (
            <Col key={feature.title} md={6} lg={4}>
              <Card className="feature-card h-100">
                <Card.Body>
                  <div className="feature-icon" aria-hidden>
                    {feature.icon}
                  </div>
                  <Card.Title>{feature.title}</Card.Title>
                  <Card.Text>{feature.description}</Card.Text>
                  <div className="feature-highlight">{feature.benefit}</div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>

      <Container fluid="lg" className="landing-testimonial">
        <Card className="testimonial-card">
          <Card.Body>
            <blockquote>
              “We rolled out the POS Suite across 32 stores in one weekend. Our team finally has a register that feels
              modern, and our finance team loves the real-time reporting.”
            </blockquote>
            <footer>
              <span className="testimonial-name">Candice Ortega</span>
              <span className="testimonial-role">COO, North Coast Market</span>
            </footer>
          </Card.Body>
        </Card>
      </Container>
    </main>
  )
}

export default LandingPage
