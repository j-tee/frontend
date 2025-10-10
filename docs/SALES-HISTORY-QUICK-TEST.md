# Sales History - Quick Testing Guide

## 🎯 What to Test

### 1. Open Browser Console
Press `F12` or `Ctrl+Shift+I` to open DevTools

### 2. Navigate to Sales History
Go to `/app/sales` → Click "Sales History" tab

### 3. Check Console Output

#### ✅ GOOD - Should See:
```javascript
🚀 Initializing sales filters with default COMPLETED status
🔧 setSalesFilters called: { status: "COMPLETED" }
🔍 loadSales API call with params: { page: 1, page_size: 20, status: "COMPLETED" }
✅ loadSales API response: { count: 375, resultsLength: 20 }
```

#### ❌ BAD - Should NOT See:
```javascript
// Missing status parameter
🔍 loadSales API call with params: { page: 1, page_size: 20 }

// OR Wrong status
🔍 loadSales API call with params: { status: "DRAFT" }
```

### 4. Check Table Results

#### ✅ GOOD - Should Show:
```
Receipt #: REC-202510-10009
Items: 1 items
Amount: $7.40
Status: COMPLETED
```

#### ❌ BAD - Should NOT Show:
```
Receipt #: N/A
Items: 0 items
Amount: $0.00
Status: DRAFT
```

## 🔍 Test Each Filter

### Test 1: Status Change
1. Change dropdown from "✅ Completed" to "⏳ Pending"
2. Check console for: `status: "PENDING"`
3. Check table shows only PENDING sales

### Test 2: Search
1. Type receipt number in search box
2. Press Enter or click 🔍
3. Check console shows search parameter
4. Check results match search

### Test 3: Date Range
1. Select "Today" from date dropdown
2. Check console shows `date_from: "2025-10-06"`
3. Check table shows only today's sales

### Test 4: Clear Filters
1. Click "✖ Clear" button
2. Check console shows: `status: "COMPLETED"` (NOT empty)
3. Check dropdown shows "✅ Completed"
4. Check table shows completed sales

### Test 5: Pagination
1. If more than 20 sales, click "Next" page
2. Check console shows: `page: 2`
3. Check URL updates with page number

## 🐛 Troubleshooting

### Problem: Still seeing DRAFT sales

**Step 1**: Check browser console
```javascript
// Look for this line
🔍 loadSales API call with params: { ... }

// Does it include status: "COMPLETED"?
```

**Step 2**: Check browser Network tab
1. Open Network tab in DevTools
2. Filter for "sales"
3. Click on the request
4. Check "Query String Parameters"
5. Verify `status: COMPLETED` is present

**Step 3**: If status IS in request but DRAFT sales still show
→ **Backend Issue**: The backend is not filtering correctly

**Step 4**: If status is NOT in request
→ **Frontend Issue**: Filters not being applied

### Problem: Changing filters shows same results

**Check**: Page number
```javascript
// Should see this when changing filters
📄 setSalesPage called: { currentPage: X, newPage: 1 }
```

If page is NOT resetting to 1:
→ Filter handlers are not calling `dispatch(setSalesPage(1))`

### Problem: "All Status" option still visible

→ Old code cached, hard refresh browser (Ctrl+Shift+R)

## 📊 Expected Numbers

From database:
- **COMPLETED**: 375 sales ← Should be default
- **PENDING**: 22 sales
- **PARTIAL**: 88 sales
- **DRAFT**: 23 sales ← Should NOT show by default
- **Total**: 508 sales

## 🎯 Success Criteria

✅ Page loads with COMPLETED filter active  
✅ Table shows real sales (not $0.00)  
✅ Receipt numbers are visible (not N/A)  
✅ Changing status filter works correctly  
✅ Page resets to 1 when filters change  
✅ Console shows correct API parameters  
✅ No "All Status" option in dropdown  

## 📝 Report Issues

If tests fail, provide:
1. Console output (screenshot or copy/paste)
2. Network tab request details
3. What you expected vs what happened
4. Steps to reproduce

---

**Last Updated**: October 6, 2025  
**Status**: Ready for Testing
