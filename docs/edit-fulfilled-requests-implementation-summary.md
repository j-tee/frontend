# Edit Fulfilled Requests - Implementation Summary

## Overview
Successfully implemented the simpler "edit fulfilled requests" approach instead of the complex returns workflow. This allows managers, admins, and owners to directly edit the quantities of fulfilled stock requests, with automatic inventory recalculation handled by the backend.

## What Was Built

### 1. Permission Hook
**File:** `src/hooks/useCanEditFulfilled.ts`
- Simple role-based permission check
- Returns `true` for MANAGER, ADMIN, or OWNER roles
- Returns `false` for STAFF role
- Exported from `src/hooks/index.ts`

### 2. Edit Fulfilled Request Form
**File:** `src/features/dashboard/components/stock-requests/EditFulfilledRequestForm.tsx`
- Clean table-based interface for editing line items
- Shows original quantity vs new quantity side-by-side
- Notes field for each line item to explain changes
- Real-time validation:
  - All quantities must be positive (> 0)
  - Detects if any changes were made
  - Disables submit if no changes or invalid data
- Visual feedback:
  - Yellow highlighting for modified rows
  - Yellow border on changed quantity inputs
  - Badge showing fulfilled status
- Info alert explaining automatic inventory adjustment
- Displays request metadata (ID, storefront, direction, status)

### 3. Edit Modal Wrapper
**File:** `src/features/dashboard/components/stock-requests/EditFulfilledRequestModal.tsx`
- XL-sized modal for comfortable viewing
- Static backdrop to prevent accidental closes
- Keyboard disabled during submission
- Close button disabled during submission

### 4. Updated Stock Request Detail Modal
**File:** `src/features/dashboard/components/stock-requests/StockRequestDetailModal.tsx`
- Added `onEditFulfilled` prop
- Added "Edit Quantities" button in footer
- Button only shows for:
  - Fulfilled requests (`status === 'FULFILLED'`)
  - Users with edit permission (manager/admin/owner)
  - When `onEditFulfilled` handler is provided
- Button positioned before Cancel/Fulfill buttons

### 5. Updated Manage Stocks Page
**File:** `src/features/dashboard/pages/ManageStocksPage.tsx`
- Added state:
  - `showEditFulfilledModal`: Controls edit modal visibility
  - `editingRequest`: Stores the request being edited
- Added handlers:
  - `handleEditFulfilled`: Opens edit modal with selected request
  - `handleSaveEditFulfilled`: Submits changes via `updateTransferRequest` thunk
  - `handleCancelEditFulfilled`: Closes edit modal and clears state
- Added imports:
  - `EditFulfilledRequestModal` component
  - `updateTransferRequest` thunk from transfer request slice
- Integrated edit modal rendering with proper props

## How It Works

### User Flow
1. Manager/Admin/Owner views a fulfilled stock request
2. Clicks "Edit Quantities" button in detail modal
3. Detail modal closes, edit modal opens
4. User modifies quantities and/or adds notes
5. Modified rows are highlighted in yellow
6. User clicks "Save Changes"
7. Frontend sends PATCH request to backend
8. Backend:
   - Updates the transfer request line items
   - Recalculates inventory levels automatically
   - Returns updated transfer request
9. Frontend refreshes the list and closes modal

### Technical Flow
1. `handleEditFulfilled` is called with request ID
2. Finds request in Redux state
3. Sets `editingRequest` and shows modal
4. User makes changes in `EditFulfilledRequestForm`
5. Form validates and submits to parent
6. `handleSaveEditFulfilled` dispatches `updateTransferRequest` thunk
7. Thunk calls existing PATCH endpoint
8. On success:
   - Reloads transfer requests list
   - Closes modal
   - Clears editing state
9. On error:
   - Error shown via Redux state in modal

## API Integration

### Endpoint Used
```
PATCH /inventory/api/transfer-requests/{id}/
```

### Payload Format
```typescript
{
  line_items: [
    {
      id: "uuid-of-line-item",
      product: "uuid-of-product",
      requested_quantity: 50,  // New quantity
      unit_of_measure: "units",
      notes: "Adjusted due to inventory discrepancy"
    }
  ]
}
```

### Backend Behavior
- Validates that request exists and is fulfilled
- Validates that only manager/admin/owner can edit
- Updates line item quantities
- **Automatically recalculates inventory:**
  - If quantity increased: Adds more stock to destination
  - If quantity decreased: Removes excess stock from destination
- Updates the transfer request record
- Returns updated transfer request

## Benefits Over Returns Workflow

### Simpler Architecture
- ❌ **Old approach:** Parent-child relationships, cancelled_by, cancelled_reason, returnable quantity calculations, new status transitions
- ✅ **New approach:** Direct edit of existing records, simple quantity updates, notes for audit trail

### Reduced Complexity
- No new database fields needed
- No new API endpoints needed
- No complex business logic for parent-child linking
- No status transition edge cases

### Better UX
- Single click to edit instead of multi-step return creation
- See original and new values side-by-side
- Clear visual feedback on changes
- Simpler mental model: "fix the mistake" not "create a reverse transfer"

### Easier Maintenance
- Uses existing `updateTransferRequest` infrastructure
- Reuses existing permission checks
- Fewer edge cases to test
- Less code to maintain

## Testing Checklist

### Permission Tests
- [ ] Manager can see "Edit Quantities" button on fulfilled requests
- [ ] Admin can see "Edit Quantities" button on fulfilled requests
- [ ] Owner can see "Edit Quantities" button on fulfilled requests
- [ ] Staff cannot see "Edit Quantities" button
- [ ] Button only appears on FULFILLED requests (not NEW, ASSIGNED, or CANCELLED)

### Functionality Tests
- [ ] Clicking "Edit Quantities" opens edit modal
- [ ] Edit modal shows correct request data
- [ ] Edit modal shows all line items
- [ ] Can increase quantity and save successfully
- [ ] Can decrease quantity and save successfully
- [ ] Can edit notes and save successfully
- [ ] Modified rows highlight in yellow
- [ ] Submit button disabled when no changes
- [ ] Submit button disabled when quantity is 0 or negative
- [ ] Cancel button closes modal without saving
- [ ] Success reloads the list with updated data
- [ ] Error shows appropriate message

### Edge Cases
- [ ] Editing with 1 line item works
- [ ] Editing with multiple line items works
- [ ] Changing only notes (no quantity change) works
- [ ] Changing only quantity (no notes) works
- [ ] Simultaneous changes to multiple items work
- [ ] Large quantity increases work
- [ ] Reducing quantity to 1 (minimum valid) works
- [ ] Network error shows error message
- [ ] Validation error shows error message

### Integration Tests
- [ ] Inventory levels update correctly after edit
- [ ] Updated quantities persist after page refresh
- [ ] Updated notes persist after page refresh
- [ ] List view shows updated quantities
- [ ] Detail view shows updated quantities after edit

## Files Modified
1. `src/hooks/useCanEditFulfilled.ts` (NEW)
2. `src/hooks/index.ts` (modified - export new hook)
3. `src/features/dashboard/components/stock-requests/EditFulfilledRequestForm.tsx` (NEW)
4. `src/features/dashboard/components/stock-requests/EditFulfilledRequestModal.tsx` (NEW)
5. `src/features/dashboard/components/stock-requests/StockRequestDetailModal.tsx` (modified - add edit button)
6. `src/features/dashboard/pages/ManageStocksPage.tsx` (modified - add handlers and modal)

## Next Steps

### Optional Enhancements
1. **Audit Trail:** Show edit history in request detail modal
2. **Bulk Edit:** Allow editing multiple requests at once
3. **Keyboard Shortcuts:** Add keyboard navigation in edit form
4. **Undo:** Add ability to revert recent changes
5. **Notifications:** Show toast notification on successful edit
6. **Optimistic Updates:** Update UI before backend confirms

### Documentation
1. Update user manual with edit feature instructions
2. Add screenshots to help documentation
3. Update API documentation if needed
4. Create video tutorial for staff training

### Cleanup
1. Consider removing or repurposing the "Returns" tab
2. Remove `ReturnRequestForm.tsx` if no longer needed
3. Archive `returns-workflow-backend-requirements.md` as superseded
4. Update any references to the old returns workflow

## Conclusion
The edit fulfilled requests feature has been successfully implemented as a simpler, more maintainable alternative to the complex returns workflow. It provides managers with the flexibility to correct mistakes in fulfilled requests while maintaining a clear audit trail through notes and automatic inventory recalculation.
