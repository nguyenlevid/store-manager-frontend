/**
 * Business API
 *
 * Handles business-related API calls
 */

import { apiClient } from '@/shared/lib/api-client';

/**
 * Business type from backend
 */
export interface Business {
  id: string;
  name: string;
  address: string;
  phoneNumber: string;
  email: string;
  currency: string;
  timezone: string;
  creator: string;
}

/**
 * Backend response type
 */
interface BackendBusiness {
  _id: string;
  name: string;
  address: string;
  phoneNumber: string;
  email: string;
  currency?: string;
  timezone?: string;
  creator?: string;
}

/**
 * Map backend business to frontend type
 */
function mapBackendBusiness(business: BackendBusiness): Business {
  return {
    id: business._id,
    name: business.name,
    address: business.address,
    phoneNumber: business.phoneNumber,
    email: business.email,
    currency: business.currency || 'USD',
    timezone: business.timezone || 'UTC',
    creator: business.creator || '',
  };
}

/**
 * Get current user's business details
 */
export async function getCurrentBusiness(): Promise<Business | null> {
  try {
    const response = await apiClient.get<BackendBusiness>('/business/current');
    return response ? mapBackendBusiness(response) : null;
  } catch {
    return null;
  }
}

/**
 * Get business by ID
 */
export async function getBusinessById(id: string): Promise<Business | null> {
  try {
    const response = await apiClient.get<BackendBusiness>(`/business/${id}`);
    return response ? mapBackendBusiness(response) : null;
  } catch {
    return null;
  }
}

/**
 * Update business
 */
export async function updateBusiness(
  id: string,
  data: Partial<Omit<Business, 'id'>>
): Promise<Business> {
  const response = await apiClient.put<BackendBusiness>(
    `/business/${id}`,
    data
  );
  return mapBackendBusiness(response);
}

/**
 * Create a new business (onboarding)
 */
export async function createBusiness(data: {
  name: string;
  address: string;
  phoneNumber: string;
  email?: string;
  currency?: string;
  timezone?: string;
}): Promise<Business> {
  const response = await apiClient.post<BackendBusiness>('/business', data);
  return mapBackendBusiness(response);
}
