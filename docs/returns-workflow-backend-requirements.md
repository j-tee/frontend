# Returns Workflow - Backend Requirements & Frontend Implementation

**Document Version:** 1.0  
**Date:** October 3, 2025  
**Frontend Developer:** GitHub Copilot  
**Purpose:** Align backend and frontend implementation for the Returns feature

---

## Executive Summary

The Returns feature allows storefronts to return items back to the warehouse. This document outlines the complete workflow, data model requirements, and API endpoints needed for proper implementation.

---

## Business Requirements

### Current Understanding
Initially, we implemented Returns as reverse transfer requests (REVERSE direction), but we've identified that the actual workflow should be:

1. User views **fulfilled stock requests** (completed deliveries to storefront)
2. User selects which fulfilled request to create a return from
3. User specifies which items to return and quantities (can be partial)
4. User provides a reason for the return (damaged, excess, incorrect, etc.)
5. System creates a return request linked to the original fulfilled request

### Key Differences from Stock Requests

| Aspect | Stock Request (FORWARD) | Return (REVERSE) |
|--------|------------------------|------------------|
| **Initiator** | Storefront needs inventory | Storefront has excess/damaged items |
| **Direction** | Warehouse → Storefront | Storefront → Warehouse |
| **Source** | New request | Based on fulfilled delivery |
| **Items** | Any products needed | Only items from original fulfilled request |
| **Quantities** | As needed | Up to fulfilled quantity |
| **Required Field** | Product selection | Return reason |

---

## Proposed Data Model Changes

### 1. TransferRequest Model Updates

```python
class TransferRequest(models.Model):
    # Existing fields...
    direction = models.CharField(
        max_length=10,
        choices=[
            ('FORWARD', 'Stock Request (Warehouse → Storefront)'),
            ('REVERSE', 'Return (Storefront → Warehouse)')
        ],
        default='FORWARD'
    )
    
    # For returns - link to the original fulfilled request
    parent_request = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='returns',
        help_text='Original fulfilled request this return is based on'
    )
    
    # Return-specific fields
    return_reason = models.TextField(
        null=True,
        blank=True,
        help_text='Reason for return (required for REVERSE requests)'
    )
    
    # Audit fields
    cancelled_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cancelled_requests'
    )
    
    cancelled_reason = models.TextField(
        null=True,
        blank=True
    )
```

### 2. TransferRequestLineItem Model Updates

```python
class TransferRequestLineItem(models.Model):
    # Existing fields...
    
    # Track status per line item
    status = models.CharField(
        max_length=20,
        choices=TRANSFER_REQUEST_STATUSES,
        null=True,
        blank=True,
        help_text='Line item status (inherits from request if not set)'
    )
    
    # For return line items - link to original line item
    parent_line_item = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='return_items',
        help_text='Original line item this return is based on'
    )
    
    # Return-specific notes
    return_notes = models.TextField(
        null=True,
        blank=True,
        help_text='Specific notes about why this item is being returned'
    )
```

---

## Required API Endpoints

### 1. Get Fulfilled Requests (for creating returns)

**Endpoint:** `GET /inventory/api/transfer-requests/fulfilled/`

**Purpose:** Retrieve all fulfilled stock requests for a storefront that can have items returned

**Query Parameters:**
- `storefront` (UUID): Filter by storefront ID
- `has_returnables` (boolean): Only show requests with items that can still be returned
- `page` (int): Pagination
- `page_size` (int): Results per page

**Response:**
```json
{
  "count": 50,
  "next": "...",
  "previous": null,
  "results": [
    {
      "id": "uuid",
      "storefront": "uuid",
      "storefront_name": "Downtown Store",
      "status": "FULFILLED",
      "fulfilled_at": "2025-10-01T10:30:00Z",
      "line_items": [
        {
          "id": "uuid",
          "product": "uuid",
          "product_name": "10mm Armoured Cable 50m",
          "fulfilled_quantity": 5,
          "returned_quantity": 0,  // New field: total already returned
          "returnable_quantity": 5,  // New field: available to return
          "unit_of_measure": "unit"
        }
      ]
    }
  ]
}
```

### 2. Create Return Request

**Endpoint:** `POST /inventory/api/transfer-requests/returns/`

**Purpose:** Create a new return request based on a fulfilled request

**Request Body:**
```json
{
  "parent_request": "uuid",  // Original fulfilled request ID
  "storefront": "uuid",
  "direction": "REVERSE",  // Always REVERSE for returns
  "priority": "MEDIUM",
  "return_reason": "Received excess quantity, returning 2 units to warehouse",
  "notes": "Items in perfect condition",
  "line_items": [
    {
      "parent_line_item": "uuid",  // Original line item ID
      "product": "uuid",
      "requested_quantity": 2,  // Quantity to return
      "unit_of_measure": "unit",
      "return_notes": "Excess inventory after recalculation"
    }
  ]
}
```

**Response:** Standard TransferRequest object with return fields populated

**Validation Rules:**
1. `parent_request` must exist and have status FULFILLED
2. `direction` must be REVERSE
3. `return_reason` is required for REVERSE requests
4. Each line item's `requested_quantity` must not exceed `returnable_quantity` from parent
5. Each line item's `product` must match the parent line item's product

### 3. Update Transfer Request Status (Already Implemented)

**Endpoint:** `PUT /inventory/api/transfer-requests/{id}/update-status/`

**Request Body:**
```json
{
  "status": "FULFILLED",  // NEW, ASSIGNED, FULFILLED, CANCELLED
  "force": true  // Allow manual override by managers
}
```

**Note:** This endpoint is already implemented on frontend for manual status management by privileged users (Manager/Admin/Owner).

---

## Frontend Implementation Status

### ✅ Completed Features

1. **Type System**
   - Added `TransferDirection` type: `'FORWARD' | 'REVERSE'`
   - Added `direction` field to `TransferRequest` interface
   - Added `status` field to `TransferRequestLineItem` interface
   - Added `TransferRequestUpdateStatusPayload` type

2. **UI Components**
   - Created separate "Returns" tab in Manage Stocks page
   - Created `ReturnRequestForm` component (needs refactoring - see below)
   - Updated `StockRequestList` to show "Type" column with badges
   - Updated `StockRequestDetailModal` to display transfer direction
   - Backward compatibility: treats missing `direction` as `'FORWARD'`

3. **State Management**
   - Redux slice handles both FORWARD and REVERSE requests
   - Filtering by direction in UI
   - Manual status override for privileged users

### 🔄 Needs Refactoring

**Current ReturnRequestForm Issues:**
- Currently creates a new return from scratch (selecting products manually)
- Should instead show list of fulfilled requests and allow user to select one
- Should pre-populate items from the selected fulfilled request
- Should enforce quantity limits based on returnable quantities

**New Required Components:**

1. **FulfilledRequestSelector**
   - Displays list of fulfilled requests for the storefront
   - Shows fulfillment date, items, quantities
   - "Create Return" button for each request

2. **ReturnRequestForm (Refactored)**
   - Receives selected fulfilled request as prop
   - Pre-populates with line items from fulfilled request
   - Shows fulfilled quantity and already returned quantity
   - Allows user to select items and specify return quantities
   - Validates quantities don't exceed returnable amounts
   - Required field: return_reason (overall reason for return)
   - Optional field: return_notes per line item

---

## Proposed API Integration Flow

### Flow 1: Creating a Return Request

```typescript
// 1. Load fulfilled requests when Returns tab is opened
useEffect(() => {
  if (activeTab === 'returns') {
    dispatch(loadFulfilledRequests({ 
      storefront: selectedStorefront,
      has_returnables: true 
    }))
  }
}, [activeTab, selectedStorefront])

// 2. User selects a fulfilled request to create return from
const handleSelectFulfilledRequest = (request: TransferRequest) => {
  setSelectedFulfilledRequest(request)
  setShowReturnForm(true)
}

// 3. User fills return form with quantities and reasons
const handleSubmitReturn = async (payload: ReturnRequestCreatePayload) => {
  await dispatch(createReturnRequest(payload)).unwrap()
  // Refresh fulfilled requests list to update returnable quantities
  dispatch(loadFulfilledRequests({ storefront: selectedStorefront }))
}
```

### Flow 2: Viewing Return Requests

```typescript
// Returns tab shows only REVERSE direction requests
const returnRequests = transferRequests.filter(req => req.direction === 'REVERSE')

// Each return shows link to parent request
<Link to={`/requests/${request.parent_request}`}>
  Original Request: #{request.parent_request_reference}
</Link>
```

---

## Data Validation Requirements

### Backend Validations Needed

1. **Quantity Validation**
   ```python
   def validate_return_quantities(return_request, parent_request):
       for return_item in return_request.line_items:
           parent_item = return_item.parent_line_item
           
           # Calculate how much has already been returned
           already_returned = TransferRequestLineItem.objects.filter(
               parent_line_item=parent_item,
               transfer_request__direction='REVERSE',
               transfer_request__status__in=['ASSIGNED', 'FULFILLED']
           ).aggregate(Sum('requested_quantity'))['requested_quantity__sum'] or 0
           
           # Calculate returnable quantity
           returnable = parent_item.fulfilled_quantity - already_returned
           
           if return_item.requested_quantity > returnable:
               raise ValidationError(
                   f"Cannot return {return_item.requested_quantity} of {parent_item.product_name}. "
                   f"Only {returnable} available to return."
               )
   ```

2. **Status Validation**
   - Parent request must be FULFILLED
   - Direction must be REVERSE for returns
   - return_reason is required when direction=REVERSE

3. **Product Validation**
   - Return line items must reference valid parent line items
   - Products must match between parent and return line items

---

## Business Logic Rules

### 1. Returnable Quantity Calculation

```
Returnable Quantity = Fulfilled Quantity - Sum(Returned Quantities from non-cancelled returns)
```

**Example:**
- Original fulfilled: 10 units
- Return 1 (FULFILLED): 3 units
- Return 2 (CANCELLED): 2 units (doesn't count)
- Return 3 (ASSIGNED): 2 units (counts, reserved for return)
- **Returnable**: 10 - 3 - 2 = 5 units

### 2. Return Request States

| Status | Meaning | Inventory Impact |
|--------|---------|------------------|
| NEW | Return requested, pending review | None |
| ASSIGNED | Return approved, awaiting pickup | Reserve quantity at storefront |
| FULFILLED | Items returned to warehouse | Add to warehouse, remove from storefront |
| CANCELLED | Return rejected/cancelled | Release reserved quantity |

### 3. Permissions

- **STAFF**: Can create return requests for their storefront
- **MANAGER**: Can approve/reject returns, manual status override
- **ADMIN/OWNER**: Full access, manual status override

---

## Frontend Type Definitions (Current)

```typescript
// Transfer Direction
export type TransferDirection = 'FORWARD' | 'REVERSE'

// Transfer Request
export interface TransferRequest {
  id: UUID
  business: UUID
  storefront: UUID
  storefront_name: string
  direction: TransferDirection
  requested_by: UUID
  requested_by_name: string
  priority: TransferRequestPriority
  status: TransferRequestStatus
  notes?: string | null
  return_reason?: string | null  // NEEDED
  parent_request?: UUID | null  // NEEDED
  linked_transfer_reference?: string | null
  linked_transfer_id?: UUID | null
  assigned_at?: string | null
  fulfilled_at?: string | null
  fulfilled_by?: UUID | null
  cancelled_at?: string | null
  cancelled_by?: UUID | null
  cancelled_reason?: string | null
  line_items: TransferRequestLineItem[]
  created_at: string
  updated_at: string
}

// Line Item
export interface TransferRequestLineItem {
  id: UUID
  product: UUID
  product_name: string
  requested_quantity: number
  approved_quantity?: number | null
  fulfilled_quantity?: number | null
  returned_quantity?: number | null  // NEEDED: total already returned
  returnable_quantity?: number | null  // NEEDED: available to return
  status?: TransferRequestStatus | null
  unit_of_measure: string
  notes?: string | null
  return_notes?: string | null  // NEEDED
  parent_line_item?: UUID | null  // NEEDED
}

// Create Return Request Payload (NEW - NEEDED)
export interface ReturnRequestCreatePayload {
  parent_request: UUID  // Original fulfilled request
  storefront: UUID
  direction: 'REVERSE'
  priority: TransferRequestPriority
  return_reason: string  // Required for returns
  notes?: string
  line_items: Array<{
    parent_line_item: UUID  // Original line item ID
    product: UUID
    requested_quantity: number  // Quantity to return
    unit_of_measure: string
    return_notes?: string  // Specific reason for this item
  }>
}
```

---

## Migration Considerations

### Database Migration Steps

1. Add `direction` field with default='FORWARD' to existing requests
2. Add `parent_request` foreign key (nullable)
3. Add `return_reason` field (nullable, required in business logic for REVERSE)
4. Add `cancelled_by` and `cancelled_reason` fields
5. Add line item fields: `status`, `parent_line_item`, `return_notes`, `returned_quantity`, `returnable_quantity`

### Data Migration

```python
# Set all existing requests to FORWARD direction
TransferRequest.objects.filter(direction__isnull=True).update(direction='FORWARD')
```

---

## API Response Examples

### GET /inventory/api/transfer-requests/fulfilled/

```json
{
  "count": 2,
  "results": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "storefront": "987fcdeb-51a2-43d7-b890-123456789abc",
      "storefront_name": "Cow Lane Store",
      "direction": "FORWARD",
      "status": "FULFILLED",
      "priority": "MEDIUM",
      "requested_by_name": "John Doe",
      "fulfilled_at": "2025-10-03T03:27:00Z",
      "notes": "Regular stock replenishment",
      "line_items": [
        {
          "id": "item-uuid-1",
          "product": "prod-uuid-1",
          "product_name": "10mm Armoured Cable 50m",
          "fulfilled_quantity": 5,
          "returned_quantity": 0,
          "returnable_quantity": 5,
          "unit_of_measure": "unit",
          "notes": null
        }
      ]
    }
  ]
}
```

### POST /inventory/api/transfer-requests/returns/

**Request:**
```json
{
  "parent_request": "123e4567-e89b-12d3-a456-426614174000",
  "storefront": "987fcdeb-51a2-43d7-b890-123456789abc",
  "direction": "REVERSE",
  "priority": "MEDIUM",
  "return_reason": "Received excess quantity after inventory recount",
  "notes": "Items in perfect condition, original packaging",
  "line_items": [
    {
      "parent_line_item": "item-uuid-1",
      "product": "prod-uuid-1",
      "requested_quantity": 2,
      "unit_of_measure": "unit",
      "return_notes": "2 units excess after stock adjustment"
    }
  ]
}
```

**Response:**
```json
{
  "id": "return-uuid-1",
  "parent_request": "123e4567-e89b-12d3-a456-426614174000",
  "storefront": "987fcdeb-51a2-43d7-b890-123456789abc",
  "storefront_name": "Cow Lane Store",
  "direction": "REVERSE",
  "status": "NEW",
  "priority": "MEDIUM",
  "return_reason": "Received excess quantity after inventory recount",
  "notes": "Items in perfect condition, original packaging",
  "requested_by": "user-uuid",
  "requested_by_name": "Julius Kudzo Tetten",
  "created_at": "2025-10-03T13:22:00Z",
  "line_items": [
    {
      "id": "return-item-uuid-1",
      "parent_line_item": "item-uuid-1",
      "product": "prod-uuid-1",
      "product_name": "10mm Armoured Cable 50m",
      "requested_quantity": 2,
      "status": "NEW",
      "unit_of_measure": "unit",
      "return_notes": "2 units excess after stock adjustment"
    }
  ]
}
```

---

## Testing Scenarios

### Scenario 1: Happy Path - Full Return
1. Staff creates stock request for 5 cables
2. Request gets fulfilled
3. Staff creates return for all 5 cables (excess stock)
4. Return gets approved and fulfilled
5. Verify: Original request shows returned_quantity=5, returnable_quantity=0

### Scenario 2: Partial Return
1. Stock request for 10 items fulfilled
2. Return 3 items (damaged)
3. Verify: returnable_quantity=7
4. Return 4 more items (excess)
5. Verify: returnable_quantity=3

### Scenario 3: Validation - Over-Return Prevention
1. Fulfilled request has 5 items
2. Attempt to return 6 items
3. Should get validation error: "Cannot return 6. Only 5 available."

### Scenario 4: Multiple Returns
1. Fulfilled request has 10 items
2. Create return for 3 items (status: ASSIGNED)
3. Create another return for 4 items
4. Should get error: "Only 7 available to return (3 already reserved)"

---

## Questions for Backend Developer

1. **Inventory Management**: How should inventory be updated when returns are fulfilled? Should items go back to the source warehouse automatically?

2. **Return Approval**: Should returns require explicit approval (ASSIGNED status) or auto-approve?

3. **Partial Fulfillment**: Can a return be partially fulfilled (return fewer items than requested)?

4. **Return Tracking**: Do we need to track the physical receipt of returned items separately?

5. **Quality Check**: Should there be a quality inspection step for returned items before adding back to inventory?

6. **Return Windows**: Are there time limits on how long after fulfillment a return can be created?

7. **Damaged Items**: Should damaged returns be marked differently for separate handling?

---

## Next Steps

### Backend Tasks
1. [ ] Review and provide feedback on data model changes
2. [ ] Implement database migrations for new fields
3. [ ] Create `/fulfilled/` endpoint for returnable requests
4. [ ] Create `/returns/` endpoint for creating return requests
5. [ ] Implement quantity validation logic
6. [ ] Add return-specific business rules
7. [ ] Update existing endpoints to include new fields in responses

### Frontend Tasks (After Backend Ready)
1. [ ] Create `FulfilledRequestsList` component
2. [ ] Refactor `ReturnRequestForm` to work with fulfilled requests
3. [ ] Update Redux slice to handle fulfilled requests
4. [ ] Add `loadFulfilledRequests` thunk
5. [ ] Add `createReturnRequest` thunk (separate from regular requests)
6. [ ] Update type definitions with new fields
7. [ ] Add validation on frontend for return quantities
8. [ ] Update Returns tab workflow

---

## Contact & Collaboration

**Frontend Developer**: Available for questions and clarifications  
**Expected Timeline**: Please provide estimate for backend implementation  
**Communication Channel**: [Your preferred method]

Let's schedule a sync meeting to discuss any questions or concerns about this specification.

---

**Document Status**: Draft - Awaiting Backend Review  
**Last Updated**: October 3, 2025
