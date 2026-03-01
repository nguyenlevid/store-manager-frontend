/**
 * Dev Portal API
 *
 * API functions for developer portal operations:
 * - List all businesses (dev-only via backend)
 * - Inspect any business's subscription
 * - Set limit and feature overrides on any business
 */

import { apiClient } from '@/shared/lib/api-client';
import type {
  BusinessSummary,
  SetLimitOverrideRequest,
  SetFeatureOverrideRequest,
  ClearLimitOverrideRequest,
  ClearFeatureOverrideRequest,
  ClearAllOverridesRequest,
} from '../types/dev.types';
import type { UsageSummary } from '@/features/billing/types/billing.types';

interface BackendBusiness {
  _id: string;
  name: string;
  email: string;
  address: string;
  phoneNumber: string;
  currency: string;
  timezone: string;
  createdAt?: string;
}

function mapBusiness(b: BackendBusiness): BusinessSummary {
  return {
    id: b._id,
    name: b.name,
    email: b.email ?? '',
    address: b.address ?? '',
    phoneNumber: b.phoneNumber ?? '',
    currency: b.currency ?? 'USD',
    timezone: b.timezone ?? 'UTC',
    createdAt: b.createdAt ?? '',
  };
}

/** Fetch all businesses (dev sees all; optional search filter) */
export async function getAllBusinesses(
  search?: string
): Promise<BusinessSummary[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const data = await apiClient.get<BackendBusiness[]>(`/business${query}`);
  return (data ?? []).map(mapBusiness);
}

/** Inspect a specific business's subscription + usage */
export async function inspectSubscription(
  businessId: string
): Promise<UsageSummary> {
  return apiClient.get<UsageSummary>(`/subscription/inspect/${businessId}`);
}

/** Set a limit override on a specific business */
export async function setLimitOverride(
  req: SetLimitOverrideRequest
): Promise<UsageSummary> {
  return apiClient.post<UsageSummary>('/subscription/override/limit', req);
}

/** Set a feature override on a specific business */
export async function setFeatureOverride(
  req: SetFeatureOverrideRequest
): Promise<UsageSummary> {
  return apiClient.post<UsageSummary>('/subscription/override/feature', req);
}

/** Clear a limit override on a specific business */
export async function clearLimitOverride(
  req: ClearLimitOverrideRequest
): Promise<UsageSummary> {
  return apiClient.post<UsageSummary>(
    '/subscription/override/clear-limit',
    req
  );
}

/** Clear a feature override on a specific business */
export async function clearFeatureOverride(
  req: ClearFeatureOverrideRequest
): Promise<UsageSummary> {
  return apiClient.post<UsageSummary>(
    '/subscription/override/clear-feature',
    req
  );
}

/** Clear ALL overrides on a specific business */
export async function clearAllOverrides(
  req: ClearAllOverridesRequest
): Promise<UsageSummary> {
  return apiClient.post<UsageSummary>('/subscription/override/clear-all', req);
}
