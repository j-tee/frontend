import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import Alert from 'react-bootstrap/Alert'
import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'
import Dropdown from 'react-bootstrap/Dropdown'
import Form from 'react-bootstrap/Form'
import Offcanvas from 'react-bootstrap/Offcanvas'
import Spinner from 'react-bootstrap/Spinner'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import PageTransition from '../../components/PageTransition.tsx'
import { useAppDispatch, useAppSelector, usePermissions } from '../../hooks/index.js'
import { fetchCurrentUser, loadUserStorefronts, logout, selectAuthState } from '../../store/slices/authSlice.js'
import { selectActiveSubscription } from '../../store/slices/subscriptionSlice.js'
import {
  addStorefront,
  addWarehouse,
  loadLocations,
  selectActiveLocation,
  selectCreateStorefrontError,
  selectCreateStorefrontStatus,
  selectCreateWarehouseError,
  selectCreateWarehouseStatus,
  selectLocation,
  selectLocationError,
  selectLocationStatus,
  selectStorefronts,
  selectWarehouses,
  resetLocationCreationState,
} from '../../store/slices/locationSlice.js'
import type { StorefrontPayload, WarehousePayload } from '../../types/inventory.js'
import { CAPABILITIES, normalizeMembershipRole, type Capability } from '../../utils/permissions.js'
import { isPlatformAdmin } from '../../utils/platformPermissions.js'

type NavIconKey =
  | 'dashboard'
  | 'sales'
  | 'inventory'
  | 'customers'
  | 'employees'
  | 'reports'
  | 'bookkeeping'
  | 'billing'
  | 'settings'

interface SideNavLink {
  to: string
  label: string
  icon: NavIconKey
  end?: boolean
  requiredCapability?: Capability
  subLinks?: { to: string; label: string; requiredCapability?: Capability }[]
}

interface SideNavSection {
  title: string
  links: SideNavLink[]
}

const ICONS: Record<NavIconKey, ReactNode> = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.2" />
      <rect x="12.5" y="3.5" width="8" height="5.5" rx="1.2" />
      <rect x="3.5" y="13" width="5.5" height="8" rx="1.2" />
      <rect x="11" y="12.5" width="9.5" height="8.5" rx="1.2" />
    </svg>
  ),
  sales: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 18 9.5 12.5 13.5 16.5 20 10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 10h4v4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20h16" strokeLinecap="round" />
    </svg>
  ),
  inventory: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z" strokeLinejoin="round" />
      <path d="M4 7.5 12 12l8-4.5" strokeLinejoin="round" />
      <path d="M12 12v9" strokeLinecap="round" />
    </svg>
  ),
  customers: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="9" cy="9" r="3.5" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" strokeLinecap="round" />
      <circle cx="17.5" cy="9.5" r="2.5" />
      <path d="M16 17.5a4 4 0 0 1 5 3.5" strokeLinecap="round" />
    </svg>
  ),
  employees: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M7.5 13a4.5 4.5 0 1 1 9 0v.5a3.5 3.5 0 0 1-3.5 3.5h-2a3.5 3.5 0 0 1-3.5-3.5z" strokeLinejoin="round" />
      <path d="M4.5 20a4.5 4.5 0 0 1 4.5-4.5" strokeLinecap="round" />
      <path d="M19.5 20a4.5 4.5 0 0 0-4.5-4.5" strokeLinecap="round" />
      <circle cx="12" cy="7" r="3" />
    </svg>
  ),
  reports: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 20v-7" strokeLinecap="round" />
      <path d="M10 20V8" strokeLinecap="round" />
      <path d="M15 20V4" strokeLinecap="round" />
      <path d="M20 20v-5" strokeLinecap="round" />
    </svg>
  ),
  bookkeeping: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 4h11a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" strokeLinejoin="round" />
      <path d="M6 8h13" strokeLinecap="round" />
      <path d="M10 12h5" strokeLinecap="round" />
      <path d="M10 16h5" strokeLinecap="round" />
    </svg>
  ),
  billing: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3.5" y="6" width="17" height="12" rx="2" />
      <path d="M3.5 10h17" strokeLinecap="round" />
      <path d="M8 15h2" strokeLinecap="round" />
      <path d="M12 15h4" strokeLinecap="round" />
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
        strokeLinejoin="round"
      />
      <path
        d="m19.4 15 .9 1.6a1 1 0 0 1-.37 1.37l-1.1.64a1 1 0 0 1-1.37-.37l-.9-1.56a7.26 7.26 0 0 1-1.68.97l-.24 1.82a1 1 0 0 1-1 .87h-1.27a1 1 0 0 1-1-.87l-.24-1.82a7.26 7.26 0 0 1-1.68-.97l-.9 1.56a1 1 0 0 1-1.37.37l-1.1-.64a1 1 0 0 1-.37-1.37l.9-1.6a7.35 7.35 0 0 1 0-2l-.9-1.6a1 1 0 0 1 .37-1.37l1.1-.64a1 1 0 0 1 1.37.37l.9 1.56a7.26 7.26 0 0 1 1.68-.97l.24-1.82a1 1 0 0 1 1-.87h1.27a1 1 0 0 1 1 .87l.24 1.82a7.26 7.26 0 0 1 1.68.97l.9-1.56a1 1 0 0 1 1.37-.37l1.1.64a1 1 0 0 1 .37 1.37l-.9 1.6a7.35 7.35 0 0 1 0 2z"
        strokeLinejoin="round"
      />
    </svg>
  ),
}

const SIDE_NAV_SECTIONS: SideNavSection[] = [
  {
    title: 'Operations',
    links: [
      {
        label: 'Dashboard',
        to: '/app',
        icon: 'dashboard',
        end: true,
        requiredCapability: CAPABILITIES.DASHBOARD_VIEW,
      },
      {
        label: 'Sales',
        to: '/app/sales',
        icon: 'sales',
        requiredCapability: CAPABILITIES.SALES_VIEW,
      },
      {
        label: 'Inventory',
        to: '/app/inventory',
        icon: 'inventory',
        requiredCapability: CAPABILITIES.INVENTORY_VIEW,
      },
      {
        label: 'Customers',
        to: '/app/customers',
        icon: 'customers',
        requiredCapability: CAPABILITIES.CUSTOMERS_VIEW,
      },
      {
        label: 'Employees',
        to: '/app/employees',
        icon: 'employees',
        requiredCapability: CAPABILITIES.EMPLOYEES_VIEW,
      },
    ],
  },
  {
    title: 'Insights',
    links: [
      {
        label: 'Reports',
        to: '/app/reports',
        icon: 'reports',
        requiredCapability: CAPABILITIES.REPORTS_VIEW,
        subLinks: [
          {
            to: '/app/reports/export-schedules',
            label: 'Export Automation',
            requiredCapability: CAPABILITIES.REPORTS_VIEW,
          },
          {
            to: '/app/reports/export-history',
            label: 'Export History',
            requiredCapability: CAPABILITIES.REPORTS_VIEW,
          },
        ],
      },
      {
        label: 'Bookkeeping',
        to: '/app/bookkeeping',
        icon: 'bookkeeping',
        requiredCapability: CAPABILITIES.BOOKKEEPING_VIEW,
      },
    ],
  },
  {
    title: 'Administration',
    links: [
      {
        label: 'Billing',
        to: '/app/billing',
        icon: 'billing',
        requiredCapability: CAPABILITIES.BILLING_MANAGE,
      },
      {
        label: 'Settings',
        to: '/app/settings',
        icon: 'settings',
        requiredCapability: CAPABILITIES.SETTINGS_MANAGE,
      },
    ],
  },
]

const DashboardLayout = () => {
  const dispatch = useAppDispatch()
  const { user, business, employment } = useAppSelector(selectAuthState)
  const activeSubscription = useAppSelector(selectActiveSubscription)
  const { can } = usePermissions()
  const [showNavigation, setShowNavigation] = useState(false)
  const [showWorkspace, setShowWorkspace] = useState(false)
  const [showLocationSwitcher, setShowLocationSwitcher] = useState(false)
  const [locationMode, setLocationMode] = useState<'list' | 'storefront' | 'warehouse'>('list')
  const [storefrontName, setStorefrontName] = useState('')
  const [storefrontLocation, setStorefrontLocation] = useState('')
  const [warehouseName, setWarehouseName] = useState('')
  const [warehouseLocation, setWarehouseLocation] = useState('')
  const [storefrontValidationError, setStorefrontValidationError] = useState<string | null>(null)
  const [warehouseValidationError, setWarehouseValidationError] = useState<string | null>(null)
  const navigate = useNavigate()
  const storefronts = useAppSelector(selectStorefronts)
  const warehouses = useAppSelector(selectWarehouses)
  const locationStatus = useAppSelector(selectLocationStatus)
  const locationError = useAppSelector(selectLocationError)
  const activeLocation = useAppSelector(selectActiveLocation)
  const createStorefrontStatus = useAppSelector(selectCreateStorefrontStatus)
  const createStorefrontError = useAppSelector(selectCreateStorefrontError)
  const createWarehouseStatus = useAppSelector(selectCreateWarehouseStatus)
  const createWarehouseError = useAppSelector(selectCreateWarehouseError)
  const canManageSales = can(CAPABILITIES.SALES_MANAGE)
  const canManageInventory = can(CAPABILITIES.INVENTORY_MANAGE)
  const canManageStaff = can(CAPABILITIES.EMPLOYEES_MANAGE)
  const canManageLocations = can(CAPABILITIES.LOCATIONS_MANAGE)
  const hasQuickActions = canManageSales || canManageInventory || canManageLocations || canManageStaff

  useEffect(() => {
    if (!user) {
      void dispatch(fetchCurrentUser())
    }
  }, [dispatch, user])

  // Load user's accessible storefronts for multi-storefront filtering
  useEffect(() => {
    if (user) {
      void dispatch(loadUserStorefronts())
    }
  }, [dispatch, user])

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.debug('[locations] createStorefrontStatus', createStorefrontStatus, createStorefrontError)
      console.debug('[locations] createWarehouseStatus', createWarehouseStatus, createWarehouseError)
    }
  }, [createStorefrontStatus, createStorefrontError, createWarehouseStatus, createWarehouseError])

  useEffect(() => {
    if (locationStatus === 'idle' && user) {
      void dispatch(loadLocations())
    }
  }, [dispatch, locationStatus, user])

  useEffect(() => {
    if (!showLocationSwitcher) {
      setLocationMode('list')
      setStorefrontName('')
      setStorefrontLocation('')
      setWarehouseName('')
      setWarehouseLocation('')
      setStorefrontValidationError(null)
      setWarehouseValidationError(null)
      dispatch(resetLocationCreationState())
    }
  }, [dispatch, showLocationSwitcher])

  const isCreatingStorefront = createStorefrontStatus === 'loading'
  const isCreatingWarehouse = createWarehouseStatus === 'loading'

  const switchLocationMode = (mode: 'list' | 'storefront' | 'warehouse') => {
    setLocationMode(mode)
    if (mode === 'storefront') {
      setWarehouseValidationError(null)
      setStorefrontValidationError(null)
      setStorefrontName('')
      setStorefrontLocation('')
    } else if (mode === 'warehouse') {
      setStorefrontValidationError(null)
      setWarehouseValidationError(null)
      setWarehouseName('')
      setWarehouseLocation('')
    } else {
      setStorefrontValidationError(null)
      setWarehouseValidationError(null)
      setStorefrontName('')
      setStorefrontLocation('')
      setWarehouseName('')
      setWarehouseLocation('')
    }
  }

  const openLocationSwitcher = (mode: 'list' | 'storefront' | 'warehouse' = 'list') => {
    const nextMode = canManageLocations ? mode : 'list'
    switchLocationMode(nextMode)
    setShowLocationSwitcher(true)
  }

  const handleCreateStorefront = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canManageLocations) {
      setStorefrontValidationError('You do not have permission to create storefronts.')
      return
    }
    const trimmedName = storefrontName.trim()
    const trimmedLocation = storefrontLocation.trim()
    if (!trimmedName || !trimmedLocation) {
      setStorefrontValidationError('Name and location are required.')
      return
    }
    setStorefrontValidationError(null)
    try {
      const payload: StorefrontPayload = {
        name: trimmedName,
        location: trimmedLocation,
      }
      if (business?.id) {
        payload.business = business.id
      }
      if (business?.owner) {
        payload.manager = business.owner
      }
      await dispatch(addStorefront(payload)).unwrap()
      void dispatch(loadLocations({ storefrontPage: 1 }))
      setShowLocationSwitcher(false)
    } catch (error) {
      const message = typeof error === 'string' ? error : error instanceof Error ? error.message : null
      setStorefrontValidationError(message ?? 'Unable to create storefront. Please try again.')
    }
  }

  const handleCreateWarehouse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canManageLocations) {
      setWarehouseValidationError('You do not have permission to create warehouses.')
      return
    }
    const trimmedName = warehouseName.trim()
    const trimmedLocation = warehouseLocation.trim()
    if (!trimmedName || !trimmedLocation) {
      setWarehouseValidationError('Name and location are required.')
      return
    }
    setWarehouseValidationError(null)
    try {
      const payload: WarehousePayload = {
        name: trimmedName,
        location: trimmedLocation,
      }
      if (business?.id) {
        payload.business = business.id
      }
      if (business?.owner) {
        payload.manager = business.owner
      }
      await dispatch(addWarehouse(payload)).unwrap()
      setShowLocationSwitcher(false)
    } catch (error) {
      const message = typeof error === 'string' ? error : error instanceof Error ? error.message : null
      setWarehouseValidationError(message ?? 'Unable to create warehouse. Please try again.')
    }
  }

  const userInitials = useMemo(() => {
    const fullName = user?.name ?? ''
    if (!fullName) return 'You'
    const [first, second] = fullName.trim().split(' ')
    if (second) {
      return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase()
    }
    return first.slice(0, 2).toUpperCase()
  }, [user?.name])

  const formattedToday = useMemo(() => {
    const dateFormatter = new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    return dateFormatter.format(new Date())
  }, [])

  const hasLocations = storefronts.length > 0 || warehouses.length > 0

  const activeLocationSummary = useMemo(() => {
    if (!activeLocation) return null
    if (activeLocation.type === 'storefront') {
      const storefront = storefronts.find((item) => item.id === activeLocation.id)
      return storefront
        ? {
            type: 'storefront' as const,
            name: storefront.name,
            location: storefront.location,
          }
        : null
    }
    const warehouse = warehouses.find((item) => item.id === activeLocation.id)
    return warehouse
      ? {
          type: 'warehouse' as const,
          name: warehouse.name,
          location: warehouse.location,
        }
      : null
  }, [activeLocation, storefronts, warehouses])

  const membershipRole = useMemo(
    () => normalizeMembershipRole(employment?.role ?? user?.role, user?.account_type),
    [employment?.role, user?.role, user?.account_type],
  )

  const formatRoleLabel = (role?: string | null) => {
    if (!role) return null
    const normalized = role.trim()
    if (!normalized) return null
    return normalized
      .split('_')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
      .join(' ')
  }

  const businessRoleLabel = formatRoleLabel(membershipRole) ?? 'Staff'

  const platformRoleLabel = (() => {
    const platformRole = user?.platform_role?.trim().toUpperCase()
    if (!platformRole || platformRole === 'NONE') {
      return 'None'
    }
    return formatRoleLabel(platformRole) ?? 'None'
  })()

  // Use business subscription status (business-centric architecture)
  const subscriptionStatusLabel = business?.subscription_status ?? activeSubscription?.status ?? 'Inactive'
  const subscriptionVariant = (() => {
    const normalized = subscriptionStatusLabel.toLowerCase()
    if (normalized === 'active') return 'success'
    if (normalized === 'trial') return 'info'
    if (normalized === 'suspended') return 'warning'
    return 'danger'
  })()

  const handleSelectLocation = (
    type: 'storefront' | 'warehouse',
    id: string,
    options?: { navigateTo?: string },
  ) => {
    dispatch(selectLocation({ type, id }))
    setShowLocationSwitcher(false)
    if (options?.navigateTo) {
      navigate(options.navigateTo)
    }
  }

  const locationModeTitle = locationMode === 'storefront'
    ? 'Create storefront'
    : locationMode === 'warehouse'
      ? 'Create warehouse'
      : canManageLocations ? 'Manage locations' : 'Locations'

  const activeLocationTypeLabel = activeLocationSummary
    ? activeLocationSummary.type === 'storefront'
      ? 'Storefront'
      : 'Warehouse'
    : null

  const renderNavigation = (onNavigate?: () => void) => {
    const filteredSections = SIDE_NAV_SECTIONS
      .map((section) => ({
        ...section,
        links: section.links.filter((link) => !link.requiredCapability || can(link.requiredCapability)),
      }))
      .filter((section) => section.links.length > 0)

    const locationButtonTarget = hasLocations ? 'list' : 'storefront'
    const locationButtonMode = canManageLocations ? locationButtonTarget : 'list'
    const locationButtonLabel = hasLocations
      ? canManageLocations
        ? 'Manage locations'
        : 'View locations'
      : canManageLocations
        ? 'Add location'
        : 'View locations'

    return (
      <div className="flex flex-col gap-8">
        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4 text-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Active location</p>
          {activeLocationSummary ? (
            <div className="space-y-1">
              <p className="text-base font-semibold text-white">{activeLocationSummary.name}</p>
              <p className="text-xs text-slate-300">
                {activeLocationTypeLabel}
                {activeLocationSummary.location ? ` • ${activeLocationSummary.location}` : ''}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-300">
              {hasLocations
                ? 'Select a location to focus your workspace.'
                : canManageLocations
                  ? 'Create a storefront or warehouse to unlock your workspace.'
                  : 'Ask your administrator to create a storefront or warehouse for you.'}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline-light"
              className="rounded-pill px-3 py-2 text-sm"
              onClick={() => openLocationSwitcher(locationButtonMode)}
            >
              {locationButtonLabel}
            </Button>
          </div>
          {locationStatus === 'loading' ? (
            <div className="mt-2 text-xs text-slate-300">Loading locations…</div>
          ) : null}
          {locationError ? (
            <div className="mt-2 text-xs text-red-200">{locationError}</div>
          ) : null}
        </div>
        <div className="space-y-6">
          {filteredSections.map((section) => (
            <div key={section.title} className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {section.title}
              </p>
              <div className="flex flex-col gap-1.5">
                {section.links.map((link) => (
                  <div key={link.to}>
                    <NavLink
                      to={link.to}
                      end={link.end}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition ${
                          isActive
                            ? 'bg-white/15 text-white shadow-md shadow-indigo-500/10'
                            : 'text-slate-200 hover:bg-white/10 hover:text-white'
                        }`
                      }
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900/60">
                        {ICONS[link.icon]}
                      </span>
                      <span>{link.label}</span>
                    </NavLink>
                    {link.subLinks && link.subLinks.length > 0 && (
                      <div className="ml-12 mt-1 flex flex-col gap-1">
                        {link.subLinks.map((subLink) => (
                          <NavLink
                            key={subLink.to}
                            to={subLink.to}
                            onClick={onNavigate}
                            className={({ isActive }) =>
                              `flex items-center rounded-lg px-3 py-1.5 text-sm transition ${
                                isActive
                                  ? 'bg-white/10 text-white font-medium'
                                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
                              }`
                            }
                          >
                            <span className="mr-2 text-xs">•</span>
                            <span>{subLink.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {canManageLocations ? (
          <Button
            variant="primary"
            className="w-full rounded-pill px-4 py-2"
            onClick={() => openLocationSwitcher('storefront')}
          >
            {hasLocations ? 'New location' : 'Create your first location'}
          </Button>
        ) : null}
      </div>
    )
  }

  const renderWorkspace = () => (
    <div className="flex flex-col gap-6">
      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Locations</h2>
          <Button
            variant="outline-primary"
            className="rounded-pill px-3 py-2"
            onClick={() => openLocationSwitcher(
              canManageLocations ? (hasLocations ? 'list' : 'storefront') : 'list',
            )}
          >
            {hasLocations ? (canManageLocations ? 'Manage' : 'View') : canManageLocations ? 'Add location' : 'View locations'}
          </Button>
        </div>
        {locationStatus === 'loading' ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Spinner animation="border" size="sm" role="status" />
            <span>Loading locations…</span>
          </div>
        ) : null}
        {locationError ? (
          <Alert variant="danger" className="rounded-3xl border border-red-200 bg-red-50 text-red-700">
            {locationError}
          </Alert>
        ) : null}
        {hasLocations ? (
          <div className="space-y-3">
            {activeLocationSummary ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Focused workspace</p>
                <p className="text-base font-semibold text-slate-900">{activeLocationSummary.name}</p>
                <p className="text-sm text-slate-600">
                  {activeLocationTypeLabel}
                  {activeLocationSummary.location ? ` • ${activeLocationSummary.location}` : ''}
                </p>
              </div>
            ) : null}
            <div className="space-y-2 text-sm text-slate-600">
              {storefronts.slice(0, 2).map((storefront) => (
                <div key={storefront.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
                  <div>
                    <p className="mb-0 text-sm font-semibold text-slate-900">{storefront.name}</p>
                    <p className="mb-0 text-xs text-slate-500">Storefront</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    className="rounded-pill px-3 py-1"
                    onClick={() => handleSelectLocation('storefront', storefront.id)}
                  >
                    Focus
                  </Button>
                </div>
              ))}
              {warehouses.slice(0, 2).map((warehouse) => (
                <div key={warehouse.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
                  <div>
                    <p className="mb-0 text-sm font-semibold text-slate-900">{warehouse.name}</p>
                    <p className="mb-0 text-xs text-slate-500">Warehouse</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    className="rounded-pill px-3 py-1"
                    onClick={() => handleSelectLocation('warehouse', warehouse.id)}
                  >
                    Focus
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4 text-sm text-slate-600">
            {canManageLocations
              ? 'No storefronts or warehouses yet. Create one to unlock sales and inventory workflows.'
              : 'No storefronts or warehouses yet. Ask an administrator to create one so you can start working.'}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {canManageLocations ? (
            <>
              <Button
                variant="primary"
                className="rounded-pill px-3 py-2 text-white"
                onClick={() => openLocationSwitcher('storefront')}
              >
                New storefront
              </Button>
              <Button
                variant="outline-secondary"
                className="rounded-pill px-3 py-2"
                onClick={() => openLocationSwitcher('warehouse')}
              >
                New warehouse
              </Button>
            </>
          ) : null}
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Upgrade your toolkit</h2>
        <p className="mt-2 text-sm text-slate-600">
          Unlock advanced analytics, staff permissions, and omnichannel reporting with the POS Suite Growth plan.
        </p>
        <Button variant="outline-primary" className="mt-4 rounded-pill px-4">
          View plans
        </Button>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Today&apos;s tasks</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li>Restock low inventory SKUs</li>
          <li>Follow up with 3 loyalty members</li>
          <li>Publish weekend promotion</li>
        </ul>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Need help?</h2>
        <p className="mt-2 text-sm text-slate-600">
          Chat with support, browse release notes, or explore tips tailored to this page.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline-secondary" className="rounded-pill px-4">
            Live chat
          </Button>
          <Button variant="outline-secondary" className="rounded-pill px-4">
            Knowledge base
          </Button>
        </div>
      </section>
    </div>
  )

  const handleSignOut = () => {
    void dispatch(logout())
    setShowNavigation(false)
    setShowWorkspace(false)
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex w-full items-center gap-3 px-4 py-3 sm:px-6 lg:px-10 xl:px-12">
          <div className="flex flex-1 items-center gap-3">
            <Button
              variant="outline-secondary"
              className="rounded-2xl border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-sm lg:hidden"
              onClick={() => setShowNavigation(true)}
              aria-label="Open navigation"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            </Button>
            <span className="text-lg font-semibold text-brand-secondary">POS Suite</span>
            <div className="relative hidden flex-1 md:block">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-2-2" strokeLinecap="round" />
                </svg>
              </span>
              <Form.Control
                type="search"
                placeholder="Search customers, products, or orders"
                className="h-11 rounded-3xl border border-slate-200 bg-white pl-11 pr-4 text-sm shadow-none focus:border-brand-primary focus:ring-0"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasQuickActions ? (
              <div className="hidden items-center gap-2 md:flex">
                {canManageSales ? (
                  <Button variant="primary" className="rounded-pill px-4">
                    New sale
                  </Button>
                ) : null}
                {canManageInventory ? (
                  <Button
                    variant="outline-primary"
                    className="rounded-pill px-4"
                    onClick={() => navigate('/app/inventory#add-product')}
                  >
                    Add product
                  </Button>
                ) : null}
                {canManageInventory ? (
                  <Button
                    variant="outline-secondary"
                    className="rounded-pill px-4"
                    onClick={() => navigate('/app/inventory/stocks')}
                  >
                    Manage stocks
                  </Button>
                ) : null}
                {canManageLocations ? (
                  <Button
                    variant="outline-secondary"
                    className="rounded-pill px-4"
                    onClick={() => navigate('/app/storefronts')}
                  >
                    Manage store front
                  </Button>
                ) : null}
                {canManageStaff ? (
                  <Button
                    variant="outline-secondary"
                    className="rounded-pill px-4"
                    onClick={() => navigate('/app/employees')}
                  >
                    Manage staff
                  </Button>
                ) : null}
              </div>
            ) : null}
            <Button
              variant="light"
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-sm lg:hidden"
              onClick={() => setShowWorkspace(true)}
              aria-label="Open workspace panel"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 6h16" strokeLinecap="round" />
                <path d="M4 12h16" strokeLinecap="round" />
                <path d="M4 18h16" strokeLinecap="round" />
              </svg>
            </Button>
            <Button
              variant="light"
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-sm"
              aria-label="View notifications"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path
                  d="M18 16a3 3 0 0 0 .61-1.84V11a6.6 6.6 0 0 0-5-6.38V3a1.5 1.5 0 0 0-3 0v1.62a6.6 6.6 0 0 0-5 6.38v3.16A3 3 0 0 0 6 16z"
                  strokeLinejoin="round"
                />
                <path d="M13.73 20a2 2 0 0 1-3.46 0" strokeLinecap="round" />
              </svg>
            </Button>
            <Dropdown align="end">
              <Dropdown.Toggle 
                as="div"
                className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:flex cursor-pointer"
                style={{ cursor: 'pointer' }}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-secondary font-semibold text-white">
                  {userInitials}
                </span>
                <div className="min-w-[140px]">
                  <p className="mb-0 text-sm font-semibold leading-tight">{user?.name ?? 'Team member'}</p>
                  <p className="mb-0 text-xs text-slate-500">{business?.name ?? 'Loading business…'}</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Dropdown.Toggle>

              <Dropdown.Menu>
                <Dropdown.Item onClick={() => navigate('/app/account')}>
                  <i className="bi bi-person me-2"></i>
                  Account Settings
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleSignOut}>
                  <i className="bi bi-box-arrow-right me-2"></i>
                  Sign out
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            <Button
              variant="outline-primary"
              className="rounded-pill px-3 py-2 sm:hidden"
              onClick={handleSignOut}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

  <div className="flex w-full flex-1 gap-6 px-4 py-6 sm:px-6 lg:px-10 xl:px-12">
        <aside className="hidden w-64 flex-shrink-0 flex-col rounded-3xl bg-slate-900/95 px-5 py-6 text-slate-100 xl:flex">
          <div className="mb-6 text-sm font-semibold uppercase tracking-wide text-slate-400">Navigation</div>
          {renderNavigation()}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <header className="rounded-3xl border border-slate-200 bg-white/90 px-6 py-5 shadow-sm backdrop-blur-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-slate-900">{business?.name ?? 'Your business'}</h1>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-slate-700">
                  <span aria-live="polite">{`Business role: ${businessRoleLabel}`}</span>
                  <span aria-live="polite">{`Platform role: ${platformRoleLabel}`}</span>
                  <span aria-live="polite">{formattedToday}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge 
                  bg={subscriptionVariant} 
                  className="rounded-pill px-3 py-2 text-sm"
                  title={`Business Subscription: ${subscriptionStatusLabel}${activeSubscription?.plan?.name ? ` (${activeSubscription.plan.name})` : ''} - Click to manage`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate('/app/subscription')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate('/app/subscription')
                    }
                  }}
                >
                  {subscriptionStatusLabel}
                </Badge>
                
                {/* Platform Admin Access */}
                {user && isPlatformAdmin(user) && (
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="rounded-pill px-3 py-1"
                    onClick={() => navigate('/app/platform')}
                    title="Platform Management Dashboard"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                      <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinejoin="round" />
                      <path d="M2 17l10 5 10-5" strokeLinejoin="round" />
                      <path d="M2 12l10 5 10-5" strokeLinejoin="round" />
                    </svg>
                    Platform Admin
                  </Button>
                )}
              </div>
            </div>
          </header>
          <main
            id="main-content"
            className="min-h-0 flex-1 overflow-y-auto rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm"
            tabIndex={-1}
            aria-live="polite"
          >
            <div className="space-y-6">
              <PageTransition>
                <Outlet />
              </PageTransition>
            </div>
          </main>
        </div>
        <aside className="hidden w-[320px] flex-shrink-0 flex-col gap-6 xl:flex">
          {renderWorkspace()}
        </aside>
      </div>

      <footer className="border-t border-slate-200 bg-white/90 py-4">
        <div className="flex w-full flex-wrap items-center justify-center gap-4 px-4 text-sm text-slate-600 sm:px-6 lg:px-10 xl:px-12">
          <span>© 2025 POS Suite</span>
          <span aria-live="polite">Status: Online</span>
          <a href="#release-notes" className="text-brand-primary">
            Release notes
          </a>
          <a href="#help" className="text-brand-primary">
            Help &amp; Support
          </a>
        </div>
      </footer>

      <Button
        variant="primary"
        className="fixed bottom-6 right-6 h-[54px] w-[54px] rounded-full p-0 shadow-lg"
        aria-label="Open contextual help"
      >
        ?
      </Button>

      <Offcanvas show={showNavigation} onHide={() => setShowNavigation(false)} placement="start" className="w-full max-w-xs">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Navigation</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="bg-slate-900 text-slate-100">
          {renderNavigation(() => setShowNavigation(false))}
        </Offcanvas.Body>
      </Offcanvas>

      <Offcanvas show={showWorkspace} onHide={() => setShowWorkspace(false)} placement="end" className="w-full max-w-sm">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Workspace</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>{renderWorkspace()}</Offcanvas.Body>
      </Offcanvas>

      <Offcanvas
        show={showLocationSwitcher}
        onHide={() => setShowLocationSwitcher(false)}
        placement="end"
        className="w-full max-w-md"
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>{locationModeTitle}</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={locationMode === 'list' ? 'primary' : 'outline-primary'}
              className="rounded-pill px-3 py-2"
              onClick={() => switchLocationMode('list')}
            >
              Manage
            </Button>
            {canManageLocations ? (
              <>
                <Button
                  variant={locationMode === 'storefront' ? 'primary' : 'outline-primary'}
                  className="rounded-pill px-3 py-2"
                  onClick={() => switchLocationMode('storefront')}
                >
                  New storefront
                </Button>
                <Button
                  variant={locationMode === 'warehouse' ? 'primary' : 'outline-primary'}
                  className="rounded-pill px-3 py-2"
                  onClick={() => switchLocationMode('warehouse')}
                >
                  New warehouse
                </Button>
              </>
            ) : null}
          </div>

          {locationMode === 'list' ? (
            <div className="space-y-3">
              {locationStatus === 'loading' ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Spinner animation="border" size="sm" role="status" />
                  <span>Loading locations…</span>
                </div>
              ) : null}
              {locationError ? (
                <Alert variant="danger" className="rounded-3xl border border-red-200 bg-red-50 text-red-700">
                  {locationError}
                </Alert>
              ) : null}
              {hasLocations ? (
                <div className="space-y-3">
                  {storefronts.map((storefront) => (
                    <div key={storefront.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
                      <div>
                        <p className="mb-0 text-sm font-semibold text-slate-900">{storefront.name}</p>
                        <p className="mb-0 text-xs text-slate-500">Storefront</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          className="rounded-pill px-3 py-1"
                          onClick={() => handleSelectLocation('storefront', storefront.id)}
                        >
                          Focus
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          className="rounded-pill px-3 py-1"
                          onClick={() => handleSelectLocation('storefront', storefront.id, { navigateTo: '/app/sales' })}
                        >
                          Go to sales
                        </Button>
                      </div>
                    </div>
                  ))}
                  {warehouses.map((warehouse) => (
                    <div key={warehouse.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
                      <div>
                        <p className="mb-0 text-sm font-semibold text-slate-900">{warehouse.name}</p>
                        <p className="mb-0 text-xs text-slate-500">Warehouse</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          className="rounded-pill px-3 py-1"
                          onClick={() => handleSelectLocation('warehouse', warehouse.id)}
                        >
                          Focus
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          className="rounded-pill px-3 py-1"
                          onClick={() => handleSelectLocation('warehouse', warehouse.id, { navigateTo: '/app/inventory' })}
                        >
                          Go to inventory
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4 text-sm text-slate-600">
                    {canManageLocations
                      ? 'You don\'t have any locations yet. Create a storefront or warehouse to get started.'
                      : 'You don\'t have any locations yet. Ask your administrator to create a storefront or warehouse for you.'}
                  </div>
                  {canManageLocations ? (
                    <Button
                      variant="primary"
                      className="rounded-pill px-3 py-2 text-white"
                      onClick={() => switchLocationMode('storefront')}
                    >
                      Create your first location
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}

          {locationMode === 'storefront' && canManageLocations ? (
            <Form onSubmit={handleCreateStorefront} className="space-y-3">
              {storefrontValidationError ? (
                <Alert variant="warning" className="rounded-3xl border border-amber-200 bg-amber-50 text-amber-700">
                  {storefrontValidationError}
                </Alert>
              ) : null}
              {createStorefrontError ? (
                <Alert variant="danger" className="rounded-3xl border border-red-200 bg-red-50 text-red-700">
                  {createStorefrontError}
                </Alert>
              ) : null}
              <Form.Group controlId="createStorefrontName">
                <Form.Label>Storefront name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. Flagship Store"
                  value={storefrontName}
                  onChange={(event) => setStorefrontName(event.target.value)}
                  disabled={isCreatingStorefront}
                  autoFocus
                />
              </Form.Group>
              <Form.Group controlId="createStorefrontLocation">
                <Form.Label>Location</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. Main Street"
                  value={storefrontLocation}
                  onChange={(event) => setStorefrontLocation(event.target.value)}
                  disabled={isCreatingStorefront}
                />
              </Form.Group>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline-secondary"
                  className="rounded-pill px-3 py-2"
                  type="button"
                  onClick={() => switchLocationMode('list')}
                  disabled={isCreatingStorefront}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="rounded-pill px-3 py-2 text-white"
                  type="submit"
                  disabled={isCreatingStorefront}
                >
                  {isCreatingStorefront ? (
                    <span className="flex items-center gap-2">
                      <Spinner animation="border" size="sm" role="status" />
                      Creating…
                    </span>
                  ) : (
                    'Create storefront'
                  )}
                </Button>
              </div>
            </Form>
          ) : null}

          {locationMode === 'warehouse' && canManageLocations ? (
            <Form onSubmit={handleCreateWarehouse} className="space-y-3">
              {warehouseValidationError ? (
                <Alert variant="warning" className="rounded-3xl border border-amber-200 bg-amber-50 text-amber-700">
                  {warehouseValidationError}
                </Alert>
              ) : null}
              {createWarehouseError ? (
                <Alert variant="danger" className="rounded-3xl border border-red-200 bg-red-50 text-red-700">
                  {createWarehouseError}
                </Alert>
              ) : null}
              <Form.Group controlId="createWarehouseName">
                <Form.Label>Warehouse name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. Primary Warehouse"
                  value={warehouseName}
                  onChange={(event) => setWarehouseName(event.target.value)}
                  disabled={isCreatingWarehouse}
                  autoFocus
                />
              </Form.Group>
              <Form.Group controlId="createWarehouseLocation">
                <Form.Label>Location</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. Industrial Estate"
                  value={warehouseLocation}
                  onChange={(event) => setWarehouseLocation(event.target.value)}
                  disabled={isCreatingWarehouse}
                />
              </Form.Group>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline-secondary"
                  className="rounded-pill px-3 py-2"
                  type="button"
                  onClick={() => switchLocationMode('list')}
                  disabled={isCreatingWarehouse}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="rounded-pill px-3 py-2 text-white"
                  type="submit"
                  disabled={isCreatingWarehouse}
                >
                  {isCreatingWarehouse ? (
                    <span className="flex items-center gap-2">
                      <Spinner animation="border" size="sm" role="status" />
                      Creating…
                    </span>
                  ) : (
                    'Create warehouse'
                  )}
                </Button>
              </div>
            </Form>
          ) : null}
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  )
}

export default DashboardLayout
