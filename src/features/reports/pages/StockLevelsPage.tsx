import React, { useState, useEffect, useCallback } from 'react';
import { Package, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { inventoryReportsService } from '../../../services/reportsService';
import type { StockLevelsResponse, StockLevel } from '../../../types/reports';
import { useCurrency } from '../../../hooks/useCurrency';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { LoadingState, ErrorState, EmptyState } from '../components/ReportStates';

const StockLevelsPage: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const [data, setData] = useState<StockLevelsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  // Filters
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stockStatus, setStockStatus] = useState<'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock' | ''>('');
  const [includeValuation, setIncludeValuation] = useState(true);
  const [sortBy, setSortBy] = useState<'quantity' | 'value' | 'name'>('quantity');
  
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
        include_valuation: includeValuation,
        sort_by: sortBy,
        page: currentPage,
        page_size: pageSize
      };
      if (warehouseId) params.warehouse_id = warehouseId;
      if (categoryId) params.category_id = categoryId;
      if (searchQuery) params.search = searchQuery;
      if (stockStatus) params.stock_status = stockStatus;

      const response = await inventoryReportsService.getStockLevels(params);
      setData(response);
      
      // Update pagination info from response metadata
      if (response.meta?.pagination) {
        setTotalPages(response.meta.pagination.total_pages || 1);
        setTotalCount(response.meta.pagination.total_count || 0);
      }
    } catch (err) {
      // Check for specific backend errors
      const error = err as { response?: { status?: number; data?: string }; message?: string };
      let errorMessage = error.message || 'Failed to load stock levels report';
      
      if (error.response?.status === 500) {
        const errorData = error.response.data;
        if (typeof errorData === 'string' && errorData.includes('landed_unit_cost')) {
          errorMessage = 'Backend error: Missing database field "landed_unit_cost". Contact support.';
        } else if (typeof errorData === 'string' && errorData.includes('unexpected keyword argument')) {
          errorMessage = 'Backend error: Response structure issue. The stock levels API needs fixing.';
        } else {
          errorMessage = 'Backend error: The stock levels report has multiple configuration issues. Please contact backend team.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [warehouseId, categoryId, searchQuery, stockStatus, includeValuation, sortBy, currentPage, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [warehouseId, categoryId, searchQuery, stockStatus]);

  const handleExport = async () => {
    try {
      await inventoryReportsService.exportStockLevelsCSV({
        warehouse_id: warehouseId,
        category_id: categoryId,
        search: searchQuery || undefined,
        stock_status: stockStatus || undefined,
        include_valuation: includeValuation,
        sort_by: sortBy
      });
    } catch (err) {
      alert('Export failed: ' + (err as Error).message);
    }
  };

  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return '0';
    return value.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'bg-green-100 text-green-800';
      case 'low_stock':
        return 'bg-amber-100 text-amber-800';
      case 'out_of_stock':
        return 'bg-red-100 text-red-800';
      case 'overstock':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const toggleProductExpansion = (productId: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  if (loading) return <LoadingState />;
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <ErrorState error={error} onRetry={fetchData} />
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="text-sm font-semibold text-red-900 mb-2">⚠️ Backend Issues Detected</h4>
            <p className="text-sm text-red-800 mb-3">
              The stock levels report has multiple backend errors that prevent it from loading:
            </p>
            <ul className="text-sm text-red-800 list-disc list-inside space-y-1 mb-3">
              <li>Missing database field: <code className="bg-red-100 px-1 rounded">landed_unit_cost</code></li>
              <li>Invalid response structure: <code className="bg-red-100 px-1 rounded">meta</code> parameter issue</li>
            </ul>
            <p className="text-sm text-red-800 mb-2">
              <strong>No workaround available.</strong> The backend team needs to fix these issues.
            </p>
            <p className="text-xs text-red-700">
              See <code>docs/BACKEND-BUG-STOCK-LEVELS-FIELD-ERROR.md</code> for technical details.
            </p>
          </div>
        </div>
      </div>
    );
  }
  if (!data?.data) return <EmptyState />;

  const summary = data.data.summary;
  const items = data.data.items || [];

  const totalProducts = summary?.total_products ?? 0;
  const totalVariants = summary?.total_variants ?? 0;
  const healthyProducts = summary?.in_stock ?? 0;
  const lowStockProducts = summary?.low_stock ?? 0;
  const outOfStockProducts = summary?.out_of_stock ?? 0;
  const healthyPercent = totalProducts ? (healthyProducts / totalProducts) * 100 : 0;
  const lowPercent = totalProducts ? (lowStockProducts / totalProducts) * 100 : 0;
  const outPercent = totalProducts ? (outOfStockProducts / totalProducts) * 100 : 0;

  const aggregateTotals = items.reduce(
    (acc, item) => {
      const totalQuantity = item.total_quantity ?? 0;
      const available = item.total_available ?? 0;
      const reserved = item.locations.reduce(
        (sum, location) => sum + (location.reserved ?? 0),
        0
      );
      const isAtRisk = item.locations.some(
        (location) =>
          location.status === 'low_stock' || location.status === 'out_of_stock'
      );

      return {
        totalUnits: acc.totalUnits + totalQuantity,
        availableUnits: acc.availableUnits + available,
        reservedUnits: acc.reservedUnits + reserved,
        atRiskUnits: isAtRisk ? acc.atRiskUnits + available : acc.atRiskUnits,
        attentionProducts: isAtRisk
          ? acc.attentionProducts + 1
          : acc.attentionProducts,
      };
    },
    {
      totalUnits: 0,
      availableUnits: 0,
      reservedUnits: 0,
      atRiskUnits: 0,
      attentionProducts: 0,
    }
  );

  const atRiskExample = (() => {
    const product = items.find((item) =>
      item.locations.some(
        (location) =>
          location.status === 'low_stock' || location.status === 'out_of_stock'
      )
    );

    if (!product) {
      return null;
    }

    const affectedLocations = product.locations
      .filter(
        (location) =>
          location.status === 'low_stock' || location.status === 'out_of_stock'
      )
      .map((location) => ({
        name: location.warehouse_name,
        available: location.available ?? 0,
        reorderPoint: location.reorder_point ?? 0,
      }));

    const reorderPoints = affectedLocations.map((location) => location.reorderPoint);

    return {
      product,
      affectedLocations,
      minReorderPoint:
        reorderPoints.length > 0 ? Math.min(...reorderPoints) : undefined,
    };
  })();

  return (
    <ReportContainer
      title="Stock Levels Summary"
      subtitle="Current inventory status across all locations"
      icon="📦"
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
      {/* Filters Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </h3>
          <button
            onClick={() => {
              setWarehouseId('');
              setCategoryId('');
              setSearchQuery('');
              setStockStatus('');
              setCurrentPage(1); // Reset to first page
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear All
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Products
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Product name or SKU..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Warehouse Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Warehouse
            </label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Warehouses</option>
              {data?.data?.by_warehouse && Object.entries(data.data.by_warehouse).map(([id, warehouseData]) => (
                <option key={`warehouse-${id}`} value={id}>
                  {warehouseData.name} ({warehouseData.products} products)
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {data?.data?.by_category && Object.entries(data.data.by_category).map(([id, categoryData]) => (
                <option key={`category-${id}`} value={id}>
                  {categoryData.name} ({categoryData.products} products)
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Status
            </label>
            <select
              value={stockStatus}
              onChange={(e) => setStockStatus(e.target.value as 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock' | '')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="overstock">Overstock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <SummaryCard
          title="Total products tracked"
          value={formatNumber(totalProducts)}
          icon="�️"
          color="bg-slate-50 border-slate-200"
          subtitle={`${formatNumber(totalVariants)} variants across ${formatNumber(summary.warehouses_count)} ${summary.warehouses_count === 1 ? 'location' : 'locations'}`}
        />
        <SummaryCard
          title="Healthy products"
          value={formatNumber(healthyProducts)}
          icon="✅"
          color="bg-green-50 border-green-200"
          subtitle={`${healthyPercent.toFixed(0)}% of catalogue above reorder levels`}
        />
        <SummaryCard
          title="At-risk products"
          value={formatNumber(lowStockProducts)}
          icon="⚠️"
          color="bg-amber-50 border-amber-200"
          subtitle="Below reorder point but still has stock"
        />
        <SummaryCard
          title="Out of stock products"
          value={formatNumber(outOfStockProducts)}
          icon="🚫"
          color="bg-red-50 border-red-200"
          subtitle="No sellable units available"
        />
        <SummaryCard
          title="Sellable units"
          value={formatNumber(aggregateTotals.availableUnits)}
          icon="📦"
          color="bg-blue-50 border-blue-200"
          subtitle="Units available across all warehouses"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <SummaryCard
          title="Total units on hand"
          value={formatNumber(aggregateTotals.totalUnits)}
          icon="📊"
          color="bg-slate-50 border-slate-200"
          subtitle="Includes available and reserved units"
        />
        <SummaryCard
          title="Units reserved"
          value={formatNumber(aggregateTotals.reservedUnits)}
          icon="�"
          color="bg-purple-50 border-purple-200"
          subtitle="Committed to orders or holds"
        />
        <SummaryCard
          title={includeValuation ? 'Inventory value' : 'Warehouses tracked'}
          value={
            includeValuation
              ? formatCurrency(summary.total_stock_value)
              : formatNumber(summary.warehouses_count)
          }
          icon={includeValuation ? '💰' : '🏬'}
          color={includeValuation ? 'bg-indigo-50 border-indigo-200' : 'bg-cyan-50 border-cyan-200'}
          subtitle={
            includeValuation
              ? `Across ${formatNumber(summary.warehouses_count)} ${summary.warehouses_count === 1 ? 'location' : 'locations'}`
              : 'Warehouses contributing to this report'
          }
        />
      </div>

      <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-6">
        <h3 className="text-sm font-semibold text-blue-900">How to read these stock health numbers</h3>
        <p className="mt-2 text-sm text-blue-800">
          The status cards count product SKUs, not raw units. A product moves into “At-risk” as soon as its available quantity falls below the reorder point you configured.
        </p>
        <p className="mt-2 text-sm text-blue-800">
          {aggregateTotals.attentionProducts > 0
            ? `${formatNumber(aggregateTotals.attentionProducts)} product${aggregateTotals.attentionProducts === 1 ? '' : 's'} need attention right now.`
            : 'All tracked products are currently healthy.'}
        </p>
        <ul className="mt-3 space-y-1 text-xs text-blue-900">
          <li><span className="font-semibold">Healthy products</span>: every warehouse is above its reorder point.</li>
          <li><span className="font-semibold">At-risk products</span>: at least one warehouse is at or below its reorder point.</li>
          <li><span className="font-semibold">Out of stock</span>: no sellable units remain in any warehouse.</li>
        </ul>
        {atRiskExample && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">
              Example: {atRiskExample.product.product_name}
            </p>
            <p className="mt-2 text-sm text-amber-800">
              This product still has {formatNumber(atRiskExample.product.total_available)} units in stock, but it is below the reorder target at the locations below, so we flag it as “At-risk”.
            </p>
            <div className="mt-3 space-y-1">
              {atRiskExample.affectedLocations.map((location) => (
                <p key={`callout-${location.name}`} className="text-xs text-amber-800">
                  {location.name}: {formatNumber(location.available)} available vs reorder point {formatNumber(location.reorderPoint)}
                </p>
              ))}
            </div>
            {typeof atRiskExample.minReorderPoint === 'number' && (
              <p className="mt-3 text-xs text-amber-700">
                Restock to at least {formatNumber(atRiskExample.minReorderPoint)} units to move this product back to the healthy range.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Stock Health Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Stock Status Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Package className="w-5 h-5 mr-2 text-blue-600" />
            Stock Health Distribution
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Healthy products</span>
                <span className="font-semibold text-green-600">
                  {formatNumber(healthyProducts)} ({healthyPercent.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${healthyPercent}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">At-risk (low stock)</span>
                <span className="font-semibold text-amber-600">
                  {formatNumber(lowStockProducts)} ({lowPercent.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${lowPercent}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Out of stock</span>
                <span className="font-semibold text-red-600">
                  {formatNumber(outOfStockProducts)} ({outPercent.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${outPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Insights</h3>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-lg">🩺</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Catalogue health</p>
                <p className="text-sm text-gray-600">
                  {totalProducts
                    ? `${formatNumber(healthyProducts)} of ${formatNumber(totalProducts)} products are healthy (${healthyPercent.toFixed(0)}%).`
                    : 'Add products to start tracking stock health.'}
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <span className="text-amber-600 text-lg">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Why items show “Low stock”</p>
                {atRiskExample ? (
                  <>
                    <p className="text-sm text-gray-600">
                      {atRiskExample.product.product_name} is flagged because at least one warehouse fell below its reorder point.
                    </p>
                    <div className="mt-2 space-y-1">
                      {atRiskExample.affectedLocations.map((location) => (
                        <p key={`insight-${location.name}`} className="text-xs text-gray-500">
                          {location.name}: {formatNumber(location.available)} available vs reorder {formatNumber(location.reorderPoint)}
                        </p>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-600">
                    All products are currently above their reorder points.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-lg">�</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Sellable inventory</p>
                <p className="text-sm text-gray-600">
                  {`You have ${formatNumber(aggregateTotals.availableUnits)} sellable units and ${formatNumber(aggregateTotals.reservedUnits)} reserved.`}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {aggregateTotals.atRiskUnits > 0
                    ? `${formatNumber(aggregateTotals.atRiskUnits)} sellable units belong to products flagged as at risk.`
                    : 'None of the sellable units are flagged as at risk right now.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock Status
            </label>
            <select
              value={stockStatus}
              onChange={(e) => setStockStatus(e.target.value as '' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="overstock">Overstock</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'quantity' | 'value' | 'name')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="quantity">Quantity</option>
              <option value="value">Value</option>
              <option value="name">Name</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeValuation}
                onChange={(e) => setIncludeValuation(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Include Valuation
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Stock Items Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Stock Items ({items.length})
            </h3>
            {items.length > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                Showing detailed stock levels for each product across all locations. Status badges compare available units with each warehouse's reorder point.
              </p>
            )}
          </div>
          {summary.low_stock + summary.out_of_stock > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-amber-600 font-medium">
                ⚠️ {formatNumber(summary.low_stock + summary.out_of_stock)} items need restocking
              </span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Qty
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Available
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reserved
                </th>
                {includeValuation && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Value
                  </th>
                )}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Locations
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Restocked
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item: StockLevel, index: number) => {
                const totalReserved = item.locations.reduce((sum, loc) => sum + (loc.reserved || 0), 0);
                const overallStatus = item.total_available === 0 ? 'out_of_stock' 
                  : item.locations.some(loc => loc.status === 'low_stock') ? 'low_stock'
                  : 'in_stock';
                const isExpanded = expandedProducts.has(item.product_id);
                
                return (
                  <React.Fragment key={`product-${item.product_id}-${index}`}>
                    <tr 
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}
                      onClick={() => toggleProductExpansion(item.product_id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-start">
                          <button
                            className="flex-shrink-0 w-6 h-6 flex items-center justify-center mr-2 text-gray-400 hover:text-gray-600 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleProductExpansion(item.product_id);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                            <Package className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.product_name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              SKU: {item.sku}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {item.category || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(overallStatus)}`}>
                          {getStatusLabel(overallStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatNumber(item.total_quantity)}
                        </div>
                        <div className="text-xs text-gray-500">
                          units
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-green-600">
                          {formatNumber(item.total_available)}
                        </div>
                        <div className="text-xs text-gray-500">
                          units
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={`text-sm ${totalReserved > 0 ? 'font-medium text-amber-600' : 'text-gray-400'}`}>
                          {formatNumber(totalReserved)}
                        </div>
                        <div className="text-xs text-gray-500">
                          units
                        </div>
                      </td>
                      {includeValuation && (
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-semibold text-purple-600">
                            {formatCurrency(item.total_value)}
                          </div>
                          <div className="text-xs text-gray-500">
                            total value
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleProductExpansion(item.product_id);
                          }}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                        >
                          📍 {item.locations.length}
                          {isExpanded ? (
                            <ChevronUp className="ml-1 w-3 h-3" />
                          ) : (
                            <ChevronDown className="ml-1 w-3 h-3" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900">
                          {item.last_restocked ? new Date(item.last_restocked).toLocaleDateString() : '-'}
                        </div>
                        {item.last_restocked && (
                          <div className="text-xs text-gray-500">
                            {Math.floor((Date.now() - new Date(item.last_restocked).getTime()) / (1000 * 60 * 60 * 24))} days ago
                          </div>
                        )}
                      </td>
                    </tr>
                    
                    {/* Location Details - Accordion Expandable */}
                    {isExpanded && item.locations.map((location, locIdx) => (
                      <tr key={`product-${item.product_id}-location-${location.warehouse_id}-${locIdx}`} className="bg-gray-50 border-l-4 border-blue-200 animate-fadeIn">
                        <td className="px-6 py-3 pl-16" colSpan={2}>
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-700 mr-2">📍</span>
                            <span className="text-sm font-medium text-gray-900">{location.warehouse_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(location.status)}`}>
                            {getStatusLabel(location.status)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <span className="text-sm text-gray-700 font-medium">
                            {formatNumber(location.quantity)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <span className="text-sm text-green-600 font-medium">
                            {formatNumber(location.available)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <span className={`text-sm ${location.reserved > 0 ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                            {formatNumber(location.reserved)}
                          </span>
                        </td>
                        {includeValuation && <td></td>}
                        <td className="px-6 py-3 text-center">
                          {location.reorder_point && (
                            <span className="text-xs text-gray-600">
                              Reorder at: <span className="font-medium">{location.reorder_point}</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3"></td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {items.length > 0 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                {/* Mobile Pagination */}
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> of{' '}
                    <span className="font-medium">{totalCount}</span> products
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Page Size Selector */}
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1); // Reset to first page
                    }}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>

                  {/* Desktop Pagination */}
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">First</span>
                      ««
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      ‹
                    </button>
                    
                    {/* Page Numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      ›
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Last</span>
                      »»
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}

        {items.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Stock Items Found</h3>
            <p className="text-gray-500 mb-4">
              {stockStatus 
                ? `No items with "${getStatusLabel(stockStatus)}" status` 
                : 'Try adjusting your filters or add products to your inventory'}
            </p>
            {stockStatus && (
              <button
                onClick={() => setStockStatus('')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </ReportContainer>
  );
};

export default StockLevelsPage;
