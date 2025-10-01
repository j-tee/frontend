import type { ChangeEvent, FormEvent } from 'react'
import { useEffect, useState } from 'react'
import Alert from 'react-bootstrap/Alert'
import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Row from 'react-bootstrap/Row'
import Spinner from 'react-bootstrap/Spinner'
import Stack from 'react-bootstrap/Stack'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../hooks/index.js'
import { registerAccount, resetAuthFeedback, selectAuthState } from '../../store/slices/authSlice.js'
import type { AccountType } from '../../types/auth.js'

const ACCOUNT_TYPE_COPY: Record<AccountType, { title: string; description: string; badge: string }> = {
  OWNER: {
    title: 'Business owner',
    description:
      'Create the primary account for your company. After verifying your email, you can register your business workspace and invite your team.',
    badge: 'Owner / Admin',
  },
  EMPLOYEE: {
    title: 'Team member',
    description:
      'Join an existing business that has already invited you. We will match your verified email to pending invitations and grant access automatically.',
    badge: 'Employee',
  },
}

const RegisterAccountPage = () => {
  const dispatch = useAppDispatch()
  const { status, error, registrationSuccessMessage } = useAppSelector(selectAuthState)
  const [accountType, setAccountType] = useState<AccountType>('OWNER')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const isLoading = status === 'loading'
  const isSuccess = Boolean(registrationSuccessMessage)

  useEffect(() => {
    dispatch(resetAuthFeedback())
    return () => {
      dispatch(resetAuthFeedback())
    }
  }, [dispatch])

  useEffect(() => {
    if (!error) {
      setFormError(null)
      return
    }

    if (typeof error === 'string') {
      setFormError(error)
      return
    }

    setFormError('Something went wrong. Please try again.')
  }, [error])

  useEffect(() => {
    if (isSuccess) {
      setPassword('')
      setConfirmPassword('')
    }
  }, [isSuccess])

  const handleCreateAnother = () => {
    dispatch(resetAuthFeedback())
    setAccountType('OWNER')
    setName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setFormError('Please complete all required fields.')
      return
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.')
      return
    }

    setFormError(null)
    void dispatch(
      registerAccount({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        account_type: accountType,
      }),
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12">
      <Card className="w-full max-w-5xl border border-white/15 bg-white/5 text-white shadow-2xl backdrop-blur">
        <Card.Body className="space-y-6 p-6 sm:p-10">
          <header className="space-y-3 text-center sm:text-left">
            <Badge pill bg="primary" className="bg-white/15 px-4 py-2 text-xs uppercase tracking-[0.4em]">
              Create account
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold sm:text-4xl">Start your POS Suite journey</h1>
              <p className="text-base text-white/70 sm:text-lg">
                Choose your role, create a secure login, and verify your email to activate your workspace access.
              </p>
            </div>
          </header>

          <Row className="gy-4">
            <Col lg={5} className="order-2 order-lg-1">
              <div className="h-100 rounded-4 border border-white/15 bg-white/5 p-5">
                <Stack gap={3}>
                  <h2 className="h5 mb-0 text-white/90">Your role</h2>
                  <p className="mb-0 text-sm text-white/70">Select the option that matches how you will use POS Suite.</p>
                  <div className="d-grid gap-3">
                    {(Object.keys(ACCOUNT_TYPE_COPY) as AccountType[]).map((type) => {
                      const copy = ACCOUNT_TYPE_COPY[type]
                      const isActive = accountType === type
                      return (
                        <Button
                          key={type}
                          variant={isActive ? 'primary' : 'outline-light'}
                          className={`rounded-4 border-white/20 px-4 py-3 text-start transition ${
                            isActive ? 'border-0 text-white shadow-lg' : 'text-white/80'
                          }`}
                          style={
                            isActive
                              ? {
                                  backgroundImage: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                                  boxShadow: '0 25px 45px rgba(37, 99, 235, 0.35)',
                                }
                              : undefined
                          }
                          onClick={() => !isSuccess && setAccountType(type)}
                          type="button"
                          disabled={isSuccess}
                        >
                          <span className="d-block text-xs text-white/60">{copy.badge}</span>
                          <span className="d-block text-lg fw-semibold">{copy.title}</span>
                          <span className="d-block text-sm text-white/70">{copy.description}</span>
                        </Button>
                      )
                    })}
                  </div>
                </Stack>
              </div>
            </Col>

            <Col lg={7} className="order-1 order-lg-2">
              <div className="h-100 rounded-4 border border-white/15 bg-slate-950/80 p-5">
                {formError ? (
                  <Alert variant="danger" className="rounded-3xl border border-red-400/40 bg-red-500/20 text-white">
                    {formError}
                  </Alert>
                ) : null}
                {registrationSuccessMessage ? (
                  <Alert variant="success" className="rounded-3xl border border-emerald-400/40 bg-emerald-500/20 text-white">
                    {registrationSuccessMessage}
                  </Alert>
                ) : null}
                <Form className="space-y-4" onSubmit={handleSubmit}>
                  <Form.Group controlId="register-name" className="space-y-2">
                    <Form.Label className="fw-semibold text-white/80">Full name</Form.Label>
                    <Form.Control
                      type="text"
                      value={name}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
                      placeholder="Ada Lovelace"
                      required
                      className="rounded-3xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/60"
                      style={{
                        color: 'white',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      }}
                      disabled={isSuccess}
                    />
                  </Form.Group>
                  <Form.Group controlId="register-email" className="space-y-2">
                    <Form.Label className="fw-semibold text-white/80">Work email</Form.Label>
                    <Form.Control
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      required
                      className="rounded-3xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/60"
                      style={{
                        color: 'white',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      }}
                      disabled={isSuccess}
                    />
                    <Form.Text className="text-white/60">
                      We&apos;ll send a verification link to this address.
                    </Form.Text>
                  </Form.Group>
                  <Row className="g-4">
                    <Col md={6}>
                      <Form.Group controlId="register-password" className="space-y-2">
                        <Form.Label className="fw-semibold text-white/80">Password</Form.Label>
                        <Form.Control
                          type="password"
                          autoComplete="new-password"
                          value={password}
                          onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
                          required
                          className="rounded-3xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/60"
                          style={{
                            color: 'white',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          }}
                          disabled={isSuccess}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="register-confirm-password" className="space-y-2">
                        <Form.Label className="fw-semibold text-white/80">Confirm password</Form.Label>
                        <Form.Control
                          type="password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(event: ChangeEvent<HTMLInputElement>) => setConfirmPassword(event.target.value)}
                          required
                          className="rounded-3xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/60"
                          style={{
                            color: 'white',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          }}
                          disabled={isSuccess}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Text className="d-block text-sm text-white/60">
                    By creating an account you agree to notifications about subscription status, security alerts, and
                    product updates related to your role.
                  </Form.Text>
                  <Button
                    type="submit"
                    variant="light"
                    disabled={isLoading || isSuccess}
                    className="w-100 rounded-pill bg-white/90 py-3 text-slate-900 d-inline-flex align-items-center justify-content-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Spinner animation="border" size="sm" role="status" />
                        <span>Creating account…</span>
                      </>
                    ) : (
                      'Create account'
                    )}
                  </Button>
                  {registrationSuccessMessage ? (
                    <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/15 p-4 text-white/90">
                      <p className="mb-2 fw-semibold text-white">Check your inbox to verify the account</p>
                      <ul className="mb-3 ps-3">
                        <li>Open the email we just sent to {email || 'your inbox'}.</li>
                        <li>Click the verification link to activate your access.</li>
                        <li>Owner accounts can continue to register their business after signing in.</li>
                      </ul>
                      <div className="d-flex flex-wrap gap-2">
                        <Link to="/login" className="btn btn-light rounded-pill px-4 py-2 text-slate-900">
                          Go to sign in
                        </Link>
                        <Button
                          type="button"
                          variant="outline-light"
                          className="rounded-pill px-4 py-2 text-white/80"
                          onClick={handleCreateAnother}
                        >
                          Create another account
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <p className="mb-0 text-center text-sm text-white/70">
                    Already verified your account?{' '}
                    <Link to="/login" className="fw-semibold text-white">
                      Sign in
                    </Link>
                  </p>
                </Form>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </main>
  )
}

export default RegisterAccountPage
