import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Card,
  Col,
  Form,
  InputGroup,
  Pagination,
  ProgressBar,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap'
import { useAppSelector, useCurrency } from '../../../../hooks'
import { selectActiveLocation } from '../../../../store/slices/locationSlice'
import CreditService from '../../../../services/creditService'
import { fetchCustomers } from '../../../../services/customerMngtService'
import type { Sale, Customer } from '../../../../types/sales'
import type { SalesSummary } from '../../../../types/credit'
import type { UUID } from '../../../../types/common'
import { PaymentHistoryModal } from './PaymentHistoryModal'
import { RecordPaymentModal } from './RecordPaymentModal'

interface AppliedFilters {
  minAmountDue: string
  maxAmountDue: string
  customerId: UUID | ''
  daysOutstanding: string
}

type StatusFilter = 'all' | 'unpaid' | 'partial' | 'overdue'

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

const getStatusVariant = (status: Sale['payment_status']) => {
  switch (status) {
    case 'unpaid':
      return 'danger'
    case 'partial':
      return 'warning'
    case 'paid':
      return 'success'
    default:
      return 'secondary'
  }
}

const getProgressVariant = (percentage: number) => {
  if (percentage >= 75) return 'success'
  if (percentage >= 50) return 'info'
  if (percentage >= 25) return 'warning'
  return 'danger'
}

const formatPercentage = (value: number) => `${Math.round(value)}%`

export function CreditManagement() {
  const activeLocation = useAppSelector(selectActiveLocation)
  const { formatCurrency, currency } = useCurrency()
  const storefrontId = activeLocation?.id

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [formFilters, setFormFilters] = useState<AppliedFilters>({
    minAmountDue: '',
    maxAmountDue: '',
    customerId: '',
    daysOutstanding: '30',
  })
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(formFilters)

  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const [sales, setSales] = useState<Sale[]>([])
  const [salesLoading, setSalesLoading] = useState(false)
  const [salesError, setSalesError] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalCount, setTotalCount] = useState(0)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [customersLoading, setCustomersLoading] = useState(false)

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)

  const totalPages = useMemo(() => {
    if (totalCount === 0) return 1
    return Math.max(1, Math.ceil(totalCount / pageSize))
  }, [totalCount, pageSize])

  const loadSummary = useCallback(async () => {
    try {
      setSummaryLoading(true)
      setSummaryError(null)
      const data = await CreditService.getSummary(storefrontId)
      setSummary(data)
    } catch (error) {
      console.error('Failed to load credit summary', error)
      setSummaryError('Unable to load credit summary. Please try again later.')
    } finally {
      setSummaryLoading(false)
    }
  }, [storefrontId])

  const buildFilterPayload = useCallback(
    (targetPage: number, targetPageSize: number) => {
      const payload: Record<string, unknown> = {
        payment_type: 'CREDIT',
        page: targetPage,
        page_size: targetPageSize,
      }

      if (storefrontId) {
        payload.storefront = storefrontId
      }

      if (statusFilter === 'all') {
        payload.has_outstanding_balance = true
      } else if (statusFilter === 'unpaid') {
        payload.payment_status = 'unpaid'
      } else if (statusFilter === 'partial') {
        payload.payment_status = 'partial'
      } else if (statusFilter === 'overdue') {
        payload.has_outstanding_balance = true
        const days = Number(appliedFilters.daysOutstanding)
        if (!Number.isNaN(days) && days > 0) {
          payload.days_outstanding = days
        }
      }

      const minAmount = Number(appliedFilters.minAmountDue)
      if (!Number.isNaN(minAmount) && appliedFilters.minAmountDue.trim() !== '') {
        payload.min_amount_due = minAmount
      }

      const maxAmount = Number(appliedFilters.maxAmountDue)
      if (!Number.isNaN(maxAmount) && appliedFilters.maxAmountDue.trim() !== '') {
        payload.max_amount_due = maxAmount
      }

      if (appliedFilters.customerId) {
        payload.customer_id = appliedFilters.customerId
      }

      return payload
    },
    [appliedFilters, statusFilter, storefrontId]
  )

  const loadSales = useCallback(
    async (targetPage: number, targetPageSize: number) => {
      try {
        setSalesLoading(true)
        setSalesError(null)

        const payload = buildFilterPayload(targetPage, targetPageSize)
        const response = await CreditService.getCreditSales(payload)

        setSales(response.results)
        setTotalCount(response.count)
      } catch (error) {
        console.error('Failed to load credit sales', error)
        setSalesError('Unable to load credit sales. Please try again later.')
      } finally {
        setSalesLoading(false)
      }
    },
    [buildFilterPayload]
  )

  const loadCustomers = useCallback(async () => {
    try {
      setCustomersLoading(true)
      const data = await fetchCustomers({ page_size: 100 })
      setCustomers(data.results)
    } catch (error) {
      console.error('Failed to load customers', error)
    } finally {
      setCustomersLoading(false)
    }
  }, [])

  const handleApplyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAppliedFilters(formFilters)
  }

  const handleResetFilters = () => {
    const resetFilters: AppliedFilters = {
      minAmountDue: '',
      maxAmountDue: '',
      customerId: '',
      daysOutstanding: '30',
    }
    setFormFilters(resetFilters)
    setAppliedFilters(resetFilters)
    setStatusFilter('all')
  }

  const handleStatusChange = (filter: StatusFilter) => {
    setStatusFilter(filter)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    setPage(newPage)
  }

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(event.target.value)
    setPageSize(newSize)
    setPage(1)
  }

  const handleOpenPaymentModal = (sale: Sale) => {
    setSelectedSale(sale)
    setShowPaymentModal(true)
  }

  const handleOpenHistoryModal = (sale: Sale) => {
    setSelectedSale(sale)
    setShowHistoryModal(true)
  }

  const handlePaymentModalClose = () => {
    setShowPaymentModal(false)
    setSelectedSale(null)
  }

  const handleHistoryModalClose = () => {
    setShowHistoryModal(false)
    setSelectedSale(null)
  }

  const handlePaymentRecorded = async () => {
    handlePaymentModalClose()
    await Promise.all([loadSummary(), loadSales(page, pageSize)])
  }

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    void loadSales(page, pageSize)
  }, [loadSales, page, pageSize])

  useEffect(() => {
    setPage(1)
  }, [appliedFilters, statusFilter])

  useEffect(() => {
    void loadSales(1, pageSize)
  }, [appliedFilters, statusFilter, pageSize, loadSales])

  useEffect(() => {
    if (storefrontId !== undefined) {
      setPage(1)
      void loadSales(1, pageSize)
      loadSummary()
    }
  }, [storefrontId, pageSize, loadSales, loadSummary])

  return (
    <div>
      <Row className="mb-3">
        <Col>
          <h4>Credit Management</h4>
          <p className="text-muted mb-0">
            Track outstanding credit sales, monitor repayments, and keep cash on hand accurate.
          </p>
        </Col>
      </Row>

      <Card className="mb-3 border-0 shadow-sm">
        <Card.Body>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div>
              <h6 className="mb-1 text-muted">Outstanding Status</h6>
              <ButtonGroup size="sm">
                <Button
                  variant={statusFilter === 'all' ? 'primary' : 'outline-primary'}
                  onClick={() => handleStatusChange('all')}
                >
                  All Outstanding
                </Button>
                <Button
                  variant={statusFilter === 'unpaid' ? 'primary' : 'outline-primary'}
                  onClick={() => handleStatusChange('unpaid')}
                >
                  Unpaid
                </Button>
                <Button
                  variant={statusFilter === 'partial' ? 'primary' : 'outline-primary'}
                  onClick={() => handleStatusChange('partial')}
                >
                  Partially Paid
                </Button>
                <Button
                  variant={statusFilter === 'overdue' ? 'primary' : 'outline-primary'}
                  onClick={() => handleStatusChange('overdue')}
                >
                  Overdue
                </Button>
              </ButtonGroup>
            </div>
          </div>

          <Form onSubmit={handleApplyFilters}>
            <Row className="g-3 align-items-end">
              <Col md={2} sm={6}>
                <Form.Label className="small text-muted">Min Amount Due</Form.Label>
                <InputGroup size="sm">
                  <InputGroup.Text>{currency.symbol}</InputGroup.Text>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={formFilters.minAmountDue}
                    onChange={(event) =>
                      setFormFilters((prev) => ({ ...prev, minAmountDue: event.target.value }))
                    }
                  />
                </InputGroup>
              </Col>

              <Col md={2} sm={6}>
                <Form.Label className="small text-muted">Max Amount Due</Form.Label>
                <InputGroup size="sm">
                  <InputGroup.Text>{currency.symbol}</InputGroup.Text>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={formFilters.maxAmountDue}
                    onChange={(event) =>
                      setFormFilters((prev) => ({ ...prev, maxAmountDue: event.target.value }))
                    }
                  />
                </InputGroup>
              </Col>

              <Col md={3} sm={6}>
                <Form.Label className="small text-muted">Customer</Form.Label>
                <Form.Select
                  size="sm"
                  value={formFilters.customerId}
                  onChange={(event) =>
                    setFormFilters((prev) => ({ ...prev, customerId: event.target.value as UUID | '' }))
                  }
                  disabled={customersLoading}
                >
                  <option value="">All Customers</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </Form.Select>
              </Col>

              <Col md={2} sm={6}>
                <Form.Label className="small text-muted">Days Outstanding</Form.Label>
                <Form.Control
                  size="sm"
                  type="number"
                  min="1"
                  value={formFilters.daysOutstanding}
                  onChange={(event) =>
                    setFormFilters((prev) => ({ ...prev, daysOutstanding: event.target.value }))
                  }
                  disabled={statusFilter !== 'overdue'}
                />
              </Col>

              <Col md={3} className="d-flex gap-2">
                <Button type="submit" variant="primary" size="sm" className="flex-grow-1">
                  Apply Filters
                </Button>
                <Button type="button" variant="outline-secondary" size="sm" onClick={handleResetFilters}>
                  Reset
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      <Row className="mb-3 g-3">
        <Col md={3} sm={6}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body>
              <p className="text-muted mb-1 small">Total Profit</p>
              <h5 className="mb-0 text-success">
                {summaryLoading ? '—' : formatCurrency(summary?.total_profit ?? 0)}
              </h5>
              <small className="text-muted">Across all sales</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body>
              <p className="text-muted mb-1 small">Outstanding Credit</p>
              <h5 className="mb-0 text-danger">
                {summaryLoading ? '—' : formatCurrency(summary?.outstanding_credit ?? 0)}
              </h5>
              <small className="text-muted">
                {summaryLoading ? '' : `${summary?.unpaid_credit_count ?? 0} credit accounts`}
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body>
              <p className="text-muted mb-1 small">Cash on Hand</p>
              <h5 className="mb-0 text-primary">
                {summaryLoading ? '—' : formatCurrency(summary?.cash_on_hand ?? 0)}
              </h5>
              <small className="text-muted">Profit minus outstanding credit</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body>
              <p className="text-muted mb-1 small">Total Credit Due</p>
              <h5 className="mb-0 text-warning">
                {summaryLoading ? '—' : formatCurrency(summary?.total_credit_sales ?? 0)}
              </h5>
              <small className="text-muted">Amount still owed</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {summaryError && (
        <Alert variant="warning" className="mb-3">
          {summaryError}
        </Alert>
      )}

      <Card className="border-0 shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div>
            <h6 className="mb-0">Outstanding Credit Accounts</h6>
            <small className="text-muted">
              {salesLoading ? 'Loading credit sales…' : `${totalCount} record${totalCount === 1 ? '' : 's'}`}
            </small>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small">Show</span>
            <Form.Select
              size="sm"
              value={pageSize}
              onChange={handlePageSizeChange}
              style={{ width: 'auto' }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </Form.Select>
            <span className="text-muted small">per page</span>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {salesError && (
            <Alert variant="danger" className="m-3">
              {salesError}
            </Alert>
          )}

          {salesLoading ? (
            <div className="py-5 text-center">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p className="mt-3 text-muted">Fetching credit sales…</p>
            </div>
          ) : sales.length === 0 ? (
            <div className="py-5 text-center text-muted">
              <p className="mb-1">No credit sales match your filters.</p>
              <small>Adjust the filters or status to see other records.</small>
            </div>
          ) : (
            <div className="table-responsive">
              <Table striped hover responsive className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Receipt #</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Completed</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id}>
                      <td>
                        <strong className="text-primary">{sale.receipt_number}</strong>
                        <div className="small text-muted">{sale.storefront_name}</div>
                      </td>
                      <td>
                        <div>{sale.customer_name || 'Walk-in Customer'}</div>
                        <small className="text-muted">{sale.type}</small>
                      </td>
                      <td>{formatCurrency(sale.total_amount)}</td>
                      <td>{formatCurrency(sale.amount_paid)}</td>
                      <td className="text-danger fw-semibold">{formatCurrency(sale.amount_due)}</td>
                      <td>
                        <Badge bg={getStatusVariant(sale.payment_status)} className="text-uppercase">
                          {sale.payment_status}
                        </Badge>
                      </td>
                      <td style={{ minWidth: 160 }}>
                        <ProgressBar
                          now={sale.payment_completion_percentage}
                          variant={getProgressVariant(sale.payment_completion_percentage)}
                          label={formatPercentage(sale.payment_completion_percentage)}
                        />
                      </td>
                      <td className="small text-muted">{formatDateTime(sale.completed_at || sale.created_at)}</td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleOpenHistoryModal(sale)}
                          >
                            History
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={sale.amount_due <= 0}
                            onClick={() => handleOpenPaymentModal(sale)}
                          >
                            Record Payment
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
        {!salesLoading && sales.length > 0 && (
          <Card.Footer className="d-flex justify-content-between align-items-center">
            <div className="text-muted small">
              Page {page} of {totalPages}
            </div>
            <Pagination className="mb-0" size="sm">
              <Pagination.First onClick={() => handlePageChange(1)} disabled={page === 1} />
              <Pagination.Prev onClick={() => handlePageChange(page - 1)} disabled={page === 1} />
              {page > 2 && <Pagination.Item onClick={() => handlePageChange(1)}>1</Pagination.Item>}
              {page > 3 && <Pagination.Ellipsis disabled />}
              {page > 1 && (
                <Pagination.Item onClick={() => handlePageChange(page - 1)}>
                  {page - 1}
                </Pagination.Item>
              )}
              <Pagination.Item active>{page}</Pagination.Item>
              {page < totalPages && (
                <Pagination.Item onClick={() => handlePageChange(page + 1)}>
                  {page + 1}
                </Pagination.Item>
              )}
              {page < totalPages - 1 && (
                <>
                  {page < totalPages - 2 && <Pagination.Ellipsis disabled />}
                  <Pagination.Item onClick={() => handlePageChange(totalPages)}>
                    {totalPages}
                  </Pagination.Item>
                </>
              )}
              <Pagination.Next
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
              />
              <Pagination.Last
                onClick={() => handlePageChange(totalPages)}
                disabled={page === totalPages}
              />
            </Pagination>
          </Card.Footer>
        )}
      </Card>

      <RecordPaymentModal
        show={showPaymentModal}
        sale={selectedSale}
        onHide={handlePaymentModalClose}
        onPaymentRecorded={handlePaymentRecorded}
      />

      <PaymentHistoryModal
        show={showHistoryModal}
        sale={selectedSale}
        onHide={handleHistoryModalClose}
      />
    </div>
  )
}
