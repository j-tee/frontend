import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Download, RefreshCw, TrendingUp, ShoppingBag, Clock, Heart } from 'lucide-react';
import { ReportContainer } from '../components/ReportContainer';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { ReportStates } from '../components/ReportStates';
import { customerReportsService } from '../../../services/reportsService';
import type { PurchasePatternsResponse, ProductPreference } from '../../../types/reports';

const PurchasePatternsPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<PurchasePatternsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Filters
  const [startDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate] = useState(new Date().toISOString().split('T')[0]);
  const [segment] = useState<'' | 'new' | 'returning' | 'vip' | 'at-risk'>('');

  useEffect(() => {
    loadData();
  }, [startDate, endDate, segment]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const params: Record<string, string> = {
        start_date: startDate,
        end_date: endDate
      };
      if (segment) params.segment = segment;

      const result = await customerReportsService.getPurchasePatterns(params);
      setData(result);
    } catch (err) {
      setError((err as Error).message || 'Failed to load purchase patterns');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params: Record<string, string> = {
        start_date: startDate,
        end_date: endDate
      };
      if (segment) params.segment = segment;
      await customerReportsService.exportPurchasePatternsCSV(params);
    } catch (err) {
      alert('Export failed: ' + (err as Error).message);
    }
  };

  if (loading && !data) return <ReportStates.Loading />;
  if (error) return <ReportStates.Error error={error} onRetry={loadData} />;
  if (!data) return <ReportStates.Empty message="No purchase pattern data available" />;

  return (
    <ReportContainer
      title="Customer Purchase Patterns"
      subtitle="Analyze buying behavior and preferences"
      icon="🛍️"
      actions={
        <>
          <button
            onClick={() => navigate('/app/reports/customer')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <button
            onClick={loadData}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </>
      }
    >
      {/* Date Range Filter */}
      <div className="mb-6">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={() => {}}
          onEndDateChange={() => {}}
        />
      </div>

      {/* Customer Segments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">New Customers</h3>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-gray-900">
              {data.data.segments.new_customers.count}
            </div>
            <div className="text-sm text-gray-600">
              ₦{data.data.segments.new_customers.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500">
              Avg: ₦{data.data.segments.new_customers.average_order_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Returning Customers</h3>
            <Heart className="w-5 h-5 text-green-500" />
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-gray-900">
              {data.data.segments.returning_customers.count}
            </div>
            <div className="text-sm text-gray-600">
              ₦{data.data.segments.returning_customers.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500">
              Retention: {data.data.segments.returning_customers.retention_rate?.toFixed(1) ?? '0'}%
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">VIP Customers</h3>
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-gray-900">
              {data.data.segments.vip_customers.count}
            </div>
            <div className="text-sm text-gray-600">
              ₦{data.data.segments.vip_customers.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500">
              {data.data.segments.vip_customers.percentage_of_total?.toFixed(1) ?? '0'}% of total
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">At Risk</h3>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-gray-900">
              {data.data.segments.at_risk_customers.count}
            </div>
            <div className="text-sm text-gray-600">
              Potential Loss: ₦{(data.data.segments.at_risk_customers.potential_lost_revenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500">
              Avg {data.data.segments.at_risk_customers.last_purchase_days_avg} days
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Behavior */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Purchase Behavior</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-600 mb-1">Avg Time Between Purchases</div>
            <div className="text-2xl font-bold text-gray-900">
              {data.data.purchase_behavior.average_time_between_purchases} days
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Peak Purchase Day</div>
            <div className="text-2xl font-bold text-gray-900">
              {data.data.purchase_behavior.peak_purchase_day}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Peak Purchase Hour</div>
            <div className="text-2xl font-bold text-gray-900">
              {data.data.purchase_behavior.peak_purchase_hour}:00
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Avg Items per Order</div>
            <div className="text-2xl font-bold text-gray-900">
              {data.data.purchase_behavior.average_items_per_order.toFixed(1)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Cross-Sell Rate</div>
            <div className="text-2xl font-bold text-gray-900">
              {data.data.purchase_behavior.cross_sell_rate.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Up-Sell Rate</div>
            <div className="text-2xl font-bold text-gray-900">
              {data.data.purchase_behavior.up_sell_rate.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Product Preferences */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Product Preferences</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customers
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Spend
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Repeat Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.data.product_preferences.map((pref: ProductPreference, index: number) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <ShoppingBag className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{pref.category}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">{pref.customer_count}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      ₦{pref.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">
                      ₦{pref.average_spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">{pref.repeat_purchase_rate.toFixed(1)}%</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Channel Preferences */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Channel Preferences</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {data.data.channel_preferences.in_store.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">In Store</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {data.data.channel_preferences.online.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Online</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {data.data.channel_preferences.phone.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Phone</div>
          </div>
        </div>
      </div>
    </ReportContainer>
  );
};

export default PurchasePatternsPage;
