import { Show, For } from 'solid-js';
import { Button } from '@/shared/ui/Button';
import { Card, CardBody, CopyableId } from '@/shared/ui';
import type { Transaction } from '@/shared/types/transaction.types';
import { getStatusColor } from './orderStatusUtils';
import type { FormatCurrencyFn, FormatDateFn } from './types';

interface PaginationInfo {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

interface OrdersTableProps {
  transactions: Transaction[];
  loading: boolean;
  error: any;
  searchTerm: string;
  rawTransactionCount: number;
  paginationInfo: PaginationInfo | null;
  selectedOrders: Set<string>;
  formatCurrency: FormatCurrencyFn;
  formatDate: FormatDateFn;
  onToggleSelectAll: () => void;
  onToggleOrderSelection: (orderId: string) => void;
  onViewDetail: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onLoadMore: () => void;
  onRetry: () => void;
}

export function OrdersTable(props: OrdersTableProps) {
  return (
    <Card>
      <CardBody>
        <Show
          when={!props.loading}
          fallback={
            <div class="py-12 text-center">
              <p class="text-text-secondary">Loading orders...</p>
            </div>
          }
        >
          <Show
            when={!props.error}
            fallback={
              <div class="py-12 text-center">
                <p class="text-status-error-text">
                  Error: {props.error?.message || 'Failed to load orders'}
                </p>
                <Button variant="primary" onClick={props.onRetry} class="mt-4">
                  Retry
                </Button>
              </div>
            }
          >
            <Show
              when={props.transactions.length > 0}
              fallback={
                <div class="py-12 text-center">
                  <p class="text-text-secondary">
                    {props.searchTerm
                      ? 'No orders match your search'
                      : 'No orders found'}
                  </p>
                </div>
              }
            >
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-border-default">
                  <thead class="bg-bg-subtle">
                    <tr>
                      <th class="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={
                            props.selectedOrders.size ===
                              props.transactions.length &&
                            props.transactions.length > 0
                          }
                          onChange={props.onToggleSelectAll}
                          class="h-4 w-4 rounded border-border-default text-accent-primary focus:ring-accent-primary"
                        />
                      </th>
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
                      <th class="px-6 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border-default bg-bg-surface">
                    <For each={props.transactions}>
                      {(transaction: Transaction) => (
                        <tr
                          class={`transition-colors hover:bg-bg-hover ${props.selectedOrders.has(transaction.id) ? 'bg-accent-primary/5' : ''}`}
                        >
                          <td class="whitespace-nowrap px-4 py-4">
                            <input
                              type="checkbox"
                              checked={props.selectedOrders.has(transaction.id)}
                              onChange={() =>
                                props.onToggleOrderSelection(transaction.id)
                              }
                              class="h-4 w-4 rounded border-border-default text-accent-primary focus:ring-accent-primary"
                            />
                          </td>
                          <td class="whitespace-nowrap px-6 py-4 text-sm text-text-primary">
                            <CopyableId id={transaction.id} />
                          </td>
                          <td class="whitespace-nowrap px-6 py-4 text-sm text-text-primary">
                            {transaction.clientName || 'Unknown'}
                          </td>
                          <td class="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                            {transaction.items.length} items
                          </td>
                          <td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-text-primary">
                            {props.formatCurrency(transaction.totalPrice)}
                          </td>
                          <td class="whitespace-nowrap px-6 py-4">
                            <span
                              class={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(transaction.status)}`}
                            >
                              {transaction.status}
                            </span>
                          </td>
                          <td class="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                            {props.formatDate(transaction.createdAt)}
                          </td>
                          <td class="whitespace-nowrap px-6 py-4">
                            <div class="flex gap-2">
                              <button
                                onClick={() => props.onViewDetail(transaction)}
                                class="hover:text-accent-hover text-accent-primary transition-colors"
                                title="View details"
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
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width={2}
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                  />
                                </svg>
                              </button>
                              <Show
                                when={
                                  transaction.status !== 'cancelled' &&
                                  !transaction.itemsDeliveredDate
                                }
                              >
                                <button
                                  onClick={() => props.onEdit(transaction)}
                                  class="hover:text-accent-hover text-accent-primary transition-colors"
                                  title="Edit order"
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
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                </button>
                              </Show>
                              <Show
                                when={
                                  transaction.itemsDeliveredDate &&
                                  transaction.status !== 'cancelled'
                                }
                              >
                                <button
                                  disabled
                                  class="cursor-not-allowed text-text-secondary opacity-50"
                                  title="Cannot edit - items already delivered. Unmark items first to edit."
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
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                </button>
                              </Show>
                              <button
                                onClick={() => props.onDelete(transaction)}
                                class="text-status-error-text transition-colors hover:text-red-700"
                                title="Delete order"
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
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
          </Show>
        </Show>

        {/* Pagination Controls */}
        <Show when={props.paginationInfo}>
          {(pagination) => (
            <div class="flex flex-col gap-2 border-t border-border-default px-6 py-4">
              <div class="flex items-center justify-between">
                <div class="text-sm text-text-secondary">
                  <Show
                    when={
                      props.searchTerm &&
                      props.transactions.length < props.rawTransactionCount
                    }
                    fallback={
                      <>
                        Showing{' '}
                        <span class="font-medium text-text-primary">
                          {props.transactions.length}
                        </span>{' '}
                        of{' '}
                        <span class="font-medium text-text-primary">
                          {pagination().total}
                        </span>{' '}
                        orders
                        {pagination().pages > 1 && (
                          <span>
                            {' '}
                            (Page {pagination().page} of {pagination().pages})
                          </span>
                        )}
                      </>
                    }
                  >
                    <span class="font-medium text-text-primary">
                      {props.transactions.length}
                    </span>{' '}
                    orders match your search
                    <span class="text-text-tertiary ml-1">
                      ({props.rawTransactionCount} on this page,{' '}
                      {pagination().total} total)
                    </span>
                  </Show>
                </div>
                <Show when={pagination().page < pagination().pages}>
                  <Button onClick={props.onLoadMore} disabled={props.loading}>
                    {props.loading ? 'Loading...' : 'Load More'}
                  </Button>
                </Show>
              </div>
              <Show
                when={
                  props.searchTerm &&
                  props.transactions.length < props.rawTransactionCount
                }
              >
                <div class="text-xs text-accent-primary">
                  Clear search to see all {props.rawTransactionCount} orders on
                  this page
                </div>
              </Show>
            </div>
          )}
        </Show>
      </CardBody>
    </Card>
  );
}
