import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tab, Nav, Accordion, Card } from 'react-bootstrap'
import { ExportStatisticsCard } from '../components/exports/ExportStatisticsCard'

const ReportsPage = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')

  const reportSections = [
    {
      title: 'Export Automation',
      description: 'Schedule and automate report exports',
      icon: '⚙️',
      path: '/app/reports/export-schedules',
      color: 'bg-blue-50 border-blue-200',
      features: [
        'Create scheduled exports',
        'Configure export formats',
        'Manage email notifications',
        'Trigger manual exports'
      ]
    },
    {
      title: 'Export History',
      description: 'View and download past exports',
      icon: '📋',
      path: '/app/reports/export-history',
      color: 'bg-green-50 border-green-200',
      features: [
        'Browse export history',
        'Download completed exports',
        'Filter by type and status',
        'Track export performance'
      ]
    }
  ]

  const analyticalReports = {
    sales: [
      {
        title: 'Sales Summary',
        description: 'Daily, weekly, and monthly sales overview',
        icon: '📊',
        path: '/app/reports/sales/summary',
        features: ['Total sales', 'Transactions', 'Peak hours', 'Comparisons']
      },
      {
        title: 'Product Performance',
        description: 'Top/bottom products by revenue and profit',
        icon: '📦',
        path: '/app/reports/sales/products',
        features: ['Revenue analysis', 'Profit margins', 'Sales trends', 'Category performance']
      },
      {
        title: 'Customer Analytics',
        description: 'Customer behavior and segmentation',
        icon: '👥',
        path: '/app/reports/sales/customers',
        features: ['Customer segments', 'Top customers', 'Retention', 'Purchase patterns']
      },
      {
        title: 'Revenue Trends',
        description: 'Revenue forecasting and patterns',
        icon: '📈',
        path: '/app/reports/sales/trends',
        features: ['Trend charts', 'Forecasting', 'Seasonal patterns', 'Payment methods']
      }
    ],
    inventory: [
      {
        title: 'Stock Levels',
        description: 'Current stock across all locations',
        icon: '📊',
        path: '/app/reports/inventory/stock-levels',
        features: ['Stock summary', 'Valuation', 'By location', 'Availability']
      },
      {
        title: 'Low Stock Alerts',
        description: 'Products below reorder point',
        icon: '⚠️',
        path: '/app/reports/inventory/low-stock',
        features: ['Critical items', 'Reorder suggestions', 'Lead times', 'Cost estimates']
      },
      {
        title: 'Stock Movements',
        description: 'All stock ins, outs, and adjustments',
        icon: '🔄',
        path: '/app/reports/inventory/movements',
        features: ['Movement history', 'Transfers', 'Adjustments', 'Audit trail']
      },
      {
        title: 'Warehouse Analytics',
        description: 'Performance metrics per warehouse',
        icon: '🏢',
        path: '/app/reports/inventory/warehouse',
        features: ['Turnover ratio', 'Dead stock', 'Top products', 'Utilization']
      }
    ],
    financial: [
      {
        title: 'Revenue & Profit',
        description: 'Detailed revenue and profit breakdown',
        icon: '💰',
        path: '/app/reports/financial/revenue-profit',
        features: ['Gross revenue', 'Profit margins', 'COGS', 'Operating expenses']
      },
      {
        title: 'AR Aging',
        description: 'Outstanding customer credit by age',
        icon: '📅',
        path: '/app/reports/financial/ar-aging',
        features: ['Aging buckets', 'Overdue accounts', 'Collection priority', 'Credit limits']
      },
      {
        title: 'Collection Rates',
        description: 'Payment collection efficiency',
        icon: '💳',
        path: '/app/reports/financial/collection-rates',
        features: ['Collection rate', 'Payment methods', 'Collection time', 'Delinquent accounts']
      },
      {
        title: 'Cash Flow',
        description: 'Cash inflows and outflows',
        icon: '💵',
        path: '/app/reports/financial/cash-flow',
        features: ['Cash balance', 'Inflows', 'Outflows', 'Forecasting']
      }
    ],
    customer: [
      {
        title: 'Top Customers',
        description: 'Highest value customers by revenue',
        icon: '⭐',
        path: '/app/reports/customer/top-customers',
        features: ['Revenue ranking', 'Purchase frequency', 'Lifetime value', 'Loyalty tiers']
      },
      {
        title: 'Purchase Patterns',
        description: 'Buying behavior and preferences',
        icon: '🛒',
        path: '/app/reports/customer/patterns',
        features: ['Behavior segments', 'Peak times', 'Product preferences', 'Channel preferences']
      },
      {
        title: 'Credit Utilization',
        description: 'Customer credit usage and risk',
        icon: '💳',
        path: '/app/reports/customer/credit',
        features: ['Credit utilization', 'Risk assessment', 'Payment history', 'Recommendations']
      },
      {
        title: 'Customer Segmentation',
        description: 'RFM analysis and grouping',
        icon: '📊',
        path: '/app/reports/customer/segmentation',
        features: ['RFM segments', 'Behavior patterns', 'Segment insights', 'Action recommendations']
      }
    ]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
        <h2 className="text-3xl font-bold text-slate-900">Reports Dashboard</h2>
        <p className="mt-2 text-base font-medium text-slate-700">
          Access comprehensive business intelligence and analytics
        </p>
      </div>

      {/* Tabbed Navigation */}
      <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'overview')}>
        <Card className="border-slate-300 shadow-sm">
          <Card.Header className="border-b border-slate-200 bg-white">
            <Nav variant="tabs" className="border-0">
              <Nav.Item>
                <Nav.Link 
                  eventKey="overview"
                  className="px-4 py-2 text-sm font-semibold"
                >
                  📊 Overview
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link 
                  eventKey="analytical"
                  className="px-4 py-2 text-sm font-semibold"
                >
                  📈 Analytical Reports
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link 
                  eventKey="automation"
                  className="px-4 py-2 text-sm font-semibold"
                >
                  ⚙️ Export Automation
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Card.Header>

          <Card.Body className="p-6">
            <Tab.Content>
              {/* Overview Tab */}
              <Tab.Pane eventKey="overview">
                <div className="space-y-6">
                  {/* Export Statistics */}
                  <div className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-xl font-bold text-slate-900">Export Statistics</h3>
                    <ExportStatisticsCard />
                  </div>

                  {/* Quick Access Grid */}
                  <div>
                    <h3 className="mb-4 text-xl font-bold text-slate-900">Quick Access</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <QuickAccessCard
                        title="Sales Reports"
                        icon="📊"
                        count={4}
                        color="bg-blue-50 border-blue-200"
                        onClick={() => setActiveTab('analytical')}
                      />
                      <QuickAccessCard
                        title="Inventory Reports"
                        icon="📦"
                        count={4}
                        color="bg-green-50 border-green-200"
                        onClick={() => setActiveTab('analytical')}
                      />
                      <QuickAccessCard
                        title="Financial Reports"
                        icon="💰"
                        count={4}
                        color="bg-purple-50 border-purple-200"
                        onClick={() => setActiveTab('analytical')}
                      />
                      <QuickAccessCard
                        title="Customer Reports"
                        icon="👥"
                        count={4}
                        color="bg-pink-50 border-pink-200"
                        onClick={() => setActiveTab('analytical')}
                      />
                      <QuickAccessCard
                        title="Export Automation"
                        icon="⚙️"
                        count={0}
                        color="bg-orange-50 border-orange-200"
                        onClick={() => setActiveTab('automation')}
                      />
                      <QuickAccessCard
                        title="Export History"
                        icon="📋"
                        count={0}
                        color="bg-emerald-50 border-emerald-200"
                        onClick={() => navigate('/app/reports/export-history')}
                      />
                    </div>
                  </div>

                  {/* Quick Tips */}
                  <div className="rounded-3xl border border-blue-300 bg-blue-50 p-6 shadow-sm">
                    <h3 className="mb-3 flex items-center gap-2 text-xl font-bold text-blue-900">
                      <span>💡</span>
                      Quick Tips
                    </h3>
                    <ul className="space-y-2 text-sm font-medium text-blue-900">
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5">•</span>
                        <span>Use <strong>Analytical Reports</strong> tab to access all 16 business reports</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5">•</span>
                        <span>Set up <strong>Export Automation</strong> to receive reports via email automatically</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5">•</span>
                        <span>All reports support <strong>CSV export</strong> for further analysis</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5">•</span>
                        <span>Use date filters to analyze specific time periods</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </Tab.Pane>

              {/* Analytical Reports Tab */}
              <Tab.Pane eventKey="analytical">
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-slate-900">Analytical Reports (16 Total)</h3>
                  <p className="text-sm font-medium text-slate-700 mb-4">
                    Expand each category to view available reports
                  </p>

                  <Accordion defaultActiveKey="0">
                    {/* Sales Reports */}
                    <Accordion.Item eventKey="0" className="mb-2 border border-slate-200 rounded-lg overflow-hidden">
                      <Accordion.Header className="bg-blue-50">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">📊</span>
                          <div>
                            <div className="font-bold text-slate-900">Sales Reports</div>
                            <div className="text-xs font-medium text-slate-600">
                              4 reports · Performance, trends, and customer analytics
                            </div>
                          </div>
                        </div>
                      </Accordion.Header>
                      <Accordion.Body className="p-4 bg-white">
                        <div className="grid gap-3 md:grid-cols-2">
                          {analyticalReports.sales.map((report) => (
                            <ReportCard key={report.title} report={report} navigate={navigate} />
                          ))}
                        </div>
                      </Accordion.Body>
                    </Accordion.Item>

                    {/* Inventory Reports */}
                    <Accordion.Item eventKey="1" className="mb-2 border border-slate-200 rounded-lg overflow-hidden">
                      <Accordion.Header className="bg-green-50">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">📦</span>
                          <div>
                            <div className="font-bold text-slate-900">Inventory Reports</div>
                            <div className="text-xs font-medium text-slate-600">
                              4 reports · Stock levels, alerts, and warehouse analytics
                            </div>
                          </div>
                        </div>
                      </Accordion.Header>
                      <Accordion.Body className="p-4 bg-white">
                        <div className="grid gap-3 md:grid-cols-2">
                          {analyticalReports.inventory.map((report) => (
                            <ReportCard key={report.title} report={report} navigate={navigate} />
                          ))}
                        </div>
                      </Accordion.Body>
                    </Accordion.Item>

                    {/* Financial Reports */}
                    <Accordion.Item eventKey="2" className="mb-2 border border-slate-200 rounded-lg overflow-hidden">
                      <Accordion.Header className="bg-purple-50">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">💰</span>
                          <div>
                            <div className="font-bold text-slate-900">Financial Reports</div>
                            <div className="text-xs font-medium text-slate-600">
                              4 reports · Revenue, AR aging, collections, and cash flow
                            </div>
                          </div>
                        </div>
                      </Accordion.Header>
                      <Accordion.Body className="p-4 bg-white">
                        <div className="grid gap-3 md:grid-cols-2">
                          {analyticalReports.financial.map((report) => (
                            <ReportCard key={report.title} report={report} navigate={navigate} />
                          ))}
                        </div>
                      </Accordion.Body>
                    </Accordion.Item>

                    {/* Customer Reports */}
                    <Accordion.Item eventKey="3" className="mb-2 border border-slate-200 rounded-lg overflow-hidden">
                      <Accordion.Header className="bg-pink-50">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">👥</span>
                          <div>
                            <div className="font-bold text-slate-900">Customer Reports</div>
                            <div className="text-xs font-medium text-slate-600">
                              4 reports · Top customers, patterns, credit, and segmentation
                            </div>
                          </div>
                        </div>
                      </Accordion.Header>
                      <Accordion.Body className="p-4 bg-white">
                        <div className="grid gap-3 md:grid-cols-2">
                          {analyticalReports.customer.map((report) => (
                            <ReportCard key={report.title} report={report} navigate={navigate} />
                          ))}
                        </div>
                      </Accordion.Body>
                    </Accordion.Item>
                  </Accordion>
                </div>
              </Tab.Pane>

              {/* Export Automation Tab */}
              <Tab.Pane eventKey="automation">
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-slate-900">Export Automation</h3>
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    {reportSections.map((section) => (
                      <div
                        key={section.title}
                        className={`cursor-pointer rounded-2xl border p-6 shadow-sm transition-all hover:shadow-md ${section.color}`}
                        onClick={() => navigate(section.path)}
                      >
                        <div className="mb-4 flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{section.icon}</span>
                            <div>
                              <h3 className="text-lg font-bold text-slate-900">{section.title}</h3>
                            </div>
                          </div>
                        </div>

                        <p className="mb-4 text-sm font-semibold text-slate-700">{section.description}</p>

                        <ul className="space-y-2">
                          {section.features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm font-medium text-slate-700">
                              <span className="mt-0.5 text-slate-500">•</span>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>

                        <button
                          className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(section.path)
                          }}
                        >
                          Open {section.title}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </Tab.Pane>
            </Tab.Content>
          </Card.Body>
        </Card>
      </Tab.Container>
    </div>
  )
}

// Quick Access Card Component
const QuickAccessCard = ({ 
  title, 
  icon, 
  count, 
  color, 
  onClick 
}: { 
  title: string
  icon: string
  count: number
  color: string
  onClick: () => void
}) => (
  <div
    className={`cursor-pointer rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${color}`}
    onClick={onClick}
  >
    <div className="flex items-center gap-3">
      <span className="text-3xl">{icon}</span>
      <div className="flex-1">
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
        <p className="text-xs font-medium text-slate-600">{count} reports</p>
      </div>
      <span className="text-slate-400">→</span>
    </div>
  </div>
)

// Report Card Component
const ReportCard = ({ 
  report, 
  navigate 
}: { 
  report: {
    title: string
    description: string
    icon: string
    path: string
    features: string[]
  }
  navigate: (path: string) => void
}) => (
  <div
    className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-slate-300"
    onClick={() => navigate(report.path)}
  >
    <div className="mb-3 flex items-start gap-3">
      <span className="text-2xl">{report.icon}</span>
      <div className="flex-1">
        <h4 className="text-sm font-bold text-slate-900">{report.title}</h4>
        <p className="text-xs font-medium text-slate-600 mt-1">{report.description}</p>
      </div>
    </div>
    <ul className="space-y-1.5 mb-3">
      {report.features.map((feature, index) => (
        <li key={index} className="flex items-start gap-1.5 text-xs font-medium text-slate-700">
          <span className="mt-0.5 text-slate-400">•</span>
          <span>{feature}</span>
        </li>
      ))}
    </ul>
    <button
      className="w-full rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
      onClick={(e) => {
        e.stopPropagation()
        navigate(report.path)
      }}
    >
      Open Report →
    </button>
  </div>
)

export default ReportsPage
