import React from 'react'
import { Modal } from 'react-bootstrap'
import type { TransferRequest } from '../../../../types/inventory.js'
import type { UUID } from '../../../../types/common.js'
import EditFulfilledRequestForm from './EditFulfilledRequestForm.js'

interface EditFulfilledRequestModalProps {
  show: boolean
  request: TransferRequest | null
  onHide: () => void
  onSubmit: (updates: { lineItems: Array<{ id: UUID; quantity: number; notes: string }> }) => void
  isSubmitting?: boolean
}

export const EditFulfilledRequestModal: React.FC<EditFulfilledRequestModalProps> = ({
  show,
  request,
  onHide,
  onSubmit,
  isSubmitting = false
}) => {
  if (!request) return null

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      size="xl"
      backdrop="static"
      keyboard={!isSubmitting}
    >
      <Modal.Header closeButton={!isSubmitting}>
        <Modal.Title>Edit Fulfilled Request</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <EditFulfilledRequestForm
          request={request}
          onSubmit={onSubmit}
          onCancel={onHide}
          isSubmitting={isSubmitting}
        />
      </Modal.Body>
    </Modal>
  )
}

export default EditFulfilledRequestModal
