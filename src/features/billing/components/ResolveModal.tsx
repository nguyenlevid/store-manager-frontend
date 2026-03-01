/**
 * ResolveModal
 *
 * After upgrading to a plan with more capacity, the admin can
 * unlock locked storehouses and reactivate deactivated users.
 *
 * Unlike SwapModal (net-zero), this is purely additive — no need
 * to lock/deactivate anything in return. The backend enforces that
 * unlocking stays within the new plan's limits.
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

interface ResolveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    unlockStorehouseIds: string[],
    reactivateUserIds: string[]
  ) => void;
  isSubmitting?: boolean;
}

export const ResolveModal: Component<ResolveModalProps> = (props) => {
  const [selectedStorehouses, setSelectedStorehouses] = createSignal<
    Set<string>
  >(new Set<string>());
  const [selectedUsers, setSelectedUsers] = createSignal<Set<string>>(
    new Set<string>()
  );

  // Fetch locked/inactive resources when modal opens
  const [candidates] = createResource(
    () => (props.isOpen ? true : null),
    async () => {
      setSelectedStorehouses(new Set<string>());
      setSelectedUsers(new Set<string>());
      return getSwapCandidates();
    }
  );

  const hasLockedStorehouses = createMemo(
    () => (candidates()?.lockedStorehouses.length ?? 0) > 0
  );
  const hasInactiveUsers = createMemo(
    () => (candidates()?.inactiveUsers.length ?? 0) > 0
  );
  const hasAnySelection = createMemo(
    () => selectedStorehouses().size > 0 || selectedUsers().size > 0
  );

  const toggleStorehouse = (id: string) => {
    const current = new Set(selectedStorehouses());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    setSelectedStorehouses(current);
  };

  const toggleUser = (id: string) => {
    const current = new Set(selectedUsers());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    setSelectedUsers(current);
  };

  const handleConfirm = () => {
    props.onConfirm(
      Array.from(selectedStorehouses()),
      Array.from(selectedUsers())
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
        <div class="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl border border-border-default bg-bg-surface shadow-xl">
          {/* Header */}
          <div class="border-b border-border-default px-6 py-4">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-text-primary">
                Unlock Resources
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
              Select locked storehouses to unlock and deactivated users to
              reactivate. Your current plan limits will be enforced.
            </p>
          </div>

          {/* Body */}
          <div class="flex-1 overflow-y-auto px-6 py-4">
            <Show when={candidates.loading}>
              <div class="flex items-center justify-center py-8">
                <div class="border-t-text-brand h-6 w-6 animate-spin rounded-full border-2 border-border-default" />
              </div>
            </Show>

            <Show when={candidates.error}>
              <div class="text-text-danger py-4 text-sm">
                Failed to load resources. Please try again.
              </div>
            </Show>

            <Show when={candidates() && !candidates.loading}>
              <Show
                when={hasLockedStorehouses() || hasInactiveUsers()}
                fallback={
                  <div class="py-8 text-center text-sm text-text-secondary">
                    No locked storehouses or deactivated users to unlock.
                  </div>
                }
              >
                {/* Locked storehouses */}
                <Show when={hasLockedStorehouses()}>
                  <div class="mb-6">
                    <div class="mb-3 flex items-center justify-between">
                      <h3 class="text-sm font-medium text-text-primary">
                        Locked Storehouses
                      </h3>
                      <span class="text-xs text-text-secondary">
                        {selectedStorehouses().size} selected
                      </span>
                    </div>
                    <p class="mb-3 text-xs text-text-secondary">
                      Unlocked storehouses will become fully operational again.
                      You can only unlock up to your plan's storehouse limit.
                    </p>
                    <div class="space-y-2">
                      <For each={candidates()!.lockedStorehouses}>
                        {(sh: DowngradeStorehouse) => (
                          <label
                            class={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                              selectedStorehouses().has(sh.id)
                                ? 'border-status-success-text bg-status-success-bg'
                                : 'border-border-default hover:bg-bg-hover'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedStorehouses().has(sh.id)}
                              onChange={() => toggleStorehouse(sh.id)}
                              class="rounded border-border-default text-status-success-text focus:ring-status-success-text"
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
                </Show>

                {/* Inactive users */}
                <Show when={hasInactiveUsers()}>
                  <div>
                    <div class="mb-3 flex items-center justify-between">
                      <h3 class="text-sm font-medium text-text-primary">
                        Deactivated Users
                      </h3>
                      <span class="text-xs text-text-secondary">
                        {selectedUsers().size} selected
                      </span>
                    </div>
                    <p class="mb-3 text-xs text-text-secondary">
                      Reactivated users will be able to sign in again. You can
                      only reactivate up to your plan's user limit.
                    </p>
                    <div class="space-y-2">
                      <For each={candidates()!.inactiveUsers}>
                        {(user: DowngradeUser) => (
                          <label
                            class={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                              selectedUsers().has(user.id)
                                ? 'border-status-success-text bg-status-success-bg'
                                : 'border-border-default hover:bg-bg-hover'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedUsers().has(user.id)}
                              onChange={() => toggleUser(user.id)}
                              class="rounded border-border-default text-status-success-text focus:ring-status-success-text"
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
                </Show>
              </Show>
            </Show>
          </div>

          {/* Footer */}
          <div class="flex items-center justify-end gap-3 border-t border-border-default px-6 py-4">
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
              disabled={!hasAnySelection() || props.isSubmitting}
            >
              {props.isSubmitting ? 'Unlocking...' : 'Unlock Selected'}
            </Button>
          </div>
        </div>
      </div>
    </Show>
  );
};
