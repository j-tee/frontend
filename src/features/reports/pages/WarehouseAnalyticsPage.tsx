import React, { useState, useEffect, useCallback } from 'react';
import { Warehouse, TrendingUp, Package, AlertCircle } from 'lucide-react';
import { inventoryReportsService } from '../../../services/reportsService';
import type { WarehouseAnalyticsResponse, WarehouseAnalytics } from '../../../types/reports';
import { useCurrency } from '../../../hooks/useCurrency';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { LoadingState, ErrorState, EmptyState } from '../components/ReportStates';

const WarehouseAnalyticsPage: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const [data, setData] = useState<WarehouseAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date range (default: last 90 days)
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 90);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Filters
  const [warehouseId] = useState<string>('');
  const [expandedWarehouse, setExpandedWarehouse] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {
        start_date: startDate,
        end_date: endDate
      };
      if (warehouseId) params.warehouse_id = warehouseId;

      const response = await inventoryReportsService.getWarehouseAnalytics(params);
      setData(response);
    } catch (err) {
      setError((err as Error).message || 'Failed to load warehouse analytics');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, warehouseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    try {
      await inventoryReportsService.exportWarehouseAnalyticsCSV({
        start_date: startDate,
        end_date: endDate,
        warehouse_id: warehouseId
      });
    } catch (err) {
      alert('Export failed: ' + (err as Error).message);
    }
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const toggleWarehouse = (id: string) => {
    setExpandedWarehouse(expandedWarehouse === id ? null : id);
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;
  if (!data?.data) return <EmptyState />;

  const warehouses = data.data.warehouses || [];

  // Calculate aggregate metrics
  const totalProducts = warehouses.reduce((sum, w) => sum + w.metrics.total_products, 0);
  const totalValue = warehouses.reduce((sum, w) => sum + w.metrics.total_stock_value, 0);
  const avgTurnover = warehouses.length > 0 
    ? warehouses.reduce((sum, w) => sum + w.metrics.stock_turnover_ratio, 0) / warehouses.length 
    : 0;
  const totalDeadStock = warehouses.reduce((sum, w) => sum + w.metrics.dead_stock_count, 0);

  return (
    <ReportContainer
      title="Warehouse Analytics"
      subtitle="Performance metrics by location"
      icon="🏢"
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

      {/* Overall Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <SummaryCard
          title="Total Warehouses"
          value={warehouses.length.toLocaleString()}
          icon="🏢"
          color="bg-blue-50 border-blue-200"
          subtitle={`${totalProducts.toLocaleString()} products`}
        />
        <SummaryCard
          title="Total Stock Value"
          value={formatCurrency(totalValue)}
          icon="💰"
          color="bg-green-50 border-green-200"
          subtitle="Across all locations"
        />
        <SummaryCard
          title="Avg Turnover Ratio"
          value={avgTurnover.toFixed(2)}
          icon="🔄"
          color="bg-purple-50 border-purple-200"
          subtitle={avgTurnover >= 4 ? 'Healthy' : 'Needs improvement'}
        />
        <SummaryCard
          title="Dead Stock Items"
          value={totalDeadStock.toLocaleString()}
          icon="⚠️"
          color="bg-amber-50 border-amber-200"
          subtitle="180+ days no movement"
        />
      </div>

      {/* Warehouse Cards */}
      <div className="space-y-6">
        {warehouses.map((warehouse: WarehouseAnalytics) => (
          <div key={warehouse.warehouse_id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Warehouse Header */}
            <div 
              className="px-6 py-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => toggleWarehouse(warehouse.warehouse_id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Warehouse className="w-6 h-6 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {warehouse.warehouse_name}
                    </h3>
                    <span className="text-sm text-gray-600 capitalize">
                      {warehouse.warehouse_type}
                    </span>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <span className="text-2xl">
                    {expandedWarehouse === warehouse.warehouse_id ? '−' : '+'}
                  </span>
                </button>
              </div>
            </div>

            {/* Warehouse Metrics */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-blue-900 mb-1">Total Products</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {warehouse.metrics.total_products.toLocaleString()}
                  </div>
                  <div className="text-xs text-blue-700 mt-1">
                    Value: {formatCurrency(warehouse.metrics.total_stock_value)}
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-green-900 mb-1">Turnover Ratio</div>
                  <div className="text-2xl font-bold text-green-600">
                    {warehouse.metrics.stock_turnover_ratio.toFixed(2)}
                  </div>
                  <div className="text-xs text-green-700 mt-1">
                    Avg Days: {warehouse.metrics.average_days_in_stock}
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-amber-900 mb-1">Dead Stock</div>
                  <div className="text-2xl font-bold text-amber-600">
                    {warehouse.metrics.dead_stock_count}
                  </div>
                  <div className="text-xs text-amber-700 mt-1">
                    Value: {formatCurrency(warehouse.metrics.dead_stock_value)}
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-purple-900 mb-1">Storage Utilization</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {formatPercentage(warehouse.metrics.storage_utilization)}
                  </div>
                  <div className="text-xs text-purple-700 mt-1">
                    Accuracy: {formatPercentage(warehouse.metrics.stock_accuracy)}
                  </div>
                </div>
              </div>

              {/* Movement Stats */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Movement Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-600">Inbound</div>
                    <div className="text-lg font-semibold text-green-600">
                      {warehouse.metrics.movements.inbound.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Outbound</div>
                    <div className="text-lg font-semibold text-red-600">
                      {warehouse.metrics.movements.outbound.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Transfers In</div>
                    <div className="text-lg font-semibold text-blue-600">
                      {warehouse.metrics.movements.transfers_in.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Transfers Out</div>
                    <div className="text-lg font-semibold text-purple-600">
                      {warehouse.metrics.movements.transfers_out.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedWarehouse === warehouse.warehouse_id && (
                <div className="space-y-6">
                  {/* Top Products */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <TrendingUp className="w-4 h-4 text-green-600 mr-2" />
                      Top Performing Products
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Quantity</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Value</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Turnover</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {warehouse.top_products.map((product, idx) => (
                            <tr key={product.product_id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm text-gray-900">
                                <span className="text-xs text-gray-500 mr-2">#{idx + 1}</span>
                                {product.product_name}
                              </td>
                              <td className="px-4 py-2 text-sm text-right text-gray-900">
                                {product.quantity.toLocaleString()}
                              </td>
                              <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                                {formatCurrency(product.value)}
                              </td>
                              <td className="px-4 py-2 text-sm text-right">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  {product.turnover_rate.toFixed(1)}x
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Slow Movers */}
                  {warehouse.slow_movers.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        <AlertCircle className="w-4 h-4 text-amber-600 mr-2" />
                        Slow Moving Items
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Quantity</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Value</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Days Since Sale</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {warehouse.slow_movers.map((product) => (
                              <tr key={product.product_id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {product.product_name}
                                </td>
                                <td className="px-4 py-2 text-sm text-right text-gray-900">
                                  {product.quantity.toLocaleString()}
                                </td>
                                <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                                  {formatCurrency(product.value)}
                                </td>
                                <td className="px-4 py-2 text-sm text-right">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    product.days_since_last_sale >= 180 
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {product.days_since_last_sale} days
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {warehouses.length === 0 && (
        <div className="text-center py-12">
          <Warehouse className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No warehouse data available</p>
        </div>
      )}

      {/* Insights */}
      {warehouses.length > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <Package className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Performance Insights</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  • Average turnover ratio of {avgTurnover.toFixed(2)} 
                  {avgTurnover >= 4 ? ' indicates healthy inventory movement' : ' suggests slow inventory turnover'}
                </li>
                {totalDeadStock > 0 && (
                  <li>• {totalDeadStock} items with no movement in 180+ days need attention</li>
                )}
                <li>
                  • Total stock value: {formatCurrency(totalValue)} across {warehouses.length} locations
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </ReportContainer>
  );
};

export default WarehouseAnalyticsPage;
