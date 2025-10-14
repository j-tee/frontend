import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { financialReportsService } from '../../../services/reportsService';
import type { CashFlowResponse } from '../../../types/reports';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { LoadingState, ErrorState, EmptyState } from '../components/ReportStates';
import { useCurrency } from '../../../hooks/useCurrency';

const CashFlowPage = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [data, setData] = useState<CashFlowResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Default to last 30 days
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [interval, setInterval] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await financialReportsService.getCashFlow({
        start_date: startDate,
        end_date: endDate,
        interval,
      });
      if (response.success && response.data) {
        setData(response.data);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, interval]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    try {
      await financialReportsService.exportCashFlowCSV({
        start_date: startDate,
        end_date: endDate,
        interval,
      });
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const getCashFlowHealth = (health: string | null | undefined) => {
    if (!health) {
      return { color: 'text-gray-600', bg: 'bg-gray-50', label: 'Neutral' };
    }
    switch (health.toLowerCase()) {
      case 'positive':
        return { color: 'text-green-600', bg: 'bg-green-50', label: 'Positive' };
      case 'negative':
        return { color: 'text-red-600', bg: 'bg-red-50', label: 'Negative' };
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-50', label: 'Neutral' };
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;
  if (!data || !data.summary || !data.inflows || !data.outflows) return <EmptyState />;

  const summary = data.summary;
  const inflows = data.inflows;
  const outflows = data.outflows;
  const timeline = data.timeline || [];
  const forecast = data.forecast || [];

  const healthStatus = getCashFlowHealth(summary.cash_flow_health);

  return (
    <ReportContainer
      title="Cash Flow Analysis"
      subtitle="Monitor cash inflows and outflows over time"
      actions={
        <>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </>
      }
    >
      {/* Back Button */}
      <button
        onClick={() => navigate('/app/reports/financial')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Financial Reports
      </button>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Interval:</label>
          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map((int) => (
              <button
                key={int}
                onClick={() => setInterval(int)}
                className={`px-3 py-2 text-sm font-medium rounded-lg ${
                  interval === int
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {int.charAt(0).toUpperCase() + int.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <SummaryCard
          title="Opening Balance"
          value={formatCurrency(summary.opening_balance)}
          icon="💰"
          color="bg-gray-50 border-gray-200"
        />
        <SummaryCard
          title="Total Inflows"
          value={formatCurrency(summary.total_inflows)}
          icon="📈"
          color="bg-green-50 border-green-200"
        />
        <SummaryCard
          title="Total Outflows"
          value={formatCurrency(summary.total_outflows)}
          icon="📉"
          color="bg-red-50 border-red-200"
        />
        <SummaryCard
          title="Net Cash Flow"
          value={formatCurrency(summary.net_cash_flow)}
          icon="💵"
          color={parseFloat(summary.net_cash_flow.toString()) >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}
          subtitle={healthStatus.label}
        />
        <SummaryCard
          title="Closing Balance"
          value={formatCurrency(summary.closing_balance)}
          icon="🏦"
          color="bg-blue-50 border-blue-200"
        />
      </div>

      {/* Inflows & Outflows Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Inflows */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Cash Inflows</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-sm text-gray-600">Sales Revenue</span>
              <span className="text-lg font-semibold text-green-600">
                {formatCurrency(inflows.sales_revenue)}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-sm text-gray-600">Credit Collections</span>
              <span className="text-lg font-semibold text-green-600">
                {formatCurrency(inflows.credit_collections)}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-sm text-gray-600">Other Income</span>
              <span className="text-lg font-semibold text-green-600">
                {formatCurrency(inflows.other_income)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-semibold text-gray-900">Total Inflows</span>
              <span className="text-xl font-bold text-green-600">
                {formatCurrency(summary.total_inflows)}
              </span>
            </div>
          </div>
        </div>

        {/* Outflows */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">Cash Outflows</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-sm text-gray-600">Inventory Purchases</span>
              <span className="text-lg font-semibold text-red-600">
                {formatCurrency(outflows.inventory_purchases)}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-sm text-gray-600">Salaries</span>
              <span className="text-lg font-semibold text-red-600">
                {formatCurrency(outflows.salaries)}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-sm text-gray-600">Rent</span>
              <span className="text-lg font-semibold text-red-600">
                {formatCurrency(outflows.rent)}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-sm text-gray-600">Utilities</span>
              <span className="text-lg font-semibold text-red-600">
                {formatCurrency(outflows.utilities)}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-sm text-gray-600">Other Expenses</span>
              <span className="text-lg font-semibold text-red-600">
                {formatCurrency(outflows.other_expenses)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-semibold text-gray-900">Total Outflows</span>
              <span className="text-xl font-bold text-red-600">
                {formatCurrency(summary.total_outflows)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Flow Timeline */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cash Flow Timeline</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inflows
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Outflows
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Flow
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {timeline.map((period, index) => {
                const netFlow = parseFloat(period.net_flow.toString());
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {period.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">
                      {formatCurrency(period.inflows)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">
                      {formatCurrency(period.outflows)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          netFlow >= 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {formatCurrency(period.net_flow)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(period.balance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Forecast */}
      {forecast.length > 0 && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">Cash Flow Forecast</h3>
          </div>
          <p className="text-sm text-blue-700 mb-4">
            Projected cash flow based on historical trends
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-blue-900 uppercase tracking-wider">
                    Predicted Inflows
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-blue-900 uppercase tracking-wider">
                    Predicted Outflows
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-blue-900 uppercase tracking-wider">
                    Predicted Balance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-blue-200">
                {forecast.map((prediction, index) => (
                  <tr key={index} className="hover:bg-blue-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {prediction.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">
                      {formatCurrency(prediction.predicted_inflows)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">
                      {formatCurrency(prediction.predicted_outflows)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-900 text-right">
                      {formatCurrency(prediction.predicted_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ReportContainer>
  );
};

export default CashFlowPage;
