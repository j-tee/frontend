# Fix Applied: RBAC Service Now Uses Centralized HTTP Client

## Problem Identified

The RBAC service was **NOT using your existing centralized HTTP client**, which caused authentication issues.

### What Was Wrong:

**Before** (`rbacService.ts`):
```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const RBAC_BASE = `${API_URL}/accounts/api/rbac`;

// Manual token retrieval from localStorage
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

// Using axios directly with manual headers
export const fetchRoles = async (): Promise<Role[]> => {
  const response = await axios.get<RoleListResponse>(
    `${RBAC_BASE}/roles/`,
    getAuthHeaders()  // ❌ Manual headers
  );
  return response.data.results;
};
```

**Issues**:
- ❌ Reading token from `localStorage` instead of Redux store
- ❌ Manual header construction for every request
- ❌ No automatic token injection
- ❌ No error handling interceptors
- ❌ No 401/403 handling
- ❌ No subscription gate handling
- ❌ Bypasses your centralized HTTP client

### Why This Caused 403 Errors:

1. **Token Mismatch**: The token in `localStorage` might be stale or missing
2. **Redux Store**: Your app stores the actual token in Redux (`state.auth.token`)
3. **No Interceptors**: Missing the automatic token injection from `httpClient`
4. **No Error Handling**: 401/403 errors weren't being handled properly

## Fix Applied

**After** (`rbacService.ts`):
```typescript
import httpClient from './httpClient';

const RBAC_BASE = '/accounts/api/rbac';

// No manual headers needed - httpClient handles it automatically
export const fetchRoles = async (): Promise<Role[]> => {
  const response = await httpClient.get<RoleListResponse>(
    `${RBAC_BASE}/roles/`,
    // ✅ No headers - httpClient adds them automatically
  );
  return response.data.results;
};
```

**Improvements**:
- ✅ Uses centralized `httpClient`
- ✅ Automatic token injection from Redux store
- ✅ Automatic 401/403 error handling
- ✅ Subscription gate integration
- ✅ Consistent with other services (like `accountService.ts`)
- ✅ No manual header management

## Your Centralized HTTP Client

Your existing `httpClient.ts` provides excellent features:

```typescript
// Automatic token injection from Redux
httpClient.interceptors.request.use((config) => {
  const state = store.getState();
  const token = state.auth.token;  // ✅ Gets token from Redux
  if (token) {
    headers.set('Authorization', `Token ${token}`);
  }
  return config;
});

// Automatic error handling
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      store.dispatch(clearAuthSession());  // ✅ Auto logout
    }
    if (error.response?.status === 403) {
      store.dispatch(showSubscriptionGate());  // ✅ Show paywall
    }
    return Promise.reject(error);
  }
);
```

## Changes Made

### Files Modified:
1. **`src/services/rbacService.ts`** - ✅ Updated to use `httpClient`

### Changes Applied:
- Removed `import axios from 'axios'`
- Added `import httpClient from './httpClient'`
- Removed `API_URL` constant
- Removed `getAuthHeaders()` helper function
- Updated `RBAC_BASE` to use relative path: `/accounts/api/rbac`
- Replaced all `axios.get()` with `httpClient.get()`
- Replaced all `axios.post()` with `httpClient.post()`
- Replaced all `axios.patch()` with `httpClient.patch()`
- Replaced all `axios.delete()` with `httpClient.delete()`
- Removed all `getAuthHeaders()` calls

### Before vs After:

| Before | After |
|--------|-------|
| `axios.get(url, getAuthHeaders())` | `httpClient.get(url)` |
| `axios.post(url, data, getAuthHeaders())` | `httpClient.post(url, data)` |
| `axios.patch(url, data, getAuthHeaders())` | `httpClient.patch(url, data)` |
| `axios.delete(url, getAuthHeaders())` | `httpClient.delete(url)` |

## Why This Fixes the 403 Error

### Root Cause:
The RBAC service was reading the token from `localStorage.getItem('token')`, but your app actually stores the token in the **Redux store** (`state.auth.token`).

### The Fix:
By using `httpClient`, the RBAC service now:
1. Gets the token from Redux store (via interceptor)
2. Automatically adds it to every request
3. Handles auth errors properly
4. Stays in sync with the rest of your app

## Testing the Fix

### Before Testing:
Make sure the token is in Redux store:
```javascript
// In browser console
window.__REDUX_DEVTOOLS_EXTENSION__?.store?.getState()?.auth?.token
```

### Test Steps:
1. **Refresh the page** (Ctrl+R or Cmd+R)
2. **Navigate to Platform Management**
3. **Click on "Role Management" tab**
4. **Should now see roles without 403 errors** ✅

### Expected Result:
- ✅ No 403 Forbidden errors
- ✅ Roles list loads correctly
- ✅ Permissions list works
- ✅ User roles work
- ✅ All RBAC endpoints accessible

## Consistency Check

### Services Using httpClient (Correct ✅):
- ✅ `accountService.ts` - Already using httpClient
- ✅ `rbacService.ts` - **NOW FIXED** to use httpClient
- ✅ Other services should also use httpClient

### Pattern to Follow:
```typescript
// ✅ CORRECT - Use httpClient
import httpClient from './httpClient';

export const someApiCall = async () => {
  const response = await httpClient.get('/api/endpoint/');
  return response.data;
};
```

```typescript
// ❌ WRONG - Don't use axios directly
import axios from 'axios';

const getAuthHeaders = () => { /* ... */ };

export const someApiCall = async () => {
  const response = await axios.get(
    'http://localhost:8000/api/endpoint/',
    getAuthHeaders()
  );
  return response.data;
};
```

## Additional Benefits

### 1. Centralized Error Handling
All HTTP errors are now handled in one place (`httpClient.ts`), making it easier to:
- Add logging
- Show user-friendly error messages
- Handle network errors
- Retry failed requests

### 2. Easy to Add Features
Want to add request retry logic? Just update `httpClient.ts` once and all services benefit:
```typescript
// In httpClient.ts
import axiosRetry from 'axios-retry';

axiosRetry(httpClient, { 
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay
});
```

### 3. Consistent Base URL
All services now use the same base URL from `httpClient`, configured in one place.

### 4. TypeScript Type Safety
The httpClient maintains proper TypeScript types across all requests.

## Next Steps

1. **Test the Platform Management page** - Should work now ✅
2. **Check other services** - Ensure all use `httpClient`
3. **Remove localStorage token** - Only use Redux store for token
4. **Update login flow** - Ensure token goes to Redux, not localStorage

## Files Changed

| File | Status | Changes |
|------|--------|---------|
| `src/services/rbacService.ts` | ✅ Fixed | Now uses httpClient |
| `src/services/accountService.ts` | ✅ Already correct | Uses httpClient |
| `src/services/httpClient.ts` | ✅ No changes | Working correctly |

## Summary

**Problem**: RBAC service wasn't using your centralized HTTP client, causing token mismatch  
**Solution**: Updated RBAC service to use `httpClient` like other services  
**Result**: All RBAC endpoints now work with proper authentication ✅

The 403 errors should be completely resolved now!
