import { z } from 'zod';

/**
 * User schema with runtime validation
 * Updated to match backend User model
 */
export const UserSchema = z.object({
  _id: z.string(),
  email: z.string().email(),
  name: z.string(),
  username: z.string().optional(),
  appRole: z.enum(['dev', 'admin', 'user']),
  phoneNumber: z.string().optional(),
  birthDate: z.string().optional(),
  business: z.string().optional(),
  storeHouses: z.array(z.string()).optional().default([]),
  accessRole: z.array(z.string()).optional().default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * Login request
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Signup request
 */
export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  phoneNumber?: string;
  birthDate: string;
  business?: string;
}

/**
 * Auth response with tokens
 */
export const AuthResponseSchema = z.object({
  user: UserSchema,
  accessToken: z.string(),
  csrfToken: z.string(),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

/**
 * Session info
 */
export const SessionSchema = z.object({
  id: z.string(),
  deviceInfo: z.object({
    userAgent: z.string().optional(),
    ip: z.string().optional(),
  }),
  lastUsedAt: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
});

export type Session = z.infer<typeof SessionSchema>;

/**
 * Session state
 */
export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

/**
 * Password reset requests
 */
export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
