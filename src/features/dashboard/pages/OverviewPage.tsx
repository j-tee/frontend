import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector, usePermissions } from '../../../hooks/index.js'
import { loadActiveSubscription } from '../../../store/slices/subscriptionSlice.js'
import { selectAuthState } from '../../../store/slices/authSlice.js'
import { CAPABILITIES } from '../../../utils/permissions.js'

const OverviewPage = () => {
  const dispatch = useAppDispatch()
  const { business, user } = useAppSelector(selectAuthState)
  const { can } = usePermissions()

  const canManageLocations = can(CAPABILITIES.LOCATIONS_MANAGE)
  const canManageInventory = can(CAPABILITIES.INVENTORY_MANAGE)
  const canManageStaff = can(CAPABILITIES.EMPLOYEES_MANAGE)
  const showManagerQuickActions = canManageLocations || canManageInventory || canManageStaff

  useEffect(() => {
    void dispatch(loadActiveSubscription())
  }, [dispatch])

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="space-y-1">
          <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Workspace snapshot</p>
          <h2 className="text-2xl font-semibold text-slate-900">Welcome back{user ? `, ${user.name.split(' ')[0]}` : ''}</h2>
        </header>
        <p className="text-slate-600">
          Use the quick actions below to finish setting up your commerce footprint. Once your storefronts and
          warehouses are live, sales and inventory updates will flow automatically into this dashboard.
        </p>
        {business ? (
          <dl className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Business name</dt>
              <dd className="text-base font-medium text-slate-900">{business.name}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">TIN</dt>
              <dd className="text-base font-medium text-slate-900">{business.tin || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Primary email</dt>
              <dd className="text-base font-medium text-slate-900">{business.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Address</dt>
              <dd className="text-base font-medium text-slate-900">{business.address}</dd>
            </div>
          </dl>
        ) : null}
      </section>

      <section className={showManagerQuickActions ? 'grid gap-6 lg:grid-cols-2' : 'space-y-6'}>
        {showManagerQuickActions ? (
          <>
            <article className="flex h-full flex-col justify-between space-y-4 rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-white p-6 shadow-sm">
              <div className="space-y-3">
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase text-indigo-700">
                  Storefronts
                </span>
                <h3 className="text-xl font-semibold text-slate-900">Launch your first storefront</h3>
                <p className="text-sm text-slate-600">
                  Create a POS-ready storefront so sales teams can start transacting. You&apos;ll be able to add tills, staff
                  roles, and payment settings in minutes.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• Define opening hours and sales channels.</li>
                  <li>• Assign team members with the right permissions.</li>
                  <li>• Share the storefront with in-store or online crews.</li>
                </ul>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/app/sales" className="btn btn-primary rounded-pill px-4 py-2 text-white">
                  Create storefront
                </Link>
                <Link to="/app/customers" className="btn btn-outline-primary rounded-pill px-4 py-2">
                  View channel settings
                </Link>
              </div>
            </article>

            <article className="flex h-full flex-col justify-between space-y-4 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm">
              <div className="space-y-3">
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase text-emerald-700">
                  Warehouses
                </span>
                <h3 className="text-xl font-semibold text-slate-900">Organise your inventory hubs</h3>
                <p className="text-sm text-slate-600">
                  Set up stock locations to track inbound shipments, transfers, and fulfilment performance across your
                  supply chain.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• Name each warehouse and assign responsible managers.</li>
                  <li>• Configure reorder thresholds for critical products.</li>
                  <li>• Sync warehouse capacity with storefront availability.</li>
                </ul>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/app/inventory" className="btn btn-success rounded-pill px-4 py-2 text-white">
                  Create warehouse
                </Link>
                <Link to="/app/reports" className="btn btn-outline-success rounded-pill px-4 py-2">
                  Track stock health
                </Link>
              </div>
            </article>
          </>
        ) : (
          <>
            <article className="flex h-full flex-col justify-between space-y-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-white p-6 shadow-sm">
              <div className="space-y-3">
                <span className="inline-flex items-center rounded-full bg-slate-200/80 px-3 py-1 text-xs font-semibold uppercase text-slate-700">
                  Sales tools
                </span>
                <h3 className="text-xl font-semibold text-slate-900">Jump into your sales queue</h3>
                <p className="text-sm text-slate-600">
                  Access the POS workspace to ring up purchases, apply discounts, and send receipts without waiting on a
                  manager.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• Open the register and start a new sale.</li>
                  <li>• Lookup products and confirm available stock.</li>
                  <li>• Email or print receipts for your customers.</li>
                </ul>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/app/sales" className="btn btn-primary rounded-pill px-4 py-2 text-white">
                  Start new sale
                </Link>
                <Link to="/app/customers" className="btn btn-outline-primary rounded-pill px-4 py-2">
                  View customer list
                </Link>
              </div>
            </article>

            <article className="flex h-full flex-col justify-between space-y-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-amber-50 via-white to-white p-6 shadow-sm">
              <div className="space-y-3">
                <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase text-amber-700">
                  Shift prep
                </span>
                <h3 className="text-xl font-semibold text-slate-900">Stay in sync with your team</h3>
                <p className="text-sm text-slate-600">
                  Review the day&apos;s focus areas and make sure customer profiles are up to date so handoffs stay smooth.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• Check for notes or tasks left by your manager.</li>
                  <li>• Update customer preferences after each interaction.</li>
                  <li>• Flag any inventory gaps so supervisors can follow up.</li>
                </ul>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/app/customers" className="btn btn-outline-secondary rounded-pill px-4 py-2">
                  Review customer profiles
                </Link>
              </div>
            </article>
          </>
        )}
      </section>
    </div>
  )
}

export default OverviewPage
