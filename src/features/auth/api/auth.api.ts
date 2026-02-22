import { apiClient } from '@/shared/lib/api-client';
import type {
  LoginRequest,
  SignupRequest,
  SignupResponse,
  CompleteRegistrationRequest,
  CompleteRegistrationResponse,
  CompleteInvitationRequest,
  CompleteInvitationResponse,
  VerifyTokenResponse,
  AuthResponse,
  User,
  Session,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '../types/auth.types';
import {
  AuthResponseSchema,
  CompleteRegistrationResponseSchema,
  CompleteInvitationResponseSchema,
} from '../types/auth.types';
import { USE_MOCK_API, MOCK_USER, mockDelay } from '@/shared/lib/mock-data';

/**
 * Auth API Service
 *
 * Handles all authentication-related API calls with Zod validation.
 * Uses mock data when VITE_USE_MOCK_API=true
 */

/**
 * Sign up with email only (Step 1)
 * Sends verification email to the user
 */
export async function signup(data: SignupRequest): Promise<SignupResponse> {
  if (USE_MOCK_API) {
    await mockDelay();
    return { message: 'Verification email sent. Please check your inbox.' };
  }

  const response = await apiClient.post<SignupResponse>('/auth/signup', data);
  return response;
}

/**
 * Verify a token before showing the onboarding wizard
 */
export async function verifyToken(token: string): Promise<VerifyTokenResponse> {
  if (USE_MOCK_API) {
    await mockDelay();
    return { email: 'test@example.com', accountType: 'self_registered' };
  }

  const response = await apiClient.get<VerifyTokenResponse>(
    `/auth/verify-token/${token}`
  );
  return response;
}

/**
 * Complete registration (Step 2 — onboarding wizard submission)
 * Creates User + Business + StoreHouse and returns tokens
 */
export async function completeRegistration(
  data: CompleteRegistrationRequest
): Promise<CompleteRegistrationResponse> {
  if (USE_MOCK_API) {
    await mockDelay();
    return {
      user: MOCK_USER,
      business: {
        _id: 'mock_business_id',
        name: 'Mock Business',
        address: '123 Mock St',
        phoneNumber: '+1234567890',
        creator: MOCK_USER._id,
      },
      storeHouse: {
        _id: 'mock_storehouse_id',
        address: '123 Mock St',
        business: 'mock_business_id',
      },
      accessToken: 'mock_access_token',
      csrfToken: 'mock_csrf_token',
    };
  }

  const response = await apiClient.post<CompleteRegistrationResponse>(
    '/auth/complete-registration',
    data
  );
  const validated = CompleteRegistrationResponseSchema.parse(response);
  return validated;
}

/**
 * Login with email and password
 */
export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  // Mock mode: accept any credentials
  if (USE_MOCK_API) {
    await mockDelay();
    return {
      user: MOCK_USER,
      accessToken: 'mock_access_token',
      csrfToken: 'mock_csrf_token',
    };
  }

  const response = await apiClient.post<AuthResponse>(
    '/auth/login',
    credentials
  );

  // Validate response shape
  const validated = AuthResponseSchema.parse(response);

  // Tokens are managed by session store, not stored here
  return validated;
}

/**
 * Logout current session
 */
export async function logout(): Promise<void> {
  if (USE_MOCK_API) {
    await mockDelay(300);
    // Tokens cleared by session store
    return;
  }

  await apiClient.post<void>('/auth/logout');

  // Tokens are cleared by session store
}

/**
 * Logout from all devices
 */
export async function logoutAll(): Promise<{ message: string }> {
  if (USE_MOCK_API) {
    await mockDelay(300);
    // Tokens cleared by session store
    return { message: 'Logged out from all devices' };
  }

  const response = await apiClient.post<{ message: string }>(
    '/auth/logout-all'
  );

  // Tokens are cleared by session store
  return response;
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<User> {
  if (USE_MOCK_API) {
    await mockDelay(300);
    // Simulate being logged in
    return MOCK_USER;
  }

  const response = await apiClient.get<User>('/auth/profile');
  return response;
}

/**
 * Get active sessions
 */
export async function getSessions(): Promise<{
  sessions: Session[];
  count: number;
}> {
  if (USE_MOCK_API) {
    await mockDelay();
    return {
      sessions: [
        {
          id: '1',
          deviceInfo: { userAgent: 'Mozilla/5.0...', ip: '192.168.1.1' },
          lastUsedAt: new Date().toISOString(),
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          expiresAt: new Date(Date.now() + 6 * 86400000).toISOString(),
        },
      ],
      count: 1,
    };
  }

  const response = await apiClient.get<{ sessions: Session[]; count: number }>(
    '/auth/sessions'
  );
  return response;
}

/**
 * Revoke a specific session
 */
export async function revokeSession(
  sessionId: string
): Promise<{ message: string }> {
  if (USE_MOCK_API) {
    await mockDelay();
    return { message: 'Session revoked' };
  }

  const response = await apiClient.delete<{ message: string }>(
    `/auth/sessions/${sessionId}`
  );
  return response;
}

/**
 * Request password reset email
 */
export async function forgotPassword(
  data: ForgotPasswordRequest
): Promise<{ message: string }> {
  if (USE_MOCK_API) {
    await mockDelay();
    return { message: 'Password reset email sent' };
  }

  const response = await apiClient.post<{ message: string }>(
    '/auth/forgot-password',
    data
  );
  return response;
}

/**
 * Reset password with token
 */
export async function resetPassword(
  data: ResetPasswordRequest
): Promise<{ message: string }> {
  if (USE_MOCK_API) {
    await mockDelay();
    return { message: 'Password reset successfully' };
  }

  const response = await apiClient.post<{ message: string }>(
    '/auth/reset-password',
    { token: data.token, password: data.password }
  );
  return response;
}

/**
 * Complete invitation (invited users — personal details only)
 * Creates User joining existing business
 */
export async function completeInvitation(
  data: CompleteInvitationRequest
): Promise<CompleteInvitationResponse> {
  if (USE_MOCK_API) {
    await mockDelay();
    return {
      user: MOCK_USER,
      business: {
        _id: 'mock_business_id',
        name: 'Mock Business',
        address: '123 Mock St',
        phoneNumber: '+1234567890',
        creator: MOCK_USER._id,
      },
      accessToken: 'mock_access_token',
      csrfToken: 'mock_csrf_token',
    };
  }

  const response = await apiClient.post<CompleteInvitationResponse>(
    '/auth/complete-invitation',
    data
  );
  const validated = CompleteInvitationResponseSchema.parse(response);
  return validated;
}

/**
 * Get CSRF token
 */
export async function getCsrfToken(): Promise<{
  csrfToken: string;
  headerName?: string;
}> {
  if (USE_MOCK_API) {
    return { csrfToken: 'mock_csrf_token' };
  }

  const response = await apiClient.get<{
    csrfToken: string;
    headerName?: string;
  }>('/auth/csrf');
  // CSRF token is already set in cookie by backend
  return response;
}
