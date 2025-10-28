# Stock Item Detail Metrics — Frontend Reconciliation Guide

_Last updated: 2025-03-28_

This note explains how the warehouse, transfer, storefront, and POS sales layers line up so a stock item detail screen can display consistent numbers. It complements `FRONTEND_HANDOFF_STOREFRONT_AVAILABILITY.md` (real-time storefront view) and `FRONTEND_SALE_CATALOG_HANDOFF.md` (catalog list contract).

---

## 1. Mental model

1. Warehouse intake creates a **`StockProduct`** record (batch-level quantities tied to a warehouse and supplier).
2. Transfers or manual adjustments move units out of the warehouse batch into **`StoreFrontInventory`** rows (one per storefront/product pair).
3. POS carts place **`StockReservation`** holds against the storefront quantity so we do not oversell.
4. Completing a sale converts reservations into real deductions on the storefront inventory while also writing **`Sale` / `SaleItem`** records.

All reporting derives from those four tables, and every REST endpoint simply surfaces different slices of the same state.

---

## 2. Data model cheat sheet

| Table / model | Scope | Key columns to know | When it changes |
| --- | --- | --- | --- |
| `inventory.StockProduct` | Warehouse batch | `quantity`, `retail_price`, `warehouse_name`, `product_id` | On warehouse receiving, transfers out, manual adjustments |
| `inventory.StoreFrontInventory` | Storefront shelf | `quantity`, `storefront_id`, `product_id` | On transfers in, sales, manual storefront adjustments |
| `sales.StockReservation` | POS cart holds | `quantity`, `cart_session_id`, `expires_at`, `status` | When an item is added to a live draft sale |
| `sales.SaleItem` | Completed or in-flight sale line | `quantity`, `sale_id`, `product_id`, `stock_product_id` | When a sale is completed (status `COMPLETED`/`PARTIAL`) |

Derived terms used on the stock item page:

- **Warehouse on hand** = `StockProduct.quantity` for the batch.
- **Storefront on hand** = sum of `StoreFrontInventory.quantity` for the product per storefront.
- **Reserved for carts** = sum of active `StockReservation.quantity` per storefront/product.
- **Sellable right now** = storefront on hand − active reservations (never negative).
- **Units sold** = sum of `SaleItem.quantity` for completed or partial sales.

---

## 3. API quick reference

| What you need | Endpoint | Important fields | Notes |
| --- | --- | --- | --- |
| Aggregated reconciliation snapshot (preferred) | `GET /inventory/api/products/<product_id>/stock-reconciliation/` | `warehouse.recorded_quantity`, `warehouse.inventory_on_hand`, `storefront.total_on_hand`, `storefront.entries[]`, `reservations.{linked_units, orphaned_units, details[]}`, `sales.completed_units`, `adjustments.{shrinkage_units, correction_units}`, `formula.*` | Single call that powers the modal summary. Accepts optional `stock_product` query param when a tenant wants a batch-scoped roll-up. |
| Batch metadata | `GET /inventory/api/stock-products/<stock_product_id>/` | `quantity`, `product`, `supplier`, `landed_unit_cost`, `retail_price`, `wholesale_price`, `warehouse_name`, `created_at`, `updated_at` | Use once to populate the static header fields. |
| Storefront catalog list (for context panels) | `GET /inventory/api/storefronts/<storefront_id>/sale-catalog/` | For each product: `available_quantity`, `retail_price`, `wholesale_price`, `stock_product_ids[]` | Handy when the UX needs to deep-link from the storefront surfaced numbers to the detail modal. |
| Legacy storefront availability (fallback) | `GET /inventory/api/storefronts/<storefront_id>/stock-products/<product_id>/availability/` | `total_available`, `reserved_quantity`, `unreserved_quantity`, `reservations[]` | Only hit this when the reconciliation endpoint is unavailable; the modal no longer relies on it for day-to-day numbers. |
| Legacy transfer ledger (debugging) | `GET /inventory/api/transfers/?destination_storefront=<uuid>&status=COMPLETED` | `line_items[].product_id`, `line_items[].fulfilled_quantity` | Still useful for forensic audits but not required to render the modal. |
| Legacy sold quantity (debugging) | `GET /sales/api/sales/?product=<uuid>&status=COMPLETED` or `/sales/api/sales/summary/` | `sale_items[].quantity`, `summary.products[]` | Only use when recon output looks suspicious and you need to cross-check raw sales rows. |

---

## 4. Implementation walk-through for a stock product detail page

1. **Fetch the batch metadata.** Call `GET /inventory/api/stock-products/<stock_product_id>/` when the modal opens. Persist the response locally so edits can reuse it.
2. **Pull the reconciliation snapshot.** Invoke `GET /inventory/api/products/<product_id>/stock-reconciliation/` (this is what `fetchProductStockReconciliation` does). The payload already includes:
    - Warehouse totals (`warehouse.recorded_quantity`, `warehouse.inventory_on_hand`).
    - Storefront roll-ups (`storefront.total_on_hand`) plus per-storefront entries.
    - Sales, shrinkage, and correction totals.
    - Reservation roll-ups and optional reservation details.
    - A `formula` block that mirrors the backend math shown in the dashboard copy.
3. **Build the UI metrics straight from the snapshot.**
    - Prefer `snapshot.formula.*` for anything the backend already reconciled (warehouse on hand, storefront on hand, completed sales units, shrinkage, corrections, total reservations, calculated baseline, baseline delta).
    - Fall back to the stock product record only when the snapshot omits a field (e.g., `quantity_available` as the interim unreserved amount while the API catches up).
4. **Render optional detail panels.**
    - Use `snapshot.storefront.entries` for per-storefront on-hand/sellable/reserved breakdowns.
    - Use `snapshot.reservations.details` if you need to show “who reserved what” and when the hold expires.
5. **Refresh on demand.** When adjustments, transfers, or sales mutate the stock, refetch the same reconciliation endpoint. It is quick (~1 query plan) and the backend keeps the calculation authoritative.

Pseudo-flow in React (matches the new service helper):

```ts
const stockProduct = await api.get(`/inventory/api/stock-products/${stockProductId}/`);
const reconciliation = await api.get(
   `/inventory/api/products/${stockProduct.product}/stock-reconciliation/`
);

return {
   recordedBatchSize:
      reconciliation.warehouse?.recorded_quantity ?? stockProduct.quantity,
   warehouseOnHand:
      reconciliation.formula?.warehouse_inventory_on_hand ?? stockProduct.quantity,
   storefrontOnHand: reconciliation.formula?.storefront_on_hand ?? null,
   reservations:
      reconciliation.formula?.active_reservations_units ?? reconciliation.reservations?.linked_units ?? null,
   sold: reconciliation.formula?.completed_sales_units ?? null,
   shrinkage: reconciliation.formula?.shrinkage_units ?? null,
   corrections: reconciliation.formula?.correction_units ?? null,
   baseline: reconciliation.formula?.calculated_baseline ?? null,
   baselineDelta: reconciliation.formula?.baseline_vs_recorded_delta ?? null,
};
```

6. **Expose a manual refresh.** Staleness is rare but we ship a “Refresh snapshot” control that simply re-invokes `fetchProductStockReconciliation(productId)` so ops teams can pull the latest numbers without closing the modal.

---

## 5. Sanity check: SKU `ELEC-0007`

Snapshot pulled from `GET /inventory/api/products/<ELEC-0007 product_id>/stock-reconciliation/` on 2025-03-28. The table shows the backend’s reconciliation output alongside the raw queries we use for double-checking.

| Layer | Query used | Result |
| --- | --- | --- |
| Warehouse batch | `StockProduct.objects.filter(product__sku='ELEC-0007')` | 26 units remain at `Rawlings Park Warehouse` |
| Storefront stock | `StoreFrontInventory.objects.filter(product__sku='ELEC-0007')` | `Cow Lane Store: 3`, `Adenta Store: 20` (total 23) |
| POS sales | `SaleItem.objects.filter(product__sku='ELEC-0007', sale__status__in=['COMPLETED','PARTIAL'])` | 10 units sold |
| Reservations | Active `StockReservation` rows for the SKU | 0 units reserved |

Reconciliation rule of thumb (exactly what the `formula` block returns):

```
warehouse_on_hand (26)
+ storefront_on_hand (23)
+ units_sold (10)
- reservations (0)
= 59 units processed from that batch
```

That matches the original intake for ELEC-0007. The reconciliation payload already exposes `storefront.total_on_hand = 23` and `formula.active_reservations_units = 0`, which the modal now reads directly—no extra storefront availability calls required.

---

## 6. Troubleshooting checklist

- **Snapshot looks stale:** Re-fetch `.../stock-reconciliation/` with the latest `product_id`. The response is cache-friendly but not cached server-side; if values still lag, confirm the corresponding backend signals (transfers, adjustments, sales) actually completed.
- **User reports stale UI:** Ask them to click the modal’s “Refresh snapshot” button (wired directly to the reconciliation endpoint). If the API still returns old data, capture the raw JSON and send it to the backend team.
- **Reservations never clear:** The reconciliation endpoint mirrors `StockReservation` rows. Make sure the POS is calling `POST /sales/api/sales/<sale_id>/complete/` or `.../abandon/`; otherwise reservations stay `ACTIVE` and the snapshot correctly reports them as holds.
- **Baseline delta non-zero:** That means the backend sees imbalance between expected and recorded units. Surface the warning in the UI (already handled) and loop in inventory ops—there is nothing extra the front end should compute.
- **Need deeper storefront detail:** Use `snapshot.storefront.entries` first. Fall back to `GET /inventory/api/storefronts/<storefront_id>/stock-products/<product_id>/availability/` only when you need reservation drill-down beyond what the reconciliation payload already includes.
- **Verifying raw math:** Cross-check against `/inventory/api/transfers/` or `/sales/api/sales/` only for forensic debugging; the modal should continue trusting the reconciliation numbers so the math stays consistent system-wide.

Ping the backend channel if the reconciliation contract changes—the goal is to keep the frontend free from bespoke aggregation.
