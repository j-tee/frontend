/**
 * RBAC Service
 * API calls for Role-Based Access Control management
 */

import httpClient from './httpClient';
import type {
  Role,
  Permission,
  UserRole,
  CreateRolePayload,
  UpdateRolePayload,
  AssignRolePayload,
  AssignPermissionsPayload,
  RoleListResponse,
  PermissionListResponse,
  UserRoleListResponse,
  UserWithRoles,
  GroupedPermissions,
} from '../types/rbac';

const RBAC_BASE = '/accounts/api/rbac';

// ============================================================================
// ROLE MANAGEMENT
// ============================================================================

/**
 * Fetch all roles
 */
export const fetchRoles = async (): Promise<Role[]> => {
  const response = await httpClient.get<RoleListResponse>(
    `${RBAC_BASE}/roles/`,
  );
  return response.data.results;
};

/**
 * Fetch a single role by ID
 */
export const fetchRole = async (roleId: number): Promise<Role> => {
  const response = await httpClient.get<Role>(
    `${RBAC_BASE}/roles/${roleId}/`,
  );
  return response.data;
};

/**
 * Create a new role
 */
export const createRole = async (data: CreateRolePayload): Promise<Role> => {
  const response = await httpClient.post<Role>(
    `${RBAC_BASE}/roles/`,
    data,
  );
  return response.data;
};

/**
 * Update an existing role
 */
export const updateRole = async (
  roleId: number,
  data: UpdateRolePayload
): Promise<Role> => {
  const response = await httpClient.patch<Role>(
    `${RBAC_BASE}/roles/${roleId}/`,
    data,
  );
  return response.data;
};

/**
 * Delete a role
 */
export const deleteRole = async (roleId: number): Promise<void> => {
  await httpClient.delete(
    `${RBAC_BASE}/roles/${roleId}/`,
  );
};

/**
 * Assign permissions to a role
 */
export const assignRolePermissions = async (
  roleId: number,
  data: AssignPermissionsPayload
): Promise<Role> => {
  const response = await httpClient.post<Role>(
    `${RBAC_BASE}/roles/${roleId}/permissions/`,
    data,
  );
  return response.data;
};

// ============================================================================
// PERMISSION MANAGEMENT
// ============================================================================

/**
 * Fetch all permissions
 */
export const fetchPermissions = async (): Promise<Permission[]> => {
  const response = await httpClient.get<PermissionListResponse>(
    `${RBAC_BASE}/permissions/`,
  );
  return response.data.results;
};

/**
 * Group permissions by category for UI display
 */
export const groupPermissionsByCategory = (
  permissions: Permission[]
): GroupedPermissions => {
  return permissions.reduce((acc, permission) => {
    const category = permission.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {} as GroupedPermissions);
};

// ============================================================================
// USER ROLE ASSIGNMENT
// ============================================================================

/**
 * Fetch all user role assignments
 */
export const fetchUserRoles = async (): Promise<UserRole[]> => {
  const response = await httpClient.get<UserRoleListResponse>(
    `${RBAC_BASE}/user-roles/`,
  );
  return response.data.results;
};

/**
 * Fetch roles for a specific user
 */
export const fetchUserRolesById = async (userId: number): Promise<UserRole[]> => {
  const response = await httpClient.get<UserRoleListResponse>(
    `${RBAC_BASE}/users/${userId}/roles/`,
  );
  return response.data.results;
};

/**
 * Assign a role to a user
 */
export const assignUserRole = async (data: AssignRolePayload): Promise<UserRole> => {
  const response = await httpClient.post<UserRole>(
    `${RBAC_BASE}/user-roles/`,
    data,
  );
  return response.data;
};

/**
 * Remove a role assignment from a user
 */
export const removeUserRole = async (userRoleId: number): Promise<void> => {
  await httpClient.delete(
    `${RBAC_BASE}/user-roles/${userRoleId}/`,
  );
};

/**
 * Fetch user with all roles and permissions
 */
export const fetchUserWithRoles = async (userId: number): Promise<UserWithRoles> => {
  const response = await httpClient.get<UserWithRoles>(
    `${RBAC_BASE}/users/${userId}/`,
  );
  return response.data;
};

/**
 * Fetch all permissions for a specific user (across all roles)
 */
export const fetchUserPermissions = async (userId: number): Promise<Permission[]> => {
  const response = await httpClient.get<{ permissions: Permission[] }>(
    `${RBAC_BASE}/users/${userId}/permissions/`,
  );
  return response.data.permissions;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if user has a specific permission
 */
export const userHasPermission = (
  userPermissions: Permission[],
  permissionCodename: string
): boolean => {
  return userPermissions.some(p => p.codename === permissionCodename && p.is_active);
};

/**
 * Check if user has a specific role
 */
export const userHasRole = (
  userRoles: Role[],
  roleName: string
): boolean => {
  return userRoles.some(r => r.name === roleName && r.is_active);
};

/**
 * Get permission categories with counts
 */
export const getPermissionCategoryCounts = (permissions: Permission[]): Record<string, number> => {
  return permissions.reduce((acc, permission) => {
    const category = permission.category;
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
};
