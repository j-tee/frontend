import httpClient from './httpClient.js'
import type { PaginatedResponse } from '../types/common.js'
import type {
  Category,
  CategoryPayload,
  InventorySnapshot,
  OwnerWorkspaceSnapshot,
  Product,
  ProductPayload,
  StockAlert,
  StockLot,
  Storefront,
  StorefrontPayload,
  Transfer,
  Warehouse,
  WarehousePayload,
} from '../types/inventory.js'

export const fetchCategories = async () => {
  const { data } = await httpClient.get<PaginatedResponse<Category> | Category[]>(
    '/inventory/api/categories/',
  )
  return extractResults(data)
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

export const fetchWarehouses = async () => {
  const { data } = await httpClient.get<PaginatedResponse<Warehouse> | Warehouse[]>(
    '/inventory/api/warehouses/',
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

export const fetchStorefronts = async () => {
  const { data } = await httpClient.get<PaginatedResponse<Storefront> | Storefront[]>(
    '/inventory/api/storefronts/',
  )
  return extractResults(data)
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
  const { data } = await httpClient.get<PaginatedResponse<Product> | Product[]>(
    '/inventory/api/products/',
    { params },
  )
  return extractResults(data)
}

export const createProduct = async (payload: ProductPayload) => {
  const { data } = await httpClient.post<Product>(
    '/inventory/api/products/',
    payload,
  )
  return data
}

export const fetchStockLots = async (params?: Record<string, unknown>) => {
  const { data } = await httpClient.get<PaginatedResponse<StockLot>>(
    '/inventory/api/stock/',
    { params },
  )
  return data
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
