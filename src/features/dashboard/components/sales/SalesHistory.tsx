import { useEffect, useState, Fragment, useCallback, useMemo, useRef } from 'react'
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
import { useAppDispatch, useAppSelector, useCurrency } from '../../../../hooks'
import { ReceiptModal } from './ReceiptModal'
import {
  loadSales,
  abandonSale,
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
import { exportSalesToCSV, getSalesSummary, listSales } from '../../../../services/salesService'
import type { UUID } from '../../../../types/common'

type SalesSummaryMetrics = {
  totalSales: number
  totalCostOfGoods: number
  totalTax: number
  totalDiscount: number
  totalExpenses: number
  totalProfit: number
  profitMargin: number
  averageOrderValue: number
  transactionCount: number
  byPaymentMethod: {
    CASH: number
    CARD: number
    CREDIT: number
    MOBILE: number
    SPLIT: number
  }
}

const DEFAULT_SALES_SUMMARY: SalesSummaryMetrics = {
  totalSales: 0,
  totalCostOfGoods: 0,
  totalTax: 0,
  totalDiscount: 0,
  totalExpenses: 0,
  totalProfit: 0,
  profitMargin: 0,
  averageOrderValue: 0,
  transactionCount: 0,
  byPaymentMethod: {
    CASH: 0,
    CARD: 0,
    CREDIT: 0,
    MOBILE: 0,
    SPLIT: 0,
  },
}

type SalesSummaryApiResponse = Awaited<ReturnType<typeof getSalesSummary>>

const ABANDON_ERROR_FALLBACK = "Couldn't discard the sale. Please try again."

export function SalesHistory() {
  const dispatch = useAppDispatch()
  const sales = useAppSelector(selectSales)
  const status = useAppSelector(selectSalesStatus)
  const error = useAppSelector(selectSalesError)
  const pagination = useAppSelector(selectSalesPagination)
  const filters = useAppSelector(selectSalesFilters)
  const userStorefronts = useAppSelector(selectUserStorefronts)
  const storefrontsLoading = useAppSelector(selectStorefrontsLoading)
  const { formatCurrency } = useCurrency()

  const [salesSummary, setSalesSummary] = useState<SalesSummaryMetrics>({ ...DEFAULT_SALES_SUMMARY })
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  // Local state for filter inputs
  const [searchTerm, setSearchTerm] = useState(filters.search || '')
  const [selectedStatus, setSelectedStatus] = useState<string>(filters.status || 'COMPLETED')
  const [selectedStorefront, setSelectedStorefront] = useState<string>(filters.storefront || '')
  const [dateRange, setDateRange] = useState<string>('')
  const [customDateFrom, setCustomDateFrom] = useState<string>(filters.date_from || '')
  const [customDateTo, setCustomDateTo] = useState<string>(filters.date_to || '')
  const [expandedSale, setExpandedSale] = useState<string | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(filters.payment_type || '')
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set())
  const [abandoningIds, setAbandoningIds] = useState<Set<string>>(new Set())
  const [bulkAbandoning, setBulkAbandoning] = useState(false)
  const [bulkMode, setBulkMode] = useState<'selected' | 'all' | null>(null)
  const [abandonFeedback, setAbandonFeedback] = useState<{
    variant: 'success' | 'danger' | 'info'
    message: string
  } | null>(null)
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null)

  // Receipt modal state
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptSaleId, setReceiptSaleId] = useState<UUID | null>(null)

  const showDraftControls = selectedStatus === 'DRAFT'

  const displayedDraftIds = useMemo(() => {
    if (!showDraftControls) {
      return [] as string[]
    }
    return sales.filter((sale) => sale.status === 'DRAFT').map((sale) => sale.id)
  }, [sales, showDraftControls])

  const selectedDraftCount = showDraftControls ? selectedDraftIds.size : 0
  const allDraftsSelected =
    showDraftControls &&
    displayedDraftIds.length > 0 &&
    displayedDraftIds.every((id) => selectedDraftIds.has(id))

  useEffect(() => {
    if (!showDraftControls) {
      setSelectedDraftIds(new Set())
      return
    }

    setSelectedDraftIds((prev) => {
      const next = new Set<string>()
      displayedDraftIds.forEach((id) => {
        if (prev.has(id)) {
          next.add(id)
        }
      })
      return next
    })
  }, [displayedDraftIds, showDraftControls])

  useEffect(() => {
    if (!showDraftControls) {
      if (selectAllCheckboxRef.current) {
        selectAllCheckboxRef.current.indeterminate = false
        selectAllCheckboxRef.current.checked = false
      }
      return
    }

    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = selectedDraftCount > 0 && !allDraftsSelected
    }
  }, [selectedDraftCount, allDraftsSelected, showDraftControls])

  const toggleDraftSelection = useCallback((saleId: string, checked: boolean) => {
    if (!showDraftControls) {
      return
    }
    setSelectedDraftIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(saleId)
      } else {
        next.delete(saleId)
      }
      return next
    })
  }, [showDraftControls])

  const toggleAllDrafts = useCallback(() => {
    if (!showDraftControls) {
      return
    }
    setSelectedDraftIds((prev) => {
      const next = new Set(prev)
      if (allDraftsSelected) {
        displayedDraftIds.forEach((id) => next.delete(id))
      } else {
        displayedDraftIds.forEach((id) => next.add(id))
      }
      return next
    })
  }, [allDraftsSelected, displayedDraftIds, showDraftControls])

  const fetchAllDraftSaleIds = useCallback(async (): Promise<string[]> => {
    if (!showDraftControls) {
      return []
    }
    const ids: string[] = []
    const pageSize = 100
    let page = 1
    let hasMore = true

    while (hasMore) {
      const response = await listSales({
        ...filters,
        status: 'DRAFT',
        page,
        page_size: pageSize,
      })

      const results = Array.isArray(response.results) ? response.results : []
      results.forEach((sale) => {
        if (sale?.status === 'DRAFT' && sale?.id) {
          ids.push(sale.id)
        }
      })

      const total = typeof response.count === 'number' ? response.count : ids.length
      if (ids.length >= total || results.length < pageSize) {
        hasMore = false
      } else {
        page += 1
      }
    }

    return ids
  }, [filters, showDraftControls])

  const abandonDrafts = useCallback(
    async (saleIds: string[]) => {
      if (!showDraftControls) {
        return { succeeded: 0, failed: 0 }
      }

      if (saleIds.length === 0) {
        return { succeeded: 0, failed: 0 }
      }

      setAbandonFeedback(null)

      setAbandoningIds((prev) => {
        const next = new Set(prev)
        saleIds.forEach((id) => next.add(id))
        return next
      })

      const failures: Array<{ id: string; message: string }> = []
      const succeeded: string[] = []

      for (const saleId of saleIds) {
        try {
          await dispatch(abandonSale({ saleId: saleId as UUID })).unwrap()
          succeeded.push(saleId)
        } catch (err) {
          const message = typeof err === 'string' && err ? err : ABANDON_ERROR_FALLBACK
          failures.push({ id: saleId, message })
        }
      }

      setAbandoningIds((prev) => {
        const next = new Set(prev)
        saleIds.forEach((id) => next.delete(id))
        return next
      })

      if (succeeded.length > 0) {
        setSelectedDraftIds((prev) => {
          const next = new Set(prev)
          succeeded.forEach((id) => next.delete(id))
          return next
        })

        void dispatch(loadSales())
      }

      if (failures.length === 0) {
        setAbandonFeedback({
          variant: 'success',
          message:
            succeeded.length === 1
              ? 'Draft sale removed and stock released.'
              : `${succeeded.length} draft sales removed and stock released.`,
        })
      } else {
        const uniqueMessages = Array.from(new Set(failures.map((failure) => failure.message)))
        setAbandonFeedback({
          variant: 'danger',
          message:
            succeeded.length === 0
              ? `Couldn't remove draft sales: ${uniqueMessages.join(' ')}`
              : `${succeeded.length} draft${succeeded.length === 1 ? '' : 's'} removed, ${failures.length} failed: ${uniqueMessages.join(' ')}`,
        })
      }

      return { succeeded: succeeded.length, failed: failures.length }
    },
    [dispatch, showDraftControls]
  )

  const handleAbandonSelected = useCallback(async () => {
    if (!showDraftControls) {
      return
    }

    if (selectedDraftIds.size === 0) {
      setAbandonFeedback({
        variant: 'info',
        message: 'Select at least one draft sale to remove.',
      })
      return
    }

    setBulkMode('selected')
    setBulkAbandoning(true)
    try {
      await abandonDrafts(Array.from(selectedDraftIds))
    } finally {
      setBulkAbandoning(false)
      setBulkMode(null)
    }
  }, [abandonDrafts, selectedDraftIds, showDraftControls])

  const handleAbandonAllDrafts = useCallback(async () => {
    if (!showDraftControls) {
      return
    }

    const confirmed = window.confirm(
      'This will discard every draft sale that matches your current filters and release their reserved stock. Continue?'
    )
    if (!confirmed) {
      return
    }

    setBulkMode('all')
    setBulkAbandoning(true)
    try {
      const allDraftIds = await fetchAllDraftSaleIds()
      if (allDraftIds.length === 0) {
        setAbandonFeedback({
          variant: 'success',
          message: 'No draft sales found for the current filters.',
        })
        return
      }

      await abandonDrafts(allDraftIds)
    } catch (err) {
      console.error('Failed to abandon all draft sales', err)
      setAbandonFeedback({
        variant: 'danger',
        message: 'Failed to load draft sales. Please try again.',
      })
    } finally {
      setBulkAbandoning(false)
      setBulkMode(null)
    }
  }, [abandonDrafts, fetchAllDraftSaleIds, showDraftControls])

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

  const buildSummaryParams = useCallback(() => {
    const params: Record<string, string> = {}

    if (filters.search) params.search = filters.search
    if (filters.status) params.status = filters.status
    if (filters.storefront) params.storefront = filters.storefront
    if (filters.date_from) params.date_from = filters.date_from
    if (filters.date_to) params.date_to = filters.date_to
    if (filters.payment_type) params.payment_type = filters.payment_type === 'MOMO' ? 'MOBILE' : filters.payment_type

    return params
  }, [filters])

  const transformSummaryResponse = useCallback((data?: SalesSummaryApiResponse): SalesSummaryMetrics => {
    if (!data || typeof data !== 'object') {
      return { ...DEFAULT_SALES_SUMMARY }
    }

    const summaryBlock = (data.summary ?? {}) as Record<string, unknown>

    const hasOwn = (key: string) => Object.prototype.hasOwnProperty.call(summaryBlock, key)

    const parseNumber = (value: unknown): number => {
      if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0
      }

      if (typeof value === 'string') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : 0
      }

      return 0
    }

    const pick = (...keys: string[]): number => {
      for (const key of keys) {
        if (hasOwn(key)) {
          return parseNumber(summaryBlock[key])
        }
      }
      return 0
    }

    const totalSales = pick('total_sales', 'total_sales_volume', 'total_revenue', 'sales')
    const totalCostOfGoods = pick('total_cost_of_goods', 'cost_of_goods', 'total_cogs', 'cogs')
    const totalTax = pick('total_tax', 'tax_collected', 'taxes', 'total_taxes')
    const totalDiscount = pick('total_discounts', 'discount_amount', 'discounts', 'total_discount')

    const profitKeys = ['total_profit', 'net_profit', 'net_sales', 'profit']
    const hasProfitField = profitKeys.some(key => hasOwn(key))
    const profitFromSummary = pick(...profitKeys)

    const transactionCount = pick('total_transactions', 'completed_transactions', 'transaction_count')

    const averageFromSummary = pick('avg_transaction', 'average_transaction', 'avg_order_value')
    const averageOrderValue = averageFromSummary || (transactionCount > 0 ? totalSales / transactionCount : 0)

    const totalExpenses = totalCostOfGoods + totalTax + totalDiscount
    const totalProfit = hasProfitField ? profitFromSummary : totalSales - totalExpenses
    const marginKeys = ['profit_margin', 'margin_percentage']
    const hasMarginField = marginKeys.some(key => hasOwn(key))
    const marginFromSummary = pick(...marginKeys)
    const profitMargin = hasMarginField ? marginFromSummary : (totalSales > 0 ? (totalProfit / totalSales) * 100 : 0)

    const paymentTotals: SalesSummaryMetrics['byPaymentMethod'] = {
      CASH: pick('cash_sales', 'total_cash'),
      CARD: pick('card_sales', 'total_card'),
      CREDIT: pick('credit_sales', 'total_credit'),
      MOBILE: pick('mobile_sales', 'momo_sales', 'total_mobile'),
      SPLIT: pick('split_sales', 'total_split'),
    }

    if (Array.isArray(data.payment_breakdown)) {
      data.payment_breakdown.forEach(item => {
        const type = typeof item.payment_type === 'string' ? item.payment_type.toUpperCase() : ''
        const total = parseNumber((item as Record<string, unknown>).total ?? (item as Record<string, unknown>).amount)

        switch (type) {
          case 'CASH':
            paymentTotals.CASH += total
            break
          case 'CARD':
            paymentTotals.CARD += total
            break
          case 'CREDIT':
            paymentTotals.CREDIT += total
            break
          case 'MOBILE':
          case 'MOMO':
            paymentTotals.MOBILE += total
            break
          case 'SPLIT':
            paymentTotals.SPLIT += total
            break
          default:
            break
        }
      })
    }

    return {
      totalSales,
      totalCostOfGoods,
      totalTax,
      totalDiscount,
      totalExpenses,
      totalProfit,
      profitMargin,
      averageOrderValue,
      transactionCount,
      byPaymentMethod: paymentTotals,
    }
  }, [])

  useEffect(() => {
    let isActive = true

    const loadSummary = async () => {
      setSummaryLoading(true)
      setSummaryError(null)

      try {
        const params = buildSummaryParams()
        const response = await getSalesSummary(params)
        if (isActive) {
          setSalesSummary(transformSummaryResponse(response))
        }
      } catch (err) {
        console.error('Failed to load sales summary', err)
        if (isActive) {
          setSummaryError('Unable to load sales summary. Showing latest known values.')
        }
      } finally {
        if (isActive) {
          setSummaryLoading(false)
        }
      }
    }

    void loadSummary()

    return () => {
      isActive = false
    }
  }, [buildSummaryParams, transformSummaryResponse])

  // Toggle sale details expansion
  const toggleSaleDetails = (saleId: string) => {
    setExpandedSale(expandedSale === saleId ? null : saleId)
  }

  // Open receipt modal
  const handlePrintReceipt = (saleId: UUID, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent row expansion when clicking print button
    setReceiptSaleId(saleId)
    setShowReceipt(true)
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
    <>
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

        {abandonFeedback && (
          <Alert
            variant={abandonFeedback.variant}
            className="mb-3"
            dismissible
            onClose={() => setAbandonFeedback(null)}
          >
            {abandonFeedback.message}
          </Alert>
        )}

        {/* Sales Summary Card - Only show when we have sales */}
        {!isLoading && hasSales && (
          <Card className="mb-3 border-0 shadow-sm">
            <Card.Body className="pb-2">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0 text-muted">📊 Sales Summary</h6>
                {summaryLoading && (
                  <div className="d-flex align-items-center gap-2 text-muted small">
                    <Spinner animation="border" size="sm" role="status" />
                    <span>Refreshing…</span>
                  </div>
                )}
              </div>
              {summaryError && (
                <Alert variant="warning" className="py-2">
                  <small>{summaryError}</small>
                </Alert>
              )}
              <Row className="g-3">
                <Col md={3}>
                  <div className="text-center">
                    <div className="text-muted small mb-1">Total Revenue</div>
                    <div className="h5 mb-0 text-primary fw-bold">
                      {formatCurrency(salesSummary.totalSales)}
                    </div>
                    <div className="text-muted small">
                      {salesSummary.transactionCount} transactions
                    </div>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center">
                    <div className="text-muted small mb-1">Total Expenses</div>
                    <div className="h5 mb-0 text-danger fw-bold">
                      {formatCurrency(salesSummary.totalExpenses)}
                    </div>
                    <div className="text-muted small">
                      COGS {formatCurrency(salesSummary.totalCostOfGoods)}
                    </div>
                    <div className="text-muted small">
                      Tax {formatCurrency(salesSummary.totalTax)} • Discounts {formatCurrency(salesSummary.totalDiscount)}
                    </div>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center">
                    <div className="text-muted small mb-1">Net Profit</div>
                    <div className="h5 mb-0 text-success fw-bold">
                      {formatCurrency(salesSummary.totalProfit)}
                    </div>
                    <div className="text-muted small">
                      Avg order {formatCurrency(salesSummary.averageOrderValue)}
                    </div>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center">
                    <div className="text-muted small mb-1">Profit Margin</div>
                    <div className="h5 mb-0 text-info fw-bold">
                      {salesSummary.profitMargin.toFixed(1)}%
                    </div>
                    <div className="text-muted small">Backend financials</div>
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
            {showDraftControls && displayedDraftIds.length > 0 && (
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-3">
                <div className="text-muted small">
                  {displayedDraftIds.length} draft {displayedDraftIds.length === 1 ? 'sale' : 'sales'} on this page.
                  {selectedDraftCount > 0 && ` ${selectedDraftCount} selected.`}
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={toggleAllDrafts}
                    disabled={bulkAbandoning}
                  >
                    {allDraftsSelected ? 'Clear selection' : 'Select all drafts on page'}
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => void handleAbandonSelected()}
                    disabled={selectedDraftCount === 0 || bulkAbandoning}
                  >
                    {bulkAbandoning && bulkMode === 'selected' ? (
                      <span className="d-inline-flex align-items-center gap-2">
                        <Spinner animation="border" size="sm" role="status" />
                        <span>Removing…</span>
                      </span>
                    ) : (
                      `Abandon selected (${selectedDraftCount})`
                    )}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => void handleAbandonAllDrafts()}
                    disabled={bulkAbandoning}
                  >
                    {bulkAbandoning && bulkMode === 'all' ? (
                      <span className="d-inline-flex align-items-center gap-2">
                        <Spinner animation="border" size="sm" role="status" />
                        <span>Abandoning all…</span>
                      </span>
                    ) : (
                      'Abandon all drafts'
                    )}
                  </Button>
                </div>
              </div>
            )}
            <Table hover size="sm">
              <thead>
                <tr>
                  {showDraftControls && (
                    <th style={{ minWidth: '200px' }}>
                      <div className="d-flex align-items-center gap-2">
                        <span>Draft controls</span>
                        {displayedDraftIds.length > 0 && (
                          <Form.Check
                            type="checkbox"
                            ref={selectAllCheckboxRef}
                            checked={allDraftsSelected}
                            onChange={() => toggleAllDrafts()}
                            onClick={(e) => e.stopPropagation()}
                            disabled={bulkAbandoning}
                            aria-label="Select all draft sales on this page"
                          />
                        )}
                      </div>
                    </th>
                  )}
                  <th>Receipt #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => {
                  const canExpand = (sale.line_items?.length ?? 0) > 0
                  const isDraft = sale.status === 'DRAFT'
                  const isSelectedDraft = selectedDraftIds.has(sale.id)
                  const isAbandoningDraft = abandoningIds.has(sale.id)
                  const disableDraftAction = bulkAbandoning || isAbandoningDraft

                  return (
                    <Fragment key={sale.id}>
                    {/* Main row - clickable to expand */}
                    <tr 
                      onClick={canExpand ? () => toggleSaleDetails(sale.id) : undefined}
                      style={{ cursor: canExpand ? 'pointer' : 'default' }}
                      className={expandedSale === sale.id ? 'table-active' : ''}
                    >
                      {showDraftControls && (
                        <td onClick={(event) => event.stopPropagation()}>
                          {isDraft ? (
                            <div className="d-flex align-items-center gap-2">
                              <Form.Check
                                type="checkbox"
                                checked={isSelectedDraft}
                                onChange={(e) => toggleDraftSelection(sale.id, e.target.checked)}
                                disabled={disableDraftAction}
                                aria-label="Select draft sale"
                              />
                              <Button
                                variant="outline-danger"
                                size="sm"
                                disabled={disableDraftAction}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  void abandonDrafts([sale.id])
                                }}
                              >
                                {isAbandoningDraft ? (
                                  <span className="d-inline-flex align-items-center gap-2">
                                    <Spinner animation="border" size="sm" role="status" />
                                    <span>Removing…</span>
                                  </span>
                                ) : (
                                  'Remove draft'
                                )}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted small">—</span>
                          )}
                        </td>
                      )}
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
                      <td onClick={(event) => event.stopPropagation()}>
                        {sale.status === 'COMPLETED' && (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={(event) => handlePrintReceipt(sale.id, event)}
                            title="Print Receipt"
                          >
                            🖨️ Print
                          </Button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded row - shows product details */}
                    {expandedSale === sale.id && canExpand && (
                      <tr className="border-0">
                        <td colSpan={showDraftControls ? 9 : 8} style={{ backgroundColor: '#f8f9fa', padding: '1rem' }}>
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

    {/* Receipt Modal */}
    <ReceiptModal
      show={showReceipt}
      saleId={receiptSaleId}
      onHide={() => {
        setShowReceipt(false)
        setReceiptSaleId(null)
      }}
    />
  </>
  )
}
