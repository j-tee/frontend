import { useMemo } from 'react'
import Alert from 'react-bootstrap/Alert'
import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'
import Spinner from 'react-bootstrap/Spinner'
import Table from 'react-bootstrap/Table'
import type { BusinessInvitation } from '../../../../types/employees'
import type { UUID } from '../../../../types/common'
import type { RequestStatus } from '../../../../store/slices/staffSlice'

interface InvitationListProps {
  invitations: BusinessInvitation[]
  storefrontOptions: Array<{ id: UUID; name: string }>
  isLoading?: boolean
  error?: string | null
  resendStatuses: Record<string, RequestStatus>
  revokeStatuses: Record<string, RequestStatus>
  onResend: (invitationId: string) => void
  onRevoke: (invitationId: string) => void
  canManage?: boolean
}

const statusVariantMap: Record<BusinessInvitation['status'], string> = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  EXPIRED: 'secondary',
  REVOKED: 'secondary',
}

const roleLabelMap: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  STAFF: 'Staff',
}

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString()
  } catch {
    return '—'
  }
}

const InvitationList = ({
  invitations,
  storefrontOptions,
  isLoading = false,
  error = null,
  resendStatuses,
  revokeStatuses,
  onResend,
  onRevoke,
  canManage = true,
}: InvitationListProps) => {
  const storefrontNameMap = useMemo(() => new Map(storefrontOptions.map((storefront) => [storefront.id, storefront.name])), [storefrontOptions])
  const allowActions = canManage

  if (error) {
    return (
      <Alert variant="danger" className="rounded-3xl border border-red-200 bg-red-50 text-red-700">
        {error}
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Spinner animation="border" size="sm" role="status" />
        Loading invitations…
      </div>
    )
  }

  if (invitations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
        {allowActions
          ? 'No pending invitations. Invite a teammate to get them set up.'
          : 'No pending invitations. Contact an administrator to invite additional teammates.'}
      </div>
    )
  }

  return (
    <Table responsive bordered hover className="mb-0">
      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <th>Email</th>
          <th>Name</th>
          <th>Role</th>
          <th>Status</th>
          <th>Storefronts</th>
          <th>Invited</th>
          <th className="text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {invitations.map((invitation) => {
          const resendStatus = resendStatuses[invitation.id] ?? 'idle'
          const revokeStatus = revokeStatuses[invitation.id] ?? 'idle'
          const isPending = invitation.status === 'PENDING'
          const storefrontNames = invitation.storefronts
            .map((storefrontId) => storefrontNameMap.get(storefrontId) ?? 'Unassigned')
            .join(', ')

          return (
            <tr key={invitation.id}>
              <td className="align-middle text-sm text-slate-900">{invitation.email}</td>
              <td className="align-middle text-sm text-slate-600">{invitation.name ?? '—'}</td>
              <td className="align-middle text-sm text-slate-600">{roleLabelMap[invitation.role] ?? invitation.role}</td>
              <td className="align-middle">
                <Badge
                  bg={statusVariantMap[invitation.status] ?? 'secondary'}
                  className="rounded-pill px-3 py-2 text-xs"
                >
                  {invitation.status}
                </Badge>
              </td>
              <td className="align-middle text-sm text-slate-600">
                {invitation.storefronts.length ? storefrontNames : 'Not assigned'}
              </td>
              <td className="align-middle text-sm text-slate-600">{formatDate(invitation.invited_at ?? invitation.created_at)}</td>
              <td className="align-middle">
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    className="rounded-pill px-3"
                    onClick={() => allowActions && onResend(invitation.id)}
                    disabled={!allowActions || !isPending || resendStatus === 'loading'}
                  >
                    {resendStatus === 'loading' ? (
                      <span className="flex items-center gap-2">
                        <Spinner animation="border" size="sm" role="status" />
                        Sending…
                      </span>
                    ) : (
                      'Resend email'
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    className="rounded-pill px-3"
                    onClick={() => allowActions && onRevoke(invitation.id)}
                    disabled={!allowActions || !isPending || revokeStatus === 'loading'}
                  >
                    {revokeStatus === 'loading' ? (
                      <span className="flex items-center gap-2">
                        <Spinner animation="border" size="sm" role="status" />
                        Revoking…
                      </span>
                    ) : (
                      'Revoke'
                    )}
                  </Button>
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </Table>
  )
}

export default InvitationList
