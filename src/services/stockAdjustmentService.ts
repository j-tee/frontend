import httpClient from './httpClient.js'
import type { PaginatedResponse } from '../types/common.js'
import type {
  StockAdjustment,
  StockAdjustmentCreatePayload,
  StockAdjustmentUpdatePayload,
  StockAdjustmentPhoto,
  StockAdjustmentPhotoPayload,
  StockAdjustmentDocument,
  StockAdjustmentDocumentPayload,
  StockCount,
  StockCountCreatePayload,
  StockCountItem,
  StockCountItemCreatePayload,
  BulkApprovePayload,
  BulkApproveResponse,
  AdjustmentSummary,
  ShrinkageReport,
  CreateAdjustmentsResponse,
} from '../types/stockAdjustments.js'

// Stock Adjustments

export const fetchStockAdjustments = async (params?: Record<string, unknown>) => {
  const { data } = await httpClient.get<PaginatedResponse<StockAdjustment>>(
    '/inventory/api/stock-adjustments/',
    { params },
  )
  return data
}

export const fetchStockAdjustmentDetail = async (id: string) => {
  const { data } = await httpClient.get<StockAdjustment>(
    `/inventory/api/stock-adjustments/${id}/`,
  )
  return data
}

export const createStockAdjustment = async (payload: StockAdjustmentCreatePayload) => {
  const { data } = await httpClient.post<StockAdjustment>(
    '/inventory/api/stock-adjustments/',
    payload,
  )
  return data
}

export const updateStockAdjustment = async (
  id: string,
  payload: StockAdjustmentUpdatePayload,
) => {
  const { data } = await httpClient.patch<StockAdjustment>(
    `/inventory/api/stock-adjustments/${id}/`,
    payload,
  )
  return data
}

export const deleteStockAdjustment = async (id: string) => {
  await httpClient.delete(`/inventory/api/stock-adjustments/${id}/`)
}

export const approveStockAdjustment = async (id: string) => {
  const { data } = await httpClient.post<StockAdjustment>(
    `/inventory/api/stock-adjustments/${id}/approve/`,
  )
  return data
}

export const rejectStockAdjustment = async (id: string) => {
  const { data } = await httpClient.post<StockAdjustment>(
    `/inventory/api/stock-adjustments/${id}/reject/`,
  )
  return data
}

export const completeStockAdjustment = async (id: string) => {
  const { data } = await httpClient.post<StockAdjustment>(
    `/inventory/api/stock-adjustments/${id}/complete/`,
  )
  return data
}

export const fetchPendingAdjustments = async () => {
  const { data } = await httpClient.get<StockAdjustment[]>(
    '/inventory/api/stock-adjustments/pending/',
  )
  return data
}

export const fetchAdjustmentSummary = async (params?: Record<string, unknown>) => {
  const { data } = await httpClient.get<AdjustmentSummary>(
    '/inventory/api/stock-adjustments/summary/',
    { params },
  )
  return data
}

export const fetchShrinkageReport = async (params?: Record<string, unknown>) => {
  const { data } = await httpClient.get<ShrinkageReport>(
    '/inventory/api/stock-adjustments/shrinkage/',
    { params },
  )
  return data
}

export const bulkApproveAdjustments = async (payload: BulkApprovePayload) => {
  const { data } = await httpClient.post<BulkApproveResponse>(
    '/inventory/api/stock-adjustments/bulk_approve/',
    payload,
  )
  return data
}

// Photos

export const uploadAdjustmentPhoto = async (payload: StockAdjustmentPhotoPayload) => {
  const formData = new FormData()
  formData.append('adjustment', payload.adjustment)
  formData.append('photo', payload.photo)
  if (payload.description) {
    formData.append('description', payload.description)
  }

  const { data } = await httpClient.post<StockAdjustmentPhoto>(
    '/inventory/api/adjustment-photos/',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  )
  return data
}

export const deleteAdjustmentPhoto = async (id: string) => {
  await httpClient.delete(`/inventory/api/adjustment-photos/${id}/`)
}

// Documents

export const uploadAdjustmentDocument = async (payload: StockAdjustmentDocumentPayload) => {
  const formData = new FormData()
  formData.append('adjustment', payload.adjustment)
  formData.append('document', payload.document)
  formData.append('document_type', payload.document_type)
  if (payload.description) {
    formData.append('description', payload.description)
  }

  const { data } = await httpClient.post<StockAdjustmentDocument>(
    '/inventory/api/adjustment-documents/',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  )
  return data
}

export const deleteAdjustmentDocument = async (id: string) => {
  await httpClient.delete(`/inventory/api/adjustment-documents/${id}/`)
}

// Stock Counts

export const fetchStockCounts = async (params?: Record<string, unknown>) => {
  const { data } = await httpClient.get<PaginatedResponse<StockCount>>(
    '/inventory/api/stock-counts/',
    { params },
  )
  return data
}

export const fetchStockCountDetail = async (id: string) => {
  const { data } = await httpClient.get<StockCount>(
    `/inventory/api/stock-counts/${id}/`,
  )
  return data
}

export const createStockCount = async (payload: StockCountCreatePayload) => {
  const { data } = await httpClient.post<StockCount>(
    '/inventory/api/stock-counts/',
    payload,
  )
  return data
}

export const updateStockCount = async (
  id: string,
  payload: Partial<StockCountCreatePayload>,
) => {
  const { data } = await httpClient.patch<StockCount>(
    `/inventory/api/stock-counts/${id}/`,
    payload,
  )
  return data
}

export const deleteStockCount = async (id: string) => {
  await httpClient.delete(`/inventory/api/stock-counts/${id}/`)
}

export const completeStockCount = async (id: string) => {
  const { data } = await httpClient.post<StockCount>(
    `/inventory/api/stock-counts/${id}/complete/`,
  )
  return data
}

export const createAdjustmentsFromCount = async (id: string) => {
  const { data } = await httpClient.post<CreateAdjustmentsResponse>(
    `/inventory/api/stock-counts/${id}/create_adjustments/`,
  )
  return data
}

export const fetchCountDiscrepancies = async (id: string) => {
  const { data } = await httpClient.get<StockCountItem[]>(
    `/inventory/api/stock-counts/${id}/discrepancies/`,
  )
  return data
}

// Stock Count Items

export const fetchStockCountItems = async (params?: Record<string, unknown>) => {
  const { data } = await httpClient.get<PaginatedResponse<StockCountItem>>(
    '/inventory/api/stock-count-items/',
    { params },
  )
  return data
}

export const createStockCountItem = async (payload: StockCountItemCreatePayload) => {
  const { data } = await httpClient.post<StockCountItem>(
    '/inventory/api/stock-count-items/',
    payload,
  )
  return data
}

export const updateStockCountItem = async (
  id: string,
  payload: Partial<StockCountItemCreatePayload>,
) => {
  const { data } = await httpClient.patch<StockCountItem>(
    `/inventory/api/stock-count-items/${id}/`,
    payload,
  )
  return data
}

export const deleteStockCountItem = async (id: string) => {
  await httpClient.delete(`/inventory/api/stock-count-items/${id}/`)
}

export const createAdjustmentFromCountItem = async (id: string) => {
  const { data } = await httpClient.post<StockAdjustment>(
    `/inventory/api/stock-count-items/${id}/create_adjustment/`,
  )
  return data
}
