/**
 * Analytics Types
 *
 * Response types for the analytics API endpoints.
 * These mirror the shapes returned by AnalyticsRepository on the backend.
 */

import type { AnalyticsPeriod } from './analytics.constants.js';

// ============================================
// Query Params
// ============================================

export interface AnalyticsQuery {
  period: AnalyticsPeriod;
  storehouseId?: string;
  limit?: number;
  type?: string;
}

// ============================================
// Profit & Loss
// ============================================

export interface ProfitLossData {
  revenue: number;
  cost: number;
  grossProfit: number;
  marginPercent: number;
  transactionCount: number;
  importCount: number;
  revenueChangePercent: number | null;
  costChangePercent: number | null;
}

// ============================================
// Trends
// ============================================

export interface TrendBucket {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  transactionCount: number;
  importCount: number;
}

export interface TrendsData {
  buckets: TrendBucket[];
}

// ============================================
// Top Items
// ============================================

export interface TopSoldItem {
  itemId: string;
  name: string;
  unit: string;
  totalQuantity: number;
  totalValue: number;
  avgPrice: number;
}

export interface TopProfitableItem {
  itemId: string;
  name: string;
  unit: string;
  avgSellPrice: number;
  avgBuyPrice: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
  marginPercent: number;
  totalQtySold: number;
}

export type TopItemResult = TopSoldItem | TopProfitableItem;

// ============================================
// Partner Analytics
// ============================================

export interface PartnerAnalyticsEntry {
  partnerId: string;
  name: string;
  isWalkIn?: boolean;
  totalValue: number;
  orderCount: number;
  avgOrderValue: number;
  lastActivityDate: string;
}

// ============================================
// Inventory Snapshot
// ============================================

export interface StorehouseInventory {
  storehouseId: string;
  storehouseName: string;
  isLocked: boolean;
  totalValue: number;
  totalItems: number;
  totalQuantity: number;
  lowStockCount: number;
}

export interface InventorySnapshotData {
  totalValue: number;
  totalItems: number;
  lowStockCount: number;
  deadStockCount: number;
  avgTurnoverRate: number;
  byStorehouse: StorehouseInventory[];
}

// ============================================
// Payment Insights
// ============================================

export interface PaymentInsightsData {
  outstandingTransactions: number;
  outstandingRevenue: number;
  outstandingImports: number;
  outstandingCost: number;
  avgPaymentLagDays: {
    transactions: number | null;
    imports: number | null;
  };
  avgDeliveryLagDays: {
    transactions: number | null;
    imports: number | null;
  };
}

// ============================================
// Margin Analysis
// ============================================

export interface MarginTrendEntry {
  date: string;
  gain: number;
}

export interface TopMarginItem {
  itemId: string;
  name: string;
  avgSellPrice: number;
  avgBuyPrice: number;
  marginPercent: number;
  totalGain: number;
}

export interface DiscountAnalysisData {
  totalGain: number;
  avgMarginPercent: number;
  gainTrend: MarginTrendEntry[];
  topMarginItems: TopMarginItem[];
}

// ============================================
// Storehouse Comparison
// ============================================

export interface StorehouseComparisonEntry {
  id: string;
  name: string;
  isLocked: boolean;
  revenue: number;
  cost: number;
  profit: number;
  inventoryValue: number;
  itemCount: number;
  transfersIn: number;
  transfersOut: number;
}

export interface StorehouseComparisonData {
  storehouses: StorehouseComparisonEntry[];
}

// ============================================
// Transfer Flow
// ============================================

export interface TransferFlowEntry {
  from: { id: string; name: string };
  to: { id: string; name: string };
  totalQuantity: number;
  transferCount: number;
}

export interface TransferTopItem {
  itemId: string;
  name: string;
  totalQuantity: number;
  transferCount: number;
}

export interface NetFlowEntry {
  storehouseId: string;
  name: string;
  in: number;
  out: number;
  net: number;
}

export interface TransferFlowData {
  flows: TransferFlowEntry[];
  topItems: TransferTopItem[];
  netFlow: NetFlowEntry[];
}
