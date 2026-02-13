import { createSignal, createResource, Show, For, Index } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Button } from '@/shared/ui/Button';
import { Card, CardBody, CopyableId } from '@/shared/ui';
import {
  getTransactionsWithPagination,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  markItemsDelivered,
  completeTransactionPayment,
  completeTransaction,
  cancelTransaction,
  markTransactionPending,
} from '@/shared/api';
import { getClients, getInventoryItems } from '@/shared/api';
import { apiClient } from '@/shared/lib/api-client';
import type { Transaction } from '@/shared/types/transaction.types';

type ModalMode =
  | 'create'
  | 'edit'
  | 'delete'
  | 'detail'
  | 'confirm-action'
  | null;

interface ConfirmAction {
  type:
    | 'markDelivered'
    | 'completePayment'
    | 'completeTransaction'
    | 'cancelTransaction'
    | 'unmarkDelivered'
    | 'unmarkPayment';
  transactionId: string;
  message: string;
}

interface FormItem {
  itemId: string;
  quantity: string;
  unitPrice: string;
}

export default function OrdersPage() {
  const [filter, setFilter] = createSignal<
    'all' | 'pending' | 'completed' | 'cancelled'
  >('all');
  const [searchTerm, setSearchTerm] = createSignal('');
  const [currentPage, setCurrentPage] = createSignal(1);
  const [paginationInfo, setPaginationInfo] = createSignal<any>(null);
  const [modalMode, setModalMode] = createSignal<ModalMode>(null);
  const [selectedTransaction, setSelectedTransaction] =
    createSignal<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [confirmAction, setConfirmAction] = createSignal<ConfirmAction | null>(
    null
  );

  // Form state
  const [clientId, setClientId] = createSignal<string>('');
  const [formItems, setFormItems] = createStore<FormItem[]>([]);

  // Resources
  const [clients] = createResource(() => getClients());
  const [items] = createResource(() => getInventoryItems());

  // Fetch transactions based on filter with pagination
  const [transactions, { refetch }] = createResource(
    () => ({ filter: filter(), page: currentPage() }),
    async ({ filter: filterType, page }) => {
      const status = filterType === 'all' ? undefined : filterType;
      const response = await getTransactionsWithPagination({
        status,
        page,
        limit: 20,
      });
      setPaginationInfo(response.pagination);
      return response.transactions;
    }
  );

  // Reset to page 1 when filter changes
  const changeFilter = (
    newFilter: 'all' | 'pending' | 'completed' | 'cancelled'
  ) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  // Load more (next page)
  const loadMore = () => {
    const pagination = paginationInfo();
    if (pagination && currentPage() < pagination.pages) {
      setCurrentPage(currentPage() + 1);
    }
  };

  // Filter transactions by search term
  const filteredTransactions = () => {
    const txs = transactions() || [];
    const search = searchTerm().toLowerCase();

    if (!search) return txs;

    // Extract digits from search for phone number matching
    const searchDigits = search.replace(/\D/g, '');

    const filtered = txs.filter((txn: Transaction) => {
      // For phone numbers, compare digits only
      const phoneMatch =
        txn.clientPhoneNumber && searchDigits.length > 0
          ? txn.clientPhoneNumber.replace(/\D/g, '').includes(searchDigits)
          : false;

      return (
        txn.id.toLowerCase().includes(search) ||
        txn.clientName?.toLowerCase().includes(search) ||
        txn.clientEmail?.toLowerCase().includes(search) ||
        phoneMatch ||
        txn.status.toLowerCase().includes(search) ||
        txn.totalPrice.toString().includes(search) ||
        new Date(txn.createdAt).toLocaleDateString().includes(search)
      );
    });

    return filtered;
  };

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

  // Modal handlers
  const openCreateModal = () => {
    setClientId('');
    setFormItems([{ itemId: '', quantity: '1', unitPrice: '0' }]);
    setError(null);
    setModalMode('create');
  };

  const openEditModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setClientId(transaction.clientId || '');
    setFormItems(
      transaction.items.map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
      }))
    );
    setError(null);
    setModalMode('edit');
  };

  const openDeleteModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setError(null);
    setModalMode('delete');
  };

  const openDetailModal = async (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setError(null);
    setModalMode('detail');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedTransaction(null);
    setError(null);
    setConfirmAction(null);
  };

  // Show confirmation modal
  const showConfirmation = (action: ConfirmAction) => {
    setConfirmAction(action);
    setModalMode('confirm-action');
    setError(null);
  };

  // Form handlers
  const addFormItem = () => {
    setFormItems(formItems.length, {
      itemId: '',
      quantity: '1',
      unitPrice: '0',
    });
  };

  const removeFormItem = (index: number) => {
    setFormItems((items) => items.filter((_, i) => i !== index));
  };

  const updateFormItem = (index: number, field: keyof FormItem, value: any) => {
    setFormItems(index, field, value);
  };

  const calculateTotal = () => {
    return formItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
  };

  // CRUD Operations
  const handleCreate = async () => {
    if (!clientId()) {
      setError('Client is required');
      return;
    }

    if (formItems.length === 0 || formItems.some((i) => !i.itemId)) {
      setError('At least one valid item is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createTransaction({
        clientId: clientId(),
        items: formItems.map((item) => ({
          itemId: item.itemId,
          quantity: parseInt(item.quantity) || 0,
          unitPrice: parseFloat(item.unitPrice) || 0,
        })),
      });
      await refetch();
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedTransaction()) return;

    if (!clientId()) {
      setError('Client is required');
      return;
    }

    if (formItems.length === 0 || formItems.some((i) => !i.itemId)) {
      setError('At least one valid item is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await updateTransaction(selectedTransaction()!.id, {
        clientId: clientId(),
        items: formItems.map((item) => ({
          itemId: item.itemId,
          quantity: parseInt(item.quantity) || 0,
          unitPrice: parseFloat(item.unitPrice) || 0,
        })),
      });
      await refetch();
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Failed to update order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTransaction()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await deleteTransaction(selectedTransaction()!.id);
      await refetch();
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Failed to delete order');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action handlers
  const handleMarkDelivered = async (transactionId: string) => {
    try {
      await markItemsDelivered(transactionId);
      await refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to mark items as delivered');
    }
  };

  const handleUnmarkDelivered = async (transactionId: string) => {
    try {
      await apiClient.patch(`/transaction/${transactionId}/action`, {
        action: 'unmarkItemsDelivered',
      });
      await refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to unmark items as delivered');
    }
  };

  const handleCompletePayment = async (transactionId: string) => {
    try {
      await completeTransactionPayment(transactionId);
      await refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to complete payment');
    }
  };

  const handleUnmarkPayment = async (transactionId: string) => {
    try {
      await apiClient.patch(`/transaction/${transactionId}/action`, {
        action: 'unmarkPaymentCompleted',
      });
      await refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to unmark payment');
    }
  };

  const handleCompleteTransaction = async (transactionId: string) => {
    try {
      await completeTransaction(transactionId);
      await refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to complete order');
    }
  };

  const handleCancelTransaction = async (transactionId: string) => {
    try {
      await cancelTransaction(transactionId);
      await refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel order');
    }
  };

  const handleMarkPending = async (transactionId: string) => {
    try {
      await markTransactionPending(transactionId);
      await refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to mark as pending');
    }
  };

  // Execute confirmed action
  const executeConfirmedAction = async () => {
    const action = confirmAction();
    if (!action) return;

    setIsSubmitting(true);
    setError(null);

    try {
      switch (action.type) {
        case 'markDelivered':
          await handleMarkDelivered(action.transactionId);
          break;
        case 'unmarkDelivered':
          await handleUnmarkDelivered(action.transactionId);
          break;
        case 'completePayment':
          await handleCompletePayment(action.transactionId);
          break;
        case 'unmarkPayment':
          await handleUnmarkPayment(action.transactionId);
          break;
        case 'completeTransaction':
          await handleCompleteTransaction(action.transactionId);
          break;
        case 'cancelTransaction':
          await handleCancelTransaction(action.transactionId);
          break;
      }
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
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
        <Button variant="primary" onClick={openCreateModal}>
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

      {/* Search and Filters */}
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex gap-2">
          <Button
            variant={filter() === 'all' ? 'primary' : 'outline'}
            onClick={() => changeFilter('all')}
          >
            All Orders
          </Button>
          <Button
            variant={filter() === 'pending' ? 'primary' : 'outline'}
            onClick={() => changeFilter('pending')}
          >
            Pending
          </Button>
          <Button
            variant={filter() === 'completed' ? 'primary' : 'outline'}
            onClick={() => changeFilter('completed')}
          >
            Completed
          </Button>
          <Button
            variant={filter() === 'cancelled' ? 'primary' : 'outline'}
            onClick={() => changeFilter('cancelled')}
          >
            Cancelled
          </Button>
        </div>

        <div class="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search by ID, client, email, phone..."
            value={searchTerm()}
            onInput={(e) => setSearchTerm(e.currentTarget.value)}
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
              when={!transactions.error}
              fallback={
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
              }
            >
              <Show
                when={filteredTransactions().length > 0}
                fallback={
                  <div class="py-12 text-center">
                    <p class="text-text-secondary">
                      {searchTerm()
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
                      <For each={filteredTransactions()}>
                        {(transaction: Transaction) => (
                          <tr class="transition-colors hover:bg-bg-hover">
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
                              {formatCurrency(transaction.totalPrice)}
                            </td>
                            <td class="whitespace-nowrap px-6 py-4">
                              <span
                                class={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(
                                  transaction.status
                                )}`}
                              >
                                {transaction.status}
                              </span>
                            </td>
                            <td class="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                              {formatDate(transaction.createdAt)}
                            </td>
                            <td class="whitespace-nowrap px-6 py-4">
                              <div class="flex gap-2">
                                <button
                                  onClick={() => openDetailModal(transaction)}
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
                                    onClick={() => openEditModal(transaction)}
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
                                  onClick={() => openDeleteModal(transaction)}
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
          <Show when={paginationInfo()}>
            {(pagination) => (
              <div class="flex flex-col gap-2 border-t border-border-default px-6 py-4">
                <div class="flex items-center justify-between">
                  <div class="text-sm text-text-secondary">
                    <Show
                      when={
                        searchTerm() &&
                        filteredTransactions().length <
                          (transactions()?.length || 0)
                      }
                      fallback={
                        <>
                          Showing{' '}
                          <span class="font-medium text-text-primary">
                            {filteredTransactions().length}
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
                        {filteredTransactions().length}
                      </span>{' '}
                      orders match your search
                      <span class="text-text-tertiary ml-1">
                        ({transactions()?.length || 0} on this page,{' '}
                        {pagination().total} total)
                      </span>
                    </Show>
                  </div>
                  <Show when={pagination().page < pagination().pages}>
                    <Button onClick={loadMore} disabled={transactions.loading}>
                      {transactions.loading ? 'Loading...' : 'Load More'}
                    </Button>
                  </Show>
                </div>
                <Show
                  when={
                    searchTerm() &&
                    filteredTransactions().length <
                      (transactions()?.length || 0)
                  }
                >
                  <div class="text-xs text-accent-primary">
                    💡 Clear search to see all {transactions()?.length || 0}{' '}
                    orders on this page
                  </div>
                </Show>
              </div>
            )}
          </Show>
        </CardBody>
      </Card>

      {/* Create/Edit Modal */}
      <Show when={modalMode() === 'create' || modalMode() === 'edit'}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-bg-surface p-6 shadow-xl">
            <h2 class="mb-4 text-xl font-bold text-text-primary">
              {modalMode() === 'create' ? 'Create New Order' : 'Edit Order'}
            </h2>

            <Show when={error()}>
              <div class="bg-status-error-bg text-status-error-text mb-4 rounded-lg p-3 text-sm">
                {error()}
              </div>
            </Show>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                modalMode() === 'create' ? handleCreate() : handleUpdate();
              }}
              class="space-y-4"
            >
              {/* Client Selection */}
              <div>
                <label class="mb-2 block text-sm font-medium text-text-primary">
                  Client *
                </label>
                <select
                  value={clientId()}
                  onInput={(e) => setClientId(e.currentTarget.value)}
                  required
                  class="w-full rounded-lg border border-border-default bg-bg-surface px-4 py-2 text-text-primary focus:border-accent-primary focus:outline-none"
                >
                  <option value="">Select a client...</option>
                  <For each={clients()}>
                    {(client) => (
                      <option value={client.id}>{client.partnerName}</option>
                    )}
                  </For>
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
                  <Index each={formItems}>
                    {(item, index) => (
                      <div class="flex gap-2 rounded-lg border border-border-default p-3">
                        <div class="flex-1">
                          <select
                            value={item().itemId}
                            onInput={(e) =>
                              updateFormItem(
                                index,
                                'itemId',
                                e.currentTarget.value
                              )
                            }
                            required
                            class="w-full rounded border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                          >
                            <option value="">Select item...</option>
                            <For each={items()}>
                              {(inventoryItem) => (
                                <option value={inventoryItem.id}>
                                  {inventoryItem.name} (Stock:{' '}
                                  {inventoryItem.quantity})
                                </option>
                              )}
                            </For>
                          </select>
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
                        <Show when={formItems.length > 1}>
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
                    {formatCurrency(calculateTotal())}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div class="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={isSubmitting()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting()}
                >
                  {isSubmitting()
                    ? 'Saving...'
                    : modalMode() === 'create'
                      ? 'Create Order'
                      : 'Update Order'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* Delete Modal */}
      <Show when={modalMode() === 'delete'}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div class="w-full max-w-md rounded-lg bg-bg-surface p-6 shadow-xl">
            <h2 class="mb-4 text-xl font-bold text-text-primary">
              Delete Order
            </h2>

            <Show when={error()}>
              <div class="bg-status-error-bg text-status-error-text mb-4 rounded-lg p-3 text-sm">
                {error()}
              </div>
            </Show>

            <p class="mb-6 text-text-secondary">
              Are you sure you want to delete this order? This action cannot be
              undone.
            </p>

            <div class="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={closeModal}
                disabled={isSubmitting()}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={isSubmitting()}
              >
                {isSubmitting() ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      </Show>

      {/* Detail Modal */}
      <Show when={modalMode() === 'detail' && selectedTransaction()}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-bg-surface p-6 shadow-xl">
            <div class="mb-4 flex items-start justify-between">
              <h2 class="text-xl font-bold text-text-primary">Order Details</h2>
              <button
                onClick={closeModal}
                class="text-text-secondary hover:text-text-primary"
              >
                <svg
                  class="h-6 w-6"
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

            {/* Order Info */}
            <div class="mb-6 grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-text-secondary">Order ID</p>
                <div class="text-sm font-medium text-text-primary">
                  <CopyableId id={selectedTransaction()!.id} />
                </div>
              </div>
              <div>
                <p class="text-sm text-text-secondary">Status</p>
                <span
                  class={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(
                    selectedTransaction()!.status
                  )}`}
                >
                  {selectedTransaction()!.status}
                </span>
              </div>
              <div>
                <p class="text-sm text-text-secondary">Client</p>
                <p class="font-medium text-text-primary">
                  {selectedTransaction()!.clientName || 'Unknown'}
                </p>
              </div>
              <div>
                <p class="text-sm text-text-secondary">Total Amount</p>
                <p class="text-lg font-bold text-text-primary">
                  {formatCurrency(selectedTransaction()!.totalPrice)}
                </p>
              </div>
              <div>
                <p class="text-sm text-text-secondary">Created At</p>
                <p class="text-sm text-text-primary">
                  {formatDate(selectedTransaction()!.createdAt)}
                </p>
              </div>
              <Show when={selectedTransaction()!.itemsDeliveredDate}>
                <div>
                  <p class="text-sm text-text-secondary">Items Delivered On</p>
                  <p class="text-sm text-text-primary">
                    {formatDate(selectedTransaction()!.itemsDeliveredDate)}
                  </p>
                </div>
              </Show>
              <Show when={selectedTransaction()!.paymentCompletedDate}>
                <div>
                  <p class="text-sm text-text-secondary">
                    Payment Completed On
                  </p>
                  <p class="text-sm text-text-primary">
                    {formatDate(selectedTransaction()!.paymentCompletedDate)}
                  </p>
                </div>
              </Show>
            </div>

            {/* Items List */}
            <div class="mb-6">
              <h3 class="mb-3 font-semibold text-text-primary">Order Items</h3>

              {/* Warning for items delivered */}
              <Show when={selectedTransaction()?.itemsDeliveredDate}>
                <div class="mb-3 rounded border-l-4 border-status-warning-text bg-status-warning-bg p-3">
                  <div class="flex items-start gap-2">
                    <svg
                      class="mt-0.5 h-5 w-5 flex-shrink-0 text-status-warning-text"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    <div>
                      <p class="text-sm font-medium text-status-warning-text">
                        Items cannot be edited
                      </p>
                      <p class="mt-1 text-xs text-text-secondary">
                        Items have been delivered and removed from inventory. To
                        edit items, you must first unmark them.
                      </p>
                    </div>
                  </div>
                </div>
              </Show>

              <div class="space-y-2">
                <For each={selectedTransaction()?.items}>
                  {(item) => (
                    <div class="flex justify-between rounded-lg border border-border-default p-3 hover:bg-bg-hover">
                      <div>
                        <p class="font-medium text-text-primary">
                          {item.itemName || `Item ${item.itemId.slice(-6)}`}
                        </p>
                        <p class="text-sm text-text-secondary">
                          Quantity: {item.quantity} ×{' '}
                          {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <div class="text-right">
                        <p class="font-semibold text-text-primary">
                          {formatCurrency(item.totalPrice)}
                        </p>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>

            {/* Action Buttons */}
            <Show when={selectedTransaction()?.status === 'pending'}>
              <div class="mt-6">
                <h3 class="mb-3 font-semibold text-text-primary">Actions</h3>
                <div class="space-y-3">
                  {/* Mark Items Delivered */}
                  <div class="bg-bg-subtle flex items-center justify-between rounded-lg p-3">
                    <div class="flex items-center gap-3">
                      <Show
                        when={selectedTransaction()?.itemsDeliveredDate}
                        fallback={
                          <svg
                            class="h-5 w-5 text-text-secondary"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        }
                      >
                        <svg
                          class="h-5 w-5 text-status-success-text"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clip-rule="evenodd"
                          />
                        </svg>
                      </Show>
                      <div>
                        <p class="font-medium text-text-primary">
                          Mark Items Delivered
                        </p>
                        <p class="text-sm text-text-secondary">
                          Remove items from inventory
                        </p>
                      </div>
                    </div>
                    <Show
                      when={selectedTransaction()?.itemsDeliveredDate}
                      fallback={
                        <Button
                          onClick={() => {
                            showConfirmation({
                              type: 'markDelivered',
                              transactionId: selectedTransaction()!.id,
                              message:
                                'This will remove the items from your inventory. Continue?',
                            });
                          }}
                          variant="primary"
                          size="sm"
                        >
                          Mark Delivered
                        </Button>
                      }
                    >
                      <Button
                        onClick={() => {
                          showConfirmation({
                            type: 'unmarkDelivered',
                            transactionId: selectedTransaction()!.id,
                            message:
                              'This will add the items back to inventory. Continue?',
                          });
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Unmark
                      </Button>
                    </Show>
                  </div>

                  {/* Complete Payment */}
                  <div class="bg-bg-subtle flex items-center justify-between rounded-lg p-3">
                    <div class="flex items-center gap-3">
                      <Show
                        when={selectedTransaction()?.paymentCompletedDate}
                        fallback={
                          <svg
                            class="h-5 w-5 text-text-secondary"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        }
                      >
                        <svg
                          class="h-5 w-5 text-status-success-text"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clip-rule="evenodd"
                          />
                        </svg>
                      </Show>
                      <div>
                        <p class="font-medium text-text-primary">
                          Complete Payment
                        </p>
                        <p class="text-sm text-text-secondary">
                          Mark payment from client as complete
                        </p>
                      </div>
                    </div>
                    <Show
                      when={selectedTransaction()?.paymentCompletedDate}
                      fallback={
                        <Button
                          onClick={() => {
                            showConfirmation({
                              type: 'completePayment',
                              transactionId: selectedTransaction()!.id,
                              message: 'Mark payment as completed?',
                            });
                          }}
                          variant="primary"
                          size="sm"
                        >
                          Mark Paid
                        </Button>
                      }
                    >
                      <Button
                        onClick={() => {
                          showConfirmation({
                            type: 'unmarkPayment',
                            transactionId: selectedTransaction()!.id,
                            message: 'Unmark payment as completed?',
                          });
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Unmark
                      </Button>
                    </Show>
                  </div>

                  {/* Quick Actions */}
                  <div class="flex flex-wrap gap-2 border-t border-border-default pt-3">
                    <Button
                      onClick={() => {
                        showConfirmation({
                          type: 'completeTransaction',
                          transactionId: selectedTransaction()!.id,
                          message: 'Mark this order as completed?',
                        });
                      }}
                      variant="primary"
                      size="sm"
                    >
                      Complete Order
                    </Button>
                    <Button
                      onClick={() => {
                        showConfirmation({
                          type: 'cancelTransaction',
                          transactionId: selectedTransaction()!.id,
                          message:
                            'Cancel this order? This action cannot be undone.',
                        });
                      }}
                      variant="danger"
                      size="sm"
                    >
                      Cancel Order
                    </Button>
                  </div>
                </div>
              </div>
            </Show>
            <Show when={selectedTransaction()?.status === 'cancelled'}>
              <div class="mt-6">
                <h3 class="mb-3 font-semibold text-text-primary">
                  Reactivate Order
                </h3>
                <p class="mb-3 text-sm text-text-secondary">
                  This will change the status back to pending, allowing you to
                  complete or modify the order.
                </p>
                <Button
                  onClick={() => {
                    handleMarkPending(selectedTransaction()!.id);
                    closeModal();
                  }}
                  variant="primary"
                  size="sm"
                >
                  Mark as Pending
                </Button>
              </div>
            </Show>
            <Show when={selectedTransaction()?.status === 'completed'}>
              <div class="mt-6">
                <h3 class="mb-3 font-semibold text-text-primary">
                  Reopen Order
                </h3>
                <p class="mb-3 text-sm text-text-secondary">
                  This will change the status back to pending. Dates (items
                  delivered, payment completed) will be preserved.
                </p>
                <div class="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      handleMarkPending(selectedTransaction()!.id);
                      closeModal();
                    }}
                    variant="primary"
                    size="sm"
                  >
                    Mark as Pending
                  </Button>
                </div>
              </div>
            </Show>
          </div>
        </div>
      </Show>

      {/* Confirmation Modal */}
      <Show when={modalMode() === 'confirm-action' && confirmAction()}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div class="w-full max-w-md rounded-lg bg-bg-surface p-6 shadow-xl">
            <h2 class="mb-4 text-xl font-bold text-text-primary">
              Confirm Action
            </h2>

            <Show when={error()}>
              <div class="bg-status-error-bg text-status-error-text mb-4 rounded-lg p-3 text-sm">
                {error()}
              </div>
            </Show>

            <p class="mb-6 text-text-secondary">{confirmAction()!.message}</p>

            <div class="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={closeModal}
                disabled={isSubmitting()}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={executeConfirmedAction}
                disabled={isSubmitting()}
              >
                {isSubmitting() ? 'Processing...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
