import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from 'react-bootstrap';
import { X, TrendingUp, TrendingDown, Package, Warehouse } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { inventoryReportsService } from '../../../services/reportsService';
import type { ProductMovementSummary } from '../../../types/reports';

interface ProductMovementSummaryModalProps {
  show: boolean;
  onHide: () => void;
  productId: string;
  productName: string;
  startDate: string;
  endDate: string;
}

export const ProductMovementSummaryModal: React.FC<ProductMovementSummaryModalProps> = ({
  show,
  onHide,
  productId,
  productName,
  startDate,
  endDate
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ProductMovementSummary | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await inventoryReportsService.getProductMovementSummary(
        productId,
        startDate,
        endDate
      );
      if (response.success) {
        setSummary(response.data);
      } else {
        setError('Failed to load product summary');
      }
    } catch (err) {
      setError('Failed to load product summary. Make sure the backend endpoint is available.');
    } finally {
      setLoading(false);
    }
  }, [productId, startDate, endDate]);

  useEffect(() => {
    if (show && productId) {
      fetchSummary();
    }
  }, [show, productId, fetchSummary]);

  // Prepare data for movement breakdown chart
  const movementChartData = summary ? [
    { name: 'Sales', value: Math.abs(summary.movements.sales), color: '#ef4444' },
    { name: 'Transfers In', value: summary.movements.transfers_in, color: '#10b981' },
    { name: 'Transfers Out', value: Math.abs(summary.movements.transfers_out), color: '#f59e0b' },
    { name: 'Adjustments Up', value: summary.movements.adjustments_up, color: '#3b82f6' },
    { name: 'Adjustments Down', value: Math.abs(summary.movements.adjustments_down), color: '#8b5cf6' },
  ].filter(item => item.value > 0) : [];

  // Prepare data for warehouse distribution pie chart
  const warehouseChartData = summary?.by_warehouse.map(wh => ({
    name: wh.warehouse_name,
    value: wh.quantity,
    percentage: wh.percentage
  })) || [];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header className="border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between w-full">
          <div>
            <Modal.Title className="text-xl font-bold text-gray-900">
              Product Movement Summary
            </Modal.Title>
            <p className="text-sm text-gray-600 mt-1">
              {productName} • {startDate} to {endDate}
            </p>
          </div>
          <button
            onClick={onHide}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </Modal.Header>

      <Modal.Body className="p-6">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-600">Loading product summary...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {summary && !loading && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Current Stock</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">
                      {summary.current_stock.toLocaleString()}
                    </p>
                  </div>
                  <Package className="w-10 h-10 text-blue-400" />
                </div>
              </div>

              <div className={`border rounded-lg p-4 ${
                summary.net_change >= 0 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      summary.net_change >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      Net Change
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${
                      summary.net_change >= 0 ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {summary.net_change >= 0 ? '+' : ''}{summary.net_change.toLocaleString()}
                    </p>
                  </div>
                  {summary.net_change >= 0 ? (
                    <TrendingUp className="w-10 h-10 text-green-400" />
                  ) : (
                    <TrendingDown className="w-10 h-10 text-red-400" />
                  )}
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-700 font-medium">SKU</p>
                    <p className="text-lg font-bold text-purple-900 mt-1">
                      {summary.sku}
                    </p>
                  </div>
                  <Warehouse className="w-10 h-10 text-purple-400" />
                </div>
              </div>
            </div>

            {/* Movement Breakdown Chart */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Movement Breakdown</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar Chart */}
                <div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={movementChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6">
                        {movementChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Movement Stats */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="text-sm font-medium text-red-700">Sales</span>
                    <span className="text-lg font-bold text-red-900">
                      {summary.movements.sales.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-green-700">Transfers In</span>
                    <span className="text-lg font-bold text-green-900">
                      +{summary.movements.transfers_in.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <span className="text-sm font-medium text-amber-700">Transfers Out</span>
                    <span className="text-lg font-bold text-amber-900">
                      {summary.movements.transfers_out.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-blue-700">Adjustments Up</span>
                    <span className="text-lg font-bold text-blue-900">
                      +{summary.movements.adjustments_up.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium text-purple-700">Adjustments Down</span>
                    <span className="text-lg font-bold text-purple-900">
                      {summary.movements.adjustments_down.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Warehouse Distribution */}
            {warehouseChartData.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Warehouse Distribution</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pie Chart */}
                  <div className="flex justify-center">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={warehouseChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) => `${name}: ${percentage}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {warehouseChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Warehouse List */}
                  <div className="space-y-2">
                    {summary.by_warehouse.map((wh, index) => (
                      <div
                        key={wh.warehouse_id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm font-medium text-gray-900">
                            {wh.warehouse_name}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">
                            {wh.quantity.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {wh.percentage.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="border-t border-gray-200 bg-gray-50">
        <button
          onClick={onHide}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Close
        </button>
      </Modal.Footer>
    </Modal>
  );
};
