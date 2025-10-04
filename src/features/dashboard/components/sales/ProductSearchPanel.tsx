import { useState, useEffect, useCallback } from 'react'
import { Form, InputGroup, Card, Row, Col, Button, Badge, Spinner, Alert } from 'react-bootstrap'
import { useAppDispatch } from '../../../../hooks'
import { addItemToCart } from '../../../../store/slices/salesSlice'
import httpClient from '../../../../services/httpClient'
import type { UUID } from '../../../../types/common'

interface Product {
  id: UUID
  name: string
  sku: string
  barcode: string
  category_name: string
  unit: string
  image: string | null
}

interface StockProduct {
  id: UUID
  product: UUID
  product_name?: string
  product_sku?: string
  quantity: number
  available_quantity: number
  reserved_quantity?: number
  unit_cost?: number
  wholesale_price: number
  retail_price: number
  batch_number?: string
  expiry_date?: string | null
}

interface ProductSearchPanelProps {
  storefrontId: UUID
  saleId?: UUID
  saleType: 'RETAIL' | 'WHOLESALE'
  disabled?: boolean
}

export function ProductSearchPanel({ storefrontId, saleId, saleType, disabled }: ProductSearchPanelProps) {
  const dispatch = useAppDispatch()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [stockData, setStockData] = useState<Record<UUID, StockProduct>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addingItemId, setAddingItemId] = useState<UUID | null>(null)
  const [quantities, setQuantities] = useState<Record<UUID, number>>({})

  const fetchStockLevels = useCallback(async (productIds: UUID[]) => {
    try {
      // Try to fetch from availability endpoint first (preferred - dynamic calculation)
      // This returns CALCULATED availability (not raw quantity)
      // Accounts for: reservations, sales, spoilage, damage, theft, transfers
      const stockPromises = productIds.map(async (productId) => {
        try {
          const response = await httpClient.get(
            `/inventory/api/storefronts/${storefrontId}/stock-products/${productId}/availability/`
          )
          return {
            productId,
            data: response.data,
            source: 'availability',
          }
        } catch (err) {
          console.warn(`Availability endpoint not available for product ${productId}, falling back to stock-products`, err)
          // Fallback to basic stock-products endpoint if availability not implemented
          try {
            const fallbackResponse = await httpClient.get('/inventory/api/stock-products/', {
              params: {
                storefront: storefrontId,
                product: productId,
              },
            })
            const stockList = fallbackResponse.data.results || fallbackResponse.data
            const stock = Array.isArray(stockList) ? stockList[0] : stockList
            
            if (stock) {
              return {
                productId,
                data: stock,
                source: 'fallback',
              }
            }
          } catch (fallbackErr) {
            console.warn(`Fallback also failed for product ${productId}:`, fallbackErr)
          }
          return null
        }
      })

      const results = await Promise.all(stockPromises)
      const stockMap: Record<UUID, StockProduct> = {}

      results.forEach((result) => {
        if (result && result.data) {
          const { productId, data, source } = result
          
          if (source === 'availability') {
            // Map availability response to StockProduct format
            // Use unreserved_quantity as the available quantity
            const firstBatch = data.batches?.[0]
            
            stockMap[productId] = {
              id: firstBatch?.id || productId,
              product: productId,
              quantity: data.total_available || 0,
              available_quantity: data.unreserved_quantity || 0, // CRITICAL: Available for new sales
              reserved_quantity: data.reserved_quantity || 0,
              unit_cost: firstBatch?.unit_cost || 0,
              retail_price: firstBatch?.retail_price || 0,
              wholesale_price: firstBatch?.wholesale_price || 0,
              batch_number: firstBatch?.batch_number || '',
              expiry_date: firstBatch?.expiry_date || null,
            }
          } else {
            // Fallback: Use basic stock data (temporary until availability endpoint is ready)
            console.log('[ProductSearch] Using fallback stock data for product:', productId)
            stockMap[productId] = {
              id: data.id,
              product: productId,
              quantity: parseInt(data.quantity) || 0,
              available_quantity: parseInt(data.quantity) || 0, // Using raw quantity as fallback
              reserved_quantity: 0,
              unit_cost: parseFloat(data.unit_cost) || 0,
              retail_price: parseFloat(data.retail_price) || 0,
              wholesale_price: parseFloat(data.wholesale_price) || 0,
              batch_number: data.batch_number || '',
              expiry_date: data.expiry_date || null,
            }
          }
        }
      })

      setStockData(stockMap)
    } catch (err) {
      console.error('Failed to fetch stock levels:', err)
    }
  }, [storefrontId])

  const searchProducts = useCallback(async (query: string) => {
    try {
      setLoading(true)
      setError(null)

      console.log('[ProductSearch] Searching for:', query)
      console.log('[ProductSearch] API URL:', '/inventory/api/products/')
      console.log('[ProductSearch] Base URL:', httpClient.defaults.baseURL)
      
      const response = await httpClient.get('/inventory/api/products/', {
        params: {
          search: query,
          // Note: is_active filter removed - not available in backend
        },
      })

      console.log('[ProductSearch] Response status:', response.status)
      console.log('[ProductSearch] Response data:', response.data)

      const productList = response.data.results || response.data
      
      if (!Array.isArray(productList)) {
        console.warn('[ProductSearch] Unexpected response format:', productList)
        setError('Unexpected response format from server')
        return
      }
      
      setProducts(productList)

      // Initialize quantities for new products (default to 1)
      const newQuantities: Record<UUID, number> = {}
      productList.forEach((p: Product) => {
        if (!quantities[p.id]) {
          newQuantities[p.id] = 1
        }
      })
      if (Object.keys(newQuantities).length > 0) {
        setQuantities(prev => ({ ...prev, ...newQuantities }))
      }

      // Fetch stock for each product
      if (productList.length > 0) {
        await fetchStockLevels(productList.map((p: Product) => p.id))
      }
    } catch (err) {
      console.error('[ProductSearch] Search error:', err)
      const error = err as { response?: { data?: unknown; status?: number; statusText?: string }; message?: string }
      
      if (error.response) {
        console.error('[ProductSearch] Error status:', error.response.status)
        console.error('[ProductSearch] Error statusText:', error.response.statusText)
        console.error('[ProductSearch] Error data:', error.response.data)
        
        // Provide more specific error messages
        if (error.response.status === 500) {
          setError('Server error - Please check backend logs for details')
        } else if (error.response.status === 404) {
          setError('Products endpoint not found - Check backend URL configuration')
        } else if (error.response.status === 401) {
          setError('Authentication failed - Please log in again')
        } else {
          setError(`Failed to search products: ${error.response.status} ${error.response.statusText}`)
        }
      } else {
        setError(error.message || 'Failed to search products - Network error')
      }
    } finally {
      setLoading(false)
    }
  }, [fetchStockLevels, quantities])

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setProducts([])
      return
    }

    const timeoutId = setTimeout(() => {
      searchProducts(searchQuery)
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchProducts])

  const searchByBarcode = async (barcode: string) => {
    try {
      setLoading(true)
      setError(null)

      console.log('[ProductSearch] Barcode scan:', barcode)
      
      // Try barcode endpoint first (if product has barcode field)
      try {
        const response = await httpClient.get(`/inventory/api/products/by-barcode/${barcode}/`)
        const product = response.data

        if (product) {
          console.log('[ProductSearch] Product found by barcode:', product)
          // Auto-add to cart if saleId exists
          if (saleId) {
            await handleAddToCart(product.id, 1)
          } else {
            setProducts([product])
            await fetchStockLevels([product.id])
          }
          setBarcodeInput('')
          return
        }
      } catch (barcodeErr) {
        const barcodeError = barcodeErr as { response?: { status: number } }
        
        // If 404, try SKU lookup as fallback (barcode might be the SKU)
        if (barcodeError.response?.status === 404) {
          console.log('[ProductSearch] Barcode not found, trying SKU lookup...')
          
          try {
            const response = await httpClient.get(`/inventory/api/products/by-sku/${barcode}/`)
            const product = response.data

            if (product) {
              console.log('[ProductSearch] Product found by SKU:', product)
              // Auto-add to cart if saleId exists
              if (saleId) {
                await handleAddToCart(product.id, 1)
              } else {
                setProducts([product])
                await fetchStockLevels([product.id])
              }
              setBarcodeInput('')
              return
            }
          } catch {
            // Both failed, show error
            throw new Error('not_found')
          }
        } else {
          // Other error, rethrow
          throw barcodeErr
        }
      }

      setBarcodeInput('')
    } catch (err) {
      const error = err as { response?: { status: number }; message?: string }
      
      if (error.message === 'not_found') {
        setError(`No product found with barcode/SKU: ${barcode}`)
      } else if (error.response?.status === 404) {
        setError(`No product found with barcode/SKU: ${barcode}`)
      } else {
        setError('Failed to scan barcode')
      }
      console.error('Barcode scan error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = async (productId: UUID, quantity: number = 1) => {
    if (!saleId) {
      setError('Please create a sale first')
      return
    }

    const stock = stockData[productId]
    if (!stock) {
      setError('Product not available at this location')
      return
    }

    if (stock.available_quantity < quantity) {
      setError(`Only ${stock.available_quantity} available`)
      return
    }

    try {
      setAddingItemId(productId)
      setError(null)

      const unitPrice = saleType === 'WHOLESALE' ? stock.wholesale_price : stock.retail_price

      await dispatch(
        addItemToCart({
          saleId,
          product: productId,
          stockProduct: stock.id,
          quantity,
          unitPrice: unitPrice,
        })
      ).unwrap()

      // Refresh stock levels
      await fetchStockLevels([productId])
      
      // Clear search on successful add
      setSearchQuery('')
      setProducts([])
    } catch (err) {
      const error = err as { message?: string }
      setError(error.message || 'Failed to add item to cart')
    } finally {
      setAddingItemId(null)
    }
  }

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (barcodeInput.trim()) {
      searchByBarcode(barcodeInput.trim())
    }
  }

  const getStockStatus = (productId: UUID) => {
    const stock = stockData[productId]
    if (!stock) return { color: 'secondary', text: 'N/A', available: 0 }

    // Backend returns 'quantity' not 'available_quantity'
    const qty = stock.quantity

    if (qty === 0) {
      return { color: 'danger', text: 'Out of Stock', available: 0 }
    } else if (qty <= 5) {
      return { color: 'warning', text: `Low: ${qty}`, available: qty }
    } else {
      return { color: 'success', text: `${qty} in stock`, available: qty }
    }
  }

  const getPrice = (productId: UUID) => {
    const stock = stockData[productId]
    if (!stock) return 0
    const price = saleType === 'WHOLESALE' ? stock.wholesale_price : stock.retail_price
    // Convert to number in case API returns string
    return typeof price === 'string' ? parseFloat(price) : price
  }

  const getQuantity = (productId: UUID) => {
    return quantities[productId] || 1
  }

  const setQuantity = (productId: UUID, quantity: number) => {
    setQuantities(prev => ({ ...prev, [productId]: quantity }))
  }

  return (
    <div>
      {/* Search Bar */}
      <Form.Group className="mb-3">
        <InputGroup>
          <InputGroup.Text>
            🔍
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Search products by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={disabled}
          />
          {loading && (
            <InputGroup.Text>
              <Spinner animation="border" size="sm" />
            </InputGroup.Text>
          )}
        </InputGroup>
      </Form.Group>

      {/* Barcode Scanner */}
      <Form onSubmit={handleBarcodeSubmit} className="mb-3">
        <InputGroup>
          <InputGroup.Text>
            📷
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Scan or enter barcode..."
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            disabled={disabled}
            autoFocus
          />
          <Button variant="outline-primary" type="submit" disabled={!barcodeInput.trim() || disabled}>
            Scan
          </Button>
        </InputGroup>
        <Form.Text className="text-muted">
          Tip: Focus here and use your barcode scanner
        </Form.Text>
      </Form>

      {/* Error Message */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Product Results */}
      {products.length > 0 && (
        <Card className="mt-3">
          <Card.Header>
            <strong>Search Results</strong> ({products.length} {products.length === 1 ? 'item' : 'items'})
          </Card.Header>
          <Card.Body className="p-0">
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {products.map((product) => {
                const stockStatus = getStockStatus(product.id)
                const price = getPrice(product.id)
                const isAdding = addingItemId === product.id

                return (
                  <div
                    key={product.id}
                    className="border-bottom p-3 hover-bg-light"
                    style={{ cursor: 'pointer' }}
                  >
                    <Row className="align-items-center">
                      <Col xs={2}>
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="img-fluid rounded"
                            style={{ maxHeight: '60px' }}
                          />
                        ) : (
                          <div
                            className="bg-light rounded d-flex align-items-center justify-content-center"
                            style={{ height: '60px', width: '60px' }}
                          >
                            <span style={{ fontSize: '24px' }}>📦</span>
                          </div>
                        )}
                      </Col>
                      <Col xs={5}>
                        <div>
                          <strong>{product.name}</strong>
                          <br />
                          <small className="text-muted">
                            SKU: {product.sku} | {product.category_name}
                          </small>
                          <br />
                          <Badge bg={stockStatus.color as 'secondary' | 'danger' | 'warning' | 'success'}>{stockStatus.text}</Badge>
                        </div>
                      </Col>
                      <Col xs={2} className="text-end">
                        <div className="fs-5 fw-bold">GH₵ {price.toFixed(2)}</div>
                        <small className="text-muted">per {product.unit}</small>
                      </Col>
                      <Col xs={3}>
                        <InputGroup size="sm" className="mb-2">
                          <Button
                            variant="outline-secondary"
                            onClick={() => {
                              const currentQty = getQuantity(product.id)
                              if (currentQty > 1) setQuantity(product.id, currentQty - 1)
                            }}
                            disabled={disabled || getQuantity(product.id) <= 1}
                          >
                            -
                          </Button>
                          <Form.Control
                            type="number"
                            min="1"
                            max={stockStatus.available}
                            value={getQuantity(product.id)}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value) || 1
                              if (newQty >= 1 && newQty <= stockStatus.available) {
                                setQuantity(product.id, newQty)
                              }
                            }}
                            className="text-center"
                            disabled={disabled}
                            style={{ maxWidth: '60px' }}
                          />
                          <Button
                            variant="outline-secondary"
                            onClick={() => {
                              const currentQty = getQuantity(product.id)
                              if (currentQty < stockStatus.available) {
                                setQuantity(product.id, currentQty + 1)
                              }
                            }}
                            disabled={disabled || getQuantity(product.id) >= stockStatus.available}
                          >
                            +
                          </Button>
                        </InputGroup>
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-100"
                          onClick={() => handleAddToCart(product.id, getQuantity(product.id))}
                          disabled={stockStatus.available === 0 || !saleId || isAdding || disabled}
                        >
                          {isAdding ? (
                            <Spinner animation="border" size="sm" />
                          ) : (
                            '+ Add'
                          )}
                        </Button>
                      </Col>
                    </Row>
                  </div>
                )
              })}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* No Results */}
      {!loading && searchQuery && products.length === 0 && (
        <Alert variant="info" className="mt-3">
          No products found matching "{searchQuery}"
        </Alert>
      )}
    </div>
  )
}

