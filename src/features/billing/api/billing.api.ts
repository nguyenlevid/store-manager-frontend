/**
 * Billing / Subscription API
 */

import { apiClient } from '@/shared/lib/api-client';
import type {
  UsageSummary,
  PlanDefinition,
  ChangePlanRequest,
  DowngradeRequirements,
  PendingDowngrade,
  ResolveDowngradeRequest,
  SwapResourcesRequest,
  SwapCandidates,
  EnforceLimitsRequest,
} from '../types/billing.types';

const BASE = '/subscription';

/** Get current subscription + usage summary */
export function getSubscription(): Promise<UsageSummary> {
  return apiClient.get<UsageSummary>(BASE);
}

/** Get all available plans */
export function getPlans(): Promise<PlanDefinition[]> {
  return apiClient.get<PlanDefinition[]>(`${BASE}/plans`);
}

/** Change the business subscription plan (with optional downgrade selections) */
export function changePlan(data: ChangePlanRequest): Promise<UsageSummary> {
  return apiClient.post<UsageSummary>(`${BASE}/change-plan`, data);
}

/** Get downgrade requirements for a target plan */
export function getDowngradeRequirements(
  targetPlan: string
): Promise<DowngradeRequirements> {
  return apiClient.get<DowngradeRequirements>(
    `${BASE}/downgrade-requirements?plan=${targetPlan}`
  );
}

/** Check for pending auto-downgrade */
export function getPendingDowngrade(): Promise<PendingDowngrade | null> {
  return apiClient.get<PendingDowngrade | null>(`${BASE}/pending-downgrade`);
}

/** Resolve a downgrade (unlock storehouses / reactivate users) */
export function resolveDowngrade(
  data: ResolveDowngradeRequest
): Promise<UsageSummary> {
  return apiClient.post<UsageSummary>(`${BASE}/resolve-downgrade`, data);
}

/** Swap locked/active resources (net-zero). Rate-limited to 2/day. */
export function swapResources(
  data: SwapResourcesRequest
): Promise<UsageSummary> {
  return apiClient.post<UsageSummary>(`${BASE}/swap`, data);
}

/** Get swap candidates (locked/active storehouses + inactive/active users) */
export function getSwapCandidates(): Promise<SwapCandidates> {
  return apiClient.get<SwapCandidates>(`${BASE}/swap-candidates`);
}

/** Lock/deactivate resources to comply with current plan limits */
export function enforceLimits(
  data: EnforceLimitsRequest
): Promise<UsageSummary> {
  return apiClient.post<UsageSummary>(`${BASE}/enforce-limits`, data);
}

/** Start the 30-day Pro trial for the current business */
export function startTrial(): Promise<UsageSummary> {
  return apiClient.post<UsageSummary>(`${BASE}/start-trial`, {});
}
