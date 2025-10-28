# Stock Product Creation Fix - Missing Warehouse Field

## Issue Summary
Stock product creation was failing with a 400 Bad Request error because the backend requires a `warehouse` field in the payload, but the frontend was not sending it.

### Error Details
- **HTTP Status**: 400 Bad Request
- **Error Message**: "Warehouse: This field is required."
- **Missing Field**: `warehouse` (UUID)
- **API Endpoint**: `POST /inventory/api/stock-products/`

### Request Payload (Before Fix)
```json
{
  "stock": "stock-uuid",
  "product": "product-uuid",
  "supplier": "supplier-uuid",
  "quantity": 100,
  "unit_cost": "75",
  "unit_tax_rate": "3",
  "unit_additional_cost": "2",
  "retail_price": "100",
  "wholesale_price": "85",
  "description": "some description",
  "expiry_date": "2025-10-28"
  // Missing: warehouse field
}
```

## Root Cause

The `StockProductPayload` TypeScript interface did not include the `warehouse` field, and the `StockIntakeModal` component was not extracting the warehouse ID from the stock batch to include in the request.

### Context
When users create stock products via the Stock Intake Modal:
1. They first select a **warehouse** and create a **stock batch**
2. The stock batch stores the warehouse ID: `createdBatch.warehouse`
3. Then they add **line items** (stock products) to that batch
4. Each stock product should inherit the warehouse from its parent batch

The frontend was sending the `stock` (batch ID) but not the `warehouse` ID.

## Solution Implemented

### 1. Updated StockProductPayload Interface
**File**: `src/types/inventory.ts`

```typescript
export interface StockProductPayload {
  stock: UUID
  warehouse: UUID  // ✅ Added - Required warehouse field
  stock_batch?: UUID
  product: UUID
  supplier?: UUID | null
  quantity: number
  unit_cost: string
  unit_tax_rate?: string | null
  unit_tax_amount?: string | null
  unit_additional_cost?: string | null
  retail_price?: string | null
  wholesale_price?: string | null
  expiry_date?: string | null
  description?: string | null
}
```

### 2. Updated StockIntakeModal Component
**File**: `src/features/dashboard/components/StockIntakeModal.tsx`

```typescript
const handleAddLineItem = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault()
  if (!createdBatch) return
  if (!lineItemForm.product) return
  if (!lineItemForm.unit_cost.trim()) return
  if (lineItemForm.quantity <= 0) return

  const payload: StockProductPayload = {
    stock: createdBatch.id,
    warehouse: createdBatch.warehouse,  // ✅ Added - Extract from batch
    stock_batch: createdBatch.id,
    product: lineItemForm.product,
    supplier: lineItemForm.supplier ? lineItemForm.supplier : null,
    quantity: lineItemForm.quantity,
    unit_cost: lineItemForm.unit_cost.trim(),
    // ... rest of fields
  }
  
  // ... create stock product
}
```

### Request Payload (After Fix)
```json
{
  "stock": "stock-uuid",
  "warehouse": "warehouse-uuid",  // ✅ Now included
  "product": "product-uuid",
  "supplier": "supplier-uuid",
  "quantity": 100,
  "unit_cost": "75",
  "unit_tax_rate": "3",
  "unit_additional_cost": "2",
  "retail_price": "100",
  "wholesale_price": "85",
  "description": "some description",
  "expiry_date": "2025-10-28"
}
```

## How It Works

### Stock Intake Flow
1. **User selects warehouse** from dropdown (e.g., "Adiringanor Warehouse")
2. **Create stock batch**: Stores warehouse reference
   ```typescript
   createdBatch = {
     id: "batch-uuid",
     warehouse: "warehouse-uuid",  // ← Warehouse stored here
     arrival_date: "2025-10-28",
     ...
   }
   ```
3. **Add line items**: Extract warehouse from batch
   ```typescript
   payload = {
     stock: createdBatch.id,
     warehouse: createdBatch.warehouse,  // ← Extract from batch
     product: selectedProduct,
     ...
   }
   ```

### Data Relationships
```
Warehouse (selected by user)
    ↓
StockBatch (belongs to warehouse)
    ↓
StockProduct (belongs to stock batch AND warehouse)
```

## Impact Analysis

### ✅ Safe Changes
- **Type Updates**: Added required field to interface
- **Update Operations**: Uses `Partial<StockProductPayload>`, so warehouse is optional for edits
- **Other Components**: Only `StockIntakeModal` creates new stock products with full payload

### Files Modified
1. `src/types/inventory.ts` - Added `warehouse: UUID` to `StockProductPayload`
2. `src/features/dashboard/components/StockIntakeModal.tsx` - Extract and include `warehouse: createdBatch.warehouse`

### No Breaking Changes
- Update operations use `Partial<StockProductPayload>` - warehouse field optional
- Service layer passes payload as-is - no changes needed
- Redux slice passes payload to service - no changes needed

## Testing Checklist

After deploying this fix, verify:
- [ ] Navigate to Manage Stocks page
- [ ] Click "Record stock intake"
- [ ] Select a warehouse from dropdown
- [ ] Create stock batch
- [ ] Add a line item (stock product)
- [ ] Verify successful creation (no 400 error)
- [ ] Check that warehouse field is in the request payload (Network tab)
- [ ] Verify stock product appears in the list
- [ ] Confirm warehouse is correctly associated

## Backend Context

The backend requires the `warehouse` field because:
- **Multi-tenancy**: Stock products must be warehouse-scoped
- **Inventory tracking**: Need to know which warehouse has the stock
- **Stock adjustments**: Require warehouse context for business association
- **Data integrity**: Prevents orphaned stock products

## Related Issues

This fix resolves the issue where:
- Backend was expecting `warehouse` field
- Frontend was only sending `stock` (batch ID)
- Backend couldn't infer warehouse from stock batch relationship
- API returned 400 "Warehouse: This field is required"

## Pattern Reference

This follows the same pattern as the product creation fix where:
- Backend requires a field for data integrity
- Frontend type definition was missing the field
- Component needed to extract and include the field from context
- Solution: Update type + extract from available context

---

**Status**: ✅ Fixed and ready for testing  
**Date**: October 28, 2025  
**Backend Requirement**: `warehouse` field is mandatory in stock product creation
