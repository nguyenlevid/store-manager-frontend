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
 * Signup request (email-only, Step 1)
 */
export interface SignupRequest {
  email: string;
}

/**
 * Signup response (no user is created yet)
 */
export interface SignupResponse {
  message: string;
}

/**
 * Verify token response
 */
export interface VerifyTokenResponse {
  email: string;
  accountType: 'self_registered' | 'invited' | 'deactivated';
  businessName?: string;
}

/**
 * Complete invitation request (invited users — personal details only)
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

/**
 * Complete invitation response
 */
export const CompleteInvitationResponseSchema = z.object({
  user: UserSchema,
  business: z.object({
    _id: z.string(),
    name: z.string(),
    address: z.string(),
    phoneNumber: z.string(),
    email: z.string().optional(),
    creator: z.string(),
  }),
  accessToken: z.string(),
  csrfToken: z.string(),
});

export type CompleteInvitationResponse = z.infer<
  typeof CompleteInvitationResponseSchema
>;

/**
 * Complete registration request (onboarding wizard, Step 2)
 */
export interface CompleteRegistrationRequest {
  token: string;
  user: {
    name: string;
    password: string;
    phoneNumber?: string;
    birthDate: string;
  };
  business: {
    name: string;
    address: string;
    phoneNumber: string;
    email?: string;
  };
  storeHouse: {
    name?: string;
    address: string;
    phoneNumber?: string;
    email?: string;
  };
}

/**
 * Complete registration response (user + business + storehouse + tokens)
 */
export const CompleteRegistrationResponseSchema = z.object({
  user: UserSchema,
  business: z.object({
    _id: z.string(),
    name: z.string(),
    address: z.string(),
    phoneNumber: z.string(),
    email: z.string().optional(),
    creator: z.string(),
  }),
  storeHouse: z.object({
    _id: z.string(),
    address: z.string(),
    name: z.string().optional(),
    phoneNumber: z.string().optional(),
    email: z.string().optional(),
    business: z.string(),
  }),
  accessToken: z.string(),
  csrfToken: z.string(),
});

export type CompleteRegistrationResponse = z.infer<
  typeof CompleteRegistrationResponseSchema
>;

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
  password: string;
}
