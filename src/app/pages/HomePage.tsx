import { A } from '@solidjs/router';
import { createSignal, onMount, Show, For } from 'solid-js';
import { Card, CardBody, CardHeader } from '@/shared/ui';
import { getUser } from '@/features/auth/store/session.store';
import { getInventoryItems } from '@/features/inventory/api/inventory.api';
import type { Item } from '@/features/inventory/types/inventory.types';
import {
  getPendingTransactions,
  getTransactions,
} from '@/shared/api/transactions.api';
import type { Transaction } from '@/shared/types/transaction.types';
import { getPendingImports, getImports } from '@/shared/api/imports.api';
import type { Import } from '@/shared/types/import.types';
import { getClients, getSuppliers } from '@/shared/api/partners.api';
import type { Partner } from '@/shared/types/partner.types';
import { QuickRestockModal } from '@/shared/components/QuickRestockModal';
import { Button } from '@/shared/ui/Button';
import { formatRelativeDate } from '@/shared/lib/format';
import { getBusiness } from '@/shared/stores/business.store';

interface DashboardStats {
  totalItems: number;
  lowStockItems: number;
  pendingOrders: number;
  activeImports: number;
  totalClients: number;
}

export default function HomePage() {
  const user = getUser();
  const [stats, setStats] = createSignal<DashboardStats>({
    totalItems: 0,
    lowStockItems: 0,
    pendingOrders: 0,
    activeImports: 0,
    totalClients: 0,
  });
  const [lowStockItems, setLowStockItems] = createSignal<Item[]>([]);
  const [allLowStockItems, setAllLowStockItems] = createSignal<Item[]>([]);
  const [recentImports, setRecentImports] = createSignal<Import[]>([]);
  const [recentOrders, setRecentOrders] = createSignal<Transaction[]>([]);
  const [suppliers, setSuppliers] = createSignal<Partner[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [isRestockModalOpen, setIsRestockModalOpen] = createSignal(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        items,
        pendingOrders,
        activeImports,
        clients,
        suppliers,
        allImports,
        allOrders,
      ] = await Promise.all([
        getInventoryItems(),
        getPendingTransactions(),
        getPendingImports(),
        getClients(),
        getSuppliers(),
        getImports().catch(() => []),
        getTransactions().catch(() => []),
      ]);

      const lowStock = items.filter(
        (item) => item.quantity <= (item.lowStockAt || 0)
      );

      setStats({
        totalItems: items.length,
        lowStockItems: lowStock.length,
        pendingOrders: pendingOrders.length,
        activeImports: activeImports.length,
        totalClients: clients.length,
      });
      setLowStockItems(lowStock.slice(0, 5)); // Show top 5
      setAllLowStockItems(lowStock); // Store all for restock modal
      setSuppliers(suppliers);

      // Sort by date and take most recent 5
      setRecentImports(allImports.slice(0, 5));
      setRecentOrders(allOrders.slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    loadData();
  });

  const formatDate = (dateString: string) => {
    return formatRelativeDate(dateString, getBusiness()?.timezone);
  };

  const getStatusBadge = (status: string): { bg: string; text: string } => {
    const defaultStyle = {
      bg: 'bg-status-warning/10',
      text: 'text-status-warning',
    };
    const styles: Record<string, { bg: string; text: string }> = {
      pending: defaultStyle,
      completed: { bg: 'bg-status-success/10', text: 'text-status-success' },
      cancelled: { bg: 'bg-status-error/10', text: 'text-status-error' },
      delivered: { bg: 'bg-status-success/10', text: 'text-status-success' },
    };
    return styles[status] ?? defaultStyle;
  };

  return (
    <div class="py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-text-primary">
          Welcome back, {user?.name || 'User'}!
        </h1>
        <p class="mt-2 text-text-secondary">
          Quick overview of your store operations
        </p>
      </div>

      {/* Quick Stats */}
      <div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-text-secondary">
                  Total Items
                </p>
                <Show
                  when={!loading()}
                  fallback={
                    <div class="mt-1 h-8 w-12 animate-pulse rounded bg-bg-hover" />
                  }
                >
                  <p class="mt-1 text-2xl font-bold text-text-primary">
                    {stats().totalItems}
                  </p>
                </Show>
              </div>
              <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-primary-subtle">
                <svg
                  class="h-6 w-6 text-accent-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-text-secondary">
                  Low Stock Items
                </p>
                <Show
                  when={!loading()}
                  fallback={
                    <div class="mt-1 h-8 w-12 animate-pulse rounded bg-bg-hover" />
                  }
                >
                  <p class="mt-1 text-2xl font-bold text-text-primary">
                    {stats().lowStockItems}
                  </p>
                </Show>
              </div>
              <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-warning-subtle">
                <svg
                  class="h-6 w-6 text-accent-warning"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-text-secondary">
                  Pending Orders
                </p>
                <Show
                  when={!loading()}
                  fallback={
                    <div class="mt-1 h-8 w-12 animate-pulse rounded bg-bg-hover" />
                  }
                >
                  <p class="mt-1 text-2xl font-bold text-text-primary">
                    {stats().pendingOrders}
                  </p>
                </Show>
              </div>
              <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-success-subtle">
                <svg
                  class="h-6 w-6 text-accent-success"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-text-secondary">
                  Active Imports
                </p>
                <Show
                  when={!loading()}
                  fallback={
                    <div class="mt-1 h-8 w-12 animate-pulse rounded bg-bg-hover" />
                  }
                >
                  <p class="mt-1 text-2xl font-bold text-text-primary">
                    {stats().activeImports}
                  </p>
                </Show>
              </div>
              <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-status-info-bg">
                <svg
                  class="h-6 w-6 text-status-info-text"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Quick Actions */}
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-text-primary">
                Low Stock Alert
              </h2>
              <Show
                when={
                  !loading() &&
                  stats().lowStockItems > 0 &&
                  suppliers().length > 0
                }
              >
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsRestockModalOpen(true)}
                >
                  <svg
                    class="mr-1.5 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Quick Restock
                </Button>
              </Show>
            </div>
          </CardHeader>
          <CardBody>
            <Show
              when={!loading() && lowStockItems().length > 0}
              fallback={
                <div class="py-8 text-center text-text-muted">
                  <Show when={loading()}>
                    <div class="space-y-3">
                      <For each={[1, 2, 3]}>
                        {() => (
                          <div class="h-12 animate-pulse rounded bg-bg-hover" />
                        )}
                      </For>
                    </div>
                  </Show>
                  <Show when={!loading()}>
                    <svg
                      class="mx-auto h-12 w-12 text-text-muted opacity-50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p class="mt-2 text-sm">All items are well stocked!</p>
                  </Show>
                </div>
              }
            >
              <div class="space-y-2">
                <For each={lowStockItems()}>
                  {(item) => (
                    <A
                      href={`/inventory?search=${encodeURIComponent(item.name)}`}
                      class="flex items-center justify-between rounded-lg border border-border-default p-3 transition-colors hover:bg-bg-hover"
                    >
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium text-text-primary">
                          {item.name}
                        </p>
                        <p class="text-xs text-text-secondary">
                          Stock: {item.quantity} {item.unit}
                          <Show when={item.storeHouse}>
                            {' · '}
                            {item.storeHouse.name}
                          </Show>
                        </p>
                      </div>
                      <div class="ml-3 flex items-center gap-2">
                        <span class="bg-status-warning/10 text-status-warning rounded-full px-2 py-1 text-xs font-medium">
                          Low Stock
                        </span>
                        <svg
                          class="h-4 w-4 text-text-muted"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </A>
                  )}
                </For>
                <Show when={stats().lowStockItems > 5}>
                  <A
                    href="/inventory?status=low"
                    class="block py-2 text-center text-sm font-medium text-accent-primary hover:text-accent-primary-hover"
                  >
                    View all {stats().lowStockItems} low stock items →
                  </A>
                </Show>
              </div>
            </Show>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-text-primary">
                Recent Imports
              </h2>
              <A
                href="/imports"
                class="text-sm font-medium text-accent-primary hover:text-accent-primary-hover"
              >
                View all →
              </A>
            </div>
          </CardHeader>
          <CardBody>
            <Show
              when={!loading() && recentImports().length > 0}
              fallback={
                <div class="py-8 text-center text-text-muted">
                  <Show when={loading()}>
                    <div class="space-y-3">
                      <For each={[1, 2, 3]}>
                        {() => (
                          <div class="h-12 animate-pulse rounded bg-bg-hover" />
                        )}
                      </For>
                    </div>
                  </Show>
                  <Show when={!loading()}>
                    <svg
                      class="mx-auto h-12 w-12 opacity-50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p class="mt-2 text-sm">No recent imports</p>
                  </Show>
                </div>
              }
            >
              <div class="space-y-2">
                <For each={recentImports()}>
                  {(importItem) => {
                    const statusStyle = getStatusBadge(importItem.status);
                    return (
                      <A
                        href={`/imports?id=${importItem.id}`}
                        class="flex items-center justify-between rounded-lg border border-border-default p-3 transition-colors hover:bg-bg-hover"
                      >
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center gap-2">
                            <p class="text-sm font-medium text-text-primary">
                              {importItem.supplierName || 'Unknown Supplier'}
                            </p>
                            <span
                              class={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                            >
                              {importItem.status}
                            </span>
                          </div>
                          <p class="mt-0.5 text-xs text-text-secondary">
                            {importItem.items.length} item
                            {importItem.items.length !== 1 ? 's' : ''} · $
                            {importItem.totalPrice.toFixed(2)} ·{' '}
                            {formatDate(importItem.createdAt)}
                          </p>
                        </div>
                        <svg
                          class="h-4 w-4 flex-shrink-0 text-text-muted"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </A>
                    );
                  }}
                </For>
              </div>
            </Show>
          </CardBody>
        </Card>
      </div>

      {/* Recent Orders Section */}
      <div class="mt-6">
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-text-primary">
                Recent Orders
              </h2>
              <A
                href="/orders"
                class="text-sm font-medium text-accent-primary hover:text-accent-primary-hover"
              >
                View all →
              </A>
            </div>
          </CardHeader>
          <CardBody>
            <Show
              when={!loading() && recentOrders().length > 0}
              fallback={
                <div class="py-8 text-center text-text-muted">
                  <Show when={loading()}>
                    <div class="space-y-3">
                      <For each={[1, 2, 3]}>
                        {() => (
                          <div class="h-12 animate-pulse rounded bg-bg-hover" />
                        )}
                      </For>
                    </div>
                  </Show>
                  <Show when={!loading()}>
                    <svg
                      class="mx-auto h-12 w-12 opacity-50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <p class="mt-2 text-sm">No recent orders</p>
                  </Show>
                </div>
              }
            >
              <div class="space-y-2">
                <For each={recentOrders()}>
                  {(order) => {
                    const statusStyle = getStatusBadge(order.status);
                    return (
                      <A
                        href={`/orders?id=${order.id}`}
                        class="flex items-center justify-between rounded-lg border border-border-default p-3 transition-colors hover:bg-bg-hover"
                      >
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center gap-2">
                            <p class="text-sm font-medium text-text-primary">
                              {order.clientName || 'Unknown Client'}
                            </p>
                            <span
                              class={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                            >
                              {order.status}
                            </span>
                          </div>
                          <p class="mt-0.5 text-xs text-text-secondary">
                            {order.items.length} item
                            {order.items.length !== 1 ? 's' : ''} · $
                            {order.totalPrice.toFixed(2)} ·{' '}
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                        <svg
                          class="h-4 w-4 flex-shrink-0 text-text-muted"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </A>
                    );
                  }}
                </For>
              </div>
            </Show>
          </CardBody>
        </Card>
      </div>

      {/* Quick Restock Modal */}
      <QuickRestockModal
        isOpen={isRestockModalOpen()}
        onClose={() => setIsRestockModalOpen(false)}
        items={allLowStockItems()}
        suppliers={suppliers()}
        onSuccess={() => {
          loadData(); // Reload dashboard data
        }}
      />
    </div>
  );
}
