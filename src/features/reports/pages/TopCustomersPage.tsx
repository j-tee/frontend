import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw, Award } from 'lucide-react';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { ReportStates } from '../components/ReportStates';
import { customerReportsService } from '../../../services/reportsService';
import { useCurrency } from '../../../hooks/useCurrency';
import { useAppSelector } from '../../../hooks';
import { selectStorefrontsLoading, selectUserStorefronts } from '../../../store/slices/authSlice';
import type { ReportFilters, TopCustomersResponse, TopCustomer } from '../../../types/reports';

const getDefaultStartDate = (): string => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
};

const getToday = (): string => new Date().toISOString().split('T')[0];

const TopCustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<TopCustomersResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { formatCurrency } = useCurrency();
  const storefronts = useAppSelector(selectUserStorefronts);
  const storefrontsLoading = useAppSelector(selectStorefrontsLoading);

  // Filters
  const [startDate, setStartDate] = useState<string>(getDefaultStartDate);
  const [endDate, setEndDate] = useState<string>(getToday);
  const [sortBy, setSortBy] = useState<'revenue' | 'frequency' | 'avg_order_value'>('revenue');
  const [limit, setLimit] = useState<number>(50);
  const [storefrontId, setStorefrontId] = useState<string>('');

  const storefrontOptions = useMemo(() => {
    const items = storefronts ?? [];
    return items.map((storefront) => ({ id: storefront.id, name: storefront.name }));
  }, [storefronts]);

  const buildFilters = useCallback((): ReportFilters => {
    const filters: ReportFilters = {
      start_date: startDate,
      end_date: endDate,
      sort_by: sortBy,
      limit,
    };

    if (storefrontId) {
      filters.storefront_id = storefrontId;
    }

    return filters;
  }, [endDate, limit, sortBy, startDate, storefrontId]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await customerReportsService.getTopCustomers(buildFilters());
      
      // Handle nested API response structure
      if (result.success && result.data) {
        setData(result.data);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to load customer data');
    } finally {
      setLoading(false);
    }
  }, [buildFilters]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleExport = async () => {
    try {
      await customerReportsService.exportTopCustomersCSV(buildFilters());
    } catch (err) {
      alert('Export failed: ' + (err as Error).message);
    }
  };

  const handleClearFilters = () => {
    setStartDate(getDefaultStartDate());
    setEndDate(getToday());
    setSortBy('revenue');
    setLimit(50);
    setStorefrontId('');
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
  if (error) return <ReportStates.Error error={error} onRetry={() => { void loadData(); }} />;
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
            onClick={() => {
              void loadData();
            }}
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
      {/* Filters */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              showPresets={true}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="top-customers-storefront">
              Storefront
            </label>
            <select
              id="top-customers-storefront"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={storefrontId}
              onChange={(event) => setStorefrontId(event.target.value)}
              disabled={storefrontsLoading}
            >
              <option value="">All Storefronts</option>
              {storefrontOptions.map((storefront) => (
                <option key={storefront.id} value={storefront.id}>
                  {storefront.name}
                </option>
              ))}
            </select>
            {storefrontsLoading && <p className="mt-1 text-xs text-gray-500">Loading storefronts…</p>}
            {!storefrontsLoading && storefrontOptions.length === 0 && (
              <p className="mt-1 text-xs text-gray-500">No storefronts available</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="top-customers-sort">
              Sort By
            </label>
            <select
              id="top-customers-sort"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as 'revenue' | 'frequency' | 'avg_order_value')}
            >
              <option value="revenue">Revenue</option>
              <option value="frequency">Purchase Frequency</option>
              <option value="avg_order_value">Average Order Value</option>
            </select>
            <label className="block text-sm font-medium text-gray-700 mb-1 mt-3" htmlFor="top-customers-limit">
              Result Limit
            </label>
            <select
              id="top-customers-limit"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
            >
              <option value={25}>Top 25</option>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
            </select>
            <button
              className="w-full mt-3 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <SummaryCard
          title="Total Customers"
          value={data.summary.total_customers.toLocaleString()}
        />
        <SummaryCard
          title="Top 10 Revenue"
          value={formatCurrency(data.summary.top_10_revenue)}
        />
        <SummaryCard
          title="Top 10 %"
          value={`${data.summary.top_10_percentage.toFixed(1)}%`}
          subtitle="of total revenue"
        />
        <SummaryCard
          title="Avg Customer Value"
          value={formatCurrency(data.summary.average_customer_value)}
        />
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Top Customers ({data.customers.length})
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
              {data.customers.map((customer: TopCustomer, index: number) => (
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
                      {formatCurrency(customer.total_revenue)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">
                      {customer.total_purchases}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(customer.average_order_value)}
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
