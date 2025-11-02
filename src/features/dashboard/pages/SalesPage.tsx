import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Container, Row, Col, Card, Button, Tab, Tabs, Alert, Modal, Badge } from 'react-bootstrap'
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
import { selectActiveLocation, selectLocation, selectStorefronts } from '../../../store/slices/locationSlice'
import { selectUserStorefronts, selectCurrentBusiness } from '../../../store/slices/authSlice'
import {
  SaleCart,
  ProductSearchPanel,
  CustomerSelectPanel,
  PaymentPanel,
  SalesHistory,
  CreditManagement,
  CreateCustomerModal,
  ReceiptModal,
} from '../components/sales'
import type { UUID } from '../../../types/common'
import type { Customer, Sale } from '../../../types/sales'
import type { CustomerOption } from '../components/sales/CustomerSelectPanel'
import {
  listCustomers,
  getSalesSummary,
  getTodaysSalesStats,
  updateSaleCustomer,
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
  const storefronts = useAppSelector(selectStorefronts)
  const mutations = useAppSelector(selectMutations)
  const errors = useAppSelector(selectErrors)
  const { formatCurrency } = useCurrency()
  const accessibleStorefronts = useAppSelector(selectUserStorefronts)
  const currentBusiness = useAppSelector(selectCurrentBusiness)

  // Enable multi-storefront mode if user has access to more than one storefront
  // This includes business owners AND employees linked to multiple stores
  const isMultiStorefrontEnabled = accessibleStorefronts.length > 1

  // Compute current location details with name and address
  const currentLocationDetails = useMemo(() => {
    if (!currentLocation || currentLocation.type !== 'storefront') return null
    const storefront = storefronts.find((item) => item.id === currentLocation.id)
    return storefront
      ? {
          id: storefront.id,
          name: storefront.name,
          location: storefront.location,
        }
      : null
  }, [currentLocation, storefronts])

  const currentCartRef = useRef<Sale | null>(currentCart)
  currentCartRef.current = currentCart
  
  const [activeTab, setActiveTab] = useState<'new-sale' | 'history' | 'credit'>('new-sale')
  const [saleType, setSaleType] = useState<'RETAIL' | 'WHOLESALE'>('RETAIL')
  const [selectedCustomer, setSelectedCustomer] = useState<UUID | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [completedSaleId, setCompletedSaleId] = useState<UUID | null>(null)
  const [showStorefrontSwitcher, setShowStorefrontSwitcher] = useState(false)
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([])
  const [customersLoading, setCustomersLoading] = useState(false)
  const [customerError, setCustomerError] = useState<string | null>(null)
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false)
  const [checkoutCustomerId, setCheckoutCustomerId] = useState<UUID | null>(null)
  const [todayStats, setTodayStats] = useState(DEFAULT_TODAY_STATS)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)
  const statsCacheRef = useRef<Record<string, typeof DEFAULT_TODAY_STATS>>({})
  const initializingSaleRef = useRef(false)
  const pendingSalePromiseRef = useRef<Promise<Sale | null> | null>(null)
  const prevCartCustomerRef = useRef<string | null>(null)
  const hasUserSelectedCustomer = useRef<boolean>(false)

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
        } catch {
          // Silently ignore localStorage errors
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
      } catch {
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
    } catch {
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
    } catch {
      // Ignore abandonment errors
    } finally {
      dispatch(clearCart())
      currentCartRef.current = null
    }
  }, [currentCartRef, dispatch])

  // Walk-in customer is now guaranteed to exist (backend creates it when business is created)
  // and backend auto-assigns it when no customer is provided
  const getWalkInCustomer = useCallback(() => {
    const walkInOption = customerOptions.find(
      (option) => normalizeCustomerName(option.name) === WALK_IN_NAME_NORMALIZED
    )
    
    if (walkInOption) {
      setSelectedCustomer(walkInOption.id)
      setCheckoutCustomerId(walkInOption.id)
      setCustomerError(null)
      return walkInOption
    }
    
    return null
  }, [customerOptions])

  const startFreshSaleSession = useCallback(async (preferredStorefrontId?: UUID): Promise<Sale | null> => {
    // Use preferred storefront if provided (multi-storefront mode), otherwise use current location
    const targetStorefront = preferredStorefrontId || currentLocation?.id
    
    if (!targetStorefront) {
      setCustomerError('Please select a storefront before starting a sale.')
      return null
    }

    let customerId: UUID | undefined

    // Customer is optional - if none selected, try to use walk-in customer
    // Backend will auto-assign walk-in customer if no customer is provided
    if (selectedCustomer) {
      customerId = selectedCustomer
    } else {
      // Try to use walk-in customer if available
      const walkIn = getWalkInCustomer()
      customerId = walkIn?.id
      
      // If walk-in customer not found in options, backend will auto-assign it
      // So we can proceed without a customer ID
    }

    try {
      const sale = await dispatch(
        createSale({
          storefront: targetStorefront,
          type: saleType,
          customer: customerId,
        })
      ).unwrap()

      currentCartRef.current = sale

      if (sale.customer) {
        dispatch(
          setCurrentCartCustomer({
            customerId: sale.customer,
            customerName: sale.customer_name ?? null,
          })
        )
      }

      setCustomerError(null)
      return sale
    } catch {
      setCustomerError('Unable to start a new sale. Please try again.')
      return null
    }
  }, [currentLocation, dispatch, getWalkInCustomer, saleType, selectedCustomer])

  const prepareFreshSale = useCallback(async (options?: { startNewDraft?: boolean; clearCustomer?: boolean }) => {
    if (initializingSaleRef.current) {
      return
    }

    initializingSaleRef.current = true

    setShowPayment(false)
    // Don't reset saleType - preserve user's preference (RETAIL/WHOLESALE)
    // setSaleType('RETAIL')  // Removed: This was causing toggle to reset
    setCustomerError(null)
    
    // Only reset customer selection if explicitly requested (e.g., after completing a sale)
    // Default is to preserve user's customer selection
    if (options?.clearCustomer === true) {
      setSelectedCustomer(null)
      setCheckoutCustomerId(null)
      hasUserSelectedCustomer.current = false
      prevCartCustomerRef.current = null
    }

    try {
      await clearExistingCart()
      if (options?.startNewDraft) {
        await startFreshSaleSession()
      }
    } finally {
      initializingSaleRef.current = false
    }
  }, [clearExistingCart, startFreshSaleSession])

  const ensureSaleSession = useCallback(async (preferredStorefrontId?: UUID): Promise<UUID | null> => {
    const existingCart = currentCartRef.current

    if (existingCart?.id) {
      return existingCart.id
    }

    if (pendingSalePromiseRef.current) {
      const pendingSale = await pendingSalePromiseRef.current
      return pendingSale?.id ?? null
    }

    const createPromise = startFreshSaleSession(preferredStorefrontId)
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

  // Load customers list (walk-in customer is guaranteed to exist from backend)
  useEffect(() => {
    let isMounted = true

    // Don't run if business isn't loaded yet
    if (!currentBusiness?.id) {
      return
    }

    const loadCustomersAndSetWalkIn = async () => {
      setCustomersLoading(true)
      setCustomerError(null)
      try {
        // Load existing customers (walk-in customer should always be in this list)
        const response = await listCustomers({ page_size: 50 })
        if (!isMounted) return
        
        const mapped: CustomerOption[] = response.results.map((customer) => ({
          id: customer.id,
          name: customer.name,
        }))
        setCustomerOptions(mapped)
        
        // Find and set walk-in customer as default
        const walkInOption = mapped.find(
          (option) => normalizeCustomerName(option.name) === WALK_IN_NAME_NORMALIZED
        )
        
        if (walkInOption) {
          setSelectedCustomer((prev) => {
            if (prev) return prev // Don't override user selection
            return walkInOption.id
          })
          setCheckoutCustomerId((prev) => {
            if (prev) return prev
            return walkInOption.id
          })
        }
      } catch {
        if (isMounted) {
          setCustomerError('Unable to load customers. You can still create a new one.')
        }
      } finally {
        if (isMounted) {
          setCustomersLoading(false)
        }
      }
    }

    void loadCustomersAndSetWalkIn()

    return () => {
      isMounted = false
    }
  }, [currentBusiness?.id]) // Run when business is loaded

  // Sync selected customer TO cart when cart is created (user selected customer before adding products)
  useEffect(() => {
    if (currentCart?.id && selectedCustomer && currentCart.customer !== selectedCustomer) {
      // Update backend with the customer user selected before cart existed
      void (async () => {
        try {
          const updatedSale = await updateSaleCustomer(currentCart.id, selectedCustomer)
          
          dispatch(
            setCurrentCartCustomer({
              customerId: updatedSale.customer,
              customerName: updatedSale.customer_name,
            })
          )
        } catch {
          setCustomerError('Failed to assign customer to sale. Please reselect from dropdown.')
        }
      })()
    }
  }, [currentCart?.id, selectedCustomer, currentCart?.customer, currentCart?.customer_name, dispatch])

  // Sync cart customer TO dropdown ONLY when cart is first loaded or user hasn't made a selection
  // This prevents overwriting user's active selection
  
  useEffect(() => {
    const cartCustomer = currentCart?.customer || null
    const cartCustomerName = currentCart?.customer_name || null
    
    // Only sync from cart to dropdown if:
    // 1. Cart customer actually CHANGED from backend (not just re-render)
    // 2. User hasn't manually selected a different customer
    if (cartCustomer && cartCustomerName && cartCustomer !== prevCartCustomerRef.current) {
      prevCartCustomerRef.current = cartCustomer
      upsertCustomerOption({ id: cartCustomer, name: cartCustomerName })
      
      // ONLY update dropdown if user hasn't made their own selection
      if (!hasUserSelectedCustomer.current) {
        setSelectedCustomer(cartCustomer)
        setCheckoutCustomerId(cartCustomer)
      }
    }
  }, [currentCart?.customer, currentCart?.customer_name, selectedCustomer, upsertCustomerOption])

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
      
      // Reset user selection flag when clearing cart
      hasUserSelectedCustomer.current = false
      prevCartCustomerRef.current = null
    } catch {
      // Ignore abandonment errors
    }
  }, [currentCartRef, dispatch])

  const handleCustomerChange = async (customerId: UUID | null) => {
    // Mark that user has manually selected a customer
    hasUserSelectedCustomer.current = true
    
    setSelectedCustomer(customerId)
    setCheckoutCustomerId(customerId)
    
    if (customerId) {
      const option = customerOptions.find((customer) => customer.id === customerId)
      const customerName = option?.name ?? null
      
      // Backend endpoint implemented (e60b313) - customer updates now persist to database
      if (currentCart?.id) {
        try {
          const updatedSale = await updateSaleCustomer(currentCart.id, customerId)
          
          // Update Redux store with backend response to ensure consistency
          dispatch(
            setCurrentCartCustomer({
              customerId: updatedSale.customer,
              customerName: updatedSale.customer_name,
            })
          )
          
          setCustomerError(null)
        } catch {
          setCustomerError('Failed to update customer. Please try again.')
          // Revert selection on error
          setSelectedCustomer(currentCart.customer)
          setCheckoutCustomerId(currentCart.customer)
        }
      } else {
        // No cart yet, just update local state
        dispatch(
          setCurrentCartCustomer({
            customerId,
            customerName,
          })
        )
        setCustomerError(null)
      }
    } else {
      dispatch(setCurrentCartCustomer({ customerId: null, customerName: null }))
    }
  }

  const handleCustomerCreated = async (customer: Customer) => {
    // Mark that user has manually selected/created a customer
    hasUserSelectedCustomer.current = true
    
    upsertCustomerOption({ id: customer.id, name: customer.name })
    setSelectedCustomer(customer.id)
    setCheckoutCustomerId(customer.id)
    
    // Backend endpoint implemented (e60b313) - newly created customers now persist to sale
    if (currentCart?.id) {
      try {
        const updatedSale = await updateSaleCustomer(currentCart.id, customer.id)
        
        // Update Redux store with backend response to ensure consistency
        dispatch(
          setCurrentCartCustomer({
            customerId: updatedSale.customer,
            customerName: updatedSale.customer_name,
          })
        )
        setCustomerError(null)
      } catch {
        setCustomerError('Customer created but failed to assign to sale. Please select from dropdown.')
        // Revert selection on error
        setSelectedCustomer(currentCart.customer)
        setCheckoutCustomerId(currentCart.customer)
      }
    } else {
      // No cart yet, just update local state
      dispatch(setCurrentCartCustomer({ customerId: customer.id, customerName: customer.name }))
      setCustomerError(null)
    }
  }

  const handleCheckout = useCallback(() => {
    // Backend auto-assigns walk-in customer if none is selected
    // Wholesale sales should have a customer selected
    if (saleType === 'WHOLESALE' && !selectedCustomer) {
      setCustomerError('Please select a customer before completing a wholesale sale.')
      return
    }

    if (selectedCustomer) {
      setCheckoutCustomerId(selectedCustomer)
    }
    
    setCustomerError(null)
    setShowPayment(true)
  }, [saleType, selectedCustomer])

  const handlePaymentComplete = (completedSale: Sale) => {
    currentCartRef.current = completedSale
    setShowPayment(false)

    // Show receipt modal
    setCompletedSaleId(completedSale.id)
    setShowReceipt(true)

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

    void prepareFreshSale({ clearCustomer: true })
  }

  const handleSwitchStorefront = (storefrontId: string) => {
    if (currentCart && currentCart.line_items.length > 0) {
      // Prevent switching with items in cart
      return
    }
    
    dispatch(selectLocation({ type: 'storefront', id: storefrontId }))
    setShowStorefrontSwitcher(false)
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
            <>
              {/* Storefront Header Badge */}
              {currentLocationDetails && (
                <div className="mb-3 d-flex align-items-center justify-content-between bg-light border rounded-3 p-3">
                  <div className="d-flex align-items-center gap-3">
                    <div 
                      className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" 
                      style={{ width: 48, height: 48, fontSize: '1.5rem' }}
                    >
                      <i className="bi bi-shop"></i>
                    </div>
                    <div>
                      <div className="small text-muted text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                        Current Storefront
                      </div>
                      <div className="fw-bold fs-5">{currentLocationDetails.name}</div>
                      {currentLocationDetails.location && (
                        <div className="small text-muted">{currentLocationDetails.location}</div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    {isMultiStorefrontEnabled && (!currentCart || currentCart.line_items.length === 0) && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="rounded-pill px-3"
                        onClick={() => setShowStorefrontSwitcher(true)}
                      >
                        <i className="bi bi-arrow-left-right me-2"></i>
                        Switch Store
                      </Button>
                    )}
                    
                    {currentCart && currentCart.line_items.length > 0 && (
                      <div className="small text-muted d-flex align-items-center">
                        <i className="bi bi-lock me-2"></i>
                        Clear cart to switch stores
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                        variant={saleType === 'WHOLESALE' ? 'warning' : 'outline-secondary'}
                        size="sm"
                        onClick={() => {
                          setSaleType(saleType === 'RETAIL' ? 'WHOLESALE' : 'RETAIL')
                        }}
                        disabled={!!currentCart}
                        title={currentCart ? 'Clear cart to change sale type' : 'Toggle between retail and wholesale pricing'}
                        className={saleType === 'WHOLESALE' ? 'fw-bold' : ''}
                      >
                        {saleType === 'WHOLESALE' ? '⚠️ WHOLESALE' : 'RETAIL'}
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

                    {/* Wholesale Mode Warning */}
                    {saleType === 'WHOLESALE' && (
                      <Alert variant="warning" className="mb-3 border-warning border-2">
                        <div className="d-flex align-items-center">
                          <i className="bi bi-exclamation-triangle-fill fs-4 me-3"></i>
                          <div>
                            <Alert.Heading className="h5 mb-1">
                              <strong>⚠️ WHOLESALE MODE ACTIVE</strong>
                            </Alert.Heading>
                            <p className="mb-0">
                              You are selling at <strong>WHOLESALE PRICES</strong>. 
                              All products will be charged at discounted wholesale rates.
                              {!currentCart && (
                                <span className="d-block mt-1 small">
                                  Click the WHOLESALE button above to switch back to retail pricing.
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </Alert>
                    )}

                    {/* Product Search */}
                    <ProductSearchPanel
                      storefrontId={currentLocation?.id || ''}
                      saleId={currentCart?.id}
                      saleType={saleType}
                      ensureSaleSession={ensureSaleSession}
                      disabled={mutations.createSale === 'loading'}
                      multiStorefront={isMultiStorefrontEnabled}
                    />
                    {/* Shopping Cart */}
                    <div className="mt-4">
                      <SaleCart
                        cart={currentCart}
                        onCheckout={handleCheckout}
                        disabled={mutations.checkout === 'loading'}
                        checkoutLoading={mutations.checkout === 'loading'}
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
                      disabled={mutations.createSale === 'loading'}
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
            </>
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

      <ReceiptModal
        show={showReceipt}
        saleId={completedSaleId}
        onHide={() => {
          setShowReceipt(false)
          setCompletedSaleId(null)
        }}
      />

      <Modal
        show={showStorefrontSwitcher}
        onHide={() => setShowStorefrontSwitcher(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Switch Storefront</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentCart && currentCart.line_items.length > 0 ? (
            <Alert variant="warning">
              <i className="bi bi-exclamation-triangle me-2"></i>
              Please complete or clear your current sale before switching storefronts.
            </Alert>
          ) : (
            <div className="d-flex flex-column gap-3">
              <p className="text-muted small mb-0">
                Select the storefront you want to sell from. Products will update to show inventory from the selected location.
              </p>
              {accessibleStorefronts.map((storefront) => {
                const isActive = currentLocation?.id === storefront.id
                return (
                  <div
                    key={storefront.id}
                    className={`border rounded-3 p-3 ${isActive ? 'border-primary bg-primary bg-opacity-10' : 'border-secondary'}`}
                    style={{ cursor: isActive ? 'default' : 'pointer' }}
                    onClick={() => !isActive && handleSwitchStorefront(storefront.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (!isActive && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        handleSwitchStorefront(storefront.id)
                      }
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <div className="fw-semibold">{storefront.name}</div>
                        {storefront.location && (
                          <div className="small text-muted">{storefront.location}</div>
                        )}
                      </div>
                      {isActive && (
                        <Badge bg="primary">Active</Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStorefrontSwitcher(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}
