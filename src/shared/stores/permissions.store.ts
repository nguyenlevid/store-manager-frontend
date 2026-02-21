/**
 * Permissions Store
 *
 * Singleton reactive store for the current user's resolved permissions.
 * Fetched once after login/init, refreshed when roles change.
 *
 * Usage:
 *   can('items', 'create')    → boolean (reactive)
 *   isAdmin()                 → boolean (reactive)
 *   getPermissions()          → full ResolvedPermissions | null
 */

import { createSignal } from 'solid-js';
import {
  getMyPermissions,
  type ResolvedPermissions,
  type PermissionResource,
  type PermissionAction,
} from '@/shared/api/roles.api';

const [permissions, setPermissions] = createSignal<ResolvedPermissions | null>(
  null
);
const [isLoaded, setIsLoaded] = createSignal(false);

/**
 * Fetch permissions from the API and cache them.
 * Safe to call multiple times — only fetches once unless forced.
 */
export async function fetchPermissions(
  force = false
): Promise<ResolvedPermissions | null> {
  if (isLoaded() && !force) return permissions();
  try {
    const data = await getMyPermissions();
    setPermissions(data);
    setIsLoaded(true);
    return data;
  } catch {
    // If fetch fails (e.g. no business assigned), set empty
    setPermissions(null);
    setIsLoaded(true);
    return null;
  }
}

/**
 * Force-refresh permissions from the API.
 */
export async function refreshPermissions(): Promise<ResolvedPermissions | null> {
  return fetchPermissions(true);
}

/**
 * Clear permissions (on logout).
 */
export function clearPermissions(): void {
  setPermissions(null);
  setIsLoaded(false);
}

/**
 * Check if the current user has a specific permission.
 * Returns true for admins/devs (isAdmin flag).
 * Returns false if permissions haven't loaded yet.
 *
 * This is a reactive accessor — use inside components/effects.
 */
export function can(
  resource: PermissionResource,
  action: PermissionAction
): boolean {
  const perms = permissions();
  if (!perms) return false;
  if (perms.isAdmin) return true;

  const resourcePerms = perms.permissions[resource];
  if (!resourcePerms) return false;
  return (
    (resourcePerms as Record<string, boolean | undefined>)[action] === true
  );
}

/**
 * Check if the current user is an admin (appRole admin or dev).
 */
export function isAdmin(): boolean {
  return permissions()?.isAdmin ?? false;
}

/**
 * Get the full resolved permissions object (reactive).
 */
export function getPermissions(): ResolvedPermissions | null {
  return permissions();
}

/**
 * Check if permissions have been loaded.
 */
export function isPermissionsLoaded(): boolean {
  return isLoaded();
}
