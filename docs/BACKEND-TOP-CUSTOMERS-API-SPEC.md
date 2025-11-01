# Top Customers API Specification

## Purpose
Defines the backend contract required by the **Top Customers** dashboard at `/app/reports/customer/top-customers`. Backend MUST supply the data structure below; missing fields cause runtime failures (e.g., `top_10_revenue` undefined).

---

## Endpoint
```
GET /reports/api/customer/top-customers/
```

### Authentication
- Required: **Yes**
- Scheme: Bearer token
- Header: `Authorization: Bearer <token>`

### Query Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `start_date` | string (ISO `YYYY-MM-DD`) | ✔ | Beginning of analysis window |
| `end_date`   | string (ISO `YYYY-MM-DD`) | ✔ | End of analysis window (inclusive) |
| `limit`      | integer (1-50)           | ✖ (default 10) | How many top customers to return |
| `segment`    | enum (`all`, `vip`, `at_risk`, `loyalty`) | ✖ | Optional filtering |
| `export_format` | enum (`csv`, `pdf`) | ✖ | When present, return file download instead of JSON |

### Example Request
```bash
curl "https://api.example.com/reports/api/customer/top-customers/?start_date=2025-08-01&end_date=2025-10-31" \
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
      "total_customers": 42,
      "top_10_revenue": 152340.55,
      "top_10_percentage": 68.4,
      "average_customer_value": 3622.40
    },
    "customers": [
      {
        "customer_id": "d4b1f9d2-9d02-4c0d-93d1-b1f8e5ce8293",
        "customer_name": "Ama Serwaa",
        "email": "ama@example.com",
        "phone": "+233241234567",
        "total_revenue": 24500.75,
        "total_purchases": 38,
        "average_order_value": 644.76,
        "first_purchase_date": "2024-02-18",
        "last_purchase_date": "2025-10-27",
        "customer_lifetime_days": 617,
        "purchase_frequency": "monthly",
        "favorite_category": "Electronics",
        "credit_limit": 5000.0,
        "credit_used": 2300.0,
        "loyalty_tier": "gold",
        "status": "active"
      }
      // ... up to `limit` entries
    ]
  }
}
```

### Field Requirements
- `success`: boolean (always `true` for successful data responses).
- `data.summary`: **mandatory object**. Missing any property breaks the UI.
  - `total_customers`: integer ≥ 0
  - `top_10_revenue`: number (sum revenue of top N)
  - `top_10_percentage`: number (0-100, percent of total revenue)
  - `average_customer_value`: number (average revenue per customer in range)
- `data.customers`: array (empty array allowed when no data). Every customer object must contain all fields; use neutral defaults if data is unavailable.

### No-Data Scenario
Return zeroed summary with empty customers array:
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_customers": 0,
      "top_10_revenue": 0,
      "top_10_percentage": 0,
      "average_customer_value": 0
    },
    "customers": []
  }
}
```

---

## Error Responses
Use non-200 status codes for invalid requests. Always include `success: false`.
```json
{
  "success": false,
  "error": "Invalid date range",
  "message": "end_date must be on or after start_date"
}
```
Common HTTP codes:
- **400** – Missing/invalid parameters
- **401** – Not authenticated
- **403** – Lacking permissions
- **500** – Unexpected server error

---

## Business Logic Expectations
1. **Date Range Filtering**: Include sales/orders whose `order_date` (paid/completed) lies between `start_date` and `end_date` inclusive.
2. **Revenue Calculation**: Use net revenue (after refunds/discounts) in base currency.
3. **Total Purchases**: Count of completed orders per customer in range.
4. **Average Order Value**: `total_revenue / total_purchases` (0 if no purchases).
5. **Customer Lifetime Days**: `max(last_purchase, end_date) - min(first_purchase, start_date)`.
6. **Purchase Frequency** Mapping:
   - ≤ 10 days avg gap → `"weekly"`
   - 11–25 days → `"bi-weekly"`
   - ≥ 26 days → `"monthly"`
7. **Favorite Category**: Category with highest revenue for the customer within range.
8. **Credit Metrics**: Pull from AR/credit tables; default to 0 when credit is disabled.
9. **Status Logic**:
   - `active`: purchase within last 60 days
   - `at-risk`: last purchase 61–120 days ago
  - `inactive`: >120 days no purchase
10. **Summary Metrics** computed across returned customers, not entire customer base unless `limit` includes all.

---

## Export Support
When `export_format` is set, respond with file download (CSV/PDF) while keeping same filter logic.

### CSV Columns
```
Customer Name,Email,Phone,Total Revenue,Total Purchases,Average Order Value,First Purchase,Last Purchase,Lifetime (days),Purchase Frequency,Favorite Category,Credit Limit,Credit Used,Loyalty Tier,Status
```

### PDF Layout (suggested)
- Header: report name + date range
- Summary block (4 metrics)
- Table listing top customers with key fields

---

## Performance & Reliability
- Target response time < 2s for default limit.
- Ensure queries use indexes on `orders.customer_id`, `orders.completed_at`, `orders.net_total`.
- Implement caching (optional) keyed by tenant + date range + limit for 10 minutes.
- Return numeric values as numbers (not strings). Frontend handles formatting.

---

## Testing Checklist
- [ ] Returns zeroed summary when no orders exist
- [ ] Applies date filters correctly
- [ ] Honors `limit` parameter
- [ ] Handles customers with missing contact info (still return empty strings)
- [ ] Provides deterministic ordering (default: revenue DESC, tie-breaker: last_purchase DESC)
- [ ] Export endpoints produce valid files
- [ ] Auth errors return 401 with JSON body

---

## Contacts
- Frontend owner: Reports UI team (see `/src/features/reports/pages/TopCustomersPage.tsx`)
- Backend owner: Analytics API squad

**This document is the single source of truth for the Top Customers API contract.**