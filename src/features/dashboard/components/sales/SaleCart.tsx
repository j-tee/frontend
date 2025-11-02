import { useState } from 'react'
import { Card, Table, Button, Badge, Form, InputGroup, Spinner } from 'react-bootstrap'
import { useAppDispatch } from '../../../../hooks'
import { useCurrency } from '../../../../hooks/useCurrency'
import { updateCartItem, removeCartItem } from '../../../../store/slices/salesSlice'
import { calculateSaleTotals } from '../../../../utils/salesTotals'
import type { Sale } from '../../../../types/sales'
import type { UUID } from '../../../../types/common'

interface SaleCartProps {
  cart: Sale | null
  onCheckout?: () => void | Promise<void>
  disabled?: boolean
  checkoutLoading?: boolean
}

export function SaleCart({ cart, onCheckout, disabled, checkoutLoading }: SaleCartProps) {
  const saleId = cart?.id
  const dispatch = useAppDispatch()
  const { formatCurrency } = useCurrency()
  const [editingItem, setEditingItem] = useState<UUID | null>(null)
  const [updatingItem, setUpdatingItem] = useState<UUID | null>(null)
  const [removingItem, setRemovingItem] = useState<UUID | null>(null)

  // Calculate totals from line items if backend doesn't provide them
  const totals = calculateSaleTotals(cart)


  const handleQuantityChange = async (itemId: UUID, newQuantity: number) => {
    if (newQuantity < 1) return

    if (!saleId) return

    try {
      setUpdatingItem(itemId)
      await dispatch(
        updateCartItem({
          saleId,
          itemId,
          quantity: newQuantity,
        })
      ).unwrap()
      setEditingItem(null)
    } catch (err) {
    } finally {
      setUpdatingItem(null)
    }
  }

  const handleDiscountChange = async (itemId: UUID, discountPercentage: number) => {
    if (discountPercentage < 0 || discountPercentage > 100) return
    if (!saleId) return

    try {
      setUpdatingItem(itemId)
      await dispatch(
        updateCartItem({
          saleId,
          itemId,
          discountPercentage,
        })
      ).unwrap()
    } catch (err) {
    } finally {
      setUpdatingItem(null)
    }
  }

  const handleRemoveItem = async (itemId: UUID) => {
    if (!window.confirm('Remove this item from cart?')) return
    if (!saleId) return

    try {
      setRemovingItem(itemId)
      await dispatch(removeCartItem({ saleId, itemId })).unwrap()
    } catch (err) {
    } finally {
      setRemovingItem(null)
    }
  }

  if (!cart) {
    return (
      <Card>
        <Card.Header>
          <h6 className="mb-0">Shopping Cart</h6>
        </Card.Header>
        <Card.Body>
          <div className="text-center text-muted py-5">
            <p>No active sale</p>
            <small>Select a storefront to start</small>
          </div>
        </Card.Body>
      </Card>
    )
  }

  const hasItems = cart.line_items && cart.line_items.length > 0

  return (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h6 className="mb-0">Shopping Cart</h6>
        <Badge bg={cart.status === 'DRAFT' ? 'warning' : 'success'}>
          {cart.status}
        </Badge>
      </Card.Header>
      <Card.Body className="p-0">
        {hasItems ? (
          <>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Table striped hover className="mb-0">
                <thead className="table-light sticky-top">
                  <tr>
                    <th>Product</th>
                    <th style={{ width: '100px' }}>Qty</th>
                    <th style={{ width: '120px' }}>Price</th>
                    <th style={{ width: '100px' }}>Disc %</th>
                    <th style={{ width: '120px' }} className="text-end">Total</th>
                    <th style={{ width: '80px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.line_items.map((item) => {
                    const isEditing = editingItem === item.id
                    const isUpdating = updatingItem === item.id
                    const isRemoving = removingItem === item.id

                    return (
                      <tr key={item.id} className={isRemoving ? 'opacity-50' : ''}>
                        <td>
                          <div>
                            <strong>{item.product_name}</strong>
                            <br />
                            <small className="text-muted">SKU: {item.product_sku}</small>
                          </div>
                        </td>
                        <td>
                          {isEditing ? (
                            <Form.Control
                              type="number"
                              size="sm"
                              min="1"
                              defaultValue={item.quantity}
                              onBlur={(e) => handleQuantityChange(item.id, parseInt(e.target.value))}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleQuantityChange(item.id, parseInt((e.target as HTMLInputElement).value))
                                }
                              }}
                              disabled={isUpdating}
                              autoFocus
                            />
                          ) : (
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 text-decoration-none"
                              onClick={() => setEditingItem(item.id)}
                              disabled={disabled}
                            >
                              {item.quantity}
                            </Button>
                          )}
                        </td>
                        <td>{formatCurrency(parseFloat(item.unit_price?.toString() || '0'))}</td>
                        <td>
                          <InputGroup size="sm">
                            <Form.Control
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              defaultValue={item.discount_percentage}
                              onBlur={(e) => handleDiscountChange(item.id, parseFloat(e.target.value))}
                              disabled={disabled || isUpdating}
                            />
                            <InputGroup.Text>%</InputGroup.Text>
                          </InputGroup>
                        </td>
                        <td className="text-end">
                          <strong>{formatCurrency(parseFloat(item.total_price?.toString() || '0'))}</strong>
                          {item.discount_amount > 0 && (
                            <>
                              <br />
                              <small className="text-success">
                                -{formatCurrency(parseFloat(item.discount_amount?.toString() || '0'))}
                              </small>
                            </>
                          )}
                        </td>
                        <td>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={disabled || isRemoving}
                          >
                            {isRemoving ? <Spinner animation="border" size="sm" /> : '✕'}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            </div>

            {/* Totals */}
            <div className="border-top p-3 bg-light">
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal:</span>
                <strong>{formatCurrency(totals.subtotal)}</strong>
              </div>
              {totals.discount > 0 && (
                <div className="d-flex justify-content-between mb-2 text-success">
                  <span>Discount:</span>
                  <strong>-{formatCurrency(totals.discount)}</strong>
                </div>
              )}
              {totals.tax > 0 && (
                <div className="d-flex justify-content-between mb-2">
                  <span>Tax:</span>
                  <strong>{formatCurrency(totals.tax)}</strong>
                </div>
              )}
              <div className="d-flex justify-content-between border-top pt-2 fs-5">
                <strong>Total:</strong>
                <strong>{formatCurrency(totals.total)}</strong>
              </div>
            </div>

            {/* Checkout Button */}
            <div className="p-3 border-top">
              <Button
                variant="success"
                size="lg"
                className="w-100"
                onClick={() => {
                  if (onCheckout) {
                    void onCheckout()
                  }
                }}
                disabled={disabled || !hasItems}
              >
                {checkoutLoading ? 'Preparing checkout…' : 'Proceed to Checkout'}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center text-muted py-5">
            <p>Cart is empty</p>
            <small>Search and add products to begin</small>
          </div>
        )}
      </Card.Body>
    </Card>
  )
}
