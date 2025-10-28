# Inventory Transfer Requirements (Frontend → Backend Collaboration)

_Last updated: 2025-10-02_

## 1. Context & Goals

We are enabling storefront teams to raise stock requests and managers to execute the resulting warehouse → storefront transfers inside the POS Suite. The frontend needs a consistent contract to:

- Let any authenticated staff member submit a product request from their storefront workspace.
- Allow privileged managers to review requests, generate transfers, and orchestrate approval/dispatch steps.
- Persist transfer line items with quantity validation and link them back to the originating request.
- Capture receipt confirmations from the requester once goods arrive, closing the loop on the audit trail.
- Surface timestamps and actor metadata (requested by, approved by, fulfilled by, received by) for accountability.

This document describes the data structures, endpoints, and behaviors the frontend requires. Please review and flag anything that conflicts with existing backend models.

## 2. Non-goals

- We are **not** modelling storefront → warehouse transfers in this iteration.
- We are **not** building inter-business transfers; all activity is scoped to a single business.
- We assume physical fulfillment (pick/pack/delivery) happens offline; the system only tracks state changes.

## 3. Core Domain Objects

### 3.1 Transfer Request Lifecycle

| Status        | Description | Allowed Next States |
|---------------|-------------|---------------------|
| `NEW`         | Storefront staff has submitted a request; no transfer yet. | `ASSIGNED`, `CANCELLED`
| `ASSIGNED`    | Request is linked to an in-progress transfer. | `FULFILLED`, `CANCELLED`
| `FULFILLED`   | Requester confirmed the requested goods were delivered. | — |
| `CANCELLED`   | Request withdrawn (requester or manager). | — |

### 3.2 Transfer Status Lifecycle

| Status          | Description | Allowed Next States |
|-----------------|-------------|---------------------|
| `DRAFT`         | Manager assembles a transfer (optionally from a request). | `REQUESTED`, `CANCELLED`
| `REQUESTED`     | Submitted for approval; awaiting manager/admin action. | `APPROVED`, `REJECTED`, `CANCELLED`
| `APPROVED`      | Approved by manager/admin; ready to pick. | `IN_TRANSIT`, `CANCELLED`
| `IN_TRANSIT`    | Items are on the move; warehouse stock already deducted. | `COMPLETED`, `CANCELLED`
| `COMPLETED`     | Transfer fulfilled; storefront stock incremented. | — |
| `REJECTED`      | Request denied; no stock movement. | `DRAFT` (for further edits/resubmit)
| `CANCELLED`     | Transfer cancelled post submission. | `DRAFT` (optional reopening)

> Optionally introduce a `RECEIVED` status if we want the requester to perform the final confirmation on the transfer object itself; otherwise the `TransferRequest` will hold the ack state.

### 3.3 Transfer Request Entity

```ts
interface TransferRequest {
  id: string // UUID
  business: string
  storefront: string
  storefront_name?: string
  requested_by: string
  requested_by_name?: string
  status: 'NEW' | 'ASSIGNED' | 'FULFILLED' | 'CANCELLED'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  notes?: string | null
  created_at: string
  updated_at: string
  line_items: Array<{
    id: string
    product: string
    product_name?: string
    sku?: string | null
    requested_quantity: number
    unit_of_measure?: string | null
    notes?: string | null
  }>
  linked_transfer?: string | null // transfer UUID fulfilling the request
  linked_transfer_reference?: string | null
  fulfilled_at?: string | null
  fulfilled_by?: string | null
}
```

### 3.4 Transfer Entity

```ts
interface Transfer {
  id: string // UUID
  business: string // UUID (for filtering)
  reference: string // human-readable ref e.g. TRF-2025-00021
  status: 'DRAFT' | 'REQUESTED' | 'APPROVED' | 'IN_TRANSIT' | 'COMPLETED' | 'REJECTED' | 'CANCELLED'
  source_warehouse: string // warehouse UUID
  source_warehouse_name?: string
  destination_storefront: string // storefront UUID
  destination_storefront_name?: string
  notes?: string | null
  requested_by: string // user UUID
  requested_by_name?: string
  request_id?: string | null // originating TransferRequest
  approved_by?: string | null
  approved_by_name?: string | null
  fulfilled_by?: string | null // person marking in transit/completed
  fulfilled_by_name?: string | null
  received_by?: string | null // requester confirming receipt
  received_by_name?: string | null
  received_at?: string | null
  created_at: string // ISO 8601
  updated_at: string // ISO 8601
  submitted_at?: string | null
  approved_at?: string | null
  dispatched_at?: string | null
  completed_at?: string | null
  line_items: TransferLineItem[]
  audit_log?: TransferAuditEntry[]
}
```

### 3.5 Transfer Line Item

```ts
interface TransferLineItem {
  id: string // UUID
  transfer: string // transfer UUID
  product: string // product UUID
  product_name?: string
  sku?: string | null
  requested_quantity: number
  approved_quantity?: number | null // allows managers to adjust
  fulfilled_quantity?: number | null // final quantity delivered
  unit_of_measure?: string | null
  notes?: string | null
}
```

### 3.6 Optional Audit Entry (if feasible)

```ts
interface TransferAuditEntry {
  id: string
  transfer: string
  action: 'CREATED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'DISPATCHED' | 'COMPLETED' | 'UPDATED'
  actor: string
  actor_name?: string
  remarks?: string | null
  created_at: string
}
```

## 4. API Requirements

All routes are authenticated and scoped to the user’s business context. Any authenticated staff member with storefront access can create a transfer request. Only users with elevated capabilities create and progress transfers. The original requester can confirm receipt once dispatch is complete.

### 4.0 Transfer Requests

```
GET /inventory/api/transfer-requests/
POST /inventory/api/transfer-requests/
GET /inventory/api/transfer-requests/{id}/
PATCH /inventory/api/transfer-requests/{id}/
POST /inventory/api/transfer-requests/{id}/cancel/
POST /inventory/api/transfer-requests/{id}/fulfill/
```

**Key behaviors**
- `POST` accepts storefront, notes, and line items (product + requested quantity, optional unit and notes). Defaults status to `NEW`.
- `PATCH` lets managers annotate, update priority, or link an existing transfer.
- `cancel` allows either the requester (while still `NEW`) or a manager to close out the ask.
- `fulfill` marks the request as satisfied, recording `fulfilled_by` (typically the requester) and `fulfilled_at`. The backend should ensure it’s only callable after the linked transfer hits `COMPLETED`.
- Responses include `linked_transfer` metadata so the UI can deep-link to the underlying transfer detail.

### 4.1 List Transfers

```
GET /inventory/api/transfers/
```

**Query params** (optional):
- `status`: string or comma-separated list.
- `warehouse`: UUID filter (source warehouse).
- `storefront`: UUID filter (destination).
- `search`: free-text search across reference / product names.
- `ordering`: e.g. `-created_at`.
- `page`, `page_size` standard pagination.

**Response**: paginated list of `Transfer` objects (line items optional or truncated; if truncated, provide `line_item_count`).

### 4.2 Retrieve Transfer Detail

```
GET /inventory/api/transfers/{transfer_id}/
```

Returns complete `Transfer` object with all line items and audit entries.

### 4.3 Create Transfer (Draft)

```
POST /inventory/api/transfers/
```

**Request body**:
```json
{
  "source_warehouse": "<uuid>",
  "destination_storefront": "<uuid>",
  "notes": "optional",
  "line_items": [
    { "product": "<uuid>", "requested_quantity": 12, "notes": "optional" }
  ]
}
```

**Behavior**:
- Creates transfer in `DRAFT` state.
- Accepts an optional `request_id`; when provided the backend should (a) verify the request is `NEW`/`ASSIGNED`, (b) hydrate transfer line items from the request if none are supplied, and (c) update the request to `ASSIGNED` with the new transfer reference.
- Validates each product belongs to the business and has stock at the warehouse.
- Ensures `requested_quantity > 0`. Reject if warehouse stock is insufficient (soft fail? we can accept with warning if backend supports partial fulfillment).
- When stock is missing or the quantity requested exceeds availability, return a structured payload (e.g. `{ "line_items": { "0": "Only 4 units available at Rawlings Park Warehouse" } }`) so the UI can highlight the exact row.

**Response**: `201 Created` with `Transfer` payload.

#### 4.3.1 Real-time Stock Availability Probe

To give users instant feedback while composing a transfer, expose a lightweight endpoint that confirms product availability before the draft is saved. Either of the following shapes works, as long as the response is stable:

```
GET /inventory/api/stock/availability/?warehouse=<uuid>&product=<uuid>&quantity=<number>
```

or

```
POST /inventory/api/transfers/check-line-item/
{
  "warehouse": "<uuid>",
  "product": "<uuid>",
  "quantity": 12
}
```

**Response contract**

```json
{
  "is_available": true,
  "available_quantity": 42,
  "message": "Sufficient stock on hand"
}
```

- When `is_available` is `false`, populate `message` with a human-readable reason (e.g. "Only 4 units remain once pending transfers are deducted") and include the current `available_quantity`.
- Scope calculations to the authenticated business and warehouse, accounting for reserved/in-transit quantities.
- The frontend will call this probe whenever a product or quantity changes so pickers know immediately if they can proceed.

### 4.4 Submit Transfer for Approval

```
POST /inventory/api/transfers/{id}/submit/
```

Transitions from `DRAFT` → `REQUESTED`. Captures `submitted_at` and actor info. Reject if already submitted.

### 4.5 Update Draft Transfer

```
PATCH /inventory/api/transfers/{id}/
```

Allow editing only in `DRAFT` or `REJECTED` (if resubmitting). Fields: `notes`, add/remove/update `line_items`, change destination storefront, etc. Provide array diff semantics (e.g. `line_items` with `id` for existing lines; missing IDs implies creation; include `_destroy` flag or send final array).

### 4.6 Approve / Reject Transfer

```
POST /inventory/api/transfers/{id}/approve/
POST /inventory/api/transfers/{id}/reject/
```

- `approve` optionally accepts payload to adjust `approved_quantity` per line.
- `reject` requires a `reason` field.
- Only allowed for users with capability `inventory.manage` AND role = ADMIN/MANAGER/OWNER (backend enforcement).

### 4.7 Dispatch / Mark In Transit

```
POST /inventory/api/transfers/{id}/dispatch/
```

- Allowed once approved.
- Deducts warehouse stock (safe transaction). Accept optional `fulfilled_quantity` per line if adjustments happen at pick stage.

### 4.8 Complete Transfer

```
POST /inventory/api/transfers/{id}/complete/
```

- Finalizes transfer, increments storefront stock.
- Requires `fulfilled_quantity` values (if not provided earlier).

### 4.9 Cancel Transfer

### 4.10 Confirm Delivery (Requester)

```
POST /inventory/api/transfers/{id}/confirm-receipt/
```

- Callable by the user who raised the linked `TransferRequest`, or by managers on their behalf.
- Backend records `received_by`, `received_at`, optional `notes`, and optionally transitions the request to `FULFILLED`.
- Guard the endpoint so it only works when the transfer is `IN_TRANSIT` or `COMPLETED` and has an associated request.

```
POST /inventory/api/transfers/{id}/cancel/
```

- Allowed while in `REQUESTED`, `APPROVED`, `IN_TRANSIT` (subject to backend rules). Should roll back reserved stock if already deducted.

## 5. Validation & Error Handling

- Use standard 400 responses with field-level errors (e.g. `{ "line_items": { "0": "Insufficient stock" } }`).
- 403 when user lacks capability; 404 when transfer not found or not in business scope.
- Concurrency: return 409 if state transition invalid due to racing updates.
- Provide `detail` message for user feedback.

## 6. Stock Accounting Expectations

- When moving from `APPROVED` → `IN_TRANSIT`, backend should decrement inventory from the warehouse to prevent double allocation.
- On `COMPLETED`, backend increments storefront stock. If cancelled after stock deduction, quantities must be returned to warehouse.
- Line items should expose resulting quantity/outstanding difference so UI can show partial fulfillment notes.

## 7. Permissions Mapping

| Capability | Description | UI Need |
|------------|-------------|---------|
| `inventory.requests.create` (new) | Storefront staff can submit stock requests. | Display “Request stock” CTA and POST `/transfer-requests/`. |
| `inventory.requests.manage` (new) | Managers review/cancel requests, link transfers. | Requests dashboard, assign transfer controls. |
| `inventory.manage` | Create/approve/dispatch transfers. | Existing transfer workflow actions. |
| `inventory.transfers.confirm` (new) | Confirm receipt of a transfer linked to a request. | “Confirm delivery” button on transfer detail. |
| `inventory.view` | View transfers and requests. | Read-only list/detail. |

Frontend will call `GET /inventory/api/transfers/` and `GET /inventory/api/transfer-requests/` even for read-only staff. Ensure listing respects RBAC.

## 8. Notifications & Webhooks (optional)

If backend emits events (websocket, SSE, or push notifications), we can update the dashboard in real time. Otherwise, we will poll or rely on manual refresh.

## 9. Open Questions for Backend

1. Do current inventory models already support reservations/allocations? If not, how should partial availability be represented?
2. Preferred mechanism for updating line items (PATCH semantics or separate `line-items/` endpoint)?
3. Should transfers auto-cancel if not approved within N hours? (Frontend can show badge if backend provides `expires_at`.)
4. Is a human-readable `reference` generated server-side, or should frontend supply one?
5. Should a single transfer be able to fulfil multiple requests (split shipments), or do we want 1:1 mapping for now?
6. Who is allowed to mark a request as fulfilled if the original requester is unavailable? (Fallback hierarchy?)

---

## 10. Immediate Backend Tasks

1. Implement the `transfer-requests` endpoints (models, serializers, viewsets) with status transitions described above.
2. Update transfer serializers/views to accept `request_id`, populate line items, and enforce linkage rules.
3. Add the `confirm-receipt` endpoint and persist `received_by/received_at` metadata.
4. Ensure availability validation runs both during transfer creation and during the new request → transfer conversion.
5. Extend permissions/roles to include the new capabilities (or map them into existing role definitions).

Once these contracts are live we can wire up the frontend request workspace and adjust the transfer UI accordingly.

---

Once the backend reviews these requirements and confirms the contract, we’ll wire the UI flows (list, detail, wizard).