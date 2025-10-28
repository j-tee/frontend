# 🚨 CRITICAL: RBAC & BusinessMembership Gap Analysis

**Date**: October 14, 2025  
**Priority**: HIGH  
**Status**: IDENTIFIED - NEEDS IMMEDIATE FIX

---

## 📋 Problem Summary

There is a **critical disconnect** between:
1. `BusinessMembership.role` (simple string field: OWNER, ADMIN, MANAGER, STAFF)
2. RBAC `Role` model (complex permission-based system: SUPER_USER, Admin, Manager, Cashier, Warehouse Staff)

**This creates**:
- ❌ Permission inconsistencies
- ❌ Security vulnerabilities
- ❌ Missing OWNER role in RBAC
- ❌ Business admins potentially accessing platform features
- ❌ Inability for business owners to manage employee roles properly

---

## 🔍 Current State Analysis

### Frontend Roles (BusinessMembership)

Located in: `src/types/common.ts`

```typescript
export const MEMBERSHIP_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'] as const
export type MembershipRole = typeof MEMBERSHIP_ROLES[number]
```

**Frontend Capabilities** (`src/utils/permissions.ts`):

```typescript
const ROLE_CAPABILITIES: Record<MembershipRole, Capability[]> = {
  OWNER: [...ALL_CAPABILITIES],  // Full access to everything
  ADMIN: [...ALL_CAPABILITIES],  // Full access to everything
  MANAGER: [
    // Sales, Inventory, Customers, Reports, Bookkeeping
  ],
  STAFF: [
    // Basic sales and inventory view
  ],
}
```

### Backend RBAC System

Located in: `accounts/models.py` + `accounts/management/commands/seed_rbac.py`

**Roles**:
1. **SUPER_USER** (PLATFORM level) - All permissions
2. **Admin** (BUSINESS level) - Full business access + some platform permissions (❌ PROBLEM!)
3. **Manager** (BUSINESS level) - Supervisory access
4. **Cashier** (STOREFRONT level) - POS operations
5. **Warehouse Staff** (BUSINESS level) - Inventory only

**Missing**: No `OWNER` role!

### Backend BusinessMembership

Located in: `accounts/models.py`

```python
class BusinessMembership(models.Model):
    OWNER = 'OWNER'
    ADMIN = 'ADMIN'
    MANAGER = 'MANAGER'
    STAFF = 'STAFF'
    
    business = models.ForeignKey(Business, ...)
    user = models.ForeignKey(User, ...)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=STAFF)
    is_admin = models.BooleanField(default=False)
    # ...
```

**Key Issue**: `role` field is just a string - NOT connected to RBAC `Role` model!

---

## 🚨 Critical Issues

### Issue 1: Disconnected Permission Systems

```
Frontend checks: BusinessMembership.role (OWNER/ADMIN/MANAGER/STAFF)
Backend enforces: RBAC Role.permissions (based on different role names)

Result: Permissions don't match!
```

### Issue 2: Missing OWNER Role in RBAC

**Frontend expects**:
- OWNER = Full business access + employee management + settings

**Backend has**:
- NO OWNER role in RBAC system
- Who owns the business? How do they manage it?

### Issue 3: Business Roles Have Platform Permissions

**Current Admin role permissions** include:
```python
'can_manage_platform',         # ❌ SHOULD NOT HAVE!
'can_manage_subscriptions',    # ❌ SHOULD NOT HAVE!
'can_view_platform_stats',     # ❌ SHOULD NOT HAVE!
'can_manage_plans',            # ❌ SHOULD NOT HAVE!
```

**Problem**: Business-level `Admin` role has platform management permissions!

### Issue 4: Owner Can't Manage Employee Roles

**Requirement**: Business OWNER should be able to:
- ✅ Assign roles to employees
- ✅ Create custom roles for their business
- ✅ Manage employee permissions
- ✅ View who has what access

**Reality**: 
- ❌ No OWNER role in RBAC
- ❌ No role management UI for business owners
- ❌ Only SUPER_USER can manage roles (platform level only)

---

## ✅ Proposed Solution

### Step 1: Add OWNER Role to RBAC

**Create new OWNER role** at BUSINESS level:

```python
# In seed_rbac.py
{
    'name': 'OWNER',
    'description': 'Business owner with full business access and employee management',
    'level': 'BUSINESS',
    'permission_codenames': [
        # All business-level permissions
        'can_create_sales', 'can_view_sales', 'can_approve_sales', 'can_delete_sales',
        'can_manage_products', 'can_view_inventory', 'can_update_stock', 'can_view_products',
        'can_manage_customers', 'can_view_customers',
        'can_view_reports', 'can_export_reports',
        'can_manage_users', 'can_invite_users',  # Employee management
        'can_manage_settings',
        'can_view_financial_data', 'can_manage_payments',
        # OWNER-specific permissions
        'can_manage_business_roles',        # NEW: Manage business roles
        'can_assign_employee_roles',        # NEW: Assign roles to employees
        'can_create_custom_roles',          # NEW: Create custom business roles
        'can_manage_business_settings',     # NEW: Business settings
        'can_view_employee_permissions',    # NEW: See who has what access
    ],
},
```

### Step 2: Remove Platform Permissions from Business Roles

**Update Admin, Manager, Cashier roles** to remove:
- ❌ `can_manage_platform`
- ❌ `can_manage_subscriptions`
- ❌ `can_view_platform_stats`
- ❌ `can_manage_plans`

These should ONLY be in `SUPER_USER` role!

### Step 3: Link BusinessMembership to RBAC Role

**Option A: Add ForeignKey** (Recommended)

```python
class BusinessMembership(models.Model):
    business = models.ForeignKey(Business, ...)
    user = models.ForeignKey(User, ...)
    
    # Keep string role for backward compatibility
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=STAFF)
    
    # NEW: Link to RBAC role
    rbac_role = models.ForeignKey(
        'Role', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='business_memberships',
        limit_choices_to={'level__in': ['BUSINESS', 'STOREFRONT']}  # No platform roles!
    )
    
    def save(self, *args, **kwargs):
        # Auto-assign RBAC role based on string role
        if not self.rbac_role and self.role:
            try:
                self.rbac_role = Role.objects.get(name=self.role.upper())
            except Role.DoesNotExist:
                pass
        super().save(*args, **kwargs)
    
    def get_permissions(self):
        """Get all permissions for this membership"""
        if self.rbac_role:
            return self.rbac_role.permissions.filter(is_active=True)
        return Permission.objects.none()
```

### Step 4: Add New Permissions for Business Owners

**New permissions to create**:

```python
# USERS category - for employee management
{'name': 'Manage Business Roles', 'codename': 'can_manage_business_roles', 
 'category': 'USERS', 'action': 'MANAGE', 'resource': 'business_role'},

{'name': 'Assign Employee Roles', 'codename': 'can_assign_employee_roles', 
 'category': 'USERS', 'action': 'MANAGE', 'resource': 'employee_role'},

{'name': 'Create Custom Roles', 'codename': 'can_create_custom_roles', 
 'category': 'USERS', 'action': 'CREATE', 'resource': 'custom_role'},

{'name': 'View Employee Permissions', 'codename': 'can_view_employee_permissions', 
 'category': 'USERS', 'action': 'READ', 'resource': 'employee_permission'},

# SETTINGS category
{'name': 'Manage Business Settings', 'codename': 'can_manage_business_settings', 
 'category': 'SETTINGS', 'action': 'MANAGE', 'resource': 'business_settings'},
```

### Step 5: Create Business Role Management API

**New endpoints for business owners**:

```python
# accounts/views.py

class BusinessRoleViewSet(viewsets.ModelViewSet):
    """
    Business owners can create and manage custom roles for their business
    """
    permission_classes = [IsAuthenticated, HasBusinessOwnerPermission]
    serializer_class = RoleSerializer
    
    def get_queryset(self):
        # Only show business-level roles
        business = self.request.user.get_current_business()
        return Role.objects.filter(
            level__in=['BUSINESS', 'STOREFRONT'],
            is_active=True
        ).exclude(
            is_system_role=True  # Can't edit system roles
        )
    
    def perform_create(self, serializer):
        # Business owners can create custom business roles
        serializer.save(
            level='BUSINESS',
            is_system_role=False,
            is_active=True
        )

class BusinessEmployeeRoleViewSet(viewsets.ViewSet):
    """
    Assign/remove roles to/from business employees
    """
    permission_classes = [IsAuthenticated, HasBusinessOwnerPermission]
    
    @action(detail=False, methods=['post'])
    def assign(self, request):
        """Assign a role to an employee"""
        employee_id = request.data.get('employee_id')
        role_id = request.data.get('role_id')
        
        # Validate employee belongs to this business
        membership = BusinessMembership.objects.get(
            id=employee_id,
            business=request.user.get_current_business()
        )
        
        # Validate role is business-level
        role = Role.objects.get(id=role_id, level__in=['BUSINESS', 'STOREFRONT'])
        
        membership.rbac_role = role
        membership.role = role.name.upper()  # Keep in sync
        membership.save()
        
        return Response({'status': 'success'})
```

**URLs**:

```python
# accounts/urls.py
router.register(r'business/roles', BusinessRoleViewSet, basename='business-roles')
router.register(r'business/employee-roles', BusinessEmployeeRoleViewSet, basename='employee-roles')
```

### Step 6: Frontend Employee Management UI

**Add to frontend** (`src/features/employees/pages/EmployeeManagementPage.tsx`):

```typescript
// New tab: "Role Management"
<Tab.Pane eventKey="role-management">
  <Card>
    <Card.Header>
      <h5>Manage Employee Roles</h5>
    </Card.Header>
    <Card.Body>
      {/* List all employees with their current roles */}
      <Table>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Current Role</th>
            <th>Permissions</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(employee => (
            <tr key={employee.id}>
              <td>{employee.name}</td>
              <td>
                <Badge>{employee.role}</Badge>
              </td>
              <td>
                <Button size="sm" variant="outline-info">
                  View Permissions
                </Button>
              </td>
              <td>
                <Button size="sm" onClick={() => handleChangeRole(employee)}>
                  Change Role
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      
      {/* Only show for OWNER */}
      {currentUser.role === 'OWNER' && (
        <Button variant="primary" onClick={handleCreateCustomRole}>
          + Create Custom Role
        </Button>
      )}
    </Card.Body>
  </Card>
</Tab.Pane>
```

---

## 📝 Implementation Checklist

### Backend Changes

- [ ] **Create new permissions**:
  - [ ] `can_manage_business_roles`
  - [ ] `can_assign_employee_roles`
  - [ ] `can_create_custom_roles`
  - [ ] `can_view_employee_permissions`
  - [ ] `can_manage_business_settings`

- [ ] **Update seed_rbac.py**:
  - [ ] Add `OWNER` role (BUSINESS level)
  - [ ] Remove platform permissions from `Admin`, `Manager`, `Cashier`
  - [ ] Add owner-specific permissions to OWNER role
  - [ ] Update `Admin` role permissions (remove platform access)

- [ ] **Update BusinessMembership model**:
  - [ ] Add `rbac_role` ForeignKey to `Role`
  - [ ] Add `get_permissions()` method
  - [ ] Update `save()` to auto-assign RBAC role
  - [ ] Create migration

- [ ] **Create API endpoints**:
  - [ ] `BusinessRoleViewSet` - CRUD for business roles
  - [ ] `BusinessEmployeeRoleViewSet` - Assign/remove employee roles
  - [ ] Add permission checks (`HasBusinessOwnerPermission`)

- [ ] **Create serializers**:
  - [ ] `BusinessRoleSerializer`
  - [ ] `EmployeeRoleAssignmentSerializer`

### Frontend Changes

- [ ] **Update types**:
  - [ ] Add `rbac_role` to `BusinessMembership` type
  - [ ] Create `BusinessRole` type
  - [ ] Add employee permission types

- [ ] **Create services**:
  - [ ] `businessRoleService.ts` - API calls for role management
  - [ ] Add methods to `employeeService.ts` for role assignment

- [ ] **Create components**:
  - [ ] `EmployeeRoleManagement.tsx` - List employees with roles
  - [ ] `RoleAssignmentModal.tsx` - Assign role to employee
  - [ ] `CustomRoleCreator.tsx` - Create custom business roles
  - [ ] `PermissionViewer.tsx` - Show permissions for a role

- [ ] **Update permissions check**:
  - [ ] `usePermissions.ts` - Check RBAC permissions
  - [ ] Update capability checks to use RBAC permissions

### Testing

- [ ] **Unit tests**:
  - [ ] Test OWNER role has correct permissions
  - [ ] Test Admin role doesn't have platform permissions
  - [ ] Test BusinessMembership → RBAC role assignment

- [ ] **Integration tests**:
  - [ ] Test business owner can create custom role
  - [ ] Test business owner can assign roles to employees
  - [ ] Test business admin CANNOT access platform features
  - [ ] Test employee sees correct permissions based on role

- [ ] **Manual testing**:
  - [ ] Login as business owner → can manage employees
  - [ ] Login as business admin → cannot access platform
  - [ ] Login as manager → has correct limited access
  - [ ] Login as staff → has minimal access

---

## 🎯 Expected Outcomes

After implementation:

✅ **OWNER role exists** in RBAC system  
✅ **Business owners can** manage employee roles  
✅ **Business owners can** create custom roles  
✅ **Business admins CANNOT** access platform features  
✅ **Permissions are consistent** between frontend and backend  
✅ **BusinessMembership.role** linked to RBAC `Role` model  
✅ **Clear separation** between platform and business permissions  

---

## 📚 Related Files

### Backend
- `accounts/models.py` - Role, Permission, BusinessMembership, UserRole
- `accounts/management/commands/seed_rbac.py` - Role seeding
- `accounts/views.py` - Add BusinessRoleViewSet, BusinessEmployeeRoleViewSet
- `accounts/serializers.py` - Add BusinessRoleSerializer
- `accounts/permissions.py` - Add HasBusinessOwnerPermission

### Frontend
- `src/types/common.ts` - MembershipRole type
- `src/types/rbac.ts` - RBAC types
- `src/utils/permissions.ts` - Permission checking
- `src/services/businessRoleService.ts` - NEW
- `src/features/employees/components/EmployeeRoleManagement.tsx` - NEW
- `src/features/employees/components/CustomRoleCreator.tsx` - NEW

---

## 🚀 Migration Path

### Phase 1: Backend Foundation (Priority: HIGH)
1. Add new permissions
2. Create OWNER role
3. Update existing roles (remove platform permissions)
4. Run migration: `python manage.py seed_rbac`

### Phase 2: Data Migration (Priority: HIGH)
1. Add `rbac_role` field to BusinessMembership
2. Create migration to populate `rbac_role` based on existing `role` field
3. Test on staging environment

### Phase 3: API & Business Logic (Priority: MEDIUM)
1. Create BusinessRoleViewSet
2. Create employee role assignment endpoints
3. Add permission classes
4. Test with Postman/curl

### Phase 4: Frontend (Priority: MEDIUM)
1. Add role management UI for business owners
2. Update employee management page
3. Add custom role creator
4. Update permission checks

### Phase 5: Testing & Deployment (Priority: LOW)
1. Integration testing
2. User acceptance testing
3. Documentation
4. Deploy to production

---

## ⚠️ Breaking Changes

### Potential Impact:
- Existing business `Admin` users will lose platform access (GOOD - security fix)
- Need to assign SUPER_USER role to actual platform admins
- BusinessMembership queries may need updates

### Mitigation:
- Run data migration to populate `rbac_role`
- Keep `role` string field for backward compatibility
- Gradual rollout with feature flag

---

**Last Updated**: October 14, 2025  
**Next Review**: After Phase 1 completion  
**Owner**: Backend Team + Frontend Team
