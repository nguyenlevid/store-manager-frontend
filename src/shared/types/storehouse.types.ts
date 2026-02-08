/**
 * Storehouse (Warehouse) Types
 */

export interface Storehouse {
  id: string;
  name: string;
  address: string;
  phoneNumber: string;
  email: string;
  business: string;
  createdAt: string;
  updatedAt: string;
}

export interface StorehouseFormData {
  name: string;
  address: string;
  phoneNumber: string;
  email: string;
}

export interface StorehouseFilters {
  search?: string;
}
