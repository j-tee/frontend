import { useState } from 'react'
import { Card, Table, Button, Badge, Form, InputGroup, Spinner } from 'react-bootstrap'
import { useAppDispatch } from '../../../../hooks'
import { updateCartItem, removeCartItem } from '../../../../store/slices/salesSlice'
import type { Sale } from '../../../../types/sales'
import type { UUID } from '../../../../types/common'

interface SaleCartProps {
  cart: Sale | null
  onCheckout?: () => void
  disabled?: boolean
}

// Helper function to safely format prices (handles both strings and numbers)
const formatPrice = (price: number | string | undefined): string => {
  if (price === undefined || price === null) return '0.00'
  const numPrice = typeof price === 'string' ? parseFloat(price) : price
  return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2)
}

export function SaleCart({ cart, onCheckout, disabled }: SaleCartProps) {
  const saleId = cart?.id
  const dispatch = useAppDispatch()
  const [editingItem, setEditingItem] = useState<UUID | null>(null)
  const [updatingItem, setUpdatingItem] = useState<UUID | null>(null)
  const [removingItem, setRemovingItem] = useState<UUID | null>(null)

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
      console.error('Failed to update quantity:', err)
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
      console.error('Failed to update discount:', err)
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
      console.error('Failed to remove item:', err)
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
                        <td>GH₵ {formatPrice(item.unit_price)}</td>
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
                          <strong>GH₵ {formatPrice(item.total_price)}</strong>
                          {item.discount_amount > 0 && (
                            <>
                              <br />
                              <small className="text-success">
                                -GH₵ {formatPrice(item.discount_amount)}
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
                <strong>GH₵ {formatPrice(cart.subtotal)}</strong>
              </div>
              {cart.discount_amount > 0 && (
                <div className="d-flex justify-content-between mb-2 text-success">
                  <span>Discount:</span>
                  <strong>-GH₵ {formatPrice(cart.discount_amount)}</strong>
                </div>
              )}
              {cart.tax_amount > 0 && (
                <div className="d-flex justify-content-between mb-2">
                  <span>Tax:</span>
                  <strong>GH₵ {formatPrice(cart.tax_amount)}</strong>
                </div>
              )}
              <div className="d-flex justify-content-between border-top pt-2 fs-5">
                <strong>Total:</strong>
                <strong>GH₵ {formatPrice(cart.total_amount)}</strong>
              </div>
            </div>

            {/* Checkout Button */}
            <div className="p-3 border-top">
              <Button
                variant="success"
                size="lg"
                className="w-100"
                onClick={onCheckout}
                disabled={disabled || !hasItems}
              >
                Proceed to Checkout
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
