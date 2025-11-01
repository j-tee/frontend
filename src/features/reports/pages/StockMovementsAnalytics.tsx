import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Package, Activity } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { inventoryReportsService } from '../../../services/reportsService';
import type { MovementAnalytics } from '../../../types/reports';
import { ReportContainer } from '../components/ReportContainer';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { LoadingState, ErrorState, EmptyState } from '../components/ReportStates';

const StockMovementsAnalytics: React.FC = () => {
  const [data, setData] = useState<MovementAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date range (default: last 30 days)
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await inventoryReportsService.getMovementAnalytics(
        startDate,
        endDate
      );
      if (response.success) {
        setData(response.data);
      } else {
        setError('Failed to load analytics data');
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics. Make sure the backend endpoint is available.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Chart colors
  const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  // Prepare pie chart data
  const pieChartData = data ? [
    { name: 'Sales', value: data.movement_breakdown.sales, percentage: data.movement_breakdown.sales_percentage },
    { name: 'Transfers', value: data.movement_breakdown.transfers, percentage: data.movement_breakdown.transfers_percentage },
    { name: 'Adjustments', value: data.movement_breakdown.adjustments, percentage: data.movement_breakdown.adjustments_percentage },
  ] : [];

  return (
    <ReportContainer
      title="Stock Movements Analytics"
      subtitle="Comprehensive movement analytics and insights"
    >
      {/* Filters */}
      <div className="mb-6">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onApply={fetchData}
        />
      </div>

      {/* Loading State */}
      {loading && <LoadingState message="Loading analytics data..." />}

      {/* Error State */}
      {error && !loading && (
        <ErrorState
          error={error}
          onRetry={fetchData}
        />
      )}

      {/* Empty State */}
      {!data && !loading && !error && (
        <EmptyState
          message="No analytics data available"
          icon="📊"
        />
      )}

      {/* Analytics Dashboard */}
      {data && !loading && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Movements */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Movements</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {data.metrics.total_movements.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {data.metrics.date_range_days} days
                  </p>
                </div>
                <Activity className="w-10 h-10 text-blue-500" />
              </div>
            </div>

            {/* Avg Daily Movement */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Daily Movement</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {data.metrics.avg_daily_movement.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    per day
                  </p>
                </div>
                <TrendingUp className="w-10 h-10 text-green-500" />
              </div>
            </div>

            {/* Unique Products */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unique Products</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {data.metrics.unique_products.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    with movement
                  </p>
                </div>
                <Package className="w-10 h-10 text-purple-500" />
              </div>
            </div>

            {/* Stock Velocity */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Stock Velocity</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {data.metrics.stock_velocity_days.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    days between moves
                  </p>
                </div>
                <TrendingDown className="w-10 h-10 text-amber-500" />
              </div>
            </div>
          </div>

          {/* Charts Row 1: Top Sellers & Movement Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Sellers Chart */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Selling Products</h3>
              {data.top_sellers.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={data.top_sellers} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="product_name" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="quantity_sold" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No sales data available
                </div>
              )}
            </div>

            {/* Movement Breakdown Pie Chart */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Movement Type Distribution</h3>
              <div className="grid grid-cols-1 gap-4">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Stats */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-sm font-medium text-gray-700">Sales</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {data.movement_breakdown.sales.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-medium text-gray-700">Transfers</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {data.movement_breakdown.transfers.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-gray-700">Adjustments</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {data.movement_breakdown.adjustments.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Trend Chart */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Movement Trend</h3>
            {data.daily_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.daily_trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="transfers" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="adjustments" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No trend data available
              </div>
            )}
          </div>

          {/* Shrinkage Leaders Table */}
          {data.shrinkage_leaders.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Shrinkage Leaders</h3>
              <p className="text-sm text-gray-600 mb-4">
                Products with the highest negative adjustments (shrinkage/damage)
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity Lost
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value Impact
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.shrinkage_leaders.map((product, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {product.product_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{product.sku}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-semibold text-red-600">
                            {product.quantity.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-semibold text-red-600">
                            ${product.value_impact.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
    </ReportContainer>
  );
};

export default StockMovementsAnalytics;
