import { useNavigate } from 'react-router-dom';

const SalesReportsIndexPage = () => {
  const navigate = useNavigate();

  const salesReports = [
    {
      title: 'Sales Summary',
      description: 'Daily, weekly, and monthly sales performance overview',
      icon: '📊',
      path: '/app/reports/sales/summary',
      color: 'bg-blue-50 border-blue-200',
      features: [
        'Total sales and transactions',
        'Average transaction value',
        'Period-over-period comparison',
        'Peak sales hours analysis',
      ],
    },
    {
      title: 'Product Performance',
      description: 'Top and bottom performing products by revenue and profit',
      icon: '📦',
      path: '/app/reports/sales/products',
      color: 'bg-green-50 border-green-200',
      features: [
        'Revenue by product',
        'Profit margins analysis',
        'Sales trends by product',
        'Category performance',
      ],
    },
    {
      title: 'Customer Analytics',
      description: 'Customer purchase behavior and segmentation',
      icon: '👥',
      path: '/app/reports/sales/customers',
      color: 'bg-purple-50 border-purple-200',
      features: [
        'Customer segments',
        'Top customers leaderboard',
        'Retention rate analysis',
        'Purchase frequency patterns',
      ],
    },
    {
      title: 'Revenue Trends',
      description: 'Revenue forecasting and trend analysis',
      icon: '📈',
      path: '/app/reports/sales/trends',
      color: 'bg-orange-50 border-orange-200',
      features: [
        'Revenue trend charts',
        'Forecasting predictions',
        'Seasonal patterns',
        'Payment method breakdown',
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">📊 Sales Reports</h2>
            <p className="mt-2 text-base font-medium text-slate-700">
              Analyze sales performance, product trends, and customer behavior
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
        {salesReports.map((report) => (
          <div
            key={report.title}
            className={`cursor-pointer rounded-2xl border p-6 shadow-sm transition-all hover:shadow-md ${report.color}`}
            onClick={() => navigate(report.path)}
          >
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{report.icon}</span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{report.title}</h3>
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
              className="mt-4 w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition bg-slate-900 hover:bg-slate-800"
              onClick={(e) => {
                e.stopPropagation();
                navigate(report.path);
              }}
            >
              {`Open ${report.title}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SalesReportsIndexPage;
