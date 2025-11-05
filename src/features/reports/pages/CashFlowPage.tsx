import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { financialReportsService } from '../../../services/reportsService';
import type { CashFlowResponse, ReportFilters } from '../../../types/reports';
import { useCurrency } from '../../../hooks/useCurrency';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { LoadingState, ErrorState, EmptyState } from '../components/ReportStates';
import { useAppSelector } from '../../../hooks';
import { selectStorefrontsLoading, selectUserStorefronts } from '../../../store/slices/authSlice';

const getDefaultStartDate = (): string => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
};

const getToday = (): string => new Date().toISOString().split('T')[0];

const CashFlowPage: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const storefronts = useAppSelector(selectUserStorefronts);
  const storefrontsLoading = useAppSelector(selectStorefrontsLoading);
  const [data, setData] = useState<CashFlowResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(getDefaultStartDate);
  const [endDate, setEndDate] = useState<string>(getToday);
  const [grouping, setGrouping] = useState<'daily' | 'weekly' | 'monthly'>('daily');
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
      const result = await financialReportsService.getCashFlow(buildFilters());
      
      if (result.success && result.data) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Invalid response structure');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cash flow report');
    } finally {
      setLoading(false);
    }
  }, [buildFilters]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    try {
      await financialReportsService.exportCashFlowCSV(buildFilters());
    } catch {
      alert('Failed to export report. Please try again.');
    }
  };

  const handleClearFilters = () => {
    setStartDate(getDefaultStartDate());
    setEndDate(getToday());
    setGrouping('daily');
    setStorefrontId('');
  };

  if (loading && !data) return <LoadingState message="Loading cash flow data..." />;
  if (error) return <ErrorState error={error} onRetry={() => { void fetchData(); }} />;
  if (!data || !data.summary || !data.results) return <EmptyState message="No cash flow data available" />;

  const { summary, results } = data;

  return (
    <ReportContainer
      title="💵 Cash Flow Analysis"
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
              <label className="form-label fw-bold" htmlFor="cashflow-storefront-filter">
                Storefront
              </label>
              <select
                id="cashflow-storefront-filter"
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
              <label className="form-label fw-bold" htmlFor="cashflow-grouping-filter">
                Group By
              </label>
              <select
                id="cashflow-grouping-filter"
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
              <button className="btn btn-outline-secondary w-100" onClick={handleClearFilters}>
                <i className="bi bi-x-circle me-2"></i>
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <SummaryCard
            title="Total Inflows"
            value={formatCurrency(summary.total_inflows)}
            icon="💰"
            color="success"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Total Outflows"
            value={formatCurrency(summary.total_outflows)}
            icon="📤"
            color="danger"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Net Cash Flow"
            value={formatCurrency(summary.net_cash_flow)}
            icon="📊"
            color="primary"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Closing Balance"
            value={formatCurrency(summary.closing_balance)}
            icon="🏦"
            color="info"
          />
        </div>
      </div>

      {/* Inflow Breakdown Cards */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-white">
              <h6 className="mb-0">💳 Inflows by Payment Method</h6>
            </div>
            <div className="card-body">
              <div className="row g-2">
                <div className="col-6">
                  <small className="text-muted d-block">Cash</small>
                  <h6 className="mb-0">{formatCurrency(summary.inflow_by_method.CASH)}</h6>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Card</small>
                  <h6 className="mb-0">{formatCurrency(summary.inflow_by_method.CARD)}</h6>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Bank Transfer</small>
                  <h6 className="mb-0">{formatCurrency(summary.inflow_by_method.BANK_TRANSFER)}</h6>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Mobile Money</small>
                  <h6 className="mb-0">{formatCurrency(summary.inflow_by_method.MOBILE_MONEY)}</h6>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-white">
              <h6 className="mb-0">🔄 Inflows by Type</h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-6">
                  <small className="text-muted d-block">Cash Sales</small>
                  <h5 className="mb-0 text-success">{formatCurrency(summary.inflow_by_type.cash_sales)}</h5>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Credit Payments</small>
                  <h5 className="mb-0 text-primary">{formatCurrency(summary.inflow_by_type.credit_payments)}</h5>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Retail/Wholesale Breakdown */}
      <div className="row mb-4">
        {/* Retail Card */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0">🏪 Retail Cash Inflows</h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-12">
                  <small className="text-muted d-block">Total Inflows</small>
                  <h4 className="mb-0">{formatCurrency(summary.retail.inflows)}</h4>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Transactions</small>
                  <h5 className="mb-0">{summary.retail.transaction_count.toLocaleString()}</h5>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Avg Transaction</small>
                  <h5 className="mb-0">{formatCurrency(summary.retail.average_transaction)}</h5>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wholesale Card */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header bg-success text-white">
              <h6 className="mb-0">🏭 Wholesale Cash Inflows</h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-12">
                  <small className="text-muted d-block">Total Inflows</small>
                  <h4 className="mb-0">{formatCurrency(summary.wholesale.inflows)}</h4>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Transactions</small>
                  <h5 className="mb-0">{summary.wholesale.transaction_count.toLocaleString()}</h5>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Avg Transaction</small>
                  <h5 className="mb-0">{formatCurrency(summary.wholesale.average_transaction)}</h5>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Flow Trends Table */}
      <div className="card mb-4">
        <div className="card-header bg-white">
          <h5 className="mb-0">📈 Cash Flow Trends ({grouping.charAt(0).toUpperCase() + grouping.slice(1)})</h5>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Period</th>
                  <th className="text-end">Inflows</th>
                  <th className="text-end">Outflows</th>
                  <th className="text-end">Net Flow</th>
                  <th className="text-end">Balance</th>
                  <th className="text-end">Transactions</th>
                  <th className="text-end">Retail</th>
                  <th className="text-end">Wholesale</th>
                </tr>
              </thead>
              <tbody>
                {results.map((trend, index) => (
                  <tr key={index}>
                    <td><strong>{trend.period}</strong></td>
                    <td className="text-end text-success">{formatCurrency(trend.inflows)}</td>
                    <td className="text-end text-danger">{formatCurrency(trend.outflows)}</td>
                    <td className="text-end">
                      <strong className={parseFloat(trend.net_flow) >= 0 ? 'text-success' : 'text-danger'}>
                        {formatCurrency(trend.net_flow)}
                      </strong>
                    </td>
                    <td className="text-end">{formatCurrency(trend.running_balance)}</td>
                    <td className="text-end">{trend.transaction_count}</td>
                    <td className="text-end text-primary">{formatCurrency(trend.retail.inflows)}</td>
                    <td className="text-end text-success">{formatCurrency(trend.wholesale.inflows)}</td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-4">
                      No cash flow data available for the selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Note about Tier 1 */}
      <div className="alert alert-info">
        <i className="bi bi-info-circle me-2"></i>
        <strong>Note:</strong> This is Tier 1 implementation - currently tracking inflows (payments) only. Outflow tracking (expenses, inventory purchases, etc.) will be added in future updates.
      </div>
    </ReportContainer>
  );
};

export default CashFlowPage;
