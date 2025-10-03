import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Nav from 'react-bootstrap/Nav'
import Spinner from 'react-bootstrap/Spinner'
import Table from 'react-bootstrap/Table'
import { useAppDispatch, useAppSelector } from '../../../hooks/index.js'
import StockIntakeModal from '../components/StockIntakeModal'
import StockProductDetailModal from '../components/StockProductDetailModal'
import StockRequestForm from '../components/stock-requests/StockRequestForm'
import StockRequestList from '../components/stock-requests/StockRequestList'
import StockRequestDetailModal from '../components/stock-requests/StockRequestDetailModal'
import { fetchProducts, fetchStorefronts } from '../../../services/inventoryService.js'
import {
  addStockBatch,
  addStockProduct,
  addSupplier,
  editStockProduct,
  loadStockBatches,
  loadStockProducts,
  loadSuppliers,
  resetCreateStockBatchState,
  resetCreateStockProductState,
  resetCreateSupplierState,
  resetDeleteStockProductState,
  resetEditStockProductState,
  resetStockProductsFilters,
  selectCreateStockBatchError,
  selectCreateStockBatchStatus,
  selectCreateStockProductError,
  selectCreateStockProductStatus,
  selectCreateSupplierError,
  selectCreateSupplierStatus,
  selectDeleteStockProductError,
  selectDeleteStockProductStatus,
  selectStockBatches,
  selectStockBatchesStatus,
  selectStockProducts,
  selectStockProductsError,
  selectStockProductsFilters,
  selectStockProductsPage,
  selectStockProductsPageSize,
  selectStockProductsPagination,
  selectStockProductsStatus,
  selectSuppliers,
  selectSuppliersStatus,
  selectEditStockProductError,
  selectEditStockProductStatus,
  removeStockProduct,
  setStockProductsFilters,
  setStockProductsPage,
  setStockProductsPageSize,
} from '../../../store/slices/inventorySlice.js'
import { selectWarehouses } from '../../../store/slices/locationSlice.js'
import {
  cancelTransferRequest,
  clearTransferRequestDetail,
  clearTransferRequestMutation,
  createTransferRequest,
  fulfillTransferRequest,
  loadTransferRequestDetail,
  loadTransferRequests,
  selectTransferRequestDetail,
  selectTransferRequestFilters,
  selectTransferRequestMutationErrors,
  selectTransferRequestMutationStatus,
  selectTransferRequests,
  selectTransferRequestsError,
  selectTransferRequestsPagination,
  selectTransferRequestsPage,
  selectTransferRequestsPageSize,
  selectTransferRequestsStatus,
  setTransferRequestFilters,
  setTransferRequestPage,
  setTransferRequestPageSize,
  updateTransferRequestStatus,
} from '../../../store/slices/transferRequestSlice.js'
import type { Product, StockProduct, StockProductPayload, Storefront, SupplierPayload, TransferRequest, TransferRequestCreatePayload } from '../../../types/inventory.js'

const formatDecimal = (value?: string | null) => {
  if (!value) return '—'
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return value
  return parsed.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const buildQueryParams = (options: {
  page: number
  pageSize: number
  stock?: string | null
  supplier?: string | null
  hasQuantity?: boolean | null
  search?: string
  ordering?: string | null
}) => {
  const params: Record<string, unknown> = {
    page: options.page,
    page_size: options.pageSize,
  }
  if (options.stock) params.stock = options.stock
  if (options.supplier) params.supplier = options.supplier
  if (typeof options.hasQuantity === 'boolean') params.has_quantity = options.hasQuantity
  if (options.search && options.search.trim().length > 0) {
    params.search = options.search.trim()
  }
  if (options.ordering) params.ordering = options.ordering
  return params
}

const ManageStocksPage = () => {
  const dispatch = useAppDispatch()
  const stockProducts = useAppSelector(selectStockProducts)
  const stockProductsStatus = useAppSelector(selectStockProductsStatus)
  const stockProductsError = useAppSelector(selectStockProductsError)
  const stockProductsPagination = useAppSelector(selectStockProductsPagination)
  const stockProductsPage = useAppSelector(selectStockProductsPage)
  const stockProductsPageSize = useAppSelector(selectStockProductsPageSize)
  const stockProductsFilters = useAppSelector(selectStockProductsFilters)
  const stockBatches = useAppSelector(selectStockBatches)
  const stockBatchesStatus = useAppSelector(selectStockBatchesStatus)
  const suppliers = useAppSelector(selectSuppliers)
  const suppliersStatus = useAppSelector(selectSuppliersStatus)
  const warehouses = useAppSelector(selectWarehouses)
  const createStockBatchStatus = useAppSelector(selectCreateStockBatchStatus)
  const createStockBatchError = useAppSelector(selectCreateStockBatchError)
  const createStockProductStatus = useAppSelector(selectCreateStockProductStatus)
  const createStockProductError = useAppSelector(selectCreateStockProductError)
  const createSupplierStatus = useAppSelector(selectCreateSupplierStatus)
  const createSupplierError = useAppSelector(selectCreateSupplierError)
  const editStockProductStatus = useAppSelector(selectEditStockProductStatus)
  const editStockProductError = useAppSelector(selectEditStockProductError)
  const deleteStockProductStatus = useAppSelector(selectDeleteStockProductStatus)
  const deleteStockProductError = useAppSelector(selectDeleteStockProductError)

  // Stock Request selectors
  const transferRequests = useAppSelector(selectTransferRequests)
  const transferRequestsStatus = useAppSelector(selectTransferRequestsStatus)
  const transferRequestsError = useAppSelector(selectTransferRequestsError)
  const transferRequestsPagination = useAppSelector(selectTransferRequestsPagination)
  const transferRequestsPage = useAppSelector(selectTransferRequestsPage)
  const transferRequestsPageSize = useAppSelector(selectTransferRequestsPageSize)
  const transferRequestFilters = useAppSelector(selectTransferRequestFilters)
  const transferRequestMutationStatus = useAppSelector(selectTransferRequestMutationStatus)
  const transferRequestMutationErrors = useAppSelector(selectTransferRequestMutationErrors)
  const transferRequestDetail = useAppSelector(selectTransferRequestDetail)

  // Local state
  const [activeTab, setActiveTab] = useState('stock-products')
  const [searchTerm, setSearchTerm] = useState(stockProductsFilters.search)
  const [selectedBatch, setSelectedBatch] = useState<string | null>(stockProductsFilters.stock)
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(stockProductsFilters.supplier)
  const [onlyInStock, setOnlyInStock] = useState<boolean>(stockProductsFilters.has_quantity === true)
  const [ordering, setOrdering] = useState<string | null>(stockProductsFilters.ordering)
  const [showIntakeModal, setShowIntakeModal] = useState(false)
  const [showStockProductModal, setShowStockProductModal] = useState(false)
  const [selectedStockProduct, setSelectedStockProduct] = useState<StockProduct | null>(null)
  const [productLookup, setProductLookup] = useState<Product[]>([])
  const [isLoadingProductLookup, setIsLoadingProductLookup] = useState(false)
  const [productLookupError, setProductLookupError] = useState<string | null>(null)
  const [storefronts, setStorefronts] = useState<Storefront[]>([])
  const [showCreateRequestForm, setShowCreateRequestForm] = useState(false)
  const [showRequestDetailModal, setShowRequestDetailModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<TransferRequest | null>(null)

  useEffect(() => {
    if (stockProductsStatus === 'idle') {
      const params = buildQueryParams({
        page: stockProductsPage,
        pageSize: stockProductsPageSize,
        stock: stockProductsFilters.stock,
        supplier: stockProductsFilters.supplier,
        hasQuantity: stockProductsFilters.has_quantity,
        search: stockProductsFilters.search,
        ordering: stockProductsFilters.ordering,
      })
      void dispatch(loadStockProducts(params))
    }
  }, [dispatch, stockProductsFilters.has_quantity, stockProductsFilters.ordering, stockProductsFilters.search, stockProductsFilters.stock, stockProductsFilters.supplier, stockProductsPage, stockProductsPageSize, stockProductsStatus])

  useEffect(() => {
    if (stockBatchesStatus === 'idle') {
      void dispatch(loadStockBatches({ page_size: 100 }))
    }
  }, [dispatch, stockBatchesStatus])

  useEffect(() => {
    if (suppliersStatus === 'idle') {
      void dispatch(loadSuppliers({ page_size: 100 }))
    }
  }, [dispatch, suppliersStatus])

  useEffect(() => {
    let ignore = false

    const loadProductsLookup = async () => {
      setIsLoadingProductLookup(true)
      setProductLookupError(null)
      try {
        const response = await fetchProducts({ page: 1, page_size: 100 })
        const results = Array.isArray(response)
          ? response
          : Array.isArray(response.results)
            ? response.results
            : []
        if (!ignore) {
          setProductLookup(results)
        }
      } catch (error) {
        if (!ignore) {
          const message = error instanceof Error ? error.message : 'Unable to load products.'
          setProductLookupError(message)
        }
      } finally {
        if (!ignore) {
          setIsLoadingProductLookup(false)
        }
      }
    }

    void loadProductsLookup()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    setSearchTerm(stockProductsFilters.search)
    setSelectedBatch(stockProductsFilters.stock)
    setSelectedSupplier(stockProductsFilters.supplier)
    setOnlyInStock(stockProductsFilters.has_quantity === true)
    setOrdering(stockProductsFilters.ordering)
  }, [stockProductsFilters])

  useEffect(() => {
    if (!selectedStockProduct) {
      return
    }

    const refreshed = stockProducts.find((item) => item.id === selectedStockProduct.id)
    if (refreshed && refreshed !== selectedStockProduct) {
      setSelectedStockProduct(refreshed)
    }
  }, [selectedStockProduct, stockProducts])

  // Load storefronts for stock requests
  useEffect(() => {
    let ignore = false

    const loadStorefrontsData = async () => {
      try {
        const response = await fetchStorefronts({ page: 1 })
        if (!ignore && response.results) {
          setStorefronts(response.results)
        }
      } catch (error) {
        console.error('Failed to load storefronts:', error)
      }
    }

    void loadStorefrontsData()

    return () => {
      ignore = true
    }
  }, [])

  // Load stock requests when on that tab
  useEffect(() => {
    if (activeTab === 'stock-requests' && transferRequestsStatus === 'idle') {
      void dispatch(loadTransferRequests())
    }
  }, [activeTab, dispatch, transferRequestsStatus])

  const isLoading = stockProductsStatus === 'loading'
  const totalItems = stockProductsPagination.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalItems / stockProductsPageSize))
  const showingFrom = totalItems === 0 ? 0 : (stockProductsPage - 1) * stockProductsPageSize + 1
  const showingTo = totalItems === 0 ? 0 : Math.min(stockProductsPage * stockProductsPageSize, totalItems)

  const handleRefresh = () => {
    const params = buildQueryParams({
      page: stockProductsPage,
      pageSize: stockProductsPageSize,
      stock: stockProductsFilters.stock,
      supplier: stockProductsFilters.supplier,
      hasQuantity: stockProductsFilters.has_quantity,
      search: stockProductsFilters.search,
      ordering: stockProductsFilters.ordering,
    })
    void dispatch(loadStockProducts(params))
  }

  const handleApplyFilters = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    const nextFilters = {
      stock: selectedBatch,
      supplier: selectedSupplier,
      has_quantity: onlyInStock ? true : null,
      search: searchTerm.trim(),
      ordering: ordering,
    }
    dispatch(setStockProductsFilters(nextFilters))
    dispatch(setStockProductsPage(1))
    const params = buildQueryParams({
      page: 1,
      pageSize: stockProductsPageSize,
      stock: nextFilters.stock,
      supplier: nextFilters.supplier,
      hasQuantity: nextFilters.has_quantity,
      search: nextFilters.search,
      ordering: nextFilters.ordering,
    })
    void dispatch(loadStockProducts(params))
  }

  const handleResetFilters = () => {
    setSearchTerm('')
    setSelectedBatch(null)
    setSelectedSupplier(null)
    setOnlyInStock(false)
    setOrdering(null)
    dispatch(resetStockProductsFilters())
    dispatch(setStockProductsPage(1))
    const params = buildQueryParams({
      page: 1,
      pageSize: stockProductsPageSize,
    })
    void dispatch(loadStockProducts(params))
  }

  const handlePreviousPage = () => {
    if (stockProductsPage <= 1 || isLoading) return
    const previousPage = stockProductsPage - 1
    dispatch(setStockProductsPage(previousPage))
    const params = buildQueryParams({
      page: previousPage,
      pageSize: stockProductsPageSize,
      stock: stockProductsFilters.stock,
      supplier: stockProductsFilters.supplier,
      hasQuantity: stockProductsFilters.has_quantity,
      search: stockProductsFilters.search,
      ordering: stockProductsFilters.ordering,
    })
    void dispatch(loadStockProducts(params))
  }

  const handleNextPage = () => {
    if (stockProductsPage >= totalPages || isLoading || totalItems === 0) return
    const nextPage = stockProductsPage + 1
    dispatch(setStockProductsPage(nextPage))
    const params = buildQueryParams({
      page: nextPage,
      pageSize: stockProductsPageSize,
      stock: stockProductsFilters.stock,
      supplier: stockProductsFilters.supplier,
      hasQuantity: stockProductsFilters.has_quantity,
      search: stockProductsFilters.search,
      ordering: stockProductsFilters.ordering,
    })
    void dispatch(loadStockProducts(params))
  }

  const handlePageSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextSize = Number(event.target.value)
    if (Number.isNaN(nextSize) || nextSize <= 0 || nextSize === stockProductsPageSize) return
    dispatch(setStockProductsPageSize(nextSize))
    dispatch(setStockProductsPage(1))
    const params = buildQueryParams({
      page: 1,
      pageSize: nextSize,
      stock: stockProductsFilters.stock,
      supplier: stockProductsFilters.supplier,
      hasQuantity: stockProductsFilters.has_quantity,
      search: stockProductsFilters.search,
      ordering: stockProductsFilters.ordering,
    })
    void dispatch(loadStockProducts(params))
  }

  const isCreatingBatch = createStockBatchStatus === 'loading'
  const isCreatingStockProduct = createStockProductStatus === 'loading'
  const isCreatingSupplier = createSupplierStatus === 'loading'
  const isUpdatingStockProduct = editStockProductStatus === 'loading'
  const isDeletingStockProduct = deleteStockProductStatus === 'loading'

  const handleOpenIntakeModal = () => {
    setShowIntakeModal(true)
  }

  const handleCloseIntakeModal = () => {
    setShowIntakeModal(false)
  }

  const handleOpenStockProductModal = (stockProduct: StockProduct) => {
    setSelectedStockProduct(stockProduct)
    setShowStockProductModal(true)
    dispatch(resetEditStockProductState())
    dispatch(resetDeleteStockProductState())
  }

  const handleCloseStockProductModal = () => {
    setShowStockProductModal(false)
    setSelectedStockProduct(null)
    dispatch(resetEditStockProductState())
    dispatch(resetDeleteStockProductState())
  }

  const handleUpdateStockProduct = (id: string, payload: Partial<StockProductPayload>) => {
    return dispatch(editStockProduct({ id, payload })).unwrap()
  }

  const handleDeleteStockProduct = (id: string) => {
    return dispatch(removeStockProduct({ id })).unwrap()
  }

  const handleSubmitStockProductUpdate = async (id: string, payload: Partial<StockProductPayload>) => {
    await handleUpdateStockProduct(id, payload)
    handleRefresh()
    handleCloseStockProductModal()
  }

  const handleConfirmDeleteStockProduct = async (id: string) => {
    await handleDeleteStockProduct(id)
    handleRefresh()
    handleCloseStockProductModal()
  }

  const handleCreateBatch = (payload: { warehouse: string; arrival_date?: string | null; description?: string | null }) => {
    return dispatch(addStockBatch(payload)).unwrap()
  }

  const handleCreateStockItem = (payload: StockProductPayload) => {
    return dispatch(addStockProduct(payload)).unwrap()
  }

  const handleResetBatchState = () => {
    dispatch(resetCreateStockBatchState())
  }

  const handleResetStockProductState = () => {
    dispatch(resetCreateStockProductState())
  }

  const handleCreateSupplier = (payload: SupplierPayload) => {
    return dispatch(addSupplier(payload)).unwrap()
  }

  const handleResetSupplierState = () => {
    dispatch(resetCreateSupplierState())
  }

  const handleIntakeComplete = (stockId: string) => {
    if (!stockId) return
    handleRefresh()
  }

  const isLoadingFilters = stockBatchesStatus === 'loading' || suppliersStatus === 'loading'

  const activeFiltersCount = [selectedBatch, selectedSupplier, onlyInStock ? 'inStock' : null, ordering, searchTerm.trim() ? 'search' : null]
    .filter(Boolean).length

  // Stock request handlers
  const handleCreateStockRequest = async (payload: TransferRequestCreatePayload) => {
    await dispatch(createTransferRequest(payload)).unwrap()
    setShowCreateRequestForm(false)
    void dispatch(loadTransferRequests())
    dispatch(clearTransferRequestMutation('create'))
  }

  const handleStockRequestFilterChange = (filters: Partial<typeof transferRequestFilters>) => {
    dispatch(setTransferRequestFilters(filters))
    dispatch(setTransferRequestPage(1))
    void dispatch(loadTransferRequests())
  }

  const handleStockRequestPageChange = (page: number) => {
    dispatch(setTransferRequestPage(page))
    void dispatch(loadTransferRequests())
  }

  const handleStockRequestPageSizeChange = (pageSize: number) => {
    dispatch(setTransferRequestPageSize(pageSize))
    dispatch(setTransferRequestPage(1))
    void dispatch(loadTransferRequests())
  }

  const handleStockRequestRefresh = () => {
    void dispatch(loadTransferRequests())
  }

  const handleViewStockRequest = (request: TransferRequest) => {
    setSelectedRequest(request)
    setShowRequestDetailModal(true)
    void dispatch(loadTransferRequestDetail(request.id))
  }

  const handleCancelStockRequest = async (requestId: string, reason?: string) => {
    await dispatch(cancelTransferRequest({ requestId, payload: reason ? { reason } : undefined })).unwrap()
    void dispatch(loadTransferRequests())
    setShowRequestDetailModal(false)
    dispatch(clearTransferRequestMutation('cancel'))
  }

  const handleFulfillStockRequest = async (requestId: string) => {
    await dispatch(fulfillTransferRequest({ requestId })).unwrap()
    void dispatch(loadTransferRequests())
    setShowRequestDetailModal(false)
    dispatch(clearTransferRequestMutation('fulfill'))
  }

  const handleUpdateStockRequestStatus = async (requestId: string, status: string, force?: boolean) => {
    await dispatch(updateTransferRequestStatus({ 
      requestId, 
      payload: { status: status as 'NEW' | 'ASSIGNED' | 'FULFILLED' | 'CANCELLED', force } 
    })).unwrap()
    void dispatch(loadTransferRequests())
    // Don't close modal, allow user to see the updated status
    dispatch(clearTransferRequestMutation('updateStatus'))
  }

  const transferRequestTotalPages = Math.max(
    1,
    Math.ceil((transferRequestsPagination?.count || 0) / transferRequestsPageSize)
  )

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Manage stocks</h2>
            <p className="text-slate-600">
              Manage stock products and stock requests for your warehouses and storefronts.
            </p>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <Nav variant="tabs" className="mb-4">
        <Nav.Item>
          <Nav.Link active={activeTab === 'stock-products'} onClick={() => setActiveTab('stock-products')}>
            Stock products
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link active={activeTab === 'stock-requests'} onClick={() => setActiveTab('stock-requests')}>
            Stock requests
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {/* Stock Products Tab */}
      {activeTab === 'stock-products' && (
            <div className="space-y-6">
              <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Stock products</h3>
                    <p className="text-slate-600">
                      Review landed costs, supplier details, and batch history in one place.
                    </p>
                  </div>
                  <Button variant="primary" className="rounded-pill px-4" onClick={handleOpenIntakeModal}>
                    Record stock intake
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                  <div>
                    Total stock items: <span className="font-semibold text-slate-900">{totalItems.toLocaleString()}</span>
                  </div>
                  <div>
                    Page {Math.min(stockProductsPage, totalPages)} of {totalPages}
                  </div>
                  {activeFiltersCount > 0 ? (
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} applied
                    </div>
                  ) : null}
                </div>
              </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
            <p className="text-sm text-slate-600">Refine the stock list by batch, supplier, and activity.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline-secondary" onClick={handleRefresh} disabled={isLoading}>
              Refresh data
            </Button>
            <Button variant="outline-secondary" onClick={handleResetFilters} disabled={isLoading || activeFiltersCount === 0}>
              Reset filters
            </Button>
          </div>
        </div>

        {isLoadingFilters ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Spinner animation="border" size="sm" role="status" aria-hidden />
            Loading filter options…
          </div>
        ) : null}

        {isLoadingProductLookup ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Spinner animation="border" size="sm" role="status" aria-hidden />
            Loading products for intake…
          </div>
        ) : null}

        {productLookupError ? <Alert variant="warning">{productLookupError}</Alert> : null}

        <Form onSubmit={handleApplyFilters} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Form.Group controlId="stockSearch">
            <Form.Label>Search products or SKU</Form.Label>
            <Form.Control
              type="search"
              placeholder="e.g. Wireless Mouse"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              disabled={isLoading}
            />
          </Form.Group>

          <Form.Group controlId="stockBatch">
            <Form.Label>Batch</Form.Label>
            <Form.Select
              value={selectedBatch ?? ''}
              onChange={(event) => setSelectedBatch(event.target.value || null)}
              disabled={isLoading || stockBatches.length === 0}
            >
              <option value="">All batches</option>
              {stockBatches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.description?.length ? batch.description : `Batch ${batch.id.slice(0, 8)}`}
                  {batch.arrival_date ? ` • ${formatDate(batch.arrival_date)}` : ''}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group controlId="stockSupplier">
            <Form.Label>Supplier</Form.Label>
            <Form.Select
              value={selectedSupplier ?? ''}
              onChange={(event) => setSelectedSupplier(event.target.value || null)}
              disabled={isLoading || suppliers.length === 0}
            >
              <option value="">All suppliers</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group controlId="stockOrdering">
            <Form.Label>Ordering</Form.Label>
            <Form.Select
              value={ordering ?? ''}
              onChange={(event) => setOrdering(event.target.value || null)}
              disabled={isLoading}
            >
              <option value="">Newest first (default)</option>
              <option value="-quantity">Quantity: High → Low</option>
              <option value="quantity">Quantity: Low → High</option>
              <option value="-unit_cost">Unit cost: High → Low</option>
              <option value="unit_cost">Unit cost: Low → High</option>
              <option value="-updated_at">Recently updated</option>
              <option value="expiry_date">Expiry date</option>
            </Form.Select>
          </Form.Group>

          <Form.Group controlId="stockHasQuantity" className="md:col-span-2 xl:col-span-3">
            <Form.Check
              type="switch"
              label="Only show items with available quantity"
              checked={onlyInStock}
              onChange={(event) => setOnlyInStock(event.target.checked)}
              disabled={isLoading}
            />
          </Form.Group>

          <div className="md:col-span-2 xl:col-span-3 flex justify-end gap-3">
            <Button type="submit" disabled={isLoading}>
              Apply filters
            </Button>
          </div>
        </Form>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Stock items</h3>
            <p className="text-sm text-slate-600">
              Track landed costs and supplier relationships across received stock.
            </p>
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Spinner animation="border" size="sm" role="status" aria-hidden />
              Loading stock products…
            </div>
          ) : null}
        </div>

        {stockProductsError ? <Alert variant="danger">{stockProductsError}</Alert> : null}

        <div className="max-w-full overflow-x-auto">
          <Table responsive hover size="sm" className="align-middle">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th className="text-end">Quantity</th>
                <th className="text-end">Unit cost</th>
                <th className="text-end">Retail price</th>
                <th className="text-end">Wholesale price</th>
                <th className="text-end">Landed unit</th>
                <th className="text-end">Total landed</th>
                <th className="text-end">Projected retail profit</th>
                <th className="text-end">Projected wholesale profit</th>
                <th>Expiry</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stockProducts.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-4 text-center text-sm text-slate-500">
                    {isLoading
                      ? 'Loading stock products…'
                      : 'No stock products match your filters yet. Adjust filters or ingest new stock.'}
                  </td>
                </tr>
              ) : (
                stockProducts.map((item) => {
                  return (
                    <tr key={item.id}>
                      <td className="font-medium text-slate-900">{item.product_name ?? '—'}</td>
                      <td>{item.product_sku ?? '—'}</td>
                      <td className="text-end">{item.quantity.toLocaleString()}</td>
                      <td className="text-end">{formatDecimal(item.unit_cost)}</td>
                      <td className="text-end">{formatDecimal(item.retail_price)}</td>
                      <td className="text-end">{formatDecimal(item.wholesale_price)}</td>
                      <td className="text-end">{formatDecimal(item.landed_unit_cost)}</td>
                      <td className="text-end">{formatDecimal(item.total_landed_cost)}</td>
                      <td className="text-end">{formatDecimal(item.projected_retail_profit)}</td>
                      <td className="text-end">{formatDecimal(item.projected_wholesale_profit)}</td>
                      <td>{formatDate(item.expiry_date)}</td>
                      <td className="text-end">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleOpenStockProductModal(item)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <div>
            Showing {showingFrom.toLocaleString()}–{showingTo.toLocaleString()} of {totalItems.toLocaleString()} items
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Form.Select
              size="sm"
              className="w-auto"
              value={stockProductsPageSize.toString()}
              onChange={handlePageSizeChange}
              disabled={isLoading}
              aria-label="Select stock items per page"
            >
              {[10, 25, 50, 100].map((option) => (
                <option key={option} value={option}>
                  {option} per page
                </option>
              ))}
            </Form.Select>
            <div className="inline-flex items-center gap-2">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handlePreviousPage}
                disabled={isLoading || stockProductsPage <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-600">
                Page {Math.min(stockProductsPage, totalPages)} of {totalPages}
              </span>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleNextPage}
                disabled={isLoading || stockProductsPage >= totalPages || totalItems === 0}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </section>
        </div>
      )}

      {/* Stock Requests Tab */}
      {activeTab === 'stock-requests' && (
            <div className="space-y-6">
              <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Stock requests</h3>
                    <p className="text-slate-600">
                      Create and manage stock requests from storefronts to warehouses.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    className="rounded-pill px-4"
                    onClick={() => setShowCreateRequestForm(!showCreateRequestForm)}
                  >
                    {showCreateRequestForm ? 'Cancel' : 'Create stock request'}
                  </Button>
                </div>
              </section>

              {showCreateRequestForm && (
                <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-slate-900">New stock request</h4>
                  <StockRequestForm
                    storefronts={storefronts}
                    products={productLookup}
                    isSubmitting={transferRequestMutationStatus.create === 'loading'}
                    error={transferRequestMutationErrors.create}
                    onSubmit={handleCreateStockRequest}
                    onCancel={() => setShowCreateRequestForm(false)}
                  />
                </section>
              )}

              <StockRequestList
                requests={transferRequests}
                storefronts={storefronts}
                isLoading={transferRequestsStatus === 'loading'}
                error={transferRequestsError}
                pagination={{
                  count: transferRequestsPagination?.count || 0,
                  page: transferRequestsPage,
                  pageSize: transferRequestsPageSize,
                  totalPages: transferRequestTotalPages,
                }}
                filters={transferRequestFilters}
                onFilterChange={handleStockRequestFilterChange}
                onPageChange={handleStockRequestPageChange}
                onPageSizeChange={handleStockRequestPageSizeChange}
                onRefresh={handleStockRequestRefresh}
                onViewDetail={handleViewStockRequest}
              />
            </div>
      )}

      {/* Modals */}
      <StockIntakeModal
        show={showIntakeModal}
        onClose={handleCloseIntakeModal}
        warehouses={warehouses}
        stockBatches={stockBatches}
        suppliers={suppliers}
        products={productLookup}
        createBatch={handleCreateBatch}
        createStockProduct={handleCreateStockItem}
        createSupplier={handleCreateSupplier}
        resetBatchState={handleResetBatchState}
        resetStockProductState={handleResetStockProductState}
        resetSupplierState={handleResetSupplierState}
        isCreatingBatch={isCreatingBatch}
        batchError={createStockBatchError}
        isCreatingStockProduct={isCreatingStockProduct}
        stockProductError={createStockProductError}
        isCreatingSupplier={isCreatingSupplier}
        supplierError={createSupplierError}
        onComplete={handleIntakeComplete}
      />

      <StockProductDetailModal
        show={showStockProductModal}
        onClose={handleCloseStockProductModal}
        stockProduct={selectedStockProduct}
        suppliers={suppliers}
        stockBatches={stockBatches}
        warehouses={warehouses}
        isUpdating={isUpdatingStockProduct}
        updateError={editStockProductError}
        isDeleting={isDeletingStockProduct}
        deleteError={deleteStockProductError}
        onUpdate={handleSubmitStockProductUpdate}
        onDelete={handleConfirmDeleteStockProduct}
      />

      <StockRequestDetailModal
        show={showRequestDetailModal}
        request={transferRequestDetail || selectedRequest}
        onClose={() => {
          setShowRequestDetailModal(false)
          setSelectedRequest(null)
          dispatch(clearTransferRequestDetail())
        }}
        onCancel={handleCancelStockRequest}
        onFulfill={handleFulfillStockRequest}
        onUpdateStatus={handleUpdateStockRequestStatus}
        isCancelling={transferRequestMutationStatus.cancel === 'loading'}
        isFulfilling={transferRequestMutationStatus.fulfill === 'loading'}
        isUpdatingStatus={transferRequestMutationStatus.updateStatus === 'loading'}
        cancelError={transferRequestMutationErrors.cancel}
        fulfillError={transferRequestMutationErrors.fulfill}
        updateStatusError={transferRequestMutationErrors.updateStatus}
      />
    </div>
  )
}

export default ManageStocksPage
