import {
  createSignal,
  createResource,
  Show,
  For,
  createEffect,
} from 'solid-js';
import { useSearchParams } from '@solidjs/router';
import { Button } from '@/shared/ui/Button';
import { Card, CardBody } from '@/shared/ui';
import { formatDate as sharedFormatDate } from '@/shared/lib/format';
import { getBusiness } from '@/shared/stores/business.store';
import {
  getTransfers,
  executeTransferAction,
  deleteTransfer,
} from '@/shared/api/transfers.api';
import type { Transfer } from '@/shared/types/transfer.types';
import { notificationStore } from '@/shared/stores/notification.store';

type StatusFilter = 'all' | 'pending' | 'completed' | 'cancelled';

export default function TransfersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = createSignal<StatusFilter>('all');
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [selectedTransfer, setSelectedTransfer] = createSignal<Transfer | null>(
    null
  );
  const [confirmAction, setConfirmAction] = createSignal<{
    type: 'complete' | 'cancel' | 'delete';
    transfer: Transfer;
  } | null>(null);

  // Resources
  const [transfers, { refetch }] = createResource(
    () => ({
      status: filter() === 'all' ? undefined : filter(),
      limit: 50,
      sortBy: 'createdAt',
      sortOrder: 'desc' as const,
    }),
    async (filters) => {
      return await getTransfers(filters);
    }
  );

  // Handle id query param (from links)
  createEffect(() => {
    const id = searchParams['id'];
    if (id && transfers()) {
      const t = transfers()?.find((tr) => tr.id === id);
      if (t) {
        setSelectedTransfer(t);
        setSearchParams({ id: undefined });
      }
    }
  });

  const changeFilter = (f: StatusFilter) => {
    setFilter(f);
  };

  const handleAction = async (
    action: 'complete' | 'cancel',
    transfer: Transfer
  ) => {
    setIsProcessing(true);
    try {
      const result = await executeTransferAction(transfer.id, action);
      notificationStore.success(result.message);
      refetch();
      setSelectedTransfer(null);
    } catch (err: any) {
      notificationStore.error(
        err?.response?.data?.message || err?.message || 'Action failed'
      );
    } finally {
      setIsProcessing(false);
      setConfirmAction(null);
    }
  };

  const handleDelete = async (transfer: Transfer) => {
    setIsProcessing(true);
    try {
      await deleteTransfer(transfer.id);
      notificationStore.success('Transfer deleted');
      refetch();
      setSelectedTransfer(null);
    } catch (err: any) {
      notificationStore.error(
        err?.response?.data?.message || err?.message || 'Delete failed'
      );
    } finally {
      setIsProcessing(false);
      setConfirmAction(null);
    }
  };

  const getStatusBadge = (
    status: string
  ): { bg: string; text: string; label: string } => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-status-success/10',
          text: 'text-status-success',
          label: 'Completed',
        };
      case 'cancelled':
        return {
          bg: 'bg-status-error/10',
          text: 'text-status-error',
          label: 'Cancelled',
        };
      default:
        return {
          bg: 'bg-status-warning/10',
          text: 'text-status-warning',
          label: 'Pending',
        };
    }
  };

  const formatDate = (dateString: string) => {
    return sharedFormatDate(dateString, getBusiness()?.timezone);
  };

  return (
    <div class="space-y-6 py-8">
      {/* Header */}
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold text-text-primary">Transfers</h1>
          <p class="mt-2 text-sm text-text-secondary">
            Track stock movements between storehouses
          </p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div class="bg-bg-subtle flex gap-1 rounded-lg p-1">
        <For
          each={
            [
              { value: 'all', label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ] as { value: StatusFilter; label: string }[]
          }
        >
          {(tab) => (
            <button
              onClick={() => changeFilter(tab.value)}
              class={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                filter() === tab.value
                  ? 'bg-bg-surface text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          )}
        </For>
      </div>

      {/* Transfers list */}
      <Show
        when={!transfers.loading}
        fallback={
          <div class="space-y-3">
            <For each={[1, 2, 3, 4, 5]}>
              {() => (
                <div class="h-20 animate-pulse rounded-lg border border-border-default bg-bg-surface" />
              )}
            </For>
          </div>
        }
      >
        <Show
          when={(transfers() || []).length > 0}
          fallback={
            <Card>
              <CardBody>
                <div class="py-12 text-center">
                  <svg
                    class="mx-auto h-16 w-16 text-text-muted opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                  <h3 class="mt-4 text-lg font-medium text-text-primary">
                    No transfers found
                  </h3>
                  <p class="mt-1 text-sm text-text-secondary">
                    Transfers will appear here when you move stock between
                    storehouses.
                  </p>
                  <p class="mt-2 text-sm text-text-muted">
                    Go to Inventory → View Item → Transfer to move stock.
                  </p>
                </div>
              </CardBody>
            </Card>
          }
        >
          <div class="space-y-2">
            <For each={transfers()}>
              {(transfer) => {
                const badge = getStatusBadge(transfer.status);
                return (
                  <div
                    class="cursor-pointer rounded-lg border border-border-default bg-bg-surface p-4 transition-colors hover:bg-bg-hover"
                    onClick={() => setSelectedTransfer(transfer)}
                  >
                    <div class="flex items-center justify-between">
                      <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-2">
                          <span class="text-sm font-semibold text-text-primary">
                            {transfer.itemName || 'Unknown Item'}
                          </span>
                          <span
                            class={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}
                          >
                            {badge.label}
                          </span>
                          <span class="text-sm font-medium text-accent-primary">
                            ×{transfer.quantity}{' '}
                            <span class="text-text-muted">
                              {transfer.itemUnit || ''}
                            </span>
                          </span>
                        </div>
                        <div class="mt-1 flex items-center gap-1.5 text-xs text-text-secondary">
                          <span class="font-medium">
                            {transfer.fromStoreHouseName || '?'}
                          </span>
                          <svg
                            class="h-3.5 w-3.5 text-text-muted"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M14 5l7 7m0 0l-7 7m7-7H3"
                            />
                          </svg>
                          <span class="font-medium">
                            {transfer.toStoreHouseName || '?'}
                          </span>
                          <span class="ml-2 text-text-muted">
                            {formatDate(transfer.createdAt)}
                          </span>
                        </div>
                      </div>

                      <Show when={transfer.status === 'pending'}>
                        <div class="flex gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmAction({
                                type: 'complete',
                                transfer,
                              });
                            }}
                            class="bg-status-success/10 text-status-success hover:bg-status-success/20 rounded-md px-2.5 py-1 text-xs font-medium"
                          >
                            Complete
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmAction({
                                type: 'cancel',
                                transfer,
                              });
                            }}
                            class="bg-status-error/10 text-status-error hover:bg-status-error/20 rounded-md px-2.5 py-1 text-xs font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </Show>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </Show>

      {/* Detail modal */}
      <Show when={selectedTransfer()}>
        {(transfer) => {
          const badge = getStatusBadge(transfer().status);
          return (
            <div
              class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) setSelectedTransfer(null);
              }}
            >
              <div class="w-full max-w-lg rounded-xl border border-border-default bg-bg-surface shadow-xl">
                <div class="flex items-center justify-between border-b border-border-default px-6 py-4">
                  <h2 class="text-lg font-semibold text-text-primary">
                    Transfer Details
                  </h2>
                  <button
                    onClick={() => setSelectedTransfer(null)}
                    class="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
                  >
                    <svg
                      class="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div class="space-y-4 px-6 py-5">
                  {/* Status */}
                  <div class="flex items-center gap-2">
                    <span
                      class={`rounded-full px-3 py-1 text-sm font-medium ${badge.bg} ${badge.text}`}
                    >
                      {badge.label}
                    </span>
                    <Show when={transfer().transferredAt}>
                      <span class="text-xs text-text-muted">
                        Transferred {formatDate(transfer().transferredAt!)}
                      </span>
                    </Show>
                  </div>

                  {/* Item info */}
                  <div class="bg-bg-subtle rounded-lg p-4">
                    <h3 class="text-sm font-medium text-text-secondary">
                      Item
                    </h3>
                    <p class="mt-1 text-base font-semibold text-text-primary">
                      {transfer().itemName || 'Unknown'}
                    </p>
                    <p class="mt-0.5 text-sm text-text-secondary">
                      Quantity: {transfer().quantity}{' '}
                      {transfer().itemUnit || ''}
                    </p>
                  </div>

                  {/* From → To */}
                  <div class="flex items-center gap-4">
                    <div class="flex-1 rounded-lg border border-border-default p-3 text-center">
                      <p class="text-xs font-medium text-text-muted">From</p>
                      <p class="mt-1 text-sm font-semibold text-text-primary">
                        {transfer().fromStoreHouseName || '?'}
                      </p>
                    </div>
                    <svg
                      class="h-5 w-5 flex-shrink-0 text-text-muted"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                    <div class="flex-1 rounded-lg border border-border-default p-3 text-center">
                      <p class="text-xs font-medium text-text-muted">To</p>
                      <p class="mt-1 text-sm font-semibold text-text-primary">
                        {transfer().toStoreHouseName || '?'}
                      </p>
                    </div>
                  </div>

                  {/* Note */}
                  <Show when={transfer().note}>
                    <div>
                      <h3 class="text-sm font-medium text-text-secondary">
                        Note
                      </h3>
                      <p class="mt-1 text-sm text-text-primary">
                        {transfer().note}
                      </p>
                    </div>
                  </Show>

                  {/* Timestamps */}
                  <div class="text-xs text-text-muted">
                    Created {formatDate(transfer().createdAt)}
                  </div>
                </div>

                {/* Actions footer */}
                <div class="flex justify-end gap-3 border-t border-border-default px-6 py-4">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTransfer(null)}
                  >
                    Close
                  </Button>
                  <Show when={transfer().status === 'pending'}>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setConfirmAction({
                          type: 'delete',
                          transfer: transfer(),
                        })
                      }
                      disabled={isProcessing()}
                    >
                      Delete
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setConfirmAction({
                          type: 'cancel',
                          transfer: transfer(),
                        })
                      }
                      disabled={isProcessing()}
                    >
                      Cancel Transfer
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() =>
                        setConfirmAction({
                          type: 'complete',
                          transfer: transfer(),
                        })
                      }
                      disabled={isProcessing()}
                    >
                      Complete Transfer
                    </Button>
                  </Show>
                </div>
              </div>
            </div>
          );
        }}
      </Show>

      {/* Confirm action modal */}
      <Show when={confirmAction()}>
        {(action) => (
          <div
            class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setConfirmAction(null);
            }}
          >
            <div class="w-full max-w-sm rounded-xl border border-border-default bg-bg-surface p-6 shadow-xl">
              <h3 class="text-lg font-semibold text-text-primary">
                {action().type === 'complete'
                  ? 'Complete Transfer?'
                  : action().type === 'cancel'
                    ? 'Cancel Transfer?'
                    : 'Delete Transfer?'}
              </h3>
              <p class="mt-2 text-sm text-text-secondary">
                {action().type === 'complete'
                  ? `This will move ${action().transfer.quantity} ${action().transfer.itemUnit || 'units'} of "${action().transfer.itemName}" from ${action().transfer.fromStoreHouseName} to ${action().transfer.toStoreHouseName}.`
                  : action().type === 'cancel'
                    ? 'This will cancel the pending transfer. No stock will be moved.'
                    : 'This will permanently delete this transfer record.'}
              </p>
              <div class="mt-6 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setConfirmAction(null)}
                >
                  Go Back
                </Button>
                <Button
                  variant={action().type === 'complete' ? 'primary' : 'danger'}
                  onClick={() => {
                    if (action().type === 'delete') {
                      handleDelete(action().transfer);
                    } else {
                      handleAction(
                        action().type as 'complete' | 'cancel',
                        action().transfer
                      );
                    }
                  }}
                  disabled={isProcessing()}
                >
                  {isProcessing()
                    ? 'Processing...'
                    : action().type === 'complete'
                      ? 'Complete'
                      : action().type === 'cancel'
                        ? 'Cancel Transfer'
                        : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}
