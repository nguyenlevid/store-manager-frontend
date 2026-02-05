/**
 * CSRF Token Manager
 *
 * Responsibilities:
 * - Fetch and cache CSRF token in memory (never persisted)
 * - Provide token for state-changing requests
 * - Handle token refresh on 403/CSRF errors
 * - Single-flight token fetching
 *
 * Security notes:
 * - Token stored only in memory
 * - Automatically refreshed on CSRF errors
 * - Single concurrent fetch prevents race conditions
 */

const API_BASE_URL = import.meta.env['VITE_API_BASE_URL'] || '';

class CsrfTokenManager {
  private token: string | null = null;
  private fetchPromise: Promise<string> | null = null;

  /**
   * Get current token or fetch a new one
   */
  async getToken(): Promise<string> {
    if (this.token) {
      return this.token;
    }
    return this.fetchToken();
  }

  /**
   * Fetch a new token from the server (single-flight)
   */
  async fetchToken(): Promise<string> {
    // If already fetching, return the existing promise
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    this.fetchPromise = this._performFetch();

    try {
      const token = await this.fetchPromise;
      this.token = token;
      return token;
    } finally {
      this.fetchPromise = null;
    }
  }

  /**
   * Perform the actual fetch request
   */
  private async _performFetch(): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/auth/csrf`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF token: ${response.statusText}`);
    }

    // Unwrap backend response format: { isOk: true, data: { csrfToken, headerName } }
    const jsonData = await response.json();
    const data = jsonData?.data || jsonData; // Unwrap if wrapped

    return data.csrfToken;
  }

  /**
   * Clear the cached token (used when CSRF error occurs)
   */
  clearToken(): void {
    this.token = null;
  }

  /**
   * Check if we have a cached token
   */
  hasToken(): boolean {
    return this.token !== null;
  }
}

export const csrfManager = new CsrfTokenManager();
