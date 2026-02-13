/**
 * Partners API
 *
 * Handles all partner-related API calls (suppliers and clients)
 */

import { apiClient } from '@/shared/lib/api-client';
import type {
  Partner,
  PartnerFormData,
  PartnerFilters,
} from '@/shared/types/partner.types';

/**
 * Backend Partner type (from MongoDB)
 */
interface BackendPartner {
  _id: string;
  partnerName: string;
  partnerType: 'supplier' | 'client';
  phoneNumber?: string;
  email?: string;
  address?: string;
  worksWithBusiness: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Map backend partner to frontend Partner type
 */
function mapBackendPartner(partner: BackendPartner): Partner {
  if (!partner) {
    throw new Error('Partner is null or undefined');
  }

  const partnerId = partner._id || (partner as any).id;

  if (!partnerId) {
    console.error('❌ Partner missing both _id and id:', partner);
    throw new Error('Partner missing _id or id field');
  }

  return {
    id: partnerId,
    partnerName: partner.partnerName,
    partnerType: partner.partnerType,
    phoneNumber: partner.phoneNumber,
    email: partner.email,
    address: partner.address,
    worksWithBusiness: partner.worksWithBusiness,
    createdAt: partner.createdAt || new Date().toISOString(),
    updatedAt: partner.updatedAt || new Date().toISOString(),
  };
}

/**
 * Get all partners with optional filters
 */
export async function getPartners(
  filters?: PartnerFilters
): Promise<Partner[]> {
  const params = new URLSearchParams();

  if (filters?.partnerType && filters.partnerType !== 'all') {
    params.append('partnerType', filters.partnerType);
  }

  const queryString = params.toString();
  const endpoint = queryString ? `/partner?${queryString}` : '/partner';

  const backendPartners = await apiClient.get<BackendPartner[]>(endpoint);

  let partners = Array.isArray(backendPartners)
    ? backendPartners.map(mapBackendPartner)
    : [];

  // Client-side search filter
  if (filters?.search) {
    const search = filters.search.toLowerCase();
    partners = partners.filter(
      (p) =>
        p.partnerName.toLowerCase().includes(search) ||
        p.email?.toLowerCase().includes(search) ||
        p.phoneNumber?.toLowerCase().includes(search)
    );
  }

  return partners;
}

/**
 * Get suppliers only
 */
export async function getSuppliers(): Promise<Partner[]> {
  return getPartners({ partnerType: 'supplier' });
}

/**
 * Get clients only
 */
export async function getClients(): Promise<Partner[]> {
  return getPartners({ partnerType: 'client' });
}

/**
 * Get single partner by ID
 */
export async function getPartnerById(partnerId: string): Promise<Partner> {
  const backendPartner = await apiClient.get<BackendPartner>(
    `/partner/${partnerId}`
  );
  return mapBackendPartner(backendPartner);
}

/**
 * Create new partner
 */
export async function createPartner(data: PartnerFormData): Promise<Partner> {
  const backendPartner = await apiClient.post<BackendPartner>('/partner', data);
  return mapBackendPartner(backendPartner);
}

/**
 * Update partner details
 */
export async function updatePartner(
  partnerId: string,
  updates: Partial<PartnerFormData>
): Promise<Partner> {
  const backendPartner = await apiClient.put<BackendPartner>(
    `/partner/${partnerId}`,
    updates
  );
  return mapBackendPartner(backendPartner);
}

/**
 * Get partners with pagination
 */
export async function getPartnersWithPagination(params: {
  partnerType?: 'client' | 'supplier' | 'all';
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{
  partners: Partner[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> {
  const queryParams = new URLSearchParams();

  if (params.partnerType && params.partnerType !== 'all') {
    queryParams.append('partnerType', params.partnerType);
  }

  if (params.page) {
    queryParams.append('page', params.page.toString());
  }

  if (params.limit) {
    queryParams.append('limit', params.limit.toString());
  }

  if (params.search) {
    queryParams.append('search', params.search);
  }

  const response = await apiClient.get<{
    items: BackendPartner[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }>(`/partner/paginated?${queryParams.toString()}`);

  return {
    partners: response.items.map(mapBackendPartner),
    pagination: response.pagination,
  };
}

/**
 * Get clients with pagination
 */
export async function getClientsWithPagination(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{
  partners: Partner[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> {
  return getPartnersWithPagination({ ...params, partnerType: 'client' });
}

/**
 * Get suppliers with pagination
 */
export async function getSuppliersWithPagination(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{
  partners: Partner[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> {
  return getPartnersWithPagination({ ...params, partnerType: 'supplier' });
}

/**
 * Delete partner
 */
export async function deletePartner(partnerId: string): Promise<void> {
  await apiClient.delete(`/partner/${partnerId}`);
}

/**
 * Get transactions for a client (partner)
 */
export async function getPartnerTransactions(
  partnerId: string
): Promise<any[]> {
  const transactions = await apiClient.get<any[]>(
    `/partner/${partnerId}/transactions`
  );
  return transactions || [];
}

/**
 * Get imports for a supplier (partner)
 */
export async function getPartnerImports(partnerId: string): Promise<any[]> {
  const imports = await apiClient.get<any[]>(`/partner/${partnerId}/imports`);
  return imports || [];
}
