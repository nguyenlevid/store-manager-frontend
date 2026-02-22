import { createSignal, Show, type Component } from 'solid-js';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Alert } from '@/shared/ui/Alert';
import type { Item, StockAdjustmentRequest } from '../types/inventory.types';
import { adjustStock } from '../api/inventory.api';
import { getErrorMessage } from '@/shared/lib/error-messages';

interface StockAdjustmentModalProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const StockAdjustmentModal: Component<StockAdjustmentModalProps> = (
  props
) => {
  const [adjustmentType, setAdjustmentType] = createSignal<'add' | 'remove'>(
    'add'
  );
  const [quantity, setQuantity] = createSignal('');
  const [reason, setReason] =
    createSignal<StockAdjustmentRequest['reason']>('supplier-delivery');
  const [notes, setNotes] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal('');
  const [success, setSuccess] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const qty = parseInt(quantity(), 10);
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid quantity greater than 0');
      return;
    }

    const finalQuantity = adjustmentType() === 'add' ? qty : -qty;

    // Check if removal would make quantity negative
    if (finalQuantity < 0 && props.item.quantity + finalQuantity < 0) {
      setError(
        `Cannot remove ${qty} units. Only ${props.item.quantity} available.`
      );
      return;
    }

    const request: StockAdjustmentRequest = {
      itemId: props.item.id,
      quantity: finalQuantity,
      reason: reason(),
      notes: notes().trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      await adjustStock(request);
      setSuccess(true);

      // Reset form
      setQuantity('');
      setNotes('');
      setAdjustmentType('add');

      // Close after brief success message
      setTimeout(() => {
        props.onComplete();
        setSuccess(false);
      }, 800);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const newQuantity = () => {
    const qty = parseInt(quantity(), 10);
    if (isNaN(qty)) return props.item.quantity;

    const change = adjustmentType() === 'add' ? qty : -qty;
    return Math.max(0, props.item.quantity + change);
  };

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed bottom-0 left-0 right-0 top-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50"
        onClick={props.onClose}
      >
        <div
          class="m-4 w-full max-w-md rounded-lg border border-border-default bg-bg-surface p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="mb-4 flex items-start justify-between">
            <div>
              <h2 class="text-xl font-semibold text-text-primary">
                Adjust Stock
              </h2>
              <p class="mt-1 text-sm text-text-secondary">{props.item.name}</p>
            </div>
            <button
              type="button"
              onClick={props.onClose}
              class="rounded-lg p-1 text-text-muted hover:bg-bg-hover hover:text-text-primary"
            >
              <svg
                class="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Success message */}
          <Show when={success()}>
            <Alert variant="success" class="mb-4">
              Stock adjusted successfully!
            </Alert>
          </Show>

          {/* Error message */}
          <Show when={error()}>
            <Alert variant="error" class="mb-4">
              {error()}
            </Alert>
          </Show>

          {/* Current stock */}
          <div class="mb-4 rounded-lg border border-border-subtle bg-bg-surface-subtle p-3">
            <p class="text-sm text-text-secondary">Current Stock</p>
            <p class="text-2xl font-bold text-text-primary">
              {props.item.quantity} {props.item.unit}
            </p>
          </div>

          <form onSubmit={handleSubmit} class="space-y-4">
            {/* Add/Remove toggle */}
            <div class="flex gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType('add')}
                class={`flex-1 rounded-lg border px-4 py-2 font-medium transition-colors ${
                  adjustmentType() === 'add'
                    ? 'border-accent-success bg-accent-success-subtle text-accent-success'
                    : 'border-border-default bg-bg-surface text-text-primary hover:bg-bg-hover'
                }`}
              >
                + Add Stock
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('remove')}
                class={`flex-1 rounded-lg border px-4 py-2 font-medium transition-colors ${
                  adjustmentType() === 'remove'
                    ? 'border-accent-danger bg-accent-danger-subtle text-accent-danger'
                    : 'border-border-default bg-bg-surface text-text-primary hover:bg-bg-hover'
                }`}
              >
                − Remove Stock
              </button>
            </div>

            {/* Quantity input */}
            <Input
              type="number"
              label="Quantity"
              value={quantity()}
              onInput={(e) => setQuantity(e.currentTarget.value)}
              min="1"
              step="1"
              required
              helper={`New stock: ${newQuantity()} ${props.item.unit}`}
            />

            {/* Reason select */}
            <div>
              <label class="mb-1 block text-sm font-medium text-text-primary">
                Reason
              </label>
              <select
                value={reason()}
                onChange={(e) =>
                  setReason(
                    e.currentTarget.value as StockAdjustmentRequest['reason']
                  )
                }
                class="focus:ring-border-focus/20 w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-2"
                required
              >
                <Show when={adjustmentType() === 'add'}>
                  <option value="supplier-delivery">Supplier Delivery</option>
                  <option value="return">Customer Return</option>
                  <option value="manual-count">Manual Count Correction</option>
                </Show>
                <Show when={adjustmentType() === 'remove'}>
                  <option value="sale">Sale</option>
                  <option value="damage">Damaged/Defective</option>
                  <option value="theft">Theft/Loss</option>
                  <option value="manual-count">Manual Count Correction</option>
                </Show>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">
                Notes (optional)
              </label>
              <textarea
                value={notes()}
                onInput={(e) => setNotes(e.currentTarget.value)}
                rows="3"
                placeholder="Add any additional notes..."
                class="focus:border-primary-500 focus:ring-primary-500/20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2"
              />
            </div>

            {/* Actions */}
            <div class="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={props.onClose}
                class="flex-1"
                disabled={isSubmitting()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                class="flex-1"
                disabled={isSubmitting()}
              >
                {isSubmitting() ? 'Adjusting...' : 'Confirm Adjustment'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
};
