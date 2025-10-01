# Frontend Integration Guide

> Authoritative roadmap for wiring the SaaS POS frontend to the live backend. This document assumes a React + Vite app with Redux Toolkit, async thunks, Axios, and a public marketing landing page.

---

## 0. Architecture Overview

- **State management**: Use Redux Toolkit slices under `src/store`. Async workflows rely on RTK async thunks for side effects and remote calls.
- **HTTP access**: Centralise Axios in `src/services/httpClient.ts` (base URL + interceptors). Every service module (e.g., `customerMngtService.ts`) composes this client.
- **Business logic & data access**: Organise into feature-specific service files inside `src/services`. Naming convention: `<feature>Service.ts` (e.g., `inventoryService.ts`, `salesService.ts`).
- **Types**: Declare request/response interfaces in `src/types/<feature>.ts`. Export shared enums/constants from `src/types/common.ts`.
- **UI routing**: Public landing page at `/` with marketing copy and CTAs for registration/login. Authenticated shell under `/app/*` guarded by a token-aware route.
- **Subscription guard**: Maintain subscription status inside a dedicated slice. Surface a blocking banner + redirect to billing when the backend responds with `403` in gated areas.

```
src/
  store/
    index.ts           // configureStore + root reducer
    slices/
      authSlice.ts
      subscriptionSlice.ts
      ...
  services/
    httpClient.ts
    authService.ts
    businessService.ts
    inventoryService.ts
    customerMngtService.ts
    ...
  types/
    auth.ts
    business.ts
    inventory.ts
    sales.ts
    bookkeeping.ts
    subscriptions.ts
    common.ts
  features/
    authentication/
    onboarding/
    dashboard/
    inventory/
    sales/
    bookkeeping/
    subscriptions/
  pages/
    LandingPage.tsx
    ...
```

---

## 1. API Fundamentals

| Item | Value |
| --- | --- |
| **Base URL (dev)** | `http://localhost:8000` |
| **Authentication** | Token-based (DRF Tokens). Store token securely (e.g., HTTP-only cookie or encrypted local storage). |
| **Default request headers** | `Content-Type: application/json`, `Accept: application/json`, `Authorization: Token <token>` (after login). |
| **Identifiers** | UUID strings. Treat as opaque text values in Redux state and React props. |

### 1.1 Axios Client Responsibilities

- Attach `Authorization` header when a token exists.
- Handle `401` by dispatching `auth/logout` and redirecting to `/login`.
- Handle `403` by dispatching `subscription/showBlockingBanner`.
- Surface validation errors by propagating `error.response.data` to the calling thunk.

Example interceptor setup:

```ts
axiosInstance.interceptors.request.use((config) => {
  const token = authSelectors.selectToken(store.getState());
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});
```

---

## 2. Onboarding Flow (Public → Authenticated)

| Step | Endpoint | Notes |
| --- | --- | --- |
| **Register business + owner** | `POST /accounts/api/auth/register-business/` | Capture owner + business details. Optional fields: website, social handles, generate token (defaults to `true`). Successful responses include `token`, `user`, `business`. Persist both user + business in state. |
| **Login** | `POST /accounts/api/auth/login/` | Store returned token + user. |
| **Logout** | `POST /accounts/api/auth/logout/` | Invalidate token client-side and clear Redux slices. |
| **Change password** | `POST /accounts/api/auth/change-password/` | After success, force logout (tokens revoked). |
| **Current user** | `GET /accounts/api/users/me/` | Hydrate dashboard shell and user profile slice. |

### Registration Form Schema

```json
{
  "owner_name": "Jane Doe",
  "owner_email": "jane@example.com",
  "owner_password": "verysecure123",
  "business_name": "Jane's Retail",
  "business_tin": "TIN-001122",
  "business_email": "contact@janesretail.com",
  "business_address": "14 Market Street, Accra",
  "business_phone_numbers": ["+233201112223", "+233501234567"],
  "business_website": "https://janesretail.com", // optional
  "business_social_handles": {
    "instagram": "@janesretail",
    "facebook": "janesretail"
  },
  "generate_token": true // optional
}
```

- Validation errors arrive as `{ field_name: ["message"] }`. Map these to inline form errors.
- Successful submission stores the token and routes to `/app/setup`.

---

## 3. Authentication & Account Shell

1. **Auth slice** manages token, user profile, business memberships, and loading/error flags.
2. **Business slice** caches business entities returned after registration or via `/accounts/api/businesses/`.
3. **Profile editing** uses `/accounts/api/profiles/{id}/` for PATCH operations.
4. **Roles & team management** rely on `/accounts/api/roles/`, `/accounts/api/users/`, `/accounts/api/business-memberships/` endpoints.
5. Non-admin views must filter based on backend responses; leverage pagination metadata for list UIs.

---

## 4. Inventory Foundations

### 4.1 Taxonomy & Locations

| Resource | Endpoint | Key fields |
| --- | --- | --- |
| Categories | `/inventory/api/categories/` | `name`, optional `description`, optional parent UUID. |
| Warehouses | `/inventory/api/warehouses/` | `name`, `location`, optional `manager`. Read-only `manager_name`. |
| Storefronts | `/inventory/api/storefronts/` | `user`, `name`, `location`, optional `manager`. |
| Business ↔ Warehouse | `/inventory/api/business-warehouses/` | `business`, `warehouse`, optional `is_active`. |
| Business ↔ StoreFront | `/inventory/api/business-storefronts/` | `business`, `storefront`, optional `is_active`. |
| Storefront employees | `/inventory/api/storefront-employees/` | `business`, `storefront`, `user`, `role`, `is_active`. |
| Warehouse employees | `/inventory/api/warehouse-employees/` | Mirrored schema. |

#### Storefront & Warehouse CRUD quick reference

- Base path: `/inventory/api/`
- Auth header: `Authorization: Token <token>` (owner tokens required for create/update/delete).
- Business ownership rules:
   - Only owners with an active business can create or mutate storefronts/warehouses.
   - Employees can read list endpoints but receive `403` on write attempts.
   - Successful creations auto-link the resource to the owner’s primary business and assign the owner as default manager.

**Storefront endpoints**

| Verb | URL | Notes |
| --- | --- | --- |
| `GET` | `/storefronts/` | Returns an array of storefront objects scoped to the owner’s businesses. |
| `POST` | `/storefronts/` | Body: `{ "name": string, "location": string, "manager"?: UUID }`. Returns 201 with storefront payload. Duplicate names per business trigger `400`. |
| `PATCH` | `/storefronts/{id}/` | Partial updates; same body shape as create. Only owners/superusers succeed. |
| `DELETE` | `/storefronts/{id}/` | Returns `204`. Same permission guard as update. |
| `GET` | `/owner/workspace/` | Convenience endpoint bundling business summary + storefronts + warehouses for dashboard priming. |

**Warehouse endpoints** mirror the storefront contracts:**

| Verb | URL | Notes |
| --- | --- | --- |
| `GET` | `/warehouses/` | Lists warehouses tied to the authenticated owner’s businesses. |
| `POST` | `/warehouses/` | Body: `{ "name": string, "location": string, "manager"?: UUID }`. Backend links to owner’s business and enrolls the owner as primary WarehouseEmployee. |
| `PATCH` | `/warehouses/{id}/` | Owner/superuser only; employees get `403`. |
| `DELETE` | `/warehouses/{id}/` | Removes the warehouse; `204` on success. |

**Error payloads**

| Status | Meaning | Example |
| --- | --- | --- |
| `400` | Validation error | `{ "name": ["This field is required."] }` |
| `403` | Permission guard | `{ "detail": "You do not have permission to update this warehouse." }` |
| `404` | Missing record | `{ "detail": "Not found." }` |

UI guidelines:

- Creation forms collect `name`, `location`, optional manager; POST then refetch workspace or append optimistic card.
- For edits, send PATCH with only changed fields and reconcile local cache (Redux slice or RTK Query cache).
- Confirm deletes client-side before issuing `DELETE` requests.
- Display backend validation strings verbatim near the relevant inputs.
- On any `403`, show a permission warning and disable destructive controls for non-owners.

### 4.2 Products & Stock Lots

| Resource | Endpoint | Required fields | Read-only |
| --- | --- | --- | --- |
| Products | `/inventory/api/products/` | `name`, `sku`, `category`, `unit`, `retail_price`, `wholesale_price`, `cost`, optional `description`, `is_active`. | `category_name`, timestamps |
| Stock lots | `/inventory/api/stock/` | `warehouse`, `product`, `quantity`, `unit_cost`, optional `supplier`, `reference_code`, `arrival_date`, `expiry_date`, `unit_tax_rate`, `unit_tax_amount`, `unit_additional_cost`, `description`. | Derived landed cost metrics |

**Landed cost logic**: If `unit_tax_rate` is set and `unit_tax_amount` omitted or zero, backend computes `unit_tax_amount = unit_cost * unit_tax_rate / 100`. Display `landed_unit_cost = unit_cost + unit_tax_amount + unit_additional_cost`.

### 4.3 Inventory & Transfers

| Feature | Endpoint | Notes |
| --- | --- | --- |
| Inventory snapshot | `/inventory/api/inventory/` | Denormalised rows per `(warehouse, product, stock)`.
| Transfers | `/inventory/api/transfers/` | Fields include `product`, optional `stock`, `from_warehouse`, `to_storefront`, `quantity`, `status`, `requested_by`, optional `approved_by`, `note`.
| Stock alerts | `/inventory/api/stock-alerts/` | `product`, `warehouse`, `alert_type`, `current_quantity`, `threshold_quantity`, `is_resolved`.
| Reports (placeholders) | `/inventory/api/reports/inventory-summary/`, `/inventory/api/reports/stock-arrivals/` | Currently return `[]`; build empty-state UI.

---

## 5. Sales Operations

- **Subscription enforcement**: Before enabling sale creation, check `subscription.status === "ACTIVE"`. Any `403` while creating sales, payments, or fetching sensitive reports must trigger the billing banner.

| Resource | Endpoint base `/sales/api/` | Key fields |
| --- | --- | --- |
| Customers | `/customers/` | `name`, optional `email`, `phone`, `address`, `credit_limit`. Backend maintains credit balances. |
| Sales | `/sales/` | `storefront`, optional `customer`, `user` (cashier UUID), `total_amount`, `payment_type`, `status`, `type`, `amount_due`, `discount_amount`, `tax_amount`, `receipt_number`, optional `notes`. |
| Sale items | `/sale-items/` | `sale`, `product`, optional `stock`, `quantity`, `unit_price`, `discount_amount`, optional `tax_rate`, optional `tax_amount`, `total_price`. Missing `tax_amount` auto-calculated. |
| Payments | `/payments/` | `sale` (optional), `customer`, `amount_paid`, `payment_method`, `status`, optional gateway fields. |
| Refunds | `/refunds/` | `sale`, `refund_type`, `amount`, `reason`, `status`, `requested_by`, optional `approved_by`/`processed_by`. |
| Refund items | `/refund-items/` | `refund`, `sale_item`, `quantity`, `amount`. |
| Credit transactions | `/credit-transactions/` | `customer`, `transaction_type`, `amount`, `balance_before`, `balance_after`, optional `reference_id`, `description`. |

### 5.1 Sales Reports (placeholders)

- `GET /sales/api/reports/sales/`
- `GET /sales/api/reports/customer-credit/`

Both return empty arrays currently. Present empty states and keep components resilient.

---

## 6. Printable Inventory Valuation Report

- Endpoint: `GET /reports/inventory/valuation/`
- Headers: `Authorization: Token <token>`
- Query params: `format (excel|pdf|docx)`, `warehouse_id`, `product_id`, `business_id`, `min_quantity`.
- Response: File download named `inventory-valuation-YYYYMMDD_HHMMSS.<ext>` containing summary totals + detailed landed cost rows.

**UI tips**:
- Trigger downloads via async thunk returning a `Blob` and `URL.createObjectURL`.
- Show progress indicator and handle errors gracefully.

---

## 7. Bookkeeping Module

CRUD endpoints under `/bookkeeping/api/` map directly to Django models. Use nested forms for journal entries and ledger lines.

| Endpoint | Purpose |
| --- | --- |
| `/account-types/` | Manage chart-of-account groupings. |
| `/accounts/` | CRUD ledger accounts. |
| `/journal-entries/` | Submit double-entry journals with nested lines. |
| `/ledger-entries/` | Low-level ledger lines. |
| `/trial-balances/` | Period summaries. |
| `/financial-periods/` | Manage fiscal periods. |
| `/budgets/` | Budget tracking. |
| `/reports/financial/` | Placeholder returning `[]`. |

---

## 8. Subscription & Billing

| Resource | Endpoint base `/subscriptions/api/` | Fields |
| --- | --- | --- |
| Plans | `/plans/` | `name`, `price`, `billing_cycle`, `features (JSON)` |
| Subscriptions | `/subscriptions/` | `business`, `plan`, `status`, `current_period_start`, `current_period_end`, `auto_renew` |
| Payments | `/payments/` | `subscription`, `amount`, `status`, `transaction_reference`, etc. |
| Gateway configs | `/gateway-configs/` | Store API credentials per payment gateway. |
| Webhook events | `/webhooks/payment/` (POST, public) | Handle gateway callbacks (no auth header). |
| Usage tracking | `/usage/` | Metered usage counters. |
| Invoices | `/invoices/` | Generated invoices per billing period. |
| Reports | `/reports/subscriptions/` | Placeholder returning `[]`. |

**Frontend workflow**:
- Provide billing dashboard summarising current plan + renewal dates.
- Allow plan upgrades/downgrades via create/update subscription endpoints.
- When webhook events confirm payment updates, refresh subscription slice.

---

## 9. Error Handling

- **400**: Validation object keyed by field name → display inline errors.
- **401**: Missing/invalid token → logout.
- **403**: Permission denied or subscription lapse → show billing gate banner.
- **404**: Record missing → show not found states or toast.

Implement a global error middleware in Redux to standardise messaging and analytics logging.

---

## 10. Delivery Milestones

1. **Public landing + onboarding**
   - Marketing page at `/`.
   - Registration form (schema above) with success routing and error surfacing.

2. **Authentication shell**
   - Login form + token storage.
   - Axios client + interceptors.
   - Logout/password change screens.

3. **Account dashboard**
   - Header/profile from `/accounts/api/users/me/`.
   - Profile editing and business metadata display via `/accounts/api/businesses/`.

4. **Team & roles management**
   - Invite members (create user → create membership).
   - Activation/deactivation UI.

5. **Inventory foundations**
   - Category, warehouse, storefront management.
   - Staff assignment flows.

6. **Product catalog & stock intake**
   - Product CRUD.
   - Stock intake form (cost, tax, additional cost capture).
   - Inventory list with landed cost metrics.

7. **Transfers & stock alerts**
   - Transfer lifecycle UI.
   - Alerts dashboard with resolve toggle.

8. **Sales workflow**
   - Customer CRM.
   - POS cart → sale creation → payments.
   - Credit sales integration.

9. **After-sales**
   - Refund initiation, item selection.
   - Payment history per customer/sale.

10. **Reporting & exports**
    - Inventory valuation download.
    - Placeholder charts for sales/credit/bookkeeping/subscription.

11. **Billing management**
    - Plan selection.
    - Invoice history and payment receipts.

---

## 11. Enumerations & Shared Types

Define enums/constants in `src/types/common.ts` for reuse across slices and UI controls.

| Context | Field | Allowed values |
| --- | --- | --- |
| `sales.Sale.payment_type` | `payment_type` | `CASH`, `CARD`, `MOBILE`, `CREDIT`, `MIXED` |
| `sales.Sale.status` | `status` | `COMPLETED`, `PENDING`, `REFUNDED`, `PARTIAL`, `CANCELLED` |
| `sales.Sale.type` | `type` | `RETAIL`, `WHOLESALE` |
| `sales.Payment.payment_method` | `payment_method` | `CASH`, `MOMO`, `CARD`, `PAYSTACK`, `STRIPE`, `BANK_TRANSFER` |
| `sales.Payment.status` | `status` | `SUCCESSFUL`, `PENDING`, `FAILED`, `CANCELLED` |
| `sales.Refund.refund_type` | `refund_type` | `FULL`, `PARTIAL`, `EXCHANGE` |
| `sales.Refund.status` | `status` | `PENDING`, `APPROVED`, `PROCESSED`, `REJECTED` |
| `inventory.Transfer.status` | `status` | `PENDING`, `IN_TRANSIT`, `COMPLETED`, `CANCELLED` |
| `inventory.StockAlert.alert_type` | `alert_type` | `LOW_STOCK`, `OUT_OF_STOCK`, `EXPIRY_WARNING` |
| `accounts.BusinessMembership.role` | `role` | `OWNER`, `ADMIN`, `MANAGER`, `STAFF` |
| `subscriptions.Subscription.status` | `status` | Refer to backend `subscriptions.models.SubscriptionStatus` |

---

## 12. Testing & Mock Data Tips

- Use Django admin (`python manage.py createsuperuser`) to seed development data quickly.
- Exercise onboarding by calling the registration endpoint; this also seeds `BusinessMembership` for the owner.
- Populate `Stock` and `Inventory` tables to preview the inventory valuation export.

---

### Need backend clarification?
Tag the backend team with the exact endpoint + payload details. Each section mirrors live Django apps (`accounts`, `inventory`, `sales`, `bookkeeping`, `subscriptions`, `reports`) so you can build confidently.
