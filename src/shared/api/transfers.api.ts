/**
 * Transfers API
 *
 * Handles stock transfer operations between storehouses
 */

import { apiClient } from '@/shared/lib/api-client';
import type {
  Transfer,
  TransferFormData,
  TransferFilters,
} from '@/shared/types/transfer.types';

/**
 * Backend Transfer type (from MongoDB)
 */
interface BackendTransfer {
  _id: string;
  business: string;
  itemId:
    | string
    | { _id: string; name: string; unit?: string; quantity?: number };
  fromStoreHouse: string | { _id: string; name: string };
  toStoreHouse: string | { _id: string; name: string };
  quantity: number;
  status: 'pending' | 'completed' | 'cancelled';
  note?: string;
  transferredAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Map backend transfer to frontend Transfer type
 */
function mapBackendTransfer(t: BackendTransfer): Transfer {
  const transferId = t._id || (t as any).id;

  const itemId = typeof t.itemId === 'string' ? t.itemId : t.itemId._id;
  const itemName = typeof t.itemId === 'object' ? t.itemId.name : undefined;
  const itemUnit = typeof t.itemId === 'object' ? t.itemId.unit : undefined;
  const itemQuantity =
    typeof t.itemId === 'object' ? t.itemId.quantity : undefined;

  const fromStoreHouse =
    typeof t.fromStoreHouse === 'string'
      ? t.fromStoreHouse
      : t.fromStoreHouse._id;
  const fromStoreHouseName =
    typeof t.fromStoreHouse === 'object' ? t.fromStoreHouse.name : undefined;

  const toStoreHouse =
    typeof t.toStoreHouse === 'string' ? t.toStoreHouse : t.toStoreHouse._id;
  const toStoreHouseName =
    typeof t.toStoreHouse === 'object' ? t.toStoreHouse.name : undefined;

  return {
    id: transferId,
    business: t.business,
    itemId,
    itemName,
    itemUnit,
    itemQuantity,
    fromStoreHouse,
    fromStoreHouseName,
    toStoreHouse,
    toStoreHouseName,
    quantity: t.quantity,
    status: t.status,
    note: t.note,
    transferredAt: t.transferredAt,
    createdAt: t.createdAt || '',
    updatedAt: t.updatedAt || '',
  };
}

/**
 * Get transfers with pagination and filters
 */
export async function getTransfers(
  filters: TransferFilters = {}
): Promise<Transfer[]> {
  const params: Record<string, string> = {};

  if (filters.status && filters.status !== 'all')
    params['status'] = filters.status;
  if (filters.itemId) params['itemId'] = filters.itemId;
  if (filters.fromStoreHouse) params['fromStoreHouse'] = filters.fromStoreHouse;
  if (filters.toStoreHouse) params['toStoreHouse'] = filters.toStoreHouse;
  if (filters.dateFrom) params['dateFrom'] = filters.dateFrom;
  if (filters.dateTo) params['dateTo'] = filters.dateTo;
  if (filters.page) params['page'] = String(filters.page);
  if (filters.limit) params['limit'] = String(filters.limit);
  if (filters.sortBy) params['sortBy'] = filters.sortBy;
  if (filters.sortOrder) params['sortOrder'] = filters.sortOrder;

  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `/transfer?${queryString}` : '/transfer';

  const result = await apiClient.get<any>(url);

  // apiClient already unwraps { isOk, data } → result IS the data
  if (result?.items) {
    return result.items.map(mapBackendTransfer);
  }

  if (Array.isArray(result)) {
    return result.map(mapBackendTransfer);
  }

  return [];
}

/**
 * Get transfers for a specific item
 */
export async function getTransfersByItem(itemId: string): Promise<Transfer[]> {
  const result = await apiClient.get<any>(`/transfer/item/${itemId}`);

  if (Array.isArray(result)) {
    return result.map(mapBackendTransfer);
  }

  return [];
}

/**
 * Create a new transfer
 */
export async function createTransfer(
  data: TransferFormData
): Promise<Transfer> {
  const result = await apiClient.post<any>('/transfer', data);
  return mapBackendTransfer(result);
}

/**
 * Execute a transfer action (complete / cancel)
 */
export async function executeTransferAction(
  id: string,
  action: 'complete' | 'cancel'
): Promise<{ message: string; transfer: Transfer }> {
  const result = await apiClient.patch<any>(`/transfer/${id}/action`, {
    action,
  });
  return {
    message: result.message,
    transfer: mapBackendTransfer(result.transfer),
  };
}

/**
 * Delete a pending transfer
 */
export async function deleteTransfer(id: string): Promise<void> {
  await apiClient.delete(`/transfer/${id}`);
}
