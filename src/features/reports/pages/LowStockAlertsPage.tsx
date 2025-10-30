import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Package, Clock, Search, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { inventoryReportsService } from '../../../services/reportsService';
import type { LowStockAlertsResponse, LowStockAlert } from '../../../types/reports';
import { useCurrency } from '../../../hooks/useCurrency';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { LoadingState, ErrorState, EmptyState } from '../components/ReportStates';

const LowStockAlertsPage: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const [data, setData] = useState<LowStockAlertsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [urgency, setUrgency] = useState<'critical' | 'warning' | 'watch' | ''>('');
  const [sortBy, setSortBy] = useState<'urgency' | 'days_remaining' | 'value'>('urgency');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { 
        sort_by: sortBy,
        page: currentPage,
        page_size: pageSize
      };
      if (searchTerm) params.search = searchTerm;
      if (warehouseId) params.warehouse_id = warehouseId;
      if (categoryId) params.category_id = categoryId;
      if (urgency) params.urgency = urgency;

      const response = await inventoryReportsService.getLowStockAlerts(params);
      
      // Handle nested API response structure
      if (response.success && response.data) {
        setData(response.data);
        // Update pagination metadata
        if (response.meta?.pagination) {
          setTotalPages(response.meta.pagination.total_pages);
          setTotalCount(response.meta.pagination.total_count);
        }
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to load low stock alerts');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, warehouseId, categoryId, urgency, sortBy, currentPage, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, warehouseId, categoryId, urgency, sortBy]);

  const handleExport = async () => {
    try {
      await inventoryReportsService.exportLowStockAlertsCSV({
        search: searchTerm || undefined,
        warehouse_id: warehouseId || undefined,
        category_id: categoryId || undefined,
        urgency: urgency || undefined,
        sort_by: sortBy
      });
    } catch (err) {
      alert('Export failed: ' + (err as Error).message);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setWarehouseId('');
    setCategoryId('');
    setUrgency('');
    setSortBy('urgency');
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      // Calculate range around current page
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      // Adjust if near the start or end
      if (currentPage <= 3) {
        end = Math.min(4, totalPages - 1);
      } else if (currentPage >= totalPages - 2) {
        start = Math.max(2, totalPages - 3);
      }
      
      // Add ellipsis or pages
      if (start > 2) {
        pages.push(-1); // Ellipsis
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < totalPages - 1) {
        pages.push(-1); // Ellipsis
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return '0';
    return value.toLocaleString();
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'watch':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return '🔴';
      case 'warning':
        return '🟠';
      case 'watch':
        return '🟡';
      default:
        return '⚪';
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;
  if (!data || !data.summary || !data.alerts) {
    return <EmptyState message="No low stock alerts data available" />;
  }

  const summary = data.summary;
  const alerts = data.alerts || [];

  return (
    <ReportContainer
      title="Low Stock Alerts"
      subtitle="Products requiring immediate restocking"
      icon="⚠️"
      backPath="/app/reports/inventory"
      actions={
        <>
          <button
            onClick={fetchData}
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? '⏳ Refreshing...' : '🔄 Refresh'}
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            📥 Export CSV
          </button>
        </>
      }
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <SummaryCard
          title="Critical Alerts"
          value={formatNumber(summary.critical)}
          icon="🔴"
          color="bg-red-50 border-red-200"
          subtitle="0 stock or negative"
        />
        <SummaryCard
          title="Warning Alerts"
          value={formatNumber(summary.warning)}
          icon="🟠"
          color="bg-amber-50 border-amber-200"
          subtitle="Below reorder point"
        />
        <SummaryCard
          title="Watch Items"
          value={formatNumber(summary.watch)}
          icon="🟡"
          color="bg-blue-50 border-blue-200"
          subtitle="Within 20% of reorder"
        />
        <SummaryCard
          title="Restock Cost"
          value={formatCurrency(data.total_restock_cost)}
          icon="💰"
          color="bg-purple-50 border-purple-200"
          subtitle="Estimated total"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          </div>
          <button
            onClick={handleClearFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear All
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Product name or SKU..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Warehouse Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Warehouse
            </label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Warehouses</option>
              {/* Warehouses will be populated from data if available */}
              {data?.by_warehouse && Object.entries(data.by_warehouse).map(([id, warehouse]) => (
                <option key={`low-stock-warehouse-${id}`} value={id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {/* Categories will be populated from data if available */}
              {data?.by_category && Object.entries(data.by_category).map(([id, category]) => (
                <option key={`low-stock-category-${id}`} value={id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Urgency Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Urgency Level
            </label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as '' | 'critical' | 'warning' | 'watch')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Levels</option>
              <option value="critical">🔴 Critical</option>
              <option value="warning">🟠 Warning</option>
              <option value="watch">🟡 Watch</option>
            </select>
          </div>
        </div>

        {/* Sort By */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'urgency' | 'days_remaining' | 'value')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="urgency">Urgency (High to Low)</option>
                <option value="days_remaining">Days Remaining (Low to High)</option>
                <option value="value">Restock Value (High to Low)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Low Stock Alerts ({formatNumber(totalCount)})
            </h3>
            <div className="text-sm text-gray-600">
              Showing {alerts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, totalCount)} of {formatNumber(totalCount)} alerts
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Urgency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Warehouse
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Stock
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reorder Point
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days Until Stockout
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Suggested Order
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Est. Cost
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {alerts.map((alert: LowStockAlert, index: number) => (
                <tr key={`alert-${alert.product_id}-${alert.warehouse_id}-${index}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border-2 ${getUrgencyColor(alert.urgency)}`}>
                      {getUrgencyIcon(alert.urgency)} {alert.urgency.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {alert.product_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        SKU: {alert.sku}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {alert.warehouse_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={`font-medium ${alert.current_stock <= 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatNumber(alert.current_stock)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">
                    {formatNumber(alert.reorder_point)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <Clock className={`w-4 h-4 ${alert.days_until_stockout <= 3 ? 'text-red-500' : alert.days_until_stockout <= 7 ? 'text-amber-500' : 'text-gray-500'}`} />
                      <span className={`text-sm font-medium ${alert.days_until_stockout <= 3 ? 'text-red-600' : alert.days_until_stockout <= 7 ? 'text-amber-600' : 'text-gray-700'}`}>
                        {alert.days_until_stockout} days
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Avg: {alert.average_daily_sales}/day
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-blue-600">
                    {formatNumber(alert.reorder_quantity)} units
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                    {formatCurrency(alert.estimated_cost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {alerts.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No low stock alerts</p>
            <p className="text-sm text-gray-400 mt-2">All items are well-stocked!</p>
          </div>
        )}

        {/* Pagination Controls */}
        {alerts.length > 0 && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
              {/* Page Size Selector */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-700">Items per page:</label>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Page Navigation */}
              <div className="flex items-center space-x-2">
                {/* First Page */}
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="First page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                {/* Previous Page */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page Numbers */}
                <div className="hidden sm:flex items-center space-x-1">
                  {getPageNumbers().map((page, index) => (
                    page === -1 ? (
                      <span key={`low-stock-ellipsis-${index}`} className="px-3 py-1 text-gray-500">
                        ...
                      </span>
                    ) : (
                      <button
                        key={`low-stock-page-${page}`}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  ))}
                </div>

                {/* Mobile: Current Page Display */}
                <div className="sm:hidden px-3 py-1 text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>

                {/* Next Page */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Last Page */}
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Last page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Supplier Info */}
      {alerts.length > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Action Required</h4>
              <p className="text-sm text-blue-800">
                {summary.critical > 0 && (
                  <span className="block mb-1">
                    <strong>{summary.critical}</strong> critical items need immediate attention.
                  </span>
                )}
                Review suggested order quantities and estimated costs. Consider lead times
                when placing orders. Total estimated restock cost: <strong>{formatCurrency(data.total_restock_cost)}</strong>
              </p>
            </div>
          </div>
        </div>
      )}
    </ReportContainer>
  );
};

export default LowStockAlertsPage;
