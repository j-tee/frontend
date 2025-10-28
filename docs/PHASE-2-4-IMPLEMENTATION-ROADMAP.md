# Phase 2-4: Implementation Roadmap
## Retail/Wholesale Breakdown for Remaining 12 Reports

**Status**: Phase 1 Complete ✅ | Ready to Begin Phase 2  
**Pattern Established**: Unified structure with retail/wholesale + payment methods + analytics patterns

---

## Phase 1 Completion Summary ✅

### Reports Completed (2/2)
1. ✅ **Customer Analytics** - Full retail/wholesale breakdown
2. ✅ **Revenue Trends** - Enhanced with patterns + payment methods

### Key Achievements
- ✅ Zero TypeScript errors across all files
- ✅ Unified response structure: `{success, data: {summary, results, metadata}}`
- ✅ Backend patterns established: `_build_summary()`, `_build_time_series()`, `_build_patterns()`
- ✅ Frontend card-based layout with Bootstrap grid
- ✅ Payment methods tracking (5 methods: cash, card, credit, gcash, other)
- ✅ Analytics patterns: volatility, trend direction, growth rate

### Files Modified
- Backend: `/backend/reports/views/sales_reports.py` (1872 lines)
- Frontend Types: `/frontend/src/types/reports.ts` (780 lines)
- Frontend Pages: 
  * `CustomerAnalyticsPage.tsx` (408 lines)
  * `RevenueTrendsPage.tsx` (434 lines)

---

## Implementation Pattern (Copy for Each Report)

### Backend Pattern

```python
def _build_summary(self, sales, **kwargs):
    """Build summary with retail/wholesale breakdown"""
    # Total aggregates
    total_revenue = sales.aggregate(Sum('total_price'))['total_price__sum'] or 0
    total_orders = sales.count()
    
    # Retail breakdown
    retail_sales = sales.filter(type=Sale.RETAIL)
    retail_revenue = retail_sales.aggregate(Sum('total_price'))['total_price__sum'] or 0
    retail_orders = retail_sales.count()
    
    # Wholesale breakdown
    wholesale_sales = sales.filter(type=Sale.WHOLESALE)
    wholesale_revenue = wholesale_sales.aggregate(Sum('total_price'))['total_price__sum'] or 0
    wholesale_orders = wholesale_sales.count()
    
    return {
        'total_revenue': float(total_revenue),
        'total_orders': total_orders,
        'retail': {
            'revenue': float(retail_revenue),
            'orders': retail_orders,
            'avg_order_value': float(retail_revenue / retail_orders) if retail_orders > 0 else 0,
            # ... other metrics
        },
        'wholesale': {
            'revenue': float(wholesale_revenue),
            'orders': wholesale_orders,
            'avg_order_value': float(wholesale_revenue / wholesale_orders) if wholesale_orders > 0 else 0,
            # ... other metrics
        }
    }

def _build_time_series(self, sales, group_by='day'):
    """Build time-series with retail/wholesale per period"""
    # Group sales by period
    if group_by == 'day':
        sales = sales.annotate(period=TruncDate('created_at'))
    elif group_by == 'week':
        sales = sales.annotate(period=TruncWeek('created_at'))
    elif group_by == 'month':
        sales = sales.annotate(period=TruncMonth('created_at'))
    
    # Aggregate by period
    trends = sales.values('period').annotate(
        revenue=Sum('total_price'),
        orders=Count('id'),
        # Retail
        retail_revenue=Sum('total_price', filter=Q(type=Sale.RETAIL)),
        retail_orders=Count('id', filter=Q(type=Sale.RETAIL)),
        # Wholesale
        wholesale_revenue=Sum('total_price', filter=Q(type=Sale.WHOLESALE)),
        wholesale_orders=Count('id', filter=Q(type=Sale.WHOLESALE)),
    ).order_by('period')
    
    # Format results
    return [
        {
            'period': trend['period'].isoformat() if trend['period'] else None,
            'revenue': float(trend['revenue'] or 0),
            'orders': trend['orders'],
            'retail': {
                'revenue': float(trend['retail_revenue'] or 0),
                'orders': trend['retail_orders'],
                'avg_order_value': float((trend['retail_revenue'] or 0) / trend['retail_orders']) if trend['retail_orders'] > 0 else 0,
            },
            'wholesale': {
                'revenue': float(trend['wholesale_revenue'] or 0),
                'orders': trend['wholesale_orders'],
                'avg_order_value': float((trend['wholesale_revenue'] or 0) / trend['wholesale_orders']) if trend['wholesale_orders'] > 0 else 0,
            },
        }
        for trend in trends
    ]
```

### Frontend TypeScript Pattern

```typescript
interface ReportSummary {
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
}

interface TrendData {
  period: string;
  revenue: number;
  orders: number;
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
}

interface ReportResponse {
  success: boolean;
  data: {
    summary: ReportSummary;
    results: TrendData[];
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

### Frontend JSX Pattern

```tsx
{/* Retail/Wholesale Breakdown */}
<div className="row mb-4">
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

  <div className="col-md-6">
    <div className="card h-100">
      <div className="card-header bg-success text-white">
        <h6 className="mb-0">🏭 Wholesale Breakdown</h6>
      </div>
      <div className="card-body">
        <div className="row g-3">
          <div className="col-6">
            <small className="text-muted d-block">Revenue</small>
            <h5 className="mb-0">{formatCurrency(summary.wholesale.revenue)}</h5>
          </div>
          <div className="col-6">
            <small className="text-muted d-block">Orders</small>
            <h5 className="mb-0">{summary.wholesale.orders.toLocaleString()}</h5>
          </div>
          <div className="col-6">
            <small className="text-muted d-block">Avg Order</small>
            <h5 className="mb-0">{formatCurrency(summary.wholesale.avg_order_value)}</h5>
          </div>
          <div className="col-6">
            <small className="text-muted d-block">% of Total</small>
            <h5 className="mb-0">
              {((summary.wholesale.revenue / summary.total_revenue) * 100).toFixed(1)}%
            </h5>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## Phase 2: Financial Reports (4 Reports)

### Priority: HIGH (Business Critical)

### 1. Revenue & Profit Analysis ✅ (Backend Complete)
**File**: `/backend/reports/views/financial_reports.py` - `RevenueProfitReportView`

**Current Status**: Needs frontend implementation

**Enhancements Needed**:
- [ ] Backend: Add retail/wholesale breakdown to summary
- [ ] Backend: Add retail/wholesale to time-series
- [ ] Frontend: Update `RevenueProfitResponse` in types.ts
- [ ] Frontend: Update `RevenueProfitPage.tsx` with retail/wholesale cards
- [ ] Frontend: Add payment methods breakdown (if applicable)
- [ ] Testing: Verify CSV/PDF exports

**Metrics to Track**:
- Total revenue/profit (overall + retail + wholesale)
- Profit margins (overall + retail + wholesale)
- Revenue growth rate (overall + retail + wholesale)
- Seasonal patterns
- Payment methods distribution

---

### 2. AR Aging Analysis ✅ (Backend Complete)
**File**: `/backend/reports/views/financial_reports.py` - `ARAgingReportView`

**Current Status**: Needs frontend implementation

**Enhancements Needed**:
- [ ] Backend: Add retail/wholesale segmentation to aging buckets
- [ ] Backend: Track credit sales by type (retail vs wholesale)
- [ ] Frontend: Update `ARAgingResponse` in types.ts
- [ ] Frontend: Update `ARAgingPage.tsx` with retail/wholesale breakdown
- [ ] Frontend: Aging buckets table with retail/wholesale columns
- [ ] Testing: Verify aging calculations

**Metrics to Track**:
- Aging buckets (0-30, 31-60, 61-90, 90+ days)
- Total outstanding (overall + retail + wholesale)
- Collection rate by segment
- Average days to payment
- Top delinquent customers

---

### 3. Collection Rates ✅ (Backend Complete)
**File**: `/backend/reports/views/financial_reports.py` - `CollectionRatesReportView`

**Current Status**: Needs frontend implementation

**Enhancements Needed**:
- [ ] Backend: Add retail/wholesale collection rates
- [ ] Backend: Track payment velocity by segment
- [ ] Frontend: Update `CollectionRatesResponse` in types.ts
- [ ] Frontend: Update `CollectionRatesPage.tsx` with retail/wholesale cards
- [ ] Frontend: Collection efficiency metrics
- [ ] Testing: Verify rate calculations

**Metrics to Track**:
- Collection rate (overall + retail + wholesale)
- Average collection period
- Payment methods for collections
- Monthly collection trends
- Collection efficiency ratio

---

### 4. Cash Flow Analysis ✅ (Backend Complete)
**File**: `/backend/reports/views/financial_reports.py` - `CashFlowReportView`

**Current Status**: Needs frontend implementation

**Enhancements Needed**:
- [ ] Backend: Add retail/wholesale cash flow segmentation
- [ ] Backend: Track inflows/outflows by segment
- [ ] Frontend: Update `CashFlowResponse` in types.ts
- [ ] Frontend: Update `CashFlowPage.tsx` with retail/wholesale breakdown
- [ ] Frontend: Cash flow trend chart
- [ ] Testing: Verify cash flow calculations

**Metrics to Track**:
- Total inflows/outflows (overall + retail + wholesale)
- Net cash flow
- Cash flow trends over time
- Payment method distribution
- Operating vs investing vs financing flows

---

## Phase 3: Inventory Reports (4 Reports)

### Priority: MEDIUM

### 1. Inventory Valuation
**File**: `/backend/reports/views/inventory_reports.py` - `StockLevelsSummaryReportView`

**Enhancements Needed**:
- [ ] Backend: Segment inventory by retail/wholesale pricing
- [ ] Backend: Calculate valuation for each segment
- [ ] Frontend: Update types and page with retail/wholesale cards
- [ ] Frontend: Valuation comparison table
- [ ] Testing: Verify valuation calculations

---

### 2. Stock Movement
**File**: `/backend/reports/views/inventory_reports.py` - `StockMovementHistoryReportView`

**Enhancements Needed**:
- [ ] Backend: Track movements by sale type (retail/wholesale)
- [ ] Backend: Movement velocity by segment
- [ ] Frontend: Update types and page with retail/wholesale breakdown
- [ ] Frontend: Movement trends chart
- [ ] Testing: Verify movement tracking

---

### 3. Low Stock Alerts
**File**: `/backend/reports/views/inventory_reports.py` - `LowStockAlertsReportView`

**Enhancements Needed**:
- [ ] Backend: Separate thresholds for retail/wholesale
- [ ] Backend: Alert priority by segment
- [ ] Frontend: Update types and page with retail/wholesale alerts
- [ ] Frontend: Alert cards with segment indicators
- [ ] Testing: Verify alert thresholds

---

### 4. Warehouse Analytics
**File**: `/backend/reports/views/inventory_reports.py` - `WarehouseAnalyticsReportView`

**Enhancements Needed**:
- [ ] Backend: Warehouse metrics by sale type
- [ ] Backend: Fulfillment efficiency by segment
- [ ] Frontend: Update types and page with retail/wholesale metrics
- [ ] Frontend: Warehouse performance dashboard
- [ ] Testing: Verify analytics accuracy

---

## Phase 4: Customer Reports (4 Reports)

### Priority: MEDIUM-LOW

### 1. Customer Lifetime Value
**File**: `/backend/reports/views/customer_reports.py` - `CustomerLifetimeValueReportView`

**Enhancements Needed**:
- [ ] Backend: Calculate CLV separately for retail/wholesale customers
- [ ] Backend: Segment prediction by customer type
- [ ] Frontend: Update types and page with retail/wholesale CLV
- [ ] Frontend: CLV comparison dashboard
- [ ] Testing: Verify CLV calculations

---

### 2. Customer Segmentation
**File**: `/backend/reports/views/customer_reports.py` - `CustomerSegmentationReportView`

**Enhancements Needed**:
- [ ] Backend: Additional segmentation by purchase type
- [ ] Backend: Segment characteristics by retail/wholesale
- [ ] Frontend: Update types and page with enhanced segmentation
- [ ] Frontend: Segment comparison matrix
- [ ] Testing: Verify segmentation logic

---

### 3. Purchase Pattern Analysis
**File**: `/backend/reports/views/customer_reports.py` - `PurchasePatternAnalysisReportView`

**Enhancements Needed**:
- [ ] Backend: Pattern analysis by sale type
- [ ] Backend: Frequency/recency by segment
- [ ] Frontend: Update types and page with retail/wholesale patterns
- [ ] Frontend: Pattern visualization
- [ ] Testing: Verify pattern detection

---

### 4. Customer Retention
**File**: `/backend/reports/views/customer_reports.py` - `CustomerRetentionMetricsReportView`

**Enhancements Needed**:
- [ ] Backend: Retention rates by customer type
- [ ] Backend: Churn prediction by segment
- [ ] Frontend: Update types and page with retail/wholesale retention
- [ ] Frontend: Retention trends dashboard
- [ ] Testing: Verify retention calculations

---

## Implementation Sequence (Recommended)

### Week 1: Phase 2 - Financial Reports
- Day 1-2: Revenue & Profit Analysis (backend + frontend)
- Day 3: AR Aging Analysis (backend + frontend)
- Day 4: Collection Rates (backend + frontend)
- Day 5: Cash Flow Analysis (backend + frontend)

### Week 2: Phase 3 - Inventory Reports
- Day 1-2: Inventory Valuation + Stock Movement
- Day 3-4: Low Stock Alerts + Warehouse Analytics

### Week 3: Phase 4 - Customer Reports
- Day 1-2: Customer Lifetime Value + Segmentation
- Day 3-4: Purchase Patterns + Retention

### Week 4: Testing & Refinement
- Day 1-2: Cross-report testing
- Day 3: CSV/PDF export verification
- Day 4: Performance optimization
- Day 5: Documentation updates

---

## Testing Checklist (Per Report)

### Backend Testing
- [ ] API endpoint responds with 200 status
- [ ] Response structure matches TypeScript interface
- [ ] Retail/wholesale totals add up to overall total
- [ ] Date range filtering works correctly
- [ ] Storefront filtering works correctly
- [ ] Group_by parameter works (day/week/month)
- [ ] CSV export generates valid file
- [ ] PDF export generates valid file (landscape mode)
- [ ] Error handling returns proper error messages

### Frontend Testing
- [ ] Page loads without errors
- [ ] Summary cards display correct data
- [ ] Retail/wholesale cards show correct breakdowns
- [ ] Percentages add up to 100%
- [ ] Tables render properly
- [ ] Charts/visualizations display (if applicable)
- [ ] Date range picker works
- [ ] Filter dropdowns work
- [ ] Export buttons trigger downloads
- [ ] Responsive layout works on mobile
- [ ] No TypeScript compilation errors
- [ ] No console errors in browser

---

## Success Criteria

### Code Quality
- ✅ Zero TypeScript errors across all files
- ✅ Consistent naming conventions (created_at__date, unit_price, order_count)
- ✅ DRY principle (reuse _build_summary and _build_time_series patterns)
- ✅ Proper error handling on backend and frontend
- ✅ Responsive UI with Bootstrap grid

### Data Accuracy
- ✅ Retail + wholesale = total revenue (within rounding)
- ✅ All percentages between 0-100%
- ✅ Date ranges respected in all queries
- ✅ Filter combinations work correctly
- ✅ CSV/PDF exports match on-screen data

### Performance
- ✅ Page load time < 2 seconds
- ✅ API response time < 1 second
- ✅ CSV export < 5 seconds for 10k records
- ✅ PDF export < 10 seconds for complex reports
- ✅ No N+1 query issues

### User Experience
- ✅ Clear visual hierarchy with cards
- ✅ Intuitive retail vs wholesale color coding (blue/green)
- ✅ Helpful empty states when no data
- ✅ Loading states during data fetch
- ✅ Error messages are user-friendly
- ✅ Export files have meaningful names

---

## Known Issues & Considerations

### Backend
- ⚠️ Some legacy reports may not have retail/wholesale fields - make them optional
- ⚠️ Payment method tracking may be incomplete for old data
- ⚠️ Large date ranges may cause slow queries - add pagination
- ⚠️ PDF generation memory usage for very large reports

### Frontend
- ⚠️ formatPercent function unused in CustomerAnalyticsPage (not critical)
- ⚠️ Unicode characters in some headings (🔍 emoji) - ensure UTF-8 encoding
- ⚠️ Need authentication token for API testing
- ⚠️ Some charts may need recharts or chart.js library

### Testing
- ⚠️ Need test data with retail and wholesale sales
- ⚠️ Need to verify calculations against manual spreadsheets
- ⚠️ Cross-browser testing required (Chrome, Firefox, Safari)

---

## Resources

### Documentation
- Backend API: `/backend/reports/views/` (views) + `/backend/reports/urls.py` (endpoints)
- Frontend Types: `/frontend/src/types/reports.ts`
- Frontend Pages: `/frontend/src/features/reports/pages/`
- Phase 1 Summary: `/frontend/docs/PHASE-1-SALES-REPORTS-COMPLETE.md`

### Key Files to Reference
- Pattern Example: `RevenueTrendsReportView` (backend) + `RevenueTrendsPage.tsx` (frontend)
- Type Definitions: `RevenueTrendsResponse` interface
- Utility Functions: `formatCurrency`, `formatDate`, `formatPercent`

### External Dependencies
- Django ORM: Aggregations, annotations, Q objects
- DRF: APIView, Response, status codes
- React: useState, useEffect, custom hooks
- Bootstrap 5: Grid system, cards, utilities
- ReportLab: PDF generation with landscape mode

---

**Next Action**: Begin Phase 2 - Revenue & Profit Analysis implementation (backend retail/wholesale + frontend updates)
