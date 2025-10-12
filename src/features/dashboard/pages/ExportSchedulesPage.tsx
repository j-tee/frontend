import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Spinner, Table } from 'react-bootstrap'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import {
  fetchSchedules,
  selectSchedules,
  selectSchedulesLoading,
  selectSchedulesError,
  openScheduleForm,
  deleteSchedule,
  activateSchedule,
  deactivateSchedule,
  triggerSchedule,
  clearSchedulesError,
} from '../../../store/slices/exportAutomationSlice'
import { ScheduleFormModal } from '../components/exports/ScheduleFormModal'
import type { ExportSchedule } from '../../../types/exports'

const ExportSchedulesPage = () => {
  const dispatch = useAppDispatch()
  const schedules = useAppSelector(selectSchedules)
  const loading = useAppSelector(selectSchedulesLoading)
  const error = useAppSelector(selectSchedulesError)

  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    dispatch(fetchSchedules())
  }, [dispatch])

  useEffect(() => {
    return () => {
      dispatch(clearSchedulesError())
    }
  }, [dispatch])

  const handleCreateClick = () => {
    setSelectedScheduleId(null)
    dispatch(openScheduleForm('create'))
  }

  const handleEditClick = (schedule: ExportSchedule) => {
    setSelectedScheduleId(schedule.id)
    dispatch(openScheduleForm('edit'))
  }

  const handleDeleteClick = async (scheduleId: string) => {
    if (!window.confirm('Are you sure you want to delete this export schedule?')) {
      return
    }

    setActionLoading(scheduleId)
    try {
      await dispatch(deleteSchedule(scheduleId)).unwrap()
    } catch (err) {
      console.error('Failed to delete schedule:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleActive = async (schedule: ExportSchedule) => {
    setActionLoading(schedule.id)
    try {
      if (schedule.is_active) {
        await dispatch(deactivateSchedule(schedule.id)).unwrap()
      } else {
        await dispatch(activateSchedule(schedule.id)).unwrap()
      }
    } catch (err) {
      console.error('Failed to toggle schedule:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleTriggerNow = async (scheduleId: string) => {
    if (!window.confirm('Trigger this export now?')) {
      return
    }

    setActionLoading(scheduleId)
    try {
      await dispatch(triggerSchedule(scheduleId)).unwrap()
      alert('Export triggered successfully! Check Export History for results.')
    } catch (err) {
      console.error('Failed to trigger export:', err)
      alert('Failed to trigger export. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (schedule: ExportSchedule) => {
    if (!schedule.is_active) {
      return <Badge bg="secondary">Inactive</Badge>
    }

    const now = new Date()
    const nextRun = schedule.next_run_at ? new Date(schedule.next_run_at) : null

    if (nextRun && nextRun < now) {
      return <Badge bg="warning">Overdue</Badge>
    }

    return <Badge bg="success">Active</Badge>
  }

  const getFrequencyDisplay = (schedule: ExportSchedule) => {
    const parts: string[] = [schedule.frequency]

    if (schedule.frequency === 'WEEKLY' && schedule.day_of_week !== null) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      parts.push(`on ${days[schedule.day_of_week]}`)
    }

    if (schedule.frequency === 'MONTHLY' && schedule.day_of_month !== null) {
      parts.push(`on day ${schedule.day_of_month}`)
    }

    parts.push(`at ${schedule.hour.toString().padStart(2, '0')}:00 UTC`)

    return parts.join(' ')
  }

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Export Automation</h2>
          <p className="text-slate-600 mb-0">
            Automate your export reports with scheduled deliveries via email.
          </p>
        </div>
        <Button variant="primary" onClick={handleCreateClick}>
          <i className="bi bi-plus-circle me-2"></i>
          Create Schedule
        </Button>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => dispatch(clearSchedulesError())}>
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </Alert>
      )}

      {loading && !schedules.length ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading schedules...</span>
          </Spinner>
          <p className="text-muted mt-3">Loading export schedules...</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-calendar-check" style={{ fontSize: '4rem', color: '#6c757d' }}></i>
          <h4 className="mt-3 text-muted">No export schedules yet</h4>
          <p className="text-muted">Create your first automated export schedule to get started.</p>
          <Button variant="primary" onClick={handleCreateClick} className="mt-3">
            <i className="bi bi-plus-circle me-2"></i>
            Create First Schedule
          </Button>
        </div>
      ) : (
        <div className="table-responsive">
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Status</th>
                <th>Name</th>
                <th>Type</th>
                <th>Format</th>
                <th>Frequency</th>
                <th>Next Run</th>
                <th>Recipients</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule) => (
                <tr key={schedule.id}>
                  <td>{getStatusBadge(schedule)}</td>
                  <td>
                    <strong>{schedule.name}</strong>
                  </td>
                  <td>
                    <Badge bg="info">{schedule.export_type}</Badge>
                  </td>
                  <td>
                    <span className="text-uppercase">{schedule.format}</span>
                  </td>
                  <td className="text-muted small">{getFrequencyDisplay(schedule)}</td>
                  <td>
                    {schedule.next_run_at ? (
                      <div>
                        <div className="small">
                          {new Date(schedule.next_run_at).toLocaleString()}
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                          {schedule.next_run_display}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <div className="small">
                      {schedule.recipients.length > 0 ? (
                        <>
                          {schedule.recipients.slice(0, 2).join(', ')}
                          {schedule.recipients.length > 2 && (
                            <span className="text-muted">
                              {' '}
                              +{schedule.recipients.length - 2} more
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted">None</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="btn-group btn-group-sm" role="group">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleEditClick(schedule)}
                        disabled={actionLoading === schedule.id}
                        title="Edit"
                      >
                        <i className="bi bi-pencil"></i>
                      </Button>
                      <Button
                        variant={schedule.is_active ? 'outline-warning' : 'outline-success'}
                        size="sm"
                        onClick={() => handleToggleActive(schedule)}
                        disabled={actionLoading === schedule.id}
                        title={schedule.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {actionLoading === schedule.id ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <i className={schedule.is_active ? 'bi bi-pause' : 'bi bi-play'}></i>
                        )}
                      </Button>
                      <Button
                        variant="outline-info"
                        size="sm"
                        onClick={() => handleTriggerNow(schedule.id)}
                        disabled={actionLoading === schedule.id}
                        title="Trigger Now"
                      >
                        <i className="bi bi-lightning"></i>
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteClick(schedule.id)}
                        disabled={actionLoading === schedule.id}
                        title="Delete"
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <ScheduleFormModal scheduleId={selectedScheduleId} />
    </div>
  )
}

export default ExportSchedulesPage
