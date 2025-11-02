import React, { useState, useEffect } from 'react';
import { financialReportsService } from '../../../services/reportsService';
import type { CollectionRatesResponse } from '../../../types/reports';
import { useCurrency } from '../../../hooks/useCurrency';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { LoadingState, ErrorState, EmptyState } from '../components/ReportStates';

const CollectionRatesPage: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const [data, setData] = useState<CollectionRatesResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Default to last 90 days
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 90);
    return date.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [grouping, setGrouping] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await financialReportsService.getCollectionRates({
        start_date: startDate,
        end_date: endDate,
        grouping: grouping,
      });
      
      if (result.success && result.data) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Invalid response structure');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collection rates report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, grouping]);

  const handleExport = async () => {
    try {
      await financialReportsService.exportCollectionRatesCSV({
        start_date: startDate,
        end_date: endDate,
        grouping: grouping,
      });
    } catch (err) {
      alert('Failed to export report. Please try again.');
    }
  };

  const formatPercent = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return '0.00%';
    return `${value.toFixed(2)}%`;
  };

  const formatDays = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return '0.0 days';
    return `${value.toFixed(1)} days`;
  };

  if (loading && !data) return <LoadingState message="Loading collection rates data..." />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;
  if (!data || !data.summary || !data.results) return <EmptyState message="No collection rates data available" />;

  const { summary, results } = data;

  return (
    <ReportContainer
      title="💳 Collection Rates Analysis"
      subtitle={`Period: ${startDate} to ${endDate}`}
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
      {/* Date Filter & Grouping */}
      <div className="row mb-4">
        <div className="col-md-8">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            showPresets={true}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Group By</label>
          <select 
            className="form-select"
            value={grouping}
            onChange={(e) => setGrouping(e.target.value as 'daily' | 'weekly' | 'monthly')}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <SummaryCard
            title="Credit Sales"
            value={formatCurrency(summary.total_credit_sales_amount)}
            icon="💰"
            color="primary"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Amount Collected"
            value={formatCurrency(summary.total_collected_amount)}
            icon="✅"
            color="success"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Collection Rate"
            value={formatPercent(summary.overall_collection_rate)}
            icon="📊"
            color="info"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Avg Collection Period"
            value={formatDays(summary.average_collection_period_days)}
            icon="⏱️"
            color="warning"
          />
        </div>
      </div>

      {/* Outstanding Summary */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card">
            <div className="card-body text-center">
              <small className="text-muted d-block">Outstanding Amount</small>
              <h4 className="mb-0 text-danger">{formatCurrency(summary.outstanding_amount)}</h4>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card">
            <div className="card-body text-center">
              <small className="text-muted d-block">Collected Sales</small>
              <h4 className="mb-0 text-success">{summary.collected_sales_count} / {summary.total_credit_sales_count}</h4>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card">
            <div className="card-body text-center">
              <small className="text-muted d-block">Outstanding Sales</small>
              <h4 className="mb-0 text-warning">{summary.outstanding_sales_count}</h4>
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
              <h6 className="mb-0">🏪 Retail Collection Rates</h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-6">
                  <small className="text-muted d-block">Credit Sales</small>
                  <h5 className="mb-0">{formatCurrency(summary.retail.credit_sales_amount)}</h5>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Collected</small>
                  <h5 className="mb-0 text-success">{formatCurrency(summary.retail.collected_amount)}</h5>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Collection Rate</small>
                  <h5 className="mb-0">{formatPercent(summary.retail.collection_rate)}</h5>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Avg Period</small>
                  <h5 className="mb-0">{formatDays(summary.retail.average_collection_period_days)}</h5>
                </div>
                <div className="col-12">
                  <small className="text-muted d-block">Credit Sales Count</small>
                  <h5 className="mb-0">{summary.retail.credit_sales_count}</h5>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wholesale Card */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header bg-success text-white">
              <h6 className="mb-0">🏭 Wholesale Collection Rates</h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-6">
                  <small className="text-muted d-block">Credit Sales</small>
                  <h5 className="mb-0">{formatCurrency(summary.wholesale.credit_sales_amount)}</h5>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Collected</small>
                  <h5 className="mb-0 text-success">{formatCurrency(summary.wholesale.collected_amount)}</h5>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Collection Rate</small>
                  <h5 className="mb-0">{formatPercent(summary.wholesale.collection_rate)}</h5>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Avg Period</small>
                  <h5 className="mb-0">{formatDays(summary.wholesale.average_collection_period_days)}</h5>
                </div>
                <div className="col-12">
                  <small className="text-muted d-block">Credit Sales Count</small>
                  <h5 className="mb-0">{summary.wholesale.credit_sales_count}</h5>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collection Trends Table */}
      <div className="card mb-4">
        <div className="card-header bg-white">
          <h5 className="mb-0">📈 Collection Trends ({grouping.charAt(0).toUpperCase() + grouping.slice(1)})</h5>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Period</th>
                  <th className="text-end">Credit Sales</th>
                  <th className="text-end">Collected</th>
                  <th className="text-end">Rate</th>
                  <th className="text-end">Avg Days</th>
                  <th className="text-end">Retail Rate</th>
                  <th className="text-end">Wholesale Rate</th>
                </tr>
              </thead>
              <tbody>
                {results.map((trend, index) => (
                  <tr key={index}>
                    <td><strong>{trend.period}</strong></td>
                    <td className="text-end">{formatCurrency(trend.credit_sales_amount)}</td>
                    <td className="text-end text-success">{formatCurrency(trend.collected_amount)}</td>
                    <td className="text-end">
                      <span className={`badge ${
                        trend.collection_rate >= 80 ? 'bg-success' : 
                        trend.collection_rate >= 60 ? 'bg-warning' : 
                        'bg-danger'
                      }`}>
                        {formatPercent(trend.collection_rate)}
                      </span>
                    </td>
                    <td className="text-end">{formatDays(trend.average_days_to_collect)}</td>
                    <td className="text-end text-primary">{formatPercent(trend.retail.collection_rate)}</td>
                    <td className="text-end text-success">{formatPercent(trend.wholesale.collection_rate)}</td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      No collection data available for the selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-info text-white">
              <h6 className="mb-0">💡 Collection Efficiency</h6>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span>Overall Performance</span>
                <span className={`badge ${
                  summary.overall_collection_rate >= 80 ? 'bg-success' : 
                  summary.overall_collection_rate >= 60 ? 'bg-warning' : 
                  'bg-danger'
                }`}>
                  {summary.overall_collection_rate >= 80 ? 'Excellent' : 
                   summary.overall_collection_rate >= 60 ? 'Good' : 
                   'Needs Improvement'}
                </span>
              </div>
              <div className="progress mb-2" style={{height: '25px'}}>
                <div 
                  className={`progress-bar ${
                    summary.overall_collection_rate >= 80 ? 'bg-success' : 
                    summary.overall_collection_rate >= 60 ? 'bg-warning' : 
                    'bg-danger'
                  }`}
                  role="progressbar"
                  style={{width: `${summary.overall_collection_rate}%`}}
                  aria-valuenow={summary.overall_collection_rate}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  {formatPercent(summary.overall_collection_rate)}
                </div>
              </div>
              <small className="text-muted">
                {summary.collected_sales_count} of {summary.total_credit_sales_count} credit sales collected
              </small>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-warning text-dark">
              <h6 className="mb-0">⏰ Collection Speed</h6>
            </div>
            <div className="card-body text-center">
              <h2 className="mb-2">{formatDays(summary.average_collection_period_days)}</h2>
              <p className="text-muted mb-3">Average time to collect payment</p>
              <div className="row">
                <div className="col-6">
                  <small className="text-muted d-block">Retail</small>
                  <strong>{formatDays(summary.retail.average_collection_period_days)}</strong>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">Wholesale</small>
                  <strong>{formatDays(summary.wholesale.average_collection_period_days)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ReportContainer>
  );
};

export default CollectionRatesPage;
