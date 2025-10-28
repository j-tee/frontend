# 📋 Backend API Requirements Summary

**Date:** October 6, 2025  
**Purpose:** Track all missing/incom| Feature | Backend Status | Frontend Status | Blocker |
|---------|---------------|-----------### Immediate (This Week) - CRITICAL

**1. Sales History Enhancements** (6-8 hours) ⏳ FRONTEND COMPLETE - BACKEND NEEDED
- [ ] **CRITICAL: Fix receipt_number in response** (10 min)
  - Ensure SaleSerializer includes receipt_number field
  - Test: curl /sales/api/sales/ | jq '.results[0].receipt_number'
  
- [ ] **CRITICAL: Fix data return issue** (30 min)
  - Currently only returning 7 sales (should be 504 from Jan-Oct)
  - Check: default filters, queryset, pagination
  - Remove any unintended filters
  
- [ ] **HIGH: Implement search** (1 hour)
  - Add SearchFilter to ViewSet
  - search_fields = ['receipt_number', 'customer__name', 'customer_name']
  - Test: /sales/api/sales/?search=REC-2025
  
- [ ] **HIGH: Implement date filters** (2 hours)
  - Create SaleFilter with date_from, date_to, date_range
  - Support quick filters: today, this_week, this_month, last_30_days, this_year
  - Support custom date range
  - Test: /sales/api/sales/?date_range=this_month
  
- [ ] **HIGH: Implement status/type filters** (30 min)
  - Add status and type to FilterSet
  - Support multiple status values
  - Test: /sales/api/sales/?status=COMPLETED&type=RETAIL
  
- [ ] **MEDIUM: Sales summary endpoint** (2 hours)
  - @action(detail=False) def summary(self, request)
  - Return: total_sales, avg_transaction, status_breakdown, daily_trend
  - Apply same filters as list view
  
- [ ] **MEDIUM: CSV export endpoint** (1 hour)
  - @action(detail=False) def export(self, request)
  - Return CSV with all filtered sales
  - Test: /sales/api/sales/export/?date_range=this_month

**Frontend Changes (Oct 6, 2025):** ✅ COMPLETE
- [x] Advanced search UI (receipt, customer, amount)
- [x] Date range filters UI (quick filters + custom)
- [x] Status filter dropdown
- [x] Active filters display with badges
- [x] Refresh & Clear buttons
- [x] Receipt number column ready
- [x] Debug logging

**2. Fix SAMPLE Approval Bug** (10 minutes) ⏳ IN PROGRESS|
| **Sales History Basic** | ✅ API Ready | ✅ Complete | ⚠️ Only 7 sales showing (not 504) |
| **Sales Search** | ❌ Missing | ✅ UI Ready | Need: search_fields in ViewSet |
| **Sales Date Filters** | ❌ Missing | ✅ UI Ready | Need: SaleFilter with date_range |
| **Sales Status Filters** | ❌ Missing | ✅ UI Ready | Need: status filter in FilterSet |
| **Sales Summary** | ❌ Missing | ⏳ Not started | Need: /summary/ endpoint |
| **Sales Export** | ❌ Missing | ⏳ Not started | Need: /export/ endpoint |
| **Receipt Numbers** | ⚠️ Partial | ✅ Complete | May be missing from serializer |
| **SAMPLE Approval** | 🐛 Bug | ✅ Working | requires_approval=false (data migration) |
| **Warehouse.Business** | 🔄 Investigating | ✅ Working | Validation error (under investigation) |
| **Adjustments List** | ✅ Working | ✅ Working | None |
| **Adjustments Create** | ⚠️ Partial | ✅ Working | Warehouse validation |
| **Adjustments Approve** | ✅ Working | ✅ Working | None |
| **Historical Quantity** | ✅ Working | ✅ Working | None |kend APIs for POS frontend

---

## 🔴 Critical Issues (Blocking Core Features)

### 1. Sales History Enhancements - 🔄 IN PROGRESS
**File:** `SALES-HISTORY-ENHANCEMENT-REQUIREMENTS.md`

**Status:** 🟡 **FRONTEND COMPLETE - BACKEND NEEDED**  
**Priority:** CRITICAL  
**Impact:** Sales history lacks real-world value - no search, filters, or insights  

**Current Problems:**
- ❌ Receipt numbers not displaying in table
- ❌ Only 7 sales showing (expected 504 from Jan-Oct)
- ❌ No search functionality (can't find specific sales)
- ❌ No date range filters (can't filter by period)
- ❌ No status filters (can't filter by completed/draft/etc)
- ❌ No insights or analytics (just a basic table)
- ❌ No export capability (can't generate reports)

**Frontend Completed (Oct 6, 2025):**
- ✅ Advanced search bar (receipt #, customer, amount)
- ✅ Date range filters (Today, This Week, This Month, Last 30 Days, This Year, Custom)
- ✅ Status filters (All, Completed, Draft, Cancelled, Refunded)
- ✅ Active filter display with badges
- ✅ Refresh & Clear Filters buttons
- ✅ Better pagination with filters
- ✅ Receipt number column ready
- ✅ Debug logging for troubleshooting

**Backend Required:**
```python
# 1. CRITICAL: Fix receipt_number in API response
class SaleSerializer(serializers.ModelSerializer):
    class Meta:
        fields = [..., 'receipt_number', ...]  # Must include!

# 2. CRITICAL: Fix data return (only 7 sales showing)
def get_queryset(self):
    # Ensure ALL sales returned (not just 7)
    queryset = Sale.objects.filter(storefront__business=user.business)
    return queryset.order_by('-created_at')

# 3. HIGH: Implement search
filter_backends = [filters.SearchFilter]
search_fields = ['receipt_number', 'customer__name', 'customer_name']

# 4. HIGH: Implement date filters
class SaleFilter(filters.FilterSet):
    date_from = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    date_to = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    date_range = filters.CharFilter(method='filter_date_range')  # today, this_week, etc.

# 5. HIGH: Implement status/type filters
status = filters.MultipleChoiceFilter(choices=Sale.STATUS_CHOICES)
type = filters.ChoiceFilter(choices=Sale.TYPE_CHOICES)

# 6. MEDIUM: Sales summary endpoint
@action(detail=False, methods=['get'])
def summary(self, request):
    # Return: total_sales, avg_transaction, status_breakdown, daily_trend

# 7. MEDIUM: CSV export
@action(detail=False, methods=['get'])
def export(self, request):
    # Return: CSV file with all filtered sales
```

**Estimated Backend Time:** 6-8 hours total
- Critical fixes (receipt_number, data return): 1 hour
- Search implementation: 1 hour  
- Date filters: 2 hours
- Status/type filters: 30 min
- Summary endpoint: 2 hours
- CSV export: 1 hour

**Frontend Status:** ✅ Complete (awaiting backend)  
**Testing:** ⏳ Pending backend implementation

---

### 2. Stock Adjustment Approval for SAMPLE Type - BUG
**File:** `BACKEND-BUG-SAMPLE-APPROVAL-MISSING.md`

**Status:** 🔴 DATA BUG  
**Priority:** MEDIUM  
**Impact:** SAMPLE adjustments bypass approval workflow

**Problem:**
- SAMPLE adjustments have `requires_approval = false`
- Should be `true` according to backend configuration doc
- Approve button doesn't show in UI (correct behavior - frontend working)

**Fix Required:**
```python
# adjustment_serializers.py
def validate(self, data):
    data['requires_approval'] = True  # For ALL types, no exceptions
    return data
```

**Estimated Time:** 7 minutes  
**Frontend Status:** ✅ Working correctly (waiting for backend data fix)

---

## 🟡 Medium Priority Issues

### 3. Warehouse Business Association Error
**Status:** 🔴 BLOCKING CREATE  
**Impact:** Cannot create stock adjustments

**Error:**
```json
{
  "warehouse": ["This field may not be null."],
  "warehouse.business": ["Warehouse must belong to the same business"]
}
```

**Investigation Needed:**
- Is warehouse field required on backend?
- Is business association validation correct?
- Frontend sends storefront, backend may need to derive warehouse

**Estimated Time:** Unknown (investigation needed)  
**Frontend Status:** ✅ Code correct (sends storefront ID)

---

## 🟢 Completed/Working

### ✅ Stock Adjustments List
- API working correctly
- Pagination functional
- Filters working
- Data complete

### ✅ Stock Adjustments Create
- API endpoint exists
- Validation working (except warehouse.business issue)
- Response format correct

### ✅ Stock Adjustments Approve/Reject
- API endpoints working
- Status updates correctly
- Stock updates on approval

### ✅ Historical Quantity Tracking
- Backend implemented `quantity_before` field
- API returning data correctly
- Frontend integrated successfully

---

## 📊 Implementation Status Overview

| Feature | Backend Status | Frontend Status | Blocker |
|---------|---------------|-----------------|---------|
| **Sales History** | ✅ Ready | 🔄 Integration Pending | None - Ready to integrate |
| **SAMPLE Approval** | 🐛 Bug | ✅ Working | requires_approval=false (data migration) |
| **Warehouse.Business** | � Investigating | ✅ Working | Validation error (under investigation) |
| **Adjustments List** | ✅ Working | ✅ Working | None |
| **Adjustments Create** | ⚠️ Partial | ✅ Working | Warehouse validation |
| **Adjustments Approve** | ✅ Working | ✅ Working | None |
| **Historical Quantity** | ✅ Working | ✅ Working | None |

**Legend:**
- ✅ Working - Fully functional
- 🔄 Integration Pending - Backend ready, frontend needs update
- ⚠️ Partial - Works with issues
- 🐛 Bug - Has bugs but exists
- ❌ Missing - Not implemented
- ✅ Complete - Fully implemented and tested

---

## 🎯 Action Items for Backend Team

### Immediate (This Week)

**1. Integrate Sales History API** (15 minutes) ✅ COMPLETE
- [x] Backend: Sale, SaleItem, Payment models created
- [x] Backend: Serializers with all required fields
- [x] Backend: ViewSet with filters and pagination
- [x] Backend: Database indexes for performance
- [x] Backend: Test data (504 sales) available
- [x] Backend: Deployed and ready
- [x] Frontend: Update SalesHistory component
- [x] Frontend: Add pagination controls (First/Prev/Next/Last)
- [x] Frontend: Add page size selector (10/20/50/100)
- [x] Frontend: Test integration
- [ ] Frontend: Add filters UI (date range, status, search)

**2. Fix SAMPLE Approval Bug** (10 minutes) ⏳ IN PROGRESS
- [ ] Run data migration to set requires_approval=true
- [ ] Test SAMPLE adjustment creation
- [ ] Verify frontend shows approve button

**3. Investigate Warehouse Business Validation** (30 minutes) 🔄 INVESTIGATING
- [ ] Check if warehouse field actually needed
- [ ] Review business association logic
- [ ] Test storefront → warehouse mapping
- [ ] Document expected behavior
- [ ] Fix or remove validation

### Future (This Month)

**4. Photo/Document Upload API**
- [ ] File upload endpoint for adjustments
- [ ] S3/storage integration
- [ ] Thumbnail generation
- [ ] Security validation

**5. Physical Count Workflow**
- [ ] Count session management
- [ ] Variance calculation
- [ ] Auto-adjustment creation

**6. Reports & Analytics**
- [ ] Daily sales reports
- [ ] Product sales analysis
- [ ] Shrinkage reports
- [ ] Profit projections

---

## 📝 Notes for Backend Developer

### Authentication
All endpoints require JWT Bearer token:
```http
Authorization: Bearer <token>
```

### Response Format Standard
```json
{
  "count": 100,
  "next": "url",
  "previous": "url",
  "results": [...]
}
```

### Field Naming Convention
- **Backend (Django):** `snake_case`
- **Frontend (TypeScript):** `camelCase` (auto-converted)
- **API Response:** `snake_case` (frontend converts)

### Status Values
Use UPPERCASE for all status/type fields:
- `PENDING`, `APPROVED`, `COMPLETED`
- `RETAIL`, `WHOLESALE`
- `CASH`, `CARD`, `CREDIT`, `MOMO`

### Decimal Precision
All money fields: 2 decimal places
```python
models.DecimalField(max_digits=12, decimal_places=2)
```

### Timestamps
ISO 8601 format:
```
2025-10-06T10:30:00Z
```

### Nullable Fields
Return `null`, not missing:
```json
{
  "customer": null,  // ✅ Correct
  "notes": null      // ✅ Correct
  // "optional_field"  ❌ Wrong (missing key)
}
```

---

## 🧪 Testing Checklist

Before marking any API as "complete":

**Functional Tests:**
- [ ] Endpoint returns expected data structure
- [ ] All required fields present
- [ ] Nullable fields return `null` (not missing)
- [ ] Pagination works (page, page_size)
- [ ] Filters work (at least 3 filter types)
- [ ] Search works (text search)
- [ ] Ordering works (default: newest first)

**Performance Tests:**
- [ ] < 500ms for typical request (20 items)
- [ ] < 2s for max request (100 items)
- [ ] No N+1 queries (use select_related/prefetch_related)
- [ ] Database indexes in place

**Error Handling:**
- [ ] 401 if not authenticated
- [ ] 403 if no permission
- [ ] 400 if invalid filters
- [ ] 404 if not found
- [ ] 500 with proper error message

**Security:**
- [ ] User can only see their business data
- [ ] Proper permission checks
- [ ] No sensitive data leaked
- [ ] SQL injection prevented
- [ ] XSS prevention

---

## 📞 Communication

### Status Updates
Please provide daily updates on:
1. What APIs were completed
2. What issues were encountered
3. ETA for remaining items

### Questions
If anything is unclear:
1. Check the detailed requirement docs first
2. Ask in Slack/Teams with specific question
3. Tag frontend developer if needed

### Testing
Before marking complete:
1. Test with Postman/curl
2. Share sample response in Slack
3. Deploy to staging
4. Notify frontend for integration testing

---

## 📈 Progress Tracking

### Week 1 Goals (Oct 6-12)
- [x] Historical quantity tracking (DONE ✅)
- [x] Sales history API (DONE ✅ - Oct 6, 2025)
- [x] Frontend sales history integration (DONE ✅ - Oct 6, 2025)
- [x] Pagination controls (DONE ✅ - Oct 6, 2025)
- [ ] SAMPLE approval bug fix (IN PROGRESS ⏳)
- [ ] Warehouse validation fix (INVESTIGATING 🔄)

### Week 2 Goals (Oct 13-19)
- [ ] Photo upload API
- [ ] Physical count workflow
- [ ] Shrinkage reports

### Month 1 Goals (October)
- [ ] All core APIs functional
- [ ] Performance optimized
- [ ] Full test coverage
- [ ] Production ready

---

**Last Updated:** October 6, 2025  
**Next Review:** October 7, 2025  
**Owner:** Backend Team  
**Stakeholder:** Frontend Team

---

## Quick Reference Links

- **Sales History:** `BACKEND-SALES-HISTORY-REQUIREMENTS.md`
- **SAMPLE Bug:** `BACKEND-BUG-SAMPLE-APPROVAL-MISSING.md`
- **Approval Workflow:** `STOCK-ADJUSTMENT-APPROVAL-WORKFLOW.md`
- **Historical Quantity:** `STOCK-ADJUSTMENT-HISTORICAL-QUANTITY-INTEGRATION.md`
- **Implementation Status:** `STOCK-ADJUSTMENT-IMPLEMENTATION-STATUS.md`
