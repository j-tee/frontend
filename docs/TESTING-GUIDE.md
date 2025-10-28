# RBAC and Account Management Testing Guide

## Quick Start Testing

### Prerequisites
- Backend server running on http://localhost:8000
- Frontend server running on http://localhost:5173
- Platform owner account created (alphalogiquetechnologies@gmail.com)

## Backend Testing (Python)

### 1. Test User Model Fields

```bash
cd ~/Documents/Projects/pos/backend
python3 manage.py shell << 'EOF'
from accounts.models import User

user = User.objects.filter(email='alphalogiquetechnologies@gmail.com').first()
print(f"✅ Language: {user.language}")
print(f"✅ Timezone: {user.timezone}")
print(f"✅ Date Format: {user.date_format}")
print(f"✅ 2FA Enabled: {user.two_factor_enabled}")
print(f"✅ Preferences: {user.preferences}")
print(f"✅ Notifications: {user.notification_settings}")
EOF
```

### 2. Test Profile Endpoint

```python
import requests

# Login
response = requests.post('http://localhost:8000/accounts/api/auth/login/', 
    json={'email':'alphalogiquetechnologies@gmail.com', 'password':'Admin@2024!'})
token = response.json()['token']
headers = {'Authorization': f'Token {token}'}

# Get profile
response = requests.get('http://localhost:8000/accounts/api/profile/', headers=headers)
print(f"Status: {response.status_code}")
print(f"Profile: {response.json()}")
```

### 3. Test 2FA Enable

```python
# Enable 2FA
response = requests.post('http://localhost:8000/accounts/api/2fa/enable/', headers=headers)
data = response.json()
print(f"QR Code: {data['qr_code'][:50]}...")
print(f"Secret: {data['secret']}")
print(f"Backup Codes: {len(data['backup_codes'])} codes")
```

### 4. Test Preferences Update

```python
# Update preferences
response = requests.patch('http://localhost:8000/accounts/api/preferences/', 
    headers=headers,
    json={
        'language': 'fr',
        'timezone': 'Europe/Paris',
        'time_format': '12h'
    })
print(f"Status: {response.status_code}")
print(f"Message: {response.json()}")

# Verify update
response = requests.get('http://localhost:8000/accounts/api/preferences/', headers=headers)
print(f"Updated Preferences: {response.json()}")
```

### 5. Test Notification Settings

```python
# Update notification settings
response = requests.patch('http://localhost:8000/accounts/api/notifications/', 
    headers=headers,
    json={
        'sales_email': True,
        'sales_push': False,
        'inventory_sms': True
    })
print(f"Status: {response.status_code}")

# Verify update
response = requests.get('http://localhost:8000/accounts/api/notifications/', headers=headers)
print(f"Updated Notifications: {response.json()}")
```

### 6. Test RBAC Pagination

```python
# Test roles with pagination
response = requests.get('http://localhost:8000/accounts/api/rbac/roles/?page=1&page_size=5', 
    headers=headers)
data = response.json()
print(f"Count: {data['count']}")
print(f"Next: {data['next']}")
print(f"Results: {len(data['results'])} roles")
```

## Frontend Testing (Manual)

### 1. Login and Navigation
1. Open http://localhost:5173
2. Login with platform owner credentials
3. Navigate to Platform Dashboard
4. Click on "Account Settings" or go to /app/account

### 2. Profile Settings
1. Go to "Profile" tab
2. Update name
3. Upload profile picture (max 5MB, JPEG/PNG/GIF/WebP)
4. Click "Save Changes"
5. Verify picture appears in navigation bar

### 3. Security Settings
1. Go to "Security" tab
2. Click "Change Password"
3. Enter current password and new password
4. Verify success message

### 4. Enable 2FA
1. In Security tab, click "Enable Two-Factor Authentication"
2. Scan QR code with authenticator app (Google Authenticator, Authy)
3. Enter 6-digit code
4. Save backup codes (8 codes displayed)
5. Verify 2FA is enabled (shows "2FA Enabled" badge)

### 5. Disable 2FA
1. Click "Disable Two-Factor Authentication"
2. Enter password for confirmation
3. Verify 2FA is disabled

### 6. Preferences Settings
1. Go to "Preferences" tab
2. Change language to French
3. Change timezone to Europe/Paris
4. Change date format to MM/DD/YYYY
5. Change time format to 12-hour
6. Change currency to EUR
7. Click "Save Preferences"
8. Verify preferences are saved (reload page to confirm persistence)

### 7. Notification Settings
1. Go to "Notifications" tab
2. Toggle email notifications for Sales
3. Toggle push notifications for Inventory
4. Toggle SMS notifications for Payments
5. Click "Save Settings"
6. Verify settings are saved

### 8. RBAC Management (Super Admin Only)
1. Go to Platform Dashboard
2. Click "Role Management" tab
3. Create new role:
   - Name: "Store Manager"
   - Description: "Manages store operations"
   - Level: "BUSINESS"
   - Select permissions: SALES:VIEW, SALES:CREATE, INVENTORY:VIEW
4. Click "Create Role"
5. Verify role appears in list

### 9. User Role Assignment
1. Go to "User Roles" tab
2. Select a user
3. Assign "Store Manager" role
4. Select scope: BUSINESS
5. Click "Assign Role"
6. Verify assignment in user's roles list

### 10. Test Pagination
1. Go to "Permissions" tab
2. Verify pagination controls appear
3. Change page size to 10
4. Navigate to page 2
5. Verify URL updates with page parameter

## API Testing with cURL

### Get Profile
```bash
# Login first
TOKEN=$(curl -s -X POST http://localhost:8000/accounts/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"alphalogiquetechnologies@gmail.com","password":"Admin@2024!"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

# Get profile
curl -X GET http://localhost:8000/accounts/api/profile/ \
  -H "Authorization: Token $TOKEN" | python3 -m json.tool
```

### Enable 2FA
```bash
curl -X POST http://localhost:8000/accounts/api/2fa/enable/ \
  -H "Authorization: Token $TOKEN" | python3 -m json.tool
```

### Update Preferences
```bash
curl -X PATCH http://localhost:8000/accounts/api/preferences/ \
  -H "Authorization: Token $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "fr",
    "timezone": "Europe/Paris",
    "time_format": "12h"
  }' | python3 -m json.tool
```

### Upload Profile Picture
```bash
curl -X POST http://localhost:8000/accounts/api/profile/picture/ \
  -H "Authorization: Token $TOKEN" \
  -F "profile_picture=@/path/to/image.jpg"
```

### Test Pagination
```bash
curl -X GET "http://localhost:8000/accounts/api/rbac/roles/?page=1&page_size=5" \
  -H "Authorization: Token $TOKEN" | python3 -m json.tool
```

## Integration Testing Checklist

### User Account Management
- [ ] Profile view loads correctly
- [ ] Profile update saves successfully
- [ ] Profile picture upload works
- [ ] Profile picture displays in UI
- [ ] Change password works
- [ ] Password validation enforced
- [ ] Preferences persist to database
- [ ] Preferences load on page refresh
- [ ] Notification settings save correctly
- [ ] Notification settings load correctly

### 2FA Flow
- [ ] Enable 2FA generates QR code
- [ ] QR code is scannable
- [ ] Secret is displayed
- [ ] Backup codes are generated (8 codes)
- [ ] Backup codes can be downloaded
- [ ] Verify code works with authenticator app
- [ ] 2FA badge shows "Enabled" after verification
- [ ] Disable 2FA requires password
- [ ] Disable 2FA clears secrets
- [ ] 2FA status persists

### RBAC Management
- [ ] Permissions list loads with pagination
- [ ] Permissions filter by category works
- [ ] Roles list loads with pagination
- [ ] Create role works
- [ ] Update role works
- [ ] Delete role works (except system roles)
- [ ] System roles cannot be deleted
- [ ] Assign permissions to role works
- [ ] Assign role to user works
- [ ] User role scope selection works
- [ ] User permissions list works

### API Endpoints
- [ ] All endpoints return correct status codes
- [ ] Error messages are user-friendly
- [ ] Authorization is enforced
- [ ] Pagination parameters work
- [ ] Filters work on list endpoints
- [ ] POST/PUT/PATCH requests validate data
- [ ] DELETE requests require confirmation
- [ ] Media files are served correctly

## Expected Results

### Profile Endpoint
```json
{
  "id": "uuid",
  "email": "alphalogiquetechnologies@gmail.com",
  "name": "Platform Owner",
  "profile_picture": null,
  "profile_picture_url": null,
  "platform_role": "NONE",
  "is_active": true,
  "created_at": "2024-...",
  "preferences": {
    "language": "en",
    "timezone": "Africa/Accra",
    "date_format": "DD/MM/YYYY",
    "time_format": "24h",
    "currency": "GHS",
    "enable_email_notifications": true,
    "enable_push_notifications": true,
    "enable_sms_notifications": false
  },
  "notification_settings": {
    "sales_email": true,
    "sales_push": true,
    "sales_sms": false,
    "inventory_email": true,
    "inventory_push": true,
    "inventory_sms": false,
    "payments_email": true,
    "payments_push": true,
    "payments_sms": false,
    "users_email": true,
    "users_push": false,
    "users_sms": false,
    "system_email": true,
    "system_push": true,
    "system_sms": false
  },
  "two_factor_enabled": false
}
```

### 2FA Enable Response
```json
{
  "message": "2FA setup initiated. Please scan the QR code and verify with a code.",
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUh...",
  "secret": "JBSWY3DPEHPK3PXP",
  "backup_codes": [
    "a1b2-c3d4",
    "e5f6-g7h8",
    "i9j0-k1l2",
    "m3n4-o5p6",
    "q7r8-s9t0",
    "u1v2-w3x4",
    "y5z6-a7b8",
    "c9d0-e1f2"
  ]
}
```

### Paginated Roles Response
```json
{
  "count": 5,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "uuid",
      "name": "SUPER_USER",
      "description": "Platform super admin with all permissions",
      "level": "PLATFORM",
      "is_system_role": true,
      "is_active": true,
      "permissions": [...]
    },
    // ... more roles
  ]
}
```

## Troubleshooting

### 2FA Not Working
- Ensure device time is synchronized (TOTP requires accurate time)
- Check that QR code scanned correctly
- Try manual entry of secret key
- Verify code is 6 digits
- Check that verification endpoint is being called

### Profile Picture Not Uploading
- Check file size (<5MB)
- Check file type (JPEG, PNG, GIF, WebP only)
- Verify media folder exists and is writable
- Check MEDIA_URL and MEDIA_ROOT in settings
- Verify URL patterns include media serving in development

### Preferences Not Persisting
- Check that PATCH request is being made
- Verify user is authenticated
- Check database for updated values
- Verify serializer validation passes
- Check for JavaScript errors in console

### Pagination Not Working
- Verify page and page_size parameters in URL
- Check that pagination_class is set on viewset
- Verify response has count, next, previous, results
- Check frontend is handling paginated response correctly

---

**Note**: This guide assumes development environment. For production testing, replace localhost URLs with production URLs and ensure HTTPS is used for all endpoints.
