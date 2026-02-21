/**
 * Users API
 *
 * Fetch business users for role/storehouse assignment.
 */

import { apiClient } from '@/shared/lib/api-client';

// ─── Types ───────────────────────────────────────────────────

export interface BusinessUser {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  appRole: 'dev' | 'admin' | 'user';
  accessRole: string[]; // role IDs
  storeHouses: string[]; // storehouse IDs
  createdAt: string;
  updatedAt: string;
}

// ─── API Functions ───────────────────────────────────────────

/**
 * List all users in the current business
 */
export async function getBusinessUsers(): Promise<BusinessUser[]> {
  return apiClient.get<BusinessUser[]>('/user');
}

/**
 * Get a single user by ID
 */
export async function getBusinessUser(id: string): Promise<BusinessUser> {
  return apiClient.get<BusinessUser>(`/user/${id}`);
}
