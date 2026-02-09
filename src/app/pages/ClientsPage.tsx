import { createSignal, createResource, Show, For } from 'solid-js';
import { Button } from '@/shared/ui/Button';
import { Card, CardBody } from '@/shared/ui';
import { 
  getPartners, 
  getClients, 
  getSuppliers, 
  createPartner, 
  updatePartner, 
  deletePartner,
  getPartnerTransactions,
  getPartnerImports 
} from '@/shared/api';
import type { Partner } from '@/shared/types/partner.types';

type ModalMode = 'create' | 'edit' | 'delete' | 'detail' | null;

interface FormData {
  partnerName: string;
  partnerType: 'supplier' | 'client';
  phoneNumber: string;
  email: string;
  address: string;
}

export default function ClientsPage() {
  const [filter, setFilter] = createSignal<'all' | 'client' | 'supplier'>(
    'all'
  );
  const [searchTerm, setSearchTerm] = createSignal('');
  const [modalMode, setModalMode] = createSignal<ModalMode>(null);
  const [selectedPartner, setSelectedPartner] = createSignal<Partner | null>(null);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  
  // Form state
  const [formData, setFormData] = createSignal<FormData>({
    partnerName: '',
    partnerType: 'client',
    phoneNumber: '',
    email: '',
    address: ''
  });

  // Partner details (transactions/imports)
  const [detailData, setDetailData] = createSignal<any[] | null>(null);
  const [loadingDetails, setLoadingDetails] = createSignal(false);

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
        p.phoneNumber?.includes(search)
    );
  };

  // Open create modal
  const openCreateModal = () => {
    setFormData({
      partnerName: '',
      partnerType: 'client',
      phoneNumber: '',
      email: '',
      address: ''
    });
    setError(null);
    setModalMode('create');
  };

  // Open edit modal
  const openEditModal = (partner: Partner) => {
    setSelectedPartner(partner);
    setFormData({
      partnerName: partner.partnerName,
      partnerType: partner.partnerType,
      phoneNumber: partner.phoneNumber || '',
      email: partner.email || '',
      address: partner.address || ''
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
      if (partner.partnerType === 'client') {
        const transactions = await getPartnerTransactions(partner.id);
        setDetailData(transactions);
      } else {
        const imports = await getPartnerImports(partner.id);
        setDetailData(imports);
      }
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
          <h1 class="text-3xl font-bold text-text-primary">Partners</h1>
          <p class="mt-2 text-sm text-text-secondary">
            Manage your suppliers and clients (business partners)
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
                          <th class="px-6 py-3 text-right text-xs font-medium uppercase text-text-secondary">
                            Actions
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
                                    class="text-accent-primary hover:text-accent-hover transition-colors"
                                    title={`View ${partner.partnerType === 'client' ? 'transactions' : 'imports'}`}
                                  >
                                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => openEditModal(partner)}
                                    class="text-accent-primary hover:text-accent-hover transition-colors"
                                    title="Edit partner"
                                  >
                                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => openDeleteModal(partner)}
                                    class="text-status-error-text hover:text-red-700 transition-colors"
                                    title="Delete partner"
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

            <form onSubmit={modalMode() === 'create' ? handleCreate : handleUpdate}>
              <div class="space-y-4">
                {/* Partner Name */}
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1">
                    Partner Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData().partnerName}
                    onInput={(e) => setFormData({ ...formData(), partnerName: e.currentTarget.value })}
                    class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-transparent focus:ring-2 focus:ring-accent-primary"
                  />
                </div>

                {/* Partner Type */}
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1">
                    Partner Type *
                  </label>
                  <select
                    required
                    value={formData().partnerType}
                    onChange={(e) => setFormData({ ...formData(), partnerType: e.currentTarget.value as 'client' | 'supplier' })}
                    class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-transparent focus:ring-2 focus:ring-accent-primary"
                  >
                    <option value="client">Client</option>
                    <option value="supplier">Supplier</option>
                  </select>
                </div>

                {/* Phone Number */}
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData().phoneNumber}
                    onInput={(e) => setFormData({ ...formData(), phoneNumber: e.currentTarget.value })}
                    class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-transparent focus:ring-2 focus:ring-accent-primary"
                  />
                </div>

                {/* Email */}
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData().email}
                    onInput={(e) => setFormData({ ...formData(), email: e.currentTarget.value })}
                    class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-transparent focus:ring-2 focus:ring-accent-primary"
                  />
                </div>

                {/* Address */}
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1">
                    Address
                  </label>
                  <textarea
                    value={formData().address}
                    onInput={(e) => setFormData({ ...formData(), address: e.currentTarget.value })}
                    rows={3}
                    class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-transparent focus:ring-2 focus:ring-accent-primary"
                  />
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
              Delete Partner
            </h2>

            <p class="mb-6 text-text-secondary">
              Are you sure you want to delete <strong class="text-text-primary">{selectedPartner()?.partnerName}</strong>? 
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

      {/* Detail Modal (Transactions/Imports) */}
      <Show when={modalMode() === 'detail'}>
        <div 
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div class="w-full max-w-3xl rounded-lg bg-bg-surface p-6 shadow-xl max-h-[80vh] overflow-y-auto">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-xl font-bold text-text-primary">
                {selectedPartner()?.partnerName} - {selectedPartner()?.partnerType === 'client' ? 'Transactions' : 'Imports'}
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

            <Show when={loadingDetails()}>
              <div class="py-12 text-center">
                <p class="text-text-secondary">Loading...</p>
              </div>
            </Show>

            <Show when={!loadingDetails() && error()}>
              <div class="rounded-lg bg-status-error-bg p-3 text-sm text-status-error-text">
                {error()}
              </div>
            </Show>

            <Show when={!loadingDetails() && !error()}>
              <Show
                when={detailData() && detailData()!.length > 0}
                fallback={
                  <div class="py-12 text-center">
                    <p class="text-text-secondary">
                      No {selectedPartner()?.partnerType === 'client' ? 'transactions' : 'imports'} found
                    </p>
                  </div>
                }
              >
                <div class="space-y-3">
                  <For each={detailData()}>
                    {(item: any) => (
                      <div class="rounded-lg border border-border-default p-4 hover:bg-bg-hover">
                        <div class="flex items-start justify-between">
                          <div class="flex-1">
                            <Show when={selectedPartner()?.partnerType === 'client'}>
                              {/* Transaction Details */}
                              <div class="text-sm">
                                <p class="font-medium text-text-primary">
                                  Transaction #{item._id?.slice(-6) || 'N/A'}
                                </p>
                                <p class="text-text-secondary mt-1">
                                  Status: <span class={`font-semibold ${
                                    item.status === 'completed' ? 'text-status-success-text' :
                                    item.status === 'pending' ? 'text-status-warning-text' :
                                    item.status === 'cancelled' ? 'text-status-error-text' :
                                    'text-text-primary'
                                  }`}>{item.status || 'N/A'}</span>
                                </p>
                                <p class="text-text-secondary">
                                  Total: <span class="font-semibold text-text-primary">${item.totalPrice?.toFixed(2) || '0.00'}</span>
                                </p>
                                <p class="text-text-secondary text-xs mt-1">
                                  {item.itemsDeliveredDate ? new Date(item.itemsDeliveredDate).toLocaleDateString() : new Date(item.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </Show>
                            <Show when={selectedPartner()?.partnerType === 'supplier'}>
                              {/* Import Details */}
                              <div class="text-sm">
                                <p class="font-medium text-text-primary">
                                  Import #{item._id?.slice(-6) || 'N/A'}
                                </p>
                                <p class="text-text-secondary mt-1">
                                  Status: <span class={`font-semibold ${
                                    item.status === 'completed' ? 'text-status-success-text' :
                                    item.status === 'pending' ? 'text-status-warning-text' :
                                    item.status === 'cancelled' ? 'text-status-error-text' :
                                    'text-text-primary'
                                  }`}>{item.status || 'N/A'}</span>
                                </p>
                                <p class="text-text-secondary">
                                  Total: <span class="font-semibold text-text-primary">${item.totalPrice?.toFixed(2) || '0.00'}</span>
                                </p>
                                <p class="text-text-secondary text-xs mt-1">
                                  {item.itemsReceivedDate ? new Date(item.itemsReceivedDate).toLocaleDateString() : new Date(item.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </Show>
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
