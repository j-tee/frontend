# 🚀 Quick Reference: Sales Reports Module

**Status:** ✅ COMPLETE - All 4 Reports Live  
**Date:** October 12, 2025

---

## 📍 URLs & Routes

| Report | URL | Status |
|--------|-----|--------|
| Sales Reports Index | `/app/reports/sales` | ✅ Live |
| Sales Summary | `/app/reports/sales/summary` | ✅ Live |
| Product Performance | `/app/reports/sales/products` | ✅ Live |
| Customer Analytics | `/app/reports/sales/customers` | ✅ Live |
| Revenue Trends | `/app/reports/sales/trends` | ✅ Live |

---

## 📂 File Locations

### Report Pages
```
src/features/reports/pages/
├── SalesReportsIndexPage.tsx   (130 lines) - Navigation
├── SalesSummaryPage.tsx         (282 lines) - Report 1 ✅
├── ProductPerformancePage.tsx   (380 lines) - Report 2 ✅
├── CustomerAnalyticsPage.tsx    (475 lines) - Report 3 ✅
└── RevenueTrendsPage.tsx        (425 lines) - Report 4 ✅
```

### Foundation Files
```
src/
├── types/reports.ts                 (842 lines) - All types
├── services/reportsService.ts       (464 lines) - All APIs
└── features/reports/components/
    ├── ReportContainer.tsx          (30 lines)
    ├── SummaryCard.tsx              (55 lines)
    ├── DateRangeFilter.tsx          (95 lines)
    └── ReportStates.tsx             (60 lines)
```

---

## 🎯 Quick Feature Matrix

| Feature | Summary | Products | Customers | Trends |
|---------|---------|----------|-----------|--------|
| Date Filtering | ✅ | ✅ | ✅ | ✅ |
| Date Presets | ✅ | ✅ | ✅ | ✅ |
| CSV Export | ✅ | ✅ | ✅ | ✅ |
| KPI Cards | 4 | 4 | 4 | 4 |
| Main Table | ✅ | ✅ | ✅ | ✅ |
| Sorting | ❌ | ✅ | ❌ | ❌ |
| Filtering | Date | Date+Sort | Date+Min | Date+Interval |
| Highlights | ✅ | ✅ | ✅ | ✅ |
| Charts | ❌ | ❌ | Progress Bars | ❌ |

---

## 🔧 API Service Methods

```typescript
// All available in: src/services/reportsService.ts

export const salesReportsService = {
  // Fetch data
  getSummary(filters): Promise<SalesSummaryResponse>
  getProductPerformance(filters): Promise<ProductPerformanceResponse>
  getCustomerAnalytics(filters): Promise<CustomerAnalyticsResponse>
  getRevenueTrends(filters): Promise<RevenueTrendsResponse>
  
  // Export CSV
  exportSummaryCSV(filters): Promise<void>
  exportProductPerformanceCSV(filters): Promise<void>
  exportCustomerAnalyticsCSV(filters): Promise<void>
  exportRevenueTrendsCSV(filters): Promise<void>
}
```

---

## 📊 Data Structures

### Sales Summary
```typescript
{
  success: boolean
  data: {
    summary: {
      total_sales: number
      total_transactions: number
      average_transaction_value: number
      total_discounts: number
      growth_rate: number
    }
    daily_breakdown: Array<{
      date: string
      sales: number
      transactions: number
      avg_value: number
    }>
    peak_hours: Array<{
      hour: number
      sales: number
      transactions: number
    }>
    comparison: {
      previous_period_sales: number
      change_percentage: number
    }
  }
}
```

### Product Performance
```typescript
{
  success: boolean
  data: {
    summary: {
      total_products_sold: number
      total_revenue: number
      total_profit: number
      average_profit_margin: number
    }
    products: Array<{
      product_id: string
      product_name: string
      sku: string
      category: string
      total_quantity_sold: number
      total_revenue: number
      total_profit: number
      profit_margin: number
      average_selling_price: number
      times_ordered: number
      trend: 'up' | 'down' | 'stable'
    }>
  }
}
```

### Customer Analytics
```typescript
{
  success: boolean
  data: {
    summary: {
      total_customers: number
      new_customers: number
      average_customer_value: number
      repeat_purchase_rate: number
    }
    segments: Array<{
      segment: 'vip' | 'regular' | 'occasional' | 'new'
      customer_count: number
      total_revenue: number
      average_order_value: number
    }>
    customers: Array<{
      customer_id: string
      customer_name: string
      email?: string
      segment: string
      total_spent: number
      total_orders: number
      average_order_value: number
      average_items_per_order: number
      last_purchase_date: string
    }>
  }
}
```

### Revenue Trends
```typescript
{
  success: boolean
  data: {
    trends: Array<{
      period: string
      revenue: number
      profit: number
      transactions: number
      average_order_value: number
      payment_methods: {
        cash: number
        card: number
        credit: number
      }
    }>
    forecast?: Array<{
      period: string
      predicted_revenue: number
      confidence: number
      upper_bound: number
      lower_bound: number
    }>
    patterns: {
      peak_day: string
      peak_hour: number
      seasonal_trend: string
      volatility: 'low' | 'medium' | 'high'
    }
  }
}
```

---

## 🎨 Component Usage

### ReportContainer
```tsx
import { ReportContainer } from '../components/ReportContainer';

<ReportContainer
  title="Report Title"
  subtitle="Subtitle with date range"
  icon="📊"
  actions={
    <div className="d-flex gap-2">
      <button onClick={handleExport} className="btn btn-outline-primary">
        Export CSV
      </button>
      <button onClick={fetchData} className="btn btn-outline-secondary">
        Refresh
      </button>
    </div>
  }
>
  {/* Your report content */}
</ReportContainer>
```

### SummaryCard
```tsx
import { SummaryCard } from '../components/SummaryCard';

<SummaryCard
  title="Total Sales"
  value="₱123,456.78"
  icon="💰"
  color="success"  // primary | success | info | warning | danger
  subtitle="Last 30 days"  // optional
/>
```

### DateRangeFilter
```tsx
import { DateRangeFilter } from '../components/DateRangeFilter';

<DateRangeFilter
  startDate={startDate}
  endDate={endDate}
  onStartDateChange={setStartDate}
  onEndDateChange={setEndDate}
  showPresets={true}  // Shows 7/30/90 days, This Month buttons
/>
```

### ReportStates
```tsx
import { LoadingState, ErrorState, EmptyState } from '../components/ReportStates';

// Loading
if (loading) return <LoadingState message="Loading data..." />;

// Error
if (error) return <ErrorState error={error} onRetry={fetchData} />;

// Empty
if (!data) return <EmptyState message="No data available" />;
```

---

## 🛠️ Common Code Patterns

### State Management
```typescript
const [data, setData] = useState<ReportResponse | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// Date filters
const [startDate, setStartDate] = useState(() => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
});

const [endDate, setEndDate] = useState(() => {
  return new Date().toISOString().split('T')[0];
});
```

### Data Fetching
```typescript
const fetchData = async () => {
  setLoading(true);
  setError(null);
  
  try {
    const result = await salesReportsService.getReport({
      start_date: startDate,
      end_date: endDate,
      // other filters
    });
    setData(result);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load report');
    console.error('Error:', err);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchData();
}, [startDate, endDate]);
```

### CSV Export
```typescript
const handleExport = async () => {
  try {
    await salesReportsService.exportReportCSV({
      start_date: startDate,
      end_date: endDate,
    });
  } catch (err) {
    console.error('Export failed:', err);
    alert('Failed to export report. Please try again.');
  }
};
```

### Number Formatting
```typescript
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(value);
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value);
};

const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};
```

---

## 🔒 Permission Requirements

All reports require: `CAPABILITIES.REPORTS_VIEW`

```typescript
import RequirePermission from '../../../components/RequirePermission.tsx';
import { CAPABILITIES } from '../../../utils/permissions.ts';

<Route
  path="reports/sales/summary"
  element={(
    <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
      <SalesSummaryPage />
    </RequirePermission>
  )}
/>
```

---

## 🧪 Testing Checklist

Before marking a report as complete:

- [ ] Report loads without errors
- [ ] Loading state shows briefly
- [ ] Data displays correctly
- [ ] Date filter updates data
- [ ] Date presets work (7/30/90 days, This Month)
- [ ] CSV export downloads file
- [ ] Refresh button fetches new data
- [ ] Error state shows on backend failure
- [ ] Error retry button works
- [ ] Empty state shows when no data
- [ ] Mobile layout is responsive
- [ ] Numbers format correctly (PHP currency)
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Permission check works

---

## 🐛 Common Issues & Fixes

### Issue: "Cannot read property 'data' of undefined"
**Fix:** Check if data exists before accessing:
```typescript
if (!data || !data.data) return <EmptyState />;
```

### Issue: Date filter not updating
**Fix:** Include dependencies in useEffect:
```typescript
useEffect(() => {
  fetchData();
}, [startDate, endDate]); // Don't forget dependencies
```

### Issue: TypeScript errors on API response
**Fix:** Verify type matches backend response in `src/types/reports.ts`

### Issue: Export downloads empty file
**Fix:** Check backend CSV endpoint is working

### Issue: Numbers showing as NaN
**Fix:** Ensure value is a number before formatting:
```typescript
const value = Number(apiResponse.value) || 0;
```

---

## 📈 Performance Tips

1. **Avoid fetching on every render**
   - Use `useEffect` with proper dependencies
   - Don't fetch in render function

2. **Show loading states**
   - Users need feedback
   - Use `LoadingState` component

3. **Handle errors gracefully**
   - Always catch errors
   - Provide retry functionality

4. **Format numbers efficiently**
   - Create formatter functions once
   - Reuse across component

5. **Lazy load if needed**
   - For large datasets
   - Consider pagination

---

## 🎯 Next Steps

### For New Reports:

1. **Copy existing report as template**
   ```bash
   cp SalesSummaryPage.tsx YourNewPage.tsx
   ```

2. **Update API calls**
   - Change service method
   - Update filter types

3. **Modify UI**
   - Update KPI cards
   - Change table columns
   - Adjust data mapping

4. **Add route**
   - Import in App.tsx
   - Add Route element

5. **Enable in index**
   - Remove `comingSoon` flag
   - Update card details

**Time:** 1.5-2 hours per report

---

## 📞 Need Help?

### Resources
- **Full Documentation:** `docs/SALES-REPORTS-COMPLETE.md`
- **Progress Tracker:** `docs/REPORTS-IMPLEMENTATION-PROGRESS.md`
- **Integration Guide:** `docs/REPORTS-INTEGRATION-READY.md`

### Code References
- **Types:** `src/types/reports.ts`
- **Services:** `src/services/reportsService.ts`
- **Components:** `src/features/reports/components/`
- **Working Examples:** `src/features/reports/pages/Sales*Page.tsx`

---

**Status:** ✅ All 4 Sales Reports Complete  
**Progress:** 4/16 total reports (25%)  
**Next:** Financial Reports Module

**Happy coding! 🚀**
