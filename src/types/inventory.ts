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
  business?: UUID
  business_name?: string
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
  business?: UUID
  business_name?: string
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
  description?: string
  is_active?: boolean
}

export interface StockBatchItemSummary {
  id: UUID
  product: UUID
  product_name?: string
  product_sku?: string
  supplier?: UUID | null
  supplier_name?: string | null
  expiry_date?: string | null
  quantity: number
  unit_cost: string
  unit_tax_rate?: string | null
  unit_tax_amount?: string | null
  unit_additional_cost?: string | null
  retail_price?: string | null
  wholesale_price?: string | null
  landed_unit_cost?: string | null
  total_tax_amount?: string | null
  total_additional_cost?: string | null
  total_landed_cost?: string | null
  description?: string | null
  created_at?: string
  updated_at?: string
}

export interface StockBatch {
  id: UUID
  warehouse: UUID
  warehouse_name?: string
  arrival_date?: string | null
  description?: string | null
  created_at?: string
  updated_at?: string
  items?: StockBatchItemSummary[]
}

export interface StockBatchPayload {
  warehouse: UUID
  arrival_date?: string | null
  description?: string | null
}

export interface Supplier {
  id: UUID
  name: string
  contact_person?: string | null
  email?: string | null
  phone_number?: string | null
  address?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export interface SupplierPayload {
  name: string
  contact_person?: string | null
  email?: string | null
  phone_number?: string | null
  address?: string | null
  notes?: string | null
}

export interface StockProduct {
  id: UUID
  stock: UUID
  stock_batch?: UUID
  warehouse_name?: string
  product: UUID
  product_name?: string
  product_sku?: string
  supplier?: UUID | null
  supplier_name?: string | null
  quantity: number
  unit_cost: string
  unit_tax_rate?: string | null
  unit_tax_amount?: string | null
  unit_additional_cost?: string | null
  retail_price?: string | null
  wholesale_price?: string | null
  landed_unit_cost?: string | null
  total_base_cost?: string | null
  total_tax_amount?: string | null
  total_additional_cost?: string | null
  total_landed_cost?: string | null
  projected_retail_profit?: string | null
  projected_wholesale_profit?: string | null
  expiry_date?: string | null
  description?: string | null
  created_at?: string
  updated_at?: string
}

export interface StockProductPayload {
  stock: UUID
  stock_batch?: UUID
  product: UUID
  supplier?: UUID | null
  quantity: number
  unit_cost: string
  unit_tax_rate?: string | null
  unit_tax_amount?: string | null
  unit_additional_cost?: string | null
  retail_price?: string | null
  wholesale_price?: string | null
  expiry_date?: string | null
  description?: string | null
}

export interface InventorySnapshot {
  id: UUID
  warehouse: UUID
  product: UUID
  stock_product: UUID | null
  quantity: number
  landed_unit_cost?: number
  stock_arrival_date?: string | null
  stock_supplier?: string | null
}

export interface Transfer {
  id: UUID
  product: UUID
  stock_product?: UUID | null
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
  stock_product?: UUID | null
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
