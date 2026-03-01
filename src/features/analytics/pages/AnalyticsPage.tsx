/**
 * AnalyticsPage
 *
 * Enterprise-only dashboard showing financial analytics.
 * Gated behind the `advancedReports` feature flag.
 *
 * Sections:
 *   1. Profit & Loss summary cards
 *   2. Revenue / Cost trend (table view)
 *   3. Top Items
 *   4. Partner Analytics
 *   5. Inventory Snapshot
 *   6. Payment Insights
 *   7. Margin Analysis
 *   8. Storehouse Comparison
 *   9. Transfer Flow
 */

import { createSignal, createResource, Show, For, type JSX } from 'solid-js';
import { Card, CardHeader, CardBody } from '@/shared/ui';
import { FeatureGate } from '@/features/billing/components/UpgradePrompt';
import { hasFeature } from '@/features/billing/store/subscription.store';
import { formatCurrency } from '@/shared/lib/format';
import { getStorehouses } from '@/shared/api/storehouses.api';
import {
  getProfitLoss,
  getTrends,
  getTopItems,
  getPartnerAnalytics,
  getInventorySnapshot,
  getPaymentInsights,
  getDiscountAnalysis,
  getStorehouseComparison,
  getTransferFlow,
} from '../api/analytics.api';
import {
  PERIOD_OPTIONS,
  TOP_ITEMS_TYPE_OPTIONS,
  PARTNER_TYPE_OPTIONS,
  type AnalyticsPeriod,
} from '../types/analytics.constants';
import type {
  ProfitLossData,
  TrendsData,
  TopItemResult,
  TopSoldItem,
  TopProfitableItem,
  PartnerAnalyticsEntry,
  InventorySnapshotData,
  PaymentInsightsData,
  DiscountAnalysisData,
  StorehouseComparisonData,
  TransferFlowData,
} from '../types/analytics.types';

// ============================================
// Helpers
// ============================================

function pct(n: number | null | undefined): string {
  if (n == null) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function fc(n: number): string {
  return formatCurrency(n);
}

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-text-muted';
  return n >= 0 ? 'text-status-success' : 'text-status-error';
}

function barWidth(value: number, max: number): string {
  if (max <= 0) return '0%';
  return `${Math.min((value / max) * 100, 100)}%`;
}

// ============================================
// Sub-components
// ============================================

function StatCard(props: {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div class="rounded-lg border border-border-default bg-bg-surface p-4">
      <p class="text-xs font-medium uppercase tracking-wide text-text-muted">
        {props.label}
      </p>
      <p class="mt-1 text-2xl font-bold text-text-primary">{props.value}</p>
      <Show when={props.sub}>
        <p class={`mt-0.5 text-sm ${props.subColor ?? 'text-text-muted'}`}>
          {props.sub}
        </p>
      </Show>
    </div>
  );
}

function SectionHeading(props: { children: JSX.Element }) {
  return (
    <h2 class="mb-3 text-lg font-semibold text-text-primary">
      {props.children}
    </h2>
  );
}

function TableWrapper(props: { children: JSX.Element }) {
  return (
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm">{props.children}</table>
    </div>
  );
}

function Th(props: { children: JSX.Element; class?: string }) {
  return (
    <th
      class={`whitespace-nowrap border-b border-border-subtle px-3 py-2 text-xs font-medium uppercase tracking-wide text-text-muted ${props.class ?? ''}`}
    >
      {props.children}
    </th>
  );
}

function Td(props: { children: JSX.Element; class?: string }) {
  return (
    <td
      class={`border-b border-border-subtle px-3 py-2 text-text-secondary ${props.class ?? ''}`}
    >
      {props.children}
    </td>
  );
}

function LoadingSpinner() {
  return (
    <div class="flex items-center justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-border-default border-t-accent-primary" />
    </div>
  );
}

function ErrorMessage(props: { error: unknown }) {
  const message = () => {
    const err = props.error;
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return 'Something went wrong';
  };

  return (
    <div class="border-status-error/30 bg-status-error/5 text-status-error rounded-lg border p-4 text-sm">
      {message()}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export default function AnalyticsPage() {
  const [period, setPeriod] = createSignal<AnalyticsPeriod>('30d');
  const [storehouseId, setStorehouseId] = createSignal<string>('');
  const [topItemsType, setTopItemsType] = createSignal<
    'sold' | 'purchased' | 'profitable'
  >('sold');
  const [partnerType, setPartnerType] = createSignal<'clients' | 'suppliers'>(
    'clients'
  );

  // Storehouses for the filter dropdown
  const [storehouses] = createResource(() => getStorehouses());

  // The sh filter value (empty string = all)
  const shFilter = () => storehouseId() || undefined;

  // Gate: only fetch when the feature is available
  const allowed = () => hasFeature('advancedReports');

  // ── Resources (guarded by feature flag) ────────────────────────────
  const [profitLoss] = createResource(
    () => (allowed() ? { p: period(), sh: shFilter() } : (false as const)),
    ({ p, sh }) => getProfitLoss(p, sh)
  );

  const [trends] = createResource(
    () => (allowed() ? { p: period(), sh: shFilter() } : (false as const)),
    ({ p, sh }) => getTrends(p, sh)
  );

  const [topItems] = createResource(
    () =>
      allowed()
        ? { p: period(), t: topItemsType(), sh: shFilter() }
        : (false as const),
    ({ p, t, sh }) => getTopItems(p, t, 10, sh)
  );

  const [partners] = createResource(
    () =>
      allowed()
        ? { p: period(), t: partnerType(), sh: shFilter() }
        : (false as const),
    ({ p, t, sh }) => getPartnerAnalytics(p, t, 10, sh)
  );

  const [inventory] = createResource(
    () => (allowed() ? { p: period(), sh: shFilter() } : (false as const)),
    ({ p, sh }) => getInventorySnapshot(p, sh)
  );

  const [payments] = createResource(
    () => (allowed() ? { p: period(), sh: shFilter() } : (false as const)),
    ({ p, sh }) => getPaymentInsights(p, sh)
  );

  const [discounts] = createResource(
    () => (allowed() ? { p: period(), sh: shFilter() } : (false as const)),
    ({ p, sh }) => getDiscountAnalysis(p, 10, sh)
  );

  const [shComparison] = createResource(
    () => (allowed() ? period() : (false as const)),
    (p) => getStorehouseComparison(p)
  );

  const [transferFlow] = createResource(
    () => (allowed() ? period() : (false as const)),
    (p) => getTransferFlow(p)
  );

  return (
    <FeatureGate
      feature="advancedReports"
      message="Advanced Analytics is available on the Enterprise plan. Upgrade to unlock revenue insights, discount analysis, and more."
    >
      <div class="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
        {/* ── Page Header ──────────────── */}
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-bold text-text-primary">Analytics</h1>
            <p class="text-sm text-text-muted">
              Financial insights and performance metrics for your business.
            </p>
          </div>

          {/* Filters */}
          <div class="flex flex-wrap items-center gap-3">
            <select
              class="rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              value={period()}
              onChange={(e) =>
                setPeriod(e.currentTarget.value as AnalyticsPeriod)
              }
            >
              <For each={PERIOD_OPTIONS}>
                {(opt) => <option value={opt.value}>{opt.label}</option>}
              </For>
            </select>

            <select
              class="rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              value={storehouseId()}
              onChange={(e) => setStorehouseId(e.currentTarget.value)}
            >
              <option value="">All Storehouses</option>
              <For each={storehouses() ?? []}>
                {(sh: any) => (
                  <option value={sh.id ?? sh._id}>{sh.name}</option>
                )}
              </For>
            </select>
          </div>
        </div>

        {/* ── Profit & Loss ──────────────── */}
        <section>
          <SectionHeading>Profit & Loss</SectionHeading>
          <Show when={!profitLoss.loading} fallback={<LoadingSpinner />}>
            <Show
              when={!profitLoss.error}
              fallback={<ErrorMessage error={profitLoss.error} />}
            >
              {(() => {
                const d = profitLoss() as ProfitLossData | undefined;
                if (!d) return null;
                return (
                  <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                      label="Revenue"
                      value={fc(d.revenue)}
                      sub={`${pct(d.revenueChangePercent)} vs prev period`}
                      subColor={changeColor(d.revenueChangePercent)}
                    />
                    <StatCard
                      label="Cost"
                      value={fc(d.cost)}
                      sub={`${pct(d.costChangePercent)} vs prev period`}
                      subColor={changeColor(
                        d.costChangePercent != null
                          ? -d.costChangePercent
                          : null
                      )}
                    />
                    <StatCard
                      label="Gross Profit"
                      value={fc(d.grossProfit)}
                      sub={`${d.marginPercent.toFixed(1)}% margin`}
                    />
                    <StatCard
                      label="Activity"
                      value={`${d.transactionCount} orders`}
                      sub={`${d.importCount} imports`}
                    />
                  </div>
                );
              })()}
            </Show>
          </Show>
        </section>

        {/* ── Trends ──────────────── */}
        <section>
          <SectionHeading>Revenue & Cost Trend</SectionHeading>
          <Card>
            <CardBody>
              <Show when={!trends.loading} fallback={<LoadingSpinner />}>
                <Show
                  when={!trends.error}
                  fallback={<ErrorMessage error={trends.error} />}
                >
                  {(() => {
                    const d = trends() as TrendsData | undefined;
                    if (!d || d.buckets.length === 0) {
                      return (
                        <p class="py-6 text-center text-sm text-text-muted">
                          No data for this period.
                        </p>
                      );
                    }
                    const maxVal = Math.max(
                      ...d.buckets.map((b) => Math.max(b.revenue, b.cost))
                    );
                    return (
                      <TableWrapper>
                        <thead>
                          <tr>
                            <Th>Date</Th>
                            <Th>Revenue</Th>
                            <Th>Cost</Th>
                            <Th>Profit</Th>
                            <Th class="hidden sm:table-cell">Visual</Th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={d.buckets}>
                            {(b) => (
                              <tr class="hover:bg-bg-hover">
                                <Td>{new Date(b.date).toLocaleDateString()}</Td>
                                <Td>{fc(b.revenue)}</Td>
                                <Td>{fc(b.cost)}</Td>
                                <Td
                                  class={
                                    b.profit >= 0
                                      ? 'text-status-success'
                                      : 'text-status-error'
                                  }
                                >
                                  {fc(b.profit)}
                                </Td>
                                <Td class="hidden w-48 sm:table-cell">
                                  <div class="flex flex-col gap-1">
                                    <div
                                      class="h-2 rounded-full bg-accent-primary"
                                      style={{
                                        width: barWidth(b.revenue, maxVal),
                                      }}
                                    />
                                    <div
                                      class="bg-status-error/60 h-2 rounded-full"
                                      style={{
                                        width: barWidth(b.cost, maxVal),
                                      }}
                                    />
                                  </div>
                                </Td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </TableWrapper>
                    );
                  })()}
                </Show>
              </Show>
            </CardBody>
          </Card>
        </section>

        {/* ── Top Items ──────────────── */}
        <section>
          <div class="mb-3 flex items-center justify-between">
            <SectionHeading>Top Items</SectionHeading>
            <select
              class="rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              value={topItemsType()}
              onChange={(e) =>
                setTopItemsType(
                  e.currentTarget.value as 'sold' | 'purchased' | 'profitable'
                )
              }
            >
              <For each={TOP_ITEMS_TYPE_OPTIONS}>
                {(opt) => <option value={opt.value}>{opt.label}</option>}
              </For>
            </select>
          </div>

          <Card>
            <CardBody>
              <Show when={!topItems.loading} fallback={<LoadingSpinner />}>
                <Show
                  when={!topItems.error}
                  fallback={<ErrorMessage error={topItems.error} />}
                >
                  {(() => {
                    const items = topItems() as TopItemResult[] | undefined;
                    if (!items || items.length === 0) {
                      return (
                        <p class="py-6 text-center text-sm text-text-muted">
                          No items found for this period.
                        </p>
                      );
                    }

                    if (topItemsType() === 'profitable') {
                      const profItems = items as TopProfitableItem[];
                      return (
                        <TableWrapper>
                          <thead>
                            <tr>
                              <Th>Item</Th>
                              <Th>Revenue</Th>
                              <Th>Cost</Th>
                              <Th>Profit</Th>
                              <Th>Margin</Th>
                            </tr>
                          </thead>
                          <tbody>
                            <For each={profItems}>
                              {(i) => (
                                <tr class="hover:bg-bg-hover">
                                  <Td>{i.name}</Td>
                                  <Td>{fc(i.totalRevenue)}</Td>
                                  <Td>{fc(i.totalCost)}</Td>
                                  <Td class="text-status-success font-medium">
                                    {fc(i.profit)}
                                  </Td>
                                  <Td>{i.marginPercent.toFixed(1)}%</Td>
                                </tr>
                              )}
                            </For>
                          </tbody>
                        </TableWrapper>
                      );
                    }

                    const soldItems = items as TopSoldItem[];
                    const maxVal = Math.max(
                      ...soldItems.map((i) => i.totalValue)
                    );
                    return (
                      <TableWrapper>
                        <thead>
                          <tr>
                            <Th>Item</Th>
                            <Th>Qty</Th>
                            <Th>Value</Th>
                            <Th>Avg Price</Th>
                            <Th class="hidden sm:table-cell">Share</Th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={soldItems}>
                            {(i) => (
                              <tr class="hover:bg-bg-hover">
                                <Td>{i.name}</Td>
                                <Td>
                                  {i.totalQuantity} {i.unit}
                                </Td>
                                <Td>{fc(i.totalValue)}</Td>
                                <Td>{fc(i.avgPrice)}</Td>
                                <Td class="hidden w-32 sm:table-cell">
                                  <div
                                    class="h-2 rounded-full bg-accent-primary"
                                    style={{
                                      width: barWidth(i.totalValue, maxVal),
                                    }}
                                  />
                                </Td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </TableWrapper>
                    );
                  })()}
                </Show>
              </Show>
            </CardBody>
          </Card>
        </section>

        {/* ── Partner Analytics ──────────────── */}
        <section>
          <div class="mb-3 flex items-center justify-between">
            <SectionHeading>Partner Analytics</SectionHeading>
            <select
              class="rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              value={partnerType()}
              onChange={(e) =>
                setPartnerType(e.currentTarget.value as 'clients' | 'suppliers')
              }
            >
              <For each={PARTNER_TYPE_OPTIONS}>
                {(opt) => <option value={opt.value}>{opt.label}</option>}
              </For>
            </select>
          </div>

          <Card>
            <CardBody>
              <Show when={!partners.loading} fallback={<LoadingSpinner />}>
                <Show
                  when={!partners.error}
                  fallback={<ErrorMessage error={partners.error} />}
                >
                  {(() => {
                    const d = partners() as PartnerAnalyticsEntry[] | undefined;
                    if (!d || d.length === 0) {
                      return (
                        <p class="py-6 text-center text-sm text-text-muted">
                          No partner data found.
                        </p>
                      );
                    }
                    return (
                      <TableWrapper>
                        <thead>
                          <tr>
                            <Th>Name</Th>
                            <Th>Total Value</Th>
                            <Th>Orders</Th>
                            <Th>Avg Order</Th>
                            <Th class="hidden sm:table-cell">Last Activity</Th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={d}>
                            {(p) => (
                              <tr class="hover:bg-bg-hover">
                                <Td>
                                  <span class="font-medium">{p.name}</span>
                                  <Show when={p.isWalkIn}>
                                    <span class="ml-1 text-xs text-text-muted">
                                      (Walk-in)
                                    </span>
                                  </Show>
                                </Td>
                                <Td>{fc(p.totalValue)}</Td>
                                <Td>{p.orderCount}</Td>
                                <Td>{fc(p.avgOrderValue)}</Td>
                                <Td class="hidden sm:table-cell">
                                  {new Date(
                                    p.lastActivityDate
                                  ).toLocaleDateString()}
                                </Td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </TableWrapper>
                    );
                  })()}
                </Show>
              </Show>
            </CardBody>
          </Card>
        </section>

        {/* ── Inventory Snapshot ──────────────── */}
        <section>
          <SectionHeading>Inventory Snapshot</SectionHeading>
          <Show when={!inventory.loading} fallback={<LoadingSpinner />}>
            <Show
              when={!inventory.error}
              fallback={<ErrorMessage error={inventory.error} />}
            >
              {(() => {
                const d = inventory() as InventorySnapshotData | undefined;
                if (!d) return null;
                return (
                  <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4 lg:grid-cols-5">
                      <StatCard label="Total Value" value={fc(d.totalValue)} />
                      <StatCard
                        label="Total Items"
                        value={String(d.totalItems)}
                      />
                      <StatCard
                        label="Low Stock"
                        value={String(d.lowStockCount)}
                        subColor={
                          d.lowStockCount > 0
                            ? 'text-status-warning'
                            : undefined
                        }
                        sub={
                          d.lowStockCount > 0
                            ? 'Items below threshold'
                            : undefined
                        }
                      />
                      <StatCard
                        label="Dead Stock"
                        value={String(d.deadStockCount)}
                        sub="No sales in period"
                        subColor={
                          d.deadStockCount > 0 ? 'text-status-error' : undefined
                        }
                      />
                      <StatCard
                        label="Turnover Rate"
                        value={`${d.avgTurnoverRate}x`}
                        sub="Units sold / current stock"
                      />
                    </div>

                    <Show when={d.byStorehouse.length > 1}>
                      <Card>
                        <CardHeader>
                          <h3 class="text-sm font-semibold text-text-primary">
                            By Storehouse
                          </h3>
                        </CardHeader>
                        <CardBody>
                          <TableWrapper>
                            <thead>
                              <tr>
                                <Th>Storehouse</Th>
                                <Th>Value</Th>
                                <Th>Items</Th>
                                <Th>Qty</Th>
                                <Th>Low Stock</Th>
                              </tr>
                            </thead>
                            <tbody>
                              <For each={d.byStorehouse}>
                                {(s) => (
                                  <tr class="hover:bg-bg-hover">
                                    <Td>
                                      <span class="font-medium">
                                        {s.storehouseName}
                                      </span>
                                      <Show when={s.isLocked}>
                                        <span class="text-status-warning ml-1 text-xs">
                                          (Locked)
                                        </span>
                                      </Show>
                                    </Td>
                                    <Td>{fc(s.totalValue)}</Td>
                                    <Td>{s.totalItems}</Td>
                                    <Td>{s.totalQuantity}</Td>
                                    <Td>
                                      <span
                                        class={
                                          s.lowStockCount > 0
                                            ? 'text-status-warning font-medium'
                                            : ''
                                        }
                                      >
                                        {s.lowStockCount}
                                      </span>
                                    </Td>
                                  </tr>
                                )}
                              </For>
                            </tbody>
                          </TableWrapper>
                        </CardBody>
                      </Card>
                    </Show>
                  </div>
                );
              })()}
            </Show>
          </Show>
        </section>

        {/* ── Payment & Delivery Insights ──────────────── */}
        <section>
          <SectionHeading>Payment & Delivery Insights</SectionHeading>
          <Show when={!payments.loading} fallback={<LoadingSpinner />}>
            <Show
              when={!payments.error}
              fallback={<ErrorMessage error={payments.error} />}
            >
              {(() => {
                const d = payments() as PaymentInsightsData | undefined;
                if (!d) return null;
                return (
                  <div class="grid gap-4 md:grid-cols-2">
                    {/* Outstanding */}
                    <Card>
                      <CardHeader>
                        <h3 class="text-sm font-semibold text-text-primary">
                          Outstanding Payments
                        </h3>
                      </CardHeader>
                      <CardBody>
                        <div class="grid grid-cols-2 gap-4">
                          <div>
                            <p class="text-xs uppercase text-text-muted">
                              Customer Receivables
                            </p>
                            <p class="text-xl font-bold text-text-primary">
                              {fc(d.outstandingRevenue)}
                            </p>
                            <p class="text-xs text-text-muted">
                              {d.outstandingTransactions} orders
                            </p>
                          </div>
                          <div>
                            <p class="text-xs uppercase text-text-muted">
                              Supplier Payables
                            </p>
                            <p class="text-xl font-bold text-text-primary">
                              {fc(d.outstandingCost)}
                            </p>
                            <p class="text-xs text-text-muted">
                              {d.outstandingImports} imports
                            </p>
                          </div>
                        </div>
                      </CardBody>
                    </Card>

                    {/* Lag */}
                    <Card>
                      <CardHeader>
                        <h3 class="text-sm font-semibold text-text-primary">
                          Average Lag (days)
                        </h3>
                      </CardHeader>
                      <CardBody>
                        <div class="grid grid-cols-2 gap-4">
                          <div>
                            <p class="text-xs uppercase text-text-muted">
                              Payment Lag
                            </p>
                            <p class="mt-1 text-sm">
                              <span class="font-medium">Orders:</span>{' '}
                              {d.avgPaymentLagDays.transactions ?? '—'} days
                            </p>
                            <p class="text-sm">
                              <span class="font-medium">Imports:</span>{' '}
                              {d.avgPaymentLagDays.imports ?? '—'} days
                            </p>
                          </div>
                          <div>
                            <p class="text-xs uppercase text-text-muted">
                              Delivery Lag
                            </p>
                            <p class="mt-1 text-sm">
                              <span class="font-medium">Orders:</span>{' '}
                              {d.avgDeliveryLagDays.transactions ?? '—'} days
                            </p>
                            <p class="text-sm">
                              <span class="font-medium">Imports:</span>{' '}
                              {d.avgDeliveryLagDays.imports ?? '—'} days
                            </p>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </div>
                );
              })()}
            </Show>
          </Show>
        </section>

        {/* ── Margin Analysis ──────────────── */}
        <section>
          <SectionHeading>Margin Analysis</SectionHeading>
          <Show when={!discounts.loading} fallback={<LoadingSpinner />}>
            <Show
              when={!discounts.error}
              fallback={<ErrorMessage error={discounts.error} />}
            >
              {(() => {
                const d = discounts() as DiscountAnalysisData | undefined;
                if (!d) return null;
                return (
                  <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4 lg:grid-cols-3">
                      <StatCard
                        label="Total Gain (Sell − Buy)"
                        value={fc(d.totalGain)}
                        sub="sum across all sold items"
                      />
                      <StatCard
                        label="Avg Margin"
                        value={`${d.avgMarginPercent.toFixed(1)}%`}
                        sub="(sell − avg buy cost) / sell"
                        subColor={
                          d.avgMarginPercent >= 0
                            ? 'text-status-success'
                            : 'text-status-error'
                        }
                      />
                      <StatCard
                        label="Items Tracked"
                        value={String(d.topMarginItems.length)}
                      />
                    </div>

                    <Show when={d.topMarginItems.length > 0}>
                      <Card>
                        <CardHeader>
                          <h3 class="text-sm font-semibold text-text-primary">
                            Top Items by Margin
                          </h3>
                        </CardHeader>
                        <CardBody>
                          <TableWrapper>
                            <thead>
                              <tr>
                                <Th>Item</Th>
                                <Th>Avg Buy</Th>
                                <Th>Avg Sell</Th>
                                <Th>Margin %</Th>
                                <Th>Total Gain</Th>
                              </tr>
                            </thead>
                            <tbody>
                              <For each={d.topMarginItems}>
                                {(item) => (
                                  <tr class="hover:bg-bg-hover">
                                    <Td>{item.name}</Td>
                                    <Td>{fc(item.avgBuyPrice)}</Td>
                                    <Td>{fc(item.avgSellPrice)}</Td>
                                    <Td
                                      class={
                                        item.marginPercent >= 0
                                          ? 'text-status-success font-medium'
                                          : 'text-status-error font-medium'
                                      }
                                    >
                                      {item.marginPercent.toFixed(1)}%
                                    </Td>
                                    <Td class="text-status-success font-medium">
                                      {fc(item.totalGain)}
                                    </Td>
                                  </tr>
                                )}
                              </For>
                            </tbody>
                          </TableWrapper>
                        </CardBody>
                      </Card>
                    </Show>
                  </div>
                );
              })()}
            </Show>
          </Show>
        </section>

        {/* ── Storehouse Comparison ──────────────── */}
        <section>
          <SectionHeading>Storehouse Comparison</SectionHeading>
          <Card>
            <CardBody>
              <Show when={!shComparison.loading} fallback={<LoadingSpinner />}>
                <Show
                  when={!shComparison.error}
                  fallback={<ErrorMessage error={shComparison.error} />}
                >
                  {(() => {
                    const d = shComparison() as
                      | StorehouseComparisonData
                      | undefined;
                    if (!d || d.storehouses.length === 0) {
                      return (
                        <p class="py-6 text-center text-sm text-text-muted">
                          No storehouse data available.
                        </p>
                      );
                    }
                    return (
                      <TableWrapper>
                        <thead>
                          <tr>
                            <Th>Storehouse</Th>
                            <Th>Revenue</Th>
                            <Th>Cost</Th>
                            <Th>Profit</Th>
                            <Th class="hidden md:table-cell">Inventory</Th>
                            <Th class="hidden md:table-cell">Items</Th>
                            <Th class="hidden lg:table-cell">Transfers In</Th>
                            <Th class="hidden lg:table-cell">Transfers Out</Th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={d.storehouses}>
                            {(s) => (
                              <tr class="hover:bg-bg-hover">
                                <Td>
                                  <span class="font-medium">{s.name}</span>
                                  <Show when={s.isLocked}>
                                    <span class="text-status-warning ml-1 text-xs">
                                      (Locked)
                                    </span>
                                  </Show>
                                </Td>
                                <Td>{fc(s.revenue)}</Td>
                                <Td>{fc(s.cost)}</Td>
                                <Td
                                  class={
                                    s.profit >= 0
                                      ? 'text-status-success font-medium'
                                      : 'text-status-error font-medium'
                                  }
                                >
                                  {fc(s.profit)}
                                </Td>
                                <Td class="hidden md:table-cell">
                                  {fc(s.inventoryValue)}
                                </Td>
                                <Td class="hidden md:table-cell">
                                  {s.itemCount}
                                </Td>
                                <Td class="hidden lg:table-cell">
                                  {s.transfersIn}
                                </Td>
                                <Td class="hidden lg:table-cell">
                                  {s.transfersOut}
                                </Td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </TableWrapper>
                    );
                  })()}
                </Show>
              </Show>
            </CardBody>
          </Card>
        </section>

        {/* ── Transfer Flow ──────────────── */}
        <section>
          <SectionHeading>Transfer Flow</SectionHeading>
          <Show when={!transferFlow.loading} fallback={<LoadingSpinner />}>
            <Show
              when={!transferFlow.error}
              fallback={<ErrorMessage error={transferFlow.error} />}
            >
              {(() => {
                const d = transferFlow() as TransferFlowData | undefined;
                if (!d || (d.flows.length === 0 && d.topItems.length === 0)) {
                  return (
                    <p class="py-6 text-center text-sm text-text-muted">
                      No transfer data for this period.
                    </p>
                  );
                }
                return (
                  <div class="grid gap-4 md:grid-cols-2">
                    {/* Flow pairs */}
                    <Card>
                      <CardHeader>
                        <h3 class="text-sm font-semibold text-text-primary">
                          Flow Between Storehouses
                        </h3>
                      </CardHeader>
                      <CardBody>
                        <TableWrapper>
                          <thead>
                            <tr>
                              <Th>From</Th>
                              <Th>To</Th>
                              <Th>Qty</Th>
                              <Th>Count</Th>
                            </tr>
                          </thead>
                          <tbody>
                            <For each={d.flows}>
                              {(f) => (
                                <tr class="hover:bg-bg-hover">
                                  <Td>{f.from.name}</Td>
                                  <Td>{f.to.name}</Td>
                                  <Td>{f.totalQuantity}</Td>
                                  <Td>{f.transferCount}</Td>
                                </tr>
                              )}
                            </For>
                          </tbody>
                        </TableWrapper>
                      </CardBody>
                    </Card>

                    {/* Net flow */}
                    <Card>
                      <CardHeader>
                        <h3 class="text-sm font-semibold text-text-primary">
                          Net Flow by Storehouse
                        </h3>
                      </CardHeader>
                      <CardBody>
                        <TableWrapper>
                          <thead>
                            <tr>
                              <Th>Storehouse</Th>
                              <Th>In</Th>
                              <Th>Out</Th>
                              <Th>Net</Th>
                            </tr>
                          </thead>
                          <tbody>
                            <For each={d.netFlow}>
                              {(n) => (
                                <tr class="hover:bg-bg-hover">
                                  <Td>{n.name}</Td>
                                  <Td class="text-status-success">+{n.in}</Td>
                                  <Td class="text-status-error">-{n.out}</Td>
                                  <Td
                                    class={
                                      n.net >= 0
                                        ? 'text-status-success font-medium'
                                        : 'text-status-error font-medium'
                                    }
                                  >
                                    {n.net >= 0 ? '+' : ''}
                                    {n.net}
                                  </Td>
                                </tr>
                              )}
                            </For>
                          </tbody>
                        </TableWrapper>
                      </CardBody>
                    </Card>
                  </div>
                );
              })()}
            </Show>
          </Show>
        </section>
      </div>
    </FeatureGate>
  );
}
