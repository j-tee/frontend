import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { financialReportsService } from '../../../services/reportsService';
import type { ARAgingResponse } from '../../../types/reports';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { LoadingState, ErrorState, EmptyState } from '../components/ReportStates';

const ARAgingPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ARAgingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asOfDate, setAsOfDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await financialReportsService.getARAging({
        start_date: asOfDate,
        end_date: asOfDate,
      });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [asOfDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    try {
      await financialReportsService.exportARAgingCSV({
        start_date: asOfDate,
        end_date: asOfDate,
      });
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;
  if (!data?.data) return <EmptyState />;

  const summary = data.data.summary;
  const agingBuckets = data.data.aging_buckets || [];
  const customers = data.data.customers || [];

  return (
    <ReportContainer
      title="Accounts Receivable Aging"
      subtitle="Outstanding customer balances by age"
      actions={
        <>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            📥 Export CSV
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            🔄 Refresh
          </button>
        </>
      }
    >
      {/* Back Button */}
      <button
        onClick={() => navigate('/app/reports/financial')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        ← Back to Financial Reports
      </button>

      {/* Date Filter */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">📅</span>
          <label className="text-sm font-medium text-gray-700">As of Date:</label>
        </div>
        <input
          type="date"
          value={asOfDate}
          onChange={(e) => setAsOfDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <SummaryCard
          title="Total Outstanding"
          value={formatCurrency(summary.total_outstanding)}
          icon="💰"
          subtitle={`${summary.total_customers} customers`}
        />
        <SummaryCard
          title="Current (0-30 days)"
          value={formatCurrency(summary.current)}
          icon="📅"
          color="bg-green-50 border-green-200"
        />
        <SummaryCard
          title="Overdue (31+ days)"
          value={formatCurrency(
            parseFloat(summary.days_31_60.toString()) +
            parseFloat(summary.days_61_90.toString()) +
            parseFloat(summary.over_90_days.toString())
          )}
          icon="⚠️"
          color="bg-red-50 border-red-200"
        />
        <SummaryCard
          title="Average Days Outstanding"
          value={`${summary.average_days_outstanding} days`}
          icon="⏱️"
          color="bg-blue-50 border-blue-200"
        />
      </div>

      {/* Aging Buckets Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Aging Analysis</h3>
        <div className="space-y-4">
          {agingBuckets.map((bucket, index) => (
            <div key={index}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 min-w-[120px]">
                    {bucket.bucket}
                  </span>
                  <span className="text-sm text-gray-500">
                    {bucket.customer_count} customers
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(bucket.amount)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatPercent(bucket.percentage)}
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    index === 0
                      ? 'bg-green-500'
                      : index === 1
                      ? 'bg-yellow-500'
                      : index === 2
                      ? 'bg-orange-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${bucket.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Details Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Customer Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Outstanding
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  31-60 Days
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  61-90 Days
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  90+ Days
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days Overdue
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credit Usage
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr key={customer.customer_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {customer.customer_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Last payment: {customer.last_payment_date || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(customer.total_outstanding)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-500">
                    {formatCurrency(customer.current)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-500">
                    {formatCurrency(customer.days_31_60)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-500">
                    {formatCurrency(customer.days_61_90)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-500">
                    {formatCurrency(customer.over_90_days)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        customer.days_overdue > 60
                          ? 'bg-red-100 text-red-800'
                          : customer.days_overdue > 30
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {customer.days_overdue} days
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm font-medium text-gray-900">
                        {formatPercent(customer.credit_used_percentage)}
                      </span>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            customer.credit_used_percentage > 80
                              ? 'bg-red-500'
                              : customer.credit_used_percentage > 60
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(customer.credit_used_percentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatCurrency(customer.total_outstanding)} / {formatCurrency(customer.credit_limit)}
                      </span>
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

export default ARAgingPage;
