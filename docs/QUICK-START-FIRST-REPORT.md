# Quick Start: Implementing Your First Report

**Goal:** Get the Sales Summary Report working in 1-2 hours  
**Status:** 🚀 Backend Ready | Frontend: Let's Build!

---

## Step 1: Create TypeScript Types (10 minutes)

Create `src/types/reports.ts`:

```typescript
// Common types used across all reports
export interface ReportPeriod {
  start_date: string;
  end_date: string;
  days: number;
}

export interface PaginationInfo {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Sales Summary specific types
export interface SalesSummary {
  total_revenue: number;
  total_transactions: number;
  average_transaction_value: number;
  total_cost: number;
  total_profit: number;
  profit_margin: number;
  period_comparison: {
    revenue_change: number;
    transactions_change: number;
  };
}

export interface DailySales {
  date: string;
  revenue: number;
  transactions: number;
  average_value: number;
  profit: number;
}

export interface SalesSummaryResponse {
  report_name: string;
  generated_at: string;
  period: ReportPeriod;
  summary: SalesSummary;
  data: DailySales[];
  pagination: PaginationInfo;
}

// API Request parameters
export interface ReportFilters {
  start_date?: string;
  end_date?: string;
  warehouse_id?: string;
  customer_type?: 'retail' | 'wholesale';
  group_by?: 'day' | 'week' | 'month';
  page?: number;
  page_size?: number;
}
```

---

## Step 2: Create API Service (15 minutes)

Create `src/services/reportsService.ts`:

```typescript
import axios from 'axios';
import { SalesSummaryResponse, ReportFilters } from '../types/reports';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const REPORTS_BASE = `${API_BASE_URL}/reports/api`;

// Get auth token from your auth system
const getAuthToken = () => {
  // Adjust this based on your auth implementation
  return localStorage.getItem('token') || '';
};

// Create axios instance with auth
const reportsApi = axios.create({
  baseURL: REPORTS_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to every request
reportsApi.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Sales Summary Report
export const getSalesSummary = async (
  filters: ReportFilters = {}
): Promise<SalesSummaryResponse> => {
  const params = new URLSearchParams();
  
  if (filters.start_date) params.append('start_date', filters.start_date);
  if (filters.end_date) params.append('end_date', filters.end_date);
  if (filters.warehouse_id) params.append('warehouse_id', filters.warehouse_id);
  if (filters.customer_type) params.append('customer_type', filters.customer_type);
  if (filters.group_by) params.append('group_by', filters.group_by);
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.page_size) params.append('page_size', filters.page_size.toString());

  const response = await reportsApi.get<SalesSummaryResponse>(
    `/sales/summary/?${params.toString()}`
  );
  
  return response.data;
};

// Export to CSV
export const exportSalesSummaryCSV = async (filters: ReportFilters = {}): Promise<Blob> => {
  const params = new URLSearchParams();
  
  if (filters.start_date) params.append('start_date', filters.start_date);
  if (filters.end_date) params.append('end_date', filters.end_date);
  if (filters.warehouse_id) params.append('warehouse_id', filters.warehouse_id);
  if (filters.customer_type) params.append('customer_type', filters.customer_type);
  if (filters.group_by) params.append('group_by', filters.group_by);

  const response = await reportsApi.get(
    `/sales/summary/?${params.toString()}&export=csv`,
    { responseType: 'blob' }
  );
  
  return response.data;
};
```

---

## Step 3: Create Base Components (20 minutes)

### 3.1 Report Container

Create `src/features/reports/components/ReportContainer.tsx`:

```typescript
import React from 'react';

interface ReportContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const ReportContainer: React.FC<ReportContainerProps> = ({
  title,
  subtitle,
  children,
  actions,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">{title}</h2>
            {subtitle && (
              <p className="mt-2 text-base font-medium text-slate-700">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      </div>

      {/* Content */}
      {children}
    </div>
  );
};
```

### 3.2 Summary Cards

Create `src/features/reports/components/SummaryCard.tsx`:

```typescript
import React from 'react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon?: string;
  change?: number;
  changeLabel?: string;
  color?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  icon,
  change,
  changeLabel,
  color = 'bg-blue-50 border-blue-200',
}) => {
  const changeColor = change && change > 0 ? 'text-green-600' : 'text-red-600';
  const changeIcon = change && change > 0 ? '↑' : '↓';

  return (
    <div className={`rounded-2xl border p-6 shadow-sm ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          {change !== undefined && (
            <p className={`mt-2 text-sm font-medium ${changeColor}`}>
              <span className="mr-1">{changeIcon}</span>
              {Math.abs(change).toFixed(1)}% {changeLabel}
            </p>
          )}
        </div>
        {icon && <span className="text-3xl">{icon}</span>}
      </div>
    </div>
  );
};
```

### 3.3 Date Range Filter

Create `src/features/reports/components/DateRangeFilter.tsx`:

```typescript
import React from 'react';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) => {
  return (
    <div className="flex items-center gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="mt-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">End Date</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="mt-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium"
        />
      </div>
    </div>
  );
};
```

---

## Step 4: Create the Sales Summary Page (30 minutes)

Create `src/features/reports/pages/SalesSummaryPage.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { getSalesSummary, exportSalesSummaryCSV } from '../../../services/reportsService';
import { SalesSummaryResponse } from '../../../types/reports';

const SalesSummaryPage: React.FC = () => {
  // State
  const [data, setData] = useState<SalesSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getSalesSummary({ start_date: startDate, end_date: endDate });
      setData(result);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load report');
      console.error('Error fetching sales summary:', err);
    } finally {
      setLoading(false);
    }
  };

  // Export to CSV
  const handleExport = async () => {
    try {
      const blob = await exportSalesSummaryCSV({ start_date: startDate, end_date: endDate });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-summary-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting report:', err);
      alert('Failed to export report');
    }
  };

  // Load on mount and when filters change
  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  // Loading state
  if (loading) {
    return (
      <ReportContainer title="Sales Summary Report">
        <div className="rounded-3xl border border-slate-300 bg-white p-12 text-center shadow-sm">
          <div className="text-4xl">⏳</div>
          <p className="mt-4 text-lg font-medium text-slate-700">Loading report...</p>
        </div>
      </ReportContainer>
    );
  }

  // Error state
  if (error) {
    return (
      <ReportContainer title="Sales Summary Report">
        <div className="rounded-3xl border border-red-300 bg-red-50 p-12 text-center shadow-sm">
          <div className="text-4xl">❌</div>
          <p className="mt-4 text-lg font-bold text-red-900">Error Loading Report</p>
          <p className="mt-2 text-base font-medium text-red-700">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 rounded-lg bg-red-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      </ReportContainer>
    );
  }

  // No data
  if (!data) {
    return null;
  }

  const { summary } = data;

  return (
    <ReportContainer
      title="Sales Summary Report"
      subtitle={`Showing data from ${startDate} to ${endDate}`}
      actions={
        <>
          <button
            onClick={handleExport}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
          >
            📊 Export CSV
          </button>
          <button
            onClick={fetchData}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            🔄 Refresh
          </button>
        </>
      }
    >
      {/* Filters */}
      <div className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-xl font-bold text-slate-900">Filters</h3>
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Revenue"
          value={`₱${summary.total_revenue.toLocaleString()}`}
          icon="💰"
          change={summary.period_comparison.revenue_change}
          changeLabel="vs previous period"
          color="bg-green-50 border-green-200"
        />
        <SummaryCard
          title="Total Transactions"
          value={summary.total_transactions.toLocaleString()}
          icon="🛒"
          change={summary.period_comparison.transactions_change}
          changeLabel="vs previous period"
          color="bg-blue-50 border-blue-200"
        />
        <SummaryCard
          title="Average Transaction"
          value={`₱${summary.average_transaction_value.toLocaleString()}`}
          icon="📊"
          color="bg-purple-50 border-purple-200"
        />
        <SummaryCard
          title="Profit Margin"
          value={`${summary.profit_margin.toFixed(1)}%`}
          icon="📈"
          color="bg-orange-50 border-orange-200"
        />
      </div>

      {/* Daily Sales Table */}
      <div className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-xl font-bold text-slate-900">Daily Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left text-sm font-bold text-slate-900">Date</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-slate-900">Revenue</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-slate-900">Transactions</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-slate-900">Avg Value</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-slate-900">Profit</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((day, index) => (
                <tr
                  key={day.date}
                  className={`border-b border-slate-100 transition hover:bg-slate-50 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{day.date}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                    ₱{day.revenue.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                    {day.transactions}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                    ₱{day.average_value.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-green-600">
                    ₱{day.profit.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ReportContainer>
  );
};

export default SalesSummaryPage;
```

---

## Step 5: Add Route (5 minutes)

In `src/App.tsx`, add:

```typescript
import SalesSummaryPage from './features/reports/pages/SalesSummaryPage';

// Inside your routes:
<Route path="/app/reports/sales/summary" element={<SalesSummaryPage />} />
```

---

## Step 6: Test It! (10 minutes)

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to the report:**
   - Go to `/app/reports`
   - Click on "Sales Reports"
   - You should see the Sales Summary Report

3. **Test features:**
   - ✅ Summary cards display correctly
   - ✅ Change date range and see data update
   - ✅ Export to CSV works
   - ✅ Table shows daily breakdown
   - ✅ Loading state appears briefly
   - ✅ Error handling works (test by turning off backend)

---

## Common Issues & Solutions

### Issue: CORS Error
**Solution:** Backend needs to allow your frontend origin:
```python
# Django settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite default
    "http://localhost:3000",  # React default
]
```

### Issue: 401 Unauthorized
**Solution:** Check auth token is being sent:
```typescript
// In browser console:
console.log('Token:', localStorage.getItem('token'));
```

### Issue: Data not updating
**Solution:** Check network tab for API calls. Ensure `useEffect` dependencies are correct.

### Issue: Export doesn't download
**Solution:** Check backend returns proper Content-Disposition header:
```python
response['Content-Disposition'] = f'attachment; filename="sales-summary.csv"'
```

---

## Next Steps

Once your first report works:

1. **Add a chart library** (Recharts recommended):
   ```bash
   npm install recharts
   ```

2. **Add a line chart** for revenue trends:
   ```typescript
   import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
   
   <LineChart width={800} height={300} data={data.data}>
     <CartesianGrid strokeDasharray="3 3" />
     <XAxis dataKey="date" />
     <YAxis />
     <Tooltip />
     <Legend />
     <Line type="monotone" dataKey="revenue" stroke="#10b981" />
   </LineChart>
   ```

3. **Replicate pattern for other 15 reports**:
   - Copy SalesSummaryPage.tsx
   - Update types for new report
   - Update API service
   - Add route
   - Test!

---

## Estimated Time

| Task | Time |
|------|------|
| Create types | 10 min |
| Create API service | 15 min |
| Create base components | 20 min |
| Create Sales Summary page | 30 min |
| Add route & test | 15 min |
| **Total** | **1h 30min** |

---

## Success Checklist

- [ ] Types defined in `src/types/reports.ts`
- [ ] API service created in `src/services/reportsService.ts`
- [ ] Base components created (ReportContainer, SummaryCard, DateRangeFilter)
- [ ] Sales Summary page created and styled
- [ ] Route added to App.tsx
- [ ] Report loads without errors
- [ ] Date filters update data
- [ ] Export to CSV works
- [ ] Loading and error states work

---

## 🎉 Congratulations!

You've successfully integrated your first analytical report! Now you can follow the same pattern for the remaining 15 reports.

**Remember:**
- Use the backend documentation for exact API specs
- Copy and modify this pattern for each new report
- Test as you go
- Ask for help when stuck

**Happy coding! 🚀**
