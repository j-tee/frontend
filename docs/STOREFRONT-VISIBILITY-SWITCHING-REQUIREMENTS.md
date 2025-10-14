# Storefront Visibility & Switching for Sales Page

## Problem Statement

**User Feedback:**
> "While you are making a sale, you are not sure which storefront you are in. It is important to know which storefront inventory you are selling from."

**Business Requirements:**
1. **Visibility**: Users need clear, prominent indication of which storefront inventory they're currently selling from
2. **Switching**: Business owners and multi-store employees should be able to switch between storefronts during sales
3. **Restrictions**: Single-store employees should NOT have the ability to switch storefronts
4. **Inventory Clarity**: It must be absolutely clear which location's stock is being used for the transaction

---

## Current Implementation Analysis

### ✅ What Already Works

1. **Location Selection Infrastructure**
   - `locationSlice.ts` manages active location state
   - `selectActiveLocation` selector provides current storefront/warehouse
   - `selectLocation()` action to change active location
   - Persisted across navigation

2. **Multi-Storefront Detection**
   ```typescript
   // SalesPage.tsx line 55-56
   const accessibleStorefronts = useAppSelector(selectAccessibleStorefronts)
   const isMultiStorefrontEnabled = accessibleStorefronts.length > 1
   ```

3. **Location Switcher Modal**
   - `DashboardLayout.tsx` has full-featured location switcher
   - Shows all accessible storefronts and warehouses
   - "Focus" button to select location
   - "Go to sales" button to switch location AND navigate

4. **Catalog Filtering**
   - `ProductSearchPanel` already receives `storefrontId` prop
   - Products filtered by current storefront
   - Multi-storefront mode supported

### ❌ What's Missing

1. **No Prominent Storefront Indicator on Sales Page**
   - Current location shown only in sidebar navigation
   - Not visible when sidebar is collapsed
   - Easy to miss during busy sales transactions
   - No visual prominence to draw attention

2. **No Quick Switcher on Sales Page**
   - User must navigate away or use sidebar
   - Disruptive to sales workflow
   - No in-context switching

3. **No Cart Protection**
   - Current switcher allows location change anytime
   - Could cause inventory/cart mismatch if items already selected
   - Need to prevent switching when cart has items

---

## Proposed Solution

### 1. Storefront Header Badge (High Visibility)

Add a prominent, always-visible storefront indicator at the top of the sales page:

```tsx
// Location: SalesPage.tsx - Add after line 949 (before ProductSearchPanel)
{currentLocation && (
  <div className="mb-3 d-flex align-items-center justify-content-between bg-light border rounded-3 p-3">
    <div className="d-flex align-items-center gap-2">
      <div className="bg-primary text-white rounded-circle p-2" style={{ width: 40, height: 40 }}>
        <i className="bi bi-shop"></i>
      </div>
      <div>
        <div className="small text-muted">Current Storefront</div>
        <div className="fw-bold">{currentLocation.name}</div>
        {currentLocation.location && (
          <div className="small text-muted">{currentLocation.location}</div>
        )}
      </div>
    </div>
    
    {isMultiStorefrontEnabled && cartItems.length === 0 && (
      <Button
        variant="outline-primary"
        size="sm"
        className="rounded-pill"
        onClick={() => setShowStorefrontSwitcher(true)}
      >
        <i className="bi bi-arrow-left-right me-1"></i>
        Switch Store
      </Button>
    )}
    
    {cartItems.length > 0 && (
      <div className="small text-muted">
        <i className="bi bi-lock me-1"></i>
        Clear cart to switch stores
      </div>
    )}
  </div>
)}
```

**Visual Hierarchy:**
- **Icon**: Shop icon in primary color circle (40x40px)
- **Label**: "Current Storefront" in small muted text
- **Name**: Bold storefront name (e.g., "Downtown Branch")
- **Location**: Small muted text (e.g., "123 Main St")
- **Switch Button**: Only visible if multi-store access AND empty cart
- **Lock Message**: Shown when cart has items (prevents confusion)

### 2. In-Page Storefront Switcher Modal

Create a lightweight switcher specific to sales page:

```tsx
// Location: SalesPage.tsx - Add new component
<Modal
  show={showStorefrontSwitcher}
  onHide={() => setShowStorefrontSwitcher(false)}
  centered
>
  <Modal.Header closeButton>
    <Modal.Title>Switch Storefront</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    {cartItems.length > 0 ? (
      <Alert variant="warning">
        <i className="bi bi-exclamation-triangle me-2"></i>
        Please complete or clear your current sale before switching storefronts.
      </Alert>
    ) : (
      <div className="space-y-3">
        <p className="text-muted small mb-3">
          Select the storefront you want to sell from. Products will update to show inventory from the selected location.
        </p>
        {accessibleStorefronts.map((storefront) => (
          <div
            key={storefront.id}
            className={`border rounded-3 p-3 cursor-pointer ${
              storefront.id === currentLocation?.id
                ? 'border-primary bg-primary bg-opacity-10'
                : 'border-gray-200'
            }`}
            onClick={() => handleSwitchStorefront(storefront.id)}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="fw-semibold">{storefront.name}</div>
                {storefront.location && (
                  <div className="small text-muted">{storefront.location}</div>
                )}
              </div>
              {storefront.id === currentLocation?.id && (
                <Badge bg="primary">Active</Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setShowStorefrontSwitcher(false)}>
      Cancel
    </Button>
  </Modal.Footer>
</Modal>
```

**Features:**
- **Cart Protection**: Shows warning if cart has items, prevents selection
- **Current Indicator**: Active storefront highlighted with primary border + badge
- **Click to Switch**: Simple click to change location (if cart empty)
- **Auto-Close**: Modal closes after selection
- **Catalog Refresh**: ProductSearchPanel automatically reloads with new storefront

### 3. Implementation Code Changes

#### SalesPage.tsx

```typescript
// Add state for switcher modal (after line 60)
const [showStorefrontSwitcher, setShowStorefrontSwitcher] = useState(false)

// Add switcher handler
const handleSwitchStorefront = (storefrontId: string) => {
  if (cartItems.length > 0) {
    // Prevent switching with items in cart
    return
  }
  
  dispatch(selectLocation({ type: 'storefront', id: storefrontId }))
  setShowStorefrontSwitcher(false)
  
  // Catalog will auto-refresh via useEffect watching currentLocation
}

// Update useEffect that loads catalog (around line 476-485)
// Add currentLocation.id to dependency array to trigger reload on location change
useEffect(() => {
  // ... existing initialization logic
}, [currentLocation?.id, customerOptions, dispatch, getOrCreateWalkInCustomer, saleType, selectedCustomer])
```

**Key Points:**
- No state changes needed in Redux (uses existing `selectLocation` action)
- Cart items check prevents mid-transaction switching
- ProductSearchPanel already watches `storefrontId` prop for changes
- Existing catalog loading logic will trigger on location change

---

## Permission Logic

### Current User Capabilities

From `authSlice.ts` and `DashboardLayout.tsx`:

```typescript
// User already has accessibleStorefronts array
const accessibleStorefronts = useAppSelector(selectAccessibleStorefronts)

// Single store employee: accessibleStorefronts.length === 1
// Multi-store employee: accessibleStorefronts.length > 1
// Business owner: All storefronts accessible
```

**UI Behavior:**
- `isMultiStorefrontEnabled = accessibleStorefronts.length > 1`
- "Switch Store" button only shown if `isMultiStorefrontEnabled === true`
- Single-store employees never see switcher UI
- No backend changes needed - permissions already enforced

---

## Backend Requirements

### ✅ No New Endpoints Needed

All required APIs already exist:

1. **User Authentication & Permissions**
   - Current auth response includes accessible storefronts
   - Role-based access control (RBAC) already implemented
   - `accessibleStorefronts` array populated during login

2. **Catalog Filtering**
   - `GET /api/inventory/storefronts/{id}/sale-catalog/` exists
   - Already filters products by storefront
   - ProductSearchPanel already uses this

3. **Location Selection**
   - Frontend-only state change
   - No API call needed to "switch" locations
   - Subsequent API calls use new storefront ID from state

### ⚠️ Potential Backend Enhancement (Optional)

**Session Tracking** (Low Priority):
```python
# Optional: Track active storefront in user session
# Useful for analytics, audit logs, or default location
class UserSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    active_storefront = models.ForeignKey(Storefront, null=True, on_delete=models.SET_NULL)
    last_switched_at = models.DateTimeField(auto_now=True)
```

**Benefits:**
- Remember last active storefront on reload
- Track which locations are most used
- Audit trail for multi-storefront operations

**Endpoint:**
```
PATCH /api/users/me/session/
{
  "active_storefront_id": "uuid-here"
}
```

**Priority**: Not required for initial implementation. Frontend state persistence (localStorage via Redux) is sufficient.

---

## Implementation Checklist

### Frontend Changes (3 hours)

- [ ] **Add storefront header badge** (1 hour)
  - Create header component in SalesPage.tsx
  - Add shop icon, name, location display
  - Conditional "Switch Store" button
  - Cart lock message when items present

- [ ] **Add storefront switcher modal** (1 hour)
  - Create modal component
  - List accessible storefronts
  - Highlight active storefront
  - Cart protection logic
  - Click-to-switch handler

- [ ] **Connect switching logic** (0.5 hours)
  - Wire up `selectLocation` action
  - Handle catalog refresh on location change
  - Add modal state management
  - Test cart protection

- [ ] **Visual polish & accessibility** (0.5 hours)
  - Ensure WCAG contrast ratios
  - Add ARIA labels for screen readers
  - Test keyboard navigation
  - Mobile responsive layout

### Backend Changes

- [ ] **None required** ✅
  - Existing APIs support all functionality
  - Permissions already enforced
  - Optional session tracking can be added later

### Testing (1 hour)

- [ ] **Single-store employee**
  - Verify no "Switch Store" button shown
  - Confirm only one storefront in header

- [ ] **Multi-store employee**
  - Verify "Switch Store" button visible
  - Test switching between storefronts
  - Confirm product catalog updates

- [ ] **Cart protection**
  - Add items to cart
  - Verify "Switch Store" button disabled/hidden
  - Verify lock message shown
  - Clear cart, verify button re-enabled

- [ ] **Visual testing**
  - Desktop layout (1920x1080, 1366x768)
  - Tablet layout (iPad, Surface)
  - Mobile layout (iPhone, Android)
  - Dark mode compatibility

---

## User Experience Flow

### Scenario 1: Business Owner - Morning Sales

1. **Arrives at Sales Page** → Sees header badge: "Downtown Branch - Main St"
2. **Checks inventory** → Browses products from Downtown location
3. **Customer asks about other location** → Clicks "Switch Store" button
4. **Selects "Westside Branch"** → Modal shows 2 storefronts, clicks Westside
5. **Catalog refreshes** → Now shows Westside inventory
6. **Header updates** → Badge now shows "Westside Branch - Oak Ave"
7. **Completes sale** → Transaction recorded for Westside storefront

### Scenario 2: Single-Store Employee

1. **Arrives at Sales Page** → Sees header badge: "Downtown Branch - Main St"
2. **No switch button visible** → Cannot access other locations
3. **Focuses on sales** → Clear which inventory they're using
4. **No confusion** → Always knows they're in Downtown Branch

### Scenario 3: Multi-Store Employee - Mid-Transaction

1. **Starts sale at Downtown** → Adds 3 items to cart
2. **Header badge visible** → "Downtown Branch - Main St"
3. **"Switch Store" button hidden** → Replaced with "Clear cart to switch stores"
4. **Cannot switch** → Prevented from mixing inventory sources
5. **Completes or cancels sale** → Switch button becomes available again

---

## Design Mockup (ASCII)

```
┌─────────────────────────────────────────────────────────────┐
│  Sales - POS System                                     [≡] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 🏪  Current Storefront         [↔ Switch Store]      │ │
│  │     Downtown Branch                                   │ │
│  │     123 Main Street, Springfield                      │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────────────┐ │
│  │  Product Search     │  │  Shopping Cart              │ │
│  │  [Search...]        │  │                             │ │
│  │                     │  │  Laptop - $999              │ │
│  │  • Laptop - $999    │  │  Mouse  - $29               │ │
│  │  • Mouse  - $29     │  │                             │ │
│  │  • Keyboard - $79   │  │  Total: $1,028              │ │
│  └─────────────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**When cart has items:**
```
┌───────────────────────────────────────────────────────┐
│ 🏪  Current Storefront    🔒 Clear cart to switch     │
│     Downtown Branch                                   │
│     123 Main Street, Springfield                      │
└───────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### Must Have
- [x] Storefront name clearly visible at top of sales page
- [x] Business owners can switch between storefronts they manage
- [x] Multi-store employees can switch between assigned storefronts
- [x] Single-store employees cannot see switch functionality
- [x] Switching blocked when cart has items
- [x] Product catalog refreshes after storefront switch
- [x] Mobile-responsive layout

### Should Have
- [ ] Storefront location/address shown in header
- [ ] Visual icon (shop/store) for quick recognition
- [ ] Smooth transition animation on switch
- [ ] Keyboard shortcut to open switcher (e.g., Ctrl+Shift+L)

### Nice to Have
- [ ] Recently used storefronts shown first in switcher
- [ ] Search/filter for storefronts (if user has 10+ locations)
- [ ] Toast notification confirming switch: "Switched to Westside Branch"
- [ ] Backend session tracking for default location

---

## Estimated Timeline

| Task | Time | Assignee | Status |
|------|------|----------|--------|
| Frontend: Header badge component | 1h | Frontend Dev | ⏳ Pending |
| Frontend: Switcher modal | 1h | Frontend Dev | ⏳ Pending |
| Frontend: Integration & logic | 0.5h | Frontend Dev | ⏳ Pending |
| Frontend: Visual polish | 0.5h | Frontend Dev | ⏳ Pending |
| Testing: All scenarios | 1h | QA | ⏳ Pending |
| Code review | 0.5h | Tech Lead | ⏳ Pending |
| **Total** | **4.5 hours** | | |

**Backend Work**: None required ✅

---

## Related Documentation

- **Location Management**: `locationSlice.ts` - Redux state for storefront/warehouse selection
- **Sales Page**: `SalesPage.tsx` - Main sales interface
- **Dashboard Layout**: `DashboardLayout.tsx` - Existing location switcher (sidebar)
- **Product Search**: `ProductSearchPanel.tsx` - Already supports multi-storefront mode

---

## Questions for Product Owner

1. **Default Behavior**: When multi-store employee logs in, which storefront should be selected by default?
   - Option A: First in alphabetical order
   - Option B: Most recently used (requires backend session tracking)
   - Option C: Ask user to select on first login

2. **Switch Warning**: Should we show additional warning before switching? (e.g., "Are you sure you want to switch storefronts?")
   - Recommendation: No - extra click friction. Current location is always visible.

3. **Keyboard Shortcut**: Should we add keyboard shortcut for quick switching?
   - Recommendation: Yes - `Ctrl+Shift+S` for "Switch Storefront"

4. **Analytics**: Track storefront switches for business insights?
   - Recommendation: Yes - helps identify multi-location usage patterns

---

## Success Metrics

### Pre-Implementation Baseline
- User confusion incidents: ~5 per week (estimated from feedback)
- Wrong-storefront transactions: Unknown (no tracking)

### Post-Implementation Targets
- User confusion incidents: <1 per month
- Storefront visibility: 100% (always shown)
- Wrong-storefront transactions: 0 (prevented by cart lock)
- Switch success rate: >95% (smooth UX)

---

**Status**: 📋 Ready for Implementation  
**Priority**: High (User Experience)  
**Complexity**: Low (Mostly UI changes)  
**Backend Required**: None ✅
