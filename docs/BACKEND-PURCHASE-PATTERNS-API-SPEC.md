# Purchase Patterns API Specification

## Purpose
Defines the backend contract required by the **Customer Purchase Patterns** dashboard at `/app/reports/customer/purchase-patterns`. The frontend expects a single analytics endpoint that describes customer segment performance, behavioural metrics, product preferences, and sales channel mix. Missing fields or shape changes will break the UI (see `PurchasePatternsPage.tsx` and `types/reports.ts`).

---

## Endpoints to Implement

| Use Case | Method & Path | Notes |
|----------|---------------|-------|
| Fetch analytics (JSON) | `GET /reports/api/customer/purchase-patterns/` | Returns structured JSON described below. |
| Export CSV | `GET /reports/api/customer/purchase-patterns/?...&export_format=csv` | Respond with streamed CSV using same filters. |
| Export PDF *(optional but wired in UI)* | `GET /reports/api/customer/purchase-patterns/?...&export_format=pdf` | Return generated PDF report using same payload logic. |

All variants share authentication, query parameters, and business rules.

### Authentication
- Required: **Yes**
- Scheme: Bearer token
- Header: `Authorization: Bearer <token>`

### Query Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `start_date` | string (ISO `YYYY-MM-DD`) | ✔ | – | Beginning of reporting window. |
| `end_date` | string (ISO `YYYY-MM-DD`) | ✔ | – | Inclusive end of reporting window. |
| `segment` | enum (`new`, `returning`, `vip`, `at-risk`) | ✖ | all segments | Filter dashboard to a specific segment. When absent, compute totals across all segments. |
| `storefront_id` | string (UUID) | ✖ | all | Optional filter restricting calculations to a single storefront/location. |
| `channel` | enum (`in_store`, `online`, `phone`) | ✖ | all channels | Filter underlying data to a single channel before aggregations. |
| `export_format` | enum (`csv`, `pdf`) | ✖ | json | When supplied, return file download instead of JSON. |

> **Validation:** `end_date` must be ≥ `start_date`; limit requests to maximum 365-day windows to protect performance.

### Example JSON Request
```bash
curl "https://api.example.com/reports/api/customer/purchase-patterns/?start_date=2025-09-01&end_date=2025-11-01" \
  -H "Authorization: Bearer <token>" \
  -H "Accept: application/json"
```

---

## Success Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "segments": {
      "new_customers": {
        "count": 128,
        "total_revenue": 48650.75,
        "average_order_value": 380.86,
        "conversion_rate": 32.5,
        "retention_rate": 18.2
      },
      "returning_customers": {
        "count": 412,
        "total_revenue": 186540.12,
        "average_order_value": 452.81,
        "retention_rate": 62.4
      },
      "vip_customers": {
        "count": 36,
        "total_revenue": 96540.90,
        "average_order_value": 848.15,
        "percentage_of_total": 34.8
      },
      "at_risk_customers": {
        "count": 55,
        "total_revenue": 21450.00,
        "average_order_value": 390.00,
        "last_purchase_days_avg": 97,
        "potential_lost_revenue": 31875.35
      }
    },
    "purchase_behavior": {
      "average_time_between_purchases": 24,
      "peak_purchase_day": "Saturday",
      "peak_purchase_hour": 16,
      "average_items_per_order": 3.2,
      "cross_sell_rate": 41.5,
      "up_sell_rate": 18.7
    },
    "product_preferences": [
      {
        "category": "Electronics",
        "customer_count": 185,
        "total_revenue": 84560.45,
        "average_spend": 457.10,
        "repeat_purchase_rate": 52.8
      },
      {
        "category": "Groceries",
        "customer_count": 302,
        "total_revenue": 56320.11,
        "average_spend": 186.22,
        "repeat_purchase_rate": 38.4
      }
    ],
    "channel_preferences": {
      "in_store": 55.7,
      "online": 33.4,
      "phone": 10.9
    }
  }
}
```

### No-Data Scenario
Return zero/empty values while preserving structure:
```json
{
  "success": true,
  "data": {
    "segments": {
      "new_customers": {"count": 0, "total_revenue": 0, "average_order_value": 0},
      "returning_customers": {"count": 0, "total_revenue": 0, "average_order_value": 0},
      "vip_customers": {"count": 0, "total_revenue": 0, "average_order_value": 0},
      "at_risk_customers": {"count": 0, "total_revenue": 0, "average_order_value": 0}
    },
    "purchase_behavior": {
      "average_time_between_purchases": 0,
      "peak_purchase_day": null,
      "peak_purchase_hour": null,
      "average_items_per_order": 0,
      "cross_sell_rate": 0,
      "up_sell_rate": 0
    },
    "product_preferences": [],
    "channel_preferences": {
      "in_store": 0,
      "online": 0,
      "phone": 0
    }
  }
}
```

### Error Responses
Use non-200 codes with `success: false` when validation fails.
```json
{
  "success": false,
  "error": "Invalid date range",
  "message": "end_date must be on or after start_date"
}
```
Common status codes:
- **400** – Invalid/missing parameters
- **401** – Authentication missing or expired
- **403** – User lacks permission
- **500** – Unexpected server error

---

## Field Requirements

### Segments Object
Each segment must respect the interface in `CustomerSegment`:
- `count`: integer ≥ 0
- `total_revenue`: number (base currency numeric value, not formatted string)
- `average_order_value`: number
- Optional enrichments when available:
  - `conversion_rate`: number (0–100) – percentage from prospects to returning buyers
  - `retention_rate`: number (0–100)
  - `percentage_of_total`: number (0–100) share of overall revenue
  - `last_purchase_days_avg`: integer days since last purchase
  - `potential_lost_revenue`: number representing risk exposure

### Purchase Behavior Object
- `average_time_between_purchases`: integer days between orders for repeat customers
- `peak_purchase_day`: string day-of-week (`"Monday"` → `"Sunday"`)
- `peak_purchase_hour`: integer 0–23 (24-hour clock). Return `null` when unknown.
- `average_items_per_order`: number (1 decimal suggested)
- `cross_sell_rate`: number (0–100) – share of orders with ≥2 categories/items
- `up_sell_rate`: number (0–100) – share of orders with higher-tier items/add-ons

### Product Preferences Array
Each entry (max 10 recommended) maps to `ProductPreference`:
- `category`: string label exactly as shown in UI
- `customer_count`: integer ≥ 0
- `total_revenue`: number (base currency)
- `average_spend`: number (base currency)
- `repeat_purchase_rate`: number (0–100)

### Channel Preferences Object
- `in_store`, `online`, `phone`: numbers representing percentage share of total orders in range. Values should sum to ~100 (minor rounding ok).

> **Currency:** All money amounts must be raw numbers (float/decimal) in the tenant’s base currency. Formatting (symbol, commas, decimals) is handled client-side via `useCurrency`.

---

## Business Logic Expectations

1. **Segment Classification**
   - `new_customers`: first-ever purchase occurs within the date range.
   - `returning_customers`: had ≥1 purchase before `start_date` and ≥1 within range.
   - `vip_customers`: top 10% of customers by lifetime spend or tagged explicitly as VIP (choose deterministic rule and document to frontend).
   - `at_risk_customers`: last purchase 61–120 days before `end_date` **or** churn risk score above configured threshold.

2. **Revenue Calculations**
   - Use net revenue (after discounts, returns, taxes) in base currency.
   - `average_order_value` = `total_revenue / max(total_orders, 1)`.

3. **Behaviour Metrics**
   - `average_time_between_purchases`: median or mean days between successive completed orders for customers with ≥2 purchases.
   - `peak_purchase_day`/`hour`: determined by order volume; break ties by higher revenue.
   - `cross_sell_rate`: % of orders containing items from ≥2 categories or distinct SKUs.
   - `up_sell_rate`: % of orders that include add-ons/upgrades flagged by pricing tier logic.

4. **Product Preferences**
   - Aggregate by product category (or fallback group). Sort descending by `total_revenue` and limit to top 10.
   - `repeat_purchase_rate` = (# customers purchasing category ≥2 times) / (`customer_count`) × 100.

5. **Channel Preferences**
   - Classify orders by fulfillment channel (POS in-store, ecommerce, phone/manual). Provide percentages of total completed orders for range.

6. **Filtering**
   - Respect `segment`, `storefront_id`, and `channel` filters *before* calculating aggregates. When `segment` filter supplied, still return full object but non-selected segments may be zeroed (or repeat actual totals if easier) — frontend expects consistent shape.

7. **Exports**
   - CSV/PDF should mirror JSON data. Include summary tables for segments, behaviour metrics, category preferences, and channel mix.

---

## Performance & Reliability
- Target response time < 2s for 90-day window; paginate heavy category calculations server-side if necessary.
- Ensure indexes on `orders.customer_id`, `orders.completed_at`, `orders.channel`, and `order_items.category_id`.
- Cache analytics (tenant + filters) for ~10 minutes to avoid repeated heavy aggregations.
- Return numeric types (not strings) for analytics to prevent client-side parsing issues.

---

## Testing Checklist
- [ ] Validates required parameters (`start_date`, `end_date`).
- [ ] Returns zeroed structure when no orders exist.
- [ ] Applies `segment`, `storefront_id`, and `channel` filters correctly.
- [ ] Percentages (`cross_sell_rate`, channel shares) stay within 0–100.
- [ ] CSV/PDF exports align with JSON data.
- [ ] Auth and permission errors return proper HTTP codes.

---

## Contacts
- Frontend owner: Reports UI team (`src/features/reports/pages/PurchasePatternsPage.tsx`).
- Backend owner: Analytics API squad.

**This document is the single source of truth for the Purchase Patterns API contract.**
