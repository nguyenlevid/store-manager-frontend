/**
 * QuickRestockModal - Bulk restock low stock items
 *
 * Features:
 * - Shows low/out-of-stock items
 * - Group items by supplier
 * - Edit quantities and unit prices
 * - Change supplier per item (triggers re-grouping)
 * - Create multiple imports with one click
 */

import { createSignal, For, Show, createMemo, type Component } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { Button } from '@/shared/ui/Button';
import type { Item } from '@/features/inventory/types/inventory.types';
import type { Partner } from '@/shared/types/partner.types';
import type { ImportFormData } from '@/shared/types/import.types';
import { createImports } from '@/shared/api/imports.api';
import { notificationStore } from '@/shared/stores/notification.store';
import { getErrorMessage, getErrorTitle } from '@/shared/lib/error-messages';

interface RestockItem {
  item: Item;
  quantity: number;
  unitPrice: number;
  supplierId: string;
}

interface QuickRestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  suppliers: Partner[];
  onSuccess?: () => void;
}

export const QuickRestockModal: Component<QuickRestockModalProps> = (props) => {
  const [restockItems, setRestockItems] = createStore<
    Record<string, RestockItem>
  >({});
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  // Initialize restock items when modal opens
  const initializeItems = () => {
    const initialized: Record<string, RestockItem> = {};
    props.items.forEach((item) => {
      // Calculate suggested reorder quantity
      const deficit = Math.max(0, (item.lowStockAt || 10) - item.quantity);
      const suggestedQty = deficit + Math.ceil((item.lowStockAt || 10) * 0.5); // Add 50% buffer

      initialized[item.id] = {
        item,
        quantity: suggestedQty,
        unitPrice: item.unitPrice,
        supplierId: props.suppliers[0]?.id || '',
      };
    });
    setRestockItems(initialized);
  };

  // Initialize when modal opens
  createMemo(() => {
    if (props.isOpen && props.items.length > 0) {
      initializeItems();
    }
  });

  // Group items by supplier
  const groupedBySupplier = createMemo(() => {
    const groups: Record<string, RestockItem[]> = {};

    Object.values(restockItems).forEach((restockItem) => {
      const supplierId = restockItem.supplierId || 'unassigned';
      if (!groups[supplierId]) {
        groups[supplierId] = [];
      }
      groups[supplierId].push(restockItem);
    });

    return groups;
  });

  const updateQuantity = (itemId: string, quantity: number) => {
    setRestockItems(itemId, 'quantity', Math.max(1, quantity));
  };

  const updateUnitPrice = (itemId: string, price: number) => {
    setRestockItems(itemId, 'unitPrice', Math.max(0, price));
  };

  const updateSupplier = (itemId: string, supplierId: string) => {
    setRestockItems(itemId, 'supplierId', supplierId);
  };

  const removeItem = (itemId: string) => {
    setRestockItems(
      produce((items) => {
        delete items[itemId];
      })
    );
  };

  const getSupplierById = (id: string) => {
    return props.suppliers.find((s) => s.id === id);
  };

  const totalImports = () => Object.keys(groupedBySupplier()).length;

  const totalItems = () => Object.keys(restockItems).length;

  const totalCost = () => {
    return Object.values(restockItems).reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
  };

  const handleSubmit = async () => {
    const groups = groupedBySupplier();
    const importRequests: ImportFormData[] = [];

    // Create import request for each supplier group
    Object.entries(groups).forEach(([supplierId, items]) => {
      if (supplierId === 'unassigned' || items.length === 0) return;

      importRequests.push({
        supplierId,
        items: items.map((restockItem) => ({
          itemId: restockItem.item.id,
          quantity: restockItem.quantity,
          unitPrice: restockItem.unitPrice,
        })),
        status: 'pending',
      });
    });

    if (importRequests.length === 0) {
      notificationStore.warning('Please assign suppliers to items');
      return;
    }

    setIsSubmitting(true);
    try {
      await createImports(importRequests);
      notificationStore.success(
        `Successfully created ${importRequests.length} import order${importRequests.length > 1 ? 's' : ''}`
      );
      props.onSuccess?.();
      props.onClose();
    } catch (error: any) {
      console.error('Failed to create imports:', error);
      notificationStore.error(getErrorMessage(error), {
        title: getErrorTitle(error) || 'Error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay p-4"
        onClick={() => props.onClose()}
      >
        <div
          class="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl bg-bg-surface shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="flex items-center justify-between border-b border-border-default px-6 py-4">
            <div>
              <h2 class="text-xl font-semibold text-text-primary">
                Quick Restock
              </h2>
              <p class="mt-1 text-sm text-text-secondary">
                {totalItems()} item{totalItems() !== 1 ? 's' : ''} ·{' '}
                {totalImports()} supplier{totalImports() !== 1 ? 's' : ''} ·
                Est. ${totalCost().toFixed(2)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => props.onClose()}
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

          {/* Body - Scrollable */}
          <div class="flex-1 overflow-y-auto px-6 py-4">
            <Show
              when={totalItems() > 0}
              fallback={
                <div class="py-12 text-center text-text-muted">
                  <svg
                    class="mx-auto h-16 w-16 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p class="mt-4 text-sm">No items to restock</p>
                </div>
              }
            >
              {/* Grouped by supplier */}
              <div class="space-y-6">
                <For each={Object.entries(groupedBySupplier())}>
                  {([supplierId, items]) => {
                    const supplier = getSupplierById(supplierId);
                    const groupTotal = items.reduce(
                      (sum, item) => sum + item.quantity * item.unitPrice,
                      0
                    );

                    return (
                      <div class="rounded-lg border border-border-default bg-bg-surface">
                        {/* Supplier Header */}
                        <div class="bg-bg-hover/50 border-b border-border-default px-4 py-3">
                          <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                                <svg
                                  class="h-5 w-5 text-purple-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                  />
                                </svg>
                              </div>
                              <div>
                                <h3 class="font-medium text-text-primary">
                                  {supplier?.partnerName || 'Unassigned'}
                                </h3>
                                <p class="text-xs text-text-secondary">
                                  {items.length} item
                                  {items.length !== 1 ? 's' : ''} · $
                                  {groupTotal.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Items in this group */}
                        <div class="divide-y divide-border-default">
                          <For each={items}>
                            {(restockItem) => (
                              <div class="p-4">
                                <div class="flex items-start gap-4">
                                  {/* Item info */}
                                  <div class="min-w-0 flex-1">
                                    <div class="flex items-start justify-between gap-4">
                                      <div class="min-w-0 flex-1">
                                        <p class="font-medium text-text-primary">
                                          {restockItem.item.name}
                                        </p>
                                        <div class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
                                          <span>
                                            Current: {restockItem.item.quantity}{' '}
                                            {restockItem.item.unit}
                                          </span>
                                          <span>
                                            Alert at:{' '}
                                            {restockItem.item.lowStockAt || 10}
                                          </span>
                                          <Show
                                            when={restockItem.item.storeHouse}
                                          >
                                            <span>
                                              ·{' '}
                                              {restockItem.item.storeHouse.name}
                                            </span>
                                          </Show>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeItem(restockItem.item.id)
                                        }
                                        class="hover:text-status-error rounded p-1 text-text-muted hover:bg-bg-hover"
                                        title="Remove item"
                                      >
                                        <svg
                                          class="h-4 w-4"
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

                                    {/* Controls */}
                                    <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                      {/* Supplier select */}
                                      <div>
                                        <label class="mb-1 block text-xs font-medium text-text-secondary">
                                          Supplier
                                        </label>
                                        <select
                                          value={restockItem.supplierId}
                                          onChange={(e) =>
                                            updateSupplier(
                                              restockItem.item.id,
                                              e.currentTarget.value
                                            )
                                          }
                                          class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                                        >
                                          <For each={props.suppliers}>
                                            {(supplier) => (
                                              <option value={supplier.id}>
                                                {supplier.partnerName}
                                              </option>
                                            )}
                                          </For>
                                        </select>
                                      </div>

                                      {/* Quantity */}
                                      <div>
                                        <label class="mb-1 block text-xs font-medium text-text-secondary">
                                          Order Quantity (
                                          {restockItem.item.unit})
                                        </label>
                                        <input
                                          type="number"
                                          min="1"
                                          value={restockItem.quantity}
                                          onInput={(e) =>
                                            updateQuantity(
                                              restockItem.item.id,
                                              parseInt(e.currentTarget.value) ||
                                                1
                                            )
                                          }
                                          class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                                        />
                                      </div>

                                      {/* Unit Price */}
                                      <div>
                                        <label class="mb-1 block text-xs font-medium text-text-secondary">
                                          Unit Price ($)
                                        </label>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={restockItem.unitPrice}
                                          onInput={(e) =>
                                            updateUnitPrice(
                                              restockItem.item.id,
                                              parseFloat(
                                                e.currentTarget.value
                                              ) || 0
                                            )
                                          }
                                          class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                                        />
                                      </div>
                                    </div>

                                    {/* Subtotal */}
                                    <div class="mt-2 text-right text-sm">
                                      <span class="text-text-secondary">
                                        Subtotal:{' '}
                                      </span>
                                      <span class="font-medium text-text-primary">
                                        $
                                        {(
                                          restockItem.quantity *
                                          restockItem.unitPrice
                                        ).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </For>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </div>
            </Show>
          </div>

          {/* Footer */}
          <div class="flex items-center justify-between border-t border-border-default px-6 py-4">
            <div class="text-sm">
              <span class="text-text-secondary">Total Cost: </span>
              <span class="text-lg font-bold text-text-primary">
                ${totalCost().toFixed(2)}
              </span>
            </div>
            <div class="flex gap-3">
              <Button variant="outline" onClick={() => props.onClose()}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={isSubmitting() || totalItems() === 0}
              >
                <Show
                  when={isSubmitting()}
                  fallback={
                    <>
                      Create {totalImports()} Import
                      {totalImports() !== 1 ? 's' : ''}
                    </>
                  }
                >
                  Creating...
                </Show>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};
