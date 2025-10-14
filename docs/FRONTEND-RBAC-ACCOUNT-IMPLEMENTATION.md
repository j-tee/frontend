# Frontend RBAC and Account Management Implementation

## Overview
This document summarizes the frontend implementation to integrate with the backend RBAC (Role-Based Access Control) system and complete account management features.

## Implementation Date
October 14, 2025

## Components Implemented

### 1. RBAC Type Definitions (`src/types/rbac.ts`)
Complete TypeScript interfaces matching backend Django models:

**Core Types:**
- `Permission` - Represents a single permission with category, action, and resource
- `Role` - Role with associated permissions and level (PLATFORM/BUSINESS/STOREFRONT)
- `UserRole` - Junction table for user-role assignments with scope
- `RoleTemplate` - Pre-defined role templates

**Enums:**
- `PermissionCategory`: SALES, INVENTORY, CUSTOMERS, REPORTS, USERS, SETTINGS, PLATFORM, FINANCE
- `PermissionAction`: CREATE, READ, UPDATE, DELETE, APPROVE, EXPORT, IMPORT, MANAGE
- `RoleLevel`: PLATFORM, BUSINESS, STOREFRONT
- `RoleScope`: PLATFORM, BUSINESS, STOREFRONT

**Payload Types:**
- `CreateRolePayload` - For creating new roles
- `UpdateRolePayload` - For updating existing roles
- `AssignRolePayload` - For assigning roles to users
- `AssignPermissionsPayload` - For assigning permissions to roles

### 2. RBAC Service Layer (`src/services/rbacService.ts`)
Complete API service layer for RBAC operations:

**Role Management:**
- `fetchRoles()` - Get all roles
- `fetchRole(roleId)` - Get single role details
- `createRole(data)` - Create new role
- `updateRole(roleId, data)` - Update existing role
- `deleteRole(roleId)` - Delete a role
- `assignRolePermissions(roleId, data)` - Assign permissions to role

**Permission Management:**
- `fetchPermissions()` - Get all permissions
- `groupPermissionsByCategory(permissions)` - Group permissions for UI display

**User Role Assignment:**
- `fetchUserRoles()` - Get all user role assignments
- `fetchUserRolesById(userId)` - Get roles for specific user
- `assignUserRole(data)` - Assign role to user with scope
- `removeUserRole(userRoleId)` - Remove role assignment
- `fetchUserWithRoles(userId)` - Get user with all roles and permissions
- `fetchUserPermissions(userId)` - Get all permissions for user

**Utility Functions:**
- `userHasPermission(userPermissions, permissionCodename)` - Check if user has permission
- `userHasRole(userRoles, roleName)` - Check if user has role
- `getPermissionCategoryCounts(permissions)` - Get permission counts by category

### 3. Account Management Components

#### AccountSettingsPage (`src/features/account/pages/AccountSettingsPage.tsx`)
Main account settings page with tab-based navigation:
- Profile tab
- Security tab
- Preferences tab
- Notifications tab

#### ProfileSettings (`src/features/account/components/ProfileSettings.tsx`)
User profile management:
- Profile picture upload with preview
- Name, email, phone, address editing
- File validation (5MB max, image types only)
- Image preview before upload
- Reset and save functionality

#### SecuritySettings (`src/features/account/components/SecuritySettings.tsx`)
Security management:
- Password change with validation
- Password visibility toggle
- Two-factor authentication (2FA) setup
- QR code display for 2FA
- Active sessions management (placeholder)

#### PreferencesSettings (`src/features/account/components/PreferencesSettings.tsx`)
User preferences:
- Language selection (English, French, Spanish)
- Timezone (Africa/Accra, Lagos, Nairobi, London, New York)
- Date format (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
- Time format (12h, 24h)
- Communication preferences toggles

#### NotificationSettings (`src/features/account/components/NotificationSettings.tsx`)
Notification preferences:
- Email, Push, SMS toggles per category
- Categories: Sales, Inventory, Payments, Users, System
- Bulk save functionality
- Warning for critical notifications

### 4. Account Service Layer (`src/services/accountService.ts`)
API service for account management:

**Profile Management:**
- `updateUserProfile(data)` - Update profile information
- `uploadProfilePicture(file)` - Upload profile picture
- `getUserProfile()` - Fetch current user profile

**Security:**
- `changePassword(data)` - Change user password
- `enable2FA()` - Enable two-factor authentication
- `disable2FA()` - Disable two-factor authentication

**Preferences:**
- `updateUserPreferences(preferences)` - Update user preferences
- `updateNotificationSettings(settings)` - Update notification settings

### 5. Platform RBAC Management Components

#### RoleManagement (`src/features/platform/components/RoleManagement.tsx`)
Complete role CRUD interface:
- Table showing all roles with:
  - Name, level badge, description
  - Permission count
  - System role flag
  - Active status
- Create/Edit modal with:
  - Role name, description, level selection
  - Permission checkboxes grouped by category
  - Permission count display
- Delete functionality (only for non-system roles)
- Permission-based UI (isSuperAdmin can edit/delete)
- Success/error messaging

#### UserRoleAssignment (`src/features/platform/components/UserRoleAssignment.tsx`)
User role assignment management:
- Table showing all user role assignments with:
  - User, role, scope badges
  - Business/Storefront context
  - Assigned by, assigned at
  - Expiry date with expired indicator
  - Active status
- Assignment modal with:
  - User ID selection
  - Role selection (active roles only)
  - Scope selection (PLATFORM/BUSINESS/STOREFRONT)
  - Business/Storefront ID (context-sensitive)
  - Expiry date (optional)
- Remove functionality with confirmation
- Permission-based UI (isSuperAdmin only)

### 6. Platform Dashboard Integration

#### Updated PlatformDashboard (`src/features/platform/pages/PlatformDashboard.tsx`)
Enhanced with RBAC tabs (visible only to super admins):
- Overview & Stats (existing)
- Plan Management (existing)
- Subscriptions (existing)
- **Role Management** (new) - Manage roles and permissions
- **User Role Assignments** (new) - Assign roles to users

### 7. Routing Updates

#### App.tsx
Added account settings route:
```typescript
<Route path="account" element={<AccountSettingsPage />} />
```

Route: `/app/account`
Accessible to: All authenticated users

## Backend API Endpoints Required

### Account Management Endpoints
```
POST   /accounts/api/profile/              # Update profile
POST   /accounts/api/profile/picture/      # Upload profile picture
POST   /accounts/api/change-password/      # Change password
POST   /accounts/api/2fa/enable/           # Enable 2FA
POST   /accounts/api/2fa/disable/          # Disable 2FA
PATCH  /accounts/api/preferences/          # Update preferences
PATCH  /accounts/api/notifications/        # Update notifications
GET    /accounts/api/profile/              # Get user profile
```

### RBAC Management Endpoints
```
GET    /accounts/api/roles/                # List all roles
POST   /accounts/api/roles/                # Create role
GET    /accounts/api/roles/{id}/           # Get role details
PATCH  /accounts/api/roles/{id}/           # Update role
DELETE /accounts/api/roles/{id}/           # Delete role
POST   /accounts/api/roles/{id}/permissions/ # Assign permissions

GET    /accounts/api/permissions/          # List all permissions

GET    /accounts/api/user-roles/           # List all user role assignments
POST   /accounts/api/user-roles/           # Assign role to user
DELETE /accounts/api/user-roles/{id}/      # Remove role assignment

GET    /accounts/api/users/{id}/           # Get user with roles
GET    /accounts/api/users/{id}/roles/     # Get user's roles
GET    /accounts/api/users/{id}/permissions/ # Get user's permissions
```

## Features Summary

### ✅ Completed (Frontend)
1. **RBAC Type System** - Complete TypeScript interfaces
2. **RBAC Service Layer** - All API calls for RBAC operations
3. **Account Settings UI** - Profile, Security, Preferences, Notifications
4. **Account Service Layer** - All API calls for account operations
5. **Role Management UI** - Full CRUD for roles with permission assignment
6. **User Role Assignment UI** - Assign roles to users with scope
7. **Platform Dashboard Integration** - RBAC tabs for super admins
8. **Routing** - Account settings route added

### ⏳ Pending (Backend API Implementation)
1. **Account Management Endpoints** - Profile, password, 2FA, preferences
2. **RBAC Endpoints** - Role CRUD, permission assignment, user role management
3. **File Upload Handler** - Profile picture upload endpoint
4. **API Serializers** - DRF serializers for all RBAC models
5. **Permission Decorators** - Endpoint-level permission checks

### 🧪 Testing Needed
1. Account settings flow (profile update, password change)
2. Profile picture upload and display
3. Role creation with permission assignment
4. User role assignment with different scopes
5. Permission-based UI rendering
6. Platform owner access to all features
7. Regular user access to account settings only

## Permission-Based UI Access

### Account Settings
- **Access**: All authenticated users
- **Route**: `/app/account`
- **Features**: Profile, Security, Preferences, Notifications

### Platform Dashboard - Overview, Plans, Subscriptions
- **Access**: Platform admins (`isPlatformAdmin()`)
- **Route**: `/app/platform`

### Platform Dashboard - Role Management, User Roles
- **Access**: Super admins only (`isSuperAdmin()`)
- **Route**: `/app/platform` (tabs conditional)

## Data Flow

### Role Management Flow
1. User navigates to Platform Dashboard → Role Management
2. `RoleManagement` component calls `fetchRoles()` and `fetchPermissions()`
3. Data displayed in table
4. User clicks "Create Role" → modal opens
5. User fills form, selects permissions
6. `createRole()` called with payload
7. `assignRolePermissions()` called with selected permission IDs
8. Table refreshes with new role

### User Role Assignment Flow
1. User navigates to Platform Dashboard → User Role Assignments
2. `UserRoleAssignment` component calls `fetchUserRoles()` and `fetchRoles()`
3. Data displayed in table
4. User clicks "Assign Role" → modal opens
5. User selects user, role, scope, context (business/storefront)
6. `assignUserRole()` called with payload
7. Table refreshes with new assignment

### Account Settings Flow
1. User navigates to Account Settings
2. `AccountSettingsPage` loads with tabs
3. User selects tab (Profile, Security, Preferences, Notifications)
4. Respective component loads user data via `getUserProfile()`
5. User makes changes
6. Save button calls appropriate service function
7. Success/error message displayed
8. Data refreshes

## Security Considerations

### Permission Checks
- Platform dashboard access requires `isPlatformAdmin()`
- RBAC management tabs require `isSuperAdmin()`
- All API calls use token authentication
- Backend should validate permissions on every endpoint

### File Upload Security
- Frontend validates: file type (images only), size (5MB max)
- Backend should validate: file type, size, sanitize filename
- Store files securely with unique names

### Password Security
- Frontend validates: minimum length (8 chars)
- Backend should enforce: complexity rules, hash with bcrypt/Argon2
- Password change requires current password

### 2FA Security
- QR code generated server-side
- TOTP secrets stored securely
- Backup codes provided

## Next Steps

1. **Implement Backend Endpoints** (Priority 1)
   - Create DRF serializers for all models
   - Implement viewsets/APIViews
   - Add permission decorators
   - Test with Postman/curl

2. **Add Navigation Links** (Priority 2)
   - Add "Account Settings" link to DashboardLayout
   - Add user dropdown menu with settings link
   - Update platform dashboard access check

3. **Enhance UI/UX** (Priority 3)
   - Add loading states
   - Add form validation feedback
   - Add success animations
   - Improve error messages

4. **Testing** (Priority 4)
   - Unit tests for components
   - Integration tests for flows
   - E2E tests with Playwright/Cypress
   - Permission-based access tests

5. **Documentation** (Priority 5)
   - User guide for account settings
   - Admin guide for RBAC management
   - API documentation
   - Deployment guide

## File Structure
```
src/
├── types/
│   └── rbac.ts                          # RBAC type definitions
├── services/
│   ├── rbacService.ts                   # RBAC API calls
│   └── accountService.ts                # Account API calls
├── features/
│   ├── account/
│   │   ├── pages/
│   │   │   └── AccountSettingsPage.tsx  # Main account settings
│   │   └── components/
│   │       ├── ProfileSettings.tsx       # Profile management
│   │       ├── SecuritySettings.tsx      # Security settings
│   │       ├── PreferencesSettings.tsx   # User preferences
│   │       └── NotificationSettings.tsx  # Notification prefs
│   └── platform/
│       ├── pages/
│       │   └── PlatformDashboard.tsx     # Platform dashboard
│       └── components/
│           ├── RoleManagement.tsx        # Role CRUD
│           └── UserRoleAssignment.tsx    # User role assignment
└── App.tsx                               # Updated with routes
```

## Environment Variables
```bash
VITE_API_URL=http://localhost:8000  # Backend API URL
```

## Dependencies (Already Installed)
- React 18
- React Router DOM
- React Bootstrap
- Redux Toolkit
- Axios
- TypeScript

## Notes
- All components follow existing code patterns
- Uses existing Redux store and hooks
- Uses existing permission utilities
- Compatible with existing authentication system
- TypeScript strict mode compliant
- Responsive design with React Bootstrap

## Platform Owner Credentials
```
Email: alphalogiquetechnologies@gmail.com
Role: SUPER_USER (platform-wide)
Permissions: All 21 permissions
```

## Support
For issues or questions, refer to:
- Backend RBAC implementation in `~/Documents/Projects/pos/backend/accounts/models.py`
- Permission utilities in `src/utils/platformPermissions.ts`
- Existing authentication in `src/features/authentication/`
