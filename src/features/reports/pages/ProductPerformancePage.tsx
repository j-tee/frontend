import React, { useState, useEffect } from 'react';
import { salesReportsService } from '../../../services/reportsService';
import type { ProductPerformanceResponse } from '../../../types/reports';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { ReportStates } from '../components/ReportStates';

const ProductPerformancePage: React.FC = () => {
  const [data, setData] = useState<ProductPerformanceResponse['data'] | null>(null);
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

  const [sortBy, setSortBy] = useState<'revenue' | 'quantity' | 'profit'>('revenue');
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await salesReportsService.getProductPerformance({
        start_date: startDate,
        end_date: endDate,
        sort_by: sortBy,
        order: order,
        limit: 100,
      });
      
      // Handle nested API response structure
      if (result.success && result.data) {
        setData(result.data);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product performance report');
      console.error('Error fetching product performance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, sortBy, order]);

  const handleExport = async () => {
    try {
      await salesReportsService.exportProductPerformanceCSV({
        start_date: startDate,
        end_date: endDate,
        sort_by: sortBy,
        order: order,
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
    return `${value.toFixed(2)}%`;
  };

  if (loading && !data) return <ReportStates.Loading />;
  if (error) return <ReportStates.Error error={error} onRetry={fetchData} />;
  if (!data) return <ReportStates.Empty message="No product performance data available" />;

  return (
    <ReportContainer
      title="Product Performance Report"
      subtitle={`${startDate} to ${endDate}`}
      icon="📦"
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
            title="Total Products"
            value={formatNumber(data.summary.total_products_sold)}
            icon="📦"
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
            title="Total Profit"
            value={formatCurrency(data.summary.total_profit)}
            icon="📈"
            color="info"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Avg Profit Margin"
            value={formatPercent(data.summary.average_profit_margin)}
            icon="📊"
            color="warning"
          />
        </div>
      </div>

      {/* Sorting Controls */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-6">
              <label className="form-label fw-bold">Sort By</label>
              <div className="btn-group w-100" role="group">
                <button
                  type="button"
                  className={`btn ${sortBy === 'revenue' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setSortBy('revenue')}
                >
                  Revenue
                </button>
                <button
                  type="button"
                  className={`btn ${sortBy === 'quantity' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setSortBy('quantity')}
                >
                  Quantity
                </button>
                <button
                  type="button"
                  className={`btn ${sortBy === 'profit' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setSortBy('profit')}
                >
                  Profit
                </button>
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-bold">Order</label>
              <div className="btn-group w-100" role="group">
                <button
                  type="button"
                  className={`btn ${order === 'desc' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setOrder('desc')}
                >
                  <i className="bi bi-sort-down me-2"></i>
                  Highest First
                </button>
                <button
                  type="button"
                  className={`btn ${order === 'asc' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setOrder('asc')}
                >
                  <i className="bi bi-sort-up me-2"></i>
                  Lowest First
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="card">
        <div className="card-header bg-white">
          <h5 className="mb-0">Product Performance ({data.products.length} items)</h5>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th className="px-4">#</th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th className="text-end">Qty Sold</th>
                  <th className="text-end">Revenue</th>
                  <th className="text-end">Profit</th>
                  <th className="text-end">Margin</th>
                  <th className="text-end">Avg Price</th>
                  <th className="text-center">Trend</th>
                </tr>
              </thead>
              <tbody>
                {data.products.map((product, index) => (
                  <tr key={product.product_id}>
                    <td className="px-4 text-muted">{index + 1}</td>
                    <td>
                      <div className="fw-bold">{product.product_name}</div>
                      <small className="text-muted">
                        {product.times_ordered} orders
                      </small>
                    </td>
                    <td>
                      <code className="text-secondary">{product.sku}</code>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark">
                        {product.category}
                      </span>
                    </td>
                    <td className="text-end">
                      <strong>{formatNumber(product.total_quantity_sold)}</strong>
                    </td>
                    <td className="text-end">
                      <strong className="text-success">
                        {formatCurrency(product.total_revenue)}
                      </strong>
                    </td>
                    <td className="text-end">
                      <strong className="text-primary">
                        {formatCurrency(product.total_profit)}
                      </strong>
                    </td>
                    <td className="text-end">
                      <span 
                        className={`badge ${
                          product.profit_margin >= 30 
                            ? 'bg-success' 
                            : product.profit_margin >= 15 
                            ? 'bg-warning' 
                            : 'bg-danger'
                        }`}
                      >
                        {formatPercent(product.profit_margin)}
                      </span>
                    </td>
                    <td className="text-end text-muted">
                      {formatCurrency(product.average_selling_price)}
                    </td>
                    <td className="text-center">
                      {product.trend === 'up' && (
                        <span className="text-success">
                          <i className="bi bi-arrow-up-circle-fill"></i>
                        </span>
                      )}
                      {product.trend === 'down' && (
                        <span className="text-danger">
                          <i className="bi bi-arrow-down-circle-fill"></i>
                        </span>
                      )}
                      {product.trend === 'stable' && (
                        <span className="text-secondary">
                          <i className="bi bi-dash-circle-fill"></i>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Top Performers Highlight */}
      {data.products.length > 0 && (
        <div className="row g-3 mt-4">
          <div className="col-md-4">
            <div className="card border-success">
              <div className="card-header bg-success text-white">
                <h6 className="mb-0">🏆 Top by Revenue</h6>
              </div>
              <div className="card-body">
                <h5 className="mb-1">{data.products[0]?.product_name}</h5>
                <p className="text-success fw-bold mb-0">
                  {formatCurrency(data.products[0]?.total_revenue || 0)}
                </p>
                <small className="text-muted">
                  {formatNumber(data.products[0]?.total_quantity_sold || 0)} units sold
                </small>
              </div>
            </div>
          </div>
          
          <div className="col-md-4">
            <div className="card border-primary">
              <div className="card-header bg-primary text-white">
                <h6 className="mb-0">💎 Highest Margin</h6>
              </div>
              <div className="card-body">
                {(() => {
                  const highestMargin = [...data.products].sort(
                    (a, b) => b.profit_margin - a.profit_margin
                  )[0];
                  return (
                    <>
                      <h5 className="mb-1">{highestMargin?.product_name}</h5>
                      <p className="text-primary fw-bold mb-0">
                        {formatPercent(highestMargin?.profit_margin || 0)}
                      </p>
                      <small className="text-muted">
                        {formatCurrency(highestMargin?.total_profit || 0)} profit
                      </small>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card border-info">
              <div className="card-header bg-info text-white">
                <h6 className="mb-0">📦 Best Seller</h6>
              </div>
              <div className="card-body">
                {(() => {
                  const bestSeller = [...data.products].sort(
                    (a, b) => b.total_quantity_sold - a.total_quantity_sold
                  )[0];
                  return (
                    <>
                      <h5 className="mb-1">{bestSeller?.product_name}</h5>
                      <p className="text-info fw-bold mb-0">
                        {formatNumber(bestSeller?.total_quantity_sold || 0)} units
                      </p>
                      <small className="text-muted">
                        {bestSeller?.times_ordered || 0} orders
                      </small>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </ReportContainer>
  );
};

export default ProductPerformancePage;
