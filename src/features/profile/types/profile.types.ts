import { z } from 'zod';

/**
 * Profile data schema with runtime validation
 */
export const ProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['admin', 'manager', 'employee']),
  phone: z.string().optional(),
  department: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Profile = z.infer<typeof ProfileSchema>;

/**
 * Update profile request
 */
export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  department?: string;
}

/**
 * Profile response
 */
export const ProfileResponseSchema = z.object({
  profile: ProfileSchema,
});

export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;
