/**
 * Analytics API
 *
 * All analytics endpoint calls. Every function accepts an
 * AnalyticsQuery object and returns the typed response.
 */

import { apiClient } from '@/shared/lib/api-client';
import type { AnalyticsPeriod } from '../types/analytics.constants';
import type {
  ProfitLossData,
  TrendsData,
  TopItemResult,
  PartnerAnalyticsEntry,
  InventorySnapshotData,
  PaymentInsightsData,
  DiscountAnalysisData,
  StorehouseComparisonData,
  TransferFlowData,
} from '../types/analytics.types';

const BASE = '/analytics';

function buildQs(params: {
  period: AnalyticsPeriod;
  storehouseId?: string;
  limit?: number;
  type?: string;
}): string {
  const sp = new URLSearchParams();
  sp.set('period', params.period);
  if (params.storehouseId) sp.set('storehouseId', params.storehouseId);
  if (params.limit) sp.set('limit', String(params.limit));
  if (params.type) sp.set('type', params.type);
  return sp.toString();
}

export function getProfitLoss(
  period: AnalyticsPeriod,
  storehouseId?: string
): Promise<ProfitLossData> {
  return apiClient.get<ProfitLossData>(
    `${BASE}/profit-loss?${buildQs({ period, storehouseId })}`
  );
}

export function getTrends(
  period: AnalyticsPeriod,
  storehouseId?: string
): Promise<TrendsData> {
  return apiClient.get<TrendsData>(
    `${BASE}/trends?${buildQs({ period, storehouseId })}`
  );
}

export function getTopItems(
  period: AnalyticsPeriod,
  type: 'sold' | 'purchased' | 'profitable' = 'sold',
  limit = 10,
  storehouseId?: string
): Promise<TopItemResult[]> {
  return apiClient.get<TopItemResult[]>(
    `${BASE}/top-items?${buildQs({ period, storehouseId, type, limit })}`
  );
}

export function getPartnerAnalytics(
  period: AnalyticsPeriod,
  type: 'clients' | 'suppliers' = 'clients',
  limit = 10,
  storehouseId?: string
): Promise<PartnerAnalyticsEntry[]> {
  return apiClient.get<PartnerAnalyticsEntry[]>(
    `${BASE}/partners?${buildQs({ period, storehouseId, type, limit })}`
  );
}

export function getInventorySnapshot(
  period: AnalyticsPeriod,
  storehouseId?: string
): Promise<InventorySnapshotData> {
  return apiClient.get<InventorySnapshotData>(
    `${BASE}/inventory?${buildQs({ period, storehouseId })}`
  );
}

export function getPaymentInsights(
  period: AnalyticsPeriod,
  storehouseId?: string
): Promise<PaymentInsightsData> {
  return apiClient.get<PaymentInsightsData>(
    `${BASE}/payments?${buildQs({ period, storehouseId })}`
  );
}

export function getDiscountAnalysis(
  period: AnalyticsPeriod,
  limit = 10,
  storehouseId?: string
): Promise<DiscountAnalysisData> {
  return apiClient.get<DiscountAnalysisData>(
    `${BASE}/discounts?${buildQs({ period, storehouseId, limit })}`
  );
}

export function getStorehouseComparison(
  period: AnalyticsPeriod
): Promise<StorehouseComparisonData> {
  return apiClient.get<StorehouseComparisonData>(
    `${BASE}/storehouses?${buildQs({ period })}`
  );
}

export function getTransferFlow(
  period: AnalyticsPeriod,
  limit = 10
): Promise<TransferFlowData> {
  return apiClient.get<TransferFlowData>(
    `${BASE}/transfers?${buildQs({ period, limit })}`
  );
}
