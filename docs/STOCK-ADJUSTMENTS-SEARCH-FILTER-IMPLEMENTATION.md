# Stock Adjustments Search & Filter - Implementation Guide

## Overview
This document describes the comprehensive search and filter functionality for the stock adjustments table, allowing users to efficiently find and view specific adjustments.

## Features Implemented

### 1. Search Functionality
**Field**: Text input with placeholder "Search by product, reason, or creator..."

**Backend Parameter**: `search`

**Searches Across**:
- Product name
- Adjustment reason
- Creator name

**Behavior**:
- Debounced search (triggers on value change)
- Resets to page 1 on new search
- Clears when "Clear Filters" button clicked
- Can be combined with status and type filters

### 2. Status Filter
**Field**: Dropdown select

**Backend Parameter**: `status`

**Options**:
- All Statuses (default - no filter)
- PENDING
- APPROVED
- REJECTED
- COMPLETED

**Use Cases**:
- View only pending adjustments requiring approval
- Review approved adjustments
- Check rejected adjustments
- Filter completed adjustments

**Quick Action**: "View Pending" button sets status filter to PENDING

### 3. Adjustment Type Filter
**Field**: Dropdown select

**Backend Parameter**: `adjustment_type`

**Options**:
- All Types (default - no filter)
- Shrinkage
- Damaged
- Returned
- Miscellaneous

**Use Cases**:
- Track shrinkage trends
- Review damaged goods
- Monitor returns
- Analyze specific adjustment categories

### 4. Active Filters Display
**Visual Feedback**:
- Badge pills showing active filters
- Individual close buttons to remove specific filters
- Shows filtered values clearly
- Located below filter controls

**Components**:
```tsx
{adjustmentSearchTerm && (
  <Badge bg="secondary">
    Search: {adjustmentSearchTerm}
    <button className="btn-close btn-close-white" onClick={clearSearch} />
  </Badge>
)}
```

### 5. Clear Filters Button
**Location**: Right side of filter row

**Behavior**:
- Clears all active filters (search, status, type)
- Resets to page 1
- Disabled when no filters active
- Provides visual feedback of disabled state

## Implementation Details

### State Management
```typescript
// Local state for filters
const [adjustmentSearchTerm, setAdjustmentSearchTerm] = useState('')
const [adjustmentStatusFilter, setAdjustmentStatusFilter] = useState<string>('')
const [adjustmentTypeFilter, setAdjustmentTypeFilter] = useState<string>('')
```

### Parameter Building
```typescript
const buildAdjustmentParams = useCallback((
  page: number = adjustmentsPage, 
  additionalParams: Record<string, unknown> = {}
) => {
  const params: Record<string, unknown> = { page, ...additionalParams }
  if (adjustmentSearchTerm) params.search = adjustmentSearchTerm
  if (adjustmentStatusFilter) params.status = adjustmentStatusFilter
  if (adjustmentTypeFilter) params.adjustment_type = adjustmentTypeFilter
  return params
}, [adjustmentsPage, adjustmentSearchTerm, adjustmentStatusFilter, adjustmentTypeFilter])
```

### Filter Handlers
```typescript
const handleAdjustmentSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
  setAdjustmentSearchTerm(e.target.value)
  dispatch(setAdjustmentsPage(1)) // Reset to first page
}

const handleAdjustmentStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
  setAdjustmentStatusFilter(e.target.value)
  dispatch(setAdjustmentsPage(1))
}

const handleAdjustmentTypeFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
  setAdjustmentTypeFilter(e.target.value)
  dispatch(setAdjustmentsPage(1))
}

const handleClearAdjustmentFilters = () => {
  setAdjustmentSearchTerm('')
  setAdjustmentStatusFilter('')
  setAdjustmentTypeFilter('')
  dispatch(setAdjustmentsPage(1))
}
```

### useEffect Integration
```typescript
useEffect(() => {
  if (activeTab === 'stock-adjustments') {
    const params = buildAdjustmentParams()
    void dispatch(loadStockAdjustments(params))
    console.log('📊 Loading stock adjustments with filters:', params)
  }
}, [activeTab, dispatch, buildAdjustmentParams])
```

### Filter Persistence Across Operations
All adjustment operations maintain current filters:
- Create adjustment → Reload with filters
- Approve adjustment → Reload with filters
- Reject adjustment → Reload with filters
- Edit adjustment → Reload with filters
- Pagination → Maintain filters across pages

## UI Layout

### Filter Controls Row
```
┌─────────────────────────────────────────────────────────────────┐
│ Search                  Status           Type          Actions  │
│ [Text Input       ]    [Dropdown]     [Dropdown]   [Clear Btn]  │
└─────────────────────────────────────────────────────────────────┘
```

### Active Filters Row (conditional)
```
┌─────────────────────────────────────────────────────────────────┐
│ Active filters:  [Search: keyword ×]  [Status: PENDING ×]      │
└─────────────────────────────────────────────────────────────────┘
```

## Backend API Contract

### Request Parameters
```
GET /inventory/api/stock-adjustments/?search=term&status=PENDING&adjustment_type=shrinkage&page=1
```

### Expected Backend Behavior
- `search`: Full-text search across product name, reason, creator
- `status`: Exact match on status field
- `adjustment_type`: Exact match on adjustment_type field
- `page`: Pagination page number

### Response
Standard paginated response with filtered results:
```json
{
  "count": 42,
  "next": "...",
  "previous": "...",
  "results": [...]
}
```

## User Workflows

### Finding Pending Approvals
1. Click "View Pending" button
   - Sets status filter to PENDING
   - Resets to page 1
   - Shows only pending adjustments

### Searching for Specific Product
1. Type product name in search field
2. Results filter automatically
3. Page resets to 1
4. Can combine with status/type filters

### Reviewing Damaged Goods
1. Select "Damaged" from Type dropdown
2. Optionally add status filter (e.g., APPROVED)
3. Review all damaged adjustments

### Clearing Filters
**Option 1**: Click "Clear Filters" button
**Option 2**: Click × on individual filter badges
**Option 3**: Select "All Statuses" or "All Types" from dropdowns

## Edge Cases Handled

### Empty Results
- Shows "No stock adjustments found" message
- Suggests creating first adjustment or clearing filters

### Filter Combinations
- All filters work together (AND logic)
- Search + Status + Type = Maximum specificity

### Pagination with Filters
- Page numbers relative to filtered results
- Filters maintained across page changes
- Previous/Next buttons disabled appropriately

### State Consistency
- Filters persist during modal operations
- Filters cleared only when explicitly requested
- Page resets to 1 when filters change

## Testing Checklist

### Search Functionality
- [ ] Search by product name returns correct results
- [ ] Search by reason returns correct results
- [ ] Search by creator name returns correct results
- [ ] Empty search shows all adjustments
- [ ] Search resets to page 1

### Status Filter
- [ ] Filter by PENDING works
- [ ] Filter by APPROVED works
- [ ] Filter by REJECTED works
- [ ] Filter by COMPLETED works
- [ ] "All Statuses" shows all adjustments
- [ ] "View Pending" button sets PENDING filter

### Type Filter
- [ ] Filter by Shrinkage works
- [ ] Filter by Damaged works
- [ ] Filter by Returned works
- [ ] Filter by Miscellaneous works
- [ ] "All Types" shows all types

### Combined Filters
- [ ] Search + Status works
- [ ] Search + Type works
- [ ] Status + Type works
- [ ] All three filters together work

### Clear Filters
- [ ] "Clear Filters" button clears all filters
- [ ] "Clear Filters" disabled when no filters active
- [ ] Individual badge × buttons clear specific filters
- [ ] Clearing filters resets to page 1

### Pagination
- [ ] Pagination works with filters active
- [ ] Page count reflects filtered results
- [ ] Previous/Next buttons work correctly
- [ ] Direct page navigation maintains filters

### Operations
- [ ] Creating adjustment maintains filters
- [ ] Approving adjustment maintains filters
- [ ] Rejecting adjustment maintains filters
- [ ] Editing adjustment maintains filters

### UI/UX
- [ ] Active filters display correctly
- [ ] Filter badges show correct values
- [ ] Dropdown selections reflect current state
- [ ] Search input shows current search term

## Performance Considerations

### Debouncing
Consider adding debouncing to search input to reduce API calls:
```typescript
const [debouncedSearchTerm] = useDebounce(adjustmentSearchTerm, 300)
```

### Backend Optimization
Backend should have indexes on:
- `status` field
- `adjustment_type` field
- Full-text search on product name, reason, creator

### Caching
- Results cached by Redux store
- Cache invalidated on mutations (create/approve/reject/edit)

## Future Enhancements

### Date Range Filter
Add created_at date range filtering:
```typescript
const [dateFrom, setDateFrom] = useState('')
const [dateTo, setDateTo] = useState('')
```

### Creator Filter
Dedicated dropdown for filtering by specific creator:
```typescript
const [creatorFilter, setCreatorFilter] = useState<string>('')
```

### Saved Filters
Allow users to save common filter combinations:
```typescript
const savedFilters = [
  { name: "My Pending", filters: { status: "PENDING", created_by: userId } },
  { name: "Recent Shrinkage", filters: { type: "shrinkage", days: 7 } }
]
```

### Export Filtered Results
Add button to export current filtered view to CSV/Excel

### Filter Presets
Quick filter buttons for common scenarios:
- "Today's Adjustments"
- "This Week"
- "Requiring Approval"
- "My Adjustments"

## Troubleshooting

### Filters Not Working
1. Check backend API supports filter parameters
2. Verify parameter names match backend expectations
3. Check browser console for API errors
4. Ensure buildAdjustmentParams includes all filters

### Results Not Updating
1. Verify useEffect dependencies include filter states
2. Check buildAdjustmentParams is memoized correctly
3. Ensure dispatch calls use buildAdjustmentParams()

### Pagination Issues
1. Confirm filters passed to pagination handlers
2. Verify page resets to 1 on filter changes
3. Check pagination count reflects filtered results

## Related Documentation
- [Stock Adjustment Edit Implementation](./STOCK-ADJUSTMENT-EDIT-IMPLEMENTATION.md)
- [Stock Reconciliation Frontend Implementation](./STOCK-RECONCILIATION-FRONTEND-IMPLEMENTATION.md)
- [Backend API Documentation](./BACKEND-README-SALES.md)
