import { useState } from 'react'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Spinner from 'react-bootstrap/Spinner'
import type { MembershipRole } from '../../../../types/common'
import type { UUID } from '../../../../types/common'

export interface InviteEmployeeFormValues {
  name?: string
  email: string
  role: MembershipRole
  storefrontIds: UUID[]
  sendEmail: boolean
}

interface InviteEmployeeFormProps {
  roles: ReadonlyArray<MembershipRole>
  storefrontOptions: Array<{ id: UUID; name: string }>
  isSubmitting?: boolean
  error?: string | null
  onSubmit: (values: InviteEmployeeFormValues) => Promise<void> | void
}

const DEFAULT_ROLE: MembershipRole = 'STAFF'

const InviteEmployeeForm = ({
  roles,
  storefrontOptions,
  isSubmitting = false,
  error = null,
  onSubmit,
}: InviteEmployeeFormProps) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MembershipRole>(DEFAULT_ROLE)
  const [selectedStorefrontIds, setSelectedStorefrontIds] = useState<UUID[]>([])
  const [sendEmail, setSendEmail] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)

  const handleToggleStorefront = (storefrontId: UUID) => {
    setSelectedStorefrontIds((prev) =>
      prev.includes(storefrontId) ? prev.filter((id) => id !== storefrontId) : [...prev, storefrontId],
    )
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    if (!email.trim()) {
      setFormError('Work email is required to send an invitation.')
      return
    }

    try {
      await onSubmit({
        name: name.trim() ? name.trim() : undefined,
        email: email.trim(),
        role,
        storefrontIds: selectedStorefrontIds,
        sendEmail,
      })
      setName('')
      setEmail('')
      setRole(DEFAULT_ROLE)
      setSelectedStorefrontIds([])
      setSendEmail(true)
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : 'Unable to send invitation right now.'
      setFormError(message)
    }
  }

  return (
    <Form onSubmit={handleSubmit} className="space-y-3">
      {formError ? (
        <Alert variant="warning" className="rounded-3xl border border-amber-200 bg-amber-50 text-amber-700">
          {formError}
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="danger" className="rounded-3xl border border-red-200 bg-red-50 text-red-700">
          {error}
        </Alert>
      ) : null}
      <Form.Group controlId="inviteEmployeeName">
        <Form.Label>Full name (optional)</Form.Label>
        <Form.Control
          type="text"
          placeholder="e.g. Ama Mensah"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={isSubmitting}
        />
      </Form.Group>
      <Form.Group controlId="inviteEmployeeEmail">
        <Form.Label>Work email</Form.Label>
        <Form.Control
          type="email"
          placeholder="ama@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isSubmitting}
        />
      </Form.Group>
      <Form.Group controlId="inviteEmployeeRole">
        <Form.Label>Role</Form.Label>
        <Form.Select value={role} onChange={(event) => setRole(event.target.value as MembershipRole)} disabled={isSubmitting}>
          {roles.map((availableRole) => (
            <option key={availableRole} value={availableRole}>
              {availableRole.charAt(0) + availableRole.slice(1).toLowerCase()}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
      <Form.Group controlId="inviteEmployeeStorefronts">
        <Form.Label>Assign to storefronts</Form.Label>
        <div className="grid gap-2 lg:grid-cols-2">
          {storefrontOptions.length === 0 ? (
            <p className="text-sm text-slate-500">
              Create a storefront first. You can still invite the employee and assign them later.
            </p>
          ) : (
            storefrontOptions.map((storefront) => (
              <Form.Check
                key={storefront.id}
                type="checkbox"
                id={`storefront-${storefront.id}`}
                label={storefront.name}
                checked={selectedStorefrontIds.includes(storefront.id)}
                onChange={() => handleToggleStorefront(storefront.id)}
                disabled={isSubmitting}
              />
            ))
          )}
        </div>
      </Form.Group>
      <Form.Group controlId="inviteEmployeeSendEmail">
        <Form.Check
          type="switch"
          label="Send email invitation"
          checked={sendEmail}
          onChange={(event) => setSendEmail(event.target.checked)}
          disabled={isSubmitting}
        />
        {!sendEmail ? (
          <Form.Text className="text-xs text-slate-500">
            Email will not be sent automatically. Copy the token from the invitation list and share it manually.
          </Form.Text>
        ) : null}
      </Form.Group>
      <div className="flex justify-end">
        <Button type="submit" variant="primary" className="rounded-pill px-4" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Spinner animation="border" size="sm" role="status" />
              Sending…
            </span>
          ) : (
            'Send invite'
          )}
        </Button>
      </div>
    </Form>
  )
}

export default InviteEmployeeForm
