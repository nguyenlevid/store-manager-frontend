/**
 * Transactions (Orders) API
 *
 * Handles all transaction/order related API calls
 */

import { apiClient } from '@/shared/lib/api-client';
import type {
  Transaction,
  TransactionFormData,
  TransactionFilters,
} from '@/shared/types/transaction.types';

/**
 * Backend Transaction type (from MongoDB)
 */
interface BackendTransaction {
  _id: string;
  business: string;
  clientId:
    | string
    | {
        _id: string;
        partnerName: string;
        email?: string;
        phoneNumber?: string;
      };
  item: Array<{
    itemId: string | { _id: string; name: string };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalPrice: number;
  status: 'pending' | 'completed' | 'cancelled';
  itemsDeliveredDate?: string;
  paymentCompletedDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Map backend transaction to frontend Transaction type
 */
function mapBackendTransaction(transaction: BackendTransaction): Transaction {
  if (!transaction) {
    throw new Error('Transaction is null or undefined');
  }

  const transactionId = transaction._id || (transaction as any).id;

  if (!transactionId) {
    console.error('❌ Transaction missing both _id and id:', transaction);
    throw new Error('Transaction missing _id or id field');
  }

  // Handle populated client
  const clientId =
    typeof transaction.clientId === 'string'
      ? transaction.clientId
      : transaction.clientId._id;
  const clientName =
    typeof transaction.clientId === 'object'
      ? transaction.clientId.partnerName
      : undefined;
  const clientEmail =
    typeof transaction.clientId === 'object'
      ? transaction.clientId.email
      : undefined;
  const clientPhoneNumber =
    typeof transaction.clientId === 'object'
      ? transaction.clientId.phoneNumber
      : undefined;

  // Map items
  const items = transaction.item.map((item) => {
    const itemId =
      typeof item.itemId === 'string' ? item.itemId : item.itemId._id;
    const itemName =
      typeof item.itemId === 'object' ? item.itemId.name : undefined;

    return {
      itemId,
      itemName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    };
  });

  return {
    id: transactionId,
    business: transaction.business,
    clientId,
    clientName,
    clientEmail,
    clientPhoneNumber,
    items,
    totalPrice: transaction.totalPrice,
    status: transaction.status,
    itemsDeliveredDate: transaction.itemsDeliveredDate,
    paymentCompletedDate: transaction.paymentCompletedDate,
    createdAt: transaction.createdAt || new Date().toISOString(),
    updatedAt: transaction.updatedAt || new Date().toISOString(),
  };
}

/**
 * Get all transactions with optional filters
 */
export async function getTransactions(
  filters?: TransactionFilters
): Promise<Transaction[]> {
  const params = new URLSearchParams();

  if (filters?.status && filters.status !== 'all') {
    params.append('status', filters.status);
  }
  if (filters?.clientId) {
    params.append('clientId', filters.clientId);
  }
  if (filters?.page) {
    params.append('page', filters.page.toString());
  }
  if (filters?.limit) {
    params.append('limit', filters.limit.toString());
  }
  if (filters?.sortBy) {
    params.append('sortBy', filters.sortBy);
  }
  if (filters?.order) {
    params.append('order', filters.order);
  }

  const queryString = params.toString();
  const endpoint = queryString ? `/transaction?${queryString}` : '/transaction';

  const response = await apiClient.get<{
    items: BackendTransaction[];
    pagination: any;
  }>(endpoint);

  // Handle both paginated and non-paginated responses
  const backendTransactions = response?.items || [];
  let transactions = Array.isArray(backendTransactions)
    ? backendTransactions.map(mapBackendTransaction)
    : [];

  // Client-side search filter (applied after pagination)
  if (filters?.search) {
    const search = filters.search.toLowerCase();
    transactions = transactions.filter(
      (txn) =>
        txn.clientName?.toLowerCase().includes(search) ||
        txn.id.toLowerCase().includes(search)
    );
  }

  return transactions;
}

/**
 * Get transactions with pagination info
 */
export async function getTransactionsWithPagination(
  filters?: TransactionFilters
): Promise<{ transactions: Transaction[]; pagination: any }> {
  const params = new URLSearchParams();

  if (filters?.status && filters.status !== 'all') {
    params.append('status', filters.status);
  }
  if (filters?.clientId) {
    params.append('clientId', filters.clientId);
  }
  if (filters?.page) {
    params.append('page', filters.page.toString());
  }
  if (filters?.limit) {
    params.append('limit', filters.limit.toString());
  }
  if (filters?.sortBy) {
    params.append('sortBy', filters.sortBy);
  }
  if (filters?.order) {
    params.append('order', filters.order);
  }

  const queryString = params.toString();
  const endpoint = queryString ? `/transaction?${queryString}` : '/transaction';

  const response = await apiClient.get<{
    items: BackendTransaction[];
    pagination: any;
  }>(endpoint);

  const backendTransactions = response?.items || [];
  const transactions = Array.isArray(backendTransactions)
    ? backendTransactions.map(mapBackendTransaction)
    : [];

  return {
    transactions,
    pagination: response?.pagination || {
      page: 1,
      limit: 20,
      total: transactions.length,
      pages: 1,
    },
  };
}

/**
 * Get pending transactions only
 */
export async function getPendingTransactions(): Promise<Transaction[]> {
  return getTransactions({ status: 'pending' });
}

/**
 * Get single transaction by ID
 */
export async function getTransactionById(
  transactionId: string
): Promise<Transaction> {
  const backendTransaction = await apiClient.get<BackendTransaction>(
    `/transaction/${transactionId}`
  );
  return mapBackendTransaction(backendTransaction);
}

/**
 * Create new transaction (order)
 */
export async function createTransaction(
  data: TransactionFormData
): Promise<Transaction> {
  // Calculate totals
  const items = data.items.map((item) => ({
    itemId: item.itemId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.quantity * item.unitPrice,
  }));

  const totalPrice = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const payload = {
    clientId: data.clientId,
    item: items,
    totalPrice,
    status: data.status || 'pending',
  };

  const backendTransaction = await apiClient.post<BackendTransaction>(
    '/transaction',
    payload
  );
  return mapBackendTransaction(backendTransaction);
}

/**
 * Update transaction details
 */
export async function updateTransaction(
  transactionId: string,
  updates: Partial<TransactionFormData>
): Promise<Transaction> {
  // Recalculate totals if items updated
  let payload: any = { ...updates };

  if (updates.items) {
    const items = updates.items.map((item) => ({
      itemId: item.itemId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
    }));

    const totalPrice = items.reduce((sum, item) => sum + item.totalPrice, 0);

    payload = {
      ...payload,
      item: items,
      totalPrice,
    };
  }

  const backendTransaction = await apiClient.put<BackendTransaction>(
    `/transaction/${transactionId}`,
    payload
  );
  return mapBackendTransaction(backendTransaction);
}

/**
 * Execute transaction action
 */
export async function executeTransactionAction(
  transactionId: string,
  action:
    | 'markPending'
    | 'markCompleted'
    | 'markCancelled'
    | 'markItemsDelivered'
    | 'markPaymentCompleted'
): Promise<Transaction> {
  const response = await apiClient.patch<{
    message: string;
    transaction: BackendTransaction;
  }>(`/transaction/${transactionId}/action`, { action });
  return mapBackendTransaction(response.transaction);
}

/**
 * Mark transaction items as delivered (deducts from inventory)
 * Server generates timestamp automatically
 */
export async function markItemsDelivered(
  transactionId: string
): Promise<Transaction> {
  return executeTransactionAction(transactionId, 'markItemsDelivered');
}

/**
 * Mark transaction payment as completed
 * Server generates timestamp automatically
 */
export async function completeTransactionPayment(
  transactionId: string
): Promise<Transaction> {
  return executeTransactionAction(transactionId, 'markPaymentCompleted');
}

/**
 * Mark transaction as pending
 */
export async function markTransactionPending(
  transactionId: string
): Promise<Transaction> {
  return executeTransactionAction(transactionId, 'markPending');
}

/**
 * Mark transaction as completed
 */
export async function completeTransaction(
  transactionId: string
): Promise<Transaction> {
  return executeTransactionAction(transactionId, 'markCompleted');
}

/**
 * Cancel transaction
 */
export async function cancelTransaction(
  transactionId: string
): Promise<Transaction> {
  return executeTransactionAction(transactionId, 'markCancelled');
}

/**
 * Delete transaction
 */
export async function deleteTransaction(transactionId: string): Promise<void> {
  await apiClient.delete(`/transaction/${transactionId}`);
}
