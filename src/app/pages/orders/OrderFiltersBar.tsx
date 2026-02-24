import { Show, For } from 'solid-js';
import { Button } from '@/shared/ui/Button';
import { Card, CardBody } from '@/shared/ui';
import type { AdvancedFilters } from './types';

interface Client {
  id: string;
  partnerName: string;
  isWalkIn?: boolean;
  [key: string]: any;
}

interface OrderFiltersBarProps {
  filter: 'all' | 'pending' | 'completed' | 'cancelled';
  showAdvancedFilters: boolean;
  advancedFilters: AdvancedFilters;
  clients: Client[] | undefined;
  onFilterChange: (
    filter: 'all' | 'pending' | 'completed' | 'cancelled'
  ) => void;
  onSearchChange: (value: string) => void;
  onToggleAdvancedFilters: () => void;
  onAdvancedFilterChange: <K extends keyof AdvancedFilters>(
    key: K,
    value: AdvancedFilters[K]
  ) => void;
  onResetAdvancedFilters: () => void;
}

export function OrderFiltersBar(props: OrderFiltersBarProps) {
  return (
    <>
      {/* Search and Filters */}
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-wrap gap-2">
          <Button
            variant={props.filter === 'all' ? 'primary' : 'outline'}
            onClick={() => props.onFilterChange('all')}
          >
            All Orders
          </Button>
          <Button
            variant={props.filter === 'pending' ? 'primary' : 'outline'}
            onClick={() => props.onFilterChange('pending')}
          >
            Pending
          </Button>
          <Button
            variant={props.filter === 'completed' ? 'primary' : 'outline'}
            onClick={() => props.onFilterChange('completed')}
          >
            Completed
          </Button>
          <Button
            variant={props.filter === 'cancelled' ? 'primary' : 'outline'}
            onClick={() => props.onFilterChange('cancelled')}
          >
            Cancelled
          </Button>
        </div>

        <div class="flex items-center gap-2">
          <div class="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search by ID, client, email, phone..."
              onInput={(e) => props.onSearchChange(e.currentTarget.value)}
              class="placeholder-text-tertiary w-full rounded-lg border border-border-default bg-bg-surface px-4 py-2 pl-10 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
            <svg
              class="text-text-tertiary absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
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
          <Button
            variant={props.showAdvancedFilters ? 'primary' : 'outline'}
            onClick={props.onToggleAdvancedFilters}
            title="Advanced Filters"
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
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          </Button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <Show when={props.showAdvancedFilters}>
        <Card>
          <CardBody>
            <div class="mb-4 flex items-center justify-between">
              <h3 class="font-semibold text-text-primary">Advanced Filters</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={props.onResetAdvancedFilters}
              >
                Reset Filters
              </Button>
            </div>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Client Filter */}
              <div>
                <label class="mb-1 block text-sm font-medium text-text-secondary">
                  Client
                </label>
                <select
                  value={props.advancedFilters.clientId}
                  onChange={(e) =>
                    props.onAdvancedFilterChange(
                      'clientId',
                      e.currentTarget.value
                    )
                  }
                  class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                >
                  <option value="">All Clients</option>
                  <For each={props.clients}>
                    {(client) => (
                      <option value={client.id}>{client.partnerName}</option>
                    )}
                  </For>
                </select>
              </div>

              {/* Date From */}
              <div>
                <label class="mb-1 block text-sm font-medium text-text-secondary">
                  Date From
                </label>
                <input
                  type="date"
                  value={props.advancedFilters.dateFrom}
                  onChange={(e) =>
                    props.onAdvancedFilterChange(
                      'dateFrom',
                      e.currentTarget.value
                    )
                  }
                  class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                />
              </div>

              {/* Date To */}
              <div>
                <label class="mb-1 block text-sm font-medium text-text-secondary">
                  Date To
                </label>
                <input
                  type="date"
                  value={props.advancedFilters.dateTo}
                  onChange={(e) =>
                    props.onAdvancedFilterChange(
                      'dateTo',
                      e.currentTarget.value
                    )
                  }
                  class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                />
              </div>

              {/* Price Range */}
              <div class="flex gap-2">
                <div class="flex-1">
                  <label class="mb-1 block text-sm font-medium text-text-secondary">
                    Min Price
                  </label>
                  <input
                    type="number"
                    placeholder="$0"
                    value={props.advancedFilters.priceMin}
                    onChange={(e) =>
                      props.onAdvancedFilterChange(
                        'priceMin',
                        e.currentTarget.value
                      )
                    }
                    class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                  />
                </div>
                <div class="flex-1">
                  <label class="mb-1 block text-sm font-medium text-text-secondary">
                    Max Price
                  </label>
                  <input
                    type="number"
                    placeholder="$∞"
                    value={props.advancedFilters.priceMax}
                    onChange={(e) =>
                      props.onAdvancedFilterChange(
                        'priceMax',
                        e.currentTarget.value
                      )
                    }
                    class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Sort By */}
              <div>
                <label class="mb-1 block text-sm font-medium text-text-secondary">
                  Sort By
                </label>
                <select
                  value={props.advancedFilters.sortBy}
                  onChange={(e) =>
                    props.onAdvancedFilterChange(
                      'sortBy',
                      e.currentTarget.value as AdvancedFilters['sortBy']
                    )
                  }
                  class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                >
                  <option value="createdAt">Date</option>
                  <option value="totalPrice">Total Price</option>
                  <option value="clientName">Client Name</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label class="mb-1 block text-sm font-medium text-text-secondary">
                  Order
                </label>
                <select
                  value={props.advancedFilters.sortOrder}
                  onChange={(e) =>
                    props.onAdvancedFilterChange(
                      'sortOrder',
                      e.currentTarget.value as AdvancedFilters['sortOrder']
                    )
                  }
                  class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                >
                  <option value="desc">Newest First / High to Low</option>
                  <option value="asc">Oldest First / Low to High</option>
                </select>
              </div>
            </div>
          </CardBody>
        </Card>
      </Show>
    </>
  );
}
