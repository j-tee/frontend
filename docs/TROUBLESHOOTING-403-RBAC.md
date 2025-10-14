# Troubleshooting 403 Forbidden on RBAC Endpoints

## Issue
Getting 403 Forbidden errors when accessing RBAC endpoints from the frontend (Platform Management page).

## Root Cause Analysis

Based on your screenshots and backend testing:
- ✅ Backend API is working correctly (tested with Python requests)
- ✅ User has SUPER_USER role assigned
- ✅ Authentication token is valid
- ❌ Frontend is receiving 403 Forbidden

## Possible Causes

### 1. Token Not Being Sent
The frontend might not be sending the authentication token with requests.

**Check in Browser Console**:
```javascript
// Check if token exists
console.log('Token:', localStorage.getItem('token'));

// Check if token is being sent in headers
// Look at Network tab -> Headers -> Request Headers
// Should see: Authorization: Token <your-token>
```

### 2. Token Expired or Invalid
The token might have expired or been invalidated.

**Solution**: Re-login
1. Click "Sign out"
2. Login again with: `alphalogiquetechnologies@gmail.com`
3. Navigate to Platform Management

### 3. CORS Issues
The backend might be blocking requests due to CORS.

**Check Backend Logs**:
```bash
cd ~/Documents/Projects/pos/backend
# Look for CORS errors in Django logs
```

**Verify CORS Settings** (`app/settings.py`):
```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',  # ← Should include this
    'http://127.0.0.1:5173',
]
```

## Quick Fix Steps

### Step 1: Clear and Re-Login
```bash
# In browser console (F12)
localStorage.clear()
# Then refresh and login again
```

### Step 2: Verify Backend is Running
```bash
cd ~/Documents/Projects/pos/backend
python3 manage.py runserver

# Should see:
# Starting development server at http://127.0.0.1:8000/
```

### Step 3: Test Backend Directly
```bash
# Get a fresh token
curl -X POST http://localhost:8000/accounts/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"alphalogiquetechnologies@gmail.com","password":"Admin@2024!"}'

# Use the token to test RBAC endpoint
curl -X GET http://localhost:8000/accounts/api/rbac/roles/ \
  -H "Authorization: Token <your-token-here>"

# Should return 200 OK with roles data
```

### Step 4: Check Frontend Environment
```bash
cd ~/Documents/Projects/pos/frontend

# Check .env file
cat .env

# Should have:
# VITE_API_URL=http://localhost:8000
```

### Step 5: Restart Frontend
```bash
cd ~/Documents/Projects/pos/frontend

# Stop the dev server (Ctrl+C)
# Start again
npm run dev
```

## Detailed Debugging

### Check Browser Network Tab

1. Open Browser DevTools (F12)
2. Go to Network tab
3. Navigate to Platform Management page
4. Look at the failed requests (red ones)

**What to check**:
- **Request URL**: Should be `http://localhost:8000/accounts/api/rbac/...`
- **Request Headers**: Should include `Authorization: Token <token>`
- **Response**: Check the error message

### Check Browser Console

Look for JavaScript errors:
- Token missing errors
- CORS errors
- Network errors

### Common Error Patterns

#### Error 1: "Authorization header missing"
**Symptom**: 403 Forbidden, response says "Authentication credentials were not provided"

**Fix**: 
```javascript
// Check token in localStorage
console.log(localStorage.getItem('token'));

// If null, re-login
```

#### Error 2: "Invalid token"
**Symptom**: 403 Forbidden, response says "Invalid token"

**Fix**: Re-login to get a fresh token

#### Error 3: "User does not have permission"
**Symptom**: 403 Forbidden, response says "You do not have permission"

**Fix**: Verify user has SUPER_USER role
```bash
cd ~/Documents/Projects/pos/backend
python3 manage.py shell << 'EOF'
from accounts.models import User
user = User.objects.get(email='alphalogiquetechnologies@gmail.com')
print(f"Has SUPER_USER: {user.has_role_new('SUPER_USER')}")
EOF
```

## Immediate Fix (Most Likely Solution)

Based on the screenshots, the most likely issue is that the token needs to be refreshed. Here's what to do:

### Option 1: Re-Login (Easiest)
1. In the browser, click "Sign out" (top right)
2. Login again:
   - Email: `alphalogiquetechnologies@gmail.com`
   - Password: `Admin@2024!`
3. Navigate to Platform Management
4. RBAC endpoints should now work

### Option 2: Manual Token Refresh
1. Open Browser Console (F12)
2. Run this code:
```javascript
// Get new token
fetch('http://localhost:8000/accounts/api/auth/login/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'alphalogiquetechnologies@gmail.com',
    password: 'Admin@2024!'
  })
})
.then(r => r.json())
.then(data => {
  localStorage.setItem('token', data.token);
  console.log('Token refreshed!');
  window.location.reload();
});
```

## Verification

After fixing, verify RBAC endpoints are working:

1. Go to Platform Management page
2. Click on "Role Management" tab
3. Should see list of 5 roles:
   - Admin
   - Manager
   - Warehouse Staff
   - SUPER_USER
   - Cashier

4. No red error boxes
5. No 403 errors in Network tab

## Backend Verification (Already Done ✅)

Your backend is working correctly. We verified:
- ✅ User has SUPER_USER role
- ✅ RBAC endpoints return 200 OK
- ✅ Pagination working
- ✅ All permissions and roles accessible

The issue is purely frontend authentication/token related.

## Quick Test Script

Run this in browser console to test everything:
```javascript
// Test current token
const token = localStorage.getItem('token');
console.log('Current token:', token ? token.substring(0, 20) + '...' : 'MISSING');

// Test RBAC endpoint
fetch('http://localhost:8000/accounts/api/rbac/roles/', {
  headers: {
    'Authorization': `Token ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(async r => {
  console.log('Status:', r.status);
  const data = await r.json();
  console.log('Response:', data);
  if (r.status === 200) {
    console.log('✅ RBAC working! Found', data.count, 'roles');
  } else {
    console.log('❌ Error:', data);
  }
})
.catch(e => console.error('Network error:', e));
```

## Expected Output (Working)
```
Current token: 63306c1191813663b6ef...
Status: 200
Response: {count: 5, next: null, previous: null, results: Array(5)}
✅ RBAC working! Found 5 roles
```

## If Still Not Working

1. **Check if backend is actually running**:
   ```bash
   curl http://localhost:8000/accounts/api/rbac/roles/
   # Should NOT return "Connection refused"
   ```

2. **Check backend logs** for errors:
   ```bash
   cd ~/Documents/Projects/pos/backend
   tail -f logs/django.log
   ```

3. **Restart both servers**:
   ```bash
   # Backend
   cd ~/Documents/Projects/pos/backend
   python3 manage.py runserver
   
   # Frontend (in another terminal)
   cd ~/Documents/Projects/pos/frontend
   npm run dev
   ```

## Summary

**Most likely fix**: Just re-login to refresh your authentication token.

The backend is working perfectly (we tested it), so the issue is with the frontend authentication state.
