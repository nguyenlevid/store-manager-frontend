import { For, Show, createSignal, createMemo, type Component } from 'solid-js';
import { Button } from '@/shared/ui/Button';
import { StockStatusBadge } from './StockStatusBadge';
import { CreateImportModal } from './CreateImportModal';
import { ViewItemDetailsModal } from './ViewItemDetailsModal';
import { PrintLabelsModal } from './PrintLabelsModal';
import type { Item } from '../types/inventory.types';
import type { LabelItem } from '@/shared/lib/barcode-utils';
import { getStockStatus } from '../lib/mock-inventory';
import { getBusiness } from '@/shared/stores/business.store';
import {
  formatCurrency as sharedFormatCurrency,
  formatRelativeDate,
} from '@/shared/lib/format';

interface InventoryTableProps {
  items: Item[];
  onRefresh: () => void;
}

export const InventoryTable: Component<InventoryTableProps> = (props) => {
  const [selectedItem, setSelectedItem] = createSignal<Item | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = createSignal(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = createSignal(false);
  const [actionMenuItem, setActionMenuItem] = createSignal<Item | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = createSignal(false);
  const [printItems, setPrintItems] = createSignal<LabelItem[]>([]);
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());

  // Fetch business info for label branding
  const business = getBusiness;

  // Derived: whether all visible items are selected
  const allSelected = createMemo(() => {
    const ids = selectedIds();
    return (
      props.items.length > 0 && props.items.every((item) => ids.has(item.id))
    );
  });

  const selectedCount = createMemo(() => selectedIds().size);

  const toggleSelectAll = () => {
    if (allSelected()) {
      setSelectedIds(new Set<string>());
    } else {
      setSelectedIds(new Set(props.items.map((item) => item.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const clearSelection = () => setSelectedIds(new Set<string>());

  const handleRowClick = (item: Item) => {
    setActionMenuItem(item);
  };

  const handleCloseActionMenu = () => {
    setActionMenuItem(null);
  };

  const handleImportStock = (item: Item) => {
    setSelectedItem(item);
    setIsImportModalOpen(true);
    setActionMenuItem(null);
  };

  const handleViewDetails = (item: Item) => {
    setSelectedItem(item);
    setIsDetailsModalOpen(true);
    setActionMenuItem(null);
  };

  const handlePrintLabel = (item: Item) => {
    setPrintItems([
      {
        id: item.id,
        name: item.name,
        unit: item.unit,
        storehouse: item.storeHouse?.name,
        quantity: item.quantity,
        copies: 1,
      },
    ]);
    setIsPrintModalOpen(true);
    setActionMenuItem(null);
  };

  /** Print labels for all selected items */
  const handlePrintSelected = () => {
    const ids = selectedIds();
    const items = props.items
      .filter((item) => ids.has(item.id))
      .map(
        (item): LabelItem => ({
          id: item.id,
          name: item.name,
          unit: item.unit,
          storehouse: item.storeHouse?.name,
          quantity: item.quantity,
          copies: 1,
        })
      );
    if (items.length === 0) return;
    setPrintItems(items);
    setIsPrintModalOpen(true);
  };

  /** Print labels for ALL items currently visible (respects filters) */
  const handlePrintAll = () => {
    const items = props.items.map(
      (item): LabelItem => ({
        id: item.id,
        name: item.name,
        unit: item.unit,
        storehouse: item.storeHouse?.name,
        quantity: item.quantity,
        copies: 1,
      })
    );
    if (items.length === 0) return;
    setPrintItems(items);
    setIsPrintModalOpen(true);
  };

  const handleImportComplete = () => {
    setIsImportModalOpen(false);
    setSelectedItem(null);
    props.onRefresh();
  };

  const formatCurrency = (amount: number) =>
    sharedFormatCurrency(amount, business()?.currency);

  const formatDate = (dateString: string) => {
    return formatRelativeDate(dateString, business()?.timezone);
  };

  return (
    <>
      {/* Selection Actions Bar */}
      <Show when={selectedCount() > 0}>
        <div class="border-accent-primary/30 bg-accent-primary/10 mb-3 flex items-center justify-between rounded-lg border px-4 py-3">
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-text-primary">
              {selectedCount()} item{selectedCount() !== 1 ? 's' : ''} selected
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear Selection
            </Button>
          </div>
          <div class="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handlePrintAll}>
              <svg
                class="mr-1.5 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print All ({props.items.length})
            </Button>
            <Button variant="primary" onClick={handlePrintSelected}>
              <svg
                class="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print Selected
            </Button>
          </div>
        </div>
      </Show>

      <div class="overflow-hidden rounded-lg border border-border-default bg-bg-surface shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full divide-y divide-border-subtle">
            <thead class="bg-bg-surface-subtle">
              <tr>
                <th class="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected()}
                    onChange={toggleSelectAll}
                    class="h-4 w-4 rounded border-border-default text-accent-primary focus:ring-accent-primary"
                  />
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary"
                >
                  Item
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary"
                >
                  Category
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary"
                >
                  Stock Status
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary"
                >
                  Unit
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary"
                >
                  Cost
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary"
                >
                  Location
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary"
                >
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-subtle bg-bg-surface">
              <Show
                when={props.items.length > 0}
                fallback={
                  <tr>
                    <td colspan="8" class="px-6 py-12 text-center">
                      <div class="flex flex-col items-center gap-2">
                        <svg
                          class="h-12 w-12 text-text-muted"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width={2}
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                          />
                        </svg>
                        <p class="text-sm font-medium text-text-primary">
                          No items found
                        </p>
                        <p class="text-sm text-text-secondary">
                          Try adjusting your filters or search query
                        </p>
                      </div>
                    </td>
                  </tr>
                }
              >
                <For each={props.items}>
                  {(item) => {
                    const status = () => getStockStatus(item);

                    return (
                      <tr
                        class={`cursor-pointer transition-colors hover:bg-bg-hover ${
                          selectedIds().has(item.id)
                            ? 'bg-accent-primary/5'
                            : ''
                        }`}
                        onClick={() => handleRowClick(item)}
                      >
                        <td
                          class="whitespace-nowrap px-4 py-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds().has(item.id)}
                            onChange={() => toggleSelectItem(item.id)}
                            class="h-4 w-4 rounded border-border-default text-accent-primary focus:ring-accent-primary"
                          />
                        </td>
                        <td class="whitespace-nowrap px-6 py-4">
                          <div class="flex items-center">
                            <div>
                              <div class="text-sm font-medium text-text-primary">
                                {item.name}
                              </div>
                              <Show when={item.description}>
                                <div class="max-w-xs truncate text-sm text-text-secondary">
                                  {item.description}
                                </div>
                              </Show>
                            </div>
                          </div>
                        </td>
                        <td class="whitespace-nowrap px-6 py-4">
                          <div class="flex flex-wrap gap-1">
                            <For each={item.tags.slice(0, 2)}>
                              {(tag) => (
                                <span class="inline-flex items-center rounded-full border border-border-subtle bg-bg-surface-subtle px-2 py-0.5 text-xs font-medium text-text-primary">
                                  {tag}
                                </span>
                              )}
                            </For>
                            <Show when={item.tags.length > 2}>
                              <span class="inline-flex items-center rounded-full border border-border-subtle bg-bg-surface-subtle px-2 py-0.5 text-xs font-medium text-text-secondary">
                                +{item.tags.length - 2}
                              </span>
                            </Show>
                          </div>
                        </td>
                        <td class="whitespace-nowrap px-6 py-4">
                          <StockStatusBadge
                            status={status()}
                            quantity={item.quantity}
                          />
                        </td>
                        <td class="whitespace-nowrap px-6 py-4 text-sm text-text-primary">
                          {item.unit}
                        </td>
                        <td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-text-primary">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td class="whitespace-nowrap px-6 py-4 text-sm text-text-primary">
                          <div class="flex items-center gap-1.5">
                            <svg
                              class="h-4 w-4 text-text-muted"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            {item.storeHouse.name}
                          </div>
                        </td>
                        <td class="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                          {formatDate(item.updatedAt)}
                        </td>
                      </tr>
                    );
                  }}
                </For>
              </Show>
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Menu Modal */}
      <Show when={actionMenuItem()}>
        {(item) => (
          <div
            class="fixed inset-0 z-50 flex items-end justify-center bg-bg-overlay sm:items-center"
            onClick={handleCloseActionMenu}
          >
            <div
              class="w-full max-w-md rounded-t-xl bg-bg-surface p-6 shadow-xl sm:rounded-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div class="mb-4">
                <h3 class="text-lg font-semibold text-text-primary">
                  {item().name}
                </h3>
                <p class="mt-1 text-sm text-text-secondary">
                  {item().quantity} {item().unit} in stock
                </p>
              </div>

              <div class="space-y-2">
                <button
                  type="button"
                  onClick={() => handleImportStock(item())}
                  class="flex w-full items-center gap-3 rounded-lg border border-border-default bg-bg-surface px-4 py-3 text-left transition-colors hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-border-focus"
                >
                  <svg
                    class="h-5 w-5 text-accent-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  <div>
                    <div class="text-sm font-medium text-text-primary">
                      Import Stock
                    </div>
                    <div class="text-xs text-text-secondary">
                      Create import order
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleViewDetails(item())}
                  class="flex w-full items-center gap-3 rounded-lg border border-border-default bg-bg-surface px-4 py-3 text-left transition-colors hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-border-focus"
                >
                  <svg
                    class="h-5 w-5 text-accent-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  <div>
                    <div class="text-sm font-medium text-text-primary">
                      View Details
                    </div>
                    <div class="text-xs text-text-secondary">
                      See full information
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintLabel(item())}
                  class="flex w-full items-center gap-3 rounded-lg border border-border-default bg-bg-surface px-4 py-3 text-left transition-colors hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-border-focus"
                >
                  <svg
                    class="h-5 w-5 text-accent-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width={2}
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                    />
                  </svg>
                  <div>
                    <div class="text-sm font-medium text-text-primary">
                      Print Label
                    </div>
                    <div class="text-xs text-text-secondary">
                      Generate barcode / QR label
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleCloseActionMenu}
                  class="mt-2 w-full rounded-lg border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-border-focus"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </Show>

      <Show when={selectedItem()}>
        {(item) => (
          <>
            <CreateImportModal
              item={item()}
              isOpen={isImportModalOpen()}
              onClose={() => setIsImportModalOpen(false)}
              onSuccess={handleImportComplete}
            />
            <ViewItemDetailsModal
              item={item()}
              isOpen={isDetailsModalOpen()}
              onClose={() => setIsDetailsModalOpen(false)}
              onSuccess={() => {
                setIsDetailsModalOpen(false);
                setSelectedItem(null);
                props.onRefresh();
              }}
            />
          </>
        )}
      </Show>

      {/* Print Labels Modal */}
      <PrintLabelsModal
        isOpen={isPrintModalOpen()}
        onClose={() => setIsPrintModalOpen(false)}
        items={printItems()}
        businessName={business()?.name}
      />
    </>
  );
};
