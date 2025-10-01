import type { ChangeEvent, FormEvent } from 'react'
import { useEffect, useState } from 'react'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import Spinner from 'react-bootstrap/Spinner'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../hooks/index.js'
import { login, logout, resetAuthFeedback, selectAuthState } from '../../store/slices/authSlice.js'

const LoginPage = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { token, status, error, user } = useAppSelector(selectAuthState)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [verificationNotice, setVerificationNotice] = useState<
    { variant: 'success' | 'danger' | 'info'; message: string } | null
  >(
    null,
  )
  const [searchParams] = useSearchParams()

  useEffect(() => {
    dispatch(resetAuthFeedback())
  }, [dispatch])

  useEffect(() => {
    const session = searchParams.get('session')
    const sessionMessage = searchParams.get('message')
    if (session && sessionMessage) {
      setVerificationNotice({
        variant: session === 'expired' ? 'danger' : 'info',
        message: sessionMessage,
      })
      return
    }

    const verified = searchParams.get('verified')
    const verificationMessage = searchParams.get('message')
    if (verified && verificationMessage) {
      setVerificationNotice({ variant: verified === 'success' ? 'success' : 'danger', message: verificationMessage })
      return
    }

    setVerificationNotice(null)
  }, [searchParams])

  useEffect(() => {
    if (error) {
      if (typeof error === 'string') {
        setFormError(error)
      } else if (typeof error === 'object') {
        setFormError(JSON.stringify(error))
      }
    }
  }, [error])

  useEffect(() => {
    if (token && status === 'succeeded') {
      navigate('/app', { replace: true })
    }
  }, [navigate, status, token])

  const isLoading = status === 'loading'

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email || !password) {
      setFormError('Email and password are required')
      return
    }
    setFormError(null)
    void dispatch(login({ email, password }))
  }

  const handleSignOut = () => {
    setVerificationNotice(null)
    setFormError(null)
    void dispatch(logout())
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-slate-50 px-4 py-12">
      <Card className="w-full max-w-2xl border-0 shadow-lg shadow-indigo-200/40">
        <Card.Body className="space-y-6 p-8 sm:p-12">
          <div className="space-y-3 text-center sm:text-left">
            <h1 className="text-3xl font-bold sm:text-4xl">Sign in</h1>
            <p className="text-base text-slate-600 sm:text-lg">Access your POS workspace</p>
          </div>
          {token ? (
            <Alert variant="info" className="rounded-3xl border border-sky-200 bg-sky-50 text-sky-800">
              <div className="fw-semibold">You&apos;re already signed in.</div>
              <p className="mb-2 mt-2">
                {user ? `Signed in as ${user.name} (${user.email}).` : 'An active session was detected.'}
              </p>
              <div className="d-flex flex-wrap gap-2">
                <Link to="/app" className="btn btn-primary rounded-pill px-4 py-2">
                  Go to dashboard
                </Link>
                <Button variant="outline-primary" className="rounded-pill px-4 py-2" onClick={handleSignOut}>
                  Switch account
                </Button>
              </div>
            </Alert>
          ) : null}
          {verificationNotice ? (
            <Alert
              variant={verificationNotice.variant === 'info' ? 'primary' : verificationNotice.variant}
              className={`rounded-3xl border ${
                verificationNotice.variant === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : verificationNotice.variant === 'info'
                    ? 'border-sky-200 bg-sky-50 text-sky-800'
                    : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {verificationNotice.message}
            </Alert>
          ) : null}
          {formError ? (
            <Alert variant="danger" className="rounded-3xl border border-red-200 bg-red-50 text-red-700">
              {formError}
            </Alert>
          ) : null}
          <Form className="space-y-4" onSubmit={handleSubmit}>
            <Form.Group controlId="login-email" className="space-y-2">
              <Form.Label className="fw-semibold text-slate-800">Email</Form.Label>
              <Form.Control
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
                required
                className="rounded-3xl border-slate-200 py-3"
                disabled={Boolean(token)}
              />
            </Form.Group>
            <Form.Group controlId="login-password" className="space-y-2">
              <Form.Label className="fw-semibold text-slate-800">Password</Form.Label>
              <Form.Control
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
                required
                className="rounded-3xl border-slate-200 py-3"
                disabled={Boolean(token)}
              />
            </Form.Group>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || Boolean(token)}
              className="w-full rounded-pill py-3 d-inline-flex align-items-center justify-content-center gap-2"
            >
              {isLoading ? (
                <>
                  <Spinner animation="border" size="sm" role="status" />
                  <span>Signing in…</span>
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </Form>
          <p className="text-center text-slate-600">
            New to the platform?{' '}
            <Link to="/register" className="text-brand-primary fw-semibold">
              Create an account
            </Link>
          </p>
        </Card.Body>
      </Card>
    </main>
  )
}

export default LoginPage
