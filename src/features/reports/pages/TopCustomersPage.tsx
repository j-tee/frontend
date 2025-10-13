import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw, Award } from 'lucide-react';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { ReportStates } from '../components/ReportStates';
import { customerReportsService } from '../../../services/reportsService';
import type { TopCustomersResponse, TopCustomer } from '../../../types/reports';

const TopCustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<TopCustomersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Filters
  const [startDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate] = useState(new Date().toISOString().split('T')[0]);
  const [sortBy] = useState<'' | 'revenue' | 'frequency' | 'avg_order_value'>('revenue');
  const [limit] = useState(50);

  useEffect(() => {
    loadData();
  }, [startDate, endDate, sortBy, limit]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await customerReportsService.getTopCustomers({
        start_date: startDate,
        end_date: endDate,
        sort_by: sortBy || 'revenue',
        limit
      });
      setData(result);
    } catch (err) {
      setError((err as Error).message || 'Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      await customerReportsService.exportTopCustomersCSV({
        start_date: startDate,
        end_date: endDate,
        sort_by: sortBy || 'revenue',
        limit
      });
    } catch (err) {
      alert('Export failed: ' + (err as Error).message);
    }
  };

  const getLoyaltyTierColor = (tier: string): string => {
    const colors: Record<string, string> = {
      platinum: 'text-purple-700 bg-purple-100',
      gold: 'text-yellow-700 bg-yellow-100',
      silver: 'text-gray-700 bg-gray-100',
      bronze: 'text-amber-700 bg-amber-100'
    };
    return colors[tier] || 'text-gray-700 bg-gray-100';
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      active: 'text-green-700 bg-green-100',
      'at-risk': 'text-amber-700 bg-amber-100',
      inactive: 'text-red-700 bg-red-100'
    };
    return colors[status] || 'text-gray-700 bg-gray-100';
  };

  if (loading) return <ReportStates.Loading />;
  if (error) return <ReportStates.Error error={error} onRetry={loadData} />;
  if (!data) return <ReportStates.Empty message="No customer data available" />;

  return (
    <ReportContainer
      title="Top Customers by Revenue"
      subtitle="Highest value customers ranked by total spend"
      icon="👑"
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <SummaryCard
          title="Total Customers"
          value={data.data.summary.total_customers.toLocaleString()}
        />
        <SummaryCard
          title="Top 10 Revenue"
          value={`₦${data.data.summary.top_10_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        />
        <SummaryCard
          title="Top 10 %"
          value={`${data.data.summary.top_10_percentage.toFixed(1)}%`}
          subtitle="of total revenue"
        />
        <SummaryCard
          title="Avg Customer Value"
          value={`₦${data.data.summary.average_customer_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        />
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Top Customers ({data.data.customers.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Revenue
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchases
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Order
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Purchase
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.data.customers.map((customer: TopCustomer, index: number) => (
                <tr key={customer.customer_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {index < 3 && (
                        <Award className={`w-5 h-5 mr-2 ${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                          'text-amber-600'
                        }`} />
                      )}
                      <span className="text-sm font-medium text-gray-900">
                        #{index + 1}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {customer.customer_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {customer.email && <div>{customer.email}</div>}
                      {customer.phone && <div>{customer.phone}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      ₦{customer.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">
                      {customer.total_purchases}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">
                      ₦{customer.average_order_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLoyaltyTierColor(customer.loyalty_tier)}`}>
                      {customer.loyalty_tier}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(customer.status)}`}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(customer.last_purchase_date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-400">
                      Member since {new Date(customer.first_purchase_date).toLocaleDateString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ReportContainer>
  );
};

export default TopCustomersPage;
