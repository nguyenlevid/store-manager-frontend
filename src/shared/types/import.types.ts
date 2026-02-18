/**
 * Import Types
 *
 * Imports represent stock purchases from suppliers
 */

export type ImportStatus = 'pending' | 'completed' | 'cancelled';

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
  supplierId?: string;
  supplierName?: string; // Populated field
  supplierEmail?: string; // Populated field
  supplierPhoneNumber?: string; // Populated field
  items: ImportItem[];
  totalPrice: number;
  status: ImportStatus;
  itemsReceivedDate?: string;
  paymentCompletedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportFormData {
  supplierId?: string; // Optional - for imports without a specific supplier
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
  // Date range filters
  dateFrom?: string;
  dateTo?: string;
  // Price range filters
  priceMin?: number;
  priceMax?: number;
  // Pagination
  page?: number;
  limit?: number;
  // Sorting
  sortBy?: 'createdAt' | 'totalPrice' | 'supplierName';
  sortOrder?: 'asc' | 'desc';
}

export interface ImportPaginationResponse {
  items: Import[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
