import { For, Show, splitProps } from 'solid-js';

/**
 * Receipt item structure
 */
export interface ReceiptItem {
  itemName: string;
  qty: number;
  unitPrice: number;
  total: number;
}

/**
 * Transaction with date grouping (for multi-transaction support)
 */
export interface ReceiptTransaction {
  date: string;
  items: ReceiptItem[];
}

/**
 * Business info for receipt header
 */
export interface ReceiptBusinessInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface ReceiptPrintProps {
  /** Single list of items OR grouped transactions */
  items?: ReceiptItem[];
  transactions?: ReceiptTransaction[];
  /** Print mode */
  mode: 'compact' | 'detailed';
  /** Business info for header */
  business?: ReceiptBusinessInfo;
  /** Receipt title */
  title?: string;
  /** Additional CSS class */
  class?: string;
}

/**
 * Format number as currency (1,234.56)
 */
function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Calculate grand total from items
 */
function calculateTotal(items: ReceiptItem[]): number {
  return items.reduce((sum, item) => sum + item.total, 0);
}

/**
 * Filter out zero-value rows
 */
function filterZeroRows(items: ReceiptItem[]): ReceiptItem[] {
  return items.filter((item) => item.total !== 0);
}

/**
 * Production-ready receipt printing component
 * Supports compact (thermal 80mm) and detailed (A4) modes
 */
export function ReceiptPrint(props: ReceiptPrintProps) {
  const [local] = splitProps(props, [
    'items',
    'transactions',
    'mode',
    'business',
    'title',
    'class',
  ]);

  // Get all items (from direct items or flattened from transactions)
  const allItems = (): ReceiptItem[] => {
    if (local.items) {
      return filterZeroRows(local.items);
    }
    if (local.transactions) {
      return filterZeroRows(local.transactions.flatMap((t) => t.items));
    }
    return [];
  };

  // Check if using transaction grouping
  const hasTransactions = () =>
    !!local.transactions && local.transactions.length > 0;

  // Grand total
  const grandTotal = () => calculateTotal(allItems());

  // Mode-specific base classes
  const containerClass = () =>
    local.mode === 'compact'
      ? 'receipt-compact font-mono text-xs'
      : 'receipt-detailed font-sans text-sm';

  return (
    <div
      class={`receipt-print bg-white text-black ${containerClass()} ${local.class || ''}`}
    >
      {/* Header */}
      <Show when={local.business}>
        <div
          class={
            local.mode === 'compact'
              ? 'mb-2 border-b border-dashed border-gray-400 pb-2 text-center'
              : 'mb-4 border-b-2 border-gray-800 pb-4 text-center'
          }
        >
          <div
            class={
              local.mode === 'compact'
                ? 'text-sm font-bold'
                : 'text-xl font-bold'
            }
          >
            {local.business!.name}
          </div>
          <Show when={local.business!.address}>
            <div class="text-gray-600">{local.business!.address}</div>
          </Show>
          <Show when={local.business!.phone || local.business!.email}>
            <div class="text-gray-600">
              {local.business!.phone}
              {local.business!.phone && local.business!.email ? ' • ' : ''}
              {local.business!.email}
            </div>
          </Show>
        </div>
      </Show>

      {/* Title */}
      <Show when={local.title}>
        <div
          class={
            local.mode === 'compact'
              ? 'mb-2 text-center font-bold'
              : 'mb-4 text-center text-lg font-bold'
          }
        >
          {local.title}
        </div>
      </Show>

      {/* Content: Either grouped transactions or flat items */}
      <Show
        when={hasTransactions()}
        fallback={<ItemsTable items={allItems()} mode={local.mode} />}
      >
        <For each={local.transactions}>
          {(transaction, index) => (
            <div class="transaction-group print-no-break-inside">
              {/* Transaction Header */}
              <div
                class={
                  local.mode === 'compact'
                    ? 'mt-2 border-t border-dashed border-gray-400 py-1 font-bold'
                    : 'mt-4 border-t-2 border-gray-300 bg-gray-100 px-2 py-2 font-bold'
                }
              >
                {transaction.date}
              </div>

              {/* Transaction Items */}
              <ItemsTable
                items={filterZeroRows(transaction.items)}
                mode={local.mode}
                showHeader={index() === 0}
              />

              {/* Transaction Subtotal */}
              <div
                class={
                  local.mode === 'compact'
                    ? 'flex justify-between border-t border-dotted border-gray-300 py-1'
                    : 'flex justify-between border-t border-gray-200 py-2 font-medium'
                }
              >
                <span>Subtotal</span>
                <span class="whitespace-nowrap">
                  ${formatCurrency(calculateTotal(transaction.items))}
                </span>
              </div>
            </div>
          )}
        </For>
      </Show>

      {/* Grand Total - Always at bottom, never breaks from content */}
      <div
        class={`print-no-break-inside ${
          local.mode === 'compact'
            ? 'mt-2 border-t-2 border-black pt-2'
            : 'mt-4 border-t-4 border-gray-800 pt-3'
        }`}
      >
        <div
          class={
            local.mode === 'compact'
              ? 'flex justify-between font-bold'
              : 'flex justify-between text-lg font-bold'
          }
        >
          <span>GRAND TOTAL</span>
          <span class="whitespace-nowrap">${formatCurrency(grandTotal())}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Items table sub-component
 */
interface ItemsTableProps {
  items: ReceiptItem[];
  mode: 'compact' | 'detailed';
  showHeader?: boolean;
}

function ItemsTable(props: ItemsTableProps) {
  const showHeader = () => props.showHeader !== false;

  if (props.mode === 'compact') {
    return <CompactItemsTable items={props.items} showHeader={showHeader()} />;
  }
  return <DetailedItemsTable items={props.items} showHeader={showHeader()} />;
}

/**
 * Compact mode table (thermal receipt style)
 */
function CompactItemsTable(props: {
  items: ReceiptItem[];
  showHeader: boolean;
}) {
  return (
    <table class="w-full table-fixed border-collapse">
      <Show when={props.showHeader}>
        <thead>
          <tr class="border-b border-dashed border-gray-400">
            <th class="w-[45%] py-1 text-left">Item</th>
            <th class="w-[12%] py-1 text-center">Qty</th>
            <th class="w-[20%] py-1 text-right">Price</th>
            <th class="w-[23%] py-1 text-right">Total</th>
          </tr>
        </thead>
      </Show>
      <tbody>
        <For each={props.items}>
          {(item) => (
            <tr class="print-no-break-inside border-b border-dotted border-gray-200">
              <td class="truncate py-1 pr-1" title={item.itemName}>
                {item.itemName}
              </td>
              <td class="whitespace-nowrap py-1 text-center">{item.qty}</td>
              <td class="whitespace-nowrap py-1 text-right">
                {formatCurrency(item.unitPrice)}
              </td>
              <td class="whitespace-nowrap py-1 text-right font-medium">
                {formatCurrency(item.total)}
              </td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  );
}

/**
 * Detailed mode table (A4 professional style)
 */
function DetailedItemsTable(props: {
  items: ReceiptItem[];
  showHeader: boolean;
}) {
  return (
    <table class="w-full table-fixed border-collapse">
      <Show when={props.showHeader}>
        <thead>
          <tr class="bg-gray-800 text-white">
            <th class="w-[45%] px-3 py-2 text-left font-semibold">Item</th>
            <th class="w-[12%] px-2 py-2 text-center font-semibold">Qty</th>
            <th class="w-[20%] px-2 py-2 text-right font-semibold">
              Unit Price
            </th>
            <th class="w-[23%] px-3 py-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
      </Show>
      <tbody>
        <For each={props.items}>
          {(item, index) => (
            <tr
              class={`print-no-break-inside border-b border-gray-200 ${
                index() % 2 === 1 ? 'bg-gray-50' : 'bg-white'
              }`}
            >
              <td class="truncate px-3 py-2" title={item.itemName}>
                {item.itemName}
              </td>
              <td class="whitespace-nowrap px-2 py-2 text-center">
                {item.qty}
              </td>
              <td class="whitespace-nowrap px-2 py-2 text-right">
                ${formatCurrency(item.unitPrice)}
              </td>
              <td class="whitespace-nowrap px-3 py-2 text-right font-medium">
                ${formatCurrency(item.total)}
              </td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  );
}

export default ReceiptPrint;
