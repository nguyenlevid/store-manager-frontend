/**
 * Subscription Store
 *
 * Holds the current subscription / usage state for the business.
 * Consumed by billing pages and feature gate components.
 */

import { createSignal } from 'solid-js';
import type {
  UsageSummary,
  PlanDefinition,
  PlanTier,
  BillingCycle,
  FeatureFlag,
  LimitDimension,
  PendingDowngrade,
} from '../types/billing.types';
import * as billingApi from '../api/billing.api';
import * as stripeApi from '../api/stripe.api';

// ============================================
// Signals
// ============================================

const [usage, setUsage] = createSignal<UsageSummary | null>(null);
const [plans, setPlans] = createSignal<PlanDefinition[]>([]);
const [pendingDowngrade, setPendingDowngrade] =
  createSignal<PendingDowngrade | null>(null);
const [isLoaded, setIsLoaded] = createSignal(false);
const [isLoading, setIsLoading] = createSignal(false);

// ============================================
// Actions
// ============================================

/** Fetch current subscription + usage. */
export async function fetchSubscription(
  force = false
): Promise<UsageSummary | null> {
  if (isLoaded() && !force) return usage();

  setIsLoading(true);
  try {
    const data = await billingApi.getSubscription();
    setUsage(data);
    // Sync pending downgrade from usage response
    setPendingDowngrade(data.pendingDowngrade ?? null);
    return data;
  } catch {
    // Return null so createResource doesn't throw into ErrorBoundary
    return null;
  } finally {
    setIsLoaded(true);
    setIsLoading(false);
  }
}

/** Clear all subscription state (call on logout). */
export function clearSubscription(): void {
  setUsage(null);
  setPlans([]);
  setPendingDowngrade(null);
  setIsLoaded(false);
  setIsLoading(false);
}

/** Fetch available plan definitions. */
export async function fetchPlans(): Promise<PlanDefinition[]> {
  if (plans().length > 0) return plans();

  const data = await billingApi.getPlans();
  setPlans(data);
  return data;
}

/** Change plan tier (with optional downgrade selections). Refreshes usage after. */
export async function changePlan(
  tier: PlanTier,
  lockedStorehouseIds?: string[],
  deactivatedUserIds?: string[],
  cycle?: BillingCycle
): Promise<UsageSummary> {
  const data = await billingApi.changePlan({
    plan: tier,
    cycle,
    lockedStorehouseIds,
    deactivatedUserIds,
  });
  setUsage(data);
  // Clear pending downgrade after successful plan change
  setPendingDowngrade(null);
  return data;
}

/** Fetch pending downgrade info. */
export async function fetchPendingDowngrade(): Promise<PendingDowngrade | null> {
  try {
    const data = await billingApi.getPendingDowngrade();
    setPendingDowngrade(data);
    return data;
  } catch {
    return null;
  }
}

/** Cancel a pending paid→paid downgrade. Clears pending state and refreshes usage. */
export async function cancelPendingDowngrade(): Promise<void> {
  await stripeApi.cancelPendingDowngrade();
  setPendingDowngrade(null);
  // Refresh usage to get updated state
  const data = await billingApi.getSubscription();
  setUsage(data);
}

/** Resolve a downgrade (unlock/reactivate). Refreshes usage. */
export async function resolveDowngrade(
  unlockStorehouseIds?: string[],
  reactivateUserIds?: string[]
): Promise<UsageSummary> {
  const data = await billingApi.resolveDowngrade({
    unlockStorehouseIds,
    reactivateUserIds,
  });
  setUsage(data);
  setPendingDowngrade(null);
  return data;
}

/** Swap locked/active resources (net-zero). Refreshes usage. */
export async function swapResources(
  lockStorehouseIds?: string[],
  unlockStorehouseIds?: string[],
  deactivateUserIds?: string[],
  reactivateUserIds?: string[]
): Promise<UsageSummary> {
  const data = await billingApi.swapResources({
    lockStorehouseIds,
    unlockStorehouseIds,
    deactivateUserIds,
    reactivateUserIds,
  });
  setUsage(data);
  return data;
}

/** Enforce current plan limits (lock/deactivate excess resources). Refreshes usage. */
export async function enforceLimits(
  lockedStorehouseIds?: string[],
  deactivatedUserIds?: string[]
): Promise<UsageSummary> {
  const data = await billingApi.enforceLimits({
    lockedStorehouseIds,
    deactivatedUserIds,
  });
  setUsage(data);
  return data;
}

// ============================================
// Selectors / Helpers
// ============================================

/** Get the current plan tier (falls back to 'free'). */
export function getCurrentPlan(): PlanTier {
  return usage()?.plan ?? 'free';
}

/** Check if a feature is enabled on the current plan. */
export function hasFeature(feature: FeatureFlag): boolean {
  return usage()?.features[feature] ?? false;
}

/** Check if a limit dimension has room for more. */
export function isWithinLimit(dimension: LimitDimension): boolean {
  const u = usage();
  if (!u) return true; // Optimistic if not loaded
  const entry = u.limits[dimension];
  if (entry.limit === -1) return true; // unlimited
  return entry.current < entry.limit;
}

/** Get a human-readable usage string (e.g. "3 / 5" or "42 / ∞"). */
export function formatUsage(dimension: LimitDimension): string {
  const u = usage();
  if (!u) return '—';
  const entry = u.limits[dimension];
  const limitStr = entry.limit === -1 ? '∞' : String(entry.limit);
  return `${entry.current} / ${limitStr}`;
}

/** Get usage percentage (0-100) for progress bars. -1 limit → 0%. */
export function usagePercent(dimension: LimitDimension): number {
  const u = usage();
  if (!u) return 0;
  const entry = u.limits[dimension];
  if (entry.limit === -1) return 0;
  if (entry.limit === 0) return 100;
  return Math.min(100, Math.round((entry.current / entry.limit) * 100));
}

// ============================================
// Exports (reactive getters)
// ============================================

export const subscriptionStore = {
  usage,
  plans,
  pendingDowngrade,
  isLoaded,
  isLoading,
};
