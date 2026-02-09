import { createSignal, createResource, Show, For } from 'solid-js';
import { Button } from '@/shared/ui/Button';
import { Card, CardBody } from '@/shared/ui';
import {
  getImports,
  getPendingImports,
  getCompletedImports,
  getCancelledImports,
  createImport,
  updateImport,
  deleteImport,
  markItemsReceived,
  completeImportPayment,
  completeImport,
  cancelImport,
  markImportPending,
} from '@/shared/api';
import { getSuppliers, getInventoryItems } from '@/shared/api';
import { apiClient } from '@/shared/lib/api-client';
import type { Import, ImportFormData } from '@/shared/types/import.types';

type ModalMode = 'create' | 'edit' | 'delete' | 'detail' | 'confirm-action' | null;

interface ConfirmAction {
  type:
    | 'markReceived'
    | 'completePayment'
    | 'completeImport'
    | 'cancelImport'
    | 'unmarkReceived'
    | 'unmarkPayment';
  importId: string;
  message: string;
}

interface FormItem {
  itemId: string;
  quantity: number;
  unitPrice: number;
}

export default function ImportsPage() {
  const [filter, setFilter] = createSignal<
    'all' | 'pending' | 'completed' | 'cancelled'
  >('all');
  const [modalMode, setModalMode] = createSignal<ModalMode>(null);
  const [selectedImport, setSelectedImport] = createSignal<Import | null>(null);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [confirmAction, setConfirmAction] = createSignal<ConfirmAction | null>(
    null
  );

  // Form state
  const [supplierId, setSupplierId] = createSignal<string>('');
  const [formItems, setFormItems] = createSignal<FormItem[]>([]);

  // Resources
  const [suppliers] = createResource(() => getSuppliers());
  const [items] = createResource(() => getInventoryItems());

  // Fetch imports based on filter
  const [imports, { refetch }] = createResource(
    () => filter(),
    async (filterType) => {
      if (filterType === 'pending') return getPendingImports();
      if (filterType === 'completed') return getCompletedImports();
      if (filterType === 'cancelled') return getCancelledImports();
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

  // Modal handlers
  const openCreateModal = () => {
    setSupplierId('');
    setFormItems([{ itemId: '', quantity: 1, unitPrice: 0 }]);
    setError(null);
    setModalMode('create');
  };

  const openEditModal = (importRecord: Import) => {
    setSelectedImport(importRecord);
    setSupplierId(importRecord.supplierId || '');
    setFormItems(
      importRecord.items.map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }))
    );
    setError(null);
    setModalMode('edit');
  };

  const openDeleteModal = (importRecord: Import) => {
    setSelectedImport(importRecord);
    setError(null);
    setModalMode('delete');
  };

  const openDetailModal = async (importRecord: Import) => {
    setSelectedImport(importRecord);
    setModalMode('detail');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedImport(null);
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
    setFormItems([...formItems(), { itemId: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeFormItem = (index: number) => {
    setFormItems(formItems().filter((_, i) => i !== index));
  };

  const updateFormItem = (index: number, field: keyof FormItem, value: any) => {
    const updated = [...formItems()];
    updated[index] = { ...updated[index], [field]: value } as FormItem;
    setFormItems(updated);
  };

  const calculateTotal = () => {
    return formItems().reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
  };

  // CRUD handlers
  const handleCreate = async (e: Event) => {
    e.preventDefault();
    if (formItems().length === 0 || formItems().some((item) => !item.itemId)) {
      setError('Please add at least one item with all fields filled');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData: ImportFormData = {
        supplierId: supplierId() || undefined,
        items: formItems(),
      };
      await createImport(formData);
      await refetch();
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Failed to create import');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: Event) => {
    e.preventDefault();
    if (!selectedImport()) return;

    if (formItems().length === 0 || formItems().some((item) => !item.itemId)) {
      setError('Please add at least one item with all fields filled');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData: Partial<ImportFormData> = {
        supplierId: supplierId() || undefined,
        items: formItems(),
      };
      await updateImport(selectedImport()!.id, formData);
      await refetch();
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Failed to update import');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedImport()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await deleteImport(selectedImport()!.id);
      await refetch();
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Failed to delete import');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action handlers
  const handleMarkReceived = async (importId: string) => {
    try {
      await markItemsReceived(importId);
      await refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to mark items as received');
    }
  };

  const handleUnmarkReceived = async (importId: string) => {
    try {
      await apiClient.patch(`/import/${importId}/action`, {
        action: 'unmarkItemsReceived',
      });
      await refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to unmark items as received');
    }
  };

  const handleCompletePayment = async (importId: string) => {
    try {
      await completeImportPayment(importId);
      await refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to complete payment');
    }
  };

  const handleUnmarkPayment = async (importId: string) => {
    try {
      await apiClient.patch(`/import/${importId}/action`, {
        action: 'unmarkPaymentCompleted',
      });
      await refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to unmark payment');
    }
  };

  const handleCompleteImport = async (importId: string) => {
    try {
      await completeImport(importId);
      await refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to complete import');
    }
  };

  const handleCancelImport = async (importId: string) => {
    try {
      await cancelImport(importId);
      await refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel import');
    }
  };

  const handleMarkPending = async (importId: string) => {
    try {
      await markImportPending(importId);
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
        case 'markReceived':
          await handleMarkReceived(action.importId);
          break;
        case 'unmarkReceived':
          await handleUnmarkReceived(action.importId);
          break;
        case 'completePayment':
          await handleCompletePayment(action.importId);
          break;
        case 'unmarkPayment':
          await handleUnmarkPayment(action.importId);
          break;
        case 'completeImport':
          await handleCompleteImport(action.importId);
          break;
        case 'cancelImport':
          await handleCancelImport(action.importId);
          break;
      }
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
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
          variant={filter() === 'completed' ? 'primary' : 'outline'}
          onClick={() => setFilter('completed')}
        >
          Completed
        </Button>
        <Button
          variant={filter() === 'cancelled' ? 'primary' : 'outline'}
          onClick={() => setFilter('cancelled')}
        >
          Cancelled
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
                          <th class="px-6 py-3 text-right text-xs font-medium uppercase text-text-secondary">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-border-default bg-bg-surface">
                        <For each={imports()}>
                          {(importRecord: Import) => (
                            <tr class="transition-colors hover:bg-bg-hover">
                              <td class="whitespace-nowrap px-6 py-4 font-mono text-sm text-text-primary">
                                #{importRecord.id.slice(-6)}
                              </td>
                              <td class="whitespace-nowrap px-6 py-4 text-sm text-text-primary">
                                {importRecord.supplierName || 'N/A'}
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
                                    importRecord.status === 'completed'
                                      ? 'bg-status-success-bg text-status-success-text'
                                      : importRecord.status === 'cancelled'
                                        ? 'bg-status-error-bg text-status-error-text'
                                        : 'bg-status-warning-bg text-status-warning-text'
                                  }`}
                                >
                                  {importRecord.status}
                                </span>
                              </td>
                              <td class="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                                {formatDate(
                                  importRecord.itemsReceivedDate ||
                                    importRecord.createdAt
                                )}
                              </td>
                              <td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                <div class="flex justify-end gap-2">
                                  <button
                                    onClick={() => openDetailModal(importRecord)}
                                    class="text-accent-primary hover:text-accent-hover transition-colors"
                                    title="View details"
                                  >
                                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </button>
                                  <Show when={importRecord.status !== 'cancelled' && !importRecord.itemsReceivedDate}>
                                    <button
                                      onClick={() => openEditModal(importRecord)}
                                      class="text-accent-primary hover:text-accent-hover transition-colors"
                                      title="Edit import"
                                    >
                                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                  </Show>
                                  <Show when={importRecord.itemsReceivedDate && importRecord.status !== 'cancelled'}>
                                    <button
                                      disabled
                                      class="text-text-secondary cursor-not-allowed opacity-50"
                                      title="Cannot edit - items already in inventory. Unmark items first to edit."
                                    >
                                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                  </Show>
                                  <button
                                    onClick={() => openDeleteModal(importRecord)}
                                    class="text-status-error-text hover:text-red-700 transition-colors"
                                    title="Delete import"
                                  >
                                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

      {/* Create/Edit Modal */}
      <Show when={modalMode() === 'create' || modalMode() === 'edit'}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-bg-surface p-6 shadow-xl">
            <h2 class="mb-4 text-xl font-bold text-text-primary">
              {modalMode() === 'create' ? 'Create Import' : 'Edit Import'}
            </h2>

            <form onSubmit={modalMode() === 'create' ? handleCreate : handleUpdate}>
              <div class="space-y-4">
                {/* Supplier */}
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1">
                    Supplier (Optional)
                  </label>
                  <select
                    value={supplierId()}
                    onChange={(e) => setSupplierId(e.currentTarget.value)}
                    class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-transparent focus:ring-2 focus:ring-accent-primary"
                  >
                    <option value="">No supplier</option>
                    <Show when={!suppliers.loading && suppliers()}>
                      <For each={suppliers()}>
                        {(supplier) => (
                          <option value={supplier.id}>{supplier.partnerName}</option>
                        )}
                      </For>
                    </Show>
                  </select>
                </div>

                {/* Items */}
                <div>
                  <div class="flex justify-between items-center mb-2">
                    <label class="block text-sm font-medium text-text-primary">
                      Items *
                    </label>
                    <Button type="button" variant="outline" size="sm" onClick={addFormItem}>
                      + Add Item
                    </Button>
                  </div>

                  <div class="space-y-3">
                    <For each={formItems()}>
                      {(item, index) => (
                        <div class="flex gap-2 items-start p-3 border border-border-default rounded-lg">
                          <div class="flex-1 space-y-2">
                            {/* Item selector */}
                            <select
                              required
                              value={item.itemId}
                              onChange={(e) => updateFormItem(index(), 'itemId', e.currentTarget.value)}
                              class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-accent-primary"
                            >
                              <option value="">Select item...</option>
                              <Show when={!items.loading && items()}>
                                <For each={items()}>
                                  {(itemOption) => (
                                    <option value={itemOption.id}>{itemOption.name}</option>
                                  )}
                                </For>
                              </Show>
                            </select>

                            <div class="grid grid-cols-2 gap-2">
                              {/* Quantity */}
                              <div>
                                <label class="block text-xs text-text-secondary mb-1">Quantity</label>
                                <input
                                  type="number"
                                  required
                                  min="1"
                                  value={item.quantity}
                                  onInput={(e) => updateFormItem(index(), 'quantity', parseInt(e.currentTarget.value) || 0)}
                                  class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-accent-primary"
                                />
                              </div>

                              {/* Unit Price */}
                              <div>
                                <label class="block text-xs text-text-secondary mb-1">Unit Price</label>
                                <input
                                  type="number"
                                  required
                                  min="0"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onInput={(e) => updateFormItem(index(), 'unitPrice', parseFloat(e.currentTarget.value) || 0)}
                                  class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-accent-primary"
                                />
                              </div>
                            </div>

                            {/* Subtotal */}
                            <div class="text-sm text-text-secondary">
                              Subtotal: <span class="font-semibold text-text-primary">{formatCurrency(item.quantity * item.unitPrice)}</span>
                            </div>
                          </div>

                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => removeFormItem(index())}
                            class="text-status-error-text hover:text-red-700 mt-1"
                            disabled={formItems().length === 1}
                          >
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </For>
                  </div>

                  {/* Total */}
                  <div class="mt-4 p-3 bg-bg-subtle rounded-lg">
                    <div class="flex justify-between items-center">
                      <span class="font-medium text-text-primary">Total:</span>
                      <span class="text-lg font-bold text-text-primary">{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                <Show when={error()}>
                  <div class="rounded-lg bg-status-error-bg p-3 text-sm text-status-error-text">
                    {error()}
                  </div>
                </Show>
              </div>

              {/* Actions */}
              <div class="mt-6 flex justify-end gap-3">
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
                  {isSubmitting() ? 'Saving...' : modalMode() === 'create' ? 'Create' : 'Update'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* Delete Confirmation Modal */}
      <Show when={modalMode() === 'delete'}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div class="w-full max-w-md rounded-lg bg-bg-surface p-6 shadow-xl">
            <h2 class="mb-4 text-xl font-bold text-text-primary">
              Delete Import
            </h2>

            <p class="mb-6 text-text-secondary">
              Are you sure you want to delete import <strong class="text-text-primary">#{selectedImport()?.id.slice(-6)}</strong>?
              This action cannot be undone.
            </p>

            {/* Error Message */}
            <Show when={error()}>
              <div class="mb-4 rounded-lg bg-status-error-bg p-3 text-sm text-status-error-text">
                {error()}
              </div>
            </Show>

            {/* Actions */}
            <div class="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={isSubmitting()}
              >
                Cancel
              </Button>
              <Button
                type="button"
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
      <Show when={modalMode() === 'detail' && selectedImport()}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div class="w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-lg bg-bg-surface p-6 shadow-xl">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-xl font-bold text-text-primary">
                Import #{selectedImport()?.id.slice(-6)}
              </h2>
              <button
                onClick={closeModal}
                class="text-text-secondary hover:text-text-primary"
              >
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Import Info */}
            <div class="mb-6 space-y-3">
              <div class="flex justify-between py-2 border-b border-border-default">
                <span class="text-text-secondary">Supplier:</span>
                <span class="font-medium text-text-primary">{selectedImport()?.supplierName || 'N/A'}</span>
              </div>
              <div class="flex justify-between py-2 border-b border-border-default">
                <span class="text-text-secondary">Status:</span>
                <span
                  class={`rounded-full px-2 py-1 text-xs font-semibold ${
                    selectedImport()?.status === 'completed'
                      ? 'bg-status-success-bg text-status-success-text'
                      : selectedImport()?.status === 'cancelled'
                        ? 'bg-status-error-bg text-status-error-text'
                        : 'bg-status-warning-bg text-status-warning-text'
                  }`}
                >
                  {selectedImport()?.status}
                </span>
              </div>
              <div class="flex justify-between py-2 border-b border-border-default">
                <span class="text-text-secondary">Total:</span>
                <span class="text-lg font-bold text-text-primary">{formatCurrency(selectedImport()?.totalPrice || 0)}</span>
              </div>
              <div class="flex justify-between py-2 border-b border-border-default">
                <span class="text-text-secondary">Items Received:</span>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-text-primary">{formatDate(selectedImport()?.itemsReceivedDate)}</span>
                  <Show when={selectedImport()?.itemsReceivedDate}>
                    <svg class="h-5 w-5 text-status-success-text" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                  </Show>
                </div>
              </div>
              <div class="flex justify-between py-2 border-b border-border-default">
                <span class="text-text-secondary">Payment Completed:</span>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-text-primary">{formatDate(selectedImport()?.paymentCompletedDate)}</span>
                  <Show when={selectedImport()?.paymentCompletedDate}>
                    <svg class="h-5 w-5 text-status-success-text" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                  </Show>
                </div>
              </div>
              <div class="flex justify-between py-2 border-b border-border-default">
                <span class="text-text-secondary">Created:</span>
                <span class="font-medium text-text-primary">{formatDate(selectedImport()?.createdAt)}</span>
              </div>
            </div>

            {/* Items List */}
            <div>
              <h3 class="mb-3 font-semibold text-text-primary">Items ({selectedImport()?.items.length})</h3>
              
              {/* Warning for items received */}
              <Show when={selectedImport()?.itemsReceivedDate}>
                <div class="mb-3 p-3 bg-status-warning-bg border-l-4 border-status-warning-text rounded">
                  <div class="flex items-start gap-2">
                    <svg class="h-5 w-5 text-status-warning-text flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                    <div>
                      <p class="text-sm font-medium text-status-warning-text">Items cannot be edited</p>
                      <p class="text-xs text-text-secondary mt-1">Items have been received and are in inventory. To edit items, you must first unmark them.</p>
                    </div>
                  </div>
                </div>
              </Show>

              <div class="space-y-2">
                <For each={selectedImport()?.items}>
                  {(item) => (
                    <div class="flex justify-between p-3 rounded-lg border border-border-default hover:bg-bg-hover">
                      <div>
                        <p class="font-medium text-text-primary">{item.itemName || `Item ${item.itemId.slice(-6)}`}</p>
                        <p class="text-sm text-text-secondary">Quantity: {item.quantity} × {formatCurrency(item.unitPrice)}</p>
                      </div>
                      <div class="text-right">
                        <p class="font-semibold text-text-primary">{formatCurrency(item.totalPrice)}</p>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>

            {/* Action Buttons */}
            <Show when={selectedImport()?.status === 'pending'}>
              <div class="mt-6">
                <h3 class="mb-3 font-semibold text-text-primary">Actions</h3>
                <div class="space-y-3">
                  {/* Mark Items Received */}
                  <div class="flex items-center justify-between p-3 bg-bg-subtle rounded-lg">
                    <div class="flex items-center gap-3">
                      <Show
                        when={selectedImport()?.itemsReceivedDate}
                        fallback={
                          <svg class="h-5 w-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        }
                      >
                        <svg class="h-5 w-5 text-status-success-text" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                        </svg>
                      </Show>
                      <div>
                        <p class="font-medium text-text-primary">Mark Items Received</p>
                        <p class="text-sm text-text-secondary">Add items to inventory</p>
                      </div>
                    </div>
                    <Show
                      when={selectedImport()?.itemsReceivedDate}
                      fallback={
                        <Button
                          onClick={() => {
                            showConfirmation({
                              type: 'markReceived',
                              importId: selectedImport()!.id,
                              message: 'This will add the items to your inventory. Continue?',
                            });
                          }}
                          variant="primary"
                          size="sm"
                        >
                          Mark Received
                        </Button>
                      }
                    >
                      <Button
                        onClick={() => {
                          showConfirmation({
                            type: 'unmarkReceived',
                            importId: selectedImport()!.id,
                            message: 'This will remove the items from inventory. Continue?',
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
                  <div class="flex items-center justify-between p-3 bg-bg-subtle rounded-lg">
                    <div class="flex items-center gap-3">
                      <Show
                        when={selectedImport()?.paymentCompletedDate}
                        fallback={
                          <svg class="h-5 w-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        }
                      >
                        <svg class="h-5 w-5 text-status-success-text" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                        </svg>
                      </Show>
                      <div>
                        <p class="font-medium text-text-primary">Complete Payment</p>
                        <p class="text-sm text-text-secondary">Mark payment to supplier as complete</p>
                      </div>
                    </div>
                    <Show
                      when={selectedImport()?.paymentCompletedDate}
                      fallback={
                        <Button
                          onClick={() => {
                            showConfirmation({
                              type: 'completePayment',
                              importId: selectedImport()!.id,
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
                            importId: selectedImport()!.id,
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
                  <div class="flex flex-wrap gap-2 pt-3 border-t border-border-default">
                    <Button
                      onClick={() => {
                        showConfirmation({
                          type: 'completeImport',
                          importId: selectedImport()!.id,
                          message: 'Mark this import as completed?',
                        });
                      }}
                      variant="primary"
                      size="sm"
                    >
                      Complete Import
                    </Button>
                    <Button
                      onClick={() => {
                        showConfirmation({
                          type: 'cancelImport',
                          importId: selectedImport()!.id,
                          message: 'Cancel this import? This action cannot be undone.',
                        });
                      }}
                      variant="danger"
                      size="sm"
                    >
                      Cancel Import
                    </Button>
                  </div>
                </div>
              </div>
            </Show>
            <Show when={selectedImport()?.status === 'cancelled'}>
              <div class="mt-6">
                <h3 class="mb-3 font-semibold text-text-primary">Reactivate Import</h3>
                <p class="mb-3 text-sm text-text-secondary">
                  This will change the status back to pending, allowing you to complete or modify the import.
                </p>
                <Button onClick={() => { handleMarkPending(selectedImport()!.id); closeModal(); }} variant="primary" size="sm">
                  Mark as Pending
                </Button>
              </div>
            </Show>
            <Show when={selectedImport()?.status === 'completed'}>
              <div class="mt-6">
                <h3 class="mb-3 font-semibold text-text-primary">Reopen Import</h3>
                <p class="mb-3 text-sm text-text-secondary">
                  This will change the status back to pending. Dates (items received, payment completed) will be preserved.
                </p>
                <div class="flex flex-wrap gap-2">
                  <Button onClick={() => { handleMarkPending(selectedImport()!.id); closeModal(); }} variant="primary" size="sm">
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

            <p class="mb-6 text-text-secondary">{confirmAction()?.message}</p>

            {/* Error Message */}
            <Show when={error()}>
              <div class="mb-4 rounded-lg bg-status-error-bg p-3 text-sm text-status-error-text">
                {error()}
              </div>
            </Show>

            {/* Actions */}
            <div class="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={isSubmitting()}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={confirmAction()?.type === 'cancelImport' ? 'danger' : 'primary'}
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
