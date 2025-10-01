import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import Spinner from 'react-bootstrap/Spinner'
import Stack from 'react-bootstrap/Stack'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../hooks/index.js'
import { resetAuthFeedback, selectVerificationFeedback, verifyEmail } from '../../store/slices/authSlice.js'

const VerifyEmailPage = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { status, error, message } = useAppSelector(selectVerificationFeedback)
  const [token, setToken] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const urlStatus = searchParams.get('status')
  const urlMessage = searchParams.get('message')
  const urlToken = searchParams.get('token')

  const initialBanner = useMemo(() => {
    if (!urlStatus || !urlMessage) return null
    if (urlStatus.toLowerCase() === 'success') {
      return { variant: 'success' as const, message: urlMessage }
    }
    return { variant: 'danger' as const, message: urlMessage }
  }, [urlStatus, urlMessage])

  useEffect(() => {
    dispatch(resetAuthFeedback())
  }, [dispatch])

  useEffect(() => {
    if (urlToken) {
      setToken(urlToken)
      void dispatch(verifyEmail({ token: urlToken }))
    }
  }, [dispatch, urlToken])

  const isLoading = status === 'loading'

  const hasHandledInitialStatus = useRef(false)

  useEffect(() => {
    if (!hasHandledInitialStatus.current) {
      hasHandledInitialStatus.current = true
      return
    }

    if (status === 'succeeded' && message) {
      const timer = window.setTimeout(() => {
        const params = new URLSearchParams({ verified: 'success', message })
        navigate(`/login?${params.toString()}`, { replace: true })
      }, 2500)
      return () => window.clearTimeout(timer)
    }

    return undefined
  }, [status, message, navigate])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token.trim()) {
      setFormError('Enter the verification token from your email.')
      return
    }
    setFormError(null)
    void dispatch(verifyEmail({ token: token.trim() }))
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-900 via-slate-950 to-black px-4 py-12 text-white">
      <Card className="w-full max-w-3xl border border-white/10 bg-white/5 text-white shadow-2xl backdrop-blur">
        <Card.Body className="space-y-6 p-6 sm:p-10">
          <header className="space-y-2 text-center sm:text-left">
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">Email Verification</p>
            <h1 className="text-3xl font-semibold sm:text-4xl">Activate your account</h1>
            <p className="text-sm text-white/70 sm:text-base">
              We&apos;ll confirm your verification token and get you ready to sign in.
            </p>
          </header>

          <Stack gap={3}>
            {initialBanner ? (
              <Alert variant={initialBanner.variant} className="rounded-3xl border border-white/15 bg-white/10 text-white">
                {initialBanner.message}
              </Alert>
            ) : null}
            {formError ? (
              <Alert variant="danger" className="rounded-3xl border border-red-400/40 bg-red-500/20 text-white">
                {formError}
              </Alert>
            ) : null}
            {status === 'failed' && error ? (
              <Alert variant="danger" className="rounded-3xl border border-red-400/40 bg-red-500/20 text-white">
                {error}
              </Alert>
            ) : null}
            {status === 'succeeded' && message ? (
              <Alert variant="success" className="rounded-3xl border border-emerald-400/40 bg-emerald-500/20 text-white">
                {message}
                <div className="mt-2 text-sm text-white/80">Redirecting you to sign in…</div>
              </Alert>
            ) : null}
          </Stack>

          <Form className="space-y-4" onSubmit={handleSubmit}>
            <Form.Group controlId="verify-token" className="space-y-2">
              <Form.Label className="fw-semibold text-white/80">Verification token</Form.Label>
              <Form.Control
                type="text"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Paste the token from your email"
                className="rounded-3xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/60"
                disabled={isLoading}
              />
              <Form.Text className="text-white/60">
                Having trouble with the link? Paste the token here and we&apos;ll verify it for you.
              </Form.Text>
            </Form.Group>
            <Button
              type="submit"
              variant="light"
              disabled={isLoading}
              className="w-full rounded-pill bg-white/90 py-3 text-slate-900 d-inline-flex align-items-center justify-content-center gap-2"
            >
              {isLoading ? (
                <>
                  <Spinner animation="border" size="sm" role="status" />
                  <span>Verifying…</span>
                </>
              ) : (
                'Verify email'
              )}
            </Button>
          </Form>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-5 text-sm text-white/80">
            <h2 className="h5 fw-semibold text-white">What happens next?</h2>
            <ul className="mb-0 mt-2 ps-4 space-y-1">
              <li>You&apos;ll see a success message when the token is confirmed.</li>
              <li>We&apos;ll send you back to the sign-in page automatically.</li>
              <li>If the token expired, request a new invitation or register again.</li>
            </ul>
          </div>

          <div className="d-flex flex-wrap gap-3 text-sm text-white/80">
            <Link to="/login" className="btn btn-outline-light rounded-pill px-4 py-2">
              Back to sign in
            </Link>
            <Link to="/register" className="btn btn-outline-light rounded-pill px-4 py-2">
              Create a new account
            </Link>
          </div>
        </Card.Body>
      </Card>
    </main>
  )
}

export default VerifyEmailPage
