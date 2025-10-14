# Development Subscription Bypass Guide

**Date**: October 14, 2025  
**Status**: ✅ ACTIVE

## Overview

During development, you can bypass subscription checks to continue working without needing active subscriptions for test accounts.

## Backend Bypass (✅ ENABLED)

### Configuration

The backend automatically bypasses subscription checks when `BYPASS_SUBSCRIPTION_CHECK=True` is set in `.env`.

**File**: `backend/.env`
```env
BYPASS_SUBSCRIPTION_CHECK=True
```

### How It Works

The bypass is implemented in two key methods:

**1. User.has_active_subscription()** (`accounts/models.py:364`)
```python
def has_active_subscription(self):
    """
    Check if user has access to any business with active subscription.
    Returns True if user is member of at least one business with active subscription.
    """
    from django.conf import settings
    
    # Bypass check if setting is enabled (typically in DEBUG mode)
    if getattr(settings, 'BYPASS_SUBSCRIPTION_CHECK', False):
        return True
    
    # Platform admins always have access
    if self.is_platform_admin:
        return True
    
    # Check if user has membership in any business with active subscription
    # ... rest of the method
```

**2. Business.has_active_subscription** (`accounts/models.py:665`)
```python
def has_active_subscription(self):
    """Check if business has active subscription"""
    from django.conf import settings
    
    # Development bypass
    if getattr(settings, 'BYPASS_SUBSCRIPTION_CHECK', False):
        return True
    
    # ... rest of the method
```

### Verification

Check that bypass is working:

```bash
cd ~/Documents/Projects/pos/backend
python manage.py shell -c "
from django.conf import settings
from accounts.models import User

print(f'DEBUG: {settings.DEBUG}')
print(f'BYPASS_SUBSCRIPTION_CHECK: {getattr(settings, \"BYPASS_SUBSCRIPTION_CHECK\", False)}')

user = User.objects.first()
if user:
    print(f'User has_active_subscription(): {user.has_active_subscription()}')
"
```

**Expected Output**:
```
DEBUG: True
BYPASS_SUBSCRIPTION_CHECK: True
User has_active_subscription(): True
```

## Frontend Bypass (✅ CONFIGURED)

### Configuration

Add bypass flag to frontend environment:

**File**: `frontend/.env`
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_BYPASS_SUBSCRIPTION_CHECK=true
```

### Usage in Code

You can use this in components that check subscription status:

```typescript
// Check if in development mode with bypass enabled
const bypassSubscriptionCheck = import.meta.env.VITE_BYPASS_SUBSCRIPTION_CHECK === 'true'

// Use in conditional rendering
if (bypassSubscriptionCheck || user?.subscription_status === 'Active') {
  // Allow access
}
```

### Example Implementation

If you need to hide subscription warnings in development:

```typescript
// In a component
const isDevelopmentBypass = import.meta.env.VITE_BYPASS_SUBSCRIPTION_CHECK === 'true'

// Don't show warning toast in development
if (!isDevelopmentBypass && subscriptionStatus === 'Inactive') {
  toast.warning('Your subscription is inactive')
}
```

## Current Status

### ✅ What's Working

1. **Backend bypass enabled** - All subscription checks return `True` in development
2. **Frontend .env configured** - `VITE_BYPASS_SUBSCRIPTION_CHECK=true` added
3. **Users can login** - No subscription requirement for authentication
4. **All features accessible** - Business operations work without active subscriptions

### Test Results

```
🧪 Testing subscription bypass for: mikedit009@gmail.com
============================================================
has_active_subscription(): True

Business Memberships: 2
  - Datalogique Ghana (OWNER)
    Subscription: None (bypassed in dev)
  - Test Electronics Store (STAFF)
    Subscription: None (bypassed in dev)

✅ User should be able to login without subscription issues
```

## Production Considerations

### ⚠️ IMPORTANT

**NEVER enable bypass in production!**

1. **Backend**: Set `BYPASS_SUBSCRIPTION_CHECK=False` or remove from `.env`
2. **Frontend**: Set `VITE_BYPASS_SUBSCRIPTION_CHECK=false` or remove from `.env`
3. **Verify**: Check that `DEBUG=False` in production settings

### Production Deployment Checklist

Before deploying to production:

- [ ] Remove or set `BYPASS_SUBSCRIPTION_CHECK=False` in backend `.env`
- [ ] Remove or set `VITE_BYPASS_SUBSCRIPTION_CHECK=false` in frontend `.env`
- [ ] Verify `DEBUG=False` in production settings
- [ ] Test subscription enforcement with inactive test account
- [ ] Verify subscription payment flow works correctly
- [ ] Check subscription expiry notifications are sent

## Troubleshooting

### Issue: Still getting subscription warnings

**Solution 1**: Restart backend server
```bash
# Kill existing process
pkill -f "python manage.py runserver"

# Restart
cd ~/Documents/Projects/pos/backend
python manage.py runserver
```

**Solution 2**: Check environment variable is loaded
```bash
cd ~/Documents/Projects/pos/backend
python manage.py shell -c "
from django.conf import settings
print(f'BYPASS_SUBSCRIPTION_CHECK: {getattr(settings, \"BYPASS_SUBSCRIPTION_CHECK\", None)}')
"
```

**Solution 3**: Restart frontend dev server
```bash
# In frontend directory
npm run dev
```

### Issue: Frontend still showing warnings

If the frontend is still showing subscription-related warnings in the UI:

1. **Check browser console** - Look for API errors
2. **Clear browser storage** - Clear localStorage/sessionStorage
3. **Hard refresh** - Ctrl+Shift+R (or Cmd+Shift+R on Mac)
4. **Restart dev server** - Stop and restart `npm run dev`

### Issue: API returns subscription errors

Check that backend bypass is working:

```bash
# Test API endpoint directly
curl -X GET http://localhost:8000/api/auth/user/ \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

The response should include user data without subscription errors.

## Related Files

### Backend
- `backend/.env` - Environment configuration
- `backend/app/settings.py:376-377` - Bypass setting definition
- `backend/accounts/models.py:364` - User subscription check
- `backend/accounts/models.py:665` - Business subscription check

### Frontend
- `frontend/.env` - Environment configuration
- Use `import.meta.env.VITE_BYPASS_SUBSCRIPTION_CHECK` in components

## Summary

✅ **Backend**: Subscription checks bypassed with `BYPASS_SUBSCRIPTION_CHECK=True`  
✅ **Frontend**: Configured with `VITE_BYPASS_SUBSCRIPTION_CHECK=true`  
✅ **Login**: Working without subscription requirements  
✅ **Development**: Full access to all features  

You can now continue development without any subscription-related restrictions!

---

**Note**: Remember to disable bypass before production deployment to enforce proper subscription management.
