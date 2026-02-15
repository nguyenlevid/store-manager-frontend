/**
 * Transaction Types (Orders)
 *
 * Transactions represent orders/sales to clients
 */

export type TransactionStatus = 'pending' | 'completed' | 'cancelled';

export interface TransactionItem {
  itemId: string;
  itemName?: string; // Populated field
  quantity: number;
  listedPrice: number; // Original catalog price at time of transaction
  unitPrice: number; // Actual selling price (may include discounts)
  totalPrice: number;
}

export interface Transaction {
  id: string;
  business: string;
  clientId: string;
  clientName?: string; // Populated field
  clientEmail?: string; // Populated field
  clientPhoneNumber?: string; // Populated field
  items: TransactionItem[];
  totalPrice: number;
  status: TransactionStatus;
  itemsDeliveredDate?: string;
  paymentCompletedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionFormData {
  clientId: string;
  items: Array<{
    itemId: string;
    quantity: number;
    unitPrice: number; // Actual selling price (listedPrice is fetched from DB on backend)
  }>;
  status?: TransactionStatus;
}

export interface TransactionFilters {
  // Text search (client name, email, id)
  search?: string;
  // Basic filters
  status?: TransactionStatus | 'all';
  clientId?: string;
  // Date range filters
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
  // Price range filters
  priceMin?: number;
  priceMax?: number;
  // Pagination
  page?: number;
  limit?: number;
  // Sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TransactionPaginationResponse {
  items: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
