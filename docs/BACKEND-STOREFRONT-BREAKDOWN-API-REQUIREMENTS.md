# Backend API Requirements: Storefront Breakdown Enhancement

**Date**: October 10, 2025  
**Priority**: High  
**Impact**: Critical for inventory visibility across multiple storefronts  
**Status**: ⏳ Awaiting Backend Implementation

---

## 🎯 Executive Summary

The frontend Stock Product Detail Modal needs enhanced storefront breakdown data to provide comprehensive inventory visibility across multiple retail locations. Currently, the API provides basic storefront information, but lacks critical metrics needed for effective inventory management.

**Current State**: Basic aggregated data (total on hand, sellable)  
**Needed**: Per-storefront breakdown with transfer history, sales data, and location details

---

## 📡 Current API Response Structure

### Endpoint
```
GET /inventory/api/products/{product_id}/stock-reconciliation/
```

### Current Response (Partial)
```json
{
  "storefront": {
    "total_on_hand": 174,
    "sellable_now": 169,
    "entries": [
      {
        "storefront": "uuid-storefront-1",
        "storefront_name": "Main Store",
        "on_hand": 174,
        "linked_reservations": 0,
        "orphaned_reservations": 0
      }
    ]
  }
}
```

### Issues with Current Response
1. ❌ No `location` field (users can't see which city/address)
2. ❌ No `transferred_quantity` (can't see original transfer amount)
3. ❌ No `sold_quantity` (can't track sales per storefront)
4. ❌ No `last_transfer_date` (can't see when stock was transferred)
5. ❌ Limited visibility into inventory movement history

---

## 🆕 Required API Enhancements

### Enhanced Response Structure

```json
{
  "product": {
    "id": "uuid-product",
    "name": "Samsung 55\" 4K Smart TV",
    "sku": "SAM-TV-55-001"
  },
  "warehouse": {
    "recorded_quantity": 459,
    "inventory_on_hand": 285
  },
  "storefront": {
    "total_on_hand": 174,
    "sellable_now": 169,
    "total_transferred": 174,
    "total_sold": 5,
    "entries": [
      {
        "storefront": "uuid-storefront-1",
        "storefront_name": "Main Store Downtown",
        "location": "123 Main St, New York, NY 10001",              // NEW ✨
        "on_hand": 100,
        "transferred_quantity": 100,                                 // NEW ✨
        "sold_quantity": 0,                                          // NEW ✨
        "sellable": 98,
        "linked_reservations": 2,
        "orphaned_reservations": 0,
        "last_transfer_date": "2025-10-01T10:30:00Z",               // NEW ✨
        "transfer_count": 1                                          // NEW ✨ (optional)
      },
      {
        "storefront": "uuid-storefront-2",
        "storefront_name": "West Side Branch",
        "location": "456 West Ave, New York, NY 10023",              // NEW ✨
        "on_hand": 74,
        "transferred_quantity": 79,                                  // NEW ✨
        "sold_quantity": 5,                                          // NEW ✨
        "sellable": 71,
        "linked_reservations": 3,
        "orphaned_reservations": 0,
        "last_transfer_date": "2025-10-05T14:20:00Z",               // NEW ✨
        "transfer_count": 2                                          // NEW ✨ (optional)
      }
    ]
  }
}
```

---

## 📋 Field Specifications

### Required New Fields in `storefront.entries[]`

#### 1. `location` (string, nullable)
**Description**: Physical address or location of the storefront  
**Source**: From the `Storefront` model's `location` field  
**Example**: `"123 Main St, New York, NY 10001"`

**Why it's needed**: Users managing multiple stores need to quickly identify which physical location has inventory without memorizing storefront IDs or names.

**Implementation**:
```python
# In the storefront entry loop
entry['location'] = storefront_instance.location
```

---

#### 2. `transferred_quantity` (integer, nullable)
**Description**: Total quantity ever transferred to this storefront for this product  
**Source**: Sum of all completed transfers to this storefront  
**Example**: `100`

**Why it's needed**: 
- Shows the full transfer history amount
- Helps reconcile why `on_hand` might differ from recent transfers
- Allows calculating total inventory flow over time

**Calculation**:
```python
# Sum of all completed/delivered transfers for this product to this storefront
transferred_quantity = TransferRequest.objects.filter(
    destination_storefront=storefront_id,
    product=product_id,
    status='DELIVERED'  # or equivalent completed status
).aggregate(total=Sum('quantity'))['total'] or 0
```

**Alternative** (if using Transfer model):
```python
transferred_quantity = Transfer.objects.filter(
    to_storefront=storefront_id,
    product=product_id,
    status='COMPLETED'
).aggregate(total=Sum('fulfilled_quantity'))['total'] or 0
```

---

#### 3. `sold_quantity` (integer, nullable)
**Description**: Total units sold from this storefront for this product  
**Source**: Sum of completed sales  
**Example**: `5`

**Why it's needed**:
- Track sales performance per location
- Understand which stores are moving inventory faster
- Calculate inventory turnover rates
- Identify slow-moving stock at specific locations

**Calculation**:
```python
# Sum of all completed sales from this storefront for this product
sold_quantity = Sale.objects.filter(
    storefront=storefront_id,
    status='COMPLETED',  # or equivalent completed status
    sale_items__product=product_id
).aggregate(total=Sum('sale_items__quantity'))['total'] or 0
```

**Note**: Make sure to filter by completed/paid sales only, not pending/cancelled.

---

#### 4. `last_transfer_date` (datetime, nullable, ISO 8601 format)
**Description**: Timestamp of the most recent transfer to this storefront  
**Source**: Latest completed transfer date  
**Example**: `"2025-10-05T14:20:00Z"`

**Why it's needed**:
- Shows how fresh the inventory is
- Helps identify stale stock
- Aids in planning restocking schedules
- Troubleshooting inventory discrepancies

**Calculation**:
```python
# Get the most recent completed transfer
latest_transfer = Transfer.objects.filter(
    to_storefront=storefront_id,
    product=product_id,
    status='COMPLETED'
).order_by('-updated_at').first()

last_transfer_date = latest_transfer.updated_at if latest_transfer else None
```

---

#### 5. `transfer_count` (integer, optional)
**Description**: Total number of transfers to this storefront for this product  
**Source**: Count of completed transfers  
**Example**: `2`

**Why it's needed** (Optional but helpful):
- Shows inventory replenishment frequency
- Helps identify high-maintenance locations
- Useful for inventory planning

**Calculation**:
```python
transfer_count = Transfer.objects.filter(
    to_storefront=storefront_id,
    product=product_id,
    status='COMPLETED'
).count()
```

---

### Optional Enhancement: `sales_breakdown`

For even better insights, consider adding a nested sales breakdown:

```json
{
  "storefront": "uuid-storefront-2",
  "storefront_name": "West Side Branch",
  "sold_quantity": 5,
  "sales_breakdown": {                    // OPTIONAL ✨
    "last_7_days": 2,
    "last_30_days": 5,
    "last_sale_date": "2025-10-09T16:45:00Z",
    "average_daily_sales": 0.5
  }
}
```

---

## 🔄 Backend Implementation Guide

### Step 1: Update the Serializer

Add new fields to the storefront entry serializer:

```python
# In inventory/serializers.py or equivalent

class StorefrontReconciliationEntrySerializer(serializers.Serializer):
    storefront = serializers.UUIDField()
    storefront_name = serializers.CharField()
    location = serializers.CharField(allow_null=True)                    # NEW
    on_hand = serializers.IntegerField()
    transferred_quantity = serializers.IntegerField(allow_null=True)     # NEW
    sold_quantity = serializers.IntegerField(allow_null=True)            # NEW
    sellable = serializers.IntegerField()
    linked_reservations = serializers.IntegerField()
    orphaned_reservations = serializers.IntegerField()
    last_transfer_date = serializers.DateTimeField(allow_null=True)     # NEW
    transfer_count = serializers.IntegerField(required=False)            # NEW (optional)
```

### Step 2: Update the View Logic

Modify the reconciliation view to include new data:

```python
# In inventory/views.py

def get_storefront_breakdown(product_id):
    """
    Get detailed storefront breakdown for a product
    """
    from storefronts.models import Storefront
    from transfers.models import Transfer
    from sales.models import Sale, SaleItem
    
    entries = []
    
    # Get all storefronts that have this product
    storefronts_with_stock = StorefrontInventory.objects.filter(
        product_id=product_id,
        quantity__gt=0
    ).select_related('storefront')
    
    for inventory in storefronts_with_stock:
        storefront = inventory.storefront
        
        # Calculate transferred quantity
        transferred_qty = Transfer.objects.filter(
            to_storefront=storefront.id,
            product_id=product_id,
            status='COMPLETED'
        ).aggregate(total=Sum('fulfilled_quantity'))['total'] or 0
        
        # Calculate sold quantity
        sold_qty = SaleItem.objects.filter(
            sale__storefront=storefront.id,
            sale__status='COMPLETED',
            product_id=product_id
        ).aggregate(total=Sum('quantity'))['total'] or 0
        
        # Get last transfer date
        latest_transfer = Transfer.objects.filter(
            to_storefront=storefront.id,
            product_id=product_id,
            status='COMPLETED'
        ).order_by('-completed_at').first()
        
        last_transfer_date = latest_transfer.completed_at if latest_transfer else None
        
        # Get transfer count (optional)
        transfer_count = Transfer.objects.filter(
            to_storefront=storefront.id,
            product_id=product_id,
            status='COMPLETED'
        ).count()
        
        # Get reservations
        linked_reservations = Reservation.objects.filter(
            storefront=storefront.id,
            product_id=product_id,
            status='ACTIVE',
            sale__isnull=False
        ).aggregate(total=Sum('quantity'))['total'] or 0
        
        orphaned_reservations = Reservation.objects.filter(
            storefront=storefront.id,
            product_id=product_id,
            status='ACTIVE',
            sale__isnull=True
        ).aggregate(total=Sum('quantity'))['total'] or 0
        
        on_hand = inventory.quantity
        sellable = max(0, on_hand - linked_reservations - orphaned_reservations)
        
        entries.append({
            'storefront': storefront.id,
            'storefront_name': storefront.name,
            'location': storefront.location,                    # NEW
            'on_hand': on_hand,
            'transferred_quantity': transferred_qty,            # NEW
            'sold_quantity': sold_qty,                          # NEW
            'sellable': sellable,
            'linked_reservations': linked_reservations,
            'orphaned_reservations': orphaned_reservations,
            'last_transfer_date': last_transfer_date,          # NEW
            'transfer_count': transfer_count,                   # NEW (optional)
        })
    
    return entries
```

### Step 3: Add to Response

```python
# In the reconciliation view response
response_data = {
    'product': {...},
    'warehouse': {...},
    'storefront': {
        'total_on_hand': total_storefront_on_hand,
        'sellable_now': total_storefront_sellable,
        'entries': get_storefront_breakdown(product_id)  # Enhanced with new fields
    },
    'formula': {...}
}
```

---

## 🧪 Testing Requirements

### Test Cases

#### 1. Single Storefront with Sales
**Setup**:
- Transfer 100 units to "Main Store"
- Sell 10 units
- Create 2 reservations (3 units each)

**Expected Response**:
```json
{
  "storefront_name": "Main Store",
  "location": "123 Main St",
  "on_hand": 90,
  "transferred_quantity": 100,
  "sold_quantity": 10,
  "sellable": 84,
  "linked_reservations": 6,
  "last_transfer_date": "2025-10-01T10:00:00Z"
}
```

#### 2. Multiple Storefronts with Different Activity
**Setup**:
- Store A: 50 transferred, 5 sold
- Store B: 100 transferred, 20 sold
- Store C: 25 transferred, 0 sold

**Expected**: All three stores in entries array with correct individual metrics

#### 3. No Storefront Inventory
**Setup**: Product only in warehouse

**Expected**: 
```json
{
  "storefront": {
    "total_on_hand": 0,
    "sellable_now": 0,
    "entries": []
  }
}
```

#### 4. Storefront with No Location Set
**Setup**: Storefront model has `location = null`

**Expected**: `"location": null` in response

---

## 📊 Database Query Optimization

### Performance Considerations

The enhanced data requires additional queries. Optimize with:

1. **Select Related / Prefetch Related**
```python
storefronts = StorefrontInventory.objects.filter(
    product_id=product_id
).select_related('storefront').prefetch_related(
    'storefront__transfers',
    'storefront__sales'
)
```

2. **Batch Queries**
```python
# Get all storefront IDs first
storefront_ids = [inv.storefront_id for inv in inventories]

# Batch query transfers
transfers = Transfer.objects.filter(
    to_storefront__in=storefront_ids,
    product_id=product_id,
    status='COMPLETED'
).values('to_storefront').annotate(
    total_qty=Sum('fulfilled_quantity'),
    latest_date=Max('completed_at'),
    count=Count('id')
)

# Create lookup dict
transfer_lookup = {t['to_storefront']: t for t in transfers}
```

3. **Caching** (if data doesn't need to be real-time)
```python
from django.core.cache import cache

cache_key = f'storefront_breakdown_{product_id}'
cached_data = cache.get(cache_key)

if cached_data:
    return cached_data

# ... compute data ...

cache.set(cache_key, data, timeout=300)  # 5 minutes
```

---

## 🎨 Frontend Display

### How the Frontend Will Use This Data

The enhanced modal will display storefront cards like this:

```
┌──────────────────────────────────────────────┐
│ 🏪 Main Store Downtown                       │
│ 📍 123 Main St, New York, NY 10001           │
│ Last transfer: Oct 1, 2025 10:30 AM          │
├──────────────────────────────────────────────┤
│  Transferred  │  On Hand  │ Sellable │ Sold  │
│      100      │    100    │    98    │   0   │
├──────────────────────────────────────────────┤
│ 🔒 Reserved: 2 units (Linked: 2, Orphaned: 0)│
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ 🏪 West Side Branch                          │
│ 📍 456 West Ave, New York, NY 10023          │
│ Last transfer: Oct 5, 2025 2:20 PM           │
├──────────────────────────────────────────────┤
│  Transferred  │  On Hand  │ Sellable │ Sold  │
│       79      │     74    │    71    │   5   │
├──────────────────────────────────────────────┤
│ 🔒 Reserved: 3 units (Linked: 3, Orphaned: 0)│
└──────────────────────────────────────────────┘
```

**Benefits**:
- ✅ Clear visibility into each location's inventory
- ✅ Easy to spot high-performing stores (more sales)
- ✅ Quick identification of stale inventory (old transfer dates)
- ✅ Better decision-making for restocking

---

## 🚨 Backward Compatibility

### Handling Missing Fields

The frontend is designed to gracefully handle missing fields:

```typescript
// Frontend handles null/undefined gracefully
const transferred = entry.transferred_quantity ?? null
const sold = entry.sold_quantity ?? null

// Shows "Not available" if data is missing
{transferred !== null ? (
  <div>Transferred: {transferred}</div>
) : (
  <div className="text-muted">Not available</div>
)}
```

**This means**: You can roll out these changes incrementally without breaking the frontend.

---

## 📅 Implementation Timeline

### Suggested Phases

**Phase 1** (Critical - 1 week):
- [ ] Add `location` field (easy, already exists in model)
- [ ] Add `transferred_quantity` calculation
- [ ] Add `sold_quantity` calculation

**Phase 2** (Important - 1 week):
- [ ] Add `last_transfer_date`
- [ ] Performance optimization (if needed)
- [ ] Testing across all stores

**Phase 3** (Enhancement - Optional):
- [ ] Add `transfer_count`
- [ ] Add `sales_breakdown` with time-based metrics
- [ ] Add caching for better performance

---

## 🔍 Data Accuracy Considerations

### Important Questions to Address

1. **Transfer Status**: Which transfer statuses count as "completed"?
   - `COMPLETED`? `DELIVERED`? `CONFIRMED`?
   - Make sure to document which status you're using

2. **Sale Status**: Which sale statuses count as "sold"?
   - `COMPLETED`? `PAID`? Both?
   - Should refunded sales be subtracted?

3. **Date Field**: What date to use for `last_transfer_date`?
   - `created_at`? `completed_at`? `delivered_at`?
   - Recommend using the completion/delivery date

4. **Historical Data**: How far back to calculate?
   - All time? Last 12 months?
   - Consider performance vs accuracy tradeoff

---

## 📞 Support & Questions

### Backend Developer Checklist

Before starting implementation:
- [ ] Review current Transfer model structure
- [ ] Review current Sale/SaleItem model structure
- [ ] Understand current Storefront model fields
- [ ] Check database indexes on storefront/product joins
- [ ] Estimate query performance impact
- [ ] Plan testing strategy

### Questions to Clarify

1. What is the Transfer model structure?
2. What is the Sale/SaleItem model structure?
3. What are the exact status values for completed transfers/sales?
4. Are there any existing helper methods for these calculations?
5. What's the expected number of storefronts per product? (for performance planning)
6. Should we cache this data or compute in real-time?

---

## ✅ Definition of Done

The backend implementation is complete when:

- [ ] All new fields (`location`, `transferred_quantity`, `sold_quantity`, `last_transfer_date`) are included in API response
- [ ] Fields return accurate data matching database records
- [ ] Null/empty states handled gracefully
- [ ] Performance is acceptable (response time < 500ms)
- [ ] Unit tests written for new calculations
- [ ] Integration tests verify correct data flow
- [ ] API documentation updated
- [ ] Frontend confirmed working with new data

---

## 📚 Related Documentation

- Stock Reconciliation Formula Fix Implementation
- Frontend Reconciliation Implementation Guide
- API Endpoint Documentation (to be updated)

---

**Created**: October 10, 2025  
**For**: Backend Development Team  
**Contact**: Frontend Team  
**Priority**: High  
**Estimated Frontend Integration**: 1 day after backend completion
