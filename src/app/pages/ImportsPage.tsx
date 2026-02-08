import { createSignal, createResource, Show, For } from 'solid-js';
import { Button } from '@/shared/ui/Button';
import { Card, CardBody } from '@/shared/ui';
import {
  getImports,
  getPendingImports,
  getCompletedImports,
} from '@/shared/api';
import type { Import } from '@/shared/types/import.types';

export default function ImportsPage() {
  const [filter, setFilter] = createSignal<'all' | 'pending' | 'done'>('all');

  // Fetch imports based on filter
  const [imports, { refetch }] = createResource(
    () => filter(),
    async (filterType) => {
      if (filterType === 'pending') return getPendingImports();
      if (filterType === 'done') return getCompletedImports();
      return getImports();
    }
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div class="space-y-6 py-8">
      {/* Header */}
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold text-text-primary">Imports</h1>
          <p class="mt-2 text-sm text-text-secondary">
            Manage purchase orders and stock replenishment from suppliers
          </p>
        </div>
        <Button variant="primary">
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
          New Import
        </Button>
      </div>

      {/* Filters */}
      <div class="flex gap-2">
        <Button
          variant={filter() === 'all' ? 'primary' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All Imports
        </Button>
        <Button
          variant={filter() === 'pending' ? 'primary' : 'outline'}
          onClick={() => setFilter('pending')}
        >
          Pending
        </Button>
        <Button
          variant={filter() === 'done' ? 'primary' : 'outline'}
          onClick={() => setFilter('done')}
        >
          Completed
        </Button>
      </div>

      {/* Imports List */}
      <Card>
        <CardBody>
          <Show
            when={!imports.loading}
            fallback={
              <div class="py-12 text-center">
                <p class="text-text-secondary">Loading imports...</p>
              </div>
            }
          >
            <Show
              when={imports.error}
              fallback={
                <Show
                  when={imports()?.length ?? 0 > 0}
                  fallback={
                    <div class="py-12 text-center">
                      <p class="text-text-secondary">No imports found</p>
                    </div>
                  }
                >
                  <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-border-default">
                      <thead class="bg-bg-subtle">
                        <tr>
                          <th class="px-6 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                            Import ID
                          </th>
                          <th class="px-6 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                            Supplier
                          </th>
                          <th class="px-6 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                            Items
                          </th>
                          <th class="px-6 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                            Total
                          </th>
                          <th class="px-6 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                            Status
                          </th>
                          <th class="px-6 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-border-default bg-bg-surface">
                        <For each={imports()}>
                          {(importRecord: Import) => (
                            <tr class="transition-colors hover:bg-bg-hover">
                              <td class="whitespace-nowrap px-6 py-4 font-mono text-sm text-text-primary">
                                {importRecord.id.slice(0, 8)}...
                              </td>
                              <td class="whitespace-nowrap px-6 py-4 text-sm text-text-primary">
                                {importRecord.supplierName || 'Unknown'}
                              </td>
                              <td class="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                                {importRecord.items.length} items
                              </td>
                              <td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-text-primary">
                                {formatCurrency(importRecord.totalPrice)}
                              </td>
                              <td class="whitespace-nowrap px-6 py-4">
                                <span
                                  class={`rounded-full px-2 py-1 text-xs font-semibold ${
                                    importRecord.status === 'done'
                                      ? 'bg-status-success-bg text-status-success-text'
                                      : 'bg-status-warning-bg text-status-warning-text'
                                  }`}
                                >
                                  {importRecord.status}
                                </span>
                              </td>
                              <td class="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                                {formatDate(
                                  importRecord.completedDate ||
                                    importRecord.createdAt
                                )}
                              </td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </Show>
              }
            >
              <div class="py-12 text-center">
                <p class="text-status-error-text">
                  Error: {imports.error?.message}
                </p>
                <Button
                  variant="primary"
                  onClick={() => refetch()}
                  class="mt-4"
                >
                  Retry
                </Button>
              </div>
            </Show>
          </Show>
        </CardBody>
      </Card>
    </div>
  );
}
