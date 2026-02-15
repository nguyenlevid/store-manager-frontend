import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient } from '@/shared/lib/api-client';

/**
 * Test: API Client Single-Flight Refresh Behavior
 *
 * Ensures that when multiple requests receive 401 simultaneously,
 * only one refresh is triggered and all requests wait for it.
 */

describe('API Client - Single-Flight Refresh', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should trigger only one refresh when multiple requests receive 401', async () => {
    let callCount = 0;

    // Mock fetch behavior
    globalThis.fetch = vi.fn((url: RequestInfo | URL) => {
      callCount++;

      // Mock refresh endpoint
      if (url.toString().includes('/auth/refresh')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        } as Response);
      }

      // First call to any endpoint returns 401
      if (callCount <= 3) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ message: 'Unauthorized' }),
        } as Response);
      }

      // After refresh, return success
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'success' }),
      } as Response);
    });

    // Make three simultaneous requests
    const requests = [
      apiClient.get('/api/endpoint1'),
      apiClient.get('/api/endpoint2'),
      apiClient.get('/api/endpoint3'),
    ];

    await Promise.all(requests);

    // Count refresh calls
    const refreshCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
      (call: unknown[]) => (call[0] as string).includes('/auth/refresh')
    );

    // Should only call refresh once despite multiple 401s
    expect(refreshCalls.length).toBe(1);
  });

  it('should retry original request after successful refresh', async () => {
    let isFirstCall = true;

    globalThis.fetch = vi.fn((url: RequestInfo | URL) => {
      // Mock refresh endpoint
      if (url.toString().includes('/auth/refresh')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        } as Response);
      }

      // First call returns 401, second call succeeds
      if (isFirstCall) {
        isFirstCall = false;
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ message: 'Unauthorized' }),
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'success' }),
      } as Response);
    });

    const result = await apiClient.get<{ data: string }>('/api/test');

    expect(result.data).toBe('success');
  });

  it('should fail all requests if refresh fails', async () => {
    globalThis.fetch = vi.fn((url: RequestInfo | URL) => {
      // Mock refresh endpoint to fail
      if (url.toString().includes('/auth/refresh')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ message: 'Refresh failed' }),
        } as Response);
      }

      // Original request returns 401
      return Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      } as Response);
    });

    await expect(apiClient.get('/api/test')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    });
  });
});
