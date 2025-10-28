# Backend Request: Stock Product Management & Pagination

> **Update — 1 Oct 2025:** The backend team delivered the full contract in `backend/docs/stock-management-api.md`. Keep this file as the frontend-facing summary + any follow-up asks.

## Confirmed API contract (from backend spec)

- **Stock batches** (`GET /inventory/api/stock/`)
  - Paginated response with `items` array containing nested stock products.
  - Accepts `page`, `page_size (≤100)`, `warehouse`, `search`, `ordering` query params.
  - Supports `POST`, `PATCH`, `DELETE` for batch maintenance.
- **Stock products** (`GET /inventory/api/stock-products/`)
  - Returns `PaginatedResponse<StockProduct>` with landed cost totals calculated server-side.
  - Query params: `page`, `page_size (≤100)`, `product`, `stock`, `supplier`, `has_quantity`, `search`, `ordering`.
  - Supports `POST`, `PATCH`, `DELETE`; backend auto-derives tax amounts and totals when given `unit_tax_rate`/`unit_cost`.
- **Suppliers** (`GET /inventory/api/suppliers/`)
  - Paginated listing with `page`, `page_size`, `search`, `ordering`.
  - Supports standard CRUD.
- **Profit projection service** *(follow-up enhancement request)*
  - Please expose dedicated projection endpoints so the frontend can request scenario-based profit simulations without duplicating pricing formulas. Proposed contract:
    - `POST /inventory/api/profit-projections/stock-product/` → calculate projections for a single stock product given retail/wholesale percentage splits (must validate that the percentages add up to 100).
    - `POST /inventory/api/profit-projections/product/` → aggregate projections at the product level across all active stock records.
    - `POST /inventory/api/profit-projections/bulk/` → accept an array of `{ stock_product_id, retail_percentage, wholesale_percentage }` payloads and return projections for each line item.
    - `GET /inventory/api/profit-projections/scenarios/` → return predefined percentage mixes (e.g., 100/0, 0/100, 70/30) so the UI can offer one-click comparisons.
  - Responses should include per-scenario totals (profit per unit, total profit, profit margin, weighted averages) and provide baseline `retail_only` / `wholesale_only` entries alongside the requested mix. Keep outputs read-only and apply server-side rounding rules consistently.
- **Permissions**
  - All routes scoped to the authenticated business; write operations require owner/admin tokens. Expect `403` with descriptive `detail` message when blocked.
  - Backend enforces membership-scoped querysets backed by new `business` foreign keys on products and suppliers. Duplicate payloads are prevented by per-business uniqueness (`business + sku`, `business + name`). Surface backend validation strings when collisions occur.

## Frontend action items

1. Implement stock-workspace Redux thunks hitting the confirmed endpoints (✓ implemented in this branch).
2. Build `/app/inventory/stocks` UI with filters, pagination, and landed-cost columns (✓ implemented).
3. Keep an eye on future enhancements (e.g., batch detail drawer, inline edits) once backend exposes partial update semantics for landed cost adjustments.

---

📝 **Historical request (for reference)**

## Background

- Frontend now differentiates between product catalog metadata and stock-specific records (`StockBatch` + `StockProduct`).
- We are preparing a dedicated "Manage Stocks" experience that will allow owners to browse, filter, and edit stock line items.
- This workflow depends on server-side pagination and well-defined REST endpoints for stock batches and stock products.

## Current Understanding

| Resource | Endpoint (assumed) | Notes |
| --- | --- | --- |
| Stock batches | `GET /inventory/api/stock-batches/` | Returns containers that group stock products. Expect aggregated totals (quantity, landed cost) per batch. |
| Stock products | `GET /inventory/api/stock-products/` | Individual line items tied to a product + optional supplier. |
| Suppliers | `GET /inventory/api/suppliers/` | Used for lookups inside the intake and stock management forms. |

We need confirmation that these endpoints exist, their payload shapes, and the exact query params/filters that are currently supported.

## Frontend Requirements

1. **Paginated Stock Product Listing**
   - `GET /inventory/api/stock-products/` must return `PaginatedResponse<StockProduct>` (same structure as product pagination: `count`, `next`, `previous`, `results`).
   - Query parameters:
     - `page` (1-indexed integer) — defaults to 1.
     - `page_size` (integer) — allow 25 by default, with support for 10/25/50/100 if feasible.
     - Optional filters (please confirm availability):
       - `product` (UUID)
       - `stock_batch` (UUID)
       - `supplier` (UUID)
       - `is_active` / `has_quantity` flags (if implemented)
       - `search` (free text on product name/SKU or reference fields)
     - Optional ordering: `ordering=arrival_date`, `ordering=-quantity`, etc. (confirm supported fields).

2. **Stock Product Detail & Mutations**
   - Ability to create, update, and archive stock products:
     - `POST /inventory/api/stock-products/`
     - `PATCH /inventory/api/stock-products/{id}/`
     - `DELETE` or soft-delete mechanism (confirm preferred approach).
   - Expected fields for `StockProduct` payload (based on current TypeScript types):
     ```json
     {
       "id": "UUID",
       "stock_batch": "UUID",
       "product": "UUID",
       "supplier": "UUID | null",
       "quantity": 120,
       "unit_cost": "12.50",
       "unit_tax_rate": "5.00",
       "unit_tax_amount": "0.63",
       "unit_additional_cost": "1.10",
    "retail_price": "15.95",
    "wholesale_price": "13.50",
       "landed_unit_cost": "13.73",
       "total_base_cost": "1500.00",
       "total_tax_amount": "75.00",
       "total_additional_cost": "120.00",
       "total_landed_cost": "1695.00",
       "expiry_date": "2025-12-31",
       "description": "Notes",
       "created_at": "ISO timestamp",
       "updated_at": "ISO timestamp",
       "supplier_name": "Acme Supplies"
     }
     ```
   - Confirm whether totals are computed server-side (preferred) or if the frontend should send them.
   - Clarify validation rules (e.g., `unit_tax_amount` auto-calculation when `unit_tax_rate` is provided).
  - Confirm new optional pricing fields (`retail_price`, `wholesale_price`) map directly to detail serializers and whether any rounding rules apply.

3. **Stock Batch Interactions**
   - We need to display batch context alongside stock products. Please document:
     - Fields returned by `GET /inventory/api/stock-batches/`.
     - Pagination support (same `page`/`page_size` contract).
     - Filters (e.g., by warehouse, arrival date, reference code).
     - Mutation endpoints for batch creation/update if available.

4. **Expected Profit Calculations** *(new suggestion)*
  - Please include computed profit fields on the `StockProduct` serializer so that line items report:
    - Expected profit when sold at retail (`expected_profit_retail` = `retail_price` − landed unit cost × quantity).
    - Expected profit when sold wholesale (`expected_profit_wholesale` = `wholesale_price` − landed unit cost × quantity).
  - These values should respect the backend's rounding/precision rules and remain read-only; the frontend will display them when available.

5. **Supplier Lookup**
   - Confirm supplier listing endpoint supports pagination or returns full list (if small).
   - If paginated, specify query params and payload so we can integrate an async select field.

6. **Permissions & Business Scoping**
   - Ensure all endpoints are scoped to the authenticated business (owner/admin tokens only for write operations).
  - Document any permission responses so the frontend can show appropriate gating (403, detail message, etc.).
  - Confirm if business ID is implied by the token (current behavior) or if the frontend should pass an explicit `business` field when creating stock, supplier, or product records.

## Questions for Backend

1. Can you confirm the exact payload shape for `StockProductSerializer`? Any fields missing from the list above?
2. Which filters and ordering options are already implemented for stock products and stock batches? Provide full list and defaults.
3. Are aggregate totals (`landed_unit_cost`, `total_base_cost`, etc.) calculated server-side? If so, clarify if we should omit them from POST/PATCH payloads.
4. What is the maximum supported `page_size`? Any throttling or rate limits to be aware of?
5. How should deletions be handled? Hard delete, soft delete, or quantity adjustments only?
6. Are there related endpoints we should leverage (e.g., owner workspace summaries that include stock counts)?
7. Can you confirm the schema, validation rules, and rounding behaviour for the proposed profit projection endpoints (single item, bulk, product aggregate, scenarios listing)?
8. Are there server-side caching or rate-limiting expectations for projection calls, and how frequently should the frontend refresh previously retrieved projections?

## Frontend Implementation Plan (once contract is confirmed)

1. Extend the inventory slice with async thunks for `fetchStockProducts`, `createStockProduct`, `updateStockProduct`, `deleteStockProduct` plus pagination state.
2. Build the "Manage Stocks" UI (triggered by the new header button) featuring:
   - Paginated table with batch, product, supplier, quantity, landed cost columns.
   - Filters for product, supplier, batch, and search text.
   - Actions for editing quantities/costs and linking to batch details.
3. Integrate supplier lookup dropdowns and stock batch context.
4. Add optimistic UI feedback and validation error surfacing based on backend responses.

## Next Steps

- Await backend confirmation on endpoints, filters, and pagination behaviors.
- Align on the profit projection service contract (endpoints, validation, predefined scenarios) so the frontend can wire the new UI described in `docs/profit-projections-integration.md`.
- Once the contract is locked, we will wire up the Redux slice, services, and UI components for stock management.
- Please share API docs or serializer definitions where possible to speed up implementation.
