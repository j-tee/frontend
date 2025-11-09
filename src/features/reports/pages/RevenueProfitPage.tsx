import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { financialReportsService } from '../../../services/reportsService';
import type { RevenueProfitResponse, ReportFilters } from '../../../types/reports';
import { useCurrency } from '../../../hooks/useCurrency';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { LoadingState, ErrorState, EmptyState } from '../components/ReportStates';
import { useAppSelector } from '../../../hooks';
import { selectStorefrontsLoading, selectUserStorefronts } from '../../../store/slices/authSlice';
import { ReportNarrativeWidget } from '../../ai/components/ReportNarrativeWidget';

const RevenueProfitPage: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const storefronts = useAppSelector(selectUserStorefronts);
  const storefrontsLoading = useAppSelector(selectStorefrontsLoading);
  const [data, setData] = useState<RevenueProfitResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Default to last 30 days
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [grouping, setGrouping] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [storefrontId, setStorefrontId] = useState<string>('');

  const storefrontOptions = useMemo(() => {
    const items = storefronts ?? [];
    return items.map((storefront) => ({ id: storefront.id, name: storefront.name }));
  }, [storefronts]);

  const buildFilters = useCallback((): ReportFilters => {
    const filters: ReportFilters = {
      start_date: startDate,
      end_date: endDate,
      grouping,
    };

    if (storefrontId) {
      filters.storefront_id = storefrontId;
    }

    return filters;
  }, [endDate, grouping, startDate, storefrontId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await financialReportsService.getRevenueProfit(buildFilters());
      
      if (result.success && result.data) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Invalid response structure');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load revenue & profit report');
    } finally {
      setLoading(false);
    }
  }, [buildFilters]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    try {
      await financialReportsService.exportRevenueProfitCSV(buildFilters());
    } catch {
      alert('Failed to export report. Please try again.');
    }
  };

  const formatPercent = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return '0.00%';
    return `${value.toFixed(2)}%`;
  };

  if (loading && !data) return <LoadingState message="Loading revenue & profit data..." />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;
  if (!data || !data.summary || !data.results) return <EmptyState message="No revenue & profit data available" />;

  const { summary, results } = data;

  return (
    <ReportContainer
      title="💰 Revenue & Profit Analysis"
      subtitle={`Period: ${startDate} to ${endDate}`}
      backPath="/app/reports/financial"
      actions={
        <>
          <button
            onClick={() => {
              void fetchData();
            }}
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? '⏳ Refreshing...' : '🔄 Refresh'}
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            📥 Export CSV
          </button>
        </>
      }
    >
      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-5">
              <DateRangeFilter
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                showPresets={true}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label fw-bold" htmlFor="storefront-filter">
                Storefront
              </label>
              <select
                id="storefront-filter"
                className="form-select"
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
              {storefrontsLoading && <div className="form-text">Loading storefronts…</div>}
              {!storefrontsLoading && storefrontOptions.length === 0 && (
                <div className="form-text">No storefronts available</div>
              )}
            </div>
            <div className="col-md-3">
              <label className="form-label fw-bold" htmlFor="grouping-filter">
                Group By
              </label>
              <select
                id="grouping-filter"
                className="form-select"
                value={grouping}
                onChange={(event) => setGrouping(event.target.value as 'daily' | 'weekly' | 'monthly')}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="col-md-1">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setStorefrontId('');
                  setGrouping('monthly');
                }}
              >
                <i className="bi bi-x-circle me-2"></i>
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {data && (
        <ReportNarrativeWidget
          reportType="revenue_profit"
          reportData={{
            summary: data.summary,
            results: data.results,
            date_range: { start_date: startDate, end_date: endDate },
            grouping,
          }}
          reportTitle="Revenue & Profit"
        />
      )}

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <SummaryCard
            title="Total Revenue"
            value={formatCurrency(summary.total_revenue)}
            icon="💵"
            color="primary"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Gross Profit"
            value={formatCurrency(summary.gross_profit)}
            icon="📈"
            color="success"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Profit Margin"
            value={formatPercent(summary.gross_margin)}
            icon="📊"
            color="info"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Total Sales"
            value={summary.total_sales.toLocaleString()}
            icon="🛒"
            color="warning"
          />
        </div>
      </div>

      {/* Retail/Wholesale Breakdown */}
      <div className="row mb-4">
        {/* Retail Card */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0">🏪 Retail Breakdown</h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-6">
                  <small className="text-muted d-block">Revenue</small>
                  <h5 className="mb-0">{formatCurrency(summary.retail.revenue)}</h5>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Profit</small>
                  <h5 className="mb-0">{formatCurrency(summary.retail.profit)}</h5>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Margin</small>
                  <h5 className="mb-0">{formatPercent(summary.retail.profit_margin)}</h5>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Orders</small>
                  <h5 className="mb-0">{summary.retail.orders.toLocaleString()}</h5>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Cost</small>
                  <h5 className="mb-0">{formatCurrency(summary.retail.cost)}</h5>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Avg Order Value</small>
                  <h5 className="mb-0">{formatCurrency(summary.retail.avg_order_value)}</h5>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wholesale Card */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header bg-success text-white">
              <h6 className="mb-0">🏭 Wholesale Breakdown</h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-6">
                  <small className="text-muted d-block">Revenue</small>
                  <h5 className="mb-0">{formatCurrency(summary.wholesale.revenue)}</h5>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Profit</small>
                  <h5 className="mb-0">{formatCurrency(summary.wholesale.profit)}</h5>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Margin</small>
                  <h5 className="mb-0">{formatPercent(summary.wholesale.profit_margin)}</h5>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Orders</small>
                  <h5 className="mb-0">{summary.wholesale.orders.toLocaleString()}</h5>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Cost</small>
                  <h5 className="mb-0">{formatCurrency(summary.wholesale.cost)}</h5>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Avg Order Value</small>
                  <h5 className="mb-0">{formatCurrency(summary.wholesale.avg_order_value)}</h5>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trends Table */}
      <div className="card mb-4">
        <div className="card-header bg-white">
          <h5 className="mb-0">📈 Profit Trends ({grouping.charAt(0).toUpperCase() + grouping.slice(1)})</h5>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Period</th>
                  <th className="text-end">Revenue</th>
                  <th className="text-end">Cost</th>
                  <th className="text-end">Profit</th>
                  <th className="text-end">Margin</th>
                  <th className="text-end">Orders</th>
                  <th className="text-end">Retail Revenue</th>
                  <th className="text-end">Wholesale Revenue</th>
                </tr>
              </thead>
              <tbody>
                {results.map((trend, index) => (
                  <tr key={index}>
                    <td><strong>{trend.period}</strong></td>
                    <td className="text-end">{formatCurrency(trend.revenue)}</td>
                    <td className="text-end text-danger">{formatCurrency(trend.cost)}</td>
                    <td className="text-end text-success"><strong>{formatCurrency(trend.profit)}</strong></td>
                    <td className="text-end">{formatPercent(trend.margin)}</td>
                    <td className="text-end">{trend.order_count}</td>
                    <td className="text-end text-primary">{formatCurrency(trend.retail.revenue)}</td>
                    <td className="text-end text-success">{formatCurrency(trend.wholesale.revenue)}</td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-4">
                      No trend data available for the selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Margin Analysis */}
      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-success text-white">
              <h6 className="mb-0">🏆 Best Margin</h6>
            </div>
            <div className="card-body text-center">
              <h2 className="text-success">{formatPercent(summary.best_margin)}</h2>
              <p className="text-muted mb-0">Highest profit margin achieved</p>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-warning text-dark">
              <h6 className="mb-0">⚠️ Worst Margin</h6>
            </div>
            <div className="card-body text-center">
              <h2 className="text-warning">{formatPercent(summary.worst_margin)}</h2>
              <p className="text-muted mb-0">Lowest profit margin achieved</p>
            </div>
          </div>
        </div>
      </div>
    </ReportContainer>
  );
};

export default RevenueProfitPage;
