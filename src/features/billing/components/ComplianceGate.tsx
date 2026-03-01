/**
 * ComplianceGate
 *
 * Blocks the application UI when the business exceeds its current plan limits.
 * This happens when a subscription expires, payment fails, or a business is
 * downgraded without resolving excess resources.
 *
 * - Admin: interactive selection wizard to lock storehouses / deactivate users,
 *          plus an option to upgrade the plan.
 * - Non-admin: informational message telling them to contact their admin.
 *
 * Renders children normally when the business is within all plan limits.
 */

import {
  createSignal,
  createResource,
  createMemo,
  Show,
  For,
  type Component,
  type JSX,
} from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Button } from '@/shared/ui/Button';
import { getDowngradeRequirements } from '../api/billing.api';
import {
  subscriptionStore,
  enforceLimits,
  fetchSubscription,
} from '../store/subscription.store';
import type {
  LimitDimension,
  DowngradeStorehouse,
  DowngradeUser,
} from '../types/billing.types';
import { isAdmin } from '@/shared/stores/permissions.store';

interface ComplianceGateProps {
  children: JSX.Element;
}

/** Human-readable labels for limit dimensions */
const DIMENSION_LABELS: Record<LimitDimension, string> = {
  storehouses: 'Storehouses',
  users: 'Users',
  items: 'Items',
  monthlyTransactions: 'Monthly Transactions',
};

/** Dimensions that can be resolved by locking/deactivating */
const ACTIONABLE_DIMENSIONS: LimitDimension[] = ['storehouses', 'users'];

export const ComplianceGate: Component<ComplianceGateProps> = (props) => {
  const navigate = useNavigate();

  // ── Loading gate — wait until subscription fetch has been attempted ──
  // MainLayout calls fetchSubscription() on mount, so the data will arrive.
  // No force-fetch here to avoid excessive API calls on every navigation.
  const isSubscriptionReady = () => subscriptionStore.isLoaded();

  // ── Over-limit detection ──
  const overLimitDimensions = createMemo(() => {
    const u = subscriptionStore.usage();
    if (!u) return [];

    const violations: Array<{
      dimension: LimitDimension;
      current: number;
      limit: number;
      excess: number;
    }> = [];

    for (const [dim, entry] of Object.entries(u.limits) as Array<
      [LimitDimension, { current: number; limit: number }]
    >) {
      if (entry.limit !== -1 && entry.current > entry.limit) {
        violations.push({
          dimension: dim,
          current: entry.current,
          limit: entry.limit,
          excess: entry.current - entry.limit,
        });
      }
    }

    return violations;
  });

  const isOverLimit = createMemo(() => overLimitDimensions().length > 0);

  /** Whether storehouses or users are over limit (actionable by admin) */
  const hasActionableViolations = createMemo(() =>
    overLimitDimensions().some((v) =>
      ACTIONABLE_DIMENSIONS.includes(v.dimension)
    )
  );

  // ── Wizard state ──
  const [step, setStep] = createSignal<1 | 2>(1);
  const [selectedStorehouses, setSelectedStorehouses] = createSignal<
    Set<string>
  >(new Set());
  const [selectedUsers, setSelectedUsers] = createSignal<Set<string>>(
    new Set()
  );
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  // Fetch requirements when over limit (admin only)
  const [requirements] = createResource(
    () => {
      if (!isOverLimit() || !isAdmin()) return null;
      return subscriptionStore.usage()?.plan ?? null;
    },
    async (plan) => {
      if (!plan) return null;
      setStep(1);
      setSelectedStorehouses(new Set<string>());
      setSelectedUsers(new Set<string>());
      setError(null);
      return getDowngradeRequirements(plan);
    }
  );

  const needsStorehouseLock = createMemo(
    () => (requirements()?.storehousesToLock ?? 0) > 0
  );
  const needsUserDeactivation = createMemo(
    () => (requirements()?.usersToDeactivate ?? 0) > 0
  );

  const storehouseSelectionValid = createMemo(() => {
    if (!needsStorehouseLock()) return true;
    return selectedStorehouses().size === requirements()!.storehousesToLock;
  });

  const userSelectionValid = createMemo(() => {
    if (!needsUserDeactivation()) return true;
    return selectedUsers().size === requirements()!.usersToDeactivate;
  });

  const toggleStorehouse = (id: string) => {
    const current = new Set(selectedStorehouses());
    if (current.has(id)) {
      current.delete(id);
    } else if (current.size < (requirements()?.storehousesToLock ?? 0)) {
      current.add(id);
    }
    setSelectedStorehouses(current);
  };

  const toggleUser = (id: string) => {
    const current = new Set(selectedUsers());
    if (current.has(id)) {
      current.delete(id);
    } else if (current.size < (requirements()?.usersToDeactivate ?? 0)) {
      current.add(id);
    }
    setSelectedUsers(current);
  };

  const handleNext = () => {
    if (step() === 1 && needsUserDeactivation()) {
      setStep(2);
    } else {
      handleConfirm();
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await enforceLimits(
        Array.from(selectedStorehouses()),
        Array.from(selectedUsers())
      );
      // Refresh subscription to update the gate
      await fetchSubscription(true);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to enforce limits. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = createMemo(() => {
    if (step() === 1) return storehouseSelectionValid();
    return userSelectionValid();
  });

  const tierLabel = (tier: string) => {
    const labels: Record<string, string> = {
      free: 'Free',
      pro: 'Pro',
      enterprise: 'Enterprise',
    };
    return labels[tier] ?? tier;
  };

  // ── Render ──
  return (
    <Show
      when={isSubscriptionReady()}
      fallback={
        <div class="flex min-h-[60vh] items-center justify-center">
          <div class="text-content-subtle">Loading…</div>
        </div>
      }
    >
      <Show when={isOverLimit()} fallback={props.children}>
        <div class="flex min-h-[60vh] items-center justify-center px-4 py-12">
          <div class="w-full max-w-xl rounded-xl border border-border-default bg-bg-surface shadow-lg">
            {/* Header */}
            <div class="border-b border-border-default px-6 py-5">
              <div class="flex items-center gap-3">
                {/* Warning icon */}
                <div class="bg-status-warning/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                  <svg
                    class="text-status-warning h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 class="text-lg font-semibold text-text-primary">
                    Plan Limits Exceeded
                  </h2>
                  <p class="text-sm text-text-secondary">
                    Your{' '}
                    <span class="font-medium">
                      {tierLabel(subscriptionStore.usage()?.plan ?? 'free')}
                    </span>{' '}
                    plan limits have been exceeded
                  </p>
                </div>
              </div>
            </div>

            {/* Violations summary */}
            <div class="px-6 py-4">
              <div class="space-y-2">
                <For each={overLimitDimensions()}>
                  {(v) => (
                    <div class="bg-status-danger/5 border-status-danger/20 flex items-center justify-between rounded-lg border px-4 py-2.5">
                      <span class="text-sm font-medium text-text-primary">
                        {DIMENSION_LABELS[v.dimension]}
                      </span>
                      <span class="text-status-danger text-sm font-semibold">
                        {v.current} / {v.limit}{' '}
                        <span class="font-normal text-text-secondary">
                          ({v.excess} over)
                        </span>
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </div>

            {/* Admin: action area */}
            <Show when={isAdmin()}>
              <div class="border-t border-border-default px-6 py-4">
                <Show
                  when={hasActionableViolations()}
                  fallback={
                    <div class="text-center">
                      <p class="mb-4 text-sm text-text-secondary">
                        Items and transactions cannot be locked. Please upgrade
                        your plan or remove excess resources manually.
                      </p>
                      <Button
                        variant="primary"
                        onClick={() => navigate('/billing')}
                      >
                        Upgrade Plan
                      </Button>
                    </div>
                  }
                >
                  {/* Resource selection wizard */}
                  <Show
                    when={requirements() && !requirements.loading}
                    fallback={
                      <div class="flex items-center justify-center py-6">
                        <div class="border-t-text-brand h-6 w-6 animate-spin rounded-full border-2 border-border-default" />
                      </div>
                    }
                  >
                    <Show when={requirements.error}>
                      <div class="text-status-danger py-4 text-sm">
                        Failed to load requirements. Please refresh the page.
                      </div>
                    </Show>

                    <Show when={requirements()}>
                      <p class="mb-4 text-sm text-text-secondary">
                        Select resources to lock or deactivate to comply with
                        your plan, or upgrade to a higher plan.
                      </p>

                      {/* Step 1: Select storehouses */}
                      <Show when={step() === 1 && needsStorehouseLock()}>
                        <div>
                          <div class="mb-3 flex items-center justify-between">
                            <h3 class="text-sm font-medium text-text-primary">
                              Select storehouses to lock
                            </h3>
                            <span class="text-xs text-text-secondary">
                              {selectedStorehouses().size} /{' '}
                              {requirements()!.storehousesToLock} selected
                            </span>
                          </div>
                          <p class="mb-3 text-xs text-text-secondary">
                            Locked storehouses become read-only. No items,
                            transactions, or transfers can be created or
                            modified within them.
                          </p>
                          <div class="max-h-48 space-y-2 overflow-y-auto">
                            <For each={requirements()!.currentStorehouses}>
                              {(sh: DowngradeStorehouse) => (
                                <label
                                  class={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                                    selectedStorehouses().has(sh.id)
                                      ? 'border-text-brand bg-bg-brand/10'
                                      : 'border-border-default hover:bg-bg-hover'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedStorehouses().has(sh.id)}
                                    onChange={() => toggleStorehouse(sh.id)}
                                    class="text-text-brand focus:ring-text-brand rounded border-border-default"
                                    disabled={
                                      !selectedStorehouses().has(sh.id) &&
                                      selectedStorehouses().size >=
                                        requirements()!.storehousesToLock
                                    }
                                  />
                                  <div class="min-w-0 flex-1">
                                    <div class="truncate text-sm font-medium text-text-primary">
                                      {sh.name}
                                    </div>
                                    <div class="text-xs text-text-secondary">
                                      Created{' '}
                                      {new Date(
                                        sh.createdAt
                                      ).toLocaleDateString()}
                                    </div>
                                  </div>
                                </label>
                              )}
                            </For>
                          </div>
                        </div>
                      </Show>

                      {/* Auto-advance past step 1 if no storehouses to lock */}
                      <Show when={step() === 1 && !needsStorehouseLock()}>
                        {(() => {
                          setStep(2);
                          return null;
                        })()}
                      </Show>

                      {/* Step 2: Select users */}
                      <Show when={step() === 2 && needsUserDeactivation()}>
                        <div>
                          <div class="mb-3 flex items-center justify-between">
                            <h3 class="text-sm font-medium text-text-primary">
                              Select users to deactivate
                            </h3>
                            <span class="text-xs text-text-secondary">
                              {selectedUsers().size} /{' '}
                              {requirements()!.usersToDeactivate} selected
                            </span>
                          </div>
                          <p class="mb-3 text-xs text-text-secondary">
                            Deactivated users will be logged out and cannot sign
                            in until reactivated.
                          </p>
                          <div class="max-h-48 space-y-2 overflow-y-auto">
                            <For each={requirements()!.currentActiveUsers}>
                              {(user: DowngradeUser) => (
                                <label
                                  class={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                                    selectedUsers().has(user.id)
                                      ? 'border-text-brand bg-bg-brand/10'
                                      : 'border-border-default hover:bg-bg-hover'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedUsers().has(user.id)}
                                    onChange={() => toggleUser(user.id)}
                                    class="text-text-brand focus:ring-text-brand rounded border-border-default"
                                    disabled={
                                      !selectedUsers().has(user.id) &&
                                      selectedUsers().size >=
                                        requirements()!.usersToDeactivate
                                    }
                                  />
                                  <div class="min-w-0 flex-1">
                                    <div class="truncate text-sm font-medium text-text-primary">
                                      {user.name}
                                    </div>
                                    <div class="truncate text-xs text-text-secondary">
                                      {user.email}
                                    </div>
                                  </div>
                                </label>
                              )}
                            </For>
                          </div>
                        </div>
                      </Show>

                      {/* Error message */}
                      <Show when={error()}>
                        <div class="bg-status-danger/10 text-status-danger mt-3 rounded-lg px-4 py-2 text-sm">
                          {error()}
                        </div>
                      </Show>

                      {/* Actions */}
                      <div class="mt-4 flex items-center justify-between">
                        <div>
                          <Show when={step() === 2 && needsStorehouseLock()}>
                            <button
                              class="text-text-brand text-sm hover:underline"
                              onClick={() => setStep(1)}
                            >
                              &larr; Back to storehouses
                            </button>
                          </Show>
                        </div>
                        <div class="flex gap-3">
                          <Button
                            variant="outline"
                            onClick={() => navigate('/billing')}
                          >
                            Upgrade Plan
                          </Button>
                          <Button
                            variant="primary"
                            onClick={handleNext}
                            disabled={!canProceed() || isSubmitting()}
                          >
                            {isSubmitting()
                              ? 'Applying...'
                              : step() === 1 && needsUserDeactivation()
                                ? 'Next \u2192'
                                : 'Confirm & Continue'}
                          </Button>
                        </div>
                      </div>
                    </Show>
                  </Show>
                </Show>
              </div>
            </Show>

            {/* Non-admin: informational message */}
            <Show when={!isAdmin()}>
              <div class="border-t border-border-default px-6 py-6 text-center">
                <p class="mb-2 text-sm text-text-secondary">
                  Your business has exceeded its plan limits.
                </p>
                <p class="text-sm text-text-secondary">
                  Please contact your administrator to resolve this issue.
                </p>
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </Show>
  );
};
