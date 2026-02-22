import { z } from 'zod';
import { UserSchema } from '@/features/auth/types/auth.types';

/**
 * Team member (extended user with isActive)
 */
export const TeamMemberSchema = UserSchema.extend({
  isActive: z.boolean().optional().default(true),
});

export type TeamMember = z.infer<typeof TeamMemberSchema>;

/**
 * Invite user request
 */
export interface InviteUserRequest {
  email: string;
  appRole?: 'admin' | 'user';
  roleIds?: string[];
  storeHouseIds?: string[];
}

/**
 * Invited (pending) user returned from GET /user/invited
 */
export interface InvitedUser {
  _id: string;
  email: string;
  accountType: 'invited';
  assignedAppRole: 'admin' | 'user';
  assignedRoles: string[];
  assignedStoreHouses: string[];
  name?: string;
  expiresAt: string;
  createdAt: string;
}

/**
 * Complete invitation request (for the invited user)
 */
export interface CompleteInvitationRequest {
  token: string;
  user: {
    name: string;
    password: string;
    phoneNumber?: string;
    birthDate: string;
  };
}
