# Sales History Filtering Analysis & Implementation Plan

**Date**: October 14, 2025  
**Component**: `SalesHistory.tsx`  
**Status**: 🎯 Analysis Complete - Ready for Implementation

---

## 🔍 Current State Analysis

### Existing Filters (Already Implemented) ✅

The Sales History page **already has excellent filtering**:

1. **Search** - Receipt #, customer, or amount
2. **Status** - COMPLETED, CANCELLED, REFUNDED, DRAFT
3. **Storefront** - Filter by specific store location
4. **Date Range** - Today, Yesterday, This Week, This Month, Last 30 Days, This Year, Custom Range
5. **Payment Method** - CASH, CARD, MOBILE, CREDIT, SPLIT

### Current Implementation

```typescript
// Sales API endpoint
GET /sales/api/sales/
  ?search={query}           ← Already implemented ✅
  &status={status}          ← Already implemented ✅
  &storefront={uuid}        ← Already implemented ✅
  &date_from={date}         ← Already implemented ✅
  &date_to={date}           ← Already implemented ✅
  &payment_type={type}      ← Already implemented ✅
  &page={number}            ← Already implemented ✅
  &page_size={number}       ← Already implemented ✅
```

---

## 🎯 Missing Filters - Priority Analysis

### ⭐ **HIGH PRIORITY: Product Filter** (Your Request)

**Why it's needed:**
- Find all sales that include a specific product
- Track product performance over time
- Identify which customers buy certain products
- Analyze product sales trends

**User Stories:**
1. "Show me all sales that included Sugar 1kg"
2. "Which customers bought Rice this month?"
3. "How many units of Product X sold this week?"

**Backend Requirement:**
```
GET /sales/api/sales/?product={product_id}
GET /sales/api/sales/?product_name={query}  ← More user-friendly
```

Returns sales that contain the specified product in their line_items.

---

### 🔥 **HIGH PRIORITY: Customer Filter**

**Why it's needed:**
- View purchase history for a specific customer
- Analyze customer buying patterns
- Check credit sales for a customer
- Customer service queries

**User Stories:**
1. "Show me all of John Doe's purchases"
2. "What did this customer buy last month?"
3. "Check this customer's credit balance"

**Backend Requirement:**
```
GET /sales/api/sales/?customer={customer_id}
GET /sales/api/sales/?customer_name={query}
```

---

### 🔥 **HIGH PRIORITY: Amount Range Filter**

**Why it's needed:**
- Find high-value transactions
- Identify small vs large sales
- Fraud detection (unusually large sales)
- Revenue analysis by transaction size

**User Stories:**
1. "Show me all sales over GH₵1000"
2. "Find transactions between GH₵50 and GH₵200"
3. "List all sales under GH₵10"

**Backend Requirement:**
```
GET /sales/api/sales/?min_amount={amount}
GET /sales/api/sales/?max_amount={amount}
```

---

### 📊 **MEDIUM PRIORITY: Category Filter**

**Why it's needed:**
- Analyze sales by product category
- Track category performance
- Seasonal category trends

**User Stories:**
1. "Show me all Food sales this month"
2. "How much did we sell in Beverages?"
3. "Compare Electronics vs Accessories sales"

**Backend Requirement:**
```
GET /sales/api/sales/?category={category_id}
```

Returns sales containing products from the specified category.

---

### 📊 **MEDIUM PRIORITY: Cashier/User Filter**

**Why it's needed:**
- Track individual employee performance
- Audit specific cashier's sales
- Identify training needs
- Commission calculations

**User Stories:**
1. "Show me all sales by Employee A"
2. "How much did John sell today?"
3. "Which cashier processed this transaction?"

**Already available:**
```
GET /sales/api/sales/?user={user_id}  ← May already exist
```

---

### 📈 **LOW PRIORITY: Discount Filter**

**Why it's needed:**
- Track discounted sales
- Monitor discount abuse
- Promotional campaign analysis

**User Stories:**
1. "Show me all sales with discounts"
2. "Find sales with >20% discount"
3. "Track promotional campaign sales"

**Backend Requirement:**
```
GET /sales/api/sales/?has_discount=true
GET /sales/api/sales/?min_discount={amount}
```

---

### 📈 **LOW PRIORITY: Credit Status Filter**

**Why it's needed:**
- Track outstanding credit
- Find fully paid credit sales
- Credit collection management

**User Stories:**
1. "Show me all credit sales with outstanding balance"
2. "Find fully paid credit transactions"
3. "Credit sales due this week"

**Backend Requirement:**
```
GET /sales/api/sales/?credit_status=OUTSTANDING
GET /sales/api/sales/?credit_status=PAID
GET /sales/api/sales/?amount_due_gt=0
```

---

## 🎨 Recommended Implementation Order

### Phase 1: Core Filters (Must Have) 🔥

1. **Product Filter** ⭐ (Your request)
   - UI: Autocomplete search for product
   - Backend: `?product={product_id}` or `?product_name={query}`
   - Time: 6 hours (3 backend + 3 frontend)

2. **Customer Filter** 🔥
   - UI: Autocomplete search for customer
   - Backend: `?customer={customer_id}` or `?customer_name={query}`
   - Time: 5 hours (2 backend + 3 frontend)

3. **Amount Range Filter** 🔥
   - UI: Min/Max amount inputs
   - Backend: `?min_amount={amount}&max_amount={amount}`
   - Time: 4 hours (2 backend + 2 frontend)

**Phase 1 Total**: ~15 hours

---

### Phase 2: Analytics Filters (Nice to Have) 📊

4. **Category Filter**
   - UI: Dropdown selector
   - Backend: `?category={category_id}`
   - Time: 5 hours (3 backend + 2 frontend)

5. **Cashier Filter**
   - UI: Dropdown of employees
   - Backend: `?user={user_id}` (may already exist)
   - Time: 3 hours (1 backend + 2 frontend)

**Phase 2 Total**: ~8 hours

---

### Phase 3: Advanced Filters (Future Enhancement) 📈

6. **Discount Filter**
7. **Credit Status Filter**
8. **Storefront Group Filter** (for multi-location businesses)

**Phase 3 Total**: ~10 hours

---

## 💡 UI/UX Design Recommendations

### Current Filter Layout (Good!)

```
Row 1: [Search] [Status] [Storefront] [Payment] [Date Range] [Actions]
Row 2 (if custom date): [Date From] [Date To] [Apply]
```

### Proposed Enhanced Layout

```
Row 1: [Search] [Status] [Storefront] [Payment] [Date Range]
Row 2: [Product Search] [Customer Search] [Min Amount] [Max Amount] [Advanced ▼]
Row 3: [Actions: Refresh | Export | Clear Filters]

// Advanced Filters (Collapsible)
Row 4 (collapsed): [Category] [Cashier] [Discount] [Credit Status]
```

### Alternative: Filter Panel Approach

```
┌─────────────────────────────────────────────────────────┐
│ Filters ▼                        [Clear All] [Apply]    │
├─────────────────────────────────────────────────────────┤
│ Basic Filters:                                          │
│ [Search Receipt/Customer/Amount........................]│
│ [Status ▼] [Storefront ▼] [Payment ▼] [Date Range ▼]  │
│                                                          │
│ Product & Customer:                                      │
│ [Search Products...] [Search Customers...]              │
│                                                          │
│ Amount Range:                                            │
│ [Min: GH₵____] [Max: GH₵____]                          │
│                                                          │
│ Advanced (click to expand) ▶                            │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Frontend Implementation

### 1. Product Filter Component

```tsx
// Add state
const [selectedProduct, setSelectedProduct] = useState<{id: UUID; name: string} | null>(null)
const [productSearchQuery, setProductSearchQuery] = useState('')
const [productSuggestions, setProductSuggestions] = useState<Product[]>([])

// Add product autocomplete
const searchProducts = async (query: string) => {
  if (query.length < 2) {
    setProductSuggestions([])
    return
  }
  
  try {
    const response = await httpClient.get('/inventory/api/products/', {
      params: { search: query, page_size: 10 }
    })
    setProductSuggestions(response.data.results || [])
  } catch (err) {
    console.error('Failed to search products', err)
  }
}

// Add to filters
const handleProductSelect = (product: {id: UUID; name: string}) => {
  setSelectedProduct(product)
  dispatch(setSalesPage(1))
  dispatch(setSalesFilters({ product: product.id }))
}

// UI Component
<Col md={3}>
  <InputGroup size="sm">
    <InputGroup.Text>📦</InputGroup.Text>
    <Form.Control
      placeholder="Filter by product..."
      value={productSearchQuery}
      onChange={(e) => {
        setProductSearchQuery(e.target.value)
        searchProducts(e.target.value)
      }}
      list="product-suggestions"
    />
    {selectedProduct && (
      <Button
        variant="outline-secondary"
        size="sm"
        onClick={() => {
          setSelectedProduct(null)
          setProductSearchQuery('')
          dispatch(setSalesFilters({ product: undefined }))
        }}
        title="Clear product filter"
      >
        ✖
      </Button>
    )}
  </InputGroup>
  
  {/* Suggestions dropdown */}
  {productSuggestions.length > 0 && (
    <ListGroup style={{ position: 'absolute', zIndex: 1000, width: '100%' }}>
      {productSuggestions.map((product) => (
        <ListGroup.Item
          key={product.id}
          action
          onClick={() => {
            handleProductSelect({ id: product.id, name: product.name })
            setProductSuggestions([])
          }}
        >
          {product.name} <small className="text-muted">({product.sku})</small>
        </ListGroup.Item>
      ))}
    </ListGroup>
  )}
</Col>
```

### 2. Customer Filter Component

```tsx
// Similar autocomplete pattern as product filter
<Col md={3}>
  <InputGroup size="sm">
    <InputGroup.Text>👤</InputGroup.Text>
    <Form.Control
      placeholder="Filter by customer..."
      value={customerSearchQuery}
      onChange={(e) => {
        setCustomerSearchQuery(e.target.value)
        searchCustomers(e.target.value)
      }}
    />
  </InputGroup>
</Col>
```

### 3. Amount Range Filter

```tsx
<Col md={2}>
  <Form.Control
    type="number"
    size="sm"
    placeholder="Min amount"
    value={minAmount}
    onChange={(e) => {
      setMinAmount(e.target.value)
      dispatch(setSalesFilters({ min_amount: e.target.value || undefined }))
    }}
  />
</Col>
<Col md={2}>
  <Form.Control
    type="number"
    size="sm"
    placeholder="Max amount"
    value={maxAmount}
    onChange={(e) => {
      setMaxAmount(e.target.value)
      dispatch(setSalesFilters({ max_amount: e.target.value || undefined }))
    }}
  />
</Col>
```

---

## 📝 Backend Requirements Document

### For Backend Team

**New Query Parameters Needed:**

```python
# In sales/views.py - SaleViewSet

class SaleViewSet(viewsets.ModelViewSet):
    
    def get_queryset(self):
        queryset = Sale.objects.all()
        
        # ... existing filters ...
        
        # ✨ NEW: Product filter
        product_id = self.request.query_params.get('product')
        product_name = self.request.query_params.get('product_name')
        
        if product_id:
            queryset = queryset.filter(
                line_items__product_id=product_id
            ).distinct()
        
        if product_name:
            queryset = queryset.filter(
                line_items__product__name__icontains=product_name
            ).distinct()
        
        # ✨ NEW: Customer filter
        customer_id = self.request.query_params.get('customer')
        customer_name = self.request.query_params.get('customer_name')
        
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        
        if customer_name:
            queryset = queryset.filter(
                customer__name__icontains=customer_name
            ).distinct()
        
        # ✨ NEW: Amount range filter
        min_amount = self.request.query_params.get('min_amount')
        max_amount = self.request.query_params.get('max_amount')
        
        if min_amount:
            queryset = queryset.filter(total_amount__gte=min_amount)
        
        if max_amount:
            queryset = queryset.filter(total_amount__lte=max_amount)
        
        # ✨ NEW: Category filter
        category_id = self.request.query_params.get('category')
        
        if category_id:
            queryset = queryset.filter(
                line_items__product__category_id=category_id
            ).distinct()
        
        # ✨ NEW: Cashier/User filter (may already exist)
        user_id = self.request.query_params.get('user')
        
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        return queryset
```

**Database Indexes Needed:**

```python
# Add to Sale model or create migration

class Sale(models.Model):
    # ... existing fields ...
    
    class Meta:
        indexes = [
            models.Index(fields=['customer']),
            models.Index(fields=['total_amount']),
            models.Index(fields=['user']),
            models.Index(fields=['created_at', 'status']),
        ]

# For SaleLineItem model
class SaleLineItem(models.Model):
    # ... existing fields ...
    
    class Meta:
        indexes = [
            models.Index(fields=['product']),
            models.Index(fields=['sale', 'product']),
        ]
```

---

## ✅ Implementation Checklist

### Phase 1: Product Filter (Priority 1)

#### Backend
- [ ] Add `product` parameter to sales queryset filter
- [ ] Add `product_name` parameter for name-based search
- [ ] Add database index on `sale_line_items.product_id`
- [ ] Test with curl/Postman
- [ ] Write unit tests
- [ ] Deploy to staging

#### Frontend
- [ ] Add product search state management
- [ ] Create product autocomplete component
- [ ] Integrate with sales filters
- [ ] Add to active filters display
- [ ] Add clear button functionality
- [ ] Test autocomplete performance
- [ ] Test filter functionality
- [ ] Update documentation

---

### Phase 1: Customer Filter (Priority 2)

#### Backend
- [ ] Add `customer` parameter to sales queryset filter
- [ ] Add `customer_name` parameter for name-based search
- [ ] Add database index on `sales.customer_id`
- [ ] Test with curl/Postman
- [ ] Write unit tests
- [ ] Deploy to staging

#### Frontend
- [ ] Add customer search state management
- [ ] Create customer autocomplete component
- [ ] Integrate with sales filters
- [ ] Add to active filters display
- [ ] Test functionality

---

### Phase 1: Amount Range Filter (Priority 3)

#### Backend
- [ ] Add `min_amount` parameter
- [ ] Add `max_amount` parameter
- [ ] Add database index on `sales.total_amount`
- [ ] Test edge cases (negative, zero, very large)
- [ ] Write unit tests
- [ ] Deploy to staging

#### Frontend
- [ ] Add min/max amount state
- [ ] Create amount range inputs
- [ ] Add validation (min <= max)
- [ ] Integrate with sales filters
- [ ] Add to active filters display
- [ ] Test with various amounts

---

## 🧪 Testing Plan

### Backend Tests

```python
def test_filter_by_product():
    """Test filtering sales by product"""
    response = client.get('/sales/api/sales/', {'product': product.id})
    assert all(
        sale.line_items.filter(product=product).exists()
        for sale in response.data['results']
    )

def test_filter_by_product_name():
    """Test filtering sales by product name"""
    response = client.get('/sales/api/sales/', {'product_name': 'Sugar'})
    assert all(
        any('sugar' in item.product.name.lower() for item in sale.line_items.all())
        for sale in response.data['results']
    )

def test_filter_by_amount_range():
    """Test filtering sales by amount range"""
    response = client.get('/sales/api/sales/', {
        'min_amount': 50,
        'max_amount': 200
    })
    assert all(
        50 <= sale.total_amount <= 200
        for sale in response.data['results']
    )
```

### Frontend Tests

```typescript
describe('SalesHistory - Advanced Filters', () => {
  it('should filter by product', async () => {
    // Select product from autocomplete
    // Verify sales list updates
    // Verify active filter badge appears
  })
  
  it('should filter by amount range', async () => {
    // Enter min and max amounts
    // Verify sales within range
  })
  
  it('should combine multiple filters', async () => {
    // Apply product + date + amount filters
    // Verify all filters work together
  })
})
```

---

## 📊 Success Metrics

After implementation, verify:

- ✅ Product filter returns only sales containing that product
- ✅ Customer filter shows only that customer's purchases
- ✅ Amount range filter works with min, max, or both
- ✅ Filters combine correctly (product + date + amount, etc.)
- ✅ Active filters display accurately
- ✅ Clear filters resets all new filters
- ✅ Export CSV includes filtered results
- ✅ Page load time < 500ms with filters
- ✅ UI remains responsive with autocomplete
- ✅ No memory leaks from suggestions

---

## 📞 Next Steps

1. **Review this analysis** - Confirm priorities
2. **Backend Team** - Implement Phase 1 filters
3. **Frontend Team** - Prepare UI components
4. **Schedule** - Coordinate integration testing
5. **Deploy** - Phase 1 to staging, then production

**Estimated Total Time**: 15 hours (Phase 1) + 8 hours (Phase 2) = 23 hours

---

**Questions or adjustments needed?** Let's discuss before starting implementation!
