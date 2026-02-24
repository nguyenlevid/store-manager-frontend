import { Show, Index } from 'solid-js';
import type { SetStoreFunction } from 'solid-js/store';
import { Button } from '@/shared/ui/Button';
import { ItemSelect } from '@/shared/ui';
import type { Item } from '@/features/inventory/types/inventory.types';
import type { FormItem, FormatCurrencyFn } from './types';

interface Client {
  id: string;
  partnerName: string;
  isWalkIn?: boolean;
  [key: string]: any;
}

interface OrderFormModalProps {
  mode: 'create' | 'edit';
  clientId: string;
  setClientId: (id: string) => void;
  formItems: FormItem[];
  setFormItems: SetStoreFunction<FormItem[]>;
  clients: Client[] | undefined;
  items: Item[] | undefined;
  error: string | null;
  isSubmitting: boolean;
  formatCurrency: FormatCurrencyFn;
  onSubmit: () => void;
  onClose: () => void;
}

export function OrderFormModal(props: OrderFormModalProps) {
  const addFormItem = () => {
    props.setFormItems(props.formItems.length, {
      itemId: '',
      quantity: '1',
      unitPrice: '0',
    });
  };

  const removeFormItem = (index: number) => {
    props.setFormItems((items) => items.filter((_, i) => i !== index));
  };

  const updateFormItem = (index: number, field: keyof FormItem, value: any) => {
    props.setFormItems(index, field, value);

    if (field === 'itemId' && value) {
      const selectedItem = props.items?.find((item) => item.id === value);
      if (selectedItem) {
        props.setFormItems(
          index,
          'unitPrice',
          selectedItem.unitPrice.toString()
        );
      }
    }
  };

  const calculateTotal = () => {
    return props.formItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
  };

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-bg-surface p-6 shadow-xl">
        <h2 class="mb-4 text-xl font-bold text-text-primary">
          {props.mode === 'create' ? 'Create New Order' : 'Edit Order'}
        </h2>

        <Show when={props.error}>
          <div class="bg-status-error-bg text-status-error-text mb-4 rounded-lg p-3 text-sm">
            {props.error}
          </div>
        </Show>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            props.onSubmit();
          }}
          class="space-y-4"
        >
          {/* Client Selection */}
          <div>
            <label class="mb-2 block text-sm font-medium text-text-primary">
              Client
            </label>
            <select
              value={props.clientId}
              onInput={(e) => props.setClientId(e.currentTarget.value)}
              class="w-full rounded-lg border border-border-default bg-bg-surface px-4 py-2 text-text-primary focus:border-accent-primary focus:outline-none"
            >
              <option value="">Walk-in Customer</option>
              {props.clients
                ?.filter((c) => !c.isWalkIn)
                .map((client) => (
                  <option value={client.id}>{client.partnerName}</option>
                ))}
            </select>
          </div>

          {/* Items */}
          <div>
            <div class="mb-2 flex items-center justify-between">
              <label class="text-sm font-medium text-text-primary">
                Items *
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addFormItem}
              >
                Add Item
              </Button>
            </div>

            <div class="space-y-3">
              <Index each={props.formItems}>
                {(item, index) => (
                  <div class="flex gap-2 rounded-lg border border-border-default p-3">
                    <div class="flex-1">
                      <ItemSelect
                        items={props.items ?? []}
                        value={item().itemId}
                        onChange={(id) => updateFormItem(index, 'itemId', id)}
                        placeholder="Select item..."
                        showStock
                        required
                      />
                    </div>
                    <div class="w-24">
                      <input
                        type="text"
                        inputmode="numeric"
                        pattern="[0-9]*"
                        name={`quantity-${index}`}
                        value={item().quantity}
                        onInput={(e) =>
                          updateFormItem(
                            index,
                            'quantity',
                            e.currentTarget.value
                          )
                        }
                        required
                        placeholder="Qty"
                        class="w-full rounded border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                      />
                    </div>
                    <div class="w-32">
                      <input
                        type="text"
                        inputmode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        name={`unitPrice-${index}`}
                        value={item().unitPrice}
                        onInput={(e) =>
                          updateFormItem(
                            index,
                            'unitPrice',
                            e.currentTarget.value
                          )
                        }
                        required
                        placeholder="Price"
                        class="w-full rounded border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                      />
                    </div>
                    <Show when={props.formItems.length > 1}>
                      <button
                        type="button"
                        onClick={() => removeFormItem(index)}
                        class="text-status-error-text hover:text-red-700"
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
                    </Show>
                  </div>
                )}
              </Index>
            </div>
          </div>

          {/* Total */}
          <div class="flex justify-end border-t border-border-default pt-4">
            <div class="text-right">
              <p class="text-sm text-text-secondary">Total Amount</p>
              <p class="text-2xl font-bold text-text-primary">
                {props.formatCurrency(calculateTotal())}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div class="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={props.onClose}
              disabled={props.isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={props.isSubmitting}
            >
              {props.isSubmitting
                ? 'Saving...'
                : props.mode === 'create'
                  ? 'Create Order'
                  : 'Update Order'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
