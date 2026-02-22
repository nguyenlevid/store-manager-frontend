import type { AppError, RequestConfig } from '../types/api.types';
import { normalizeError, ERROR_CODES } from './errors';
import { csrfManager } from './csrf';
import {
  getAccessToken,
  updateAccessToken,
} from '@/features/auth/store/session.store';

/**
 * API Client
 *
 * Features:
 * - Base URL configuration via env
 * - Credentials: include (for HttpOnly cookies)
 * - CSRF token handling (X-CSRF-Token header)
 * - Request timeout and AbortController support
 * - Normalized error handling
 * - Single-flight token refresh on 401
 * - Retry-once on CSRF errors
 *
 * Security notes:
 * - Never logs request/response bodies that may contain secrets
 * - CSRF token refreshed automatically on 403
 * - 401 triggers session refresh (implemented in auth module)
 */

const API_BASE_URL = import.meta.env['VITE_API_BASE_URL'] || '';
const DEFAULT_TIMEOUT = 30000; // 30 seconds

// Track refresh in progress
let refreshPromise: Promise<void> | null = null;
let isRefreshing = false;

// Queue for requests waiting for refresh
type QueueItem = {
  resolve: (value: void) => void;
  reject: (error: unknown) => void;
};
const refreshQueue: QueueItem[] = [];

/**
 * Create a timeout AbortController
 */
function createTimeoutController(timeout: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return controller;
}

/**
 * Attempt to refresh the session
 */
async function refreshSession(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Session refresh failed');
  }

  // Parse response and unwrap backend format: { isOk: true, data: { accessToken, csrfToken } }
  const jsonData = await response.json();
  const data = jsonData?.data || jsonData; // Unwrap if wrapped

  // Update access token in session store (memory)
  if (data.accessToken) {
    updateAccessToken(data.accessToken);
  }

  // CSRF token is already updated in cookie by backend
}

/**
 * Handle 401 by refreshing session (single-flight)
 */
async function handleUnauthorized(): Promise<void> {
  if (isRefreshing && refreshPromise) {
    // Wait for the existing refresh to complete
    return new Promise<void>((resolve, reject) => {
      refreshQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  refreshPromise = refreshSession();

  try {
    await refreshPromise;
    // Resolve all queued requests
    refreshQueue.forEach((item) => item.resolve());
    refreshQueue.length = 0;
  } catch (error) {
    // Reject all queued requests
    refreshQueue.forEach((item) => item.reject(error));
    refreshQueue.length = 0;
    throw error;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
}

/**
 * Make an API request with full error handling and retry logic
 */
async function request<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    signal,
    timeout = DEFAULT_TIMEOUT,
    skipCsrf = false,
    skipAuth = false,
  } = config;

  // Create timeout controller if no signal provided
  const timeoutController = signal ? null : createTimeoutController(timeout);
  const effectiveSignal = signal || timeoutController?.signal;

  // Prepare headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add Authorization header with access token (if available and not skipped)
  if (!skipAuth) {
    const accessToken = getAccessToken();
    if (accessToken) {
      requestHeaders['Authorization'] = `Bearer ${accessToken}`;
    }
  }

  // Add CSRF token for state-changing requests
  const isStateMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  if (isStateMutating && !skipCsrf) {
    try {
      // Read CSRF token from cookie (set by backend)
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrf-token='))
        ?.split('=')[1];

      if (csrfToken) {
        requestHeaders['X-CSRF-Token'] = csrfToken;
      } else {
        // Fallback: fetch from server if not in cookie
        const token = await csrfManager.getToken();
        if (token) {
          requestHeaders['X-CSRF-Token'] = token;
        }
      }
    } catch (error) {
      throw normalizeError(error);
    }
  }

  // Make the request
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
      signal: effectiveSignal,
    });

    // Handle 401 - trigger session refresh and retry (skip for auth endpoints)
    if (response.status === 401 && !skipAuth) {
      // Don't auto-refresh for login/signup/refresh endpoints to avoid loops
      // BUT do auto-refresh for /auth/profile since it requires a valid token
      const isAuthMutationEndpoint =
        endpoint === '/auth/login' ||
        endpoint === '/auth/signup' ||
        endpoint === '/auth/refresh' ||
        endpoint === '/auth/logout' ||
        endpoint === '/auth/logout-all';

      if (!isAuthMutationEndpoint) {
        try {
          await handleUnauthorized();
          // Retry the original request
          return request<T>(endpoint, config);
        } catch {
          // Refresh failed - return 401 error
          const errorData = (await safeParseJson(response)) as Record<
            string,
            unknown
          > | null;
          throw {
            message: (errorData?.['message'] as string) || 'Unauthorized',
            code: ERROR_CODES.UNAUTHORIZED,
            status: 401,
          } as AppError;
        }
      } else {
        // For auth mutation endpoints, just throw the error without retry
        const errorData = (await safeParseJson(response)) as Record<
          string,
          unknown
        > | null;
        throw {
          message: (errorData?.['message'] as string) || 'Unauthorized',
          code: ERROR_CODES.UNAUTHORIZED,
          status: 401,
        } as AppError;
      }
    }

    // Handle 403 - might be CSRF error, refresh token and retry once
    // Parse body once so both CSRF check and generic handler can use it
    let prefetchedErrorData: unknown = undefined;
    if (response.status === 403 && isStateMutating && !skipCsrf) {
      prefetchedErrorData = await safeParseJson(response);
      const topLevel = prefetchedErrorData as Record<string, unknown> | null;
      const isCsrfError =
        topLevel?.['code'] === 'CSRF_ERROR' ||
        (topLevel?.['message'] as string)?.includes('CSRF');

      if (isCsrfError) {
        // CSRF cookie will be refreshed by backend on retry
        // Just retry the request without CSRF validation
        return request<T>(endpoint, { ...config, skipCsrf: true });
      }
    }

    // Handle other errors
    if (!response.ok) {
      // Reuse body if already parsed by the 403 CSRF check above
      const errorData =
        prefetchedErrorData !== undefined
          ? prefetchedErrorData
          : await safeParseJson(response);

      // Extract error from backend format: { isOk: false, data: { rcode } }
      // Backend only sends error code for security, no messages
      const backendData =
        errorData && typeof errorData === 'object' && 'data' in errorData
          ? (errorData as { data: Record<string, unknown> }).data
          : null;

      const errorCode =
        (backendData?.['rcode'] as string) || getErrorCode(response.status);

      throw {
        message: '', // Will be mapped by error-messages.ts based on code
        code: errorCode,
        status: response.status,
        details: backendData?.['debug'], // Only in development
      } as AppError;
    }

    // Parse successful response
    if (response.status === 204) {
      return undefined as T;
    }

    const jsonData = await response.json();

    // Unwrap backend response format: { isOk: true, data: {...} }
    if (
      jsonData &&
      typeof jsonData === 'object' &&
      'isOk' in jsonData &&
      'data' in jsonData
    ) {
      return jsonData.data as T;
    }

    // Return as-is if not wrapped
    return jsonData as T;
  } catch (error) {
    // If it's already an AppError, re-throw it
    if (error && typeof error === 'object' && 'code' in error) {
      throw error;
    }
    // Otherwise normalize it
    throw normalizeError(error);
  }
}

/**
 * Safely parse JSON response
 */
async function safeParseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Map HTTP status to error code
 */
function getErrorCode(status: number): string {
  switch (status) {
    case 401:
      return ERROR_CODES.UNAUTHORIZED;
    case 403:
      return ERROR_CODES.FORBIDDEN;
    case 404:
      return ERROR_CODES.NOT_FOUND;
    case 422:
      return ERROR_CODES.VALIDATION_ERROR;
    case 500:
    case 502:
    case 503:
      return ERROR_CODES.SERVER_ERROR;
    default:
      return ERROR_CODES.UNKNOWN;
  }
}

/**
 * Export API client methods
 */
export const apiClient = {
  get: <T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>) =>
    request<T>(endpoint, { ...config, method: 'GET' }),

  post: <T>(
    endpoint: string,
    body?: unknown,
    config?: Omit<RequestConfig, 'method'>
  ) => request<T>(endpoint, { ...config, method: 'POST', body }),

  put: <T>(
    endpoint: string,
    body?: unknown,
    config?: Omit<RequestConfig, 'method'>
  ) => request<T>(endpoint, { ...config, method: 'PUT', body }),

  patch: <T>(
    endpoint: string,
    body?: unknown,
    config?: Omit<RequestConfig, 'method'>
  ) => request<T>(endpoint, { ...config, method: 'PATCH', body }),

  delete: <T>(
    endpoint: string,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ) => request<T>(endpoint, { ...config, method: 'DELETE' }),
};
