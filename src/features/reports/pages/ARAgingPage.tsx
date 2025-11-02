import React, { useState, useEffect } from 'react';
import { financialReportsService } from '../../../services/reportsService';
import type { ARAgingResponse } from '../../../types/reports';
import { useCurrency } from '../../../hooks/useCurrency';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { LoadingState, ErrorState, EmptyState } from '../components/ReportStates';

const ARAgingPage: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const [data, setData] = useState<ARAgingResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [asOfDate, setAsOfDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await financialReportsService.getARAging({
        as_of_date: asOfDate,
      });
      
      if (result.success && result.data) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Invalid response structure');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AR aging report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asOfDate]);

  const handleExport = async () => {
    try {
      await financialReportsService.exportARAgingCSV({
        as_of_date: asOfDate,
      });
    } catch (err) {
      alert('Failed to export report. Please try again.');
    }
  };

  const formatPercent = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return '0.00%';
    return `${value.toFixed(2)}%`;
  };

  const getRiskBadgeColor = (risk: string): string => {
    switch (risk) {
      case 'high': return 'bg-danger';
      case 'medium': return 'bg-warning';
      case 'low': return 'bg-success';
      default: return 'bg-secondary';
    }
  };

  if (loading && !data) return <LoadingState message="Loading AR aging data..." />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;
  if (!data || !data.summary || !data.results) return <EmptyState message="No AR aging data available" />;

  const { summary, results } = data;

  return (
    <ReportContainer
      title="📊 Accounts Receivable Aging"
      subtitle={`As of: ${summary.as_of_date}`}
      backPath="/app/reports/financial"
      actions={
        <>
          <button
            onClick={fetchData}
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
      {/* Date Filter */}
      <div className="row mb-4">
        <div className="col-md-4">
          <label className="form-label">As of Date</label>
          <input
            type="date"
            className="form-control"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <SummaryCard
            title="Total AR Outstanding"
            value={formatCurrency(summary.total_ar_outstanding)}
            icon="💰"
            color="primary"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Customers with Balance"
            value={summary.total_customers_with_balance.toString()}
            icon="👥"
            color="info"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Percentage Overdue"
            value={formatPercent(summary.percentage_overdue)}
            icon="⚠️"
            color="warning"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="At Risk Amount"
            value={formatCurrency(summary.at_risk_amount)}
            icon="🚨"
            color="danger"
          />
        </div>
      </div>

      {/* Aging Buckets Summary */}
      <div className="card mb-4">
        <div className="card-header bg-white">
          <h5 className="mb-0">📅 Overall Aging Breakdown</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col">
              <small className="text-muted d-block">Current</small>
              <h6 className="mb-0 text-success">{formatCurrency(summary.aging_buckets.current)}</h6>
            </div>
            <div className="col">
              <small className="text-muted d-block">1-30 Days</small>
              <h6 className="mb-0">{formatCurrency(summary.aging_buckets['1_30_days'])}</h6>
            </div>
            <div className="col">
              <small className="text-muted d-block">31-60 Days</small>
              <h6 className="mb-0 text-warning">{formatCurrency(summary.aging_buckets['31_60_days'])}</h6>
            </div>
            <div className="col">
              <small className="text-muted d-block">61-90 Days</small>
              <h6 className="mb-0 text-danger">{formatCurrency(summary.aging_buckets['61_90_days'])}</h6>
            </div>
            <div className="col">
              <small className="text-muted d-block">90+ Days</small>
              <h6 className="mb-0 text-danger">{formatCurrency(summary.aging_buckets.over_90_days)}</h6>
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
              <h6 className="mb-0">🏪 Retail AR Aging</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <small className="text-muted d-block">AR Outstanding</small>
                <h4 className="mb-0">{formatCurrency(summary.retail.ar_outstanding)}</h4>
                <small className="text-muted">({formatPercent(summary.retail.percentage_of_total)} of total)</small>
              </div>
              <div className="row g-2">
                <div className="col-6">
                  <small className="text-muted d-block">Current</small>
                  <h6 className="mb-0 text-success">{formatCurrency(summary.retail.aging_buckets.current)}</h6>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">1-30 Days</small>
                  <h6 className="mb-0">{formatCurrency(summary.retail.aging_buckets['1_30_days'])}</h6>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">31-60 Days</small>
                  <h6 className="mb-0 text-warning">{formatCurrency(summary.retail.aging_buckets['31_60_days'])}</h6>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">61-90 Days</small>
                  <h6 className="mb-0 text-danger">{formatCurrency(summary.retail.aging_buckets['61_90_days'])}</h6>
                </div>
                <div className="col-12">
                  <small className="text-muted d-block">90+ Days</small>
                  <h6 className="mb-0 text-danger">{formatCurrency(summary.retail.aging_buckets.over_90_days)}</h6>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wholesale Card */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header bg-success text-white">
              <h6 className="mb-0">🏭 Wholesale AR Aging</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <small className="text-muted d-block">AR Outstanding</small>
                <h4 className="mb-0">{formatCurrency(summary.wholesale.ar_outstanding)}</h4>
                <small className="text-muted">({formatPercent(summary.wholesale.percentage_of_total)} of total)</small>
              </div>
              <div className="row g-2">
                <div className="col-6">
                  <small className="text-muted d-block">Current</small>
                  <h6 className="mb-0 text-success">{formatCurrency(summary.wholesale.aging_buckets.current)}</h6>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">1-30 Days</small>
                  <h6 className="mb-0">{formatCurrency(summary.wholesale.aging_buckets['1_30_days'])}</h6>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">31-60 Days</small>
                  <h6 className="mb-0 text-warning">{formatCurrency(summary.wholesale.aging_buckets['31_60_days'])}</h6>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">61-90 Days</small>
                  <h6 className="mb-0 text-danger">{formatCurrency(summary.wholesale.aging_buckets['61_90_days'])}</h6>
                </div>
                <div className="col-12">
                  <small className="text-muted d-block">90+ Days</small>
                  <h6 className="mb-0 text-danger">{formatCurrency(summary.wholesale.aging_buckets.over_90_days)}</h6>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Details Table */}
      <div className="card">
        <div className="card-header bg-white">
          <h5 className="mb-0">👥 Customer Aging Details</h5>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Customer</th>
                  <th className="text-end">Total Balance</th>
                  <th className="text-end">Credit Limit</th>
                  <th className="text-end">Utilization</th>
                  <th className="text-end">Current</th>
                  <th className="text-end">1-30 Days</th>
                  <th className="text-end">31-60 Days</th>
                  <th className="text-end">61-90 Days</th>
                  <th className="text-end">90+ Days</th>
                  <th className="text-center">Risk</th>
                  <th className="text-end">Retail</th>
                  <th className="text-end">Wholesale</th>
                </tr>
              </thead>
              <tbody>
                {results.map((customer) => (
                  <tr key={customer.customer_id}>
                    <td><strong>#{customer.rank}</strong></td>
                    <td>
                      <div>
                        <strong>{customer.customer_name}</strong>
                        <br />
                        <small className="text-muted">{customer.customer_email}</small>
                      </div>
                    </td>
                    <td className="text-end"><strong>{formatCurrency(customer.total_balance)}</strong></td>
                    <td className="text-end">{formatCurrency(customer.credit_limit)}</td>
                    <td className="text-end">{formatPercent(customer.credit_utilization)}</td>
                    <td className="text-end text-success">{formatCurrency(customer.current)}</td>
                    <td className="text-end">{formatCurrency(customer['1_30_days'])}</td>
                    <td className="text-end text-warning">{formatCurrency(customer['31_60_days'])}</td>
                    <td className="text-end text-danger">{formatCurrency(customer['61_90_days'])}</td>
                    <td className="text-end text-danger">{formatCurrency(customer.over_90_days)}</td>
                    <td className="text-center">
                      <span className={`badge ${getRiskBadgeColor(customer.risk_level)}`}>
                        {customer.risk_level.toUpperCase()}
                      </span>
                    </td>
                    <td className="text-end text-primary">{formatCurrency(customer.retail_balance)}</td>
                    <td className="text-end text-success">{formatCurrency(customer.wholesale_balance)}</td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr>
                    <td colSpan={13} className="text-center text-muted py-4">
                      No customers with outstanding balances
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ReportContainer>
  );
};

export default ARAgingPage;
