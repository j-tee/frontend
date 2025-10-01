import { Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage.tsx'
import LoginPage from './features/authentication/LoginPage.tsx'
import RegisterAccountPage from './features/authentication/RegisterAccountPage.tsx'
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

const App = () => {
  return (
    <Routes>
      <Route index element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterAccountPage />} />
  <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding/register-business" element={<RegisterBusinessPage />} />
        <Route element={<RequireBusiness />}>
          <Route path="/app" element={<DashboardLayout />}>
            <Route index element={<OverviewPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="bookkeeping" element={<BookkeepingPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<LandingPage />} />
    </Routes>
  )
}

export default App
