# 🚀 Quick Fix: RBAC & BusinessMembership Integration

**IMMEDIATE ACTIONS TO TAKE**

---

## Step 1: Update Backend RBAC Seed (5 minutes)

### File: `backend/accounts/management/commands/seed_rbac.py`

**Add OWNER role** after the role_templates list initialization:

```python
role_templates = [
    # ADD THIS FIRST - OWNER role
    {
        'name': 'OWNER',
        'description': 'Business owner with full business access and employee role management',
        'level': 'BUSINESS',
        'permission_codenames': [
            # All business operations
            'can_create_sales', 'can_view_sales', 'can_approve_sales', 'can_delete_sales',
            'can_manage_products', 'can_view_inventory', 'can_update_stock', 'can_view_products',
            'can_manage_customers', 'can_view_customers',
            'can_view_reports', 'can_export_reports',
            'can_manage_users', 'can_invite_users',
            'can_manage_settings',
            'can_view_financial_data', 'can_manage_payments',
        ],
    },
    # Keep existing SUPER_USER role but ensure it's PLATFORM level
    {
        'name': 'SUPER_USER',
        'description': 'Platform super administrator with full system access',
        'level': 'PLATFORM',  # Make sure this is PLATFORM, not BUSINESS
        'permission_codenames': [p['codename'] for p in permissions_data],
    },
    # Update Admin role - REMOVE platform permissions
    {
        'name': 'Admin',
        'description': 'Business administrator with full access to all business modules',
        'level': 'BUSINESS',
        'permission_codenames': [
            'can_create_sales', 'can_view_sales', 'can_approve_sales', 'can_delete_sales',
            'can_manage_products', 'can_view_inventory', 'can_update_stock', 'can_view_products',
            'can_manage_customers', 'can_view_customers',
            'can_view_reports', 'can_export_reports',
            'can_manage_users', 'can_invite_users',
            'can_manage_settings',
            'can_view_financial_data', 'can_manage_payments',
            # REMOVED: platform permissions (can_manage_platform, can_manage_subscriptions, etc.)
        ],
    },
    # Manager, Cashier, Warehouse Staff remain the same
]
```

**Run the seed command**:

```bash
cd ~/Documents/Projects/pos/backend
python manage.py seed_rbac
```

---

## Step 2: Add Migration for BusinessMembership (10 minutes)

### Create migration file: `backend/accounts/migrations/0XXX_add_rbac_role_to_membership.py`

```python
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0XXX_previous_migration'),  # Update with actual previous migration
    ]

    operations = [
        migrations.AddField(
            model_name='businessmembership',
            name='rbac_role',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='business_memberships',
                to='accounts.role',
                help_text='RBAC role for permission management',
            ),
        ),
    ]
```

**Create data migration to populate rbac_role**:

```bash
cd ~/Documents/Projects/pos/backend
python manage.py makemigrations accounts --empty --name populate_rbac_roles
```

Edit the generated file:

```python
from django.db import migrations


def populate_rbac_roles(apps, schema_editor):
    """Link existing BusinessMembership roles to RBAC roles"""
    BusinessMembership = apps.get_model('accounts', 'BusinessMembership')
    Role = apps.get_model('accounts', 'Role')
    
    # Create mapping
    role_mapping = {
        'OWNER': 'OWNER',
        'ADMIN': 'Admin',
        'MANAGER': 'Manager',
        'STAFF': 'Cashier',  # Map STAFF to Cashier role
    }
    
    for membership in BusinessMembership.objects.all():
        rbac_role_name = role_mapping.get(membership.role)
        if rbac_role_name:
            try:
                rbac_role = Role.objects.get(name=rbac_role_name, is_active=True)
                membership.rbac_role = rbac_role
                membership.save(update_fields=['rbac_role'])
                print(f"✅ {membership.user.name} → {rbac_role.name}")
            except Role.DoesNotExist:
                print(f"⚠️  Role {rbac_role_name} not found for {membership.user.name}")


def reverse_populate(apps, schema_editor):
    """Reverse migration - clear rbac_role"""
    BusinessMembership = apps.get_model('accounts', 'BusinessMembership')
    BusinessMembership.objects.all().update(rbac_role=None)


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0XXX_add_rbac_role_to_membership'),  # Previous migration
    ]

    operations = [
        migrations.RunPython(populate_rbac_roles, reverse_populate),
    ]
```

**Run migrations**:

```bash
python manage.py migrate accounts
```

---

## Step 3: Update BusinessMembership Model (5 minutes)

### File: `backend/accounts/models.py`

Find `class BusinessMembership` and update:

```python
class BusinessMembership(models.Model):
    """Associates users with businesses and roles."""
    OWNER = 'OWNER'
    ADMIN = 'ADMIN'
    MANAGER = 'MANAGER'
    STAFF = 'STAFF'
    ROLE_CHOICES = [
        (OWNER, 'Owner'),
        (ADMIN, 'Administrator'),
        (MANAGER, 'Manager'),
        (STAFF, 'Staff'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='business_memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=STAFF)
    
    # NEW: Link to RBAC role
    rbac_role = models.ForeignKey(
        'Role',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='business_memberships',
        help_text='RBAC role for permission management'
    )
    
    is_admin = models.BooleanField(default=False)
    invited_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                                   related_name='invited_business_memberships')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'business_memberships'
        unique_together = ['business', 'user']
        ordering = ['business__name', 'user__name']

    def __str__(self):
        return f"{self.user.name} - {self.business.name} ({self.role})"
    
    # NEW: Auto-assign RBAC role on save
    def save(self, *args, **kwargs):
        if not self.rbac_role and self.role:
            # Map BusinessMembership.role to RBAC Role
            role_mapping = {
                'OWNER': 'OWNER',
                'ADMIN': 'Admin',
                'MANAGER': 'Manager',
                'STAFF': 'Cashier',
            }
            rbac_role_name = role_mapping.get(self.role)
            if rbac_role_name:
                try:
                    self.rbac_role = Role.objects.get(
                        name=rbac_role_name,
                        level__in=['BUSINESS', 'STOREFRONT'],
                        is_active=True
                    )
                except Role.DoesNotExist:
                    pass
        super().save(*args, **kwargs)
    
    # NEW: Get permissions for this membership
    def get_permissions(self):
        """Get all permissions for this business membership via RBAC role"""
        if self.rbac_role:
            return self.rbac_role.permissions.filter(is_active=True)
        return Permission.objects.none()
    
    # NEW: Check if user has specific permission
    def has_permission(self, permission_codename):
        """Check if this membership has a specific permission"""
        return self.get_permissions().filter(codename=permission_codename).exists()
```

---

## Step 4: Update Frontend Permission Checks (10 minutes)

### File: `frontend/src/utils/platformPermissions.ts`

Add filter to prevent business roles from accessing platform:

```typescript
/**
 * Check if user has platform admin access
 * ONLY platform-level roles should return true
 */
export const isPlatformAdmin = (user: UserProfile | null): boolean => {
  if (!user) return false
  
  // MUST be a platform role, not business role
  return (
    user.platform_role === 'SUPER_ADMIN' ||
    user.platform_role === 'ADMIN' ||
    user.platform_role === 'SUPPORT'
  )
}

/**
 * Check if user is business owner (can manage employees)
 */
export const isBusinessOwner = (user: UserProfile | null): boolean => {
  if (!user) return false
  
  // Check current business membership
  const currentBusiness = user.current_business
  if (!currentBusiness) return false
  
  return currentBusiness.role === 'OWNER'
}

/**
 * Check if user can manage business settings
 */
export const canManageBusinessSettings = (user: UserProfile | null): boolean => {
  if (!user) return false
  
  const currentBusiness = user.current_business
  if (!currentBusiness) return false
  
  return ['OWNER', 'ADMIN'].includes(currentBusiness.role)
}
```

---

## Step 5: Test the Changes (5 minutes)

### Backend Testing

```bash
cd ~/Documents/Projects/pos/backend

# 1. Check roles were created
python manage.py shell
>>> from accounts.models import Role
>>> Role.objects.all().values('name', 'level')
# Should see: OWNER (BUSINESS), SUPER_USER (PLATFORM), Admin (BUSINESS), etc.

# 2. Check a business membership
>>> from accounts.models import BusinessMembership
>>> membership = BusinessMembership.objects.first()
>>> membership.role
'OWNER'
>>> membership.rbac_role.name
'OWNER'
>>> membership.get_permissions().count()
17  # Should have business permissions

# 3. Check platform role doesn't have business memberships
>>> super_user_role = Role.objects.get(name='SUPER_USER')
>>> super_user_role.level
'PLATFORM'
>>> super_user_role.business_memberships.count()
0  # Should be 0
```

### Frontend Testing

1. Login as business owner
2. Navigate to `/app/platform`
3. Should see "Access Denied" (business owners can't access platform)
4. Login as SUPER_USER (platform owner account)
5. Navigate to `/app/platform`
6. Should see Platform Management dashboard

---

## Expected Results

After these changes:

✅ **OWNER role exists** in RBAC  
✅ **Business memberships linked** to RBAC roles  
✅ **Business users can't access** platform management  
✅ **Platform super admin has** PLATFORM level role  
✅ **Permissions are enforced** via RBAC system  

---

## Rollback Plan

If something breaks:

```bash
# Rollback migrations
cd ~/Documents/Projects/pos/backend
python manage.py migrate accounts <previous_migration_number>

# Revert seed_rbac.py changes
git checkout accounts/management/commands/seed_rbac.py

# Revert BusinessMembership model
git checkout accounts/models.py
```

---

**Execute these steps in order. Each step builds on the previous one.**

**Estimated Total Time: 35 minutes**
