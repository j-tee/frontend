# Storefront-Aware Sales Reports – Backend Requirements

## Scope
Enable storefront filtering in the following analytics endpoints and their export variants so that the frontend dropdown can request data scoped to a single storefront or all storefronts:

- `GET /reports/api/sales/summary`
- `GET /reports/api/sales/summary?export_format=csv|pdf`
- `GET /reports/api/sales/products`
- `GET /reports/api/sales/products?export_format=csv|pdf`
- `GET /reports/api/sales/customer-analytics`
- `GET /reports/api/sales/customer-analytics?export_format=csv|pdf`
- `GET /reports/api/customer/top-customers`
- `GET /reports/api/customer/top-customers?export_format=csv|pdf`
- `GET /reports/api/sales/revenue-trends`
- `GET /reports/api/sales/revenue-trends?export_format=csv|pdf`
- `GET /reports/api/financial/revenue-profit`
- `GET /reports/api/financial/revenue-profit?export_format=csv|pdf`
- `GET /reports/api/financial/ar-aging`
- `GET /reports/api/financial/ar-aging?export_format=csv|pdf`
- `GET /reports/api/financial/collection-rates`
- `GET /reports/api/financial/collection-rates?export_format=csv|pdf`
- `GET /reports/api/financial/cash-flow`
- `GET /reports/api/financial/cash-flow?export_format=csv|pdf`

## Functional Requirements
- Accept an optional `storefront_id` query parameter on each endpoint. When present, limit all calculations, breakdowns, and exports to transactions associated with that storefront. When omitted or blank, return global totals across every storefront (current behaviour).
- Treat `storefront_id` consistently across primary responses and derived calculations:
  - Sales Summary: apply the storefront filter to `summary`, `breakdown`, `top_selling_hours`, and `comparison.previous_period` data sets.
  - Product Performance: scope `summary`, `products`, and `categories` arrays to the storefront.
  - Customer Analytics: scope `summary`, `segments`, `top_customers`, and `purchase_frequency` payloads to the storefront, returning zeroed metrics where no data exists.
  - Top Customers: filter leaderboard calculations, loyalty tiers, and export payloads so rankings, revenue totals, and limits reflect the storefront selection.
  - Revenue Trends: scope `summary`, `results.trends`, and `results.patterns` (including payment method aggregations) to the storefront, ensuring trend counts and growth comparisons reflect the filtered dataset.
  - Revenue & Profit Analysis: apply storefront filtering to `summary`, `results`, and any cost/profit components so gross margins and orders stay aligned with the storefront selection.
  - AR Aging: filter `summary`, `results`, and all aging bucket rollups (including retail/wholesale breakdowns and risk badges) so outstanding balances match the storefront selection.
  - Collection Rates: apply storefront scoping to `summary`, retail/wholesale breakdowns, trend tables, and any SLA calculations so collection efficiency matches the storefront context across UI and exports.
  - Cash Flow: scope `summary`, inflow/outflow breakdowns, and trend tables so running balances, payment method aggregations, and retail/wholesale splits reflect the chosen storefront consistently.
- Mirror the same filtering logic inside CSV/PDF export workflows so downloaded files match the on-screen data.
- Include the applied storefront in the response metadata (e.g., `data.metadata.filters_applied.storefront_id`) when available. This lets the UI confirm the response scope when troubleshooting discrepancies.

## Data & Access Considerations
- Enforce user access rules when evaluating `storefront_id` so that a user cannot request data for storefronts they do not manage.
- When a storefront has no transactions in the requested window, return zeroed metrics but keep response structure intact to avoid frontend null checks.
- Historical comparison logic (`compare_previous=true`) should filter both the current and comparison periods with the same storefront ID to keep growth deltas accurate.

## Supporting API for Dropdown Options
- Expose a list of storefronts the authenticated user can report on. Two options:
  1. Reuse the existing inventory endpoint (`GET /inventory/api/storefronts/`) if it already respects user permissions and is performant for analytics use.
  2. Provide a lightweight reports-friendly helper (`GET /reports/api/storefronts/`) that returns `{ id, name }` pairs with any necessary access filtering.
- Ensure the endpoint supports quick loading (<1s) since the dropdown renders during report initialization.

## Validation & Testing
- Unit/integration tests covering:
  - Requests with and without `storefront_id`.
  - Invalid storefront IDs (expect 404 or 400 with clear message).
  - Permission checks preventing cross-storefront access.
  - Export endpoints returning filtered datasets.
- Regression tests to confirm totals remain unchanged when `storefront_id` is omitted.

## Rollout Notes
- Coordinate backend deployment before merging the frontend changes to avoid 400 errors from unknown parameters.
- Update API reference docs so consumers know about the new filter.
- Communicate to analytics stakeholders that exported files can now be storefront-specific.
