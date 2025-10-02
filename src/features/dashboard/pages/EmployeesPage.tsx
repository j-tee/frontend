import { useEffect, useMemo, useState } from 'react'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import Spinner from 'react-bootstrap/Spinner'
import InviteEmployeeForm, {
  type InviteEmployeeFormValues,
} from '../components/employees/InviteEmployeeForm'
import EmployeeRosterTable from '../components/employees/EmployeeRosterTable'
import StorefrontAssignmentManager from '../components/employees/StorefrontAssignmentManager'
import InvitationList from '../components/employees/InvitationList'
import { MEMBERSHIP_ROLES, type UUID } from '../../../types/common'
import type { EmployeeRole } from '../../../types/employees'
import { useAppDispatch, useAppSelector, usePermissions } from '../../../hooks'
import { selectStorefronts } from '../../../store/slices/locationSlice'
import {
  loadInvitations,
  loadMemberships,
  inviteEmployee,
  resendEmployeeInvitation,
  revokeEmployeeInvitation,
  updateMemberAssignments,
  selectStaffInvitations,
  selectStaffInvitationStatus,
  selectStaffInvitationError,
  selectStaffMemberships,
  selectStaffMembershipStatus,
  selectStaffMembershipError,
  selectInviteStatus,
  selectInviteError,
  selectInvitationResendStatus,
  selectInvitationRevokeStatus,
  selectAssignmentStatuses,
  resetInviteState,
} from '../../../store/slices/staffSlice'
import { CAPABILITIES } from '../../../utils/permissions'

const toErrorMessage = (error: unknown) => {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    const { message } = error as { message?: unknown }
    if (typeof message === 'string') return message
  }
  return 'Something went wrong. Please try again.'
}

const EmployeesPage = () => {
  const dispatch = useAppDispatch()
  const { can } = usePermissions()
  const canManageEmployees = can(CAPABILITIES.EMPLOYEES_MANAGE)

  const storefronts = useAppSelector(selectStorefronts)
  const storefrontOptions = useMemo(
    () => storefronts.map((storefront) => ({ id: storefront.id, name: storefront.name })),
    [storefronts],
  )

  const businessId = useAppSelector((state) => state.auth.business?.id)

  const invitations = useAppSelector(selectStaffInvitations)
  const invitationStatus = useAppSelector(selectStaffInvitationStatus)
  const invitationError = useAppSelector(selectStaffInvitationError)
  const memberships = useAppSelector(selectStaffMemberships)
  const membershipStatus = useAppSelector(selectStaffMembershipStatus)
  const membershipError = useAppSelector(selectStaffMembershipError)
  const inviteStatus = useAppSelector(selectInviteStatus)
  const inviteError = useAppSelector(selectInviteError)
  const resendStatuses = useAppSelector(selectInvitationResendStatus)
  const revokeStatuses = useAppSelector(selectInvitationRevokeStatus)
  const assignmentStatuses = useAppSelector(selectAssignmentStatuses)

  const [showAssignments, setShowAssignments] = useState(false)
  const [activeMembershipId, setActiveMembershipId] = useState<UUID | null>(null)
  const [banner, setBanner] = useState<{ variant: 'success' | 'danger'; message: string } | null>(null)
  const [lastInvitedEmail, setLastInvitedEmail] = useState<string | null>(null)

  const activeAssignmentMembership = useMemo(
    () => memberships.find((membership) => membership.id === activeMembershipId) ?? null,
    [activeMembershipId, memberships],
  )

  const activeAssignmentStatus = activeAssignmentMembership
    ? assignmentStatuses[activeAssignmentMembership.id]
    : 'idle'

  const activeEmployeeCount = memberships.filter((membership) => membership.status === 'ACTIVE').length
  const pendingInvitationCount = invitations.filter((invitation) => invitation.status === 'PENDING').length

  useEffect(() => {
    if (!businessId) return
    void dispatch(loadInvitations())
    void dispatch(loadMemberships())
  }, [businessId, dispatch])

  useEffect(() => {
    if (inviteStatus === 'succeeded') {
      setBanner({
        variant: 'success',
        message: lastInvitedEmail
          ? `Invitation sent to ${lastInvitedEmail}.`
          : 'Invitation sent successfully.',
      })
      void dispatch(loadInvitations())
      dispatch(resetInviteState())
      setLastInvitedEmail(null)
    } else if (inviteStatus === 'failed') {
      setLastInvitedEmail(null)
    }
  }, [inviteStatus, lastInvitedEmail, dispatch])

  useEffect(() => {
    if (!canManageEmployees && showAssignments) {
      setShowAssignments(false)
      setActiveMembershipId(null)
    }
  }, [canManageEmployees, showAssignments])

  const handleInviteEmployee = async (values: InviteEmployeeFormValues) => {
    setBanner(null)
    setLastInvitedEmail(values.email)
    if (!canManageEmployees) {
      setLastInvitedEmail(null)
      throw new Error('You do not have permission to invite employees.')
    }
    const payload = {
      email: values.email,
      role: values.role as EmployeeRole,
      storefronts: values.storefrontIds,
      send_email: values.sendEmail,
      name: values.name,
    }

    try {
      await dispatch(inviteEmployee(payload)).unwrap()
    } catch (error) {
      setLastInvitedEmail(null)
      throw new Error(toErrorMessage(error))
    }
  }

  const handleManageAssignments = (membershipId: UUID) => {
    if (!canManageEmployees) {
      setBanner({ variant: 'danger', message: 'You do not have permission to manage assignments.' })
      return
    }
    setActiveMembershipId(membershipId)
    setShowAssignments(true)
  }

  const handleSaveAssignments = async (membershipId: UUID, storefrontIds: UUID[]) => {
    setBanner(null)
    if (!canManageEmployees) {
      setBanner({ variant: 'danger', message: 'You do not have permission to update assignments.' })
      throw new Error('You do not have permission to update assignments.')
    }
    try {
      await dispatch(updateMemberAssignments({ membershipId, storefronts: storefrontIds })).unwrap()
      const membership = memberships.find((member) => member.id === membershipId)
      setBanner({
        variant: 'success',
        message: membership
          ? `Updated storefront assignments for ${membership.user.name}.`
          : 'Updated storefront assignments.',
      })
    } catch (error) {
      const message = toErrorMessage(error)
      setBanner({ variant: 'danger', message })
      throw new Error(message)
    }
  }

  const handleResendInvite = async (invitationId: UUID) => {
    setBanner(null)
    if (!canManageEmployees) {
      setBanner({ variant: 'danger', message: 'You do not have permission to resend invitations.' })
      return
    }
    try {
      await dispatch(resendEmployeeInvitation(invitationId)).unwrap()
      setBanner({ variant: 'success', message: 'Invitation email resent.' })
    } catch (error) {
      setBanner({ variant: 'danger', message: toErrorMessage(error) })
    }
  }

  const handleRevokeInvite = async (invitationId: UUID) => {
    setBanner(null)
    if (!canManageEmployees) {
      setBanner({ variant: 'danger', message: 'You do not have permission to revoke invitations.' })
      return
    }
    try {
      await dispatch(revokeEmployeeInvitation(invitationId)).unwrap()
      setBanner({ variant: 'success', message: 'Invitation revoked.' })
    } catch (error) {
      setBanner({ variant: 'danger', message: toErrorMessage(error) })
    }
  }

  return (
    <div className="space-y-6">
      {banner ? (
        <Alert variant={banner.variant} className="rounded-3xl border border-slate-200">
          {banner.message}
        </Alert>
      ) : null}
      {!canManageEmployees ? (
        <Alert variant="info" className="rounded-3xl border border-slate-200 bg-slate-50 text-slate-700">
          You have read-only access to the staffing workspace. Contact an administrator to invite or manage employees.
        </Alert>
      ) : null}

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Team & staffing control</h2>
            <p className="text-slate-600">
              Invite employees, assign them to storefronts, and keep tabs on who&apos;s active across your business.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline-secondary" className="rounded-pill px-4" onClick={() => setShowAssignments(true)}>
              Manage assignments
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          <div>
            Active employees:{' '}
            <span className="font-semibold text-slate-900">
              {membershipStatus === 'loading' ? '—' : activeEmployeeCount}
            </span>
          </div>
          <div>
            Pending invites:{' '}
            <span className="font-semibold text-slate-900">
              {invitationStatus === 'loading' ? '—' : pendingInvitationCount}
            </span>
          </div>
          <div>
            Storefronts ready: <span className="font-semibold text-slate-900">{storefronts.length}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-3xl border border-slate-200 shadow-sm">
          <Card.Body className="space-y-4">
            <div className="space-y-1">
              <Card.Title className="text-lg font-semibold text-slate-900">Invite a team member</Card.Title>
              <Card.Text className="text-sm text-slate-600">
                Capture their details, choose a role, and optionally assign storefronts right away. The invite email will
                guide them through account activation.
              </Card.Text>
            </div>
            {canManageEmployees ? (
              <InviteEmployeeForm
                roles={MEMBERSHIP_ROLES}
                storefrontOptions={storefrontOptions}
                isSubmitting={inviteStatus === 'loading'}
                error={inviteError}
                onSubmit={handleInviteEmployee}
              />
            ) : (
              <Alert variant="secondary" className="rounded-3xl border border-slate-200 bg-slate-50 text-slate-700">
                You can view pending invitations, but only administrators can invite new team members.
              </Alert>
            )}
          </Card.Body>
        </Card>

        <Card className="rounded-3xl border border-slate-200 shadow-sm">
          <Card.Body className="space-y-4">
            <div className="space-y-1">
              <Card.Title className="text-lg font-semibold text-slate-900">Pending invitations</Card.Title>
              <Card.Text className="text-sm text-slate-600">
                Monitor outstanding invites, resend activation emails, or revoke access before onboarding completes.
              </Card.Text>
            </div>
            <InvitationList
              invitations={invitations}
              storefrontOptions={storefrontOptions}
              isLoading={invitationStatus === 'loading'}
              error={invitationError}
              resendStatuses={resendStatuses}
              revokeStatuses={revokeStatuses}
              onResend={handleResendInvite}
              onRevoke={handleRevokeInvite}
              canManage={canManageEmployees}
            />
          </Card.Body>
        </Card>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Employee roster</h3>
            <p className="text-sm text-slate-600">Searchable list of everyone with access to your POS workspace.</p>
          </div>
          <Button
            variant="outline-secondary"
            className="rounded-pill px-4"
            onClick={() => canManageEmployees && setShowAssignments(true)}
            disabled={!canManageEmployees}
          >
            Assign storefronts
          </Button>
        </div>
        {membershipError ? (
          <Alert variant="danger" className="rounded-3xl border border-red-200 bg-red-50 text-red-700">
            {membershipError}
          </Alert>
        ) : null}
        {membershipStatus === 'loading' ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Spinner animation="border" size="sm" role="status" />
            Loading roster…
          </div>
        ) : (
          <EmployeeRosterTable
            memberships={memberships}
            onManageAssignments={canManageEmployees ? handleManageAssignments : undefined}
            canManageAssignments={canManageEmployees}
          />
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Shift coverage (coming soon)</h3>
          <p className="text-sm text-slate-600">
            View who&apos;s on the floor right now, see scheduled shifts, and track overtime before it happens.
          </p>
          <Alert variant="info" className="rounded-3xl border border-slate-200 bg-slate-50 text-slate-700">
            We&apos;re working with the backend team to expose shift schedules and presence updates per storefront.
          </Alert>
        </div>
        <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Permissions & roles (coming soon)</h3>
          <p className="text-sm text-slate-600">
            Fine-tune access per screen and capability, ensuring each teammate only sees what they need.
          </p>
          <Alert variant="info" className="rounded-3xl border border-slate-200 bg-slate-50 text-slate-700">
            Role-based permissions API scoping will land with the upcoming identity service update.
          </Alert>
        </div>
      </section>

      <StorefrontAssignmentManager
        show={canManageEmployees && showAssignments}
        onClose={() => {
          setShowAssignments(false)
          setActiveMembershipId(null)
        }}
        membership={activeAssignmentMembership}
        storefrontOptions={storefrontOptions}
        onSaveAssignments={handleSaveAssignments}
        isSaving={activeAssignmentStatus === 'loading'}
      />
    </div>
  )
}

export default EmployeesPage
