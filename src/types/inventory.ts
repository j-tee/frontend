import type { StockAlertType, TransferStatus, UUID } from './common'

export interface Category {
  id: UUID
  name: string
  description?: string
  parent?: UUID | null
  children?: Category[]
}

export interface CategoryPayload {
  name: string
  description?: string
  parent?: UUID | null
}

export interface Warehouse {
  id: UUID
  name: string
  location: string
  manager?: UUID | null
  manager_name?: string | null
  created_at?: string
  updated_at?: string
}

export interface Storefront {
  id: UUID
  user: UUID
  name: string
  location: string
  manager?: UUID | null
  user_name?: string
  manager_name?: string | null
  created_at?: string
  updated_at?: string
}

export interface Product {
  id: UUID
  name: string
  sku: string
  category: UUID
  unit: string
  retail_price: number
  wholesale_price: number
  cost: number
  description?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
  category_name?: string
}

export interface ProductPayload {
  name: string
  sku: string
  category: UUID
  unit: string
  retail_price: number
  wholesale_price: number
  cost: number
  description?: string
  is_active?: boolean
}

export interface StockLot {
  id: UUID
  warehouse: UUID
  product: UUID
  quantity: number
  unit_cost: number
  supplier?: string
  reference_code?: string
  arrival_date?: string
  expiry_date?: string
  unit_tax_rate?: number
  unit_tax_amount?: number
  unit_additional_cost?: number
  description?: string
  landed_unit_cost?: number
  total_tax_amount?: number
  total_additional_cost?: number
  total_landed_cost?: number
}

export interface InventorySnapshot {
  id: UUID
  warehouse: UUID
  product: UUID
  stock: UUID | null
  quantity: number
  landed_unit_cost?: number
}

export interface Transfer {
  id: UUID
  product: UUID
  stock?: UUID | null
  from_warehouse: UUID
  to_storefront: UUID
  quantity: number
  status: TransferStatus
  requested_by: UUID
  approved_by?: UUID | null
  note?: string
}

export interface StockAlert {
  id: UUID
  product: UUID
  warehouse: UUID
  alert_type: StockAlertType
  current_quantity: number
  threshold_quantity: number
  is_resolved: boolean
  resolved_at?: string | null
}

export interface StorefrontPayload {
  name: string
  location: string
  manager?: UUID | null
  business?: UUID
}

export interface WarehousePayload {
  name: string
  location: string
  manager?: UUID | null
  business?: UUID
}

export interface OwnerWorkspaceSnapshot {
  business: {
    id: UUID
    name: string
    storefront_count: number
    warehouse_count: number
  }
  storefronts: Storefront[]
  warehouses: Warehouse[]
}
