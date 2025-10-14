/**
 * RBAC Type Definitions
 * Matches backend models for Role-Based Access Control
 */

export interface Permission {
  id: number;
  name: string;
  codename: string;
  description: string;
  category: PermissionCategory;
  action: PermissionAction;
  resource: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PermissionCategory = 
  | 'SALES'
  | 'INVENTORY'
  | 'CUSTOMERS'
  | 'REPORTS'
  | 'USERS'
  | 'SETTINGS'
  | 'PLATFORM'
  | 'FINANCE';

export type PermissionAction = 
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'EXPORT'
  | 'IMPORT'
  | 'MANAGE';

export type RoleLevel = 'PLATFORM' | 'BUSINESS' | 'STOREFRONT';

export type RoleScope = 'PLATFORM' | 'BUSINESS' | 'STOREFRONT';

export interface Role {
  id: number;
  name: string;
  description: string;
  level: RoleLevel;
  permissions: Permission[];
  is_system_role: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: number;
  user: number; // User ID
  role: number; // Role ID
  role_details?: Role; // Expanded role details
  scope: RoleScope;
  business?: number; // Business ID
  storefront?: number; // Storefront ID
  assigned_by: number; // User ID who assigned
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
}

export interface RoleTemplate {
  id: number;
  name: string;
  description: string;
  level: RoleLevel;
  permissions: string[]; // Permission codenames
  is_active: boolean;
}

// API Payload Types
export interface CreateRolePayload {
  name: string;
  description: string;
  level: RoleLevel;
  permission_ids?: number[];
  is_active?: boolean;
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  level?: RoleLevel;
  permission_ids?: number[];
  is_active?: boolean;
}

export interface AssignRolePayload {
  user_id: number;
  role_id: number;
  scope: RoleScope;
  business_id?: number;
  storefront_id?: number;
  expires_at?: string;
}

export interface AssignPermissionsPayload {
  permission_ids: number[];
}

// Response Types
export interface RoleListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Role[];
}

export interface PermissionListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Permission[];
}

export interface UserRoleListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: UserRole[];
}

// Grouped Permissions (for UI)
export interface GroupedPermissions {
  [category: string]: Permission[];
}

// User with roles (extended)
export interface UserWithRoles {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  platform_role: string;
  roles: Role[];
  user_roles: UserRole[];
  all_permissions: Permission[];
}
