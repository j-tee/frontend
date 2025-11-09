import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, AlertTriangle, Activity, Warehouse } from 'lucide-react';
import { InventoryForecastWidget } from '../../ai/components/InventoryForecastWidget';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  features: string[];
  comingSoon?: boolean;
}

const InventoryReportsIndexPage: React.FC = () => {
  const navigate = useNavigate();

  const reports: ReportCard[] = [
    {
      id: 'stock-levels',
      title: 'Stock Levels Summary',
      description: 'Current inventory status across all locations',
      icon: <Package className="w-8 h-8 text-blue-600" />,
      path: '/app/reports/inventory/stock-levels',
      features: [
        'Real-time stock quantities',
        'Multi-location tracking',
        'Stock valuation',
        'Available vs Reserved'
      ],
      comingSoon: false
    },
    {
      id: 'low-stock',
      title: 'Low Stock Alerts',
      description: 'Products requiring immediate restocking',
      icon: <AlertTriangle className="w-8 h-8 text-amber-600" />,
      path: '/app/reports/inventory/low-stock-alerts',
      features: [
        'Critical & warning alerts',
        'Reorder point tracking',
        'Days until stockout',
        'Supplier information'
      ],
      comingSoon: false
    },
    {
      id: 'stock-movements',
      title: 'Stock Movement History',
      description: 'Track all inventory transactions',
      icon: <Activity className="w-8 h-8 text-green-600" />,
      path: '/app/reports/inventory/stock-movements',
      features: [
        'In/Out/Adjustments',
        'Transfer tracking',
        'Movement audit trail',
        'Reference linking'
      ],
      comingSoon: false
    },
    {
      id: 'warehouse-analytics',
      title: 'Warehouse Analytics',
      description: 'Performance metrics by location',
      icon: <Warehouse className="w-8 h-8 text-purple-600" />,
      path: '/app/reports/inventory/warehouse-analytics',
      features: [
        'Stock turnover ratio',
        'Dead stock detection',
        'Storage utilization',
        'Top/slow movers'
      ],
      comingSoon: false
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">📦 Inventory Reports</h2>
            <p className="mt-2 text-base font-medium text-slate-700">
              Stock management and warehouse analytics
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

      {/* AI Inventory Forecast Widget */}
      <InventoryForecastWidget forecastDays={30} />

      {/* Reports Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {reports.map((report) => (
          <div
            key={report.id}
            className={`cursor-pointer rounded-2xl border p-6 shadow-sm transition-all hover:shadow-md ${
              report.comingSoon
                ? 'border-gray-200 bg-gray-50 opacity-75'
                : 'border-blue-200 bg-blue-50'
            }`}
            onClick={() => !report.comingSoon && navigate(report.path)}
          >
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
        ))}
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <Package className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">
              Inventory Management Tools
            </h4>
            <p className="text-sm text-blue-800">
              These reports help you maintain optimal stock levels, prevent stockouts,
              and improve warehouse efficiency. All data is updated in real-time based
              on sales, purchases, and stock adjustments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryReportsIndexPage;
