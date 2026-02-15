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
