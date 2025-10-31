# ✅ Priority 1 Verification Tests

**Date:** October 31, 2025  
**Status:** 🧪 **TESTING PHASE**  
**Tasks Completed:** Task 1 (Reference IDs) ✅ | Task 2 (Warehouse UUIDs) ✅ | Task 3 (Pagination) ⏳

---

## 📋 What Backend Has Completed

### ✅ **Task 1: Reference IDs Fixed**
- Added `_resolve_reference_id()` method in `inventory_reports.py`
- Returns actual Sale.id, Transfer.id, or Adjustment.id
- Backend tests passing

### ✅ **Task 2: Warehouse UUIDs Fixed**
- Propagated warehouse identifiers from `MovementTracker`
- Responses now include `warehouse_id` (UUID) and `warehouse_name` (string)
- Backend tests passing for adjustments, transfers, and sales

### ⏳ **Task 3: Database Pagination**
- Status: Not mentioned yet (likely next)

---

## 🧪 VERIFICATION TEST PLAN

### **Test 1: Verify Reference IDs Return Actual Source IDs**

#### **Test 1a: Sale Movement Reference**
```bash
# Hit the endpoint
curl -X GET "http://localhost:8000/reports/api/inventory/movements/?reference_type=sale&page_size=5" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  | jq '.data.movements[0]'
```

**Expected Response:**
```json
{
  "movement_id": "abc-123-movement-internal-id",
  "reference_id": "550e8400-e29b-41d4-a716-446655440000",  // ✅ Sale.id (different from movement_id)
  "reference_type": "sale",
  "reference_number": "SALE-2025-001",
  "warehouse_id": "7a3f2c1d-8e9b-4a5c-9d2e-1f3a4b5c6d7e",  // ✅ UUID format
  "warehouse_name": "Rawlings Park Warehouse",
  "product_name": "Samsung Galaxy S21",
  "quantity": -2,
  "direction": "out"
}
```

**Validation Checks:**
```bash
# 1. Reference ID should be valid UUID format
curl "http://localhost:8000/reports/api/inventory/movements/?reference_type=sale" \
  | jq '.data.movements[0].reference_id' \
  | grep -E '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
# Should match ✅

# 2. Reference ID should be DIFFERENT from movement_id
curl "http://localhost:8000/reports/api/inventory/movements/?reference_type=sale" \
  | jq '.data.movements[0] | select(.reference_id != .movement_id)'
# Should return object ✅

# 3. Sale should exist at reference_id
SALE_ID=$(curl "http://localhost:8000/reports/api/inventory/movements/?reference_type=sale" | jq -r '.data.movements[0].reference_id')
curl "http://localhost:8000/sales/api/sales/$SALE_ID/"
# Should return 200 OK ✅ (not 404)
```

---

#### **Test 1b: Adjustment Movement Reference**
```bash
curl "http://localhost:8000/reports/api/inventory/movements/?reference_type=adjustment&page_size=5" \
  | jq '.data.movements[0] | {movement_id, reference_id, reference_type, reference_number}'
```

**Expected:**
```json
{
  "movement_id": "def-456-movement-id",
  "reference_id": "789-adjustment-uuid",  // ✅ StockAdjustment.id
  "reference_type": "adjustment",
  "reference_number": "ADJ-2025-001"
}
```

**Validation:**
```bash
# Reference ID should point to actual adjustment
ADJUSTMENT_ID=$(curl "http://localhost:8000/reports/api/inventory/movements/?reference_type=adjustment" | jq -r '.data.movements[0].reference_id')
curl "http://localhost:8000/inventory/api/adjustments/$ADJUSTMENT_ID/"
# Should return 200 OK ✅
```

---

#### **Test 1c: Transfer Movement Reference**
```bash
curl "http://localhost:8000/reports/api/inventory/movements/?reference_type=transfer&page_size=5" \
  | jq '.data.movements[0] | {movement_id, reference_id, reference_type, reference_number}'
```

**Expected:**
```json
{
  "movement_id": "ghi-789-movement-id",
  "reference_id": "012-transfer-uuid",  // ✅ Transfer.id
  "reference_type": "transfer",
  "reference_number": "XFER-2025-001"
}
```

**Validation:**
```bash
# Reference ID should point to actual transfer
TRANSFER_ID=$(curl "http://localhost:8000/reports/api/inventory/movements/?reference_type=transfer" | jq -r '.data.movements[0].reference_id')
curl "http://localhost:8000/inventory/api/transfers/$TRANSFER_ID/"
# Should return 200 OK ✅
```

---

### **Test 2: Verify Warehouse IDs are UUIDs**

#### **Test 2a: UUID Format Validation**
```bash
curl "http://localhost:8000/reports/api/inventory/movements/?page_size=20" \
  | jq '.data.movements[] | {warehouse_id, warehouse_name}'
```

**Expected Output:**
```json
{"warehouse_id": "7a3f2c1d-8e9b-4a5c-9d2e-1f3a4b5c6d7e", "warehouse_name": "Rawlings Park Warehouse"}
{"warehouse_id": "8b4e3d2e-9f0c-5b6d-0e3f-2g4b5c6d7e8f", "warehouse_name": "Downtown Warehouse"}
{"warehouse_id": "9c5f4e3f-0g1d-6c7e-1f4g-3h5c6d7e8f9g", "warehouse_name": "Airport Warehouse"}
```

**Validation:**
```bash
# All warehouse_ids should be valid UUIDs (not names)
curl "http://localhost:8000/reports/api/inventory/movements/" \
  | jq '.data.movements[] | select(.warehouse_id | test("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$") | not) | .warehouse_id'
# Should return EMPTY ✅ (all are UUIDs)

# Check for old broken behavior (warehouse_id = warehouse_name)
curl "http://localhost:8000/reports/api/inventory/movements/" \
  | jq '.data.movements[] | select(.warehouse_id == .warehouse_name)'
# Should return EMPTY ✅ (no longer using name as ID)
```

---

#### **Test 2b: Warehouse Filter Works with UUID**
```bash
# Get a warehouse UUID first
WAREHOUSE_ID=$(curl "http://localhost:8000/inventory/api/warehouses/" | jq -r '.results[0].id')

# Filter movements by warehouse UUID
curl "http://localhost:8000/reports/api/inventory/movements/?warehouse_id=$WAREHOUSE_ID" \
  | jq '.data.movements[] | .warehouse_id' \
  | sort -u
```

**Expected:**
- All returned movements should have the same `warehouse_id` as the filter ✅
- Should NOT return empty results ✅
- Should NOT return 400 Bad Request ✅

---

#### **Test 2c: All Movement Types Have Warehouse UUIDs**
```bash
# Test adjustments
curl "http://localhost:8000/reports/api/inventory/movements/?reference_type=adjustment&page_size=5" \
  | jq '.data.movements[0].warehouse_id'
# Should be UUID ✅

# Test sales
curl "http://localhost:8000/reports/api/inventory/movements/?reference_type=sale&page_size=5" \
  | jq '.data.movements[0].warehouse_id'
# Should be UUID ✅

# Test transfers
curl "http://localhost:8000/reports/api/inventory/movements/?reference_type=transfer&page_size=5" \
  | jq '.data.movements[0].warehouse_id'
# Should be UUID ✅
```

---

### **Test 3: Verify Complete Response Shape**

```bash
curl "http://localhost:8000/reports/api/inventory/movements/?page_size=2" \
  | jq '.'
```

**Expected Full Response:**
```json
{
  "status": "success",
  "data": {
    "movements": [
      {
        "movement_id": "abc-123-internal-id",
        "reference_id": "550e8400-e29b-41d4-a716-446655440000",  // ✅ Actual Sale.id
        "reference_type": "sale",
        "reference_number": "SALE-2025-001",
        "warehouse_id": "7a3f2c1d-8e9b-4a5c-9d2e-1f3a4b5c6d7e",  // ✅ UUID
        "warehouse_name": "Rawlings Park Warehouse",
        "product_id": "prod-uuid-123",
        "product_name": "Samsung Galaxy S21",
        "product_sku": "SAMS-GAL-S21",
        "category_name": "Electronics",
        "quantity": -2,
        "direction": "out",
        "movement_type": "sale",
        "adjustment_type": null,
        "unit_of_measure": "pieces",
        "notes": "Sale - Cash",
        "performed_by": "John Doe",
        "performed_by_id": null,
        "created_at": "2025-10-31T10:30:00Z",
        "quantity_before": null,
        "quantity_after": null
      },
      {
        "movement_id": "def-456-internal-id",
        "reference_id": "789-adjustment-uuid",  // ✅ Actual Adjustment.id
        "reference_type": "adjustment",
        "reference_number": "ADJ-2025-042",
        "warehouse_id": "8b4e3d2e-9f0c-5b6d-0e3f-2g4b5c6d7e8f",  // ✅ UUID
        "warehouse_name": "Downtown Warehouse",
        "product_id": "prod-uuid-456",
        "product_name": "iPhone 13 Pro",
        "product_sku": "APPL-IPH-13P",
        "category_name": "Electronics",
        "quantity": 50,
        "direction": "in",
        "movement_type": "adjustment",
        "adjustment_type": "PHYSICAL_COUNT",
        "unit_of_measure": "pieces",
        "notes": "Physical inventory count correction",
        "performed_by": "Jane Smith",
        "performed_by_id": null,
        "created_at": "2025-10-30T14:15:00Z",
        "quantity_before": null,
        "quantity_after": null
      }
    ],
    "summary": {
      "total_movements": 1234,
      "total_in": 500,
      "total_out": 734
    },
    "by_warehouse": {
      "7a3f2c1d-8e9b-4a5c-9d2e-1f3a4b5c6d7e": {
        "movements": 15,
        "net_change": null
      }
    },
    "by_category": {
      "Electronics": {
        "movements": 10,
        "net_change": null
      }
    }
  },
  "meta": {
    "pagination": {
      "page": 1,
      "page_size": 2,
      "total_count": 1234,
      "total_pages": 617
    }
  }
}
```

---

### **Test 4: Edge Cases**

#### **Test 4a: Mixed Movement Types**
```bash
# Request without reference_type filter (should return all types)
curl "http://localhost:8000/reports/api/inventory/movements/?page_size=20" \
  | jq '[.data.movements[] | {type: .reference_type, ref_id: .reference_id, wh_id: .warehouse_id}]'
```

**Expected:**
- All `reference_id` values are valid UUIDs ✅
- All `warehouse_id` values are valid UUIDs ✅
- Mix of `sale`, `adjustment`, `transfer`, `shrinkage` types ✅

---

#### **Test 4b: Empty Results**
```bash
# Request with impossible filter (should return empty, not error)
curl "http://localhost:8000/reports/api/inventory/movements/?start_date=2030-01-01&end_date=2030-12-31" \
  | jq '.data.movements'
```

**Expected:**
```json
[]
```
- Should return empty array ✅ (not error)
- `warehouse_id` and `reference_id` format still correct when data exists ✅

---

#### **Test 4c: Pagination**
```bash
# Page 1
curl "http://localhost:8000/reports/api/inventory/movements/?page=1&page_size=10" \
  | jq '.meta.pagination'

# Page 2
curl "http://localhost:8000/reports/api/inventory/movements/?page=2&page_size=10" \
  | jq '.meta.pagination'
```

**Expected:**
```json
{
  "page": 1,
  "page_size": 10,
  "total_count": 1234,
  "total_pages": 124
}
```

```json
{
  "page": 2,
  "page_size": 10,
  "total_count": 1234,
  "total_pages": 124
}
```

---

## 🎯 SUCCESS CRITERIA CHECKLIST

Use this checklist to verify Tasks 1 and 2:

### **Task 1: Reference IDs** ✅
- [ ] Sale movements: `reference_id` = actual `Sale.id` (not movement.id)
- [ ] Adjustment movements: `reference_id` = actual `StockAdjustment.id`
- [ ] Transfer movements: `reference_id` = actual `Transfer.id`
- [ ] Can fetch source record using `reference_id` (returns 200, not 404)
- [ ] `reference_id` ≠ `movement_id` for all records
- [ ] All reference IDs are valid UUID format

### **Task 2: Warehouse UUIDs** ✅
- [ ] `warehouse_id` is UUID format (not warehouse name string)
- [ ] `warehouse_name` still present and correct
- [ ] Adjustments have warehouse UUID
- [ ] Sales have warehouse UUID
- [ ] Transfers have warehouse UUID
- [ ] Warehouse filter works with UUID parameter
- [ ] No records have `warehouse_id` = `warehouse_name`

### **Task 3: Database Pagination** ⏳
- [ ] 90-day range loads in < 2 seconds
- [ ] Query count is reasonable (3-5 queries, not 100+)
- [ ] `total_count` matches actual filtered records
- [ ] Pagination works across pages
- [ ] Performance with 10K+ movements

---

## 🐛 WHAT TO CHECK IF TESTS FAIL

### **If reference_id still equals movement_id:**
```python
# Backend needs to verify _resolve_reference_id() is being called
# In inventory_reports.py:
def _build_movements(self, raw_movements):
    for movement in raw_movements:
        serialized = {
            'reference_id': self._resolve_reference_id(movement),  # ← Should use this
            # NOT: 'reference_id': movement['id']  # ← Old broken way
        }
```

### **If warehouse_id is still a string name:**
```python
# Backend needs to verify MovementTracker provides warehouse_id
# In movement_tracker.py:
movements.append({
    'warehouse_id': adjustment.warehouse.id,     # ← UUID
    'warehouse_name': adjustment.warehouse.name, # ← Name
    # NOT: 'warehouse_id': adjustment.warehouse.name  # ← Old broken way
})
```

### **If Sale.id lookup returns 404:**
- Check that `reference_id` is the parent `Sale.id`, not `SaleItem.id`
- Sale movements should use `sale_item.sale.id`, not `sale_item.id`

---

## 📊 PERFORMANCE BASELINE

**Before Optimization:**
- 30-day range: ~3s
- 90-day range: ~12s
- 180-day range: ~60s+ (timeout risk)

**After Task 3 (Database Pagination):**
- 30-day range: < 500ms
- 90-day range: < 2s
- 180-day range: < 5s

---

## 📨 RESPONSE TEMPLATE FOR BACKEND

**If Tests Pass:**
```
✅ Tasks 1 & 2 Verified Successfully!

**Test Results:**
- ✅ Reference IDs: All movements return actual source IDs (Sale.id, Adjustment.id, Transfer.id)
- ✅ Warehouse UUIDs: All movements have warehouse_id as UUID (not name string)
- ✅ Click-through: Can navigate from movement to source record (200 OK)
- ✅ Filters: Warehouse filter works with UUID parameter
- ✅ All movement types: Sales, adjustments, transfers all correct

**Sample API Response:**
[Attach actual response from test]

**Ready for Task 3 (Database Pagination):**
Next focus: Implement LIMIT/OFFSET in MovementTracker to avoid loading 50K records into memory.
```

**If Tests Fail:**
```
❌ Issues Found in Tasks 1 & 2

**Failing Tests:**
- [ ] Reference IDs still pointing to movement.id (not Sale.id)
- [ ] Warehouse IDs still using name strings (not UUIDs)

**Details:**
[Paste failing test output]

**Next Steps:**
Please verify:
1. _resolve_reference_id() is being called in _build_movements()
2. MovementTracker emits warehouse_id (UUID) alongside warehouse_name
3. Sale movements use sale.id (not sale_item.id)
```

---

## 🚀 NEXT: Task 3 (Database Pagination)

After Tasks 1 & 2 are verified, backend should implement:

**Goal:** Load only 20 records from database (not 50,000)

**Implementation:**
1. Add `MovementTracker.count_movements(filters)` - Returns total count without loading data
2. Add `MovementTracker.get_movements_paginated(filters, offset, limit)` - Returns only requested page
3. Update `StockMovementHistoryReportView.get()` to use paginated methods

**Test:**
```bash
# Should be fast even with large date range
time curl "http://localhost:8000/reports/api/inventory/movements/?start_date=2025-08-01&end_date=2025-10-31"
# Expected: < 2 seconds
```

---

**Status:** 🧪 **Ready for Verification Testing**  
**Next Action:** Run Test 1, Test 2, Test 3 above  
**Expected Result:** All checks pass ✅  
**Then:** Approve Task 3 implementation (database pagination)
