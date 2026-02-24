import { Show, For } from 'solid-js';
import { Button } from '@/shared/ui/Button';
import { CopyableId } from '@/shared/ui';
import type { Transaction } from '@/shared/types/transaction.types';
import { getStatusColor } from './orderStatusUtils';
import type { ConfirmAction, FormatCurrencyFn, FormatDateFn } from './types';

interface OrderDetailModalProps {
  transaction: Transaction;
  formatCurrency: FormatCurrencyFn;
  formatDate: FormatDateFn;
  onClose: () => void;
  showConfirmation: (action: ConfirmAction) => void;
  handleMarkPending: (transactionId: string) => Promise<void>;
}

export function OrderDetailModal(props: OrderDetailModalProps) {
  const tx = () => props.transaction;

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-bg-surface p-6 shadow-xl">
        <div class="mb-4 flex items-start justify-between">
          <h2 class="text-xl font-bold text-text-primary">Order Details</h2>
          <button
            onClick={props.onClose}
            class="text-text-secondary hover:text-text-primary"
          >
            <svg
              class="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Order Info */}
        <div class="mb-6 grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-text-secondary">Order ID</p>
            <div class="text-sm font-medium text-text-primary">
              <CopyableId id={tx().id} />
            </div>
          </div>
          <div>
            <p class="text-sm text-text-secondary">Status</p>
            <span
              class={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(tx().status)}`}
            >
              {tx().status}
            </span>
          </div>
          <div>
            <p class="text-sm text-text-secondary">Client</p>
            <p class="font-medium text-text-primary">
              {tx().clientName || 'Unknown'}
            </p>
          </div>
          <div>
            <p class="text-sm text-text-secondary">Total Amount</p>
            <p class="text-lg font-bold text-text-primary">
              {props.formatCurrency(tx().totalPrice)}
            </p>
          </div>
          <div>
            <p class="text-sm text-text-secondary">Created At</p>
            <p class="text-sm text-text-primary">
              {props.formatDate(tx().createdAt)}
            </p>
          </div>
          <Show when={tx().itemsDeliveredDate}>
            <div>
              <p class="text-sm text-text-secondary">Items Delivered On</p>
              <p class="text-sm text-text-primary">
                {props.formatDate(tx().itemsDeliveredDate)}
              </p>
            </div>
          </Show>
          <Show when={tx().paymentCompletedDate}>
            <div>
              <p class="text-sm text-text-secondary">Payment Completed On</p>
              <p class="text-sm text-text-primary">
                {props.formatDate(tx().paymentCompletedDate)}
              </p>
            </div>
          </Show>
        </div>

        {/* Items List */}
        <div class="mb-6">
          <h3 class="mb-3 font-semibold text-text-primary">Order Items</h3>

          <Show when={tx().itemsDeliveredDate}>
            <div class="mb-3 rounded border-l-4 border-status-warning-text bg-status-warning-bg p-3">
              <div class="flex items-start gap-2">
                <svg
                  class="mt-0.5 h-5 w-5 flex-shrink-0 text-status-warning-text"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
                <div>
                  <p class="text-sm font-medium text-status-warning-text">
                    Items cannot be edited
                  </p>
                  <p class="mt-1 text-xs text-text-secondary">
                    Items have been delivered and removed from inventory. To
                    edit items, you must first unmark them.
                  </p>
                </div>
              </div>
            </div>
          </Show>

          <div class="space-y-2">
            <For each={tx().items}>
              {(item) => (
                <div class="flex justify-between rounded-lg border border-border-default p-3 hover:bg-bg-hover">
                  <div>
                    <p class="font-medium text-text-primary">
                      {item.itemName || `Item ${item.itemId.slice(-6)}`}
                    </p>
                    <p class="text-sm text-text-secondary">
                      Quantity: {item.quantity}
                    </p>
                    <p class="text-sm text-text-secondary">
                      Listed Price: {props.formatCurrency(item.listedPrice)}
                    </p>
                    <p class="text-sm text-text-secondary">
                      Sell Price: {props.formatCurrency(item.unitPrice)}
                      <Show
                        when={
                          item.listedPrice && item.unitPrice < item.listedPrice
                        }
                      >
                        <span class="ml-2 text-status-success-text">
                          (
                          {Math.round(
                            (1 - item.unitPrice / item.listedPrice) * 100
                          )}
                          % off)
                        </span>
                      </Show>
                      <Show
                        when={
                          item.listedPrice && item.unitPrice > item.listedPrice
                        }
                      >
                        <span class="ml-2 text-accent-warning">
                          (+
                          {Math.round(
                            (item.unitPrice / item.listedPrice - 1) * 100
                          )}
                          % markup)
                        </span>
                      </Show>
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="font-semibold text-text-primary">
                      {props.formatCurrency(item.totalPrice)}
                    </p>
                    <Show
                      when={
                        item.listedPrice && item.unitPrice < item.listedPrice
                      }
                    >
                      <p class="text-xs text-status-success-text">
                        Saved{' '}
                        {props.formatCurrency(
                          (item.listedPrice - item.unitPrice) * item.quantity
                        )}
                      </p>
                    </Show>
                    <Show
                      when={
                        item.listedPrice && item.unitPrice > item.listedPrice
                      }
                    >
                      <p class="text-xs text-accent-warning">
                        +
                        {props.formatCurrency(
                          (item.unitPrice - item.listedPrice) * item.quantity
                        )}
                      </p>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>

        {/* Action Buttons - Pending */}
        <Show when={tx().status === 'pending'}>
          <div class="mt-6">
            <h3 class="mb-3 font-semibold text-text-primary">Actions</h3>
            <div class="space-y-3">
              {/* Mark Items Delivered */}
              <div class="bg-bg-subtle flex items-center justify-between rounded-lg p-3">
                <div class="flex items-center gap-3">
                  <Show
                    when={tx().itemsDeliveredDate}
                    fallback={
                      <svg
                        class="h-5 w-5 text-text-secondary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    }
                  >
                    <svg
                      class="h-5 w-5 text-status-success-text"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </Show>
                  <div>
                    <p class="font-medium text-text-primary">
                      Mark Items Delivered
                    </p>
                    <p class="text-sm text-text-secondary">
                      Remove items from inventory
                    </p>
                  </div>
                </div>
                <Show
                  when={tx().itemsDeliveredDate}
                  fallback={
                    <Button
                      onClick={() => {
                        props.showConfirmation({
                          type: 'markDelivered',
                          transactionId: tx().id,
                          message:
                            'This will remove the items from your inventory. Continue?',
                        });
                      }}
                      variant="primary"
                      size="sm"
                    >
                      Mark Delivered
                    </Button>
                  }
                >
                  <Button
                    onClick={() => {
                      props.showConfirmation({
                        type: 'unmarkDelivered',
                        transactionId: tx().id,
                        message:
                          'This will add the items back to inventory. Continue?',
                      });
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Unmark
                  </Button>
                </Show>
              </div>

              {/* Complete Payment */}
              <div class="bg-bg-subtle flex items-center justify-between rounded-lg p-3">
                <div class="flex items-center gap-3">
                  <Show
                    when={tx().paymentCompletedDate}
                    fallback={
                      <svg
                        class="h-5 w-5 text-text-secondary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    }
                  >
                    <svg
                      class="h-5 w-5 text-status-success-text"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </Show>
                  <div>
                    <p class="font-medium text-text-primary">
                      Complete Payment
                    </p>
                    <p class="text-sm text-text-secondary">
                      Mark payment from client as complete
                    </p>
                  </div>
                </div>
                <Show
                  when={tx().paymentCompletedDate}
                  fallback={
                    <Button
                      onClick={() => {
                        props.showConfirmation({
                          type: 'completePayment',
                          transactionId: tx().id,
                          message: 'Mark payment as completed?',
                        });
                      }}
                      variant="primary"
                      size="sm"
                    >
                      Mark Paid
                    </Button>
                  }
                >
                  <Button
                    onClick={() => {
                      props.showConfirmation({
                        type: 'unmarkPayment',
                        transactionId: tx().id,
                        message: 'Unmark payment as completed?',
                      });
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Unmark
                  </Button>
                </Show>
              </div>

              {/* Quick Actions */}
              <div class="flex flex-wrap gap-2 border-t border-border-default pt-3">
                <Button
                  onClick={() => {
                    props.showConfirmation({
                      type: 'completeTransaction',
                      transactionId: tx().id,
                      message: 'Mark this order as completed?',
                    });
                  }}
                  variant="primary"
                  size="sm"
                >
                  Complete Order
                </Button>
                <Button
                  onClick={() => {
                    props.showConfirmation({
                      type: 'cancelTransaction',
                      transactionId: tx().id,
                      message:
                        'Cancel this order? This action cannot be undone.',
                    });
                  }}
                  variant="danger"
                  size="sm"
                >
                  Cancel Order
                </Button>
              </div>
            </div>
          </div>
        </Show>

        {/* Cancelled status */}
        <Show when={tx().status === 'cancelled'}>
          <div class="mt-6">
            <h3 class="mb-3 font-semibold text-text-primary">
              Reactivate Order
            </h3>
            <p class="mb-3 text-sm text-text-secondary">
              This will change the status back to pending, allowing you to
              complete or modify the order.
            </p>
            <Button
              onClick={() => {
                props.handleMarkPending(tx().id);
                props.onClose();
              }}
              variant="primary"
              size="sm"
            >
              Mark as Pending
            </Button>
          </div>
        </Show>

        {/* Completed status */}
        <Show when={tx().status === 'completed'}>
          <div class="mt-6">
            <h3 class="mb-3 font-semibold text-text-primary">Reopen Order</h3>
            <p class="mb-3 text-sm text-text-secondary">
              This will change the status back to pending. Dates (items
              delivered, payment completed) will be preserved.
            </p>
            <div class="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  props.handleMarkPending(tx().id);
                  props.onClose();
                }}
                variant="primary"
                size="sm"
              >
                Mark as Pending
              </Button>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}
