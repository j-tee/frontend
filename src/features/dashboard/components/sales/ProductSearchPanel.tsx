import { useState, useEffect, useCallback, useRef } from 'react'
import { Form, InputGroup, Card, Row, Col, Button, Badge, Spinner, Alert } from 'react-bootstrap'
import { useAppDispatch } from '../../../../hooks'
import { addItemToCart } from '../../../../store/slices/salesSlice'
import { fetchSaleCatalog, fetchMultiStorefrontCatalog } from '../../../../services/inventoryService'
import httpClient from '../../../../services/httpClient'
import type { UUID } from '../../../../types/common'
import type { SaleCatalogItem, MultiStorefrontCatalogItem, StorefrontLocation } from '../../../../types/inventory'

interface Product {
  id: UUID
  name: string
  sku: string
  barcode: string | null
  category_name: string
  unit: string
  image: string | null
  stock_product_ids: UUID[]
  retail_price: number
  wholesale_price: number
  available_quantity: number
  locations?: StorefrontLocation[] // For multi-storefront mode
}

interface StockRecord {
  id: UUID
  product: UUID
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
  storefrontId?: UUID  // Optional - when not provided, uses multi-storefront mode
  saleId?: UUID
  saleType: 'RETAIL' | 'WHOLESALE'
  disabled?: boolean
  ensureSaleSession?: (preferredStorefrontId?: UUID) => Promise<UUID | null>  // Accept storefront parameter
  multiStorefront?: boolean  // Explicitly enable multi-storefront mode
}

export function ProductSearchPanel({ storefrontId, saleId, saleType, disabled, ensureSaleSession, multiStorefront = false }: ProductSearchPanelProps) {
  const dispatch = useAppDispatch()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [catalog, setCatalog] = useState<Product[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [stockData, setStockData] = useState<Record<UUID, StockRecord>>({})
  const [loading, setLoading] = useState(false)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addingItemId, setAddingItemId] = useState<UUID | null>(null)
  const [quantities, setQuantities] = useState<Record<UUID, number>>({})
  const [accessibleStorefronts, setAccessibleStorefronts] = useState<Array<{ id: UUID; name: string }>>([])

  const lastSearchTimestampRef = useRef(0)
  const availabilitySupportedRef = useRef(true)
  const stockDataRef = useRef<Record<UUID, StockRecord>>({})

  const MIN_SEARCH_LENGTH = 2
  const SEARCH_DEBOUNCE_MS = 400
  const SEARCH_THROTTLE_MS = 600

  const parsePrice = (value: string | number | null | undefined): number => {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0
    }
    if (typeof value === 'string') {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : 0
    }
    return 0
  }

  useEffect(() => {
    let isMounted = true

    const loadCatalog = async () => {
      try {
        setCatalogLoading(true)
        setLoading(true)
        setError(null)
        availabilitySupportedRef.current = true
        lastSearchTimestampRef.current = 0

        let normalized: Product[]

        // Use multi-storefront mode if enabled OR if no storefrontId provided
        if (multiStorefront || !storefrontId) {
          // Fetch from all accessible storefronts
          const multiResponse = await fetchMultiStorefrontCatalog()
          
          // Store accessible storefronts for reference
          setAccessibleStorefronts(multiResponse.storefronts)
          
          // Map multi-storefront response to Product format
          normalized = (multiResponse.products ?? [])
            .filter((item: MultiStorefrontCatalogItem) => 
              Array.isArray(item.stock_product_ids) && 
              item.stock_product_ids.length > 0
            )
            .map((item: MultiStorefrontCatalogItem): Product => {
              const retail = parsePrice(item.retail_price)
              const wholesale = parsePrice(item.wholesale_price ?? item.retail_price)
              const available = item.total_available || 0

              return {
                id: item.product_id,
                name: item.product_name,
                sku: item.sku,
                barcode: item.barcode ?? null,
                category_name: item.category_name ?? 'Uncategorized',
                unit: item.unit ?? 'unit',
                image: item.product_image ?? null,
                stock_product_ids: item.stock_product_ids,
                retail_price: retail,
                wholesale_price: wholesale,
                available_quantity: available,
                locations: item.locations, // Include location info
              }
            })
        } else {
          // Single storefront mode (original behavior)
          const response = await fetchSaleCatalog(storefrontId)
          normalized = (response.products ?? [])
            .filter((item: SaleCatalogItem) => 
              Array.isArray(item.stock_product_ids) && 
              item.stock_product_ids.length > 0
            )
            .map((item: SaleCatalogItem): Product => {
              const retail = parsePrice(item.retail_price)
              const wholesale = parsePrice(item.wholesale_price ?? item.retail_price)
              const available = typeof item.available_quantity === 'number'
                ? item.available_quantity
                : Number(item.available_quantity) || 0

              return {
                id: item.product_id,
                name: item.product_name,
                sku: item.sku,
                barcode: item.barcode ?? null,
                category_name: item.category_name ?? 'Uncategorized',
                unit: item.unit ?? 'unit',
                image: item.product_image ?? null,
                stock_product_ids: item.stock_product_ids,
                retail_price: retail,
                wholesale_price: wholesale,
                available_quantity: available,
              }
            })
        }

        if (!isMounted) {
          return
        }

        setCatalog(normalized)
        setProducts([])
        setQuantities({})

        const seededStock: Record<UUID, StockRecord> = {}
        normalized.forEach((product) => {
          if (product.stock_product_ids.length === 0) {
            return
          }

          const primaryStockId = product.stock_product_ids[0]
          seededStock[product.id] = {
            id: primaryStockId,
            product: product.id,
            quantity: product.available_quantity,
            available_quantity: product.available_quantity,
            reserved_quantity: 0,
            unit_cost: 0,
            retail_price: product.retail_price,
            wholesale_price: product.wholesale_price,
            batch_number: undefined,
            expiry_date: null,
          }
        })

        setStockData(seededStock)
        stockDataRef.current = seededStock
      } catch (err) {
        console.error('[ProductSearch] Failed to load sale catalog', err)
        if (isMounted) {
          setCatalog([])
          setProducts([])
          setStockData({})
          stockDataRef.current = {}
          setError('Unable to load catalog for this storefront. Please try again.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
          setCatalogLoading(false)
        }
      }
    }

    loadCatalog()

    return () => {
      isMounted = false
    }
  }, [storefrontId, multiStorefront])

  useEffect(() => {
    stockDataRef.current = stockData
  }, [stockData])

  const fetchStockLevels = useCallback(async (productIds: UUID[]) => {
    if (!productIds.length) {
      return
    }

    // In multi-storefront mode, don't fetch individual stock levels
    // The multi-storefront catalog already includes total_available quantities
    if (multiStorefront) {
      console.log('[ProductSearch] Multi-storefront mode: Skipping individual stock level fetches')
      return
    }

    try {
      const shouldTryAvailability = availabilitySupportedRef.current

      const stockPromises = productIds.map(async (productId) => {
        try {
          if (shouldTryAvailability) {
            const response = await httpClient.get(
              `/inventory/api/storefronts/${storefrontId}/stock-products/${productId}/availability/`
            )
            return {
              productId,
              data: response.data,
              source: 'availability' as const,
            }
          }
          throw new Error('AVAILABILITY_DISABLED')
        } catch (err) {
          const error = err as { response?: { status?: number }; message?: string }

          if (error.message !== 'AVAILABILITY_DISABLED') {
            console.warn(`Availability endpoint not available for product ${productId}, falling back to stock-products`, err)

            if (shouldTryAvailability && error.response && [404, 405, 500].includes(error.response.status ?? 0)) {
              availabilitySupportedRef.current = false
            }
          }

          try {
            // Attempt warehouse availability endpoint first (new fallback path)
            try {
              const warehouseAvailability = await httpClient.get('/inventory/api/stock/availability/', {
                params: {
                  warehouse: storefrontId,
                  product: productId,
                },
              })

              const availabilityPayload = warehouseAvailability.data as {
                available_quantity?: number | string
                requested_quantity?: number | string
              }

              const toNumber = (value: unknown): number => {
                if (typeof value === 'number') {
                  return Number.isFinite(value) ? value : 0
                }
                if (typeof value === 'string') {
                  const parsed = Number(value)
                  return Number.isFinite(parsed) ? parsed : 0
                }
                return 0
              }

              const availableQuantity = toNumber(
                availabilityPayload.available_quantity ?? availabilityPayload.requested_quantity ?? 0,
              )

              const existingStock = stockDataRef.current[productId]

              return {
                productId,
                data: {
                  id: existingStock?.id ?? productId,
                  product: productId,
                  quantity: availableQuantity,
                  available_quantity: availableQuantity,
                  reserved_quantity: existingStock?.reserved_quantity ?? 0,
                  unit_cost: existingStock?.unit_cost ?? 0,
                  retail_price: existingStock?.retail_price ?? 0,
                  wholesale_price: existingStock?.wholesale_price ?? existingStock?.retail_price ?? 0,
                  batch_number: existingStock?.batch_number ?? '',
                  expiry_date: existingStock?.expiry_date ?? null,
                },
                source: 'warehouse-availability' as const,
              }
            } catch (warehouseFallbackError) {
              console.warn(
                `[ProductSearch] Warehouse availability fallback failed for product ${productId}`,
                warehouseFallbackError,
              )
            }

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
                source: 'fallback' as const,
              }
            }
          } catch (fallbackErr) {
            console.warn(`Fallback also failed for product ${productId}:`, fallbackErr)
          }
          return null
        }
      })

      const results = await Promise.all(stockPromises)
      const stockMap: Record<UUID, StockRecord> = {}

      results.forEach((result) => {
        if (!result || !result.data) {
          return
        }

        const { productId, data, source } = result
        const existingStock = stockDataRef.current[productId]

        if (source === 'availability') {
          const firstBatch = data.batches?.[0]
          const reserved = typeof data.reserved_quantity === 'number' ? data.reserved_quantity : 0
          const stockId = firstBatch?.id || existingStock?.id || productId
          const quantityTotal = typeof data.total_available === 'number'
            ? data.total_available
            : Number(data.total_available) || 0
          const availableQuantity = typeof data.unreserved_quantity === 'number'
            ? data.unreserved_quantity
            : Number(data.unreserved_quantity) || 0
          const unitCost = typeof firstBatch?.unit_cost === 'number'
            ? firstBatch.unit_cost
            : Number(firstBatch?.unit_cost ?? existingStock?.unit_cost ?? 0) || 0
          const retailPrice = typeof firstBatch?.retail_price === 'number'
            ? firstBatch.retail_price
            : Number(firstBatch?.retail_price ?? existingStock?.retail_price ?? 0) || 0
          const wholesalePrice = typeof firstBatch?.wholesale_price === 'number'
            ? firstBatch.wholesale_price
            : Number(firstBatch?.wholesale_price ?? existingStock?.wholesale_price ?? retailPrice) || 0

          stockMap[productId] = {
            id: stockId,
            product: productId,
            quantity: quantityTotal,
            available_quantity: availableQuantity,
            reserved_quantity: reserved,
            unit_cost: unitCost,
            retail_price: retailPrice,
            wholesale_price: wholesalePrice,
            batch_number: firstBatch?.batch_number || undefined,
            expiry_date: firstBatch?.expiry_date ?? null,
          }
        } else {
          const toNumber = (value: unknown): number => {
            if (typeof value === 'number') {
              return Number.isFinite(value) ? value : 0
            }
            if (typeof value === 'string') {
              const parsed = Number(value)
              return Number.isFinite(parsed) ? parsed : 0
            }
            return 0
          }

          stockMap[productId] = {
            id: data.id,
            product: productId,
            quantity: toNumber(data.quantity),
            available_quantity: toNumber(data.available_quantity ?? data.quantity),
            reserved_quantity: toNumber(data.reserved_quantity),
            unit_cost: toNumber(data.unit_cost ?? existingStock?.unit_cost),
            retail_price: toNumber(data.retail_price ?? existingStock?.retail_price),
            wholesale_price: toNumber(data.wholesale_price ?? existingStock?.wholesale_price ?? data.retail_price),
            batch_number: data.batch_number ?? undefined,
            expiry_date: data.expiry_date ?? null,
          }
        }
      })

      if (Object.keys(stockMap).length > 0) {
        setStockData((prev) => {
          const next = {
            ...prev,
            ...stockMap,
          }
          stockDataRef.current = next
          return next
        })
      }
    } catch (err) {
      console.error('Failed to fetch stock levels:', err)
    }
  }, [storefrontId, multiStorefront])

  const searchProducts = useCallback(async (rawQuery: string) => {
    if (catalogLoading) {
      return
    }

    const trimmedQuery = rawQuery.trim()

    if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
      setProducts([])
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const now = Date.now()
      const elapsedSinceLastSearch = now - lastSearchTimestampRef.current
      if (elapsedSinceLastSearch < SEARCH_THROTTLE_MS) {
        await new Promise((resolve) => setTimeout(resolve, SEARCH_THROTTLE_MS - elapsedSinceLastSearch))
      }

      lastSearchTimestampRef.current = Date.now()

      const lowerQuery = trimmedQuery.toLowerCase()
      const matches = catalog.filter((item) =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.sku.toLowerCase().includes(lowerQuery) ||
        (item.barcode ? item.barcode.toLowerCase().includes(lowerQuery) : false)
      )

      setProducts(matches)

      const newQuantities: Record<UUID, number> = {}
      matches.forEach((product) => {
        if (!quantities[product.id]) {
          newQuantities[product.id] = 1
        }
      })
      if (Object.keys(newQuantities).length > 0) {
        setQuantities((prev) => ({ ...prev, ...newQuantities }))
      }

      if (matches.length > 0) {
        await fetchStockLevels(matches.map((product) => product.id))
      }
    } catch (err) {
      console.error('[ProductSearch] Search error:', err)
      setError('Failed to search products. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [catalog, catalogLoading, fetchStockLevels, quantities])

  // Debounced search
  useEffect(() => {
    if (catalogLoading) {
      return
    }

    if (!searchQuery.trim()) {
      setProducts([])
      return
    }

    const timeoutId = setTimeout(() => {
      searchProducts(searchQuery)
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timeoutId)
  }, [catalogLoading, searchQuery, searchProducts, SEARCH_DEBOUNCE_MS])

  // Re-run search when catalog finishes loading
  useEffect(() => {
    if (!catalogLoading && catalog.length > 0 && searchQuery.trim().length >= MIN_SEARCH_LENGTH) {
      void searchProducts(searchQuery)
    }
  }, [catalogLoading, catalog, searchProducts, searchQuery])

  const searchByBarcode = async (barcode: string) => {
    const trimmed = barcode.trim()
    if (!trimmed) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const normalized = trimmed.toLowerCase()
      const match = catalog.find((item) =>
        (item.barcode ? item.barcode.toLowerCase() === normalized : false) ||
        item.sku.toLowerCase() === normalized
      )

      if (!match) {
        setError(`No product found with barcode/SKU: ${trimmed}`)
        return
      }

      await fetchStockLevels([match.id])

      setQuantities((prev) => ({
        ...prev,
        [match.id]: prev[match.id] ?? 1,
      }))

      await handleAddToCart(match.id, 1)

      setBarcodeInput('')
    } catch (err) {
      console.error('Barcode scan error:', err)
      setError('Failed to scan barcode')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = async (productId: UUID, quantity: number = 1) => {
    let activeSaleId = saleId

    if (!activeSaleId) {
      if (!ensureSaleSession) {
        setError('Please create a sale first')
        return
      }

      // In multi-storefront mode, determine which storefront this product is from
      let preferredStorefrontId: UUID | undefined
      if (multiStorefront) {
        const product = catalog.find((item) => item.id === productId)
        if (product && product.locations && product.locations.length > 0) {
          // Use the first storefront that has this product
          const primaryLocation = product.locations.find(loc => loc.available_quantity > 0)
          if (primaryLocation) {
            preferredStorefrontId = primaryLocation.storefront_id
            console.log(`🏪 Creating cart for storefront: ${primaryLocation.storefront_name}`, {
              productId,
              productName: product.name,
              storefrontId: preferredStorefrontId,
              storefrontName: primaryLocation.storefront_name
            })
          }
        }
      }

      const ensuredSaleId = await ensureSaleSession(preferredStorefrontId)
      if (!ensuredSaleId) {
        if (saleType === 'WHOLESALE') {
          setError('Select a customer before starting a wholesale sale.')
        } else {
          setError('Unable to start a new sale. Please try again.')
        }
        return
      }
      activeSaleId = ensuredSaleId
    }

    let stock = stockData[productId]
    if (!stock) {
      const product = catalog.find((item) => item.id === productId)
      if (product && product.stock_product_ids.length > 0) {
        const fallbackStock: StockRecord = {
          id: product.stock_product_ids[0],
          product: product.id,
          quantity: product.available_quantity,
          available_quantity: product.available_quantity,
          reserved_quantity: 0,
          unit_cost: 0,
          retail_price: product.retail_price,
          wholesale_price: product.wholesale_price,
          batch_number: undefined,
          expiry_date: null,
        }
        stock = fallbackStock
        setStockData((prev) => {
          const next = { ...prev, [productId]: fallbackStock }
          stockDataRef.current = next
          return next
        })
      }
    }

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
          saleId: activeSaleId,
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
      if (typeof err === 'string') {
        setError(err)
      } else if (err && typeof err === 'object') {
        const errorObject = err as { userMessage?: string; message?: string }
        setError(errorObject.userMessage || errorObject.message || "We couldn't add that product right now. Please try again.")
      } else {
        setError("We couldn't add that product right now. Please try again.")
      }
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

  const getStockStatus = (product: Product) => {
    const stock = stockData[product.id]
    
    // In multi-storefront mode with locations data
    if (product.locations && product.locations.length > 0 && storefrontId) {
      // Find the current storefront in the locations array
      const currentLocationStock = product.locations.find(loc => loc.storefront_id === storefrontId)
      const storefrontAvailable = currentLocationStock?.available_quantity ?? 0
      const totalAvailable = product.available_quantity ?? 0
      
      const available = Number.isFinite(storefrontAvailable) ? Math.max(0, Math.floor(storefrontAvailable)) : 0
      const total = Number.isFinite(totalAvailable) ? Math.max(0, Math.floor(totalAvailable)) : 0
      
      if (available === 0) {
        // Check if stock exists elsewhere
        if (total > 0) {
          return { color: 'danger', text: `Out of Stock (${total} at other stores)`, available: 0 }
        }
        return { color: 'danger', text: 'Out of Stock', available: 0 }
      }
      
      // Show both storefront and total if they differ
      let text = ''
      if (total > available) {
        // Stock exists at other locations
        if (available <= 5) {
          text = `Low: ${available} here (${total} total)`
        } else {
          text = `${available} here (${total} total)`
        }
      } else {
        // All stock is at this location
        if (available <= 5) {
          text = `Low: ${available}`
        } else {
          text = `${available} in stock`
        }
      }
      
      const color = available <= 5 ? 'warning' : 'success'
      return { color, text, available }
    }
    
    // Single storefront mode or no locations data
    const availableSource = stock?.available_quantity ?? product.available_quantity ?? 0
    const available = Number.isFinite(availableSource) ? Math.max(0, Math.floor(availableSource)) : 0

    // Get warehouse total if available (from fetched stock data)
    const warehouseTotal = stock?.quantity ?? null
    const warehouseTotalNum = warehouseTotal !== null && Number.isFinite(warehouseTotal) ? Math.max(0, Math.floor(warehouseTotal)) : null

    if (available === 0) {
      return { color: 'danger', text: 'Out of Stock', available: 0 }
    }

    // Show both storefront and warehouse quantities if they differ
    let text = ''
    if (warehouseTotalNum !== null && warehouseTotalNum !== available) {
      // Different values - show both
      if (available <= 5) {
        text = `Low: ${available} here (${warehouseTotalNum} total)`
      } else {
        text = `${available} here (${warehouseTotalNum} total)`
      }
    } else {
      // Same value or no warehouse data - show single value
      if (available <= 5) {
        text = `Low: ${available}`
      } else {
        text = `${available} in stock`
      }
    }

    const color = available <= 5 ? 'warning' : 'success'
    return { color, text, available }
  }

  const getPrice = (product: Product) => {
    const stock = stockData[product.id]
    const priceSource = saleType === 'WHOLESALE'
      ? stock?.wholesale_price ?? product.wholesale_price
      : stock?.retail_price ?? product.retail_price

    return typeof priceSource === 'number' && Number.isFinite(priceSource) ? priceSource : 0
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
      {products.length > 0 && !catalogLoading && (
        <Card className="mt-3">
          <Card.Header>
            <strong>Search Results</strong> ({products.length} {products.length === 1 ? 'item' : 'items'})
          </Card.Header>
          <Card.Body className="p-0">
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {products.map((product) => {
                const stockStatus = getStockStatus(product)
                const price = getPrice(product)
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
                          disabled={
                            stockStatus.available === 0 ||
                            isAdding ||
                            disabled ||
                            (!saleId && !ensureSaleSession)
                          }
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
      {!catalogLoading && !loading && searchQuery && products.length === 0 && (
        <Alert variant="info" className="mt-3">
          No products found matching "{searchQuery}"
        </Alert>
      )}

      {catalogLoading && (
        <Alert variant="secondary" className="mt-3">
          Loading storefront catalog…
        </Alert>
      )}
    </div>
  )
}

