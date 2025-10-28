import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'
import Table from 'react-bootstrap/Table'
import type { Membership } from '../../../../types/employees'

interface EmployeeRosterTableProps {
  memberships: Membership[]
  onManageAssignments?: (membershipId: string) => void
  canManageAssignments?: boolean
}

const statusVariantMap: Record<string, string> = {
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  PENDING: 'info',
}

const EmployeeRosterTable = ({ memberships, onManageAssignments, canManageAssignments = true }: EmployeeRosterTableProps) => {
  if (memberships.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
        No employees yet. Invite your first team member to get started.
      </div>
    )
  }

  return (
    <Table responsive bordered hover className="mb-0">
      <thead className="bg-slate-50 text-slate-600">
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Status</th>
          <th>Storefronts</th>
          <th className="text-end">Actions</th>
        </tr>
      </thead>
      <tbody>
        {memberships.map((membership) => (
          <tr key={membership.id}>
            <td className="align-middle text-sm text-slate-900">{membership.user.name}</td>
            <td className="align-middle text-sm text-slate-600">{membership.user.email}</td>
            <td className="align-middle text-sm text-slate-600">{membership.role}</td>
            <td className="align-middle">
              <Badge
                bg={statusVariantMap[membership.status] ?? 'secondary'}
                className="rounded-pill px-3 py-2 text-xs"
              >
                {membership.status}
              </Badge>
            </td>
            <td className="align-middle text-sm text-slate-600">
              {membership.assigned_storefronts.length
                ? membership.assigned_storefronts.map((storefront) => storefront.name).join(', ')
                : 'Unassigned'}
            </td>
            <td className="align-middle">
              {onManageAssignments && canManageAssignments ? (
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline-primary"
                    className="rounded-pill px-3"
                    onClick={() => onManageAssignments(membership.id)}
                  >
                    Manage
                  </Button>
                </div>
              ) : (
                <div className="text-end text-xs text-slate-400">No actions</div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}

export default EmployeeRosterTable
