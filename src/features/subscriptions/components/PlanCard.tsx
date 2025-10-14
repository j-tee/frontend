import { Card, Badge, Button } from 'react-bootstrap'
import type { Plan } from '../../../types/subscriptions'

interface PlanCardProps {
  plan: Plan
  isCurrent?: boolean
  onUpgrade?: (planId: string) => void
}

export function PlanCard({ plan, isCurrent = false, onUpgrade }: PlanCardProps) {
  return (
    <Card className={`h-100 ${isCurrent ? 'border-primary' : ''}`}>
      <Card.Header className="text-center">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="mb-0">{plan.name}</h5>
          {isCurrent && (
            <Badge bg="success">Current</Badge>
          )}
          {plan.is_popular && !isCurrent && (
            <Badge bg="warning">Popular</Badge>
          )}
        </div>
        <div className="display-6 fw-bold">
          {plan.currency} {plan.price}
        </div>
        <div className="text-muted small">per {plan.billing_cycle.toLowerCase()}</div>
      </Card.Header>
      <Card.Body>
        <p className="text-muted">{plan.description}</p>
        
        <hr />
        
        <ul className="list-unstyled">
          <li className="mb-2">
            <i className="bi bi-shop text-primary me-2"></i>
            <strong>{plan.max_storefronts}</strong> Storefront{plan.max_storefronts !== 1 ? 's' : ''}
          </li>
          <li className="mb-2">
            <i className="bi bi-box-seam text-primary me-2"></i>
            <strong>{plan.max_products || 'Unlimited'}</strong> Products
          </li>
          <li className="mb-2">
            <i className="bi bi-people text-primary me-2"></i>
            <strong>{plan.max_employees}</strong> Employee{plan.max_employees !== 1 ? 's' : ''}
          </li>
          
          {Object.entries(plan.features).map(([key, value]) => 
            value && (
              <li key={key} className="mb-2">
                <i className="bi bi-check-circle-fill text-success me-2"></i>
                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </li>
            )
          )}
        </ul>
      </Card.Body>
      <Card.Footer className="text-center">
        {!isCurrent && onUpgrade && (
          <Button 
            variant="outline-primary" 
            className="w-100"
            onClick={() => onUpgrade(plan.id)}
          >
            Select Plan
          </Button>
        )}
        {isCurrent && (
          <Button variant="primary" className="w-100" disabled>
            <i className="bi bi-check-circle me-2"></i>
            Current Plan
          </Button>
        )}
      </Card.Footer>
    </Card>
  )
}
