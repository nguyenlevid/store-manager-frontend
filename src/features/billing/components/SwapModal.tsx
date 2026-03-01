/**
 * SwapModal
 *
 * Allows admin to swap which storehouses are locked and which users
 * are deactivated — net-zero (lock one ↔ unlock one).
 *
 * Rate-limited to 2 swaps per day on the backend.
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
import { getSwapCandidates } from '../api/billing.api';
import type {
  DowngradeStorehouse,
  DowngradeUser,
} from '../types/billing.types';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    lockStorehouseIds: string[],
    unlockStorehouseIds: string[],
    deactivateUserIds: string[],
    reactivateUserIds: string[]
  ) => void;
  isSubmitting?: boolean;
}

export const SwapModal: Component<SwapModalProps> = (props) => {
  // Tab: 'storehouses' | 'users'
  const [activeTab, setActiveTab] = createSignal<'storehouses' | 'users'>(
    'storehouses'
  );

  // Storehouses: select 1 active to lock, 1 locked to unlock
  const [lockTarget, setLockTarget] = createSignal<string | null>(null);
  const [unlockTarget, setUnlockTarget] = createSignal<string | null>(null);

  // Users: select 1 active to deactivate, 1 inactive to reactivate
  const [deactivateTarget, setDeactivateTarget] = createSignal<string | null>(
    null
  );
  const [reactivateTarget, setReactivateTarget] = createSignal<string | null>(
    null
  );

  // Fetch candidates when modal opens
  const [candidates] = createResource(
    () => (props.isOpen ? true : null),
    async () => {
      // Reset selections
      setLockTarget(null);
      setUnlockTarget(null);
      setDeactivateTarget(null);
      setReactivateTarget(null);
      setActiveTab('storehouses');
      return getSwapCandidates();
    }
  );

  const hasLockedStorehouses = createMemo(
    () => (candidates()?.lockedStorehouses.length ?? 0) > 0
  );
  const hasInactiveUsers = createMemo(
    () => (candidates()?.inactiveUsers.length ?? 0) > 0
  );
  const hasSwappable = createMemo(
    () => hasLockedStorehouses() || hasInactiveUsers()
  );

  const storehouseSwapValid = createMemo(() => {
    if (!lockTarget() && !unlockTarget()) return true; // No swap intended
    return !!lockTarget() && !!unlockTarget(); // Both must be selected
  });

  const userSwapValid = createMemo(() => {
    if (!deactivateTarget() && !reactivateTarget()) return true;
    return !!deactivateTarget() && !!reactivateTarget();
  });

  const hasAnySelection = createMemo(
    () =>
      (!!lockTarget() && !!unlockTarget()) ||
      (!!deactivateTarget() && !!reactivateTarget())
  );

  const canSubmit = createMemo(
    () =>
      hasAnySelection() &&
      storehouseSwapValid() &&
      userSwapValid() &&
      !props.isSubmitting
  );

  const handleConfirm = () => {
    props.onConfirm(
      lockTarget() ? [lockTarget()!] : [],
      unlockTarget() ? [unlockTarget()!] : [],
      deactivateTarget() ? [deactivateTarget()!] : [],
      reactivateTarget() ? [reactivateTarget()!] : []
    );
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
        <div class="flex max-h-[85vh] w-full max-w-xl flex-col rounded-xl border border-border-default bg-bg-surface shadow-xl">
          {/* Header */}
          <div class="border-b border-border-default px-6 py-4">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-text-primary">
                Swap Resources
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
              Swap which storehouses are locked or which users are deactivated.
              Each swap is 1-for-1 (net-zero). Limited to 2 swaps per day.
            </p>
          </div>

          {/* Tabs */}
          <Show when={hasLockedStorehouses() && hasInactiveUsers()}>
            <div class="flex border-b border-border-default px-6">
              <button
                class={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab() === 'storehouses'
                    ? 'border-accent-primary text-accent-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
                onClick={() => setActiveTab('storehouses')}
              >
                Storehouses
              </button>
              <button
                class={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab() === 'users'
                    ? 'border-accent-primary text-accent-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
                onClick={() => setActiveTab('users')}
              >
                Users
              </button>
            </div>
          </Show>

          {/* Body */}
          <div class="flex-1 overflow-y-auto px-6 py-4">
            <Show when={candidates.loading}>
              <div class="flex items-center justify-center py-8">
                <div class="border-t-text-brand h-6 w-6 animate-spin rounded-full border-2 border-border-default" />
              </div>
            </Show>

            <Show when={candidates.error}>
              <div class="text-text-danger py-4 text-sm">
                Failed to load swap candidates. Please try again.
              </div>
            </Show>

            <Show when={candidates() && !candidates.loading}>
              <Show
                when={hasSwappable()}
                fallback={
                  <div class="py-8 text-center text-sm text-text-secondary">
                    No locked storehouses or deactivated users to swap.
                  </div>
                }
              >
                {/* Storehouse swap tab */}
                <Show
                  when={
                    (activeTab() === 'storehouses' && hasLockedStorehouses()) ||
                    (!hasInactiveUsers() && hasLockedStorehouses())
                  }
                >
                  <div class="space-y-4">
                    {/* Unlock column: locked storehouses */}
                    <div>
                      <h3 class="mb-2 text-sm font-medium text-text-primary">
                        Unlock (currently locked)
                      </h3>
                      <div class="space-y-1.5">
                        <For each={candidates()!.lockedStorehouses}>
                          {(sh: DowngradeStorehouse) => (
                            <label
                              class={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                                unlockTarget() === sh.id
                                  ? 'border-status-success-text bg-status-success-bg'
                                  : 'border-border-default hover:bg-bg-hover'
                              }`}
                            >
                              <input
                                type="radio"
                                name="unlock-sh"
                                checked={unlockTarget() === sh.id}
                                onChange={() => setUnlockTarget(sh.id)}
                                class="text-status-success-text focus:ring-status-success-text"
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
                              <span class="text-text-danger text-xs font-medium">
                                Locked
                              </span>
                            </label>
                          )}
                        </For>
                      </div>
                    </div>

                    {/* Lock column: active storehouses */}
                    <div>
                      <h3 class="mb-2 text-sm font-medium text-text-primary">
                        Lock (currently active)
                      </h3>
                      <div class="space-y-1.5">
                        <For each={candidates()!.activeStorehouses}>
                          {(sh: DowngradeStorehouse) => (
                            <label
                              class={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                                lockTarget() === sh.id
                                  ? 'border-text-brand bg-bg-brand/10'
                                  : 'border-border-default hover:bg-bg-hover'
                              }`}
                            >
                              <input
                                type="radio"
                                name="lock-sh"
                                checked={lockTarget() === sh.id}
                                onChange={() => setLockTarget(sh.id)}
                                class="text-text-brand focus:ring-text-brand"
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
                              <span class="text-xs font-medium text-status-success-text">
                                Active
                              </span>
                            </label>
                          )}
                        </For>
                      </div>
                    </div>

                    <Show when={lockTarget() && unlockTarget()}>
                      <div class="bg-bg-muted rounded-lg p-3 text-sm text-text-secondary">
                        <span class="font-medium text-text-primary">
                          Summary:
                        </span>{' '}
                        Lock "
                        {candidates()!.activeStorehouses.find(
                          (s) => s.id === lockTarget()
                        )?.name ?? '...'}
                        " → Unlock "
                        {candidates()!.lockedStorehouses.find(
                          (s) => s.id === unlockTarget()
                        )?.name ?? '...'}
                        "
                      </div>
                    </Show>
                  </div>
                </Show>

                {/* User swap tab */}
                <Show
                  when={
                    (activeTab() === 'users' && hasInactiveUsers()) ||
                    (!hasLockedStorehouses() && hasInactiveUsers())
                  }
                >
                  <div class="space-y-4">
                    {/* Reactivate column: inactive users */}
                    <div>
                      <h3 class="mb-2 text-sm font-medium text-text-primary">
                        Reactivate (currently deactivated)
                      </h3>
                      <div class="space-y-1.5">
                        <For each={candidates()!.inactiveUsers}>
                          {(user: DowngradeUser) => (
                            <label
                              class={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                                reactivateTarget() === user.id
                                  ? 'border-status-success-text bg-status-success-bg'
                                  : 'border-border-default hover:bg-bg-hover'
                              }`}
                            >
                              <input
                                type="radio"
                                name="reactivate-user"
                                checked={reactivateTarget() === user.id}
                                onChange={() => setReactivateTarget(user.id)}
                                class="text-status-success-text focus:ring-status-success-text"
                              />
                              <div class="min-w-0 flex-1">
                                <div class="truncate text-sm font-medium text-text-primary">
                                  {user.name}
                                </div>
                                <div class="truncate text-xs text-text-secondary">
                                  {user.email}
                                </div>
                              </div>
                              <span class="text-text-danger text-xs font-medium">
                                Deactivated
                              </span>
                            </label>
                          )}
                        </For>
                      </div>
                    </div>

                    {/* Deactivate column: active users */}
                    <div>
                      <h3 class="mb-2 text-sm font-medium text-text-primary">
                        Deactivate (currently active)
                      </h3>
                      <div class="space-y-1.5">
                        <For each={candidates()!.activeUsers}>
                          {(user: DowngradeUser) => (
                            <label
                              class={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                                deactivateTarget() === user.id
                                  ? 'border-text-brand bg-bg-brand/10'
                                  : 'border-border-default hover:bg-bg-hover'
                              }`}
                            >
                              <input
                                type="radio"
                                name="deactivate-user"
                                checked={deactivateTarget() === user.id}
                                onChange={() => setDeactivateTarget(user.id)}
                                class="text-text-brand focus:ring-text-brand"
                              />
                              <div class="min-w-0 flex-1">
                                <div class="truncate text-sm font-medium text-text-primary">
                                  {user.name}
                                </div>
                                <div class="truncate text-xs text-text-secondary">
                                  {user.email}
                                </div>
                              </div>
                              <span class="text-xs font-medium text-status-success-text">
                                Active
                              </span>
                            </label>
                          )}
                        </For>
                      </div>
                    </div>

                    <Show when={deactivateTarget() && reactivateTarget()}>
                      <div class="bg-bg-muted rounded-lg p-3 text-sm text-text-secondary">
                        <span class="font-medium text-text-primary">
                          Summary:
                        </span>{' '}
                        Deactivate "
                        {candidates()!.activeUsers.find(
                          (u) => u.id === deactivateTarget()
                        )?.name ?? '...'}
                        " → Reactivate "
                        {candidates()!.inactiveUsers.find(
                          (u) => u.id === reactivateTarget()
                        )?.name ?? '...'}
                        "
                      </div>
                    </Show>
                  </div>
                </Show>
              </Show>
            </Show>
          </div>

          {/* Footer */}
          <div class="flex items-center justify-between border-t border-border-default px-6 py-4">
            <p class="text-text-tertiary text-xs">2 swaps per day limit</p>
            <div class="flex gap-3">
              <Button
                variant="outline"
                onClick={props.onClose}
                disabled={props.isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirm}
                disabled={!canSubmit()}
              >
                {props.isSubmitting ? 'Swapping...' : 'Confirm Swap'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};
