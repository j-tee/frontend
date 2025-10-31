# 📊 Stock Movement History Report - Backend Data Requirements

**Date:** October 30, 2025  
**Priority:** HIGH  
**Module:** Reports - Stock Movement History  
**Status:** 🔄 **SEEKING BACKEND ALIGNMENT**

---

## 📋 Executive Summary

The Stock Movement History report tracks **all inventory transactions** across the system. The frontend is implemented and functional, but we need to verify backend data structure alignment and clarify several data relationships to ensure optimal user experience.

---

## 🎯 Report Purpose

### **User Goals:**
1. **Audit Trail** - Track every inventory change with full accountability
2. **Compliance** - Maintain records for regulatory/tax purposes
3. **Investigation** - Research discrepancies or unusual patterns
4. **Performance Analysis** - Understand inventory flow patterns

### **Business Value:**
- Loss prevention (identify shrinkage sources)
- Process optimization (spot inefficiencies)
- Accountability (track who did what when)
- Forecasting (understand movement patterns)

---

## 🔍 Current Frontend Implementation

### **File:** `src/features/reports/pages/StockMovementsPage.tsx`

**Status:** ✅ Fully implemented (694 lines)

**Features Implemented:**
- ✅ Date range filtering (default: last 30 days)
- ✅ Product search by name/SKU
- ✅ Warehouse filter dropdown
- ✅ Category filter dropdown
- ✅ Movement type filter (IN, OUT, ADJUSTMENT, TRANSFER)
- ✅ Reference type filter (Purchase Order, Sale, Transfer, Adjustment)
- ✅ Pagination (20 items per page, configurable)
- ✅ Multi-column sorting
- ✅ CSV export
- ✅ Summary cards (Total Movements, In, Out, Adjustments, Transfers)
- ✅ Mobile responsive design

---

## 📡 Backend API Specification

### **Endpoint:**
```
GET /reports/api/inventory/movements/
```

### **Required Query Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `start_date` | ISO 8601 Date | Yes | Movement start date | `2025-10-01` |
| `end_date` | ISO 8601 Date | Yes | Movement end date | `2025-10-30` |

### **Optional Query Parameters:**

| Parameter | Type | Required | Description | Example | Frontend State |
|-----------|------|----------|-------------|---------|----------------|
| `search` | String | No | Product name or SKU search | `Samsung` | `searchQuery` |
| `warehouse_id` | UUID | No | Filter by warehouse | `uuid-here` | `warehouseId` |
| `category_id` | UUID | No | Filter by product category | `uuid-here` | `categoryId` |
| `product_id` | UUID | No | Filter by specific product | `uuid-here` | (Not exposed in UI) |
| `movement_type` | Enum | No | `in`, `out`, `adjustment`, `transfer` | `in` | `movementType` |
| `reference_type` | Enum | No | `purchase_order`, `sale`, `transfer`, `adjustment` | `sale` | `referenceType` |
| `page` | Integer | No | Page number (1-indexed) | `1` | `page` |
| `page_size` | Integer | No | Items per page | `20` | `pageSize` |
| `sort_by` | Enum | No | `date`, `quantity`, `product`, `type` | `date` | `sortBy` |
| `sort_order` | Enum | No | `asc`, `desc` | `desc` | `sortOrder` |

---

## 📦 Expected Response Structure

### **Complete JSON Schema:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_movements": 1250,
      "total_in": 500,
      "total_out": 650,
      "total_adjustments": 75,
      "total_transfers": 25
    },
    "movements": [
      {
        "movement_id": "550e8400-e29b-41d4-a716-446655440000",
        "product_id": "product-uuid",
        "product_name": "Samsung TV 43\"",
        "sku": "ELEC-0005",
        "warehouse_id": "warehouse-uuid",
        "warehouse_name": "Rawlings Park Warehouse",
        "movement_type": "out",
        "adjustment_type": "OUT",
        "reference_number": "ADJ-2025-001",
        "quantity": 50,
        "quantity_before": 150,
        "quantity_after": 100,
        "reference_type": "sale",
        "reference_id": "sale-uuid",
        "performed_by": "John Doe",
        "performed_by_id": "user-uuid",
        "notes": "Completed sale to customer",
        "created_at": "2025-10-15T14:30:00Z"
      }
    ],
    "by_warehouse": {
      "warehouse-uuid-1": {
        "name": "Main Warehouse",
        "movements": 450,
        "net_change": 150
      },
      "warehouse-uuid-2": {
        "name": "Secondary Warehouse",
        "movements": 800,
        "net_change": -50
      }
    },
    "by_category": {
      "category-uuid-1": {
        "name": "Electronics",
        "movements": 320,
        "net_change": -80
      },
      "category-uuid-2": {
        "name": "Furniture",
        "movements": 930,
        "net_change": 180
      }
    }
  },
  "meta": {
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_count": 1250,
      "total_pages": 63
    }
  }
}
```

---

## ❓ Critical Questions for Backend Team

### **1. Movement Type Classification**

**Question:** We see both `movement_type` (legacy) and `adjustment_type` (new) in the type definitions. Which should we rely on?

**Options:**
- **A)** `movement_type` only (`in`, `out`, `adjustment`, `transfer`)
- **B)** `adjustment_type` only (`IN`, `OUT`, `ADJUSTMENT`, `TRANSFER_OUT`, `TRANSFER_IN`)
- **C)** Both (for different purposes)

**Frontend Impact:**
- We currently use `movement_type` for filtering and display
- If `adjustment_type` is preferred, we need to update our filter logic
- The distinction between `TRANSFER_OUT` and `TRANSFER_IN` provides better granularity

**Recommendation:** Use `adjustment_type` as primary, keep `movement_type` for backwards compatibility

---

### **2. Reference Linking**

**Question:** How should we link movements to their source transactions?

**Current Understanding:**
```typescript
reference_type: 'purchase_order' | 'sale' | 'transfer' | 'adjustment'
reference_id: UUID
reference_number?: string  // NEW field we added
```

**Scenarios:**

**A) Sale Movement:**
```json
{
  "movement_type": "out",
  "reference_type": "sale",
  "reference_id": "sale-uuid",
  "reference_number": "SALE-2025-001"  // ← Is this available?
}
```

**B) Purchase Order:**
```json
{
  "movement_type": "in",
  "reference_type": "purchase_order",
  "reference_id": "po-uuid",
  "reference_number": "PO-2025-042"  // ← Is this available?
}
```

**C) Transfer:**
```json
{
  "movement_type": "transfer",
  "reference_type": "transfer",
  "reference_id": "transfer-uuid",
  "reference_number": "XFER-2025-015"  // ← Is this available?
}
```

**D) Manual Adjustment:**
```json
{
  "movement_type": "adjustment",
  "reference_type": "adjustment",
  "reference_id": "adjustment-uuid",
  "reference_number": "ADJ-2025-088"  // ← Is this available?
}
```

**What we need:**
1. ✅ Confirm `reference_number` field is available for all movement types
2. ✅ Provide format/pattern for each reference type
3. ✅ Confirm these link to actual records (not orphaned references)

---

### **3. Data Aggregations**

**Question:** Do `by_warehouse` and `by_category` aggregations exist in the backend response?

**Current Status:**
- Frontend types define these as **optional** (`by_warehouse?`, `by_category?`)
- Frontend uses them to populate filter dropdowns
- If not provided, dropdowns show "No data"

**What we need:**
```json
"by_warehouse": {
  "uuid": {
    "name": "Warehouse Name",
    "movements": 450,        // Count of movements
    "net_change": 150        // Sum of IN movements - OUT movements
  }
}
```

**Questions:**
1. ✅ Are these aggregations calculated in the backend?
2. ✅ Do they respect current filters (date range, search, etc.)?
3. ✅ Should `net_change` be in units or monetary value?
4. ✅ Should we add `by_product` aggregation as well?

---

### **4. Quantity Tracking**

**Question:** How are `quantity_before` and `quantity_after` calculated?

**Current Understanding:**
```json
{
  "quantity": 50,           // Amount of this movement
  "quantity_before": 150,   // Stock level before movement
  "quantity_after": 100     // Stock level after movement
}
```

**Scenarios:**

**A) Simple Outbound Sale:**
```
Before: 150 units
Movement: -50 units (sold)
After: 100 units
✓ Math checks: 150 - 50 = 100
```

**B) Inbound Purchase:**
```
Before: 100 units
Movement: +200 units (received)
After: 300 units
✓ Math checks: 100 + 200 = 300
```

**C) Transfer Out:**
```
Warehouse A:
  Before: 150 units
  Movement: -30 units (transferred)
  After: 120 units

Warehouse B:
  Before: 50 units
  Movement: +30 units (received)
  After: 80 units
```

**D) Adjustment (Shrinkage):**
```
Before: 150 units
Movement: -10 units (damaged/lost)
After: 140 units
```

**Questions:**
1. ✅ Are `quantity_before` and `quantity_after` **warehouse-specific** or **product-total**?
2. ✅ For transfers, do we get **two movements** (one OUT, one IN) or one?
3. ✅ How do concurrent movements affect these values? (race conditions)
4. ✅ Are these calculated at movement creation time (snapshot) or dynamically?

**Recommendation:** Warehouse-specific snapshots at movement creation time for accuracy

---

### **5. Performer Attribution**

**Question:** What user information is available for the `performed_by` fields?

**Current Structure:**
```json
{
  "performed_by": "John Doe",
  "performed_by_id": "user-uuid"
}
```

**Scenarios:**

**A) Manual Adjustment:**
- User: John Doe manually creates adjustment
- Expected: `performed_by = "John Doe"`

**B) Automated Sale:**
- User: Jane Smith completes a sale
- System: Automatically creates movement record
- Expected: `performed_by = "Jane Smith"` (not "System")

**C) Import/Migration:**
- Data imported from old system
- Expected: `performed_by = "Data Migration"` or `"System Import"`?

**D) API/Integration:**
- External system creates movement via API
- Expected: `performed_by = "API Client"` or actual user?

**Questions:**
1. ✅ Is `performed_by` always the authenticated user who initiated the action?
2. ✅ For automated actions (e.g., completed sales auto-create movements), who is the performer?
3. ✅ How are system-generated movements attributed?
4. ✅ Can we get user role/department info for better context?

---

### **6. Movement Type Definitions**

**Question:** Please confirm the exact definition and sources for each movement type:

| Movement Type | Direction | Sources | Example Use Cases |
|---------------|-----------|---------|-------------------|
| **IN** | Increase | Purchase orders, returns, adjustments (increase), transfers in | Stock received from supplier |
| **OUT** | Decrease | Sales, damaged/expired, adjustments (decrease), transfers out | Items sold to customer |
| **ADJUSTMENT** | Both | Manual corrections, stock counts, found items, shrinkage | Physical count mismatch |
| **TRANSFER** | Neutral | Warehouse-to-warehouse movement | Rebalance stock between locations |

**Clarifications Needed:**
1. ✅ Are **customer returns** classified as `IN` movements with `reference_type: "adjustment"`?
2. ✅ Are **supplier returns** classified as `OUT` movements?
3. ✅ Do **transfers** create ONE movement or TWO (one OUT, one IN)?
4. ✅ How are **stock count corrections** handled (IN, OUT, or ADJUSTMENT)?

---

### **7. Date Range & Pagination**

**Question:** Performance expectations for large datasets:

**Typical Use Cases:**
- **Daily Review:** Last 24 hours (~100-500 movements)
- **Weekly Report:** Last 7 days (~500-2,000 movements)
- **Monthly Audit:** Last 30 days (~2,000-10,000 movements)
- **Annual Review:** Last 365 days (~50,000+ movements)

**Questions:**
1. ✅ What's the maximum recommended date range (performance-wise)?
2. ✅ Should we enforce a maximum (e.g., 90 days) in the UI?
3. ✅ For large datasets, what's the recommended page size (currently 20)?
4. ✅ Are there database indexes on `created_at`, `warehouse_id`, `product_id`?

**Performance Targets:**
- Initial load: < 2 seconds
- Filter change: < 500ms
- Pagination: < 300ms
- Export: < 10 seconds for 10,000 records

---

### **8. Notes & Context**

**Question:** What information goes into the `notes` field?

**Current Type:** `notes: string`

**Examples Seen:**
- `"Weekly restock"`
- `"Damaged during transport"`
- `"Customer return - defective"`
- `"Physical count correction"`

**Questions:**
1. ✅ Is `notes` user-entered or auto-generated?
2. ✅ Is there a character limit?
3. ✅ Can it be null/empty?
4. ✅ Should we support rich text or just plain text?
5. ✅ Are there predefined reason templates for common adjustments?

---

### **9. Export Functionality**

**Question:** CSV export format expectations:

**Frontend Implementation:**
```typescript
await inventoryReportsService.exportStockMovementsCSV({
  start_date: '2025-10-01',
  end_date: '2025-10-30',
  search: 'Samsung',
  warehouse_id: 'uuid',
  // ... other filters
});
```

**Expected CSV Columns:**
```csv
Date,Product,SKU,Warehouse,Type,Quantity,Before,After,Reference,Performed By,Notes
2025-10-15 14:30,Samsung TV 43",ELEC-0005,Rawlings Park,OUT,50,150,100,SALE-2025-001,John Doe,"Completed sale"
```

**Questions:**
1. ✅ Does export respect all current filters?
2. ✅ What's the maximum row limit for export?
3. ✅ Should we add a "Preparing export..." loading state?
4. ✅ Can we get export in Excel format (.xlsx) as well?
5. ✅ Should timestamps include timezone or be UTC?

---

### **10. Filtering Performance**

**Question:** How should we handle filter combinations?

**Complex Filter Scenario:**
```
Date Range: Last 30 days (10,000 movements)
+ Search: "Samsung" (narrows to 500 movements)
+ Warehouse: "Main Warehouse" (narrows to 200 movements)
+ Movement Type: "out" (narrows to 80 movements)
+ Reference Type: "sale" (narrows to 60 movements)
```

**Questions:**
1. ✅ Are filters applied as **AND** (all must match) or **OR** (any can match)?
2. ✅ What's the expected query performance for multi-filter scenarios?
3. ✅ Should we debounce the search input (wait X ms after typing)?
4. ✅ Should we show a "filtering..." indicator during backend processing?

**Current Frontend:** Uses 500ms debounce on search, immediate filter on dropdowns

---

## 📊 Data Validation Requirements

### **Required Fields (Must Never be Null):**

| Field | Type | Validation | Example |
|-------|------|------------|---------|
| `movement_id` | UUID | Valid UUID v4 | `550e8400-e29b-41d4-a716-446655440000` |
| `product_id` | UUID | Valid UUID, product exists | `product-uuid` |
| `product_name` | String | 1-255 chars | `Samsung TV 43"` |
| `sku` | String | 1-50 chars | `ELEC-0005` |
| `warehouse_id` | UUID | Valid UUID, warehouse exists | `warehouse-uuid` |
| `warehouse_name` | String | 1-255 chars | `Rawlings Park Warehouse` |
| `movement_type` | Enum | `in`, `out`, `adjustment`, `transfer` | `out` |
| `quantity` | Integer | > 0 | `50` |
| `quantity_before` | Integer | >= 0 | `150` |
| `quantity_after` | Integer | >= 0 | `100` |
| `reference_type` | Enum | `purchase_order`, `sale`, `transfer`, `adjustment` | `sale` |
| `reference_id` | UUID | Valid UUID | `sale-uuid` |
| `performed_by` | String | 1-255 chars | `John Doe` |
| `performed_by_id` | UUID | Valid UUID, user exists | `user-uuid` |
| `created_at` | ISO DateTime | Valid ISO 8601 | `2025-10-15T14:30:00Z` |

### **Optional Fields (Can be Null/Empty):**

| Field | Type | Notes |
|-------|------|-------|
| `adjustment_type` | Enum | `IN`, `OUT`, `ADJUSTMENT`, `TRANSFER_OUT`, `TRANSFER_IN` |
| `reference_number` | String | Display-friendly reference (e.g., `SALE-2025-001`) |
| `notes` | String | Free-text context (max 1000 chars recommended) |

### **Consistency Checks:**

```python
# Quantity math must be consistent
assert quantity_after == quantity_before + quantity  # for IN
assert quantity_after == quantity_before - quantity  # for OUT

# Movement type alignment
if movement_type == 'in':
    assert quantity_after > quantity_before
if movement_type == 'out':
    assert quantity_after < quantity_before

# Reference must exist
if reference_type == 'sale':
    assert Sale.objects.filter(id=reference_id).exists()
```

---

## 🎨 Frontend UI Expectations

### **Summary Cards:**
```
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│📊 Total     │📥 Stock In  │📤 Stock Out │⚖️ Adjustments│🔄 Transfers │
│  1,250      │    500      │    650      │     75      │     25      │
│ movements   │ movements   │ movements   │ movements   │ movements   │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

### **Movement Table:**
```
┌──────────────┬──────────────┬──────────────┬──────┬──────────────┬────────────┬────────────┐
│ Date/Time    │ Product      │ Warehouse    │ Type │ Quantity     │ Reference  │ Performed  │
│              │              │              │      │ Before→After │            │ By         │
├──────────────┼──────────────┼──────────────┼──────┼──────────────┼────────────┼────────────┤
│ Oct 15 14:30 │ Samsung TV   │ Rawlings     │ OUT  │ 150 → 100    │ SALE-001   │ John Doe   │
│              │ ELEC-0005    │ Park         │ 📤   │ (-50)        │            │            │
└──────────────┴──────────────┴──────────────┴──────┴──────────────┴────────────┴────────────┘
```

**Color Coding:**
- 🟢 **Green:** Stock IN movements (positive impact)
- 🔴 **Red:** Stock OUT movements (negative impact)
- 🟡 **Amber:** Adjustments (manual corrections)
- 🔵 **Blue:** Transfers (neutral, just relocation)

---

## 🚀 Implementation Priorities

### **Phase 1: Data Structure Verification** (Week 1)
1. ✅ Confirm response schema matches frontend expectations
2. ✅ Validate all required fields are populated
3. ✅ Test with real production data (sample dataset)
4. ✅ Verify pagination metadata structure

### **Phase 2: Feature Completion** (Week 2)
1. ✅ Implement `by_warehouse` and `by_category` aggregations
2. ✅ Add `reference_number` field to responses
3. ✅ Optimize database queries (add indexes if needed)
4. ✅ Implement CSV export endpoint

### **Phase 3: Performance Optimization** (Week 3)
1. ✅ Load test with 50,000+ movement records
2. ✅ Optimize slow queries (target < 2 seconds)
3. ✅ Add caching for dropdown aggregations
4. ✅ Implement database indexes

### **Phase 4: Testing & Validation** (Week 4)
1. ✅ End-to-end testing with all filter combinations
2. ✅ Export functionality testing
3. ✅ Mobile responsive testing
4. ✅ User acceptance testing

---

## 📝 Success Criteria

### **Functionality:**
- ✅ All filters work independently and in combination
- ✅ Pagination handles large datasets (50,000+ records)
- ✅ Search returns results within 500ms
- ✅ Export generates accurate CSV files
- ✅ Movement type icons and colors display correctly
- ✅ Quantity math is always consistent (before/after/quantity)

### **Performance:**
- ⚡ Initial page load < 2 seconds
- ⚡ Filter application < 500ms
- ⚡ Pagination < 300ms
- ⚡ Export < 10 seconds for 10,000 records

### **Data Quality:**
- ✅ No null values in required fields
- ✅ All references link to actual records
- ✅ Timestamps in consistent timezone
- ✅ Quantity changes make mathematical sense

### **User Experience:**
- ✅ Intuitive filter controls
- ✅ Clear visual hierarchy
- ✅ Mobile responsive design
- ✅ Helpful empty states
- ✅ Error messages are actionable

---

## 📎 Related Documentation

**Frontend:**
- `/frontend/src/features/reports/pages/StockMovementsPage.tsx` - Main component
- `/frontend/src/types/reports.ts` - TypeScript type definitions (lines 439-490)
- `/frontend/docs/STOCK-MOVEMENTS-ENHANCEMENT-PLAN.md` - Enhancement roadmap

**Backend:**
- `/backend/reports/views/inventory_reports.py` - Report view implementation
- `/backend/docs/BACKEND-REPORTS-MODULE-REQUIREMENTS.md` - Original specification (lines 459-539)
- `/backend/docs/STOCK-MOVEMENTS-BACKEND-IMPLEMENTATION-GUIDE.md` - Implementation guide

**Related Features:**
- Stock Adjustments module (source of adjustment movements)
- Sales module (source of sale movements)
- Purchase Orders module (source of inbound movements)
- Warehouse Transfers module (source of transfer movements)

---

## 💬 Next Steps

**For Backend Team:**

1. **Review this document** - Identify any gaps or misunderstandings
2. **Answer the 10 critical questions** - Provide specific responses with code examples
3. **Validate response structure** - Confirm JSON schema matches current implementation
4. **Sample data** - Provide 5-10 real movement records for testing
5. **Performance metrics** - Share current query times for different scenarios

**For Frontend Team:**

1. **Await backend clarification** - Hold off on major changes until alignment
2. **Prepare test scenarios** - Create comprehensive test cases
3. **Design mockups** - Create visual references for edge cases
4. **Update types** - Adjust TypeScript definitions based on backend response

---

## 📧 Contact & Collaboration

**Frontend Lead:** GitHub Copilot  
**Backend Lead:** [To be assigned]  
**Project Manager:** [To be assigned]  

**Review Meeting:** Schedule 1-hour session to walk through this document  
**Timeline:** Expect backend response within 3-5 business days  
**Deployment Target:** Production release after alignment confirmed

---

**Status:** 📤 **SENT TO BACKEND TEAM - AWAITING RESPONSE**  
**Created:** October 30, 2025  
**Last Updated:** October 30, 2025
