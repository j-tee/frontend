/**
 * TaxManagement Component
 * Full CRUD interface for tax configurations
 * Platform Admin only
 */

import { useEffect, useState } from 'react'
import type { TaxConfiguration, CreateTaxConfigPayload, TaxAppliesTo } from '../../../types/subscriptions'
import {
  fetchTaxConfigurations,
  createTaxConfiguration,
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

const APPLIES_TO_OPTIONS: { value: TaxAppliesTo; label: string; description: string }[] = [
  {
    value: 'SUBTOTAL',
    label: 'Subtotal',
    description: 'Tax calculated on base amount before other taxes'
  },
  {
    value: 'CUMULATIVE',
    label: 'Cumulative',
    description: 'Tax calculated on cumulative amount including previous taxes'
  }
]

type TaxFormData = CreateTaxConfigPayload

const initialFormData: TaxFormData = {
  name: '',
  code: '',
  description: '',
  rate: '',
  country: 'GH',
  applies_to_subscriptions: true,
  is_mandatory: true,
  calculation_order: 1,
  applies_to: 'SUBTOTAL',
  is_active: true,
  effective_from: new Date().toISOString().split('T')[0],
  effective_until: null
}

export const TaxManagement = () => {
  const [taxes, setTaxes] = useState<TaxConfiguration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Form state
  const [isEditing, setIsEditing] = useState(false)
  const [editingTax, setEditingTax] = useState<TaxConfiguration | null>(null)
  const [formData, setFormData] = useState<TaxFormData>(initialFormData)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    loadTaxes()
  }, [])

  // Handle edit from sessionStorage after taxes are loaded
  useEffect(() => {
    const editTaxId = sessionStorage.getItem('editTaxId')
    if (editTaxId && taxes.length > 0) {
      const taxToEdit = taxes.find(t => t.id === editTaxId)
      if (taxToEdit) {
        // Set up edit mode directly
        setEditingTax(taxToEdit)
        setIsEditing(true)
        setShowForm(true)
        setFormData({
          name: taxToEdit.name,
          code: taxToEdit.code,
          description: taxToEdit.description,
          rate: taxToEdit.rate,
          country: taxToEdit.country,
          applies_to_subscriptions: taxToEdit.applies_to_subscriptions,
          is_mandatory: taxToEdit.is_mandatory,
          calculation_order: taxToEdit.calculation_order,
          applies_to: taxToEdit.applies_to,
          is_active: taxToEdit.is_active,
          effective_from: taxToEdit.effective_from,
          effective_until: taxToEdit.effective_until
        })
        sessionStorage.removeItem('editTaxId')
        
        // Scroll to form
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }, 100)
      }
    }
  }, [taxes])

  const loadTaxes = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await fetchTaxConfigurations()
      setTaxes(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load taxes')
      setTaxes([]) // Ensure taxes is always an array on error
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSuccessMessage(null)
    setSubmitting(true)

    try {
      if (editingTax) {
        await updateTaxConfiguration(editingTax.id, formData)
        setSuccessMessage('Tax configuration updated successfully')
      } else {
        await createTaxConfiguration(formData)
        setSuccessMessage('Tax configuration created successfully')
      }
      
      await loadTaxes()
      resetForm()
      setShowForm(false)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message)
      } else {
        setFormError('An unexpected error occurred')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (tax: TaxConfiguration) => {
    setEditingTax(tax)
    setIsEditing(true)
    setShowForm(true)
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
  }

  const handleDelete = async (tax: TaxConfiguration) => {
    if (!confirm(`Are you sure you want to delete "${tax.name}"?`)) {
      return
    }

    setError(null)
    setSuccessMessage(null)

    try {
      await deleteTaxConfiguration(tax.id)
      setSuccessMessage(`Tax "${tax.name}" deleted successfully`)
      await loadTaxes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tax')
    }
  }

  const resetForm = () => {
    setEditingTax(null)
    setIsEditing(false)
    setFormData(initialFormData)
    setFormError(null)
  }

  const handleCancel = () => {
    resetForm()
    setShowForm(false)
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Tax Configuration Management</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Create New Tax
          </button>
        )}
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{successMessage}</p>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 text-sm underline mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-600 text-sm underline mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tax Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {isEditing ? 'Edit Tax Configuration' : 'Create New Tax Configuration'}
          </h2>

          {formError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded p-3">
              <p className="text-red-800 text-sm">{formError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Value Added Tax"
                />
              </div>

              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                  disabled={isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="e.g., VAT_GH"
                />
                {isEditing && (
                  <p className="text-xs text-gray-500 mt-1">Code cannot be changed</p>
                )}
              </div>

              {/* Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rate (%) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 15.00"
                />
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country *
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name} ({country.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Calculation Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calculation Order *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.calculation_order}
                  onChange={(e) => setFormData({ ...formData, calculation_order: parseInt(e.target.value) })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1"
                />
                <p className="text-xs text-gray-500 mt-1">Lower numbers are calculated first</p>
              </div>

              {/* Applies To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Applies To *
                </label>
                <select
                  value={formData.applies_to}
                  onChange={(e) => setFormData({ ...formData, applies_to: e.target.value as TaxAppliesTo })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {APPLIES_TO_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {APPLIES_TO_OPTIONS.find(o => o.value === formData.applies_to)?.description}
                </p>
              </div>

              {/* Effective From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Effective From *
                </label>
                <input
                  type="date"
                  value={formData.effective_from}
                  onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Effective Until */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Effective Until
                </label>
                <input
                  type="date"
                  value={formData.effective_until || ''}
                  onChange={(e) => setFormData({ ...formData, effective_until: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty for indefinite</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Optional description..."
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_mandatory}
                  onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-gray-700">Mandatory (always applied)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.applies_to_subscriptions}
                  onChange={(e) => setFormData({ ...formData, applies_to_subscriptions: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-gray-700">Applies to subscriptions</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : isEditing ? 'Update Tax' : 'Create Tax'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tax List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Existing Tax Configurations</h2>
        </div>

        {!Array.isArray(taxes) || taxes.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No tax configurations found. Create one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective From</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {taxes.map((tax) => (
                  <tr key={tax.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{tax.name}</div>
                      {tax.description && (
                        <div className="text-xs text-gray-500">{tax.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-mono bg-gray-100 rounded">{tax.code}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold">{tax.rate}%</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{tax.country}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {tax.is_effective_now ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Active</span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Inactive</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{tax.effective_from}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                      <button
                        onClick={() => handleEdit(tax)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(tax)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
