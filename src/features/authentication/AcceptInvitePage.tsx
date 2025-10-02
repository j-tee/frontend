import { useEffect, useMemo, useState } from 'react'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import Spinner from 'react-bootstrap/Spinner'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import {
  acceptInvitation,
  validateInvitationToken,
} from '../../services/authService.js'
import type { InvitationTokenInfo } from '../../types/auth.js'

const MAX_PASSWORD_LENGTH = 128

type AsyncStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

type AcceptSuccess = {
  email: string
  businessName: string
}

const deriveErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const { response, message } = error
    if (response?.data) {
      if (typeof response.data === 'string') {
        const trimmed = response.data.trim()
        if (!trimmed) return fallback
        const firstLine = trimmed.split(/\r?\n/).find((line) => line.trim().length)
        if (firstLine && !/^<!?DOCTYPE/i.test(firstLine) && !/^<html/i.test(firstLine)) {
          return firstLine.trim().slice(0, 200)
        }
        return fallback
      }
      if (typeof response.data === 'object') {
        const values = Object.values(response.data as Record<string, unknown>)
        const flattened = values
          .map((value) => {
            if (Array.isArray(value)) {
              return value.map((entry) => String(entry)).join(' ')
            }
            if (value && typeof value === 'object') {
              return JSON.stringify(value)
            }
            if (value == null) return ''
            return String(value)
          })
          .find((entry) => entry && entry.trim().length)
        if (flattened) {
          return flattened.trim().slice(0, 200)
        }
      }
      return fallback
    }
    if (response) {
      const status = response.status
      const label = response.statusText?.trim()
      return label ? `Request failed with status ${status}: ${label}.` : `Request failed with status ${status}.`
    }
    return message ?? fallback
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return fallback
}

const AcceptInvitePage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [lookupStatus, setLookupStatus] = useState<AsyncStatus>('idle')
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [invitation, setInvitation] = useState<InvitationTokenInfo | null>(null)

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const [acceptStatus, setAcceptStatus] = useState<AsyncStatus>('idle')
  const [acceptError, setAcceptError] = useState<string | null>(null)
  const [successState, setSuccessState] = useState<AcceptSuccess | null>(null)

  useEffect(() => {
    if (!token) {
      setLookupStatus('failed')
      setLookupError('Invitation token is missing. Please open the link from your email again.')
      return
    }

    let cancelled = false
    const loadInvitation = async () => {
      setLookupStatus('loading')
      setLookupError(null)
      setInvitation(null)
      try {
        const info = await validateInvitationToken(token)
        if (cancelled) return
        setInvitation(info)
        setLookupStatus('succeeded')
        setSuccessState(null)
        setAcceptStatus('idle')
        setAcceptError(null)
        setName('')
        setPassword('')
        setConfirmPassword('')
        setPhone('')
      } catch (error) {
        if (cancelled) return
        setLookupStatus('failed')
        setLookupError(
          deriveErrorMessage(
            error,
            'We could not verify this invitation. It may have expired or has already been used.',
          ),
        )
      }
    }

    void loadInvitation()

    return () => {
      cancelled = true
    }
  }, [token])

  const invitationExpired = useMemo(() => {
    if (!invitation) return false
    const expiry = new Date(invitation.expires_at)
    if (Number.isNaN(expiry.getTime())) return false
    return expiry.getTime() < Date.now()
  }, [invitation])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token || !invitation) {
      setFormError('This invitation is no longer valid. Please request a new invite.')
      return
    }
    if (!name.trim()) {
      setFormError('Please provide your full name to continue.')
      return
    }
    if (!password || password.length < 8) {
      setFormError('Choose a password with at least 8 characters.')
      return
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
      setFormError('Password is too long.')
      return
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.')
      return
    }
    setFormError(null)
    setAcceptStatus('loading')
    setAcceptError(null)
    try {
      await acceptInvitation(token, {
        email: invitation.email,
        name: name.trim(),
        password,
        phone: phone.trim() ? phone.trim() : undefined,
      })
      setAcceptStatus('succeeded')
      setSuccessState({ email: invitation.email, businessName: invitation.business_name })
    } catch (error) {
      setAcceptStatus('failed')
      setAcceptError(
        deriveErrorMessage(error, 'We could not activate your account. Please try again or request a new invite.'),
      )
    }
  }

  const isLookupLoading = lookupStatus === 'loading'
  const isAcceptLoading = acceptStatus === 'loading'
  const showForm = lookupStatus === 'succeeded' && invitation && !successState

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-slate-50 px-4 py-12">
      <Card className="w-full max-w-2xl border-0 shadow-lg shadow-indigo-200/40">
        <Card.Body className="space-y-6 p-8 sm:p-12">
          <div className="space-y-2 text-center sm:text-left">
            <h1 className="text-3xl font-bold sm:text-4xl">Accept your invitation</h1>
            <p className="text-base text-slate-600 sm:text-lg">
              Join your team&apos;s POS workspace by confirming your details below.
            </p>
          </div>

          {isLookupLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
              <Spinner animation="border" role="status" />
              <span>Validating invitation…</span>
            </div>
          ) : null}

          {lookupError ? (
            <Alert variant="danger" className="rounded-3xl border border-red-200 bg-red-50 text-red-700">
              {lookupError}
            </Alert>
          ) : null}

          {successState ? (
            <Alert variant="success" className="rounded-3xl border border-emerald-200 bg-emerald-50 text-emerald-800">
              <div className="fw-semibold">You&apos;re all set!</div>
              <p className="mb-3 mt-2 text-sm sm:text-base">
                Your account for <span className="fw-semibold">{successState.businessName}</span> is now active. You can
                sign in with <span className="fw-semibold">{successState.email}</span> using the password you just
                created.
              </p>
              <div className="d-flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  className="rounded-pill px-4"
                  onClick={() => navigate('/login', { replace: true })}
                >
                  Go to sign in
                </Button>
                <Link to="/" className="btn btn-outline-primary rounded-pill px-4">
                  Back to homepage
                </Link>
              </div>
            </Alert>
          ) : null}

          {showForm ? (
            <>
              <Alert variant="light" className="rounded-3xl border border-slate-200 bg-slate-50 text-slate-700">
                <div className="fw-semibold text-slate-800">{invitation.business_name}</div>
                <p className="mb-0 text-sm">
                  You&apos;re joining as <span className="fw-semibold lowercase">{invitation.role.toLowerCase()}</span>.
                  {invitationExpired ? ' This invitation appears to have expired.' : null}
                </p>
                {invitationExpired ? (
                  <p className="mb-0 mt-1 text-sm text-red-600">
                    If this link just arrived, ask your manager to send a fresh invitation.
                  </p>
                ) : null}
              </Alert>

              {formError ? (
                <Alert variant="danger" className="rounded-3xl border border-red-200 bg-red-50 text-red-700">
                  {formError}
                </Alert>
              ) : null}

              {acceptError ? (
                <Alert variant="danger" className="rounded-3xl border border-red-200 bg-red-50 text-red-700">
                  {acceptError}
                </Alert>
              ) : null}

              <Form className="space-y-4" onSubmit={handleSubmit}>
                <Form.Group controlId="invite-email" className="space-y-2">
                  <Form.Label className="fw-semibold text-slate-800">Work email</Form.Label>
                  <Form.Control
                    value={invitation.email}
                    readOnly
                    disabled
                    className="rounded-3xl border-slate-200 bg-slate-100 text-slate-600"
                  />
                  <Form.Text className="text-xs text-slate-500">
                    Invitations can only be accepted with this email.
                  </Form.Text>
                </Form.Group>

                <Form.Group controlId="invite-name" className="space-y-2">
                  <Form.Label className="fw-semibold text-slate-800">Full name</Form.Label>
                  <Form.Control
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    className="rounded-3xl border-slate-200 py-3"
                    disabled={isAcceptLoading}
                  />
                </Form.Group>

                <Form.Group controlId="invite-password" className="space-y-2">
                  <Form.Label className="fw-semibold text-slate-800">Create password</Form.Label>
                  <Form.Control
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    className="rounded-3xl border-slate-200 py-3"
                    disabled={isAcceptLoading}
                  />
                </Form.Group>

                <Form.Group controlId="invite-confirm-password" className="space-y-2">
                  <Form.Label className="fw-semibold text-slate-800">Confirm password</Form.Label>
                  <Form.Control
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    className="rounded-3xl border-slate-200 py-3"
                    disabled={isAcceptLoading}
                  />
                </Form.Group>

                <Form.Group controlId="invite-phone" className="space-y-2">
                  <Form.Label className="fw-semibold text-slate-800">Phone number (optional)</Form.Label>
                  <Form.Control
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="rounded-3xl border-slate-200 py-3"
                    disabled={isAcceptLoading}
                  />
                </Form.Group>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full rounded-pill py-3 d-inline-flex align-items-center justify-content-center gap-2"
                  disabled={isAcceptLoading}
                >
                  {isAcceptLoading ? (
                    <>
                      <Spinner animation="border" size="sm" role="status" />
                      <span>Activating account…</span>
                    </>
                  ) : (
                    'Join workspace'
                  )}
                </Button>
              </Form>

              <p className="text-center text-sm text-slate-600">
                Trouble with the link?{' '}
                <Link to="/login" className="text-brand-primary fw-semibold">
                  Return to sign in
                </Link>{' '}
                or contact your manager for a fresh invitation.
              </p>
            </>
          ) : null}
        </Card.Body>
      </Card>
    </main>
  )
}

export default AcceptInvitePage
