import React, { useState, useEffect } from 'react';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { LoadingState, ErrorState, EmptyState } from '../components/ReportStates';
import { salesReportsService } from '../../../services/reportsService';
import type { SalesSummaryResponse } from '../../../types/reports';
import { useCurrency } from '../../../hooks/useCurrency';

const SalesSummaryPage: React.FC = () => {
  const { formatCurrency } = useCurrency();
  
  // State
  const [data, setData] = useState<SalesSummaryResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Filters - default to last 30 days
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await salesReportsService.getSummary({
        start_date: startDate,
        end_date: endDate,
        period_type: 'daily',
        compare_previous: true,
      });
      if (result.success && result.data) {
        setData(result.data);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const errorMessage = error.response?.data?.error?.message || 
                          error.message || 
                          'Failed to load sales summary report';
      setError(errorMessage);
      console.error('Error fetching sales summary:', err);
    } finally {
      setLoading(false);
    }
  };

  // Export to CSV
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      await salesReportsService.exportSummaryCSV({
        start_date: startDate,
        end_date: endDate,
        period_type: 'daily',
      });
    } catch (err) {
      console.error('Error exporting CSV:', err);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    try {
      setExporting(true);
      await salesReportsService.exportSummaryPDF({
        start_date: startDate,
        end_date: endDate,
        period_type: 'daily',
      });
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Load on mount and when filters change
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  // Format number with null safety
  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return '0';
    return value.toLocaleString();
  };

  // Loading state
  if (loading) {
    return (
      <ReportContainer title="Sales Summary Report" icon="📊">
        <LoadingState message="Loading sales data..." />
      </ReportContainer>
    );
  }

  // Error state
  if (error) {
    return (
      <ReportContainer title="Sales Summary Report" icon="📊">
        <ErrorState error={error} onRetry={fetchData} />
      </ReportContainer>
    );
  }

  // No data
  if (!data || !data.summary || !data.breakdown || !data.top_selling_hours) {
    return (
      <ReportContainer title="Sales Summary Report" icon="📊">
        <EmptyState />
      </ReportContainer>
    );
  }

  const { summary, breakdown, top_selling_hours, comparison } = data;

  return (
    <ReportContainer
      title="Sales Summary Report"
      subtitle={`Sales performance from ${startDate} to ${endDate}`}
      icon="📊"
      backPath="/app/reports/sales"
      actions={
        <>
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            {exporting ? '⏳ Exporting...' : '📥 Export CSV'}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {exporting ? '⏳ Exporting...' : '📄 Export PDF'}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            🔄 Refresh
          </button>
        </>
      }
    >
      {/* Filters */}
      <div className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-xl font-bold text-slate-900">Date Range</h3>
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Sales"
          value={formatCurrency(summary.total_sales)}
          icon="💰"
          change={summary.growth_rate}
          changeLabel="vs previous period"
          color="bg-green-50 border-green-200"
          subtitle={`Net: ${formatCurrency(summary.net_sales)}`}
        />
        <SummaryCard
          title="Total Transactions"
          value={formatNumber(summary.total_transactions)}
          icon="🛒"
          color="bg-blue-50 border-blue-200"
          subtitle={`${summary.total_customers} customers`}
        />
        <SummaryCard
          title="Average Transaction"
          value={formatCurrency(summary.average_transaction_value)}
          icon="📊"
          color="bg-purple-50 border-purple-200"
          subtitle={`${formatNumber(summary.total_items_sold)} items sold`}
        />
        <SummaryCard
          title="Discounts Given"
          value={formatCurrency(summary.total_discounts_given)}
          icon="🏷️"
          color="bg-orange-50 border-orange-200"
        />
      </div>

      {/* Retail vs Wholesale Breakdown */}
      <div className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
        <h3 className="mb-6 text-xl font-bold text-slate-900">Sales by Channel</h3>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Retail */}
          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-2xl">🏪</span>
              <h4 className="text-lg font-bold text-slate-900">Retail</h4>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Transactions:</span>
                <span className="text-sm font-bold text-slate-900">{formatNumber(summary.retail.transactions)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Revenue:</span>
                <span className="text-sm font-bold text-slate-900">{formatCurrency(summary.retail.revenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Avg Value:</span>
                <span className="text-sm font-bold text-slate-900">{formatCurrency(summary.retail.average_value)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Items Sold:</span>
                <span className="text-sm font-bold text-slate-900">{formatNumber(summary.retail.items_sold)}</span>
              </div>
            </div>
          </div>

          {/* Wholesale */}
          <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-2xl">🏢</span>
              <h4 className="text-lg font-bold text-slate-900">Wholesale</h4>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Transactions:</span>
                <span className="text-sm font-bold text-slate-900">{formatNumber(summary.wholesale.transactions)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Revenue:</span>
                <span className="text-sm font-bold text-slate-900">{formatCurrency(summary.wholesale.revenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Avg Value:</span>
                <span className="text-sm font-bold text-slate-900">{formatCurrency(summary.wholesale.average_value)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-600">Items Sold:</span>
                <span className="text-sm font-bold text-slate-900">{formatNumber(summary.wholesale.items_sold)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Breakdown Table */}
      {breakdown && breakdown.length > 0 && (
        <div className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-xl font-bold text-slate-900">Daily Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-sm font-bold text-slate-900">Date</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-slate-900">Sales</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-slate-900">Transactions</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-slate-900">Avg Value</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-slate-900">Items Sold</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-slate-900">Customers</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((day, index) => (
                  <tr
                    key={day.period}
                    className={`border-b border-slate-100 transition hover:bg-slate-50 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {new Date(day.period).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                      {formatCurrency(day.sales)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                      {formatNumber(day.transactions)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                      {formatCurrency(day.avg_value)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                      {formatNumber(day.items_sold)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                      {formatNumber(day.customers)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Selling Hours */}
      {top_selling_hours && top_selling_hours.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-xl font-bold text-slate-900">Peak Sales Hours</h3>
            <div className="space-y-3">
              {top_selling_hours.slice(0, 5).map((hour, index) => (
                <div key={hour.hour} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {hour.hour === 0 ? '12 AM' : hour.hour < 12 ? `${hour.hour} AM` : hour.hour === 12 ? '12 PM' : `${hour.hour - 12} PM`}
                      </p>
                      <p className="text-xs font-medium text-slate-600">
                        {formatNumber(hour.transactions)} transactions
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-green-600">
                    {formatCurrency(hour.sales)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Period Comparison */}
          {comparison && comparison.previous_period && (
            <div className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-xl font-bold text-slate-900">Period Comparison</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">Previous Period</p>
                  <p className="text-xs font-medium text-slate-600">
                    {comparison.previous_period.start} to {comparison.previous_period.end}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {formatCurrency(comparison.previous_period.total_sales)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Current Period</p>
                  <p className="text-xs font-medium text-slate-600">
                    {startDate} to {endDate}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {formatCurrency(summary.total_sales)}
                  </p>
                </div>
                <div className="border-t border-slate-200 pt-4">
                  <p className="text-sm font-medium text-slate-700">Growth</p>
                  <p className={`mt-1 text-3xl font-bold ${
                    comparison.previous_period.growth >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {comparison.previous_period.growth >= 0 ? '↑' : '↓'} {Math.abs(comparison.previous_period.growth).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </ReportContainer>
  );
};

export default SalesSummaryPage;
