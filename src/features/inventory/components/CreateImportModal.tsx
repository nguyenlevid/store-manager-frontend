import {
  createSignal,
  createResource,
  Show,
  For,
  type Component,
} from 'solid-js';
import { Button } from '@/shared/ui/Button';
import type { Item } from '../types/inventory.types';
import { createImport } from '@/shared/api/imports.api';
import { getSuppliers } from '@/shared/api/partners.api';
import { notificationStore } from '@/shared/stores/notification.store';
import { getErrorMessage } from '@/shared/lib/error-messages';
import { getBusiness } from '@/shared/stores/business.store';
import { formatCurrency as sharedFormatCurrency } from '@/shared/lib/format';

interface CreateImportModalProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateImportModal: Component<CreateImportModalProps> = (props) => {
  // Form fields
  const [supplierId, setSupplierId] = createSignal('');
  const [quantity, setQuantity] = createSignal('');
  const [unitPrice, setUnitPrice] = createSignal('');

  // Loading and error states
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  // Resources
  const [suppliers] = createResource(() => getSuppliers());

  // Calculated total
  const calculateTotal = () => {
    const qty = parseFloat(quantity());
    const price = parseFloat(unitPrice());
    if (isNaN(qty) || isNaN(price)) return 0;
    return qty * price;
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError(null);

    // Validation
    const parsedQuantity = parseFloat(quantity());
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      setError('Valid quantity is required');
      return;
    }

    const parsedUnitPrice = parseFloat(unitPrice());
    if (isNaN(parsedUnitPrice) || parsedUnitPrice < 0) {
      setError('Valid unit price is required');
      return;
    }

    setIsLoading(true);

    try {
      // Build import data with optional supplierId
      const importData = {
        ...(supplierId() && { supplierId: supplierId() }),
        items: [
          {
            itemId: props.item.id,
            quantity: parsedQuantity,
            unitPrice: parsedUnitPrice,
          },
        ],
        status: 'pending' as const,
      };

      await createImport(importData);

      notificationStore.success(`Import created for ${props.item.name}`, {
        title: 'Import created',
        duration: 4000,
      });

      // Reset form
      setSupplierId('');
      setQuantity('');
      setUnitPrice('');

      props.onSuccess();
    } catch (err: any) {
      console.error('Failed to create import:', err);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form
    setSupplierId('');
    setQuantity('');
    setUnitPrice('');
    setError(null);
    props.onClose();
  };

  const business = getBusiness;
  const formatCurrency = (amount: number) =>
    sharedFormatCurrency(amount, business()?.currency);

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 z-50 flex items-end justify-center bg-bg-overlay sm:items-center"
        onClick={() => handleCancel()}
      >
        <div
          class="w-full max-w-lg rounded-t-xl bg-bg-surface shadow-xl sm:rounded-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="flex items-center justify-between border-b border-border-default px-6 py-4">
            <div>
              <h2 class="text-xl font-semibold text-text-primary">
                Import Stock
              </h2>
              <p class="mt-1 text-sm text-text-secondary">
                Create import order for {props.item.name}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCancel()}
              class="rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
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
                  stroke-width={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} class="px-6 py-4">
            <div class="space-y-4">
              {/* Error Message */}
              <Show when={error()}>
                <div class="rounded-lg bg-status-danger-bg p-3 text-sm text-status-danger-text">
                  {error()}
                </div>
              </Show>

              {/* Item Info */}
              <div class="rounded-lg border border-border-default bg-bg-surface-subtle p-4">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-sm font-medium text-text-secondary">Item</p>
                    <p class="mt-1 text-base font-semibold text-text-primary">
                      {props.item.name}
                    </p>
                    <p class="mt-0.5 text-xs text-text-muted">
                      {props.item.storeHouse?.name ?? 'No storehouse'}
                    </p>
                    <Show when={props.item.description}>
                      <p class="mt-0.5 text-sm text-text-secondary">
                        {props.item.description}
                      </p>
                    </Show>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-medium text-text-secondary">
                      Current Stock
                    </p>
                    <p class="mt-1 text-lg font-bold text-text-primary">
                      {props.item.quantity} {props.item.unit}
                    </p>
                  </div>
                </div>
              </div>

              {/* Supplier */}
              <div>
                <label class="block text-sm font-medium text-text-secondary">
                  Supplier (optional)
                </label>
                <select
                  value={supplierId()}
                  onChange={(e) => setSupplierId(e.currentTarget.value)}
                  class="mt-1 block w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                >
                  <option value="">No supplier / Other</option>
                  <Show when={suppliers()}>
                    <For each={suppliers()}>
                      {(supplier) => (
                        <option value={supplier.id}>
                          {supplier.partnerName}
                        </option>
                      )}
                    </For>
                  </Show>
                </select>
                <p class="mt-1 text-xs text-text-muted">
                  Leave empty for internal transfers or non-supplier imports
                </p>
              </div>

              {/* Quantity */}
              <div>
                <label class="block text-sm font-medium text-text-secondary">
                  Quantity <span class="text-status-danger-text">*</span>
                </label>
                <div class="relative mt-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quantity()}
                    onInput={(e) => setQuantity(e.currentTarget.value)}
                    class="block w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                    placeholder="0"
                    required
                  />
                  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span class="text-sm text-text-muted">
                      {props.item.unit}
                    </span>
                  </div>
                </div>
                <Show when={quantity() && !isNaN(parseFloat(quantity()))}>
                  <p class="mt-1 text-xs text-text-muted">
                    New stock will be:{' '}
                    {props.item.quantity + parseFloat(quantity())}{' '}
                    {props.item.unit}
                  </p>
                </Show>
              </div>

              {/* Unit Price */}
              <div>
                <label class="block text-sm font-medium text-text-secondary">
                  Unit Price <span class="text-status-danger-text">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitPrice()}
                  onInput={(e) => setUnitPrice(e.currentTarget.value)}
                  class="mt-1 block w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                  placeholder="0.00"
                  required
                />
                <p class="mt-1 text-xs text-text-muted">
                  Price per {props.item.unit} from supplier
                </p>
              </div>

              {/* Total Price (calculated) */}
              <Show when={quantity() && unitPrice()}>
                <div class="rounded-lg border border-border-default bg-bg-surface-subtle p-4">
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium text-text-secondary">
                      Total Amount
                    </span>
                    <span class="text-xl font-bold text-text-primary">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                </div>
              </Show>
            </div>
          </form>

          {/* Footer */}
          <div class="flex justify-end gap-3 border-t border-border-default px-6 py-4">
            <Button
              variant="outline"
              onClick={() => handleCancel()}
              disabled={isLoading()}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isLoading()}
            >
              {isLoading() ? 'Creating...' : 'Create Import'}
            </Button>
          </div>
        </div>
      </div>
    </Show>
  );
};
