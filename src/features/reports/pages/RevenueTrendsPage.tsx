import React, { useState, useEffect } from 'react';
import { salesReportsService } from '../../../services/reportsService';
import type { RevenueTrendsResponse } from '../../../types/reports';
import { useCurrency } from '../../../hooks/useCurrency';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { LoadingState, ErrorState, EmptyState } from '../components/ReportStates';

const RevenueTrendsPage: React.FC = () => {
  const { formatCurrency } = useCurrency();
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
  if (!data || !data.data || !data.data.summary || !data.data.results || !data.data.results.trends || data.data.results.trends.length === 0) {
    return <EmptyState message="No revenue trends data available" />;
  }

  // Extract data from response
  const { summary, results } = data.data;
  const { trends, patterns } = results;

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
            {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <SummaryCard
            title="Total Revenue"
            value={formatCurrency(summary.total_revenue)}
            icon="💰"
            color="success"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Total Profit"
            value={formatCurrency(summary.total_profit)}
            icon="📊"
            color="primary"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Avg Daily Revenue"
            value={formatCurrency(summary.average_daily_revenue)}
            icon="�"
            color="info"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Profit Margin"
            value={`${summary.profit_margin.toFixed(1)}%`}
            icon="💹"
            color="warning"
          />
        </div>
      </div>

      {/* Retail vs Wholesale Breakdown */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card border-primary">
            <div className="card-body">
              <h6 className="text-primary mb-3">
                <i className="bi bi-shop me-2"></i>
                Retail Sales
              </h6>
              <div className="row g-2">
                <div className="col-6">
                  <div className="text-muted small">Revenue</div>
                  <div className="fs-5 fw-bold text-success">{formatCurrency(summary.retail.revenue)}</div>
                </div>
                <div className="col-6">
                  <div className="text-muted small">Profit</div>
                  <div className="fs-5 fw-bold text-primary">{formatCurrency(summary.retail.profit)}</div>
                </div>
                <div className="col-6">
                  <div className="text-muted small">Orders</div>
                  <div className="fs-6">{formatNumber(summary.retail.orders)}</div>
                </div>
                <div className="col-6">
                  <div className="text-muted small">Profit Margin</div>
                  <div className="fs-6">{summary.retail.profit_margin.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card border-success">
            <div className="card-body">
              <h6 className="text-success mb-3">
                <i className="bi bi-building me-2"></i>
                Wholesale Sales
              </h6>
              <div className="row g-2">
                <div className="col-6">
                  <div className="text-muted small">Revenue</div>
                  <div className="fs-5 fw-bold text-success">{formatCurrency(summary.wholesale.revenue)}</div>
                </div>
                <div className="col-6">
                  <div className="text-muted small">Profit</div>
                  <div className="fs-5 fw-bold text-primary">{formatCurrency(summary.wholesale.profit)}</div>
                </div>
                <div className="col-6">
                  <div className="text-muted small">Orders</div>
                  <div className="fs-6">{formatNumber(summary.wholesale.orders)}</div>
                </div>
                <div className="col-6">
                  <div className="text-muted small">Profit Margin</div>
                  <div className="fs-6">{summary.wholesale.profit_margin.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </div>
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
                  <th className="text-end">Orders</th>
                  <th className="text-end">Retail Rev</th>
                  <th className="text-end">Wholesale Rev</th>
                  <th className="text-center">Trend</th>
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
                      <small className="text-muted d-block">{trend.profit_margin.toFixed(1)}%</small>
                    </td>
                    <td className="text-end">
                      {formatNumber(trend.order_count)}
                    </td>
                    <td className="text-end text-muted">
                      {formatCurrency(trend.retail.revenue)}
                      <small className="d-block text-muted" style={{fontSize: '0.75rem'}}>
                        {trend.retail.orders} orders
                      </small>
                    </td>
                    <td className="text-end text-muted">
                      {formatCurrency(trend.wholesale.revenue)}
                      <small className="d-block text-muted" style={{fontSize: '0.75rem'}}>
                        {trend.wholesale.orders} orders
                      </small>
                    </td>
                    <td className="text-center">
                      {trend.trend === 'up' && <span className="badge bg-success">↑ {trend.growth_rate?.toFixed(1)}%</span>}
                      {trend.trend === 'down' && <span className="badge bg-danger">↓ {trend.growth_rate?.toFixed(1)}%</span>}
                      {trend.trend === 'stable' && <span className="badge bg-secondary">→</span>}
                      {!trend.trend && <span className="text-muted">-</span>}
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
          <h5 className="mb-0">💳 Revenue by Payment Method</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            {(() => {
              const totalCash = trends.reduce((sum, t) => sum + t.payment_methods.cash, 0);
              const totalCard = trends.reduce((sum, t) => sum + t.payment_methods.card, 0);
              const totalCredit = trends.reduce((sum, t) => sum + t.payment_methods.credit, 0);
              const totalGcash = trends.reduce((sum, t) => sum + t.payment_methods.gcash, 0);
              const totalOther = trends.reduce((sum, t) => sum + t.payment_methods.other, 0);
              const total = totalCash + totalCard + totalCredit + totalGcash + totalOther;
              
              const methods = [
                { name: 'Cash', value: totalCash, color: 'success', icon: '💵' },
                { name: 'Card', value: totalCard, color: 'primary', icon: '💳' },
                { name: 'Credit', value: totalCredit, color: 'warning', icon: '📝' },
                { name: 'GCash', value: totalGcash, color: 'info', icon: '📱' },
                { name: 'Other', value: totalOther, color: 'secondary', icon: '💰' },
              ];
              
              return methods.map((method) => {
                const percentage = total > 0 ? (method.value / total) * 100 : 0;
                return (
                  <div key={method.name} className="col-md-4 col-lg-2">
                    <div className="card border h-100">
                      <div className="card-body">
                        <div className="text-center mb-2">
                          <span style={{ fontSize: '2rem' }}>{method.icon}</span>
                        </div>
                        <h6 className="text-center mb-1">{method.name}</h6>
                        <p className={`text-${method.color} fw-bold mb-2 text-center`}>
                          {formatCurrency(method.value)}
                        </p>
                        <div className="text-center">
                          <span className="badge bg-primary">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="progress mt-2" style={{ height: '6px' }}>
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



      {/* Patterns Card */}
      {patterns && (
        <div className="card">
          <div className="card-header bg-white">
            <h5 className="mb-0">🔍 Revenue Patterns & Insights</h5>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-3">
                <div className="card border-success h-100">
                  <div className="card-body text-center">
                    <h6 className="text-muted mb-2">Peak Day</h6>
                    <h4 className="text-success mb-0">{patterns.peak_day ? formatDate(patterns.peak_day) : 'N/A'}</h4>
                    <small className="text-muted">{formatCurrency(patterns.peak_revenue)}</small>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-danger h-100">
                  <div className="card-body text-center">
                    <h6 className="text-muted mb-2">Lowest Day</h6>
                    <h4 className="text-danger mb-0">{patterns.lowest_day ? formatDate(patterns.lowest_day) : 'N/A'}</h4>
                    <small className="text-muted">{formatCurrency(patterns.lowest_revenue)}</small>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-info h-100">
                  <div className="card-body text-center">
                    <h6 className="text-muted mb-2">Overall Trend</h6>
                    <h4 className="text-info mb-0 text-capitalize">{patterns.overall_trend}</h4>
                    <small className="text-muted">{patterns.growth_rate.toFixed(1)}% growth</small>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-warning h-100">
                  <div className="card-body text-center">
                    <h6 className="text-muted mb-2">Volatility</h6>
                    <h4 className="text-warning mb-0 text-capitalize">{patterns.volatility}</h4>
                    <small className="text-muted">Revenue stability</small>
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
