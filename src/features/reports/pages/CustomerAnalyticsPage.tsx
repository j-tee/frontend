import React, { useState, useEffect } from 'react';
import { salesReportsService } from '../../../services/reportsService';
import type { CustomerAnalyticsResponse } from '../../../types/reports';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { ReportStates } from '../components/ReportStates';

const CustomerAnalyticsPage: React.FC = () => {
  const [data, setData] = useState<CustomerAnalyticsResponse | null>(null);
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
      
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer analytics report');
      console.error('Error fetching customer analytics:', err);
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

  const formatPercent = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  if (loading && !data) return <ReportStates.Loading />;
  if (error) return <ReportStates.Error error={error} onRetry={fetchData} />;
  if (!data) return <ReportStates.Empty message="No customer analytics data available" />;

  return (
    <ReportContainer
      title="Customer Analytics Report"
      subtitle={`${startDate} to ${endDate}`}
      icon="👥"
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
            title="Total Customers"
            value={formatNumber(data.summary.total_customers)}
            icon="👥"
            color="primary"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="New Customers"
            value={formatNumber(data.summary.new_customers)}
            icon="✨"
            color="success"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Retention Rate"
            value={formatPercent(data.summary.customer_retention_rate)}
            icon="🔄"
            color="info"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Avg Customer Value"
            value={formatCurrency(data.summary.average_customer_value)}
            icon="💰"
            color="warning"
          />
        </div>
      </div>

      {/* Customer Segments */}
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
                    {formatNumber(data.segments['at-risk'])}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Top Customers Table */}
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

      {/* Purchase Frequency */}
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
    </ReportContainer>
  );
};

export default CustomerAnalyticsPage;
