import { useEffect, useState, Fragment } from 'react'
import {
  Card,
  Table,
  Badge,
  Spinner,
  Alert,
  Form,
  Pagination,
  Row,
  Col,
  InputGroup,
  Button,
  ButtonGroup,
} from 'react-bootstrap'
import './SalesHistory.module.css'
import { useAppDispatch, useAppSelector } from '../../../../hooks'
import {
  loadSales,
  selectSales,
  selectSalesStatus,
  selectSalesError,
  selectSalesPagination,
  setSalesPage,
  setSalesPageSize,
  setSalesFilters,
  selectSalesFilters,
  resetSalesFilters,
} from '../../../../store/slices/salesSlice'
import { selectUserStorefronts, selectStorefrontsLoading } from '../../../../store/slices/authSlice'
import { exportSalesToCSV } from '../../../../services/salesService'

export function SalesHistory() {
  const dispatch = useAppDispatch()
  const sales = useAppSelector(selectSales)
  const status = useAppSelector(selectSalesStatus)
  const error = useAppSelector(selectSalesError)
  const pagination = useAppSelector(selectSalesPagination)
  const filters = useAppSelector(selectSalesFilters)
  const userStorefronts = useAppSelector(selectUserStorefronts)
  const storefrontsLoading = useAppSelector(selectStorefrontsLoading)

  // Local state for filter inputs
  const [searchTerm, setSearchTerm] = useState(filters.search || '')
  const [selectedStatus, setSelectedStatus] = useState<string>(filters.status || 'COMPLETED')
  const [selectedStorefront, setSelectedStorefront] = useState<string>(filters.storefront || '')
  const [dateRange, setDateRange] = useState<string>('')
  const [customDateFrom, setCustomDateFrom] = useState<string>(filters.date_from || '')
  const [customDateTo, setCustomDateTo] = useState<string>(filters.date_to || '')
  const [expandedSale, setExpandedSale] = useState<string | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(filters.payment_type || '')

  // Sync local state with Redux filters when they change externally
  useEffect(() => {
    if (filters.status !== undefined && filters.status !== selectedStatus) {
      setSelectedStatus(filters.status)
    }
  }, [filters.status, selectedStatus])

  useEffect(() => {
    setSelectedStorefront(filters.storefront ?? '')
  }, [filters.storefront])

  useEffect(() => {
    if (filters.payment_type === 'MOMO') {
      dispatch(setSalesFilters({ payment_type: 'MOBILE' }))
      return
    }

    setSelectedPaymentMethod(filters.payment_type ?? '')
  }, [dispatch, filters.payment_type])

  useEffect(() => {
    setCustomDateFrom(filters.date_from ?? '')
    setCustomDateTo(filters.date_to ?? '')
  }, [filters.date_from, filters.date_to])

  useEffect(() => {
    setSearchTerm(filters.search ?? '')
  }, [filters.search])

  useEffect(() => {
    // Load sales when component mounts, filters change, or pagination changes
    void dispatch(loadSales())
  }, [dispatch, filters, pagination.page, pagination.pageSize])

  const isLoading = status === 'loading'
  const hasSales = sales.length > 0

  // Toggle sale details expansion
  const toggleSaleDetails = (saleId: string) => {
    setExpandedSale(expandedSale === saleId ? null : saleId)
  }

  // Filter handlers
  const handleSearch = () => {
    // Reset to page 1 when searching
    dispatch(setSalesPage(1))
    dispatch(setSalesFilters({ search: searchTerm.trim() || undefined }))
  }

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value)
    // Reset to page 1 when changing status filter
    dispatch(setSalesPage(1))
    dispatch(setSalesFilters({ status: value || undefined }))
  }

  const handleStorefrontChange = (value: string) => {
    setSelectedStorefront(value)
    // Reset to page 1 when changing storefront filter
    dispatch(setSalesPage(1))
    dispatch(setSalesFilters({ storefront: value || undefined }))
  }

  const handleDateRangeChange = (value: string) => {
    setDateRange(value)
    
    // Reset to page 1 when changing date filter
    dispatch(setSalesPage(1))
    
    const now = new Date()
    let date_from = ''
    let date_to = ''

    if (value === 'today') {
      date_from = now.toISOString().split('T')[0]
    } else if (value === 'yesterday') {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      date_from = yesterday.toISOString().split('T')[0]
      date_to = yesterday.toISOString().split('T')[0]
    } else if (value === 'this_week') {
      const startOfWeek = new Date(now)
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      date_from = startOfWeek.toISOString().split('T')[0]
    } else if (value === 'this_month') {
      date_from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    } else if (value === 'last_30_days') {
      const last30 = new Date(now)
      last30.setDate(last30.getDate() - 30)
      date_from = last30.toISOString().split('T')[0]
    } else if (value === 'this_year') {
      date_from = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
    }

    if (value && value !== 'custom') {
      dispatch(setSalesFilters({
        date_from: date_from || undefined,
        date_to: date_to || undefined,
      }))
      setCustomDateFrom(date_from)
      setCustomDateTo(date_to)
    } else if (value === '') {
      dispatch(setSalesFilters({ date_from: undefined, date_to: undefined }))
      setCustomDateFrom('')
      setCustomDateTo('')
    }
  }

  const handleCustomDateApply = () => {
    if (customDateFrom) {
      // Reset to page 1 when applying custom date
      dispatch(setSalesPage(1))
      dispatch(setSalesFilters({
        date_from: customDateFrom,
        date_to: customDateTo || undefined,
      }))
    }
  }

  const handlePaymentMethodChange = (paymentMethod: string) => {
    setSelectedPaymentMethod(paymentMethod)
    dispatch(setSalesPage(1)) // Reset to page 1

    dispatch(setSalesFilters({ payment_type: paymentMethod || undefined }))
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setSelectedStatus('COMPLETED') // Reset to COMPLETED instead of empty
    setSelectedStorefront('')
    setSelectedPaymentMethod('')
    setDateRange('')
    setCustomDateFrom('')
    setCustomDateTo('')
    // Reset to page 1 when clearing filters
    dispatch(setSalesPage(1))
    dispatch(resetSalesFilters())
    dispatch(setSalesFilters({ status: 'COMPLETED' }))
  }

  const handleExportCSV = () => {
    // Export with current filters
    const exportParams: Record<string, string> = {}

    const entries: Array<[keyof typeof filters, string | undefined]> = [
      ['search', filters.search],
      ['status', filters.status],
      ['storefront', filters.storefront],
      ['date_from', filters.date_from],
      ['date_to', filters.date_to],
      ['payment_type', filters.payment_type],
    ]

    entries.forEach(([key, value]) => {
      if (value) {
        exportParams[key] = value
      }
    })

    exportSalesToCSV(exportParams)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return
    dispatch(setSalesPage(newPage))
  }

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(event.target.value)
    dispatch(setSalesPageSize(newSize))
  }

  // Calculate comprehensive sales summary
  const calculateSalesSummary = () => {
    const summary = {
      totalSales: 0,
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      totalTax: 0,
      totalDiscount: 0,
      salesCount: sales.length,
      itemsCount: 0,
      averageOrderValue: 0,
      profitMargin: 0,
      byPaymentMethod: {
        CASH: 0,
        CARD: 0,
        CREDIT: 0,
        MOBILE: 0,
        SPLIT: 0,
      },
    }

    sales.forEach(sale => {
      summary.totalRevenue += sale.total_amount
      summary.totalTax += sale.tax_amount || 0
      summary.totalDiscount += sale.discount_amount || 0
      summary.itemsCount += sale.line_items?.length || 0

      // Aggregate by payment method
      const paymentKey = sale.payment_type === 'MOMO' ? 'MOBILE' : sale.payment_type
      if (paymentKey && paymentKey in summary.byPaymentMethod) {
        summary.byPaymentMethod[paymentKey as keyof typeof summary.byPaymentMethod] += sale.total_amount
      }

      // Calculate cost and profit from line items
      sale.line_items?.forEach(item => {
        const itemCost = (item.cost_price || 0) * item.quantity
        summary.totalCost += itemCost
      })
    })

    summary.totalProfit = summary.totalRevenue - summary.totalCost - summary.totalDiscount
    summary.averageOrderValue = summary.salesCount > 0 ? summary.totalRevenue / summary.salesCount : 0
    summary.profitMargin = summary.totalRevenue > 0 ? (summary.totalProfit / summary.totalRevenue) * 100 : 0

    return summary
  }

  const salesSummary = calculateSalesSummary()

  const getStatusBadge = (saleStatus: string) => {
    switch (saleStatus) {
      case 'COMPLETED':
        return 'success'
      case 'DRAFT':
        return 'warning'
      case 'CANCELLED':
        return 'danger'
      case 'REFUNDED':
        return 'info'
      default:
        return 'secondary'
    }
  }

  const formatPaymentType = (paymentType: string | null | undefined) => {
    switch (paymentType) {
      case 'CASH':
        return 'Cash'
      case 'CARD':
        return 'Card'
      case 'CREDIT':
        return 'Credit'
      case 'MOBILE':
        return 'Mobile Money'
      case 'MOMO':
        return 'Mobile Money'
      case 'SPLIT':
        return 'Split Payment'
      default:
        return paymentType || '-'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.storefront ||
    filters.payment_type ||
    filters.date_from ||
    filters.date_to ||
    (filters.status && filters.status !== 'COMPLETED')
  )

  // Only show storefront dropdown if user has access to multiple storefronts
  const showStorefrontFilter = userStorefronts.length > 1

  return (
    <Card>
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Sales History</h5>
          {pagination.count > 0 && (
            <small className="text-muted">
              {hasActiveFilters && 'Filtered: '}
              {pagination.count} sales
            </small>
          )}
        </div>
      </Card.Header>
      <Card.Body>
        {/* Filters Section */}
        <Row className="mb-3 g-2">
          <Col md={4}>
            <InputGroup size="sm">
              <Form.Control
                placeholder="Search receipt #, customer, or amount..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button variant="outline-secondary" onClick={handleSearch}>
                🔍
              </Button>
            </InputGroup>
          </Col>
          <Col md={2}>
            <Form.Select
              size="sm"
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">✅ Completed</option>
              <option value="CANCELLED">❌ Cancelled</option>
              <option value="REFUNDED">↩️ Refunded</option>
              <option value="DRAFT">📝 Draft (Empty Carts)</option>
            </Form.Select>
          </Col>
          {showStorefrontFilter && (
            <Col md={2}>
              <Form.Select
                size="sm"
                value={selectedStorefront}
                onChange={(e) => handleStorefrontChange(e.target.value)}
                disabled={storefrontsLoading}
              >
                <option value="">🏪 All Storefronts</option>
                {userStorefronts.map((storefront) => (
                  <option key={storefront.id} value={storefront.id}>
                    {storefront.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
          )}
          <Col md={2}>
            <Form.Select
              size="sm"
              value={selectedPaymentMethod}
              onChange={(e) => handlePaymentMethodChange(e.target.value)}
            >
              <option value="">💳 All Payment Methods</option>
              <option value="CASH">💵 Cash</option>
              <option value="CARD">💳 Card</option>
              <option value="MOBILE">📱 Mobile Money</option>
              <option value="CREDIT">🏦 Credit</option>
              <option value="SPLIT">🧾 Split Payment</option>
            </Form.Select>
          </Col>
          <Col md={showStorefrontFilter ? 3 : 3}>
            <Form.Select
              size="sm"
              value={dateRange}
              onChange={(e) => handleDateRangeChange(e.target.value)}
            >
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Range...</option>
            </Form.Select>
          </Col>
          <Col md={3}>
            <ButtonGroup size="sm" className="w-100">
              <Button
                variant="outline-primary"
                onClick={() => void dispatch(loadSales())}
                disabled={isLoading}
              >
                🔄 Refresh
              </Button>
              <Button
                variant="outline-success"
                onClick={handleExportCSV}
                disabled={!hasSales}
                title="Export filtered sales to CSV"
              >
                📥 Export
              </Button>
              <Button
                variant="outline-secondary"
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
              >
                ✖ Clear
              </Button>
            </ButtonGroup>
          </Col>
        </Row>

        {/* Custom Date Range */}
        {dateRange === 'custom' && (
          <Row className="mb-3 g-2">
            <Col md={4}>
              <Form.Control
                type="date"
                size="sm"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
              />
            </Col>
            <Col md={4}>
              <Form.Control
                type="date"
                size="sm"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
              />
            </Col>
            <Col md={4}>
              <Button
                variant="primary"
                size="sm"
                className="w-100"
                onClick={handleCustomDateApply}
                disabled={!customDateFrom}
              >
                Apply Date Range
              </Button>
            </Col>
          </Row>
        )}

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <Alert variant="info" className="py-2 mb-3">
            <small>
              <strong>Active Filters:</strong>{' '}
              {filters.search && <Badge bg="secondary" className="me-1">Search: {filters.search}</Badge>}
              {filters.status && filters.status !== 'COMPLETED' && (
                <Badge bg="secondary" className="me-1">Status: {filters.status}</Badge>
              )}
              {filters.storefront && (
                <Badge bg="secondary" className="me-1">
                  Storefront: {userStorefronts.find(s => s.id === filters.storefront)?.name || filters.storefront}
                </Badge>
              )}
              {filters.date_from && (
                <Badge bg="secondary" className="me-1">
                  From: {filters.date_from}
                  {filters.date_to && ` to ${filters.date_to}`}
                </Badge>
              )}
              {filters.payment_type && (
                <Badge bg="secondary" className="me-1">
                  Payment: {formatPaymentType(filters.payment_type)}
                </Badge>
              )}
            </small>
          </Alert>
        )}

        {error && (
          <Alert variant="danger" className="mb-3">
            <strong>Error:</strong> {error}
          </Alert>
        )}

        {/* Sales Summary Card - Only show when we have sales */}
        {!isLoading && hasSales && (
          <Card className="mb-3 border-0 shadow-sm">
            <Card.Body className="pb-2">
              <h6 className="mb-3 text-muted">📊 Sales Summary</h6>
              <Row className="g-3">
                <Col md={3}>
                  <div className="text-center">
                    <div className="text-muted small mb-1">Total Sales Volume</div>
                    <div className="h5 mb-0 text-primary fw-bold">
                      {formatCurrency(salesSummary.totalRevenue)}
                    </div>
                    <div className="text-muted small">{salesSummary.salesCount} transactions</div>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center">
                    <div className="text-muted small mb-1">Total Profit</div>
                    <div className="h5 mb-0 text-success fw-bold">
                      {formatCurrency(salesSummary.totalProfit)}
                    </div>
                    <div className="text-muted small">
                      Margin: {salesSummary.profitMargin.toFixed(1)}%
                    </div>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center">
                    <div className="text-muted small mb-1">Total Tax</div>
                    <div className="h5 mb-0 text-info fw-bold">
                      {formatCurrency(salesSummary.totalTax)}
                    </div>
                    <div className="text-muted small">{salesSummary.itemsCount} items</div>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center">
                    <div className="text-muted small mb-1">Total Discounts</div>
                    <div className="h5 mb-0 text-warning fw-bold">
                      {formatCurrency(salesSummary.totalDiscount)}
                    </div>
                    <div className="text-muted small">
                      Avg: {formatCurrency(salesSummary.averageOrderValue)}
                    </div>
                  </div>
                </Col>
              </Row>

              <hr className="my-3" />

              <div className="text-center">
                <small className="text-muted fw-bold me-3">By Payment Method:</small>
                <Badge bg="success" className="me-2">
                  💵 Cash: {formatCurrency(salesSummary.byPaymentMethod.CASH)}
                </Badge>
                <Badge bg="primary" className="me-2">
                  💳 Card: {formatCurrency(salesSummary.byPaymentMethod.CARD)}
                </Badge>
                <Badge bg="info" className="me-2">
                  📱 Mobile: {formatCurrency(salesSummary.byPaymentMethod.MOBILE)}
                </Badge>
                <Badge bg="warning" text="dark" className="me-2">
                  🏦 Credit: {formatCurrency(salesSummary.byPaymentMethod.CREDIT)}
                </Badge>
                <Badge bg="secondary" text="light">
                  🧾 Split: {formatCurrency(salesSummary.byPaymentMethod.SPLIT)}
                </Badge>
              </div>
            </Card.Body>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="mt-3 text-muted">Loading sales history...</p>
          </div>
        ) : !hasSales ? (
          <div className="text-center text-muted py-5">
            <p className="mb-1">
              {hasActiveFilters ? 'No sales match your filters' : 'No sales history yet'}
            </p>
            <small>
              {hasActiveFilters ? 'Try adjusting your search criteria' : 'Completed sales will appear here'}
            </small>
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover size="sm">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => {
                  const canExpand = (sale.line_items?.length ?? 0) > 0

                  return (
                    <Fragment key={sale.id}>
                    {/* Main row - clickable to expand */}
                    <tr 
                      onClick={canExpand ? () => toggleSaleDetails(sale.id) : undefined}
                      style={{ cursor: canExpand ? 'pointer' : 'default' }}
                      className={expandedSale === sale.id ? 'table-active' : ''}
                    >
                      <td>
                        <strong className="text-primary">{sale.receipt_number || 'N/A'}</strong>
                      </td>
                      <td className="text-muted small">
                        {formatDate(sale.completed_at || sale.created_at)}
                      </td>
                      <td>{sale.customer_name || <em className="text-muted">Walk-in</em>}</td>
                      <td>
                        {canExpand && (
                          <span className="me-2">
                            {expandedSale === sale.id ? '▼' : '►'}
                          </span>
                        )}
                        <span className="badge bg-secondary">
                          {sale.line_items?.length || 0} items
                        </span>
                      </td>
                      <td>
                        <strong>{formatCurrency(sale.total_amount)}</strong>
                        {sale.amount_due > 0 && (
                          <div className="text-danger small">
                            Due: {formatCurrency(sale.amount_due)}
                          </div>
                        )}
                      </td>
                      <td>
                        <Badge bg={getStatusBadge(sale.status)}>{sale.status}</Badge>
                      </td>
                      <td className="small text-muted">{formatPaymentType(sale.payment_type)}</td>
                    </tr>

                    {/* Expanded row - shows product details */}
                    {expandedSale === sale.id && canExpand && (
                      <tr className="border-0">
                        <td colSpan={7} style={{ backgroundColor: '#f8f9fa', padding: '1rem' }}>
                          <div style={{ animation: 'slideDown 0.3s ease-out' }}>
                            <h6 className="mb-3">📦 Products Sold</h6>
                            <Table size="sm" bordered hover>
                              <thead className="table-light">
                                <tr>
                                  <th>Product</th>
                                  <th>SKU</th>
                                  <th>Category</th>
                                  <th className="text-end">Qty</th>
                                  <th className="text-end">Unit Price</th>
                                  <th className="text-end">Discount</th>
                                  <th className="text-end">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sale.line_items.map((item) => (
                                  <tr key={item.id}>
                                    <td><strong>{item.product_name}</strong></td>
                                    <td><code className="text-muted small">{item.product_sku}</code></td>
                                    <td>
                                      {item.product_category ? (
                                        <Badge bg="secondary" pill className="small">
                                          {item.product_category}
                                        </Badge>
                                      ) : (
                                        <span className="text-muted small">N/A</span>
                                      )}
                                    </td>
                                    <td className="text-end">{item.quantity}</td>
                                    <td className="text-end">{formatCurrency(item.unit_price)}</td>
                                    <td className="text-end">
                                      {item.discount_amount > 0 ? (
                                        <span className="text-success">-{formatCurrency(item.discount_amount)}</span>
                                      ) : (
                                        '-'
                                      )}
                                    </td>
                                    <td className="text-end">
                                      <strong>{formatCurrency(item.total_price)}</strong>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="table-light">
                                <tr>
                                  <td colSpan={6} className="text-end"><strong>Sale Total:</strong></td>
                                  <td className="text-end">
                                    <strong className="text-primary fs-6">{formatCurrency(sale.total_amount)}</strong>
                                  </td>
                                </tr>
                              </tfoot>
                            </Table>

                            {/* Additional sale info */}
                            <Row className="mt-3 px-2">
                              <Col md={6}>
                                <small className="text-muted">
                                  <strong>Payment:</strong> {sale.payment_type}
                                  {' | '}
                                  <strong>Cashier:</strong> {sale.user_name || 'Unknown'}
                                </small>
                              </Col>
                              <Col md={6} className="text-end">
                                <small className="text-muted">
                                  <strong>Completed:</strong> {formatDate(sale.completed_at || sale.created_at)}
                                </small>
                              </Col>
                            </Row>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  )
                })}
              </tbody>
            </Table>

            {/* Pagination Info - Always show when we have sales */}
            {hasSales && (
              <div className="d-flex justify-content-between align-items-center mt-3 px-2">
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted small">Show:</span>
                  <Form.Select
                    size="sm"
                    value={pagination.pageSize}
                    onChange={handlePageSizeChange}
                    style={{ width: 'auto' }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </Form.Select>
                  <span className="text-muted small">per page</span>
                </div>

                {/* Only show pagination controls if more than 1 page */}
                {pagination.totalPages > 1 ? (
                  <Pagination className="mb-0" size="sm">
                    <Pagination.First
                      onClick={() => handlePageChange(1)}
                      disabled={pagination.page === 1}
                    />
                    <Pagination.Prev
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    />

                    {/* Page numbers */}
                    {pagination.page > 2 && (
                      <>
                        <Pagination.Item onClick={() => handlePageChange(1)}>1</Pagination.Item>
                        {pagination.page > 3 && <Pagination.Ellipsis disabled />}
                      </>
                    )}

                    {pagination.page > 1 && (
                      <Pagination.Item onClick={() => handlePageChange(pagination.page - 1)}>
                        {pagination.page - 1}
                      </Pagination.Item>
                    )}

                    <Pagination.Item active>{pagination.page}</Pagination.Item>

                    {pagination.page < pagination.totalPages && (
                      <Pagination.Item onClick={() => handlePageChange(pagination.page + 1)}>
                        {pagination.page + 1}
                      </Pagination.Item>
                    )}

                    {pagination.page < pagination.totalPages - 1 && (
                      <>
                        {pagination.page < pagination.totalPages - 2 && <Pagination.Ellipsis disabled />}
                        <Pagination.Item onClick={() => handlePageChange(pagination.totalPages)}>
                          {pagination.totalPages}
                        </Pagination.Item>
                      </>
                    )}

                    <Pagination.Next
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                    />
                    <Pagination.Last
                      onClick={() => handlePageChange(pagination.totalPages)}
                      disabled={pagination.page === pagination.totalPages}
                    />
                  </Pagination>
                ) : (
                  <div>{/* Spacer for layout */}</div>
                )}

                <div className="text-muted small">
                  {pagination.totalPages > 1 ? (
                    <>Page {pagination.page} of {pagination.totalPages} ({pagination.count} total)</>
                  ) : (
                    <>{pagination.count} total sales</>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  )
}
