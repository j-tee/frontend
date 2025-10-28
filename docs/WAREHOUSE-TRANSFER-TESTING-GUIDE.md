# Warehouse Transfer System - Testing Guide
## Phase 2, Task 4: Comprehensive QA

**Status:** Ready for Testing  
**Date:** January 2025  
**Implementation:** Phase 2 Complete  
**Testing Duration:** 6 hours estimated

---

## 🎯 Testing Overview

This guide covers comprehensive testing of the new warehouse transfer system with feature flag support. The system supports both legacy (stock adjustments) and new (batch transfer) APIs.

### **Prerequisites**

Before starting tests:
- ✅ Backend API deployed to staging (or localhost)
- ✅ Frontend Phase 1 & 2 implementation complete
- ✅ Environment variable configured in `.env`
- ✅ Test data available (warehouses, products, stock)

---

## ⚙️ Environment Setup

### **1. Configure Feature Flag**

Edit `/frontend/.env`:

```bash
# For testing NEW warehouse transfer API
VITE_USE_NEW_TRANSFER_API=true

# For testing LEGACY stock adjustment API (rollback scenario)
VITE_USE_NEW_TRANSFER_API=false
```

**IMPORTANT:** After changing the flag, you MUST restart the dev server:
```bash
# Stop the server (Ctrl+C)
# Start again
npm run dev
```

### **2. Verify Backend API Availability**

Test endpoints are accessible:

```bash
# New API endpoints (when flag = true)
curl http://localhost:8000/inventory/api/warehouse-transfers/

# Legacy API endpoint (when flag = false)
curl http://localhost:8000/inventory/api/stock-adjustments/transfer/
```

### **3. Test User Accounts**

Ensure you have test accounts for each role:

| Role | Can Create | Can Complete | Can Cancel |
|------|-----------|-------------|-----------|
| OWNER | ✅ | ✅ | ✅ |
| ADMIN | ✅ | ✅ | ✅ |
| MANAGER | ✅ | ✅ | ✅ |
| WAREHOUSE_STAFF | ✅ | ❌ | ❌ |
| SALES_ASSOCIATE | ❌ | ❌ | ❌ |

---

## 📋 Test Cases

### **Test Suite 1: Transfer Creation**

#### **TC1.1: Create Transfer with New API (Flag = true)**

**Steps:**
1. Set `VITE_USE_NEW_TRANSFER_API=true` in `.env`
2. Restart dev server
3. Navigate to Manage Stocks page
4. Switch to "Transfers" tab
5. Click "Initiate Transfer" button
6. Fill in form:
   - Source warehouse: Select any warehouse
   - Destination warehouse: Select different warehouse
   - Products: Add 2-3 products with quantities
   - Reason/Notes: "Test transfer - new API"
7. Click "Submit Transfer"

**Expected Results:**
- ✅ Success message appears with reference number (format: `TRF-YYYYMMDDHHMMSS`)
- ✅ Modal closes
- ✅ Transfer appears in transfers list
- ✅ Status shows "PENDING" badge (yellow/warning color)
- ✅ Console shows single POST request to `/inventory/api/warehouse-transfers/`
- ✅ Request payload contains `items` array with all products

**How to Verify:**
1. Open browser DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Look for POST to `warehouse-transfers`
4. Check request payload structure:
   ```json
   {
     "source_warehouse": "uuid",
     "destination_warehouse": "uuid",
     "items": [
       {"product": "uuid", "quantity": 100},
       {"product": "uuid", "quantity": 50}
     ],
     "notes": "Test transfer - new API"
   }
   ```

---

#### **TC1.2: Create Transfer with Legacy API (Flag = false)**

**Steps:**
1. Set `VITE_USE_NEW_TRANSFER_API=false` in `.env`
2. Restart dev server
3. Repeat steps from TC1.1

**Expected Results:**
- ✅ Success message appears (may have different reference format)
- ✅ Modal closes
- ✅ Transfer appears in transfers list (may show as separate IN/OUT rows)
- ✅ Console shows MULTIPLE POST requests (one per product) to `/stock-adjustments/transfer/`

**How to Verify:**
1. Check Network tab - should see N requests (N = number of products)
2. Each request has single-product payload:
   ```json
   {
     "product_id": "uuid",
     "from_warehouse_id": "uuid",
     "to_warehouse_id": "uuid",
     "quantity": 100,
     "unit_cost": "25.50",
     "reason": "Test transfer - legacy API"
   }
   ```

---

#### **TC1.3: Validation Errors**

**Test these error scenarios:**

**A. No products selected**
- Steps: Open transfer modal, select warehouses, click Submit WITHOUT adding products
- Expected: Error message "No products selected for transfer"

**B. Same source and destination warehouse**
- Steps: Select same warehouse for both source and destination
- Expected: Validation error (frontend or backend)

**C. Insufficient stock**
- Steps: Select product, enter quantity > available stock
- Expected: Error message showing available vs requested quantity

**D. Product not in source warehouse**
- Steps: Select product that doesn't exist in source warehouse
- Expected: Error message "Product not in stock for source warehouse"

**E. Missing required fields**
- Steps: Leave source or destination empty, try to submit
- Expected: Form validation prevents submission

---

### **Test Suite 2: Transfer List Display**

#### **TC2.1: View Transfers (New API)**

**Steps:**
1. Set `VITE_USE_NEW_TRANSFER_API=true`
2. Navigate to Transfers tab
3. Observe the transfers table

**Expected Results:**
- ✅ Table shows columns: Reference #, Date, From → To, Items, Status, Actions
- ✅ Reference numbers in monospace code style
- ✅ Warehouses displayed as "Source → Destination" with arrow
- ✅ Items column shows badge: "X products (Y units)"
- ✅ Status badges color-coded:
  - `pending` = yellow/warning
  - `in_transit` = blue/info
  - `completed` = green/success
  - `cancelled` = grey/secondary
- ✅ "View Details" button in Actions column
- ✅ Footer shows "Showing X of Y recent transfers"
- ✅ Maximum 10 transfers displayed

---

#### **TC2.2: View Transfers (Legacy API)**

**Steps:**
1. Set `VITE_USE_NEW_TRANSFER_API=false`
2. Navigate to Transfers tab

**Expected Results:**
- ✅ Table shows "Recent Transfers (Legacy View)" heading
- ✅ Different columns: Reference #, Date, Type, Source, Destination, Products, Status, Actions
- ✅ Actions include: View, Edit, Delete, Open & Approve buttons
- ✅ Footer shows "(Legacy View)" indicator

---

#### **TC2.3: Loading States**

**Steps:**
1. Clear browser cache
2. Refresh page
3. Quickly switch to Transfers tab

**Expected Results:**
- ✅ Spinner appears with "Loading transfers..." message
- ✅ Table doesn't flash/flicker
- ✅ After load, spinner disappears and table appears

---

#### **TC2.4: Empty State**

**Steps:**
1. Use test account with no transfers
2. Navigate to Transfers tab

**Expected Results:**
- ✅ Message: "No transfers found. Click 'Initiate Transfer' to create one."
- ✅ No table rows displayed
- ✅ "Initiate Transfer" button still visible

---

#### **TC2.5: Error State**

**Steps:**
1. Stop backend server
2. Navigate to Transfers tab
3. Observe error handling

**Expected Results:**
- ✅ Red/danger alert appears
- ✅ Message: "Error loading transfers"
- ✅ Error details shown (network error, timeout, etc.)
- ✅ No table displayed
- ✅ User can retry by refreshing or switching tabs

---

### **Test Suite 3: Transfer Detail Modal**

#### **TC3.1: View Transfer Details**

**Steps:**
1. Create a test transfer (2-3 products)
2. Click "View Details" button on the transfer

**Expected Results:**
- ✅ Modal opens with title "Transfer [REFERENCE_NUMBER] [STATUS_BADGE]"
- ✅ Transfer information displays:
  - From: Source warehouse name
  - To: Destination warehouse name
  - Created: Date/time and creator name
  - Completed: Date/time and completer name (if completed)
- ✅ Items table shows:
  - Product name, SKU, Quantity, Unit Cost, Total columns
  - Each row calculated correctly (quantity × unit cost)
  - Footer row shows totals (sum of quantities, sum of values)
- ✅ Currency formatted with PHP symbol
- ✅ Notes/reason displayed if present
- ✅ Close button works

---

#### **TC3.2: Modal Loading State**

**Steps:**
1. Click "View Details" on a transfer
2. Observe modal during API call

**Expected Results:**
- ✅ Modal opens immediately
- ✅ Spinner or loading indicator appears
- ✅ "Loading transfer details..." message
- ✅ After load, transfer details appear

---

#### **TC3.3: Modal Error State**

**Steps:**
1. Stop backend server
2. Try to view transfer details

**Expected Results:**
- ✅ Modal opens
- ✅ Error alert appears in modal
- ✅ Error message shown
- ✅ Close button still works

---

### **Test Suite 4: Complete Transfer Action**

#### **TC4.1: Complete Transfer (OWNER/ADMIN/MANAGER)**

**Steps:**
1. Login as OWNER, ADMIN, or MANAGER
2. Create a pending transfer
3. Open transfer detail modal
4. Click "Complete Transfer" button

**Expected Results:**
- ✅ Confirmation prompt appears (or button processes immediately)
- ✅ Button shows loading state ("Completing..." or spinner)
- ✅ Success: Modal closes
- ✅ Transfer list refreshes automatically
- ✅ Transfer status changes to "COMPLETED" (green badge)
- ✅ Transfer no longer shows action buttons
- ✅ Completed date/time appears in details

**Verify in Backend:**
- Check that inventory was updated:
  - Source warehouse: quantity decreased
  - Destination warehouse: quantity increased

---

#### **TC4.2: Complete Transfer (WAREHOUSE_STAFF)**

**Steps:**
1. Login as WAREHOUSE_STAFF user
2. Create a pending transfer
3. Open transfer detail modal
4. Look for "Complete Transfer" button

**Expected Results:**
- ✅ "Complete Transfer" button is DISABLED or HIDDEN
- ✅ Tooltip or message explains insufficient permissions
- ✅ Button styling indicates it's not clickable

**Alternative:** Try to complete via API directly (DevTools console)
- ✅ Should receive HTTP 403 Forbidden

---

#### **TC4.3: Complete Transfer - Error Scenarios**

**Test these error cases:**

**A. Insufficient stock (stock sold between creation and completion)**
- Steps: Create transfer, manually reduce source warehouse stock, try to complete
- Expected: Error message "Insufficient stock. Available: X, Required: Y"
- Expected: Modal stays open showing error
- Expected: Transfer remains in PENDING status

**B. Network timeout**
- Steps: Throttle network to 3G, try to complete transfer
- Expected: Loading indicator for longer time
- Expected: Eventually timeout error or success

**C. Concurrent modification**
- Steps: Open same transfer in two browser tabs, complete in one, try to complete in other
- Expected: Error "Transfer already completed" or similar
- Expected: Modal stays open with error

---

#### **TC4.4: Complete with Optional Notes**

**Steps:**
1. Open pending transfer modal
2. Click "Complete Transfer"
3. If prompted, enter optional notes: "Verified all items received"
4. Confirm

**Expected Results:**
- ✅ Notes saved with transfer
- ✅ Notes visible in completed transfer details
- ✅ Transfer completes successfully

---

### **Test Suite 5: Cancel Transfer Action**

#### **TC5.1: Cancel Transfer (OWNER/ADMIN/MANAGER)**

**Steps:**
1. Login as OWNER, ADMIN, or MANAGER
2. Create a pending transfer
3. Open transfer detail modal
4. Click "Cancel Transfer" button

**Expected Results:**
- ✅ Confirmation modal/prompt appears
- ✅ Reason field displayed (required)
- ✅ Validation: Minimum 10 characters required
- ✅ Submit button disabled until valid reason entered
- ✅ After submission:
  - Loading state on button
  - Success: Modal closes
  - Transfer list refreshes
  - Status changes to "CANCELLED" (grey badge)
  - No action buttons shown anymore
- ✅ Reason visible in transfer details

---

#### **TC5.2: Cancel Transfer (WAREHOUSE_STAFF)**

**Steps:**
1. Login as WAREHOUSE_STAFF user
2. Try to cancel a pending transfer

**Expected Results:**
- ✅ "Cancel Transfer" button is DISABLED or HIDDEN
- ✅ Same behavior as complete action (permissions enforced)

---

#### **TC5.3: Cancel Transfer - Validation**

**Test these validation cases:**

**A. Empty reason**
- Steps: Click cancel, leave reason blank, try to submit
- Expected: Validation error "Reason is required"

**B. Reason too short (< 10 characters)**
- Steps: Enter reason "test", try to submit
- Expected: Validation error "Reason must be at least 10 characters"

**C. Valid reason**
- Steps: Enter reason "Inventory discrepancy found during audit process"
- Expected: Submits successfully

---

#### **TC5.4: Cancel Completed Transfer**

**Steps:**
1. Complete a transfer (status = COMPLETED)
2. Open transfer details
3. Look for cancel button

**Expected Results:**
- ✅ Cancel button should NOT appear
- ✅ Only "Close" button visible
- ✅ Cannot revert completed transfers

---

### **Test Suite 6: Feature Flag Toggle**

#### **TC6.1: Toggle from Legacy → New**

**Steps:**
1. Start with `VITE_USE_NEW_TRANSFER_API=false`
2. Create a transfer (legacy system)
3. Stop dev server
4. Change flag to `true`
5. Start dev server
6. Navigate to Transfers tab

**Expected Results:**
- ✅ New transfer list displays
- ✅ Old transfer data may or may not appear (depends on backend migration)
- ✅ "Initiate Transfer" uses new API
- ✅ No console errors
- ✅ No visual glitches

---

#### **TC6.2: Toggle from New → Legacy**

**Steps:**
1. Start with `VITE_USE_NEW_TRANSFER_API=true`
2. Create a transfer (new system)
3. Stop dev server
4. Change flag to `false`
5. Start dev server
6. Navigate to Transfers tab

**Expected Results:**
- ✅ Legacy transfer list displays
- ✅ New transfer may appear as grouped IN/OUT adjustments
- ✅ "Initiate Transfer" uses legacy API
- ✅ No console errors
- ✅ Backward compatibility maintained

---

### **Test Suite 7: Browser Compatibility**

**Test in the following browsers:**

#### **TC7.1: Chrome (Latest)**
- [ ] Transfer creation works
- [ ] Modal displays correctly
- [ ] Complete/cancel actions work
- [ ] No console errors
- [ ] Performance acceptable

#### **TC7.2: Firefox (Latest)**
- [ ] Transfer creation works
- [ ] Modal displays correctly
- [ ] Complete/cancel actions work
- [ ] No console errors
- [ ] Performance acceptable

#### **TC7.3: Safari (Latest)**
- [ ] Transfer creation works
- [ ] Modal displays correctly
- [ ] Complete/cancel actions work
- [ ] No console errors
- [ ] Performance acceptable

#### **TC7.4: Edge (Latest)**
- [ ] Transfer creation works
- [ ] Modal displays correctly
- [ ] Complete/cancel actions work
- [ ] No console errors
- [ ] Performance acceptable

---

### **Test Suite 8: Responsive Design**

#### **TC8.1: Mobile (< 768px)**

**Steps:**
1. Open DevTools
2. Set viewport to iPhone 12 Pro (390 × 844)
3. Navigate to Transfers tab

**Expected Results:**
- ✅ Table is horizontally scrollable (or stacks columns)
- ✅ "Initiate Transfer" button visible and clickable
- ✅ Modal fits screen (not cut off)
- ✅ Form inputs properly sized
- ✅ Buttons accessible (not too small)

---

#### **TC8.2: Tablet (768px - 1024px)**

**Steps:**
1. Set viewport to iPad (768 × 1024)
2. Test all transfer flows

**Expected Results:**
- ✅ Table displays all columns comfortably
- ✅ Modal doesn't overflow
- ✅ Touch targets sized appropriately

---

#### **TC8.3: Desktop (> 1024px)**

**Steps:**
1. Set viewport to 1920 × 1080
2. Test all transfer flows

**Expected Results:**
- ✅ Optimal layout (not stretched)
- ✅ Table uses available space
- ✅ Modal centered and properly sized

---

### **Test Suite 9: Performance Testing**

#### **TC9.1: Large Transfer (50+ items)**

**Steps:**
1. Create transfer with 50 products
2. Observe performance

**Expected Results:**
- ✅ Form submission < 1 second
- ✅ Modal renders items table < 500ms
- ✅ No browser lag or freezing
- ✅ Backend response < 500ms (per docs)

---

#### **TC9.2: Transfer List with Many Items**

**Steps:**
1. Create 20+ transfers
2. Navigate to Transfers tab
3. Observe load time

**Expected Results:**
- ✅ List loads < 200ms (per docs)
- ✅ Pagination or limit to 10 items prevents slowdown
- ✅ Smooth scrolling

---

#### **TC9.3: Rapid Interactions**

**Steps:**
1. Quickly click "View Details" on multiple transfers
2. Rapidly open/close modals
3. Spam "Complete" button

**Expected Results:**
- ✅ No duplicate API calls
- ✅ Debouncing/throttling prevents issues
- ✅ UI remains responsive
- ✅ No race conditions

---

## 🐛 Bug Tracking Template

When you find a bug, document it:

```markdown
### Bug #XX: [Short Description]

**Severity:** Critical / High / Medium / Low  
**Test Case:** TCXX.X  
**Browser:** Chrome 120 / Firefox 115 / etc.  
**Environment:** Development / Staging / Production

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**


**Actual Behavior:**


**Screenshots/Console Errors:**


**Proposed Fix:**

```

---

## ✅ Testing Checklist

Use this checklist to track progress:

### **Transfer Creation**
- [ ] TC1.1: Create with new API
- [ ] TC1.2: Create with legacy API
- [ ] TC1.3: Validation errors (5 scenarios)

### **Transfer List Display**
- [ ] TC2.1: View transfers (new API)
- [ ] TC2.2: View transfers (legacy API)
- [ ] TC2.3: Loading states
- [ ] TC2.4: Empty state
- [ ] TC2.5: Error state

### **Transfer Detail Modal**
- [ ] TC3.1: View transfer details
- [ ] TC3.2: Modal loading state
- [ ] TC3.3: Modal error state

### **Complete Transfer**
- [ ] TC4.1: Complete (authorized users)
- [ ] TC4.2: Complete (warehouse staff - unauthorized)
- [ ] TC4.3: Error scenarios (3 cases)
- [ ] TC4.4: Complete with notes

### **Cancel Transfer**
- [ ] TC5.1: Cancel (authorized users)
- [ ] TC5.2: Cancel (warehouse staff - unauthorized)
- [ ] TC5.3: Validation (3 cases)
- [ ] TC5.4: Cannot cancel completed transfer

### **Feature Flag Toggle**
- [ ] TC6.1: Toggle legacy → new
- [ ] TC6.2: Toggle new → legacy

### **Browser Compatibility**
- [ ] TC7.1: Chrome
- [ ] TC7.2: Firefox
- [ ] TC7.3: Safari
- [ ] TC7.4: Edge

### **Responsive Design**
- [ ] TC8.1: Mobile (< 768px)
- [ ] TC8.2: Tablet (768-1024px)
- [ ] TC8.3: Desktop (> 1024px)

### **Performance**
- [ ] TC9.1: Large transfer (50 items)
- [ ] TC9.2: Transfer list with many items
- [ ] TC9.3: Rapid interactions

---

## 📊 Test Results Summary Template

After completing all tests:

```markdown
## Test Execution Summary

**Date:** [Date]  
**Tester:** [Name]  
**Environment:** Development / Staging  
**Feature Flag:** New API / Legacy API / Both

### **Results:**
- Total Test Cases: XX
- Passed: XX
- Failed: XX
- Blocked: XX
- Skipped: XX

### **Critical Issues Found:**
1. [Issue description]
2. [Issue description]

### **Recommendations:**
- [ ] Ready for production
- [ ] Needs fixes before deployment
- [ ] Requires additional testing

### **Notes:**
[Any additional observations]
```

---

## 🚀 Post-Testing Actions

After successful testing:

1. **Code Review**
   - Request peer review
   - Address feedback
   - Update documentation

2. **Deploy to Staging**
   - Coordinate with backend team
   - Deploy with flag=false (safe default)
   - Monitor for issues

3. **User Acceptance Testing**
   - Demo to warehouse managers
   - Collect feedback
   - Make refinements

4. **Production Deployment**
   - Deploy Friday 6 PM PST
   - Keep flag=false initially
   - Monitor for 48 hours
   - Gradually enable flag=true

5. **Post-Deployment Monitoring**
   - Track error rates
   - Monitor API response times
   - Collect user feedback
   - Document lessons learned

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Ready for Testing Execution
