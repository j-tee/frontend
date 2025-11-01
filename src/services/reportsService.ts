// ========================================
// REPORTS API SERVICE
// ========================================
// API service for all analytical reports
// Last Updated: October 13, 2025
// Uses existing httpClient for authentication

import httpClient from './httpClient.js';
import type {
  ReportFilters,
  SalesSummaryResponse,
  ProductPerformanceResponse,
  CustomerAnalyticsResponse,
  RevenueTrendsResponse,
  StockLevelsResponse,
  LowStockAlertsResponse,
  StockMovementsResponse,
  WarehouseAnalyticsResponse,
  RevenueProfitResponse,
  ARAgingResponse,
  CollectionRatesResponse,
  CashFlowResponse,
  TopCustomersResponse,
  PurchasePatternsResponse,
  CreditUtilizationResponse,
  SegmentationResponse,
  ProductSearchResponse,
  QuickFiltersResponse,
  ProductMovementSummaryResponse,
  MovementAnalyticsResponse,
} from '../types/reports';

// Use the existing httpClient which handles authentication via Redux store
const reportsApi = httpClient;

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Build query string from filters object
 */
const buildQueryString = (filters: ReportFilters): string => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * Handle file download from blob response
 */
const downloadFile = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

// ========================================
// SALES REPORTS
// ========================================

export const salesReportsService = {
  /**
   * Get sales summary report
   */
  getSummary: async (filters: ReportFilters = {}): Promise<SalesSummaryResponse> => {
    const response = await reportsApi.get<SalesSummaryResponse>(
      `/reports/api/sales/summary${buildQueryString(filters)}`
    );
    return response.data;
  },

  /**
   * Export sales summary to CSV
   */
  exportSummaryCSV: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/sales/summary${buildQueryString({ ...filters, export_format: 'csv' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `sales-summary-${new Date().toISOString()}.csv`);
  },

  /**
   * Export to PDF
   */
  exportSummaryPDF: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/sales/summary${buildQueryString({ ...filters, export_format: 'pdf' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `sales-summary-${new Date().toISOString()}.pdf`);
  },

  /**
   * Get product performance report
   */
  getProductPerformance: async (filters: ReportFilters = {}): Promise<ProductPerformanceResponse> => {
    const response = await reportsApi.get<ProductPerformanceResponse>(
      `/reports/api/sales/products${buildQueryString(filters)}`
    );
    return response.data;
  },

  /**
   * Export product performance to CSV
   */
  exportProductPerformanceCSV: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/sales/products${buildQueryString({ ...filters, export_format: 'csv' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `product-performance-${new Date().toISOString()}.csv`);
  },

  /**
   * Export to PDF
   */
  exportProductPerformancePDF: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/sales/products${buildQueryString({ ...filters, export_format: 'pdf' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `product-performance-${new Date().toISOString()}.pdf`);
  },

  /**
   * Get customer analytics report
   */
  getCustomerAnalytics: async (filters: ReportFilters = {}): Promise<CustomerAnalyticsResponse> => {
    const response = await reportsApi.get<CustomerAnalyticsResponse>(
      `/reports/api/sales/customer-analytics${buildQueryString(filters)}`
    );
    return response.data;
  },

  /**
   * Export customer analytics to CSV
   */
  exportCustomerAnalyticsCSV: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/sales/customer-analytics${buildQueryString({ ...filters, export_format: 'csv' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `customer-analytics-${new Date().toISOString()}.csv`);
  },

  /**
   * Export to PDF
   */
  exportCustomerAnalyticsPDF: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/sales/customer-analytics${buildQueryString({ ...filters, export_format: 'pdf' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `customer-analytics-${new Date().toISOString()}.pdf`);
  },

  /**
   * Get revenue trends report
   */
  getRevenueTrends: async (filters: ReportFilters = {}): Promise<RevenueTrendsResponse> => {
    const response = await reportsApi.get<RevenueTrendsResponse>(
      `/reports/api/sales/revenue-trends${buildQueryString(filters)}`
    );
    return response.data;
  },

  /**
   * Export revenue trends to CSV
   */
  exportRevenueTrendsCSV: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/sales/revenue-trends${buildQueryString({ ...filters, export_format: 'csv' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `revenue-trends-${new Date().toISOString()}.csv`);
  },

  /**
   * Export to PDF
   */
  exportRevenueTrendsPDF: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/sales/revenue-trends${buildQueryString({ ...filters, export_format: 'pdf' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `revenue-trends-${new Date().toISOString()}.pdf`);
  },
};

// ========================================
// INVENTORY REPORTS
// ========================================

export const inventoryReportsService = {
  /**
   * Get stock levels report
   */
  getStockLevels: async (filters: ReportFilters = {}): Promise<StockLevelsResponse> => {
    const response = await reportsApi.get<StockLevelsResponse>(
      `/reports/api/inventory/stock-levels${buildQueryString(filters)}`
    );
    return response.data;
  },

  /**
   * Export stock levels to CSV
   */
  exportStockLevelsCSV: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/inventory/stock-levels${buildQueryString({ ...filters, export_format: 'csv' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `stock-levels-${new Date().toISOString()}.csv`);
  },

  /**
   * Export to PDF
   */
  exportStockLevelsPDF: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/inventory/stock-levels${buildQueryString({ ...filters, export_format: 'pdf' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `stock-levels-${new Date().toISOString()}.pdf`);
  },

  /**
   * Get low stock alerts report
   */
  getLowStockAlerts: async (filters: ReportFilters = {}): Promise<LowStockAlertsResponse> => {
    const response = await reportsApi.get<LowStockAlertsResponse>(
      `/reports/api/inventory/low-stock-alerts${buildQueryString(filters)}`
    );
    return response.data;
  },

  /**
   * Export low stock alerts to CSV
   */
  exportLowStockAlertsCSV: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/inventory/low-stock-alerts${buildQueryString({ ...filters, export_format: 'csv' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `low-stock-alerts-${new Date().toISOString()}.csv`);
  },

  /**
   * Export to PDF
   */
  exportLowStockAlertsPDF: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/inventory/low-stock-alerts${buildQueryString({ ...filters, export_format: 'pdf' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `low-stock-alerts-${new Date().toISOString()}.pdf`);
  },

  /**
   * Get stock movements report
   */
  getStockMovements: async (filters: ReportFilters = {}): Promise<StockMovementsResponse> => {
    const response = await reportsApi.get<StockMovementsResponse>(
      `/reports/api/inventory/movements${buildQueryString(filters)}`
    );
    return response.data;
  },

  /**
   * Export stock movements to CSV
   */
  exportStockMovementsCSV: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/inventory/movements${buildQueryString({ ...filters, export_format: 'csv' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `stock-movements-${new Date().toISOString()}.csv`);
  },

  /**
   * Export to PDF
   */
  exportStockMovementsPDF: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/inventory/movements${buildQueryString({ ...filters, export_format: 'pdf' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `stock-movements-${new Date().toISOString()}.pdf`);
  },

  /**
   * Get warehouse analytics report
   */
  getWarehouseAnalytics: async (filters: ReportFilters = {}): Promise<WarehouseAnalyticsResponse> => {
    const response = await reportsApi.get<WarehouseAnalyticsResponse>(
      `/reports/api/inventory/warehouse-analytics${buildQueryString(filters)}`
    );
    return response.data;
  },

  /**
   * Export warehouse analytics to CSV
   */
  exportWarehouseAnalyticsCSV: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/inventory/warehouse-analytics${buildQueryString({ ...filters, export_format: 'csv' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `warehouse-analytics-${new Date().toISOString()}.csv`);
  },

  /**
   * Export to PDF
   */
  exportWarehouseAnalyticsPDF: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/inventory/warehouse-analytics${buildQueryString({ ...filters, export_format: 'pdf' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `warehouse-analytics-${new Date().toISOString()}.pdf`);
  },

  // ========================================
  // PHASE 2: Product Search & Quick Filters
  // ========================================

  /**
   * Search products for movement filtering (Phase 2)
   */
  searchProducts: async (query: string, limit: number = 10): Promise<ProductSearchResponse> => {
    const response = await reportsApi.get<ProductSearchResponse>(
      `/reports/api/inventory/products/search/`,
      { params: { q: query, limit } }
    );
    return response.data;
  },

  /**
   * Get quick filter product lists (Phase 2)
   */
  getQuickFilters: async (
    filterType: 'top_sellers' | 'most_adjusted' | 'high_transfers' | 'shrinkage',
    startDate: string,
    endDate: string,
    limit: number = 10
  ): Promise<QuickFiltersResponse> => {
    const response = await reportsApi.get<QuickFiltersResponse>(
      `/reports/api/inventory/movements/quick-filters/`,
      { params: { filter_type: filterType, start_date: startDate, end_date: endDate, limit } }
    );
    return response.data;
  },

  // ========================================
  // PHASE 3: Product Movement Summary
  // ========================================

  /**
   * Get product movement summary with breakdown and warehouse distribution (Phase 3)
   */
  getProductMovementSummary: async (
    productId: string,
    startDate: string,
    endDate: string
  ): Promise<ProductMovementSummaryResponse> => {
    const response = await reportsApi.get<ProductMovementSummaryResponse>(
      `/reports/api/inventory/movements/product-summary/`,
      { params: { product_id: productId, start_date: startDate, end_date: endDate } }
    );
    return response.data;
  },

  // ========================================
  // PHASE 4: Movement Analytics Dashboard
  // ========================================

  /**
   * Get comprehensive movement analytics for dashboard (Phase 4)
   */
  getMovementAnalytics: async (
    startDate: string,
    endDate: string,
    warehouseId?: string,
    categoryId?: string
  ): Promise<MovementAnalyticsResponse> => {
    const params: Record<string, string> = {
      start_date: startDate,
      end_date: endDate,
    };
    if (warehouseId) params.warehouse_id = warehouseId;
    if (categoryId) params.category_id = categoryId;

    const response = await reportsApi.get<MovementAnalyticsResponse>(
      `/reports/api/inventory/movements/analytics/`,
      { params }
    );
    return response.data;
  },
};

// ========================================
// FINANCIAL REPORTS
// ========================================

export const financialReportsService = {
  /**
   * Get revenue & profit analysis report
   */
  getRevenueProfit: async (filters: ReportFilters = {}): Promise<RevenueProfitResponse> => {
    const response = await reportsApi.get<RevenueProfitResponse>(
      `/reports/api/financial/revenue-profit${buildQueryString(filters)}`
    );
    return response.data;
  },

  /**
   * Export revenue & profit to CSV
   */
  exportRevenueProfitCSV: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/financial/revenue-profit${buildQueryString({ ...filters, export_format: 'csv' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `revenue-profit-${new Date().toISOString()}.csv`);
  },

  /**
   * Export to PDF
   */
  exportRevenueProfitPDF: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/financial/revenue-profit${buildQueryString({ ...filters, export_format: 'pdf' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `revenue-profit-${new Date().toISOString()}.pdf`);
  },

  /**
   * Get AR aging report
   */
  getARAging: async (filters: ReportFilters = {}): Promise<ARAgingResponse> => {
    const response = await reportsApi.get<ARAgingResponse>(
      `/reports/api/financial/ar-aging${buildQueryString(filters)}`
    );
    return response.data;
  },

  /**
   * Export AR aging to CSV
   */
  exportARAgingCSV: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/financial/ar-aging${buildQueryString({ ...filters, export_format: 'csv' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `ar-aging-${new Date().toISOString()}.csv`);
  },

  /**
   * Export to PDF
   */
  exportARAgingPDF: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/financial/ar-aging${buildQueryString({ ...filters, export_format: 'pdf' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `ar-aging-${new Date().toISOString()}.pdf`);
  },

  /**
   * Get collection rates report
   */
  getCollectionRates: async (filters: ReportFilters = {}): Promise<CollectionRatesResponse> => {
    const response = await reportsApi.get<CollectionRatesResponse>(
      `/reports/api/financial/collection-rates${buildQueryString(filters)}`
    );
    return response.data;
  },

  /**
   * Export collection rates to CSV
   */
  exportCollectionRatesCSV: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/financial/collection-rates${buildQueryString({ ...filters, export_format: 'csv' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `collection-rates-${new Date().toISOString()}.csv`);
  },

  /**
   * Export to PDF
   */
  exportCollectionRatesPDF: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/financial/collection-rates${buildQueryString({ ...filters, export_format: 'pdf' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `collection-rates-${new Date().toISOString()}.pdf`);
  },

  /**
   * Get cash flow report
   */
  getCashFlow: async (filters: ReportFilters = {}): Promise<CashFlowResponse> => {
    const response = await reportsApi.get<CashFlowResponse>(
      `/reports/api/financial/cash-flow${buildQueryString(filters)}`
    );
    return response.data;
  },

  /**
   * Export cash flow to CSV
   */
  exportCashFlowCSV: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/financial/cash-flow${buildQueryString({ ...filters, export_format: 'csv' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `cash-flow-${new Date().toISOString()}.csv`);
  },

  /**
   * Export to PDF
   */
  exportCashFlowPDF: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/financial/cash-flow${buildQueryString({ ...filters, export_format: 'pdf' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `cash-flow-${new Date().toISOString()}.pdf`);
  },
};

// ========================================
// CUSTOMER REPORTS
// ========================================

export const customerReportsService = {
  /**
   * Get top customers report
   */
  getTopCustomers: async (filters: ReportFilters = {}): Promise<TopCustomersResponse> => {
    const response = await reportsApi.get<TopCustomersResponse>(
      `/reports/api/customer/top-customers${buildQueryString(filters)}`
    );
    return response.data;
  },

  /**
   * Export top customers to CSV
   */
  exportTopCustomersCSV: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/customer/top-customers${buildQueryString({ ...filters, export_format: 'csv' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `top-customers-${new Date().toISOString()}.csv`);
  },

  /**
   * Export to PDF
   */
  exportTopCustomersPDF: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/customer/top-customers${buildQueryString({ ...filters, export_format: 'pdf' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `top-customers-${new Date().toISOString()}.pdf`);
  },

  /**
   * Get purchase patterns report
   */
  getPurchasePatterns: async (filters: ReportFilters = {}): Promise<PurchasePatternsResponse> => {
    const response = await reportsApi.get<PurchasePatternsResponse>(
      `/reports/api/customer/purchase-patterns${buildQueryString(filters)}`
    );
    return response.data;
  },

  /**
   * Export purchase patterns to CSV
   */
  exportPurchasePatternsCSV: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/customer/purchase-patterns${buildQueryString({ ...filters, export_format: 'csv' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `purchase-patterns-${new Date().toISOString()}.csv`);
  },

  /**
   * Export to PDF
   */
  exportPurchasePatternsPDF: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/customer/purchase-patterns${buildQueryString({ ...filters, export_format: 'pdf' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `purchase-patterns-${new Date().toISOString()}.pdf`);
  },

  /**
   * Get credit utilization report
   */
  getCreditUtilization: async (filters: ReportFilters = {}): Promise<CreditUtilizationResponse> => {
    const response = await reportsApi.get<CreditUtilizationResponse>(
      `/reports/api/customer/credit-utilization${buildQueryString(filters)}`
    );
    return response.data;
  },

  /**
   * Export credit utilization to CSV
   */
  exportCreditUtilizationCSV: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/customer/credit-utilization${buildQueryString({ ...filters, export_format: 'csv' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `credit-utilization-${new Date().toISOString()}.csv`);
  },

  /**
   * Export to PDF
   */
  exportCreditUtilizationPDF: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/customer/credit-utilization${buildQueryString({ ...filters, export_format: 'pdf' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `credit-utilization-${new Date().toISOString()}.pdf`);
  },

  /**
   * Get customer segmentation report
   */
  getSegmentation: async (filters: ReportFilters = {}): Promise<SegmentationResponse> => {
    const response = await reportsApi.get<SegmentationResponse>(
      `/reports/api/customer/segmentation${buildQueryString(filters)}`
    );
    return response.data;
  },

  /**
   * Export segmentation to CSV
   */
  exportSegmentationCSV: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/customer/segmentation${buildQueryString({ ...filters, export_format: 'csv' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `customer-segmentation-${new Date().toISOString()}.csv`);
  },

  /**
   * Export to PDF
   */
  exportSegmentationPDF: async (filters: ReportFilters = {}): Promise<void> => {
    const response = await reportsApi.get(
      `/reports/api/customer/segmentation${buildQueryString({ ...filters, export_format: 'pdf' })}`,
      { responseType: 'blob' }
    );
    downloadFile(response.data, `segmentation-${new Date().toISOString()}.pdf`);
  },
};

// ========================================
// DEFAULT EXPORT
// ========================================

const reportsService = {
  sales: salesReportsService,
  inventory: inventoryReportsService,
  financial: financialReportsService,
  customer: customerReportsService,
};

export default reportsService;
