import { createSignal, createResource, Show, For } from 'solid-js';
import { Button } from '@/shared/ui/Button';
import { Card, CardBody, CopyableId } from '@/shared/ui';
import {
  getClientsWithPagination,
  createPartner,
  updatePartner,
  deletePartner,
  getPartnerTransactions,
} from '@/shared/api';
import type { Partner } from '@/shared/types/partner.types';

type ModalMode = 'create' | 'edit' | 'delete' | 'detail' | null;

interface FormData {
  partnerName: string;
  partnerType: 'client';
  phoneNumber: string;
  email: string;
  address: string;
}

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = createSignal('');
  const [currentPage, setCurrentPage] = createSignal(1);
  const [paginationInfo, setPaginationInfo] = createSignal<any>(null);
  const [modalMode, setModalMode] = createSignal<ModalMode>(null);
  const [selectedPartner, setSelectedPartner] = createSignal<Partner | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  // Form state
  const [formData, setFormData] = createSignal<FormData>({
    partnerName: '',
    partnerType: 'client',
    phoneNumber: '',
    email: '',
    address: '',
  });

  // Partner details (transactions)
  const [detailData, setDetailData] = createSignal<any[] | null>(null);
  const [loadingDetails, setLoadingDetails] = createSignal(false);

  // Fetch clients with pagination
  const [partners, { refetch }] = createResource(
    () => ({ search: searchTerm(), page: currentPage() }),
    async ({ search, page }) => {
      const response = await getClientsWithPagination({
        page,
        limit: 20,
        search,
      });
      setPaginationInfo(response.pagination);
      return response.partners;
    }
  );

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Load more (next page)
  const loadMore = () => {
    const pagination = paginationInfo();
    if (pagination && currentPage() < pagination.pages) {
      setCurrentPage(currentPage() + 1);
    }
  };

  // Open create modal
  const openCreateModal = () => {
    setFormData({
      partnerName: '',
      partnerType: 'client',
      phoneNumber: '',
      email: '',
      address: '',
    });
    setError(null);
    setModalMode('create');
  };

  // Open edit modal
  const openEditModal = (partner: Partner) => {
    setSelectedPartner(partner);
    setFormData({
      partnerName: partner.partnerName,
      partnerType: partner.partnerType as 'client',
      phoneNumber: partner.phoneNumber || '',
      email: partner.email || '',
      address: partner.address || '',
    });
    setError(null);
    setModalMode('edit');
  };

  // Open delete modal
  const openDeleteModal = (partner: Partner) => {
    setSelectedPartner(partner);
    setError(null);
    setModalMode('delete');
  };

  // Open detail modal
  const openDetailModal = async (partner: Partner) => {
    setSelectedPartner(partner);
    setDetailData(null);
    setLoadingDetails(true);
    setModalMode('detail');

    try {
      const transactions = await getPartnerTransactions(partner.id);
      setDetailData(transactions);
    } catch (err: any) {
      console.error('Error loading details:', err);
      setError(err.message || 'Failed to load details');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Close modal
  const closeModal = () => {
    setModalMode(null);
    setSelectedPartner(null);
    setError(null);
    setDetailData(null);
  };

  // Handle create
  const handleCreate = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await createPartner(formData());
      await refetch();
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Failed to create partner');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update
  const handleUpdate = async (e: Event) => {
    e.preventDefault();
    if (!selectedPartner()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await updatePartner(selectedPartner()!.id, formData());
      await refetch();
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Failed to update partner');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedPartner()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await deletePartner(selectedPartner()!.id);
      await refetch();
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Failed to delete partner');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="space-y-6 py-8">
      {/* Header */}
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold text-text-primary">Clients</h1>
          <p class="mt-2 text-sm text-text-secondary">
            Manage your clients (customers)
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
          New Client
        </Button>
      </div>

      {/* Search */}
      <div class="flex gap-4">
        <input
          type="text"
          placeholder="Search clients..."
          value={searchTerm()}
          onInput={(e) => handleSearchChange(e.currentTarget.value)}
          class="flex-1 rounded-lg border border-border-default bg-bg-surface px-4 py-2 text-text-primary focus:border-transparent focus:ring-2 focus:ring-accent-primary"
        />
      </div>

      {/* Clients List */}
      <Card>
        <CardBody>
          <Show
            when={!partners.loading}
            fallback={
              <div class="py-12 text-center">
                <p class="text-text-secondary">Loading clients...</p>
              </div>
            }
          >
            <Show
              when={partners.error}
              fallback={
                <Show
                  when={partners() && partners()!.length > 0}
                  fallback={
                    <div class="py-12 text-center">
                      <p class="text-text-secondary">No clients found</p>
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
                            Phone
                          </th>
                          <th class="px-6 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                            Email
                          </th>
                          <th class="px-6 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                            Address
                          </th>
                          <th class="px-6 py-3 text-right text-xs font-medium uppercase text-text-secondary">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-border-default bg-bg-surface">
                        <For each={partners()}>
                          {(partner: Partner) => (
                            <tr class="transition-colors hover:bg-bg-hover">
                              <td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-text-primary">
                                {partner.partnerName}
                              </td>
                              <td class="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                                {partner.phoneNumber || 'N/A'}
                              </td>
                              <td class="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                                {partner.email || 'N/A'}
                              </td>
                              <td class="max-w-xs truncate px-6 py-4 text-sm text-text-secondary">
                                {partner.address || 'N/A'}
                              </td>
                              <td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                <div class="flex justify-end gap-2">
                                  <button
                                    onClick={() => openDetailModal(partner)}
                                    class="hover:text-accent-hover text-accent-primary transition-colors"
                                    title="View transactions"
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
                                  <button
                                    onClick={() => openEditModal(partner)}
                                    class="hover:text-accent-hover text-accent-primary transition-colors"
                                    title="Edit client"
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
                                  <button
                                    onClick={() => openDeleteModal(partner)}
                                    class="text-status-error-text transition-colors hover:text-red-700"
                                    title="Delete client"
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

                  {/* Pagination UI */}
                  <Show when={paginationInfo()}>
                    {(pagination) => (
                      <div class="flex flex-col gap-2 border-t border-border-default px-6 py-4">
                        <div class="flex items-center justify-between">
                          <div class="text-sm text-text-secondary">
                            Showing{' '}
                            <span class="font-medium text-text-primary">
                              {partners()?.length ?? 0}
                            </span>{' '}
                            of{' '}
                            <span class="font-medium text-text-primary">
                              {pagination().total}
                            </span>{' '}
                            clients
                            {pagination().pages > 1 && (
                              <span>
                                {' '}
                                (Page {pagination().page} of{' '}
                                {pagination().pages})
                              </span>
                            )}
                          </div>
                          <Show when={pagination().page < pagination().pages}>
                            <Button
                              onClick={loadMore}
                              disabled={partners.loading}
                            >
                              {partners.loading ? 'Loading...' : 'Load More'}
                            </Button>
                          </Show>
                        </div>
                      </div>
                    )}
                  </Show>
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

      {/* Create/Edit Modal */}
      <Show when={modalMode() === 'create' || modalMode() === 'edit'}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div class="w-full max-w-md rounded-lg bg-bg-surface p-6 shadow-xl">
            <h2 class="mb-4 text-xl font-bold text-text-primary">
              {modalMode() === 'create' ? 'Create Partner' : 'Edit Partner'}
            </h2>

            <form
              onSubmit={modalMode() === 'create' ? handleCreate : handleUpdate}
            >
              <div class="space-y-4">
                {/* Partner Name */}
                <div>
                  <label class="mb-1 block text-sm font-medium text-text-primary">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData().partnerName}
                    onInput={(e) =>
                      setFormData({
                        ...formData(),
                        partnerName: e.currentTarget.value,
                      })
                    }
                    class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-transparent focus:ring-2 focus:ring-accent-primary"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label class="mb-1 block text-sm font-medium text-text-primary">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData().phoneNumber}
                    onInput={(e) =>
                      setFormData({
                        ...formData(),
                        phoneNumber: e.currentTarget.value,
                      })
                    }
                    class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-transparent focus:ring-2 focus:ring-accent-primary"
                  />
                </div>

                {/* Email */}
                <div>
                  <label class="mb-1 block text-sm font-medium text-text-primary">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData().email}
                    onInput={(e) =>
                      setFormData({
                        ...formData(),
                        email: e.currentTarget.value,
                      })
                    }
                    class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-transparent focus:ring-2 focus:ring-accent-primary"
                  />
                </div>

                {/* Address */}
                <div>
                  <label class="mb-1 block text-sm font-medium text-text-primary">
                    Address
                  </label>
                  <textarea
                    value={formData().address}
                    onInput={(e) =>
                      setFormData({
                        ...formData(),
                        address: e.currentTarget.value,
                      })
                    }
                    rows={3}
                    class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-transparent focus:ring-2 focus:ring-accent-primary"
                  />
                </div>

                {/* Error Message */}
                <Show when={error()}>
                  <div class="bg-status-error-bg text-status-error-text rounded-lg p-3 text-sm">
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
                  {isSubmitting()
                    ? 'Saving...'
                    : modalMode() === 'create'
                      ? 'Create'
                      : 'Update'}
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
              Delete Partner
            </h2>

            <p class="mb-6 text-text-secondary">
              Are you sure you want to delete{' '}
              <strong class="text-text-primary">
                {selectedPartner()?.partnerName}
              </strong>
              ? This action cannot be undone.
            </p>

            {/* Error Message */}
            <Show when={error()}>
              <div class="bg-status-error-bg text-status-error-text mb-4 rounded-lg p-3 text-sm">
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

      {/* Detail Modal (Transactions/Imports) */}
      <Show when={modalMode() === 'detail'}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div class="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-bg-surface p-6 shadow-xl">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-xl font-bold text-text-primary">
                {selectedPartner()?.partnerName} - Transactions
              </h2>
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

            <Show when={loadingDetails()}>
              <div class="py-12 text-center">
                <p class="text-text-secondary">Loading...</p>
              </div>
            </Show>

            <Show when={!loadingDetails() && error()}>
              <div class="bg-status-error-bg text-status-error-text rounded-lg p-3 text-sm">
                {error()}
              </div>
            </Show>

            <Show when={!loadingDetails() && !error()}>
              <Show
                when={detailData() && detailData()!.length > 0}
                fallback={
                  <div class="py-12 text-center">
                    <p class="text-text-secondary">No transactions found</p>
                  </div>
                }
              >
                <div class="space-y-3">
                  <For each={detailData()}>
                    {(item: any) => (
                      <div class="rounded-lg border border-border-default p-4 hover:bg-bg-hover">
                        <div class="flex items-start justify-between">
                          <div class="flex-1">
                            {/* Transaction Details */}
                            <div class="text-sm">
                              <p class="font-medium text-text-primary">
                                <CopyableId
                                  id={item._id || ''}
                                  prefix="Transaction"
                                />
                              </p>
                              <p class="mt-1 text-text-secondary">
                                Status:{' '}
                                <span
                                  class={`font-semibold ${
                                    item.status === 'completed'
                                      ? 'text-status-success-text'
                                      : item.status === 'pending'
                                        ? 'text-status-warning-text'
                                        : item.status === 'cancelled'
                                          ? 'text-status-error-text'
                                          : 'text-text-primary'
                                  }`}
                                >
                                  {item.status || 'N/A'}
                                </span>
                              </p>
                              <p class="text-text-secondary">
                                Total:{' '}
                                <span class="font-semibold text-text-primary">
                                  ${item.totalPrice?.toFixed(2) || '0.00'}
                                </span>
                              </p>
                              <p class="mt-1 text-xs text-text-secondary">
                                {item.itemsDeliveredDate
                                  ? new Date(
                                      item.itemsDeliveredDate
                                    ).toLocaleDateString()
                                  : new Date(
                                      item.createdAt
                                    ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}
