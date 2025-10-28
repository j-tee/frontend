# Stock Adjustments - User Guide

## Overview
This guide explains how to view, edit, approve, reject, and manage stock adjustments in the POS Suite.

## Accessing Stock Adjustments

### Navigation
1. Click **Inventory** in the sidebar
2. Navigate to the **Stock Adjustments** tab
3. The table displays all stock adjustments with search and filter options

## Table Actions

### Action Buttons Overview

Each adjustment row displays different action buttons based on the adjustment's status:

| Status | Available Actions |
|--------|------------------|
| **PENDING** | View, Edit, Approve*, Reject* |
| **APPROVED** | View only |
| **REJECTED** | View only |
| **COMPLETED** | View only |

\* Approve and Reject buttons only appear if the adjustment requires approval

### Button Descriptions

#### 1. **View** Button
- **Availability**: Always visible for all adjustments
- **Action**: Opens a detailed modal showing:
  - Adjustment type and status
  - Product details
  - Quantity change
  - Reason and notes
  - Created by and date
  - Photos and documents (if any)
- **From Detail Modal** (PENDING only):
  - Edit button
  - Approve button (if requires approval)
  - Reject button (if requires approval)

#### 2. **Edit** Button (Table)
- **Availability**: Only visible for PENDING adjustments
- **Action**: Opens edit modal directly
- **Editable Fields**:
  - Product
  - Quantity change
  - Adjustment type
  - Reason
  - Notes
- **Restrictions**: Cannot edit APPROVED, REJECTED, or COMPLETED adjustments

#### 3. **Approve** Button
- **Availability**: Only for PENDING adjustments that require approval
- **Action**: 
  - Marks adjustment as APPROVED
  - Applies inventory changes
  - Closes detail modal (if open)
  - Refreshes list with current filters
- **Visual Feedback**: Button disabled during loading

#### 4. **Reject** Button
- **Availability**: Only for PENDING adjustments that require approval
- **Action**:
  - Marks adjustment as REJECTED
  - Does NOT apply inventory changes
  - Closes detail modal (if open)
  - Refreshes list with current filters
- **Visual Feedback**: Button disabled during loading

## User Workflows

### Viewing Adjustment Details
**From Table**:
1. Find the adjustment in the table
2. Click the **View** button
3. Review details in the modal
4. Click **Close** or **×** to exit

**Alternative**: Click directly on the row (if row click is enabled)

### Editing a Pending Adjustment

**Option 1: Direct from Table** (Quickest)
1. Locate PENDING adjustment
2. Click the **Edit** button in the Actions column
3. Edit modal opens immediately
4. Make changes to:
   - Product selection
   - Quantity (positive or negative)
   - Adjustment type
   - Reason
   - Notes
5. Click **Save Changes**
6. List refreshes automatically

**Option 2: From Detail Modal**
1. Click **View** on the adjustment
2. In the detail modal, click **Edit** button (top-right)
3. Edit modal opens
4. Make changes
5. Click **Save Changes**
6. Both modals close, list refreshes

**Validation Rules**:
- Product required
- Quantity must be non-zero
- Adjustment type required
- Reason required for shrinkage and damaged types
- Cannot edit non-PENDING adjustments

### Approving an Adjustment
1. Find PENDING adjustment requiring approval
2. Click **Approve** button (in table or detail modal)
3. Confirmation: Adjustment status changes to APPROVED
4. Inventory is updated automatically
5. List refreshes with current filters maintained

### Rejecting an Adjustment
1. Find PENDING adjustment requiring approval
2. Click **Reject** button (in table or detail modal)
3. Confirmation: Adjustment status changes to REJECTED
4. Inventory is NOT updated
5. List refreshes with current filters maintained

### Searching for Adjustments

**Search Field**:
- Searches across:
  - Product names
  - Adjustment reasons
  - Creator names
- Real-time filtering
- Resets to page 1

**Status Filter**:
- All Statuses (default)
- PENDING
- APPROVED
- REJECTED
- COMPLETED

**Type Filter**:
- All Types (default)
- Shrinkage
- Damaged
- Returned
- Miscellaneous

**Quick Actions**:
- **View Pending** button: Filters to show only PENDING adjustments
- **Clear Filters** button: Removes all active filters

## Status Meanings

### PENDING
- **Description**: Adjustment created but not yet processed
- **Actions Available**: Edit, Approve, Reject (if requires approval)
- **Badge Color**: Yellow/Warning
- **Inventory Impact**: None yet

### APPROVED
- **Description**: Adjustment approved by authorized user
- **Actions Available**: View only
- **Badge Color**: Blue/Info
- **Inventory Impact**: Applied (quantity changed)

### REJECTED
- **Description**: Adjustment rejected, will not be applied
- **Actions Available**: View only
- **Badge Color**: Red/Danger
- **Inventory Impact**: None

### COMPLETED
- **Description**: Adjustment fully processed and closed
- **Actions Available**: View only
- **Badge Color**: Green/Success
- **Inventory Impact**: Applied

## Adjustment Types

### Shrinkage (🌿)
- **Description**: Inventory loss due to theft, spoilage, or unknown causes
- **Color**: Orange
- **Requires Reason**: Yes

### Damaged (❤️💔)
- **Description**: Products damaged and unusable
- **Color**: Red
- **Requires Reason**: Yes

### Returned (📦)
- **Description**: Products returned to inventory from customers or other sources
- **Color**: Blue
- **Requires Reason**: No

### Miscellaneous (📋)
- **Description**: Other adjustments not covered by specific categories
- **Color**: Gray
- **Requires Reason**: No

## Common Scenarios

### Scenario 1: Quick Edit of Pending Adjustment
**User wants to fix a quantity error**:
1. Filter by Status: PENDING
2. Find the adjustment
3. Click **Edit** button (directly in table)
4. Change quantity
5. Click **Save Changes**
✅ Done! List refreshes automatically

### Scenario 2: Review Before Approval
**Manager reviewing pending adjustments**:
1. Click **View Pending** button
2. Click **View** on first adjustment
3. Review details carefully
4. Click **Approve** or **Reject**
5. Modal closes, next adjustment visible
6. Repeat for each pending item

### Scenario 3: Find Specific Adjustment
**User searching for a damaged keyboard adjustment**:
1. Type "keyboard" in Search field
2. Select "Damaged" from Type filter
3. Review filtered results
4. Click **View** to see details

### Scenario 4: Bulk Pending Review
**Reviewing all pending shrinkage**:
1. Click **View Pending** button
2. Select "Shrinkage" from Type filter
3. Review each adjustment
4. Approve or reject as needed
5. Clear filters when done

## Permission-Based Actions

### All Users Can:
- View all adjustments
- Search and filter adjustments
- View adjustment details

### Authorized Users Can:
- Create adjustments
- Edit PENDING adjustments
- Approve PENDING adjustments (if requires_approval)
- Reject PENDING adjustments (if requires_approval)

### System Restrictions:
- Cannot edit APPROVED adjustments
- Cannot edit REJECTED adjustments
- Cannot edit COMPLETED adjustments
- Cannot approve own adjustments (backend enforced)

## Tips and Best Practices

### For Efficiency
1. **Use Filters**: Narrow down to relevant adjustments before searching
2. **View Pending Button**: Quick access to items requiring action
3. **Edit from Table**: Faster than opening detail modal first
4. **Active Filter Badges**: Shows what filters are active at a glance

### For Accuracy
1. **Review Before Approve**: Always check details in View modal
2. **Verify Quantities**: Ensure +/- signs match intention
3. **Check Reasons**: Especially for shrinkage and damaged items
4. **Confirm Product**: Make sure correct product is selected

### For Organization
1. **Process Pending Regularly**: Don't let pending adjustments pile up
2. **Use Consistent Reasons**: Helps with reporting and analysis
3. **Clear Filters After Use**: Reset view to see all adjustments
4. **Check Date Column**: Process older items first

## Keyboard Shortcuts (Future Enhancement)

Coming soon:
- `E` - Edit selected adjustment
- `A` - Approve selected adjustment
- `R` - Reject selected adjustment
- `V` - View selected adjustment
- `Esc` - Close modal
- `/` - Focus search field

## Troubleshooting

### Can't See Edit Button
**Problem**: Edit button not visible
**Solutions**:
- Check adjustment status (only PENDING can be edited)
- Refresh the page
- Verify you have edit permissions

### Can't Approve/Reject
**Problem**: Approve/Reject buttons not showing
**Solutions**:
- Check if adjustment requires_approval flag is set
- Verify adjustment status is PENDING
- Check your user permissions

### Changes Not Saving
**Problem**: Edit modal not saving changes
**Solutions**:
- Check for validation errors (red text in form)
- Ensure all required fields filled
- Verify quantity is non-zero
- Check network connection

### Filters Not Working
**Problem**: Search or filters not returning results
**Solutions**:
- Clear all filters and try again
- Verify backend API is responding
- Check browser console for errors
- Refresh the page

## Related Documentation
- [Stock Adjustment Edit Implementation](./STOCK-ADJUSTMENT-EDIT-IMPLEMENTATION.md)
- [Stock Adjustments Search & Filter](./STOCK-ADJUSTMENTS-SEARCH-FILTER-IMPLEMENTATION.md)
- [Backend API Documentation](./BACKEND-README-SALES.md)

## Support
For issues or questions:
1. Check this guide first
2. Review error messages in detail modal
3. Contact system administrator
4. File a support ticket with:
   - Screenshot of the issue
   - Adjustment ID (if applicable)
   - Steps to reproduce
   - Expected vs actual behavior
