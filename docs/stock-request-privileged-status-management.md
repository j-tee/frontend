# Stock Request Privileged Status Management

## Overview
This feature enables privileged users (Managers, Admins, and Owners) to manually override the status of stock requests. This is useful for administrative purposes such as:
- Resetting stuck requests
- Manually marking fulfillment when done outside the system
- Correcting incorrect status transitions
- Handling edge cases and exceptions

## Implementation

### Backend Integration
- **API Endpoint**: `PUT /inventory/api/transfer-requests/{id}/update-status/`
- **Payload**: 
  ```typescript
  {
    status: 'NEW' | 'ASSIGNED' | 'FULFILLED' | 'CANCELLED',
    force?: boolean  // Set to true to bypass business logic validations
  }
  ```

### Frontend Components

#### 1. Type Definitions (`src/types/inventory.ts`)
Added `TransferRequestUpdateStatusPayload` interface:
```typescript
export interface TransferRequestUpdateStatusPayload {
  status: 'NEW' | 'ASSIGNED' | 'FULFILLED' | 'CANCELLED'
  force?: boolean
}
```

#### 2. API Service (`src/services/inventoryService.ts`)
Added `updateTransferRequestStatus` function:
```typescript
export async function updateTransferRequestStatus(
  requestId: string,
  payload: TransferRequestUpdateStatusPayload
): Promise<TransferRequest>
```

#### 3. Redux State Management (`src/store/slices/transferRequestSlice.ts`)
- **Async Thunk**: `updateTransferRequestStatus`
  - Dispatches API call with force flag
  - Updates local state on success
  - Handles errors with user-friendly messages

- **Mutation State Tracking**:
  - `mutationStatus.updateStatus`: 'idle' | 'loading' | 'succeeded' | 'failed'
  - `mutationErrors.updateStatus`: Error message string or null

- **Reducer Cases**:
  - `pending`: Sets loading state, clears errors
  - `fulfilled`: Updates detail and list with new status
  - `rejected`: Sets error state with message

#### 4. UI Component (`src/features/dashboard/components/stock-requests/StockRequestDetailModal.tsx`)
Enhanced with status management features:

- **Permission Check**: Only shows status controls to Manager/Admin/Owner roles
- **Status Dropdown**: Allows selection of any valid status
- **Confirmation Dialog**: Shows inline alert with confirm/cancel buttons
- **Loading States**: Disables controls during async operations
- **Error Display**: Shows updateStatusError if operation fails

**New Props**:
- `onUpdateStatus`: Handler for status changes
- `isUpdatingStatus`: Loading state flag
- `updateStatusError`: Error message from update operation

**UI Flow**:
1. User selects new status from dropdown
2. Confirmation alert appears showing old → new status
3. User confirms or cancels
4. On confirm, API call with `force=true` is made
5. Modal stays open to show result
6. Request list is refreshed

#### 5. Page Integration (`src/features/dashboard/pages/ManageStocksPage.tsx`)
- **Handler**: `handleUpdateStockRequestStatus`
  - Casts status string to proper type
  - Always sets `force=true` for manager overrides
  - Refreshes request list after update
  - Keeps modal open to show result
  - Clears mutation state for next operation

- **Modal Props**: Wired up all status update props and handlers

## Permission Model
Only users with these roles can update status manually:
- **MANAGER**: Full access to status management
- **ADMIN**: Full access to status management
- **OWNER**: Full access to status management

Regular employees can only use the Cancel/Fulfill buttons which follow business rules.

## User Experience

### For Privileged Users
1. Open any stock request detail modal
2. See "Change" button next to current status badge
3. Click to see dropdown with all status options
4. Select new status
5. Confirm in the inline alert dialog
6. See updated status immediately
7. Request list refreshes automatically

### Visual Indicators
- Current status shown as badge (colored by status type)
- "Change" dropdown only visible to privileged users
- Confirmation shows old/new status as badges
- Loading spinner on "Confirm" button during operation
- Error alerts displayed at top of modal

## Force Flag Behavior
When `force=true` is sent:
- Backend bypasses normal status transition validations
- Allows any status → any status transitions
- Enables administrative corrections and overrides
- Managers take responsibility for data integrity

## Error Handling
- Network errors shown in modal
- Validation errors from backend displayed
- Mutation state tracked separately from main operations
- Errors cleared when modal closes or new operation starts

## State Management
The feature integrates cleanly with existing Redux patterns:
- Uses same mutation tracking system as cancel/fulfill
- Shares error/success patterns
- Follows established naming conventions
- Properly cleans up state

## Testing Considerations
To test this feature:
1. Login as Manager/Admin/Owner
2. Create a stock request
3. Observe "Change" button appears next to status
4. Try changing status to each possible value
5. Confirm changes persist after refresh
6. Test error cases (network failures, etc.)
7. Verify regular employees don't see status controls

## Future Enhancements
Potential improvements:
- Audit log for status changes
- Reason/notes field for manual overrides
- Bulk status updates
- Status change history in modal
- More granular permission controls
