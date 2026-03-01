import { apiClient } from '@/shared/lib/api-client';
import type {
  TeamMember,
  InviteUserRequest,
  InvitedUser,
} from '../types/team.types';

/**
 * Team API Service
 *
 * Handles team management API calls: list users, invite, deactivate, reactivate.
 */

/**
 * Get all users in the business
 */
export async function getTeamMembers(): Promise<TeamMember[]> {
  const response = await apiClient.get<TeamMember[]>('/user');
  return response;
}

/**
 * Get all pending invited users for the business
 */
export async function getInvitedUsers(): Promise<InvitedUser[]> {
  const response = await apiClient.get<InvitedUser[]>('/user/invited');
  return response;
}

/**
 * Check if an email is available for invitation
 */
export async function checkEmailAvailability(
  email: string
): Promise<{ available: boolean; reason?: 'registered' | 'invited' }> {
  const response = await apiClient.get<{
    available: boolean;
    reason?: 'registered' | 'invited';
  }>(`/user/check-email?email=${encodeURIComponent(email)}`);
  return response;
}

/**
 * Invite a new user to the business
 */
export async function inviteUser(
  data: InviteUserRequest
): Promise<{ message: string; email: string }> {
  const response = await apiClient.post<{ message: string; email: string }>(
    '/user/invite',
    data
  );
  return response;
}

/**
 * Deactivate a user
 */
export async function deactivateUser(
  userId: string
): Promise<{ message: string }> {
  const response = await apiClient.patch<{ message: string }>(
    `/user/${userId}/deactivate`
  );
  return response;
}

/**
 * Reactivate a user
 */
export async function reactivateUser(
  userId: string
): Promise<{ message: string }> {
  const response = await apiClient.patch<{ message: string }>(
    `/user/${userId}/reactivate`
  );
  return response;
}
