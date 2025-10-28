import Card from 'react-bootstrap/Card'
import Button from 'react-bootstrap/Button'
import type { Storefront } from '../../../../types/inventory'

interface StorefrontListProps {
  storefronts: Storefront[]
  activeStorefrontId?: string
  isLoading?: boolean
  onSelect: (storefrontId: string) => void
}

const StorefrontList = ({ storefronts, activeStorefrontId, isLoading = false, onSelect }: StorefrontListProps) => {
  if (storefronts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <h3 className="text-lg font-semibold text-slate-900">No storefronts yet</h3>
        <p className="mt-2 text-sm text-slate-600">
          Create a storefront from the Locations workspace so you can transfer inventory and assign staff.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {storefronts.map((storefront) => {
        const isActive = storefront.id === activeStorefrontId
        return (
          <Card
            key={storefront.id}
            className={`h-full rounded-3xl border transition ${
              isActive ? 'border-brand-primary shadow-lg shadow-brand-primary/20' : 'border-slate-200'
            }`}
          >
            <Card.Body className="flex h-full flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Card.Title className="text-lg font-semibold text-slate-900">
                    {storefront.name}
                  </Card.Title>
                  <Card.Subtitle className="mt-1 text-sm text-slate-600">
                    {storefront.location || 'Location coming soon'}
                  </Card.Subtitle>
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-900">Manager:</span>{' '}
                  {storefront.manager_name || 'Unassigned'}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Created:</span>{' '}
                  {storefront.created_at ? new Date(storefront.created_at).toLocaleDateString() : '—'}
                </p>
              </div>

              <div className="mt-auto flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  {isActive ? 'Viewing' : 'View details'}
                </div>
                <Button
                  variant={isActive ? 'secondary' : 'outline-primary'}
                  size="sm"
                  className="rounded-pill px-3"
                  disabled={isLoading || isActive}
                  onClick={() => onSelect(storefront.id)}
                >
                  {isActive ? 'Selected' : 'Open'}
                </Button>
              </div>
            </Card.Body>
          </Card>
        )
      })}
    </div>
  )
}

export default StorefrontList
