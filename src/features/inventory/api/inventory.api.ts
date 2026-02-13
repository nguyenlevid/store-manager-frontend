import { USE_MOCK_API, mockDelay } from '@/shared/lib/mock-data';
import { apiClient } from '@/shared/lib/api-client';
import type {
  Item,
  StockAdjustmentRequest,
  InventoryFilters,
} from '../types/inventory.types';
import { MOCK_ITEMS, getStockStatus } from '../lib/mock-inventory';

/**
 * Backend Item type (from MongoDB)
 */
interface BackendItem {
  _id: string;
  name: string;
  description?: string;
  unitPrice: number;
  origin?: string;
  tags: string[];
  quantity: number;
  unit: string;
  imageUrl?: string[];
  storeHouse: string | { _id: string; name: string }; // Can be ObjectId or populated
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Map backend item to frontend Item type
 */
function mapBackendItem(item: BackendItem): Item {
  console.log('🔄 Mapping item:', JSON.stringify(item, null, 2));
  console.log('🔑 Item keys:', Object.keys(item));
  console.log('🆔 _id value:', item._id);
  console.log('🆔 id value:', (item as any).id);

  if (!item) {
    throw new Error('Item is null or undefined');
  }

  // Handle both _id and id field names
  const itemId = item._id || (item as any).id;

  if (!itemId) {
    console.error('❌ Item missing both _id and id:', item);
    throw new Error('Item missing _id or id field');
  }

  return {
    id: itemId,
    name: item.name,
    description: item.description,
    unitPrice: item.unitPrice,
    origin: item.origin,
    tags: item.tags || [],
    quantity: item.quantity,
    unit: item.unit,
    imageUrl: item.imageUrl || [],
    storeHouse: !item.storeHouse
      ? { id: '', name: 'No Warehouse' } // Missing storeHouse
      : typeof item.storeHouse === 'string'
        ? { id: item.storeHouse, name: 'Unknown' } // Not populated
        : {
            id: item.storeHouse._id || (item.storeHouse as any).id,
            name: item.storeHouse.name,
          }, // Populated
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
}

/**
 * Get all inventory items with optional filters
 */
export async function getInventoryItems(
  filters?: InventoryFilters
): Promise<Item[]> {
  if (USE_MOCK_API) {
    await mockDelay();
    console.log('🔧 Mock: getInventoryItems', filters);

    let filtered = [...MOCK_ITEMS];

    // Search
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(search) ||
          item.description?.toLowerCase().includes(search) ||
          item.tags.some((tag) => tag.toLowerCase().includes(search))
      );
    }

    // Status filter
    if (filters?.status && filters.status !== 'all') {
      filtered = filtered.filter(
        (item) => getStockStatus(item) === filters.status
      );
    }

    // Tags filter
    if (filters?.tags && filters.tags.length > 0) {
      filtered = filtered.filter((item) =>
        filters.tags!.some((tag) => item.tags.includes(tag))
      );
    }

    // Storehouse filter
    if (filters?.storeHouse) {
      filtered = filtered.filter(
        (item) => item.storeHouse.id === filters.storeHouse
      );
    }

    return filtered;
  }

  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.status && filters.status !== 'all')
    params.append('status', filters.status);
  if (filters?.tags && filters.tags.length > 0)
    params.append('tags', filters.tags.join(','));
  if (filters?.storeHouse) params.append('storeHouse', filters.storeHouse);

  // Request populated storeHouse data
  params.append('populate', 'storeHouse');

  const queryString = params.toString();
  const endpoint = queryString ? `/item?${queryString}` : '/item';

  console.log('📦 Fetching items from:', endpoint);
  const response = await apiClient.get<{
    items: BackendItem[];
    pagination: any;
  }>(endpoint);
  console.log('📦 Backend response:', response);

  // Extract items from paginated response
  const backendItems = response?.items || [];
  const mappedItems = Array.isArray(backendItems)
    ? backendItems.map(mapBackendItem)
    : [];

  console.log('📦 Mapped items:', mappedItems);
  return mappedItems;
}

/**
 * Get inventory items with pagination
 */
export async function getInventoryItemsWithPagination(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  tags?: string[];
  storeHouse?: string;
}): Promise<{
  items: Item[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> {
  if (USE_MOCK_API) {
    await mockDelay();
    console.log('🔧 Mock: getInventoryItemsWithPagination', params);

    let filtered = [...MOCK_ITEMS];

    // Search
    if (params.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(search) ||
          item.description?.toLowerCase().includes(search) ||
          item.tags.some((tag) => tag.toLowerCase().includes(search))
      );
    }

    // Status filter
    if (params.status && params.status !== 'all') {
      filtered = filtered.filter(
        (item) => getStockStatus(item) === params.status
      );
    }

    // Tags filter
    if (params.tags && params.tags.length > 0) {
      filtered = filtered.filter((item) =>
        params.tags!.some((tag) => item.tags.includes(tag))
      );
    }

    // Storehouse filter
    if (params.storeHouse) {
      filtered = filtered.filter(
        (item) => item.storeHouse.id === params.storeHouse
      );
    }

    // Pagination
    const page = params.page || 1;
    const limit = params.limit || 20;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedItems = filtered.slice(start, end);

    return {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total: filtered.length,
        pages: Math.ceil(filtered.length / limit),
      },
    };
  }

  const queryParams = new URLSearchParams();

  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.search) queryParams.append('search', params.search);
  if (params.status && params.status !== 'all')
    queryParams.append('status', params.status);
  if (params.tags && params.tags.length > 0)
    queryParams.append('tags', params.tags.join(','));
  if (params.storeHouse) queryParams.append('storeHouse', params.storeHouse);

  // Request populated storeHouse data
  queryParams.append('populate', 'storeHouse');

  const response = await apiClient.get<{
    items: BackendItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>(`/item?${queryParams.toString()}`);

  return {
    items: response.items.map(mapBackendItem),
    pagination: {
      page: response.pagination.page,
      limit: response.pagination.limit,
      total: response.pagination.total,
      pages: response.pagination.totalPages,
    },
  };
}

/**
 * Get single item by ID
 */
export async function getItemById(itemId: string): Promise<Item> {
  if (USE_MOCK_API) {
    await mockDelay();
    console.log('🔧 Mock: getItemById', itemId);

    const item = MOCK_ITEMS.find((i) => i.id === itemId);
    if (!item) throw new Error('Item not found');
    return item;
  }

  const backendItem = await apiClient.get<BackendItem>(`/item/${itemId}`);
  return mapBackendItem(backendItem);
}

/**
 * Adjust stock quantity
 */
export async function adjustStock(
  request: StockAdjustmentRequest
): Promise<Item> {
  if (USE_MOCK_API) {
    await mockDelay();
    console.log('🔧 Mock: adjustStock', request);

    const item = MOCK_ITEMS.find((i) => i.id === request.itemId);
    if (!item) throw new Error('Item not found');

    // Update mock item (in-memory only)
    item.quantity = Math.max(0, item.quantity + request.quantity);
    item.updatedAt = new Date().toISOString();

    return item;
  }

  // TODO: Backend doesn't have adjust-stock endpoint yet
  // For now, use updateItem to change quantity
  throw new Error('Stock adjustment endpoint not implemented on backend yet');
}

/**
 * Update item details
 */
export async function updateItem(
  itemId: string,
  updates: Partial<Omit<Item, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Item> {
  if (USE_MOCK_API) {
    await mockDelay();
    console.log('🔧 Mock: updateItem', itemId, updates);

    const item = MOCK_ITEMS.find((i) => i.id === itemId);
    if (!item) throw new Error('Item not found');

    Object.assign(item, updates, { updatedAt: new Date().toISOString() });
    return item;
  }

  // Convert frontend updates to backend format
  const backendUpdates: any = { ...updates };
  if (updates.storeHouse) {
    backendUpdates.storeHouse = updates.storeHouse.id; // Send only the ID
  }

  const backendItem = await apiClient.put<BackendItem>(
    `/item/${itemId}`,
    backendUpdates
  );
  return mapBackendItem(backendItem);
}

/**
 * Create new item
 */
export async function createItem(
  data: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Item> {
  if (USE_MOCK_API) {
    await mockDelay();
    console.log('🔧 Mock: createItem', data);

    const newItem: Item = {
      ...data,
      id: `item-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    MOCK_ITEMS.push(newItem);
    return newItem;
  }

  // Convert frontend Item to backend format
  const backendData = {
    name: data.name,
    description: data.description,
    unitPrice: data.unitPrice,
    origin: data.origin,
    tags: data.tags,
    quantity: data.quantity,
    unit: data.unit,
    imageUrl: data.imageUrl,
    storeHouse: data.storeHouse.id, // Send only the ID
  };

  const backendItem = await apiClient.post<BackendItem>('/item', backendData);
  return mapBackendItem(backendItem);
}

/**
 * Delete item
 */
export async function deleteItem(itemId: string): Promise<void> {
  if (USE_MOCK_API) {
    await mockDelay();
    console.log('🔧 Mock: deleteItem', itemId);

    const index = MOCK_ITEMS.findIndex((i) => i.id === itemId);
    if (index !== -1) {
      MOCK_ITEMS.splice(index, 1);
    }
    return;
  }

  await apiClient.delete(`/item/${itemId}`);
}

/**
 * Get unique units from all items
 */
export async function getItemUnits(): Promise<string[]> {
  if (USE_MOCK_API) {
    await mockDelay();
    console.log('🔧 Mock: getItemUnits');

    // Extract unique units from mock items
    const units = Array.from(new Set(MOCK_ITEMS.map((item) => item.unit)));
    return units.sort();
  }

  const units = await apiClient.get<string[]>('/item/units');
  return units;
}

/**
 * Get distinct tags from all items (limited to top N most used)
 */
export async function getItemTags(limit: number = 12): Promise<string[]> {
  if (USE_MOCK_API) {
    await mockDelay();
    console.log('🔧 Mock: getItemTags', limit);

    // Extract all tags and count occurrences
    const tagCounts = new Map<string, number>();
    MOCK_ITEMS.forEach((item) => {
      item.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    // Sort by count and return top N
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag]) => tag);
  }

  const tags = await apiClient.get<string[]>(`/item/tags?limit=${limit}`);
  return tags;
}
