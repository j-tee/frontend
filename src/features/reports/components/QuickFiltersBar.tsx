import React, { useState } from 'react';
import { TrendingUp, AlertTriangle, Settings, Truck } from 'lucide-react';
import { inventoryReportsService } from '../../../services/reportsService';

interface QuickFiltersBarProps {
  startDate: string;
  endDate: string;
  onFilterApplied: (products: Array<{ id: string; name: string; sku: string }>, filterType: string) => void;
}

export const QuickFiltersBar: React.FC<QuickFiltersBarProps> = ({
  startDate,
  endDate,
  onFilterApplied
}) => {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const quickFilters = [
    {
      type: 'top_sellers',
      label: 'Top Sellers',
      icon: TrendingUp,
      color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
      description: 'Products with highest sales volume'
    },
    {
      type: 'shrinkage',
      label: 'Shrinkage Items',
      icon: AlertTriangle,
      color: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
      description: 'Products with negative adjustments'
    },
    {
      type: 'most_adjusted',
      label: 'Most Adjusted',
      icon: Settings,
      color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100',
      description: 'Products with frequent manual adjustments'
    },
    {
      type: 'high_transfers',
      label: 'High Transfers',
      icon: Truck,
      color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
      description: 'Products frequently moved between warehouses'
    }
  ];

  const applyQuickFilter = async (filterType: string) => {
    setLoading(true);
    try {
      const response = await inventoryReportsService.getQuickFilters(
        filterType as 'top_sellers' | 'most_adjusted' | 'high_transfers' | 'shrinkage',
        startDate,
        endDate,
        10
      );

      if (response.success && response.data.product_ids.length > 0) {
        // Fetch product details for the returned IDs
        const productDetails = await Promise.all(
          response.data.product_ids.map(async (id) => {
            try {
              // Use the search endpoint to get product details
              const searchResponse = await inventoryReportsService.searchProducts(id, 1);
              if (searchResponse.success && searchResponse.data.length > 0) {
                const product = searchResponse.data[0];
                return { id: product.id, name: product.name, sku: product.sku };
              }
              // Fallback if product not found
              return { id, name: 'Unknown Product', sku: 'N/A' };
            } catch (err) {
              console.error(`Failed to fetch details for product ${id}:`, err);
              return { id, name: 'Unknown Product', sku: 'N/A' };
            }
          })
        );

        onFilterApplied(productDetails, filterType);
        setActiveFilter(filterType);
      } else {
        alert(`No products found for "${filterType}" filter`);
      }
    } catch (error) {
      console.error('Quick filter error:', error);
      alert('Failed to apply filter. Make sure the backend endpoint is available.');
    } finally {
      setLoading(false);
    }
  };

  const clearFilter = () => {
    setActiveFilter(null);
    onFilterApplied([], '');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">Quick Filters</h4>
        {activeFilter && (
          <button
            onClick={clearFilter}
            className="text-xs text-red-600 hover:text-red-800 font-medium"
          >
            Clear Active Filter
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {quickFilters.map((filter) => {
          const Icon = filter.icon;
          const isActive = activeFilter === filter.type;
          
          return (
            <button
              key={filter.type}
              onClick={() => applyQuickFilter(filter.type)}
              disabled={loading}
              className={`
                relative p-3 border rounded-lg text-left transition-all
                ${isActive 
                  ? 'ring-2 ring-blue-500 ring-offset-1' 
                  : filter.color
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <div className="flex items-start justify-between mb-2">
                <Icon className="w-5 h-5" />
                {isActive && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                    Active
                  </span>
                )}
              </div>
              <div className="font-medium text-sm mb-1">{filter.label}</div>
              <div className="text-xs opacity-75">{filter.description}</div>
            </button>
          );
        })}
      </div>
      
      {loading && (
        <div className="mt-3 text-center text-sm text-gray-600">
          Loading filter data...
        </div>
      )}
    </div>
  );
};
