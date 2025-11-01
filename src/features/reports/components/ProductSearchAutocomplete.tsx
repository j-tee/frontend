import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Package } from 'lucide-react';
import { inventoryReportsService } from '../../../services/reportsService';
import type { ProductSearchResult } from '../../../types/reports';

interface ProductSearchAutocompleteProps {
  onSelectProducts: (productIds: string[]) => void;
  selectedProductIds: string[];
}

export const ProductSearchAutocomplete: React.FC<ProductSearchAutocompleteProps> = ({
  onSelectProducts,
  selectedProductIds
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  const searchProducts = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      const response = await inventoryReportsService.searchProducts(searchQuery, 10);
      if (response.success) {
        setResults(response.data);
        setShowDropdown(true);
      }
    } catch (error) {
      console.error('Product search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce timer
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) searchProducts(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchProducts]);

  const handleSelectProduct = (product: ProductSearchResult) => {
    if (!selectedProductIds.includes(product.id)) {
      onSelectProducts([...selectedProductIds, product.id]);
    }
    setQuery('');
    setShowDropdown(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Search & Add Products
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type product name or SKU (min 2 chars)..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelectProduct(product)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
              disabled={selectedProductIds.includes(product.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{product.name}</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    SKU: {product.sku}
                    {product.category && ` • ${product.category}`}
                  </div>
                </div>
                <div className="text-sm text-gray-600 ml-4">
                  Stock: {product.current_stock}
                </div>
              </div>
              {selectedProductIds.includes(product.id) && (
                <div className="mt-2 text-xs text-blue-600">✓ Already selected</div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {showDropdown && !loading && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
          No products found for "{query}"
        </div>
      )}
    </div>
  );
};
