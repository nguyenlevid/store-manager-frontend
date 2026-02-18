/**
 * Transfer Types
 *
 * Transfers represent stock movements between storehouses
 */

export type TransferStatus = 'pending' | 'completed' | 'cancelled';

export interface Transfer {
  id: string;
  business: string;
  itemId: string;
  itemName?: string;
  itemUnit?: string;
  itemQuantity?: number;
  fromStoreHouse: string;
  fromStoreHouseName?: string;
  toStoreHouse: string;
  toStoreHouseName?: string;
  quantity: number;
  status: TransferStatus;
  note?: string;
  transferredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransferFormData {
  itemId: string;
  fromStoreHouse: string;
  toStoreHouse: string;
  quantity: number;
  note?: string;
  immediate?: boolean;
}

export interface TransferFilters {
  status?: TransferStatus | 'all';
  itemId?: string;
  fromStoreHouse?: string;
  toStoreHouse?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
