/**
 * TransferStockModal – transfer item stock between storehouses.
 *
 * Supports immediate (one-click) or pending (approve later) transfers.
 * Partial transfers create/merge item records in the destination storehouse.
 */

import {
  createSignal,
  createResource,
  Show,
  For,
  type Component,
} from 'solid-js';
import { Button } from '@/shared/ui/Button';
import { getStorehouses } from '@/shared/api/storehouses.api';
import { createTransfer } from '@/shared/api/transfers.api';
import { notificationStore } from '@/shared/stores/notification.store';
import { getErrorMessage } from '@/shared/lib/error-messages';
import type { Item } from '../types/inventory.types';

interface TransferStockModalProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TransferStockModal: Component<TransferStockModalProps> = (
  props
) => {
  const [toStoreHouse, setToStoreHouse] = createSignal('');
  const [quantity, setQuantity] = createSignal(1);
  const [note, setNote] = createSignal('');
  const [immediate, setImmediate] = createSignal(true);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal('');

  // Fetch storehouses
  const [storehouses] = createResource(() => getStorehouses());

  // Available destinations (exclude current storehouse)
  const destinations = () => {
    const all = storehouses() || [];
    return all.filter((sh) => sh.id !== props.item.storeHouse?.id);
  };

  const maxQty = () => props.item.quantity;

  const handleSubmit = async () => {
    setError('');

    if (!toStoreHouse()) {
      setError('Please select a destination storehouse');
      return;
    }
    if (quantity() < 1 || quantity() > maxQty()) {
      setError(`Quantity must be between 1 and ${maxQty()}`);
      return;
    }
    if (!props.item.storeHouse?.id) {
      setError('Item has no source storehouse');
      return;
    }

    setIsSubmitting(true);
    try {
      await createTransfer({
        itemId: props.item.id,
        fromStoreHouse: props.item.storeHouse.id,
        toStoreHouse: toStoreHouse(),
        quantity: quantity(),
        note: note() || undefined,
        immediate: immediate(),
      });

      notificationStore.success(
        immediate()
          ? 'Stock transferred successfully'
          : 'Transfer request created (pending approval)'
      );
      resetForm();
      props.onSuccess();
      props.onClose();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setToStoreHouse('');
    setQuantity(1);
    setNote('');
    setImmediate(true);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    props.onClose();
  };

  return (
    <Show when={props.isOpen}>
      {/* Backdrop */}
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        <div class="w-full max-w-md rounded-xl border border-border-default bg-bg-surface shadow-xl">
          {/* Header */}
          <div class="flex items-center justify-between border-b border-border-default px-6 py-4">
            <div>
              <h2 class="text-lg font-semibold text-text-primary">
                Transfer Stock
              </h2>
              <p class="mt-0.5 text-sm text-text-secondary">
                Move <span class="font-medium">{props.item.name}</span> to
                another storehouse
              </p>
            </div>
            <button
              onClick={handleClose}
              class="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
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

          {/* Body */}
          <div class="space-y-4 px-6 py-5">
            {/* Current location info */}
            <div class="bg-bg-subtle rounded-lg p-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-text-secondary">Current Location</span>
                <span class="font-medium text-text-primary">
                  {props.item.storeHouse?.name || 'Unknown'}
                </span>
              </div>
              <div class="mt-1 flex items-center justify-between text-sm">
                <span class="text-text-secondary">Available Stock</span>
                <span class="font-medium text-text-primary">
                  {props.item.quantity} {props.item.unit}
                </span>
              </div>
            </div>

            {/* Destination storehouse */}
            <div>
              <label class="mb-1.5 block text-sm font-medium text-text-primary">
                Destination Storehouse
              </label>
              <Show
                when={!storehouses.loading}
                fallback={
                  <div class="h-10 animate-pulse rounded-lg bg-bg-hover" />
                }
              >
                <select
                  value={toStoreHouse()}
                  onChange={(e) => setToStoreHouse(e.currentTarget.value)}
                  class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                >
                  <option value="">Select storehouse...</option>
                  <For each={destinations()}>
                    {(sh) => (
                      <option value={sh.id} disabled={sh.isLocked}>
                        {sh.isLocked ? '🔒 ' : ''}
                        {sh.name}
                      </option>
                    )}
                  </For>
                </select>
              </Show>
            </div>

            {/* Quantity */}
            <div>
              <label class="mb-1.5 block text-sm font-medium text-text-primary">
                Quantity to Transfer
              </label>
              <div class="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={maxQty()}
                  value={quantity()}
                  onInput={(e) =>
                    setQuantity(parseInt(e.currentTarget.value) || 0)
                  }
                  class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                />
                <span class="text-sm text-text-muted">
                  / {maxQty()} {props.item.unit}
                </span>
              </div>
              <Show when={quantity() === maxQty()}>
                <p class="text-status-warning mt-1 text-xs">
                  Full transfer — item will be moved entirely
                </p>
              </Show>
              <Show when={quantity() > 0 && quantity() < maxQty()}>
                <p class="mt-1 text-xs text-text-muted">
                  Partial transfer — {quantity()} {props.item.unit} will be
                  moved, {maxQty() - quantity()} remains
                </p>
              </Show>
            </div>

            {/* Note */}
            <div>
              <label class="mb-1.5 block text-sm font-medium text-text-primary">
                Note <span class="text-text-muted">(optional)</span>
              </label>
              <textarea
                value={note()}
                onInput={(e) => setNote(e.currentTarget.value)}
                rows={2}
                placeholder="Reason for transfer..."
                class="w-full resize-none rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
              />
            </div>

            {/* Transfer type */}
            <div class="flex items-center gap-3">
              <label class="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="transferType"
                  checked={immediate()}
                  onChange={() => setImmediate(true)}
                  class="h-4 w-4 border-border-default text-accent-primary focus:ring-accent-primary"
                />
                <div>
                  <span class="text-sm font-medium text-text-primary">
                    Transfer Now
                  </span>
                  <p class="text-xs text-text-muted">Move stock immediately</p>
                </div>
              </label>
              <label class="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="transferType"
                  checked={!immediate()}
                  onChange={() => setImmediate(false)}
                  class="h-4 w-4 border-border-default text-accent-primary focus:ring-accent-primary"
                />
                <div>
                  <span class="text-sm font-medium text-text-primary">
                    Pending
                  </span>
                  <p class="text-xs text-text-muted">
                    Create request, complete later
                  </p>
                </div>
              </label>
            </div>

            {/* Error */}
            <Show when={error()}>
              <div class="bg-status-error/10 text-status-error rounded-lg p-3 text-sm">
                {error()}
              </div>
            </Show>
          </div>

          {/* Footer */}
          <div class="flex justify-end gap-3 border-t border-border-default px-6 py-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting() || !toStoreHouse() || quantity() < 1}
            >
              {isSubmitting()
                ? 'Transferring...'
                : immediate()
                  ? 'Transfer Now'
                  : 'Create Transfer Request'}
            </Button>
          </div>
        </div>
      </div>
    </Show>
  );
};
