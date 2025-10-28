import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import Alert from 'react-bootstrap/Alert'
import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import Offcanvas from 'react-bootstrap/Offcanvas'
import Spinner from 'react-bootstrap/Spinner'
import Table from 'react-bootstrap/Table'
import { useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector, usePermissions } from '../../../hooks/index.js'
import {
  cancelTransferRequest,
  clearTransferRequestDetail,
  clearTransferRequestMutation,
  createTransferRequest,
  fulfillTransferRequest,
  loadTransferRequestDetail,
  loadTransferRequests,
  resetTransferRequestFilters,
  selectTransferRequestDetail,
  selectTransferRequestDetailError,
  selectTransferRequestDetailStatus,
  selectTransferRequestFilters,
  selectTransferRequestMutationErrors,
  selectTransferRequestMutationStatus,
  selectTransferRequests,
  selectTransferRequestsError,
  selectTransferRequestsPage,
  selectTransferRequestsPageSize,
  selectTransferRequestsPagination,
  selectTransferRequestsStatus,
  setTransferRequestFilters,
  setTransferRequestPage,
  setTransferRequestPageSize,
} from '../../../store/slices/transferRequestSlice.js'
import {
  loadLocations,
  selectActiveLocation,
  selectLocationStatus,
  selectStorefronts,
} from '../../../store/slices/locationSlice.js'
import { selectAuthState } from '../../../store/slices/authSlice.js'
import type {
  Product,
  Storefront,
  TransferRequest,
  TransferRequestCreatePayload,
} from '../../../types/inventory.js'
import { TRANSFER_REQUEST_PRIORITIES, TRANSFER_REQUEST_STATUSES } from '../../../types/common.js'
import { fetchProducts } from '../../../services/inventoryService.js'
import { CAPABILITIES } from '../../../utils/permissions.js'

const STATUS_VARIANTS: Record<string, string> = {
  NEW: 'secondary',
  ASSIGNED: 'info',
  FULFILLED: 'success',
  CANCELLED: 'dark',
}

const PRIORITY_BADGES: Record<string, string> = {
  LOW: 'secondary',
  MEDIUM: 'warning',
  HIGH: 'danger',
}

const formatStatusLabel = (status: string) => {
  if (!status) return 'Unknown'
  return status
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const formatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return formatter.format(date)
}

const trimText = (value?: string | null) => (value ? value.trim() : '')

const getStatusVariant = (status: string) => STATUS_VARIANTS[status] ?? 'secondary'

interface RequestFormLineItem {
  key: string
  product: string
  quantity: number
  unitOfMeasure: string
  notes: string
}

interface RequestFormModalProps {
  show: boolean
  onClose: () => void
  storefronts: Storefront[]
  defaultStorefrontId?: string | null
  products: Product[]
  isLoadingProducts: boolean
  productsError: string | null
  onReloadProducts: () => void
  isSubmitting: boolean
  submitError: string | null
  onCreate: (payload: TransferRequestCreatePayload) => Promise<TransferRequest>
}

interface RequestListRowProps {
  request: TransferRequest
  onSelect: (request: TransferRequest) => void
}

type MutationKey = 'create' | 'cancel' | 'fulfill'

type AsyncState = 'idle' | 'loading' | 'succeeded' | 'failed'

const buildLineItem = (): RequestFormLineItem => ({
  key: Math.random().toString(36).slice(2),
  product: '',
  quantity: 1,
  unitOfMeasure: '',
  notes: '',
})

const buildProductsLabel = (product: Product) => {
  const sku = trimText(product.sku)
  return sku ? `${product.name} · ${sku}` : product.name
}

const RequestListRow = ({ request, onSelect }: RequestListRowProps) => {
  return (
    <tr className="cursor-pointer" onClick={() => onSelect(request)}>
      <td className="font-medium text-slate-900">{request.storefront_name ?? '—'}</td>
      <td>
        <Badge bg={getStatusVariant(request.status)}>{formatStatusLabel(request.status)}</Badge>
      </td>
      <td>
        {request.priority ? (
          <Badge bg={PRIORITY_BADGES[request.priority] ?? 'secondary'}>{formatStatusLabel(request.priority)}</Badge>
        ) : (
          '—'
        )}
      </td>
      <td>{request.line_items.length.toLocaleString()}</td>
      <td>{request.linked_transfer_reference ?? '—'}</td>
      <td>{formatDateTime(request.created_at)}</td>
      <td>{formatDateTime(request.updated_at)}</td>
    </tr>
  )
}

const TransferRequestsPage = () => {
  const dispatch = useAppDispatch()
  const { can } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()

  const requests = useAppSelector(selectTransferRequests)
  const requestsStatus = useAppSelector(selectTransferRequestsStatus)
  const requestsError = useAppSelector(selectTransferRequestsError)
  const pagination = useAppSelector(selectTransferRequestsPagination)
  const currentPage = useAppSelector(selectTransferRequestsPage)
  const pageSize = useAppSelector(selectTransferRequestsPageSize)
  const filters = useAppSelector(selectTransferRequestFilters)

  const detail = useAppSelector(selectTransferRequestDetail)
  const detailStatus = useAppSelector(selectTransferRequestDetailStatus)
  const detailError = useAppSelector(selectTransferRequestDetailError)
  const mutationStatusMap = useAppSelector(selectTransferRequestMutationStatus)
  const mutationErrorsMap = useAppSelector(selectTransferRequestMutationErrors)

  const storefronts = useAppSelector(selectStorefronts)
  const locationStatus = useAppSelector(selectLocationStatus)
  const activeLocation = useAppSelector(selectActiveLocation)
  const { user } = useAppSelector(selectAuthState)

  const canManageRequests = can(CAPABILITIES.INVENTORY_REQUESTS_MANAGE)
  const canConfirmTransferArrival = can(CAPABILITIES.INVENTORY_TRANSFERS_CONFIRM)

  const [statusFilter, setStatusFilter] = useState(filters.status ?? '')
  const [storefrontFilter, setStorefrontFilter] = useState(filters.storefront ?? '')
  const [priorityFilter, setPriorityFilter] = useState(filters.priority ?? '')
  const [orderingFilter, setOrderingFilter] = useState(filters.ordering ?? '')
  const [searchFilter, setSearchFilter] = useState(filters.search ?? '')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [detailPanelOpen, setDetailPanelOpen] = useState(false)
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelNotes, setCancelNotes] = useState('')
  const [showFulfillModal, setShowFulfillModal] = useState(false)
  const [fulfillNotes, setFulfillNotes] = useState('')

  const [products, setProducts] = useState<Product[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [productsError, setProductsError] = useState<string | null>(null)

  const isLoadingList = requestsStatus === 'loading'
  const totalRequests = pagination.count ?? 0
  const totalPages = Math.max(1, Math.ceil((pagination.count ?? 0) / (pageSize || 1)))

  useEffect(() => {
    if (requestsStatus === 'idle') {
      void dispatch(loadTransferRequests())
    }
  }, [dispatch, requestsStatus])

  useEffect(() => {
    if ((storefronts.length === 0 || !activeLocation) && locationStatus === 'idle') {
      void dispatch(loadLocations({ storefrontPage: 1 }))
    }
  }, [activeLocation, dispatch, locationStatus, storefronts.length])

  useEffect(() => {
    setStatusFilter(filters.status ?? '')
    setStorefrontFilter(filters.storefront ?? '')
    setPriorityFilter(filters.priority ?? '')
    setOrderingFilter(filters.ordering ?? '')
    setSearchFilter(filters.search ?? '')
  }, [filters.ordering, filters.priority, filters.search, filters.status, filters.storefront])

  const ensureProductsLoaded = useCallback(async () => {
    if (products.length > 0 || isLoadingProducts) return
    setIsLoadingProducts(true)
    setProductsError(null)
    try {
      const response = await fetchProducts({ page: 1, page_size: 200 })
      const results = Array.isArray(response)
        ? response
        : Array.isArray(response.results)
          ? response.results
          : response.results ?? []
      setProducts(results)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load products.'
      setProductsError(message)
    } finally {
      setIsLoadingProducts(false)
    }
  }, [isLoadingProducts, products.length])

  useEffect(() => {
    if (showCreateModal) {
      void ensureProductsLoaded()
    }
  }, [ensureProductsLoaded, showCreateModal])

  useEffect(() => {
    const createParam = searchParams.get('create')
    if (!createParam) return
    const shouldOpen = createParam === '1' || createParam.toLowerCase() === 'true'
    if (shouldOpen) {
      setShowCreateModal(true)
    }
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('create')
    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const handleApplyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    dispatch(setTransferRequestFilters({
      status: statusFilter || null,
      storefront: storefrontFilter || null,
      priority: priorityFilter || null,
      ordering: orderingFilter || null,
      search: searchFilter.trim(),
    }))
    dispatch(setTransferRequestPage(1))
    void dispatch(loadTransferRequests())
  }

  const handleResetFilters = () => {
    setStatusFilter('')
    setStorefrontFilter('')
    setPriorityFilter('')
    setOrderingFilter('')
    setSearchFilter('')
    dispatch(resetTransferRequestFilters())
    dispatch(setTransferRequestPage(1))
    void dispatch(loadTransferRequests())
  }

  const handleChangePage = (page: number) => {
    if (page === currentPage || page < 1 || page > totalPages) return
    dispatch(setTransferRequestPage(page))
    void dispatch(loadTransferRequests())
  }

  const handleChangePageSize = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextSize = Number(event.target.value)
    if (Number.isNaN(nextSize) || nextSize <= 0 || nextSize === pageSize) return
    dispatch(setTransferRequestPageSize(nextSize))
    dispatch(setTransferRequestPage(1))
    void dispatch(loadTransferRequests())
  }

  const handleSelectRequest = (request: TransferRequest) => {
    setActiveRequestId(request.id)
    setDetailPanelOpen(true)
    void dispatch(loadTransferRequestDetail(request.id))
  }

  const handleCloseDetailPanel = () => {
    setDetailPanelOpen(false)
    setActiveRequestId(null)
    dispatch(clearTransferRequestDetail())
  }

  const activeRequest: TransferRequest | null = useMemo(() => {
    if (detail && detail.id === activeRequestId) {
      return detail
    }
    return requests.find((item) => item.id === activeRequestId) ?? detail ?? null
  }, [activeRequestId, detail, requests])

  const mutationStatus = mutationStatusMap as Record<MutationKey, AsyncState>
  const mutationErrors = mutationErrorsMap as Record<MutationKey, string | null>

  const refreshRequests = useCallback(async () => {
    await dispatch(loadTransferRequests())
    if (activeRequestId) {
      await dispatch(loadTransferRequestDetail(activeRequestId))
    }
  }, [activeRequestId, dispatch])

  const handleCreateRequest = async (payload: TransferRequestCreatePayload) => {
    const created = await dispatch(createTransferRequest(payload)).unwrap()
    await dispatch(loadTransferRequests())
    setActiveRequestId(created.id)
    setDetailPanelOpen(true)
    void dispatch(loadTransferRequestDetail(created.id))
    return created
  }

  const handleCancelRequest = async () => {
    if (!activeRequest) return
    try {
      await dispatch(
        cancelTransferRequest({
          requestId: activeRequest.id,
          payload: {
            // API expects a `reason` field for cancellations
            reason: trimText(cancelReason) || undefined,
          },
        }),
      ).unwrap()
      await refreshRequests()
      setShowCancelModal(false)
      setCancelReason('')
      setCancelNotes('')
    } catch {
      // handled via mutation errors
    }
  }

  const handleFulfillRequest = async () => {
    if (!activeRequest) return
    try {
      await dispatch(
        fulfillTransferRequest({
          requestId: activeRequest.id,
          payload: {
            notes: trimText(fulfillNotes) || undefined,
          },
        }),
      ).unwrap()
      await refreshRequests()
      setShowFulfillModal(false)
      setFulfillNotes('')
    } catch {
      // handled via mutation errors
    }
  }

  const resetMutationState = useCallback(
    (key: MutationKey) => {
      dispatch(clearTransferRequestMutation(key))
    },
    [dispatch],
  )

  const mutationAlerts = useMemo(() => {
    return (['create', 'cancel', 'fulfill'] as MutationKey[])
      .map((key) => mutationErrors[key])
      .filter((message): message is string => Boolean(message))
  }, [mutationErrors])

  const currentUserId = user?.id ?? null
  const isRequester = activeRequest?.requested_by === currentUserId

  const canCancelRequest = useMemo(() => {
    if (!activeRequest) return false
    if (activeRequest.status === 'NEW' && (isRequester || canManageRequests)) return true
    if (activeRequest.status === 'ASSIGNED' && canManageRequests) return true
    return false
  }, [activeRequest, canManageRequests, isRequester])

  const canFulfillRequest = useMemo(() => {
    if (!activeRequest) return false
    if (!canConfirmTransferArrival) return false
    if (activeRequest.status !== 'ASSIGNED') return false
    // API exposes linked transfer via `linked_transfer_id` / `linked_transfer_reference`
    if (!activeRequest.linked_transfer_id) return false
    return isRequester || canManageRequests || canConfirmTransferArrival
  }, [activeRequest, canConfirmTransferArrival, canManageRequests, isRequester])

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Stock requests</h2>
            <p className="text-slate-600">
              Storefront teams can raise stock needs here. Track the fulfilment lifecycle and keep everyone aligned with linked stock movements.
            </p>
          </div>
          <Button
            variant="primary"
            className="rounded-pill px-4"
            onClick={() => setShowCreateModal(true)}
          >
            Request stock
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
          <div>
            Total requests: <span className="font-semibold text-slate-900">{totalRequests.toLocaleString()}</span>
          </div>
          <div>
            Page <span className="font-semibold text-slate-900">{currentPage}</span> of{' '}
            <span className="font-semibold text-slate-900">{totalPages}</span>
          </div>
        </div>
      </section>

      {requestsError ? (
        <Alert variant="danger" className="space-y-3">
          <div className="space-y-1">
            <p className="mb-0 font-semibold">We couldn&apos;t load stock requests.</p>
            <p className="mb-0 text-sm">{requestsError}</p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Button variant="outline-light" size="sm" onClick={() => void dispatch(loadTransferRequests())}>
              Try again
            </Button>
            <Button variant="outline-light" size="sm" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </div>
        </Alert>
      ) : null}

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
            <p className="text-sm text-slate-600">Find requests by status, storefront, or urgency.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline-secondary" onClick={() => void dispatch(loadTransferRequests())} disabled={isLoadingList}>
              Refresh
            </Button>
            <Button
              variant="outline-secondary"
              onClick={handleResetFilters}
              disabled={isLoadingList && requests.length === 0}
            >
              Reset filters
            </Button>
          </div>
        </div>
        <Form onSubmit={handleApplyFilters} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Form.Group controlId="requestStatus">
            <Form.Label>Status</Form.Label>
            <Form.Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              disabled={isLoadingList}
            >
              <option value="">All statuses</option>
              {TRANSFER_REQUEST_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group controlId="requestStorefront">
            <Form.Label>Storefront</Form.Label>
            <Form.Select
              value={storefrontFilter}
              onChange={(event) => setStorefrontFilter(event.target.value)}
              disabled={isLoadingList || storefronts.length === 0}
            >
              <option value="">All storefronts</option>
              {storefronts.map((storefront) => (
                <option key={storefront.id} value={storefront.id}>
                  {storefront.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group controlId="requestPriority">
            <Form.Label>Priority</Form.Label>
            <Form.Select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              disabled={isLoadingList}
            >
              <option value="">Any priority</option>
              {TRANSFER_REQUEST_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {formatStatusLabel(priority)}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group controlId="requestOrdering">
            <Form.Label>Ordering</Form.Label>
            <Form.Select
              value={orderingFilter}
              onChange={(event) => setOrderingFilter(event.target.value)}
              disabled={isLoadingList}
            >
              <option value="">Newest first</option>
              <option value="-created_at">Recently created</option>
              <option value="created_at">Oldest first</option>
              <option value="-updated_at">Recently updated</option>
              <option value="updated_at">Least recently updated</option>
            </Form.Select>
          </Form.Group>

          <Form.Group controlId="requestSearch" className="md:col-span-2 xl:col-span-3">
            <Form.Label>Search</Form.Label>
            <Form.Control
              type="search"
              placeholder="Search by storefront, product, or notes"
              value={searchFilter}
              onChange={(event) => setSearchFilter(event.target.value)}
              disabled={isLoadingList}
            />
          </Form.Group>

          <div className="md:col-span-2 xl:col-span-3 flex justify-end gap-3">
            <Button type="submit" disabled={isLoadingList}>
              Apply filters
            </Button>
          </div>
        </Form>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Requests</h3>
            <p className="text-sm text-slate-600">Click a request to review its line items and fulfillment status.</p>
          </div>
          {isLoadingList ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Spinner animation="border" size="sm" role="status" aria-hidden />
              Loading requests…
            </div>
          ) : null}
        </div>

        <div className="max-w-full overflow-x-auto">
          <Table hover responsive size="sm" className="align-middle">
            <thead>
              <tr>
                <th>Storefront</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Line items</th>
                <th>Linked stock movement</th>
                <th>Created</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-sm text-slate-500">
                    {isLoadingList
                      ? 'Loading requests…'
                      : 'No stock requests match your filters. Adjust the filters or create a new request.'}
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <RequestListRow key={request.id} request={request} onSelect={handleSelectRequest} />
                ))
              )}
            </tbody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <div>
            Showing{' '}
            {requests.length === 0
              ? '0'
              : `${((currentPage - 1) * pageSize + 1).toLocaleString()}–${Math.min(
                  currentPage * pageSize,
                  totalRequests,
                ).toLocaleString()}`}{' '}
            of {totalRequests.toLocaleString()} requests
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Form.Select
              size="sm"
              className="w-auto"
              value={pageSize.toString()}
              onChange={handleChangePageSize}
              disabled={isLoadingList}
              aria-label="Select requests per page"
            >
              {[10, 20, 50, 100].map((option) => (
                <option key={option} value={option}>
                  {option} per page
                </option>
              ))}
            </Form.Select>
            <div className="inline-flex items-center gap-2">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => handleChangePage(currentPage - 1)}
                disabled={isLoadingList || currentPage <= 1}
              >
                Previous
              </Button>
              <span>Page {currentPage} of {totalPages}</span>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => handleChangePage(currentPage + 1)}
                disabled={isLoadingList || currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Offcanvas
        show={detailPanelOpen}
        onHide={handleCloseDetailPanel}
        placement="end"
        className="w-full max-w-xl"
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Request details</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="space-y-4">
          {detailStatus === 'loading' ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Spinner animation="border" size="sm" role="status" aria-hidden />
              Loading request…
            </div>
          ) : null}

          {detailError ? <Alert variant="danger">{detailError}</Alert> : null}
          {mutationAlerts.map((message, index) => (
            <Alert key={index} variant="danger">
              {message}
            </Alert>
          ))}

          {activeRequest ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Storefront</p>
                  <h3 className="text-xl font-semibold text-slate-900">
                    {activeRequest.storefront_name ?? '—'}
                  </h3>
                  <p className="text-sm text-slate-600">
                    Created {formatDateTime(activeRequest.created_at)} • Updated {formatDateTime(activeRequest.updated_at)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge bg={getStatusVariant(activeRequest.status)}>{formatStatusLabel(activeRequest.status)}</Badge>
                  {activeRequest.priority ? (
                    <Badge bg={PRIORITY_BADGES[activeRequest.priority] ?? 'secondary'}>
                      {formatStatusLabel(activeRequest.priority)} priority
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-700">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Requested by</p>
                  <p className="font-medium text-slate-900">{activeRequest.requested_by_name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Notes</p>
                  <p className="font-medium text-slate-900">{trimText(activeRequest.notes) || '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Linked stock movement</p>
                  <p className="font-medium text-slate-900">
                    {activeRequest.linked_transfer_reference ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Fulfilled at</p>
                  <p className="font-medium text-slate-900">{formatDateTime(activeRequest.fulfilled_at)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-slate-900">Line items</h4>
                <div className="max-h-80 overflow-auto rounded-2xl border border-slate-200">
                  <Table responsive hover size="sm" className="mb-0 align-middle">
                    <thead className="bg-slate-50">
                      <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Unit</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeRequest.line_items && activeRequest.line_items.length > 0 ? (
                        activeRequest.line_items.map((item) => (
                          <tr key={item.id}>
                            <td className="font-medium text-slate-900">{item.product_name ?? '—'}</td>
                            <td>{item.requested_quantity.toLocaleString()}</td>
                            <td>{trimText(item.unit_of_measure) || '—'}</td>
                            <td>{trimText(item.notes) || '—'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-3 text-center text-sm text-slate-500">
                            No line items recorded for this request.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </div>

              {canCancelRequest || canFulfillRequest ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {canCancelRequest ? (
                    <Button
                      variant="outline-danger"
                      className="rounded-pill"
                      onClick={() => {
                        resetMutationState('cancel')
                        setShowCancelModal(true)
                      }}
                      disabled={mutationStatus.cancel === 'loading'}
                    >
                      Cancel request
                    </Button>
                  ) : null}
                  {canFulfillRequest ? (
                    <Button
                      variant="primary"
                      className="rounded-pill"
                      onClick={() => {
                        resetMutationState('fulfill')
                        setShowFulfillModal(true)
                      }}
                      disabled={mutationStatus.fulfill === 'loading'}
                    >
                      Confirm delivery
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </Offcanvas.Body>
      </Offcanvas>

      <RequestFormModal
        show={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          resetMutationState('create')
        }}
        storefronts={storefronts}
        defaultStorefrontId={activeLocation?.type === 'storefront' ? activeLocation.id : storefronts[0]?.id}
        products={products}
        isLoadingProducts={isLoadingProducts}
        productsError={productsError}
        onReloadProducts={() => void ensureProductsLoaded()}
        isSubmitting={mutationStatus.create === 'loading'}
        submitError={mutationErrors.create ?? null}
        onCreate={handleCreateRequest}
      />

      <Modal show={showCancelModal} onHide={() => setShowCancelModal(false)} centered>
        <Form
          onSubmit={(event) => {
            event.preventDefault()
            void handleCancelRequest()
          }}
        >
          <Modal.Header closeButton>
            <Modal.Title>Cancel stock request</Modal.Title>
          </Modal.Header>
          <Modal.Body className="space-y-3">
            <p className="text-sm text-slate-600">
              Let the warehouse know why this request is being withdrawn. Notes are optional but encouraged.
            </p>
            {mutationErrors.cancel ? <Alert variant="danger">{mutationErrors.cancel}</Alert> : null}
            <Form.Group controlId="cancelReason">
              <Form.Label>Reason (optional)</Form.Label>
              <Form.Control
                type="text"
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                disabled={mutationStatus.cancel === 'loading'}
                placeholder="Change of plan, duplicated, etc."
              />
            </Form.Group>
            <Form.Group controlId="cancelNotes">
              <Form.Label>Additional notes (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={cancelNotes}
                onChange={(event) => setCancelNotes(event.target.value)}
                disabled={mutationStatus.cancel === 'loading'}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="justify-between">
            <Button variant="outline-secondary" onClick={() => setShowCancelModal(false)} disabled={mutationStatus.cancel === 'loading'}>
              Close
            </Button>
            <Button variant="danger" type="submit" disabled={mutationStatus.cancel === 'loading'}>
              {mutationStatus.cancel === 'loading' ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner animation="border" size="sm" role="status" aria-hidden />
                  Cancelling…
                </span>
              ) : (
                'Cancel request'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showFulfillModal} onHide={() => setShowFulfillModal(false)} centered>
        <Form
          onSubmit={(event) => {
            event.preventDefault()
            void handleFulfillRequest()
          }}
        >
          <Modal.Header closeButton>
            <Modal.Title>Confirm delivery</Modal.Title>
          </Modal.Header>
          <Modal.Body className="space-y-3">
            <p className="text-sm text-slate-600">
              This will mark the request as fulfilled and record that the items arrived safely.
            </p>
            {mutationErrors.fulfill ? <Alert variant="danger">{mutationErrors.fulfill}</Alert> : null}
            <Form.Group controlId="fulfillNotes">
              <Form.Label>Notes for audit trail (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={fulfillNotes}
                onChange={(event) => setFulfillNotes(event.target.value)}
                disabled={mutationStatus.fulfill === 'loading'}
                placeholder="Everything received in good condition"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="justify-between">
            <Button variant="outline-secondary" onClick={() => setShowFulfillModal(false)} disabled={mutationStatus.fulfill === 'loading'}>
              Close
            </Button>
            <Button variant="primary" type="submit" disabled={mutationStatus.fulfill === 'loading'}>
              {mutationStatus.fulfill === 'loading' ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner animation="border" size="sm" role="status" aria-hidden />
                  Confirming…
                </span>
              ) : (
                'Confirm delivery'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}

const RequestFormModal = ({
  show,
  onClose,
  storefronts,
  defaultStorefrontId,
  products,
  isLoadingProducts,
  productsError,
  onReloadProducts,
  isSubmitting,
  submitError,
  onCreate,
}: RequestFormModalProps) => {
  const [selectedStorefront, setSelectedStorefront] = useState('')
  const [priority, setPriority] = useState('')
  const [notes, setNotes] = useState('')
  const [lineItems, setLineItems] = useState<RequestFormLineItem[]>([buildLineItem()])
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!show) return
    setSelectedStorefront((prev) => (prev ? prev : defaultStorefrontId ?? ''))
    setPriority('')
    setNotes('')
    setLineItems([buildLineItem()])
    setFormError(null)
  }, [defaultStorefrontId, show])

  const activeLineItems = lineItems.filter((item) => item.product && item.quantity > 0)

  const validateForm = () => {
    if (!selectedStorefront) {
      setFormError('Select the storefront that needs stock.')
      return false
    }
    if (activeLineItems.length === 0) {
      setFormError('Add at least one product with a quantity.')
      return false
    }
    for (const item of activeLineItems) {
      if (!item.product) {
        setFormError('Each line item must have a product selected.')
        return false
      }
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        setFormError('Quantities must be positive numbers.')
        return false
      }
    }
    setFormError(null)
    return true
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validateForm()) return

    const payload: TransferRequestCreatePayload = {
      storefront: selectedStorefront,
      // direction is required: these are storefront-initiated requests (warehouse → storefront)
      direction: 'FORWARD',
      // priority is required by the payload type; default to MEDIUM when unset
      priority: (priority as TransferRequestCreatePayload['priority']) || 'MEDIUM',
      notes: trimText(notes) || undefined,
      line_items: activeLineItems.map((item) => ({
        product: item.product,
        requested_quantity: item.quantity,
        // ensure unit_of_measure is a non-undefined string
        unit_of_measure: item.unitOfMeasure || 'each',
        notes: trimText(item.notes) || undefined,
      })),
    }

    try {
      await onCreate(payload)
      onClose()
    } catch (error) {
      if (error instanceof Error && error.message) {
        setFormError(error.message)
      }
    }
  }

  const handleAddLineItem = () => {
    setLineItems((previous) => [...previous, buildLineItem()])
  }

  const handleRemoveLineItem = (key: string) => {
    setLineItems((previous) => previous.filter((item) => item.key !== key))
  }

  const handleChangeLineItem = (key: string, updates: Partial<RequestFormLineItem>) => {
    setLineItems((previous) => previous.map((item) => (item.key === key ? { ...item, ...updates } : item)))
  }

  return (
    <Modal show={show} onHide={onClose} size="lg" scrollable centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Request stock</Modal.Title>
        </Modal.Header>
        <Modal.Body className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <h3 className="mb-2 text-base font-semibold text-slate-900">Storefront needs</h3>
            <p className="mb-3 text-sm text-slate-600">
              Specify which storefront needs stock and which items to pull from the warehouse.
            </p>
          </div>

          {formError ? <Alert variant="warning">{formError}</Alert> : null}
          {submitError ? <Alert variant="danger">{submitError}</Alert> : null}
          {productsError ? <Alert variant="warning">{productsError}</Alert> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Form.Group controlId="requestStorefrontSelect">
              <Form.Label>Storefront</Form.Label>
              <Form.Select
                value={selectedStorefront}
                onChange={(event) => setSelectedStorefront(event.target.value)}
                disabled={isSubmitting || storefronts.length === 0}
                required
              >
                <option value="" disabled>
                  {storefronts.length === 0 ? 'No storefronts available' : 'Select storefront'}
                </option>
                {storefronts.map((storefront) => (
                  <option key={storefront.id} value={storefront.id}>
                    {storefront.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group controlId="requestPrioritySelect">
              <Form.Label>Priority (optional)</Form.Label>
              <Form.Select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                disabled={isSubmitting}
              >
                <option value="">Normal priority</option>
                {TRANSFER_REQUEST_PRIORITIES.map((option) => (
                  <option key={option} value={option}>
                    {formatStatusLabel(option)}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </div>

          <Form.Group controlId="requestNotes">
            <Form.Label>Notes (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isSubmitting}
              placeholder="Include context for the warehouse team"
            />
          </Form.Group>

          <div className="space-y-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h4 className="text-base font-semibold text-slate-900">Line items</h4>
                <p className="text-sm text-slate-600">Add every product your storefront needs.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline-primary" onClick={onReloadProducts} disabled={isLoadingProducts}>
                  {isLoadingProducts ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner animation="border" size="sm" role="status" aria-hidden />
                      Loading…
                    </span>
                  ) : (
                    'Refresh products'
                  )}
                </Button>
                <Button size="sm" variant="outline-secondary" onClick={handleAddLineItem} disabled={isSubmitting}>
                  Add product row
                </Button>
              </div>
            </div>

            {products.length === 0 ? (
              <Alert variant="info" className="mb-0">
                You don&apos;t have any products yet. Create products in the inventory catalog before raising requests.
              </Alert>
            ) : null}

            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <div key={item.key} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/5 font-medium text-slate-900">
                        {index + 1}
                      </span>
                      Line item
                    </span>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleRemoveLineItem(item.key)}
                      disabled={isSubmitting || lineItems.length === 1}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Form.Group controlId={`requestLineProduct-${item.key}`}>
                      <Form.Label>Product</Form.Label>
                      <Form.Select
                        value={item.product}
                        onChange={(event) => handleChangeLineItem(item.key, { product: event.target.value })}
                        disabled={isSubmitting || products.length === 0}
                        required
                      >
                        <option value="" disabled>
                          {products.length === 0 ? 'No products available' : 'Select product'}
                        </option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {buildProductsLabel(product)}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    <Form.Group controlId={`requestLineQuantity-${item.key}`}>
                      <Form.Label>Requested quantity</Form.Label>
                      <Form.Control
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(event) =>
                          handleChangeLineItem(item.key, { quantity: Number(event.target.value) || 0 })
                        }
                        disabled={isSubmitting}
                        required
                      />
                      <Form.Text muted>Use whole numbers; the warehouse can adjust if needed.</Form.Text>
                    </Form.Group>

                    <Form.Group controlId={`requestLineUnit-${item.key}`}>
                      <Form.Label>Unit of measure (optional)</Form.Label>
                      <Form.Control
                        type="text"
                        value={item.unitOfMeasure}
                        onChange={(event) => handleChangeLineItem(item.key, { unitOfMeasure: event.target.value })}
                        disabled={isSubmitting}
                        placeholder="Boxes, cases, etc."
                      />
                    </Form.Group>

                    <Form.Group controlId={`requestLineNotes-${item.key}`}>
                      <Form.Label>Notes (optional)</Form.Label>
                      <Form.Control
                        type="text"
                        value={item.notes}
                        onChange={(event) => handleChangeLineItem(item.key, { notes: event.target.value })}
                        disabled={isSubmitting}
                        placeholder="Special handling instructions"
                      />
                    </Form.Group>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-center text-sm text-slate-600">
              Need to add more? Use “Add product row” to keep building your request.
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="flex flex-col gap-3 border-t border-slate-200 bg-white/70 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">
            {activeLineItems.length} product{activeLineItems.length === 1 ? '' : 's'} selected
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="outline-secondary" onClick={onClose} disabled={isSubmitting} className="sm:min-w-[140px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="sm:min-w-[160px]">
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner animation="border" size="sm" role="status" aria-hidden />
                  Submitting…
                </span>
              ) : (
                'Submit request'
              )}
            </Button>
          </div>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

export default TransferRequestsPage
