import { Card, Alert, Button } from 'react-bootstrap'
// import { useAppDispatch } from '../../../hooks'
// import { markAlertRead, dismissAlert } from '../../../store/slices/subscriptionSlice'
import type { SubscriptionAlert, AlertPriority } from '../../../types/subscriptions'

interface AlertsListProps {
  alerts: SubscriptionAlert[]
}

const getAlertVariant = (priority: AlertPriority): string => {
  const variants: Record<AlertPriority, string> = {
    LOW: 'info',
    MEDIUM: 'primary',
    HIGH: 'warning',
    CRITICAL: 'danger'
  }
  return variants[priority] || 'secondary'
}

const getAlertIcon = (alertType: string): string => {
  const icons: Record<string, string> = {
    PAYMENT_DUE: 'bi-clock-history',
    PAYMENT_FAILED: 'bi-x-circle',
    PAYMENT_SUCCESS: 'bi-check-circle',
    TRIAL_ENDING: 'bi-exclamation-triangle',
    SUBSCRIPTION_EXPIRING: 'bi-calendar-x',
    SUBSCRIPTION_EXPIRED: 'bi-x-octagon',
    USAGE_LIMIT_WARNING: 'bi-speedometer',
    USAGE_LIMIT_REACHED: 'bi-speedometer2',
    SUBSCRIPTION_CANCELLED: 'bi-slash-circle',
    SUBSCRIPTION_SUSPENDED: 'bi-ban',
    SUBSCRIPTION_ACTIVATED: 'bi-check-circle-fill'
  }
  return icons[alertType] || 'bi-info-circle'
}

export function AlertsList({ alerts }: AlertsListProps) {
  // const dispatch = useAppDispatch()
  
  const handleMarkRead = async (alertId: string) => {
    // TODO: Implement markAlertRead action
    // await dispatch(markAlertRead(alertId))
    console.log('Mark read:', alertId)
  }

  const handleDismiss = async (alertId: string) => {
    // TODO: Implement dismissAlert action
    // await dispatch(dismissAlert(alertId))
    console.log('Dismiss:', alertId)
  }
  
  if (alerts.length === 0) {
    return (
      <Card>
        <Card.Header>
          <h5 className="mb-0">Alerts</h5>
        </Card.Header>
        <Card.Body className="text-center text-muted py-4">
          <i className="bi bi-bell-slash fs-1 d-block mb-2"></i>
          <p>No alerts</p>
        </Card.Body>
      </Card>
    )
  }
  
  // Show only unread and recent read alerts (last 5)
  const displayAlerts = [
    ...alerts.filter(a => !a.is_read),
    ...alerts.filter(a => a.is_read).slice(0, 5)
  ].slice(0, 10)
  
  return (
    <Card>
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Alerts</h5>
          {alerts.filter(a => !a.is_read).length > 0 && (
            <span className="badge bg-danger rounded-pill">
              {alerts.filter(a => !a.is_read).length}
            </span>
          )}
        </div>
      </Card.Header>
      <Card.Body className="p-0" style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {displayAlerts.map(alert => (
          <Alert 
            key={alert.id}
            variant={getAlertVariant(alert.priority)}
            className="mb-0 rounded-0 border-start-0 border-end-0"
            style={{ 
              opacity: alert.is_read ? 0.7 : 1,
              borderBottom: '1px solid #dee2e6'
            }}
          >
            <div className="d-flex align-items-start">
              <i className={`${getAlertIcon(alert.alert_type)} me-2 mt-1`}></i>
              <div className="flex-grow-1">
                <Alert.Heading className="h6 mb-1">
                  {alert.title}
                </Alert.Heading>
                <p className="mb-2 small">{alert.message}</p>
                <div className="d-flex gap-2 align-items-center">
                  <small className="text-muted">
                    {new Date(alert.created_at).toLocaleDateString()}
                  </small>
                  {!alert.is_read && (
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 text-decoration-none"
                      onClick={() => handleMarkRead(alert.id)}
                    >
                      Mark as read
                    </Button>
                  )}
                  {!alert.is_dismissed && (
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 text-decoration-none text-danger"
                      onClick={() => handleDismiss(alert.id)}
                    >
                      Dismiss
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Alert>
        ))}
      </Card.Body>
    </Card>
  )
}
