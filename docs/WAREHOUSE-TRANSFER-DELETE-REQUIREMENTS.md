# Warehouse Transfer Delete/Cancel Behavior Requirements

**Date:** October 27, 2025  
**Status:** Backend Implementation Required  

---

## Current Behavior (Not Desired)

**Cancel Transfer:**
- `POST /inventory/api/warehouse-transfers/{id}/cancel/`
- Sets `status = 'cancelled'`
- Transfer record remains in database
- Inventory changes remain (not reversed)
- Transfer shows in list with "CANCELLED" status

---

## Desired Behavior (User Request)

**Cancel/Delete Transfer should:**
1. **Completely delete the transfer** from the database
2. **Reverse all inventory changes:**
   - Delete StockProduct entries created in destination warehouse
   - Restore quantities to source warehouse StockProduct entries
3. **Delete all related records:**
   - Delete TransferItem records
   - Delete MovementTracker records
   - Remove audit trail entries (or mark as reversed)
4. **Remove from UI:**
   - Transfer disappears from transfer list
   - No trace in database (clean deletion)

---

## Backend Implementation Options

### Option A: Update Cancel Endpoint (Breaking Change)

**Endpoint:** `POST /inventory/api/warehouse-transfers/{id}/cancel/`

**New Behavior:**
```python
@action(detail=True, methods=['post'])
def cancel(self, request, pk=None):
    transfer = self.get_object()
    
    # Only allow cancelling pending/in_transit transfers
    if transfer.status not in ['pending', 'in_transit']:
        return Response(
            {'error': 'Can only cancel pending or in-transit transfers'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Reverse inventory changes
    with transaction.atomic():
        # 1. Delete destination warehouse StockProducts
        for item in transfer.items.all():
            StockProduct.objects.filter(
                product=item.product,
                warehouse=transfer.destination_warehouse
            ).delete()
        
        # 2. Restore source warehouse quantities
        for item in transfer.items.all():
            source_stock = StockProduct.objects.get(
                product=item.product,
                warehouse=transfer.source_warehouse
            )
            source_stock.quantity += item.quantity
            source_stock.save()
        
        # 3. Delete TransferItems
        transfer.items.all().delete()
        
        # 4. Delete MovementTracker records
        MovementTracker.objects.filter(
            reference_number=transfer.reference_number
        ).delete()
        
        # 5. Delete the Transfer itself
        transfer_ref = transfer.reference_number
        transfer.delete()
    
    return Response(
        {'message': f'Transfer {transfer_ref} deleted successfully'},
        status=status.HTTP_204_NO_CONTENT
    )
```

**Response:**
- Status: `204 No Content`
- Body: `{'message': 'Transfer TRF-XXX deleted successfully'}`

---

### Option B: Add Separate Delete Endpoint (Recommended)

**Keep Cancel as-is**, add new delete endpoint:

**Endpoint:** `DELETE /inventory/api/warehouse-transfers/{id}/`

**Behavior:** Same deletion logic as Option A

**Benefits:**
- Semantically clear: Cancel = soft delete, Delete = hard delete
- Non-breaking change (existing cancel still works)
- Follows REST conventions

**Frontend Changes:**
```typescript
// New service function
export const deleteWarehouseTransfer = async (id: UUID): Promise<void> => {
  await httpClient.delete(`/inventory/api/warehouse-transfers/${id}/`)
}
```

**UI Changes:**
- Rename "Cancel Transfer" button to "Delete Transfer"
- Modal confirmation: "This will permanently delete the transfer and reverse all inventory changes. This cannot be undone."

---

## Frontend Changes Required

### If Backend Uses Option A (Update Cancel):

**Change confirmation modal text:**
```tsx
<p className="mb-3 text-danger">
  <strong>Warning:</strong> This will permanently delete transfer{' '}
  <code>{transfer?.reference_number}</code> and reverse all inventory changes.
  This action cannot be undone.
</p>
```

### If Backend Uses Option B (New Delete Endpoint):

1. **Add new service function:**
```typescript
// src/services/inventoryService.ts
export const deleteWarehouseTransfer = async (id: UUID): Promise<void> => {
  await httpClient.delete(`/inventory/api/warehouse-transfers/${id}/`)
}
```

2. **Add new Redux thunk:**
```typescript
// src/store/slices/warehouseTransferSlice.ts
export const deleteWarehouseTransferThunk = createAsyncThunk<
  void,
  { transferId: UUID }
>(
  'warehouseTransfers/deleteTransfer',
  async ({ transferId }, thunkAPI) => {
    try {
      await deleteWarehouseTransfer(transferId)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  }
)
```

3. **Update TransferDetailModal:**
```tsx
// Change button text and handler
<Button
  variant="danger"
  onClick={() => setShowDeleteConfirm(true)}
>
  Delete Transfer
</Button>

// Update confirmation modal
<Modal.Body>
  <p className="mb-3 text-danger">
    <strong>Warning:</strong> This will permanently delete the transfer
    and reverse all inventory changes. This action cannot be undone.
  </p>
  <Form.Group>
    <Form.Label>
      Deletion Reason <span className="text-danger">*</span>
    </Form.Label>
    <Form.Control
      as="textarea"
      rows={3}
      value={deleteReason}
      onChange={(e) => setDeleteReason(e.target.value)}
      placeholder="Why are you deleting this transfer?"
    />
  </Form.Group>
</Modal.Body>
```

---

## Permission Requirements

**Who can delete/cancel transfers:**
- OWNER: ✅ Yes
- ADMIN: ✅ Yes
- MANAGER: ✅ Yes (depending on business rules)
- WAREHOUSE_STAFF: ❌ No

**Status restrictions:**
- `pending`: ✅ Can delete
- `in_transit`: ✅ Can delete (may need manager approval)
- `completed`: ❌ Cannot delete (use separate reversal process)
- `cancelled`: ❌ Already cancelled/deleted

---

## Edge Cases to Handle

### 1. Completed Transfers
**Problem:** User tries to delete a completed transfer  
**Solution:** Block deletion, show error message

### 2. Concurrent Modifications
**Problem:** Transfer is being completed while another user deletes it  
**Solution:** Use database locks, return 409 Conflict

### 3. Partial Stock Products
**Problem:** Source warehouse stock was already sold/transferred elsewhere  
**Solution:** 
- Best effort restoration (restore what's available)
- Log discrepancies
- Alert user if full restoration not possible

### 4. Destination Stock Already Sold
**Problem:** Items transferred to destination were already sold  
**Solution:**
- Block deletion, show error
- Require manual inventory adjustment
- OR: Allow deletion but flag negative inventory

---

## Testing Checklist

### Backend Tests:
- [ ] Delete pending transfer → inventory restored
- [ ] Delete in_transit transfer → inventory restored
- [ ] Try to delete completed transfer → error
- [ ] Try to delete cancelled transfer → error
- [ ] Verify all related records deleted
- [ ] Verify MovementTracker cleaned up
- [ ] Test concurrent deletion attempts
- [ ] Test partial restoration scenarios

### Frontend Tests:
- [ ] Delete button shows for pending transfers
- [ ] Delete button disabled for completed transfers
- [ ] Confirmation modal shows warning
- [ ] Reason field required (min 10 chars)
- [ ] Successful deletion refreshes list
- [ ] Transfer disappears from UI
- [ ] Error handling (network, permissions)
- [ ] Loading states during deletion

---

## Recommendation

**Use Option B (Separate Delete Endpoint)**

**Reasoning:**
1. **Clearer semantics:** Cancel vs Delete have different meanings
2. **Non-breaking:** Existing cancel functionality preserved
3. **Audit trail:** Can keep cancelled transfers for history
4. **Future flexibility:** May want soft delete (cancel) vs hard delete later

**Next Steps:**
1. Backend team implements `DELETE /inventory/api/warehouse-transfers/{id}/`
2. Frontend team updates service + Redux + UI
3. Test thoroughly with edge cases
4. Deploy with feature flag (if needed)

---

**Status:** Waiting for backend implementation  
**Priority:** High (affects user workflow)  
**ETA:** TBD
