import type { UUID } from './common'

// Adjustment Types
export type AdjustmentType =
  | 'THEFT'
  | 'DAMAGE'
  | 'EXPIRED'
  | 'SPOILAGE'
  | 'LOSS'
  | 'SAMPLE'
  | 'WRITE_OFF'
  | 'SUPPLIER_RETURN'
  | 'TRANSFER_OUT'
  | 'CUSTOMER_RETURN'
  | 'FOUND'
  | 'CORRECTION_INCREASE'
  | 'TRANSFER_IN'
  | 'CORRECTION'
  | 'RECOUNT'
  | 'OTHER'

export type AdjustmentStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'

export type DocumentType =
  | 'RECEIPT'
  | 'INVOICE'
  | 'POLICE_REPORT'
  | 'INSURANCE_CLAIM'
  | 'SUPPLIER_RMA'
  | 'COUNT_SHEET'
  | 'OTHER'

export type StockCountStatus =
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'

// Stock Adjustment Photo
export interface StockAdjustmentPhoto {
  id: UUID
  adjustment: UUID
  photo: string
  description?: string
  uploaded_at: string
  uploaded_by: UUID
  uploaded_by_name?: string
}

// Stock Adjustment Document
export interface StockAdjustmentDocument {
  id: UUID
  adjustment: UUID
  document: string
  document_type: DocumentType
  document_type_display?: string
  description?: string
  uploaded_at: string
  uploaded_by: UUID
  uploaded_by_name?: string
}

// Stock Product Details (embedded in adjustment)
export interface StockProductDetails {
  id: UUID
  product_name: string
  product_code: string
  current_quantity: number
  warehouse?: string
  supplier?: string
  unit_cost: string
  retail_price?: string
}

// Stock Adjustment
export interface StockAdjustment {
  id: UUID
  business: UUID
  stock_product: UUID
  stock_product_details?: StockProductDetails
  adjustment_type: AdjustmentType
  adjustment_type_display: string
  quantity: number
  unit_cost: string
  total_cost: string
  reason: string
  reference_number?: string
  status: AdjustmentStatus
  status_display: string
  requires_approval: boolean
  created_by: UUID
  created_by_name?: string
  approved_by?: UUID
  approved_by_name?: string
  created_at: string
  approved_at?: string
  completed_at?: string
  has_photos: boolean
  has_documents: boolean
  related_sale?: UUID
  related_transfer?: UUID
  financial_impact: string
  is_increase: boolean
  is_decrease: boolean
  photos?: StockAdjustmentPhoto[]
  documents?: StockAdjustmentDocument[]
}

// Create Stock Adjustment Payload
export interface StockAdjustmentCreatePayload {
  stock_product: UUID
  adjustment_type: AdjustmentType
  quantity: number
  reason: string
  reference_number?: string
  unit_cost?: string
}

// Update Stock Adjustment Payload
export interface StockAdjustmentUpdatePayload {
  reason?: string
  reference_number?: string
}

// Bulk Approve Payload
export interface BulkApprovePayload {
  adjustment_ids: UUID[]
}

// Bulk Approve Response
export interface BulkApproveResponse {
  approved: UUID[]
  failed: Array<{
    id: UUID
    error: string
  }>
  total_approved: number
  total_failed: number
}

// Adjustment Summary
export interface AdjustmentSummary {
  overall: {
    total_adjustments: number
    total_increase: number
    total_decrease: number
    total_cost_impact: string
  }
  by_type: Array<{
    adjustment_type: AdjustmentType
    adjustment_type_display?: string
    count: number
    total_quantity: number
    total_cost: string
  }>
  by_status: Array<{
    status: AdjustmentStatus
    status_display?: string
    count: number
  }>
}

// Shrinkage Report
export interface ShrinkageReport {
  overall: {
    total_units: number
    total_cost: string
    total_incidents: number
  }
  by_type: Array<{
    adjustment_type: AdjustmentType
    adjustment_type_display?: string
    count: number
    total_quantity: number
    total_cost: string
  }>
  top_affected_products: Array<{
    stock_product__product__name: string
    stock_product__product__code: string
    total_quantity: number
    total_cost: string
    incidents: number
  }>
}

// Stock Count Item
export interface StockCountItem {
  id: UUID
  stock_count: UUID
  stock_product: UUID
  stock_product_details?: StockProductDetails
  system_quantity: number
  counted_quantity: number
  discrepancy: number
  has_discrepancy: boolean
  discrepancy_percentage: string
  counter_name?: string
  notes?: string
  counted_at: string
  adjustment_created_id?: UUID
}

// Stock Count
export interface StockCount {
  id: UUID
  business: UUID
  storefront?: UUID
  storefront_name?: string
  warehouse?: UUID
  warehouse_name?: string
  count_date: string
  status: StockCountStatus
  status_display: string
  notes?: string
  created_by: UUID
  created_by_name?: string
  created_at: string
  completed_at?: string
  items?: StockCountItem[]
  total_items: number
  items_with_discrepancy: number
  total_discrepancy_value: string
}

// Create Stock Count Payload
export interface StockCountCreatePayload {
  storefront?: UUID
  warehouse?: UUID
  count_date: string
  notes?: string
}

// Create Count Item Payload
export interface StockCountItemCreatePayload {
  stock_count: UUID
  stock_product: UUID
  counted_quantity: number
  counter_name?: string
  notes?: string
}

// Create Adjustments Response
export interface CreateAdjustmentsResponse {
  adjustments_created: number
  adjustment_ids: UUID[]
}

// Photo Upload Payload
export interface StockAdjustmentPhotoPayload {
  adjustment: UUID
  photo: File
  description?: string
}

// Document Upload Payload
export interface StockAdjustmentDocumentPayload {
  adjustment: UUID
  document: File
  document_type: DocumentType
  description?: string
}

// Adjustment Type Metadata
export interface AdjustmentTypeMetadata {
  code: AdjustmentType
  label: string
  icon: string
  color: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'gray' | 'purple'
  isDecrease: boolean
  requiresApproval: boolean
}

// Status Metadata
export interface StatusMetadata {
  code: AdjustmentStatus
  label: string
  color: 'warning' | 'info' | 'danger' | 'success'
}
