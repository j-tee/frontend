import type { ChangeEvent, FormEvent } from 'react'
import { useEffect, useState } from 'react'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Row from 'react-bootstrap/Row'
import Spinner from 'react-bootstrap/Spinner'
import Stack from 'react-bootstrap/Stack'
import { Link, Navigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../hooks/index.js'
import { fetchCurrentUser, registerBusiness, selectAuthState } from '../../store/slices/authSlice.js'

const defaultPhoneNumbers = ['']

const RegisterBusinessPage = () => {
  const dispatch = useAppDispatch()
  const { token, user, business, status, error } = useAppSelector(selectAuthState)
  const [formError, setFormError] = useState<string | null>(null)
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessTin, setBusinessTin] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [businessWebsite, setBusinessWebsite] = useState('')
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>(defaultPhoneNumbers)
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')

  useEffect(() => {
    if (!user && token) {
      void dispatch(fetchCurrentUser())
    }
  }, [dispatch, token, user])

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
    if (user) {
      setOwnerName(user.name ?? '')
      setOwnerEmail(user.email ?? '')
    }
  }, [user])

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (business) {
    return <Navigate to="/app" replace />
  }

  if (user && user.account_type?.toUpperCase() !== 'OWNER') {
    return <Navigate to="/app" replace />
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-slate-50 px-4 py-12">
        <Spinner animation="border" role="status" />
      </main>
    )
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!ownerName || !ownerEmail || !ownerPassword) {
      setFormError('Owner details are required')
      return
    }
    if (!businessName || !businessTin || !businessEmail || !businessAddress) {
      setFormError('Business details are required')
      return
    }

    const sanitizedPhoneNumbers = phoneNumbers
      .map((phone) => phone.trim())
      .filter((phone) => phone.length > 0)

    if (sanitizedPhoneNumbers.length === 0) {
      setFormError('At least one business phone number is required')
      return
    }

    const payload = {
      owner_name: ownerName.trim(),
      owner_email: ownerEmail.trim().toLowerCase(),
      owner_password: ownerPassword,
      name: businessName.trim(),
      tin: businessTin.trim(),
      email: businessEmail.trim().toLowerCase(),
      address: businessAddress.trim(),
      phone_numbers: sanitizedPhoneNumbers,
      website: businessWebsite.trim() ? businessWebsite.trim() : undefined,
      social_handles:
        instagram || facebook
          ? {
              ...(instagram.trim() ? { instagram: instagram.trim() } : {}),
              ...(facebook.trim() ? { facebook: facebook.trim() } : {}),
            }
          : undefined,
    }

    setFormError(null)
    void dispatch(registerBusiness(payload))
  }

  const handlePhoneChange = (index: number, value: string) => {
    setPhoneNumbers((prev) => prev.map((phone, i) => (i === index ? value : phone)))
  }

  const addPhoneField = () => {
    setPhoneNumbers((prev) => [...prev, ''])
  }

  const removePhoneField = (index: number) => {
    setPhoneNumbers((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-slate-50 px-4 py-12">
      <Card className="w-full max-w-5xl border-0 shadow-lg shadow-indigo-200/40">
        <Card.Body className="space-y-6 p-6 sm:p-10">
          <div className="space-y-3 text-center sm:text-left">
            <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Register your business</h1>
            <p className="text-base text-slate-600 sm:text-lg">
              Create your company workspace and receive an access token instantly.
            </p>
          </div>
          {formError ? (
            <Alert variant="danger" className="rounded-3xl border border-red-200 bg-red-50 text-red-700">
              {formError}
            </Alert>
          ) : null}
          <Form className="space-y-6" onSubmit={handleSubmit}>
            <section className="space-y-4 rounded-3xl border border-slate-100 bg-white/70 p-6">
              <header className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">Owner details</h2>
                <p className="text-sm text-slate-500">Tell us about the primary account owner.</p>
              </header>
              <Row className="g-4">
                <Col xs={12}>
                  <Form.Group controlId="owner-name" className="space-y-2">
                    <Form.Label className="fw-semibold text-slate-800">Full name</Form.Label>
                    <Form.Control
                      type="text"
                      value={ownerName}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setOwnerName(event.target.value)}
                      required
                      className="rounded-3xl border-slate-200 py-3"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="owner-email" className="space-y-2">
                    <Form.Label className="fw-semibold text-slate-800">Email</Form.Label>
                    <Form.Control
                      type="email"
                      autoComplete="email"
                      value={ownerEmail}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setOwnerEmail(event.target.value)}
                      readOnly
                      disabled
                      required
                      className="rounded-3xl border-slate-200 bg-slate-100 py-3"
                    />
                    <Form.Text className="text-slate-500">
                      Email is locked to the verified owner account. Update it from account settings if needed.
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="owner-password" className="space-y-2">
                    <Form.Label className="fw-semibold text-slate-800">Confirm account password</Form.Label>
                    <Form.Control
                      type="password"
                      autoComplete="new-password"
                      value={ownerPassword}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setOwnerPassword(event.target.value)
                      }
                      required
                      className="rounded-3xl border-slate-200 py-3"
                    />
                    <Form.Text className="text-slate-500">
                      We securely confirm your owner account before creating the workspace.
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-100 bg-white/70 p-6">
              <header className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">Business details</h2>
                <p className="text-sm text-slate-500">
                  Help us set up your storefront, communication, and billing preferences.
                </p>
              </header>
              <Row className="g-4">
                <Col md={6}>
                  <Form.Group controlId="business-name" className="space-y-2">
                    <Form.Label className="fw-semibold text-slate-800">Business name</Form.Label>
                    <Form.Control
                      type="text"
                      value={businessName}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setBusinessName(event.target.value)}
                      required
                      className="rounded-3xl border-slate-200 py-3"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="business-tin" className="space-y-2">
                    <Form.Label className="fw-semibold text-slate-800">TIN</Form.Label>
                    <Form.Control
                      type="text"
                      value={businessTin}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setBusinessTin(event.target.value)}
                      required
                      className="rounded-3xl border-slate-200 py-3"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="business-email" className="space-y-2">
                    <Form.Label className="fw-semibold text-slate-800">Email</Form.Label>
                    <Form.Control
                      type="email"
                      value={businessEmail}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setBusinessEmail(event.target.value)}
                      required
                      className="rounded-3xl border-slate-200 py-3"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="business-address" className="space-y-2">
                    <Form.Label className="fw-semibold text-slate-800">Address</Form.Label>
                    <Form.Control
                      type="text"
                      value={businessAddress}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setBusinessAddress(event.target.value)
                      }
                      required
                      className="rounded-3xl border-slate-200 py-3"
                    />
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group controlId="business-website" className="space-y-2">
                    <Form.Label className="fw-semibold text-slate-800">Website (optional)</Form.Label>
                    <Form.Control
                      type="url"
                      value={businessWebsite}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setBusinessWebsite(event.target.value)
                      }
                      placeholder="https://example.com"
                      className="rounded-3xl border-slate-200 py-3"
                    />
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group controlId="business-phones" className="space-y-3">
                    <Form.Label className="fw-semibold text-slate-800">Phone numbers</Form.Label>
                    <Stack gap={3}>
                      {phoneNumbers.map((phone, index) => (
                        <div key={`phone-${index}`} className="d-flex gap-3">
                          <Form.Control
                            type="tel"
                            value={phone}
                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                              handlePhoneChange(index, event.target.value)
                            }
                            className="rounded-3xl border-slate-200 py-3"
                          />
                          {phoneNumbers.length > 1 ? (
                            <Button
                              variant="outline-primary"
                              type="button"
                              onClick={() => removePhoneField(index)}
                              className="rounded-pill px-3"
                            >
                              Remove
                            </Button>
                          ) : null}
                        </div>
                      ))}
                      <Button
                        variant="outline-secondary"
                        type="button"
                        onClick={addPhoneField}
                        className="w-fit rounded-pill px-4"
                      >
                        Add phone number
                      </Button>
                    </Stack>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="instagram" className="space-y-2">
                    <Form.Label className="fw-semibold text-slate-800">Instagram handle</Form.Label>
                    <Form.Control
                      type="text"
                      value={instagram}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setInstagram(event.target.value)}
                      className="rounded-3xl border-slate-200 py-3"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="facebook" className="space-y-2">
                    <Form.Label className="fw-semibold text-slate-800">Facebook handle</Form.Label>
                    <Form.Control
                      type="text"
                      value={facebook}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setFacebook(event.target.value)}
                      className="rounded-3xl border-slate-200 py-3"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </section>

            <Button
              type="submit"
              variant="primary"
              disabled={status === 'loading'}
              className="w-full rounded-pill py-3 d-inline-flex align-items-center justify-content-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <Spinner animation="border" size="sm" role="status" />
                  <span>Creating workspace…</span>
                </>
              ) : (
                'Create workspace'
              )}
            </Button>
          </Form>
          <p className="text-center text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-primary fw-semibold">
              Sign in
            </Link>
          </p>
        </Card.Body>
      </Card>
    </main>
  )
}

export default RegisterBusinessPage
