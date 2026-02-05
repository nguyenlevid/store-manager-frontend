import { createSignal, Show, For, type Component } from 'solid-js';
import { Button } from '@/shared/ui/Button';
import type { InventoryFilters, StockStatus } from '../types/inventory.types';
import {
  getAllTags,
  getAllStorehouses,
  MOCK_ITEMS,
} from '../lib/mock-inventory';

interface InventoryFiltersBarProps {
  filters: InventoryFilters;
  onFiltersChange: (filters: InventoryFilters) => void;
  totalItems: number;
  filteredCount: number;
}

export const InventoryFiltersBar: Component<InventoryFiltersBarProps> = (
  props
) => {
  const [searchInput, setSearchInput] = createSignal(
    props.filters.search || ''
  );
  const allTags = getAllTags(MOCK_ITEMS);
  const allStorehouses = getAllStorehouses(MOCK_ITEMS);

  const handleSearch = (e: Event) => {
    e.preventDefault();
    props.onFiltersChange({ ...props.filters, search: searchInput() });
  };

  const handleStatusChange = (status: StockStatus | 'all') => {
    props.onFiltersChange({ ...props.filters, status });
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = props.filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    props.onFiltersChange({ ...props.filters, tags: newTags });
  };

  const handleStorehouseChange = (storehouseId: string) => {
    props.onFiltersChange({
      ...props.filters,
      storeHouse: storehouseId === 'all' ? undefined : storehouseId,
    });
  };

  const handleReset = () => {
    setSearchInput('');
    props.onFiltersChange({ status: 'all' });
  };

  const hasActiveFilters = () => {
    return (
      props.filters.search ||
      (props.filters.status && props.filters.status !== 'all') ||
      (props.filters.tags && props.filters.tags.length > 0) ||
      props.filters.storeHouse
    );
  };

  return (
    <div class="space-y-4">
      {/* Search bar */}
      <form onSubmit={handleSearch} class="flex gap-2">
        <div class="relative flex-1">
          <input
            type="text"
            value={searchInput()}
            onInput={(e) => setSearchInput(e.currentTarget.value)}
            placeholder="Search by name, description, or tags..."
            class="focus:ring-border-focus/20 w-full rounded-lg border border-border-default bg-bg-surface px-4 py-2 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2"
          />
          <svg
            class="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <Button type="submit" variant="primary">
          Search
        </Button>
        <Show when={hasActiveFilters()}>
          <Button type="button" variant="outline" onClick={handleReset}>
            Reset
          </Button>
        </Show>
      </form>

      {/* Filter chips */}
      <div class="flex flex-wrap items-center gap-3">
        {/* Status filter */}
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-text-primary">Status:</span>
          <div class="flex gap-2">
            <For
              each={['all', 'in-stock', 'low-stock', 'out-of-stock'] as const}
            >
              {(status) => (
                <button
                  type="button"
                  onClick={() => handleStatusChange(status)}
                  class={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    (props.filters.status || 'all') === status
                      ? 'border-accent-primary bg-accent-primary-subtle text-accent-primary'
                      : 'border-border-default bg-bg-surface text-text-primary hover:bg-bg-hover'
                  }`}
                >
                  {status === 'all'
                    ? 'All'
                    : status
                        .split('-')
                        .map(
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(' ')}
                </button>
              )}
            </For>
          </div>
        </div>

        {/* Storehouse filter */}
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-text-primary">Location:</span>
          <select
            value={props.filters.storeHouse || 'all'}
            onChange={(e) => handleStorehouseChange(e.currentTarget.value)}
            class="focus:ring-border-focus/20 rounded-md border border-border-default bg-bg-surface px-3 py-1 text-xs font-medium text-text-primary transition-colors hover:bg-bg-hover focus:border-border-focus focus:outline-none focus:ring-2"
          >
            <option value="all">All Locations</option>
            <For each={allStorehouses}>
              {(store) => <option value={store.id}>{store.name}</option>}
            </For>
          </select>
        </div>

        {/* Tag chips */}
        <Show when={allTags.length > 0}>
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-text-primary">Tags:</span>
            <div class="flex flex-wrap gap-2">
              <For each={allTags}>
                {(tag) => (
                  <button
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    class={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      props.filters.tags?.includes(tag)
                        ? 'border-accent-primary bg-accent-primary-subtle text-accent-primary'
                        : 'border-border-default bg-bg-surface text-text-primary hover:bg-bg-hover'
                    }`}
                  >
                    {tag}
                  </button>
                )}
              </For>
            </div>
          </div>
        </Show>
      </div>

      {/* Results count */}
      <div class="text-sm text-text-secondary">
        Showing <span class="font-semibold">{props.filteredCount}</span> of{' '}
        <span class="font-semibold">{props.totalItems}</span> items
      </div>
    </div>
  );
};
