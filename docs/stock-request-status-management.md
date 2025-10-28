# Stock Request Status Management

## Manager Status Override Feature

**Added:** 2025-10-03  
**Endpoint:** `POST /inventory/api/transfer-requests/{id}/update-status/`

### Overview

Managers can now manually override stock request status for administrative purposes, allowing them to:
- Reset stuck requests back to `NEW`
- Mark requests as `FULFILLED` without creating a transfer
- Handle edge cases and manual fulfillments
- Fix workflow issues administratively

### Endpoint Details

**URL:** `POST /inventory/api/transfer-requests/{id}/update-status/`

**Permissions:** Manager, Admin, or Owner roles only

**Request Body:**
```json
{
  "status": "NEW|ASSIGNED|FULFILLED|CANCELLED",
  "force": false  // optional, defaults to false
}
```

**Response:** Full TransferRequest object with additional metadata:
```json
{
  ...standard request fields...,
  "_status_change": {
    "old_status": "ASSIGNED",
    "new_status": "FULFILLED",
    "changed_by": "Manager Name"
  }
}
```

### Status Transitions

#### Without Force Flag
Standard business logic applies:
- `NEW` → Can go to any status
- `ASSIGNED` → Can go to `FULFILLED` or `CANCELLED`
- `FULFILLED` → Terminal state (cannot change)
- `CANCELLED` → Terminal state (cannot change)

#### With Force Flag (`force: true`)
Bypasses business logic constraints:
- Can move from any status to any other status
- Use with caution - for administrative fixes only
- Logs additional audit information

### Common Use Cases

#### 1. Reset Stuck Request
When a request is stuck in `ASSIGNED` but the transfer was deleted:

```typescript
await updateTransferRequestStatus(requestId, {
  status: 'NEW'
})
// Clears linked_transfer_id
// Clears assigned_at timestamp
// Request can be reassigned to new transfer
```

#### 2. Manual Fulfillment
When stock was provided through alternative means:

```typescript
await updateTransferRequestStatus(requestId, {
  status: 'FULFILLED'
})
// Sets fulfilled_at timestamp
// Sets fulfilled_by to current user
// Request marked complete without transfer
```

#### 3. Administrative Cancellation
Cancel any request regardless of status:

```typescript
await updateTransferRequestStatus(requestId, {
  status: 'CANCELLED',
  force: true  // If already assigned/fulfilled
})
// Sets cancelled_at timestamp
// Sets cancelled_by to current user
```

#### 4. Reopen Cancelled Request
In rare cases, reopen a cancelled request:

```typescript
await updateTransferRequestStatus(requestId, {
  status: 'NEW',
  force: true  // Required for cancelled requests
})
// Clears cancelled_at and cancelled_by
// Resets to NEW state
```

### Frontend Integration

#### Service Function

```typescript
// src/services/inventoryService.ts

export interface UpdateStatusPayload {
  status: 'NEW' | 'ASSIGNED' | 'FULFILLED' | 'CANCELLED'
  force?: boolean
}

export const updateTransferRequestStatus = async (
  id: string,
  payload: UpdateStatusPayload
): Promise<TransferRequest> => {
  const { data } = await httpClient.post<TransferRequest>(
    `/inventory/api/transfer-requests/${id}/update-status/`,
    payload
  )
  return data
}
```

#### Redux Thunk

```typescript
// src/store/slices/transferRequestSlice.ts

export const updateTransferRequestStatus = createAsyncThunk<
  TransferRequest,
  { requestId: string; payload: UpdateStatusPayload }
>(
  'transferRequests/updateStatus',
  async ({ requestId, payload }, thunkAPI) => {
    try {
      return await updateTransferRequestStatusApi(requestId, payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  }
)
```

#### UI Component Example

```typescript
// Manager actions in request detail modal

const handleResetRequest = async () => {
  if (!confirm('Reset this request to NEW status?')) return
  
  try {
    await dispatch(updateTransferRequestStatus({
      requestId: request.id,
      payload: { status: 'NEW' }
    })).unwrap()
    
    toast.success('Request reset to NEW status')
    dispatch(loadTransferRequests())
  } catch (error) {
    toast.error(error.message)
  }
}

const handleMarkFulfilled = async () => {
  if (!confirm('Mark this request as fulfilled manually?')) return
  
  try {
    await dispatch(updateTransferRequestStatus({
      requestId: request.id,
      payload: { status: 'FULFILLED' }
    })).unwrap()
    
    toast.success('Request marked as fulfilled')
    dispatch(loadTransferRequests())
  } catch (error) {
    toast.error(error.message)
  }
}
```

### UI Considerations

#### Show Status Override Actions
Only display manual status change options for managers:

```typescript
const canManageStatus = userRole in ['MANAGER', 'ADMIN', 'OWNER']

{canManageStatus && (
  <Dropdown>
    <Dropdown.Item onClick={handleResetRequest}>
      Reset to NEW
    </Dropdown.Item>
    <Dropdown.Item onClick={handleMarkFulfilled}>
      Mark as Fulfilled
    </Dropdown.Item>
    <Dropdown.Item onClick={handleCancelRequest}>
      Cancel Request
    </Dropdown.Item>
  </Dropdown>
)}
```

#### Confirmation Dialogs
Always show confirmation before status changes:

```typescript
const statusChangeConfirmations = {
  NEW: 'This will clear any transfer assignments. Continue?',
  ASSIGNED: 'This will mark the request as assigned without a transfer. Continue?',
  FULFILLED: 'This will mark the request as complete without a transfer. Continue?',
  CANCELLED: 'This will cancel the request. This action may require force flag. Continue?'
}
```

#### Display Status Change History
Show when status was manually changed:

```typescript
{request._status_change && (
  <Alert variant="info">
    <strong>Manual status change:</strong>{' '}
    {request._status_change.old_status} → {request._status_change.new_status}{' '}
    by {request._status_change.changed_by}
  </Alert>
)}
```

### Security Considerations

1. **Permission Enforcement**
   - Endpoint is restricted to Manager+ roles
   - Backend validates permissions on every request
   - Frontend should hide UI but always validate on backend

2. **Audit Trail**
   - All status changes are logged
   - Includes actor, timestamp, old/new status
   - Force flag usage is recorded

3. **Business Logic**
   - Force flag should be used sparingly
   - UI should warn before force operations
   - Consider requiring additional confirmation for force=true

4. **Data Integrity**
   - Status changes update relevant timestamps
   - Linked transfers are NOT automatically modified
   - Managers should verify transfer state separately

### Error Handling

Common error scenarios:

```typescript
try {
  await updateTransferRequestStatus(requestId, { status: 'FULFILLED' })
} catch (error) {
  // Handle specific errors
  if (error.response?.status === 403) {
    // Permission denied
    toast.error('You do not have permission to change request status')
  } else if (error.response?.status === 400) {
    // Invalid transition
    const message = error.response?.data?.detail || 'Invalid status transition'
    toast.error(message)
    
    // Suggest using force flag if appropriate
    if (message.includes('terminal state')) {
      toast.info('Use force flag to override terminal states')
    }
  } else {
    toast.error('Failed to update request status')
  }
}
```

### Best Practices

1. **Use Standard Workflow First**
   - Prefer normal cancel/fulfill actions over manual status changes
   - Only use status override for edge cases

2. **Document Reasons**
   - Consider adding a notes field to status update payload
   - Log reasons in application logs

3. **Verify State**
   - Check linked transfer status before resetting
   - Confirm with user before irreversible changes

4. **Monitor Usage**
   - Track frequency of manual status changes
   - Investigate if used too frequently (may indicate workflow issues)

### Testing

Test coverage for status management:

```typescript
describe('Stock Request Status Management', () => {
  it('should allow manager to reset request to NEW', async () => {
    // Test resetting from ASSIGNED to NEW
  })
  
  it('should allow manager to mark as fulfilled manually', async () => {
    // Test direct fulfillment without transfer
  })
  
  it('should prevent non-managers from changing status', async () => {
    // Test permission enforcement
  })
  
  it('should reject invalid status transitions without force flag', async () => {
    // Test business logic validation
  })
  
  it('should allow force flag to override restrictions', async () => {
    // Test force flag functionality
  })
})
```

### Migration Notes

No database migrations required - this uses existing status fields and workflows.

### Related Documentation

- [Stock Request Backend Contract](./stock_request_backend_contract.md)
- [Transfer Workflow](./transfer_approvals_receipt_dashboard.md)
- [Stock Request Implementation](./stock-request-implementation.md)

---

**Last Updated:** 2025-10-03  
**Feature Status:** ✅ Available  
**Backend Version:** v1.0.0+
