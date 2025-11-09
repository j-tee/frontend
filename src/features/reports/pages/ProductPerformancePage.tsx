import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { salesReportsService } from '../../../services/reportsService';
import type { ProductPerformanceResponse, ReportFilters } from '../../../types/reports';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { ReportStates } from '../components/ReportStates';
import { useCurrency } from '../../../hooks/useCurrency';
import { useAppSelector } from '../../../hooks';
import { selectStorefrontsLoading, selectUserStorefronts } from '../../../store/slices/authSlice';
import { AIQueryBox } from '../../ai';

const ProductPerformancePage: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const storefronts = useAppSelector(selectUserStorefronts);
  const storefrontsLoading = useAppSelector(selectStorefrontsLoading);
  
  const [data, setData] = useState<ProductPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [category, setCategory] = useState<string>('');
  const [saleType, setSaleType] = useState<string>('');
  const [storefrontId, setStorefrontId] = useState<string>('');

  const storefrontOptions = useMemo(() => {
    const items = storefronts ?? [];
    return items.map((storefront) => ({ id: storefront.id, name: storefront.name }));
  }, [storefronts]);

  const buildFilters = useCallback((): ReportFilters => {
    const filters: ReportFilters = {
      start_date: startDate,
      end_date: endDate,
    };

    if (category) filters.category_id = category;
    if (saleType) filters.customer_type = saleType as 'retail' | 'wholesale';
    if (storefrontId) filters.storefront_id = storefrontId;

    return filters;
  }, [category, endDate, saleType, startDate, storefrontId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await salesReportsService.getProductPerformance(buildFilters());
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product performance report');
    } finally {
      setLoading(false);
    }
  }, [buildFilters]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleExportCSV = async () => {
    try {
      await salesReportsService.exportProductPerformanceCSV(buildFilters());
    } catch {
      alert('Failed to export CSV. Please try again.');
    }
  };

  const handleExportPDF = async () => {
    try {
      await salesReportsService.exportProductPerformancePDF(buildFilters());
    } catch {
      alert('Failed to export PDF. Please try again.');
    }
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  if (loading && !data) return <ReportStates.Loading />;
  if (error) return <ReportStates.Error error={error} onRetry={fetchData} />;
  if (!data || !data.summary || !data.products) {
    return <ReportStates.Empty message="No product performance data available" />;
  }
  
  return (
    <ReportContainer
      title="Product Performance Report"
      subtitle={`${startDate} to ${endDate}`}
      icon="📦"
      backPath="/app/reports/sales"
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
            onClick={handleExportCSV}
            disabled={loading}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            📥 Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            📄 Export PDF
          </button>
        </>
      }
    >
      <div className="card mb-4">
        <div className="card-body">
          <div className="mb-4">
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              showPresets={true}
            />
          </div>
          <div className="row g-3 align-items-end">
            <div className="col-md-4 col-lg-3">
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
              {storefrontsLoading && (
                <div className="form-text">Loading storefronts…</div>
              )}
              {!storefrontsLoading && storefrontOptions.length === 0 && (
                <div className="form-text">No storefronts available</div>
              )}
            </div>
            <div className="col-md-4 col-lg-3">
              <label className="form-label fw-bold" htmlFor="category-filter">
                Category Filter
              </label>
              <input
                id="category-filter"
                type="text"
                className="form-control"
                placeholder="Enter category name..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div className="col-md-4 col-lg-3">
              <label className="form-label fw-bold" htmlFor="sale-type-filter">
                Sale Type
              </label>
              <select
                id="sale-type-filter"
                className="form-select"
                value={saleType}
                onChange={(e) => setSaleType(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="retail">Retail Only</option>
                <option value="wholesale">Wholesale Only</option>
              </select>
            </div>
            <div className="col-md-4 col-lg-3">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setCategory('');
                  setSaleType('');
                  setStorefrontId('');
                }}
              >
                <i className="bi bi-x-circle me-2"></i>
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Query Box - Ask questions about product performance */}
      <div className="mb-4">
        <AIQueryBox 
          storefrontId={storefrontId}
          placeholder="Ask about product performance... (e.g., 'Which products had the highest revenue last month?' or 'Show me slow-moving inventory')"
        />
      </div>

      <div className="row g-3 mb-4">
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
            title="Total Quantity"
            value={formatNumber(data.summary.total_quantity)}
            icon="📦"
            color="primary"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Products Sold"
            value={formatNumber(data.summary.total_products)}
            icon="🏷️"
            color="info"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Transactions"
            value={formatNumber(data.summary.total_transactions)}
            icon="🧾"
            color="warning"
          />
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header bg-white">
          <h5 className="mb-0">Sales by Channel</h5>
        </div>
        <div className="card-body">
          <div className="row g-4">
            <div className="col-md-6">
              <div className="border-start border-5 border-success ps-3">
                <h6 className="text-muted mb-3">
                  <i className="bi bi-shop me-2"></i>
                  Retail Sales
                </h6>
                <div className="row g-3">
                  <div className="col-6">
                    <div className="text-muted small">Revenue</div>
                    <div className="fw-bold text-success">
                      {formatCurrency(data.summary.retail.revenue)}
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted small">Quantity</div>
                    <div className="fw-bold">
                      {formatNumber(data.summary.retail.quantity)}
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted small">Transactions</div>
                    <div className="fw-bold">
                      {formatNumber(data.summary.retail.transactions)}
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted small">Products</div>
                    <div className="fw-bold">
                      {formatNumber(data.summary.retail.products)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="border-start border-5 border-primary ps-3">
                <h6 className="text-muted mb-3">
                  <i className="bi bi-building me-2"></i>
                  Wholesale Sales
                </h6>
                <div className="row g-3">
                  <div className="col-6">
                    <div className="text-muted small">Revenue</div>
                    <div className="fw-bold text-primary">
                      {formatCurrency(data.summary.wholesale.revenue)}
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted small">Quantity</div>
                    <div className="fw-bold">
                      {formatNumber(data.summary.wholesale.quantity)}
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted small">Transactions</div>
                    <div className="fw-bold">
                      {formatNumber(data.summary.wholesale.transactions)}
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted small">Products</div>
                    <div className="fw-bold">
                      {formatNumber(data.summary.wholesale.products)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-end g-3">
            <div className="col-md-4">
              <label className="form-label fw-bold">Category Filter</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter category name..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-bold">Sale Type</label>
              <select
                className="form-select"
                value={saleType}
                onChange={(e) => setSaleType(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="RETAIL">Retail Only</option>
                <option value="WHOLESALE">Wholesale Only</option>
              </select>
            </div>
            <div className="col-md-4">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setCategory('');
                  setSaleType('');
                }}
              >
                <i className="bi bi-x-circle me-2"></i>
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header bg-white">
          <h5 className="mb-0">Top Products ({data.products.length} items)</h5>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th className="px-4">#</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th className="text-end">Total Revenue</th>
                  <th className="text-end">Total Qty</th>
                  <th className="text-end">Retail Revenue</th>
                  <th className="text-end">Retail Qty</th>
                  <th className="text-end">Wholesale Revenue</th>
                  <th className="text-end">Wholesale Qty</th>
                  <th className="text-end">Avg Price</th>
                </tr>
              </thead>
              <tbody>
                {data.products.map((product, index) => (
                  <tr key={product.product_id}>
                    <td className="px-4 text-muted">{index + 1}</td>
                    <td>
                      <div className="fw-bold">{product.name}</div>
                      <small className="text-muted">SKU: {product.sku}</small>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark">
                        {product.category}
                      </span>
                    </td>
                    <td className="text-end">
                      <strong className="text-success">
                        {formatCurrency(product.total_revenue)}
                      </strong>
                    </td>
                    <td className="text-end">
                      <strong>{formatNumber(product.total_quantity)}</strong>
                    </td>
                    <td className="text-end">
                      <span className="text-success">
                        {formatCurrency(product.retail.revenue)}
                      </span>
                    </td>
                    <td className="text-end">
                      {formatNumber(product.retail.quantity)}
                    </td>
                    <td className="text-end">
                      <span className="text-primary">
                        {formatCurrency(product.wholesale.revenue)}
                      </span>
                    </td>
                    <td className="text-end">
                      {formatNumber(product.wholesale.quantity)}
                    </td>
                    <td className="text-end">
                      <span className="badge bg-secondary">
                        {formatCurrency(product.avg_price)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {data.categories && data.categories.length > 0 && (
        <div className="card mt-4">
          <div className="card-header bg-white">
            <h5 className="mb-0">Category Performance ({data.categories.length} categories)</h5>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-4">Category</th>
                    <th className="text-end">Revenue</th>
                    <th className="text-end">Quantity</th>
                    <th className="text-end">Products</th>
                    <th className="text-end">Transactions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categories.map((cat, index) => (
                    <tr key={index}>
                      <td className="px-4">
                        <span className="badge bg-primary">{cat.category}</span>
                      </td>
                      <td className="text-end">
                        <strong className="text-success">
                          {formatCurrency(cat.revenue)}
                        </strong>
                      </td>
                      <td className="text-end">{formatNumber(cat.quantity)}</td>
                      <td className="text-end">{formatNumber(cat.products)}</td>
                      <td className="text-end">{formatNumber(cat.transactions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </ReportContainer>
  );
};

export default ProductPerformancePage;
