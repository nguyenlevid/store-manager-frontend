import {
  createSignal,
  createResource,
  Show,
  For,
  Index,
  createEffect,
} from 'solid-js';
import { createStore } from 'solid-js/store';
import { useSearchParams } from '@solidjs/router';
import { Button } from '@/shared/ui/Button';
import { Card, CardBody, CopyableId } from '@/shared/ui';
import {
  getImportsWithPagination,
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
import {
  formatCurrency as sharedFormatCurrency,
  formatDate as sharedFormatDate,
} from '@/shared/lib/format';
import { getBusiness } from '@/shared/stores/business.store';
import type { Import, ImportFormData } from '@/shared/types/import.types';

type ModalMode =
  | 'create'
  | 'edit'
  | 'delete'
  | 'detail'
  | 'confirm-action'
  | null;

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
  quantity: string;
  unitPrice: string;
}

interface AdvancedFilters {
  supplierId: string;
  dateFrom: string;
  dateTo: string;
  priceMin: string;
  priceMax: string;
  sortBy: 'createdAt' | 'totalPrice' | 'supplierName';
  sortOrder: 'asc' | 'desc';
}

export default function ImportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = createSignal<
    'all' | 'pending' | 'completed' | 'cancelled'
  >('all');
  const [searchTerm, setSearchTerm] = createSignal('');
  const [currentPage, setCurrentPage] = createSignal(1);
  const [paginationInfo, setPaginationInfo] = createSignal<any>(null);
  const [modalMode, setModalMode] = createSignal<ModalMode>(null);
  const [selectedImport, setSelectedImport] = createSignal<Import | null>(null);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [confirmAction, setConfirmAction] = createSignal<ConfirmAction | null>(
    null
  );

  // Advanced filters state
  const [showAdvancedFilters, setShowAdvancedFilters] = createSignal(false);
  const [advancedFilters, setAdvancedFilters] = createSignal<AdvancedFilters>({
    supplierId: '',
    dateFrom: '',
    dateTo: '',
    priceMin: '',
    priceMax: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Multi-select state for printing
  const [selectedImports, setSelectedImports] = createSignal<Set<string>>(
    new Set()
  );

  // Print mode: 'report' (A4 business report) or 'receipt' (thermal 80mm)
  const [printMode, setPrintMode] = createSignal<'report' | 'receipt'>(
    'report'
  );

  // Form state
  const [supplierId, setSupplierId] = createSignal<string>('');
  const [formItems, setFormItems] = createStore<FormItem[]>([]);

  // Resources
  const [suppliers] = createResource(() => getSuppliers());
  const [items] = createResource(() => getInventoryItems());
  const business = getBusiness;

  // Fetch imports with all filters (server-side filtering)
  const [imports, { refetch }] = createResource(
    // Reactive dependency - will refetch when any of these change
    () => {
      const advFilters = advancedFilters();
      return {
        status: filter() === 'all' ? undefined : filter(),
        search: searchTerm() || undefined,
        supplierId: advFilters.supplierId || undefined,
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
      const response = await getImportsWithPagination(filters);
      setPaginationInfo(response.pagination);
      return response.imports;
    }
  );

  // Debounced search - only trigger after user stops typing
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;
  const handleSearchChange = (value: string) => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      setSearchTerm(value);
      setCurrentPage(1);
    }, 300);
  };

  // Handle advanced filter changes (trigger refetch)
  const handleAdvancedFilterChange = <K extends keyof AdvancedFilters>(
    key: K,
    value: AdvancedFilters[K]
  ) => {
    setAdvancedFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Reset advanced filters but keep status
  const resetAdvancedFilters = () => {
    setAdvancedFilters({
      supplierId: '',
      dateFrom: '',
      dateTo: '',
      priceMin: '',
      priceMax: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  };

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

  // Filter imports by search term (now mostly handled server-side)
  const filteredImports = () => {
    return imports() || [];
  };

  // Multi-select handlers
  const toggleSelectImport = (importId: string) => {
    setSelectedImports((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(importId)) {
        newSet.delete(importId);
      } else {
        newSet.add(importId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    const filtered = filteredImports();
    const currentSelected = selectedImports();

    if (currentSelected.size === filtered.length && filtered.length > 0) {
      // Deselect all
      setSelectedImports(new Set<string>());
    } else {
      // Select all filtered
      setSelectedImports(new Set<string>(filtered.map((imp) => imp.id)));
    }
  };

  const clearSelection = () => {
    setSelectedImports(new Set<string>());
  };

  // Group imports by date for organized printing
  const groupImportsByDate = (importRecords: Import[]) => {
    const grouped: Record<string, Import[]> = {};

    importRecords.forEach((imp) => {
      const dateKey = new Date(imp.createdAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(imp);
    });

    // Sort dates (newest first)
    const sortedDates = Object.keys(grouped).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    return { grouped, sortedDates };
  };

  // Print handler - supports Report (A4 vertical) and Receipt (thermal 80mm) modes
  const handlePrintReceipts = () => {
    const selected = selectedImports();
    if (selected.size === 0) return;

    const importsToPrint = filteredImports().filter((imp) =>
      selected.has(imp.id)
    );
    const { grouped, sortedDates } = groupImportsByDate(importsToPrint);

    // Get business info for header
    const businessInfo = business();
    const businessName = businessInfo?.name || 'Store Manager';
    const businessAddress = businessInfo?.address || '';
    const businessPhone = businessInfo?.phoneNumber || '';
    const businessEmail = businessInfo?.email || '';

    // Calculate summary totals
    const totalAmount = importsToPrint.reduce(
      (sum, imp) => sum + imp.totalPrice,
      0
    );
    const totalImports = importsToPrint.length;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const isReceipt = printMode() === 'receipt';

    if (isReceipt) {
      // RECEIPT MODE - Thermal 80mm compact style
      const importsHtml = importsToPrint
        .map(
          (imp) => `
        <div class="import-section">
          <div class="import-header">
            <span class="import-id">#${imp.id.slice(-8).toUpperCase()}</span>
            <span>${new Date(imp.createdAt).toLocaleDateString()} ${new Date(imp.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div class="supplier-name">${imp.supplierName || 'No Supplier'}</div>
          <table class="items-table">
            ${imp.items
              .map(
                (item) => `
              <tr>
                <td class="item-name">${item.itemName || 'Item'}</td>
                <td class="item-qty">${item.quantity}</td>
                <td class="item-total">$${item.totalPrice.toFixed(2)}</td>
              </tr>
            `
              )
              .join('')}
          </table>
          <div class="import-total">
            <span>Total:</span>
            <span>$${imp.totalPrice.toFixed(2)}</span>
          </div>
        </div>
      `
        )
        .join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Import Receipt - ${new Date().toLocaleDateString()}</title>
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                width: 80mm;
                padding: 5mm;
                background: #fff;
              }
              .header {
                text-align: center;
                padding-bottom: 8px;
                margin-bottom: 8px;
                border-bottom: 1px dashed #000;
              }
              .business-name { font-size: 16px; font-weight: bold; }
              .business-info { font-size: 10px; color: #333; }
              .report-title { font-size: 12px; font-weight: bold; margin-top: 4px; color: #0066cc; }
              .import-section {
                padding: 8px 0;
                border-bottom: 1px dashed #ccc;
                page-break-inside: avoid;
              }
              .import-header {
                display: flex;
                justify-content: space-between;
                font-size: 10px;
                margin-bottom: 4px;
              }
              .import-id { font-weight: bold; }
              .supplier-name { font-size: 11px; margin-bottom: 4px; }
              .items-table { width: 100%; border-collapse: collapse; }
              .items-table td { padding: 2px 0; font-size: 11px; }
              .item-name { text-align: left; }
              .item-qty { text-align: center; width: 30px; }
              .item-total { text-align: right; width: 50px; }
              .import-total {
                display: flex;
                justify-content: space-between;
                font-weight: bold;
                padding-top: 4px;
                border-top: 1px dotted #999;
                margin-top: 4px;
              }
              .grand-total {
                text-align: center;
                padding: 10px 0;
                margin-top: 8px;
                border-top: 2px solid #000;
                font-weight: bold;
                font-size: 14px;
              }
              .footer {
                text-align: center;
                font-size: 10px;
                padding-top: 8px;
                color: #666;
              }
              @media print {
                body { width: 80mm; }
                .import-section { break-inside: avoid; }
              }
              @page { margin: 0; size: 80mm auto; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="business-name">${businessName}</div>
              ${businessAddress ? `<div class="business-info">${businessAddress}</div>` : ''}
              ${businessPhone ? `<div class="business-info">${businessPhone}</div>` : ''}
              <div class="report-title">PURCHASE IMPORTS</div>
            </div>
            
            ${importsHtml}
            
            <div class="grand-total">
              <div>GRAND TOTAL: $${totalAmount.toFixed(2)}</div>
              <div style="font-size: 11px; font-weight: normal;">${totalImports} import${totalImports > 1 ? 's' : ''}</div>
            </div>
            
            <div class="footer">
              <p>${new Date().toLocaleString()}</p>
              <p>Purchase Report</p>
            </div>
          </body>
        </html>
      `);
    } else {
      // REPORT MODE - A4 business report with vertical layout
      const dateGroupsHtml = sortedDates
        .map((dateKey) => {
          const dateImports = grouped[dateKey] ?? [];
          const dateTotal = dateImports.reduce(
            (sum, imp) => sum + imp.totalPrice,
            0
          );

          const importsHtml = dateImports
            .map(
              (imp) => `
            <tr class="import-row">
              <td class="import-id">#${imp.id.slice(-8).toUpperCase()}</td>
              <td class="supplier">${imp.supplierName || 'No Supplier'}</td>
              <td class="items-count">${imp.items.length} items</td>
              <td class="status ${imp.status}">${imp.status}</td>
              <td class="total">$${imp.totalPrice.toFixed(2)}</td>
            </tr>
            <tr class="import-items">
              <td colspan="5">
                <table class="items-detail">
                  ${imp.items
                    .map(
                      (item) => `
                    <tr>
                      <td class="item-name">${item.itemName || 'Item'}</td>
                      <td class="item-qty">${item.quantity} x $${item.unitPrice.toFixed(2)}</td>
                      <td class="item-total">$${item.totalPrice.toFixed(2)}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </table>
              </td>
            </tr>
          `
            )
            .join('');

          return `
            <div class="date-group">
              <div class="date-header">
                <h3>${dateKey}</h3>
                <span class="date-total">${dateImports.length} imports - $${dateTotal.toFixed(2)}</span>
              </div>
              <table class="imports-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Supplier</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${importsHtml}
                </tbody>
              </table>
            </div>
          `;
        })
        .join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Import Report - ${new Date().toLocaleDateString()}</title>
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
                padding-bottom: 20px;
                margin-bottom: 20px;
                border-bottom: 2px solid #0066cc;
              }
              .business-name { font-size: 24px; font-weight: bold; color: #0066cc; }
              .business-info { font-size: 12px; color: #666; margin-top: 4px; }
              .report-title { font-size: 16px; font-weight: bold; margin-top: 10px; color: #333; }
              .summary {
                display: flex;
                justify-content: space-between;
                padding: 15px;
                background: #f5f5f5;
                border-radius: 8px;
                margin-bottom: 20px;
              }
              .summary-item { text-align: center; }
              .summary-value { font-size: 20px; font-weight: bold; color: #0066cc; }
              .summary-label { font-size: 11px; color: #666; }
              .date-group { margin-bottom: 25px; page-break-inside: avoid; }
              .date-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 15px;
                background: #0066cc;
                color: white;
                border-radius: 6px 6px 0 0;
              }
              .date-header h3 { margin: 0; font-size: 14px; }
              .date-total { font-size: 12px; }
              .imports-table {
                width: 100%;
                border-collapse: collapse;
                background: #fff;
                border: 1px solid #ddd;
              }
              .imports-table th {
                background: #f0f0f0;
                padding: 10px;
                text-align: left;
                font-size: 11px;
                text-transform: uppercase;
                color: #666;
              }
              .import-row td { padding: 10px; border-bottom: 1px solid #eee; }
              .import-id { font-weight: bold; color: #0066cc; }
              .status { font-size: 10px; padding: 2px 6px; border-radius: 10px; }
              .status.completed { background: #dcfce7; color: #166534; }
              .status.pending { background: #fef3c7; color: #92400e; }
              .status.cancelled { background: #fee2e2; color: #991b1b; }
              .total { text-align: right; font-weight: bold; }
              .import-items td { padding: 5px 10px 15px 10px; background: #fafafa; }
              .items-detail { width: 100%; margin-left: 20px; }
              .items-detail td { padding: 3px 10px; font-size: 11px; color: #666; }
              .item-total { text-align: right; }
              .footer {
                text-align: center;
                padding-top: 20px;
                margin-top: 30px;
                border-top: 1px solid #ddd;
                color: #999;
                font-size: 10px;
              }
              @media print {
                body { padding: 10mm; }
                .date-group { break-inside: avoid; }
              }
              @page { margin: 10mm; size: A4 portrait; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="business-name">${businessName}</div>
              ${businessAddress ? `<div class="business-info">${businessAddress}</div>` : ''}
              ${businessPhone || businessEmail ? `<div class="business-info">${[businessPhone, businessEmail].filter(Boolean).join(' | ')}</div>` : ''}
              <div class="report-title">PURCHASE IMPORT REPORT</div>
            </div>
            
            <div class="summary">
              <div class="summary-item">
                <div class="summary-value">${totalImports}</div>
                <div class="summary-label">Total Imports</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">$${totalAmount.toFixed(2)}</div>
                <div class="summary-label">Total Value</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">$${(totalAmount / totalImports).toFixed(2)}</div>
                <div class="summary-label">Average Import</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">${sortedDates.length}</div>
                <div class="summary-label">Days</div>
              </div>
            </div>
            
            ${dateGroupsHtml}
            
            <div class="footer">
              <p>Generated on ${new Date().toLocaleString()}</p>
              <p>Purchase Import Report - ${businessName}</p>
            </div>
          </body>
        </html>
      `);
    }

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const formatCurrency = (amount: number) =>
    sharedFormatCurrency(amount, business()?.currency);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return sharedFormatDate(dateString, business()?.timezone);
  };

  // Modal handlers
  const openCreateModal = () => {
    setSupplierId('');
    setFormItems([{ itemId: '', quantity: '1', unitPrice: '0' }]);
    setError(null);
    setModalMode('create');
  };

  const openEditModal = (importRecord: Import) => {
    setSelectedImport(importRecord);
    setSupplierId(importRecord.supplierId || '');
    setFormItems(
      importRecord.items.map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
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
    // Clear URL params when closing modal
    if (searchParams['id']) {
      setSearchParams({ id: undefined });
    }
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

  // CRUD handlers
  const handleCreate = async (e: Event) => {
    e.preventDefault();
    if (formItems.length === 0 || formItems.some((item) => !item.itemId)) {
      setError('Please add at least one item with all fields filled');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData: ImportFormData = {
        supplierId: supplierId() || undefined,
        items: formItems.map((item) => ({
          itemId: item.itemId,
          quantity: parseInt(item.quantity) || 0,
          unitPrice: parseFloat(item.unitPrice) || 0,
        })),
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

    if (formItems.length === 0 || formItems.some((item) => !item.itemId)) {
      setError('Please add at least one item with all fields filled');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData: Partial<ImportFormData> = {
        supplierId: supplierId() || undefined,
        items: formItems.map((item) => ({
          itemId: item.itemId,
          quantity: parseInt(item.quantity) || 0,
          unitPrice: parseFloat(item.unitPrice) || 0,
        })),
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

  // Handle id query param (from dashboard recent imports)
  createEffect(() => {
    const importId = searchParams['id'];
    if (importId && imports()) {
      const importItem = imports()?.find((i) => i.id === importId);
      if (importItem) {
        setSelectedImport(importItem);
        setModalMode('detail');
      }
    }
  });

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

      {/* Search and Filters */}
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-wrap gap-2">
          <Button
            variant={filter() === 'all' ? 'primary' : 'outline'}
            onClick={() => changeFilter('all')}
          >
            All Imports
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

        <div class="flex items-center gap-2">
          <div class="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search by ID, supplier, email, phone..."
              onInput={(e) => handleSearchChange(e.currentTarget.value)}
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
          <Button
            variant={showAdvancedFilters() ? 'primary' : 'outline'}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters())}
            title="Advanced Filters"
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
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          </Button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <Show when={showAdvancedFilters()}>
        <Card>
          <CardBody>
            <div class="mb-4 flex items-center justify-between">
              <h3 class="font-semibold text-text-primary">Advanced Filters</h3>
              <Button variant="ghost" size="sm" onClick={resetAdvancedFilters}>
                Reset Filters
              </Button>
            </div>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Supplier Filter */}
              <div>
                <label class="mb-1 block text-sm font-medium text-text-secondary">
                  Supplier
                </label>
                <select
                  value={advancedFilters().supplierId}
                  onChange={(e) =>
                    handleAdvancedFilterChange(
                      'supplierId',
                      e.currentTarget.value
                    )
                  }
                  class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                >
                  <option value="">All Suppliers</option>
                  <For each={suppliers()}>
                    {(supplier) => (
                      <option value={supplier.id}>
                        {supplier.partnerName}
                      </option>
                    )}
                  </For>
                </select>
              </div>

              {/* Date From */}
              <div>
                <label class="mb-1 block text-sm font-medium text-text-secondary">
                  Date From
                </label>
                <input
                  type="date"
                  value={advancedFilters().dateFrom}
                  onChange={(e) =>
                    handleAdvancedFilterChange(
                      'dateFrom',
                      e.currentTarget.value
                    )
                  }
                  class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                />
              </div>

              {/* Date To */}
              <div>
                <label class="mb-1 block text-sm font-medium text-text-secondary">
                  Date To
                </label>
                <input
                  type="date"
                  value={advancedFilters().dateTo}
                  onChange={(e) =>
                    handleAdvancedFilterChange('dateTo', e.currentTarget.value)
                  }
                  class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                />
              </div>

              {/* Price Range */}
              <div class="flex gap-2">
                <div class="flex-1">
                  <label class="mb-1 block text-sm font-medium text-text-secondary">
                    Min Price
                  </label>
                  <input
                    type="number"
                    placeholder="$0"
                    value={advancedFilters().priceMin}
                    onChange={(e) =>
                      handleAdvancedFilterChange(
                        'priceMin',
                        e.currentTarget.value
                      )
                    }
                    class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                  />
                </div>
                <div class="flex-1">
                  <label class="mb-1 block text-sm font-medium text-text-secondary">
                    Max Price
                  </label>
                  <input
                    type="number"
                    placeholder="$999"
                    value={advancedFilters().priceMax}
                    onChange={(e) =>
                      handleAdvancedFilterChange(
                        'priceMax',
                        e.currentTarget.value
                      )
                    }
                    class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Sorting Options */}
            <div class="mt-4 flex gap-4 border-t border-border-default pt-4">
              <div class="w-48">
                <label class="mb-1 block text-sm font-medium text-text-secondary">
                  Sort By
                </label>
                <select
                  value={advancedFilters().sortBy}
                  onChange={(e) =>
                    handleAdvancedFilterChange(
                      'sortBy',
                      e.currentTarget.value as AdvancedFilters['sortBy']
                    )
                  }
                  class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                >
                  <option value="createdAt">Date</option>
                  <option value="totalPrice">Total Price</option>
                  <option value="supplierName">Supplier Name</option>
                </select>
              </div>
              <div class="w-36">
                <label class="mb-1 block text-sm font-medium text-text-secondary">
                  Order
                </label>
                <select
                  value={advancedFilters().sortOrder}
                  onChange={(e) =>
                    handleAdvancedFilterChange(
                      'sortOrder',
                      e.currentTarget.value as 'asc' | 'desc'
                    )
                  }
                  class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>
          </CardBody>
        </Card>
      </Show>

      {/* Print Controls */}
      <Show when={selectedImports().size > 0}>
        <Card>
          <CardBody>
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div class="flex items-center gap-3">
                <span class="font-medium text-text-primary">
                  {selectedImports().size} import
                  {selectedImports().size > 1 ? 's' : ''} selected
                </span>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear Selection
                </Button>
              </div>
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-2">
                  <label class="text-sm text-text-secondary">Print Mode:</label>
                  <select
                    value={printMode()}
                    onChange={(e) =>
                      setPrintMode(
                        e.currentTarget.value as 'report' | 'receipt'
                      )
                    }
                    class="rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                  >
                    <option value="report">A4 Report</option>
                    <option value="receipt">Thermal Receipt (80mm)</option>
                  </select>
                </div>
                <Button variant="primary" onClick={handlePrintReceipts}>
                  <svg
                    class="mr-2 h-4 w-4"
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
                  Print Selected
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </Show>

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
                  when={filteredImports().length > 0}
                  fallback={
                    <div class="py-12 text-center">
                      <p class="text-text-secondary">
                        {searchTerm()
                          ? 'No imports match your search'
                          : 'No imports found'}
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
                                selectedImports().size ===
                                  filteredImports().length &&
                                filteredImports().length > 0
                              }
                              onChange={toggleSelectAll}
                              class="h-4 w-4 rounded border-border-default text-accent-primary focus:ring-accent-primary"
                            />
                          </th>
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
                        <For each={filteredImports()}>
                          {(importRecord: Import) => (
                            <tr class="transition-colors hover:bg-bg-hover">
                              <td class="whitespace-nowrap px-4 py-4">
                                <input
                                  type="checkbox"
                                  checked={selectedImports().has(
                                    importRecord.id
                                  )}
                                  onChange={() =>
                                    toggleSelectImport(importRecord.id)
                                  }
                                  class="h-4 w-4 rounded border-border-default text-accent-primary focus:ring-accent-primary"
                                />
                              </td>
                              <td class="whitespace-nowrap px-6 py-4 text-sm text-text-primary">
                                <CopyableId id={importRecord.id} />
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
                                    onClick={() =>
                                      openDetailModal(importRecord)
                                    }
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
                                      importRecord.status !== 'cancelled' &&
                                      !importRecord.itemsReceivedDate
                                    }
                                  >
                                    <button
                                      onClick={() =>
                                        openEditModal(importRecord)
                                      }
                                      class="hover:text-accent-hover text-accent-primary transition-colors"
                                      title="Edit import"
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
                                      importRecord.itemsReceivedDate &&
                                      importRecord.status !== 'cancelled'
                                    }
                                  >
                                    <button
                                      disabled
                                      class="cursor-not-allowed text-text-secondary opacity-50"
                                      title="Cannot edit - items already in inventory. Unmark items first to edit."
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
                                    onClick={() =>
                                      openDeleteModal(importRecord)
                                    }
                                    class="text-status-error-text transition-colors hover:text-red-700"
                                    title="Delete import"
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

                  {/* Pagination Info and Load More */}
                  <Show when={paginationInfo()}>
                    {(pagination) => (
                      <div class="mt-4 flex flex-col gap-2 border-t border-border-default px-6 py-4">
                        <div class="flex items-center justify-between">
                          <div class="text-sm text-text-secondary">
                            <Show
                              when={
                                searchTerm() &&
                                filteredImports().length <
                                  (imports()?.length || 0)
                              }
                              fallback={
                                <>
                                  Showing{' '}
                                  <span class="font-medium text-text-primary">
                                    {filteredImports().length}
                                  </span>{' '}
                                  of{' '}
                                  <span class="font-medium text-text-primary">
                                    {pagination().total}
                                  </span>{' '}
                                  imports
                                  {pagination().pages > 1 && (
                                    <span>
                                      {' '}
                                      (Page {pagination().page} of{' '}
                                      {pagination().pages})
                                    </span>
                                  )}
                                </>
                              }
                            >
                              <span class="font-medium text-text-primary">
                                {filteredImports().length}
                              </span>{' '}
                              imports match your search
                              <span class="text-text-tertiary ml-1">
                                ({imports()?.length || 0} on this page,{' '}
                                {pagination().total} total)
                              </span>
                            </Show>
                          </div>
                          <Show when={pagination().page < pagination().pages}>
                            <Button
                              variant="outline"
                              onClick={loadMore}
                              disabled={imports.loading}
                            >
                              {imports.loading ? 'Loading...' : 'Load More'}
                            </Button>
                          </Show>
                        </div>
                        <Show
                          when={
                            searchTerm() &&
                            filteredImports().length < (imports()?.length || 0)
                          }
                        >
                          <div class="text-xs text-accent-primary">
                            💡 Clear search to see all {imports()?.length || 0}{' '}
                            imports on this page
                          </div>
                        </Show>
                      </div>
                    )}
                  </Show>
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
          <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-bg-surface p-6 shadow-xl">
            <h2 class="mb-4 text-xl font-bold text-text-primary">
              {modalMode() === 'create' ? 'Create Import' : 'Edit Import'}
            </h2>

            <form
              onSubmit={modalMode() === 'create' ? handleCreate : handleUpdate}
            >
              <div class="space-y-4">
                {/* Supplier */}
                <div>
                  <label class="mb-1 block text-sm font-medium text-text-primary">
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
                          <option value={supplier.id}>
                            {supplier.partnerName}
                          </option>
                        )}
                      </For>
                    </Show>
                  </select>
                </div>

                {/* Items */}
                <div>
                  <div class="mb-2 flex items-center justify-between">
                    <label class="block text-sm font-medium text-text-primary">
                      Items *
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addFormItem}
                    >
                      + Add Item
                    </Button>
                  </div>

                  <div class="space-y-3">
                    <Index each={formItems}>
                      {(item, index) => (
                        <div class="flex items-start gap-2 rounded-lg border border-border-default p-3">
                          <div class="flex-1 space-y-2">
                            {/* Item selector */}
                            <select
                              required
                              value={item().itemId}
                              onChange={(e) =>
                                updateFormItem(
                                  index,
                                  'itemId',
                                  e.currentTarget.value
                                )
                              }
                              class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-accent-primary"
                            >
                              <option value="">Select item...</option>
                              <Show when={!items.loading && items()}>
                                <For each={items()}>
                                  {(itemOption) => (
                                    <option value={itemOption.id}>
                                      {itemOption.name}
                                    </option>
                                  )}
                                </For>
                              </Show>
                            </select>

                            <div class="grid grid-cols-2 gap-2">
                              {/* Quantity */}
                              <div>
                                <label class="mb-1 block text-xs text-text-secondary">
                                  Quantity
                                </label>
                                <input
                                  type="text"
                                  inputmode="numeric"
                                  pattern="[0-9]*"
                                  required
                                  name={`quantity-${index}`}
                                  value={item().quantity}
                                  onInput={(e) =>
                                    updateFormItem(
                                      index,
                                      'quantity',
                                      e.currentTarget.value
                                    )
                                  }
                                  class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-accent-primary"
                                />
                              </div>

                              {/* Unit Price */}
                              <div>
                                <label class="mb-1 block text-xs text-text-secondary">
                                  Unit Price
                                </label>
                                <input
                                  type="text"
                                  inputmode="decimal"
                                  pattern="[0-9]*\.?[0-9]*"
                                  required
                                  name={`unitPrice-${index}`}
                                  value={item().unitPrice}
                                  onInput={(e) =>
                                    updateFormItem(
                                      index,
                                      'unitPrice',
                                      e.currentTarget.value
                                    )
                                  }
                                  class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-accent-primary"
                                />
                              </div>
                            </div>

                            {/* Subtotal */}
                            <div class="text-sm text-text-secondary">
                              Subtotal:{' '}
                              <span class="font-semibold text-text-primary">
                                {formatCurrency(
                                  (parseFloat(item().quantity) || 0) *
                                    (parseFloat(item().unitPrice) || 0)
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => removeFormItem(index)}
                            class="text-status-error-text mt-1 hover:text-red-700"
                            disabled={formItems.length === 1}
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
                        </div>
                      )}
                    </Index>
                  </div>

                  {/* Total */}
                  <div class="bg-bg-subtle mt-4 rounded-lg p-3">
                    <div class="flex items-center justify-between">
                      <span class="font-medium text-text-primary">Total:</span>
                      <span class="text-lg font-bold text-text-primary">
                        {formatCurrency(calculateTotal())}
                      </span>
                    </div>
                  </div>
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
              Delete Import
            </h2>

            <p class="mb-6 text-text-secondary">
              Are you sure you want to delete import{' '}
              <strong class="text-text-primary">
                <CopyableId id={selectedImport()!.id} />
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

      {/* Detail Modal */}
      <Show when={modalMode() === 'detail' && selectedImport()}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div class="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-bg-surface p-6 shadow-xl">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-xl font-bold text-text-primary">
                <CopyableId id={selectedImport()!.id} prefix="Import" />
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

            {/* Import Info */}
            <div class="mb-6 space-y-3">
              <div class="flex justify-between border-b border-border-default py-2">
                <span class="text-text-secondary">Supplier:</span>
                <span class="font-medium text-text-primary">
                  {selectedImport()?.supplierName || 'N/A'}
                </span>
              </div>
              <div class="flex justify-between border-b border-border-default py-2">
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
              <div class="flex justify-between border-b border-border-default py-2">
                <span class="text-text-secondary">Total:</span>
                <span class="text-lg font-bold text-text-primary">
                  {formatCurrency(selectedImport()?.totalPrice || 0)}
                </span>
              </div>
              <div class="flex justify-between border-b border-border-default py-2">
                <span class="text-text-secondary">Items Received:</span>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-text-primary">
                    {formatDate(selectedImport()?.itemsReceivedDate)}
                  </span>
                  <Show when={selectedImport()?.itemsReceivedDate}>
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
                </div>
              </div>
              <div class="flex justify-between border-b border-border-default py-2">
                <span class="text-text-secondary">Payment Completed:</span>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-text-primary">
                    {formatDate(selectedImport()?.paymentCompletedDate)}
                  </span>
                  <Show when={selectedImport()?.paymentCompletedDate}>
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
                </div>
              </div>
              <div class="flex justify-between border-b border-border-default py-2">
                <span class="text-text-secondary">Created:</span>
                <span class="font-medium text-text-primary">
                  {formatDate(selectedImport()?.createdAt)}
                </span>
              </div>
            </div>

            {/* Items List */}
            <div>
              <h3 class="mb-3 font-semibold text-text-primary">
                Items ({selectedImport()?.items.length})
              </h3>

              {/* Warning for items received */}
              <Show when={selectedImport()?.itemsReceivedDate}>
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
                        Items have been received and are in inventory. To edit
                        items, you must first unmark them.
                      </p>
                    </div>
                  </div>
                </div>
              </Show>

              <div class="space-y-2">
                <For each={selectedImport()?.items}>
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
            <Show when={selectedImport()?.status === 'pending'}>
              <div class="mt-6">
                <h3 class="mb-3 font-semibold text-text-primary">Actions</h3>
                <div class="space-y-3">
                  {/* Mark Items Received */}
                  <div class="bg-bg-subtle flex items-center justify-between rounded-lg p-3">
                    <div class="flex items-center gap-3">
                      <Show
                        when={selectedImport()?.itemsReceivedDate}
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
                          Mark Items Received
                        </p>
                        <p class="text-sm text-text-secondary">
                          Add items to inventory
                        </p>
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
                              message:
                                'This will add the items to your inventory. Continue?',
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
                            message:
                              'This will remove the items from inventory. Continue?',
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
                        when={selectedImport()?.paymentCompletedDate}
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
                          Mark payment to supplier as complete
                        </p>
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
                  <div class="flex flex-wrap gap-2 border-t border-border-default pt-3">
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
                          message:
                            'Cancel this import? This action cannot be undone.',
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
                <h3 class="mb-3 font-semibold text-text-primary">
                  Reactivate Import
                </h3>
                <p class="mb-3 text-sm text-text-secondary">
                  This will change the status back to pending, allowing you to
                  complete or modify the import.
                </p>
                <Button
                  onClick={() => {
                    handleMarkPending(selectedImport()!.id);
                    closeModal();
                  }}
                  variant="primary"
                  size="sm"
                >
                  Mark as Pending
                </Button>
              </div>
            </Show>
            <Show when={selectedImport()?.status === 'completed'}>
              <div class="mt-6">
                <h3 class="mb-3 font-semibold text-text-primary">
                  Reopen Import
                </h3>
                <p class="mb-3 text-sm text-text-secondary">
                  This will change the status back to pending. Dates (items
                  received, payment completed) will be preserved.
                </p>
                <div class="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      handleMarkPending(selectedImport()!.id);
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

            <p class="mb-6 text-text-secondary">{confirmAction()?.message}</p>

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
                variant={
                  confirmAction()?.type === 'cancelImport'
                    ? 'danger'
                    : 'primary'
                }
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
