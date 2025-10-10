import { Route, Routes } from 'react-router-dom'
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
import RequirePermission from './components/RequirePermission.tsx'
import { CAPABILITIES } from './utils/permissions.ts'

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
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<LandingPage />} />
    </Routes>
      <ToastContainer position="top-right" autoClose={4000} newestOnTop pauseOnHover closeOnClick theme="light" />
    </>
  )
}

export default App
