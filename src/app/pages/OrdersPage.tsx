import { createSignal, createResource, Show, createEffect } from 'solid-js';
import { createStore } from 'solid-js/store';
import { useSearchParams } from '@solidjs/router';
import { Button } from '@/shared/ui/Button';
import { can } from '@/shared/stores/permissions.store';
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
import { getErrorMessage } from '@/shared/lib/error-messages';
import {
  formatCurrency as sharedFormatCurrency,
  formatDate as sharedFormatDate,
} from '@/shared/lib/format';
import { getBusiness } from '@/shared/stores/business.store';
import type { Transaction } from '@/shared/types/transaction.types';
import {
  OrdersTable,
  OrderFiltersBar,
  OrderSelectionBar,
  OrderFormModal,
  OrderDetailModal,
  DeleteOrderModal,
  ConfirmActionModal,
  handlePrintReceipts as printOrders,
} from './orders';
import type {
  ModalMode,
  ConfirmAction,
  FormItem,
  AdvancedFilters,
} from './orders';

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [filter, setFilter] = createSignal<
    'all' | 'pending' | 'completed' | 'cancelled'
  >('all');
  const [searchTerm, setSearchTerm] = createSignal('');
  const [currentPage, setCurrentPage] = createSignal(1);
  const [paginationInfo, setPaginationInfo] = createSignal<{
    total: number;
    page: number;
    pages: number;
    limit: number;
  } | null>(null);

  // Modal state
  const [modalMode, setModalMode] = createSignal<ModalMode>(null);
  const [selectedTransaction, setSelectedTransaction] =
    createSignal<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [confirmAction, setConfirmAction] = createSignal<ConfirmAction | null>(
    null
  );

  // Filter state
  const [showAdvancedFilters, setShowAdvancedFilters] = createSignal(false);
  const [advancedFilters, setAdvancedFilters] = createSignal<AdvancedFilters>({
    clientId: '',
    dateFrom: '',
    dateTo: '',
    priceMin: '',
    priceMax: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Multi-select state
  const [selectedOrders, setSelectedOrders] = createSignal<Set<string>>(
    new Set()
  );
  const [printMode, setPrintMode] = createSignal<'report' | 'receipt'>(
    'report'
  );

  // Form state
  const [clientId, setClientId] = createSignal<string>('');
  const [formItems, setFormItems] = createStore<FormItem[]>([]);

  // Resources
  const [clients] = createResource(() => getClients());
  const [items] = createResource(() => getInventoryItems());
  const business = getBusiness;

  // Fetch transactions with all filters
  const [transactions, { refetch }] = createResource(
    () => {
      const advFilters = advancedFilters();
      return {
        status: filter() === 'all' ? undefined : filter(),
        search: searchTerm() || undefined,
        clientId: advFilters.clientId || undefined,
        dateFrom: advFilters.dateFrom || undefined,
        dateTo: advFilters.dateTo || undefined,
        priceMin: advFilters.priceMin
          ? parseFloat(advFilters.priceMin)
          : undefined,
        priceMax: advFilters.priceMax
          ? parseFloat(advFilters.priceMax)
          : undefined,
        sortBy: advFilters.sortBy,
        sortOrder: advFilters.sortOrder,
        page: currentPage(),
        limit: 20,
      };
    },
    async (filters) => {
      const response = await getTransactionsWithPagination(filters);
      setPaginationInfo(response.pagination);
      return response.transactions;
    }
  );

  // Debounced search
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;
  const handleSearchChange = (value: string) => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      setSearchTerm(value);
      setCurrentPage(1);
    }, 300);
  };

  // Filter handlers
  const handleAdvancedFilterChange = <K extends keyof AdvancedFilters>(
    key: K,
    value: AdvancedFilters[K]
  ) => {
    setAdvancedFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      clientId: '',
      dateFrom: '',
      dateTo: '',
      priceMin: '',
      priceMax: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    setSearchTerm('');
    setCurrentPage(1);
  };

  const changeFilter = (
    newFilter: 'all' | 'pending' | 'completed' | 'cancelled'
  ) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const loadMore = () => {
    const pagination = paginationInfo();
    if (pagination && currentPage() < pagination.pages) {
      setCurrentPage(currentPage() + 1);
    }
  };

  const filteredTransactions = () => transactions() || [];

  // Multi-select handlers
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    const filtered = filteredTransactions();
    const currentSelected = selectedOrders();
    if (currentSelected.size === filtered.length && filtered.length > 0) {
      setSelectedOrders(new Set<string>());
    } else {
      setSelectedOrders(new Set<string>(filtered.map((t) => t.id)));
    }
  };

  const clearSelection = () => setSelectedOrders(new Set<string>());

  // Print handler delegating to extracted utility
  const handlePrintReceipts = () => {
    const selected = selectedOrders();
    if (selected.size === 0) return;

    const ordersToPrint = filteredTransactions().filter((t) =>
      selected.has(t.id)
    );
    const businessInfo = business();
    printOrders(ordersToPrint, printMode(), {
      name: businessInfo?.name,
      address: businessInfo?.address,
      phoneNumber: businessInfo?.phoneNumber,
      email: businessInfo?.email,
    });
  };

  const formatCurrency = (amount: number) =>
    sharedFormatCurrency(amount, business()?.currency);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return sharedFormatDate(dateString, business()?.timezone);
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

  const openDetailModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setError(null);
    setModalMode('detail');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedTransaction(null);
    setError(null);
    setConfirmAction(null);
    if (searchParams['id']) {
      setSearchParams({ id: undefined });
    }
  };

  const showConfirmation = (action: ConfirmAction) => {
    setConfirmAction(action);
    setModalMode('confirm-action');
    setError(null);
  };

  // CRUD Operations
  const handleCreate = async () => {
    if (formItems.length === 0 || formItems.some((i) => !i.itemId)) {
      setError('At least one valid item is required');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await createTransaction({
        clientId: clientId() || undefined,
        items: formItems.map((item) => ({
          itemId: item.itemId,
          quantity: parseInt(item.quantity) || 0,
          unitPrice: parseFloat(item.unitPrice) || 0,
        })),
      });
      await refetch();
      closeModal();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedTransaction()) return;
    if (formItems.length === 0 || formItems.some((i) => !i.itemId)) {
      setError('At least one valid item is required');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await updateTransaction(selectedTransaction()!.id, {
        clientId: clientId() || undefined,
        items: formItems.map((item) => ({
          itemId: item.itemId,
          quantity: parseInt(item.quantity) || 0,
          unitPrice: parseFloat(item.unitPrice) || 0,
        })),
      });
      await refetch();
      closeModal();
    } catch (err: any) {
      setError(getErrorMessage(err));
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
      setError(getErrorMessage(err));
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
      alert(getErrorMessage(err));
    }
  };

  const handleUnmarkDelivered = async (transactionId: string) => {
    try {
      await apiClient.patch(`/transaction/${transactionId}/action`, {
        action: 'unmarkItemsDelivered',
      });
      await refetch();
    } catch (err: any) {
      alert(getErrorMessage(err));
    }
  };

  const handleCompletePayment = async (transactionId: string) => {
    try {
      await completeTransactionPayment(transactionId);
      await refetch();
    } catch (err: any) {
      alert(getErrorMessage(err));
    }
  };

  const handleUnmarkPayment = async (transactionId: string) => {
    try {
      await apiClient.patch(`/transaction/${transactionId}/action`, {
        action: 'unmarkPaymentCompleted',
      });
      await refetch();
    } catch (err: any) {
      alert(getErrorMessage(err));
    }
  };

  const handleCompleteTransaction = async (transactionId: string) => {
    try {
      await completeTransaction(transactionId);
      await refetch();
    } catch (err: any) {
      alert(getErrorMessage(err));
    }
  };

  const handleCancelTransaction = async (transactionId: string) => {
    try {
      await cancelTransaction(transactionId);
      await refetch();
    } catch (err: any) {
      alert(getErrorMessage(err));
    }
  };

  const handleMarkPending = async (transactionId: string) => {
    try {
      await markTransactionPending(transactionId);
      await refetch();
    } catch (err: any) {
      alert(getErrorMessage(err));
    }
  };

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
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle URL query params
  createEffect(() => {
    if (searchParams['action'] === 'create') {
      openCreateModal();
      setSearchParams({ action: undefined });
    }
  });

  createEffect(() => {
    const orderId = searchParams['id'];
    if (orderId && transactions()) {
      const order = transactions()?.find((t) => t.id === orderId);
      if (order) {
        setSelectedTransaction(order);
        setModalMode('detail');
      }
    }
  });

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
        <Show when={can('transactions', 'create')}>
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
        </Show>
      </div>

      {/* Filters */}
      <OrderFiltersBar
        filter={filter()}
        showAdvancedFilters={showAdvancedFilters()}
        advancedFilters={advancedFilters()}
        clients={clients()}
        onFilterChange={changeFilter}
        onSearchChange={handleSearchChange}
        onToggleAdvancedFilters={() =>
          setShowAdvancedFilters(!showAdvancedFilters())
        }
        onAdvancedFilterChange={handleAdvancedFilterChange}
        onResetAdvancedFilters={clearAdvancedFilters}
      />

      {/* Selection Actions */}
      <Show when={selectedOrders().size > 0}>
        <OrderSelectionBar
          selectedCount={selectedOrders().size}
          printMode={printMode()}
          onClearSelection={clearSelection}
          onSetPrintMode={setPrintMode}
          onPrint={handlePrintReceipts}
        />
      </Show>

      {/* Orders Table */}
      <OrdersTable
        transactions={filteredTransactions()}
        loading={transactions.loading}
        error={transactions.error}
        searchTerm={searchTerm()}
        rawTransactionCount={transactions()?.length || 0}
        paginationInfo={paginationInfo()}
        selectedOrders={selectedOrders()}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        onToggleSelectAll={toggleSelectAll}
        onToggleOrderSelection={toggleOrderSelection}
        onViewDetail={openDetailModal}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
        onLoadMore={loadMore}
        onRetry={() => refetch()}
      />

      {/* Create/Edit Modal */}
      <Show when={modalMode() === 'create' || modalMode() === 'edit'}>
        <OrderFormModal
          mode={modalMode() as 'create' | 'edit'}
          clientId={clientId()}
          setClientId={setClientId}
          formItems={formItems}
          setFormItems={setFormItems}
          clients={clients()}
          items={items()}
          error={error()}
          isSubmitting={isSubmitting()}
          formatCurrency={formatCurrency}
          onSubmit={modalMode() === 'create' ? handleCreate : handleUpdate}
          onClose={closeModal}
        />
      </Show>

      {/* Delete Modal */}
      <Show when={modalMode() === 'delete'}>
        <DeleteOrderModal
          error={error()}
          isSubmitting={isSubmitting()}
          onDelete={handleDelete}
          onClose={closeModal}
        />
      </Show>

      {/* Detail Modal */}
      <Show when={modalMode() === 'detail' && selectedTransaction()}>
        <OrderDetailModal
          transaction={selectedTransaction()!}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          onClose={closeModal}
          showConfirmation={showConfirmation}
          handleMarkPending={handleMarkPending}
        />
      </Show>

      {/* Confirmation Modal */}
      <Show when={modalMode() === 'confirm-action' && confirmAction()}>
        <ConfirmActionModal
          action={confirmAction()!}
          error={error()}
          isSubmitting={isSubmitting()}
          onConfirm={executeConfirmedAction}
          onClose={closeModal}
        />
      </Show>
    </div>
  );
}
