# Backend Request: Product Pagination

## Background

- The frontend inventory catalog currently fetches products via `GET /inventory/api/products/`.
- Responses may be unpaginated arrays or paginated payloads depending on backend settings (`PaginatedResponse<T>` shape described in `src/types/common.ts`).
- We need consistent server-side pagination to handle large catalogs without loading every product client-side.

## Frontend Requirements

1. **Stable Paginated Contract**
   - Always return the `PaginatedResponse<Product>` structure:
     ```json
     {
       "count": 120,
       "next": "http://api.example.com/inventory/api/products/?page=3&page_size=25",
       "previous": "http://api.example.com/inventory/api/products/?page=1&page_size=25",
       "results": [
         {
           "id": "UUID",
           "name": "...",
           "sku": "...",
           "category": "UUID",
           "unit": "string",
           "description": "string | null",
           "is_active": true,
           "category_name": "string | null",
           "created_at": "ISO timestamp",
           "updated_at": "ISO timestamp"
         }
       ]
     }
     ```
   - `next`/`previous` can be `null` when there is no subsequent or prior page.
   - `count` must reflect the total number of products matching the current filters.

2. **Query Parameters**
   - Accept `page` (1-indexed integer) and `page_size` (integer).
   - Default `page_size` suggested: 25. Allow frontend to request alternative sizes (e.g., 10, 25, 50, 100) within sensible limits.
   - Existing filter parameters (e.g., `search`, `category`, `is_active`) should remain compatible with pagination. Include any additional filters in the response docs if supported.

3. **Ordering**
   - Provide a deterministic default order; alphabetical by product `name` is preferred.
   - Support optional `ordering` query parameter (e.g., `ordering=name`, `ordering=-created_at`) if feasible. If not, confirm the default ordering so the frontend can align UI hints.

4. **Performance Considerations**
   - Ensure pagination queries are indexed appropriately (e.g., indexes on `name`, `sku`, `is_active`, `category`).
   - Include `select_related`/`prefetch_related` as needed to surface `category_name` without N+1 queries.

5. **Error Handling**
   - For invalid `page` or `page_size`, return `400` with a descriptive payload (e.g., `{ "page": ["Page number is out of range."] }`).
   - Maintain the existing validation structure so the frontend can display inline messages.

6. **Rate Limits & Throttling**
   - If throttling applies, note the limits so we can plan UI retries/backoff.

## Frontend Implementation Plan (Pending Backend Confirmation)

1. Update `inventoryService.fetchProducts` to always expect a `PaginatedResponse<Product>`.
2. Store pagination metadata (`count`, `next`, `previous`) in the inventory slice and expose selectors for product totals and current page.
3. Add controls in `InventoryPage` for page navigation and page-size selection.
4. Ensure filters/search dispatch the appropriate query params and reset pagination to page 1.

## Questions for Backend

1. Can we standardize on `page` and `page_size` as the param names? If different, specify the expected keys.
2. What maximum `page_size` should the frontend respect? (e.g., 100)
3. Are there existing filter params (search by `sku`/`name`, `is_active`, category slug) we should continue to support? Provide the supported list for documentation.
4. Will ordering options be exposed? If so, list allowed fields/directions.
5. Any authentication or business scoping constraints that affect pagination metadata (e.g., count limited to active business context)?

## Next Steps

- Await backend confirmation on the API contract and any additional requirements.
- Once confirmed, we will implement the Redux/store updates and UI pagination controls accordingly.
