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
  getCurrentBusiness,
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
  unitPrice: string; // Actual selling price (listedPrice fetched from DB on backend)
}

interface AdvancedFilters {
  clientId: string;
  dateFrom: string;
  dateTo: string;
  priceMin: string;
  priceMax: string;
  sortBy: 'createdAt' | 'totalPrice' | 'clientName';
  sortOrder: 'asc' | 'desc';
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

  // Advanced filters state
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

  // Multi-select state for printing
  const [selectedOrders, setSelectedOrders] = createSignal<Set<string>>(
    new Set()
  );

  // Print mode: 'report' (A4 business report) or 'receipt' (thermal 80mm)
  const [printMode, setPrintMode] = createSignal<'report' | 'receipt'>(
    'report'
  );

  // Form state
  const [clientId, setClientId] = createSignal<string>('');
  const [formItems, setFormItems] = createStore<FormItem[]>([]);

  // Resources
  const [clients] = createResource(() => getClients());
  const [items] = createResource(() => getInventoryItems());
  const [business] = createResource(() => getCurrentBusiness());

  // Fetch transactions with all filters (server-side filtering)
  const [transactions, { refetch }] = createResource(
    // Reactive dependency - will refetch when any of these change
    () => {
      // Return the actual filter values to pass to the fetcher
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
      // filters is the value from the source function above
      const response = await getTransactionsWithPagination(filters);
      setPaginationInfo(response.pagination);
      return response.transactions;
    }
  );

  // Debounced search - only trigger after user stops typing
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;
  const handleSearchChange = (value: string) => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      setSearchTerm(value);
      setCurrentPage(1); // Reset to page 1 when search changes
    }, 300);
  };

  // Handle advanced filter changes (trigger refetch)
  const handleAdvancedFilterChange = <K extends keyof AdvancedFilters>(
    key: K,
    value: AdvancedFilters[K]
  ) => {
    setAdvancedFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to page 1 when filters change
  };

  // Clear all advanced filters
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

  // Get filtered transactions (server does the heavy lifting now)
  // Keep minimal client-side filtering for instant feedback on text search
  const filteredTransactions = () => {
    return transactions() || [];
  };

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
      // Deselect all
      setSelectedOrders(new Set<string>());
    } else {
      // Select all filtered
      setSelectedOrders(new Set<string>(filtered.map((t) => t.id)));
    }
  };

  const clearSelection = () => {
    setSelectedOrders(new Set<string>());
  };

  // Group orders by date for organized printing
  const groupOrdersByDate = (orders: Transaction[]) => {
    const grouped: Record<string, Transaction[]> = {};

    orders.forEach((order) => {
      const dateKey = new Date(order.createdAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(order);
    });

    // Sort dates (newest first)
    const sortedDates = Object.keys(grouped).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    return { grouped, sortedDates };
  };

  // Print handler - supports Report (A4 vertical) and Receipt (thermal 80mm) modes
  const handlePrintReceipts = () => {
    const selected = selectedOrders();
    if (selected.size === 0) return;

    const ordersToPrint = filteredTransactions().filter((t) =>
      selected.has(t.id)
    );
    const { grouped, sortedDates } = groupOrdersByDate(ordersToPrint);

    // Get business info for header
    const businessInfo = business();
    const businessName = businessInfo?.name || 'Store Manager';
    const businessAddress = businessInfo?.address || '';
    const businessPhone = businessInfo?.phoneNumber || '';
    const businessEmail = businessInfo?.email || '';

    // Calculate summary totals
    const totalAmount = ordersToPrint.reduce((sum, o) => sum + o.totalPrice, 0);
    const totalOrders = ordersToPrint.length;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const isReceipt = printMode() === 'receipt';

    if (isReceipt) {
      // RECEIPT MODE - Thermal 80mm compact style
      const ordersHtml = ordersToPrint
        .map(
          (order) => `
        <div class="order-section">
          <div class="order-header">
            <span class="order-id">#${order.id.slice(-8).toUpperCase()}</span>
            <span>${new Date(order.createdAt).toLocaleDateString()} ${new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div class="client-name">${order.clientName || 'Walk-in'}</div>
          <table class="items-table">
            ${order.items
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
          <div class="order-total">
            <span>Total:</span>
            <span>$${order.totalPrice.toFixed(2)}</span>
          </div>
        </div>
      `
        )
        .join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt - ${new Date().toLocaleDateString()}</title>
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
              .order-section {
                padding: 8px 0;
                border-bottom: 1px dashed #ccc;
                page-break-inside: avoid;
              }
              .order-header {
                display: flex;
                justify-content: space-between;
                font-size: 10px;
                margin-bottom: 4px;
              }
              .order-id { font-weight: bold; }
              .client-name { font-size: 11px; margin-bottom: 4px; }
              .items-table { width: 100%; border-collapse: collapse; }
              .items-table td { padding: 2px 0; font-size: 11px; }
              .item-name { text-align: left; }
              .item-qty { text-align: center; width: 30px; }
              .item-total { text-align: right; width: 50px; }
              .order-total {
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
                .order-section { break-inside: avoid; }
              }
              @page { margin: 0; size: 80mm auto; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="business-name">${businessName}</div>
              ${businessAddress ? `<div class="business-info">${businessAddress}</div>` : ''}
              ${businessPhone ? `<div class="business-info">${businessPhone}</div>` : ''}
            </div>
            
            ${ordersHtml}
            
            <div class="grand-total">
              <div>GRAND TOTAL: $${totalAmount.toFixed(2)}</div>
              <div style="font-size: 11px; font-weight: normal;">${totalOrders} order${totalOrders > 1 ? 's' : ''}</div>
            </div>
            
            <div class="footer">
              <p>${new Date().toLocaleString()}</p>
              <p>Thank you!</p>
            </div>
          </body>
        </html>
      `);
    } else {
      // REPORT MODE - A4 business report with vertical layout
      const dateGroupsHtml = sortedDates
        .map((dateKey) => {
          const dateOrders = grouped[dateKey] ?? [];
          const dateTotalAmount = dateOrders.reduce(
            (sum, o) => sum + o.totalPrice,
            0
          );

          const ordersHtml = dateOrders
            .map(
              (order) => `
          <div class="order-card">
            <div class="order-header">
              <div class="order-id">#${order.id.slice(-8).toUpperCase()}</div>
              <div class="order-time">${new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
              <div class="order-status status-${order.status}">${order.status.toUpperCase()}</div>
            </div>
            
            <div class="client-info">
              <strong>${order.clientName || 'Walk-in Customer'}</strong>
              ${order.clientPhoneNumber ? `<span class="client-phone">📞 ${order.clientPhoneNumber}</span>` : ''}
            </div>
            
            <table class="items-table">
              <thead>
                <tr>
                  <th class="item-name">Item</th>
                  <th class="item-qty">Qty</th>
                  <th class="item-price">Price</th>
                  <th class="item-total">Total</th>
                </tr>
              </thead>
              <tbody>
                ${order.items
                  .map(
                    (item) => `
                  <tr>
                    <td class="item-name">${item.itemName || 'Item'}</td>
                    <td class="item-qty">${item.quantity}</td>
                    <td class="item-price">$${item.unitPrice.toFixed(2)}${item.listedPrice !== item.unitPrice ? `<br><s class="original-price">$${item.listedPrice.toFixed(2)}</s>` : ''}</td>
                    <td class="item-total">$${item.totalPrice.toFixed(2)}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
            
            <div class="order-total">
              <span>Order Total:</span>
              <span class="total-amount">$${order.totalPrice.toFixed(2)}</span>
            </div>
          </div>
        `
            )
            .join('');

          return `
          <div class="date-section">
            <div class="date-header">
              <div class="date-separator">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
              <div class="date-title">📅 ${dateKey}</div>
              <div class="date-summary">${dateOrders.length} order${dateOrders.length > 1 ? 's' : ''} • Total: $${dateTotalAmount.toFixed(2)}</div>
              <div class="date-separator">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
            </div>
            <div class="orders-list">
              ${ordersHtml}
            </div>
          </div>
        `;
        })
        .join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Business Report - ${new Date().toLocaleDateString()}</title>
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              
              body {
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 12px;
                line-height: 1.4;
                color: #333;
                background: #fff;
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
              }
              
              .report-header {
                text-align: center;
                padding-bottom: 20px;
                margin-bottom: 20px;
                border-bottom: 3px double #333;
              }
              .business-name { font-size: 28px; font-weight: bold; margin-bottom: 5px; }
              .business-contact {
                font-size: 11px;
                color: #666;
                margin-bottom: 8px;
                display: flex;
                justify-content: center;
                gap: 15px;
                flex-wrap: wrap;
              }
              .report-title { font-size: 18px; color: #666; margin-bottom: 10px; }
              .report-meta { font-size: 11px; color: #888; }
              
              .summary-box {
                display: flex;
                justify-content: space-around;
                background: #f5f5f5;
                padding: 20px;
                margin-bottom: 30px;
                border-radius: 8px;
                border: 1px solid #ddd;
              }
              .summary-item { text-align: center; }
              .summary-value { font-size: 24px; font-weight: bold; color: #2563eb; }
              .summary-label { font-size: 11px; color: #666; text-transform: uppercase; }
              
              .date-section { margin-bottom: 30px; }
              .date-header { text-align: center; margin-bottom: 20px; }
              .date-separator { color: #ccc; font-size: 10px; letter-spacing: 2px; }
              .date-title { font-size: 18px; font-weight: bold; color: #1e40af; margin: 10px 0; }
              .date-summary { font-size: 13px; color: #666; }
              
              /* Vertical list layout */
              .orders-list { 
                display: flex;
                flex-direction: column;
                gap: 15px;
              }
              
              .order-card {
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 15px;
                background: #fafafa;
                page-break-inside: avoid;
              }
              .order-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                padding-bottom: 10px;
                border-bottom: 1px solid #eee;
              }
              .order-id { font-weight: bold; font-family: monospace; font-size: 14px; }
              .order-time { color: #666; font-size: 12px; }
              .order-status { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: bold; }
              .status-pending { background: #fef3c7; color: #92400e; }
              .status-completed { background: #d1fae5; color: #065f46; }
              .status-cancelled { background: #fee2e2; color: #991b1b; }
              
              .client-info { margin-bottom: 12px; font-size: 13px; }
              .client-phone { margin-left: 15px; color: #666; }
              
              .items-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 12px; }
              .items-table th { background: #e5e7eb; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
              .items-table td { padding: 8px; border-bottom: 1px solid #eee; }
              .item-qty, .item-price, .item-total { text-align: center; width: 80px; }
              .item-total { text-align: right; }
              .original-price { color: #999; font-size: 10px; }
              
              .order-total { display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #333; font-weight: bold; font-size: 14px; }
              .total-amount { font-size: 16px; color: #059669; }
              
              .report-footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #333; text-align: center; color: #666; font-size: 12px; }
              
              @media print {
                body { padding: 10px; max-width: none; }
                .order-card { break-inside: avoid; }
                .date-section { break-inside: avoid-page; }
              }
              @page { margin: 0.5in; }
            </style>
          </head>
          <body>
            <div class="report-header">
              <div class="business-name">${businessName}</div>
              ${
                businessAddress || businessPhone || businessEmail
                  ? `
              <div class="business-contact">
                ${businessAddress ? `<span>${businessAddress}</span>` : ''}
                ${businessPhone ? `<span>📞 ${businessPhone}</span>` : ''}
                ${businessEmail ? `<span>✉ ${businessEmail}</span>` : ''}
              </div>
              `
                  : ''
              }
              <div class="report-title">Business Report</div>
              <div class="report-meta">
                Generated on ${new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
            
            <div class="summary-box">
              <div class="summary-item">
                <div class="summary-value">${totalOrders}</div>
                <div class="summary-label">Total Orders</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">$${totalAmount.toFixed(2)}</div>
                <div class="summary-label">Total Revenue</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">${sortedDates.length}</div>
                <div class="summary-label">Days</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">$${(totalAmount / totalOrders).toFixed(2)}</div>
                <div class="summary-label">Avg. Order</div>
              </div>
            </div>
            
            ${dateGroupsHtml}
            
            <div class="report-footer">
              <p>End of Report • ${totalOrders} orders across ${sortedDates.length} day(s)</p>
              <p>Thank you for using Store Manager!</p>
            </div>
          </body>
        </html>
      `);
    }

    printWindow.document.close();
    printWindow.print();
  };

  // Reset advanced filters (alias for clearAdvancedFilters for UI button)
  const resetAdvancedFilters = () => {
    clearAdvancedFilters();
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

    // Auto-populate unitPrice from catalog when item is selected
    if (field === 'itemId' && value) {
      const selectedItem = items()?.find((item) => item.id === value);
      if (selectedItem) {
        setFormItems(index, 'unitPrice', selectedItem.unitPrice.toString());
      }
    }
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
        <div class="flex flex-wrap gap-2">
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

        <div class="flex items-center gap-2">
          <div class="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search by ID, client, email, phone..."
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
              {/* Client Filter */}
              <div>
                <label class="mb-1 block text-sm font-medium text-text-secondary">
                  Client
                </label>
                <select
                  value={advancedFilters().clientId}
                  onChange={(e) =>
                    handleAdvancedFilterChange(
                      'clientId',
                      e.currentTarget.value
                    )
                  }
                  class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                >
                  <option value="">All Clients</option>
                  <For each={clients()}>
                    {(client) => (
                      <option value={client.id}>{client.partnerName}</option>
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
                    placeholder="$∞"
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

              {/* Sort By */}
              <div>
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
                  <option value="clientName">Client Name</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label class="mb-1 block text-sm font-medium text-text-secondary">
                  Order
                </label>
                <select
                  value={advancedFilters().sortOrder}
                  onChange={(e) =>
                    handleAdvancedFilterChange(
                      'sortOrder',
                      e.currentTarget.value as AdvancedFilters['sortOrder']
                    )
                  }
                  class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                >
                  <option value="desc">Newest First / High to Low</option>
                  <option value="asc">Oldest First / Low to High</option>
                </select>
              </div>
            </div>
          </CardBody>
        </Card>
      </Show>

      {/* Selection Actions Bar */}
      <Show when={selectedOrders().size > 0}>
        <div class="bg-accent-primary/10 border-accent-primary/30 flex items-center justify-between rounded-lg border px-4 py-3">
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-text-primary">
              {selectedOrders().size} order
              {selectedOrders().size > 1 ? 's' : ''} selected
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear Selection
            </Button>
            {/* Print mode toggle */}
            <div class="bg-bg-secondary flex items-center gap-1 rounded-lg p-1">
              <button
                onClick={() => setPrintMode('report')}
                class={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  printMode() === 'report'
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                📊 Report
              </button>
              <button
                onClick={() => setPrintMode('receipt')}
                class={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  printMode() === 'receipt'
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                🧾 Receipt
              </button>
            </div>
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
            Print Receipts
          </Button>
        </div>
      </Show>

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
                        <th class="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={
                              selectedOrders().size ===
                                filteredTransactions().length &&
                              filteredTransactions().length > 0
                            }
                            onChange={toggleSelectAll}
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
                      <For each={filteredTransactions()}>
                        {(transaction: Transaction) => (
                          <tr
                            class={`transition-colors hover:bg-bg-hover ${selectedOrders().has(transaction.id) ? 'bg-accent-primary/5' : ''}`}
                          >
                            <td class="whitespace-nowrap px-4 py-4">
                              <input
                                type="checkbox"
                                checked={selectedOrders().has(transaction.id)}
                                onChange={() =>
                                  toggleOrderSelection(transaction.id)
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
                if (modalMode() === 'create') {
                  handleCreate();
                } else {
                  handleUpdate();
                }
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
                          Quantity: {item.quantity}
                        </p>
                        <p class="text-sm text-text-secondary">
                          Listed Price: {formatCurrency(item.listedPrice)}
                        </p>
                        <p class="text-sm text-text-secondary">
                          Sell Price: {formatCurrency(item.unitPrice)}
                          <Show
                            when={
                              item.listedPrice &&
                              item.listedPrice !== item.unitPrice
                            }
                          >
                            <span class="ml-2 text-status-success-text">
                              (
                              {Math.round(
                                (1 - item.unitPrice / item.listedPrice) * 100
                              )}
                              % off)
                            </span>
                          </Show>
                        </p>
                      </div>
                      <div class="text-right">
                        <p class="font-semibold text-text-primary">
                          {formatCurrency(item.totalPrice)}
                        </p>
                        <Show
                          when={
                            item.listedPrice &&
                            item.listedPrice !== item.unitPrice
                          }
                        >
                          <p class="text-xs text-status-success-text">
                            Saved{' '}
                            {formatCurrency(
                              (item.listedPrice - item.unitPrice) *
                                item.quantity
                            )}
                          </p>
                        </Show>
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
