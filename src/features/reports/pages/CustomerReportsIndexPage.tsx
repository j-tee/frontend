import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, TrendingUp, CreditCard, Target } from 'lucide-react';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  features: string[];
  comingSoon?: boolean;
}

const CustomerReportsIndexPage: React.FC = () => {
  const navigate = useNavigate();

  const reports: ReportCard[] = [
    {
      id: 'top-customers',
      title: 'Top Customers by Revenue',
      description: 'Highest value customers and spending patterns',
      icon: <TrendingUp className="w-8 h-8 text-blue-600" />,
      path: '/app/reports/customer/top-customers',
      features: [
        'Revenue rankings',
        'Purchase frequency',
        'Customer lifetime value',
        'Loyalty tier tracking'
      ],
      comingSoon: false
    },
    {
      id: 'purchase-patterns',
      title: 'Purchase Patterns',
      description: 'Customer behavior and buying preferences',
      icon: <Users className="w-8 h-8 text-green-600" />,
      path: '/app/reports/customer/purchase-patterns',
      features: [
        'Customer segmentation',
        'Peak purchase times',
        'Product preferences',
        'Channel preferences'
      ],
      comingSoon: false
    },
    {
      id: 'credit-utilization',
      title: 'Credit Utilization',
      description: 'Credit usage and risk assessment',
      icon: <CreditCard className="w-8 h-8 text-amber-600" />,
      path: '/app/reports/customer/credit-utilization',
      features: [
        'Credit usage tracking',
        'Risk level assessment',
        'Payment history',
        'Utilization alerts'
      ],
      comingSoon: false
    },
    {
      id: 'segmentation',
      title: 'Customer Segmentation',
      description: 'RFM analysis and behavioral grouping',
      icon: <Target className="w-8 h-8 text-purple-600" />,
      path: '/app/reports/customer/segmentation',
      features: [
        'RFM scoring (8 segments)',
        'Segment characteristics',
        'Recommended actions',
        'Growth insights'
      ],
      comingSoon: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/app/reports')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Customer Reports</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Understand customer behavior and maximize retention
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reports.map((report) => (
            <div
              key={report.id}
              className={`bg-white rounded-lg border-2 shadow-sm hover:shadow-md transition-all ${
                report.comingSoon
                  ? 'border-gray-200 opacity-75'
                  : 'border-gray-200 hover:border-blue-300 cursor-pointer'
              }`}
              onClick={() => !report.comingSoon && navigate(report.path)}
            >
              <div className="p-6">
                {/* Icon & Title */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {report.icon}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {report.title}
                      </h3>
                      {report.comingSoon && (
                        <span className="inline-block px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded-full mt-1">
                          Coming Soon
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4">{report.description}</p>

                {/* Features */}
                <div className="space-y-2">
                  {report.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center text-sm text-gray-700">
                      <span className="text-green-500 mr-2">✓</span>
                      {feature}
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                <button
                  className={`mt-4 w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    report.comingSoon
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                  disabled={report.comingSoon}
                >
                  {report.comingSoon ? 'Coming Soon' : 'Open Report'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <Users className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">
                Customer Intelligence
              </h4>
              <p className="text-sm text-blue-800">
                These reports help you understand customer behavior, identify high-value
                segments, manage credit risk, and develop targeted retention strategies.
                Use RFM segmentation to personalize marketing campaigns and improve
                customer lifetime value.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerReportsIndexPage;
