import React, { useState, useEffect } from 'react';
import { salesReportsService } from '../../../services/reportsService';
import type { RevenueTrendsResponse } from '../../../types/reports';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { LoadingState, ErrorState, EmptyState } from '../components/ReportStates';

const RevenueTrendsPage: React.FC = () => {
  const [data, setData] = useState<RevenueTrendsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Default to last 90 days for trend analysis
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 90);
    return date.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [interval, setInterval] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await salesReportsService.getRevenueTrends({
        start_date: startDate,
        end_date: endDate,
        interval: interval,
      });
      
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load revenue trends report');
      console.error('Error fetching revenue trends:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, interval]);

  const handleExport = async () => {
    try {
      await salesReportsService.exportRevenueTrendsCSV({
        start_date: startDate,
        end_date: endDate,
        interval: interval,
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

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading && !data) return <LoadingState message="Loading revenue trends..." />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;
  if (!data || !data.data || !data.data.trends || data.data.trends.length === 0) {
    return <EmptyState message="No revenue trends data available" />;
  }

  // Calculate summary metrics from trends data
  const trends = data.data.trends;
  const totalRevenue = trends.reduce((sum, t) => sum + t.revenue, 0);
  const totalProfit = trends.reduce((sum, t) => sum + t.profit, 0);
  const avgDailyRevenue = totalRevenue / trends.length;
  const peakRevenue = Math.max(...trends.map(t => t.revenue));
  
  // Calculate growth rate (compare first and last period)
  const firstRevenue = trends[0]?.revenue || 0;
  const lastRevenue = trends[trends.length - 1]?.revenue || 0;
  const growthRate = firstRevenue > 0 ? ((lastRevenue - firstRevenue) / firstRevenue) * 100 : 0;

  return (
    <ReportContainer
      title="Revenue Trends Report"
      subtitle={`${startDate} to ${endDate} • ${interval.charAt(0).toUpperCase() + interval.slice(1)} intervals`}
      icon="📈"
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
            title="Total Revenue"
            value={formatCurrency(totalRevenue)}
            icon="💰"
            color="success"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Total Profit"
            value={formatCurrency(totalProfit)}
            icon="📊"
            color="primary"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Avg Daily Revenue"
            value={formatCurrency(avgDailyRevenue)}
            icon="📅"
            color="info"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Peak Revenue"
            value={formatCurrency(peakRevenue)}
            icon="🏆"
            color="warning"
          />
        </div>
      </div>

      {/* Interval Selector */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-12">
              <label className="form-label fw-bold">Time Interval</label>
              <div className="btn-group w-100" role="group">
                <button
                  type="button"
                  className={`btn ${interval === 'daily' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setInterval('daily')}
                >
                  <i className="bi bi-calendar-day me-2"></i>
                  Daily
                </button>
                <button
                  type="button"
                  className={`btn ${interval === 'weekly' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setInterval('weekly')}
                >
                  <i className="bi bi-calendar-week me-2"></i>
                  Weekly
                </button>
                <button
                  type="button"
                  className={`btn ${interval === 'monthly' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setInterval('monthly')}
                >
                  <i className="bi bi-calendar-month me-2"></i>
                  Monthly
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Trend Table */}
      <div className="card mb-4">
        <div className="card-header bg-white">
          <h5 className="mb-0">Revenue Trend ({trends.length} periods)</h5>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th className="px-4">Period</th>
                  <th className="text-end">Revenue</th>
                  <th className="text-end">Profit</th>
                  <th className="text-end">Transactions</th>
                  <th className="text-end">Avg Order</th>
                  <th className="text-center">Cash</th>
                  <th className="text-center">Card</th>
                  <th className="text-center">Credit</th>
                </tr>
              </thead>
              <tbody>
                {trends.slice(-15).map((trend, index) => (
                  <tr key={index}>
                    <td className="px-4">
                      <strong>{formatDate(trend.period)}</strong>
                    </td>
                    <td className="text-end">
                      <strong className="text-success">{formatCurrency(trend.revenue)}</strong>
                    </td>
                    <td className="text-end">
                      <strong className="text-primary">{formatCurrency(trend.profit)}</strong>
                    </td>
                    <td className="text-end">
                      {formatNumber(trend.transactions)}
                    </td>
                    <td className="text-end text-muted">
                      {formatCurrency(trend.average_order_value)}
                    </td>
                    <td className="text-center">
                      <small className="text-muted">{formatCurrency(trend.payment_methods.cash)}</small>
                    </td>
                    <td className="text-center">
                      <small className="text-muted">{formatCurrency(trend.payment_methods.card)}</small>
                    </td>
                    <td className="text-center">
                      <small className="text-muted">{formatCurrency(trend.payment_methods.credit)}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payment Methods Breakdown */}
      <div className="card mb-4">
        <div className="card-header bg-white">
          <h5 className="mb-0">Revenue by Payment Method</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            {(() => {
              const totalCash = trends.reduce((sum, t) => sum + t.payment_methods.cash, 0);
              const totalCard = trends.reduce((sum, t) => sum + t.payment_methods.card, 0);
              const totalCredit = trends.reduce((sum, t) => sum + t.payment_methods.credit, 0);
              const total = totalCash + totalCard + totalCredit;
              
              const methods = [
                { name: 'Cash', value: totalCash, color: 'success' },
                { name: 'Card', value: totalCard, color: 'primary' },
                { name: 'Credit', value: totalCredit, color: 'warning' },
              ];
              
              return methods.map((method) => {
                const percentage = total > 0 ? (method.value / total) * 100 : 0;
                return (
                  <div key={method.name} className="col-md-4">
                    <div className="card border">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <h6 className="mb-1">{method.name}</h6>
                            <p className={`text-${method.color} fw-bold mb-0`}>
                              {formatCurrency(method.value)}
                            </p>
                          </div>
                          <span className="badge bg-primary">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="progress" style={{ height: '8px' }}>
                          <div
                            className={`progress-bar bg-${method.color}`}
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
              });
            })()}
          </div>
        </div>
      </div>

      {/* Forecast Section (if available) */}
      {data.data.forecast && data.data.forecast.length > 0 && (
        <div className="card mb-4">
          <div className="card-header bg-white">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">📊 Revenue Forecast</h5>
              <span className="badge bg-info">
                Next {data.data.forecast.length} periods
              </span>
            </div>
          </div>
          <div className="card-body">
            <div className="alert alert-info mb-4">
              <i className="bi bi-lightbulb me-2"></i>
              <strong>Forecast based on historical trends.</strong> Actual results may vary.
            </div>
            
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Period</th>
                    <th className="text-end">Forecasted Revenue</th>
                    <th className="text-end">Lower Bound</th>
                    <th className="text-end">Upper Bound</th>
                    <th className="text-end">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.forecast.map((forecast, index) => (
                    <tr key={index}>
                      <td>
                        <strong>{formatDate(forecast.period)}</strong>
                      </td>
                      <td className="text-end">
                        <strong className="text-primary">
                          {formatCurrency(forecast.predicted_revenue)}
                        </strong>
                      </td>
                      <td className="text-end text-muted">
                        {formatCurrency(forecast.lower_bound)}
                      </td>
                      <td className="text-end text-muted">
                        {formatCurrency(forecast.upper_bound)}
                      </td>
                      <td className="text-end">
                        <span className={`badge ${
                          forecast.confidence >= 0.8 ? 'bg-success' :
                          forecast.confidence >= 0.6 ? 'bg-warning' : 'bg-danger'
                        }`}>
                          {(forecast.confidence * 100).toFixed(0)}%
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

      {/* Patterns Card */}
      {data.data.patterns && (
        <div className="card">
          <div className="card-header bg-white">
            <h5 className="mb-0">� Revenue Patterns</h5>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-3">
                <div className="card border-primary h-100">
                  <div className="card-body text-center">
                    <h6 className="text-muted mb-2">Peak Day</h6>
                    <h4 className="text-primary mb-0">{data.data.patterns.peak_day}</h4>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-success h-100">
                  <div className="card-body text-center">
                    <h6 className="text-muted mb-2">Peak Hour</h6>
                    <h4 className="text-success mb-0">{data.data.patterns.peak_hour}:00</h4>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-info h-100">
                  <div className="card-body text-center">
                    <h6 className="text-muted mb-2">Seasonal Trend</h6>
                    <h4 className="text-info mb-0">{data.data.patterns.seasonal_trend}</h4>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-warning h-100">
                  <div className="card-body text-center">
                    <h6 className="text-muted mb-2">Volatility</h6>
                    <h4 className="text-warning mb-0 text-capitalize">{data.data.patterns.volatility}</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </ReportContainer>
  );
};

export default RevenueTrendsPage;
