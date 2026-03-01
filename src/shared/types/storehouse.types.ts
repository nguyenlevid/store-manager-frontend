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
  /** Whether this storehouse is locked (read-only) due to plan downgrade */
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StorehouseFormData {
  name: string;
  address: string;
  phoneNumber?: string;
  email?: string;
}

export interface StorehouseFilters {
  search?: string;
}
