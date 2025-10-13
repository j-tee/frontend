import React, { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, Package, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { inventoryReportsService } from '../../../services/reportsService';
import type { StockLevelsResponse, StockLevel } from '../../../types/reports';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { LoadingState, ErrorState, EmptyState } from '../components/ReportStates';

const StockLevelsPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<StockLevelsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [warehouseId] = useState<string>('');
  const [categoryId] = useState<string>('');
  const [stockStatus, setStockStatus] = useState<'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock' | ''>('');
  const [includeValuation, setIncludeValuation] = useState(true);
  const [sortBy, setSortBy] = useState<'quantity' | 'value' | 'name'>('quantity');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {
        include_valuation: includeValuation,
        sort_by: sortBy
      };
      if (warehouseId) params.warehouse_id = warehouseId;
      if (categoryId) params.category_id = categoryId;
      if (stockStatus) params.stock_status = stockStatus;

      const response = await inventoryReportsService.getStockLevels(params);
      setData(response);
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
      console.error('Stock levels fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [warehouseId, categoryId, stockStatus, includeValuation, sortBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    try {
      await inventoryReportsService.exportStockLevelsCSV({
        warehouse_id: warehouseId,
        category_id: categoryId,
        stock_status: stockStatus || undefined,
        include_valuation: includeValuation,
        sort_by: sortBy
      });
    } catch (err) {
      alert('Export failed: ' + (err as Error).message);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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

  return (
    <ReportContainer
      title="Stock Levels Summary"
      subtitle="Current inventory status across all locations"
      icon="📦"
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
          title="Total Products"
          value={summary.total_products.toLocaleString()}
          icon="📦"
          color="bg-blue-50 border-blue-200"
          subtitle={`${summary.total_variants.toLocaleString()} variants`}
        />
        <SummaryCard
          title="In Stock"
          value={summary.in_stock.toLocaleString()}
          icon="✅"
          color="bg-green-50 border-green-200"
          change={((summary.in_stock / summary.total_products) * 100)}
          changeLabel="of total"
        />
        <SummaryCard
          title="Low Stock Items"
          value={summary.low_stock.toLocaleString()}
          icon="⚠️"
          color="bg-amber-50 border-amber-200"
          subtitle={`${summary.out_of_stock} out of stock`}
        />
        {includeValuation && (
          <SummaryCard
            title="Total Stock Value"
            value={formatCurrency(summary.total_stock_value)}
            icon="💰"
            color="bg-purple-50 border-purple-200"
            subtitle={`${summary.warehouses_count} locations`}
          />
        )}
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
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">
            Stock Items ({items.length})
          </h3>
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Qty
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Available
                </th>
                {includeValuation && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
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
              {items.map((item: StockLevel) => (
                <React.Fragment key={item.product_id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.product_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          SKU: {item.sku}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {item.total_quantity.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {item.total_available.toLocaleString()}
                    </td>
                    {includeValuation && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {formatCurrency(item.total_value)}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.locations.length} {item.locations.length === 1 ? 'location' : 'locations'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                      {item.last_restocked ? new Date(item.last_restocked).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                  
                  {/* Location Details */}
                  {item.locations.map((location) => (
                    <tr key={`${item.product_id}-${location.warehouse_id}`} className="bg-gray-50">
                      <td className="px-6 py-2 pl-12" colSpan={2}>
                        <div className="text-sm text-gray-600">
                          📍 {location.warehouse_name}
                        </div>
                      </td>
                      <td className="px-6 py-2 text-sm text-right text-gray-700">
                        {location.quantity.toLocaleString()}
                      </td>
                      <td className="px-6 py-2 text-sm text-right">
                        <span className="text-gray-700">
                          {location.available.toLocaleString()}
                        </span>
                        {location.reserved > 0 && (
                          <span className="text-amber-600 text-xs ml-1">
                            ({location.reserved} reserved)
                          </span>
                        )}
                      </td>
                      {includeValuation && <td></td>}
                      <td className="px-6 py-2 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(location.status)}`}>
                          {getStatusLabel(location.status)}
                        </span>
                      </td>
                      <td className="px-6 py-2 text-sm text-center text-gray-600">
                        {location.reorder_point && (
                          <span className="text-xs">
                            Reorder: {location.reorder_point}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {items.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No stock items found</p>
          </div>
        )}
      </div>
    </ReportContainer>
  );
};

export default StockLevelsPage;
