# Stock Request Feature Implementation

## Recent Updates

**2025-10-03:**
- ✅ Added manager status override endpoint (`/update-status/`)
- ✅ Managers can manually adjust request status for edge cases
- ✅ See [Status Management Documentation](./stock-request-status-management.md) for details

## Overview
This implementation adds a **Stock Request** feature to the Manage Stocks page under the Inventory menu. The feature allows storefront staff to create stock requests to warehouses and managers to fulfill them through transfers.

## Architecture

### Files Created/Modified

#### 1. Store Configuration
- **`src/store/index.ts`** - Added `transfers` and `transferRequests` reducers to the Redux store

#### 2. Components
- **`src/features/dashboard/components/stock-requests/StockRequestForm.tsx`**
  - Form for creating new stock requests
  - Allows selecting storefront, priority, and adding line items
  - Validates and submits stock request payloads

- **`src/features/dashboard/components/stock-requests/StockRequestList.tsx`**
  - Displays paginated list of stock requests
  - Filters by status, storefront, and priority
  - Search functionality
  - Pagination controls

- **`src/features/dashboard/components/stock-requests/StockRequestDetailModal.tsx`**
  - Shows detailed information about a stock request
  - Displays line items with requested/approved/fulfilled quantities
  - Actions: Cancel request, Mark as fulfilled
  - Shows linked transfer reference when available

- **`src/features/dashboard/components/stock-requests/index.ts`**
  - Barrel export for easy imports

#### 3. Pages
- **`src/features/dashboard/pages/ManageStocksPage.tsx`**
  - Converted to tabbed interface using `react-bootstrap` Tab components
  - Two tabs: "Stock products" and "Stock requests"
  - Stock products tab contains the existing stock management functionality
  - Stock requests tab contains the new stock request workflow

### Redux Slices (Already Existed)

The following slices were already implemented and are now integrated:

- **`src/store/slices/transferRequestSlice.ts`**
  - State management for stock requests
  - Actions: create, update, cancel, fulfill
  - Selectors for requests, filters, pagination, mutations

- **`src/store/slices/transferSlice.ts`**
  - State management for transfers (fulfillment side)
  - Actions: create, update, submit, approve, reject, dispatch, complete, cancel
  - Selectors for transfers, filters, pagination, mutations

### Services (Already Existed)

- **`src/services/inventoryService.ts`**
  - API functions for stock requests and transfers
  - Endpoints align with backend contract documented in the requirements

## Features Implemented

### Stock Request Tab Features

1. **Create Stock Request**
   - Button toggles form visibility
   - Form includes:
     - Storefront selection (required)
     - Priority level (LOW, MEDIUM, HIGH)
     - Request notes
     - Line items with product, quantity, unit, and item notes
     - Add/remove line items before submission

2. **List Stock Requests**
   - Filterable by:
     - Search (searches requests)
     - Status (NEW, ASSIGNED, FULFILLED, CANCELLED)
     - Storefront
     - Priority
   - Paginated display
   - Shows key information: storefront, status, priority, requester, item count, dates
   - Click to view details

3. **View Stock Request Details**
   - Modal displays:
     - Request metadata (storefront, status, priority, requester, dates)
     - Line items table with requested/approved/fulfilled quantities
     - Linked transfer reference (if assigned)
   - Actions (contextual based on status):
     - Cancel request (NEW or ASSIGNED status)
     - Mark as fulfilled (ASSIGNED status)

### Status Workflow

As per the backend contract:

**Stock Request Statuses:**
- `NEW` → Created by storefront staff
- `ASSIGNED` → Transfer has been linked
- `FULFILLED` → Request satisfied after receipt
- `CANCELLED` → Request cancelled

**Transfer Statuses:**
- `DRAFT` → Manager drafting
- `REQUESTED` → Awaiting approval
- `APPROVED` → Ready to dispatch
- `IN_TRANSIT` → Stock deducted and shipping
- `COMPLETED` → Goods arrived at storefront
- `REJECTED` → Approval failed
- `CANCELLED` → Aborted

## Tab Organization

The Manage Stocks page uses `react-bootstrap` tabs:

```tsx
<Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'stock-products')}>
  <Nav variant="tabs">
    <Nav.Item>
      <Nav.Link eventKey="stock-products">Stock products</Nav.Link>
    </Nav.Item>
    <Nav.Item>
      <Nav.Link eventKey="stock requests">Stock requests</Nav.Link>
    </Nav.Item>
  </Nav>
  <Tab.Content>
    <Tab.Pane eventKey="stock-products">...</Tab.Pane>
    <Tab.Pane eventKey="stock-requests">...</Tab.Pane>
  </Tab.Content>
</Tab.Container>
```

## TypeScript Types

All types are defined in `src/types/inventory.ts`:

- `TransferRequest` - Main stock request entity
- `TransferRequestLineItem` - Individual product requests
- `TransferRequestCreatePayload` - Create request payload
- `TransferRequestUpdatePayload` - Update request payload
- `TransferRequestCancelPayload` - Cancel reason
- `TransferRequestFulfillPayload` - Fulfill notes
- `Transfer` - Transfer entity (fulfillment)
- `TransferLineItem` - Transfer line items
- `TransferAuditEntry` - Audit log entries

## API Integration

All API calls go through `src/services/inventoryService.ts`:

### Stock Request Endpoints
- `fetchTransferRequests(params)` - GET /inventory/api/transfer-requests/
- `fetchTransferRequestDetail(id)` - GET /inventory/api/transfer-requests/{id}/
- `createTransferRequest(payload)` - POST /inventory/api/transfer-requests/
- `updateTransferRequest(id, payload)` - PATCH /inventory/api/transfer-requests/{id}/
- `cancelTransferRequest(id, payload)` - POST /inventory/api/transfer-requests/{id}/cancel/
- `fulfillTransferRequest(id, payload)` - POST /inventory/api/transfer-requests/{id}/fulfill/

### Transfer Endpoints
- `fetchTransfers(params)` - GET /inventory/api/transfers/
- `fetchTransferDetail(id)` - GET /inventory/api/transfers/{id}/
- `createTransfer(payload)` - POST /inventory/api/transfers/
- And many more for the transfer workflow...

## Usage

1. Navigate to **Inventory** → **Manage Stocks**
2. Click on **Stock requests** tab
3. Click **Create stock request** button
4. Fill in the form:
   - Select storefront
   - Set priority
   - Add notes (optional)
   - Add line items (product + quantity + unit)
5. Submit the request
6. View requests in the list
7. Click **View** to see details
8. Cancel or fulfill requests as appropriate

## Next Steps

### Potential Enhancements
1. **Transfer creation from requests**: Add ability to create transfer directly from a stock request
2. **Bulk actions**: Cancel or process multiple requests at once
3. **Real-time updates**: WebSocket integration for live status updates
4. **Notifications**: Alert users when requests are assigned/fulfilled
5. **Analytics**: Dashboard showing request trends, fulfillment rates
6. **Export**: Download request history as CSV/PDF
7. **Comments**: Add commenting system for communication between requester and fulfiller
8. **Attachments**: Allow attaching documents to requests

## Compliance with Requirements

✅ Stock Request feature created under Manage Stock tab  
✅ React-Bootstrap TabPane used to organize the page  
✅ Implements backend contract from provided documentation  
✅ Full CRUD operations for stock requests  
✅ Status workflow aligned with backend  
✅ TypeScript types match backend serializers  
✅ Redux state management integrated  
✅ Pagination and filtering implemented  
✅ Responsive design with Bootstrap components  

## Testing Checklist

- [ ] Create a new stock request
- [ ] View stock request list with filters
- [ ] Search stock requests
- [ ] Paginate through requests
- [ ] View request details
- [ ] Cancel a NEW request
- [ ] Cancel an ASSIGNED request
- [ ] Mark ASSIGNED request as fulfilled
- [ ] View linked transfer reference
- [ ] Test all status badge displays
- [ ] Test all priority badge displays
- [ ] Test form validation
- [ ] Test error handling
- [ ] Test loading states
