import { useState, useEffect, useCallback, useRef } from 'react'
import { isAxiosError } from 'axios'
import { Container, Row, Col, Card, Button, Tab, Tabs, Alert } from 'react-bootstrap'
import { useAppDispatch, useAppSelector, useCurrency } from '../../../hooks'
import {
  selectCurrentCart,
  selectMutations,
  selectErrors,
  createSale,
  abandonSale,
  clearCart,
  clearMutationError,
  setCurrentCartCustomer,
  loadSales,
} from '../../../store/slices/salesSlice'
import { selectActiveLocation } from '../../../store/slices/locationSlice'
import {
  SaleCart,
  ProductSearchPanel,
  CustomerSelectPanel,
  PaymentPanel,
  SalesHistory,
  CreditManagement,
  CreateCustomerModal,
} from '../components/sales'
import type { UUID } from '../../../types/common'
import type { Customer, Sale } from '../../../types/sales'
import type { CustomerOption } from '../components/sales/CustomerSelectPanel'
import {
  listCustomers,
  createCustomer as createCustomerService,
  getSalesSummary,
  getTodaysSalesStats,
} from '../../../services/salesService'

const WALK_IN_NAME = 'Walk-In-Customer'
const WALK_IN_NAME_NORMALIZED = WALK_IN_NAME.replace(/[^a-z0-9]/gi, '').toLowerCase()

const normalizeCustomerName = (name: string | undefined | null) =>
  (name || '').replace(/[^a-z0-9]/gi, '').toLowerCase()

const DEFAULT_TODAY_STATS = {
  transactions: 0,
  totalSales: 0,
  avgTransaction: 0,
}

export default function SalesPage() {
  const dispatch = useAppDispatch()
  const currentCart = useAppSelector(selectCurrentCart)
  const currentLocation = useAppSelector(selectActiveLocation)
  const mutations = useAppSelector(selectMutations)
  const errors = useAppSelector(selectErrors)
  const { formatCurrency } = useCurrency()

  const currentCartRef = useRef<Sale | null>(currentCart)
  currentCartRef.current = currentCart
  
  const [activeTab, setActiveTab] = useState<'new-sale' | 'history' | 'credit'>('new-sale')
  const [saleType, setSaleType] = useState<'RETAIL' | 'WHOLESALE'>('RETAIL')
  const [selectedCustomer, setSelectedCustomer] = useState<UUID | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([])
  const [customersLoading, setCustomersLoading] = useState(false)
  const [customerError, setCustomerError] = useState<string | null>(null)
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false)
  const [ensuringCustomer, setEnsuringCustomer] = useState(false)
  const [checkoutCustomerId, setCheckoutCustomerId] = useState<UUID | null>(null)
  const [todayStats, setTodayStats] = useState(DEFAULT_TODAY_STATS)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)
  const statsCacheRef = useRef<Record<string, typeof DEFAULT_TODAY_STATS>>({})
  const initializingSaleRef = useRef(false)
  const pendingSalePromiseRef = useRef<Promise<Sale | null> | null>(null)

  const normalizeStats = useCallback((stats: Partial<typeof DEFAULT_TODAY_STATS> | null | undefined) => {
    const safe = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0)
    return {
      transactions: safe(stats?.transactions),
      totalSales: safe(stats?.totalSales),
      avgTransaction: safe(stats?.avgTransaction),
    }
  }, [])

  const getStatsCacheKey = useCallback((id: string | null) => (id ? `storefront:${id}` : 'all'), [])

  const storeStats = useCallback(
    (cacheKey: string, stats: Partial<typeof DEFAULT_TODAY_STATS>) => {
      const normalized = normalizeStats(stats)
      statsCacheRef.current[cacheKey] = normalized
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(`pos_today_stats_${cacheKey}`, JSON.stringify(normalized))
        } catch (storageError) {
          console.warn('Unable to persist today stats cache', storageError)
        }
      }
      return normalized
    },
    [normalizeStats]
  )

  const hydrateStatsFromStorage = useCallback(
    (cacheKey: string): typeof DEFAULT_TODAY_STATS | null => {
      if (statsCacheRef.current[cacheKey]) {
        return statsCacheRef.current[cacheKey]
      }
      if (typeof window === 'undefined') {
        return null
      }
      try {
        const raw = window.localStorage.getItem(`pos_today_stats_${cacheKey}`)
        if (!raw) {
          return null
        }
        const parsed = JSON.parse(raw) as Partial<typeof DEFAULT_TODAY_STATS> | null
        const normalized = normalizeStats(parsed)
        statsCacheRef.current[cacheKey] = normalized
        return normalized
      } catch (err) {
        console.warn('Failed to read cached today stats', err)
        return null
      }
    },
    [normalizeStats]
  )

  const locationId = currentLocation?.id ?? null

  const loadTodayStats = useCallback(async (options?: { preserveExisting?: boolean }) => {
    const cacheKey = getStatsCacheKey(locationId)
    if (!options?.preserveExisting) {
      const cached = statsCacheRef.current[cacheKey] ?? hydrateStatsFromStorage(cacheKey)
      if (cached) {
        setTodayStats(cached)
      }
    }

    const safeNumber = (value: unknown) => {
      if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0
      }
      if (typeof value === 'string') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : 0
      }
      return 0
    }

    const pickNumber = (source: Record<string, unknown>, keys: string[]) => {
      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          return safeNumber(source[key])
        }
      }
      return 0
    }

    try {
      setStatsLoading(true)
      setStatsError(null)

      const snapshotParams: Record<string, unknown> = {}
      if (locationId) {
        snapshotParams.storefront = locationId
      }

      const summaryParams: Record<string, unknown> = {
        date_range: 'today',
        status: 'COMPLETED',
      }

      if (locationId) {
        summaryParams.storefront = locationId
      }

      const snapshot = await getTodaysSalesStats(snapshotParams)
      const snapshotRecord = (snapshot ?? {}) as Record<string, unknown>

      let transactions = pickNumber(snapshotRecord, ['transactions', 'completed_transactions'])
      let totalSales = pickNumber(snapshotRecord, ['total_sales', 'sales'])
      let avgTransaction = pickNumber(snapshotRecord, ['avg_transaction', 'average_transaction'])

      let statusBreakdown = Array.isArray(snapshotRecord['status_breakdown'])
        ? (snapshotRecord['status_breakdown'] as Array<Record<string, unknown>>)
        : []
      let dailyTrend = Array.isArray(snapshotRecord['daily_trend'])
        ? (snapshotRecord['daily_trend'] as Array<Record<string, unknown>>)
        : []

      let averageFromSummary = 0

      if (transactions === 0 || totalSales === 0) {
        const response = await getSalesSummary(summaryParams)
        const summary = (response?.summary ?? {}) as Record<string, unknown>

        const summaryTransactions = pickNumber(summary, ['total_transactions', 'completed_transactions', 'transaction_count'])
        const summaryTotalSales = pickNumber(summary, ['total_sales', 'net_sales', 'total_revenue', 'sales'])
        averageFromSummary = pickNumber(summary, ['avg_transaction', 'average_transaction', 'avg_order_value'])

        if (transactions === 0 && summaryTransactions > 0) {
          transactions = summaryTransactions
        }
        if (totalSales === 0 && summaryTotalSales > 0) {
          totalSales = summaryTotalSales
        }

        if (!statusBreakdown.length && Array.isArray(response?.status_breakdown)) {
          statusBreakdown = response.status_breakdown as Array<Record<string, unknown>>
        }
        if (!dailyTrend.length && Array.isArray(response?.daily_trend)) {
          dailyTrend = response.daily_trend as Array<Record<string, unknown>>
        }
      }

      const breakdownTotals = statusBreakdown.reduce<{ count: number; total: number }>(
        (acc, rawItem) => {
          const item = (rawItem ?? {}) as Record<string, unknown>
          const count = pickNumber(item, ['count', 'transactions', 'completed_transactions'])
          const total = pickNumber(item, ['total', 'amount', 'sales'])
          return {
            count: acc.count + count,
            total: acc.total + total,
          }
        },
        { count: 0, total: 0 }
      )

      if (transactions === 0 && breakdownTotals.count > 0) {
        transactions = breakdownTotals.count
      }
      if (totalSales === 0 && breakdownTotals.total > 0) {
        totalSales = breakdownTotals.total
      }

      if (transactions === 0 || totalSales === 0) {
        const todayIso = new Date().toISOString().slice(0, 10)
        const trendToday = dailyTrend.find((entry) => {
          const dateValue = typeof entry.date === 'string' ? entry.date : (entry.date as string | undefined)
          return dateValue ? dateValue.startsWith(todayIso) : false
        }) as Record<string, unknown> | undefined

        if (trendToday) {
          if (transactions === 0) {
            const trendTransactions = pickNumber(trendToday, ['transactions', 'count'])
            if (trendTransactions > 0) {
              transactions = trendTransactions
            }
          }
          if (totalSales === 0) {
            const trendSales = pickNumber(trendToday, ['sales', 'total'])
            if (trendSales > 0) {
              totalSales = trendSales
            }
          }
        }
      }

      if (avgTransaction === 0) {
        if (averageFromSummary > 0) {
          avgTransaction = averageFromSummary
        } else if (transactions > 0) {
          avgTransaction = totalSales / transactions
        }
      }

      const cachedStats = statsCacheRef.current[cacheKey]
      const shouldKeepCachedValues =
        transactions === 0 &&
        totalSales === 0 &&
        avgTransaction === 0 &&
        cachedStats &&
        (cachedStats.transactions > 0 || cachedStats.totalSales > 0)

      if (shouldKeepCachedValues) {
        transactions = cachedStats.transactions
        totalSales = cachedStats.totalSales
        avgTransaction = cachedStats.avgTransaction
      }

      setTodayStats((prev) => {
        if (options?.preserveExisting) {
          const mergedTransactions = Math.max(prev.transactions, transactions)
          const mergedTotalSales = Math.max(prev.totalSales, totalSales)
          const mergedAvg = mergedTransactions > 0 ? mergedTotalSales / mergedTransactions : 0
          const mergedStats = {
            transactions: mergedTransactions,
            totalSales: mergedTotalSales,
            avgTransaction: mergedAvg,
          }
          return storeStats(cacheKey, mergedStats)
        }

        const nextStats = {
          transactions,
          totalSales,
          avgTransaction,
        }
        return storeStats(cacheKey, nextStats)
      })
    } catch (err) {
      console.error("Failed to load today's stats", err)
      setStatsError("Couldn't refresh today's stats. Showing last known values.")
    } finally {
      setStatsLoading(false)
    }
  }, [getStatsCacheKey, hydrateStatsFromStorage, locationId, storeStats])

  const upsertCustomerOption = useCallback((customer: { id: UUID; name: string }) => {
    setCustomerOptions((prev) => {
      if (prev.some((option) => option.id === customer.id)) {
        return prev
      }
      return [...prev, customer]
    })
  }, [])

  const clearExistingCart = useCallback(async () => {
    const cart = currentCartRef.current

    if (!cart) {
      dispatch(clearCart())
      currentCartRef.current = null
      return
    }

    try {
      if (cart.status === 'DRAFT') {
        await dispatch(abandonSale({ saleId: cart.id })).unwrap()
      }
    } catch (err) {
      console.error('Failed to abandon previous draft sale', err)
    } finally {
      dispatch(clearCart())
      currentCartRef.current = null
    }
  }, [currentCartRef, dispatch])

  const getOrCreateWalkInCustomer = useCallback(async () => {
    const setWalkInState = (option: { id: UUID; name: string }) => {
      setSelectedCustomer(option.id)
      setCheckoutCustomerId(option.id)
      setCustomerError(null)
      return option
    }

    const findInOptions = () =>
      customerOptions.find((option) => normalizeCustomerName(option.name) === WALK_IN_NAME_NORMALIZED)

    const existingOption = findInOptions()
    if (existingOption) {
      return setWalkInState(existingOption)
    }

    try {
      const response = await listCustomers({ search: WALK_IN_NAME, page_size: 1 })
      const match = response.results.find(
        (customer) => normalizeCustomerName(customer.name) === WALK_IN_NAME_NORMALIZED,
      )

      if (match) {
        const option = { id: match.id, name: match.name }
        upsertCustomerOption(option)
        return setWalkInState(option)
      }
    } catch (searchError) {
      console.warn('Failed to search for walk-in customer', searchError)
    }

    try {
      const customer = await createCustomerService({
        name: WALK_IN_NAME,
        phone: '+233000000000',
        type: 'RETAIL',
        notes: 'Auto-generated walk-in customer',
      })

      const option = { id: customer.id, name: customer.name }
      upsertCustomerOption(option)
      return setWalkInState(option)
    } catch (err) {
      console.error('Failed to prepare walk-in customer', err)

      if (isAxiosError(err) && err.response?.status === 400) {
        try {
          const retry = await listCustomers({ search: WALK_IN_NAME, page_size: 1 })
          const match = retry.results.find(
            (customer) => normalizeCustomerName(customer.name) === WALK_IN_NAME_NORMALIZED,
          )
          if (match) {
            const option = { id: match.id, name: match.name }
            upsertCustomerOption(option)
            return setWalkInState(option)
          }
        } catch (retryError) {
          console.warn('Retry search for walk-in customer failed', retryError)
        }
      }

      setCustomerError('Unable to prepare a walk-in customer automatically. Please add one manually.')
      return null
    }
  }, [customerOptions, upsertCustomerOption])

  const startFreshSaleSession = useCallback(async (): Promise<Sale | null> => {
    if (!currentLocation) {
      setCustomerError('Please select a storefront before starting a sale.')
      return null
    }

    let customerId: UUID | undefined
    let customerName: string | null = null

    if (saleType === 'WHOLESALE') {
      if (!selectedCustomer) {
        setCustomerError('Please select a customer before starting a wholesale sale.')
        return null
      }
      customerId = selectedCustomer
      customerName = customerOptions.find((option) => option.id === selectedCustomer)?.name ?? null
    } else {
      const walkIn = await getOrCreateWalkInCustomer()
      customerId = walkIn?.id
      customerName = walkIn?.name ?? null
    }

    try {
      const sale = await dispatch(
        createSale({
          storefront: currentLocation.id,
          type: saleType,
          customer: customerId,
        })
      ).unwrap()

      currentCartRef.current = sale

      if (customerId) {
        dispatch(
          setCurrentCartCustomer({
            customerId,
            customerName: customerName ?? sale.customer_name ?? null,
          })
        )
      }

      setCustomerError(null)
      return sale
    } catch (err) {
      console.error('Failed to start a new sale session', err)
      setCustomerError('Unable to start a new sale. Please try again.')
      return null
    }
  }, [currentLocation, customerOptions, dispatch, getOrCreateWalkInCustomer, saleType, selectedCustomer])

  const prepareFreshSale = useCallback(async (options?: { startNewDraft?: boolean }) => {
    if (initializingSaleRef.current) {
      return
    }

    initializingSaleRef.current = true

    setShowPayment(false)
    setSaleType('RETAIL')
    setCustomerError(null)
    setEnsuringCustomer(false)
    setSelectedCustomer(null)
    setCheckoutCustomerId(null)

    try {
      await clearExistingCart()
      if (options?.startNewDraft) {
        await startFreshSaleSession()
      }
    } finally {
      initializingSaleRef.current = false
    }
  }, [clearExistingCart, startFreshSaleSession])

  const ensureSaleSession = useCallback(async (): Promise<UUID | null> => {
    const existingCart = currentCartRef.current

    if (existingCart?.id) {
      return existingCart.id
    }

    if (pendingSalePromiseRef.current) {
      const pendingSale = await pendingSalePromiseRef.current
      return pendingSale?.id ?? null
    }

    const createPromise = startFreshSaleSession()
    pendingSalePromiseRef.current = createPromise

    try {
      const sale = await createPromise
      return sale?.id ?? null
    } finally {
      pendingSalePromiseRef.current = null
    }
  }, [currentCartRef, startFreshSaleSession])

  useEffect(() => {
    if (activeTab !== 'new-sale') {
      return
    }

    const cacheKey = getStatsCacheKey(locationId)
    const cached = hydrateStatsFromStorage(cacheKey)
    if (cached) {
      setTodayStats(cached)
    }

    void loadTodayStats()
  }, [activeTab, hydrateStatsFromStorage, loadTodayStats, locationId, getStatsCacheKey])

  useEffect(() => {
    if (activeTab !== 'new-sale') {
      return
    }

    if (!currentLocation) {
      return
    }

    if (currentCart || initializingSaleRef.current) {
      return
    }

    void prepareFreshSale()
  }, [activeTab, currentCart, currentLocation, prepareFreshSale])

  useEffect(() => {
    let isMounted = true

    const loadCustomers = async () => {
      setCustomersLoading(true)
      setCustomerError(null)
      try {
        const response = await listCustomers({ page_size: 50 })
        if (!isMounted) return
        const mapped: CustomerOption[] = response.results.map((customer) => ({
          id: customer.id,
          name: customer.name,
        }))
        setCustomerOptions(mapped)
        const walkInOption = mapped.find(
          (option) => normalizeCustomerName(option.name) === WALK_IN_NAME_NORMALIZED
        )
        if (walkInOption) {
          let assigned = false
          setSelectedCustomer((prev) => {
            if (prev) {
              return prev
            }
            assigned = true
            return walkInOption.id
          })

          let checkoutAssigned = false
          setCheckoutCustomerId((prev) => {
            if (prev) {
              return prev
            }
            checkoutAssigned = true
            return walkInOption.id
          })

          if (assigned || checkoutAssigned) {
            dispatch(setCurrentCartCustomer({ customerId: walkInOption.id, customerName: walkInOption.name }))
          }
        }
      } catch (err) {
        console.error('Failed to load customers', err)
        if (isMounted) {
          setCustomerError('Unable to load customers. You can still create a new one.')
        }
      } finally {
        if (isMounted) {
          setCustomersLoading(false)
        }
      }
    }

    void loadCustomers()

    return () => {
      isMounted = false
    }
  }, [dispatch])

  useEffect(() => {
    if (currentCart?.customer && currentCart.customer_name) {
      upsertCustomerOption({ id: currentCart.customer, name: currentCart.customer_name })
      if (!selectedCustomer) {
        setSelectedCustomer(currentCart.customer)
      }
      if (!checkoutCustomerId) {
        setCheckoutCustomerId(currentCart.customer)
      }
    }
  }, [currentCart?.customer, currentCart?.customer_name, selectedCustomer, checkoutCustomerId, upsertCustomerOption])

  const handleTabSelect = useCallback(
    (key: string | null) => {
      if (!key) {
        return
      }

      const tabKey = key as 'new-sale' | 'history' | 'credit'
      setActiveTab(tabKey)

      if (tabKey === 'new-sale' && !currentCart) {
        void prepareFreshSale()
      }
    },
    [currentCart, prepareFreshSale]
  )

  const handleClearCart = useCallback(async () => {
    const cart = currentCartRef.current

    if (!cart) {
      return
    }

    const confirmed = window.confirm('Are you sure you want to clear this sale?')
    if (!confirmed) {
      return
    }

    try {
      if (cart.status === 'DRAFT') {
        await dispatch(abandonSale({ saleId: cart.id })).unwrap()
      }

      dispatch(clearCart())
      currentCartRef.current = null
      setSelectedCustomer(null)
      setCheckoutCustomerId(null)
    } catch (err) {
      console.error('Failed to abandon sale before clearing cart', err)
    }
  }, [currentCartRef, dispatch])

  const handleCustomerChange = (customerId: UUID | null) => {
    setSelectedCustomer(customerId)
    setCheckoutCustomerId(customerId)
    if (customerId) {
      const option = customerOptions.find((customer) => customer.id === customerId)
      dispatch(
        setCurrentCartCustomer({
          customerId,
          customerName: option?.name ?? null,
        })
      )
      setCustomerError(null)
    } else {
      dispatch(setCurrentCartCustomer({ customerId: null, customerName: null }))
    }
  }

  const handleCustomerCreated = (customer: Customer) => {
    upsertCustomerOption({ id: customer.id, name: customer.name })
    setSelectedCustomer(customer.id)
    setCheckoutCustomerId(customer.id)
    dispatch(setCurrentCartCustomer({ customerId: customer.id, customerName: customer.name }))
    setCustomerError(null)
  }

  const ensureCustomerForSale = useCallback(async (): Promise<UUID | null> => {
    if (selectedCustomer) {
      if (checkoutCustomerId !== selectedCustomer) {
        setCheckoutCustomerId(selectedCustomer)
      }
      return selectedCustomer
    }

    if (saleType === 'WHOLESALE') {
      setCustomerError('Please select a customer before completing a wholesale sale.')
      return null
    }

    try {
      setEnsuringCustomer(true)

      const existingWalkIn = customerOptions.find(
        (option) => normalizeCustomerName(option.name) === WALK_IN_NAME_NORMALIZED
      )

      if (existingWalkIn) {
        setSelectedCustomer(existingWalkIn.id)
        setCheckoutCustomerId(existingWalkIn.id)
        dispatch(setCurrentCartCustomer({ customerId: existingWalkIn.id, customerName: existingWalkIn.name }))
        setCustomerError(null)
        return existingWalkIn.id
      }

      const customer = await createCustomerService({
        name: WALK_IN_NAME,
        phone: WALK_IN_NAME,
        type: 'RETAIL',
        notes: 'Auto-generated walk-in customer',
      })

      upsertCustomerOption({ id: customer.id, name: customer.name })
      setSelectedCustomer(customer.id)
      setCheckoutCustomerId(customer.id)
      dispatch(setCurrentCartCustomer({ customerId: customer.id, customerName: customer.name }))
      setCustomerError(null)
      return customer.id
    } catch (err) {
      console.error('Failed to auto-create walk-in customer', err)
      setCustomerError('Could not create a walk-in customer automatically. Please add a customer manually.')
      return null
    } finally {
      setEnsuringCustomer(false)
    }
  }, [selectedCustomer, saleType, customerOptions, checkoutCustomerId, upsertCustomerOption, dispatch])

  const handleCheckout = useCallback(async () => {
    const customerId = await ensureCustomerForSale()
    if (!customerId) {
      return
    }
    setCheckoutCustomerId(customerId)
    setShowPayment(true)
  }, [ensureCustomerForSale])

  const handlePaymentComplete = (completedSale: Sale) => {
    currentCartRef.current = completedSale
    setShowPayment(false)

    void dispatch(loadSales())

    const parseAmount = (value: unknown) => {
      if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0
      }
      if (typeof value === 'string') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : 0
      }
      return 0
    }

    setTodayStats((prev) => {
      const saleTotal = parseAmount(completedSale.total_amount)
      const newTransactions = prev.transactions + 1
      const newTotalSales = prev.totalSales + saleTotal
      const newAvg = newTransactions > 0 ? newTotalSales / newTransactions : 0
      return {
        transactions: newTransactions,
        totalSales: newTotalSales,
        avgTransaction: newAvg,
      }
    })

    void loadTodayStats({ preserveExisting: true })

    void prepareFreshSale()
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>Sales</h2>
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onSelect={handleTabSelect}
        className="mb-3"
      >
        <Tab eventKey="new-sale" title="New Sale">
          {!currentLocation ? (
            <Alert variant="warning">
              Please select a storefront from the dropdown above to start making sales.
            </Alert>
          ) : (
            <Row>
              {/* Left Panel - Product Search & Cart */}
              <Col lg={8}>
                <Card className="mb-3">
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <div>
                      <h5 className="mb-0">Point of Sale</h5>
                      {currentCart && (
                        <small className="text-muted">
                          Receipt: {currentCart.receipt_number}
                        </small>
                      )}
                    </div>
                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => setSaleType(saleType === 'RETAIL' ? 'WHOLESALE' : 'RETAIL')}
                        disabled={!!currentCart}
                      >
                        {saleType}
                      </Button>
                      {currentCart && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => {
                            void handleClearCart()
                          }}
                          disabled={mutations.abandon === 'loading'}
                        >
                          {mutations.abandon === 'loading' ? 'Discarding…' : 'Clear Cart'}
                        </Button>
                      )}
                    </div>
                  </Card.Header>
                  <Card.Body>
                    {errors.createSale && (
                      <Alert
                        variant="danger"
                        dismissible
                        onClose={() => dispatch(clearMutationError('createSale'))}
                      >
                        {errors.createSale}
                      </Alert>
                    )}
                    {errors.abandon && (
                      <Alert
                        variant="danger"
                        dismissible
                        onClose={() => dispatch(clearMutationError('abandon'))}
                      >
                        {errors.abandon}
                      </Alert>
                    )}

                    {/* Product Search */}
                    <ProductSearchPanel
                      storefrontId={currentLocation?.id || ''}
                      saleId={currentCart?.id}
                      saleType={saleType}
                      ensureSaleSession={ensureSaleSession}
                      disabled={mutations.createSale === 'loading'}
                    />
                    {/* Shopping Cart */}
                    <div className="mt-4">
                      <SaleCart
                        cart={currentCart}
                        onCheckout={handleCheckout}
                        disabled={mutations.checkout === 'loading' || ensuringCustomer}
                        checkoutLoading={mutations.checkout === 'loading' || ensuringCustomer}
                      />
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              {/* Right Panel - Customer & Payment */}
              <Col lg={4}>
                {/* Customer Selection */}
                <Card className="mb-3">
                  <Card.Header>
                    <h6 className="mb-0">Customer</h6>
                  </Card.Header>
                  <Card.Body>
                    <CustomerSelectPanel
                      saleType={saleType}
                      selectedCustomer={selectedCustomer}
                      onCustomerChange={handleCustomerChange}
                      customers={customerOptions}
                      loading={customersLoading}
                      errorMessage={customerError}
                      onAddCustomer={() => setShowCreateCustomerModal(true)}
                      disabled={mutations.createSale === 'loading' || ensuringCustomer}
                    />
                  </Card.Body>
                </Card>

                {/* Payment Panel - Shows when checkout clicked */}
                {showPayment && currentCart && (
                  <PaymentPanel
                    cart={currentCart}
                    onComplete={handlePaymentComplete}
                    onCancel={() => setShowPayment(false)}
                    customerId={checkoutCustomerId ?? selectedCustomer}
                  />
                )}

                {/* Quick Stats */}
                <Card>
                  <Card.Header>
                    <h6 className="mb-0">Today's Stats</h6>
                  </Card.Header>
                  <Card.Body>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Transactions:</span>
                      <strong>{statsLoading ? '—' : todayStats.transactions}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Total Sales:</span>
                      <strong>{statsLoading ? '—' : formatCurrency(todayStats.totalSales)}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Avg Transaction:</span>
                      <strong>{statsLoading ? '—' : formatCurrency(todayStats.avgTransaction)}</strong>
                    </div>
                    {statsError && (
                      <div className="mt-2 text-warning small">{statsError}</div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Tab>

        <Tab eventKey="history" title="Sales History">
          <SalesHistory />
        </Tab>

        <Tab eventKey="credit" title="Credit Management">
          <CreditManagement />
        </Tab>
      </Tabs>

      <CreateCustomerModal
        show={showCreateCustomerModal}
        saleType={saleType}
        onHide={() => setShowCreateCustomerModal(false)}
        onCustomerCreated={handleCustomerCreated}
      />
    </Container>
  )
}
