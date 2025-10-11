# 📄 Receipt/Invoice System Requirements

**Feature Request**: Print/View receipts for completed sales  
**Current Status**: ❌ **Missing - Needs Implementation**  
**Date**: October 11, 2025  
**Priority**: 🔴 **HIGH** - Critical for business operations

---

## 🎯 Business Need

### The Problem

**Current Situation:**
```
User completes a sale:
- Customer: Fred Amugi (newly created)
- Type: WHOLESALE
- Products: Sugar 1kg × 10 = GH₵ 25.00
- Payment: CASH

✅ Sale saved to database
✅ Receipt number generated (e.g., "REC-2025-001234")
✅ Visible in Sales History tab

❌ NO WAY TO:
- Print physical receipt
- Email receipt to customer  
- View formatted invoice
- Show proof of purchase
- Display wholesale vs retail pricing on receipt
```

**Why This Matters:**
1. **Customer Proof**: Customers need receipts for their records
2. **Legal Requirement**: Many jurisdictions require receipts for tax purposes
3. **Business Records**: Physical/digital proof of transaction
4. **Returns**: Customers need receipts to process returns
5. **Accounting**: Receipts needed for bookkeeping/audits
6. **Trust**: Professional receipts build customer confidence

---

## 📋 What's Needed

### Backend Requirements ✅ (Likely Already Exists)

**Check if backend already provides:**

1. **Receipt Data Endpoint**
   ```
   GET /sales/api/sales/{sale_id}/
   
   Should return complete sale details:
   {
     "id": "uuid",
     "receipt_number": "REC-2025-001234",
     "type": "WHOLESALE",                    ← Need this!
     "status": "COMPLETED",
     "customer_id": "uuid",
     "customer_name": "Fred Amugi",
     "customer_phone": "4575467457646S",
     "customer_email": null,
     "storefront_id": "uuid",
     "storefront_name": "Cow Lane Store",
     "business_name": "Dialogues Systems",
     "business_address": "...",
     "business_phone": "...",
     "business_tin": "...",
     "total_amount": "25.00",
     "subtotal": "25.00",
     "tax_amount": "0.00",
     "discount_amount": "0.00",
     "amount_paid": "25.00",
     "amount_due": "0.00",
     "payment_type": "CASH",
     "completed_at": "2025-10-11T09:15:00Z",
     "line_items": [
       {
         "product_name": "Sugar 1kg",
         "sku": "FOOD-00003",
         "quantity": 10,
         "unit_price": "2.50",            ← Wholesale price
         "total_price": "25.00"
       }
     ]
   }
   ```

2. **PDF Generation Endpoint** (Optional - can be done frontend)
   ```
   GET /sales/api/sales/{sale_id}/receipt/pdf/
   
   Returns: PDF file for download/print
   ```

---

### Frontend Requirements 🚀 (Needs Implementation)

#### Option 1: Print Receipt (Recommended - Quick Win)

**Add Print Button to Sales History:**

```tsx
// In SalesHistory.tsx - Add to each sale row
<td>
  <Button 
    variant="outline-primary" 
    size="sm"
    onClick={() => handlePrintReceipt(sale.id)}
  >
    🖨️ Print Receipt
  </Button>
</td>
```

**Print Functionality:**

```tsx
const handlePrintReceipt = async (saleId: UUID) => {
  try {
    // Fetch full sale details
    const saleDetails = await getSaleDetails(saleId)
    
    // Open print window with formatted receipt
    const printWindow = window.open('', '_blank')
    printWindow.document.write(generateReceiptHTML(saleDetails))
    printWindow.document.close()
    printWindow.print()
  } catch (err) {
    console.error('Failed to print receipt', err)
  }
}
```

**Receipt Template:**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Receipt #{receipt_number}</title>
  <style>
    body { font-family: monospace; width: 80mm; }
    .header { text-align: center; margin-bottom: 20px; }
    .business-name { font-size: 18px; font-weight: bold; }
    .sale-type { 
      background: yellow; 
      padding: 5px; 
      font-weight: bold;
      text-align: center;
    }
    .items { margin: 20px 0; }
    .item { display: flex; justify-content: space-between; }
    .totals { border-top: 2px solid #000; padding-top: 10px; }
    .total-row { display: flex; justify-content: space-between; }
    .grand-total { font-size: 18px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div class="business-name">DIALOGUES SYSTEMS</div>
    <div>Cow Lane Store</div>
    <div>Phone: +233 XXX XXX XXX</div>
    <div>TIN: 123456789</div>
  </div>

  <!-- WHOLESALE INDICATOR -->
  <div class="sale-type">
    ⚠️ WHOLESALE SALE ⚠️
  </div>

  <div>Receipt: REC-2025-001234</div>
  <div>Date: 11 Oct 2025, 09:15 AM</div>
  <div>Customer: Fred Amugi</div>
  <div>Phone: 4575467457646S</div>
  
  <div class="items">
    <div class="item">
      <span>Sugar 1kg × 10</span>
      <span>GH₵ 25.00</span>
    </div>
    <div style="font-size: 12px; color: #666;">
      @ GH₵ 2.50 each (Wholesale)
    </div>
  </div>
  
  <div class="totals">
    <div class="total-row">
      <span>Subtotal:</span>
      <span>GH₵ 25.00</span>
    </div>
    <div class="total-row">
      <span>Tax:</span>
      <span>GH₵ 0.00</span>
    </div>
    <div class="total-row grand-total">
      <span>TOTAL:</span>
      <span>GH₵ 25.00</span>
    </div>
    <div class="total-row">
      <span>Paid (CASH):</span>
      <span>GH₵ 25.00</span>
    </div>
    <div class="total-row">
      <span>Change:</span>
      <span>GH₵ 0.00</span>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 30px;">
    Thank you for your business!
  </div>
</body>
</html>
```

---

#### Option 2: Receipt Modal (Better UX)

**Receipt View Modal Component:**

```tsx
// New file: ReceiptModal.tsx
import { Modal, Button, Table } from 'react-bootstrap'

interface ReceiptModalProps {
  show: boolean
  saleId: UUID
  onHide: () => void
}

export function ReceiptModal({ show, saleId, onHide }: ReceiptModalProps) {
  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (show && saleId) {
      loadSaleDetails()
    }
  }, [show, saleId])

  const loadSaleDetails = async () => {
    setLoading(true)
    try {
      const data = await getSaleDetails(saleId)
      setSale(data)
    } catch (err) {
      console.error('Failed to load sale', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          Receipt #{sale?.receipt_number}
          {sale?.type === 'WHOLESALE' && (
            <Badge bg="warning" className="ms-2">WHOLESALE</Badge>
          )}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
          </div>
        ) : sale ? (
          <div id="receipt-content">
            {/* Business Header */}
            <div className="text-center mb-4">
              <h4>{sale.business_name}</h4>
              <div>{sale.storefront_name}</div>
              <div>{sale.business_address}</div>
              <div>{sale.business_phone}</div>
              <div>TIN: {sale.business_tin}</div>
            </div>

            {/* Sale Type Warning */}
            {sale.type === 'WHOLESALE' && (
              <Alert variant="warning" className="text-center">
                <strong>⚠️ WHOLESALE SALE</strong>
              </Alert>
            )}

            {/* Receipt Details */}
            <Table borderless size="sm">
              <tbody>
                <tr>
                  <td><strong>Receipt:</strong></td>
                  <td>{sale.receipt_number}</td>
                </tr>
                <tr>
                  <td><strong>Date:</strong></td>
                  <td>{formatDateTime(sale.completed_at)}</td>
                </tr>
                <tr>
                  <td><strong>Customer:</strong></td>
                  <td>{sale.customer_name || 'Walk-in'}</td>
                </tr>
                {sale.customer_phone && (
                  <tr>
                    <td><strong>Phone:</strong></td>
                    <td>{sale.customer_phone}</td>
                  </tr>
                )}
              </tbody>
            </Table>

            {/* Line Items */}
            <Table bordered className="mt-4">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="text-end">Qty</th>
                  <th className="text-end">Price</th>
                  <th className="text-end">Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.line_items?.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      {item.product_name}
                      <br/>
                      <small className="text-muted">
                        SKU: {item.sku}
                        {sale.type === 'WHOLESALE' && ' (Wholesale)'}
                      </small>
                    </td>
                    <td className="text-end">{item.quantity}</td>
                    <td className="text-end">{formatCurrency(item.unit_price)}</td>
                    <td className="text-end">{formatCurrency(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="text-end"><strong>Subtotal:</strong></td>
                  <td className="text-end">{formatCurrency(sale.subtotal)}</td>
                </tr>
                {sale.tax_amount > 0 && (
                  <tr>
                    <td colSpan={3} className="text-end">Tax:</td>
                    <td className="text-end">{formatCurrency(sale.tax_amount)}</td>
                  </tr>
                )}
                {sale.discount_amount > 0 && (
                  <tr>
                    <td colSpan={3} className="text-end">Discount:</td>
                    <td className="text-end">-{formatCurrency(sale.discount_amount)}</td>
                  </tr>
                )}
                <tr className="table-active">
                  <td colSpan={3} className="text-end"><strong>TOTAL:</strong></td>
                  <td className="text-end"><strong>{formatCurrency(sale.total_amount)}</strong></td>
                </tr>
                <tr>
                  <td colSpan={3} className="text-end">Paid ({sale.payment_type}):</td>
                  <td className="text-end">{formatCurrency(sale.amount_paid)}</td>
                </tr>
                {sale.amount_due > 0 && (
                  <tr className="text-danger">
                    <td colSpan={3} className="text-end"><strong>Amount Due:</strong></td>
                    <td className="text-end"><strong>{formatCurrency(sale.amount_due)}</strong></td>
                  </tr>
                )}
              </tfoot>
            </Table>

            <div className="text-center mt-4 text-muted">
              <small>Thank you for your business!</small>
            </div>
          </div>
        ) : (
          <Alert variant="danger">Failed to load receipt details</Alert>
        )}
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>
          Close
        </Button>
        <Button variant="primary" onClick={handlePrint}>
          🖨️ Print Receipt
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
```

---

#### Option 3: PDF Download (Backend Required)

**If backend implements PDF generation:**

```tsx
const handleDownloadReceipt = async (saleId: UUID) => {
  try {
    const response = await fetch(`/sales/api/sales/${saleId}/receipt/pdf/`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt-${saleId}.pdf`
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Failed to download receipt', err)
  }
}
```

---

## 🎯 Recommended Implementation Plan

### Phase 1: Quick Win (1-2 hours) 🚀

**Simple Print Receipt:**
1. Add "View Receipt" button to Sales History
2. Fetch sale details from existing endpoint
3. Generate HTML receipt template
4. Use `window.print()` for printing
5. **Show WHOLESALE vs RETAIL prominently**

**Files to modify:**
- `SalesHistory.tsx` - Add button and print handler
- Create `utils/receiptTemplate.ts` - HTML template generator

**No backend changes needed** ✅

---

### Phase 2: Better UX (3-4 hours)

**Receipt Modal:**
1. Create `ReceiptModal.tsx` component
2. Add "Print" and "Email" buttons
3. Better formatted receipt view
4. Print-specific CSS (hide buttons when printing)

**Files to create:**
- `ReceiptModal.tsx`
- `ReceiptModal.module.css`

**No backend changes needed** ✅

---

### Phase 3: Professional (Backend Required)

**PDF Generation:**
1. Backend: Add PDF generation using library (ReportLab, WeasyPrint)
2. Backend: Add email receipt endpoint
3. Frontend: Add PDF download button
4. Frontend: Add email receipt form

**Backend files needed:**
- `sales/receipt_generator.py`
- `sales/views.py` - Add PDF/email endpoints
- `sales/templates/receipt.html` - PDF template

**Estimated time:** 4-6 hours (backend) + 2 hours (frontend)

---

## 🔍 What to Check First

### Backend Check

**Test this endpoint:**
```bash
GET /sales/api/sales/{sale_id}/

# Should return complete sale with:
- receipt_number
- type (RETAIL/WHOLESALE)  ← Critical!
- customer details
- line_items with prices
- payment details
- business details
- storefront details
```

**If backend already returns all this data → Phase 1 is easy** ✅

**If backend missing fields → Need backend updates first** ⚠️

---

## 📊 Receipt Examples

### Retail Receipt
```
================================
     DIALOGUES SYSTEMS
      Adenta Store
   123 Main Street, Accra
   Phone: +233 XXX XXX XXX
      TIN: 123456789
================================

Receipt: REC-2025-001234
Date: 11 Oct 2025, 09:15 AM
Customer: Walk-in Customer

--------------------------------
ITEMS:
--------------------------------
Rice 25kg × 2      GH₵ 200.00
  @ GH₵ 100.00 each (Retail)

Sugar 1kg × 5      GH₵  15.60
  @ GH₵ 3.12 each (Retail)

--------------------------------
Subtotal:          GH₵ 215.60
Tax:               GH₵   0.00
--------------------------------
TOTAL:             GH₵ 215.60
--------------------------------
Paid (CASH):       GH₵ 220.00
Change:            GH₵   4.40
================================

   Thank you for your business!
   
================================
```

### Wholesale Receipt
```
================================
     DIALOGUES SYSTEMS
    Cow Lane Store
   456 High Street, Accra
   Phone: +233 XXX XXX XXX
      TIN: 123456789
================================

     ⚠️ WHOLESALE SALE ⚠️

Receipt: REC-2025-001235
Date: 11 Oct 2025, 09:20 AM
Customer: Fred Amugi
Phone: 4575467457646S

--------------------------------
ITEMS:
--------------------------------
Sugar 1kg × 10     GH₵  25.00
  @ GH₵ 2.50 each (WHOLESALE)

Rice 25kg × 5      GH₵ 425.00
  @ GH₵ 85.00 each (WHOLESALE)

--------------------------------
Subtotal:          GH₵ 450.00
Tax:               GH₵   0.00
Discount:          GH₵   0.00
--------------------------------
TOTAL:             GH₵ 450.00
--------------------------------
Paid (CASH):       GH₵ 450.00
Amount Due:        GH₵   0.00
================================

   Thank you for your business!
   Wholesale Customer
   
================================
```

---

## 📝 Summary

### Current Status

**What Works:**
- ✅ Sales are recorded
- ✅ Receipt numbers generated
- ✅ Visible in Sales History
- ✅ Sale type (WHOLESALE/RETAIL) tracked

**What's Missing:**
- ❌ No way to view formatted receipt
- ❌ No print functionality
- ❌ No PDF download
- ❌ No email receipt option

### Immediate Action Required

**Option A: Frontend Only (Quick)**
- Implement print receipt functionality
- Use existing sale details endpoint
- **No backend changes needed**
- **Time: 1-2 hours**

**Option B: Full Featured (Better)**
- Backend: Add PDF generation
- Backend: Add email receipt
- Frontend: Receipt modal + print
- **Time: 6-8 hours total**

### Next Steps

1. **Check backend:** Does `/sales/api/sales/{id}/` return all needed data?
2. **Decide approach:** Simple print vs full PDF system?
3. **Implement:** Start with Phase 1 (print receipt)

---

**Priority**: 🔴 **HIGH**  
**Backend Required**: ⚠️ **Optional** (only for PDF/email)  
**Frontend Can Do**: ✅ **YES** (basic print functionality)  
**Estimated Time**: 1-2 hours (print) or 6-8 hours (full system)

