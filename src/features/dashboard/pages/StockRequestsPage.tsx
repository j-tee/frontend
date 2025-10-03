import { useEffect, useMemo } from 'react'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import ButtonGroup from 'react-bootstrap/ButtonGroup'
import { useSearchParams } from 'react-router-dom'
import { usePermissions } from '../../../hooks/index.js'
import { CAPABILITIES } from '../../../utils/permissions.js'
import TransferRequestsPage from './TransferRequestsPage.js'
import TransfersPage from './TransfersPage.js'

type StockRequestView = 'requests' | 'fulfillment'

const VIEW_PARAM = 'view'

interface StockRequestsPageProps {
  defaultView?: StockRequestView
}

const StockRequestsPage = ({ defaultView = 'requests' }: StockRequestsPageProps) => {
  const { can } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()

  const canRaiseRequests = useMemo(
    () => can(CAPABILITIES.INVENTORY_REQUESTS_CREATE) || can(CAPABILITIES.INVENTORY_REQUESTS_MANAGE),
    [can],
  )
  const canManageFulfillment = useMemo(
    () => can(CAPABILITIES.INVENTORY_MANAGE) || can(CAPABILITIES.INVENTORY_TRANSFERS_CONFIRM),
    [can],
  )

  const allowedViews = useMemo<StockRequestView[]>(() => {
    const views: StockRequestView[] = []
    if (canRaiseRequests) views.push('requests')
    if (canManageFulfillment) views.push('fulfillment')
    return views
  }, [canManageFulfillment, canRaiseRequests])

  const queryView = searchParams.get(VIEW_PARAM)
  let activeView: StockRequestView = queryView === 'fulfillment' ? 'fulfillment' : 'requests'
  if (!allowedViews.includes(activeView)) {
    activeView = allowedViews[0] ?? defaultView
  }

  useEffect(() => {
    if (!allowedViews.includes(activeView)) {
      return
    }
    const currentView = searchParams.get(VIEW_PARAM)
    if (currentView !== activeView) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.set(VIEW_PARAM, activeView)
      setSearchParams(nextParams, { replace: true })
    }
  }, [activeView, allowedViews, searchParams, setSearchParams])

  const handleSwitch = (next: StockRequestView) => {
    if (next === activeView) return
    if (!allowedViews.includes(next)) return
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set(VIEW_PARAM, next)
    setSearchParams(nextParams, { replace: true })
  }

  if (allowedViews.length === 0) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center bg-slate-50 px-4 py-12">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-secondary/10 text-brand-secondary">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 8v4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 16h.01" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Access restricted</h1>
          <p className="mt-3 text-sm text-slate-600">
            You don&apos;t have permission to view stock requests yet. Ask an administrator to adjust your role or switch to a different page.
          </p>
        </div>
      </main>
    )
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900">Stock requests</h2>
          <p className="text-slate-600">
            Collect storefront demand and manage fulfillment in one workspace. Switch views to focus on intake or pipeline tasks.
          </p>
        </div>
        {allowedViews.length > 1 ? (
          <ButtonGroup aria-label="Select stock request view">
            <Button
              variant={activeView === 'requests' ? 'primary' : 'outline-secondary'}
              className="rounded-pill px-4"
              onClick={() => handleSwitch('requests')}
            >
              Request intake
            </Button>
            <Button
              variant={activeView === 'fulfillment' ? 'primary' : 'outline-secondary'}
              className="rounded-pill px-4"
              onClick={() => handleSwitch('fulfillment')}
            >
              Fulfillment pipeline
            </Button>
          </ButtonGroup>
        ) : (
          <Alert variant="info" className="mb-0">
            {activeView === 'requests'
              ? 'You can raise stock requests. Contact an administrator if you also need fulfillment permissions.'
              : 'You can process stock requests. Contact an administrator if you also need intake permissions.'}
          </Alert>
        )}
      </section>

      {activeView === 'requests' ? (
        <TransferRequestsPage key="stock-requests-intake" />
      ) : (
        <TransfersPage key="stock-requests-fulfillment" />
      )}
    </div>
  )
}

export default StockRequestsPage

