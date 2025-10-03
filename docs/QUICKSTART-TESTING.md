# 🚀 Quick Start - Test the Sales Feature NOW

**Time to test:** 5 minutes  
**Status:** ✅ Everything is ready!

---

## Step 1: Start the Servers (30 seconds)

### Backend
```bash
cd ~/Documents/Projects/pos/backend  # Or your backend directory
python manage.py runserver
```

**Expected:** Server running on `http://localhost:8000`

### Frontend  
```bash
cd ~/Documents/Projects/pos/frontend
npm run dev  # or npm start
```

**Expected:** Dev server running on `http://localhost:5173` (or 3000)

---

## Step 2: Login (15 seconds)

1. Open browser: `http://localhost:5173`
2. Click "Login"
3. Enter credentials:
   - **Username:** [your test user]
   - **Password:** [your password]
4. Click "Sign In"

**Expected:** Redirected to Dashboard

---

## Step 3: Test Product Search (1 minute)

1. **Navigate to Sales:**
   - Click "Sales" in sidebar
   
2. **Select Storefront:**
   - Dropdown shows your storefronts
   - Select one
   
3. **Search Products:**
   - Type "milk" in search bar (🔍 icon)
   - Wait 300ms
   
**You should see:**
- ✅ Product grid with images
- ✅ Green/yellow/red stock badges
- ✅ Prices displayed
- ✅ "Add to Cart" buttons

4. **Click "Add to Cart" on any product**

**You should see:**
- ✅ Item appears in right panel
- ✅ Quantity: 1
- ✅ Price shown
- ✅ Total calculated

---

## Step 4: Test Cart Management (1 minute)

1. **Edit Quantity:**
   - Click on quantity value (shows input)
   - Change to 3
   - Press Enter
   
**You should see:**
- ✅ Quantity updates to 3
- ✅ Total price = 3 × unit price
- ✅ Cart total updates

2. **Apply Discount:**
   - Enter "10" in discount % field
   - Tab out
   
**You should see:**
- ✅ Discount amount shown in green
- ✅ Total reduced by 10%

3. **Remove Item:**
   - Click ✕ button
   - Confirm dialog
   
**You should see:**
- ✅ Item removed from cart
- ✅ Totals recalculated

---

## Step 5: Test Checkout (1 minute)

1. **Add some items to cart again**
2. **Click "Proceed to Checkout"**
3. **Payment Panel appears:**
   - Select "Cash"
   - Enter amount (e.g., 100)
   - See change calculated
   
4. **Click "Complete Sale"**

**You should see:**
- ✅ Loading spinner
- ✅ Success message
- ✅ Receipt number displayed
- ✅ Cart clears
- ✅ New sale starts

---

## Step 6: Test Barcode Scanner (30 seconds)

1. **Focus on barcode input** (📷 icon)
2. **Enter barcode:** `1234567890123` (or any valid barcode)
3. **Press Enter or click "Scan"**

**You should see:**
- ✅ Product found (if barcode exists)
- ✅ Auto-added to cart
- ✅ Or error if not found

---

## ✅ Success Checklist

If all these worked, Phase 1 is **COMPLETE**:

- [x] Can search products
- [x] Can add to cart  
- [x] Can edit quantities
- [x] Can apply discounts
- [x] Can remove items
- [x] Can checkout
- [x] Can scan barcodes
- [x] Stock indicators work
- [x] Totals calculate correctly

---

## 🐛 Common Issues

### "No products found"
**Fix:** Make sure products exist in database
```bash
# Check products
curl http://localhost:8000/inventory/api/products/
```

### "Authentication failed"
**Fix:** Check token in localStorage
```javascript
// In browser console
localStorage.getItem('token')
```

### "Sale creation failed"
**Fix:** Check storefront exists
```bash
# Check storefronts  
curl -H "Authorization: Token YOUR_TOKEN" \
  http://localhost:8000/inventory/api/storefronts/
```

### "Stock not available"
**Fix:** Check stock exists at selected storefront
```bash
# Check stock
curl http://localhost:8000/inventory/api/stock-products/?storefront=STOREFRONT_ID
```

---

## 📊 Test Data Setup (if needed)

If you don't have test data:

### Create Products (Django Shell)
```python
python manage.py shell

from inventory.models import Product, Category
from sales.models import Customer

# Create category
cat = Category.objects.create(name="Groceries")

# Create products
Product.objects.create(
    name="Fresh Milk",
    sku="MILK001",
    barcode="1234567890123",
    category=cat,
    unit="Liters"
)

Product.objects.create(
    name="Bread",
    sku="BREAD001",
    barcode="9876543210987",
    category=cat,
    unit="Loaves"
)

# Create customer
Customer.objects.create(
    name="John Doe",
    phone="+233XXXXXXXXX",
    customer_type="RETAIL"
)
```

### Add Stock (Django Shell)
```python
from inventory.models import StockProduct, Stock, Storefront, Supplier

# Get objects
storefront = Storefront.objects.first()
supplier = Supplier.objects.first()
product = Product.objects.get(sku="MILK001")

# Create stock batch
stock_batch = Stock.objects.create(
    storefront=storefront,
    supplier=supplier,
    product=product,
    quantity=100,
    purchase_price=5.00
)

# Create stock product
StockProduct.objects.create(
    stock=stock_batch,
    product=product,
    quantity=100,
    purchase_price=5.00,
    retail_price=10.00,
    wholesale_price=8.00
)
```

---

## 🎯 What to Test Next

After basic testing works:

1. **Stock Validation:**
   - Add more than available stock
   - Should see error: "Only X available"

2. **Multiple Items:**
   - Add 5 different products
   - Edit each one
   - Remove some
   - Checkout

3. **Wholesale Sale:**
   - Toggle "WHOLESALE" button
   - Search products
   - Prices should change

4. **Credit Sale:**
   - Select customer
   - Choose "Credit" payment
   - Complete sale

5. **Storefront Switching:**
   - Switch to different storefront
   - Cart should clear
   - New sale created

---

## 📝 Report Issues

Found a bug? Report it:

```markdown
### Bug: [What went wrong]

**Steps:**
1. Did this...
2. Then this...
3. Saw this...

**Expected:** Should show X
**Actual:** Showed Y

**Screenshots:** [attach]

**Console Errors:**
[paste from browser DevTools console]

**Network Tab:**
[paste failed API response]
```

Post in team chat or create GitHub issue.

---

## 🎉 It Works!

If everything tested successfully:

1. ✅ Take screenshots
2. ✅ Document any issues
3. ✅ Share with team
4. ✅ Start planning Phase 2!

---

**Happy Testing! 🚀**

Need help? Check:
- `sales-testing-guide.md` - Comprehensive testing
- `sales-api-endpoints.md` - API reference
- `sales-phase1-complete.md` - What's implemented

**Last Updated:** October 3, 2025  
**Estimated Test Time:** 5 minutes  
**Difficulty:** Easy ⭐
