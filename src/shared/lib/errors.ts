import type { AppError } from '../types/api.types';

/**
 * Error codes for application-wide error handling
 */
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN: 'UNKNOWN',
  CSRF_ERROR: 'CSRF_ERROR',
} as const;

/**
 * Normalize various error shapes into a consistent AppError
 */
export function normalizeError(error: unknown): AppError {
  // Already normalized
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    'code' in error
  ) {
    return error as AppError;
  }

  // Network or fetch errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      message: 'Network error. Please check your connection.',
      code: ERROR_CODES.NETWORK_ERROR,
    };
  }

  // Timeout errors
  if (error instanceof DOMException && error.name === 'AbortError') {
    return {
      message: 'Request timeout.',
      code: ERROR_CODES.TIMEOUT,
    };
  }

  // Standard Error objects
  if (error instanceof Error) {
    return {
      message: error.message,
      code: ERROR_CODES.UNKNOWN,
    };
  }

  // Fallback for unknown error shapes
  return {
    message: 'An unexpected error occurred.',
    code: ERROR_CODES.UNKNOWN,
    details: error,
  };
}

/**
 * Check if an error is of a specific code
 */
export function isErrorCode(
  error: AppError,
  code: keyof typeof ERROR_CODES
): boolean {
  return error.code === ERROR_CODES[code];
}
