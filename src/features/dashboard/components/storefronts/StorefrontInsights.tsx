import Card from 'react-bootstrap/Card'
import Spinner from 'react-bootstrap/Spinner'
import type { Storefront } from '../../../../types/inventory'

interface StorefrontInsightsProps {
  storefront: Storefront | null
  isLoading?: boolean
}

const StorefrontInsights = ({ storefront, isLoading = false }: StorefrontInsightsProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        <Spinner animation="border" size="sm" role="status" aria-hidden />
        Loading storefront details…
      </div>
    )
  }

  if (!storefront) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <h3 className="text-lg font-semibold text-slate-900">Select a storefront</h3>
        <p className="mt-2 text-sm text-slate-600">
          Choose a storefront from the list to view inventory metrics, transfer history, and sales highlights.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="rounded-3xl border-slate-200">
        <Card.Body className="space-y-2">
          <Card.Title className="text-base font-semibold text-slate-900">Storefront profile</Card.Title>
          <div className="space-y-2 text-sm text-slate-600">
            <p>
              <span className="font-semibold text-slate-900">Name:</span> {storefront.name}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Location:</span>{' '}
              {storefront.location || 'Not specified'}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Manager:</span>{' '}
              {storefront.manager_name || 'Unassigned'}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Created:</span>{' '}
              {storefront.created_at ? new Date(storefront.created_at).toLocaleString() : '—'}
            </p>
          </div>
        </Card.Body>
      </Card>

      <Card className="rounded-3xl border-slate-200">
        <Card.Body className="space-y-3">
          <Card.Title className="text-base font-semibold text-slate-900">Inventory snapshot</Card.Title>
          <p className="text-sm text-slate-600">
            Real-time on-hand units, landed cost, and sell-through metrics will populate here once the storefront
            inventory endpoint is delivered.
          </p>
          <ul className="space-y-2 text-sm text-slate-500">
            <li>• Units on hand — pending API</li>
            <li>• Quantity sold today — pending API</li>
            <li>• Inventory value — pending API</li>
          </ul>
        </Card.Body>
      </Card>

      <Card className="rounded-3xl border-slate-200">
        <Card.Body className="space-y-3">
          <Card.Title className="text-base font-semibold text-slate-900">Team & performance</Card.Title>
          <p className="text-sm text-slate-600">
            This panel will surface assigned staff, shift activity, and latest daily sales figures so managers can
            respond quickly.
          </p>
          <ul className="space-y-2 text-sm text-slate-500">
            <li>• Active staff on duty — pending API</li>
            <li>• Daily gross sales — pending API</li>
            <li>• Exceptions or alerts — pending API</li>
          </ul>
        </Card.Body>
      </Card>
    </div>
  )
}

export default StorefrontInsights
