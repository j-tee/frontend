# Backend API Requirements: Movement Detail Endpoints

**Date:** October 31, 2025  
**Priority:** HIGH  
**Frontend Implementation:** ✅ COMPLETE & UPDATED  
**Status:** ✅ Backend APIs IMPLEMENTED - Ready for Testing

---

## 📋 Executive Summary

The frontend has implemented a **Movement Detail Modal** that displays full transaction details when users click on movement references in the Stock Movement History report. The modal is **100% complete and working**, but it needs **3 backend API endpoints** to fetch the transaction details.

**Business Value:**
- Users can click on any movement (Sale, Transfer, Adjustment) and see full transaction details instantly
- Saves 2+ minutes per investigation (from manual searching to 2-second modal view)
- Critical for auditing, fraud detection, and troubleshooting inventory discrepancies

**Current Status:**
- ✅ Frontend modal fully implemented & updated for `items_detail`
- ✅ Error handling complete (gracefully shows message if APIs don't exist)
- ✅ Backend APIs implemented with `items_detail` field
- ✅ Enhanced data including tax, profit, supplier, costs, warehouse details
- 🎯 Ready for integration testing

---

## 🎯 Required API Endpoints

### **Endpoint 1: Sale Detail API**
```
GET /sales/api/sales/{sale_id}/
```

### **Endpoint 2: Transfer Detail API**
```
GET /inventory/api/transfers/{transfer_id}/
```

### **Endpoint 3: Adjustment Detail API**
```
GET /inventory/api/adjustments/{adjustment_id}/
```

---

## 📊 API Specifications

### **1. Sale Detail Endpoint**

**Request:**
```http
GET /sales/api/sales/cc45f197-b1e9-4be2-d02d5b-20251016-0008/
Authorization: Bearer <token>
```

**✅ IMPLEMENTED Response Format:**
```json
{
  "id": "cc45f197-b1e9-4be2-d02d5b-20251016-0008",
  "sale_number": "cc45f197-b1e9-4be2-d02d5b-20251016-0008",
  "total_amount": 1029.95,
  "payment_method": "CASH",
  "customer_name": "John Smith",
  "created_at": "2025-10-16T14:30:00Z",
  "storefront": "Rawlings Park Store",
  "items_detail": [
    {
      "product_name": "Samsung TV 43\"",
      "quantity": 2,
      "unit_price": 499.99,
      "total": 999.98,
      "tax": 80.00,
      "profit": 150.00
    },
    {
      "product_name": "HDMI Cable 6ft",
      "quantity": 3,
      "unit_price": 9.99,
      "total": 29.97,
      "tax": 2.40,
      "profit": 8.97
    }
  ]
}
```

**Note:** 
- Backend now returns `items_detail` (not `items`) with enhanced fields including tax and profit per item.
- **IMPORTANT:** Sales should return `storefront` or `storefront_name` (NOT `warehouse_name`). Sales happen at storefronts, not warehouses.

**Field Requirements:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | ✅ | Sale UUID (same as `sale_id` in URL) |
| `sale_number` | string | ✅ | Human-readable sale number |
| `total_amount` | number | ✅ | Total sale amount (used for summary footer) |
| `payment_method` | string | ✅ | CASH, CARD, MOBILE_MONEY, etc. |
| `customer_name` | string | ❌ | Customer name (null/empty = "Walk-in") |
| `created_at` | string (ISO 8601) | ✅ | Sale timestamp |
| `storefront` | string | ✅ | **Storefront name where sale occurred** (NOT warehouse) |
| `storefront_name` | string | ❌ | Alternative field name for storefront |
| `items_detail` | array | ✅ | List of sold products with enhanced details (must not be empty) |
| `items_detail[].product_name` | string | ✅ | Product name |
| `items_detail[].quantity` | number | ✅ | Quantity sold |
| `items_detail[].unit_price` | number | ✅ | Price per unit |
| `items_detail[].total` | number | ✅ | Line total (quantity × unit_price) |
| `items_detail[].tax` | number | ❌ | Tax amount for this item (optional) |
| `items_detail[].profit` | number | ❌ | Profit for this item (optional, can be negative) |

**Error Handling:**
- `404 Not Found` - Sale doesn't exist (deleted or invalid ID)
- `403 Forbidden` - User doesn't have permission to view this sale
- `400 Bad Request` - Invalid UUID format
**Notes:**
- The `sale_id` comes from the movements API `reference_id` field
- Must return the parent Sale record, not SaleItem records
- `customer_name` can be null for walk-in sales (frontend shows "Walk-in")
- **CRITICAL:** Sales occur at storefronts, NOT warehouses. Return `storefront` or `storefront_name` field, not `warehouse_name`
- `customer_name` can be null for walk-in sales (frontend shows "Walk-in")

---

### **2. Transfer Detail Endpoint**

**Request:**
```http
GET /inventory/api/transfers/c3921db5-4717-46a9-acd6-acebd5eed7b6/
**✅ IMPLEMENTED Response Format:**

**Transfer Type 1: Warehouse → Warehouse**
```json
{
  "id": "c3921db5-4717-46a9-acd6-acebd5eed7b6",
  "transfer_number": "TRF-2025102705082O",
  "from_warehouse": "Rawlings Park Warehouse",
  "to_warehouse": "Adiringanor Warehouse",
  "status": "COMPLETED",
  "created_at": "2025-10-27T05:08:20Z",
  "created_by": "Mike Tetteh",
  "items_detail": [
    {
      "product_name": "Energy Drink 250ml",
      "quantity": 5,
      "supplier": "Coca-Cola Distribution",
      "cost": 12.50
    }
  ],
  "notes": "Seasonal restock for Adiringanor warehouse"
}
```

**Transfer Type 2: Warehouse → Storefront**
```json
{
  "id": "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a",
  "transfer_number": "TRF-2025102805123A",
  "from_warehouse": "Central Warehouse",
  "to_storefront": "Downtown Store",
  "status": "COMPLETED",
  "created_at": "2025-10-28T09:30:00Z",
  "created_by": "Sarah Johnson",
  "items_detail": [
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | ✅ | Transfer UUID |
| `transfer_number` | string | ✅ | Human-readable transfer number |
| `from_warehouse` | string | ⚠️ | Source warehouse name (required for warehouse-to-warehouse or warehouse-to-storefront) |
| `to_warehouse` | string | ⚠️ | Destination warehouse name (required for warehouse-to-warehouse or storefront-to-warehouse) |
| `from_storefront` | string | ⚠️ | Source storefront name (required for storefront-to-warehouse transfers) |
| `to_storefront` | string | ⚠️ | Destination storefront name (required for warehouse-to-storefront transfers) |
| `from_warehouse_name` | string | ❌ | Alternative field name for source warehouse |
| `to_warehouse_name` | string | ❌ | Alternative field name for destination warehouse |
| `from_storefront_name` | string | ❌ | Alternative field name for source storefront |
| `to_storefront_name` | string | ❌ | Alternative field name for destination storefront |
| `status` | string | ✅ | PENDING, IN_TRANSIT, COMPLETED, CANCELLED |
| `created_at` | string (ISO 8601) | ✅ | Transfer creation timestamp |
| `created_by` | string | ✅ | Name of user who created transfer |
  "transfer_number": "TRF-2025102905145B",
  "from_storefront": "Uptown Store",
  "to_warehouse": "Central Warehouse",
  "status": "COMPLETED",
  "created_at": "2025-10-29T14:20:00Z",
  "created_by": "Mike Tetteh",
  "items_detail": [
    {
      "product_name": "Damaged iPhone Case",
      "quantity": 2
    }
  ],
  "notes": "Return damaged goods to warehouse"
}
```

**Note:** 
- Backend now returns `items_detail` with supplier and cost information.
- **CRITICAL:** Transfers can be between warehouses, warehouse-to-storefront, or storefront-to-warehouse
- Use appropriate field combinations: `from_warehouse` + `to_warehouse`, `from_warehouse` + `to_storefront`, or `from_storefront` + `to_warehouse`
- Frontend will detect which fields are present and display accordingly*Note:** Backend now returns `items_detail` with supplier and cost information.notes": "Seasonal restock for Adiringanor store"
}
```

**Field Requirements:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | ✅ | Transfer UUID |
| `items_detail` | array | ✅ | List of transferred products with details |
| `items_detail[].product_name` | string | ✅ | Product name |
| `items_detail[].quantity` | number | ✅ | Quantity transferred |
| `items_detail[].supplier` | string | ❌ | Supplier name (optional) |
| `items_detail[].cost` | number | ❌ | Total cost for this item (optional) |
| `notes` | string | ❌ | Optional transfer notes/reason | CANCELLED |
| `created_at` | string (ISO 8601) | ✅ | Transfer creation timestamp |
| `created_by` | string | ✅ | Name of user who created transfer |
| `items` | array | ✅ | List of transferred products |
| `items[].product_name` | string | ✅ | Product name |
| `items[].quantity` | number | ✅ | Quantity transferred |
| `notes` | string | ❌ | Optional transfer notes/reason |

**Status Values:**
- `PENDING` - Transfer created but not started
- `IN_TRANSIT` - Transfer in progress
- `COMPLETED` - Transfer received and confirmed
- `CANCELLED` - Transfer was cancelled

**Error Handling:**
- `404 Not Found` - Transfer doesn't exist
- `403 Forbidden` - User doesn't have permission
- `400 Bad Request` - Invalid UUID format
**Notes:**
- The `transfer_id` comes from the movements API `reference_id` field
- For transfers, there are typically TWO movement records (one OUT from source, one IN to destination)
- Both movements should reference the same `transfer_id`
- **CRITICAL Transfer Types:**
  - **Warehouse ↔ Warehouse:** Use `from_warehouse` + `to_warehouse`
  - **Warehouse → Storefront:** Use `from_warehouse` + `to_storefront` (stocking stores)
  - **Storefront → Warehouse:** Use `from_storefront` + `to_warehouse` (returns/reverse)
- Frontend will automatically detect which fields are present and display "Warehouse" or "Storefront" labels accordinglys (one OUT from source, one IN to destination)
- Both movements should reference the same `transfer_id`

---

**✅ IMPLEMENTED Response Format:**
```json
{
  "id": "a7b8c9d0-1e2f-3g4h-5i6j-7k8l9m0n1o2p",
  "adjustment_number": "ADJ-2025-042",
  "warehouse_name": "Downtown Warehouse",
  "adjustment_type": "PHYSICAL_COUNT",
  "reason": "Annual inventory count correction",
  "created_at": "2025-10-30T14:15:00Z",
  "created_by": "Jane Smith",
  "items_detail": [
    {
      "product_name": "iPhone 13 Pro",
      "warehouse_name": "Downtown Warehouse",
      "quantity_before": 98,
      "quantity_after": 100,
      "adjustment": 2,
      "direction": "increase"
    },
    {
      "product_name": "AirPods Pro",
      "warehouse_name": "Downtown Warehouse",
      "quantity_before": 45,
      "quantity_after": 42,
      "adjustment": -3,
      "direction": "decrease"
    }
  ],
  "notes": "Found 2 extra iPhones in back storage during count"
}
```

**Note:** Backend now returns `items_detail` with warehouse name per item and direction indicator.   "product_name": "AirPods Pro",
      "quantity_before": 45,
      "quantity_after": 42,
      "adjustment": -3
    }
  ],
  "notes": "Found 2 extra iPhones in back storage during count"
}
```

**Field Requirements:**

| Field | Type | Required | Description |
| `items_detail` | array | ✅ | List of adjusted products with details |
| `items_detail[].product_name` | string | ✅ | Product name |
| `items_detail[].warehouse_name` | string | ❌ | Warehouse name (optional, may differ from parent) |
| `items_detail[].quantity_before` | number | ✅ | Quantity before adjustment |
| `items_detail[].quantity_after` | number | ✅ | Quantity after adjustment |
| `items_detail[].adjustment` | number | ✅ | Change amount (can be negative) |
| `items_detail[].direction` | string | ❌ | "increase" or "decrease" (optional) |
| `notes` | string | ❌ | Optional additional notes |e |
| `created_at` | string (ISO 8601) | ✅ | Adjustment timestamp |
| `created_by` | string | ✅ | Name of user who created adjustment |
| `items` | array | ✅ | List of adjusted products |
| `items[].product_name` | string | ✅ | Product name |
| `items[].quantity_before` | number | ✅ | Quantity before adjustment |
| `items[].quantity_after` | number | ✅ | Quantity after adjustment |
| `items[].adjustment` | number | ✅ | Change amount (can be negative) |
| `notes` | string | ❌ | Optional additional notes |

**Adjustment Types:**
- `PHYSICAL_COUNT` - Inventory count correction
- `DAMAGE` - Damaged goods write-off
- `THEFT` - Stolen inventory
- `EXPIRED` - Expired products removed
- `OTHER` - Other reasons

**Calculation:**
```
adjustment = quantity_after - quantity_before
```
- Positive adjustment (+2) = inventory increased
- Negative adjustment (-3) = inventory decreased

**Error Handling:**
- `404 Not Found` - Adjustment doesn't exist
- `403 Forbidden` - User doesn't have permission
- `400 Bad Request` - Invalid UUID format

**Notes:**
- The `adjustment_id` comes from the movements API `reference_id` field
- An adjustment typically creates ONE movement record per product adjusted

---

## 🔒 Authentication & Permissions

**All endpoints require:**
1. **Authentication:** Bearer token in `Authorization` header
2. **Permissions:** User must have appropriate view permissions
   - Sales: `SALES_VIEW` capability
   - Transfers: `INVENTORY_VIEW` capability
   - Adjustments: `INVENTORY_VIEW` capability

**Permission Error Response:**
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to view this resource",
  "status_code": 403
}
```

---

## 🧪 Testing Requirements

### **Test 1: Verify Endpoints Exist**
```bash
# Test Sale endpoint
curl -X GET "http://localhost:8000/sales/api/sales/cc45f197-b1e9-4be2-d02d5b-20251016-0008/" \
  -H "Authorization: Bearer YOUR_TOKEN"
# Expected: 200 OK with sale details

# Test Transfer endpoint
curl -X GET "http://localhost:8000/inventory/api/transfers/c3921db5-4717-46a9-acd6-acebd5eed7b6/" \
  -H "Authorization: Bearer YOUR_TOKEN"
# Expected: 200 OK with transfer details

# Test Adjustment endpoint
curl -X GET "http://localhost:8000/inventory/api/adjustments/a7b8c9d0-1e2f-3g4h-5i6j-7k8l9m0n1o2p/" \
  -H "Authorization: Bearer YOUR_TOKEN"
# Expected: 200 OK with adjustment details
```

### **Test 2: Verify Data Integrity**
```bash
# Get a movement with reference_id
SALE_REF_ID=$(curl "http://localhost:8000/reports/api/inventory/movements/?reference_type=sale&page_size=1" | jq -r '.data.movements[0].reference_id')

# Verify sale exists at that ID
curl "http://localhost:8000/sales/api/sales/$SALE_REF_ID/"
# Expected: 200 OK (not 404)
```

### **Test 3: Verify Response Format**
```bash
# Check sale response has required fields
curl "http://localhost:8000/sales/api/sales/$SALE_ID/" | jq 'has("id", "sale_number", "total_amount", "items")'
# Expected: true

# Check items array is not empty
curl "http://localhost:8000/sales/api/sales/$SALE_ID/" | jq '.items | length > 0'
# Expected: true
```

---

## 🎨 Frontend Implementation (Already Complete)

**What the frontend does when you click a movement reference:**

1. **User clicks** on "Sale (cc45f197...)" or "Transfer (TRF-2025...)" in the Reference column
2. **Modal opens** immediately showing:
   - Transaction type (Sale/Transfer/Adjustment)
   - Transaction ID
   - Loading spinner
3. **API call** is made to appropriate endpoint:
   - Sale → `GET /sales/api/sales/{reference_id}/`
   - Transfer → `GET /inventory/api/transfers/{reference_id}/`
   - Adjustment → `GET /inventory/api/adjustments/{reference_id}/`
4. **On success (200 OK):**
   - Modal displays full transaction details
   - Items table populated
   - All metadata shown (dates, users, warehouses)
5. **On error (400/403/404):**
   - Modal shows friendly error message:
     _"Failed to load details. This might be because the detail page hasn't been built yet, or the record was deleted."_
   - No crash, no broken UI
   - User can close modal and continue working

**Frontend Code Location:**
- Component: `src/features/reports/components/MovementDetailModal.tsx`
- Page: `src/features/reports/pages/StockMovementsPage.tsx`
- Lines of code: 421 lines (modal component)

---

## 🚨 Critical Data Mapping

**How the frontend gets the IDs:**

The Stock Movement History API (`/reports/api/inventory/movements/`) returns:
```json
{
  "movements": [
    {
      "reference_id": "cc45f197-b1e9-4be2-d02d5b-20251016-0008",  // ← This ID
      "reference_type": "sale",                                    // ← Determines which endpoint
      "reference_number": "cc45f197-b1e9-4be2-d02d5b-20251016-0008"
    }
  ]
}
```

Frontend mapping logic:
```typescript
const routeMap = {
  sale:       `/sales/api/sales/${reference_id}/`,
  transfer:   `/inventory/api/transfers/${reference_id}/`,
  adjustment: `/inventory/api/adjustments/${reference_id}/`
};
```

**IMPORTANT:**
- The `reference_id` **MUST** be the actual Sale.id/Transfer.id/Adjustment.id (NOT the movement.id)
- This was completed in Backend Priority 1 Task 1
- Verify with: `reference_id !== movement_id` (they should be different)

---

## 📦 Backend Implementation Guide

### **Option 1: Endpoints Already Exist (Just Need Format Fix)**

If you already have detail endpoints for sales/transfers/adjustments:

1. **Check current response format** against specifications above
2. **Add missing fields** if needed (e.g., `items` array, `warehouse_name`)
3. **Test with frontend** - modal should work immediately

### **Option 2: Endpoints Don't Exist (Need to Build)**

**Recommended Approach:**

```python
# Django example for Sale Detail endpoint

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from sales.models import Sale

class SaleDetailView(APIView):
    permission_classes = [HasCapability('SALES_VIEW')]
    
    def get(self, request, sale_id):
        try:
            sale = Sale.objects.select_related('customer', 'warehouse').get(id=sale_id)
            
            # Build items array from SaleItems
            items = [
                {
                    'product_name': item.product.name,
                    'quantity': item.quantity,
                    'unit_price': float(item.unit_price),
                    'total': float(item.total)
                }
                for item in sale.items.select_related('product').all()
            ]
            
            response_data = {
                'id': str(sale.id),
                'sale_number': sale.sale_number,
                'total_amount': float(sale.total_amount),
                'payment_method': sale.payment_method,
                'customer_name': sale.customer.name if sale.customer else None,
                'created_at': sale.created_at.isoformat(),
                'warehouse_name': sale.warehouse.name,
                'items': items
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Sale.DoesNotExist:
            return Response(
                {'error': 'Sale not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
```

**URL Configuration:**
```python
urlpatterns = [
    path('sales/api/sales/<uuid:sale_id>/', SaleDetailView.as_view(), name='sale-detail'),
    path('inventory/api/transfers/<uuid:transfer_id>/', TransferDetailView.as_view(), name='transfer-detail'),
    path('inventory/api/adjustments/<uuid:adjustment_id>/', AdjustmentDetailView.as_view(), name='adjustment-detail'),
]
```

---

## ✅ Acceptance Criteria

**The implementation is complete when:**

1. ✅ All 3 endpoints return 200 OK for valid IDs
2. ✅ All required fields are present in responses
3. ✅ Items arrays are populated (not empty)
4. ✅ 404 returned for non-existent IDs (not 500 error)
5. ✅ Permission checks working (403 for unauthorized users)
6. ✅ Frontend modal displays data correctly (no errors in browser console)
7. ✅ User can click any movement reference and see full details

**Test from frontend:**
1. Open Stock Movement History page
2. Click on any Sale/Transfer/Adjustment reference
3. Modal opens and shows full transaction details
4. No errors in browser console
5. All items display correctly
6. Close modal and repeat for different movement types

---

## 🐛 Common Issues & Solutions

### **Issue 1: 404 Not Found**
**Cause:** `reference_id` in movements API points to wrong record
**Solution:** Verify Priority 1 Task 1 implementation - `reference_id` should be Sale.id (not SaleItem.id or movement.id)

### **Issue 2: Empty Items Array**
**Cause:** Sale/Transfer/Adjustment exists but has no line items
**Solution:** Use `select_related()` / `prefetch_related()` to include items in query

### **Issue 3: 500 Internal Server Error**
**Cause:** Field missing or type mismatch
**Solution:** Check all required fields exist and match types in specification

### **Issue 4: Permission Denied**
**Cause:** User doesn't have view capability
**Solution:** Ensure permission checks allow users with `SALES_VIEW` / `INVENTORY_VIEW`

---

## 📞 Frontend Developer Contact

**If you have questions:**
- Check this document first (all requirements specified)
- Test with Postman/curl before notifying frontend
- When ready, frontend will test immediately (modal already built)

**Response Format Test:**
```bash
# Quick validation - all fields present?
curl "http://localhost:8000/sales/api/sales/$SALE_ID/" | jq 'keys'
# Should include: id, sale_number, total_amount, payment_method, customer_name, created_at, warehouse_name, items
```

---

## 📊 Summary

| Endpoint | Method | Path | Status |
|----------|--------|------|--------|
| Sale Detail | GET | `/sales/api/sales/{id}/` | ⏳ Needed |
| Transfer Detail | GET | `/inventory/api/transfers/{id}/` | ⏳ Needed |
| Adjustment Detail | GET | `/inventory/api/adjustments/{id}/` | ⏳ Needed |

**Priority:** HIGH  
**Document Version:** 2.0  
**Last Updated:** October 31, 2025  
**Frontend Status:** ✅ COMPLETE & UPDATED (supports `items_detail` + backward compatible with `items`)  
**Backend Status:** ✅ IMPLEMENTED (all 3 endpoints with `items_detail` field)  
**Integration Status:** 🧪 READY FOR TESTING
**When complete, notify frontend team and the modal will work immediately!** 🚀

---

**Document Version:** 1.0  
**Last Updated:** October 31, 2025  
**Frontend Status:** ✅ COMPLETE & READY  
**Backend Status:** ⏳ WAITING FOR API IMPLEMENTATION
