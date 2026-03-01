/**
 * DowngradeModal
 *
 * Two-step modal for plan downgrades:
 *   Step 1: Select storehouses to lock (if needed)
 *   Step 2: Select users to deactivate (if needed)
 *
 * Shows downgrade requirements from the backend and lets the admin
 * pick which storehouses/users to lock/deactivate.
 */

import {
  createSignal,
  createResource,
  Show,
  For,
  type Component,
  createMemo,
} from 'solid-js';
import { Button } from '@/shared/ui/Button';
import { getDowngradeRequirements } from '../api/billing.api';
import type {
  PlanTier,
  DowngradeStorehouse,
  DowngradeUser,
} from '../types/billing.types';

interface DowngradeModalProps {
  isOpen: boolean;
  targetPlan: PlanTier;
  onClose: () => void;
  onConfirm: (
    lockedStorehouseIds: string[],
    deactivatedUserIds: string[]
  ) => void;
  isSubmitting?: boolean;
}

export const DowngradeModal: Component<DowngradeModalProps> = (props) => {
  const [step, setStep] = createSignal<1 | 2>(1);
  const [selectedStorehouses, setSelectedStorehouses] = createSignal<
    Set<string>
  >(new Set());
  const [selectedUsers, setSelectedUsers] = createSignal<Set<string>>(
    new Set()
  );

  // Fetch requirements when modal opens
  const [requirements] = createResource(
    () => (props.isOpen ? props.targetPlan : null),
    async (plan) => {
      if (!plan) return null;
      // Reset selections when modal opens
      setStep(1);
      setSelectedStorehouses(new Set<string>());
      setSelectedUsers(new Set<string>());
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
    } else {
      if (current.size < (requirements()?.storehousesToLock ?? 0)) {
        current.add(id);
      }
    }
    setSelectedStorehouses(current);
  };

  const toggleUser = (id: string) => {
    const current = new Set(selectedUsers());
    if (current.has(id)) {
      current.delete(id);
    } else {
      if (current.size < (requirements()?.usersToDeactivate ?? 0)) {
        current.add(id);
      }
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

  const handleConfirm = () => {
    props.onConfirm(
      Array.from(selectedStorehouses()),
      Array.from(selectedUsers())
    );
  };

  const canProceed = createMemo(() => {
    if (step() === 1) return storehouseSelectionValid();
    return userSelectionValid();
  });

  const tierLabel = (tier: PlanTier) => {
    const labels: Record<PlanTier, string> = {
      free: 'Free',
      pro: 'Pro',
      enterprise: 'Enterprise',
    };
    return labels[tier];
  };

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget && !props.isSubmitting)
            props.onClose();
        }}
      >
        <div class="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl border border-border-default bg-bg-surface shadow-xl">
          {/* Header */}
          <div class="border-b border-border-default px-6 py-4">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-text-primary">
                Downgrade to {tierLabel(props.targetPlan)}
              </h2>
              <button
                onClick={props.onClose}
                disabled={props.isSubmitting}
                class="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
                aria-label="Close"
              >
                <svg
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <p class="mt-1 text-sm text-text-secondary">
              <Show
                when={!requirements.loading}
                fallback="Loading requirements..."
              >
                <Show when={requirements()}>
                  {(req) => (
                    <>
                      Your current usage exceeds the{' '}
                      {tierLabel(props.targetPlan)} plan limits.
                      {needsStorehouseLock() && (
                        <>
                          {' '}
                          Select {req().storehousesToLock} storehouse(s) to
                          lock.
                        </>
                      )}
                      {needsUserDeactivation() && (
                        <>
                          {' '}
                          Select {req().usersToDeactivate} user(s) to
                          deactivate.
                        </>
                      )}
                    </>
                  )}
                </Show>
              </Show>
            </p>
          </div>

          {/* Body */}
          <div class="flex-1 overflow-y-auto px-6 py-4">
            <Show when={requirements.loading}>
              <div class="flex items-center justify-center py-8">
                <div class="border-t-text-brand h-6 w-6 animate-spin rounded-full border-2 border-border-default" />
              </div>
            </Show>

            <Show when={requirements.error}>
              <div class="text-text-danger py-4 text-sm">
                Failed to load downgrade requirements. Please try again.
              </div>
            </Show>

            <Show when={requirements() && !requirements.loading}>
              {/* No changes needed */}
              <Show
                when={needsStorehouseLock() || needsUserDeactivation()}
                fallback={
                  <div class="py-4 text-sm text-text-secondary">
                    No changes needed — your current usage fits the{' '}
                    {tierLabel(props.targetPlan)} plan.
                  </div>
                }
              >
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
                      transactions, or transfers can be created or modified
                      within them.
                    </p>
                    <div class="space-y-2">
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
                                {new Date(sh.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </label>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>

                {/* Step 1 -> no storehouses to lock, skip directly to step 2 label */}
                <Show when={step() === 1 && !needsStorehouseLock()}>
                  {(() => {
                    // Auto-advance to step 2 if no storehouses to lock
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
                      Deactivated users will be logged out and cannot sign in
                      until reactivated.
                    </p>
                    <div class="space-y-2">
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
              </Show>
            </Show>
          </div>

          {/* Footer */}
          <div class="flex items-center justify-between border-t border-border-default px-6 py-4">
            <div>
              <Show when={step() === 2 && needsStorehouseLock()}>
                <button
                  class="text-text-brand text-sm hover:underline"
                  onClick={() => setStep(1)}
                >
                  ← Back to storehouses
                </button>
              </Show>
            </div>
            <div class="flex gap-3">
              <Button
                variant="outline"
                onClick={props.onClose}
                disabled={props.isSubmitting}
              >
                Cancel
              </Button>
              <Show
                when={needsStorehouseLock() || needsUserDeactivation()}
                fallback={
                  <Button
                    variant="primary"
                    onClick={handleConfirm}
                    disabled={props.isSubmitting}
                  >
                    {props.isSubmitting
                      ? 'Downgrading...'
                      : 'Confirm Downgrade'}
                  </Button>
                }
              >
                <Button
                  variant="primary"
                  onClick={handleNext}
                  disabled={!canProceed() || props.isSubmitting}
                >
                  {props.isSubmitting
                    ? 'Downgrading...'
                    : step() === 1 && needsUserDeactivation()
                      ? 'Next →'
                      : 'Confirm Downgrade'}
                </Button>
              </Show>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};
