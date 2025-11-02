import { useEffect, useState, useCallback, useMemo, useRef, Fragment, type ChangeEvent, type FormEvent } from 'react'
import Alert from 'react-bootstrap/Alert'
import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import Nav from 'react-bootstrap/Nav'
import Spinner from 'react-bootstrap/Spinner'
import Table from 'react-bootstrap/Table'
import { useAppDispatch, useAppSelector } from '../../../hooks/index.js'
import StockIntakeModal from '../components/StockIntakeModal'
import { TransferModal } from '../components/TransferModal'
import TransferDetailModal from '../components/TransferDetailModal'
import StockProductDetailModal from '../components/StockProductDetailModal'
import StockRequestForm from '../components/stock-requests/StockRequestForm'
import StockRequestList from '../components/stock-requests/StockRequestList'
import StockRequestDetailModal from '../components/stock-requests/StockRequestDetailModal'
import EditFulfilledRequestModal from '../components/stock-requests/EditFulfilledRequestModal'
import CreateAdjustmentModal from '../components/CreateAdjustmentModal'
import AdjustmentDetailModal from '../components/AdjustmentDetailModal'
import EditAdjustmentModal from '../components/EditAdjustmentModal'
import type { StockAdjustmentEditPayload } from '../components/EditAdjustmentModal'
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
  // selectTransferRequestsPagination, // Using client-side filtering
  selectTransferRequestsPage,
  selectTransferRequestsPageSize,
  selectTransferRequestsStatus,
  setTransferRequestFilters,
  setTransferRequestPage,
  setTransferRequestPageSize,
  updateTransferRequestStatus,
  updateTransferRequest,
} from '../../../store/slices/transferRequestSlice.js'
import {
  loadStockAdjustments,
  selectStockAdjustments,
  selectAdjustmentsStatus,
  selectAdjustmentsError,
  selectAdjustmentsPagination,
  selectAdjustmentsPage,
  setAdjustmentsPage,
  addStockAdjustment,
  selectCreateAdjustmentStatus,
  selectCreateAdjustmentError,
  approveAdjustment,
  rejectAdjustment,
  selectApproveAdjustmentStatus,
  selectRejectAdjustmentStatus,
  editStockAdjustment,
  selectUpdateAdjustmentStatus,
  selectUpdateAdjustmentError,
  removeStockAdjustment,
  selectDeleteAdjustmentStatus,
  selectDeleteAdjustmentError,
} from '../../../store/slices/stockAdjustmentSlice'
import {
  loadWarehouseTransfers,
  loadWarehouseTransferDetail,
  completeWarehouseTransferThunk,
  cancelWarehouseTransferThunk,
  deleteWarehouseTransferThunk,
  selectWarehouseTransfers,
  selectWarehouseTransfersStatus,
  selectWarehouseTransfersError,
  selectWarehouseTransferDetail,
  selectWarehouseTransferDetailStatus,
  selectWarehouseTransferMutationStatus,
  clearWarehouseTransferDetail,
  clearWarehouseTransferMutation,
} from '../../../store/slices/warehouseTransferSlice'
import { getAdjustmentIcon, getAdjustmentColor, formatAdjustmentType, formatQuantityWithSign } from '../../../utils/stockAdjustmentHelpers.js'
import type { AdjustmentType } from '../../../types/stockAdjustments.js'
import type { Product, StockBatchPayload, StockProduct, StockProductPayload, Storefront, SupplierPayload, TransferRequest, TransferRequestCreatePayload, WarehouseTransfer } from '../../../types/inventory.js'
import type { StockAdjustmentCreatePayload, StockAdjustment } from '../../../types/stockAdjustments.js'

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
  // const transferRequestsPagination = useAppSelector(selectTransferRequestsPagination) // Using client-side filtering for now
  const transferRequestsPage = useAppSelector(selectTransferRequestsPage)
  const transferRequestsPageSize = useAppSelector(selectTransferRequestsPageSize)
  const transferRequestFilters = useAppSelector(selectTransferRequestFilters)
  const transferRequestMutationStatus = useAppSelector(selectTransferRequestMutationStatus)
  const transferRequestMutationErrors = useAppSelector(selectTransferRequestMutationErrors)
  const transferRequestDetail = useAppSelector(selectTransferRequestDetail)

  // Stock Adjustment selectors
  const adjustments = useAppSelector(selectStockAdjustments)
  const adjustmentsStatus = useAppSelector(selectAdjustmentsStatus)
  const adjustmentsError = useAppSelector(selectAdjustmentsError)
  const adjustmentsPagination = useAppSelector(selectAdjustmentsPagination)
  const adjustmentsPage = useAppSelector(selectAdjustmentsPage)
  const createAdjustmentStatus = useAppSelector(selectCreateAdjustmentStatus)
  const createAdjustmentError = useAppSelector(selectCreateAdjustmentError)
  const approveAdjustmentStatus = useAppSelector(selectApproveAdjustmentStatus)
  const rejectAdjustmentStatus = useAppSelector(selectRejectAdjustmentStatus)
  const updateAdjustmentStatus = useAppSelector(selectUpdateAdjustmentStatus)
  const updateAdjustmentError = useAppSelector(selectUpdateAdjustmentError)
  const deleteAdjustmentStatus = useAppSelector(selectDeleteAdjustmentStatus)
  const deleteAdjustmentError = useAppSelector(selectDeleteAdjustmentError)
  
  // New Warehouse Transfer selectors
  const warehouseTransfers = useAppSelector(selectWarehouseTransfers)
  const warehouseTransfersStatus = useAppSelector(selectWarehouseTransfersStatus)
  const warehouseTransfersError = useAppSelector(selectWarehouseTransfersError)
  const warehouseTransferDetail = useAppSelector(selectWarehouseTransferDetail)
  const warehouseTransferDetailStatus = useAppSelector(selectWarehouseTransferDetailStatus)
  const warehouseTransferMutationStatus = useAppSelector(selectWarehouseTransferMutationStatus)
  
  // Get user role for permission checks
  // Priority order: employment.role > user.final_userRole > user.role
  const employment = useAppSelector((state) => state.auth.employment)
  const user = useAppSelector((state) => state.auth.user)
  
  const userRole = employment?.role || user?.final_userRole || user?.role

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
  // Duplicate declaration removed: activeTab, setActiveTab
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferError, setTransferError] = useState<string | null>(null)
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false)
  const [transferSuccess, setTransferSuccess] = useState<{ reference_number: string } | null>(null)
  // Handler for submitting transfer
  const handleSubmitTransfer = async ({ sourceWarehouse, destinationWarehouse, products, reason }: { sourceWarehouse: string; destinationWarehouse: string; products: Array<{ product: string; quantity: number }>; reason?: string }) => {
    setIsSubmittingTransfer(true)
    setTransferError(null)
    setTransferSuccess(null)
    
    try {
      if (!products.length) throw new Error('No products selected for transfer')
      
      // Feature flag: Use new batch transfer API or old product-level loop
      const useNewTransferAPI = import.meta.env.VITE_USE_NEW_TRANSFER_API === 'true'
      
      if (useNewTransferAPI) {
        // NEW: Single batch API call
        const sourceWarehouseObj = warehouses.find((w) => w.id === sourceWarehouse)
        
        // Validate all products exist in source warehouse before making API call
        for (const p of products) {
          const sourceStockProduct = stockProducts.find((sp) => 
            sp.product === p.product && (
              (sp.warehouse_name && sourceWarehouseObj && sp.warehouse_name === sourceWarehouseObj.name) ||
              (sp.stock && sp.stock === sourceWarehouse)
            )
          )
          if (!sourceStockProduct) {
            throw new Error(`Product not in stock for source warehouse: ${p.product}`)
          }
        }
        
        // Create batch transfer payload
        const { createWarehouseTransferBatch } = await import('../../../services/inventoryService.js')
        
        const transfer = await createWarehouseTransferBatch({
          source_warehouse: sourceWarehouse,
          destination_warehouse: destinationWarehouse,
          notes: reason || '',
          items: products.map(p => ({
            product: p.product,
            quantity: p.quantity,
            // Omit unit_cost - let backend auto-detect from source warehouse
          }))
        })
        
        setTransferSuccess({ reference_number: transfer.reference_number })
        setShowTransferModal(false)
        
        // Reload adjustments (they'll still be created in the background for compatibility)
        void dispatch(loadStockAdjustments(buildAdjustmentParams(1)))
      } else {
        // OLD: Product-level loop (legacy)
        const results: Array<{ 
          success: boolean
          transfer_reference?: string
          out_adjustment_id?: string
          in_adjustment_id?: string
          source_stock_id?: string
          dest_stock_id?: string
          message?: string 
        }> = []
        
        for (const p of products) {
          const sourceWarehouseObj = warehouses.find((w) => w.id === sourceWarehouse)
          
          const sourceStockProduct = stockProducts.find((sp) => 
            sp.product === p.product && (
              (sp.warehouse_name && sourceWarehouseObj && sp.warehouse_name === sourceWarehouseObj.name) ||
              (sp.stock && sp.stock === sourceWarehouse)
            )
          )
          if (!sourceStockProduct) throw new Error('Product not in stock for source warehouse')
          
          const transferPayload = {
            product_id: p.product,
            from_warehouse_id: sourceWarehouse,
            to_warehouse_id: destinationWarehouse,
            quantity: p.quantity,
            unit_cost: sourceStockProduct.unit_cost,
            reason,
          }
          
          const { createWarehouseTransfer } = await import('../../../services/inventoryService.js')
          const data = await createWarehouseTransfer(transferPayload)
          results.push(data)
        }
        
        const first = results[0]
        setTransferSuccess({ reference_number: first?.transfer_reference || 'N/A' })
        setShowTransferModal(false)
        void dispatch(loadStockAdjustments(buildAdjustmentParams(1)))
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setTransferError(err.message)
      } else {
        setTransferError('Failed to create transfer')
      }
    } finally {
      setIsSubmittingTransfer(false)
    }
  }
  const [showRequestDetailModal, setShowRequestDetailModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<TransferRequest | null>(null)
  const [showEditFulfilledModal, setShowEditFulfilledModal] = useState(false)
  const [editingRequest, setEditingRequest] = useState<TransferRequest | null>(null)
  const [showCreateAdjustmentModal, setShowCreateAdjustmentModal] = useState(false)
  const [showAdjustmentDetailModal, setShowAdjustmentDetailModal] = useState(false)
  const [selectedAdjustment, setSelectedAdjustment] = useState<StockAdjustment | null>(null)
  const [showEditAdjustmentModal, setShowEditAdjustmentModal] = useState(false)
  const [editingAdjustment, setEditingAdjustment] = useState<StockAdjustment | null>(null)
  const [adjustmentToDelete, setAdjustmentToDelete] = useState<StockAdjustment | null>(null)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  // Toggle to show dedicated transfers view in adjustments tab
  const [showTransfersOnly, setShowTransfersOnly] = useState(false)
  
  // New Warehouse Transfer modal state
  const [showWarehouseTransferDetailModal, setShowWarehouseTransferDetailModal] = useState(false)
  const [selectedWarehouseTransfer, setSelectedWarehouseTransfer] = useState<WarehouseTransfer | null>(null)
  
  // Adjustments filters
  const [adjustmentSearchTerm, setAdjustmentSearchTerm] = useState('')
  const [adjustmentStatusFilter, setAdjustmentStatusFilter] = useState<string>('')
  const [adjustmentTypeFilter, setAdjustmentTypeFilter] = useState<string>('')

  // Adjustment filter helper - defined early so it can be used in useEffects and handlers
  const buildAdjustmentParams = useCallback((page: number = adjustmentsPage, additionalParams: Record<string, unknown> = {}) => {
    const params: Record<string, unknown> = { page, ...additionalParams }
    if (adjustmentSearchTerm) params.search = adjustmentSearchTerm
    if (adjustmentStatusFilter) params.status = adjustmentStatusFilter
    if (adjustmentTypeFilter) params.adjustment_type = adjustmentTypeFilter
    return params
  }, [adjustmentsPage, adjustmentSearchTerm, adjustmentStatusFilter, adjustmentTypeFilter])

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
      } catch {
        // Silently ignore storefront loading errors
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

  // Load stock adjustments when on that tab
  useEffect(() => {
    if (activeTab === 'stock-adjustments') {
      const params = buildAdjustmentParams()
      void dispatch(loadStockAdjustments(params))
    }
  }, [activeTab, dispatch, buildAdjustmentParams])
  
  // Load warehouse transfers when on transfers tab (NEW API with feature flag)
  useEffect(() => {
    const useNewTransferAPI = import.meta.env.VITE_USE_NEW_TRANSFER_API === 'true'
    
    if (activeTab === 'transfers') {
      if (useNewTransferAPI) {
        void dispatch(loadWarehouseTransfers())
      } else {
        // Load stock adjustments for old grouped transfer display
        const params = buildAdjustmentParams()
        void dispatch(loadStockAdjustments(params))
      }
    }
  }, [activeTab, dispatch, buildAdjustmentParams])

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

  const handleCreateBatch = (payload: StockBatchPayload) => {
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

  // Debounce timer for search filter
  const searchDebounceTimerRef = useRef<number | null>(null)

  const handleStockRequestFilterChange = useCallback((filters: Partial<typeof transferRequestFilters>) => {
    // Update filters immediately in Redux (for controlled input)
    dispatch(setTransferRequestFilters(filters))
    dispatch(setTransferRequestPage(1))
    
    // If it's a search filter change, debounce the API call
    if ('search' in filters) {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current)
      }
      searchDebounceTimerRef.current = window.setTimeout(() => {
        void dispatch(loadTransferRequests())
      }, 300)
    } else {
      // For other filters, load immediately
      void dispatch(loadTransferRequests())
    }
  }, [dispatch])

  const handleStockRequestPageChange = useCallback((page: number) => {
    dispatch(setTransferRequestPage(page))
    void dispatch(loadTransferRequests())
  }, [dispatch])

  const handleStockRequestPageSizeChange = useCallback((pageSize: number) => {
    dispatch(setTransferRequestPageSize(pageSize))
    dispatch(setTransferRequestPage(1))
    void dispatch(loadTransferRequests())
  }, [dispatch])

  const handleStockRequestRefresh = useCallback(() => {
    void dispatch(loadTransferRequests())
  }, [dispatch])

  // Memoize filtered requests to prevent unnecessary re-renders
  const forwardTransferRequests = useMemo(
    () => transferRequests.filter(req => (req.direction || 'FORWARD') === 'FORWARD'),
    [transferRequests]
  )

  // Memoize pagination object to prevent unnecessary re-renders
  const stockRequestPagination = useMemo(
    () => ({
      count: forwardTransferRequests.length,
      page: transferRequestsPage,
      pageSize: transferRequestsPageSize,
      totalPages: Math.max(1, Math.ceil(forwardTransferRequests.length / transferRequestsPageSize)),
    }),
    [forwardTransferRequests.length, transferRequestsPage, transferRequestsPageSize]
  )

  // Memoize grouped transfers so we don't declare types inside JSX IIFEs (avoids TSX parser issues)
  const groupedTransfers = useMemo(() => {
    type Group = {
      reference: string
      date: string
      out?: StockAdjustment
      in?: StockAdjustment
      products: Array<{ name: string; quantity: number; type: AdjustmentType }>
      status?: string
    }

    const groups: Record<string, Group> = {}
    // Consider both TRANSFER_OUT and TRANSFER_IN adjustments and group them by reference_number
    // Prefer reference_number, then related_transfer, then fall back to adjustment id.
    adjustments
      .filter(a => a.adjustment_type === 'TRANSFER_OUT' || a.adjustment_type === 'TRANSFER_IN')
      .forEach((a) => {
  // Prefer the related_transfer id as the canonical grouping key when present
  // Some transfer adjustments create distinct reference_numbers but link via related_transfer
  // Using related_transfer first ensures paired IN/OUT adjustments collapse into one row.
  const key = a.related_transfer || a.reference_number || a.id
        if (!groups[key]) {
          groups[key] = { reference: key, date: a.created_at || '', products: [], status: a.status }
        }

        const g = groups[key]
        // Attach the specific adjustment to the group
        if (a.adjustment_type === 'TRANSFER_OUT') g.out = a
        if (a.adjustment_type === 'TRANSFER_IN') g.in = a

        // Resolve product name reliably: prefer embedded snapshot, fall back to stockProducts lookup
        const prodName = a.stock_product_details?.product_name
          || stockProducts.find(sp => sp.id === a.stock_product)?.product_name
          || '—'

        g.products.push({ name: prodName, quantity: a.quantity, type: a.adjustment_type as AdjustmentType })

        // Keep group's date as the newest created_at among attached adjustments
        if (a.created_at) {
          const existing = g.date ? new Date(g.date).getTime() : 0
          const candidate = new Date(a.created_at).getTime()
          if (!g.date || candidate > existing) {
            g.date = a.created_at
          }
        }

        // Normalize status: if both sides exist and both completed, mark COMPLETED; otherwise prefer the most recent status
        if (g.out && g.in) {
          if (g.out.status === 'COMPLETED' && g.in.status === 'COMPLETED') {
            g.status = 'COMPLETED'
          } else {
            // choose status from the adjustment with the newest timestamp
            const outTime = g.out.created_at ? new Date(g.out.created_at).getTime() : 0
            const inTime = g.in.created_at ? new Date(g.in.created_at).getTime() : 0
            g.status = outTime >= inTime ? g.out.status : g.in.status
          }
        } else {
          g.status = a.status
        }
      })

    const rows = Object.values(groups)
      .sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime())
    return rows
  }, [adjustments, stockProducts])

  // When not showing transfers-only, exclude transfer adjustments from the generic adjustments table
  const visibleAdjustments = useMemo(() => {
    if (showTransfersOnly) return [] as StockAdjustment[]
    return adjustments.filter(a => a.adjustment_type !== 'TRANSFER_OUT' && a.adjustment_type !== 'TRANSFER_IN')
  }, [adjustments, showTransfersOnly])

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
    // Reload both the list and the detail to show updated status
    void dispatch(loadTransferRequests())
    void dispatch(loadTransferRequestDetail(requestId))
    dispatch(clearTransferRequestMutation('updateStatus'))
  }

  const handleEditFulfilled = (requestId: string) => {
    const request = transferRequests.find(r => r.id === requestId)
    if (request) {
      setEditingRequest(request)
      setShowEditFulfilledModal(true)
      setShowRequestDetailModal(false)
    }
  }

  const handleSaveEditFulfilled = async (updates: { lineItems: Array<{ id: string; quantity: number; notes: string }> }) => {
    if (!editingRequest) return
    
    try {
      // Build the payload with updated line items
      const payload = {
        line_items: updates.lineItems.map(item => ({
          id: item.id,
          product: editingRequest.line_items.find(li => li.id === item.id)?.product || '',
          requested_quantity: item.quantity,
          unit_of_measure: editingRequest.line_items.find(li => li.id === item.id)?.unit_of_measure || 'units',
          notes: item.notes
        }))
      }
      
      await dispatch(updateTransferRequest({ 
        requestId: editingRequest.id, 
        payload 
      })).unwrap()
      
      // Reload the list and close modal
      void dispatch(loadTransferRequests())
      setShowEditFulfilledModal(false)
      setEditingRequest(null)
      dispatch(clearTransferRequestMutation('update'))
    } catch {
      // Error handling is managed by the modal through Redux state
    }
  }

  const handleCancelEditFulfilled = () => {
    setShowEditFulfilledModal(false)
    setEditingRequest(null)
  }

  const handleCreateAdjustment = async (payload: StockAdjustmentCreatePayload) => {
    await dispatch(addStockAdjustment(payload)).unwrap()
    // Reset to page 1 and reload adjustments list
    dispatch(setAdjustmentsPage(1))
    void dispatch(loadStockAdjustments(buildAdjustmentParams(1)))
  }

  const handleViewAdjustment = (adjustment: StockAdjustment) => {
    setSelectedAdjustment(adjustment)
    setShowAdjustmentDetailModal(true)
  }

  const handleApproveAdjustment = async (id: string) => {
    await dispatch(approveAdjustment(id)).unwrap()
    // Reload adjustments list
    void dispatch(loadStockAdjustments(buildAdjustmentParams()))
    setShowAdjustmentDetailModal(false)
    setSelectedAdjustment(null)
  }

  const handleRejectAdjustment = async (id: string) => {
    await dispatch(rejectAdjustment(id)).unwrap()
    // Reload adjustments list
    void dispatch(loadStockAdjustments(buildAdjustmentParams()))
    setShowAdjustmentDetailModal(false)
    setSelectedAdjustment(null)
  }

  const handleEditAdjustment = (adjustment: StockAdjustment) => {
    setEditingAdjustment(adjustment)
    setShowEditAdjustmentModal(true)
    setShowAdjustmentDetailModal(false)
  }

  const handleEditAdjustmentSubmit = async (id: string, payload: StockAdjustmentEditPayload) => {
    await dispatch(editStockAdjustment({ id, payload })).unwrap()
    // Reload adjustments list and close modals
    void dispatch(loadStockAdjustments(buildAdjustmentParams()))
    setShowEditAdjustmentModal(false)
    setEditingAdjustment(null)
  }

  const handleDeleteAdjustment = (adjustment: StockAdjustment) => {
    setAdjustmentToDelete(adjustment)
    setShowDeleteConfirmation(true)
  }

  const handleConfirmDelete = async () => {
    if (!adjustmentToDelete) return
    
    try {
      await dispatch(removeStockAdjustment({ id: adjustmentToDelete.id })).unwrap()
      // Reload adjustments list and close modals
      void dispatch(loadStockAdjustments(buildAdjustmentParams()))
      setShowDeleteConfirmation(false)
      setAdjustmentToDelete(null)
      setShowAdjustmentDetailModal(false)
    } catch {
      // Keep the confirmation modal open to show error
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false)
    setAdjustmentToDelete(null)
  }

  // Adjustment filter handlers
  const handleAdjustmentSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdjustmentSearchTerm(e.target.value)
    dispatch(setAdjustmentsPage(1)) // Reset to first page on search
  }

  const handleAdjustmentStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAdjustmentStatusFilter(e.target.value)
    dispatch(setAdjustmentsPage(1)) // Reset to first page on filter change
  }

  const handleAdjustmentTypeFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAdjustmentTypeFilter(e.target.value)
    dispatch(setAdjustmentsPage(1)) // Reset to first page on filter change
  }

  const handleClearAdjustmentFilters = () => {
    setAdjustmentSearchTerm('')
    setAdjustmentStatusFilter('')
    setAdjustmentTypeFilter('')
    dispatch(setAdjustmentsPage(1))
  }
  
  // ============================================================================
  // New Warehouse Transfer Handlers
  // ============================================================================
  
  const handleViewWarehouseTransfer = async (transfer: WarehouseTransfer) => {
    setSelectedWarehouseTransfer(transfer)
    setShowWarehouseTransferDetailModal(true)
    // Load full details if needed
    void dispatch(loadWarehouseTransferDetail(transfer.id))
  }
  
  const handleCompleteWarehouseTransfer = async (id: string, notes?: string) => {
    try {
      await dispatch(completeWarehouseTransferThunk({ transferId: id, payload: notes ? { notes } : undefined })).unwrap()
      
      // Reload transfers list
      void dispatch(loadWarehouseTransfers())
      setShowWarehouseTransferDetailModal(false)
      dispatch(clearWarehouseTransferMutation('complete'))
    } catch {
      // Keep modal open to show error
    }
  }
  
  const handleCancelWarehouseTransfer = async (id: string, reason: string) => {
    try {
      await dispatch(cancelWarehouseTransferThunk({ transferId: id, payload: { reason } })).unwrap()
      // Reload transfers list
      void dispatch(loadWarehouseTransfers())
      setShowWarehouseTransferDetailModal(false)
      dispatch(clearWarehouseTransferMutation('cancel'))
    } catch {
      // Keep modal open to show error
    }
  }
  
  const handleDeleteWarehouseTransfer = async (id: string, reason: string) => {
    try {
      await dispatch(deleteWarehouseTransferThunk({ transferId: id, reason })).unwrap()
      // Reload transfers list
      void dispatch(loadWarehouseTransfers())
      setShowWarehouseTransferDetailModal(false)
      dispatch(clearWarehouseTransferMutation('delete'))
    } catch {
      // Keep modal open to show error
    }
  }
  
  const handleCloseWarehouseTransferDetail = () => {
    setShowWarehouseTransferDetailModal(false)
    setSelectedWarehouseTransfer(null)
    dispatch(clearWarehouseTransferDetail())
  }

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
        <Nav.Item>
          <Nav.Link active={activeTab === 'stock-adjustments'} onClick={() => setActiveTab('stock-adjustments')}>
            Stock Adjustments
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link active={activeTab === 'transfers'} onClick={() => setActiveTab('transfers')}>
            Transfers
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {/* Stock Products Tab */}
      <div className="space-y-6" style={{ display: activeTab === 'stock-products' ? 'block' : 'none' }}>
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
      </div>


      {/* Transfers Tab */}
      <div className="space-y-6" style={{ display: activeTab === 'transfers' ? 'block' : 'none' }}>
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Warehouse Transfers</h3>
              <p className="text-slate-600">
                Initiate and view recent inter-warehouse transfers. For full analytics and audit trails, see the reporting page.
              </p>
            </div>
            <Button variant="primary" className="rounded-pill px-4" onClick={() => setShowTransferModal(true)}>
              Initiate Transfer
            </Button>
          </div>
          {transferSuccess && (
            <Alert variant="success" className="mb-0 py-1 px-3 d-inline-block mt-3">
              Transfer created. Reference #: <b>{transferSuccess.reference_number}</b>
            </Alert>
          )}
        </section>
        
        {/* Conditional display based on feature flag */}
        {(() => {
          const useNewTransferAPI = import.meta.env.VITE_USE_NEW_TRANSFER_API === 'true'
          
          if (useNewTransferAPI) {
            // NEW: Warehouse Transfer API display
            return (
              <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-slate-900 mb-3">Recent Transfers</h4>
                
                {warehouseTransfersStatus === 'loading' && (
                  <div className="text-center py-4">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2 text-muted">Loading transfers...</p>
                  </div>
                )}
                
                {warehouseTransfersError && (
                  <Alert variant="danger">
                    <Alert.Heading>Error loading transfers</Alert.Heading>
                    <p>{warehouseTransfersError}</p>
                  </Alert>
                )}
                
                {warehouseTransfersStatus === 'succeeded' && (
                  <>
                    <Table responsive hover size="sm" className="align-middle">
                      <thead>
                        <tr>
                          <th>Reference #</th>
                          <th>Date</th>
                          <th>From → To</th>
                          <th>Items</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {warehouseTransfers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center text-muted py-4">
                              No transfers found. Click "Initiate Transfer" to create one.
                            </td>
                          </tr>
                        ) : (
                          warehouseTransfers.slice(0, 10).map((transfer) => {
                            const totalQty = transfer.items.reduce((sum, item) => sum + item.quantity, 0)
                            const getStatusVariant = (status: string) => {
                              const variants: Record<string, string> = {
                                pending: 'warning',
                                in_transit: 'info',
                                completed: 'success',
                                cancelled: 'secondary',
                              }
                              return variants[status] || 'secondary'
                            }
                            
                            return (
                              <tr key={transfer.id}>
                                <td>
                                  <code className="text-xs">{transfer.reference_number}</code>
                                </td>
                                <td>{new Date(transfer.created_at).toLocaleString()}</td>
                                <td>
                                  <div className="text-xs">
                                    <div>{transfer.source_warehouse_name || transfer.source_warehouse}</div>
                                    <div className="text-muted">↓</div>
                                    <div>{transfer.destination_warehouse_name || transfer.destination_warehouse}</div>
                                  </div>
                                </td>
                                <td>
                                  <Badge bg="secondary">
                                    {transfer.items.length} product{transfer.items.length !== 1 ? 's' : ''} ({totalQty} units)
                                  </Badge>
                                </td>
                                <td>
                                  <Badge bg={getStatusVariant(transfer.status)}>
                                    {transfer.status.replace('_', ' ').toUpperCase()}
                                  </Badge>
                                </td>
                                <td>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handleViewWarehouseTransfer(transfer)}
                                  >
                                    View Details
                                  </Button>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </Table>
                    <div className="text-xs text-slate-500 mt-2">
                      Showing {Math.min(10, warehouseTransfers.length)} of {warehouseTransfers.length} recent transfers.
                      For full history and analytics, see the reporting page.
                    </div>
                  </>
                )}
              </section>
            )
          } else {
            // OLD: Grouped adjustments display (legacy)
            return (
              <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-slate-900 mb-3">Recent Transfers (Legacy View)</h4>
                <Table responsive hover size="sm" className="align-middle">
                  <thead>
                    <tr>
                      <th>Reference #</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Source (deducted from)</th>
                      <th>Destination (added to)</th>
                      <th>Products</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedTransfers.slice(0, 10).map((g) => {
                      const sourceName = g.out ? (g.out.stock_product_details?.warehouse || stockProducts.find(sp => sp.id === g.out!.stock_product)?.warehouse_name) : '—'
                      const destName = g.in ? (g.in.stock_product_details?.warehouse || stockProducts.find(sp => sp.id === g.in!.stock_product)?.warehouse_name) : '—'
                      return (
                        <tr key={g.reference}>
                          <td>{g.reference || '—'}</td>
                          <td>{new Date(g.date).toLocaleString()}</td>
                          <td>
                            <Badge bg={(g.out && !g.in) ? 'danger' : (g.in && !g.out) ? 'info' : 'secondary'}>
                              {g.out && g.in ? 'Paired Transfer' : g.out ? 'Transfer Out — deducted from source' : 'Transfer In — added to destination'}
                            </Badge>
                          </td>
                          <td>{sourceName || '—'}</td>
                          <td>{destName || '—'}</td>
                          <td>
                            {g.products.length > 0 ? g.products.map(p => `${p.name} (${formatQuantityWithSign(p.quantity, p.type)})`).join(', ') : '—'}
                          </td>
                          <td>
                            <Badge bg={g.status === 'COMPLETED' ? 'success' : g.status === 'APPROVED' ? 'info' : g.status === 'REJECTED' ? 'danger' : 'warning'}>
                              {g.status}
                            </Badge>
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button variant="link" size="sm" onClick={() => handleViewAdjustment(g.out ?? g.in!)}>
                                View
                              </Button>
                              <Button variant="outline-primary" size="sm" onClick={() => handleEditAdjustment(g.out ?? g.in!)}>
                                Edit
                              </Button>
                              <Button variant="outline-danger" size="sm" onClick={() => handleDeleteAdjustment(g.out ?? g.in!)}>
                                Delete
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  const adj = g.out ?? g.in
                                  if (adj) handleViewAdjustment(adj)
                                }}
                                className="ms-1"
                              >
                                Open & Approve
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
                <div className="text-xs text-slate-500 mt-2">
                  Only the 10 most recent transfers are shown here. For full history and analytics, see the reporting page.
                </div>
              </section>
            )
          }
        })()}
        
        <TransferModal
          show={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          onSubmit={handleSubmitTransfer}
          warehouses={warehouses.map(w => ({ id: w.id, name: w.name }))}
          products={productLookup.map(p => ({ id: p.id, name: p.name }))}
          stockProducts={stockProducts}
          isSubmitting={isSubmittingTransfer}
          error={transferError}
        />
        
        {/* New Warehouse Transfer Detail Modal */}
        <TransferDetailModal
          show={showWarehouseTransferDetailModal}
          onClose={handleCloseWarehouseTransferDetail}
          transfer={warehouseTransferDetail || selectedWarehouseTransfer}
          isLoading={warehouseTransferDetailStatus === 'loading'}
          onComplete={handleCompleteWarehouseTransfer}
          onCancel={handleCancelWarehouseTransfer}
          onDelete={handleDeleteWarehouseTransfer}
          isCompleting={warehouseTransferMutationStatus.complete === 'loading'}
          isCancelling={warehouseTransferMutationStatus.cancel === 'loading'}
          isDeleting={warehouseTransferMutationStatus.delete === 'loading'}
          userRole={userRole || undefined}
        />
      </div>

      {/* Stock Requests Tab */}
      <div className="space-y-6" style={{ display: activeTab === 'stock-requests' ? 'block' : 'none' }}>
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
                key="stock-requests-list"
                requests={forwardTransferRequests}
                storefronts={storefronts}
                isLoading={transferRequestsStatus === 'loading'}
                error={transferRequestsError}
                pagination={stockRequestPagination}
                filters={transferRequestFilters}
                onFilterChange={handleStockRequestFilterChange}
                onPageChange={handleStockRequestPageChange}
                onPageSizeChange={handleStockRequestPageSizeChange}
                onRefresh={handleStockRequestRefresh}
                onViewDetail={handleViewStockRequest}
              />
            </div>

      {/* Stock Adjustments Tab */}
      <div className="space-y-6" style={{ display: activeTab === 'stock-adjustments' ? 'block' : 'none' }}>
        <div className="space-y-6">
          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Stock Adjustments</h3>
                <p className="text-slate-600">
                  Track and manage inventory adjustments for various reasons (damage, theft, expiry, etc.)
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline-primary"
                  className="rounded-pill px-4"
                  onClick={() => {
                    // Filter to show only pending adjustments
                    setAdjustmentStatusFilter('PENDING')
                    dispatch(setAdjustmentsPage(1))
                  }}
                >
                  View Pending
                </Button>
                <Button
                  variant="primary"
                  className="rounded-pill px-4"
                  onClick={() => setShowCreateAdjustmentModal(true)}
                >
                  Create Adjustment
                </Button>
              </div>
            </div>
          </section>

          <div className="d-flex justify-end mb-3">
            <Form.Check
              type="switch"
              id="show-transfers-only-main"
              label="Show transfers only"
              checked={showTransfersOnly}
              onChange={(e) => setShowTransfersOnly(e.target.checked)}
            />
          </div>

          {/* Search and Filters */}
          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="row g-3">
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label className="text-sm font-medium text-slate-700">
                    Search
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Search by product, reason, or creator..."
                    value={adjustmentSearchTerm}
                    onChange={handleAdjustmentSearch}
                  />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group>
                  <Form.Label className="text-sm font-medium text-slate-700">
                    Status
                  </Form.Label>
                  <Form.Select
                    value={adjustmentStatusFilter}
                    onChange={handleAdjustmentStatusFilter}
                  >
                    <option value="">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="COMPLETED">Completed</option>
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group>
                  <Form.Label className="text-sm font-medium text-slate-700">
                    Adjustment Type
                  </Form.Label>
                  <Form.Select
                    value={adjustmentTypeFilter}
                    onChange={handleAdjustmentTypeFilter}
                  >
                    <option value="">All Types</option>
                    <option value="shrinkage">Shrinkage</option>
                    <option value="damaged">Damaged</option>
                    <option value="returned">Returned</option>
                    <option value="miscellaneous">Miscellaneous</option>
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-2">
                <Form.Group>
                  <Form.Label className="text-sm font-medium text-slate-700">
                    &nbsp;
                  </Form.Label>
                  <Button
                    variant="outline-secondary"
                    className="w-100"
                    onClick={handleClearAdjustmentFilters}
                    disabled={!adjustmentSearchTerm && !adjustmentStatusFilter && !adjustmentTypeFilter}
                  >
                    Clear Filters
                  </Button>
                </Form.Group>
              </div>
            </div>
            
            {(adjustmentSearchTerm || adjustmentStatusFilter || adjustmentTypeFilter) && (
              <div className="d-flex gap-2 flex-wrap">
                <small className="text-slate-600">Active filters:</small>
                {adjustmentSearchTerm && (
                  <Badge bg="secondary" className="d-flex align-items-center gap-1">
                    Search: {adjustmentSearchTerm}
                    <button
                      className="btn-close btn-close-white"
                      style={{ fontSize: '0.6rem', padding: '0.25rem' }}
                      onClick={() => {
                        setAdjustmentSearchTerm('')
                        dispatch(setAdjustmentsPage(1))
                      }}
                      aria-label="Clear search"
                    />
                  </Badge>
                )}
                {adjustmentStatusFilter && (
                  <Badge bg="secondary" className="d-flex align-items-center gap-1">
                    Status: {adjustmentStatusFilter}
                    <button
                      className="btn-close btn-close-white"
                      style={{ fontSize: '0.6rem', padding: '0.25rem' }}
                      onClick={() => {
                        setAdjustmentStatusFilter('')
                        dispatch(setAdjustmentsPage(1))
                      }}
                      aria-label="Clear status filter"
                    />
                  </Badge>
                )}
                {adjustmentTypeFilter && (
                  <Badge bg="secondary" className="d-flex align-items-center gap-1">
                    Type: {formatAdjustmentType(adjustmentTypeFilter as AdjustmentType)}
                    <button
                      className="btn-close btn-close-white"
                      style={{ fontSize: '0.6rem', padding: '0.25rem' }}
                      onClick={() => {
                        setAdjustmentTypeFilter('')
                        dispatch(setAdjustmentsPage(1))
                      }}
                      aria-label="Clear type filter"
                    />
                  </Badge>
                )}
              </div>
            )}
          </section>

          {/* Adjustments Table */}
          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {adjustmentsStatus === 'loading' && (
              <div className="text-center py-8">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2 text-slate-600">Loading adjustments...</p>
              </div>
            )}

            {adjustmentsStatus === 'failed' && adjustmentsError && (
              <Alert variant="danger">
                <Alert.Heading>Error loading adjustments</Alert.Heading>
                <p>{adjustmentsError}</p>
              </Alert>
            )}

            {adjustmentsStatus === 'succeeded' && (
              <>
                {showTransfersOnly ? (
                  <Table responsive hover>
                    <thead>
                      <tr>
                        <th>Reference #</th>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Source (deducted from)</th>
                        <th>Destination (added to)</th>
                        <th>Products</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedTransfers.slice(0, 50).map((g) => {
                        const sourceName = g.out ? (g.out.stock_product_details?.warehouse || stockProducts.find(sp => sp.id === g.out!.stock_product)?.warehouse_name) : '—'
                        const destName = g.in ? (g.in.stock_product_details?.warehouse || stockProducts.find(sp => sp.id === g.in!.stock_product)?.warehouse_name) : '—'
                        return (
                          <tr key={g.reference}>
                            <td>{g.reference || '—'}</td>
                            <td>{new Date(g.date).toLocaleString()}</td>
                            <td>
                              <Badge bg={(g.out && !g.in) ? 'danger' : (g.in && !g.out) ? 'info' : 'secondary'}>
                                {g.out && g.in ? 'Paired Transfer' : g.out ? 'Transfer Out — deducted from source' : 'Transfer In — added to destination'}
                              </Badge>
                            </td>
                            <td>{sourceName || '—'}</td>
                            <td>{destName || '—'}</td>
                            <td>{g.products.length > 0 ? g.products.map(p => `${p.name} (${formatQuantityWithSign(p.quantity, p.type)})`).join(', ') : '—'}</td>
                            <td>
                              <Badge bg={g.status === 'COMPLETED' ? 'success' : g.status === 'APPROVED' ? 'info' : g.status === 'REJECTED' ? 'danger' : 'warning'}>
                                {g.status}
                              </Badge>
                            </td>
                            <td>
                              <div className="d-flex gap-1">
                                <Button variant="link" size="sm" onClick={() => handleViewAdjustment(g.out ?? g.in!)}>
                                  View
                                </Button>
                                <Button variant="outline-primary" size="sm" onClick={() => handleEditAdjustment(g.out ?? g.in!)}>
                                  Edit
                                </Button>
                                <Button variant="outline-danger" size="sm" onClick={() => handleDeleteAdjustment(g.out ?? g.in!)}>
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </Table>
                ) : (
                  adjustments.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-600">No stock adjustments found.</p>
                      <p className="text-sm text-slate-500 mt-2">
                        Create your first adjustment to track inventory changes.
                      </p>
                    </div>
                  ) : (
                    <>
                      <Table responsive hover>
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Stock Product</th>
                            <th>Quantity</th>
                            <th>Reason</th>
                            <th>Status</th>
                            <th>Created By</th>
                            <th>Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleAdjustments.map((adjustment) => (
                            <tr key={adjustment.id}>
                              <td>
                                <span style={{ marginRight: '0.5rem' }}>
                                  {getAdjustmentIcon(adjustment.adjustment_type)}
                                </span>
                                <Badge bg={getAdjustmentColor(adjustment.adjustment_type)}>
                                  {formatAdjustmentType(adjustment.adjustment_type)}
                                </Badge>
                              </td>
                              <td>
                                {adjustment.stock_product_details?.product_name || `Stock #${adjustment.stock_product}`}
                              </td>
                              <td>
                                <span className={adjustment.is_increase ? 'text-success' : 'text-danger'}>
                                  {adjustment.is_increase ? '+' : '-'}
                                  {adjustment.quantity}
                                </span>
                              </td>
                              <td>{adjustment.reason || '-'}</td>
                              <td>
                                <Badge 
                                  bg={
                                    adjustment.status === 'COMPLETED' ? 'success' :
                                    adjustment.status === 'APPROVED' ? 'info' :
                                    adjustment.status === 'REJECTED' ? 'danger' :
                                    'warning'
                                  }
                                >
                                  {adjustment.status}
                                </Badge>
                              </td>
                              <td>{adjustment.created_by_name || 'System'}</td>
                              <td>{new Date(adjustment.created_at).toLocaleDateString()}</td>
                              <td>
                                <div className="d-flex gap-1">
                                  <Button
                                    variant="link"
                                    size="sm"
                                    onClick={() => handleViewAdjustment(adjustment)}
                                  >
                                    View
                                  </Button>
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => handleEditAdjustment(adjustment)}
                                    disabled={updateAdjustmentStatus === 'loading'}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleDeleteAdjustment(adjustment)}
                                    disabled={deleteAdjustmentStatus === 'loading'}
                                  >
                                    Delete
                                  </Button>
                                  {adjustment.status === 'PENDING' && adjustment.requires_approval && (
                                    <Fragment key={`actions-${adjustment.id}`}>
                                      <Button
                                        variant="success"
                                        size="sm"
                                        onClick={() => handleApproveAdjustment(adjustment.id)}
                                        disabled={approveAdjustmentStatus === 'loading'}
                                      >
                                        Approve
                                      </Button>
                                      <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => handleRejectAdjustment(adjustment.id)}
                                        disabled={rejectAdjustmentStatus === 'loading'}
                                      >
                                        Reject
                                      </Button>
                                    </Fragment>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>

                      {/* Pagination */}
                      {adjustmentsPagination && adjustmentsPagination.count > 0 && (
                        <div className="d-flex justify-content-between align-items-center mt-4">
                          <div className="text-slate-600">
                            Showing {((adjustmentsPage - 1) * 20) + 1} to{' '}
                            {Math.min(adjustmentsPage * 20, adjustmentsPagination.count)} of{' '}
                            {adjustmentsPagination.count} adjustments
                          </div>
                          <div className="d-flex gap-2">
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              disabled={!adjustmentsPagination.previous}
                              onClick={() => {
                                if (adjustmentsPage > 1) {
                                  dispatch(setAdjustmentsPage(adjustmentsPage - 1))
                                  void dispatch(loadStockAdjustments(buildAdjustmentParams(adjustmentsPage - 1)))
                                }
                              }}
                            >
                              Previous
                            </Button>
                            <span className="d-flex align-items-center px-3">
                              Page {adjustmentsPage} of {Math.ceil(adjustmentsPagination.count / 20)}
                            </span>
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              disabled={!adjustmentsPagination.next}
                              onClick={() => {
                                dispatch(setAdjustmentsPage(adjustmentsPage + 1))
                                void dispatch(loadStockAdjustments(buildAdjustmentParams(adjustmentsPage + 1)))
                              }}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )
                )}
              </>
            )}
          </section>
        </div>
      </div>

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
        stockProducts={stockProducts}
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
        onEditFulfilled={handleEditFulfilled}
        isCancelling={transferRequestMutationStatus.cancel === 'loading'}
        isFulfilling={transferRequestMutationStatus.fulfill === 'loading'}
        isUpdatingStatus={transferRequestMutationStatus.updateStatus === 'loading'}
        cancelError={transferRequestMutationErrors.cancel}
        fulfillError={transferRequestMutationErrors.fulfill}
        updateStatusError={transferRequestMutationErrors.updateStatus}
      />

      <EditFulfilledRequestModal
        show={showEditFulfilledModal}
        request={editingRequest}
        onHide={handleCancelEditFulfilled}
        onSubmit={handleSaveEditFulfilled}
        isSubmitting={transferRequestMutationStatus.update === 'loading'}
      />

      <CreateAdjustmentModal
        show={showCreateAdjustmentModal}
        onClose={() => setShowCreateAdjustmentModal(false)}
        onSubmit={handleCreateAdjustment}
        isSubmitting={createAdjustmentStatus === 'loading'}
        error={createAdjustmentError}
      />

      <AdjustmentDetailModal
        show={showAdjustmentDetailModal}
        onClose={() => {
          setShowAdjustmentDetailModal(false)
          setSelectedAdjustment(null)
        }}
        adjustment={selectedAdjustment}
        onApprove={handleApproveAdjustment}
        onReject={handleRejectAdjustment}
        onEdit={handleEditAdjustment}
        onDelete={handleDeleteAdjustment}
        isApproving={approveAdjustmentStatus === 'loading'}
        isRejecting={rejectAdjustmentStatus === 'loading'}
        isDeleting={deleteAdjustmentStatus === 'loading'}
      />

      <EditAdjustmentModal
        show={showEditAdjustmentModal}
        onClose={() => {
          setShowEditAdjustmentModal(false)
          setEditingAdjustment(null)
        }}
        adjustment={editingAdjustment}
        onSubmit={handleEditAdjustmentSubmit}
        isSubmitting={updateAdjustmentStatus === 'loading'}
        error={updateAdjustmentError}
      />

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteConfirmation} onHide={handleCancelDelete}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteAdjustmentError && (
            <Alert variant="danger" className="mb-3">
              <Alert.Heading>Error</Alert.Heading>
              <p className="mb-0">{deleteAdjustmentError}</p>
            </Alert>
          )}
          <Alert variant="danger">
            <Alert.Heading>⚠️ Warning: Permanent Action</Alert.Heading>
            <p>
              Are you sure you want to delete this stock adjustment?
            </p>
            {adjustmentToDelete && (
              <div className="mt-3">
                <strong>Details:</strong>
                <ul className="mb-0 mt-2">
                  <li><strong>Product:</strong> {adjustmentToDelete.stock_product_details?.product_name}</li>
                  <li><strong>Type:</strong> {formatAdjustmentType(adjustmentToDelete.adjustment_type)}</li>
                  <li><strong>Quantity:</strong> {adjustmentToDelete.is_increase ? '+' : '-'}{adjustmentToDelete.quantity}</li>
                  <li><strong>Status:</strong> <Badge bg={
                    adjustmentToDelete.status === 'COMPLETED' ? 'success' :
                    adjustmentToDelete.status === 'APPROVED' ? 'info' :
                    adjustmentToDelete.status === 'REJECTED' ? 'danger' :
                    'warning'
                  }>{adjustmentToDelete.status}</Badge></li>
                </ul>
              </div>
            )}
            <p className="mt-3 mb-0">
              <strong>This action cannot be undone!</strong>
              {adjustmentToDelete?.status === 'COMPLETED' && (
                <span className="text-danger d-block mt-2">
                  ⚠️ This adjustment is COMPLETED. Deleting it may cause inventory discrepancies!
                </span>
              )}
            </p>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancelDelete}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmDelete}
            disabled={deleteAdjustmentStatus === 'loading'}
          >
            {deleteAdjustmentStatus === 'loading' ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Deleting...
              </>
            ) : (
              'Yes, Delete Adjustment'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default ManageStocksPage
