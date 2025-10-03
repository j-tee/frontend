import { useState, useEffect, useCallback } from 'react'
import { Container, Row, Col, Card, Button, Tab, Tabs, Alert } from 'react-bootstrap'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import {
  selectCurrentCart,
  selectMutations,
  selectErrors,
  createSale,
  clearCart,
  clearMutationError,
} from '../../../store/slices/salesSlice'
import { selectActiveLocation } from '../../../store/slices/locationSlice'
import {
  SaleCart,
  ProductSearchPanel,
  CustomerSelectPanel,
  PaymentPanel,
  SalesHistory,
} from '../components/sales'
import type { UUID } from '../../../types/common'

const SalesPage = () => {
  const dispatch = useAppDispatch()
  const currentCart = useAppSelector(selectCurrentCart)
  const currentLocation = useAppSelector(selectActiveLocation)
  const mutations = useAppSelector(selectMutations)
  const errors = useAppSelector(selectErrors)
  
  const [activeTab, setActiveTab] = useState<'new-sale' | 'history'>('new-sale')
  const [saleType, setSaleType] = useState<'RETAIL' | 'WHOLESALE'>('RETAIL')
  const [selectedCustomer, setSelectedCustomer] = useState<UUID | null>(null)
  const [showPayment, setShowPayment] = useState(false)

  // Start new cart when location is selected
  const handleStartNewSale = useCallback(async () => {
    if (!currentLocation) {
      return
    }

    await dispatch(
      createSale({
        storefront: currentLocation.id,
        type: saleType,
        customer: selectedCustomer || undefined,
      })
    )
  }, [currentLocation, saleType, selectedCustomer, dispatch])

  useEffect(() => {
    if (currentLocation && !currentCart && activeTab === 'new-sale') {
      handleStartNewSale()
    }
  }, [currentLocation, currentCart, activeTab, handleStartNewSale])

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear this sale?')) {
      dispatch(clearCart())
    }
  }

  const handleCheckout = () => {
    setShowPayment(true)
  }

  const handlePaymentComplete = () => {
    setShowPayment(false)
    dispatch(clearCart())
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>Sales</h2>
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k as 'new-sale' | 'history')}
        className="mb-3"
      >
        <Tab eventKey="new-sale" title="New Sale">
          {!currentLocation ? (
            <Alert variant="warning">
              Please select a storefront from the dropdown above to start making sales.
            </Alert>
          ) : (
            <Row>
              {/* Left Panel - Product Search & Cart */}
              <Col lg={8}>
                <Card className="mb-3">
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <div>
                      <h5 className="mb-0">Point of Sale</h5>
                      {currentCart && (
                        <small className="text-muted">
                          Receipt: {currentCart.receipt_number}
                        </small>
                      )}
                    </div>
                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => setSaleType(saleType === 'RETAIL' ? 'WHOLESALE' : 'RETAIL')}
                        disabled={!!currentCart}
                      >
                        {saleType}
                      </Button>
                      {currentCart && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={handleClearCart}
                        >
                          Clear Cart
                        </Button>
                      )}
                    </div>
                  </Card.Header>
                  <Card.Body>
                    {errors.createSale && (
                      <Alert
                        variant="danger"
                        dismissible
                        onClose={() => dispatch(clearMutationError('createSale'))}
                      >
                        {errors.createSale}
                      </Alert>
                    )}

                    {/* Product Search */}
                    <ProductSearchPanel
                      storefrontId={currentLocation.id}
                      saleId={currentCart?.id}
                      disabled={!currentCart}
                    />

                    {/* Shopping Cart */}
                    <div className="mt-4">
                      <SaleCart
                        cart={currentCart}
                        onCheckout={handleCheckout}
                        loading={mutations.checkout === 'loading'}
                      />
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              {/* Right Panel - Customer & Payment */}
              <Col lg={4}>
                {/* Customer Selection */}
                <Card className="mb-3">
                  <Card.Header>
                    <h6 className="mb-0">Customer</h6>
                  </Card.Header>
                  <Card.Body>
                    <CustomerSelectPanel
                      saleType={saleType}
                      selectedCustomer={selectedCustomer}
                      onCustomerChange={setSelectedCustomer}
                      disabled={!!currentCart}
                    />
                  </Card.Body>
                </Card>

                {/* Payment Panel - Shows when checkout clicked */}
                {showPayment && currentCart && (
                  <PaymentPanel
                    cart={currentCart}
                    onComplete={handlePaymentComplete}
                    onCancel={() => setShowPayment(false)}
                  />
                )}

                {/* Quick Stats */}
                <Card>
                  <Card.Header>
                    <h6 className="mb-0">Today's Stats</h6>
                  </Card.Header>
                  <Card.Body>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Transactions:</span>
                      <strong>0</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Total Sales:</span>
                      <strong>GH₵ 0.00</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Avg Transaction:</span>
                      <strong>GH₵ 0.00</strong>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Tab>

        <Tab eventKey="history" title="Sales History">
          <SalesHistory />
        </Tab>
      </Tabs>
    </Container>
  )
}

export default SalesPage
