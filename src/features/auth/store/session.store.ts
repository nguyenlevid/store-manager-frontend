import { createSignal } from 'solid-js';
import { fetchBusiness } from '@/shared/stores/business.store';
import {
  fetchPermissions,
  clearPermissions,
} from '@/shared/stores/permissions.store';
import type { User, SessionStatus } from '../types/auth.types';
import type {
  SignupRequest,
  CompleteRegistrationRequest,
  CompleteInvitationRequest,
} from '../types/auth.types';
import * as authApi from '../api/auth.api';
import type { AppError } from '@/shared/types/api.types';
import { normalizeError } from '@/shared/lib/errors';

/**
 * Session Store
 *
 * Manages authentication state using Solid signals.
 * Features:
 * - Session initialization on app startup
 * - Login/logout actions
 * - Current user state
 * - Loading and error states
 */

// Session state
const [status, setStatus] = createSignal<SessionStatus>('loading');
const [user, setUser] = createSignal<User | null>(null);
const [error, setError] = createSignal<AppError | null>(null);
const [isInitialized, setIsInitialized] = createSignal(false);

// Token stored in memory (not localStorage for security)
const [accessToken, setAccessToken] = createSignal<string | null>(null);

/**
 * Initialize session on app startup
 *
 * This will attempt to get the current user. If there's no access token in memory
 * but a valid refresh_token cookie exists, the api-client will automatically:
 * 1. Get a 401 from /auth/profile
 * 2. Call /auth/refresh with the refresh cookie
 * 3. Store the new access token in memory via updateAccessToken()
 * 4. Retry /auth/profile successfully
 */
export async function initSession(): Promise<void> {
  if (isInitialized()) {
    return;
  }

  setStatus('loading');
  setError(null);

  try {
    // This call will auto-refresh if needed (refresh cookie exists)
    const currentUser = await authApi.getCurrentUser();
    setUser(currentUser);
    setStatus('authenticated');
    // Load business data and permissions into shared stores
    fetchBusiness();
    fetchPermissions();
  } catch {
    // Only truly unauthenticated if refresh failed or no refresh cookie
    setUser(null);
    setStatus('unauthenticated');
    // Don't set error for initial load failures (user just not logged in)
  } finally {
    setIsInitialized(true);
  }
}

/**
 * Login with credentials
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; error?: AppError }> {
  setError(null);

  try {
    const response = await authApi.login({ email, password });
    // Extract user and store token in memory
    setUser(response.user);
    setAccessToken(response.accessToken);
    setStatus('authenticated');
    // Load business data and permissions into shared stores
    fetchBusiness(true);
    fetchPermissions(true);
    return { success: true };
  } catch (err) {
    const appError = normalizeError(err);
    setError(appError);
    return { success: false, error: appError };
  }
}

/**
 * Logout current user
 */
export async function logoutUser(): Promise<void> {
  try {
    await authApi.logout();
  } catch {
    // Logout locally even if API call fails
  } finally {
    setUser(null);
    setAccessToken(null);
    setStatus('unauthenticated');
    setError(null);
    clearPermissions();
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return status() === 'authenticated' && user() !== null;
}

/**
 * Check if session is still loading
 */
export function isLoading(): boolean {
  return status() === 'loading';
}

/**
 * Get current user
 */
export function getUser(): User | null {
  return user();
}

/**
 * Get current error
 */
export function getError(): AppError | null {
  return error();
}

/**
 * Get session status
 */
export function getStatus(): SessionStatus {
  return status();
}

/**
 * Export signals for reactive components
 */
export const session = {
  status,
  user,
  error,
  isInitialized,
};

// Export individual signals for convenience
export { status, user, error, isInitialized };

/**
 * Get current access token from memory
 */
export function getAccessToken(): string | null {
  return accessToken();
}

/**
 * Update access token (used by refresh flow)
 */
export function updateAccessToken(token: string): void {
  setAccessToken(token);
}

/**
 * Sign up with email only (Step 1)
 * Sends verification email — does NOT log the user in
 */
export async function signupUser(
  data: SignupRequest
): Promise<{ success: boolean; error?: AppError }> {
  setError(null);

  try {
    await authApi.signup(data);
    return { success: true };
  } catch (err) {
    const appError = normalizeError(err);
    setError(appError);
    return { success: false, error: appError };
  }
}

/**
 * Complete registration (Step 2 — onboarding wizard)
 * Creates user + business + storehouse and logs them in
 */
export async function completeRegistrationUser(
  data: CompleteRegistrationRequest
): Promise<{ success: boolean; error?: AppError }> {
  setError(null);

  try {
    const response = await authApi.completeRegistration(data);
    setUser(response.user);
    setAccessToken(response.accessToken);
    setStatus('authenticated');
    // Load business data and permissions into shared stores
    fetchBusiness(true);
    fetchPermissions(true);
    return { success: true };
  } catch (err) {
    const appError = normalizeError(err);
    setError(appError);
    return { success: false, error: appError };
  }
}

/**
 * Complete invitation (invited users)
 * Joins existing business and logs them in
 */
export async function completeInvitationUser(
  data: CompleteInvitationRequest
): Promise<{ success: boolean; error?: AppError }> {
  setError(null);

  try {
    const response = await authApi.completeInvitation(data);
    setUser(response.user);
    setAccessToken(response.accessToken);
    setStatus('authenticated');
    // Load business data and permissions into shared stores
    fetchBusiness(true);
    fetchPermissions(true);
    return { success: true };
  } catch (err) {
    const appError = normalizeError(err);
    setError(appError);
    return { success: false, error: appError };
  }
}

/**
 * Export setters for direct updates (used in signup flow)
 */
export { setUser, setStatus, setError };
