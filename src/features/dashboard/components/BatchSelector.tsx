import Form from 'react-bootstrap/Form'
import type { BatchInfo } from '../../../types/inventory.js'

interface BatchSelectorProps {
  batches: BatchInfo[]
  selectedBatchId: string | null
  onBatchChange: (batchId: string | null) => void
  disabled?: boolean
}

const BatchSelector = ({ 
  batches, 
  selectedBatchId, 
  onBatchChange,
  disabled = false
}: BatchSelectorProps) => {
  // Only show if there are multiple batches
  if (batches.length <= 1) {
    return null
  }

  const formatBatchLabel = (batch: BatchInfo) => {
    const date = new Date(batch.created_at).toLocaleDateString()
    const identifier = batch.batch_identifier || 'Unnamed batch'
    return `${identifier} (${date})`
  }

  return (
    <Form.Group className="mb-3">
      <Form.Label>View by batch</Form.Label>
      <Form.Select
        value={selectedBatchId || ''}
        onChange={(e) => onBatchChange(e.target.value || null)}
        disabled={disabled}
      >
        <option value="">All batches (aggregated)</option>
        {batches.map((batch) => (
          <option key={batch.id} value={batch.id}>
            {formatBatchLabel(batch)}
          </option>
        ))}
      </Form.Select>
      {selectedBatchId && (
        <Form.Text className="text-muted">
          Showing statistics for selected batch only
        </Form.Text>
      )}
    </Form.Group>
  )
}

export default BatchSelector
