/**
 * Mock Mode Configuration
 *
 * Set VITE_USE_MOCK_API=true to use dummy data without backend
 */

export const USE_MOCK_API = import.meta.env['VITE_USE_MOCK_API'] === 'true';

/**
 * Mock User Data
 * Updated to match backend User schema
 */
export const MOCK_USER = {
  _id: 'user-1',
  email: 'demo@example.com',
  name: 'Demo User',
  username: 'demouser',
  appRole: 'admin' as const,
  phoneNumber: '+1 (555) 123-4567',
  birthDate: '1990-01-01',
  business: undefined,
  storeHouses: ['storehouse-1'],
  accessRole: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2026-01-18T00:00:00Z',
};

/**
 * Mock Profile Data
 */
export const MOCK_PROFILE = {
  id: 'user-1',
  email: 'demo@example.com',
  name: 'Demo User',
  appRole: 'admin' as const,
  phone: '+1 (555) 123-4567',
  department: 'Store Management',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2026-01-18T00:00:00Z',
};

/**
 * Simulate API delay
 */
export function mockDelay(ms: number = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
