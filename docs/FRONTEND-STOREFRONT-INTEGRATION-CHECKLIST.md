# ✅ Frontend Integration Checklist - Storefront Filtering

**Backend Status:** ✅ Complete  
**Frontend Status:** ⏳ Pending  
**Target:** Sales History page multi-storefront filtering

---

## 📋 Implementation Checklist

### Phase 1: User Slice Updates ⏳

#### File: `src/store/slices/userSlice.ts`

- [ ] **1.1 Add Storefront Interface**
  ```typescript
  interface Storefront {
    id: string
    name: string
    location: string
    is_active: boolean
  }
  ```

- [ ] **1.2 Update UserState**
  ```typescript
  interface UserState {
    currentUser: User | null
    accessibleStorefronts: Storefront[]  // ← ADD THIS
    storefrontsLoading: boolean          // ← ADD THIS
    storefrontsError: string | null      // ← ADD THIS
    // ... existing fields
  }
  ```

- [ ] **1.3 Update Initial State**
  ```typescript
  const initialState: UserState = {
    currentUser: null,
    accessibleStorefronts: [],     // ← ADD THIS
    storefrontsLoading: false,     // ← ADD THIS
    storefrontsError: null,        // ← ADD THIS
    // ... existing initial state
  }
  ```

- [ ] **1.4 Create loadUserStorefronts Thunk**
  ```typescript
  export const loadUserStorefronts = createAsyncThunk(
    'user/loadStorefronts',
    async () => {
      const response = await api.get('/api/users/storefronts/')
      return response.data.storefronts
    }
  )
  ```

- [ ] **1.5 Add Extra Reducers**
  ```typescript
  extraReducers: (builder) => {
    builder
      .addCase(loadUserStorefronts.pending, (state) => {
        state.storefrontsLoading = true
        state.storefrontsError = null
      })
      .addCase(loadUserStorefronts.fulfilled, (state, action) => {
        state.storefrontsLoading = false
        state.accessibleStorefronts = action.payload
      })
      .addCase(loadUserStorefronts.rejected, (state, action) => {
        state.storefrontsLoading = false
        state.storefrontsError = action.error.message || 'Failed to load'
      })
  }
  ```

- [ ] **1.6 Add Selectors**
  ```typescript
  export const selectUserStorefronts = (state: RootState) => 
    state.user.accessibleStorefronts
  
  export const selectStorefrontsLoading = (state: RootState) => 
    state.user.storefrontsLoading
  ```

---

### Phase 2: Sales Slice Updates ⏳

#### File: `src/store/slices/salesSlice.ts`

- [ ] **2.1 Update SalesFilters Interface**
  ```typescript
  interface SalesFilters {
    storefront?: string  // ← ADD THIS (UUID)
    status?: string
    type?: 'RETAIL' | 'WHOLESALE'
    customer?: string
    date_from?: string
    date_to?: string
    search?: string
  }
  ```

- [ ] **2.2 Add Storefront Filter Selector**
  ```typescript
  export const selectStorefrontFilter = (state: RootState) => 
    state.sales.salesFilters.storefront
  ```

---

### Phase 3: Load Storefronts on Init ⏳

#### File: `src/App.tsx` OR `src/components/Dashboard.tsx`

- [ ] **3.1 Import Thunk**
  ```typescript
  import { loadUserStorefronts } from '@/store/slices/userSlice'
  ```

- [ ] **3.2 Add useEffect Hook**
  ```typescript
  useEffect(() => {
    // Load user's storefronts when app initializes
    const user = getCurrentUser() // Your auth check
    if (user) {
      void dispatch(loadUserStorefronts())
    }
  }, [dispatch])
  ```

---

### Phase 4: Update SalesHistory Component ⏳

#### File: `src/features/dashboard/components/sales/SalesHistory.tsx`

- [ ] **4.1 Import User Storefronts Selector**
  ```typescript
  import { selectUserStorefronts } from '@/store/slices/userSlice'
  ```

- [ ] **4.2 Add Local State**
  ```typescript
  const userStorefronts = useAppSelector(selectUserStorefronts)
  const [selectedStorefront, setSelectedStorefront] = useState<string>(
    filters.storefront || ''
  )
  ```

- [ ] **4.3 Determine Dropdown Visibility**
  ```typescript
  const showStorefrontFilter = userStorefronts.length > 1
  ```

- [ ] **4.4 Add handleStorefrontChange**
  ```typescript
  const handleStorefrontChange = (storefrontId: string) => {
    console.log('🏪 Storefront filter changed:', storefrontId)
    setSelectedStorefront(storefrontId)
    dispatch(setSalesPage(1)) // Reset to page 1
    
    if (storefrontId) {
      // Add storefront filter
      dispatch(setSalesFilters({ ...filters, storefront: storefrontId }))
    } else {
      // Remove storefront filter (show all)
      const { storefront, ...rest } = filters
      dispatch(setSalesFilters(rest))
    }
  }
  ```

- [ ] **4.5 Add Storefront Dropdown (Before Status Filter)**
  ```tsx
  <Row className="mb-3 g-2">
    {/* Storefront selector - only if multiple storefronts */}
    {showStorefrontFilter && (
      <Col md={3}>
        <Form.Select
          size="sm"
          value={selectedStorefront}
          onChange={(e) => handleStorefrontChange(e.target.value)}
          aria-label="Filter by storefront"
        >
          <option value="">🏪 All My Stores</option>
          {userStorefronts.map(store => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </Form.Select>
      </Col>
    )}
    
    {/* Existing status filter */}
    <Col md={3}>
      {/* ... status dropdown ... */}
    </Col>
    
    {/* Other filters... */}
  </Row>
  ```

- [ ] **4.6 Add Storefront Filter Badge**
  ```tsx
  {/* Active filters display */}
  <div className="mb-2">
    {selectedStorefront && (
      <Badge bg="primary" className="me-2">
        📍 {userStorefronts.find(s => s.id === selectedStorefront)?.name}
        <button 
          className="ms-2 btn-close btn-close-white"
          onClick={() => handleStorefrontChange('')}
          aria-label="Remove storefront filter"
          style={{ fontSize: '0.65rem' }}
        />
      </Badge>
    )}
    {/* Other filter badges... */}
  </div>
  ```

- [ ] **4.7 Update Clear Filters Handler**
  ```typescript
  const handleClearFilters = () => {
    setSelectedStatus('COMPLETED')
    setSelectedStorefront('')  // ← ADD THIS
    setSelectedSaleType('')
    setSearchQuery('')
    setDateRange({ from: '', to: '' })
    
    dispatch(setSalesFilters({ status: 'COMPLETED' }))
    dispatch(setSalesPage(1))
  }
  ```

---

### Phase 5: Testing ⏳

#### 5.1 Single Storefront User Test
- [ ] Login as user with ONE storefront
- [ ] Go to Sales History
- [ ] **Verify:** NO storefront dropdown visible
- [ ] **Verify:** Status filter works
- [ ] **Verify:** Sees sales from their one storefront

#### 5.2 Multi-Storefront User Test
- [ ] Login as user with MULTIPLE storefronts
- [ ] Go to Sales History
- [ ] **Verify:** Storefront dropdown visible
- [ ] **Verify:** Default shows "All My Stores"
- [ ] **Verify:** Dropdown lists all accessible storefronts
- [ ] Select specific storefront
- [ ] **Verify:** Sales filtered to that storefront
- [ ] **Verify:** Active filter badge shows storefront name
- [ ] **Verify:** Status filter still works
- [ ] Click badge × to clear
- [ ] **Verify:** Returns to "All My Stores"

#### 5.3 Combined Filters Test
- [ ] Select storefront
- [ ] Select status (COMPLETED)
- [ ] **Verify:** Shows COMPLETED sales from that storefront
- [ ] Change status to PENDING
- [ ] **Verify:** Shows PENDING sales from same storefront
- [ ] Clear storefront filter
- [ ] **Verify:** Shows PENDING sales from all storefronts

#### 5.4 Clear Filters Test
- [ ] Apply storefront + status + date filters
- [ ] Click "Clear All Filters"
- [ ] **Verify:** Storefront reset to "All My Stores"
- [ ] **Verify:** Status reset to COMPLETED
- [ ] **Verify:** Date filters cleared
- [ ] **Verify:** Page reset to 1

#### 5.5 Browser Console Test
- [ ] Open browser console
- [ ] Check for errors
- [ ] **Verify:** See log: "🏪 Storefront filter changed: <uuid>"
- [ ] Check Redux state:
  ```javascript
  console.log(store.getState().user.accessibleStorefronts)
  console.log(store.getState().sales.salesFilters)
  ```

---

### Phase 6: Error Handling ⏳

- [ ] **6.1 Handle API Errors**
  ```typescript
  // Show error if storefronts fail to load
  const storefrontsError = useAppSelector(state => state.user.storefrontsError)
  
  {storefrontsError && (
    <Alert variant="warning">
      Unable to load storefronts: {storefrontsError}
    </Alert>
  )}
  ```

- [ ] **6.2 Handle Loading State**
  ```typescript
  const storefrontsLoading = useAppSelector(selectStorefrontsLoading)
  
  // Disable dropdown while loading
  <Form.Select disabled={storefrontsLoading}>
  ```

- [ ] **6.3 Handle Empty Storefronts**
  ```typescript
  // If user has no storefronts (shouldn't happen)
  {userStorefronts.length === 0 && (
    <Alert variant="info">
      No storefronts assigned to your account
    </Alert>
  )}
  ```

---

### Phase 7: Polish ⏳

- [ ] **7.1 Add Loading Spinner**
  ```tsx
  {storefrontsLoading && <Spinner size="sm" className="ms-2" />}
  ```

- [ ] **7.2 Add Tooltips**
  ```tsx
  <OverlayTrigger
    overlay={<Tooltip>Filter sales by storefront</Tooltip>}
  >
    <Form.Select>...</Form.Select>
  </OverlayTrigger>
  ```

- [ ] **7.3 Add Keyboard Accessibility**
  ```tsx
  <Form.Select
    aria-label="Filter by storefront"
    title="Select a storefront to filter sales"
  >
  ```

- [ ] **7.4 Style Active Filter Badge**
  ```tsx
  <Badge 
    bg="primary" 
    className="d-inline-flex align-items-center gap-1"
  >
    📍 {storefront.name}
    <button 
      className="btn-close btn-close-white"
      style={{ fontSize: '0.65rem' }}
    />
  </Badge>
  ```

---

## 🧪 Testing Commands

### Backend API Test
```bash
# Test with cURL
TOKEN="your-token"

# Get storefronts
curl -H "Authorization: Token $TOKEN" \
  http://localhost:8000/api/users/storefronts/ | jq

# Get sales with storefront filter
curl -H "Authorization: Token $TOKEN" \
  "http://localhost:8000/sales/api/sales/?status=COMPLETED&storefront=<uuid>" | jq
```

### Frontend Console Test
```javascript
// Test in browser console
const store = window.__REDUX_DEVTOOLS_EXTENSION__.store

// Check state
console.log('Storefronts:', store.getState().user.accessibleStorefronts)
console.log('Filters:', store.getState().sales.salesFilters)

// Test API
const token = localStorage.getItem('token')
fetch('/api/users/storefronts/', {
  headers: { 'Authorization': `Token ${token}` }
})
  .then(r => r.json())
  .then(data => console.log('API Response:', data))
```

---

## ✅ Definition of Done

**Feature is complete when:**

1. ✅ User slice has storefront state
2. ✅ Storefronts load on app init
3. ✅ Single storefront users see NO dropdown
4. ✅ Multi-storefront users see dropdown
5. ✅ Dropdown shows all accessible storefronts
6. ✅ Storefront filter updates API params
7. ✅ Active filter badge displays
8. ✅ Badge can be cleared by clicking ×
9. ✅ Clear filters resets storefront
10. ✅ Status filter works with storefront filter
11. ✅ No console errors
12. ✅ Loading/error states handled
13. ✅ Accessibility attributes added
14. ✅ All tests pass

---

## 📚 Reference Documentation

- **Backend Summary:** STOREFRONT-FILTERING-IMPLEMENTATION-SUMMARY.md
- **Full Requirements:** STOREFRONT-FILTERING-REQUIREMENTS.md
- **API Docs:** See "API Usage Examples" in requirements doc
- **Original Issue:** BACKEND-SALES-FILTER-ISSUE.md

---

## 🆘 Troubleshooting

### Issue: Storefronts not loading
**Check:**
- [ ] Is API endpoint correct? `/api/users/storefronts/`
- [ ] Is thunk dispatched on app init?
- [ ] Check browser network tab for 200 response
- [ ] Check Redux DevTools for action

### Issue: Dropdown not showing
**Check:**
- [ ] Does user have > 1 storefront?
- [ ] Is `showStorefrontFilter` condition correct?
- [ ] Check `userStorefronts.length` in console

### Issue: Filter not applying
**Check:**
- [ ] Is storefront ID being set in Redux?
- [ ] Check API params in network tab
- [ ] Verify backend receives `storefront` parameter

### Issue: Badge not showing
**Check:**
- [ ] Is `selectedStorefront` state set?
- [ ] Is storefront found in `userStorefronts` array?
- [ ] Check conditional rendering logic

---

**Start Here:** ✅ Phase 1, Task 1.1  
**Questions?** See STOREFRONT-FILTERING-REQUIREMENTS.md
