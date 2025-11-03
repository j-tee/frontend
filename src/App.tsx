import { Route, Routes, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import LandingPage from './pages/LandingPage.tsx'
import LoginPage from './features/authentication/LoginPage.tsx'
import RegisterAccountPage from './features/authentication/RegisterAccountPage.tsx'
import AcceptInvitePage from './features/authentication/AcceptInvitePage.tsx'
import VerifyEmailPage from './features/authentication/VerifyEmailPage.tsx'
import RegisterBusinessPage from './features/onboarding/RegisterBusinessPage.tsx'
import ProtectedRoute from './components/ProtectedRoute.js'
import RequireBusiness from './components/RequireBusiness.tsx'
import DashboardLayout from './features/dashboard/DashboardLayout.tsx'
import OverviewPage from './features/dashboard/pages/OverviewPage.tsx'
import InventoryPage from './features/dashboard/pages/InventoryPage.tsx'
import SalesPage from './features/dashboard/pages/SalesPage.tsx'
import BookkeepingPage from './features/dashboard/pages/BookkeepingPage.tsx'
import ReportsPage from './features/dashboard/pages/ReportsPage.tsx'
import BillingPage from './features/dashboard/pages/BillingPage.tsx'
import CustomersPage from './features/dashboard/pages/CustomersPage.tsx'
import SettingsPage from './features/dashboard/pages/SettingsPage.tsx'
import ManageStocksPage from './features/dashboard/pages/ManageStocksPage.tsx'
import StorefrontsPage from './features/dashboard/pages/StorefrontsPage.tsx'
import EmployeesPage from './features/dashboard/pages/EmployeesPage.tsx'
import ExportSchedulesPage from './features/dashboard/pages/ExportSchedulesPage.tsx'
import ExportHistoryPage from './features/dashboard/pages/ExportHistoryPage.tsx'
import SalesSummaryPage from './features/reports/pages/SalesSummaryPage.tsx'
import SalesReportsIndexPage from './features/reports/pages/SalesReportsIndexPage.tsx'
import ProductPerformancePage from './features/reports/pages/ProductPerformancePage.tsx'
import CustomerAnalyticsPage from './features/reports/pages/CustomerAnalyticsPage.tsx'
import RevenueTrendsPage from './features/reports/pages/RevenueTrendsPage.tsx'
import FinancialReportsIndexPage from './features/reports/pages/FinancialReportsIndexPage.tsx'
import RevenueProfitPage from './features/reports/pages/RevenueProfitPage.tsx'
import ARAgingPage from './features/reports/pages/ARAgingPage.tsx'
import CollectionRatesPage from './features/reports/pages/CollectionRatesPage.tsx'
import CashFlowPage from './features/reports/pages/CashFlowPage.tsx'
import InventoryReportsIndexPage from './features/reports/pages/InventoryReportsIndexPage.tsx'
import StockLevelsPage from './features/reports/pages/StockLevelsPage.tsx'
import LowStockAlertsPage from './features/reports/pages/LowStockAlertsPage.tsx'
import StockMovementsPage from './features/reports/pages/StockMovementsPage.tsx'
import WarehouseAnalyticsPage from './features/reports/pages/WarehouseAnalyticsPage.tsx'
import CustomerReportsIndexPage from './features/reports/pages/CustomerReportsIndexPage.tsx'
import TopCustomersPage from './features/reports/pages/TopCustomersPage.tsx'
import PurchasePatternsPage from './features/reports/pages/PurchasePatternsPage.tsx'
import CreditUtilizationPage from './features/reports/pages/CreditUtilizationPage.tsx'
import CustomerSegmentationPage from './features/reports/pages/CustomerSegmentationPage.tsx'
import RequirePermission from './components/RequirePermission.tsx'
import { CAPABILITIES } from './utils/permissions.ts'
import SubscriptionPortal from './features/subscriptions/pages/SubscriptionPortal.tsx'
import PaymentCallback from './features/subscriptions/pages/PaymentCallback.tsx'
import PaymentSuccess from './features/subscriptions/pages/PaymentSuccess.tsx'
import PaymentCancelled from './features/subscriptions/pages/PaymentCancelled.tsx'
import PlatformDashboard from './features/platform/pages/PlatformDashboard.tsx'
import AccountSettingsPage from './features/account/pages/AccountSettingsPage.tsx'

const App = () => {
  return (
    <>
      <Routes>
      <Route index element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterAccountPage />} />
  <Route path="/accept-invite" element={<AcceptInvitePage />} />
  <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding/register-business" element={<RegisterBusinessPage />} />
        <Route element={<RequireBusiness />}>
          <Route path="/app" element={<DashboardLayout />}>
            <Route
              index
              element={(
                <RequirePermission capability={CAPABILITIES.DASHBOARD_VIEW}>
                  <OverviewPage />
                </RequirePermission>
              )}
            />
            <Route
              path="inventory"
              element={(
                <RequirePermission capability={CAPABILITIES.INVENTORY_VIEW}>
                  <InventoryPage />
                </RequirePermission>
              )}
            />
            <Route
              path="inventory/stocks"
              element={(
                <RequirePermission capability={CAPABILITIES.INVENTORY_MANAGE}>
                  <ManageStocksPage />
                </RequirePermission>
              )}
            />
            <Route
              path="storefronts"
              element={(
                <RequirePermission capability={CAPABILITIES.LOCATIONS_MANAGE}>
                  <StorefrontsPage />
                </RequirePermission>
              )}
            />
            <Route
              path="employees"
              element={(
                <RequirePermission capability={CAPABILITIES.EMPLOYEES_VIEW}>
                  <EmployeesPage />
                </RequirePermission>
              )}
            />
            <Route
              path="sales"
              element={(
                <RequirePermission capability={CAPABILITIES.SALES_VIEW}>
                  <SalesPage />
                </RequirePermission>
              )}
            />
            <Route
              path="customers"
              element={(
                <RequirePermission capability={CAPABILITIES.CUSTOMERS_VIEW}>
                  <CustomersPage />
                </RequirePermission>
              )}
            />
            <Route
              path="bookkeeping"
              element={(
                <RequirePermission capability={CAPABILITIES.BOOKKEEPING_VIEW}>
                  <BookkeepingPage />
                </RequirePermission>
              )}
            />
            <Route
              path="reports"
              element={(
                <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
                  <ReportsPage />
                </RequirePermission>
              )}
            />
            <Route
              path="reports/export-schedules"
              element={(
                <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
                  <ExportSchedulesPage />
                </RequirePermission>
              )}
            />
            <Route
              path="reports/export-history"
              element={(
                <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
                  <ExportHistoryPage />
                </RequirePermission>
              )}
            />
            <Route
              path="reports/sales"
              element={(
                <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
                  <SalesReportsIndexPage />
                </RequirePermission>
              )}
            />
            <Route
              path="reports/sales/summary"
              element={(
                <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
                  <SalesSummaryPage />
                </RequirePermission>
              )}
            />
            <Route
              path="reports/sales/products"
              element={(
                <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
                  <ProductPerformancePage />
                </RequirePermission>
              )}
            />
            <Route
              path="reports/sales/customers"
              element={(
                <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
                  <CustomerAnalyticsPage />
                </RequirePermission>
              )}
            />
            <Route
              path="reports/sales/trends"
              element={(
                <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
                  <RevenueTrendsPage />
                </RequirePermission>
              )}
            />
            <Route
              path="reports/financial"
              element={(
                <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
                  <FinancialReportsIndexPage />
                </RequirePermission>
              )}
            />
            <Route
              path="reports/financial/revenue-profit"
              element={(
                <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
                  <RevenueProfitPage />
                </RequirePermission>
              )}
            />
            <Route
              path="reports/financial/ar-aging"
              element={(
                <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
                  <ARAgingPage />
                </RequirePermission>
              )}
            />
            <Route
              path="reports/financial/collection-rates"
              element={(
                <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
                  <CollectionRatesPage />
                </RequirePermission>
              )}
            />
            <Route
              path="reports/financial/cash-flow"
              element={(
                <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
                  <CashFlowPage />
                </RequirePermission>
              )}
            />
            <Route
              path="reports/inventory"
              element={(
                <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
                  <InventoryReportsIndexPage />
                </RequirePermission>
              )}
            />
            <Route
              path="reports/inventory/stock-levels"
              element={(
                <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
                  <StockLevelsPage />
                </RequirePermission>
              )}
            />
            <Route
              path="reports/inventory/low-stock-alerts"
              element={(
                <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
                  <LowStockAlertsPage />
                </RequirePermission>
              )}
            />
            {/* Redirect old URLs to new ones */}
            <Route
              path="reports/inventory/low-stock"
              element={<Navigate to="/app/reports/inventory/low-stock-alerts" replace />}
            />
            <Route
              path="reports/inventory/movements"
              element={<Navigate to="/app/reports/inventory/stock-movements" replace />}
            />
            <Route
              path="reports/inventory/warehouse"
              element={<Navigate to="/app/reports/inventory/warehouse-analytics" replace />}
            />
            <Route
              path="reports/inventory/stock-movements"
              element={(
                <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
                  <StockMovementsPage />
                </RequirePermission>
              )}
            />
            <Route
              path="reports/inventory/warehouse-analytics"
              element={(
                <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
                  <WarehouseAnalyticsPage />
                </RequirePermission>
              )}
            />
            <Route
              path="reports/customer"
              element={(
                <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
                  <CustomerReportsIndexPage />
                </RequirePermission>
              )}
            />
            <Route
              path="reports/customer/top-customers"
              element={(
                <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
                  <TopCustomersPage />
                </RequirePermission>
              )}
            />
            <Route
              path="reports/customer/purchase-patterns"
              element={(
                <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
                  <PurchasePatternsPage />
                </RequirePermission>
              )}
            />
            <Route
              path="reports/customer/credit-utilization"
              element={(
                <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
                  <CreditUtilizationPage />
                </RequirePermission>
              )}
            />
            <Route
              path="reports/customer/segmentation"
              element={(
                <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
                  <CustomerSegmentationPage />
                </RequirePermission>
              )}
            />
            <Route
              path="billing"
              element={(
                <RequirePermission capability={CAPABILITIES.BILLING_MANAGE}>
                  <BillingPage />
                </RequirePermission>
              )}
            />
            <Route
              path="settings"
              element={(
                <RequirePermission capability={CAPABILITIES.SETTINGS_MANAGE}>
                  <SettingsPage />
                </RequirePermission>
              )}
            />
            <Route path="subscription" element={<SubscriptionPortal />} />
            <Route path="subscription/payment/callback" element={<PaymentCallback />} />
            <Route path="subscription/payment/success" element={<PaymentSuccess />} />
            <Route path="subscription/payment/cancelled" element={<PaymentCancelled />} />
            {/* Account Settings Route */}
            <Route path="account" element={<AccountSettingsPage />} />
            {/* Platform Admin Route */}
            <Route path="platform" element={<PlatformDashboard />} />
          </Route>
        </Route>
      </Route>
      {/* Public routes for payment callbacks */}
      <Route path="/payment/callback" element={<PaymentCallback />} />
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/cancelled" element={<PaymentCancelled />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
      <ToastContainer position="top-right" autoClose={4000} newestOnTop pauseOnHover closeOnClick theme="light" />
    </>
  )
}

export default App
