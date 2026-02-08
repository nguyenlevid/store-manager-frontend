/**
 * Import Types
 *
 * Imports represent stock purchases from suppliers
 */

export type ImportStatus = 'pending' | 'done';

export interface ImportItem {
  itemId: string;
  itemName?: string; // Populated field
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Import {
  id: string;
  business: string;
  supplierId: string;
  supplierName?: string; // Populated field
  items: ImportItem[];
  totalPrice: number;
  status: ImportStatus;
  completedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportFormData {
  supplierId: string;
  items: Array<{
    itemId: string;
    quantity: number;
    unitPrice: number;
  }>;
  status?: ImportStatus;
}

export interface ImportFilters {
  search?: string;
  status?: ImportStatus | 'all';
  supplierId?: string;
}
