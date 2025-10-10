# Stock Adjustment Edit Feature - Implementation Summary

## Overview
This document summarizes the implementation of the stock adjustment edit feature, which allows users to edit PENDING stock adjustments through the UI.

## Feature Requirements
- **Editable States**: Only PENDING adjustments can be edited
- **Blocked States**: APPROVED and REJECTED adjustments cannot be edited
- **Editable Fields**: 
  - Product (stock_product)
  - Quantity (quantity_change)
  - Adjustment type (adjustment_type)
  - Reason (reason)
  - Notes (notes)
- **Workflow**: Edit button in detail modal → Edit modal → Save → Refresh list

## Backend API
- **Endpoint**: `PATCH /inventory/api/stock-adjustments/{id}/`
- **Payload**:
  ```typescript
  {
    stock_product?: string;
    quantity_change?: number;
    adjustment_type?: 'shrinkage' | 'damaged' | 'returned' | 'miscellaneous';
    reason?: string;
    notes?: string;
  }
  ```
- **Validation**: Backend enforces that only PENDING adjustments can be edited
- **Response**: Returns updated StockAdjustment object

## Frontend Components

### 1. EditAdjustmentModal (`components/inventory/EditAdjustmentModal.tsx`)
**Purpose**: Modal for editing stock adjustment details

**Key Features**:
- Form with validation for all editable fields
- Status blocking: Shows error if adjustment status is not PENDING
- Product search and selection
- Adjustment type dropdown (shrinkage, damaged, returned, miscellaneous)
- Quantity change input (positive or negative)
- Reason and notes fields
- Form validation before submission
- Loading state during API call

**Props**:
```typescript
interface EditAdjustmentModalProps {
  show: boolean;
  onClose: () => void;
  adjustment: StockAdjustment | null;
  onSubmit: (id: string, payload: StockAdjustmentEditPayload) => Promise<void>;
  isSubmitting: boolean;
  error?: string | null;
}
```

**State Management**:
- Local form state for all editable fields
- Validation on submit
- Pre-populates form with existing adjustment data
- Resets form when modal closes

**Validation Rules**:
- Product required
- Quantity change must be non-zero
- Adjustment type required
- Reason required for shrinkage and damaged types

### 2. AdjustmentDetailModal (Updated)
**Changes**:
- Added `onEdit?: (adjustment: StockAdjustment) => void` prop
- Added Edit button next to Approve/Reject buttons
- Edit button only visible when status is PENDING
- Edit button click triggers `onEdit` callback with adjustment

**UI Pattern**:
```tsx
{canEdit && (
  <Button variant="secondary" onClick={handleEdit}>
    <FaEdit className="me-1" />
    Edit
  </Button>
)}
```

### 3. ManageStocksPage (Updated)
**Redux Integration**:
```typescript
// Selectors
const updateAdjustmentStatus = useAppSelector(selectUpdateAdjustmentStatus)
const updateAdjustmentError = useAppSelector(selectUpdateAdjustmentError)

// State
const [showEditAdjustmentModal, setShowEditAdjustmentModal] = useState(false)
const [editingAdjustment, setEditingAdjustment] = useState<StockAdjustment | null>(null)
```

**Handlers**:
```typescript
// Open edit modal from detail modal
const handleEditAdjustment = (adjustment: StockAdjustment) => {
  setEditingAdjustment(adjustment)
  setShowEditAdjustmentModal(true)
  setShowAdjustmentDetailModal(false)
}

// Submit edit
const handleEditAdjustmentSubmit = async (id: string, payload: StockAdjustmentEditPayload) => {
  await dispatch(editStockAdjustment({ id, payload })).unwrap()
  void dispatch(loadStockAdjustments({ page: adjustmentsPage }))
  setShowEditAdjustmentModal(false)
  setEditingAdjustment(null)
  console.log('✏️ Edited adjustment, reloading list')
}
```

**Modal Rendering**:
```tsx
<AdjustmentDetailModal
  show={showAdjustmentDetailModal}
  onClose={handleCloseDetailModal}
  adjustment={selectedAdjustment}
  onApprove={handleApproveAdjustment}
  onReject={handleRejectAdjustment}
  onEdit={handleEditAdjustment} // NEW
  isApproving={approveAdjustmentStatus === 'loading'}
  isRejecting={rejectAdjustmentStatus === 'loading'}
/>

<EditAdjustmentModal
  show={showEditAdjustmentModal}
  onClose={handleCloseEditModal}
  adjustment={editingAdjustment}
  onSubmit={handleEditAdjustmentSubmit}
  isSubmitting={updateAdjustmentStatus === 'loading'}
  error={updateAdjustmentError}
/>
```

## Redux Store Updates

### stockAdjustmentSlice.ts
**New Selectors**:
```typescript
export const selectUpdateAdjustmentStatus = (state: RootState) =>
  state.stockAdjustment.updateAdjustmentStatus

export const selectUpdateAdjustmentError = (state: RootState) =>
  state.stockAdjustment.updateAdjustmentError
```

**Existing State Properties** (already in slice):
- `updateAdjustmentStatus: AsyncStatus` - Tracks edit operation status
- `updateAdjustmentError: string | null` - Stores edit error messages

**Existing Thunk** (already implemented):
```typescript
export const editStockAdjustment = createAsyncThunk<
  StockAdjustment,
  { id: string; payload: StockAdjustmentEditPayload }
>('stockAdjustment/editStockAdjustment', async ({ id, payload }, thunkAPI) => {
  // Implementation already exists
})
```

**Reducer Cases** (already implemented):
- `editStockAdjustment.pending`: Sets loading state
- `editStockAdjustment.fulfilled`: Updates adjustment in list and selectedAdjustment
- `editStockAdjustment.rejected`: Sets error state

## User Flow
1. User views adjustment detail modal
2. If status is PENDING, user sees Edit button
3. User clicks Edit button
4. Edit modal opens with pre-populated form
5. User modifies fields
6. User clicks Save
7. API request sent with changes
8. On success:
   - Edit modal closes
   - Adjustments list refreshes
   - User sees updated adjustment
9. On error:
   - Error message displayed in modal
   - User can retry or cancel

## Status Validation
**Frontend**:
- Edit button hidden if status ≠ PENDING
- Modal shows error message if status ≠ PENDING
- Form submission blocked if status ≠ PENDING

**Backend**:
- API returns 400 if attempting to edit non-PENDING adjustment
- Error message: "Only pending adjustments can be edited"

## Error Handling
**Network Errors**:
- Displayed in modal via `error` prop
- User can retry submission
- Modal stays open on error

**Validation Errors**:
- Client-side validation prevents invalid submissions
- Required fields enforced
- Backend validation errors displayed if they occur

**Optimistic Updates**:
- Not used for safety
- List only refreshes after successful API response

## Testing Checklist
- [ ] Edit button appears only for PENDING adjustments
- [ ] Edit button hidden for APPROVED adjustments
- [ ] Edit button hidden for REJECTED adjustments
- [ ] Form pre-populates with existing values
- [ ] Product search works in edit form
- [ ] Quantity change validation works
- [ ] Adjustment type dropdown works
- [ ] Reason field required for shrinkage/damaged
- [ ] Notes field optional
- [ ] Save button triggers API call
- [ ] Loading state during submission
- [ ] Error displayed on API failure
- [ ] Success closes modal and refreshes list
- [ ] Cancel button closes modal without changes
- [ ] Modal resets when closed and reopened

## Implementation Status
✅ **Complete** - All components implemented and integrated

### Files Modified:
1. ✅ `src/components/inventory/EditAdjustmentModal.tsx` (created)
2. ✅ `src/components/inventory/AdjustmentDetailModal.tsx` (updated with Edit button)
3. ✅ `src/features/dashboard/pages/ManageStocksPage.tsx` (integrated edit workflow)
4. ✅ `src/store/slices/stockAdjustmentSlice.ts` (added selectors)
5. ✅ `src/types/inventory.ts` (StockAdjustmentEditPayload already exists)

### Backend Requirements:
✅ Edit endpoint implemented and tested
✅ Status validation enforced
✅ PATCH method supported

## Notes
- Edit operation follows same pattern as approve/reject
- Redux state management consistent with other mutations
- Form validation matches backend requirements
- UI blocks editing of non-PENDING adjustments at multiple levels
- Modal workflow matches existing patterns (create → edit → detail)

## Future Enhancements
- Audit trail showing edit history
- Confirmation dialog before saving changes
- Comparison view showing old vs new values
- Bulk edit capability
- Edit notification for other users viewing same adjustment
