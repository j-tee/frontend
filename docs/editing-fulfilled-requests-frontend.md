# Editing Fulfilled Stock Requests - Frontend Implementation

**Last Updated:** October 3, 2025  
**Status:** 🔄 In Progress  
**Backend Status:** ✅ Implemented and Tested

---

## Overview

This document describes the frontend implementation for editing fulfilled stock requests. This feature allows managers and owners to directly adjust quantities after fulfillment when errors are discovered or adjustments are needed.

**Backend Documentation:** See backend's `Editing Fulfilled Stock Requests - Documentation` for full details.

---

## Implementation Plan

### 1. Remove Complex Returns Workflow

❌ **What to Remove:**
- `ReturnRequestForm` component (unnecessary)
- Complex parent-child request linking
- Returnable quantity calculations
- Returns-specific validation
- Separate returns tab (will repurpose)

✅ **What to Keep:**
- `TransferDirection` type (FORWARD/REVERSE) for future use
- Basic request editing capabilities
- Existing stock request components

### 2. Add Edit Fulfilled Request Feature

**New Components Needed:**

#### `EditFulfilledRequestForm.tsx`
Component for editing line item quantities in fulfilled requests.

**Features:**
- Display current quantities with edit inputs
- Warning banner when editing fulfilled requests
- Notes field for adjustment reasons
- Item-level notes for specific changes
- Save/Cancel actions
- Manager/Admin/Owner permission check

#### `EditFulfilledRequestModal.tsx`
Modal wrapper for the edit form.

**Props:**
```typescript
interface EditFulfilledRequestModalProps {
  show: boolean
  request: TransferRequest | null
  onClose: () => void
  onSave: (requestId: string, payload: TransferRequestUpdatePayload) => Promise<void>
  isSaving: boolean
  error: string | null
}
```

### 3. Update Existing Components

#### `StockRequestDetailModal.tsx`
Add "Edit Quantities" button for managers when viewing fulfilled requests.

```typescript
{canEditFulfilled && request.status === 'FULFILLED' && (
  <Button
    variant="warning"
    onClick={handleEditFulfilled}
  >
    Edit Quantities
  </Button>
)}
```

#### `StockRequestList.tsx`
Add visual indicator for recently edited fulfilled requests.

```typescript
{request.status === 'FULFILLED' && isRecentlyEdited(request) && (
  <Badge bg="warning" className="ms-2">Edited</Badge>
)}
```

---

## Type Definitions

### Existing (No Changes Needed)

```typescript
export interface TransferRequest {
  id: UUID
  storefront: UUID
  storefront_name: string
  direction: TransferDirection
  status: TransferRequestStatus
  priority: TransferRequestPriority
  notes?: string | null
  line_items: TransferRequestLineItem[]
  created_at: string
  updated_at: string
  // ... other fields
}

export interface TransferRequestLineItem {
  id: UUID
  product: UUID
  product_name: string
  requested_quantity: number
  unit_of_measure: string
  notes?: string | null
  // ... other fields
}
```

### Payload for Editing

```typescript
export interface TransferRequestUpdatePayload {
  notes?: string
  line_items?: Array<{
    id?: UUID  // Include for updating existing items
    product: UUID
    requested_quantity: number
    unit_of_measure: string
    notes?: string
  }>
}
```

---

## API Service

### Update Existing Service Method

File: `src/services/inventoryService.ts`

The `updateTransferRequest` method already exists and supports this use case:

```typescript
export async function updateTransferRequest(
  requestId: string,
  payload: TransferRequestUpdatePayload
): Promise<TransferRequest> {
  const response = await httpClient.patch(
    `/inventory/api/transfer-requests/${requestId}/`,
    payload
  )
  return response.data
}
```

**No changes needed** - backend PATCH endpoint handles fulfilled requests.

---

## Redux State Management

### Using Existing Thunk

The existing `updateTransferRequest` thunk in `transferRequestSlice.ts` already handles updates:

```typescript
export const updateTransferRequest = createAsyncThunk<
  TransferRequest,
  { requestId: string; payload: TransferRequestUpdatePayload }
>(
  'transferRequests/update',
  async ({ requestId, payload }, { rejectWithValue }) => {
    try {
      return await updateTransferRequestApi(requestId, payload)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update transfer request')
    }
  }
)
```

**No changes needed** - existing thunk works for fulfilled requests.

---

## Permission Checks

### Hook: `useCanEditFulfilled`

Create a custom hook to check if user can edit fulfilled requests:

```typescript
// src/hooks/useCanEditFulfilled.ts
import usePermissions from './usePermissions'

export const useCanEditFulfilled = (): boolean => {
  const permissions = usePermissions()
  
  // Managers, Admins, and Owners can edit fulfilled requests
  return permissions.role === 'MANAGER' || 
         permissions.role === 'ADMIN' || 
         permissions.role === 'OWNER'
}
```

---

## Component Implementation

### EditFulfilledRequestForm.tsx

```typescript
import { useState, type FormEvent } from 'react'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Table from 'react-bootstrap/Table'
import Spinner from 'react-bootstrap/Spinner'
import type { TransferRequest, TransferRequestUpdatePayload } from '../../../../types/inventory'

interface EditFulfilledRequestFormProps {
  request: TransferRequest
  isSubmitting: boolean
  error: string | null
  onSubmit: (payload: TransferRequestUpdatePayload) => Promise<void>
  onCancel: () => void
}

const EditFulfilledRequestForm = ({
  request,
  isSubmitting,
  error,
  onSubmit,
  onCancel,
}: EditFulfilledRequestFormProps) => {
  const [notes, setNotes] = useState(request.notes || '')
  const [lineItems, setLineItems] = useState(
    request.line_items.map(item => ({
      id: item.id,
      product: item.product,
      product_name: item.product_name,
      requested_quantity: item.requested_quantity,
      unit_of_measure: item.unit_of_measure,
      notes: item.notes || '',
    }))
  )

  const handleQuantityChange = (index: number, value: string) => {
    const quantity = parseInt(value) || 1
    setLineItems(prev => prev.map((item, i) =>
      i === index ? { ...item, requested_quantity: quantity } : item
    ))
  }

  const handleItemNotesChange = (index: number, value: string) => {
    setLineItems(prev => prev.map((item, i) =>
      i === index ? { ...item, notes: value } : item
    ))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const payload: TransferRequestUpdatePayload = {
      notes: notes.trim() || undefined,
      line_items: lineItems.map(item => ({
        id: item.id,
        product: item.product,
        requested_quantity: item.requested_quantity,
        unit_of_measure: item.unit_of_measure,
        notes: item.notes.trim() || undefined,
      })),
    }

    await onSubmit(payload)
  }

  return (
    <Form onSubmit={handleSubmit}>
      {error && <Alert variant="danger">{error}</Alert>}

      <Alert variant="warning" className="mb-4">
        <strong>⚠️ Warning:</strong> This request has already been fulfilled. 
        Editing quantities will update inventory calculations. 
        Please document your changes in the notes.
      </Alert>

      <div className="mb-4">
        <h5>Adjust Line Items</h5>
        <Table responsive bordered>
          <thead>
            <tr>
              <th>Product</th>
              <th style={{ width: '150px' }}>Current Qty</th>
              <th>Unit</th>
              <th>Adjustment Reason</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, index) => (
              <tr key={item.id}>
                <td className="fw-semibold">{item.product_name}</td>
                <td>
                  <Form.Control
                    type="number"
                    min="1"
                    value={item.requested_quantity}
                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                    disabled={isSubmitting}
                  />
                </td>
                <td>{item.unit_of_measure}</td>
                <td>
                  <Form.Control
                    type="text"
                    placeholder="e.g., Reduced from 20 to 10"
                    value={item.notes}
                    onChange={(e) => handleItemNotesChange(index, e.target.value)}
                    disabled={isSubmitting}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <Form.Group className="mb-4">
        <Form.Label>Overall Adjustment Notes</Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          placeholder="Explain why these adjustments are being made..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isSubmitting}
        />
        <Form.Text className="text-muted">
          Required: Document the reason for editing this fulfilled request
        </Form.Text>
      </Form.Group>

      <div className="d-flex gap-2 justify-content-end">
        <Button variant="outline-secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="warning" type="submit" disabled={isSubmitting || !notes.trim()}>
          {isSubmitting && <Spinner animation="border" size="sm" className="me-2" />}
          Update Request
        </Button>
      </div>
    </Form>
  )
}

export default EditFulfilledRequestForm
```

---

## Integration with ManageStocksPage

### Add Edit Modal State

```typescript
const [showEditFulfilledModal, setShowEditFulfilledModal] = useState(false)
const [requestToEdit, setRequestToEdit] = useState<TransferRequest | null>(null)
```

### Add Edit Handler

```typescript
const handleEditFulfilled = (request: TransferRequest) => {
  setRequestToEdit(request)
  setShowEditFulfilledModal(true)
}

const handleSaveEditedRequest = async (payload: TransferRequestUpdatePayload) => {
  if (!requestToEdit) return
  
  await dispatch(updateTransferRequest({ 
    requestId: requestToEdit.id, 
    payload 
  })).unwrap()
  
  setShowEditFulfilledModal(false)
  setRequestToEdit(null)
  void dispatch(loadTransferRequests())
  dispatch(clearTransferRequestMutation('update'))
}
```

### Add Modal Component

```typescript
<EditFulfilledRequestModal
  show={showEditFulfilledModal}
  request={requestToEdit}
  onClose={() => {
    setShowEditFulfilledModal(false)
    setRequestToEdit(null)
  }}
  onSave={handleSaveEditedRequest}
  isSaving={transferRequestMutationStatus.update === 'loading'}
  error={transferRequestMutationErrors.update}
/>
```

---

## Repurposing Returns Tab

Instead of a complex returns workflow, use the Returns tab to show:

1. **Recently Edited Fulfilled Requests**
   - Filter: `status === 'FULFILLED' && recently_updated`
   - Shows audit trail of quantity adjustments
   - Highlights what changed and why

2. **Or Remove the Tab Entirely**
   - Simpler approach: just add edit button in detail modal
   - Less confusing for users

---

## User Experience Flow

### Editing a Fulfilled Request

1. User views Stock Requests list
2. Clicks "View" on a fulfilled request
3. Detail modal shows "Edit Quantities" button (managers only)
4. Clicks "Edit Quantities"
5. Edit modal opens with current quantities
6. User adjusts quantities and adds notes
7. Clicks "Update Request"
8. System saves changes
9. Inventory calculations automatically use new values

### Visual Indicators

- **Warning badge** on edited fulfilled requests in list
- **Last updated timestamp** prominently displayed
- **Adjustment notes** visible in detail view
- **Color coding**: Yellow/warning theme for edited requests

---

## Migration Tasks

### Files to Create
- ✅ `src/hooks/useCanEditFulfilled.ts`
- ✅ `src/features/dashboard/components/stock-requests/EditFulfilledRequestForm.tsx`
- ✅ `src/features/dashboard/components/stock-requests/EditFulfilledRequestModal.tsx`

### Files to Update
- ✅ `src/features/dashboard/components/stock-requests/StockRequestDetailModal.tsx` - Add edit button
- ✅ `src/features/dashboard/pages/ManageStocksPage.tsx` - Add edit handlers and modal

### Files to Remove
- ❌ `src/features/dashboard/components/returns/ReturnRequestForm.tsx`
- ❌ `src/features/dashboard/components/returns/index.ts`

### Documentation to Update
- ✅ Archive `returns-workflow-backend-requirements.md` (outdated)
- ✅ Create this file: `editing-fulfilled-requests-frontend.md`

---

## Testing Checklist

### Functional Tests
- [ ] Manager can edit fulfilled request quantities
- [ ] Staff cannot edit fulfilled requests (permission denied)
- [ ] Quantities must be positive numbers
- [ ] Notes are required for edits
- [ ] Request remains FULFILLED after edit
- [ ] Updated_at timestamp changes
- [ ] List refreshes after save
- [ ] Error handling displays properly

### UI/UX Tests
- [ ] Warning message is prominent and clear
- [ ] Form is intuitive and easy to use
- [ ] Edit button only shows for managers on fulfilled requests
- [ ] Success/error messages are clear
- [ ] Loading states work correctly

---

## Benefits of This Approach

✅ **Simple and Intuitive**
- Uses familiar edit pattern
- No complex workflows to learn
- Direct and straightforward

✅ **Low Maintenance**
- No new database fields
- No new API endpoints
- Uses existing infrastructure

✅ **Flexible**
- Can adjust any fulfilled request
- Can change multiple items at once
- Can add detailed notes

✅ **Audit-Friendly**
- Notes document why changes were made
- Timestamps track when
- Permission system controls who

---

## Next Steps

1. ✅ Remove `ReturnRequestForm` component
2. ✅ Create `useCanEditFulfilled` hook
3. ✅ Create `EditFulfilledRequestForm` component
4. ✅ Create `EditFulfilledRequestModal` component
5. ✅ Update `StockRequestDetailModal` with edit button
6. ✅ Update `ManageStocksPage` with edit handlers
7. ✅ Remove or repurpose Returns tab
8. ✅ Test with manager account
9. ✅ Update documentation

---

**Implementation Status:** 📋 Planned  
**Estimated Effort:** 4-6 hours  
**Priority:** High  
**Depends On:** Backend implementation (✅ Complete)
