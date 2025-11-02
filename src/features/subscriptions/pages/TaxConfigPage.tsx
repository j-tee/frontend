/**
 * Tax Configuration Page
 * Main page for tax configuration management (Admin only)
 */

import { TaxManagement } from '../components/TaxManagement'
import { TaxList } from '../components/TaxList'
import { useState } from 'react'

export const TaxConfigPage = () => {
  const [activeTab, setActiveTab] = useState<'manage' | 'view'>('manage')

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('manage')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'manage'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Manage Taxes
          </button>
          <button
            onClick={() => setActiveTab('view')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'view'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            View Active Taxes
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'manage' ? (
          <TaxManagement />
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <TaxList 
              activeOnly={true}
              title="Currently Active Tax Configurations"
              className="max-w-5xl"
              showActions={true}
            />
          </div>
        )}
      </div>
    </div>
  )
}
