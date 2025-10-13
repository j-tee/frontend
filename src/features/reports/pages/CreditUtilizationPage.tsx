import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { ReportStates } from '../components/ReportStates';
import { customerReportsService } from '../../../services/reportsService';
import type { CreditUtilizationResponse, CreditCustomer } from '../../../types/reports';

const CreditUtilizationPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<CreditUtilizationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Filters
  const [utilizationThreshold] = useState(80);
  const [sortBy] = useState<'' | 'utilization' | 'amount' | 'risk'>('utilization');

  useEffect(() => {
    loadData();
  }, [utilizationThreshold, sortBy]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await customerReportsService.getCreditUtilization({
        utilization_threshold: utilizationThreshold,
        sort_by: sortBy || 'utilization'
      });
      setData(result);
    } catch (err) {
      setError((err as Error).message || 'Failed to load credit utilization data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      await customerReportsService.exportCreditUtilizationCSV({
        utilization_threshold: utilizationThreshold,
        sort_by: sortBy || 'utilization'
      });
    } catch (err) {
      alert('Export failed: ' + (err as Error).message);
    }
  };

  const getRiskColor = (risk: string): string => {
    const colors: Record<string, string> = {
      high: 'text-red-700 bg-red-100',
      medium: 'text-amber-700 bg-amber-100',
      low: 'text-green-700 bg-green-100'
    };
    return colors[risk] || 'text-gray-700 bg-gray-100';
  };

  const getRiskIcon = (risk: string) => {
    if (risk === 'high') return <XCircle className="w-4 h-4" />;
    if (risk === 'medium') return <AlertTriangle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const getUtilizationColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-amber-600';
    return 'text-green-600';
  };

  if (loading && !data) return <ReportStates.Loading />;
  if (error) return <ReportStates.Error error={error} onRetry={loadData} />;
  if (!data) return <ReportStates.Empty message="No credit utilization data available" />;

  return (
    <ReportContainer
      title="Credit Limit Utilization"
      subtitle="Monitor credit usage and assess customer risk"
      icon="💳"
      actions={
        <>
          <button
            onClick={() => navigate('/app/reports/customer')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <button
            onClick={loadData}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </>
      }
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <SummaryCard
          title="Customers with Credit"
          value={data.data.summary.total_customers_with_credit.toLocaleString()}
        />
        <SummaryCard
          title="Total Credit Extended"
          value={`₦${data.data.summary.total_credit_extended.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        />
        <SummaryCard
          title="Credit Used"
          value={`₦${data.data.summary.total_credit_used.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`${data.data.summary.average_utilization.toFixed(1)}% avg`}
        />
        <SummaryCard
          title="High Risk"
          value={data.data.summary.credit_risk_high.toLocaleString()}
          subtitle={`${data.data.summary.at_limit} at limit`}
        />
      </div>

      {/* Risk Distribution */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                <span className="text-sm font-medium text-green-900">Low Risk</span>
                {data.data.risk_distribution.low}
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded">
                <span className="text-sm font-medium text-yellow-900">Medium Risk</span>
                {data.data.risk_distribution.medium}
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded">
                <span className="text-sm font-medium text-red-900">High Risk</span>
                {data.data.risk_distribution.high}
              </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Credit Customers ({data.data.customers.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credit Limit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Used
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Available
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days Overdue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.data.customers.map((customer: CreditCustomer) => (
                <tr key={customer.customer_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {customer.customer_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      Score: {customer.payment_history_score}/100
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">
                      ₦{customer.credit_limit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      ₦{customer.credit_used.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">
                      ₦{customer.credit_available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className={`text-sm font-bold ${getUtilizationColor(customer.utilization_percentage)}`}>
                      {customer.utilization_percentage.toFixed(1)}%
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        className={`h-1.5 rounded-full ${
                          customer.utilization_percentage >= 90
                            ? 'bg-red-600'
                            : customer.utilization_percentage >= 75
                            ? 'bg-amber-600'
                            : 'bg-green-600'
                        }`}
                        style={{ width: `${Math.min(customer.utilization_percentage, 100)}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full inline-flex items-center space-x-1 ${getRiskColor(customer.risk_level)}`}>
                      {getRiskIcon(customer.risk_level)}
                      <span>{customer.risk_level}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {customer.days_overdue > 0 ? (
                      <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                        {customer.days_overdue} days
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {customer.last_payment_date ? (
                      <div>
                        <div className="text-sm text-gray-900">
                          {new Date(customer.last_payment_date).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          ₦{customer.last_payment_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">No payments</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs text-gray-600">
                      {customer.recommended_action.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alert Box */}
      {data.data.summary.over_80_percent > 0 && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900 mb-1">High Utilization Alert</h4>
              <p className="text-sm text-amber-800">
                {data.data.summary.over_80_percent} customer{data.data.summary.over_80_percent > 1 ? 's are' : ' is'} using over 80% of their credit limit.
                Consider reviewing credit terms or monitoring payment behavior closely.
              </p>
            </div>
          </div>
        </div>
      )}
    </ReportContainer>
  );
};

export default CreditUtilizationPage;
