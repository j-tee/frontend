# Stock Product Detail Modal - Visual Preview

**Component**: StockProductDetailModal  
**Status**: Enhanced Design  
**Date**: October 10, 2025

---

## 🖼️ Modal Layout Preview

```
┌─────────────────────────────────────────────────────────────────────────┐
│ X                    Stock item details                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Product                                  Updated Oct 10, 2025     │ │
│  │  Samsung 55" 4K Smart TV                  Created Oct 1, 2025      │ │
│  │  SKU: SAM-TV-55-001                                                │ │
│  │                                                                     │ │
│  │  ┌─────────────────────────────────────────────────────────────┐  │ │
│  │  │ ✅ Reconciled Oct 10, 2025 10:30 AM    [↻ Refresh snapshot] │  │ │
│  │  └─────────────────────────────────────────────────────────────┘  │ │
│  │                                                                     │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐ │ │
│  │  │ BATCH SIZE   │ │  WAREHOUSE   │ │  STOREFRONT  │ │AVAILABLE │ │ │
│  │  │              │ │              │ │              │ │          │ │ │
│  │  │     459      │ │     285      │ │     174      │ │   169    │ │ │
│  │  │              │ │              │ │              │ │          │ │ │
│  │  │  Recorded    │ │  On hand     │ │ Transferred  │ │For sale  │ │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────┘ │ │
│  │  [Indigo 🟦]     [Blue 🔵]         [Purple 🟣]      [Green ✅]    │ │
│  │                                                                     │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │ │
│  │  │ 💰 Sold  │ │ 🔒 Rsvd  │ │ 📉 Shnk  │ │ ✏️ Corr  │            │ │
│  │  │    5     │ │    0     │ │    0     │ │    0     │            │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │ │
│  │                                                                     │ │
│  │  ┌──────────────────┐ ┌──────────────────────────────────┐       │ │
│  │  │ Warehouse        │ │ Batch                             │       │ │
│  │  │ Central Storage  │ │ Stock intake for October 2025     │       │ │
│  │  └──────────────────┘ └──────────────────────────────────┘       │ │
│  │                                                                     │ │
│  │  ┌──────────────────┐ ┌──────────────────────────────────┐       │ │
│  │  │ Landed Cost      │ │ Net Adjustment                    │       │ │
│  │  │ $379.39          │ │ +0 units (no changes)             │       │ │
│  │  └──────────────────┘ └──────────────────────────────────┘       │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ RECONCILIATION FORMULA                                             │ │
│  │                                                                     │ │
│  │ Warehouse (285) + Storefront transferred (174) − Shrinkage (0) +  │ │
│  │ Corrections (0) − Reservations (0) = 459                           │ │
│  │                                                                     │ │
│  │ Recorded batch size: 459                                           │ │
│  │ ✅ Inventory is balanced                                           │ │
│  │                                                                     │ │
│  │ Additional Information:                                            │ │
│  │ • Available for sale: 169 units                                    │ │
│  │ • Units sold: 5 (tracked separately, doesn't affect reconciliation)│ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ 🏪 STOREFRONT BREAKDOWN (2 locations)                              │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │                                                                     │ │
│  │  ┌─────────────────────────────────────────────────────────────┐  │ │
│  │  │ 🏪 Main Store Downtown                                      │  │ │
│  │  │ 📍 123 Main St, New York, NY 10001                          │  │ │
│  │  │ Last transfer: Oct 1, 2025 10:30 AM                         │  │ │
│  │  ├─────────────────────────────────────────────────────────────┤  │ │
│  │  │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │  │ │
│  │  │ │Transferd│ │ On Hand │ │Sellable │ │  Sold   │           │  │ │
│  │  │ │   100   │ │   100   │ │   98    │ │    0    │           │  │ │
│  │  │ └─────────┘ └─────────┘ └─────────┘ └─────────┘           │  │ │
│  │  ├─────────────────────────────────────────────────────────────┤  │ │
│  │  │ 🔒 Reserved Units: 2                                        │  │ │
│  │  │    Linked: 2 • Orphaned: 0                                  │  │ │
│  │  └─────────────────────────────────────────────────────────────┘  │ │
│  │                                                                     │ │
│  │  ┌─────────────────────────────────────────────────────────────┐  │ │
│  │  │ 🏪 West Side Branch                                         │  │ │
│  │  │ 📍 456 West Ave, New York, NY 10023                         │  │ │
│  │  │ Last transfer: Oct 5, 2025 2:20 PM                          │  │ │
│  │  ├─────────────────────────────────────────────────────────────┤  │ │
│  │  │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │  │ │
│  │  │ │Transferd│ │ On Hand │ │Sellable │ │  Sold   │           │  │ │
│  │  │ │   79    │ │   74    │ │   71    │ │    5    │           │  │ │
│  │  │ └─────────┘ └─────────┘ └─────────┘ └─────────┘           │  │ │
│  │  ├─────────────────────────────────────────────────────────────┤  │ │
│  │  │ 🔒 Reserved Units: 3                                        │  │ │
│  │  │    Linked: 3 • Orphaned: 0                                  │  │ │
│  │  └─────────────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  [... Product Edit Form Fields ...]                                    │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  [Close] [Save changes]                        [Delete item]            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Color Legend

### Hero Metrics (Large Gradient Cards)

```
┌─────────────────┐
│ BATCH SIZE      │  ← Indigo gradient background
│                 │    (#EEF2FF → #E0E7FF)
│      459        │  ← Large bold number (#312E81)
│                 │
│   Recorded      │  ← Small label (#6366F1)
└─────────────────┘
```

```
┌─────────────────┐
│ WAREHOUSE       │  ← Blue gradient background
│                 │    (#EFF6FF → #DBEAFE)
│      285        │  ← Large bold number (#1E3A8A)
│                 │
│   On hand       │  ← Small label (#2563EB)
└─────────────────┘
```

```
┌─────────────────┐
│ STOREFRONT      │  ← Purple gradient background
│                 │    (#FAF5FF → #F3E8FF)
│      174        │  ← Large bold number (#581C87)
│                 │
│  Transferred    │  ← Small label (#7C3AED)
└─────────────────┘
```

```
┌─────────────────┐
│ AVAILABLE       │  ← Emerald gradient background
│                 │    (#ECFDF5 → #D1FAE5)
│      169        │  ← Large bold number (#065F46)
│                 │
│   For sale      │  ← Small label (#059669)
└─────────────────┘
```

### Secondary Metrics (White Cards with Colored Borders)

```
┌─────────┐
│ 💰 Sold │  ← White background
│    5    │    Border: #E2E8F0 (slate-200)
└─────────┘
```

```
┌─────────┐
│ 🔒 Rsvd │  ← White background
│    0    │    Border: #FDE68A (amber-200)
└─────────┘
```

---

## 📐 Spacing & Layout

### Grid Structure
```
Mobile (< 768px):          Tablet (768-1024px):       Desktop (> 1024px):

┌─────┐ ┌─────┐           ┌─────┐ ┌─────┐ ┌─────┐   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│ BS  │ │ WH  │           │ BS  │ │ WH  │ │ SF  │   │ BS  │ │ WH  │ │ SF  │ │ AV  │
└─────┘ └─────┘           └─────┘ └─────┘ └─────┘   └─────┘ └─────┘ └─────┘ └─────┘
┌─────┐ ┌─────┐           ┌─────┐                   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│ SF  │ │ AV  │           │ AV  │                   │Sold │ │Rsvd │ │Shnk │ │Corr │
└─────┘ └─────┘           └─────┘                   └─────┘ └─────┘ └─────┘ └─────┘
```

### Card Padding
- Main container: `p-4` (16px)
- Metric cards: `p-3` (12px)
- Storefront cards: `p-4` (16px)

### Gap Spacing
- Between cards: `gap-3` (12px)
- Between sections: `mb-4` (16px)

---

## 🎭 Interactive States

### Hover Effect on Storefront Cards

**Default**:
```
┌─────────────────────────────────┐
│ 🏪 Main Store Downtown          │  Border: #E2E8F0
│ ...                             │  Shadow: none
└─────────────────────────────────┘
```

**On Hover**:
```
┌═════════════════════════════════┐
│ 🏪 Main Store Downtown          │  Border: #93C5FD (blue-300)
│ ...                             │  Shadow: medium
└═════════════════════════════════┘
     ↑ Subtle lift effect with transition
```

---

## 📊 Data State Examples

### Complete Data (All Fields Available)
```
┌─────────────────────────────────────────┐
│ 🏪 Main Store Downtown                  │
│ 📍 123 Main St, New York, NY 10001      │  ← Location shown
│ Last transfer: Oct 1, 2025 10:30 AM     │  ← Transfer date shown
├─────────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        │
│ │ 100 │ │ 100 │ │  98 │ │  0  │        │  ← All metrics shown
│ └─────┘ └─────┘ └─────┘ └─────┘        │
└─────────────────────────────────────────┘
```

### Partial Data (Backend Not Updated)
```
┌─────────────────────────────────────────┐
│ 🏪 Main Store Downtown                  │
│ Location not available                   │  ← Italicized fallback
│                                          │  ← No transfer date
├─────────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────────┐    │
│ │ N/A │ │ 100 │ │  98 │ │   N/A   │    │  ← Placeholders shown
│ └─────┘ └─────┘ └─────┘ └─────────┘    │
├─────────────────────────────────────────┤
│ ℹ️ Limited Data: Some metrics are not  │  ← Info alert
│ available. Backend needs enhancement.   │
└─────────────────────────────────────────┘
```

### No Storefront Data
```
┌─────────────────────────────────────────┐
│ ⚠️ No Storefront Breakdown Available    │
│                                          │
│ Storefront data shows 174 units         │
│ transferred, but detailed breakdown by  │
│ location is not available.              │
└─────────────────────────────────────────┘
```

---

## 🎯 Visual Hierarchy at a Glance

```
IMPORTANCE LEVELS:

Level 1 (Hero Metrics)          ← Largest, most colorful
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌────────┐ ┌────────┐ 
│  459   │ │  285   │           24px font, gradient bg
└────────┘ └────────┘           

Level 2 (Activity Metrics)      ← Medium size, borders
─────────────────────────────────
┌──────┐ ┌──────┐
│  5   │ │  0   │               20px font, white bg
└──────┘ └──────┘

Level 3 (Context Info)          ← Smallest, plain text
·························
Warehouse: Central Storage      14px font, no bg
Batch: Stock intake Oct 2025

Level 4 (Details)               ← Progressive disclosure
─────────────────────────────────
[Storefront Breakdown Cards]    Expandable sections
```

---

## 🔍 Typography Scale

```
Product Name:         text-xl (20px)  font-bold
Metric Labels:        text-xs (12px)  font-semibold uppercase
Large Numbers:        text-2xl (24px) font-bold
Medium Numbers:       text-xl (20px)  font-bold
Supporting Text:      text-sm (14px)  font-medium
Small Text:           text-xs (12px)  font-normal
```

---

## ♿ Accessibility Features

### Color Contrast Ratios
```
✅ Indigo text on Indigo-50:  7.2:1  (WCAG AAA)
✅ Blue text on Blue-50:      7.5:1  (WCAG AAA)
✅ Purple text on Purple-50:  6.8:1  (WCAG AA)
✅ Emerald text on Emerald-50: 7.1:1  (WCAG AAA)
```

### Keyboard Navigation
```
Tab Order:
1. Refresh snapshot button
2. Storefront card 1 (focusable for tooltips)
3. Storefront card 2 (focusable for tooltips)
4. ... form fields ...
5. Save button
6. Delete button
```

### Screen Reader Announcements
```
"Batch size: 459 units recorded"
"Warehouse on hand: 285 units"
"Storefront transferred: 174 units"
"Available for sale: 169 units"
"Inventory is balanced" (when delta = 0)
```

---

## 🎨 Design System Tokens

```css
/* Colors */
--indigo-50: #EEF2FF
--indigo-100: #E0E7FF
--indigo-700: #4338CA
--indigo-900: #312E81

--blue-50: #EFF6FF
--blue-100: #DBEAFE
--blue-700: #1D4ED8
--blue-900: #1E3A8A

--purple-50: #FAF5FF
--purple-100: #F3E8FF
--purple-700: #7C3AED
--purple-900: #581C87

--emerald-50: #ECFDF5
--emerald-100: #D1FAE5
--emerald-700: #047857
--emerald-900: #065F46

/* Spacing */
--gap-3: 0.75rem (12px)
--gap-4: 1rem (16px)
--p-3: 0.75rem (12px)
--p-4: 1rem (16px)

/* Borders */
--rounded-lg: 0.5rem (8px)
--rounded-xl: 0.75rem (12px)
--border-2: 2px

/* Shadows */
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1)
```

---

## 📱 Responsive Breakpoints

```
Mobile:   < 768px
Tablet:   768px - 1024px
Desktop:  > 1024px

Example Card Widths:
Mobile:   ~160px (2 columns)
Tablet:   ~220px (3 columns)
Desktop:  ~180px (4 columns)
```

---

**This preview demonstrates the enhanced visual design that makes critical inventory metrics stand out immediately while maintaining professional aesthetics and excellent user experience.** ✨

