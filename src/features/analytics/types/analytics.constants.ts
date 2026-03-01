/**
 * Analytics Constants
 *
 * Shared constants used by the analytics feature.
 */

export type AnalyticsPeriod = '7d' | '30d' | '90d' | 'ytd' | '12m' | 'all';

export const PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'ytd', label: 'Year to date' },
  { value: '12m', label: 'Last 12 months' },
  { value: 'all', label: 'All time' },
];

export const TOP_ITEMS_TYPE_OPTIONS = [
  { value: 'sold', label: 'Most Sold' },
  { value: 'purchased', label: 'Most Purchased' },
  { value: 'profitable', label: 'Most Profitable' },
] as const;

export const PARTNER_TYPE_OPTIONS = [
  { value: 'clients', label: 'Top Clients' },
  { value: 'suppliers', label: 'Top Suppliers' },
] as const;
