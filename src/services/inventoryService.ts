import httpClient from './httpClient.js'
import type { PaginatedResponse, UUID } from '../types/common.js'
import type {
  Category,
  CategoryPayload,
  EmployeeWorkspaceResponse,
  InventorySnapshot,
  OwnerWorkspaceSnapshot,
  Product,
  ProductPayload,
  SaleCatalogResponse,
  MultiStorefrontCatalogResponse,
  CatalogFilters,
  StockAlert,
  StockBatch,
  StockBatchPayload,
  StockProduct,
  StockProductPayload,
  StockReconciliationResponse,
  Supplier,
  SupplierPayload,
  Storefront,
  StorefrontPayload,
  Transfer,
  TransferApprovePayload,
  TransferConfirmReceiptPayload,
  TransferCreatePayload,
  TransferFulfillmentPayload,
  TransferRejectPayload,
  TransferRequest,
  TransferRequestCancelPayload,
  TransferRequestCreatePayload,
  TransferRequestFulfillPayload,
  TransferRequestUpdatePayload,
  TransferRequestUpdateStatusPayload,
  TransferUpdatePayload,
  Warehouse,
  WarehousePayload,
  WarehouseAvailabilityResponse,
  StorefrontAvailabilityResponse,
} from '../types/inventory.js'
import type { StockAdjustment } from '../types/stockAdjustments.js'

export const fetchCategories = async () => {
  const { data } = await httpClient.get<PaginatedResponse<Category> | Category[]>(
    '/inventory/api/categories/',

  )
  return extractResults(data)
}

export const fetchSaleCatalog = async (storefrontId: UUID, filters?: CatalogFilters) => {
  const { data } = await httpClient.get<SaleCatalogResponse>(
    `/inventory/api/storefronts/${storefrontId}/sale-catalog/`,
    { params: filters }
  )
  return data
}

/**
 * Fetch multi-storefront catalog - Returns products from ALL storefronts accessible to the user
 * 
 * For business owners: Returns products from all storefronts in their business
 * For employees: Returns products from storefronts they're assigned to
 * 
 * @param filters Optional query parameters for filtering and pagination
 * @returns Promise with multi-storefront catalog response
 */
export const fetchMultiStorefrontCatalog = async (filters?: CatalogFilters) => {
  const { data } = await httpClient.get<MultiStorefrontCatalogResponse>(
    '/inventory/api/storefronts/multi-storefront-catalog/',
    { params: filters }
  )
  return data
}

export const createCategory = async (payload: CategoryPayload) => {
  const { data } = await httpClient.post<Category>('/inventory/api/categories/', payload)
  return data
}

const extractResults = <T>(data: PaginatedResponse<T> | T[]): T[] => {
  if (Array.isArray(data)) {
    return data
  }
  return data.results ?? []
}

interface FetchWarehousesParams {
  business?: string
}

export const fetchWarehouses = async (params?: FetchWarehousesParams) => {
  const requestParams = params?.business ? { business: params.business } : undefined
  const { data } = await httpClient.get<PaginatedResponse<Warehouse> | Warehouse[]>(
    '/inventory/api/warehouses/',
    { params: requestParams },
  )
  return extractResults(data)
}

export const createWarehouse = async (payload: WarehousePayload) => {
  if (import.meta.env.DEV) {
    console.debug('[inventory] creating warehouse', payload)
  }
  const { data } = await httpClient.post<Warehouse>(
    '/inventory/api/warehouses/',
    payload,
  )
  if (import.meta.env.DEV) {
    console.debug('[inventory] warehouse created', data)
  }
  return data
}

export const updateWarehouse = async (warehouseId: string, payload: Partial<WarehousePayload>) => {
  const { data } = await httpClient.patch<Warehouse>(
    `/inventory/api/warehouses/${warehouseId}/`,
    payload,
  )
  return data
}

export const deleteWarehouse = async (warehouseId: string) => {
  await httpClient.delete(`/inventory/api/warehouses/${warehouseId}/`)
}

interface FetchStorefrontsParams {
  page?: number
  business?: string
}

export const fetchStorefronts = async (params?: FetchStorefrontsParams) => {
  const page = params?.page ?? 1
  const requestParams: Record<string, unknown> = { page }
  if (params?.business) {
    requestParams.business = params.business
  }
  const { data } = await httpClient.get<PaginatedResponse<Storefront>>(
    '/inventory/api/storefronts/',
    {
      params: requestParams,
    },
  )
  return {
    ...data,
    page,
  }
}

export const fetchStorefront = async (storefrontId: string) => {
  const { data } = await httpClient.get<Storefront>(`/inventory/api/storefronts/${storefrontId}/`)
  return data
}

export const createStorefront = async (payload: StorefrontPayload) => {
  if (import.meta.env.DEV) {
    console.debug('[inventory] creating storefront', payload)
  }
  const { data } = await httpClient.post<Storefront>(
    '/inventory/api/storefronts/',
    payload,
  )
  if (import.meta.env.DEV) {
    console.debug('[inventory] storefront created', data)
  }
  return data
}

export const updateStorefront = async (storefrontId: string, payload: Partial<StorefrontPayload>) => {
  const { data } = await httpClient.patch<Storefront>(
    `/inventory/api/storefronts/${storefrontId}/`,
    payload,
  )
  return data
}

export const deleteStorefront = async (storefrontId: string) => {
  await httpClient.delete(`/inventory/api/storefronts/${storefrontId}/`)
}

export const fetchProducts = async (params?: Record<string, unknown>) => {
  const { data } = await httpClient.get<PaginatedResponse<Product>>(
    '/inventory/api/products/',
    { params },
  )
  return data
}

export const createProduct = async (payload: ProductPayload) => {
  const { data } = await httpClient.post<Product>(
    '/inventory/api/products/',
    payload,
  )
  return data
}

export const fetchStockBatches = async (params?: Record<string, unknown>) => {
  const { data } = await httpClient.get<PaginatedResponse<StockBatch>>(
    '/inventory/api/stock/',
    { params },
  )
  return data
}

export const createStockBatch = async (payload: StockBatchPayload) => {
  const { data } = await httpClient.post<StockBatch>(
    '/inventory/api/stock/',
    payload,
  )
  return data
}

export const updateStockBatch = async (stockBatchId: string, payload: Partial<StockBatchPayload>) => {
  const { data } = await httpClient.patch<StockBatch>(
    `/inventory/api/stock/${stockBatchId}/`,
    payload,
  )
  return data
}

export const deleteStockBatch = async (stockBatchId: string) => {
  await httpClient.delete(`/inventory/api/stock/${stockBatchId}/`)
}

export const fetchStockProducts = async (params?: Record<string, unknown>) => {
  const { data } = await httpClient.get<PaginatedResponse<StockProduct>>(
    '/inventory/api/stock-products/',
    { params },
  )
  return data
}

export const searchStockProducts = async (params?: Record<string, unknown>) => {
  const { data } = await httpClient.get<PaginatedResponse<StockProduct>>(
    '/inventory/api/stock-products/search/',
    { params },
  )
  return data
}

export const createStockProduct = async (payload: StockProductPayload) => {
  const { data } = await httpClient.post<StockProduct>(
    '/inventory/api/stock-products/',
    payload,
  )
  return data
}

export const updateStockProduct = async (
  stockProductId: string,
  payload: Partial<StockProductPayload>,
) => {
  const { data } = await httpClient.patch<StockProduct>(
    `/inventory/api/stock-products/${stockProductId}/`,
    payload,
  )
  return data
}

export const deleteStockProduct = async (stockProductId: string) => {
  await httpClient.delete(`/inventory/api/stock-products/${stockProductId}/`)
}

export const fetchSuppliers = async (params?: Record<string, unknown>) => {
  const { data } = await httpClient.get<PaginatedResponse<Supplier>>(
    '/inventory/api/suppliers/',
    { params },
  )
  return data
}

export const createSupplier = async (payload: SupplierPayload) => {
  const { data } = await httpClient.post<Supplier>(
    '/inventory/api/suppliers/',
    payload,
  )
  return data
}

export const updateSupplier = async (supplierId: string, payload: Partial<SupplierPayload>) => {
  const { data } = await httpClient.patch<Supplier>(
    `/inventory/api/suppliers/${supplierId}/`,
    payload,
  )
  return data
}

export const deleteSupplier = async (supplierId: string) => {
  await httpClient.delete(`/inventory/api/suppliers/${supplierId}/`)
}

export const fetchInventorySnapshot = async (params?: Record<string, unknown>) => {
  const { data } = await httpClient.get<PaginatedResponse<InventorySnapshot>>(
    '/inventory/api/inventory/',
    { params },
  )
  return data
}

export const fetchTransfers = async (params?: Record<string, unknown>) => {
  const { data } = await httpClient.get<PaginatedResponse<Transfer>>(
    '/inventory/api/transfers/',
    { params },
  )
  return data
}

export const fetchStockAlerts = async (params?: Record<string, unknown>) => {
  const { data } = await httpClient.get<PaginatedResponse<StockAlert>>(
    '/inventory/api/stock-alerts/',
    { params },
  )
  return data
}

export const fetchOwnerWorkspace = async () => {
  const { data } = await httpClient.get<OwnerWorkspaceSnapshot>(
    '/inventory/api/owner/workspace/',
  )
  return data
}

// Transfer Request APIs (Stock Request workflow)

export const fetchTransferRequests = async (params?: Record<string, unknown>) => {
  const { data } = await httpClient.get<PaginatedResponse<TransferRequest>>(
    '/inventory/api/transfer-requests/',
    { params },
  )
  return data
}

export const fetchTransferRequestDetail = async (id: string) => {
  const { data} = await httpClient.get<TransferRequest>(
    `/inventory/api/transfer-requests/${id}/`,
  )
  return data
}

export const createTransferRequest = async (payload: TransferRequestCreatePayload) => {
  const { data } = await httpClient.post<TransferRequest>(
    '/inventory/api/transfer-requests/',
    payload,
  )
  return data
}

export const updateTransferRequest = async (id: string, payload: TransferRequestUpdatePayload) => {
  const { data } = await httpClient.patch<TransferRequest>(
    `/inventory/api/transfer-requests/${id}/`,
    payload,
  )
  return data
}

export const cancelTransferRequest = async (id: string, payload?: TransferRequestCancelPayload) => {
  const { data } = await httpClient.post<TransferRequest>(
    `/inventory/api/transfer-requests/${id}/cancel/`,
    payload,
  )
  return data
}

export const fulfillTransferRequest = async (id: string, payload?: TransferRequestFulfillPayload) => {
  const { data } = await httpClient.post<TransferRequest>(
    `/inventory/api/transfer-requests/${id}/fulfill/`,
    payload,
  )
  return data
}

export const updateTransferRequestStatus = async (id: string, payload: TransferRequestUpdateStatusPayload) => {
  const { data } = await httpClient.post<TransferRequest>(
    `/inventory/api/transfer-requests/${id}/update-status/`,
    payload,
  )
  return data
}

// Transfer APIs (continuation of workflow)

export const fetchTransferDetail = async (id: string) => {
  const { data } = await httpClient.get<Transfer>(
    `/inventory/api/transfers/${id}/`,
  )
  return data
}

export const createTransfer = async (payload: TransferCreatePayload) => {
  const { data } = await httpClient.post<Transfer>(
    '/inventory/api/transfers/',
    payload,
  )
  return data
}

export const updateTransfer = async (id: string, payload: TransferUpdatePayload) => {
  const { data } = await httpClient.patch<Transfer>(
    `/inventory/api/transfers/${id}/`,
    payload,
  )
  return data
}

export const deleteTransfer = async (id: string) => {
  await httpClient.delete(`/inventory/api/transfers/${id}/`)
}

export const submitTransfer = async (id: string) => {
  const { data } = await httpClient.post<Transfer>(
    `/inventory/api/transfers/${id}/submit/`,
  )
  return data
}

export const approveTransfer = async (id: string, payload?: TransferApprovePayload) => {
  const { data } = await httpClient.post<Transfer>(
    `/inventory/api/transfers/${id}/approve/`,
    payload,
  )
  return data
}

export const rejectTransfer = async (id: string, payload: TransferRejectPayload) => {
  const { data } = await httpClient.post<Transfer>(
    `/inventory/api/transfers/${id}/reject/`,
    payload,
  )
  return data
}

export const markTransferInTransit = async (id: string, payload?: TransferFulfillmentPayload) => {
  const { data } = await httpClient.post<Transfer>(
    `/inventory/api/transfers/${id}/dispatch/`,
    payload,
  )
  return data
}

export const completeTransfer = async (id: string, payload?: TransferFulfillmentPayload) => {
  const { data } = await httpClient.post<Transfer>(
    `/inventory/api/transfers/${id}/complete/`,
    payload,
  )
  return data
}

export const cancelTransfer = async (id: string) => {
  const { data } = await httpClient.post<Transfer>(
    `/inventory/api/transfers/${id}/cancel/`,
  )
  return data
}

export const confirmTransferReceipt = async (id: string, payload?: TransferConfirmReceiptPayload) => {
  const { data } = await httpClient.post<Transfer>(
    `/inventory/api/transfers/${id}/confirm-receipt/`,
    payload,
  )
  return data
}

// Workspace Dashboard API

export const fetchEmployeeWorkspace = async () => {
  const { data } = await httpClient.get<EmployeeWorkspaceResponse>(
    '/inventory/api/employee/workspace/',
  )
  return data
}

export const fetchWarehouseAvailability = async (warehouseId: string, productId: string) => {
  const { data } = await httpClient.get<WarehouseAvailabilityResponse>(
    '/inventory/api/stock/availability/',
    {
      params: {
        warehouse: warehouseId,
        product: productId,
      },
    },
  )

  return data
}

export const fetchStorefrontAvailability = async (storefrontId: string, productId: string) => {
  const { data } = await httpClient.get<StorefrontAvailabilityResponse>(
    `/inventory/api/storefronts/${storefrontId}/stock-products/${productId}/availability/`,
  )
  return data
}

export const fetchProductStockReconciliation = async (productId: string) => {
  const { data } = await httpClient.get<StockReconciliationResponse>(
    `/inventory/api/products/${productId}/stock-reconciliation/`,
  )
  return data
}

export const fetchStockAdjustments = async (params: {
  stock_product: string
  status?: string
  page?: number
  page_size?: number
}) => {
  const { data } = await httpClient.get<PaginatedResponse<StockAdjustment>>(
    '/inventory/api/stock-adjustments/',
    {
      params,
    },
  )
  return data
}
