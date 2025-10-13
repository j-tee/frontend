import { useNavigate } from 'react-router-dom';

const FinancialReportsIndexPage = () => {
  const navigate = useNavigate();

  const financialReports = [
    {
      title: 'Revenue & Profit Analysis',
      description: 'Detailed revenue, costs, and profit breakdown',
      icon: '💰',
      path: '/app/reports/financial/revenue-profit',
      color: 'bg-green-50 border-green-200',
      features: [
        'Gross and net revenue',
        'Cost of goods sold (COGS)',
        'Profit margins analysis',
        'Operating expenses breakdown',
      ],
      comingSoon: false,
    },
    {
      title: 'Accounts Receivable Aging',
      description: 'Outstanding customer credit balances by age',
      icon: '📊',
      path: '/app/reports/financial/ar-aging',
      color: 'bg-blue-50 border-blue-200',
      features: [
        'Aging buckets (0-30, 31-60, 61-90, 90+ days)',
        'Customer credit utilization',
        'Payment history tracking',
        'Collection priority ranking',
      ],
      comingSoon: false,
    },
    {
      title: 'Collection Rates',
      description: 'Payment collection efficiency and trends',
      icon: '💳',
      path: '/app/reports/financial/collection-rates',
      color: 'bg-purple-50 border-purple-200',
      features: [
        'Collection rate percentages',
        'Average collection time',
        'Payment method breakdown',
        'Delinquent accounts tracking',
      ],
      comingSoon: false,
    },
    {
      title: 'Cash Flow Report',
      description: 'Cash inflows and outflows over time',
      icon: '💵',
      path: '/app/reports/financial/cash-flow',
      color: 'bg-yellow-50 border-yellow-200',
      features: [
        'Opening and closing balances',
        'Inflows by category',
        'Outflows by category',
        'Cash flow forecasting',
      ],
      comingSoon: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">💰 Financial Reports</h2>
            <p className="mt-2 text-base font-medium text-slate-700">
              Analyze revenue, profitability, cash flow, and accounts receivable
            </p>
          </div>
          <button
            onClick={() => navigate('/app/reports')}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
          >
            ← Back to Reports
          </button>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {financialReports.map((report) => (
          <div
            key={report.title}
            className={`cursor-pointer rounded-2xl border p-6 shadow-sm transition-all hover:shadow-md ${report.color} ${
              report.comingSoon ? 'opacity-75' : ''
            }`}
            onClick={() => !report.comingSoon && navigate(report.path)}
          >
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{report.icon}</span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{report.title}</h3>
                  {report.comingSoon && (
                    <span className="text-xs font-medium text-orange-600">Coming Soon</span>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="mb-4 text-sm font-semibold text-slate-700">{report.description}</p>

            {/* Features */}
            <ul className="space-y-2">
              {report.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm font-medium text-slate-700">
                  <span className="mt-0.5 text-slate-500">•</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {/* Action Button */}
            <button
              className={`mt-4 w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
                report.comingSoon
                  ? 'cursor-not-allowed bg-slate-400'
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!report.comingSoon) {
                  navigate(report.path);
                }
              }}
              disabled={report.comingSoon}
            >
              {report.comingSoon ? 'Coming Soon' : `Open ${report.title}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FinancialReportsIndexPage;
