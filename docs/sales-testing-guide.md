# Sales Feature - Testing Guide

**Date:** October 3, 2025  
**Status:** ✅ **PHASE 1 COMPLETE - READY FOR TESTING**

---

## 🎯 Testing Overview

This guide provides step-by-step instructions for testing the newly implemented Sales feature (Phase 1). All critical POS features are now functional and ready for backend integration testing.

---

## ✅ Implemented Features (Phase 1)

### 1. Product Search Component ✅
- Text search with 300ms debounce
- Barcode scanner with auto-add
- Real-time stock level indicators
- Product grid display
- Quick "Add to Cart" functionality

### 2. Enhanced Cart Management ✅
- Display line items with full details
- Edit item quantities (click-to-edit)
- Remove items from cart
- Item-level discount inputs
- Real-time totals calculation

### 3. Checkout Flow ✅
- Payment method selection
- Amount paid input
- Change calculation
- Complete sale button
- Receipt generation (backend)

### 4. Customer Selection 🟡
- Dropdown with hardcoded customers
- New customer button (placeholder)
- **NOTE:** Customer management to be enhanced in Phase 2

---

## 🧪 Test Scenarios

### Prerequisites

Before testing, ensure:
1. ✅ Backend is running on `http://localhost:8000`
2. ✅ You have valid login credentials
3. ✅ At least one storefront exists
4. ✅ Products with stock are available
5. ✅ Migrations are applied

---

## Test 1: Product Search

### 1.1 Text Search
**Steps:**
1. Navigate to Sales page
2. Select a storefront
3. Type "milk" in the search bar
4. Wait 300ms for debounce

**Expected Results:**
- ✅ Loading spinner appears during search
- ✅ Products matching "milk" display in grid
- ✅ Each product shows:
  - Product image (or placeholder 📦)
  - Product name and SKU
  - Category name
  - Stock status badge (red/yellow/green)
  - Price (retail or wholesale)
  - "Add to Cart" button
- ✅ Stock indicators:
  - 🟢 Green "X in stock" if qty > 5
  - 🟡 Yellow "Low: X" if 1 ≤ qty ≤ 5
  - 🔴 Red "Out of Stock" if qty = 0
- ✅ Add button disabled if out of stock

**API Called:**
```
GET /inventory/api/products/?search=milk&is_active=true
GET /inventory/api/stock-products/?storefront={id}&product__in={ids}
```

---

### 1.2 Barcode Scanner
**Steps:**
1. Focus on barcode input field (camera icon 📷)
2. Scan barcode (or manually enter: 1234567890123)
3. Press "Scan" button or hit Enter

**Expected Results:**
- ✅ Loading spinner appears
- ✅ If product found:
  - Product automatically added to cart
  - Barcode input clears
  - Cart updates with new item
- ✅ If product not found:
  - Error alert: "No product found with barcode: XXXX"
  - No item added to cart

**API Called:**
```
GET /inventory/api/products/by-barcode/1234567890123/
POST /sales/api/sales/{id}/add_item/
```

**Edge Cases:**
- Invalid barcode → 404 error shown
- Barcode for out-of-stock product → Error: "Only 0 available"
- Scanning while cart doesn't exist → Error: "Please create a sale first"

---

## Test 2: Add to Cart

### 2.1 Normal Add
**Steps:**
1. Search for a product with stock
2. Click "Add to Cart" button

**Expected Results:**
- ✅ Button shows spinner while adding
- ✅ Item appears in cart table
- ✅ Cart shows:
  - Product name and SKU
  - Quantity: 1
  - Unit price
  - Discount: 0%
  - Total price
  - Remove button (✕)
- ✅ Stock indicator updates (available qty decreases by 1)
- ✅ Search results clear
- ✅ Cart totals recalculate:
  - Subtotal
  - Discount amount
  - Tax amount (if any)
  - Total

**API Called:**
```
POST /sales/api/sales/{id}/add_item/
{
  "product": "uuid",
  "stock_product": "uuid",
  "quantity": 1,
  "unit_price": 10.00
}
```

---

### 2.2 Add Multiple Quantities
**Steps:**
1. Add product A to cart (qty: 1)
2. Add product A again

**Expected Results:**
- ✅ New line item created (separate row)
- ✅ Cart shows 2 rows for product A
- ✅ Each row independently editable

**NOTE:** Backend handles duplicate items as separate line items (not quantity increment). This is by design for flexibility.

---

### 2.3 Stock Validation
**Steps:**
1. Find product with stock = 3
2. Add to cart
3. Add to cart again
4. Add to cart again (total qty = 3)
5. Try adding one more time

**Expected Results:**
- ✅ First 3 additions succeed
- ✅ 4th addition fails with error: "Only 0 available"
- ✅ Cart shows 3 items
- ✅ Product search shows "Out of Stock" badge

**What Happened:**
- Backend reserved stock for each cart item (30-min expiry)
- Available quantity = actual stock - reserved quantity
- Prevents overselling

---

## Test 3: Edit Cart Items

### 3.1 Edit Quantity
**Steps:**
1. Add product to cart (qty: 2)
2. Click on quantity value in cart
3. Input field appears
4. Change to 5
5. Press Enter or click outside

**Expected Results:**
- ✅ Quantity changes from 2 to 5
- ✅ Loading indicator on row
- ✅ Total price updates (qty × unit_price)
- ✅ Cart subtotal/total recalculate
- ✅ Stock availability updates

**API Called:**
```
PATCH /sales/api/sale-items/{item_id}/
{
  "quantity": 5
}
```

**Edge Cases:**
- Change to 0 or negative → No API call (validation)
- Change to more than available → Backend error: "Insufficient stock"

---

### 3.2 Apply Item Discount
**Steps:**
1. Add product to cart (price: 100)
2. Enter "10" in discount % field
3. Tab or click outside

**Expected Results:**
- ✅ Discount percentage updates to 10%
- ✅ Discount amount shows: -GH₵ 10.00
- ✅ Total price updates: GH₵ 90.00
- ✅ Cart discount_amount increases
- ✅ Cart total decreases

**API Called:**
```
PATCH /sales/api/sale-items/{item_id}/
{
  "discount_percentage": 10.0
}
```

**Validation:**
- Discount < 0 → No API call
- Discount > 100 → No API call

---

### 3.3 Remove Item
**Steps:**
1. Add 3 products to cart
2. Click remove button (✕) on 2nd product
3. Confirm in dialog

**Expected Results:**
- ✅ Confirmation dialog: "Remove this item from cart?"
- ✅ After confirm:
  - Row shows loading spinner
  - Row disappears
  - Cart has 2 items remaining
  - Totals recalculate
  - Stock reservation released (product available again)

**API Called:**
```
DELETE /sales/api/sale-items/{item_id}/
```

**Edge Case:**
- Cancel confirmation → No API call, item remains

---

## Test 4: Checkout Flow

### 4.1 Cash Payment
**Steps:**
1. Add items to cart (total: GH₵ 45.50)
2. Click "Proceed to Checkout"
3. Select "Cash" payment method
4. Enter amount: 50.00
5. Verify change: 4.50
6. Click "Complete Sale"

**Expected Results:**
- ✅ Payment panel shows
- ✅ Payment method: Cash selected
- ✅ Amount input accepts 50.00
- ✅ Change calculated: GH₵ 4.50
- ✅ Quick amount buttons work (10/20/50/100/200/Exact)
- ✅ Complete button enabled
- ✅ After submit:
  - Loading spinner on button
  - Success message
  - Receipt number generated
  - Cart clears
  - New sale created
  - Stock committed (qty reduced permanently)
  - Reservations released

**API Called:**
```
POST /sales/api/sales/{id}/complete/
{
  "payment_type": "CASH",
  "amount_paid": 50.00,
  "notes": ""
}
```

**Response:**
```json
{
  "id": "uuid",
  "receipt_number": "REC-2025-00001",
  "status": "COMPLETED",
  "total_amount": 45.50,
  "amount_paid": 50.00,
  "amount_due": 0.00,
  "completed_at": "2025-10-03T14:30:00Z"
}
```

---

### 4.2 Insufficient Payment
**Steps:**
1. Cart total: GH₵ 45.50
2. Enter amount: 40.00
3. Try to complete sale

**Expected Results:**
- ✅ Change shows: -GH₵ 5.50 (negative, red)
- ✅ Complete button disabled
- ✅ Validation message: "Amount must be ≥ total"

---

### 4.3 Credit Sale (Wholesale)
**Steps:**
1. Toggle sale type to "WHOLESALE"
2. Select customer from dropdown
3. Add items (should show wholesale prices)
4. Checkout
5. Select "Credit" payment method
6. Complete sale

**Expected Results:**
- ✅ Products show wholesale_price (not retail_price)
- ✅ Customer dropdown required for credit
- ✅ Credit payment option enabled
- ✅ After complete:
  - Sale status: PENDING (if amount_due > 0)
  - Customer outstanding_balance increases
  - Customer available_credit decreases

**Backend Validation:**
- Credit limit check
- Credit block check
- Overdue balance check (if configured)

---

## Test 5: Multi-Storefront

### 5.1 Storefront Switching
**Steps:**
1. Select Storefront A
2. Add product to cart
3. Switch to Storefront B

**Expected Results:**
- ✅ Current cart cleared
- ✅ New sale created for Storefront B
- ✅ Product search shows Storefront B inventory
- ✅ Stock levels reflect Storefront B availability

**Why:**
- Each sale tied to single storefront
- Stock reservations are storefront-specific
- Prevents cross-location stock issues

---

## Test 6: Error Handling

### 6.1 Network Error
**Steps:**
1. Stop backend server
2. Try to search products

**Expected Results:**
- ✅ Error alert: "Failed to search products"
- ✅ No crash
- ✅ Can dismiss alert
- ✅ Can retry after backend restarts

---

### 6.2 Stock Conflict
**Steps:**
1. User A adds last 5 items to cart
2. User B tries to add same product

**Expected Results:**
- ✅ User A: Success (stock reserved)
- ✅ User B: Error "Only 0 available"

---

### 6.3 Expired Reservation
**Steps:**
1. Add product to cart
2. Wait 30+ minutes (or manually expire reservation in backend)
3. Try to checkout

**Expected Results:**
- ✅ Checkout fails
- ✅ Error message: "Stock no longer available"
- ✅ Cart item shows error state

**Solution:**
- User removes and re-adds item (new reservation created)

---

## Test 7: Sale Type Switching

### 7.1 Retail → Wholesale
**Steps:**
1. Sale type: RETAIL
2. Add product A (retail price: GH₵ 100)
3. Switch to WHOLESALE
4. Confirm change

**Expected Results:**
- ✅ Confirmation dialog
- ✅ Current cart cleared
- ✅ New wholesale cart created
- ✅ Product search now shows wholesale prices

**Product Search Display:**
- Retail mode: Shows `retail_price`
- Wholesale mode: Shows `wholesale_price`

---

## 🎯 Acceptance Criteria

Phase 1 is **COMPLETE** when all these work:

### Product Search ✅
- [ ] Can search products by name
- [ ] Can search products by SKU
- [ ] Can scan barcodes
- [ ] Stock levels display correctly
- [ ] Add to cart works
- [ ] Out of stock items can't be added

### Cart Management ✅
- [ ] Items display with all details
- [ ] Can edit quantity (click-to-edit)
- [ ] Can apply item discounts
- [ ] Can remove items
- [ ] Totals calculate correctly
- [ ] Stock updates in real-time

### Checkout ✅
- [ ] Cash payment works
- [ ] Change calculates correctly
- [ ] Quick amount buttons work
- [ ] Insufficient payment validation
- [ ] Receipt number generated
- [ ] Stock commits on checkout

### Customer & Credit 🟡
- [ ] Can select customer (hardcoded)
- [ ] Credit sales work
- [ ] Credit limit enforced (backend)

### Multi-tenant ✅
- [ ] Storefront isolation works
- [ ] Can switch storefronts
- [ ] Each sale tied to one location

---

## 🐛 Known Issues

### 1. Customer Management
**Status:** 🟡 Placeholder  
**Issue:** Customer dropdown has 3 hardcoded options  
**Impact:** Low - functional for testing  
**Fix:** Phase 2 - Build customer CRUD components

### 2. Sales History
**Status:** 🟡 Placeholder  
**Issue:** Shows "No sales history yet" message  
**Impact:** Low - can query sales via Postman  
**Fix:** Phase 2 - Build sales list with filters

### 3. Payment Methods
**Status:** 🟡 Partial  
**Issue:** Card and MoMo payment show inputs but don't integrate with processors  
**Impact:** Medium - can test with cash/credit only  
**Fix:** Phase 2 - Stripe and MTN MOMO integration

---

## 📊 Test Coverage Report

| Component | Unit Tests | Integration Tests | E2E Tests |
|-----------|------------|-------------------|-----------|
| ProductSearchPanel | ❌ Not written | ✅ Manual testing | ❌ Not written |
| SaleCart | ❌ Not written | ✅ Manual testing | ❌ Not written |
| PaymentPanel | ❌ Not written | ✅ Manual testing | ❌ Not written |
| CustomerSelectPanel | ❌ Not written | ✅ Manual testing | ❌ Not written |
| salesSlice | ❌ Not written | ✅ API integration | ❌ Not written |

**NOTE:** Automated tests to be added in Phase 2

---

## 🚀 Testing Checklist

### Pre-Testing Setup
- [ ] Backend running on port 8000
- [ ] Database migrations applied
- [ ] Test data loaded (products, storefronts, stock)
- [ ] User account created with permissions
- [ ] Frontend running on port 3000 (or your dev server)

### Core Workflows
- [ ] Test 1: Product Search (1.1, 1.2)
- [ ] Test 2: Add to Cart (2.1, 2.2, 2.3)
- [ ] Test 3: Edit Cart Items (3.1, 3.2, 3.3)
- [ ] Test 4: Checkout Flow (4.1, 4.2, 4.3)
- [ ] Test 5: Multi-Storefront (5.1)
- [ ] Test 6: Error Handling (6.1, 6.2, 6.3)
- [ ] Test 7: Sale Type Switching (7.1)

### Edge Cases
- [ ] Empty cart checkout attempt
- [ ] Negative quantities
- [ ] Discount > 100%
- [ ] Special characters in search
- [ ] Very long product names
- [ ] Zero-price products
- [ ] Concurrent cart edits

---

## 📝 Bug Report Template

When you find a bug, report it with this format:

```markdown
### Bug: [Brief Description]

**Severity:** Critical | High | Medium | Low
**Component:** ProductSearch | SaleCart | PaymentPanel | Other

**Steps to Reproduce:**
1. Navigate to...
2. Click on...
3. Enter...
4. Observe...

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happened

**Screenshots/Logs:**
[Attach if available]

**Environment:**
- Frontend version: development branch, commit c8e6021
- Backend version: [Django version/commit]
- Browser: Chrome 118 / Firefox 119 / etc.
- OS: Ubuntu 22.04 / Windows 11 / macOS

**API Response (if applicable):**
```json
{
  "error": "message"
}
```
```

---

## 🎉 Next Steps After Testing

Once Phase 1 testing is complete:

1. **Document Issues** - Log all bugs found
2. **Fix Critical Bugs** - Address blockers
3. **Performance Testing** - Test with 1000+ products
4. **Load Testing** - Multiple concurrent users
5. **Phase 2 Planning** - Customer CRUD, Sales History, Reports

---

**Happy Testing! 🚀**

If you encounter any issues or have questions, refer to:
- `frontend-sales-integration-guide.md` - Complete API docs
- `sales-api-endpoints.md` - Quick endpoint reference
- `BACKEND-README-SALES.md` - Backend implementation guide

**Last Updated:** October 3, 2025  
**Tested By:** [Your Name]  
**Test Status:** ✅ Ready for QA
