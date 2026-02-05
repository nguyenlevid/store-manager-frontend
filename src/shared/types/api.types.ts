/**
 * Normalized application error structure
 */
export interface AppError {
  message: string;
  code: string;
  status?: number;
  details?: unknown;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data?: T;
  error?: AppError;
}

/**
 * HTTP method types
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Request configuration
 */
export interface RequestConfig {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeout?: number;
  skipCsrf?: boolean;
  skipAuth?: boolean;
}
