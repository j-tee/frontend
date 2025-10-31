import React, { useState, useEffect, useCallback } from 'react';
import { Activity, TrendingUp, TrendingDown, ArrowRight, Search, Filter, X, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { inventoryReportsService } from '../../../services/reportsService';
import type { StockMovementsResponse, StockMovement } from '../../../types/reports';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { LoadingState, ErrorState, EmptyState } from '../components/ReportStates';
import { MovementDetailModal } from '../components/MovementDetailModal';
// import { useCurrency } from '../../../hooks/useCurrency';

const StockMovementsPage: React.FC = () => {
  // const { formatCurrency } = useCurrency();
  const [data, setData] = useState<StockMovementsResponse['data'] | null>(null);
  const [meta, setMeta] = useState<StockMovementsResponse['meta'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Date range (default: last 30 days)
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [movementType, setMovementType] = useState<'in' | 'out' | 'adjustment' | 'transfer' | ''>('');
  const [referenceType, setReferenceType] = useState<'purchase_order' | 'sale' | 'transfer' | 'adjustment' | ''>('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Sort
  const [sortBy, setSortBy] = useState<'date' | 'quantity' | 'product' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // UI State
  const [showFilters, setShowFilters] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {
        start_date: startDate,
        end_date: endDate,
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (warehouseId) params.warehouse_id = warehouseId;
      if (categoryId) params.category_id = categoryId;
      if (movementType) params.movement_type = movementType;
      if (referenceType) params.reference_type = referenceType;

      const response = await inventoryReportsService.getStockMovements(params);
      if (response.success && response.data) {
        setData(response.data);
        setMeta(response.meta || null);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to load stock movements');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, searchQuery, warehouseId, categoryId, movementType, referenceType, page, pageSize, sortBy, sortOrder]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    try {
      await inventoryReportsService.exportStockMovementsCSV({
        start_date: startDate,
        end_date: endDate,
        search: searchQuery.trim() || undefined,
        warehouse_id: warehouseId || undefined,
        category_id: categoryId || undefined,
        movement_type: movementType || undefined,
        reference_type: referenceType || undefined
      });
    } catch (err) {
      alert('Export failed: ' + (err as Error).message);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setWarehouseId('');
    setCategoryId('');
    setMovementType('');
    setReferenceType('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    searchQuery || warehouseId || categoryId || movementType || referenceType
  );

  // Handle click-through navigation to source records
  const handleReferenceClick = (movement: StockMovement) => {
    setSelectedMovement(movement);
    setIsModalOpen(true);
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'out':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'transfer':
        return <ArrowRight className="w-4 h-4 text-blue-600" />;
      case 'adjustment':
        return <Activity className="w-4 h-4 text-amber-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'in':
        return 'bg-green-100 text-green-800';
      case 'out':
        return 'bg-red-100 text-red-800';
      case 'transfer':
        return 'bg-blue-100 text-blue-800';
      case 'adjustment':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return '0';
    return value.toLocaleString();
  };

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;
  
  // Support both old and new pagination formats
  const pagination = meta?.pagination || (data as StockMovementsResponse['data'] & { pagination?: { page: number; page_size: number; total: number; total_pages: number } })?.pagination;
  if (!data || !data.summary || !data.movements || !pagination) return <EmptyState />;

  const summary = data.summary;
  const movements = data.movements;

  // Build warehouse options from by_warehouse grouping
  const warehouseOptions = data.by_warehouse
    ? Object.entries(data.by_warehouse).map(([id, info]) => ({
        id,
        name: info.name,
        movements: info.movements
      }))
    : [];

  // Build category options from by_category grouping
  const categoryOptions = data.by_category
    ? Object.entries(data.by_category).map(([id, info]) => ({
        id,
        name: info.name,
        movements: info.movements
      }))
    : [];

  // Pagination helpers
  const totalPages = pagination.total_pages || 0;
  const totalCount = 'total_count' in pagination ? pagination.total_count : ('total' in pagination ? pagination.total : 0);
  const currentPage = pagination.page || page;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <ReportContainer
      title="Stock Movement History"
      subtitle="Track all inventory transactions"
      icon="📊"
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
      {/* Date Range Filter */}
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onApply={fetchData}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <SummaryCard
          title="Total Movements"
          value={formatNumber(summary.total_movements)}
          icon="📊"
          color="bg-blue-50 border-blue-200"
          subtitle="All transactions"
        />
        <SummaryCard
          title="Stock In"
          value={formatNumber(summary.total_in)}
          icon="📥"
          color="bg-green-50 border-green-200"
          subtitle="Inbound movements"
        />
        <SummaryCard
          title="Stock Out"
          value={formatNumber(summary.total_out)}
          icon="📤"
          color="bg-red-50 border-red-200"
          subtitle="Outbound movements"
        />
        <SummaryCard
          title="Adjustments"
          value={formatNumber(summary.total_adjustments)}
          icon="⚖️"
          color="bg-amber-50 border-amber-200"
          subtitle="Manual adjustments"
        />
        <SummaryCard
          title="Transfers"
          value={formatNumber(summary.total_transfers)}
          icon="🔄"
          color="bg-purple-50 border-purple-200"
          subtitle="Inter-warehouse"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            {hasActiveFilters && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Active
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-3 py-1.5 text-sm text-red-700 hover:text-red-800"
              >
                <X className="w-4 h-4 mr-1" />
                Clear All
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900"
            >
              {showFilters ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Show
                </>
              )}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="space-y-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Product
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setPage(1);
                      fetchData();
                    }
                  }}
                  placeholder="Search by product name or SKU..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setPage(1);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Warehouse Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Warehouse
                </label>
                <select
                  value={warehouseId}
                  onChange={(e) => {
                    setWarehouseId(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Warehouses</option>
                  {warehouseOptions.map((warehouse) => (
                    <option key={`warehouse-${warehouse.id}`} value={warehouse.id}>
                      {warehouse.name} ({warehouse.movements})
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
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {categoryOptions.map((category) => (
                    <option key={`category-${category.id}`} value={category.id}>
                      {category.name} ({category.movements})
                    </option>
                  ))}
                </select>
              </div>

              {/* Movement Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Movement Type
                </label>
                <select
                  value={movementType}
                  onChange={(e) => {
                    setMovementType(e.target.value as '' | 'in' | 'out' | 'adjustment' | 'transfer');
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Types</option>
                  <option value="in">Stock In</option>
                  <option value="out">Stock Out</option>
                  <option value="adjustment">Adjustment</option>
                  <option value="transfer">Transfer (Legacy)</option>
                  <option value="TRANSFER_OUT">Transfer Out</option>
                  <option value="TRANSFER_IN">Transfer In</option>
                </select>
              </div>

              {/* Reference Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference Type
                </label>
                <select
                  value={referenceType}
                  onChange={(e) => {
                    setReferenceType(e.target.value as '' | 'purchase_order' | 'sale' | 'transfer' | 'adjustment');
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All References</option>
                  <option value="purchase_order">Purchase Order</option>
                  <option value="sale">Sale</option>
                  <option value="transfer">Transfer (Legacy)</option>
                  <option value="TRANSFER_OUT">Transfer Out</option>
                  <option value="TRANSFER_IN">Transfer In</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>
            </div>

            {/* Sort Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as 'date' | 'quantity' | 'product' | 'type');
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="date">Date</option>
                  <option value="quantity">Quantity</option>
                  <option value="product">Product Name</option>
                  <option value="type">Movement Type</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort Order
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => {
                    setSortOrder(e.target.value as 'asc' | 'desc');
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Movements ({movements.length} of {formatNumber(totalCount)})
          </h3>
          <div className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.total_pages}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Warehouse
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity Change
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Before → After
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performed By
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {movements.map((movement: StockMovement) => (
                <tr key={movement.movement_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{new Date(movement.created_at).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(movement.created_at).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getMovementIcon(movement.movement_type)}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMovementColor(movement.movement_type)}`}>
                        {movement.movement_type.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {movement.product_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        SKU: {movement.sku}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {movement.warehouse_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`text-sm font-bold ${
                      movement.movement_type === 'in' 
                        ? 'text-green-600' 
                        : movement.movement_type === 'out'
                        ? 'text-red-600'
                        : 'text-amber-600'
                    }`}>
                      {movement.movement_type === 'in' ? '+' : movement.movement_type === 'out' ? '-' : '±'}
                      {formatNumber(movement.quantity)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <span className="text-gray-600">{formatNumber(movement.quantity_before)}</span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span className="font-medium text-gray-900">{formatNumber(movement.quantity_after)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <button
                        onClick={() => handleReferenceClick(movement)}
                        className="group flex items-center space-x-1 text-blue-600 hover:text-blue-800 focus:outline-none focus:underline"
                      >
                        <span className="font-medium capitalize">
                          {movement.reference_type.replace('_', ' ')}
                        </span>
                        {movement.reference_number && (
                          <span className="text-gray-600 group-hover:text-gray-800">
                            ({movement.reference_number})
                          </span>
                        )}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                      {movement.notes && (
                        <div className="text-xs text-gray-500 mt-1">
                          {movement.notes}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {movement.performed_by}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {movements.length === 0 && (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No stock movements found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Page Size Selector */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">Items per page:</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Page Info */}
            <div className="text-sm text-gray-700">
              Showing {Math.min(((currentPage - 1) * pageSize) + 1, totalCount)} to{' '}
              {Math.min(currentPage * pageSize, totalCount)} of {formatNumber(totalCount)} movements
            </div>

            {/* Page Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {/* Page Numbers */}
              <div className="hidden sm:flex items-center space-x-1">
                {getPageNumbers().map((pageNum, idx) => (
                  pageNum === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-gray-500">...</span>
                  ) : (
                    <button
                      key={`page-${pageNum}`}
                      onClick={() => setPage(pageNum as number)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                ))}
              </div>

              <button
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Last
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movement Detail Modal */}
      {selectedMovement && (
        <MovementDetailModal
          movement={selectedMovement}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedMovement(null);
          }}
        />
      )}
    </ReportContainer>
  );
};

export default StockMovementsPage;
