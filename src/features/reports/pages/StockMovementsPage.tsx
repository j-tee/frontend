import React, { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, Activity, TrendingUp, TrendingDown, ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { inventoryReportsService } from '../../../services/reportsService';
import type { StockMovementsResponse, StockMovement } from '../../../types/reports';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { LoadingState, ErrorState, EmptyState } from '../components/ReportStates';

const StockMovementsPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<StockMovementsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date range (default: last 30 days)
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Filters
  const [productId] = useState<string>('');
  const [warehouseId] = useState<string>('');
  const [movementType, setMovementType] = useState<'in' | 'out' | 'adjustment' | 'transfer' | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {
        start_date: startDate,
        end_date: endDate,
        page,
        page_size: pageSize
      };
      if (productId) params.product_id = productId;
      if (warehouseId) params.warehouse_id = warehouseId;
      if (movementType) params.movement_type = movementType;

      const response = await inventoryReportsService.getStockMovements(params);
      setData(response);
    } catch (err) {
      setError((err as Error).message || 'Failed to load stock movements');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, productId, warehouseId, movementType, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    try {
      await inventoryReportsService.exportStockMovementsCSV({
        start_date: startDate,
        end_date: endDate,
        product_id: productId,
        warehouse_id: warehouseId,
        movement_type: movementType || undefined
      });
    } catch (err) {
      alert('Export failed: ' + (err as Error).message);
    }
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

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;
  if (!data?.data) return <EmptyState />;

  const summary = data.data.summary;
  const movements = data.data.movements || [];
  const pagination = data.data.pagination;

  return (
    <ReportContainer
      title="Stock Movement History"
      subtitle="Track all inventory transactions"
      icon="📊"
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
          value={summary.total_movements.toLocaleString()}
          icon="📊"
          color="bg-blue-50 border-blue-200"
          subtitle="All transactions"
        />
        <SummaryCard
          title="Stock In"
          value={summary.total_in.toLocaleString()}
          icon="📥"
          color="bg-green-50 border-green-200"
          subtitle="Inbound movements"
        />
        <SummaryCard
          title="Stock Out"
          value={summary.total_out.toLocaleString()}
          icon="📤"
          color="bg-red-50 border-red-200"
          subtitle="Outbound movements"
        />
        <SummaryCard
          title="Adjustments"
          value={summary.total_adjustments.toLocaleString()}
          icon="⚖️"
          color="bg-amber-50 border-amber-200"
          subtitle="Manual adjustments"
        />
        <SummaryCard
          title="Transfers"
          value={summary.total_transfers.toLocaleString()}
          icon="🔄"
          color="bg-purple-50 border-purple-200"
          subtitle="Inter-warehouse"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <option value="transfer">Transfer</option>
            </select>
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Movements ({movements.length} of {pagination.total.toLocaleString()})
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
                      {movement.quantity.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <span className="text-gray-600">{movement.quantity_before.toLocaleString()}</span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span className="font-medium text-gray-900">{movement.quantity_after.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900 capitalize">
                        {movement.reference_type.replace('_', ' ')}
                      </div>
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
      {pagination.total_pages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, pagination.total)} of{' '}
            {pagination.total.toLocaleString()} movements
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {page} of {pagination.total_pages}
            </span>
            <button
              onClick={() => setPage(Math.min(pagination.total_pages, page + 1))}
              disabled={page === pagination.total_pages}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </ReportContainer>
  );
};

export default StockMovementsPage;
