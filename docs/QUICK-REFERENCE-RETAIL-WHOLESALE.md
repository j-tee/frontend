# Quick Reference: Retail/Wholesale Implementation Pattern

**Use this as a cheat sheet when implementing retail/wholesale breakdown in any report**

---

## 🎯 5-Minute Implementation Checklist

### Backend (Python/Django)
```python
# 1. Update _build_summary() method
retail_sales = sales.filter(type=Sale.RETAIL)
wholesale_sales = sales.filter(type=Sale.WHOLESALE)

summary = {
    'total_revenue': float(sales.aggregate(Sum('total_price'))['total_price__sum'] or 0),
    'retail': {
        'revenue': float(retail_sales.aggregate(Sum('total_price'))['total_price__sum'] or 0),
        'orders': retail_sales.count(),
    },
    'wholesale': {
        'revenue': float(wholesale_sales.aggregate(Sum('total_price'))['total_price__sum'] or 0),
        'orders': wholesale_sales.count(),
    }
}

# 2. Update _build_time_series() method (if exists)
trends = sales.values('period').annotate(
    revenue=Sum('total_price'),
    retail_revenue=Sum('total_price', filter=Q(type=Sale.RETAIL)),
    retail_orders=Count('id', filter=Q(type=Sale.RETAIL)),
    wholesale_revenue=Sum('total_price', filter=Q(type=Sale.WHOLESALE)),
    wholesale_orders=Count('id', filter=Q(type=Sale.WHOLESALE)),
)

# 3. Return in standard format
return Response(self.success({
    'summary': summary,
    'results': trends_list,
    'metadata': {
        'generated_at': timezone.now().isoformat(),
        'filters': {...}
    }
}))
```

### Frontend TypeScript (types.ts)
```typescript
// 1. Update interface
interface YourReportResponse {
  success: boolean;
  data: {
    summary: {
      total_revenue: number;
      total_orders: number;
      retail: {
        revenue: number;
        orders: number;
        avg_order_value: number;
      };
      wholesale: {
        revenue: number;
        orders: number;
        avg_order_value: number;
      };
    };
    results: any[];  // or specific type
    metadata: {
      generated_at: string;
      start_date: string;
      end_date: string;
      filters: Record<string, any>;
    };
  };
  error?: string;
}
```

### Frontend React (YourReportPage.tsx)
```tsx
// 1. Extract data
const { summary, results } = data.data;

// 2. Add breakdown cards after summary cards
<div className="row mb-4">
  {/* Retail Card */}
  <div className="col-md-6">
    <div className="card h-100">
      <div className="card-header bg-primary text-white">
        <h6 className="mb-0">🏪 Retail Breakdown</h6>
      </div>
      <div className="card-body">
        <div className="row g-3">
          <div className="col-6">
            <small className="text-muted d-block">Revenue</small>
            <h5 className="mb-0">{formatCurrency(summary.retail.revenue)}</h5>
          </div>
          <div className="col-6">
            <small className="text-muted d-block">Orders</small>
            <h5 className="mb-0">{summary.retail.orders.toLocaleString()}</h5>
          </div>
          <div className="col-6">
            <small className="text-muted d-block">Avg Order</small>
            <h5 className="mb-0">{formatCurrency(summary.retail.avg_order_value)}</h5>
          </div>
          <div className="col-6">
            <small className="text-muted d-block">% of Total</small>
            <h5 className="mb-0">
              {((summary.retail.revenue / summary.total_revenue) * 100).toFixed(1)}%
            </h5>
          </div>
        </div>
      </div>
    </div>
  </div>

  {/* Wholesale Card */}
  <div className="col-md-6">
    <div className="card h-100">
      <div className="card-header bg-success text-white">
        <h6 className="mb-0">🏭 Wholesale Breakdown</h6>
      </div>
      <div className="card-body">
        {/* Same structure, replace summary.retail with summary.wholesale */}
      </div>
    </div>
  </div>
</div>
```

---

## 📋 Standard Field Names (ALWAYS USE THESE)

```python
# Backend Django
created_at__date   # NOT transaction_date
unit_price         # NOT price
order_count        # NOT transactions
orders             # acceptable alternative to order_count
total_revenue      # NOT sales, amount, or total_sales
total_profit       # NOT net_profit
profit_margin      # NOT margin_percent
```

```typescript
// Frontend TypeScript
total_revenue      // NOT totalRevenue or revenue
total_orders       // NOT totalOrders or order_count
avg_order_value    // NOT avgOrderValue or average
created_at         // NOT createdAt or date
profit_margin      // NOT profitMargin or margin
```

---

## 🎨 Standard Colors (Bootstrap Classes)

```tsx
// Summary cards (overall metrics)
bg-primary   // Blue - General metrics
bg-success   // Green - Positive metrics (profit, growth)
bg-info      // Cyan - Information metrics
bg-warning   // Yellow - Warning metrics

// Breakdown cards
bg-primary text-white   // Blue - Retail 🏪
bg-success text-white   // Green - Wholesale 🏭

// Trend indicators
text-success  // ↑ Upward trend
text-danger   // ↓ Downward trend
text-muted    // → Stable trend
```

---

## 🔢 Common Calculations

```python
# Profit margin
profit_margin = (total_profit / total_revenue * 100) if total_revenue > 0 else 0

# Average order value
avg_order_value = total_revenue / order_count if order_count > 0 else 0

# Percentage of total
retail_percentage = (retail_revenue / total_revenue * 100) if total_revenue > 0 else 0

# Growth rate (period-over-period)
growth_rate = ((current - previous) / previous * 100) if previous > 0 else 0

# Volatility (coefficient of variation)
cv = (std_dev / mean * 100) if mean > 0 else 0
volatility = 'low' if cv < 20 else 'medium' if cv < 40 else 'high'
```

---

## 📊 Response Structure Template

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_revenue": 485000.00,
      "total_orders": 1234,
      "retail": {
        "revenue": 380000.00,
        "orders": 980,
        "avg_order_value": 387.76,
        "profit": 118000.00,
        "profit_margin": 31.1
      },
      "wholesale": {
        "revenue": 105000.00,
        "orders": 254,
        "avg_order_value": 413.39,
        "profit": 27500.00,
        "profit_margin": 26.2
      }
    },
    "results": [
      {
        "period": "2024-10-01",
        "revenue": 15000.00,
        "retail": {
          "revenue": 12000.00,
          "orders": 35
        },
        "wholesale": {
          "revenue": 3000.00,
          "orders": 10
        }
      }
    ],
    "metadata": {
      "generated_at": "2024-10-14T12:00:00Z",
      "start_date": "2024-10-01",
      "end_date": "2024-10-31",
      "filters": {
        "storefront": 1,
        "group_by": "day"
      }
    }
  }
}
```

---

## 🚀 Implementation Steps (Order Matters!)

1. **Backend First**
   - [ ] Update `_build_summary()` with retail/wholesale filters
   - [ ] Update `_build_time_series()` with retail/wholesale annotations (if exists)
   - [ ] Test response in browser dev tools or curl
   - [ ] Verify retail + wholesale = total

2. **Frontend Types**
   - [ ] Update interface in `/frontend/src/types/reports.ts`
   - [ ] Add `retail` and `wholesale` objects to summary
   - [ ] Add to trend data if applicable
   - [ ] Run TypeScript check: `npm run type-check` (if available)

3. **Frontend Page**
   - [ ] Update data extraction: `const { summary, results } = data.data;`
   - [ ] Add retail/wholesale cards after summary cards
   - [ ] Update tables/charts with retail/wholesale columns
   - [ ] Test in browser
   - [ ] Verify no console errors

4. **Testing**
   - [ ] Test date range filters
   - [ ] Test storefront filters
   - [ ] Verify percentages add to 100%
   - [ ] Test CSV export
   - [ ] Test PDF export
   - [ ] Check responsive layout on mobile

---

## ⚠️ Common Pitfalls

### Backend
- ❌ Using `.filter(type='RETAIL')` → ✅ `.filter(type=Sale.RETAIL)`
- ❌ Returning integers → ✅ Convert to float: `float(value or 0)`
- ❌ Not handling nulls → ✅ Use `value or 0` in aggregates
- ❌ Forgetting to annotate both retail AND wholesale → ✅ Always do both

### Frontend
- ❌ Using `data.summary` → ✅ Use `data.data.summary`
- ❌ Not checking for zeros → ✅ `value > 0 ? calc : 0`
- ❌ Hardcoded strings → ✅ Use constants or enums
- ❌ Not formatting currency → ✅ Always use `formatCurrency()`

### TypeScript
- ❌ Optional where required → ✅ Make retail/wholesale required in summary
- ❌ `any` types everywhere → ✅ Define proper interfaces
- ❌ Inconsistent naming → ✅ Follow camelCase for TS, snake_case for API

---

## 📚 Reference Files

### Backend Reference
**File**: `/backend/reports/views/sales_reports.py`
**Class**: `RevenueTrendsReportView` (lines 1457-1872)
**Methods**: `_build_summary()`, `_build_time_series()`, `_build_patterns()`

### Frontend Reference
**Types**: `/frontend/src/types/reports.ts` → `RevenueTrendsResponse` interface
**Page**: `/frontend/src/features/reports/pages/RevenueTrendsPage.tsx`
**Sections**: Summary cards (92-135), Breakdown cards (137-215), Trends table (217-310)

### Documentation
- Full Guide: `/frontend/docs/PHASE-1-SALES-REPORTS-COMPLETE.md`
- Roadmap: `/frontend/docs/PHASE-2-4-IMPLEMENTATION-ROADMAP.md`
- Summary: `/frontend/docs/SESSION-SUMMARY-PHASE-1-COMPLETE.md`

---

## 🎯 Quality Checklist

Before marking a report complete:

- [ ] ✅ Zero TypeScript errors
- [ ] ✅ Retail + wholesale = total revenue (verified)
- [ ] ✅ All percentages between 0-100%
- [ ] ✅ Date filters work correctly
- [ ] ✅ Storefront filters work correctly
- [ ] ✅ CSV export works
- [ ] ✅ PDF export works
- [ ] ✅ Mobile responsive (col-md-* classes)
- [ ] ✅ Loading states present
- [ ] ✅ Error states present
- [ ] ✅ No console errors
- [ ] ✅ Code follows established patterns

---

## 🔥 Pro Tips

1. **Copy-Paste Workflow**
   - Use RevenueTrendsReportView as template for backend
   - Use RevenueTrendsPage.tsx as template for frontend
   - Adjust field names and calculations as needed

2. **Test Early**
   - Test backend endpoint with curl after each change
   - Check browser console for errors immediately
   - Verify data before building complex UI

3. **Incremental Development**
   - Backend summary first (simplest)
   - Frontend types second (prevents errors)
   - Frontend basic cards third (visual feedback)
   - Advanced features last (charts, patterns, etc.)

4. **Documentation First**
   - Write down expected metrics before coding
   - Document calculations in code comments
   - Update this guide if patterns change

---

**Last Updated**: October 14, 2024  
**Version**: 1.0  
**Status**: Production Ready
