import {
  createSignal,
  createResource,
  Show,
  For,
  createMemo,
  createEffect,
} from 'solid-js';
import { useSearchParams } from '@solidjs/router';
import { Button } from '@/shared/ui/Button';
import { Card, CardBody, CopyableId } from '@/shared/ui';
import { can } from '@/shared/stores/permissions.store';
import {
  getSuppliersWithPagination,
  createPartner,
  updatePartner,
  deletePartner,
  getPartnerImports,
} from '@/shared/api';
import { getBusiness } from '@/shared/stores/business.store';
import type { Partner } from '@/shared/types/partner.types';
import { getErrorMessage } from '@/shared/lib/error-messages';

type ModalMode = 'create' | 'edit' | 'delete' | 'detail' | null;

interface FormData {
  partnerName: string;
  partnerType: 'supplier';
  phoneNumber: string;
  email: string;
  address: string;
}

interface DetailFilters {
  dateFrom: string;
  dateTo: string;
  priceMin: string;
  priceMax: string;
  status: string;
}

export default function SuppliersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
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
    partnerType: 'supplier',
    phoneNumber: '',
    email: '',
    address: '',
  });

  // Partner details (imports)
  const [detailData, setDetailData] = createSignal<any[] | null>(null);
  const [loadingDetails, setLoadingDetails] = createSignal(false);

  // Detail modal filters
  const [detailFilters, setDetailFilters] = createSignal<DetailFilters>({
    dateFrom: '',
    dateTo: '',
    priceMin: '',
    priceMax: '',
    status: '',
  });
  const [showDetailFilters, setShowDetailFilters] = createSignal(false);

  // Business info for printing
  const business = getBusiness;

  // Filtered detail data (client-side filtering)
  const filteredDetailData = createMemo(() => {
    const data = detailData();
    if (!data) return [];

    const filters = detailFilters();
    return data.filter((item: any) => {
      // Date filter
      const itemDate = new Date(item.itemsReceivedDate || item.createdAt);
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        if (itemDate < fromDate) return false;
      }
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (itemDate > toDate) return false;
      }

      // Price filter
      const price = item.totalPrice || 0;
      if (filters.priceMin) {
        const min = parseFloat(filters.priceMin);
        if (!isNaN(min) && price < min) return false;
      }
      if (filters.priceMax) {
        const max = parseFloat(filters.priceMax);
        if (!isNaN(max) && price > max) return false;
      }

      // Status filter
      if (filters.status && item.status !== filters.status) return false;

      return true;
    });
  });

  // Print handler for supplier imports
  const handlePrintImports = () => {
    const imports = filteredDetailData();
    if (imports.length === 0) return;

    const partner = selectedPartner();
    const businessInfo = business();
    const businessName = businessInfo?.name || 'Store Manager';
    const businessAddress = businessInfo?.address || '';
    const businessPhone = businessInfo?.phoneNumber || '';

    const totalAmount = imports.reduce(
      (sum: number, imp: any) => sum + (imp.totalPrice || 0),
      0
    );

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const importsHtml = imports
      .map(
        (imp: any) => `
        <div class="import-section">
          <div class="import-header">
            <div>
              <span class="import-id">#${(imp._id || '').slice(-8).toUpperCase()}</span>
              <span class="import-date">${new Date(imp.itemsReceivedDate || imp.createdAt).toLocaleDateString()}</span>
            </div>
            <span class="status-${imp.status}">${imp.status || 'N/A'}</span>
          </div>
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th class="center">Qty</th>
                <th class="right">Unit Price</th>
                <th class="right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${(imp.item || [])
                .map(
                  (item: any) => `
                <tr>
                  <td>${item.itemId?.name || 'Item'}</td>
                  <td class="center">${item.quantity}</td>
                  <td class="right">$${(item.unitPrice || 0).toFixed(2)}</td>
                  <td class="right">$${(item.totalPrice || 0).toFixed(2)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          <div class="import-total">
            <span>Import Total:</span>
            <span>$${(imp.totalPrice || 0).toFixed(2)}</span>
          </div>
        </div>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Supplier Imports - ${partner?.partnerName}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              font-size: 12px;
              padding: 20mm;
              background: #fff;
              color: #333;
            }
            .header {
              text-align: center;
              padding-bottom: 15px;
              margin-bottom: 15px;
              border-bottom: 2px solid #0066cc;
            }
            .business-name { font-size: 20px; font-weight: bold; color: #0066cc; }
            .business-info { font-size: 11px; color: #666; margin-top: 4px; }
            .supplier-info {
              background: #f5f5f5;
              padding: 12px;
              border-radius: 6px;
              margin-bottom: 15px;
            }
            .supplier-name { font-size: 16px; font-weight: bold; color: #333; }
            .supplier-detail { font-size: 11px; color: #666; margin-top: 4px; }
            .import-section {
              border: 1px solid #e0e0e0;
              border-radius: 6px;
              margin-bottom: 15px;
              padding: 12px;
              page-break-inside: avoid;
            }
            .import-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding-bottom: 10px;
              margin-bottom: 10px;
              border-bottom: 1px solid #eee;
            }
            .import-id { font-weight: bold; font-size: 13px; margin-right: 10px; }
            .import-date { color: #666; font-size: 11px; }
            .items-table { width: 100%; border-collapse: collapse; }
            .items-table th { background: #f5f5f5; padding: 8px; text-align: left; font-size: 10px; font-weight: 600; }
            .items-table th.center, .items-table td.center { text-align: center; width: 60px; }
            .items-table th.right, .items-table td.right { text-align: right; width: 90px; }
            .items-table td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; font-size: 11px; }
            .import-total {
              display: flex;
              justify-content: space-between;
              padding-top: 10px;
              margin-top: 10px;
              border-top: 1px solid #eee;
              font-weight: bold;
              font-size: 13px;
            }
            .status-completed { color: #166534; font-weight: 600; }
            .status-pending { color: #92400e; font-weight: 600; }
            .status-cancelled { color: #991b1b; font-weight: 600; }
            .summary {
              background: #f0f7ff;
              padding: 12px;
              border-radius: 6px;
              display: flex;
              justify-content: space-between;
            }
            .summary-item { text-align: center; }
            .summary-value { font-size: 18px; font-weight: bold; color: #0066cc; }
            .summary-label { font-size: 10px; color: #666; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #999; }
            @media print { body { padding: 10mm; } .import-section { break-inside: avoid; } }
            @page { margin: 10mm; size: A4 portrait; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="business-name">${businessName}</div>
            ${businessAddress ? `<div class="business-info">${businessAddress}</div>` : ''}
            ${businessPhone ? `<div class="business-info">${businessPhone}</div>` : ''}
          </div>
          
          <div class="supplier-info">
            <div class="supplier-name">${partner?.partnerName || 'Supplier'}</div>
            ${partner?.email ? `<div class="supplier-detail">Email: ${partner.email}</div>` : ''}
            ${partner?.phoneNumber ? `<div class="supplier-detail">Phone: ${partner.phoneNumber}</div>` : ''}
            ${partner?.address ? `<div class="supplier-detail">Address: ${partner.address}</div>` : ''}
          </div>

          ${importsHtml}

          <div class="summary">
            <div class="summary-item">
              <div class="summary-value">${imports.length}</div>
              <div class="summary-label">Total Imports</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">$${totalAmount.toFixed(2)}</div>
              <div class="summary-label">Total Amount</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">$${(totalAmount / imports.length).toFixed(2)}</div>
              <div class="summary-label">Average Import</div>
            </div>
          </div>

          <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  // Reset detail filters
  const resetDetailFilters = () => {
    setDetailFilters({
      dateFrom: '',
      dateTo: '',
      priceMin: '',
      priceMax: '',
      status: '',
    });
  };

  // Fetch suppliers with pagination
  const [partners, { refetch }] = createResource(
    () => ({ search: searchTerm(), page: currentPage() }),
    async ({ search, page }) => {
      const response = await getSuppliersWithPagination({
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
      partnerType: 'supplier',
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
      partnerType: partner.partnerType as 'supplier',
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
      const imports = await getPartnerImports(partner.id);
      setDetailData(imports);
    } catch (err: any) {
      console.error('Error loading details:', err);
      setError(getErrorMessage(err));
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
    resetDetailFilters();
    setShowDetailFilters(false);
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
      setError(getErrorMessage(err));
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
      setError(getErrorMessage(err));
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
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle action query param (from FAB - use createEffect to react to changes)
  createEffect(() => {
    if (searchParams['action'] === 'create') {
      openCreateModal();
      setSearchParams({ action: undefined });
    }
  });

  return (
    <div class="space-y-6 py-8">
      {/* Header */}
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold text-text-primary">Suppliers</h1>
          <p class="mt-2 text-sm text-text-secondary">
            Manage your suppliers (vendors)
          </p>
        </div>
        <Show when={can('partners', 'create')}>
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
            New Supplier
          </Button>
        </Show>
      </div>

      {/* Search */}
      <div class="flex gap-4">
        <input
          type="text"
          placeholder="Search suppliers..."
          value={searchTerm()}
          onInput={(e) => handleSearchChange(e.currentTarget.value)}
          class="flex-1 rounded-lg border border-border-default bg-bg-surface px-4 py-2 text-text-primary focus:border-transparent focus:ring-2 focus:ring-accent-primary"
        />
      </div>

      {/* Suppliers List */}
      <Card>
        <CardBody>
          <Show
            when={!partners.loading}
            fallback={
              <div class="py-12 text-center">
                <p class="text-text-secondary">Loading suppliers...</p>
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
                      <p class="text-text-secondary">No suppliers found</p>
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
                                    title="View imports"
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
                                    title="Edit supplier"
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
                                    title="Delete supplier"
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
                            suppliers
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
                  Error: {getErrorMessage(partners.error)}
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
              {modalMode() === 'create' ? 'Create Supplier' : 'Edit Supplier'}
            </h2>

            <form
              onSubmit={modalMode() === 'create' ? handleCreate : handleUpdate}
            >
              <div class="space-y-4">
                {/* Partner Name */}
                <div>
                  <label class="mb-1 block text-sm font-medium text-text-primary">
                    Supplier Name *
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
              Delete Supplier
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

      {/* Detail Modal (Imports) */}
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
                {selectedPartner()?.partnerName} - Imports
              </h2>
              <div class="flex items-center gap-2">
                {/* Filter Toggle */}
                <button
                  onClick={() => setShowDetailFilters(!showDetailFilters())}
                  class={`rounded-lg border px-3 py-1.5 text-sm ${
                    showDetailFilters()
                      ? 'bg-accent-primary/10 border-accent-primary text-accent-primary'
                      : 'border-border-default text-text-secondary hover:text-text-primary'
                  }`}
                  title="Toggle filters"
                >
                  <svg
                    class="h-4 w-4"
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
                </button>
                {/* Print Button */}
                <button
                  onClick={handlePrintImports}
                  class="rounded-lg border border-border-default px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary"
                  title="Print imports"
                  disabled={filteredDetailData().length === 0}
                >
                  <svg
                    class="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width={2}
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                    />
                  </svg>
                </button>
                {/* Close Button */}
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
            </div>

            {/* Filter Panel */}
            <Show when={showDetailFilters()}>
              <div class="bg-bg-component mb-4 rounded-lg border border-border-default p-4">
                <div class="grid grid-cols-2 gap-4 md:grid-cols-5">
                  {/* Date From */}
                  <div>
                    <label class="mb-1 block text-xs text-text-secondary">
                      Date From
                    </label>
                    <input
                      type="date"
                      value={detailFilters().dateFrom}
                      onInput={(e) =>
                        setDetailFilters({
                          ...detailFilters(),
                          dateFrom: e.currentTarget.value,
                        })
                      }
                      class="bg-bg-input w-full rounded border border-border-default px-2 py-1.5 text-sm text-text-primary"
                    />
                  </div>
                  {/* Date To */}
                  <div>
                    <label class="mb-1 block text-xs text-text-secondary">
                      Date To
                    </label>
                    <input
                      type="date"
                      value={detailFilters().dateTo}
                      onInput={(e) =>
                        setDetailFilters({
                          ...detailFilters(),
                          dateTo: e.currentTarget.value,
                        })
                      }
                      class="bg-bg-input w-full rounded border border-border-default px-2 py-1.5 text-sm text-text-primary"
                    />
                  </div>
                  {/* Price Min */}
                  <div>
                    <label class="mb-1 block text-xs text-text-secondary">
                      Min Price
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={detailFilters().priceMin}
                      onInput={(e) =>
                        setDetailFilters({
                          ...detailFilters(),
                          priceMin: e.currentTarget.value,
                        })
                      }
                      class="bg-bg-input w-full rounded border border-border-default px-2 py-1.5 text-sm text-text-primary"
                      placeholder="0.00"
                    />
                  </div>
                  {/* Price Max */}
                  <div>
                    <label class="mb-1 block text-xs text-text-secondary">
                      Max Price
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={detailFilters().priceMax}
                      onInput={(e) =>
                        setDetailFilters({
                          ...detailFilters(),
                          priceMax: e.currentTarget.value,
                        })
                      }
                      class="bg-bg-input w-full rounded border border-border-default px-2 py-1.5 text-sm text-text-primary"
                      placeholder="0.00"
                    />
                  </div>
                  {/* Status */}
                  <div>
                    <label class="mb-1 block text-xs text-text-secondary">
                      Status
                    </label>
                    <select
                      value={detailFilters().status}
                      onInput={(e) =>
                        setDetailFilters({
                          ...detailFilters(),
                          status: e.currentTarget.value,
                        })
                      }
                      class="bg-bg-input w-full rounded border border-border-default px-2 py-1.5 text-sm text-text-primary"
                    >
                      <option value="">All</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                {/* Clear Filters */}
                <div class="mt-3 flex justify-end">
                  <button
                    onClick={resetDetailFilters}
                    class="text-sm text-text-secondary hover:text-text-primary"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </Show>

            {/* Results Summary */}
            <Show when={detailData() && detailData()!.length > 0}>
              <div class="mb-3 text-sm text-text-secondary">
                Showing {filteredDetailData().length} of {detailData()!.length}{' '}
                imports
              </div>
            </Show>

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
                when={filteredDetailData().length > 0}
                fallback={
                  <div class="py-12 text-center">
                    <p class="text-text-secondary">
                      {detailData() && detailData()!.length > 0
                        ? 'No imports match filters'
                        : 'No imports found'}
                    </p>
                  </div>
                }
              >
                <div class="space-y-3">
                  <For each={filteredDetailData()}>
                    {(item: any) => (
                      <div class="rounded-lg border border-border-default p-4 hover:bg-bg-hover">
                        <div class="flex items-start justify-between">
                          <div class="flex-1">
                            {/* Import Details */}
                            <div class="text-sm">
                              <p class="font-medium text-text-primary">
                                <CopyableId
                                  id={item._id || ''}
                                  prefix="Import"
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
                                {item.itemsReceivedDate
                                  ? new Date(
                                      item.itemsReceivedDate
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
