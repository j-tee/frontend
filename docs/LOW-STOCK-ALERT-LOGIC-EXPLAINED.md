# Low Stock Alert System - Logic & Determinants Explained

## Date: October 16, 2025

---

## Overview

The Low Stock Alert system uses **sales velocity analysis** combined with **current stock levels** to predict when products will run out and determine urgency levels.

---

## Core Determinants of Low Stock

### 1. **Sales Velocity (Average Daily Sales)**

**What it is:**
- The average number of units sold per day over the last 30 days
- Calculated from COMPLETED and PARTIAL sales only (DRAFT sales excluded)

**How it's calculated:**
```python
# Get all sales from last 30 days
thirty_days_ago = timezone.now().date() - timedelta(days=30)

sales_velocity = SaleItem.objects.filter(
    sale__created_at__date__gte=thirty_days_ago,
    sale__status__in=['COMPLETED', 'PARTIAL']
).values('product').annotate(
    total_sold=Sum('quantity')
)

# For each product:
total_sold_30days = 150  # Example: 150 units sold in 30 days
avg_daily_sales = total_sold_30days / 30.0
# Result: 5.0 units per day average
```

**Example:**
- Product A sold 150 units in the last 30 days
- Average daily sales = 150 ÷ 30 = **5 units per day**

---

### 2. **Days Until Stockout**

**What it is:**
- Predicted number of days before the product runs out of stock
- Based on current stock and sales velocity

**How it's calculated:**
```python
current_stock = 30  # Current quantity on hand
avg_daily_sales = 5.0  # Units sold per day

if avg_daily_sales > 0:
    days_until_stockout = current_stock / avg_daily_sales
    # Result: 30 ÷ 5 = 6.0 days
else:
    days_until_stockout = 999  # No recent sales, not urgent
```

**Examples:**

| Current Stock | Daily Sales | Days Until Stockout |
|---------------|-------------|---------------------|
| 30 units | 5/day | 6.0 days |
| 100 units | 10/day | 10.0 days |
| 15 units | 3/day | 5.0 days |
| 50 units | 0/day | 999 (no urgency) |

---

### 3. **Urgency Levels (Critical / Warning / Watch)**

The system categorizes alerts into three urgency levels based on **days until stockout** and **absolute quantity**.

#### **🔴 CRITICAL (Red Alert)**

**Conditions:**
```python
if days_until_stockout < 5 OR current_stock < 5:
    urgency = 'critical'
```

**What it means:**
- **Option 1:** Will run out in less than 5 days
- **Option 2:** Less than 5 units in stock (even if no sales)

**Examples:**
- 20 units, selling 5/day → 4 days until stockout → **CRITICAL**
- 3 units, selling 1/day → Below 5 units → **CRITICAL**
- 4 units, no sales → Below 5 units → **CRITICAL**

**Action Required:**
- Immediate ordering needed
- May need emergency supplier contact
- Risk of stockout is imminent

---

#### **🟠 WARNING (Amber/Orange Alert)**

**Conditions:**
```python
elif days_until_stockout < 14:
    urgency = 'warning'
```

**What it means:**
- Will run out in 5-14 days
- Still above 5 units (otherwise would be critical)

**Examples:**
- 50 units, selling 5/day → 10 days until stockout → **WARNING**
- 40 units, selling 3/day → 13.3 days until stockout → **WARNING**
- 70 units, selling 10/day → 7 days until stockout → **WARNING**

**Action Required:**
- Order soon (within this week)
- Standard procurement process
- Monitor daily

---

#### **🟡 WATCH (Yellow/Blue Alert)**

**Conditions:**
```python
elif days_until_stockout < days_threshold:  # default threshold = 30
    urgency = 'watch'
```

**What it means:**
- Will run out in 14-30 days (configurable)
- Not immediately urgent but on the radar

**Examples:**
- 100 units, selling 5/day → 20 days until stockout → **WATCH**
- 80 units, selling 3/day → 26.7 days until stockout → **WATCH**
- 150 units, selling 10/day → 15 days until stockout → **WATCH**

**Action Required:**
- Plan ahead
- Include in next regular order
- Keep monitoring

---

#### **✅ NO ALERT**

**Conditions:**
```python
else:
    continue  # Not included in low stock alerts
```

**What it means:**
- More than 30 days of stock (default threshold)
- Well-stocked, no action needed

**Examples:**
- 200 units, selling 5/day → 40 days → **NO ALERT**
- 500 units, selling 10/day → 50 days → **NO ALERT**
- Any quantity, no sales → 999 days → **NO ALERT**

---

## 4. **Reorder Point (Threshold)**

**What it is:**
- The stock level that triggers a reorder
- Currently simplified to **20 units** for all products

**How it's used:**
```python
reorder_point = 20  # Simplified, could be product-specific

# Displayed in the alerts table for reference
# Helps users know the target minimum stock level
```

**Future Enhancement:**
- Make product-specific (add `reorder_point` field to Product/StockProduct)
- Consider different reorder points for different categories
- Factor in supplier lead times

---

## 5. **Recommended Order Quantity**

**What it is:**
- Suggested quantity to order to replenish stock
- Based on future demand + safety stock

**How it's calculated:**
```python
# Order enough for 30 days + 10 days safety stock
days_to_cover = 40

if avg_daily_sales > 0:
    recommended_qty = (avg_daily_sales * 40) - current_stock
    recommended_qty = max(recommended_qty, 10)  # Minimum 10 units
else:
    recommended_qty = 50  # Default if no sales data
```

**Example Calculations:**

| Current Stock | Daily Sales | Calculation | Recommended Qty |
|---------------|-------------|-------------|-----------------|
| 30 units | 5/day | (5 × 40) - 30 = 170 | 170 units |
| 50 units | 10/day | (10 × 40) - 50 = 350 | 350 units |
| 100 units | 3/day | (3 × 40) - 100 = 20 | 20 units |
| 5 units | 0/day | No sales → default | 50 units |

**Why 40 days?**
- 30 days = One month of normal demand
- 10 days = Safety stock buffer
- Total = 40 days of coverage

---

## 6. **Estimated Restock Cost**

**What it is:**
- Total cost to reorder the recommended quantity
- Based on unit cost from inventory

**How it's calculated:**
```python
unit_cost = 25.00  # From StockProduct.unit_cost
recommended_qty = 170

estimated_cost = unit_cost * recommended_qty
# Result: $25.00 × 170 = $4,250.00
```

**Used for:**
- Budget planning
- Prioritizing high-value reorders
- Total restock cost summary

---

## 7. **Supplier Lead Time & Suggested Order Date**

### **Lead Time**
**What it is:**
- Number of days from placing order to receiving stock
- Currently defaults to **7 days** (can be supplier-specific)

```python
lead_time_days = 7  # Default
# Future: could pull from Supplier.lead_time_days field
```

### **Suggested Order Date**
**What it is:**
- When you should place the order to avoid stockout

**How it's calculated:**
```python
if urgency == 'critical':
    # Order TODAY - it's already urgent
    suggested_order_date = timezone.now().date()
else:
    # Order when: (stockout_date - lead_time)
    days_before_order = max(0, days_until_stockout - lead_time_days)
    suggested_order_date = timezone.now().date() + timedelta(days=days_before_order)
```

**Examples:**

| Urgency | Days Until Stockout | Lead Time | Suggested Order Date |
|---------|---------------------|-----------|----------------------|
| Critical | 3 days | 7 days | **TODAY** (already late!) |
| Warning | 10 days | 7 days | In 3 days (10 - 7) |
| Watch | 20 days | 7 days | In 13 days (20 - 7) |

---

## Complete Example Walkthrough

### **Scenario: Product "Widget A"**

**Current Data:**
- Current stock: 30 units
- Last 30 days sales: 150 units
- Unit cost: $25.00
- Supplier lead time: 7 days
- Reorder point: 20 units

**Step 1: Calculate Sales Velocity**
```
Average daily sales = 150 ÷ 30 = 5 units/day
```

**Step 2: Calculate Days Until Stockout**
```
Days until stockout = 30 ÷ 5 = 6 days
```

**Step 3: Determine Urgency**
```
6 days < 14 days → WARNING level
(Not critical because still > 5 units and > 5 days)
```

**Step 4: Calculate Recommended Order Quantity**
```
Recommended = (5 units/day × 40 days) - 30 units
            = 200 - 30
            = 170 units
```

**Step 5: Calculate Estimated Cost**
```
Estimated cost = $25.00 × 170 units = $4,250.00
```

**Step 6: Calculate Suggested Order Date**
```
Days before order = 6 days - 7 days = -1 (negative!)
→ Order TODAY or ASAP
(Because lead time is longer than days until stockout)
```

**Result Alert:**
```json
{
  "product_name": "Widget A",
  "current_stock": 30,
  "urgency": "warning",
  "days_until_stockout": 6.0,
  "average_daily_sales": 5.0,
  "reorder_quantity": 170,
  "estimated_cost": "$4,250.00",
  "suggested_order_date": "2025-10-16"  // TODAY
}
```

---

## Visual Decision Tree

```
START
  ↓
Check Current Stock & Sales Velocity
  ↓
Calculate: days_until_stockout = current_stock ÷ avg_daily_sales
  ↓
┌─────────────────────────────────────────┐
│ Is current_stock < 5 units?             │
│ OR days_until_stockout < 5 days?        │
└─────────────────────────────────────────┘
         YES ↓                    NO ↓
    🔴 CRITICAL            ┌──────────────────────────┐
    Order TODAY!          │ days_until_stockout < 14? │
                          └──────────────────────────┘
                              YES ↓           NO ↓
                          🟠 WARNING      ┌─────────────────────────────┐
                          Order soon      │ days_until_stockout < 30?   │
                                          └─────────────────────────────┘
                                              YES ↓           NO ↓
                                          🟡 WATCH         ✅ NO ALERT
                                          Plan ahead      Well-stocked
```

---

## Key Thresholds Summary

| Threshold | Value | Purpose |
|-----------|-------|---------|
| **Critical Days** | < 5 days | Immediate action needed |
| **Critical Units** | < 5 units | Absolute minimum stock |
| **Warning Days** | 5-14 days | Order within this week |
| **Watch Days** | 14-30 days | Monitor and plan |
| **Sales Period** | 30 days | Historical data window |
| **Coverage Days** | 40 days | Order quantity calculation (30 + 10 buffer) |
| **Default Lead Time** | 7 days | Supplier delivery time |
| **Min Order Qty** | 10 units | Minimum reorder quantity |
| **Default Reorder** | 50 units | When no sales data |
| **Reorder Point** | 20 units | Target minimum stock |

---

## Special Cases

### **Case 1: No Recent Sales (avg_daily_sales = 0)**
```python
if avg_daily_sales == 0:
    days_until_stockout = 999  # Not urgent
    # Product won't appear in alerts (> 30 day threshold)
    # Recommended order = 50 units (default)
```

**Why?**
- No demand pattern to predict stockout
- Product might be seasonal, new, or slow-moving
- Not a priority for restocking

---

### **Case 2: Very High Sales Velocity**
```python
current_stock = 100 units
avg_daily_sales = 50 units/day
days_until_stockout = 100 ÷ 50 = 2 days
urgency = 'critical'  # < 5 days
```

**Result:**
- Immediate critical alert
- Large recommended order quantity
- High estimated cost
- Order date = TODAY

---

### **Case 3: Slow-Moving with Low Stock**
```python
current_stock = 3 units
avg_daily_sales = 0.5 units/day
days_until_stockout = 3 ÷ 0.5 = 6 days
urgency = 'critical'  # < 5 units (absolute threshold)
```

**Result:**
- Critical alert due to low absolute quantity
- Even though has 6 days of stock
- Safety measure to maintain minimum inventory

---

## Configurable Parameters

These can be adjusted based on business needs:

```python
# In the API request:
GET /reports/api/inventory/low-stock-alerts/?days_threshold=45

# Adjustable parameters:
days_threshold = 30        # Default watch threshold (can be 14, 30, 45, 60)
critical_days = 5          # Days for critical level
critical_units = 5         # Absolute minimum stock
warning_days = 14          # Days for warning level
coverage_days = 40         # Order quantity coverage (30 + 10 buffer)
safety_buffer = 10         # Extra days in order quantity
min_order_qty = 10         # Minimum order quantity
default_order_qty = 50     # When no sales data
```

---

## Business Logic Benefits

### **Proactive Inventory Management**
- Predicts stockouts before they happen
- Considers actual demand patterns
- Accounts for supplier lead times

### **Data-Driven Decisions**
- Based on real sales history (30 days)
- Calculates optimal order quantities
- Provides cost estimates

### **Prioritization**
- Critical alerts demand immediate attention
- Warning alerts need action this week
- Watch alerts for planning ahead

### **Efficiency**
- Reduces emergency orders
- Optimizes inventory levels
- Minimizes stockout risks

---

## Future Enhancements

### **1. Seasonal Adjustments**
```python
# Adjust for seasonal patterns
if is_holiday_season:
    avg_daily_sales *= 1.5  # 50% increase expected
```

### **2. Product-Specific Reorder Points**
```python
# Pull from product configuration
reorder_point = product.minimum_stock_level or 20
```

### **3. Supplier-Specific Lead Times**
```python
# Use actual supplier data
lead_time_days = stock.supplier.lead_time_days or 7
```

### **4. ABC Analysis Integration**
```python
# Prioritize high-value/high-turnover items
if product.category == 'A':  # High priority
    critical_threshold = 7  # More buffer time
```

### **5. Machine Learning Predictions**
```python
# Use ML for better demand forecasting
predicted_sales = ml_model.predict(product, next_30_days)
```

---

## Conclusion

The Low Stock Alert system uses a **scientific, data-driven approach** to inventory management:

1. **Analyzes** actual sales velocity (30-day average)
2. **Predicts** when stockouts will occur
3. **Categorizes** urgency (Critical/Warning/Watch)
4. **Recommends** optimal order quantities
5. **Estimates** restock costs
6. **Suggests** when to place orders

This ensures you're **proactive** rather than **reactive** in managing inventory, reducing stockouts while optimizing cash flow.

---

**Documentation:** GitHub Copilot  
**Date:** October 16, 2025  
**Purpose:** Educational reference for Low Stock Alert logic
