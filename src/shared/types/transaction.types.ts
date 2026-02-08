/**
 * Transaction Types (Orders)
 *
 * Transactions represent orders/sales to clients
 */

export type TransactionStatus =
  | 'pending'
  | 'itemsDelivered'
  | 'paymentCompleted'
  | 'cancelled';

export interface TransactionItem {
  itemId: string;
  itemName?: string; // Populated field
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Transaction {
  id: string;
  business: string;
  clientId: string;
  clientName?: string; // Populated field
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
    unitPrice: number;
  }>;
  status?: TransactionStatus;
}

export interface TransactionFilters {
  search?: string;
  status?: TransactionStatus | 'all';
  clientId?: string;
}
