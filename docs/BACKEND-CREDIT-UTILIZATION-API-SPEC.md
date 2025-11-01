# Credit Utilization API Specification

## Purpose
Defines the backend contract required by the **Credit Limit Utilization** dashboard at `/app/reports/customer/credit-utilization`. The frontend expects the exact data shapes below to render summary KPIs, risk distribution, and the customer detail table. Any missing fields or type changes will break the UI (`CreditUtilizationPage.tsx`, `types/reports.ts`).

---

## Endpoints to Implement

| Use Case | Method & Path | Notes |
|----------|---------------|-------|
| Fetch analytics (JSON) | `GET /reports/api/customer/credit-utilization/` | Returns JSON structure defined in this document. |
| Export CSV | `GET /reports/api/customer/credit-utilization/?...&export_format=csv` | Same filters; respond with streamed CSV file. |
| Export PDF *(optional but wired)* | `GET /reports/api/customer/credit-utilization/?...&export_format=pdf` | Generate PDF mirroring JSON payload. |

All variants share authentication, filters, and data rules.

### Authentication
- Required: **Yes**
- Type: Bearer token
- Header: `Authorization: Bearer <token>`

### Query Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `start_date` | string (ISO `YYYY-MM-DD`) | ✖ | rolling 90 days | Optional date filter lower bound for transactions and balances. |
| `end_date` | string (ISO `YYYY-MM-DD`) | ✖ | today | Optional inclusive upper bound. Must be ≥ `start_date`. |
| `utilization_threshold` | integer (0–100) | ✖ | 80 | Highlight customers above this utilization percentage in alerts. |
| `sort_by` | enum (`utilization`, `amount`, `risk`) | ✖ | `utilization` | Sorting applied to `customers` array before response. |
| `storefront_id` | string (UUID) | ✖ | all | Restrict calculations to a tenancy location/storefront. |
| `segment` | enum (`retail`, `wholesale`) | ✖ | all | Filter credit accounts by customer segment/type. |
| `export_format` | enum (`csv`, `pdf`) | ✖ | json | When present, return file download instead of JSON. |

### Example Request
```bash
curl "https://api.example.com/reports/api/customer/credit-utilization/?utilization_threshold=80&sort_by=utilization" \
  -H "Authorization: Bearer <token>" \
  -H "Accept: application/json"
```

---

## Success Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_customers_with_credit": 142,
      "total_credit_extended": 1845600.50,
      "total_credit_used": 1243550.10,
      "average_utilization": 67.5,
      "over_80_percent": 24,
      "at_limit": 11,
      "credit_risk_high": 18
    },
    "customers": [
      {
        "customer_id": "a7f2c1b8-4371-4ef8-9c83-6d06dcaee302",
        "customer_name": "Ama Serwaa",
        "credit_limit": 50000.0,
        "credit_used": 47250.0,
        "credit_available": 2750.0,
        "utilization_percentage": 94.5,
        "outstanding_balance": 18250.0,
        "days_overdue": 18,
        "payment_history_score": 62,
        "risk_level": "high",
        "recommended_action": "reduce_limit",
        "last_payment_date": "2025-10-12",
        "last_payment_amount": 1500.0
      },
      {
        "customer_id": "8d80aab4-62a7-4a65-8df0-dcb4ac5f91a4",
        "customer_name": "Kwame Mensah",
        "credit_limit": 30000.0,
        "credit_used": 15350.0,
        "credit_available": 14650.0,
        "utilization_percentage": 51.2,
        "outstanding_balance": 5350.0,
        "days_overdue": 0,
        "payment_history_score": 88,
        "risk_level": "low",
        "recommended_action": "increase_limit",
        "last_payment_date": "2025-10-25",
        "last_payment_amount": 2200.0
      }
    ],
    "risk_distribution": {
      "low": 87,
      "medium": 37,
      "high": 18
    }
  }
}
```

### No-Data Scenario
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_customers_with_credit": 0,
      "total_credit_extended": 0,
      "total_credit_used": 0,
      "average_utilization": 0,
      "over_80_percent": 0,
      "at_limit": 0,
      "credit_risk_high": 0
    },
    "customers": [],
    "risk_distribution": {
      "low": 0,
      "medium": 0,
      "high": 0
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Invalid date range",
  "message": "end_date must be on or after start_date"
}
```
Status codes: 400 (validation), 401 (unauthenticated), 403 (unauthorized), 500 (server failure).

---

## Field Requirements

### Summary Object (`data.summary`)
- `total_customers_with_credit`: integer count ≥ 0.
- `total_credit_extended`: number (base currency) representing summed credit limits.
- `total_credit_used`: number (base currency) representing summed outstanding credit usage.
- `average_utilization`: number (0–100) average percentage across customers with credit.
- `over_80_percent`: integer count of customers whose utilization ≥ configured threshold (default 80%).
- `at_limit`: integer count of customers with utilization ≥ 100% (or credit_used ≥ credit_limit).
- `credit_risk_high`: integer count of customers in `high` risk bucket.

### Customers Array (`data.customers`)
Each entry must provide:
- `customer_id`: UUID string.
- `customer_name`: display string.
- `credit_limit`, `credit_used`, `credit_available`, `outstanding_balance`, `last_payment_amount`: numbers (currency). Raw values only; formatting handled client-side.
- `utilization_percentage`: number (0–150). Values >100 allowed for over-limit cases but capped visually.
- `days_overdue`: integer days since due date (0 when current).
- `payment_history_score`: integer 0–100 (higher = better).
- `risk_level`: enum `high`, `medium`, `low` (lowercase).
- `recommended_action`: enum `reduce_limit`, `monitor`, `increase_limit` (underscore-separated).
- `last_payment_date`: ISO `YYYY-MM-DD` or `null` when no payments.

### Risk Distribution (`data.risk_distribution`)
Provide counts for each risk bucket (integers ≥ 0). Should align with derived `customers` array and summary counts.

> **Currency:** All currency figures must be numeric using the tenant’s base currency. The frontend converts to display using `useCurrency`.

---

## Business Logic Expectations

1. **Utilization Calculation**
   ```text
   utilization_percentage = (credit_used / max(credit_limit, 1)) × 100
   credit_available = max(credit_limit - credit_used, 0)
   ```
2. **Risk Classification**
   - `high`: utilization ≥ 90% **or** days_overdue > 30 **or** payment_history_score ≤ 60.
   - `medium`: utilization 70–89% or days_overdue 1–30 or score 61–79.
   - `low`: remaining customers.
   (Adjust thresholds as long as logic remains deterministic; align with summary counts.)
3. **Recommended Actions**
   - `reduce_limit`: high risk with utilization ≥ 100% or chronic overdue.
   - `monitor`: medium risk customers.
  - `increase_limit`: low risk AND utilization ≤ 60% with high score.
4. **Aggregation Rules**
   - `total_credit_extended` = Σ credit_limit for active credit accounts in filter scope.
   - `total_credit_used` = Σ credit_used.
   - `average_utilization` = arithmetic mean of utilization percentages across accounts.
   - `over_80_percent` uses `utilization_threshold` parameter.
5. **Filtering**
   Apply `start_date`, `end_date`, `segment`, and `storefront_id` before aggregating balances; accounts with no activity in range may still appear if outstanding balances exist.
6. **Exports**
   CSV/PDF must list summary metrics, risk distribution, and customer table with same fields. Percentages should include `%` in exported format.

---

## Performance & Reliability
- Target response < 2s for up to 5,000 credit accounts.
- Ensure indexes on `credit_accounts.customer_id`, `credit_ledger.transaction_date`, and `credit_accounts.storefront_id`.
- Cache responses (tenant + filters) for 5–10 minutes when feasible; bust cache on credit limit or payment updates.
- Return consistent numeric types; avoid locale-formatted strings.

---

## Testing Checklist
- [ ] Validates required auth and date filters.
- [ ] Handles tenants with zero credit accounts (returns zeroed structure).
- [ ] Honors `utilization_threshold` and `sort_by` filters.
- [ ] Keeps `risk_distribution` counts in sync with customer risk levels.
- [ ] CSV/PDF exports match JSON data.
- [ ] Over-limit customers (>100%) still represented correctly.

---

## Contacts
- Frontend owner: Reports UI team (`src/features/reports/pages/CreditUtilizationPage.tsx`).
- Backend owner: Credit & Collections API squad.

**This document is the single source of truth for the Credit Utilization API contract.**
