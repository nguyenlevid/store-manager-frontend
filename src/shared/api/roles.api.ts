/**
 * Roles API
 *
 * CRUD for custom roles and permission fetching.
 */

import { apiClient } from '@/shared/lib/api-client';

// ─── Types ───────────────────────────────────────────────────

export interface ResourcePermissions {
  create?: boolean;
  update?: boolean;
  delete?: boolean;
  execute?: boolean;
}

export interface Permissions {
  items: ResourcePermissions;
  imports: ResourcePermissions;
  transactions: ResourcePermissions;
  transfers: ResourcePermissions;
  partners: ResourcePermissions;
  storehouses: ResourcePermissions;
  businessSettings: ResourcePermissions;
  users: ResourcePermissions;
}

export type PermissionResource = keyof Permissions;
export type PermissionAction = 'create' | 'update' | 'delete' | 'execute';

export interface ResolvedPermissions {
  isAdmin: boolean;
  permissions: Permissions;
  storeHouses: string[];
}

export interface CustomRole {
  _id: string;
  name: string;
  description: string;
  business: string;
  permissions: Permissions;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissions: Partial<Permissions>;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissions?: Partial<Permissions>;
}

// ─── Permissions API ─────────────────────────────────────────

/**
 * Fetch the current user's resolved (merged) permissions
 */
export async function getMyPermissions(): Promise<ResolvedPermissions> {
  return apiClient.get<ResolvedPermissions>('/auth/permissions');
}

// ─── Role CRUD ───────────────────────────────────────────────

/**
 * List all roles in the current business
 */
export async function getRoles(): Promise<CustomRole[]> {
  return apiClient.get<CustomRole[]>('/role');
}

/**
 * Get a single role by ID
 */
export async function getRoleById(id: string): Promise<CustomRole> {
  return apiClient.get<CustomRole>(`/role/${id}`);
}

/**
 * Create a new custom role
 */
export async function createRole(data: CreateRoleInput): Promise<CustomRole> {
  return apiClient.post<CustomRole>('/role', data);
}

/**
 * Update an existing custom role
 */
export async function updateRole(
  id: string,
  data: UpdateRoleInput
): Promise<CustomRole> {
  return apiClient.put<CustomRole>(`/role/${id}`, data);
}

/**
 * Delete a custom role
 */
export async function deleteRole(id: string): Promise<void> {
  return apiClient.delete<void>(`/role/${id}`);
}

// ─── User Role & Storehouse Assignment ───────────────────────

/**
 * Assign roles to a user
 */
export async function assignRolesToUser(
  userId: string,
  roleIds: string[]
): Promise<void> {
  await apiClient.patch<void>(`/user/${userId}/roles`, { roleIds });
}

/**
 * Assign storehouses to a user
 */
export async function assignStorehousesToUser(
  userId: string,
  storeHouseIds: string[]
): Promise<void> {
  await apiClient.patch<void>(`/user/${userId}/storehouses`, { storeHouseIds });
}

/**
 * Change a user's app role (admin/user). Admin-only.
 */
export async function changeUserAppRole(
  userId: string,
  appRole: 'admin' | 'user'
): Promise<void> {
  await apiClient.patch<void>(`/user/${userId}/app-role`, { appRole });
}
