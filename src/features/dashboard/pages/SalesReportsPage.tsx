import { useState } from 'react'
import { Button, Card, Tab, Tabs } from 'react-bootstrap'

const SalesReportsPage = () => {
  const [activeTab, setActiveTab] = useState('summary')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">📊 Sales Reports</h2>
            <p className="mt-2 text-base font-medium text-slate-700">
              Analyze sales performance, product rankings, and revenue trends
            </p>
          </div>
          <Button variant="primary" size="lg">
            <i className="bi bi-download me-2"></i>
            Export Report
          </Button>
        </div>
      </div>

      {/* Tabs for different reports */}
      <Card>
        <Card.Header className="bg-white">
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k || 'summary')}
            className="border-0"
          >
            <Tab eventKey="summary" title="Sales Summary" />
            <Tab eventKey="products" title="Product Performance" />
            <Tab eventKey="customer-analytics" title="Customer Analytics" />
            <Tab eventKey="revenue-trends" title="Revenue Trends" />
          </Tabs>
        </Card.Header>

        <Card.Body>
          {/* Sales Summary */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <h4 className="text-xl font-bold text-slate-900">Sales Summary</h4>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
                <div className="flex items-center gap-3">
                  <i className="bi bi-info-circle text-3xl text-blue-600"></i>
                  <div>
                    <h5 className="mb-2 font-bold text-blue-900">Backend Integration in Progress</h5>
                    <p className="mb-0 text-sm text-blue-800">
                      This report will display daily, weekly, and monthly sales aggregates with period comparisons,
                      top selling hours, and growth metrics.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-medium text-slate-600">Total Sales</p>
                  <p className="text-2xl font-bold text-slate-900">Coming Soon</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-medium text-slate-600">Transactions</p>
                  <p className="text-2xl font-bold text-slate-900">Coming Soon</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-medium text-slate-600">Avg Order Value</p>
                  <p className="text-2xl font-bold text-slate-900">Coming Soon</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-medium text-slate-600">Growth Rate</p>
                  <p className="text-2xl font-bold text-slate-900">Coming Soon</p>
                </div>
              </div>
            </div>
          )}

          {/* Product Performance */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <h4 className="text-xl font-bold text-slate-900">Product Performance</h4>
              <div className="rounded-2xl border border-purple-200 bg-purple-50 p-6">
                <div className="flex items-center gap-3">
                  <i className="bi bi-box-seam text-3xl text-purple-600"></i>
                  <div>
                    <h5 className="mb-2 font-bold text-purple-900">Product Rankings Ready</h5>
                    <p className="mb-0 text-sm text-purple-800">
                      View top/bottom performing products by revenue, quantity sold, and profit margins.
                      Track trends and identify bestsellers.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Customer Analytics */}
          {activeTab === 'customer-analytics' && (
            <div className="space-y-4">
              <h4 className="text-xl font-bold text-slate-900">Customer Analytics</h4>
              <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
                <div className="flex items-center gap-3">
                  <i className="bi bi-people text-3xl text-green-600"></i>
                  <div>
                    <h5 className="mb-2 font-bold text-green-900">Customer Insights</h5>
                    <p className="mb-0 text-sm text-green-800">
                      Analyze customer purchase behavior, segmentation (new/returning/VIP), retention rates,
                      and lifetime value estimates.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Revenue Trends */}
          {activeTab === 'revenue-trends' && (
            <div className="space-y-4">
              <h4 className="text-xl font-bold text-slate-900">Revenue Trends</h4>
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
                <div className="flex items-center gap-3">
                  <i className="bi bi-graph-up-arrow text-3xl text-indigo-600"></i>
                  <div>
                    <h5 className="mb-2 font-bold text-indigo-900">Trend Analysis & Forecasting</h5>
                    <p className="mb-0 text-sm text-indigo-800">
                      Track revenue trends over time with forecasting, pattern analysis (peak hours/days),
                      and payment method breakdowns.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* API Integration Note */}
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <i className="bi bi-exclamation-triangle text-2xl text-amber-600"></i>
              <div>
                <h6 className="mb-2 font-bold text-amber-900">Backend Integration Required</h6>
                <p className="mb-2 text-sm text-amber-800">
                  The backend APIs for Sales Reports are now available at:
                </p>
                <ul className="mb-0 list-disc pl-5 text-sm text-amber-800">
                  <li><code className="rounded bg-amber-100 px-1">GET /reports/api/sales/summary</code></li>
                  <li><code className="rounded bg-amber-100 px-1">GET /reports/api/sales/products</code></li>
                  <li><code className="rounded bg-amber-100 px-1">GET /reports/api/sales/customer-analytics</code></li>
                  <li><code className="rounded bg-amber-100 px-1">GET /reports/api/sales/revenue-trends</code></li>
                </ul>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>
    </div>
  )
}

export default SalesReportsPage
