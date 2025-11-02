import React, { useEffect, useState, useCallback } from 'react';
import { X, Package, ArrowRight, Calendar, User, FileText, Hash, Warehouse } from 'lucide-react';
import type { StockMovement } from '../../../types/reports';
import httpClient from '../../../services/httpClient';
import { useCurrency } from '../../../hooks/useCurrency';

interface MovementDetailModalProps {
  movement: StockMovement;
  isOpen: boolean;
  onClose: () => void;
}

interface SaleDetail {
  id: string;
  sale_number: string;
  total_amount: number;
  payment_method: string;
  customer_name?: string;
  created_at: string;
  storefront?: string;  // Sales should show storefront
  storefront_name?: string;  // Alternative field name
  warehouse_name?: string;  // Fallback if storefront not available
  items_detail: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
    tax?: number;
    profit?: number;
  }>;
  // Backward compatibility - backend may use either 'items' or 'items_detail'
  items?: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
}

interface TransferDetail {
  id: string;
  transfer_number: string;
  // Support multiple transfer types
  from_warehouse?: string;
  to_warehouse?: string;
  from_storefront?: string;
  to_storefront?: string;
  from_warehouse_name?: string;  // Alternative field names
  to_warehouse_name?: string;
  from_storefront_name?: string;
  to_storefront_name?: string;
  status: string;
  created_at: string;
  created_by: string;
  notes?: string;
  items_detail: Array<{
    product_name: string;
    quantity: number;
    supplier?: string;
    cost?: number;
  }>;
  // Backward compatibility
  items?: Array<{
    product_name: string;
    quantity: number;
  }>;
}

interface AdjustmentDetail {
  id: string;
  adjustment_number: string;
  warehouse_name: string;
  adjustment_type: string;
  reason: string;
  created_at: string;
  created_by: string;
  notes?: string;
  items_detail: Array<{
    product_name: string;
    warehouse_name?: string;
    quantity_before: number;
    quantity_after: number;
    adjustment: number;
    direction?: string; // 'increase' or 'decrease'
  }>;
  // Backward compatibility
  items?: Array<{
    product_name: string;
    quantity_before: number;
    quantity_after: number;
    adjustment: number;
  }>;
}

export const MovementDetailModal: React.FC<MovementDetailModalProps> = ({
  movement,
  isOpen,
  onClose,
}) => {
  const { formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saleDetail, setSaleDetail] = useState<SaleDetail | null>(null);
  const [transferDetail, setTransferDetail] = useState<TransferDetail | null>(null);
  const [adjustmentDetail, setAdjustmentDetail] = useState<AdjustmentDetail | null>(null);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { reference_type, reference_id } = movement;
      
      if (reference_type === 'sale') {
        const response = await httpClient.get(`/sales/api/sales/${reference_id}/`);
        setSaleDetail(response.data);
      } else if (reference_type === 'transfer') {
        const response = await httpClient.get(`/inventory/api/transfers/${reference_id}/`);
        setTransferDetail(response.data);
      } else if (reference_type === 'adjustment') {
        const response = await httpClient.get(`/inventory/api/adjustments/${reference_id}/`);
        setAdjustmentDetail(response.data);
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to load details');
    } finally {
      setLoading(false);
    }
  }, [movement]);

  useEffect(() => {
    if (isOpen && movement.reference_id) {
      fetchDetails();
    }
  }, [isOpen, movement.reference_id, fetchDetails]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {movement.reference_type === 'sale' && 'Sale Details'}
                {movement.reference_type === 'transfer' && 'Transfer Details'}
                {movement.reference_type === 'adjustment' && 'Adjustment Details'}
              </h2>
              <p className="text-sm text-gray-500">
                {movement.reference_number || movement.reference_id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
              <p className="text-sm text-red-600 mt-2">
                This might be because the detail page hasn't been built yet, or the record was deleted.
              </p>
            </div>
          )}

          {/* Sale Details */}
          {!loading && !error && saleDetail && (
            <div className="space-y-6">
              {/* Sale Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                    <Hash className="w-4 h-4" />
                    <span>Sale Number</span>
                  </div>
                  <p className="font-medium">{saleDetail.sale_number}</p>
                </div>
                <div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span>Date</span>
                  </div>
                  <p className="font-medium">{formatDate(saleDetail.created_at)}</p>
                </div>
                {(saleDetail.storefront || saleDetail.storefront_name) && (
                  <div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                      <Package className="w-4 h-4" />
                      <span>Storefront</span>
                    </div>
                    <p className="font-medium">{saleDetail.storefront || saleDetail.storefront_name}</p>
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                    <User className="w-4 h-4" />
                    <span>Customer</span>
                  </div>
                  <p className="font-medium">{saleDetail.customer_name || 'Walk-in'}</p>
                </div>
              </div>

              {/* Sale Items */}
              {((saleDetail.items_detail && saleDetail.items_detail.length > 0) || (saleDetail.items && saleDetail.items.length > 0)) && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                          {saleDetail.items_detail?.[0]?.tax !== undefined && (
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tax</th>
                          )}
                          {saleDetail.items_detail?.[0]?.profit !== undefined && (
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(saleDetail.items_detail || saleDetail.items || []).map((item, idx) => {
                          // Fallback: calculate total if backend doesn't provide it
                          const itemTotal = item.total || (item.quantity * item.unit_price);
                          
                          return (
                            <tr key={idx}>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(item.unit_price)}</td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(itemTotal)}</td>
                              {'tax' in item && item.tax !== undefined && (
                                <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(item.tax)}</td>
                              )}
                              {'profit' in item && item.profit !== undefined && (
                                <td className={`px-4 py-3 text-sm font-medium text-right ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(item.profit)}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-900">Total</td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{formatCurrency(saleDetail.total_amount)}</td>
                          {saleDetail.items_detail?.[0]?.tax !== undefined && <td></td>}
                          {saleDetail.items_detail?.[0]?.profit !== undefined && <td></td>}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transfer Details */}
          {!loading && !error && transferDetail && (
            <div className="space-y-6">
              {/* Transfer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                    <Hash className="w-4 h-4" />
                    <span>Transfer Number</span>
                  </div>
                  <p className="font-medium">{transferDetail.transfer_number}</p>
                </div>
                <div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span>Date</span>
                  </div>
                  <p className="font-medium">{formatDate(transferDetail.created_at)}</p>
                </div>
                <div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                    <User className="w-4 h-4" />
                    <span>Created By</span>
                  </div>
                  <p className="font-medium">{transferDetail.created_by}</p>
                </div>
                <div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                    <FileText className="w-4 h-4" />
                    <span>Status</span>
                  </div>
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {transferDetail.status}
                  </span>
                </div>
              </div>

              {/* Transfer Direction */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <p className="text-sm text-gray-500 mb-1">From</p>
                    {(transferDetail.from_warehouse || transferDetail.from_warehouse_name) && (
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Warehouse</p>
                        <p className="font-semibold text-gray-900">{transferDetail.from_warehouse || transferDetail.from_warehouse_name}</p>
                      </div>
                    )}
                    {(transferDetail.from_storefront || transferDetail.from_storefront_name) && (
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Storefront</p>
                        <p className="font-semibold text-gray-900">{transferDetail.from_storefront || transferDetail.from_storefront_name}</p>
                      </div>
                    )}
                  </div>
                  <ArrowRight className="w-6 h-6 text-gray-400 mx-4" />
                  <div className="text-center flex-1">
                    <p className="text-sm text-gray-500 mb-1">To</p>
                    {(transferDetail.to_warehouse || transferDetail.to_warehouse_name) && (
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Warehouse</p>
                        <p className="font-semibold text-gray-900">{transferDetail.to_warehouse || transferDetail.to_warehouse_name}</p>
                      </div>
                    )}
                    {(transferDetail.to_storefront || transferDetail.to_storefront_name) && (
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Storefront</p>
                        <p className="font-semibold text-gray-900">{transferDetail.to_storefront || transferDetail.to_storefront_name}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Transfer Items */}
              {((transferDetail.items_detail && transferDetail.items_detail.length > 0) || (transferDetail.items && transferDetail.items.length > 0)) && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                          {transferDetail.items_detail?.[0]?.supplier && (
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                          )}
                          {transferDetail.items_detail?.[0]?.cost !== undefined && (
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(transferDetail.items_detail || transferDetail.items || []).map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                            {'supplier' in item && item.supplier && (
                              <td className="px-4 py-3 text-sm text-gray-600">{item.supplier}</td>
                            )}
                            {'cost' in item && item.cost !== undefined && (
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(item.cost)}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {transferDetail.notes && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{transferDetail.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Adjustment Details */}
          {!loading && !error && adjustmentDetail && (
            <div className="space-y-6">
              {/* Adjustment Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                    <Hash className="w-4 h-4" />
                    <span>Adjustment Number</span>
                  </div>
                  <p className="font-medium">{adjustmentDetail.adjustment_number}</p>
                </div>
                <div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span>Date</span>
                  </div>
                  <p className="font-medium">{formatDate(adjustmentDetail.created_at)}</p>
                </div>
                <div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                    <Warehouse className="w-4 h-4" />
                    <span>Warehouse</span>
                  </div>
                  <p className="font-medium">{adjustmentDetail.warehouse_name}</p>
                </div>
                <div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                    <User className="w-4 h-4" />
                    <span>Created By</span>
                  </div>
                  <p className="font-medium">{adjustmentDetail.created_by}</p>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                    <FileText className="w-4 h-4" />
                    <span>Reason</span>
                  </div>
                  <p className="font-medium">{adjustmentDetail.reason}</p>
                </div>
              </div>

              {/* Adjustment Items */}
              {((adjustmentDetail.items_detail && adjustmentDetail.items_detail.length > 0) || (adjustmentDetail.items && adjustmentDetail.items.length > 0)) && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          {adjustmentDetail.items_detail?.[0]?.warehouse_name && (
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                          )}
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Before</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">After</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Change</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(adjustmentDetail.items_detail || adjustmentDetail.items || []).map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                            {'warehouse_name' in item && item.warehouse_name && (
                              <td className="px-4 py-3 text-sm text-gray-600">{item.warehouse_name}</td>
                            )}
                            <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.quantity_before}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity_after}</td>
                            <td className={`px-4 py-3 text-sm font-medium text-right ${
                              item.adjustment > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {item.adjustment > 0 ? '+' : ''}{item.adjustment}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {adjustmentDetail.notes && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{adjustmentDetail.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
