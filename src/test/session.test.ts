import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  initSession,
  getStatus,
  getUser,
  isAuthenticated,
} from '@/features/auth/store/session.store';
import * as authApi from '@/features/auth/api/auth.api';

/**
 * Test: Session Initialization Behavior
 *
 * Ensures the session initializes correctly on app startup,
 * handling both authenticated and unauthenticated states.
 */

// Mock the auth API
vi.mock('@/features/auth/api/auth.api', () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
}));

describe('Session Store - Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start in loading state and transition to authenticated when user exists', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin' as const,
    };

    vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

    // Before initialization
    expect(getStatus()).toBe('loading');

    await initSession();

    // After initialization
    expect(getStatus()).toBe('authenticated');
    expect(getUser()).toEqual(mockUser);
    expect(isAuthenticated()).toBe(true);
  });

  it('should transition to unauthenticated when getCurrentUser fails', async () => {
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(
      new Error('Not authenticated')
    );

    await initSession();

    expect(getStatus()).toBe('unauthenticated');
    expect(getUser()).toBe(null);
    expect(isAuthenticated()).toBe(false);
  });

  it('should not reinitialize if already initialized', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin' as const,
    };

    vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

    await initSession();
    const firstCallCount = vi.mocked(authApi.getCurrentUser).mock.calls.length;

    // Try to initialize again
    await initSession();
    const secondCallCount = vi.mocked(authApi.getCurrentUser).mock.calls.length;

    // Should not call API again
    expect(secondCallCount).toBe(firstCallCount);
  });

  it('should handle network errors gracefully during initialization', async () => {
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(
      new TypeError('Network error')
    );

    await initSession();

    // Should set unauthenticated state without throwing
    expect(getStatus()).toBe('unauthenticated');
    expect(getUser()).toBe(null);
  });
});
