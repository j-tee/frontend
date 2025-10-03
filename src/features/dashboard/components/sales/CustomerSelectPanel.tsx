import { Form, Button } from 'react-bootstrap'
import type { UUID } from '../../../../types/common'

interface CustomerSelectPanelProps {
  saleType: 'RETAIL' | 'WHOLESALE'
  selectedCustomer: UUID | null
  onCustomerChange: (customerId: UUID | null) => void
  disabled?: boolean
}

export function CustomerSelectPanel({
  saleType,
  selectedCustomer,
  onCustomerChange,
  disabled,
}: CustomerSelectPanelProps) {
  return (
    <div>
      <Form.Group className="mb-3">
        <Form.Label>{saleType === 'WHOLESALE' ? 'Select Customer *' : 'Select Customer (Optional)'}</Form.Label>
        <Form.Select
          value={selectedCustomer || ''}
          onChange={(e) => onCustomerChange(e.target.value || null)}
          disabled={disabled}
        >
          <option value="">Walk-in Customer</option>
          <option value="customer-1">John Doe</option>
          <option value="customer-2">Jane Smith</option>
        </Form.Select>
        <Form.Text className="text-muted">
          {saleType === 'WHOLESALE' && 'Wholesale sales require a customer'}
        </Form.Text>
      </Form.Group>

      <Button variant="outline-primary" size="sm" className="w-100">
        + New Customer
      </Button>
    </div>
  )
}
