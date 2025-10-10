import { Form, Button, Spinner } from 'react-bootstrap'
import type { UUID } from '../../../../types/common'

export interface CustomerOption {
  id: UUID
  name: string
}

interface CustomerSelectPanelProps {
  saleType: 'RETAIL' | 'WHOLESALE'
  selectedCustomer: UUID | null
  onCustomerChange: (customerId: UUID | null) => void
  customers: CustomerOption[]
  loading?: boolean
  errorMessage?: string | null
  onAddCustomer?: () => void
  disabled?: boolean
}

export function CustomerSelectPanel({
  saleType,
  selectedCustomer,
  onCustomerChange,
  customers,
  loading,
  errorMessage,
  onAddCustomer,
  disabled,
}: CustomerSelectPanelProps) {
  return (
    <div>
      <Form.Group className="mb-3">
        <Form.Label>{saleType === 'WHOLESALE' ? 'Select Customer *' : 'Select Customer (Optional)'}</Form.Label>
        <Form.Select
          value={selectedCustomer ?? ''}
          onChange={(e) => onCustomerChange(e.target.value ? (e.target.value as UUID) : null)}
          disabled={disabled || loading}
        >
          <option value="">Walk-in Customer</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </Form.Select>
        <Form.Text className="text-muted">
          {loading ? (
            <span className="d-inline-flex align-items-center gap-1">
              <Spinner animation="border" size="sm" role="status" /> Loading customers…
            </span>
          ) : errorMessage ? (
            <span className="text-danger">{errorMessage}</span>
          ) : (
            saleType === 'WHOLESALE' && 'Wholesale sales require a customer'
          )}
        </Form.Text>
      </Form.Group>

      <Button
        variant="outline-primary"
        size="sm"
        className="w-100"
        onClick={onAddCustomer}
        disabled={disabled}
      >
        + New Customer
      </Button>
    </div>
  )
}
