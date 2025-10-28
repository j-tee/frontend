# Credit Receipt Visual Reference

## Receipt Layout - Credit Sale

```
┌───────────────────────────────────────────────────────┐
│                                                       │
│              COMPANY NAME                             │
│              123 Main Street                          │
│              City, Country                            │
│              Tel: +123-456-7890                       │
│                                                       │
├───────────────────────────────────────────────────────┤
│                                                       │
│  Receipt #: RCP-2024-001                              │
│  Date: 2024-01-15 14:30:00                            │
│  Cashier: John Doe                                    │
│  Customer: Jane Smith                                 │
│                                                       │
├───────────────────────────────────────────────────────┤
│                                                       │
│          ┌─────────────────────┐                      │
│          │      RETAIL         │                      │
│          └─────────────────────┘                      │
│             (Blue Badge)                              │
│                                                       │
├═══════════════════════════════════════════════════════┤
│  ╔═══════════════════════════════════════════════╗   │
│  ║                                               ║   │
│  ║         ⚠️  CREDIT SALE  ⚠️                  ║   │
│  ║                                               ║   │
│  ║     Payment on credit - Customer to pay       ║   │
│  ║                  later                        ║   │
│  ║                                               ║   │
│  ║          Amount Due: ₱1,200.00               ║   │
│  ║                                               ║   │
│  ╚═══════════════════════════════════════════════╝   │
│                                                       │
│         (RED BACKGROUND + BOLD RED BORDER)            │
│                                                       │
├───────────────────────────────────────────────────────┤
│                                                       │
│  ITEMS                                                │
│  ────────────────────────────────────────────────     │
│                                                       │
│  Product A                                            │
│  2 x ₱500.00                         ₱1,000.00        │
│                                                       │
│  Product B                                            │
│  1 x ₱200.00                           ₱200.00        │
│                                                       │
├───────────────────────────────────────────────────────┤
│                                                       │
│  Subtotal:                             ₱1,200.00      │
│  Tax (0%):                                 ₱0.00      │
│  Discount:                                 ₱0.00      │
│  ────────────────────────────────────────────────     │
│  TOTAL:                                ₱1,200.00      │
│                                                       │
│  Payment Type: CREDIT                                 │
│  Amount Paid:                              ₱0.00      │
│  ────────────────────────────────────────────────     │
│  AMOUNT DUE:                           ₱1,200.00      │
│  (Bold, Large)                                        │
│                                                       │
├───────────────────────────────────────────────────────┤
│                                                       │
│         Thank you for your business!                  │
│         Please keep this receipt                      │
│                                                       │
└───────────────────────────────────────────────────────┘
```

## Color Scheme

### Credit Sale Banner
```css
Background:  #f8d7da  (Light Red)
Border:      #dc3545  (Bright Red, 3px solid)
Text Color:  #721c24  (Dark Red)
```

### Typography
```css
Heading (⚠️ CREDIT SALE ⚠️):
  - Font Size: 20px
  - Font Weight: bold
  - Text Transform: UPPERCASE
  - Letter Spacing: 2px

Message (Payment on credit...):
  - Font Size: 13px
  - Font Weight: bold

Amount Due:
  - Font Size: 16px
  - Font Weight: bold
  - Color: #dc3545 (Bright Red)
```

## Print Behavior

When printed:
- ✅ Red background prints (forced with `print-color-adjust: exact`)
- ✅ Red border prints (3px solid)
- ✅ Text colors print (dark red)
- ✅ Banner stays together (`page-break-inside: avoid`)
- ✅ High visibility even on black & white printers

## Visual Impact Comparison

### Before (No Banner)
```
┌────────────────────────┐
│  Receipt #: RCP-001    │
│  Payment Type: CREDIT  │  ← Easy to miss
│  Amount Due: ₱1,200    │
└────────────────────────┘
```

### After (With Banner)
```
┌────────────────────────────────┐
│  ╔══════════════════════════╗  │
│  ║  ⚠️  CREDIT SALE  ⚠️     ║  │  ← IMPOSSIBLE TO MISS!
│  ║  Amount Due: ₱1,200.00   ║  │
│  ╚══════════════════════════╝  │
│         (RED & BOLD)           │
└────────────────────────────────┘
```

## Receipt Sections

### 1. Header Section
- Company info
- Store address
- Contact details

### 2. Receipt Info
- Receipt number
- Date/Time
- Cashier
- Customer

### 3. Sale Type Badge
- RETAIL (Blue) or WHOLESALE (Yellow)

### 4. 🔴 CREDIT BANNER (NEW!)
- **ONLY shows for credit sales**
- Red danger styling
- Prominent warnings
- Amount due highlighted

### 5. Items List
- Product names
- Quantities
- Prices

### 6. Totals Section
- Subtotal
- Tax
- Discount
- Total
- Payment type
- Amount paid
- **Amount due** (bold if credit)

### 7. Footer
- Thank you message
- Instructions

## CSS Classes Added

```css
.credit-sale-banner {
  background: #f8d7da;
  border: 3px solid #dc3545;
  padding: 15px;
  margin: 15px 0;
  text-align: center;
}

.credit-alert {
  color: #721c24;
}

.credit-alert h2 {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.credit-message {
  font-size: 13px;
  margin-bottom: 8px;
  font-weight: bold;
}

.credit-due {
  font-size: 16px;
  font-weight: bold;
  margin-top: 8px;
  color: #dc3545;
}
```

## Print Media Query

```css
@media print {
  .credit-sale-banner {
    background: #f8d7da !important;
    border: 3px solid #dc3545 !important;
    padding: 15px !important;
    page-break-inside: avoid;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  .credit-alert h2,
  .credit-message,
  .credit-due {
    color: #721c24 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

## When Banner Appears

The banner displays when:
1. `sale.payment_type == 'CREDIT'`
2. `sale.amount_due > 0`

This ensures:
- ✅ Shows for new credit sales (PENDING)
- ✅ Shows for partially paid credit (PARTIAL)
- ❌ Hides when credit fully paid (COMPLETED, amount_due = 0)
- ❌ Hides for cash/card/mobile money sales

## Accessibility

- **High Contrast**: Dark red text on light red background
- **Large Text**: 20px heading ensures readability
- **Symbols**: ⚠️ warning emoji for quick recognition
- **Clear Message**: Plain language explains credit status
- **Amount Prominence**: Amount due in large, bold, red text

## Business Benefits

1. **Reduces Confusion**: Staff/customers can't miss credit status
2. **Improves Collections**: Clear amount due reminder
3. **Prevents Errors**: Impossible to mistake for paid sale
4. **Professional**: Clear, bold styling conveys importance
5. **Print-Friendly**: Maintains visibility when printed

## Testing Checklist

- [ ] Credit sale shows red banner
- [ ] Cash sale has NO banner
- [ ] Banner prints in color
- [ ] Banner text is readable
- [ ] Amount due displays correctly
- [ ] Banner hidden when amount_due = 0
- [ ] Mobile responsive
- [ ] Thermal printer compatible
