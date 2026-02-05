import { apiClient } from '@/shared/lib/api-client';
import type { Profile, UpdateProfileRequest } from '../types/profile.types';
import { USE_MOCK_API, MOCK_PROFILE, mockDelay } from '@/shared/lib/mock-data';
import type { User } from '@/features/auth/types/auth.types';

/**
 * Profile API Service
 *
 * Handles all profile-related API calls with Zod validation.
 * Uses mock data when VITE_USE_MOCK_API=true
 *
 * NOTE: Profile operations use the auth/profile endpoint for reading
 * and user/:id endpoint for updating.
 */

// Map backend appRole to frontend role
function mapAppRoleToRole(
  appRole: 'dev' | 'admin' | 'user'
): 'admin' | 'manager' | 'employee' {
  switch (appRole) {
    case 'dev':
    case 'admin':
      return 'admin';
    case 'user':
      return 'employee';
    default:
      return 'employee';
  }
}

// Store mock profile state
let mockProfileState: Profile = {
  ...MOCK_PROFILE,
  role: 'admin',
};

/**
 * Get user profile (from auth endpoint)
 */
export async function getProfile(): Promise<Profile> {
  if (USE_MOCK_API) {
    await mockDelay();
    return mockProfileState;
  }

  // Get profile from auth endpoint (returns User object)
  const response = await apiClient.get<User>('/auth/profile');

  // Convert User to Profile format
  return {
    id: response._id,
    email: response.email,
    name: response.name,
    role: mapAppRoleToRole(response.appRole),
    phone: response.phoneNumber,
    department: '', // Not in User model
    createdAt: response.createdAt || '',
    updatedAt: response.updatedAt || '',
  };
}

/**
 * Update user profile (using user endpoint)
 */
export async function updateProfile(
  data: UpdateProfileRequest
): Promise<Profile> {
  if (USE_MOCK_API) {
    await mockDelay();
    // Update mock state
    mockProfileState = {
      ...mockProfileState,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return mockProfileState;
  }

  // First get current profile to get user ID
  const currentProfile = await getProfile();

  // Update using user endpoint
  const response = await apiClient.put<User>(`/user/${currentProfile.id}`, {
    name: data.name,
    phoneNumber: data.phone,
    // Include other required fields from current profile
  });

  // Convert response to Profile format
  return {
    id: response._id,
    email: response.email,
    name: response.name,
    role: mapAppRoleToRole(response.appRole),
    phone: response.phoneNumber,
    department: '',
    createdAt: response.createdAt || '',
    updatedAt: response.updatedAt || '',
  };
}
