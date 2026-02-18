import type {
  Item,
  StockStatus,
  InventorySummary,
} from '../types/inventory.types';

/**
 * Mock inventory data matching your database schema
 */
export const MOCK_ITEMS: Item[] = [
  {
    id: 'item-1',
    name: 'MacBook Pro 16" M3',
    description: 'Latest MacBook Pro with M3 chip, 16GB RAM, 512GB SSD',
    unitPrice: 2499,
    sellingPrice: 2899,
    origin: 'USA',
    tags: ['electronics', 'computers', 'apple'],
    quantity: 15,
    unit: 'pcs',
    imageUrl: [],
    storeHouse: { id: 'store-1', name: 'Main Warehouse' },
    lowStockAt: 5,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2026-01-18T10:30:00Z',
  },
  {
    id: 'item-2',
    name: 'iPhone 15 Pro',
    description: 'iPhone 15 Pro 256GB, Titanium',
    unitPrice: 999,
    sellingPrice: 1199,
    origin: 'China',
    tags: ['electronics', 'phones', 'apple'],
    quantity: 3,
    unit: 'pcs',
    imageUrl: [],
    storeHouse: { id: 'store-1', name: 'Main Warehouse' },
    lowStockAt: 10,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2026-01-17T15:20:00Z',
  },
  {
    id: 'item-3',
    name: 'Samsung 55" QLED TV',
    description: '55-inch QLED 4K Smart TV',
    unitPrice: 799,
    sellingPrice: 999,
    origin: 'South Korea',
    tags: ['electronics', 'tv', 'samsung'],
    quantity: 0,
    unit: 'pcs',
    imageUrl: [],
    storeHouse: { id: 'store-1', name: 'Main Warehouse' },
    lowStockAt: 3,
    createdAt: '2024-03-10T00:00:00Z',
    updatedAt: '2026-01-16T09:00:00Z',
  },
  {
    id: 'item-4',
    name: 'Sony WH-1000XM5 Headphones',
    description: 'Wireless noise-cancelling headphones',
    unitPrice: 299,
    sellingPrice: 399,
    origin: 'Japan',
    tags: ['electronics', 'audio', 'sony'],
    quantity: 28,
    unit: 'pcs',
    imageUrl: [],
    storeHouse: { id: 'store-2', name: 'Store Location A' },
    lowStockAt: 15,
    createdAt: '2024-04-05T00:00:00Z',
    updatedAt: '2026-01-18T08:45:00Z',
  },
  {
    id: 'item-5',
    name: 'Dell UltraSharp 27" Monitor',
    description: '27-inch 4K USB-C monitor',
    unitPrice: 449,
    sellingPrice: 599,
    origin: 'China',
    tags: ['electronics', 'monitors', 'dell'],
    quantity: 7,
    unit: 'pcs',
    imageUrl: [],
    storeHouse: { id: 'store-1', name: 'Main Warehouse' },
    lowStockAt: 8,
    createdAt: '2024-05-20T00:00:00Z',
    updatedAt: '2026-01-15T14:30:00Z',
  },
  {
    id: 'item-6',
    name: 'Logitech MX Master 3S Mouse',
    description: 'Wireless ergonomic mouse',
    unitPrice: 79,
    sellingPrice: 99,
    origin: 'China',
    tags: ['electronics', 'accessories', 'logitech'],
    quantity: 45,
    unit: 'pcs',
    imageUrl: [],
    storeHouse: { id: 'store-1', name: 'Main Warehouse' },
    lowStockAt: 20,
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2026-01-18T11:00:00Z',
  },
  {
    id: 'item-7',
    name: 'Office Chair Pro Ergonomic',
    description: 'Adjustable ergonomic office chair with lumbar support',
    unitPrice: 299,
    sellingPrice: 449,
    origin: 'Vietnam',
    tags: ['furniture', 'office'],
    quantity: 2,
    unit: 'pcs',
    imageUrl: [],
    storeHouse: { id: 'store-2', name: 'Store Location A' },
    lowStockAt: 5,
    createdAt: '2024-07-10T00:00:00Z',
    updatedAt: '2026-01-14T16:20:00Z',
  },
  {
    id: 'item-8',
    name: 'Standing Desk Electric',
    description: 'Height-adjustable standing desk, 140x70cm',
    unitPrice: 499,
    sellingPrice: 699,
    origin: 'Germany',
    tags: ['furniture', 'office'],
    quantity: 12,
    unit: 'pcs',
    imageUrl: [],
    storeHouse: { id: 'store-1', name: 'Main Warehouse' },
    lowStockAt: 4,
    createdAt: '2024-08-15T00:00:00Z',
    updatedAt: '2026-01-18T07:30:00Z',
  },
];

/**
 * Calculate stock status
 */
export function getStockStatus(item: Item): StockStatus {
  if (item.quantity === 0) return 'out-of-stock';
  if (item.lowStockAt && item.quantity <= item.lowStockAt) return 'low-stock';
  return 'in-stock';
}

/**
 * Get inventory summary
 */
export function getInventorySummary(items: Item[]): InventorySummary {
  return {
    totalSKUs: items.length,
    totalInventoryValue: items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    ),
    outOfStockCount: items.filter((item) => item.quantity === 0).length,
    lowStockCount: items.filter(
      (item) =>
        item.quantity > 0 && item.lowStockAt && item.quantity <= item.lowStockAt
    ).length,
  };
}

/**
 * Get all unique tags
 */
export function getAllTags(items: Item[]): string[] {
  const tagSet = new Set<string>();
  items.forEach((item) => item.tags.forEach((tag) => tagSet.add(tag)));
  return Array.from(tagSet).sort();
}

/**
 * Get all unique storehouses
 */
export function getAllStorehouses(
  items: Item[]
): Array<{ id: string; name: string }> {
  const storeMap = new Map<string, string>();
  items.forEach((item) => {
    storeMap.set(item.storeHouse.id, item.storeHouse.name);
  });
  return Array.from(storeMap.entries()).map(([id, name]) => ({ id, name }));
}
