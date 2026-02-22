/**
 * Error Message Mapper
 *
 * Maps backend error codes to user-friendly messages.
 * Provides default fallbacks for unknown errors.
 * Supports custom error messages from backend.
 */

export interface BackendError {
  code?: number | string;
  message?: string;
  details?: unknown;
}

/**
 * Error code to user message mapping
 */
const ERROR_MESSAGES: Record<number, string> = {
  // Success (shouldn't reach here, but just in case)
  2000: 'Operation successful',
  2001: 'Created successfully',
  2002: 'Completed successfully',

  // Input validation
  4000: 'Invalid request data. Please check your input.',
  4001: 'Invalid query parameters.',

  // Authentication
  4002: 'Invalid email or password. Please try again.',
  4003: 'Authentication required. Please log in.',
  4009: 'Invalid password format.',
  4004: 'This email is already registered. Please use a different email or log in.',
  4005: 'Invalid password reset token.',
  4006: 'Password reset token is missing.',
  4007: 'Password reset token has expired.',
  4101: 'Invalid or expired access token. Please log in again.',
  4104: 'Session has expired. Please log in again.',
  4303: 'Security token mismatch. Please refresh and try again.',
  4304: "You don't have permission to perform this action.",
  4305: 'No business associated with your account. Please create or join a business.',
  4306: 'Invalid or expired verification link. Please sign up again.',
  4307: 'Your verification link has expired. Please sign up again.',
  4308: 'Your account has been deactivated. Please contact your administrator.',
  4309: "You don't have the required permission for this action.",
  4310: 'You are not assigned to this storehouse.',
  4311: 'No storehouses are assigned to your account. Contact your administrator.',
  4312: 'This action requires admin privileges.',
  4313: 'You cannot perform this action on your own account.',
  4314: 'This account cannot be modified.',
  4315: 'The business owner cannot be modified.',
  4290: 'Too many requests. Please try again later.',

  // Not found
  4400: 'User not found.',
  4401: 'Business not found.',
  4402: 'Storehouse not found.',
  4403: 'Item not found.',
  4404: 'Partner not found.',
  4405: 'Transaction not found.',
  4406: 'Import record not found.',
  4410: 'Membership not found.',
  4411: 'Session not found.',
  4412: 'Role not found.',

  // Server errors
  5000: 'Server error occurred. Please try again later.',
  6000: 'Email service is unavailable. Please try again later.',

  // Database errors
  7000: 'Database error occurred. Please try again.',
  7001: 'Invalid database request.',
  7002: 'Database is temporarily unavailable.',
  7003: 'Data validation failed. Please check your input.',
  7004: 'This record already exists.',

  // Unknown
  [-9999]: 'An unexpected error occurred. Please try again.',
};

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: BackendError | string): string {
  // If error is a string, return it directly
  if (typeof error === 'string') {
    return error;
  }

  // If backend provided a custom message, use it
  if (error.message) {
    return error.message;
  }

  // Look up error code in our mapping
  if (
    error.code !== undefined &&
    typeof error.code === 'number' &&
    error.code in ERROR_MESSAGES
  ) {
    const message = ERROR_MESSAGES[error.code];
    return message || 'An unexpected error occurred. Please try again.';
  }

  // Default fallback
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Get error title based on type
 */
export function getErrorTitle(error: BackendError): string | undefined {
  if (!error.code || typeof error.code !== 'number') return undefined;

  // Group errors by type for titles
  if (error.code >= 4002 && error.code <= 4315) {
    return 'Authentication Error';
  }
  if (error.code >= 4400 && error.code <= 4412) {
    return 'Not Found';
  }
  if (error.code >= 5000 && error.code < 6000) {
    return 'Server Error';
  }
  if (error.code === 6000) {
    return 'Email Error';
  }
  if (error.code >= 7000 && error.code <= 7004) {
    return 'Database Error';
  }
  if (error.code === 4290) {
    return 'Rate Limit Exceeded';
  }
  if (error.code >= 4000 && error.code <= 4001) {
    return 'Validation Error';
  }

  return undefined;
}

/**
 * Check if error is authentication-related
 */
export function isAuthError(error: BackendError): boolean {
  if (!error.code || typeof error.code !== 'number') return false;
  return (
    (error.code >= 4002 && error.code <= 4315) ||
    error.code === 4101 ||
    error.code === 4104
  );
}

/**
 * Check if error should trigger logout
 */
export function shouldLogout(error: BackendError): boolean {
  if (!error.code || typeof error.code !== 'number') return false;
  // Invalid tokens or session expired
  return error.code === 4101 || error.code === 4104 || error.code === 4003;
}
