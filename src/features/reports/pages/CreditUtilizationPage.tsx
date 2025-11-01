import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Download,
  FileText,
  RefreshCw,
  XCircle,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from 'lucide-react';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { ReportStates } from '../components/ReportStates';
import { customerReportsService } from '../../../services/reportsService';
import { useCurrency } from '../../../hooks/useCurrency';
import type {
  CreditUtilizationResponse,
  CreditCustomer,
  ReportFilters,
  PaginationInfo,
} from '../../../types/reports';

const DEFAULT_UTILIZATION_THRESHOLD = 80;

const CreditUtilizationPage: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const [data, setData] = useState<CreditUtilizationResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 90);
    return date.toISOString().split('T')[0];
  });

  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [segment, setSegment] = useState<string>('');
  const [storefrontId, setStorefrontId] = useState<string>('');
  const [utilizationThreshold, setUtilizationThreshold] = useState<number>(DEFAULT_UTILIZATION_THRESHOLD);
  const [sortBy, setSortBy] = useState<'utilization' | 'amount' | 'risk'>('utilization');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const buildFilters = (): ReportFilters => {
    const filters: ReportFilters = {
      start_date: startDate,
      end_date: endDate,
      utilization_threshold: utilizationThreshold,
      sort_by: sortBy,
      page,
      page_size: pageSize,
    };

    if (segment) {
      filters.segment = segment as 'retail' | 'wholesale';
    }

    if (storefrontId) {
      filters.storefront_id = storefrontId;
    }

    return filters;
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const filters = buildFilters();
      const response = await customerReportsService.getCreditUtilization(filters);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load credit utilization report');
      }

      const payload = response.data;
      const summaryData = payload.summary;

      setData(payload);

      if (summaryData) {
        const serverPagination = response.meta?.pagination;
        const fallbackTotal = summaryData.total_customers_with_credit;
        const requestedPage = typeof filters.page === 'number' && filters.page > 0 ? filters.page : 1;
        const requestedPageSizeRaw = filters.page_size ?? fallbackTotal;
        const requestedPageSizeNumber = Number(requestedPageSizeRaw);
        const fallbackPageSize = Number.isFinite(requestedPageSizeNumber) && requestedPageSizeNumber > 0 ? requestedPageSizeNumber : 1;

        const resolvedTotal = serverPagination && typeof serverPagination.total_count === 'number'
          ? serverPagination.total_count
          : serverPagination && typeof serverPagination.total === 'number'
          ? serverPagination.total
          : fallbackTotal;

        const normalizedPagination: PaginationInfo = serverPagination
          ? {
              page: serverPagination.page > 0 ? serverPagination.page : 1,
              page_size: Math.max(serverPagination.page_size, 1),
              total_pages:
                serverPagination.total_pages && serverPagination.total_pages > 0
                  ? serverPagination.total_pages
                  : Math.max(1, Math.ceil(resolvedTotal / Math.max(serverPagination.page_size, 1))),
              total: resolvedTotal,
            }
          : {
              page: requestedPage,
              page_size: fallbackPageSize,
              total_pages: Math.max(1, Math.ceil(fallbackTotal / fallbackPageSize || 1)),
              total: fallbackTotal,
            };

        setPagination(normalizedPagination);

        if (normalizedPagination.page !== page) {
          setPage(normalizedPagination.page);
        }

        if (normalizedPagination.page_size !== pageSize) {
          setPageSize(normalizedPagination.page_size);
        }
      } else {
        setPagination(null);
      }
    } catch (err) {
      console.error('CreditUtilizationPage: fetchData failed', err);
      setError(err instanceof Error ? err.message : 'Failed to load credit utilization data');
      setData(null);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, segment, storefrontId, utilizationThreshold, sortBy, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, segment, storefrontId, utilizationThreshold, sortBy]);

  const handleExportCSV = async () => {
    try {
      const exportFilters: ReportFilters = { ...buildFilters() };
      delete exportFilters.page;
      delete exportFilters.page_size;
      await customerReportsService.exportCreditUtilizationCSV(exportFilters);
    } catch (err) {
      console.error('CreditUtilizationPage: export CSV failed', err);
      alert('Export failed. Please try again.');
    }
  };

  const handleExportPDF = async () => {
    try {
      const exportFilters: ReportFilters = { ...buildFilters() };
      delete exportFilters.page;
      delete exportFilters.page_size;
      await customerReportsService.exportCreditUtilizationPDF(exportFilters);
    } catch (err) {
      console.error('CreditUtilizationPage: export PDF failed', err);
      alert('Export failed. Please try again.');
    }
  };

  const formatPercent = (value: number): string => `${value.toFixed(1)}%`;
  const formatInteger = (value: number): string => new Intl.NumberFormat().format(value);

  const getRiskBadgeClass = (risk: CreditCustomer['risk_level']) => {
    switch (risk) {
      case 'high':
        return 'badge bg-danger text-white d-inline-flex align-items-center gap-1';
      case 'medium':
        return 'badge bg-warning text-dark d-inline-flex align-items-center gap-1';
      default:
        return 'badge bg-success text-white d-inline-flex align-items-center gap-1';
    }
  };

  const getRiskIcon = (risk: CreditCustomer['risk_level']) => {
    if (risk === 'high') return <XCircle className="h-4 w-4" />;
    if (risk === 'medium') return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getProgressBarClass = (value: number) => {
    if (value >= 90) return 'bg-danger';
    if (value >= 75) return 'bg-warning';
    return 'bg-success';
  };

  if (loading && !data) {
    return <ReportStates.Loading message="Loading credit utilization..." />;
  }

  if (error) {
    return <ReportStates.Error error={error} onRetry={fetchData} />;
  }

  if (!data) {
    return <ReportStates.Empty message="No credit utilization data available" />;
  }

  const { summary, customers, risk_distribution: riskDistribution } = data;
  const totalCustomers = typeof (pagination?.total) === 'number' ? pagination!.total : summary.total_customers_with_credit;
  const pageSizeValue = pagination?.page_size ?? pageSize;
  const safePageSize = Math.max(pageSizeValue, 1);
  const totalPages = pagination?.total_pages && pagination.total_pages > 0
    ? pagination.total_pages
    : Math.max(1, Math.ceil(totalCustomers / safePageSize));
  const currentPage = pagination?.page ?? Math.min(page, totalPages);
  const hasCustomers = customers.length > 0;
  const showingFrom = hasCustomers ? (currentPage - 1) * safePageSize + 1 : 0;
  const showingTo = hasCustomers ? Math.min(showingFrom + customers.length - 1, totalCustomers) : 0;
  const basePageSizes = [10, 25, 50, 100];
  const pageSizeOptions = basePageSizes.includes(safePageSize)
    ? basePageSizes
    : [...basePageSizes, safePageSize].sort((a, b) => a - b);

  const pageNumbers: Array<number | 'ellipsis'> = (() => {
    const pages: Array<number | 'ellipsis'> = [];
    const maxButtons = 5;

    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i += 1) {
        pages.push(i);
      }
      return pages;
    }

    pages.push(1);
    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) {
      start = 2;
      end = Math.min(totalPages - 1, 4);
    }

    if (currentPage >= totalPages - 2) {
      start = Math.max(2, totalPages - 3);
      end = totalPages - 1;
    }

    if (start > 2) {
      pages.push('ellipsis');
    }

    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }

    if (end < totalPages - 1) {
      pages.push('ellipsis');
    }

    pages.push(totalPages);
    return pages;
  })();

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === currentPage) return;
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (nextSize: number) => {
    if (nextSize === pageSizeValue) return;
    setPage(1);
    setPageSize(nextSize);
  };

  return (
    <ReportContainer
      title="Credit Utilization Analysis"
      subtitle={`${startDate} to ${endDate} • Threshold ${utilizationThreshold}%`}
      icon="💳"
      backPath="/app/reports/customer"
      actions={
        <>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            <span>Export PDF</span>
          </button>
        </>
      }
    >
      <div className="mb-4">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          showPresets={true}
        />
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label fw-bold">Segment</label>
              <select
                className="form-select"
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
              >
                <option value="">All Segments</option>
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-bold">Storefront ID</label>
              <input
                type="text"
                value={storefrontId}
                onChange={(e) => setStorefrontId(e.target.value)}
                className="form-control"
                placeholder="Optional storefront UUID"
              />
            </div>
            <div className="col-md-3">
              <label className="form-label fw-bold">Utilization Threshold</label>
              <div className="d-flex align-items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={utilizationThreshold}
                  onChange={(e) => setUtilizationThreshold(Number(e.target.value))}
                  className="form-range"
                />
                <span className="badge bg-primary">{utilizationThreshold}%</span>
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-bold">Sort By</label>
              <select
                className="form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'utilization' | 'amount' | 'risk')}
              >
                <option value="utilization">Utilization %</option>
                <option value="amount">Outstanding Amount</option>
                <option value="risk">Risk Level</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <SummaryCard
            title="Customers with Credit"
            value={formatInteger(summary.total_customers_with_credit)}
            icon="👥"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Total Credit Extended"
            value={formatCurrency(summary.total_credit_extended)}
            icon="💰"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="Credit Used"
            value={formatCurrency(summary.total_credit_used)}
            subtitle={`${formatPercent(summary.average_utilization)} average utilization`}
            icon="📊"
          />
        </div>
        <div className="col-md-3">
          <SummaryCard
            title="High Risk Customers"
            value={formatInteger(summary.credit_risk_high)}
            subtitle={`${formatInteger(summary.at_limit)} at credit limit`}
            icon="⚠️"
          />
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header bg-white">
          <h5 className="mb-0">Risk Distribution</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="border-start border-5 border-success ps-3 py-3">
                <small className="text-muted d-block">Low Risk</small>
                <h4 className="mb-0 text-success">{formatInteger(riskDistribution.low)}</h4>
              </div>
            </div>
            <div className="col-md-4">
              <div className="border-start border-5 border-warning ps-3 py-3">
                <small className="text-muted d-block">Medium Risk</small>
                <h4 className="mb-0 text-warning">{formatInteger(riskDistribution.medium)}</h4>
              </div>
            </div>
            <div className="col-md-4">
              <div className="border-start border-5 border-danger ps-3 py-3">
                <small className="text-muted d-block">High Risk</small>
                <h4 className="mb-0 text-danger">{formatInteger(riskDistribution.high)}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header bg-white">
          <h5 className="mb-0">Credit Customers ({customers.length})</h5>
          <small className="text-muted">Highlighting usage above {utilizationThreshold}%</small>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Customer</th>
                  <th className="text-end">Credit Limit</th>
                  <th className="text-end">Credit Used</th>
                  <th className="text-end">Available</th>
                  <th className="text-end">Utilization</th>
                  <th className="text-center">Risk</th>
                  <th className="text-center">Days Overdue</th>
                  <th className="text-center">Outstanding</th>
                  <th>Last Payment</th>
                  <th>Recommended Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => {
                  const utilization = customer.utilization_percentage;
                  return (
                    <tr key={customer.customer_id}>
                      <td>
                        <div className="fw-semibold text-slate-900">{customer.customer_name}</div>
                        <div className="text-muted small">Score: {customer.payment_history_score}/100</div>
                      </td>
                      <td className="text-end">{formatCurrency(customer.credit_limit)}</td>
                      <td className="text-end text-danger fw-semibold">{formatCurrency(customer.credit_used)}</td>
                      <td className="text-end">{formatCurrency(customer.credit_available)}</td>
                      <td className="text-end" style={{ minWidth: 160 }}>
                        <div className="fw-bold">{formatPercent(utilization)}</div>
                        <div className="progress mt-1" style={{ height: '6px' }}>
                          <div
                            className={`progress-bar ${getProgressBarClass(utilization)}`}
                            role="progressbar"
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                            aria-valuenow={utilization}
                            aria-valuemin={0}
                            aria-valuemax={150}
                          />
                        </div>
                      </td>
                      <td className="text-center">
                        <span className={getRiskBadgeClass(customer.risk_level)}>
                          {getRiskIcon(customer.risk_level)}
                          {customer.risk_level.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-center">
                        {customer.days_overdue > 0 ? (
                          <span className="badge bg-danger">{customer.days_overdue} days</span>
                        ) : (
                          <span className="text-muted">Current</span>
                        )}
                      </td>
                      <td className="text-center">{formatCurrency(customer.outstanding_balance)}</td>
                      <td>
                        {customer.last_payment_date ? (
                          <>
                            <div>{new Date(customer.last_payment_date).toLocaleDateString()}</div>
                            <small className="text-muted">{formatCurrency(customer.last_payment_amount)}</small>
                          </>
                        ) : (
                          <span className="text-muted">No payments</span>
                        )}
                      </td>
                      <td className="text-capitalize">{customer.recommended_action.replace(/_/g, ' ')}</td>
                    </tr>
                  );
                })}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center text-muted py-4">
                      No customers match the selected filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {hasCustomers && (
          <div className="card-footer bg-white border-top">
            <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-lg-between gap-3">
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted small">Rows per page</span>
                <select
                  className="form-select form-select-sm"
                  value={pageSizeValue}
                  onChange={(event) => handlePageSizeChange(Number(event.target.value))}
                >
                  {pageSizeOptions.map((sizeOption) => (
                    <option key={sizeOption} value={sizeOption}>
                      {sizeOption}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-muted small">
                {`Showing ${formatInteger(showingFrom)}-${formatInteger(showingTo)} of ${formatInteger(totalCustomers)}`}
              </div>

              <div className="d-flex align-items-center gap-1">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  aria-label="First page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {pageNumbers.map((value, index) =>
                  value === 'ellipsis' ? (
                    <span key={`ellipsis-${index}`} className="px-2 text-muted">
                      &hellip;
                    </span>
                  ) : (
                    <button
                      type="button"
                      key={value}
                      className={`btn btn-sm ${value === currentPage ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => handlePageChange(value)}
                      disabled={value === currentPage}
                    >
                      {value}
                    </button>
                  )
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  aria-label="Last page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {summary.over_80_percent > 0 && (
        <div className="alert alert-warning d-flex align-items-start gap-3" role="alert">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <h6 className="alert-heading mb-2">High Utilization Alert</h6>
            <p className="mb-0 small">
              {formatInteger(summary.over_80_percent)} customer{summary.over_80_percent === 1 ? '' : 's'} exceed the {utilizationThreshold}%
              utilization threshold. Review their credit terms and payment history.
            </p>
          </div>
        </div>
      )}
    </ReportContainer>
  );
};

export default CreditUtilizationPage;
