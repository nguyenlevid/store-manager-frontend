import { createSignal, createResource, Show, createEffect } from 'solid-js';
import { useSearchParams } from '@solidjs/router';
import { Button } from '@/shared/ui/Button';
import { InventoryTable } from '@/features/inventory/components/InventoryTable';
import { InventoryFiltersBar } from '@/features/inventory/components/InventoryFiltersBar';
import { AddItemModal } from '@/features/inventory/components/AddItemModal';
import { getInventoryItemsWithPagination } from '@/features/inventory/api/inventory.api';
import { getStorehouses } from '@/shared/api/storehouses.api';
import { getBusiness } from '@/shared/stores/business.store';
import { formatCurrency as sharedFormatCurrency } from '@/shared/lib/format';
import { getInventorySummary } from '@/features/inventory/lib/mock-inventory';
import type { InventoryFilters } from '@/features/inventory/types/inventory.types';

export default function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = createSignal<InventoryFilters>({
    status: 'all',
  });
  const [currentPage, setCurrentPage] = createSignal(1);
  const [paginationInfo, setPaginationInfo] = createSignal<any>(null);
  const business = getBusiness;

  const [items, { refetch }] = createResource(
    () => ({ filters: filters(), page: currentPage() }),
    async ({ filters: currentFilters, page }) => {
      const response = await getInventoryItemsWithPagination({
        page,
        limit: 20,
        search: currentFilters.search,
        status:
          currentFilters.status !== 'all' ? currentFilters.status : undefined,
        tags: currentFilters.tags,
        storeHouse: currentFilters.storeHouse,
      });
      setPaginationInfo(response.pagination);
      return response.items;
    }
  );

  const [storehouses] = createResource(() => getStorehouses());
  const [isModalOpen, setIsModalOpen] = createSignal(false);

  // Handle action query param (from FAB - use createEffect to react to changes)
  createEffect(() => {
    if (searchParams['action'] === 'create') {
      setIsModalOpen(true);
      setSearchParams({ action: undefined });
    }
  });

  // Handle search query param (from dashboard low stock alerts)
  createEffect(() => {
    const searchTerm = searchParams['search'];
    if (searchTerm) {
      const searchValue = Array.isArray(searchTerm)
        ? searchTerm[0]
        : searchTerm;
      setFilters((prev) => ({
        ...prev,
        search: searchValue,
      }));
      // Clear the search param from URL after applying to filters
      setSearchParams({ search: undefined });
    }
  });

  // Reset to page 1 when filters change
  const changeFilters = (newFilters: InventoryFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // Load more (next page)
  const loadMore = () => {
    const pagination = paginationInfo();
    if (pagination && currentPage() < pagination.pages) {
      setCurrentPage(currentPage() + 1);
    }
  };

  const summary = () => {
    const currentItems = items();
    if (!currentItems) return null;
    return getInventorySummary(currentItems);
  };

  const formatCurrency = (amount: number) =>
    sharedFormatCurrency(amount, business()?.currency);

  return (
    <div class="space-y-6 py-8">
      {/* Header */}
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold text-text-primary">Inventory</h1>
          <p class="mt-2 text-sm text-text-secondary">
            Track and manage your stock levels across all locations
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <svg
            class="mr-2 h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add New Item
        </Button>
      </div>

      {/* Summary Cards */}
      <Show when={summary()}>
        {(stats) => (
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total SKUs */}
            <div class="rounded-lg border border-border-default bg-bg-surface p-5 shadow-sm">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-text-secondary">
                    Total Items
                  </p>
                  <p class="mt-2 text-3xl font-bold text-text-primary">
                    {stats().totalSKUs}
                  </p>
                </div>
                <div class="rounded-full bg-accent-primary-subtle p-3">
                  <svg
                    class="h-6 w-6 text-accent-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Inventory Value */}
            <div class="rounded-lg border border-border-default bg-bg-surface p-5 shadow-sm">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-text-secondary">
                    Inventory Value
                  </p>
                  <p class="mt-2 text-3xl font-bold text-text-primary">
                    {formatCurrency(stats().totalInventoryValue)}
                  </p>
                </div>
                <div class="rounded-full bg-accent-success-subtle p-3">
                  <svg
                    class="h-6 w-6 text-accent-success"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Out of Stock */}
            <div class="rounded-lg border border-border-default bg-status-danger-bg p-5 shadow-sm">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-status-danger-text">
                    Out of Stock
                  </p>
                  <p class="mt-2 text-3xl font-bold text-status-danger-text">
                    {stats().outOfStockCount}
                  </p>
                </div>
                <div class="rounded-full bg-accent-danger-subtle p-3">
                  <svg
                    class="h-6 w-6 text-accent-danger"
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
                </div>
              </div>
            </div>

            {/* Low Stock */}
            <div class="rounded-lg border border-border-default bg-status-warning-bg p-5 shadow-sm">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-status-warning-text">
                    Low Stock
                  </p>
                  <p class="mt-2 text-3xl font-bold text-status-warning-text">
                    {stats().lowStockCount}
                  </p>
                </div>
                <div class="rounded-full bg-accent-warning-subtle p-3">
                  <svg
                    class="h-6 w-6 text-accent-warning"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}
      </Show>

      {/* Filters */}
      <InventoryFiltersBar
        filters={filters()}
        onFiltersChange={changeFilters}
        totalItems={paginationInfo()?.total ?? 0}
        filteredCount={items()?.length ?? 0}
        storehouses={storehouses() ?? []}
      />

      {/* Table */}
      <Show
        when={!items.loading}
        fallback={
          <div class="flex items-center justify-center py-12">
            <div class="text-center">
              <div class="border-primary-600 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-r-transparent"></div>
              <p class="mt-2 text-sm text-gray-600">Loading inventory...</p>
            </div>
          </div>
        }
      >
        <Show when={items()}>
          <div class="rounded-lg border border-border-default bg-bg-surface shadow-sm">
            <InventoryTable items={items()!} onRefresh={refetch} />

            {/* Pagination UI */}
            <Show when={paginationInfo()}>
              {(pagination) => (
                <div class="flex flex-col gap-2 border-t border-border-default px-6 py-4">
                  <div class="flex items-center justify-between">
                    <div class="text-sm text-text-secondary">
                      Showing{' '}
                      <span class="font-medium text-text-primary">
                        {items()?.length ?? 0}
                      </span>{' '}
                      of{' '}
                      <span class="font-medium text-text-primary">
                        {pagination().total}
                      </span>{' '}
                      items
                      {pagination().pages > 1 && (
                        <span>
                          {' '}
                          (Page {pagination().page} of {pagination().pages})
                        </span>
                      )}
                    </div>
                    <Show when={pagination().page < pagination().pages}>
                      <Button onClick={loadMore} disabled={items.loading}>
                        {items.loading ? 'Loading...' : 'Load More'}
                      </Button>
                    </Show>
                  </div>
                </div>
              )}
            </Show>
          </div>
        </Show>
      </Show>

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={isModalOpen()}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          refetch();
        }}
        storehouses={storehouses() ?? []}
      />
    </div>
  );
}
