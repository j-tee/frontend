# Customer Segmentation API Specification

## Purpose
Defines the backend contract that powers the **Customer Segmentation** dashboard at `/app/reports/customer/segmentation`. The frontend consumes this endpoint to render the segment cards, RFM score badges, recommended actions, and the high-level insight tiles. Any deviation from this structure will break `CustomerSegmentationPage.tsx` and related helpers inside `types/reports.ts` and `services/reportsService.ts`.

---

## Endpoints

| Use Case | Method & Path | Notes |
|----------|---------------|-------|
| Fetch segmentation insights (JSON) | `GET /reports/api/customer/segmentation/` | Returns the JSON payload detailed below. |
| Export CSV | `GET /reports/api/customer/segmentation/?...&export_format=csv` | Shares filters with JSON call; streams CSV download. |
| Export PDF *(optional but wired)* | `GET /reports/api/customer/segmentation/?...&export_format=pdf` | Should mirror JSON payload in a printable format. |

All endpoints share the same filters, authentication, and validation rules.

### Authentication
- Required: **Yes**
- Type: Bearer token
- Header: `Authorization: Bearer <token>`

---

## Query Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `start_date` | string (ISO `YYYY-MM-DD`) | ✖ | rolling 90 days | Lower bound for order and revenue calculations. |
| `end_date` | string (ISO `YYYY-MM-DD`) | ✖ | today | Inclusive upper bound; must be ≥ `start_date`. |
| `segmentation_method` | enum (`rfm`, `value`, `behavior`) | ✖ | `rfm` | Determines the algorithm and shape of segment metadata. Current frontend expects `rfm`. |
| `storefront_id` | string (UUID) | ✖ | all | Filter to a storefront/location. |
| `segment` | string | ✖ | all | Optional explicit segment code to return (still nest inside array). |
| `export_format` | enum (`csv`, `pdf`) | ✖ | json | When supplied, return file download. |

Additional filters from `ReportFilters` (e.g., `page`, `page_size`, `search`) may be passed by future UI iterations. Ignore unknown keys.

### Example Request
```bash
curl "https://api.example.com/reports/api/customer/segmentation/?segmentation_method=rfm&start_date=2025-08-01&end_date=2025-10-30" \
  -H "Authorization: Bearer <token>" \
  -H "Accept: application/json"
```

---

## Success Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "method": "rfm",
    "insights": {
      "highest_revenue_segment": "Champions",
      "largest_segment": "Promising",
      "fastest_growing_segment": "Potential Loyalists",
      "needs_attention": "At Risk"
    },
    "segments": [
      {
        "segment_name": "Champions",
        "segment_code": "R5F5M5",
        "description": "Recent, frequent, high spenders",
        "customer_count": 184,
        "total_revenue": 925000.75,
        "average_order_value": 5032.12,
        "recency_score": 5,
        "frequency_score": 5,
        "monetary_score": 5,
        "characteristics": {
          "avg_days_since_last_purchase": 7,
          "avg_purchase_frequency": 12,
          "avg_total_spend": 18520.60
        },
        "recommended_actions": [
          "Offer VIP loyalty perks",
          "Invite to referral programs",
          "Early access to new collections"
        ]
      },
      {
        "segment_name": "At Risk",
        "segment_code": "R2F2M3",
        "description": "Previously loyal but recent activity dipping",
        "customer_count": 92,
        "total_revenue": 186520.10,
        "average_order_value": 2548.90,
        "recency_score": 2,
        "frequency_score": 2,
        "monetary_score": 3,
        "characteristics": {
          "avg_days_since_last_purchase": 78,
          "avg_purchase_frequency": 4,
          "avg_total_spend": 7312.40
        },
        "recommended_actions": [
          "Send win-back offers",
          "Trigger churn prevention drip",
          "Upsell complementary products"
        ]
      }
    ]
  }
}
```

### No-Data Scenario
```json
{
  "success": true,
  "data": {
    "method": "rfm",
    "insights": {
      "highest_revenue_segment": null,
      "largest_segment": null,
      "fastest_growing_segment": null,
      "needs_attention": null
    },
    "segments": []
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Invalid segmentation method",
  "message": "method must be one of: rfm, value, behavior"
}
```
Status Codes: 400 (validation), 401 (unauthenticated), 403 (unauthorized), 500 (server failure).

---

## Field Requirements

### Root Object
- `success`: boolean flag.
- On success, `data` is populated; on failure, `error` and `message` are provided and `data` should be omitted or null.

### `data.method`
- Enum indicating segmentation algorithm. Only `rfm` is currently rendered; other values must include compatible structures before frontend support.

### `data.insights`
- String summaries surfaced in the dashboard header.
- Required keys: `highest_revenue_segment`, `largest_segment`, `fastest_growing_segment`, `needs_attention`.
- Values may be `null` when no data.

### `data.segments`
Array ordered by business priority (largest revenue by default). Each entry requires:
- `segment_name`: descriptive label (e.g., "Champions").
- `segment_code`: short code (e.g., "R5F5M5").
- `description`: plain-text explanation.
- `customer_count`: integer ≥ 0.
- `total_revenue`: number (base currency) — no locale formatting.
- `average_order_value`: number (base currency).
- `recency_score`, `frequency_score`, `monetary_score`: integers 1–5.
- `characteristics`: object with
  - `avg_days_since_last_purchase`: integer ≥ 0.
  - `avg_purchase_frequency`: number (per selected period).
  - `avg_total_spend`: number (currency).
- `recommended_actions`: array of strings (1–5 bullet points recommended).

### Currency & Number Handling
- Return raw numeric values. The UI handles formatting (`toLocaleString` / `useCurrency`).
- Do not send strings with currency symbols.

### Sorting & Consistency
- Segments should be mutually exclusive and collectively exhaustive for the filtered population.
- Ensure `customer_count` sums match the total customers used to derive insights.
- `total_revenue` should sum to the revenue considered in insights for traceability.

---

## Business Logic Expectations (RFM Method)
1. **Scoring**
   - Recency, frequency, and monetary scores must be integers 1–5 based on quintiles or agreed thresholds.
   - Document the scoring scheme server-side so future methods stay deterministic.
2. **Segment Mapping**
   - Map RFM score combinations to human-readable segment names/descriptions consistent with UI copy above.
   - Keep `segment_code` stable for analytics (e.g., `R5F5M5`).
3. **Insights**
   - `highest_revenue_segment`: segment with highest `total_revenue`.
   - `largest_segment`: highest `customer_count`.
   - `fastest_growing_segment`: detect growth vs previous period (implementation choice, but value must exist). If not available, return `null` and update message to reflect missing comparison.
   - `needs_attention`: typically segment with low recency and declining frequency (e.g., `At Risk`).
4. **Filtering**
   - Apply `start_date`, `end_date`, `storefront_id`, and any other supplied filter before calculating scores.
   - Accounts with zero orders in the range can be excluded from segments unless they have outstanding spend relevant to `avg_total_spend`.
5. **Performance**
   - Designed for up to ~10,000 customers; target < 2s response.
   - Precompute R, F, M metrics when possible.

---

## Exports
- CSV/PDF exports should mirror the JSON data.
- Required columns: all segment fields plus derived metrics (e.g., `avg_days_since_last_purchase`).
- Include a header section with insight values and filter context.

---

## Testing Checklist
- [ ] Validates `start_date <= end_date`.
- [ ] Rejects unsupported `segmentation_method`.
- [ ] Returns zeroed/no-data structure for empty tenants.
- [ ] Ensures counts and revenue totals remain consistent across segments and insights.
- [ ] Covered by automated tests similar to `reports.tests.test_credit_utilization`.

---

## Contacts
- Frontend owner: Reports UI team (`CustomerSegmentationPage.tsx`).
- Backend owner: Customer Intelligence / Segmentation API squad.

**This document is the authoritative source for the Customer Segmentation API contract.**
