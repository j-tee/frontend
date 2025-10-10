# Storefront Filtering - Testing Guide 🧪

**Feature:** Multi-storefront filtering in Sales History  
**Status:** Ready for Testing  
**Last Updated:** January 2025

---

## 🎯 Testing Objectives

1. Verify conditional UI rendering based on storefront count
2. Validate filter functionality and API integration
3. Ensure proper state management and persistence
4. Test edge cases and error scenarios
5. Confirm export functionality includes storefront filter

---

## 🛠️ Test Environment Setup

### Prerequisites
- Backend server running with `/api/users/storefronts/` endpoint
- Frontend dev server running (`npm run dev`)
- Test users with different storefront access levels
- Redux DevTools installed (optional but recommended)

### Test Users Needed

**User A: Single Storefront**
- Has permission to access exactly 1 storefront
- Expected behavior: No dropdown visible

**User B: Multi-Storefront**
- Has permission to access 2+ storefronts
- Expected behavior: Dropdown visible with all accessible storefronts

**User C: No Storefront Access**
- Has no storefront permissions (edge case)
- Expected behavior: Empty state or error handling

---

## ✅ Test Cases

### Test 1: Single Storefront User (UI Conditional Rendering)

**User:** Single storefront access  
**Steps:**
1. Log in as User A
2. Navigate to `/app/sales`
3. Wait for page to fully load

**Expected Results:**
- ✅ No storefront dropdown appears
- ✅ Filter row shows: [Search] [Status] [Date] [Actions]
- ✅ Sales are automatically filtered to user's storefront
- ✅ No storefront badge in active filters

**Validation:**
- Check browser console for: `✅ Loaded user storefronts: { count: 1, ... }`
- Redux state `auth.accessibleStorefronts` should have 1 item
- `showStorefrontFilter` evaluates to `false`

---

### Test 2: Multi-Storefront User (Dropdown Visible)

**User:** Multiple storefront access  
**Steps:**
1. Log in as User B
2. Navigate to `/app/sales`
3. Wait for page to fully load

**Expected Results:**
- ✅ Storefront dropdown appears after Status filter
- ✅ Default selection: "🏪 All Storefronts"
- ✅ Dropdown lists all accessible storefronts
- ✅ No storefront badge initially (since "All" is selected)

**Validation:**
- Check browser console for: `✅ Loaded user storefronts: { count: 2, ... }`
- Redux state `auth.accessibleStorefronts` should have 2+ items
- `showStorefrontFilter` evaluates to `true`

---

### Test 3: Storefront Filter Application

**User:** Multi-storefront access  
**Steps:**
1. On Sales History page with dropdown visible
2. Select a specific storefront from dropdown (e.g., "Main Store")
3. Wait for sales to reload

**Expected Results:**
- ✅ Active filter badge appears: "Storefront: Main Store"
- ✅ Sales table refreshes
- ✅ Only sales from selected storefront shown
- ✅ Page resets to 1

**Validation:**
- Browser console shows: `🔄 Loading sales with current filters: { storefront: "uuid", ... }`
- Network tab shows: `GET /api/sales/?storefront=uuid&status=COMPLETED`
- Redux state `sales.filters.storefront` equals selected UUID

---

### Test 4: Combined Filters

**User:** Multi-storefront access  
**Steps:**
1. Select Status: "COMPLETED"
2. Select Storefront: "Branch Store"
3. Select Date Range: "This Month"
4. Enter Search: "12345"
5. Click Search button

**Expected Results:**
- ✅ All 4 filter badges appear:
  - "Status: COMPLETED"
  - "Storefront: Branch Store"
  - "From: 2025-01-01"
  - "Search: 12345"
- ✅ Sales table shows only matching records
- ✅ Network request includes all parameters

**Validation:**
- Network tab shows: `GET /api/sales/?status=COMPLETED&storefront=uuid&date_from=2025-01-01&search=12345`
- Redux state has all filter values set correctly

---

### Test 5: Clear Filters

**User:** Multi-storefront access  
**Steps:**
1. Apply multiple filters (including storefront)
2. Click "✖ Clear" button

**Expected Results:**
- ✅ All filter inputs reset
- ✅ Storefront dropdown shows "🏪 All Storefronts"
- ✅ Status remains "✅ Completed" (default)
- ✅ All filter badges disappear except status
- ✅ Sales reload with default filters

**Validation:**
- Redux state `sales.filters` should be: `{ status: "COMPLETED" }`
- No `storefront` key in filters object
- API call: `GET /api/sales/?status=COMPLETED`

---

### Test 6: Storefront Filter Persistence

**User:** Multi-storefront access  
**Steps:**
1. Select a specific storefront
2. Change page (e.g., page 1 → page 2)
3. Navigate away to another page (e.g., Inventory)
4. Navigate back to Sales History

**Expected Results:**
- ✅ Selected storefront persists across pagination
- ✅ Storefront resets when navigating away (expected behavior)
- ✅ On return, defaults to "All Storefronts"

**Why:** Filters are component-local, reset on unmount. This is intentional to avoid stale filters.

---

### Test 7: Export with Storefront Filter

**User:** Multi-storefront access  
**Steps:**
1. Select Storefront: "Main Store"
2. Apply other filters (optional)
3. Click "📥 Export" button

**Expected Results:**
- ✅ CSV file downloads
- ✅ Filename includes timestamp
- ✅ Only sales from "Main Store" in CSV
- ✅ Other active filters also applied

**Validation:**
- Network tab shows: `GET /api/sales/export/?storefront=uuid&...`
- Open CSV and verify sales match selected storefront

---

### Test 8: Loading States

**User:** Multi-storefront access  
**Steps:**
1. Open Sales History page
2. Observe storefront dropdown during initial load
3. Throttle network to "Slow 3G" (Chrome DevTools)
4. Refresh page

**Expected Results:**
- ✅ Dropdown initially disabled during load
- ✅ No visual glitches
- ✅ Dropdown enables once storefronts loaded
- ✅ Graceful handling of slow networks

**Validation:**
- `storefrontsLoading` starts as `true`
- Dropdown has `disabled={storefrontsLoading}` attribute
- Once loaded, `storefrontsLoading` becomes `false`

---

### Test 9: Error Handling

**User:** Any  
**Steps:**
1. Simulate API error (disconnect network or use mock error)
2. Observe error handling

**Expected Results:**
- ✅ Error logged to console: `❌ Failed to load user storefronts: [error]`
- ✅ Redux state `auth.storefrontsError` contains error message
- ✅ UI shows appropriate fallback (dropdown hidden or error message)

**Validation:**
- Check Redux DevTools for `auth/loadUserStorefronts/rejected` action
- `auth.storefrontsError` should contain error string

---

### Test 10: Responsive Layout

**User:** Multi-storefront access  
**Steps:**
1. View Sales History on desktop (1920px width)
2. Resize to tablet (768px)
3. Resize to mobile (375px)

**Expected Results:**
- ✅ Desktop: All filters in single row
- ✅ Tablet: Filters wrap properly
- ✅ Mobile: Filters stack vertically
- ✅ Storefront dropdown maintains proper width
- ✅ No overflow issues

**Validation:**
- Bootstrap grid classes (`Col md={2}`) work correctly
- Dropdown doesn't break layout
- All controls remain accessible

---

## 🐛 Edge Cases to Test

### Edge Case 1: Empty Storefronts Array
**Scenario:** API returns `{ storefronts: [], count: 0 }`

**Expected:** 
- No dropdown shown
- No errors thrown
- Sales load without storefront filter

---

### Edge Case 2: Storefront Permission Change Mid-Session
**Scenario:** User has 2 storefronts, admin removes access to one

**Expected:**
- User needs to refresh to see updated list
- If currently selected storefront is removed, filter becomes invalid
- Backend should handle gracefully (return 0 results or error)

---

### Edge Case 3: All Storefronts Inactive
**Scenario:** User has access to storefronts but all are `is_active: false`

**Expected:**
- Dropdown still shows storefronts
- API may return 0 results
- No crashes or errors

---

### Edge Case 4: Very Long Storefront Names
**Scenario:** Storefront name is 100+ characters

**Expected:**
- Dropdown text truncates properly
- Badge text truncates with ellipsis
- No layout breaks

---

## 🔍 Manual Testing Checklist

### Before Testing
- [ ] Backend `/api/users/storefronts/` endpoint is working
- [ ] Test users are created with appropriate permissions
- [ ] Frontend dev server is running
- [ ] Redux DevTools are installed
- [ ] Network tab is open in browser DevTools

### During Testing
- [ ] Test all 10 main test cases
- [ ] Test all 4 edge cases
- [ ] Check console for errors
- [ ] Verify API calls in Network tab
- [ ] Monitor Redux state changes
- [ ] Test on Chrome, Firefox, Safari

### After Testing
- [ ] Document any bugs found
- [ ] Verify all features work as expected
- [ ] Test export functionality
- [ ] Confirm responsive design
- [ ] Check accessibility (keyboard navigation)

---

## 📊 API Calls to Monitor

### Expected API Calls (Multi-Storefront User)

**On Login/Page Load:**
```
GET /api/users/storefronts/
Response: { storefronts: [...], count: N }
```

**On Sales History Load:**
```
GET /api/sales/?status=COMPLETED&page=1&page_size=20
```

**After Selecting Storefront:**
```
GET /api/sales/?status=COMPLETED&storefront={uuid}&page=1&page_size=20
```

**On Export:**
```
GET /api/sales/export/?status=COMPLETED&storefront={uuid}
```

---

## 🎨 Visual Testing

### Storefront Dropdown Appearance

**Desktop:**
```
[Search Input (md-4)] [Status (md-2)] [Storefront (md-2)] [Date (md-3)] [Actions (md-3)]
```

**Without Storefront Filter (1 storefront):**
```
[Search Input (md-4)] [Status (md-2)] [Date (md-3)] [Actions (md-3)]
```

**Active Filters Badge:**
```
Active Filters: [Status: COMPLETED] [Storefront: Main Store] [From: 2025-01-01]
```

---

## 🚨 Known Issues / Limitations

### Limitation 1: Filter Reset on Navigation
- Filters don't persist when navigating away from Sales History
- This is intentional to avoid stale filters
- Can be changed to persist in localStorage if desired

### Limitation 2: No Multi-Select
- Can only filter by one storefront at a time
- "All Storefronts" shows combined results
- Multi-select would require backend changes

### Limitation 3: Permission Changes
- User must refresh to see updated storefront access
- No real-time permission updates
- Could implement WebSocket updates in future

---

## ✅ Success Criteria

Feature is considered **PASSING** if:

1. ✅ Single storefront users see no dropdown
2. ✅ Multi-storefront users see dropdown with all accessible storefronts
3. ✅ Selecting a storefront filters sales correctly
4. ✅ Active filter badge shows storefront name
5. ✅ Clear filters resets storefront to "All Storefronts"
6. ✅ Export includes storefront filter
7. ✅ No console errors
8. ✅ No TypeScript compilation errors
9. ✅ Responsive design works on all screen sizes
10. ✅ Loading states handled gracefully

---

## 📝 Bug Report Template

If you find issues, use this template:

```markdown
### Bug: [Short Description]

**Severity:** High / Medium / Low
**User Type:** Single Storefront / Multi-Storefront / No Access
**Browser:** Chrome 120 / Firefox 121 / Safari 17

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Screenshots:**
[If applicable]

**Console Errors:**
```
[Paste console errors here]
```

**Network Calls:**
[Relevant API calls from Network tab]

**Redux State:**
```json
{
  "auth": { "accessibleStorefronts": [...] },
  "sales": { "filters": {...} }
}
```
```

---

## 🎉 Testing Complete!

Once all test cases pass:

1. Update feature status to "QA Approved ✅"
2. Notify stakeholders
3. Prepare for production deployment
4. Monitor for any post-deployment issues

---

**Happy Testing!** 🚀
