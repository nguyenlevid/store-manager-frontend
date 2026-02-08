import { createSignal, createResource, Show, For } from 'solid-js';
import { Button } from '@/shared/ui/Button';
import { Card, CardBody } from '@/shared/ui';
import { getPartners, getClients, getSuppliers } from '@/shared/api';
import type { Partner } from '@/shared/types/partner.types';

export default function ClientsPage() {
  const [filter, setFilter] = createSignal<'all' | 'client' | 'supplier'>(
    'all'
  );
  const [searchTerm, setSearchTerm] = createSignal('');

  // Fetch partners based on filter
  const [partners, { refetch }] = createResource(
    () => filter(),
    async (filterType) => {
      if (filterType === 'client') return getClients();
      if (filterType === 'supplier') return getSuppliers();
      return getPartners();
    }
  );

  // Filter partners by search term
  const filteredPartners = () => {
    const search = searchTerm().toLowerCase();
    if (!search) return partners() || [];

    return (partners() || []).filter(
      (p: Partner) =>
        p.partnerName.toLowerCase().includes(search) ||
        p.email?.toLowerCase().includes(search) ||
        p.phoneNumber.includes(search)
    );
  };

  return (
    <div class="space-y-6 py-8">
      {/* Header */}
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold text-text-primary">Partners</h1>
          <p class="mt-2 text-sm text-text-secondary">
            Manage your suppliers and clients (business partners)
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
          New Partner
        </Button>
      </div>

      {/* Filters */}
      <div class="flex flex-wrap gap-4">
        <div class="flex gap-2">
          <Button
            variant={filter() === 'all' ? 'primary' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All Partners
          </Button>
          <Button
            variant={filter() === 'supplier' ? 'primary' : 'outline'}
            onClick={() => setFilter('supplier')}
          >
            Suppliers
          </Button>
          <Button
            variant={filter() === 'client' ? 'primary' : 'outline'}
            onClick={() => setFilter('client')}
          >
            Clients
          </Button>
        </div>

        <input
          type="text"
          placeholder="Search partners..."
          value={searchTerm()}
          onInput={(e) => setSearchTerm(e.currentTarget.value)}
          class="rounded-lg border border-border-default bg-bg-surface px-4 py-2 text-text-primary focus:border-transparent focus:ring-2 focus:ring-accent-primary"
        />
      </div>

      {/* Partners List */}
      <Card>
        <CardBody>
          <Show
            when={!partners.loading}
            fallback={
              <div class="py-12 text-center">
                <p class="text-text-secondary">Loading partners...</p>
              </div>
            }
          >
            <Show
              when={partners.error}
              fallback={
                <Show
                  when={filteredPartners().length > 0}
                  fallback={
                    <div class="py-12 text-center">
                      <p class="text-text-secondary">No partners found</p>
                    </div>
                  }
                >
                  <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-border-default">
                      <thead class="bg-bg-subtle">
                        <tr>
                          <th class="px-6 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                            Name
                          </th>
                          <th class="px-6 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                            Type
                          </th>
                          <th class="px-6 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                            Phone
                          </th>
                          <th class="px-6 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                            Email
                          </th>
                          <th class="px-6 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                            Address
                          </th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-border-default bg-bg-surface">
                        <For each={filteredPartners()}>
                          {(partner: Partner) => (
                            <tr class="transition-colors hover:bg-bg-hover">
                              <td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-text-primary">
                                {partner.partnerName}
                              </td>
                              <td class="whitespace-nowrap px-6 py-4">
                                <span
                                  class={`rounded-full px-2 py-1 text-xs font-semibold ${
                                    partner.partnerType === 'supplier'
                                      ? 'bg-status-info-bg text-status-info-text'
                                      : 'bg-status-success-bg text-status-success-text'
                                  }`}
                                >
                                  {partner.partnerType}
                                </span>
                              </td>
                              <td class="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                                {partner.phoneNumber}
                              </td>
                              <td class="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                                {partner.email || 'N/A'}
                              </td>
                              <td class="max-w-xs truncate px-6 py-4 text-sm text-text-secondary">
                                {partner.address}
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
                  Error: {partners.error?.message}
                </p>
                <Button
                  onClick={() => refetch()}
                  variant="primary"
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
