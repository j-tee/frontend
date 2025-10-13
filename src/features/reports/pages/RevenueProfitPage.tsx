import React, { useState, useEffect } from 'react';
import { financialReportsService } from '../../../services/reportsService';
import type { RevenueProfitResponse } from '../../../types/reports';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { LoadingState, ErrorState, EmptyState } from '../components/ReportStates';

const RevenueProfitPage: React.FC = () => {
  const [data, setData] = useState<RevenueProfitResponse | null>(null);
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

  const [breakdownBy, setBreakdownBy] = useState<'category' | 'storefront' | 'product' | 'time'>('category');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await financialReportsService.getRevenueProfit({
        start_date: startDate,
        end_date: endDate,
        breakdown_by: breakdownBy,
      });
      
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load revenue & profit report');
      console.error('Error fetching revenue & profit:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, breakdownBy]);

  const handleExport = async () => {
    try {
      await financialReportsService.exportRevenueProfitCSV({
        start_date: startDate,
        end_date: endDate,
        breakdown_by: breakdownBy,
      });
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export report. Please try again.');
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(value);
  };

  const formatPercent = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  if (loading && !data) return <LoadingState message="Loading revenue & profit data..." />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;
  if (!data || !data.data) return <EmptyState message="No revenue & profit data available" />;

  const summary = data.data.summary;
  const breakdown = data.data.breakdown || [];
  const expenses = data.data.expenses || [];

  return (
    <ReportContainer
      title="Revenue & Profit Analysis"
      subtitle={`${startDate} to ${endDate}`}
      icon="💰"
      actions={
        <div className="d-flex gap-2">
          <button onClick={handleExport} className="btn btn-outline-primary">
            <i className="bi bi-download me-2"></i>
            Export CSV
          </button>
          <button onClick={fetchData} className="btn btn-outline-secondary">
            <i className="bi bi-arrow-clockwise me-2"></i>
            Refresh
          </button>
        </div>
      }
    >
      {/* Date Filter */}
      <div className="mb-4">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          showPresets={true}
        />
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <SummaryCard
            title="Gross Revenue"
            value={formatCurrency(summary.gross_revenue)}
            icon="💵"
            color="primary"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Net Revenue"
            value={formatCurrency(summary.net_revenue)}
            icon="💰"
            color="success"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Gross Profit"
            value={formatCurrency(summary.gross_profit)}
            icon="📈"
            color="info"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Net Profit"
            value={formatCurrency(summary.net_profit)}
            icon="🎯"
            color="warning"
          />
        </div>
      </div>

      {/* Profit Margin Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card border-success h-100">
            <div className="card-body">
              <h6 className="text-muted mb-2">Gross Profit Margin</h6>
              <h2 className="text-success mb-0">{formatPercent(summary.gross_profit_margin)}</h2>
              <small className="text-muted">
                {formatCurrency(summary.gross_profit)} / {formatCurrency(summary.net_revenue)}
              </small>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card border-warning h-100">
            <div className="card-body">
              <h6 className="text-muted mb-2">Net Profit Margin</h6>
              <h2 className="text-warning mb-0">{formatPercent(summary.net_profit_margin)}</h2>
              <small className="text-muted">
                {formatCurrency(summary.net_profit)} / {formatCurrency(summary.net_revenue)}
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Deductions */}
      <div className="card mb-4">
        <div className="card-header bg-white">
          <h5 className="mb-0">Revenue Breakdown</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted">Gross Revenue</span>
                <strong className="text-primary">{formatCurrency(summary.gross_revenue)}</strong>
              </div>
            </div>
            <div className="col-md-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted">Less: Discounts</span>
                <strong className="text-danger">({formatCurrency(summary.discounts)})</strong>
              </div>
            </div>
            <div className="col-md-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted">Less: Refunds</span>
                <strong className="text-danger">({formatCurrency(summary.refunds)})</strong>
              </div>
            </div>
          </div>
          <hr />
          <div className="d-flex justify-content-between align-items-center">
            <strong>Net Revenue</strong>
            <h4 className="text-success mb-0">{formatCurrency(summary.net_revenue)}</h4>
          </div>
        </div>
      </div>

      {/* Profit Calculation */}
      <div className="card mb-4">
        <div className="card-header bg-white">
          <h5 className="mb-0">Profit Calculation</h5>
        </div>
        <div className="card-body">
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted">Net Revenue</span>
              <strong>{formatCurrency(summary.net_revenue)}</strong>
            </div>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted">Less: Cost of Goods Sold (COGS)</span>
              <strong className="text-danger">({formatCurrency(summary.cost_of_goods_sold)})</strong>
            </div>
          </div>
          <hr />
          <div className="d-flex justify-content-between align-items-center mb-3">
            <strong>Gross Profit</strong>
            <h5 className="text-info mb-0">{formatCurrency(summary.gross_profit)}</h5>
          </div>
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted">Less: Operating Expenses</span>
              <strong className="text-danger">({formatCurrency(summary.operating_expenses)})</strong>
            </div>
          </div>
          <hr />
          <div className="d-flex justify-content-between align-items-center">
            <strong className="h5">Net Profit</strong>
            <h4 className="text-warning mb-0">{formatCurrency(summary.net_profit)}</h4>
          </div>
        </div>
      </div>

      {/* Breakdown Selector */}
      <div className="card mb-4">
        <div className="card-body">
          <label className="form-label fw-bold">Breakdown By</label>
          <div className="btn-group w-100" role="group">
            <button
              type="button"
              className={`btn ${breakdownBy === 'category' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setBreakdownBy('category')}
            >
              Category
            </button>
            <button
              type="button"
              className={`btn ${breakdownBy === 'storefront' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setBreakdownBy('storefront')}
            >
              Storefront
            </button>
            <button
              type="button"
              className={`btn ${breakdownBy === 'product' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setBreakdownBy('product')}
            >
              Product
            </button>
            <button
              type="button"
              className={`btn ${breakdownBy === 'time' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setBreakdownBy('time')}
            >
              Time Period
            </button>
          </div>
        </div>
      </div>

      {/* Breakdown Table */}
      {breakdown.length > 0 && (
        <div className="card mb-4">
          <div className="card-header bg-white">
            <h5 className="mb-0">
              Breakdown by {breakdownBy.charAt(0).toUpperCase() + breakdownBy.slice(1)} ({breakdown.length} items)
            </h5>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-4">#</th>
                    <th>{breakdownBy.charAt(0).toUpperCase() + breakdownBy.slice(1)}</th>
                    <th className="text-end">Revenue</th>
                    <th className="text-end">COGS</th>
                    <th className="text-end">Profit</th>
                    <th className="text-end">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 text-muted">{index + 1}</td>
                      <td>
                        <strong>{item.label}</strong>
                      </td>
                      <td className="text-end">
                        <strong className="text-primary">{formatCurrency(item.revenue)}</strong>
                      </td>
                      <td className="text-end text-muted">
                        {formatCurrency(item.cogs)}
                      </td>
                      <td className="text-end">
                        <strong className="text-success">{formatCurrency(item.profit)}</strong>
                      </td>
                      <td className="text-end">
                        <span className={`badge ${
                          item.margin >= 30 ? 'bg-success' :
                          item.margin >= 20 ? 'bg-warning' :
                          item.margin >= 10 ? 'bg-info' : 'bg-danger'
                        }`}>
                          {formatPercent(item.margin)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Operating Expenses */}
      {expenses.length > 0 && (
        <div className="card">
          <div className="card-header bg-white">
            <h5 className="mb-0">Operating Expenses ({expenses.length} categories)</h5>
          </div>
          <div className="card-body">
            <div className="row g-3">
              {expenses.map((expense, index) => {
                const percentage = summary.operating_expenses > 0 
                  ? (expense.amount / summary.operating_expenses) * 100 
                  : 0;
                return (
                  <div key={index} className="col-md-6">
                    <div className="card border">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <h6 className="mb-1">{expense.category}</h6>
                            <p className="text-danger fw-bold mb-0">
                              {formatCurrency(expense.amount)}
                            </p>
                          </div>
                          <span className="badge bg-secondary">
                            {formatPercent(percentage)}
                          </span>
                        </div>
                        <div className="progress" style={{ height: '6px' }}>
                          <div
                            className="progress-bar bg-danger"
                            role="progressbar"
                            style={{ width: `${percentage}%` }}
                            aria-valuenow={percentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-top">
              <div className="d-flex justify-content-between align-items-center">
                <strong>Total Operating Expenses</strong>
                <h5 className="text-danger mb-0">{formatCurrency(summary.operating_expenses)}</h5>
              </div>
            </div>
          </div>
        </div>
      )}
    </ReportContainer>
  );
};

export default RevenueProfitPage;
