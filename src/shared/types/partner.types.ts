/**
 * Partner Types
 *
 * Partners can be suppliers (who sell to us) or clients (who buy from us)
 */

export type PartnerType = 'supplier' | 'client';

export interface Partner {
  id: string;
  partnerName: string;
  partnerType: PartnerType;
  phoneNumber?: string;
  email?: string;
  address?: string;
  worksWithBusiness: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerFormData {
  partnerName: string;
  partnerType: PartnerType;
  phoneNumber?: string;
  email?: string;
  address?: string;
}

export interface PartnerFilters {
  search?: string;
  partnerType?: PartnerType | 'all';
}
