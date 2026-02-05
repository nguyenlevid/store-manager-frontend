import { apiClient } from '@/shared/lib/api-client';
import type {
  LoginRequest,
  SignupRequest,
  AuthResponse,
  User,
  Session,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '../types/auth.types';
import { AuthResponseSchema } from '../types/auth.types';
import { USE_MOCK_API, MOCK_USER, mockDelay } from '@/shared/lib/mock-data';

/**
 * Auth API Service
 *
 * Handles all authentication-related API calls with Zod validation.
 * Uses mock data when VITE_USE_MOCK_API=true
 */

/**
 * Sign up a new user
 */
export async function signup(data: SignupRequest): Promise<AuthResponse> {
  if (USE_MOCK_API) {
    await mockDelay();
    return {
      user: MOCK_USER,
      accessToken: 'mock_access_token',
      csrfToken: 'mock_csrf_token',
    };
  }

  const response = await apiClient.post<AuthResponse>('/auth/signup', data);
  const validated = AuthResponseSchema.parse(response);

  // Tokens are managed by session store, not stored here
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
 * Request password reset (NOT IMPLEMENTED ON BACKEND YET)
 */
export async function forgotPassword(
  _data: ForgotPasswordRequest
): Promise<{ message: string }> {
  if (USE_MOCK_API) {
    await mockDelay();
    return { message: 'Password reset email sent' };
  }

  // TODO: Implement on backend
  throw new Error('Password reset not implemented yet');
}

/**
 * Reset password with token (NOT IMPLEMENTED ON BACKEND YET)
 */
export async function resetPassword(
  _data: ResetPasswordRequest
): Promise<{ message: string }> {
  if (USE_MOCK_API) {
    await mockDelay();
    return { message: 'Password reset successfully' };
  }

  // TODO: Implement on backend
  throw new Error('Password reset not implemented yet');
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
