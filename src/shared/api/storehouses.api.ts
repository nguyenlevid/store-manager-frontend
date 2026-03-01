/**
 * Storehouses (Warehouses) API
 *
 * Handles all storehouse related API calls
 */

import { apiClient } from '@/shared/lib/api-client';
import type {
  Storehouse,
  StorehouseFormData,
  StorehouseFilters,
} from '@/shared/types/storehouse.types';

/**
 * Backend Storehouse type (from MongoDB)
 */
interface BackendStorehouse {
  _id: string;
  name: string;
  address: string;
  phoneNumber: string;
  email: string;
  business: string;
  isLocked?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Map backend storehouse to frontend Storehouse type
 */
function mapBackendStorehouse(storehouse: BackendStorehouse): Storehouse {
  if (!storehouse) {
    throw new Error('Storehouse is null or undefined');
  }

  const storehouseId = storehouse._id || (storehouse as any).id;

  if (!storehouseId) {
    console.error('❌ Storehouse missing both _id and id:', storehouse);
    throw new Error('Storehouse missing _id or id field');
  }

  return {
    id: storehouseId,
    name: storehouse.name,
    address: storehouse.address,
    phoneNumber: storehouse.phoneNumber,
    email: storehouse.email,
    business: storehouse.business,
    isLocked: storehouse.isLocked ?? false,
    createdAt: storehouse.createdAt || new Date().toISOString(),
    updatedAt: storehouse.updatedAt || new Date().toISOString(),
  };
}

/**
 * Get all storehouses with optional filters
 */
export async function getStorehouses(
  filters?: StorehouseFilters
): Promise<Storehouse[]> {
  const params = new URLSearchParams();

  if (filters?.search) {
    params.append('search', filters.search);
  }

  const queryString = params.toString();
  const endpoint = queryString ? `/storehouse?${queryString}` : '/storehouse';

  const backendStorehouses = await apiClient.get<BackendStorehouse[]>(endpoint);

  const storehouses = Array.isArray(backendStorehouses)
    ? backendStorehouses.map(mapBackendStorehouse)
    : [];

  return storehouses;
}

/**
 * Get single storehouse by ID
 */
export async function getStorehouseById(
  storehouseId: string
): Promise<Storehouse> {
  const backendStorehouse = await apiClient.get<BackendStorehouse>(
    `/storehouse/${storehouseId}`
  );
  return mapBackendStorehouse(backendStorehouse);
}

/**
 * Create new storehouse
 */
export async function createStorehouse(
  data: StorehouseFormData
): Promise<Storehouse> {
  const backendStorehouse = await apiClient.post<BackendStorehouse>(
    '/storehouse',
    data
  );
  return mapBackendStorehouse(backendStorehouse);
}

/**
 * Update storehouse details
 */
export async function updateStorehouse(
  storehouseId: string,
  updates: Partial<StorehouseFormData>
): Promise<Storehouse> {
  const backendStorehouse = await apiClient.put<BackendStorehouse>(
    `/storehouse/${storehouseId}`,
    updates
  );
  return mapBackendStorehouse(backendStorehouse);
}

/**
 * Delete storehouse
 */
export async function deleteStorehouse(storehouseId: string): Promise<void> {
  await apiClient.delete(`/storehouse/${storehouseId}`);
}
