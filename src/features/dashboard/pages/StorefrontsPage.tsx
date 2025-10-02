import { useEffect, useMemo } from 'react'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Spinner from 'react-bootstrap/Spinner'
import { useNavigate } from 'react-router-dom'
import StorefrontList from '../components/storefronts/StorefrontList'
import StorefrontInsights from '../components/storefronts/StorefrontInsights'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import {
  loadLocations,
  selectLocation,
  selectActiveLocation,
  selectLocationError,
  selectLocationStatus,
  selectStorefronts,
  selectStorefrontPagination,
  selectWarehouses,
} from '../../../store/slices/locationSlice'
import type { Storefront } from '../../../types/inventory'

const StorefrontsPage = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const storefronts = useAppSelector(selectStorefronts)
  const pagination = useAppSelector(selectStorefrontPagination)
  const warehouses = useAppSelector(selectWarehouses)
  const status = useAppSelector(selectLocationStatus)
  const error = useAppSelector(selectLocationError)
  const activeLocation = useAppSelector(selectActiveLocation)

  useEffect(() => {
    if (status === 'idle') {
      void dispatch(loadLocations({ storefrontPage: pagination.page }))
    }
  }, [dispatch, pagination.page, status])

  const activeStorefront: Storefront | null = useMemo(() => {
    if (storefronts.length === 0) return null
    if (activeLocation?.type === 'storefront') {
      const match = storefronts.find((item) => item.id === activeLocation.id)
      if (match) {
        return match
      }
    }
    return storefronts[0]
  }, [activeLocation, storefronts])

  useEffect(() => {
    if (storefronts.length === 0 || !activeStorefront) return

    if (activeLocation?.type !== 'storefront' || activeLocation.id !== activeStorefront.id) {
      dispatch(selectLocation({ type: 'storefront', id: activeStorefront.id }))
    }
  }, [activeStorefront, activeLocation, dispatch, storefronts])

  const handleSelectStorefront = (storefrontId: string) => {
    dispatch(selectLocation({ type: 'storefront', id: storefrontId }))
  }

  const isLoading = status === 'loading'
  const currentPage = pagination.page
  const totalPages = Math.max(1, Math.ceil(pagination.count / pagination.pageSize))
  const canGoPrev = Boolean(pagination.previous) && currentPage > 1
  const canGoNext = Boolean(pagination.next)

  const handleChangePage = (page: number) => {
    if (page < 1 || page === currentPage || isLoading) return
    void dispatch(loadLocations({ storefrontPage: page }))
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Storefront control center</h2>
            <p className="text-slate-600">
              Monitor inventory, transfers, staffing, and sales for each storefront. Select a location to drill into the
              latest numbers and operational activity.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline-secondary" className="rounded-pill px-4" onClick={() => navigate('/app/inventory/stocks')}>
              Open manage stocks
            </Button>
            <Button variant="primary" className="rounded-pill px-4" onClick={() => navigate('/app/inventory')}>
              Go to locations
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
          <div>
            Total storefronts: <span className="font-semibold text-slate-900">{pagination.count}</span>
          </div>
          <div>
            Warehouses available: <span className="font-semibold text-slate-900">{warehouses.length}</span>
          </div>
        </div>
      </section>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Spinner animation="border" size="sm" role="status" aria-hidden />
          Loading storefronts…
        </div>
      ) : null}

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Storefronts</h3>
            <p className="text-sm text-slate-600">Choose a storefront to explore inventory, sales, and staffing.</p>
          </div>
        </div>
        <StorefrontList
          storefronts={storefronts}
          activeStorefrontId={activeStorefront?.id}
          isLoading={isLoading}
          onSelect={handleSelectStorefront}
        />
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">
            Page <span className="font-semibold text-slate-900">{currentPage}</span> of{' '}
            <span className="font-semibold text-slate-900">{totalPages}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline-secondary"
              className="rounded-pill px-3"
              disabled={!canGoPrev || isLoading}
              onClick={() => handleChangePage(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline-secondary"
              className="rounded-pill px-3"
              disabled={!canGoNext || isLoading}
              onClick={() => handleChangePage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Operational snapshot</h3>
            <p className="text-sm text-slate-600">
              A consolidated view of storefront facts, inventory status, and upcoming integrations.
            </p>
          </div>
        </div>
        <StorefrontInsights storefront={activeStorefront} isLoading={isLoading} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Transfer timeline (coming soon)</h3>
          <p className="text-sm text-slate-600">
            This timeline will highlight inbound/outbound transfers, approval states, and discrepancies for the selected
            storefront.
          </p>
          <ul className="space-y-2 text-sm text-slate-500">
            <li>• Most recent transfer</li>
            <li>• Transfers awaiting approval</li>
            <li>• Exceptions or shortages</li>
          </ul>
        </div>
        <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Sales pulse (coming soon)</h3>
          <p className="text-sm text-slate-600">
            Daily sales, top-performing items, and staff performance metrics will surface here once analytics endpoints
            are wired up.
          </p>
          <ul className="space-y-2 text-sm text-slate-500">
            <li>• Daily gross sales</li>
            <li>• Units sold vs. on-hand</li>
            <li>• Average order value</li>
          </ul>
        </div>
      </section>
    </div>
  )
}

export default StorefrontsPage
