import React, { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, AlertTriangle, Package, Clock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { inventoryReportsService } from '../../../services/reportsService';
import type { LowStockAlertsResponse, LowStockAlert } from '../../../types/reports';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { LoadingState, ErrorState, EmptyState } from '../components/ReportStates';

const LowStockAlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<LowStockAlertsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [warehouseId] = useState<string>('');
  const [categoryId] = useState<string>('');
  const [urgency, setUrgency] = useState<'critical' | 'warning' | 'watch' | ''>('');
  const [sortBy, setSortBy] = useState<'urgency' | 'days_remaining' | 'value'>('urgency');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { sort_by: sortBy };
      if (warehouseId) params.warehouse_id = warehouseId;
      if (categoryId) params.category_id = categoryId;
      if (urgency) params.urgency = urgency;

      const response = await inventoryReportsService.getLowStockAlerts(params);
      
      // Handle nested API response structure
      if (response.success && response.data) {
        setData(response.data);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to load low stock alerts');
    } finally {
      setLoading(false);
    }
  }, [warehouseId, categoryId, urgency, sortBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    try {
      await inventoryReportsService.exportLowStockAlertsCSV({
        warehouse_id: warehouseId,
        category_id: categoryId,
        urgency: urgency || undefined,
        sort_by: sortBy
      });
    } catch (err) {
      alert('Export failed: ' + (err as Error).message);
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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
      actions={
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/app/reports/inventory')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="watch">Watch</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'urgency' | 'days_remaining' | 'value')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="urgency">Urgency</option>
              <option value="days_remaining">Days Remaining</option>
              <option value="value">Restock Value</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">
            Low Stock Alerts ({alerts.length})
          </h3>
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
              {alerts.map((alert: LowStockAlert) => (
                <tr key={`${alert.product_id}-${alert.warehouse_id}`} className="hover:bg-gray-50">
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
