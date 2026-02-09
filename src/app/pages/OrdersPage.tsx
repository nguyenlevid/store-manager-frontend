import { createSignal, createResource, Show, For } from 'solid-js';
import { Button } from '@/shared/ui/Button';
import { Card, CardBody } from '@/shared/ui';
import { getTransactions, getPendingTransactions } from '@/shared/api';
import type {
  Transaction,
  TransactionStatus,
} from '@/shared/types/transaction.types';

export default function OrdersPage() {
  const [filter, setFilter] = createSignal<TransactionStatus | 'all'>('all');

  // Fetch transactions based on filter
  const [transactions, { refetch }] = createResource(
    () => filter(),
    async (filterType) => {
      if (filterType === 'pending') return getPendingTransactions();
      if (filterType === 'all') return getTransactions();
      return getTransactions({ status: filterType });
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

  const getStatusColor = (status: TransactionStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-status-warning-bg text-status-warning-text';
      case 'completed':
        return 'bg-status-success-bg text-status-success-text';
      case 'cancelled':
        return 'bg-status-danger-bg text-status-danger-text';
      default:
        return 'bg-bg-subtle text-text-secondary';
    }
  };

  return (
    <div class="space-y-6 py-8">
      {/* Header */}
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold text-text-primary">Orders</h1>
          <p class="mt-2 text-sm text-text-secondary">
            Track and manage sales transactions with your clients
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
          New Order
        </Button>
      </div>

      {/* Filters */}
      <div class="mb-6 flex flex-wrap gap-2">
        <Button
          onClick={() => setFilter('all')}
          variant={filter() === 'all' ? 'primary' : 'outline'}
        >
          All Orders
        </Button>
        <Button
          onClick={() => setFilter('pending')}
          variant={filter() === 'pending' ? 'primary' : 'outline'}
        >
          Pending
        </Button>
        <Button
          onClick={() => setFilter('completed')}
          variant={filter() === 'completed' ? 'primary' : 'outline'}
        >
          Completed
        </Button>
        <Button
          onClick={() => setFilter('cancelled')}
          variant={filter() === 'cancelled' ? 'primary' : 'outline'}
        >
          Cancelled
        </Button>
      </div>

      {/* Transactions List */}
      <Card>
        <CardBody>
          <Show
            when={!transactions.loading}
            fallback={
              <div class="py-12 text-center">
                <p class="text-text-secondary">Loading orders...</p>
              </div>
            }
          >
            <Show
              when={transactions.error}
              fallback={
                <Show
                  when={transactions()?.length ?? 0 > 0}
                  fallback={
                    <div class="py-12 text-center">
                      <p class="text-text-secondary">No orders found</p>
                    </div>
                  }
                >
                  <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-border-default">
                      <thead class="bg-bg-subtle">
                        <tr>
                          <th class="px-6 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                            Order ID
                          </th>
                          <th class="px-6 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                            Client
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
                        <For each={transactions()}>
                          {(transaction: Transaction) => (
                            <tr class="transition-colors hover:bg-bg-hover">
                              <td class="whitespace-nowrap px-6 py-4 font-mono text-sm text-text-primary">
                                {transaction.id.slice(0, 8)}...
                              </td>
                              <td class="whitespace-nowrap px-6 py-4 text-sm text-text-primary">
                                {transaction.clientName || 'Unknown'}
                              </td>
                              <td class="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                                {transaction.items.length} items
                              </td>
                              <td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-text-primary">
                                {formatCurrency(transaction.totalPrice)}
                              </td>
                              <td class="whitespace-nowrap px-6 py-4">
                                <span
                                  class={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(
                                    transaction.status
                                  )}`}
                                >
                                  {transaction.status
                                    .replace(/([A-Z])/g, ' $1')
                                    .trim()}
                                </span>
                              </td>
                              <td class="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                                {formatDate(transaction.createdAt)}
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
                  Error: {transactions.error?.message}
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
