/**
 * Imports API
 *
 * Handles all import (stock purchase) related API calls
 */

import { apiClient } from '@/shared/lib/api-client';
import type {
  Import,
  ImportFormData,
  ImportFilters,
} from '@/shared/types/import.types';

/**
 * Backend Import type (from MongoDB)
 */
interface BackendImport {
  _id: string;
  business: string;
  supplierId?:
    | string
    | { _id: string; partnerName: string; email?: string; phoneNumber?: string }
    | null;
  item: Array<{
    itemId: string | { _id: string; name: string };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalPrice: number;
  status: 'pending' | 'completed' | 'cancelled';
  itemsReceivedDate?: string;
  paymentCompletedDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Map backend import to frontend Import type
 */
function mapBackendImport(importRecord: BackendImport): Import {
  if (!importRecord) {
    throw new Error('Import is null or undefined');
  }

  const importId = importRecord._id || (importRecord as any).id;

  if (!importId) {
    console.error('❌ Import missing both _id and id:', importRecord);
    throw new Error('Import missing _id or id field');
  }

  // Handle populated supplier (can be null/undefined)
  const supplierId = !importRecord.supplierId
    ? undefined
    : typeof importRecord.supplierId === 'string'
      ? importRecord.supplierId
      : importRecord.supplierId._id;
  const supplierName =
    importRecord.supplierId && typeof importRecord.supplierId === 'object'
      ? importRecord.supplierId.partnerName
      : undefined;
  const supplierEmail =
    importRecord.supplierId && typeof importRecord.supplierId === 'object'
      ? importRecord.supplierId.email
      : undefined;
  const supplierPhoneNumber =
    importRecord.supplierId && typeof importRecord.supplierId === 'object'
      ? importRecord.supplierId.phoneNumber
      : undefined;

  // Map items
  const items = importRecord.item.map((item) => {
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
    id: importId,
    business: importRecord.business,
    supplierId,
    supplierName,
    supplierEmail,
    supplierPhoneNumber,
    items,
    totalPrice: importRecord.totalPrice,
    status: importRecord.status,
    itemsReceivedDate: importRecord.itemsReceivedDate,
    paymentCompletedDate: importRecord.paymentCompletedDate,
    createdAt: importRecord.createdAt || new Date().toISOString(),
    updatedAt: importRecord.updatedAt || new Date().toISOString(),
  };
}

/**
 * Get all imports with optional filters
 */
export async function getImports(filters?: ImportFilters): Promise<Import[]> {
  const params = new URLSearchParams();

  if (filters?.status && filters.status !== 'all') {
    params.append('status', filters.status);
  }
  if (filters?.supplierId) {
    params.append('supplierId', filters.supplierId);
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
  const endpoint = queryString ? `/import?${queryString}` : '/import';

  const response = await apiClient.get<{
    items: BackendImport[];
    pagination: any;
  }>(endpoint);

  // Handle both paginated and non-paginated responses
  const backendImports = response?.items || [];
  let imports = Array.isArray(backendImports)
    ? backendImports.map(mapBackendImport)
    : [];

  // Client-side search filter (applied after pagination)
  if (filters?.search) {
    const search = filters.search.toLowerCase();
    imports = imports.filter(
      (imp) =>
        imp.supplierName?.toLowerCase().includes(search) ||
        imp.id.toLowerCase().includes(search)
    );
  }

  return imports;
}

/**
 * Get imports with pagination info
 */
export async function getImportsWithPagination(
  filters?: ImportFilters
): Promise<{ imports: Import[]; pagination: any }> {
  const params = new URLSearchParams();

  if (filters?.status && filters.status !== 'all') {
    params.append('status', filters.status);
  }
  if (filters?.supplierId) {
    params.append('supplierId', filters.supplierId);
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
  const endpoint = queryString ? `/import?${queryString}` : '/import';

  const response = await apiClient.get<{
    items: BackendImport[];
    pagination: any;
  }>(endpoint);

  const backendImports = response?.items || [];
  const imports = Array.isArray(backendImports)
    ? backendImports.map(mapBackendImport)
    : [];

  return {
    imports,
    pagination: response?.pagination || {
      page: 1,
      limit: 20,
      total: imports.length,
      pages: 1,
    },
  };
}

/**
 * Get pending imports only
 */
export async function getPendingImports(): Promise<Import[]> {
  return getImports({ status: 'pending' });
}

/**
 * Get completed imports only
 */
export async function getCompletedImports(): Promise<Import[]> {
  return getImports({ status: 'completed' });
}

/**
 * Get cancelled imports only
 */
export async function getCancelledImports(): Promise<Import[]> {
  return getImports({ status: 'cancelled' });
}

/**
 * Get single import by ID
 */
export async function getImportById(importId: string): Promise<Import> {
  const backendImport = await apiClient.get<BackendImport>(
    `/import/${importId}`
  );
  return mapBackendImport(backendImport);
}

/**
 * Create new import
 */
export async function createImport(data: ImportFormData): Promise<Import> {
  // Calculate totals
  const items = data.items.map((item) => ({
    itemId: item.itemId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.quantity * item.unitPrice,
  }));

  const totalPrice = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const payload = {
    supplierId: data.supplierId,
    item: items,
    totalPrice,
    status: data.status || 'pending',
  };

  const backendImport = await apiClient.post<BackendImport>('/import', payload);
  return mapBackendImport(backendImport);
}

/**
 * Update import details
 */
export async function updateImport(
  importId: string,
  updates: Partial<ImportFormData>
): Promise<Import> {
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

  const backendImport = await apiClient.put<BackendImport>(
    `/import/${importId}`,
    payload
  );
  return mapBackendImport(backendImport);
}

/**
 * Execute import action
 */
export async function executeImportAction(
  importId: string,
  action:
    | 'markPending'
    | 'markCompleted'
    | 'markCancelled'
    | 'markItemsReceived'
    | 'markPaymentCompleted'
): Promise<Import> {
  const response = await apiClient.patch<{
    message: string;
    import: BackendImport;
  }>(`/import/${importId}/action`, { action });
  return mapBackendImport(response.import);
}

/**
 * Mark import items as received (adds to inventory)
 * Server generates timestamp automatically
 */
export async function markItemsReceived(importId: string): Promise<Import> {
  return executeImportAction(importId, 'markItemsReceived');
}

/**
 * Mark import payment as completed (to supplier)
 * Server generates timestamp automatically
 */
export async function completeImportPayment(importId: string): Promise<Import> {
  return executeImportAction(importId, 'markPaymentCompleted');
}

/**
 * Mark import as pending
 */
export async function markImportPending(importId: string): Promise<Import> {
  return executeImportAction(importId, 'markPending');
}

/**
 * Mark import as completed
 */
export async function completeImport(importId: string): Promise<Import> {
  return executeImportAction(importId, 'markCompleted');
}

/**
 * Cancel import
 */
export async function cancelImport(importId: string): Promise<Import> {
  return executeImportAction(importId, 'markCancelled');
}

/**
 * Delete import
 */
export async function deleteImport(importId: string): Promise<void> {
  await apiClient.delete(`/import/${importId}`);
}
