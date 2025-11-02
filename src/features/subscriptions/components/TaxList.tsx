/**
 * TaxList Component
 * Displays all tax configurations in a table format
 * Used for both user view (read-only) and admin view (with actions)
 */

import { useEffect, useState } from 'react'
import { Modal, Button, Form, Alert } from 'react-bootstrap'
import type { TaxConfiguration, CreateTaxConfigPayload } from '../../../types/subscriptions'
import { 
  fetchActiveTaxConfigurations, 
  updateTaxConfiguration,
  deleteTaxConfiguration 
} from '../../../services/subscriptionService'

const COUNTRIES = [
  { code: 'GH', name: 'Ghana' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' }
]

interface TaxListProps {
  /**
   * If true, shows only currently effective taxes
   * If false, shows all taxes (requires separate data fetching)
   */
  activeOnly?: boolean
  /**
   * Optional custom class for styling
   */
  className?: string
  /**
   * Title to display above the list
   */
  title?: string
  /**
   * Optional callback for edit action (makes list editable)
   */
  onEdit?: (tax: TaxConfiguration) => void
  /**
   * Optional callback for delete action (shows delete button)
   */
  onDelete?: (tax: TaxConfiguration) => void
  /**
   * Show actions column (edit/delete buttons)
   */
  showActions?: boolean
}

export const TaxList = ({ 
  activeOnly = true, 
  className = '',
  title = 'Applicable Taxes',
  onEdit,
  onDelete,
  showActions = false
}: TaxListProps) => {
  const [taxes, setTaxes] = useState<TaxConfiguration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTax, setEditingTax] = useState<TaxConfiguration | null>(null)
  const [formData, setFormData] = useState<Partial<CreateTaxConfigPayload>>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    loadTaxes()
  }, [activeOnly])

  const loadTaxes = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await fetchActiveTaxConfigurations()
      setTaxes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load taxes')
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (tax: TaxConfiguration) => {
    setEditingTax(tax)
    setFormData({
      name: tax.name,
      code: tax.code,
      description: tax.description,
      rate: tax.rate,
      country: tax.country,
      applies_to_subscriptions: tax.applies_to_subscriptions,
      is_mandatory: tax.is_mandatory,
      calculation_order: tax.calculation_order,
      applies_to: tax.applies_to,
      is_active: tax.is_active,
      effective_from: tax.effective_from,
      effective_until: tax.effective_until
    })
    setShowEditModal(true)
    setFormError(null)
  }

  const handleCloseModal = () => {
    setShowEditModal(false)
    setEditingTax(null)
    setFormData({})
    setFormError(null)
  }

  const handleSave = async () => {
    if (!editingTax) return
    
    setSaving(true)
    setFormError(null)
    
    try {
      await updateTaxConfiguration(editingTax.id, formData as CreateTaxConfigPayload)
      await loadTaxes() // Refresh the list
      handleCloseModal()
      if (onEdit) onEdit(editingTax) // Notify parent if needed
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update tax')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = async (tax: TaxConfiguration) => {
    if (!window.confirm(`Are you sure you want to delete "${tax.name}"? This action cannot be undone.`)) {
      return
    }
    
    try {
      await deleteTaxConfiguration(tax.id)
      await loadTaxes() // Refresh the list
      if (onDelete) onDelete(tax) // Notify parent if needed
    } catch (err) {
      alert(`Failed to delete tax: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <p className="text-red-800 font-medium">Error loading taxes</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={loadTaxes}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (taxes.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 text-center ${className}`}>
        <p className="text-gray-600">No taxes configured</p>
      </div>
    )
  }

  return (
    <div className={className}>
      {title && (
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
      )}
      
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tax Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Country
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              {showActions && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {taxes.map((tax) => (
              <tr key={tax.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {tax.name}
                  </div>
                  {tax.description && (
                    <div className="text-sm text-gray-500 mt-1">
                      {tax.description}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-mono bg-gray-100 text-gray-700 rounded">
                    {tax.code}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {tax.rate}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-600">
                    {tax.country}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {tax.is_effective_now ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Inactive
                    </span>
                  )}
                </td>
                {showActions && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEditClick(tax)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(tax)}
                        className="text-red-600 hover:text-red-900 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tax Summary */}
      <div className="mt-4 text-sm text-gray-600">
        <p>
          Total taxes: <span className="font-medium">{taxes.length}</span>
        </p>
      </div>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Tax Configuration</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {formError && (
            <Alert variant="danger" onClose={() => setFormError(null)} dismissible>
              {formError}
            </Alert>
          )}

          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Tax Name *</Form.Label>
              <Form.Control
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., VAT, Sales Tax"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Tax Code *</Form.Label>
              <Form.Control
                type="text"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., VAT_GH"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this tax"
              />
            </Form.Group>

            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Tax Rate (%) *</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={formData.rate || ''}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    placeholder="e.g., 15.00"
                  />
                </Form.Group>
              </div>

              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Country *</Form.Label>
                  <Form.Select
                    value={formData.country || 'GH'}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Effective From *</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.effective_from || ''}
                    onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                  />
                </Form.Group>
              </div>

              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Effective Until</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.effective_until || ''}
                    onChange={(e) => setFormData({ ...formData, effective_until: e.target.value || null })}
                  />
                  <Form.Text className="text-muted">
                    Leave blank for no end date
                  </Form.Text>
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Active"
                checked={formData.is_active ?? true}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Applies to subscriptions"
                checked={formData.applies_to_subscriptions ?? true}
                onChange={(e) => setFormData({ ...formData, applies_to_subscriptions: e.target.checked })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Mandatory (always applied)"
                checked={formData.is_mandatory ?? true}
                onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
