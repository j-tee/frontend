import React, { useState, useEffect } from 'react';
import { salesReportsService } from '../../../services/reportsService';
import type { CustomerAnalyticsResponse } from '../../../types/reports';
import { useCurrency } from '../../../hooks/useCurrency';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { ReportStates } from '../components/ReportStates';

const CustomerAnalyticsPage: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const [data, setData] = useState<CustomerAnalyticsResponse['data'] | null>(null);
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

  const [selectedSegment, setSelectedSegment] = useState<'all' | 'new' | 'returning' | 'vip' | 'at-risk'>('all');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await salesReportsService.getCustomerAnalytics({
        start_date: startDate,
        end_date: endDate,
        segment: selectedSegment === 'all' ? undefined : selectedSegment,
      });
      
      // Handle nested API response structure
      if (result.success && result.data) {
        setData(result.data);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer analytics report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, selectedSegment]);

  const handleExport = async () => {
    try {
      await salesReportsService.exportCustomerAnalyticsCSV({
        start_date: startDate,
        end_date: endDate,
        segment: selectedSegment === 'all' ? undefined : selectedSegment,
      });
    } catch (err) {
      alert('Failed to export report. Please try again.');
    }
  };

  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return '0';
    return new Intl.NumberFormat('en-US').format(value);
  };

  // const formatPercent = (value: number | null | undefined): string => {
  //   if (value === null || value === undefined || isNaN(value)) return '0.0%';
  //   return `${value.toFixed(1)}%`;
  // };

  if (loading && !data) return <ReportStates.Loading />;
  if (error) return <ReportStates.Error error={error} onRetry={fetchData} />;
  if (!data || !data.summary) {
    return <ReportStates.Empty message="No customer analytics data available" />;
  }

  return (
    <ReportContainer
      title="Customer Analytics Report"
      subtitle={`${startDate} to ${endDate}`}
      icon="👥"
      backPath="/app/reports/sales"
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
            title="Total Customers"
            value={formatNumber(data.summary.total_customers)}
            icon="👥"
            color="primary"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Total Revenue"
            value={formatCurrency(data.summary.total_revenue)}
            icon="💰"
            color="success"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Total Orders"
            value={formatNumber(data.summary.total_orders)}
            icon="📦"
            color="info"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Avg Revenue/Customer"
            value={formatCurrency(data.summary.average_revenue_per_customer)}
            icon="�"
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
                Retail Customers
              </h6>
              <div className="row g-2">
                <div className="col-6">
                  <div className="text-muted small">Customers</div>
                  <div className="fs-5 fw-bold">{formatNumber(data.summary.retail?.customers || 0)}</div>
                </div>
                <div className="col-6">
                  <div className="text-muted small">Revenue</div>
                  <div className="fs-5 fw-bold text-success">{formatCurrency(data.summary.retail?.revenue || 0)}</div>
                </div>
                <div className="col-6">
                  <div className="text-muted small">Orders</div>
                  <div className="fs-6">{formatNumber(data.summary.retail?.orders || 0)}</div>
                </div>
                <div className="col-6">
                  <div className="text-muted small">Avg/Customer</div>
                  <div className="fs-6">{formatCurrency(data.summary.retail?.avg_revenue_per_customer || 0)}</div>
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
                Wholesale Customers
              </h6>
              <div className="row g-2">
                <div className="col-6">
                  <div className="text-muted small">Customers</div>
                  <div className="fs-5 fw-bold">{formatNumber(data.summary.wholesale?.customers || 0)}</div>
                </div>
                <div className="col-6">
                  <div className="text-muted small">Revenue</div>
                  <div className="fs-5 fw-bold text-success">{formatCurrency(data.summary.wholesale?.revenue || 0)}</div>
                </div>
                <div className="col-6">
                  <div className="text-muted small">Orders</div>
                  <div className="fs-6">{formatNumber(data.summary.wholesale?.orders || 0)}</div>
                </div>
                <div className="col-6">
                  <div className="text-muted small">Avg/Customer</div>
                  <div className="fs-6">{formatCurrency(data.summary.wholesale?.avg_revenue_per_customer || 0)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Segments - Commented out until backend implements */}
      {data.segments && (
        <div className="card mb-4">
          <div className="card-header bg-white">
            <h5 className="mb-0">Customer Segments</h5>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-3">
                <button
                  className={`btn w-100 ${selectedSegment === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setSelectedSegment('all')}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <span>All Customers</span>
                    <span className="badge bg-light text-dark">
                      {formatNumber(data.summary.total_customers)}
                    </span>
                  </div>
                </button>
              </div>
              <div className="col-md-3">
                <button
                  className={`btn w-100 ${selectedSegment === 'new' ? 'btn-success' : 'btn-outline-success'}`}
                  onClick={() => setSelectedSegment('new')}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <span>New</span>
                    <span className="badge bg-light text-dark">
                      {formatNumber(data.segments.new)}
                    </span>
                  </div>
                </button>
              </div>
              <div className="col-md-3">
                <button
                  className={`btn w-100 ${selectedSegment === 'returning' ? 'btn-info' : 'btn-outline-info'}`}
                  onClick={() => setSelectedSegment('returning')}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <span>Returning</span>
                    <span className="badge bg-light text-dark">
                      {formatNumber(data.segments.returning)}
                    </span>
                  </div>
                </button>
              </div>
              <div className="col-md-3">
                <button
                  className={`btn w-100 ${selectedSegment === 'vip' ? 'btn-warning' : 'btn-outline-warning'}`}
                  onClick={() => setSelectedSegment('vip')}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <span>VIP</span>
                    <span className="badge bg-light text-dark">
                      {formatNumber(data.segments.vip)}
                    </span>
                  </div>
                </button>
              </div>
            </div>
            
            <div className="row g-3 mt-2">
              <div className="col-md-3">
                <button
                  className={`btn w-100 ${selectedSegment === 'at-risk' ? 'btn-danger' : 'btn-outline-danger'}`}
                  onClick={() => setSelectedSegment('at-risk')}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <span>At Risk</span>
                    <span className="badge bg-light text-dark">
                      {formatNumber(data.segments.at_risk)}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Customers Table */}
      {data.top_customers && data.top_customers.length > 0 && (
        <div className="card mb-4">
          <div className="card-header bg-white">
            <h5 className="mb-0">Top Customers ({data.top_customers.length} shown)</h5>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-4">#</th>
                    <th>Customer</th>
                    <th>Segment</th>
                    <th className="text-end">Total Spent</th>
                    <th className="text-end">Purchases</th>
                    <th className="text-end">Avg Order</th>
                    <th>Last Purchase</th>
                    <th>Customer Since</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_customers.map((customer, index) => (
                    <tr key={customer.customer_id}>
                      <td className="px-4 text-muted">{index + 1}</td>
                      <td>
                        <div className="fw-bold">{customer.customer_name}</div>
                      </td>
                      <td>
                        <span className={`badge ${
                          customer.segment === 'vip' ? 'bg-warning' :
                          customer.segment === 'new' ? 'bg-success' :
                          customer.segment === 'returning' ? 'bg-info' :
                          'bg-secondary'
                        }`}>
                          {customer.segment.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-end">
                        <strong className="text-success">
                          {formatCurrency(customer.total_spent)}
                        </strong>
                      </td>
                      <td className="text-end">
                        <strong>{formatNumber(customer.total_purchases)}</strong>
                      </td>
                      <td className="text-end text-muted">
                        {formatCurrency(customer.average_order_value)}
                      </td>
                      <td>
                        <small className="text-muted">
                          {new Date(customer.last_purchase_date).toLocaleDateString()}
                        </small>
                      </td>
                      <td>
                        <small className="text-muted">
                          {new Date(customer.customer_since).toLocaleDateString()}
                        </small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Frequency */}
      {data.purchase_frequency && (
        <div className="card">
          <div className="card-header bg-white">
            <h5 className="mb-0">Purchase Frequency</h5>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <div className="text-center p-4 border rounded">
                  <h6 className="text-muted mb-2">Daily Buyers</h6>
                  <h2 className="mb-0 text-success">
                    {formatNumber(data.purchase_frequency.daily)}
                  </h2>
                  <small className="text-muted">Active daily shoppers</small>
                </div>
              </div>
              <div className="col-md-4">
                <div className="text-center p-4 border rounded">
                  <h6 className="text-muted mb-2">Weekly Buyers</h6>
                  <h2 className="mb-0 text-info">
                    {formatNumber(data.purchase_frequency.weekly)}
                  </h2>
                  <small className="text-muted">Regular weekly shoppers</small>
                </div>
              </div>
              <div className="col-md-4">
                <div className="text-center p-4 border rounded">
                  <h6 className="text-muted mb-2">Monthly Buyers</h6>
                  <h2 className="mb-0 text-warning">
                    {formatNumber(data.purchase_frequency.monthly)}
                  </h2>
                  <small className="text-muted">Occasional monthly shoppers</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </ReportContainer>
  );
};

export default CustomerAnalyticsPage;
