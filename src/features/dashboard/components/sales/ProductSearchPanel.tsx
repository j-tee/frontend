import { Card, Alert } from 'react-bootstrap'
import type { UUID } from '../../../../types/common'

interface ProductSearchPanelProps {
  storefrontId: UUID
  saleId?: UUID
  disabled?: boolean
}

export function ProductSearchPanel({ storefrontId, saleId, disabled }: ProductSearchPanelProps) {
  return (
    <Card>
      <Card.Header>
        <h6 className="mb-0">Search Products</h6>
      </Card.Header>
      <Card.Body>
        {disabled ? (
          <Alert variant="info" className="mb-0">
            Creating sale... Please wait.
          </Alert>
        ) : (
          <div className="text-center text-muted py-4">
            <p>Product search coming soon</p>
            <small>Storefront: {storefrontId}</small>
            {saleId && <><br /><small>Sale: {saleId}</small></>}
          </div>
        )}
      </Card.Body>
    </Card>
  )
}
