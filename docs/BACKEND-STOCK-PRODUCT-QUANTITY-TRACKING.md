# Backend Requirements: Stock Product Quantity Display Enhancement

## Overview
The Stock Product Detail Modal needs to display accurate, real-time quantity metrics. Currently it only shows `quantity`, but users need visibility into:
- **Current Quantity** - What's physically in the warehouse right now
- **Available to Sell** - Current quantity minus reserved units
- **Reserved** - Units in active shopping carts (draft sales)
- **Total Sold** - Historical total units sold from this specific stock batch

## Current State Analysis

### Existing Fields (from StockProduct model)
- `quantity`: Current physical quantity in warehouse (updates as sales complete)

### Existing Related Data (from StockAvailability endpoint)
The system already has `/inventory/api/storefronts/{id}/stock-products/{productId}/availability/` which returns:
```json
{
  "stock_product_id": "uuid",
  "total_quantity": 100,
  "committed_quantity": 5,
  "reserved_quantity": 2,
  "unreserved_quantity": 93,
  "is_available": true
}
```

## Required Backend Changes

### Option 1: Extend StockProduct Detail Endpoint (RECOMMENDED)

Update `GET /inventory/api/stock-products/{id}/` to include availability data inline:

```json
{
  "id": "uuid",
  "product": "uuid",
  "product_name": "Back-Office Software License",
  "product_sku": "DL-SFT-010",
  "quantity": 104,                    // Current physical quantity
  "available_quantity": 98,           // quantity - reserved_quantity
  "reserved_quantity": 6,             // Units in draft/pending carts
  "sold_quantity": 45,                // Historical: total sold from this stock batch
  "unit_cost": "445.18",
  "retail_price": "780.00",
  "warehouse_name": "DataLogique Central Warehouse",
  "created_at": "2025-10-07T15:29:00Z",
  "updated_at": "2025-10-07T20:10:00Z"
}
```

### Field Definitions & Calculations

#### `available_quantity` (Read-only computed)
**Current quantity available for new sales**
```python
available_quantity = quantity - reserved_quantity
```

#### `reserved_quantity` (Read-only computed)
**Units currently held in active shopping carts**
```python
# Get sum of quantities from this stock_product in DRAFT sales
reserved_quantity = SaleItem.objects.filter(
    stock_product=self.id,
    sale__status='DRAFT'
).aggregate(total=Sum('quantity'))['total'] or 0
```

**Important:** 
- Only count `DRAFT` status sales
- Exclude `COMPLETED`, `CANCELLED`, `ABANDONED` sales
- Consider implementing cart expiration (auto-abandon drafts > 2 hours old)

#### `sold_quantity` (Read-only computed)
**Total historical units sold from this specific stock batch**
```python
# Get sum of quantities from completed sales only
sold_quantity = SaleItem.objects.filter(
    stock_product=self.id,
    sale__status__in=['COMPLETED', 'PAID']
).aggregate(total=Sum('quantity'))['total'] or 0
```

**Clarifications needed:**
1. Should refunded items be subtracted from `sold_quantity`?
2. Should cancelled sales be excluded? (Yes, recommended)
3. Should we track adjustments separately? (e.g., damage, loss, expired)

### Why These Calculations Matter

**Example scenario:**
- Initial stock intake: 150 units
- After 45 sales: `quantity` = 104 (physical count)
- 6 units in customer carts: `reserved_quantity` = 6
- Available for new orders: `available_quantity` = 98
- Historical sales total: `sold_quantity` = 45

This helps staff:
- ✅ Know exactly how much can be sold right now (`available_quantity`)
- ✅ Understand demand/turnover (`sold_quantity`)
- ✅ See if stock is being held by incomplete checkouts (`reserved_quantity`)

## Implementation Priority

### High Priority (Required for immediate value)
- [x] Frontend: Display `quantity` as "Current Quantity"
- [x] Frontend: Display `available_quantity` (fallback to `quantity`)
- [ ] Backend: Add `available_quantity` computed field
- [ ] Backend: Add `reserved_quantity` computed field

### Medium Priority (Nice to have)
- [ ] Backend: Add `sold_quantity` for historical tracking
- [ ] Backend: Implement draft cart expiration job
- [ ] Frontend: Only show Reserved/Sold badges when > 0

### Low Priority (Future enhancement)
- [ ] Add `adjusted_quantity` for stock adjustments
- [ ] Add `damaged_quantity` for quality issues
- [ ] Add initial intake quantity tracking

## Performance Considerations

### Concern: Database Queries
Each stock product detail view would trigger aggregation queries for `reserved_quantity` and `sold_quantity`.

### Solutions:

**Option A: Real-time aggregation (Simple)**
```python
@property
def available_quantity(self):
    return self.quantity - self.reserved_quantity

@property  
def reserved_quantity(self):
    return SaleItem.objects.filter(
        stock_product=self.id,
        sale__status='DRAFT'
    ).aggregate(Sum('quantity'))['quantity__sum'] or 0
```
✅ Always accurate
❌ Slower for bulk queries
✅ Good for detail views (1 item at a time)

**Option B: Cached fields with signals (Complex)**
```python
# Add database fields
reserved_quantity = models.IntegerField(default=0)
sold_quantity = models.IntegerField(default=0)

# Update via post_save signals on SaleItem
```
✅ Fast queries
❌ Can drift if signals fail
❌ More complex to maintain

**Recommendation:** Start with Option A (real-time) since this is a detail modal (not a list view). Monitor performance and optimize if needed.

## Edge Cases to Handle

1. **Expired carts**: Draft sales older than 2 hours should be auto-abandoned
2. **Concurrent reservations**: Race conditions when multiple users add last unit
3. **Refunds**: Should `sold_quantity` decrease when item refunded?
4. **Stock adjustments**: Should these affect `sold_quantity`? (No, separate field)
5. **Transfers**: What happens when stock moved between warehouses?

## Testing Checklist

Once backend implements these fields:

- [ ] Stock with no sales: `sold_quantity` = 0, `available_quantity` = `quantity`
- [ ] Stock with completed sales: `sold_quantity` > 0
- [ ] Stock in active cart: `reserved_quantity` > 0, `available_quantity` < `quantity`
- [ ] Stock with abandoned cart: `reserved_quantity` = 0 after abandonment
- [ ] Multiple concurrent carts: `reserved_quantity` = sum of all draft sales
- [ ] Refunded sale: verify impact on `sold_quantity` (define expected behavior)

## API Documentation Updates Needed

Update Swagger/OpenAPI schema for:
- `GET /inventory/api/stock-products/{id}/`
- Optionally: `GET /inventory/api/stock-products/` (list view)

## Questions for Backend Team

### Critical
1. **Does `quantity` in StockProduct already decrease when sales complete?**  
   (Assumption: Yes, it's the live warehouse count)

2. **Do you have cart expiration logic for abandoned carts?**  
   (If not, `reserved_quantity` will be inflated by old drafts)

3. **How should refunds affect these numbers?**  
   - Option A: `sold_quantity` stays same (measures throughput)
   - Option B: Decrease `sold_quantity` (measures net sales)
   - **Recommendation:** Option A, add separate `refunded_quantity` if needed

### Important
4. **Should we include pending/processing sales in `reserved_quantity`?**  
   (Recommendation: Only DRAFT status, exclude in-progress checkouts)

5. **Performance target for detail modal load time?**  
   (Helps decide between real-time vs cached approach)

### Nice to have
6. **Is there value in tracking initial intake quantity separately?**  
   (Would enable "% sold" calculations)

---

## Frontend Changes (Already Implemented)

### Updated Display
- ✅ "Current Quantity" (blue) - shows `quantity`
- ✅ "Available to Sell" (green) - shows `available_quantity` (fallback to `quantity`)
- ✅ "Reserved (in carts)" (yellow) - shows `reserved_quantity` (only if > 0)
- ✅ "Total Sold" (cyan) - shows `sold_quantity` (only if > 0)

### Graceful Degradation
- Fields are **optional** in TypeScript interface
- UI only shows Reserved/Sold badges when data exists
- Falls back gracefully if backend hasn't implemented yet

### Files Modified
- `src/types/inventory.ts` - Added optional fields
- `src/features/dashboard/components/StockProductDetailModal.tsx` - Updated UI
- Conditional rendering: only show badges when values are meaningful

---

## Summary

**Immediate Action Required:**
Backend team needs to add 3 computed read-only fields to StockProduct serializer:
1. `available_quantity` = `quantity - reserved_quantity`
2. `reserved_quantity` = sum(draft sale items for this stock product)
3. `sold_quantity` = sum(completed sale items for this stock product)

**Frontend Status:** ✅ Ready and backward compatible

**Blocked Until:** Backend implements the computed fields

**Contact:** Ready to assist with API integration testing once deployed.
