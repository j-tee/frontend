# Backend Requirements: Stock Product Quantity Tracking

## Overview
The Stock Product Detail Modal now displays dynamic quantity metrics to provide better inventory visibility. The frontend has been updated to show:
- **Quantity Stocked** (original `quantity` field)
- **Quantity Available** (new field)
- **Quantity Sold** (new field)
- **Quantity Reserved** (new field)

## Backend Implementation Required

### 1. Update StockProduct Model/Serializer

The backend needs to add the following **read-only computed fields** to the `StockProduct` serializer or model:

```python
class StockProduct:
    # Existing fields...
    quantity: int  # Total quantity initially stocked
    
    # NEW COMPUTED FIELDS (read-only)
    available_quantity: int  # quantity - sold_quantity - reserved_quantity
    sold_quantity: int       # Total units sold from this stock item
    reserved_quantity: int   # Units currently in active carts/pending orders
```

### 2. Computation Logic

#### `sold_quantity`
Calculate total units sold across all completed sales:

```python
# Pseudo-code
sold_quantity = SaleItem.objects.filter(
    stock_product=self.id,
    sale__status__in=['COMPLETED', 'PAID']
).aggregate(total=Sum('quantity'))['total'] or 0
```

#### `reserved_quantity`
Calculate units currently reserved in active carts or pending transactions:

```python
# Pseudo-code
reserved_quantity = SaleItem.objects.filter(
    stock_product=self.id,
    sale__status='DRAFT'
).aggregate(total=Sum('quantity'))['total'] or 0
```

#### `available_quantity`
Calculate unreserved stock available for new sales:

```python
# Pseudo-code
available_quantity = self.quantity - sold_quantity - reserved_quantity
```

### 3. API Response Structure

Update the `GET /inventory/api/stock-products/{id}/` endpoint to include these fields:

```json
{
  "id": "uuid",
  "product": "uuid",
  "product_name": "Back-Office Software License",
  "product_sku": "DL-SFT-010",
  "quantity": 104,
  "available_quantity": 98,
  "sold_quantity": 5,
  "reserved_quantity": 1,
  "unit_cost": "445.18",
  "retail_price": "780.00",
  "wholesale_price": "702.00",
  "landed_unit_cost": "460.18",
  "warehouse_name": "DataLogique Central Warehouse",
  "created_at": "2025-10-07T15:29:00Z",
  "updated_at": "2025-10-07T20:10:00Z"
}
```

### 4. Performance Considerations

**Option A: Computed on-the-fly (simple but may be slow)**
- Calculate quantities using aggregations at serialization time
- Good for low-volume endpoints or detail views

**Option B: Cached/Denormalized (faster but more complex)**
- Store `sold_quantity` and `reserved_quantity` in database fields
- Update via signals when sales status changes
- Recommended for high-traffic list endpoints

**Recommendation:** Start with Option A for the detail modal (single item), then optimize to Option B if performance issues arise.

### 5. Endpoint Updates Required

| Endpoint | Action | Priority |
|----------|--------|----------|
| `GET /inventory/api/stock-products/{id}/` | Add computed fields | **High** |
| `GET /inventory/api/stock-products/` | Add computed fields to list | Medium |
| `GET /inventory/api/storefronts/{id}/stock-products/` | Add computed fields | Medium |

### 6. Migration Checklist

- [ ] Add serializer methods for computed fields
- [ ] Update API documentation/schema
- [ ] Add database indexes on `SaleItem.stock_product` if not present
- [ ] Test calculation logic with edge cases:
  - Stock with no sales
  - Stock with cancelled/refunded sales
  - Stock with expired cart reservations
- [ ] Verify performance with large datasets
- [ ] Consider adding these fields to storefront catalog endpoint for consistency

### 7. Frontend Behavior (Already Implemented)

The frontend now:
- ✅ Displays "Quantity Stocked" (blue badge) for total initial inventory
- ✅ Displays "Quantity Available" (green badge) with fallback to `quantity` if backend not updated
- ✅ Displays "Quantity Sold" (info badge) defaulting to 0 if field missing
- ✅ Displays "Quantity Reserved" (warning badge) defaulting to 0 if field missing
- ✅ Renamed "Quantity on hand" → "Quantity Stocked" for clarity

### 8. Testing Scenarios

Once backend is deployed, verify:
1. Stock item with recent sales shows correct `sold_quantity`
2. Stock item in active cart shows `reserved_quantity > 0`
3. `available_quantity` = `quantity - sold - reserved`
4. Abandoned carts don't permanently reduce `available_quantity`
5. Completed sales correctly increment `sold_quantity`

### 9. Optional Enhancements

Consider adding these fields in future iterations:
- `adjusted_quantity` - units added/removed via stock adjustments
- `returned_quantity` - units returned from completed sales
- `damaged_quantity` - units marked as damaged/unsellable
- `transfer_in_quantity` / `transfer_out_quantity` - units in transit

---

## Questions for Backend Team

1. **Do you already track `reserved_quantity` via StockAvailability?**  
   If yes, we can reuse that logic instead of querying draft sales.

2. **Should `sold_quantity` include refunded items?**  
   Recommendation: Exclude refunded quantities or add separate `refunded_quantity` field.

3. **How should we handle expired cart reservations?**  
   Suggestion: Add TTL cleanup job for draft sales older than X hours.

4. **Performance target?**  
   How many concurrent stock detail views do you expect? This affects caching strategy.

---

## Frontend Files Modified

- ✅ `src/types/inventory.ts` - Added fields to `StockProduct` interface
- ✅ `src/features/dashboard/components/StockProductDetailModal.tsx` - Updated UI layout

## Status

- **Frontend:** ✅ Ready (gracefully handles missing backend fields)
- **Backend:** ⏳ Awaiting implementation
- **Testing:** ⏳ Blocked until backend deployed

---

**Contact:** Frontend team ready to assist with API schema validation once endpoint is updated.
