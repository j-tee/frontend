import type { StockAlertType, TransferStatus, TransferRequestStatus, TransferRequestPriority, TransferDirection, UUID } from './common'

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
  business?: UUID
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
  quantity_stocked?: number | null
  quantity_available?: number | null
  quantity_sold?: number | null
  reserved_quantity?: number | null
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

export interface WarehouseAvailabilityResponse {
  warehouse?: UUID | null
  product?: UUID | null
  stock_product?: UUID | null
  available_quantity?: number | string | null
  requested_quantity?: number | string | null
  reserved_quantity?: number | string | null
  unreserved_quantity?: number | string | null
  total_available?: number | string | null
  batches?: Array<{
    id?: UUID
    quantity?: number | string | null
    available_quantity?: number | string | null
    reserved_quantity?: number | string | null
    retail_price?: number | string | null
    wholesale_price?: number | string | null
  }>
}

export interface StorefrontAvailabilityResponse {
  storefront?: UUID | null
  product?: UUID | null
  total_available?: number | string | null
  unreserved_quantity?: number | string | null
  reserved_quantity?: number | string | null
  batches?: Array<{
    id?: UUID
    stock_product?: UUID | null
    quantity?: number | string | null
    available_quantity?: number | string | null
    reserved_quantity?: number | string | null
  }>
  reservations?: Array<{
    sale?: UUID | null
    sale_reference?: string | null
    quantity?: number | string | null
    expires_at?: string | null
  }>
}

export interface SaleCatalogItem {
  product_id: UUID
  product_name: string
  sku: string
  barcode?: string | null
  category_name?: string | null
  unit?: string | null
  product_image?: string | null
  available_quantity: number
  retail_price: string
  wholesale_price?: string | null
  stock_product_ids: UUID[]
  last_stocked_at?: string | null
}

export interface SaleCatalogResponse {
  storefront: UUID
  products: SaleCatalogItem[]
  // Pagination support (optional - for future server-side filtering)
  count?: number
  next?: string | null
  previous?: string | null
  page_size?: number
  total_pages?: number
  current_page?: number
}

// Multi-Storefront Catalog Types
export interface StorefrontLocation {
  storefront_id: UUID
  storefront_name: string
  available_quantity: number
}

export interface MultiStorefrontCatalogItem {
  product_id: UUID
  product_name: string
  sku: string
  barcode?: string | null
  category_name?: string | null
  unit?: string | null
  product_image?: string | null
  total_available: number
  retail_price: string
  wholesale_price?: string | null
  stock_product_ids: UUID[]
  locations: StorefrontLocation[]
  last_stocked_at?: string | null
}

export interface AccessibleStorefront {
  id: UUID
  name: string
  business_id: UUID
  business_name: string
}

export interface MultiStorefrontCatalogResponse {
  storefronts: AccessibleStorefront[]
  products: MultiStorefrontCatalogItem[]
  total_products: number
  total_storefronts: number
  message?: string
  // Pagination support (optional - for future server-side filtering)
  count?: number
  next?: string | null
  previous?: string | null
  page_size?: number
  total_pages?: number
  current_page?: number
}

// Catalog filter parameters
export interface CatalogFilters {
  search?: string
  category?: UUID
  min_price?: number
  max_price?: number
  in_stock_only?: boolean
  page?: number
  page_size?: number
  storefront?: UUID[]  // For multi-storefront filtering
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

export interface StockReconciliationWarehouseEntry {
  warehouse?: UUID | null
  warehouse_name?: string | null
  recorded_quantity?: number | string | null
  inventory_on_hand?: number | string | null
}

export interface StockReconciliationStorefrontEntry {
  storefront?: UUID | null
  storefront_name?: string | null
  location?: string | null
  on_hand?: number | string | null
  linked_reservations?: number | string | null
  orphaned_reservations?: number | string | null
  transferred_quantity?: number | string | null
  sold_quantity?: number | string | null
  last_transfer_date?: string | null
}

export interface StockReconciliationReservationDetail {
  sale?: UUID | null
  sale_reference?: string | null
  cart_session_id?: UUID | null
  quantity?: number | string | null
  status?: string | null
  expires_at?: string | null
  storefront?: UUID | null
  storefront_name?: string | null
}

export interface StockReconciliationFormula {
  warehouse_inventory_on_hand?: number | string | null
  warehouse_unreserved_units?: number | string | null
  storefront_on_hand?: number | string | null
  storefront_sellable_units?: number | string | null
  completed_sales_units?: number | string | null
  shrinkage_units?: number | string | null
  correction_units?: number | string | null
  active_reservations_units?: number | string | null
  calculated_baseline?: number | string | null
  recorded_batch_quantity?: number | string | null
  baseline_vs_recorded_delta?: number | string | null
  net_adjustment_units?: number | string | null
}

export interface StockReconciliationResponse {
  product?: UUID | null
  generated_at?: string | null
  warehouse?: {
    recorded_quantity?: number | string | null
    inventory_on_hand?: number | string | null
    inventory_breakdown?: StockReconciliationWarehouseEntry[]
  }
  storefront?: {
    total_on_hand?: number | string | null
    sellable_now?: number | string | null
    entries?: StockReconciliationStorefrontEntry[]
  }
  sales?: {
    completed_units?: number | string | null
    completed_value?: number | string | null
  }
  adjustments?: {
    shrinkage_units?: number | string | null
    correction_units?: number | string | null
  }
  reservations?: {
    linked_units?: number | string | null
    orphaned_units?: number | string | null
    details?: StockReconciliationReservationDetail[]
  }
  formula?: StockReconciliationFormula
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

// Transfer Request & Transfer types (Stock Request workflow)

export interface TransferRequestLineItem {
  id: UUID
  product: UUID
  product_name: string
  requested_quantity: number
  approved_quantity?: number | null
  fulfilled_quantity?: number | null
  status?: TransferRequestStatus | null
  unit_of_measure: string
  notes?: string | null
}

export interface TransferRequest {
  id: UUID
  business: UUID
  storefront: UUID
  storefront_name: string
  direction: TransferDirection  // FORWARD (warehouse→storefront) or REVERSE (storefront→warehouse)
  requested_by: UUID
  requested_by_name: string
  priority: TransferRequestPriority
  status: TransferRequestStatus
  notes?: string | null
  linked_transfer_reference?: string | null
  linked_transfer_id?: UUID | null
  assigned_at?: string | null
  fulfilled_at?: string | null
  fulfilled_by?: UUID | null
  cancelled_at?: string | null
  line_items: TransferRequestLineItem[]
  created_at: string
  updated_at: string
}

export interface TransferRequestCreatePayload {
  storefront: UUID
  direction: TransferDirection  // FORWARD for stock requests, REVERSE for returns
  priority: TransferRequestPriority
  notes?: string
  line_items: Array<{
    product: UUID
    requested_quantity: number
    unit_of_measure: string
    notes?: string
  }>
}

export interface TransferRequestUpdatePayload {
  priority?: TransferRequestPriority
  notes?: string
  line_items?: Array<{
    id?: UUID  // Include ID for existing items to update
    product: UUID
    requested_quantity: number
    unit_of_measure: string
    notes?: string
  }>
}

export interface TransferRequestCancelPayload {
  reason?: string
}

export interface TransferRequestFulfillPayload {
  notes?: string
}

export interface TransferRequestUpdateStatusPayload {
  status: TransferRequestStatus
  force?: boolean
}

export interface TransferLineItem {
  id: UUID
  product: UUID
  product_name: string
  requested_quantity: number
  approved_quantity?: number | null
  fulfilled_quantity?: number | null
  unit_of_measure: string
  notes?: string | null
}

export interface TransferAuditEntry {
  action: string
  actor: UUID
  actor_name: string
  remarks?: string | null
  created_at: string
}

export interface TransferCreatePayload {
  source_warehouse: UUID
  destination_storefront: UUID
  request?: UUID | null
  notes?: string
  line_items: Array<{
    product: UUID
    requested_quantity: number
    unit_of_measure: string
    notes?: string
  }>
}

export interface TransferUpdatePayload {
  notes?: string
  line_items?: Array<{
    id?: UUID
    product: UUID
    requested_quantity: number
    unit_of_measure: string
    notes?: string
  }>
}

export interface TransferApprovePayload {
  line_items?: Array<{
    id: UUID
    approved_quantity: number
  }>
}

export interface TransferRejectPayload {
  reason: string
}

export interface TransferFulfillmentPayload {
  line_items?: Array<{
    id: UUID
    fulfilled_quantity: number
  }>
}

export interface TransferConfirmReceiptPayload {
  notes?: string
}

export interface EmployeeWorkspaceResponse {
  businesses: Array<{
    id: UUID
    name: string
    role: string
    transfer_requests: {
      by_status: Record<TransferRequestStatus, number>
    }
    transfers: {
      by_status: Record<TransferStatus, number>
    }
  }>
  pending_approvals: Transfer[]
  incoming_transfers: Transfer[]
  my_transfer_requests: TransferRequest[]
}

// ============================================================================
// New Warehouse Transfer System (Phase 4 Backend Integration)
// ============================================================================

export type WarehouseTransferStatus = 'pending' | 'in_transit' | 'completed' | 'cancelled'

export interface WarehouseTransferItem {
  id?: UUID
  product: UUID
  product_name?: string
  product_sku?: string
  quantity: number
  unit_cost: string
  total_cost?: string
}

export interface WarehouseTransfer {
  id: UUID
  reference_number: string
  business: UUID
  status: WarehouseTransferStatus
  source_warehouse: UUID
  source_warehouse_name?: string
  destination_warehouse: UUID
  destination_warehouse_name?: string
  notes: string
  items: WarehouseTransferItem[]
  created_by: UUID
  created_by_name?: string
  created_at: string
  completed_by?: UUID | null
  completed_by_name?: string | null
  completed_at?: string | null
}

export interface WarehouseTransferCreatePayload {
  source_warehouse: UUID
  destination_warehouse: UUID
  notes?: string
  items: Array<{
    product: UUID
    quantity: number
    unit_cost?: string
  }>
}

export interface WarehouseTransferCompletePayload {
  notes?: string
}

export interface WarehouseTransferCancelPayload {
  reason: string
}
