import { useEffect, useMemo, useState } from 'react'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import ListGroup from 'react-bootstrap/ListGroup'
import Offcanvas from 'react-bootstrap/Offcanvas'
import Spinner from 'react-bootstrap/Spinner'
import type { Membership } from '../../../../types/employees'
import type { UUID } from '../../../../types/common'

interface StorefrontAssignmentManagerProps {
  show: boolean
  onClose: () => void
  membership: Membership | null
  storefrontOptions: Array<{ id: UUID; name: string }>
  onSaveAssignments: (membershipId: UUID, storefrontIds: UUID[]) => Promise<void> | void
  isSaving?: boolean
}

const StorefrontAssignmentManager = ({
  show,
  onClose,
  membership,
  storefrontOptions,
  onSaveAssignments,
  isSaving = false,
}: StorefrontAssignmentManagerProps) => {
  const [selectedStorefrontIds, setSelectedStorefrontIds] = useState<UUID[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (membership) {
      setSelectedStorefrontIds(membership.assigned_storefronts.map((storefront) => storefront.id))
    } else {
      setSelectedStorefrontIds([])
    }
    setHasChanges(false)
  }, [membership])

  const assignedStorefrontNames = useMemo(
    () => membership?.assigned_storefronts.map((storefront) => storefront.name) ?? [],
    [membership],
  )

  const handleToggleStorefront = (storefrontId: UUID) => {
    if (!membership) return
    setSelectedStorefrontIds((prev) => {
      const isSelected = prev.includes(storefrontId)
      const next = isSelected ? prev.filter((id) => id !== storefrontId) : [...prev, storefrontId]
      setHasChanges(true)
      return next
    })
  }

  const handleSaveAssignments = async () => {
    if (!membership) return
    try {
      await onSaveAssignments(membership.id, selectedStorefrontIds)
      setHasChanges(false)
    } catch {
      // Keep hasChanges true if save fails so the user can attempt again.
    }
  }

  return (
    <Offcanvas show={show} onHide={onClose} placement="end" className="w-full max-w-md">
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Assign storefronts</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body className="space-y-4">
        {membership ? (
          <>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{membership.user.name}</p>
              <p className="text-xs text-slate-500">{membership.user.email}</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">Current storefronts</p>
              <p className="text-xs text-slate-600">
                {assignedStorefrontNames.length ? assignedStorefrontNames.join(', ') : 'Unassigned'}
              </p>
            </div>
            <Form>
              <Form.Group controlId="assignmentStorefrontList" className="space-y-2">
                <Form.Label>Storefronts</Form.Label>
                <ListGroup className="rounded-3xl border border-slate-200">
                  {storefrontOptions.length === 0 ? (
                    <ListGroup.Item className="text-sm text-slate-500">
                      No storefronts available. Create one to assign staff.
                    </ListGroup.Item>
                  ) : (
                    storefrontOptions.map((storefront) => {
                      const isSelected = selectedStorefrontIds.includes(storefront.id)
                      return (
                        <ListGroup.Item
                          key={storefront.id}
                          action
                          onClick={() => handleToggleStorefront(storefront.id)}
                          className={`flex items-center justify-between ${
                            isSelected ? 'bg-brand-primary/10 text-brand-primary' : ''
                          }`}
                          disabled={isSaving}
                        >
                          <span>{storefront.name}</span>
                          <Form.Check type="checkbox" checked={isSelected} readOnly disabled={isSaving} />
                        </ListGroup.Item>
                      )
                    })
                  )}
                </ListGroup>
              </Form.Group>
            </Form>
            <div className="flex items-center justify-between gap-3">
              <Button variant="outline-secondary" className="rounded-pill px-4" onClick={onClose} disabled={isSaving}>
                Close
              </Button>
              <Button
                variant="primary"
                className="rounded-pill px-4"
                onClick={handleSaveAssignments}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <Spinner animation="border" size="sm" role="status" />
                    Saving…
                  </span>
                ) : (
                  'Save changes'
                )}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">Select an employee to manage their storefront assignments.</p>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  )
}

export default StorefrontAssignmentManager
