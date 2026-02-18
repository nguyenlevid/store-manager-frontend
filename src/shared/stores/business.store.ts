/**
 * Business Store
 *
 * Singleton reactive store for the current user's business data.
 * All components should read from this store via `getBusiness()`
 * instead of fetching `getCurrentBusiness()` independently.
 *
 * Call `fetchBusiness()` once at app init (e.g. in MainLayout or after login).
 * Call `refreshBusiness()` after saving business settings to update all consumers.
 */

import { createSignal } from 'solid-js';
import {
  getCurrentBusiness,
  updateBusiness,
  type Business,
} from '@/shared/api/business.api';

const [business, setBusiness] = createSignal<Business | null>(null);
const [isLoaded, setIsLoaded] = createSignal(false);

/**
 * Fetch business data from the API and cache it in the store.
 * Safe to call multiple times — only fetches once unless forced.
 */
export async function fetchBusiness(force = false): Promise<Business | null> {
  if (isLoaded() && !force) return business();
  const data = await getCurrentBusiness();
  setBusiness(data);
  setIsLoaded(true);
  return data;
}

/**
 * Force-refresh business data from the API.
 */
export async function refreshBusiness(): Promise<Business | null> {
  return fetchBusiness(true);
}

/**
 * Update business on the server and refresh the local store.
 * Returns the updated business.
 */
export async function saveAndRefreshBusiness(
  id: string,
  data: Partial<Omit<Business, 'id'>>
): Promise<Business> {
  const updated = await updateBusiness(id, data);
  setBusiness(updated);
  return updated;
}

/**
 * Get the current business (reactive accessor).
 * Returns null until fetchBusiness() completes.
 */
export function getBusiness(): Business | null {
  return business();
}

/**
 * Check if business data has been loaded.
 */
export function isBusinessLoaded(): boolean {
  return isLoaded();
}
