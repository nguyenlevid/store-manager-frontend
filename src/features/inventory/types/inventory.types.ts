import { z } from 'zod';

/**
 * Item schema matching backend model
 */
export const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  unitPrice: z.number(),
  sellingPrice: z.number().optional(), // For profit calculation
  origin: z.string().optional(),
  tags: z.array(z.string()),
  quantity: z.number(),
  unit: z.string(),
  imageUrl: z.array(z.string()).optional(),
  storeHouse: z.object({
    id: z.string(),
    name: z.string(),
  }),
  lowStockAt: z.number().default(10), // Alert threshold
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Item = z.infer<typeof ItemSchema>;

/**
 * Stock status based on quantity vs reorder level
 */
export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

/**
 * Stock adjustment request
 */
export interface StockAdjustmentRequest {
  itemId: string;
  quantity: number; // Can be positive (add) or negative (remove)
  reason:
    | 'sale'
    | 'damage'
    | 'theft'
    | 'manual-count'
    | 'return'
    | 'supplier-delivery';
  notes?: string;
}

/**
 * Stock movement history
 */
export const StockMovementSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  change: z.number(), // + or -
  reason: z.string(),
  notes: z.string().optional(),
  previousQuantity: z.number(),
  newQuantity: z.number(),
  performedBy: z.string(),
  createdAt: z.string(),
});

export type StockMovement = z.infer<typeof StockMovementSchema>;

/**
 * Inventory summary stats
 */
export interface InventorySummary {
  totalSKUs: number;
  totalInventoryValue: number;
  outOfStockCount: number;
  lowStockCount: number;
}

/**
 * Inventory filters
 */
export interface InventoryFilters {
  search?: string;
  status?: StockStatus | 'all';
  tags?: string[];
  storeHouse?: string;
}
